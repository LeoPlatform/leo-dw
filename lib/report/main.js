var crypto = require("crypto");
var mysqlReport = require("./mysql.js");
var redshiftReport = require("./redshift.js");
var util = require("util");
var moment = require('moment');
var async = require('async');
var calculations = require('./calculations.js');
var config = require("../../config.json");
var filterParse = require("../parse/filter.js");
var fields = require("../fields.js");
const connections = require("../../lib/connections");
let primaryClientConfig = connections.getDefault();
let redshiftClientConfig = connections.getRedshift();
let postgresConnector = require("leo-connector-postgres/lib/dwconnect");

var extraOffset = 1;
var hashColumn = 0;
module.exports = function () {
	var that = {};
	that.postgres = redshiftReport;
	that.mysql = mysqlReport;
	that.checksum = function (options, fields, customer, callback) {
		var table = (options.type === 'fact' ? 'f_' : 'd_') + options.table.split(":", 2)[0].replace(/ /g, "_").toLowerCase();

		if (options.individual) {
			mysqlReport.checksumIndvidual(customer, table, options.type === 'fact' ? 'dd_id' : 'id', fields, options.lowerBound, options.upperBound, function (err, result) {
				var compare = options.compare;
				var out = {
					missing: [],
					different: [],
					extra: [],
					received: 0,
					contained: 0,
					differences: 0
				};
				for (var key in compare) {
					out.received++;
					if (!(key in result)) {
						out.missing.push(key);
						out.differences++;
					} else if (result[key] !== compare[key]) {
						out.different.push(key);
						out.differences++;
					}
				}
				for (key in result) {
					out.contained++;
					if (!(key in compare)) {
						out.extra.push(key);
						out.differences++;
					}
				}
				callback(null, out);
			});
		} else {
			mysqlReport.checksum(customer, table, options.type === 'fact' ? 'dd_id' : 'id', fields, options.lowerBound, options.upperBound, callback);
		}
	};

	that.topResults = function (limit, field, direction, dimensions, filters, callback) {
		if (1 || !field) {
			callback(null, []);
		} else {
			var report = redshiftReport;

			var topFields = [];
			dimensions = dimensions.filter(function (x, i) {
				return dimensions.indexOf(x) === i;
			});
			for (var i = 0; i < dimensions.length; i++) {
				topFields.push(dimensions[i]);
			}
			topFields.push(field.id || field);
			for (var i = 0; i < filters.length; i++) {
				if (topFields.indexOf(filters[i].id) === -1) {
					topFields.push(filters[i].id);
				}
			}
			fields.calcsByFieldId(topFields, (err, calcs, factTables) => {
				this.run({
					filters: filters,
					groups: dimensions,
					partitions: [],
					metrics: [field],
					limit: limit,
					sort: {
						field: field,
						direction: direction
					}
				}, calcs, factTables, function (err, data) {
					if (err) {
						callback(err);
					} else {
						var newFilters = [];
						dimensions.forEach(function (dim) {

							var position = calcs.find((field) => {
								return field.alias == dim;
							}).position - 1;
							var filter = {
								id: dim,
								value: []
							};
							for (var x = 0; x < data.length; x++) {
								filter.value.push(data[x][position]);
							}
							newFilters.push(filter);
						});
						callback(null, newFilters);
					}
				});
			});
		}
	};

	that.run = function run(options, calcs, factTables, callback) {
		var report;
		if (options.redshift || primaryClientConfig.type == "Postgres") {
			report = redshiftReport.current(); //.new(redshiftClientConfig);
			// } else if (primaryClientConfig.type == "Postgres") {
			// 	report = redshiftReport.new(primaryClientConfig);
		} else {
			report = mysqlReport;
		}

		var lookups = {};
		for (let i = 0; i < calcs.length; i++) {
			lookups[calcs[i].alias] = calcs[i];
		}
		//I need to pre process any filters that need to happen
		var repeatableSha1s = {};
		var repeatAcross = [];
		var filters = [];

		options.filters.forEach(function (f) {
			if (lookups[f.id].type === "metric" || lookups[f.id].field.degenerate) {
				filters.push(f);
			} else {
				filters.push(filterParse.parse(f, options.asOfDate));
			}
		});

		var sort = null;
		if (options.sort) {
			var alias = lookups[options.sort.field].selectAlias;
		}

		let outQueries = options.logQueries ? [] : undefined;
		var factQueries = [];
		Object.keys(factTables).forEach(function (factTable) {
			factQueries.push(function (cb) {
				var columns = [];
				options.groups.forEach(function (group) {
					columns.push(lookups[group]);
				});
				options.partitions.forEach(function (partition) {
					columns.push(lookups[partition]);
				});
				factTables[factTable].columns.forEach(function (metric) {
					if (options.metrics.indexOf(metric.alias) !== -1 || options.metrics.indexOf(metric.parentAlias) !== -1 || options.groups.indexOf(metric.parentAlias) !== -1) {
						columns.push(metric);
					}
				});

				report.queryFactTable(factTables[factTable], lookups, {
					columns: columns,
					filters: filters,
					sort: {
						field: alias,
						direction: 'desc'
					},
					limit: options.limit,
					query: options.query,
					logQueries: outQueries
				}, repeatableSha1s, cb);
			});
		});
		async.parallelLimit(factQueries, 2, function (err, r) {
			if (err) {
				callback(err);
			} else {
				var results = mergeResults(r, repeatableSha1s, repeatAcross);
				callback(null, results, outQueries);
			}
		});
	}
	return that;
}();

function mergeResults(results, repeatableSha1s, repeatAcross) {
	var out = [];
	// Use the last one, because it has the full row size and we don't need to
	// update sizes...I think?????
	var lastFactResult = results[results.length - 1];
	var hashRowMapping = {};
	if (lastFactResult === undefined) {
		lastFactResult = [];
	}
	for (let i = 0; i < lastFactResult.length; i++) {
		let row = lastFactResult[i];
		hashRowMapping[row[hashColumn]] = i;
		out.push(row.slice(extraOffset));
	}
	for (let x = 0; x < results.length - 1; x++) { // minus one because we
		// already have the last one
		var resultSet = results[x];
		for (let i = 0; i < resultSet.length; i++) {
			let row = resultSet[i];
			let hash = row[hashColumn];
			if (hash in hashRowMapping) { // Need to do a merge
				var existingRow = out[hashRowMapping[hash]];

				for (var j = extraOffset; j < row.length; j++) {
					var value = row[j];
					if (value !== null && value !== undefined) {
						existingRow[j - 1] = value;
					}
				}
			} else {
				out.push(row.slice(extraOffset));
			}
		}
	}
	if (repeatAcross.length) {
		var padArray = !!lastFactResult[0] ? Array.apply(null, Array(lastFactResult[0].length - repeatableSha1s[Object.keys(repeatableSha1s)[0]].length - extraOffset)).map(Number.prototype.valueOf, 0) : [];
		for (var string in repeatableSha1s) {
			var columns = repeatableSha1s[string];
			for (let j = 0; j < repeatAcross.length; j++) {
				var n = repeatAcross[j];
				for (var x = 0; x < n.length; x++) {
					if (n[x] !== undefined) {
						columns[x] = n[x];
					}
				}
				let hash = crypto.createHash('sha1').update(columns.join('')).digest('base64');
				if (!(hash in hashRowMapping)) {
					out.push(columns.slice(0).concat(padArray));
				}
			}
		}
	}
	return out;
}
