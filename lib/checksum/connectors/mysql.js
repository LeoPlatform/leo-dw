var mysql = require('mysql');
var moment = require('moment');

module.exports = function (options, callback) {
	var mysqlConnection = options.mysqlConnection;
	//mysql will auto connect when a query is run, so just tell it we are ready
	callback(null, {
		name: "Mysql",
		destroy: function () {
			mysqlConnection.end();
		},
		_getFieldTypeHash(opts, callback) {

			mysqlConnection.query(`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
  				FROM INFORMATION_SCHEMA.COLUMNS
  				WHERE table_name = ${mysql.escape(options.table)}
			`, function (err, results) {
				//console.log(err, results, "=============================")
				var lookup = {};
				for (var i = 0; i < results.length; i++) {
					lookup[results[i].COLUMN_NAME] = results[i];
				}

				//console.log(JSON.stringify(lookup, null, 2))
				var fieldCalcs = options.fields.map((f) => {
					if (!(f in lookup)) {
						return `coalesce(md5(${f}), ' ')`;
					}
					var type = lookup[f].DATA_TYPE;
					var column = lookup[f].COLUMN_NAME;
					//console.log(f, lookup[f], lookup[f].DATA_TYPE, lookup[f].COLUMN_NAME)
					//fields.push(column);
					switch (type) {
					case 'tinyint':
					case 'smallint':
					case 'mediumint':
					case 'bigint':
					case 'int':
						return `coalesce(md5(${mysql.escapeId(column)}), ' ')`;
						break;
					case 'char':
					case 'varchar':
						return `coalesce(md5(${mysql.escapeId(column)}), ' ')`;
						break;
					case 'bool':
						return `coalesce(md5(cast(${mysql.escapeId(column)} as integer)), ' ')`;
						break;
					case 'datetime':
					case 'date':
					case 'timestamp':
						return `coalesce(md5(floor(unix_timestamp(${mysql.escapeId(column)})), ' ')`;
						break;
					default:
						return `coalesce(md5(${column}), ' ')`;
					}
				});
				callback(null, fieldCalcs);
			});
		},
		_checksum(type, opts, callback) {
			this._getFieldTypeHash(opts, function (err, fieldCalcs) {
				var startTime = moment.now();
				var idColumn = options.sortField;
				var where = "";

				if (opts.ids) {
					where = `where ${mysql.escapeId(idColumn)} in (${opts.ids.map(f=>mysql.escape(f))})`;
				} else if (opts.start || opts.end) {
					var parts = [];
					if (opts.start) {
						parts.push(`${mysql.escapeId(idColumn)} >= ${mysql.escape(opts.start)}`);
					}
					if (opts.end) {
						parts.push(`${mysql.escapeId(idColumn)} <= ${mysql.escape(opts.end)}`);
					}
					if (options.where) {
						parts.push(options.where);
					}
					where = "where " + parts.join(" and ");
				}
				if (type == "individual") {

					var q = `select ${mysql.escapeId(idColumn)} as id, md5(concat(${fieldCalcs.join(' , ')})) as "hash" from ${mysql.escapeId(options.table)} ${where}`;
					//console.log(q);
					var iquery = mysqlConnection.query(
						q,
						function (err, result) {
							if (err) {
								callback(err);
								return;
							}

							var results = {
								ids: opts.ids,
								start: opts.start,
								end: opts.end,
								qty: result.length,
								checksums: []
							};
							if (options.idMap) {
								results.start = options.idMap(results.start);
								results.end = options.idMap(results.end);
							}
							result.forEach((row) => {
								results.checksums.push({
									id: options.idMap ? options.idMap(row.id) : row.id,
									hash: row.hash
								});
							});
							callback(null, results);
						});

				} else if (type == "batch") {
					var q = `
					select
                        count(*) as cnt,
  						sum(cast(conv(substring(hash, 1, 8), 16, 10) as unsigned)) as sum1,
  						sum(cast(conv(substring(hash, 9, 8), 16, 10) as unsigned)) as sum2,
  						sum(cast(conv(substring(hash, 17, 8), 16, 10) as unsigned)) as sum3,
  						sum(cast(conv(substring(hash, 25, 8), 16, 10) as unsigned)) as sum4
					FROM (
  						select md5(concat(${fieldCalcs.join(',')})) as "hash"
		        		FROM ${mysql.escapeId(options.table)}
	        			${where}
	        			order by ${mysql.escapeId(idColumn)} asc
	        		) as t;`;

					//console.log(q);
					var query = mysqlConnection.query(q, function (err, result) {
						if (err) {
							callback(err);
							return;
						}
						//console.log(err, result, fieldCalcs.join(','), "{{{{{{{{{{{{{{{{{{{{}}}}}}}}}}}}}}}}}}}}")
						var result = {
							start: opts.start,
							end: opts.end,
							duration: moment.now() - startTime,
							qty: result[0].cnt,
							hash: [result[0].sum1, result[0].sum2, result[0].sum3, result[0].sum4]
						};
						result.consumption = Math.round((1000 / Math.max(result.duration)));
						if (options.idMap) {
							result.start = options.idMap(result.start);
							result.end = options.idMap(result.end);
						}
						callback(null, result);
					});
					//console.log(query);
				} else if (type = "sample") {

					var q = `select ${idColumn} as id, ${options.fields.join(",")} from ${mysql.escapeId(options.table)} ${where} order by ${mysql.escapeId(idColumn)} asc`;
					//console.log(q);

					var squery = mysqlConnection.query(q, function (err, data) {
						if (err) {
							callback(err);
							return;
						}
						//console.log(err, data, "++++++++++++++++++++++++");
						var results = {
							ids: opts.ids,
							start: opts.start,
							end: opts.end,
							qty: data.length,
							checksums: data.map(row => {
								return Object.keys(row).map(f => {
									return row[f];
								});
							})
						};
						if (options.idMap) {
							results.start = options.idMap(results.start);
							results.end = options.idMap(results.end);
							results.checksums.map((row) => {

							});
						}
						callback(null, results);
					});
				}
			});
		},
		getChecksum: function (opts, callback) {
			this._checksum("batch", opts, callback);
		},
		getIndividualChecksums: function (opts, callback) {
			this._checksum("individual", opts, callback);
		},
		sample: function (opts, callback) {
			this._checksum("sample", opts, callback);
		},
		range: function (opts, callback) {
			var where = '';
			var checksum = options;
			var idColumn = options.sortField;
			if (checksum.ids) {
				where = `where ${mysql.escapeId(idColumn)} in (${checksum.ids.map(f=>mysql.escape(f))})`;
			} else if (checksum.start || checksum.end || options.where) {
				var parts = [];
				if (checksum.start) {
					parts.push(`${mysql.escapeId(idColumn)} >= ${mysql.escape(checksum.start)}`);
				}
				if (checksum.end) {
					parts.push(`${mysql.escapeId(idColumn)} <= ${mysql.escape(checksum.end)}`);
				}
				if (options.where) {
					parts.push(options.where);
				}
				where = "where " + parts.join(" and ");
			}
			mysqlConnection.query(`
				Select min(${mysql.escapeId(idColumn)}) as min, max(${mysql.escapeId(idColumn)}) as max, count(*) as cnt
				FROM ${mysql.escapeId(options.table)}
	        	${where}
	        `, function (err, result) {
				if (err) {
					callback(err);
				} else {
					//console.log(result[0], "******************")
					callback(null, {
						min: result[0].min,
						max: result[0].max,
						total: result[0].cnt
					});
				}
			});
		},
		nibble: function (nibble, callback) {
			var forward = !nibble.reverse;

			var start = forward ? nibble.start : nibble.min;
			var end = forward ? nibble.max : nibble.end;
			var sort = forward ? "asc" : "desc";

			var idColumn = options.sortField;
			var qString = `
				select ${mysql.escapeId(idColumn)} as val
				FROM ${mysql.escapeId(options.table)}
				where ${mysql.escapeId(idColumn)} between ${mysql.escape(start)} and ${mysql.escape(end)}
				order by ${mysql.escapeId(idColumn)} ${sort}
				limit ${nibble.limit - 1}, 2
	        `.replace(/[\t\r\n]+/g, " ");
			var query = mysqlConnection.query(qString, function (err, results) {

				if (forward) {
					nibble.end = results[0] ? results[0].val : nibble.max;
					nibble.next = results[1] ? results[1].val : null;
				} else {
					nibble.start = results[0] ? results[0].val : nibble.min;
					nibble.next = results[1] ? results[1].val : null;
				}

				callback(null, nibble);
			});
		}
	});
};
