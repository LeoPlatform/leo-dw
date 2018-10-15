"use strict";

var pg = require('pg');
pg.defaults.parseInt8 = true;
var crypto = require("crypto");
var async = require("async");
var fields = require("../fields.js");
var fieldRank = fields.rank;
var fs = require("fs");
var readline = require('readline');
var calculations = require("./calculations.js");
var s3 = require("leo-sdk").aws.s3;
const connections = require("../connections");
var leoConfigure = require("leo-config");

let cache = {};
let current = null;

function build(connectionOptions) {
	let cacheKey = JSON.stringify(connectionOptions);
	if (cacheKey in cache) {
		return cache[cacheKey];
	}

	var pool = require("leo-connector-postgres/lib/connect")(connectionOptions);
	var queryGroup = null;
	var mysql = {
		type: connectionOptions.type,
		version: connectionOptions.version,
		escapeId: function (field) {
			return '"' + field.replace('"', '').replace(/\.([^\.]+)$/, '"."$1') + '"';
		},
		escape: function (value) {
			if (value.replace) {
				return '"' + value.replace('"', '') + '"';
			} else {
				return value;
			}
		},
		escapeValue: function (value) {
			if (value.replace) {
				return "'" + value.replace("'", "\\'").toLowerCase() + "'";
			} else {
				return value;
			}
		},
		escapeValueNoToLower: function (value) {
			if (value.replace) {
				return "'" + value.replace("'", "\\'") + "'";
			} else {
				return value;
			}
		}
	};

	function queryFactTable(factTable, calcLookups, options, repeatableSha1s, callback) {
		var select = "Select ";
		var columns = [];
		var joins = [];
		var requiredTables = {};
		var groups = [];
		var filters = [];
		var tableLookups = {};
		Object.keys(calcLookups).map(k => Object.keys(calcLookups[k].tables).map(t => {
			tableLookups[t] = calcLookups[k].tables[t];
		}));

		options.filters.forEach(function (f) {
			var calcField;
			if (f.id in calcLookups) {
				calcField = calcLookups[f.id];
			} else {
				calcField = calculations.getCalcField(f.id);
			}

			var filter = calcField.filter(f, factTable.table);
			//Check to make sure this filter is on this table
			if (
				(filter.requiredTables.length && filter.requiredTables[0].alias in factTable.dimensions) ||
				filter.tablePath in factTable.dimensions ||
				filter.tablePath === factTable.table
			) {
				filter.requiredTables.forEach(function (table) {
					let t = tableLookups[table.table] || {};
					requiredTables[table.alias] = {
						nk: t.nk,
						sk: t.sk,
						table: table.table,
						alias: table.alias,
						joinTable: table.joinTable,
						on: table.on,
						filter: true
					};
				});
				filters.push(filter.where.redshift);
			} else if (f.requiredTables) {
				if (!Array.isArray(f.requiredTables)) {
					f.requiredTables = [f.requiredTables];
				}
				f.requiredTables.map(table => {
					requiredTables[table.alias] = Object.assign({
						filter: true
					}, table);
				})

			}
		});

		// Quick links because this will be looped over for EVERY row in the result
		// set
		var outColumns = {};
		// Group selections are the first select items
		if (options.columns) {
			for (var i = 0; i < options.columns.length; i++) {
				var column = options.columns[i];
				column.requiredTables.forEach(function (dim) {
					var joinTable = '';
					if (dim.alias !== factTable.table && !(dim.alias in requiredTables)) {
						let t = tableLookups[dim.table] || {};
						requiredTables[dim.alias] = {
							nk: t.nk,
							sk: t.sk,
							table: dim.table,
							alias: dim.alias,
							joinTable: dim.joinTable,
							on: dim.on,
							filter: false
						};
					}
				});
				if (column.isGrouping) {
					groups.push(i + 1); // Group by can be index based...but is 1 based
					// instead of 0 based
				}
				outColumns[column.selectAlias] = column;
			}
		}

		if (options.query) {
			select = options.query;
		} else {
			select += options.columns.map(function (column) {
				return column.redshiftSelect();
			}).join(',');
			select += " From " + factTable.table;
			for (var alias in requiredTables) {
				var dim = requiredTables[alias];
				if (dim.alias === factTable.table) {
					continue; // Skip joining tables for degenerates
				}
				if (dim.on) {
					if (typeof dim.on == "string") {
						joins.push((dim.joinType || "LEFT") + " JOIN " + dim.table + " as " + dim.alias + " on " + dim.on);
					} else {
						joins.push((dim.joinType || "LEFT") + " JOIN " + dim.table + " as " + dim.alias + " on " + dim.on(mysql));
					}
				} else if (dim.joinTable) {
					joins.push("INNER JOIN " + dim.table + " as " + dim.alias + " on " + dim.alias + `.${dim.sk} = ` + mysql.escapeId(dim.joinTable) + "." + mysql.escapeId(dim.alias.split('$')[1]));
				} else {
					joins.push("INNER JOIN " + dim.table + " as " + dim.alias + " on " + dim.alias + `.${dim.sk} = ` + mysql.escapeId(factTable.table) + "." + mysql.escapeId(dim.alias));
				}
			}

			if (joins.length) {
				select += " " + joins.join(" ");
			}

			let where = " Where ";
			let deletedColumn = process.dw_fields && process.dw_fields.fact && process.dw_fields.fact[factTable.table] && process.dw_fields.fact[factTable.table].deletedColumn;
			if (deletedColumn) {
				select += ` Where (${factTable.table}.${deletedColumn} = false OR ${factTable.table}.${deletedColumn} IS null)`
				where = " AND "
			}

			if (filters.length) {
				select += where + filters.join(" and ");
			}
			if (groups.length) {
				select += " GROUP BY " + groups.join(",");
				// select += " ORDER BY NULL";
			}

			if (options.sort && options.sort.field) {
				select += " ORDER BY " + options.sort.field + " " + options.sort.direction;
			}
			if (options.limit) {
				select += " LIMIT " + parseInt(options.limit);
			}
		}

		console.log(select);

		var rows = [];
		var rowSize = columns.length;
		pool.query(select, function (err, result) {
			if (err) {
				console.log("Error getting data from redshift ", err, select);
				err.sql = select;
				return callback(err);
			}
			for (var i = 0; i < result.length; i++) {
				var obj = result[i];
				// this is silly that I have to do this, wastes a lot of processing to
				// convert it back to mysql normal format...wonder if we can fix this
				var row = [];
				var groupSha = crypto.createHash('sha1');
				var sha1Columns = [];
				for (var id in obj) {
					var column = outColumns[id];
					var value = obj[id];
					if (column.isGrouping) {
						if (value === null) {
							value = "";
						}
						groupSha.update(value.toString());
						if (!column.trackMissing) {
							sha1Columns[column.position - 1] = value;
						}
					}
					row[column.position] = value;
				}
				row[0] = groupSha.digest("base64");
				repeatableSha1s[sha1Columns.join('-')] = sha1Columns;
				rows.push(row);
			}
			if (options.logQueries) {
				options.logQueries.push(select);
			}
			callback(null, rows);
		});
	}
	var redshift = Object.freeze({
		current: () => current,
		pool: pool,
		connection: pool.connection,
		query: function (sql, callback) {
			pool.query(sql, callback);
		},
		queryFactTable: queryFactTable,
		escape: mysql,
		query_group: (group) => {
			queryGroup = group;
		},
		getFields: function (tables, callback) {
			pool.query("select table_name, column_name, data_type, character_maximum_length, ordinal_position from INFORMATION_SCHEMA.COLUMNS where table_name in ('" + tables.join("','") + "')", (err, data) => {
				if (err) {
					callback(err);
				} else {
					var redshiftTables = {};
					for (var i = 0; i < data.length; i++) {
						var field = data[i];

						if (!(field.table_name in redshiftTables)) {
							redshiftTables[field.table_name] = {
								fields: {},
								fieldPositions: []
							}
						}
						redshiftTables[field.table_name].fieldPositions[field.ordinal_position - 1] = field.column_name;
						redshiftTables[field.table_name].fields[field.column_name] = {
							id: '',
							column: field.column_name,
							dtype: redshiftTypes[field.data_type],
							len: field.character_maximum_length,
							pos: field.ordinal_position - 1
						};
					}
					callback(null, redshiftTables);
				}
			});
		},
		checkTables: function (tables, callback) {
			pool.query("select table_name, column_name, data_type, character_maximum_length, ordinal_position from INFORMATION_SCHEMA.COLUMNS where table_name in ('" + Object.keys(tables).join("','") + "')", (err, data) => {
				if (err) {
					callback(err);
				} else {
					var redshiftTables = {};
					for (var i = 0; i < data.length; i++) {
						var field = data[i];

						if (!(field.table_name in redshiftTables)) {
							redshiftTables[field.table_name] = {
								fields: {}
							}
						}
						redshiftTables[field.table_name].fields[field.column_name] = {
							id: '',
							column: field.column_name,
							dtype: redshiftTypes[field.data_type],
							len: field.character_maximum_length,
							pos: field.ordinal_position - 1
						};
					}

					var tasks = [];
					Object.keys(tables).forEach((t) => {
						var table = tables[t];
						if (Object.keys(table.fields).length === 0 || table.isJunkDim) {
							return;
						}

						var tableExists = false;
						if (t in redshiftTables) {
							tableExists = true;
						} else {
							redshiftTables[t] = {
								fields: {}
							};
						}
						var rTable = redshiftTables[t];

						if (!tableExists) {
							tasks.push(function (done) {
								createTable(tables[t], function (err, fieldPositions) {
									rTable.fieldPositions = fieldPositions;
									done(err);
								});
							});
						} else {
							tasks.push(function (done) {
								modifyTable(rTable, tables[t], function (err, fieldPositions) {
									rTable.fieldPositions = fieldPositions;
									done(err);
								});
							});
						}
					});
					async.parallel(tasks, function (err, results) {
						callback(err, redshiftTables);
					});
				}
			});
		},
		loadfiles: function (table, file, callback) {
			var fields = table.fields;
			var t = table.identifier;
			var tasks = [];

			tasks.push((done) => {
				pool.query(`drop table if exists staging_${t}`, done);
			});
			tasks.push((done) => {
				pool.query(`create /*temporary*/ table staging_${t} (like ${t})`, done);
			});
			tasks.push((done) => {
				pool.query(`drop table if exists temp_${t}`, done);
			});
			tasks.push((done) => {
				pool.query(`create /*temporary*/ table temp_${t} (like ${t})`, done);
			});
			tasks.push((done) => {
				var fields = file.fields.map((f) => {
					return `"${f}"`;
				}).join(",");
				pool.query(`copy temp_${t} (${fields})
					from '${file.file}' credentials 'aws_iam_role=${redshift.loaderRole}'
					CSV GZIP NULL AS '\\\\N' ACCEPTANYDATE TIMEFORMAT 'YYYY-MM-DD HH:MI:SS' IGNOREHEADER 1 COMPUPDATE OFF`, done);
			});
			tasks.push((done) => {
				var fstring = Object.keys(fields).map((f) => {
					return `"${fields[f].column}"`;
				}).join(",");
				var f = Object.keys(fields).map((f) => {
					var field = fields[f];
					var defaultValue = field.default != null ? mysql.escapeValue(field.default) : 'NULL';
					if (field.column === "_id") {
						if (table.identifier == "d_date" || table.identifier == "d_time") {
							var q = `GREATEST((select max(_id) from ${t} where _id < 10000), (select max(_id) from staging_${t} where _id < 10000), 1)`;
						} else {
							var q = `GREATEST((select max(_id) from ${t}), (select max(_id) from staging_${t}), 10000)`;
						}
						return `coalesce(t."${field.column}", s."${field.column}", d."${field.column}", ROW_NUMBER() over (partition by t."${field.column}", s."${field.column}", d."${field.column}" order by t.id) + ${q})`;
					} else if (field.dimension && !field.hidden) {
						return `coalesce(t."${field.column}", s."${field.column}", d."${field.column}")`;
					} else {
						return `coalesce(t."${field.column}", s."${field.column}", d."${field.column}", ${defaultValue})`;
					}
				}).join(',');
				pool.query(`insert into staging_${t} (${fstring})
					select ${f}
					from (
					   select temp_${t}.*,ROW_NUMBER() over (partition by id order by id) as r
					   FROM temp_${t}
					) t
					left join staging_${t} as s on t.id = s.id
					left join (
						select *
                        from ${t}
                        where id in (select id from temp_${t})) as d on t.id = d.id
					where t.r = 1
					;`, done);
			});
			tasks.push(function (done) {
				pool.query(`drop table if exists temp_${t}`, done);
			});
			async.series(tasks, function (err, results) {
				if (err) {
					console.log(err);
				}
				console.log("table is loaded");
				callback(err);
			});
		},
		loadStaging: function (table, loadedTables, callback) {
			var fields = table.fields;
			var t = table.identifier;
			var tasks = [];
			tasks.push((done) => {
				pool.query(`drop table if exists load_${t}`, done);
			});
			tasks.push((done) => {
				pool.query(`create /*temporary*/ table load_${t} (like ${t})`, done);
			});

			var joins = [];
			var join_id = 0;
			var joinColumns = [];

			var fstring = Object.keys(fields).map((f) => {
				return `"${fields[f].column}"`;
			}).join(",");

			var f = Object.keys(fields).map((f) => {
				var field = fields[f];
				var defaultValue = field.default != null ? mysql.escapeValue(field.default) : 'NULL';
				if (field.dimension && !field.isJunkDim && !field.hidden && ['d_date', 'd_time'].indexOf(field.dimension) === -1) {
					join_id++;
					joins.push(`LEFT JOIN ${field.dimension} as d_${join_id} on d_${join_id}.id = staging_${t}._${field.column}`);
					if (field.dimension in loadedTables) {
						joins.push(`LEFT JOIN staging_${field.dimension} as ds_${join_id} on ds_${join_id}.id = staging_${t}._${field.column}`);
						joinColumns.push(`GREATEST(max(d_${join_id}._id), max(ds_${join_id}._id)) as ${field.column}`);
					} else {
						joinColumns.push(`max(d_${join_id}._id) as ${field.column}`);
					}
					return `COALESCE(dims."${field.column}", staging_${t}."${field.column}", ${defaultValue})`;
				} else {
					return `staging_${t}."${field.column}"`;
				}
			}).join(',');
			if (joinColumns.length) {
				tasks.push((done) => {
					pool.query(`insert into load_${t} (${fstring})
					with dims as (
						select staging_${t}.id, ${joinColumns.join(",")}
						from staging_${t}
						${joins.join('\n')}
						group by 1
					)
					select ${f}
					from staging_${t}
					join dims on dims.id =  staging_${t}.id;`, done);
				});
				tasks.push((done) => {
					pool.query(`delete from ${t} using load_${t} where load_${t}.id=${t}.id`, done);
				});
				tasks.push(function (done) {
					pool.query(`ALTER TABLE ${t} APPEND FROM load_${t}`, done);
				});
			} else {
				//This is done here so that I don't have to vacuum the staging table first
				tasks.push((done) => {
					pool.query(`insert into load_${t} (${fstring})
					select ${f}
					from staging_${t};`, done);
				});
				tasks.push((done) => {
					pool.query(`delete from ${t} using load_${t} where load_${t}.id=${t}.id`, done);
				});
				tasks.push(function (done) {
					pool.query(`ALTER TABLE ${t} APPEND FROM load_${t}`, done);
				});
			}
			async.series(tasks, function (err, results) {
				console.log(`${table.identifier} is dimensionalized`);
				callback(err);
			});
		},
		new: (connectionOptions) => {
			return build(connectionOptions);
		},
		setActive: function (connectionOptions) {
			current = this.new(connectionOptions);
		}
	});
	var redshiftTypes = {
		'character varying': 'string',
		'integer': 'int',
		'bigint': 'bigint',
		'timestamp': 'datetime',
		//"timestamp without time zone": "datetime",
		'date': 'date',
		'bool': 'bool',
		'boolean': 'bool',
		'real': 'float'
	};

	function fieldToType(field, isNew) {
		switch (field.dtype.toLowerCase()) {
		case 'int':
			return 'INTEGER DEFAULT ' + (field.default !== null ? mysql.escapeValue(parseInt(field.default)) : "NULL");
			break;
		case 'bigint':
			return 'BIGINT DEFAULT ' + (field.default !== null ? mysql.escapeValue(parseInt(field.default)) : "NULL");
			break;
		case 'float':
			return 'REAL DEFAULT ' + (field.default !== null ? mysql.escapeValue(parseFloat(field.default)) : "NULL");
			break;
		case 'bool':
			return 'BOOLEAN DEFAULT ' + (field.default !== null ? mysql.escapeValue(field.default) : "NULL");
			break;
		case 'datetime':
			return 'TIMESTAMP DEFAULT ' + (field.default !== null ? mysql.escapeValue(field.default) : "NULL");
			break;
		case 'date':
			return 'DATE DEFAULT ' + (field.default !== null ? mysql.escapeValue(field.default) : "NULL");
			break;
		case 'string':
			return `VARCHAR (255) DEFAULT ${field.default !== null ? mysql.escapeValue(field.default) : 'NULL'}`;
		};
	}

	function createTable(t, callback) {
		var hasDate = false;

		var fieldSql = [];
		var positions = [];
		for (var key in t.fields) {
			var field = t.fields[key];
			if (field.id == 'd_date') {
				hasDate = true;
			}
			if (field.column) {
				fieldSql.push(`"${field.column}" ${fieldToType(field)}`);
				positions.push(key);
			}
		}

		var sql = `create table "${t.identifier}" ( ${fieldSql.join(',')})`;

		if (t.identifier.match(/^d_/)) {
			sql += " DISTSTYLE ALL sortkey(_id)";
		}
		if (t.identifier.match(/^f_/) && hasDate) {
			sql += "sortkey(d_date)";
		}
		pool.query(sql, function (err, results) {
			if (t.isDimension) {
				pool.query(`insert into "${t.identifier}" (_id) values(1)`, function (err, results) {
					callback(err, positions);
				})
			} else {
				callback(err, positions);
			}
		});
	}

	function modifyTable(r, t, callback) {
		var newFields = [];
		var positions = [];
		for (var key in r.fields) {
			positions[r.fields[key].pos] = key;
		}

		Object.keys(t.fields).filter((f) => {
			return t.fields[f].column
		}).forEach(function (f) {
			var field = t.fields[f];
			var rField = r.fields[field.column];
			field.len = Math.min(field.len, 255);

			if (!(field.column in r.fields)) {
				console.log("New Column", field.column);
				newFields.push(function (done) {
					pool.query(`alter table "${t.identifier}" add column "${field.column}" ${fieldToType(field,true)}`, done);
				});
				positions.push(positions);
			} else if (rField.dtype == "string" && rField.len < field.len || (fieldRank[field.dtype] > fieldRank[rField.dtype] && !field.locked)) {
				console.log("Modified Column", field.column);
				if (`_new_${field.column}` in r.fields) {
					newFields.push(function (done) {
						pool.query(`alter table "${t.identifier}" drop column "_new_${field.column}"`, done);
					});
				}

				newFields.push(function (done) {
					pool.query(`alter table "${t.identifier}" add column "_new_${field.column}" ${fieldToType(field)}`, done);
				});

				if (rField.dtype != "bool") {
					newFields.push(function (done) {
						pool.query(`update "${t.identifier}" SET  "_new_${field.column}" =  "${field.column}"`, done);
					});
				}

				newFields.push(function (done) {
					pool.query(`alter table "${t.identifier}" drop column "${field.column}"`, done);
				});
				newFields.push(function (done) {
					pool.query(`alter table "${t.identifier}" RENAME COLUMN  "_new_${field.column}" TO "${field.column}"`, done);
				});
			}
		});

		async.series(newFields, function (err, results) {
			callback(err, positions);
		});
	}

	return cache[cacheKey] = redshift;
}

current = module.exports = build(connections.getPostgres());
