"use strict";

exports.handler = require("leo-sdk/wrappers/resource")(async (event, context, callback) => {

	const config = require("leo-config");
	await config.run;
	var fields = require("../../lib/fields.js");

	var reportMainLib = require("../../lib/report/main.js");
	var pivot = require("../../lib/report/format/pivot.js");
	var async = require("async");
	var crypto = require("crypto");
	var clone = require('lodash').cloneDeep;
	var sort = require('../../lib/report/format/sort.js');

	var request = require("leo-auth");

	var utils = require("../../lib/utils.js");
	var zlib = require('zlib');
	let archiver = require("archiver");
	let leo = require("leo-sdk");
	let moment = require("moment");
	let MAX_UI_ROWS = 2000;

	let redshift = require("../../lib/report/redshift.js");
	const connections = require("../../lib/connections");
	let primaryClientConfig = connections.getDefault();
	let redshiftClientConfig = connections.getRedshift();

	let checkApiKey = utils.checkApiKey;
	utils.checkApiKey = (apiKey, callback) => {
		checkApiKey(apiKey, (err, data) => {
			if (err) {
				callback(err);
			} else {
				fields.getTableAndFields((ferr) => {
					callback(err || ferr, data)
				});
			}
		})
	}
	process.dw_fields = null;
	let reportMain = reportMainLib;
	context.callbackWaitsForEmptyEventLoop = false;
	var options = event.body;
	console.time("Total");

	options.groups = options.groups || options.dimensions || [];
	options = Object.assign({
		top: {
			direction: "desc"
		},
		groups: [],
		metrics: [],
		partitions: [],
		filters: [],
		sort: [],
	}, options);

	if (options.redshift && redshiftClientConfig.host) {
		console.log("Setting Redshift as Active DB");
		redshift.setActive(redshiftClientConfig);
	} else if (primaryClientConfig.type == "Postgres") {
		console.log("Setting Primary Aurora as Active DB");
		redshift.setActive(primaryClientConfig);
	}

	if (options.filters) {
		options.filters = options.filters.filter(f => !(f.value == undefined || (Array.isArray(f.value) && f.value.length == 0) || f.value == ""));
	}

	if (typeof options.top.limit === "string") {
		try {
			let rpt = JSON.parse(options.top.limit);
			options.reportId = rpt.reportId;
			options.params = rpt.params;
			options.pivots = rpt.pivots;
			options.pivotDefaults = rpt.pivotDefaults;
		} catch (e) {}
	}
	var globalReportParams = {
		filters: [],
		groups: [],
		partitions: [],
		metrics: [],
		sorts: [],
		numericFormat: false,
		redshift: options.redshift,
		asOfDate: options.timestamp || undefined
	};
	if (options.numericFormat) {
		globalReportParams.numericFormat = true;
	}

	var groups = [];
	if (!Array.isArray(options.groups)) {
		Object.keys(options.groups).forEach(function (g) {
			groups.push(options.groups[g]);
		});
		options.groups = groups;
	}
	options.groups.forEach(function (group) {
		if (group) {
			globalReportParams.groups.push(group);
		}
	});

	options.partitions.forEach(function (partition) {
		if (partition) {
			globalReportParams.partitions.push(partition);
		}
	});

	options.filters.forEach(function (filter) {
		if (filter.id) {
			globalReportParams.filters.push(filter);
		}
	});

	var sortedColumns = {};
	options.sort.forEach(function (sort) {
		if (sort.column !== undefined) {
			if (sort.direction !== 'desc') {
				sort.direction = 'asc';
			}
			sortedColumns[sort.column] = 1;
			globalReportParams.sorts.push(sort);
		}
	});

	globalReportParams.groups.forEach(function (group, i) {
		if (!(i in sortedColumns)) { //then if not sorted we want to sort it
			globalReportParams.sorts.push({
				direction: 'asc',
				column: i
			});
		}
	});
	var reports = {};
	var metrics = [];
	if (!Array.isArray(options.metrics)) {
		Object.keys(options.metrics).forEach(function (m) {
			metrics.push(options.metrics[m]);
		});
		options.metrics = metrics;
	}
	let finalMetricOrder = [];
	options.metrics = metrics = options.metrics.filter(metric => options.groups.indexOf(metric) == -1);
	options.metrics.forEach(function (metric) {
		if (metric) {
			var extraOptions = {};
			if (!metric.id) {
				metric = {
					id: metric
				};
			}
			finalMetricOrder.push(metric.id);
			if (metric.filters) {
				extraOptions.filters = metric.filters.sort(function (a, b) {
					return a.id.localeCompare(b.id);
				});
			}
			if (metric.partitions) {
				extraOptions.partitions = metric.partitions.slice(0);
			}

			var optionStringId = JSON.stringify(extraOptions);
			if (!(optionStringId in reports)) {
				reports[optionStringId] = {
					metrics: [],
					filters: extraOptions.filters || [],
					partitions: extraOptions.partitions || []
				};
			}
			reports[optionStringId].metrics.push(metric.id);
		}
	});
	if (options.reportId) {
		options.metrics = [];
		let type = options.redshift ? "postgres" : primaryClientConfig.type.toLowerCase() //"mysql"
		let cachedData;
		reportMain = {
			topResults: function (limit, topField, direction, groups, metric, done) {
				var dynamodb = require("leo-sdk").aws.dynamodb;
				console.log(`dw-report-${options.reportId}`);
				var escape = reportMainLib[type].escape;
				if (escape.escapeValue) {
					escape = escape.escapeValue
				}
				dynamodb.getSetting(`dw-report-${options.reportId}`, (err, data) => {
					cachedData = data && JSON.stringify(data.value);
					options.params = Object.assign({}, data && data.value.params, options.params);
					Object.keys(options.params || {}).map(key => {
						let regex = new RegExp(`:${key}`, "g");
						if (!Array.isArray(options.params[key])) {
							options.params[key] = [options.params[key]];
						}
						cachedData = cachedData.replace(regex, options.params[key].map(v => {
							return v == undefined ? 'null' : escape(v);
						}).join(","));
					});
					let topFilters = [];
					try {
						cachedData = JSON.parse(cachedData);
						Object.assign(options, cachedData.options || {});
						Object.assign(globalReportParams, cachedData.globalReportParams || {});
						Object.assign(reports, cachedData.reports || {});
						Object.keys(reports).map(id => {
							reports[id].query = cachedData.queries[id][type].replace(/^.*rm:["']?null["']?.*$/gm, "");
						})
						topFilters = cachedData.topFilters || [];
					} catch (e) {
						cachedData = null;
					}
					done(null, topFilters);
				})
			},
			run: function (report, calcs, factTables, done) {
				let r = reportMainLib[type];
				console.time(`dw-report`);
				reportMainLib.run(report, calcs, factTables, (err, rows, hash) => {
					console.timeEnd(`dw-report`);
					done(err, rows, hash);
				})
			}
		};
	}

	console.time("auth");
	var allFields = options.metrics.concat(options.groups, options.partitions);
	return request.authorize(event, {
		lrn: 'lrn:leo:dw:::',
		action: "report",
		context: ["leo_dw_report"],
		dw: {
			filter: createFilterPolicy(options.filters, allFields),
			field: createFieldPolicy(allFields)
		}
	}).then(async user => {
		console.timeEnd("auth");
		if (!event.body.poll) {
			let cb = callback;
			callback = (err, report) => {
				if (err) return cb(err);

				// write csv to s3
				let now = moment();
				let s3prefix = (event.body.s3prefix || "open/").replace(/\/+/g, "/").replace(/^\/(.*)/, "$1");
				let baseFilename = `files/dw_reports/${now.format("YYYY/MM/DD/")}${s3prefix}report_${now.valueOf()}_${Math.floor(Math.random() * 1000000)}`
				let streams = [{
					filename: `${baseFilename}.${options.zip?'zip': 'csv'}`,
					field: "download"
				}];
				if (!options.noExcel) {
					streams.push({
						filename: `${baseFilename}_excel.${options.zip?'zip': 'csv'}`,
						excel: true,
						field: "exceldownload"
					});
				}
				report.total = report.rows.length;

				async.map(streams, (streamConfig, done) => {
					let archive = options.zip && archiver('zip') || undefined;
					let csvFilename = streamConfig.filename
					let stream = leo.streams.through((a, b) => b(null, a));
					archive && archive.append(stream, {
						name: "report.csv"
					});
					let streamStart = archive || stream;
					leo.streams.pipe(
						streamStart,
						leo.streams.toS3(leo.configuration.s3, csvFilename),
						(err) => {

							if (!err) {
								report[streamConfig.field] = {
									url: leo.aws.s3.getSignedUrl('getObject', {
										Bucket: leo.configuration.s3,
										Key: csvFilename
									})
								};
							} else {
								report[streamConfig.field] = {
									error: err.toString()
								};
							}
							done();
						}
					);
					createCSV(stream, report, options.use_tabs == undefined ? false : options.use_tabs, options.show_report_header == undefined ? true : options.show_report_header, options.show_headers == undefined ? true : options.show_headers, streamConfig.excel);
					stream.end(() => {
						archive && archive.finalize();
					});

				}, () => {
					report.rows = report.rows.slice(0, MAX_UI_ROWS);
					report.count = report.rows.length;
					cb(null, report);
				});
			}
		}

		if (event.body.poll == true) {
			console.log(event);
			event.body.s3 = "report_" + Date.now() + "_" + Math.floor(Math.random() * 1000000) + ".json";

			// TODO: Invoke Lambda to run
			return callback(null, {
				poll: event.body.s3
			});
		} else if (event.body.poll) {
			let leo = require("leo-sdk");
			let key = "files/dw_reports/" + event.body.poll;
			console.log("Getting Report from S3", leo.configuration.s3, key);
			leo.aws.s3.getObject({
				Bucket: leo.configuration.s3,
				Key: key,
			}, (err, data) => {
				if (err && err.code == 'NoSuchKey') {
					return callback(null, {
						poll: event.body.poll
					});
				} else if (!err && data) {
					data = JSON.parse(data.Body);
				}
				callback(err, data);
			});
			return;
		} else if (event.body.s3) {
			let cb = callback;
			callback = (err, data) => {
				if (err) {
					return cb(err);
				}
				let leo = require("leo-sdk");
				let key = "files/dw_reports/" + event.body.s3;
				console.log("Uploading Report to S3", leo.configuration.s3, key);
				leo.aws.s3.upload({
					Bucket: leo.configuration.s3,
					Key: key,
					Body: JSON.stringify(data)
				}, (err) => {
					console.info("done uploading results", err || "");
					cb(err);
				});
			};
		}

		let contextFilters = user && user.context && user.context.leo_dw_report && user.context.leo_dw_report.filters;
		if (contextFilters) {
			function fixReportForContext(report, factTables) {
				report.filters = report.filters.filter(f => {
					return !f.tables || f.tables.reduce((b, t) => {
						return b || factTables[t] || !factTables[t.replace(/^!/, "")];
					}, false)
				});
			}
			let reportMainRun = reportMain.run;
			reportMain.run = (report, calcs, factTables, callback) => {
				fixReportForContext(report, factTables);
				return reportMainRun(report, calcs, factTables, callback);
			}

			let userConfigurationErrors = [];
			contextFilters.map(f => {
				let key = f.value;
				var part;
				if (key && key.match && (part = key.match(/\${(.*)}/))) {
					if (part[1].match(/context\./)) {
						let fnString = `(function(context){return ${part[1]}})`;
						f.value = eval(fnString)(user.context);
					} else {
						f.value = user.context[part[1]];
					}
				}

				// If Explicit null context, ignore this filter
				if (f.value !== null) {
					if (f.value === undefined) {
						userConfigurationErrors.push(`"${part[1]}"`);
						return;
					}
					f.fromContext = true;
					if (f.requiredTables) {
						if (!Array.isArray(f.requiredTables)) {
							f.requiredTables = [f.requiredTables];
						}
						f.requiredTables.map(t => {
							if (t.on) {
								let onArray = t.on;
								if (!Array.isArray(onArray)) {
									onArray = [onArray];
								}
								t.on = (util) => {
									return onArray.map(on => {
										if (on.match && (part = on.match(/\${(.*?)}/g))) {
											let ignoreFilter = false;
											on = on.replace(/\${(.*?)}/g, function (a, b) {
												let value;
												if (b.match(/^context\./)) {
													let fnString = `(function(context){return ${b}})`;
													value = eval(fnString)(user.context);
												} else {
													value = user.context[b];
												}

												// Explicit null context, ignore this 'on' clause
												if (value === null) {
													ignoreFilter = true;
													return null;
												}
												return util.escapeValue(value);
											});
											if (ignoreFilter) {
												return undefined;
											}
										}
										return on;
									}).filter(f => f !== undefined).join(" and ");
								}
							}
						})
					}
					globalReportParams.filters.push(f)
				}
			});
			if (userConfigurationErrors.length) {
				return callback(`User Misconfigured.  Missing context values for ${userConfigurationErrors.join(", ")}`)
			}
		}

		utils.checkApiKey(options.apikey, function (err, data) {
			if (err) {
				callback(err)
				return;
			}
			if (options.top && options.top.field && options.top.field.match(/^d_/)) {
				options.top.field = options.metrics[0];
			}
			reportMain.topResults(options.top.limit, (options.top.field || {}).id || options.top.field, options.top.direction || 'desc', options.groups, (options.top.filters || []).concat(globalReportParams.filters), function (err, topFilters) {
				options.printCache && console.log(JSON.stringify({
					reports: reports,
					options: options,
					globalReportParams: globalReportParams,
					topFilters: topFilters
				}, null, 2));
				for (var i = 0; i < topFilters.length; i++) {
					var filter = topFilters[i];
					if (!filter.value || filter.value.length === 0) {
						callback(null, []);
						return;
					}
				}
				//Now let's go through and make every report complete
				// and then run the reports
				var tasks = [];

				Object.keys(reports).forEach(function (key) {
					var report = reports[key];
					report.logQueries = !!options.return_queries;
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
					topFilters.forEach(function (filter) {
						report.filters.push(filter);
					});
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
					report.redshift = options.redshift;
					tasks.push(function (callback) {
						console.time("fields");
						fields.calcsByFieldId(Object.keys(myfields), {
							fieldsFromConfig: !report.redshift
						}, function (err, calcs, factTables) {
							if (err) {
								callback(err);
							} else {
								console.timeEnd("fields");
								console.time("report" + key);
								reportMain.run(report, calcs, factTables, function (err, result, executedQueries) {
									console.timeEnd("report" + key);
									if (err) {
										callback(err);
									} else {
										console.time("firstPivot" + key);
										var pivoted = pivot(
											report.partitions, [].concat(report.groups).concat(report.metrics), {
												data: result,
												filters: [],
												columns: [].concat(calcs)
											}, [], "raw"
										);
										pivoted.queries = executedQueries;
										console.timeEnd("firstPivot" + key);
										callback(null, pivoted);
									}
								});
							}
						});
					});
				});
				async.series(tasks, function (err, results) {
					if (err) {
						console.log(err);
						callback(err);
					} else {
						var groupLength = globalReportParams.groups.length + globalReportParams.partitions.length;

						var hashRowsIndex = {};
						var rowIndex = 0;
						var newRows = [];
						var newCalcs = [];
						var metrics = [];
						var outColumns = {};
						var queries = [];
						console.time("Joining");
						results.map((e, resultIndex) => {
							if (e.queries) {
								queries = queries.concat(e.queries);
							}
							for (let i = 0; i < e.rows.length; i++) {
								var row = e.rows[i];

								var groupColumns = row.slice(0, groupLength);
								var hash = crypto.createHash('sha1').update(groupColumns.join(" ")).digest('base64');
								if (!(hash in hashRowsIndex)) {
									hashRowsIndex[hash] = rowIndex++;
									newRows[hashRowsIndex[hash]] = groupColumns;
									newRows[hashRowsIndex[hash]].length = groupColumns.length + newCalcs.length;
								}
								newRows[hashRowsIndex[hash]] = newRows[hashRowsIndex[hash]].concat(row.slice(groupLength));
							}
							for (var i = 0; i < e.mapping.length; i++) {
								var col = clone(e.mapping[i]);

								if (col.type == "metric") {
									newCalcs.push(col);
									if (e.headers.length > 1) {

										var label = e.headers[0][i - groupLength].value;
										if (typeof label == "string") {
											label = label.trim();
										}
										if (label === null || label === undefined || label === "") {
											label = "N/A";
										}
										col.outColumn.label = label;
										col.alias = col.alias + "!" + label;
									}
									metrics.push(col.alias);
								} else if (resultIndex === 0) { //only on the first result
									newCalcs.push(col);
								}
							}
							for (var key in e.columns) {
								outColumns[key] = e.columns[key];
							}
						});
						console.timeEnd("Joining");

						globalReportParams.filters.map(function (e) {
							if (!newCalcs.some(function (c) {
									return c.alias == e.id;
								})) {
								newCalcs.push(outColumns[e.id]);
							}
						});
						console.time("pivot");

						var pivoted = pivot(
							globalReportParams.partitions, [].concat(globalReportParams.groups).concat(metrics), {
								data: newRows,
								filters: [],
								columns: newCalcs
							}, globalReportParams.sorts, globalReportParams.numericFormat
						);

						console.timeEnd("pivot");
						finalSort(pivoted, newCalcs, globalReportParams.sorts, globalReportParams.numericFormat, options);
						Object.keys(pivoted.columns).forEach(function (key) {
							pivoted.columns[key].outColumn.id = pivoted.columns[key].alias;
							pivoted.columns[key] = pivoted.columns[key].outColumn;
						});

						Object.keys(pivoted.mapping).forEach(function (key) {
							pivoted.mapping[key] = pivoted.mapping[key].outColumn;
						});

						pivoted.headerMapping = [];
						var offset = globalReportParams.groups.length;
						for (let i = 0; i < pivoted.headers.length; i++) {
							var row = pivoted.headers[i];
							pivoted.headerMapping[i] = [];

							var columnCount = offset;
							for (let j = 0; j < row.length; j++) {
								var span = row[j].span || 1;
								for (let k = 0; k < span; k++) {
									pivoted.headerMapping[i][columnCount++] = j;
								}
							}
						}

						pivoted.filters = globalReportParams.filters;
						for (let i = 0; i < pivoted.filters.length; i++) {
							pivoted.filters[i].label = pivoted.columns[pivoted.filters[i].id].label;
							pivoted.filters[i].dimension = pivoted.columns[pivoted.filters[i].id].parent;
						}
						pivoted.top = options.top;

						if (options.pivots) {

							let dims = pivoted.columnheaders.length - Object.keys(pivoted.headers[0]).length;
							let rows = [];

							let pivots = {};
							let newDims = {};
							let newDimsColumns = [];
							let cnt = 0;
							Object.keys(options.pivots).map((k, i) => {
								// headermappings remove
								pivoted.headerMapping.map((m, mi) => {
									let v = m.splice(-1, 0);
								});

								pivots[options.metrics[k]] = options.pivots[k];

								if (!(options.pivots[k] in newDims)) {
									let dimIndex = newDims[options.pivots[k]] = cnt++;
									newDimsColumns.push((options.pivotDefaults || {})[options.pivots[k]] || null);

									// columnheaders insert new
									pivoted.columnheaders.splice(dims + dimIndex, 0, {
										id: `_pivot_${dimIndex}`,
										type: "attribute",
										width: 120
									});
									//headermappings add null
									pivoted.headerMapping.map(m => {
										m.splice(dims + dimIndex, 0, null);
									});
									// mapping insert new
									pivoted.mapping.splice(dims + dimIndex, 0, {
										format: "string",
										id: `_pivot_${dimIndex}`,
										label: options.pivots[k],
										sort: {
											type: "string"
										},
										type: "attribute"
									});
									pivoted.columns[`_pivot_${dimIndex}`] = {
										format: "string",
										id: `_pivot_${dimIndex}`,
										label: options.pivots[k],
										sort: {
											type: "string"
										},
										type: "attribute"
									}
								}

							});

							pivoted.rows.map(row => {
								let newRow = row.slice(0, dims).concat(newDimsColumns);

								let added = false;
								pivoted.headers[0].map((pivot, i) => {
									if (pivots[pivot.id] != undefined) {
										let v = (row[dims + i] || 0) * 1;
										if (v != 0) {
											let p = newDims[pivots[pivot.id]];
											newRow[dims + p] = pivoted.columns[pivot.id].label;
											rows.push([].concat(newRow));
											//rows.push([].concat(newRow).concat([pivoted.columns[pivot.id].label, row[dims + i]]));
											added = true;
										}
									} else {
										newRow.push(row[dims + i]);
									}
								});

								if (!added) {
									rows.push([].concat(newRow));
								}
							});
							pivoted.rows = rows;

							pivoted.columnheaders = pivoted.columnheaders.filter(o => !(o.id in pivots));
							pivoted.mapping = pivoted.mapping.filter(o => !(o.id in pivots));
							pivoted.headers = pivoted.headers.map(h => {
								return h.filter(o => !(o.id in pivots));
							});
						}
						if (options.return_queries) {
							pivoted.queries = queries;
						}
						console.timeEnd("Total");
						if (event.headers && "x-leo-accept-encoding" in event.headers) {
							callback(null, {
								statusCode: 200,
								headers: {
									'Content-Type': 'application/json',
									'Content-Encoding': 'gzip'
								},
								body: zlib.gzipSync(JSON.stringify(pivoted)).toString("base64"),
								isBase64Encoded: true
							});
						} else {
							pivoted.filters = pivoted.filters.filter(f => !f.fromContext);
							callback(null, pivoted);
						}
					}
				});
			});
		});
	});

	function finalSort(result, inputColumns, sorts, numberOnly, options) {
		let rows = options.skipSort === true ? result.rows : result.rows.sort(sort.getMultiCompare(sorts, result.mapping));

		var totals = {
			columns: [

			],
			grand: {

			},
			rowHeaders: [],
			rows: [

			]
		};
		if (rows.length === 0) {
			totals.columns = [0];
			totals.grand = [0];
			totals.rows = [
				[0]
			];
		} else {
			var cols = [];
			var rowMapping = {};
			var grandMapping = {};

			var rowValuesToClone = [];

			var columnInRowIndex = -1;
			for (var i = 0; i < rows[0].length; i++) {
				var column = result.mapping[i];
				if (column.type === "metric") {
					cols.push(i);
					totals.columns[i] = 0;

					if (!(column.alias in totals.grand)) {
						totals.rowHeaders.push(column.alias);
						columnInRowIndex++;
						rowValuesToClone[columnInRowIndex] = 0;
						totals.grand[column.alias] = 0;
					}
					rowMapping[i] = columnInRowIndex;
					grandMapping[i] = column.alias;
				}
			}
			var colLength = cols.length;

			//now time to loop through everything
			for (var i = rows.length - 1; i >= 0; i--) {
				var t = rowValuesToClone.slice(0);
				var row = rows[i];
				for (var j = 0; j < colLength; j++) {
					var x = cols[j];
					totals.columns[x] += row[x];
					totals.grand[grandMapping[x]] += row[x];

					t[rowMapping[x]] += row[x];
				}
				totals.rows[i] = t;
			}
		}
		if (numberOnly !== "raw") {
			inputColumns.forEach(function (column) {
				column.postProcess(rows, result.mapping, {
					totals: totals
				});
			});
		}

		result.sorted = {};
		for (i = 0; i < sorts.length; i++) {
			result.sorted[sorts[i].column] = {
				position: i + 1,
				direction: sorts[i].direction,
				auto: sorts[i].auto
			};
		}
		var length = rows.length;
		var mapping = result.mapping;
		if (length) {
			var columnLength = rows[0].length;
			if (result.hasColumnMetrics) {
				for (i = 0; i < length; i++) {
					var row = rows[i];
					for (var j = 0; j < columnLength; j++) {
						row[j] = mapping[j].formatter(row[j]);
					}
				}
			} else {
				var metricColumn = result.columnheaders.length - 1;
				for (i = 0; i < length; i++) {
					var row = rows[i];
					var column = result.columns[row[metricColumn]];
					for (var j = 0; j < metricColumn; j++) {
						row[j] = mapping[j].formatter(row[j]);
					}
					row[metricColumn] = column.label;
					var formatter = column.formatter;
					for (var j = metricColumn + 1; j < columnLength; j++) {
						row[j] = formatter(row[j]);
					}
				}
			}
			result.rows = rows;
		} else {
			result.rows = [];
		}
	}

	function createFilterPolicy(filters, fields) {
		var mapping = {
			"=": "=",
			"in": "=",
			"!in": "!=",
			"!=": "!="
		}

		var result = {};
		filters.map(f => {
			result[f.id + (mapping[f.comparison] || f.comparison || "=")] = f.value
		});

		fields.map(d => {
			if (d.id && d.filters) {
				var id = d.id.split("|")[0];
				result[id] = {};
				d.filters.map(f => {
					result[id][f.id + (mapping[f.comparison] || f.comparison || "=")] = f.value
				});
			}
		});
		return result;
	}

	function createFieldPolicy(fields) {
		var result = fields.map(f => (f.id || f).split("|")[0]).sort();
		return result;
	}

	function createCSV(stream, report, use_tabs, show_report_header, show_headers, excel = false) {
		var separator = (use_tabs ? '\t' : ',');
		var quote = (true ? '"' : '');
		let escapeQuotes = (v) => {
			if (v && v.replace) {
				return v.replace(/"/g, '""');
			}
			return v
		};

		var rowsResult = {
			push: (data) => {
				stream.write(data + "\n");
			}
		};

		var column_or_row_metrics = [];
		var column_dimensions = [];
		var row_dimensions = [];

		report.rowheaders.map((column, i) => {

			if (column.type != "metric") {
				if (column.type != "metrics") {
					column_dimensions.push(report.columns[column.id].parent + '.' + report.columns[column.id].label);
				}
			} else {
				column_or_row_metrics.push(report.columns[column.id].parent + ' ' + report.columns[column.id].label);
			}

		});

		report.columnheaders.map((row, i) => {
			if (row.type != "metric") {
				if (row.type != "metrics") {
					row_dimensions.push(report.columns[row.id].parent + '.' + report.columns[row.id].label);
				}
			} else {
				column_or_row_metrics.push(report.columns[row.id].parent + ' ' + report.columns[row.id].label);
			}

		});

		if (show_report_header) {

			rowsResult.push(column_or_row_metrics.join(' and ') + (column_dimensions.length > 0 ? ' BY: ' + column_dimensions.join(' and ') : '') + (column_dimensions.length > 0 && row_dimensions.length > 0 ? ' and' : '') + (row_dimensions.length > 0 ? ' BY: ' + row_dimensions.join(' and ') : ''));

			var row_2_filters = [];
			var filterData = report.filters;

			for (var i = 0; i < filterData.length; i++) {
				row_2_filters.push(filterData[i].dimension + '.' + filterData[i].label + ' ' + (filterData[i].comparison || 'in') + ' ' + filterData[i].value.join(', '))
			}

			rowsResult.push(quote + 'Filtered By: ' + (row_2_filters.length > 0 ? row_2_filters.join(' and ') : '') + quote);
			rowsResult.push(quote + 'Queried: ' + moment().format('Y/MM/DD HH:mm:ss') + quote);

			//rowsResult.push(quote + decodeURIComponent(document.location.href).replace(/"/g, '"' + quote) + quote);

			rowsResult.push(' ');
		}

		//for each actual header row, build the csv row
		if (show_headers) {
			report.headers.forEach((headerGroup, rowIndex) => {

				//Pad the left for each column header row
				var row = [];
				for (var i = 0; i < report.columnheaders.length; i++) {
					if (report.columnheaders[i].type == "metrics") {
						if (rowIndex == report.headers.length - 1) {
							row.push("Metrics");
						} else {
							row.push("");
						}
					} else {
						if (report.columnheaders[i].type != "metric") {
							if (rowIndex == report.headers.length - 1) {
								row.push(report.columns[report.columnheaders[i].id].label);
							} else {
								row.push("");
							}
						}
					}
				}

				//Push the header values
				headerGroup.forEach((header, index) => {
					if (header.type == "metric") {
						row.push(report.columns[header.id].label);
					} else {
						if (header.span) {
							for (var i = 0; i < header.span; i++) {
								row.push(header.value);
							}
						} else {
							row.push(header.value);
						}
					}
				});

				//push on to rows
				rowsResult.push(row.map(v => quote + escapeQuotes(v) + quote).join(separator));
			});
		}

		//This is where we actually build the rows of data, including the row headers
		report.rows.map((column, i) => {
			rowsResult.push(column.map(v => {
				if (excel && v != undefined && (typeof v == "number" || (v.match && v.match(/^[\d\,\.\-]+$/)))) {
					// if the value only contains numbers, add the = to keep long numbers from being displayed as scientific notation.
					return quote + escapeQuotes(v.replace ? v.replace(/,/g, '') : v) + quote;
				} else {
					if (!excel || /[",\n\r]/.test(v)) {
						return quote + escapeQuotes(v) + quote;
					} else {
						return v
					}
				}
			}).join(separator));
		});
	}
});
