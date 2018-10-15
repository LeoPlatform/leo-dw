let async = require("async");
//let postgres = require("leo-connector-postgres/lib/connect");
let config = require("leo-config");
const lib = require("./util.js");
let postgres = require("../../../lib/report/redshift.js");
module.exports = function (connectionInfo) {
	postgres.setActive(connectionInfo)
	var pool = promise(postgres.current());
	var reportMainLib = fixmain(require("../../../lib/report/main.js"));
	return {
		run: async (data) => {
				let reports = data.reports;
				let globalReportParams = data.globalReportParams;
				return new Promise((resolve, reject) => {
					let tasks = [];
					Object.keys(reports).forEach(function (key) {
						var report = reports[key];
						report.logQueries = !!data.options.return_queries;
						report.asOfDate = globalReportParams.asOfDate;
						//GlobalReport Filter may have duplicates
						var metricFilterIds = {};
						report.filters.map(function (filter) {
							metricFilterIds[filter.id] = true;
						})
						globalReportParams.filters.forEach(function (filter) {
							//only add these if they weren't in the original metric filter ids (i.e. as long as the metric filter isn't trying to override the filter)
							if (!metricFilterIds[filter.id]) {
								report.filters.push(filter);
							}
						});
						// topFilters.forEach(function (filter) {
						// 	report.filters.push(filter);
						// });
						report.groups = globalReportParams.groups.slice(0).concat(globalReportParams.partitions.slice(0));

						var myfields = {};
						report.groups.map(function (e) {
							myfields[e] = 1;
						});
						report.partitions.map(function (e) {
							myfields[e] = 1;
						});
						report.metrics.map(function (e) {
							myfields[e] = 1;
						});
						report.filters.map(function (e) {
							myfields[e.id] = 1;
						});
						tasks.push(async done => {
							let {
								fields,
								factTables
							} = await lib.calcsByFieldId(Object.keys(myfields), {
								fieldsTable: config.Resources.Fields
							});

							let {
								rows,
								executedQueries
							} = await reportMainLib.run(report, fields, factTables);
							try {
								done(null, {
									data: rows,
									partitions: report.partitions.map(p => p.id || p),
									columns: [].concat(report.groups).concat(report.metrics).map(c => c.id || c),
									fields: [].concat(fields)
										.map(f => ({
											id: f.id,
											alias: f.alias,
											format: f.format,
											type: f.type,
											sort: f.sort,
											preProcess: f.preProcess,
											postProcess: f.postProcess,
											outColumn: f.outColumn
										})),
									queries: executedQueries
								})
								// done(null, lib.pivot(
								// 	report.partitions, [].concat(report.groups).concat(report.metrics), {
								// 		data: rows,
								// 		filters: [],
								// 		columns: [].concat(fields)
								// 	}, [], "raw"));
							} catch (err) {
								done(err);
							}
						})
					})
					async.parallelLimit(tasks, 3, (err, results) => {
						if (!err) resolve(results);
						else reject(err);
					});
				});
			},
			preprocess: async (data) => {
				await lib.getTableAndFields({
					fieldsTable: config.Resources.Fields
				});
				return data;
			}
	}
};

function promise(pool) {
	let queryFn = pool.query;
	pool.query.promise = function (query) {
		return new Promise((resolve, reject) => {
			queryFn.call(pool, query, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
	}
	return pool;
}

function fixmain(main) {
	let run = main.run;
	main.run = ((report, fields, factTables) => {
		return new Promise((resolve, reject) => {
			run.call(main, report, fields, factTables, (err, rows, executedQueries) => {
				if (err) {
					reject(err);
				} else {
					resolve({
						rows,
						executedQueries
					});
				}
			})
		})
	}).bind(main);
	return main;
}
