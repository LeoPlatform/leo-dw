"use strict";
var mysql = require('mysql');
var crypto = require("crypto");
var async = require("async");
var fields = require("../fields.js");
var fieldRank = fields.rank;
var calculations;

require("leo-sdk/leoConfigure.js");
const connections = require("../connections");
//var connectionOptions = {};
let connectionOptions = connections.getMySql();
var pool = {
	query: function (query, parameters, callback, config) {
		let options = Object.assign({
			connectTimeout: 60000
		}, connectionOptions, config);

		console.log("SQL query is ", query);
		let connection = mysql.createConnection(options);
		connection.query(query, parameters, function (err, result) {
			console.log("ran query");
			if (!err) {
				callback(null, result);
			} else {
				console.log("Had error", query, err);
				callback(err);
			}
			connection.destroy();
		});
	}
};

mysql.type = connectionOptions.type;
mysql.version = connectionOptions.version;

function queryFactTable(factTable, calcLookups, options, repeatableSha1s, callback) {
	var select = "Select ";
	var joins = [];
	var requiredTables = {};
	var groups = [];
	var filters = [];
	var parameters = [];
	var tableLookups = {};
	Object.keys(calcLookups).map(k => Object.keys(calcLookups[k].tables).map(t => {
		tableLookups[t] = calcLookups[k].tables[t];
	}));

	//If I have filters, let mysql figure out best way to join
	var filtered = false;
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
				filtered = true;
			});
			filters.push(filter.where.mysql);
		} else if (f.requiredTables) {
			if (!Array.isArray(f.requiredTables)) {
				f.requiredTables = [f.requiredTables];
			}
			f.requiredTables.map(table => {
				requiredTables[table.alias] = Object.assign({
					filter: true
				}, table);
			});

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
			return column.mysqlSelect();
		}).join(',');
		parameters.push(factTable.table);
		select += " From ??";
		for (var alias in requiredTables) {
			var dim = requiredTables[alias];
			if (filtered && dim.alias === factTable.table) {
				continue; // Skip joining tables for degenerates
			}
			if (dim.on) {
				if (typeof dim.on == "string") {
					parameters.push(dim.table);
					parameters.push(dim.alias);
					joins.push((dim.joinType || "LEFT") + " JOIN ?? as ?? on " + dim.on);
				} else {
					parameters.push(dim.table);
					parameters.push(dim.alias);
					joins.push((dim.joinType || "LEFT") + " JOIN ?? as ?? on " + dim.on(mysql));
				}
			} else if (dim.joinTable) {
				parameters.push(dim.table);
				parameters.push(dim.alias);
				parameters.push(dim.alias);
				parameters.push(dim.sk);
				parameters.push(dim.joinTable);
				parameters.push(dim.alias.split('$')[1]);
				joins.push(`${filtered ? 'JOIN' : 'STRAIGHT_JOIN'} ?? as ?? on ??.?? = ??.??`);
			} else {
				parameters.push(dim.table);
				parameters.push(dim.alias);
				parameters.push(dim.alias);
				parameters.push(dim.sk);
				parameters.push(factTable.table);
				parameters.push(dim.alias);
				joins.push(`${filtered ? 'JOIN' : 'STRAIGHT_JOIN'} ?? as ?? on ??.?? = ??.??`);
			}
		}

		if (joins.length) {
			select += " " + joins.join(" ");
		}

		if (filters.length) {
			select += " Where " + filters.join(" and ");
		}
		if (groups.length) {
			select += " GROUP BY " + groups.join(",");
			select += " ORDER BY NULL";
		}
	}
	console.log(select, parameters);

	pool.query(select, parameters, function (err, result) {
		if (err) {
			console.log("Error getting data from mysql ", err, select);
			err.sql = select;
			return callback(err);
		}
		var rows = [];
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

function checksum(customer, table, column, fields, lowerBound, upperBound, callback) {
	var select = "SELECT count(*) as cnt, " + "COALESCE(" + "LOWER(CONCAT(LPAD(CONV(BIT_XOR(CAST(CONV(SUBSTRING(@crc, 1, 16), 16, 10) AS UNSIGNED)), 10, 16), 16, '0')," + "LPAD(CONV(BIT_XOR(CAST(CONV(SUBSTRING(@crc := md5(CONCAT_WS('#', `" + fields.join('`,`', fields) + "`)), 17, 16), 16, 10) AS UNSIGNED)), 10, 16), 16, '0')" + "))" + ", 0" + ") AS md5 FROM `" + customer.db + "`." + mysql.escapeId(table) + " FORCE INDEX(`" + column + "`) where " + column + " >= " + mysql.escape(lowerBound) + " and " + column + " <= " + mysql.escape(upperBound);
	console.log(select);

	pool.query(select, function (err, result) {
		callback(null, {
			cnt: result[0].cnt,
			md5: result[0].md5
		});
	});
}

function checksumIndvidual(customer, table, column, fields, lowerBound, upperBound, callback) {
	var select = "SELECT " + column + ", md5(CONCAT_WS('#', `" + fields.join('`,`', fields) + "`)) as md5 FROM `" + customer.db + "`." + mysql.escapeId(table) + " FORCE INDEX(`" + column + "`) where " + column + " >= " + mysql.escape(lowerBound) + " and " + column + " <= " + mysql.escape(upperBound);
	console.log(select);
	pool.query(select, function (err, result) {
		var out = {};
		for (var i = 0; i < result.length; i++) {
			var r = result[i];
			out[r[column]] = r.md5;
		}
		callback(null, out);
	});
}

function getUniqueCombos(customer, columns, inFilters, mapping, repeatAcross, callback) {
	var dimensions = {};
	var columnIds = [];
	var filters = [];
	for (var i = 0; i < columns.length; i++) {
		var column = columns[i];
		dimensions[column.requiredDims[0].alias] = column.requiredDims[0];
		columnIds.push(column.calculation + " as `" + column.id + "`");
	}
	var dims = [];
	for (var name in dimensions) {
		dims.push(dimensions[name]);
	}

	if (inFilters) {
		for (var i = 0; i < inFilters.length; i++) {
			var filter = inFilters[i];
			if (filter === null) { // short circuit when there can't be any results
				callback(null, []);
				return;
			}
			if (filter.dimension in dimensions) {

				if (filter.column === "_id") {
					if (filter.value.length == 1) {
						filters.push(mysql.escapeId(filter.dimension) + "._id =" + mysql.escape(filter.value[0]));
					} else {
						filters.push(mysql.escapeId(filter.dimension) + "._id in (" + filter.value.map(mysql.escape).join(",") + ")");
					}
				} else {
					if (filter.custom) {
						filters.push(filter.custom.join(" and "));
					} else if (!filter.comparison || filter.comparison == "=") {
						filters.push(mysql.escapeId(filter.dimension) + "." + mysql.escapeId(filter.column.replace(" ", "")) + filter.comparison + mysql.escape(filter.value));
					} else if (filter.comparison == "in") {
						filters.push(mysql.escapeId(filter.dimension) + "." + mysql.escapeId(filter.column.replace(" ", "")) + " in (" + filter.value.map(mysql.escape).join(",") + ")");
					} else if (filter.comparison == "between") {
						filters.push(mysql.escapeId(filter.dimension) + "." + mysql.escapeId(filter.column.replace(" ", "")) + " between " + mysql.escape(filter.value[0]) + " and " + mysql.escape(filter.value[1]));
					} else if (filter.comparison == "sql") {
						filters.push(filter.input.value)
					}
				}
			}
		}
	}

	var select = "Select ";
	select += columnIds.join(',');
	select += " From `" + customer.db + "`.`" + dims[0].table + "` as " + dims[0].alias;
	for (var i = 1; i < dims.length; i++) {
		select += " JOIN `" + customer.db + "`.`" + dims[i].table + "` as " + dims[i].alias;
	}

	let where = " Where ";
	let deletedColumn = process.dw_fields && process.dw_fields.fact && process.dw_fields.fact[factTable.table] && process.dw_fields.fact[factTable.table].deletedColumn;
	if (deletedColumn) {
		select += ` Where (${dims[0].alias}.${deletedColumn} = false OR ${dims[0].alias}.${deletedColumn} IS null)`;
		where = " AND ";
	}

	if (filters.length) {
		select += where + filters.join(" and ");
	}

	select += " GROUP BY " + columnIds.map(function (column, i) {
		return i + 1;
	}).join(",");
	select += " ORDER BY NULL";
	console.log(select);
	pool.query(select, function (err, result) {
		if (!err) {
			for (var i = 0; i < result.length; i++) {
				var obj = result[i];
				var row = [];
				for (var field in obj) {
					row[mapping[field]] = obj[field];
				}
				repeatAcross.push(row);
			}
		}
		callback();
	});
}

mysql.escapeValue = function (value) {
	if (value !== undefined && value.replace) {
		return "'" + value.replace("'", "\\'").toLowerCase() + "'";
	} else {
		return value;
	}
};
mysql.escapeValueNoToLower = function (value) {
	if (value !== undefined && value.replace) {
		return "'" + value.replace("'", "\\'") + "'";
	} else {
		return value;
	}
};

module.exports = Object.freeze({
	queryFactTable: queryFactTable,
	getUniqueCombos: getUniqueCombos,
	checksum: checksum,
	checksumIndvidual: checksumIndvidual,
	escape: mysql.escape,
	escapeId: mysql.escapeId,
	setDatabase: function (database) {
		connectionOptions.database = database
	},
	query: pool.query,
	getFields: function (tables, callback) {
		pool.query("select table_name, column_name, data_type, character_maximum_length, ordinal_position from INFORMATION_SCHEMA.COLUMNS where table_name in ('" + tables.join("','") + "')", (err, data) => {
			if (err) {
				callback(err);
			} else {
				var slqTables = {};
				for (var i = 0; i < data.length; i++) {
					var field = data[i];

					if (!(field.table_name in slqTables)) {
						slqTables[field.table_name] = {
							fields: {},
							fieldPositions: []
						}
					}
					slqTables[field.table_name].fieldPositions[field.ordinal_position - 1] = field.column_name;
					slqTables[field.table_name].fields[field.column_name] = {
						id: '',
						column: field.column_name,
						dtype: redshiftTypes[field.data_type],
						len: field.character_maximum_length,
						pos: field.ordinal_position - 1
					};
				}
				callback(null, slqTables);
			}
		});
	},
	checkTables: function (tables, callback) {
		async.parallel({
			columns: (done) => pool.query("select table_name, column_name, data_type, character_maximum_length, ordinal_position from INFORMATION_SCHEMA.COLUMNS where table_name in ('" + Object.keys(tables).join("','") + "')", done),
			index: (done) => pool.query("select table_name, column_name, index_name from INFORMATION_SCHEMA.statistics where table_name in ('" + Object.keys(tables).join("','") + "')", done)
		}, (err, asyncResults) => {
			if (err) {
				callback(err);
			} else {
				let data = asyncResults.columns;
				let index = {};
				asyncResults.index.map(i => {
					let x = index[i.table_name] = index[i.table_name] || {};
					x[i.column_name] = i.index_name;

				});
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
						pos: field.ordinal_position - 1,
						indexed: !!(index[field.table_name] && index[field.table_name][field.column_name])
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
});
calculations = require("./calculations.js");

var redshiftTypes = {
	'character varying': 'string',
	'integer': 'int',
	'bigint': 'bigint',
	'timestamp': 'datetime',
	'date': 'date',
	'bool': 'bool',
	'boolean': 'bool',
	'real': 'float',
	'decimal': 'float',
	'double': 'float',
	'float': 'float',
	'tinyint': 'int',
	'smallint': 'int',
	'mediumint': 'int',
	'bigint': 'bigint',
	'int': 'int',
	'char': 'string',
	'varchar': 'string',
	'longtext': 'string',
	'mediumtext': 'string',
	'text': 'string',
	'bool': 'bool',
	'datetime': 'datetime',
	'date': 'date'
};

function fieldToType(field, isNew) {
	let type = (field.dtype || "string");
	switch (type.toLowerCase()) {
	case 'int':
		return 'INTEGER DEFAULT ' + (field.default != null ? mysql.escapeValue(parseInt(field.default)) : "NULL");
		break;
	case 'bigint':
		return 'BIGINT DEFAULT ' + (field.default != null ? mysql.escapeValue(parseInt(field.default)) : "NULL");
		break;
	case 'float':
		return 'REAL DEFAULT ' + (field.default != null ? mysql.escapeValue(parseFloat(field.default)) : "NULL");
		break;
	case 'bool':
		return 'BOOLEAN DEFAULT ' + (field.default != null ? mysql.escapeValue(field.default) : "NULL");
		break;
	case 'datetime':
		return 'TIMESTAMP DEFAULT ' + (field.default != null ? mysql.escapeValue(field.default) : "NULL");
		break;
	case 'date':
		return 'DATE DEFAULT ' + (field.default != null ? mysql.escapeValue(field.default) : "NULL");
		break;
	case 'string':
		return `VARCHAR (255) DEFAULT ${field.default != null ? mysql.escapeValue(field.default) : 'NULL'}`;
	};
}

function createTable(t, callback) {
	var hasDate = false;

	var fieldSql = [];
	var positions = [];
	var index = [];
	for (var key in t.fields) {
		var field = t.fields[key];
		if (field.column) {
			fieldSql[field.pos] = (`${mysql.escapeId(field.column)} ${fieldToType(field)}`);
			positions[field.pos] = key;
		}

		if (field.column && t.identifier.match(/^f_/) && field.column.match(/^d_/)) {
			index.push(`KEY ${mysql.escapeId(field.column)} (${mysql.escapeId(field.column)})`)
		}
	}
	if (t.identifier.match(/^d_/)) {
		fieldSql.push("PRIMARY KEY ( _id )");
	} else if (t.identifier.match(/^f_/) && !!t.fields.id) {
		fieldSql.push("PRIMARY KEY ( id )");
	}
	fieldSql = fieldSql.concat(index);
	var sql = `create table ${mysql.escapeId(t.identifier)} ( ${fieldSql.join(',')})`;

	pool.query(sql, function (err, results) {
		if (t.isDimension) {
			pool.query(`insert into ${t.identifier} (_id) values(1)`, function (err, results) {
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
	var index = [];
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
				pool.query(`alter table ${mysql.escapeId(t.identifier)} add column ${mysql.escapeId(field.column)} ${fieldToType(field,true)}`, done);
			});
			positions.push(positions);
		} else if (rField.dtype == "string" && rField.len < field.len || (fieldRank[field.dtype] > fieldRank[rField.dtype] && !field.locked)) {
			console.log("Modified Column", field.column);
			if (`_new_${field.column}` in r.fields) {
				newFields.push(function (done) {
					pool.query(`alter table ${mysql.escapeId(t.identifier)} drop column ${mysql.escapeId('_new_' + field.column)}`, done);
				});
			}

			newFields.push(function (done) {
				pool.query(`alter table ${mysql.escapeId(t.identifier)} add column ${mysql.escapeId('_new_' + field.column)} ${fieldToType(field)}`, done);
			});

			if (rField.dtype != "bool") {
				newFields.push(function (done) {
					pool.query(`update ${mysql.escapeId(t.identifier)} SET  ${mysql.escapeId('_new_' + field.column)} =  ${mysql.escapeId(field.column)}`, done);
				});
			}

			newFields.push(function (done) {
				pool.query(`alter table ${mysql.escapeId(t.identifier)} drop column ${mysql.escapeId(field.column)}`, done);
			});
			newFields.push(function (done) {
				pool.query(`alter table ${mysql.escapeId(t.identifier)} RENAME COLUMN  ${mysql.escapeId('_new_' + field.column)} TO ${mysql.escapeId(field.column)}`, done);
			});
		}
		if (t.identifier.match(/^f_/) && field.column.match(/^d_/) && rField && !rField.indexed) {
			index.push(`add index (${mysql.escapeId(field.column)})`);
		}
	});

	if (index.length) {
		newFields.push(function (done) {
			pool.query(`alter table ${mysql.escapeId(t.identifier)} ${index.join(", ")}`, done);
		})
	}
	async.series(newFields, function (err, results) {
		callback(err, positions);
	});
}
