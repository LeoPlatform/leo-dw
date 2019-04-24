var redshift = require("./report/redshift");
var request = require("leo-auth");
var dynamodb = require("leo-sdk").aws.dynamodb;
var tableUtils = require("./table.js");
var fieldUtils = require("./fields.js");
var async = require("async");

var dateUtils = require("./date.js");
var timeUtils = require("./time.js");

var moment = require("moment");

var q = require("q");

var ls = require('leo-sdk').streams;
var fs = require("fs");

var FIELDS_TABLE = require("leo-config").Resources.fields;

//9a94b7a..437b8ea

module.exports = {
	createTable: function (type, name, fields, callback) {
		var creator = tableUtils.tableCreator();
		var table = creator.getTable(type, name);
		var newFields = {};

		function replace(fields) {
			var newFields = {};
			for (var key in fields) {
				var value = fields[key];
				if (value && typeof value == "object") {
					newFields[key] = replace(fields[key]);
				} else {
					if (value == "int") {
						newFields[key] = 0;
					} else if (value == "string") {
						newFields[key] = "";
					} else if (value == "float") {
						newFields[key] = 1.1;
					} else if (value == "bigint") {
						newFields[key] = 2147483649;
					} else if (value == "datetime" || value == "date") {
						newFields[key] = moment().format();
					}
				}
			}
			return newFields;
		}
		var newFields = replace(fields);
		tableUtils.parseInput(newFields).forEach((field) => {
			var fieldData = table.getField(field);
			fieldData.shouldSupport(field.val, {
				isTimestamp: field.isTimestamp
			});
			if (fieldData.dtype == "string") {
				fieldData.len = 255;
			}
		});

		this.updateTableFields(creator, () => {
			var fields = Object.keys(table.fields).map((key) => {
				return table.fields[key];
			}).filter((field) => {
				return field.id !== "_id" && (field.dimension == false || field.hidden);
			});

			var f = fields.map((field) => {
				return field.column;
				if (field.dimension || field.hidden) {
					return field.id.replace(/.*:/, '').replace(/\s+/, '_').toLowerCase();
				} else {
					return field.column;
				}
			});
			callback(null, creator, table, f);
		});
	},

	stage: function (creator, table, fields, stream, callback) {
		var tempFile = "/tmp/oneoffdw.gz";

		var file = {
			bucket: configure.bus.s3,
			key: "test/soemthing.csv.gz",
			sql_staging_table: `${table.identifier}_staging`,
			headers: fields,
			table: table.identifier,
			dimColumns: []
		};

		var dictionary = {};
		return ls.pipe(stream, ls.gzip(), ls.toS3(file.bucket, file.key), (err) => {
			console.log("done with writing");
			this.updateTableFields(creator, (err, dictionary) => {
				fields.forEach((f) => {
					if (!f.match(/^d_/)) {
						return;
					}
					var field = dictionary[table.identifier].fields[f];
					if (field.dimension == "d_date" || field.dimension == "d_time") {
						file.dimColumns.push({
							dim: field.dimension,
							_id: field.column,
							id: null
						});
					} else {
						file.dimColumns.push({
							dim: field.dimension,
							_id: null,
							id: "_" + field.column
						});
					}
				});
				if (table.isDimension) {
					file.dimColumns.push({
						dim: table.identifier,
						_id: null,
						id: "id"
					});
				}

				this.sendCSVToRedshiftStaging(table, file, (err) => {
					callback(err, file, dictionary);
				});
			});
		});
	},
	sendCSVToRedshiftStaging: function (table, file, callback) {
		var headers = file.headers;

		var pool = redshift.pool;

		var stage = [];
		var staging = file.sql_staging_table;
		stage.push((done) => {
			pool.query(`drop table if exists ${staging}`, done);
		});
		stage.push((done) => {
			pool.query(`select "column", type, encoding, distkey, sortkey, "notnull" from pg_table_def where tablename = '${table.identifier}' ;`, function (err, data) {
				var fields = {};
				data.forEach((field, i) => {
					fields[field.column] = {
						column: field.column,
						position: i,
						type: field.type.match(/character/) ? "character varying(255)" : field.type,
						encoding: field.encoding,
						notnull: field.notnull
					};
				});
				var positionalFields = Object.keys(fields).map((key) => {
					return fields[key];
				}).sort((a, b) => {
					return a.position - b.position;
				});
				file.sqlFields = positionalFields;

				var fields = positionalFields.map((f) => {
					return `"${f.column}" ${f.type} encode raw ${f.notnull?"NOT NULL":""}`;
				});
				pool.query(`Create table ${staging}(${fields})`, done);
			});
		});
		stage.push((done) => {
			var fields = headers.map((f) => {
				return `"${f}"`;
			}).join(",");
			pool.query(`copy ${staging} (${fields})
								  from 's3://${file.bucket}/${file.key}' credentials 'aws_iam_role=${configure.redshift.loaderRole}'
								  ESCAPE REMOVEQUOTES ACCEPTINVCHARS TRUNCATECOLUMNS GZIP NULL AS '\\\\N' ACCEPTANYDATE TIMEFORMAT 'YYYY-MM-DD HH:MI:SS' IGNOREHEADER 1 COMPUPDATE OFF`, done);
		});

		stage.push((done) => {
			pool.query(`drop table if exists ${staging}_temp;`, done);
		});

		stage.push((done) => {
			pool.query(`create table ${staging}_temp (like ${staging});`, done);
		});

		stage.push((done) => {
			pool.query(`alter table ${staging}_temp add rowindex int;`, done);
		});

		stage.push((done) => {
			pool.query(`insert into ${staging}_temp
      select * from (select *, ROW_NUMBER() OVER (PARTITION BY id) r
      FROM ${staging})
      where r=1;`, done);
		});

		stage.push((done) => {
			pool.query(`alter table ${staging}_temp drop column rowindex;`, done);
		});

		stage.push((done) => {
			pool.query(`drop table if exists ${staging};`, done);
		});

		stage.push((done) => {
			pool.query(`alter table ${staging}_temp rename to ${staging};`, done);
		});

		async.series(stage, function (err) {
			callback(err);
		});
	},
	updateTableFields: function (creator, callback) {
		var dictionary = {};
		var saveTables = {};
		creator.getTableStore().map((t) => {
			saveTables[t.identifier] = t;
		});
		fieldUtils.checkTables(saveTables, function (err) {
			dynamodb.scan(FIELDS_TABLE, {}, function (err, data) {
				data.forEach((r) => {
					for (var i in r.fields) {
						// Bug fix, create a migration for this instead
						if (r.fields[i].default === " ") {
							r.fields[i].default = null;
						}
						if (r.fields[i].dtype == "string" && r.fields[i].default === 0) {
							r.fields[i].default = null;
						}
						//END Bug fix
					}
					dictionary[r.identifier] = r;
				});
				redshift.checkTables(dictionary, function (err) {
					console.log("Done updating fields");
					callback(err, dictionary);
				});
			});
		});
	},
	createLookupTables: function (tables, callback) {
		var pool = redshift.pool;
		var dimensions = {};
		tables.forEach((table) => {
			table.dimColumns.forEach((d) => {
				if (!(d.dim in dimensions)) {
					dimensions[d.dim] = {
						table: d.dim,
						tables: []
					};
				}
				dimensions[d.dim].tables.push({
					_id: d._id,
					id: d.id,
					table: table.sql_staging_table
				});
			});
		});

		var tasks = [];
		Object.keys(dimensions).forEach((dim_table) => {
			var dim = dimensions[dim_table];
			tasks.push((done) => {
				if (dim_table == "d_date" || dim_table == "d_time") {
					var selects = dim.tables.map((table) => {
						return `select ${table._id} _id, ${table.id} id from ${table.table}`;
					});
					pool.query(`INSERT into ${dim_table} (_id)
						with ids as (
						  ${selects.join(" UNION ")}
						)
						select t._id
						FROM (
						  select distinct _id
						  from ids
						) t
						LEFT JOIN ${dim_table} on ${dim_table}._id = t._id
						WHERE ${dim_table}._id is null and t._id is not null`,
					done);
				} else {
					var selects = dim.tables.map((table) => {
						return `select ${table._id} _id, ${table.id} id from ${table.table}`;
					});
					dim.lookup_table = `${dim_table}_lookup`;

					pool.query(`drop table if exists ${dim_table}_lookup;`, function (err, result) {
						pool.query(`select max(_id) as maxId FROM ${dim_table}`, function (err, result) {
							console.log('-----result----', result);
							if (result) {
								var maxid = Math.max(result[0].maxid, 10000);
							} else {
								var maxid = 10000;
							}

							pool.query(`
								  create table ${dim_table}_lookup as
  								  with ids as (
  								    (select _id, id from ${dim_table} limit 0)
  								    UNION
  								   	${selects.join(" UNION ")}
  								  )
  								  Select coalesce(idsnew._id, ROW_NUMBER() over (PARTITION BY idsnew._id) + ${maxid}) as _id, idsnew.id, case when idsnew._id is null then 1 else 0 end as isNew
  								  from (
			                      select max(coalesce(case when ids.id is null then 1 else null end, ids._id, ${dim_table}._id)) as _id,  ids.id
			  						FROM ids
			                    	LEFT join ${dim_table} on ids.id = ${dim_table}.id
			                      	group by ids.id
  								  ) AS idsnew
								`, done);
						});
					});
				}
			});
		});
		async.parallelLimit(tasks, 10, function (err, sqlresults) {
			console.log(err);
			console.log("done");
			if (err) {
				callback(err);
				return;
			}
			callback(null, dimensions);
		});
	},
	importStagingTables: function (files, dictionary, lookupTables, callback) {
		redshift.connection({}, (err, pool) => {
			if (err) {
				callback(err);
				return;
			}

			var cleanupTasks = [];

			//let's figure out what data we need loaded
			var loadedTables = [];
			files.map((file) => {
				loadedTables.push(file.table);
			});

			var tableTasks = [];

			var neededLookupTables = [];
			Object.keys(lookupTables).forEach((table) => {
				var lookup = lookupTables[table];

				if (lookup.lookup_table && loadedTables.indexOf(table) === -1) { //Then we are not loading this table, so we need to load all the lookups
					tableTasks.push((done) => {
						pool.query(`insert into ${table} (_id,id)
							select lookup._id, lookup.id
							from ${lookup.lookup_table} lookup
              WHERE isNew = 1
							`, done);
					});
					cleanupTasks.push((done) => {
						pool.query(`drop table if exists ${lookup.lookup_table}`, done);
					});
				}
			});

			//let's import all of the dimension lookups

			files.forEach((file) => {
				tableTasks.push((done) => {
					var table = dictionary[file.table];

					var fields = Object.keys(table.fields).map((id) => {
						return table.fields[id];
					}).filter((f) => {
						return f.column;
					});

					var loading = file.sql_loading_table = file.table + "_loading";
					var staging = file.sql_staging_table;

					var fstring = fields.map((f) => {
						return `"${f.column}"`;
					}).join(",");

					var tasks = [];
					tasks.push((done) => {
						//create new load table
						pool.query(`drop table if exists ${loading}`, done);
					});
					tasks.push((done) => {
						//create new load table
						pool.query(`create table ${loading} (like ${staging})`, done);
					});
					tasks.push((done) => {
						var joins = [];
						if (table.isDimension) {
							joins.push(`JOIN ${file.table}_lookup l on l.id = s.id`);
							joins.push(`LEFT JOIN (select * from ${file.table} where id in (select id from ${staging})) t on t._id = l._id`);
						} else {
							joins.push(`LEFT JOIN (select * from ${file.table} where id in (select id from ${staging})) t on t.id = s.id`);
						}

						var f = fields.map((field) => {
							if (table.isDimension && field.column == "_id") {
								return `l._id`;
							} else if (table.isDimension && field.column == "id") {
								return `l.id`;
							} else {
								var defaultValue = field.default != null ? redshift.escape.escapeValue(field.default) : 'NULL';
								if (field.column.match(/^d_/) && field.dimension != "d_date" && field.dimension != "d_time") {
									if (file.headers.indexOf(field.column) !== -1) {
										joins.push(`LEFT JOIN ${field.dimension}_lookup join_${field.column} on join_${field.column}.id = s._${field.column}`);
										return `coalesce(s."${field.column}", join_${field.column}._id, t."${field.column}")`;
									} else {
										return `t."${field.column}"`;
									}
								} else {
									return `coalesce(s."${field.column}", t."${field.column}", ${defaultValue})`;
								}
							}
						}).join(',');
						pool.query(`insert into ${loading} (${fstring})
          select ${f}
          FROM ${staging} s
          ${joins.join("\n")}
          ;`, done);
					});

					tasks.push((done) => {
						pool.query(`begin read write`, done);
					});

					if (table.isDimension) {
						tasks.push((done) => {
							pool.query(`delete from ${file.table} where ${file.table}._id in (select _id from ${loading})`, done);
						});
					} else {
						tasks.push((done) => {
							pool.query(`delete from ${file.table} where ${file.table}.id in (select id from ${loading})`, done);
						});
					}
					tasks.push(function (done) {
						pool.query(`insert into ${file.table} select * from ${loading}`, done);
					});
					tasks.push((done) => {
						pool.query(`commit`, done);
					});
					tasks.push((done) => {
						pool.close();
						done();
					});
					async.series(tasks, done);

					cleanupTasks.push((done) => {
						pool.query(`drop table if exists ${loading}`, done);
					});
					cleanupTasks.push((done) => {
						pool.query(`drop table if exists ${staging}`, done);
					});
				});
			});
			async.parallelLimit(tableTasks, 5, (err) => {
				if (err) {
					callback(err);
				} else {
					async.parallelLimit(cleanupTasks, 5, callback);
				}
			});
		});
	},
	removeTable: function (type, name, callback) {
		var creator = tableUtils.tableCreator();
		var table = creator.getTable(type, name);

		var pool = redshift.pool;

		pool.query(`drop table if exists ${table.identifier}_deleted`, () => {
			pool.query(`alter table ${table.identifier} rename TO ${table.identifier}_deleted`, () => {
				dynamodb.delete(FIELDS_TABLE, table.identifier, {
					id: "identifier"
				}, function (err, data) {
					callback();
				});
			});
		});
	},
	removeTables: function (tables, callback) {
		var tasks = tables.map((table) => {
			return (done) => {
				this.removeTable(table.type, table.name, done);
			};
		});
		async.parallel(tasks, callback);
	},
	fixDates: function (callback) {
		var pool = redshift.pool;

		function updateDateFields() {
			var deferred = q.defer();
			var newFields = [];

			dynamodb.get(FIELDS_TABLE, "d_date", {
				"id": "identifier"
			}, function (err, data) {
				if (err) {
					deferred.reject(err);
				} else {
					if (!data || !data.identifier || !data.fields.month_name) {
						var val = {
							"fields": {
								"_id": {
									"column": "_id",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "_id",
									"isJunkField": false,
									"label": " Id",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"business_days_left_in_month": {
									"column": "business_days_left_in_month",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "business_days_left_in_month",
									"isJunkField": false,
									"label": "Business Days Left In Month",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"date": {
									"column": "date",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "date",
									"isJunkField": false,
									"label": "Date",
									"len": 10,
									"sort": {
										"type": "string"
									}
								},
								"day_of_month": {
									"column": "day_of_month",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "day_of_month",
									"isJunkField": false,
									"label": "Day Of Month",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"day_of_week_name": {
									"column": "day_of_week_name",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "day_of_week_name",
									"isJunkField": false,
									"label": "Day Of Week Name",
									"len": 9,
									"sort": {
										"type": "enum",
										"values": [
											"Sunday",
											"Monday",
											"Tuesday",
											"Wednesday",
											"Thursday",
											"Friday",
											"Saturday"
										]
									}
								},
								"day_of_week_number": {
									"column": "day_of_week_number",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "day_of_week_number",
									"isJunkField": false,
									"label": "Day Of Week Number",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"days_left_in_month": {
									"column": "days_left_in_month",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "days_left_in_month",
									"isJunkField": false,
									"label": "Days Left In Month",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"description": {
									"column": "description",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "description",
									"isJunkField": false,
									"label": "Description",
									"len": 12,
									"sort": {
										"type": "string"
									}
								},
								"id": {
									"column": "id",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "id",
									"isJunkField": false,
									"label": "Id",
									"len": 12,
									"sort": {
										"type": "string"
									}
								},
								"month_ending_date": {
									"column": "month_ending_date",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "month_ending_date",
									"isJunkField": false,
									"label": "Month Ending Date",
									"len": 10,
									"sort": {
										"type": "string"
									}
								},
								"month_name": {
									"column": "month_name",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "month_name",
									"isJunkField": false,
									"label": "Month Name",
									"len": 9,
									"sort": {
										"type": "enum",
										"values": [
											"January",
											"February",
											"March",
											"April",
											"May",
											"June",
											"July",
											"August",
											"September",
											"October",
											"November",
											"December"
										]
									}
								},
								"month_number": {
									"column": "month_number",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "month_number",
									"isJunkField": false,
									"label": "Month Number",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"quarter": {
									"column": "quarter",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "quarter",
									"isJunkField": false,
									"label": "Quarter",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"week_ending_date": {
									"column": "week_ending_date",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "week_ending_date",
									"isJunkField": false,
									"label": "Week Ending Date",
									"len": 10,
									"sort": {
										"type": "string"
									}
								},
								"week_number": {
									"column": "week_number",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "week_number",
									"isJunkField": false,
									"label": "Week Number",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"weekday_indicator": {
									"column": "weekday_indicator",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "weekday_indicator",
									"isJunkField": false,
									"label": "Weekday Indicator",
									"len": 7,
									"sort": {
										"type": "string"
									}
								},
								"year": {
									"column": "year",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "year",
									"isJunkField": false,
									"label": "Year",
									"len": 4,
									"sort": {
										"type": "string"
									}
								},
								"year_month": {
									"column": "year_month",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "year_month",
									"isJunkField": false,
									"label": "Year Month",
									"len": 14,
									"sort": {
										"order": [{
											"group": 1,
											"type": "int"
										}, {
											"group": 2,
											"type": "enum",
											"values": [
												"January",
												"February",
												"March",
												"April",
												"May",
												"June",
												"July",
												"August",
												"September",
												"October",
												"November",
												"December"
											]
										}],
										"pattern": "(\\d+) (.*)",
										"type": "pattern"
									}
								},
								"year_quarter": {
									"column": "year_quarter",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "year_quarter",
									"isJunkField": false,
									"label": "Year Quarter",
									"len": 7,
									"sort": {
										"type": "string"
									}
								},
								"year_week": {
									"column": "year_week",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "year_week",
									"isJunkField": false,
									"label": "Year Week",
									"len": 15,
									"sort": {
										"type": "string"
									}
								},
								"is_valid": {
									"column": "is_valid",
									"default": 1,
									"dtype": "int",
									"format": "int",
									"id": "is_valid",
									"isJunkField": false,
									"label": "Is Valid"
								}
							},
							"identifier": "d_date",
							"isDimension": true,
							"isJunkDim": false,
							"label": "Date",
							"type": "dimension"
						};

						dynamodb.put(FIELDS_TABLE, val.identifier, val, {
							"id": "identifier"
						}, function (err, result) {
							if (err) {
								console.error('-------------Unable to update the date dimension fields --------------');
								deferred.reject(err);
							} else {
								console.log('-------------Successfully updated the date dimension fields --------------');
								deferred.resolve(val);
							}
						});
					} else {
						console.log('-------------Date fields already correct --------------');
						deferred.resolve(data);
					}
				}
			});

			return deferred.promise;
		}

		function updateTimeFields() {
			var deferred = q.defer();

			dynamodb.get(FIELDS_TABLE, "d_time", {
				"id": "identifier"
			}, function (err, data) {
				if (err) {
					deferred.reject(err);
				} else {
					if (!data || !data.identifier || !data.fields.am_pm) {
						var val = {
							"fields": {
								"_id": {
									"column": "_id",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "_id",
									"isJunkField": false,
									"label": " Id",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"am_pm": {
									"column": "am_pm",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "am_pm",
									"isJunkField": false,
									"label": "Am Pm",
									"len": 3,
									"sort": {
										"type": "string"
									}
								},
								"hour": {
									"column": "hour",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "hour",
									"isJunkField": false,
									"label": "Hour",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"hour_24": {
									"column": "hour_24",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "hour_24",
									"isJunkField": false,
									"label": "Hour 24",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"id": {
									"column": "id",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "id",
									"isJunkField": false,
									"label": "Id",
									"len": 12,
									"sort": {
										"type": "string"
									}
								},
								"minute": {
									"column": "minute",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "minute",
									"isJunkField": false,
									"label": "Minute",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"second": {
									"column": "second",
									"default": 0,
									"dtype": "int",
									"format": "int",
									"id": "second",
									"isJunkField": false,
									"label": "Second",
									"len": null,
									"sort": {
										"type": "int"
									}
								},
								"time": {
									"column": "time",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "time",
									"isJunkField": false,
									"label": "Time",
									"len": 8,
									"sort": {
										"type": "string"
									}
								},
								"time_24": {
									"column": "time_24",
									"default": " ",
									"dtype": "string",
									"format": "string",
									"id": "time_24",
									"isJunkField": false,
									"label": "Time 24",
									"len": 8,
									"sort": {
										"type": "string"
									}
								},
								"is_valid": {
									"column": "is_valid",
									"default": 1,
									"dtype": "int",
									"format": "int",
									"id": "is_valid",
									"isJunkField": false,
									"label": "Is Valid"
								}
							},
							"identifier": "d_time",
							"isDimension": true,
							"isJunkDim": false,
							"label": "Time",
							"type": "dimension"
						};

						dynamodb.put(FIELDS_TABLE, val.identifier, val, {
							"id": "identifier"
						}, function (err, result) {
							if (err) {
								console.error('-------------Unable to update the time dimension fields --------------');
								deferred.reject(err);
							} else {
								console.log('-------------Successfully updated the time dimension fields --------------');
								deferred.resolve(val);
							}
						});

					} else {
						console.log('-------------Time fields already correct --------------');
						deferred.resolve(data);
					}
				}
			});

			return deferred.promise;
		}

		function checkTimeTable() {
			var deferred = q.defer();
			var newFields = [];
			pool.query(`SELECT COUNT(*) AS columncount FROM INFORMATION_SCHEMA.columns WHERE table_name = 'd_time'`, function (err, result) {
				if (err) {
					console.log(err);
					return deferred.reject(err);
				}
				console.log(result);
				if (result[0].columncount === 2) {
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "_new_id" VARCHAR(15) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "am_pm" VARCHAR (6) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "hour"  INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "hour_24" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "minute" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "second" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "time" VARCHAR(11) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "time_24" VARCHAR(11) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" ADD COLUMN "is_valid" INTEGER DEFAULT 1`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" DROP COLUMN "id"`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_time" RENAME COLUMN  "_new_id" TO "id"`, done);
					});

					async.series(newFields, function (err, data) {
						return deferred.resolve(data);
					});

				} else {
					console.log('-------------Time table up to date --------------');
					return deferred.resolve(null);
				}
			});
			return deferred.promise;
		}

		function checkDateTable() {
			var deferred = q.defer();
			var newFields = [];
			pool.query(`SELECT COUNT(*) AS columncount FROM INFORMATION_SCHEMA.columns WHERE table_name = 'd_date'`, function (err, result) {
				if (err) {
					console.log(err);
					return deferred.reject(err);
				}
				console.log(result);
				if (result[0].columncount === 2) {
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "_new_id" VARCHAR (13) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "date" VARCHAR (13) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "description"  VARCHAR (15) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "day_of_week_name"  VARCHAR (12) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "day_of_week_number" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "day_of_month" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "week_ending_date" VARCHAR (13) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "month_ending_date" VARCHAR (13) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "month_name" VARCHAR (12) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "month_number" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "year_month" VARCHAR (17) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "quarter" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "year_quarter" VARCHAR(10) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "year" VARCHAR(7) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "weekday_indicator" VARCHAR(10) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "week_number" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "year_week" VARCHAR(18) DEFAULT NULL`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "days_left_in_month" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "business_days_left_in_month" INTEGER DEFAULT 0`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" ADD COLUMN "is_valid" INTEGER DEFAULT 1`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" DROP COLUMN "id"`, done);
					});
					newFields.push(function (done) {
						pool.query(`ALTER TABLE "d_date" RENAME COLUMN  "_new_id" TO "id"`, done);
					});

					async.series(newFields, function (err, data) {
						return deferred.resolve(data);
					});
				} else {
					console.log('-------------Date table up to date --------------');
					return deferred.resolve(null);
				}
			});
			return deferred.promise;
		}

		function loadTime() {
			var deferred = q.defer();
			pool.query(`SELECT DISTINCT _id FROM d_time WHERE (id = ' ' OR id is NULL) AND _id > 10000`, function (err, result) {
				if (result.length <= 0) {
					console.log('-------------Time table has no null records --------------');
					deferred.resolve(null);
				} else {

					var sql = `insert into d_time (_id, id, am_pm, hour, hour_24, minute, second, time, time_24, is_valid) values `;
					var r = [];
					result.forEach(function (val) {
						var obj = timeUtils.objFromId(val._id);
						r.push(`(${obj._id}, '${obj.id}', '${obj.am_pm}', ${obj.hour}, ${obj.hour_24}, ${obj.minute}, ${obj.second}, '${obj.time}', '${obj.time_24}', ${obj.is_valid})`);
					});

					sql += r.join(",\n");
					pool.query(sql, function (err, data) {
						if (err) {
							deferred.reject(err);
						} else {
							pool.query(`delete from d_time  where _id > 10000 and (id = ' ' OR id is NULL)`, function (err, data) {
								if (err) {
									deferred.reject(err);
								} else {
									deferred.resolve(data);
								}
							});
						}
					});
				}
			});

			return deferred.promise;
		}

		function loadDate() {
			var deferred = q.defer();

			pool.query(`SELECT DISTINCT _id FROM d_date WHERE (id = ' ' OR id is NULL) AND _id > 10000`, function (err, result) {
				if (result.length <= 0) {
					console.log('-------------Date table has no null records --------------');
					return deferred.resolve(null);
				} else {
					var r = [];
					var sql = `insert into d_date (_id, id, date, description, day_of_week_name, day_of_week_number,
                    day_of_month, week_ending_date, month_ending_date, month_name, month_number, year_month, quarter, year_quarter,
                    year, weekday_indicator, week_number, year_week, days_left_in_month, business_days_left_in_month, is_valid) values `;
					result.forEach(function (val) {
						var obj = dateUtils.objFromId(val._id);
						r.push(`(${obj._id}, '${obj.id}', '${obj.date}', '${obj.description}', '${obj.day_of_week_name}', ${obj.day_of_week_number}, ${obj.day_of_month}, '${obj.week_ending_date}', '${obj.month_ending_date}', '${obj.month_name}', ${obj.month_number}, '${obj.year_month}', '${obj.quarter}', '${obj.year_quarter}', '${obj.year}', '${obj.weekday_indicator}', '${obj.week_number}', '${obj.year_week}', ${obj.days_left_in_month}, ${obj.business_days_left_in_month}, ${obj.is_valid})`);
					});

					sql += r.join(",\n");
					pool.query(sql, function (err, data) {
						if (err) {
							deferred.reject(err);
						} else {
							pool.query(`delete from d_date  where _id > 10000 and (id = ' ' OR id is NULL)`, function (err, data) {
								if (err) {
									return deferred.reject(err);
								} else {
									return deferred.resolve(data);
								}
							});
						}
					});
				}
			});

			return deferred.promise;
		}

		checkTimeTable()
			.then(function () {
				return checkDateTable();
			})
			.then(function () {
				return updateDateFields();
			})
			.then(function () {
				return updateTimeFields();
			})
			.then(function () {
				return loadTime();
			})
			.then(function () {
				return loadDate();
			})
			.catch(function (err) {
				console.log('----could not complete the update----', err);
			})
			.fail(function (err) {
				console.log('----failure updating tables ----', err);
			})
			.done(function (err, data) {
				callback(err && err.length ? err : null, data);
			});
	}
};
