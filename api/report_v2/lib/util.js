const crypto = require("crypto");
const clone = require('lodash').cloneDeep;
const configure = require("leo-config");
const calculations = require("../../../lib/report/calculations.js");
const dynamicParse = require("../../../lib/parse/dynamic.js");
const sort = require('../../../lib/report/format/sort.js');
const logger = require("leo-logger")("dw.reports").sub("util");

var async = require("async");
let archiver = require("archiver");
let moment = require("moment");

let MAX_UI_ROWS = 2000;

module.exports = {
	wrapFunctions: (datasource) => {
		Object.keys(datasource).map(k => {
			let v = datasource[k];
			if (typeof v === "function") {
				module.exports.wrap.call(datasource, k, i => i, v);
			}
		});
		return datasource;
	},
	wrap: function (funcName, oldFunc, newFunc) {
		let self = this;
		self[funcName] = async function (...args) {
			let prev = self[funcName].prev;
			self[funcName].prev = oldFunc.bind(self);
			let r = await newFunc.apply(this, args);
			self[funcName].prev = prev;
			return r;
		};
		self[funcName].wrap = function (newFunc) {
			module.exports.wrap.call(self, funcName, self[funcName], newFunc);
			return self[funcName];
		};
	},
	prepare: (async function (data = {}) {
		data.groups = data.groups || data.dimensions || [];
		let options = Object.assign({
			top: {
				direction: "desc"
			},
			groups: [],
			metrics: [],
			partitions: [],
			filters: [],
			sort: [],
		}, data);

		if (options.filters) {
			options.filters = options.filters.filter(f => !(f.value == undefined || (Array.isArray(f.value) && f.value.length == 0) || f.value == ""));
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

		return Promise.resolve({
			options: options,
			globalReportParams,
			groups,
			sortedColumns,
			reports,
			metrics
		});
	}),
	preprocess: (async function (datasource, data, user) {
		console.log(data.globalReportParams.sorts);
		// Add context filters
		this.addContextFilters(datasource, user, data)

		// Add filters to limit to 500 results

		// Allow datasource to preprocess
		return await datasource.preprocess(data);
	}),
	run: (async function (datasource, data) {
		console.log(data.globalReportParams.sorts);
		// Thumbs up, lets do this!
		return datasource.run(data);
	}),
	postprocess: (function (data, options) {

		if (!Array.isArray(data)) {
			data = [data];
		}
		let globalReportParams = options.globalReportParams;
		let groupLength = globalReportParams.groups.length + globalReportParams.partitions.length;
		let hashRowsIndex = {};
		let rowIndex = 0;
		let newRows = [];
		let newCalcs = [];
		let metrics = [];
		let outColumns = {};
		var queries = [];
		logger.time("Joining");
		data.map((report, resultIndex) => {
			if (report.queries) {
				queries = queries.concat(report.queries);
			}
			let e = this.pivot(
				report.partitions, report.columns, {
					data: report.data,
					filters: [],
					columns: report.fields
				}, [], "raw");
			for (let i = 0; i < e.rows.length; i++) {
				let row = e.rows[i];

				let groupColumns = row.slice(0, groupLength);
				let hash = crypto.createHash('sha1').update(groupColumns.join(" ")).digest('base64');
				if (!(hash in hashRowsIndex)) {
					hashRowsIndex[hash] = rowIndex++;
					newRows[hashRowsIndex[hash]] = groupColumns;
					newRows[hashRowsIndex[hash]].length = groupColumns.length + newCalcs.length;
				}
				newRows[hashRowsIndex[hash]] = newRows[hashRowsIndex[hash]].concat(row.slice(groupLength));
			}
			for (var i = 0; i < e.mapping.length; i++) {
				let col = clone(e.mapping[i]);

				if (col.type == "metric") {
					newCalcs.push(col);
					if (e.headers.length > 1) {

						let label = e.headers[0][i - groupLength].value;
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
		logger.timeEnd("Joining");

		globalReportParams.filters.map(function (e) {
			if (!newCalcs.some(function (c) {
					return c.alias == e.id;
				})) {
				newCalcs.push(outColumns[e.id]);
			}
		});

		logger.time("pivot");
		let pivoted = this.pivot(globalReportParams.partitions, [].concat(globalReportParams.groups).concat(metrics), {
			data: newRows,
			filters: [],
			columns: newCalcs
		}, globalReportParams.sorts, globalReportParams.numericFormat);
		logger.timeEnd("pivot");
		this.sort(pivoted, newCalcs, globalReportParams.sorts, globalReportParams.numericFormat, options);

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

		pivoted.filters = pivoted.filters.filter(f => !f.fromContext);
		if (options.options.return_queries) {
			pivoted.queries = queries;
		}
		return this.writeToS3(pivoted, options).then(d => this.limit(d, options.max_rows || MAX_UI_ROWS));
	}),
	authorizeData: function (options = {}) {
		var allFields = options.metrics.concat(options.groups, options.partitions);
		return {
			filter: this.createFilterPolicy(options.filters, allFields),
			field: this.createFieldPolicy(allFields)
		}
	},
	addContextFilters: function (datasource, user, data) {
		let contextFilters = user && user.context && user.context.leo_dw_report && user.context.leo_dw_report.filters;
		let globalReportParams = data.globalReportParams;
		// user.context.supplier_ids = [1234];
		// user.context.account_id = 9876;
		// contextFilters = [{
		// 		"id": "d_supplier.d_account.id",
		// 		"value": "${supplier_ids}"
		// 	},
		// 	{
		// 		"id": "d_retailer.d_account.id",
		// 		"requiredTables": [{
		// 			"alias": "_context_link_1",
		// 			"on": [
		// 				"_context_link_1.supplier_id in (${context.supplier_ids})",
		// 				"_context_link_1.retailer_id = ${context.account_id}"
		// 			],
		// 			"table": "f_trading_partner"
		// 		}],
		// 		"tables": [
		// 			"!f_account"
		// 		],
		// 		"value": "${context.account_id}"
		// 	},
		// 	{
		// 		"id": "d_account.id",
		// 		"tables": [
		// 			"f_account"
		// 		],
		// 		"value": "${[].concat(context.supplier_ids).concat(context.account_id)}"
		// 	},
		// 	{
		// 		"id": "d_account.id",
		// 		"tables": [
		// 			"f_api_logs"
		// 		],
		// 		"value": "${[].concat(context.supplier_ids).concat(context.account_id)}"
		// 	}
		// ];
		if (contextFilters) {
			function fixReportForContext(report, factTables = {}) {
				report.filters = report.filters.filter(f => {
					return !f.tables || f.tables.reduce((b, t) => {
						return b || factTables[t] || !factTables[t.replace(/^!/, "")];
					}, false)
				});
			}
			datasource.run.wrap = function (report) {
				fixReportForContext(report, factTables);
				return this.run.prev(report);
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
				throw new Error(`User Misconfigured.  Missing context values for ${userConfigurationErrors.join(", ")}`)
			}
		}
	},
	createFilterPolicy: function (filters = [], fields = []) {
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
	},
	createFieldPolicy: function (fields = []) {
		var result = fields.map(f => (f.id || f).split("|")[0]).sort();
		return result;
	},
	getDimensionColumn: (column, field) => {
		field = field || {};
		let dimCol = field[`dim_column${column.replace(field.id, "")}`];
		if (dimCol) {
			return dimCol;
		}
		return field.dim_column ? field.dim_column : `d_${column.replace(/_id$/,'').replace(/^d_/,'')}`
	},
	getTableAndFields: function (options = {}) {
		const dynamodb = require("leo-sdk").aws.dynamodb;
		const FIELDS_TABLE = options.fieldsTable;
		return new Promise((resolve, reject) => {
			let callback = (err, data) => {
				if (err) reject(err);
				else resolve(data);
			}
			if (process.dw_fields) {
				callback(null, process.dw_fields);
			} else {
				var doScan = dynamodb.scan;
				if (options.fieldsFromConfig && configure["dw-fields"]) {
					doScan = function (table, opts, callback) {
						process.dw_fields = configure["dw-fields"];
						callback(null, configure["dw-fields"]);
					}
				} else if (configure.dw_fields) {
					doScan = function (table, opts, callback) {
						callback(null, configure.dw_fields);
					}
				}
				doScan(FIELDS_TABLE, {}, function (err, data) {
					var aliases = {};
					if (err) {
						logger.log(err);
						callback(new Error(err));
					} else {
						tables = {
							"fact": {},
							"dimension": {}
						};
						let rank = (a) => {
							return (a.isDimension ? 1 : 0) + (a.isDateDimension ? 1 : 0) + (a.isTimeDimension ? 1 : 0)
						}
						data.sort((a, b) => rank(b) - rank(a));
						let dateDimensionIdentifier;
						let timeDimensionIdentifier;
						for (var i = 0; i < data.length; i++) {
							var table = data[i];
							if (table.isDimension) {
								var outTable = {
									nk: "id",
									sk: "_id",
									type: "dimension",
									attributes: [],
									"dimensions": [],
									"aliases": {},
									"laggable": (table.laggable || ["d_date", "d_time"].indexOf(table.identifier) !== -1) ? true : false,
									"label": table.label || table.identifier,
									"description": table.description || table.column || "",
									"id": table.identifier
								};

								if (table.isDateDimension || table.identifier == "d_date" || table.identifier == "dim_date") {
									outTable.isDateDimension = true;
									tables.dateDimension = outTable;
									outTable.laggable = true;
									dateDimensionIdentifier = table.identifier;
								}
								if (table.isTimeDimension || table.identifier == "d_time" || table.identifier == "dim_time") {
									outTable.isTimeDimension = true;
									tables.timeDimension = outTable;
									outTable.laggable = true;
									timeDimensionIdentifier = table.identifier;
								}

								var attributes = [];

								if (table.structure) {
									for (var key in table.structure) {

										var field = table.structure[key];

										if (typeof field == "string") {
											field = {
												type: field
											};
										}
										field.id = key;
										field.column = key;
										field.label = field.label || field.column.split(/_/).map(f => {
											return f.charAt(0).toUpperCase() + f.slice(1);
										}).join(" ");
										if (field.nk === true || field.type == "nk") {
											outTable.nk = key;
										}
										if (field.sk === true || field.type == "sk") {
											outTable.sk = key;
											continue;
										}

										let hasDateTime = (dateDimensionIdentifier + "time") == field.dimension || (["d_datetime", "datetime", "dim_datetime"].indexOf(field.dimension) !== -1);
										let hasDate = field.dimension && (hasDateTime || (dateDimensionIdentifier && dateDimensionIdentifier == field.dimension) || (["d_date", "date", "dim_date"].indexOf(field.dimension) !== -1));
										let hasTime = field.dimension && (hasDateTime || (timeDimensionIdentifier && timeDimensionIdentifier == field.dimension) || (["d_time", "time", "dim_time"].indexOf(field.dimension) !== -1));

										if (hasDate || hasTime) {
											let timeDim;
											let dateDim;
											let fields = [];

											let prefix = field.dimension.match(/^dim/) ? 'dim' : 'd';
											if (field.dimension == "dim_time" || field.dimension == "dim_datetime" || field.dimension == "d_time" || field.dimension == "d_datetime" || field.dimension == "datetime" || field.dimension == "time") {
												timeDim = `${prefix}_time`;
											}
											if (field.dimension == "dim_date" || field.dimension == "dim_datetime" || field.dimension == "d_date" || field.dimension == "d_datetime" || field.dimension == "datetime" || field.dimension == "date") {
												dateDim = `${prefix}_date`;
											}

											if (dateDim || hasDate) {
												fields.push({
													column: module.exports.getDimensionColumn(`${field.column}_date`, field),
													dimension: dateDim || dateDimensionIdentifier,
													label: field.label + " Date",
													description: (field.description || field.column) + " Date"
												});
											}
											if (timeDim || hasTime) {
												fields.push({
													column: module.exports.getDimensionColumn(`${field.column}_time`, field),
													dimension: timeDim || timeDimensionIdentifier,
													label: field.label + " Time",
													description: (field.description || field.column) + " Time"
												});
											}

											fields.map(field => {
												//field.column = module.exports.getDimensionColumn(field.column, field);
												field.id = field.column;
												if (outTable.dimensions.indexOf(field.column) === -1) {
													outTable.dimensions.push(field.column);
												}
												if (field.column != field.dimension) {
													if (!(field.dimension in aliases)) {
														aliases[field.dimension] = {};
													}
													aliases[field.dimension][field.column] = field.label;
												}

											});
										} else if (!field.hidden) {
											if (field.dimension) {
												field.column = module.exports.getDimensionColumn(field.column, field);
												if (outTable.dimensions.indexOf(field.column) === -1) {
													outTable.dimensions.push(field.column);
												}

												if (field.column != field.dimension) {
													if (!(field.dimension in aliases)) {
														aliases[field.dimension] = {};
													}
													aliases[field.dimension][field.column] = field.label.replace(/Id$/, '');
												}
											} else {
												var attr = {
													id: table.identifier + "." + field.id,
													column: field.column || null,
													label: field.label || field.column,
													description: table.description || table.column || "",
													type: "attribute",
													dtype: (field.type || "varchar").match(/varchar/) ? "string" : field.type,
													isJunkField: field.isJunkField,
													format: field.format || field.type || "string",
													sort: field.sort || {
														type: field.type || "string"
													},
													color: field.color
												};
												if (field.id == "id" && table.identifier == "d_date") {
													attr.quickFilters = [];
												}
												outTable.attributes.push(attr);
											}
										}
									}
								} else {
									for (var key in table.fields) {
										if (key == "_id") continue;
										var field = table.fields[key];
										if (key.match(/^_ts/)) {
											var attr = {
												id: table.identifier + "." + field.id.replace(/:/g, "_"),
												column: field.column || null,
												label: field.label,
												description: table.description || table.column || "",
												type: "attribute",
												dtype: field.dtype,
												isJunkField: field.isJunkField,
												format: field.format || "string",
												sort: field.sort || {
													type: "string"
												},
												color: field.color
											};
											if (field.id == "id" && table.identifier == "d_date") {
												attr.quickFilters = [];
											}
											outTable.attributes.push(attr);
											outTable.attributes.push(Object.assign({}, attr, {
												id: table.identifier + "." + field.column
											}));
										} else if (!field.hidden) {
											if (field.dimension) {
												field.column = module.exports.getDimensionColumn(field.column, field);
												if (outTable.dimensions.indexOf(field.column) === -1) {
													outTable.dimensions.push(field.column);
												}

												if (field.column != field.dimension) {
													if (!(field.dimension in aliases)) {
														aliases[field.dimension] = {};
													}
													aliases[field.dimension][field.column] = field.label;
												}
											} else {
												var attr = {
													id: table.identifier + "." + field.id,
													column: field.column || null,
													label: field.label,
													description: table.description || table.column || "",
													type: "attribute",
													dtype: field.dtype,
													isJunkField: field.isJunkField,
													format: field.format || "string",
													sort: field.sort || {
														type: "string"
													},
													color: field.color
												};
												if (field.id == "id" && table.identifier == "d_date") {
													attr.quickFilters = [];
												}
												outTable.attributes.push(attr);
											}
										}
									}
								}
								tables.dimension[table.identifier] = outTable;
							} else {
								var outTable = {
									nk: "id",
									sk: "_id",
									type: "fact",
									"dimensions": [],
									"aliases": {},
									metrics: [],
									"autoFilters": [],
									"label": table.label || table.identifier,
									"description": table.description || table.column || "",
									"id": table.identifier,
									deletedColumn: table.deletedColumn
								};

								if (outTable.deletedColumn === true || outTable.deletedColumn == undefined) {
									outTable.deletedColumn = leoConfigure.deletedColumn;
								}
								var degenerates = [];

								if (table.structure) {
									for (var key in table.structure) {

										var field = table.structure[key];
										if (typeof field == "string") {
											field = {
												type: field
											}
										}
										field.id = key;
										field.column = key;
										field.label = field.label || field.column.split(/_/).map(f => {
											return f.charAt(0).toUpperCase() + f.slice(1);
										}).join(" ");
										if (field.nk === true || field.type == "nk") {
											outTable.nk = key;
										}
										if (field.sk === true || field.type == "sk") {
											outTable.sk = key;
											continue
										}
										if (field.isDeletedColumn) {
											outTable.deletedColumn = key;
										}

										let hasDateTime = (dateDimensionIdentifier + "time") == field.dimension || (["d_datetime", "datetime", "dim_datetime"].indexOf(field.dimension) !== -1);
										let hasDate = field.dimension && (hasDateTime || (dateDimensionIdentifier == field.dimension) || (["d_date", "date", "dim_date"].indexOf(field.dimension) !== -1));
										let hasTime = field.dimension && (hasDateTime || (timeDimensionIdentifier == field.dimension) || (["d_time", "time", "dim_time"].indexOf(field.dimension) !== -1));

										if (hasDate || hasTime) {
											let timeDim;
											let dateDim;
											let fields = [];

											let prefix = field.dimension.match(/^dim/) ? 'dim' : 'd';
											if (field.dimension == "dim_time" || field.dimension == "dim_datetime" || field.dimension == "d_time" || field.dimension == "d_datetime" || field.dimension == "datetime" || field.dimension == "time") {
												timeDim = `${prefix}_time`;
											}
											if (field.dimension == "dim_date" || field.dimension == "dim_datetime" || field.dimension == "d_date" || field.dimension == "d_datetime" || field.dimension == "datetime" || field.dimension == "date") {
												dateDim = `${prefix}_date`;
											}

											if (dateDim || hasDate) {
												fields.push({
													column: module.exports.getDimensionColumn(`${field.column}_date`, field),
													dimension: dateDim || dateDimensionIdentifier,
													label: field.label + " Date",
													description: (field.description || field.column) + " Date"
												});
											}
											if (timeDim || hasTime) {
												fields.push({
													column: module.exports.getDimensionColumn(`${field.column}_time`, field),
													dimension: timeDim || timeDimensionIdentifier,
													label: field.label + " Time",
													description: (field.description || field.column) + " Time"
												});
											}

											fields.map(field => {
												//field.column = module.exports.getDimensionColumn(field.column, field);
												field.id = field.column;
												if (outTable.dimensions.indexOf(field.column) === -1) {
													outTable.dimensions.push(field.column);
												}

												if (field.column != field.dimension) {
													if (!(field.dimension in aliases)) {
														aliases[field.dimension] = {};
													}
													aliases[field.dimension][field.column] = field.label;
												}
											});
										} else if (!field.hidden || field.isJunkField) {
											if (field.dimension) {
												field.column = module.exports.getDimensionColumn(field.column, field);
												if (field.isJunkField) {
													if (outTable.dimensions.indexOf(field.dimension) === -1) {
														outTable.dimensions.push(field.dimension);
													}
												} else {
													if (outTable.dimensions.indexOf(field.column) === -1) {
														outTable.dimensions.push(field.column);
													}

													if (field.column != field.dimension) {
														if (!(field.dimension in aliases)) {
															aliases[field.dimension] = {};
														}
														aliases[field.dimension][field.column] = field.label.replace(/Id$/, '');;
													}
												}
											} else if (field.type == "degenerate" || key.startsWith("dd_")) {
												degenerates.push(field);
											} else {
												outTable.metrics.push({
													id: table.identifier + "." + key,
													column: key || null,
													label: field.label || key,
													description: field.description || key || "",
													type: "metric",
													dtype: field.dtype || ((field.type || "varchar").match(/varchar|string/) ? "string" : field.type) || "int",
													format: field.format || field.type || "int",
													customCalc: field.customCalc,
													expression: field.expression || field.customCalc,
													sort: field.sort || {
														type: field.type || "int"
													},
													color: field.color
												});
											}
										}
									}
								} else {
									for (var key in table.fields) {
										if (key == "_id") continue;
										var field = table.fields[key];

										if (key.match(/^_ts/)) {
											let attr = {
												id: table.identifier + "." + field.id,
												column: field.column || null,
												label: field.label,
												description: field.description || field.column || "",
												type: "metric",
												format: field.format || "int",
												customCalc: field.customCalc,
												expression: field.expression || field.customCalc,
												sort: field.sort || {
													type: "int"
												},
												color: field.color
											};
											outTable.metrics.push(attr);
											outTable.metrics.push(Object.assign({}, attr, {
												id: table.identifier + "." + field.column
											}));
										} else if (!field.hidden || field.isJunkField) {
											if (field.dimension) {
												if (field.isJunkField) {
													if (outTable.dimensions.indexOf(field.dimension) === -1) {
														outTable.dimensions.push(field.dimension);
													}
												} else {
													if (outTable.dimensions.indexOf(field.column) === -1) {
														outTable.dimensions.push(field.column);
													}

													if (field.column != field.dimension) {
														if (!(field.dimension in aliases)) {
															aliases[field.dimension] = {};
														}
														aliases[field.dimension][field.column] = field.label;
													}
												}
											} else if (field.type == "degenerate" || key.startsWith("dd_")) {
												degenerates.push(field);
											} else {
												outTable.metrics.push({
													id: table.identifier + "." + field.id,
													column: field.column || null,
													label: field.label,
													description: field.description || field.column || "",
													type: "metric",
													format: field.format || "int",
													customCalc: field.customCalc,
													expression: field.expression || field.customCalc,
													sort: field.sort || {
														type: "int"
													},
													color: field.color
												});
											}
										}
									}
								}

								outTable.metrics.push({
									id: table.identifier,
									label: table.label || table.identifier
								});
								tables.fact[table.identifier] = outTable;

								if (degenerates.length) {
									var id = "dd_" + table.identifier;
									outTable.dimensions.push(id);

									var outTable = {
										type: "dimension",
										attributes: [],
										"dimensions": [],
										"aliases": {},
										"laggable": false,
										"label": table.label || id,
										"description": table.description || table.column || "",
										"id": id
									};

									degenerates.forEach(function (field) {
										outTable.attributes.push({
											id: table.identifier + "." + field.id,
											column: field.column || null,
											label: field.label,
											description: field.description || field.column || "",
											type: "attribute",
											dtype: field.dtype || ((field.type || "varchar").match(/varchar/) ? "string" : field.type) || "string",
											format: field.format || "string",
											sort: field.sort || {
												type: "string"
											}
										});
									});
									tables.dimension[id] = outTable;
								}
							}
						}
						for (var dim in tables.dimension) {
							if (dim in aliases) {
								tables.dimension[dim].aliases = aliases[dim];
							}
						}
						process.dw_fields = tables;
						process.dw_fields_cache_time = Date.now();
						callback(null, tables);
					}
				});
			}
		});
	},
	calcsByFieldId: (async function (ids, options = {}) {
		var fields = [];
		var selectAliasOffset = 0;
		var mykeys = {};
		var position = 1;
		for (var i = 0; i < ids.length; i++) {
			var field = calculations.getCalcField(ids[i], selectAliasOffset++);
			if (field.isFX) {
				field.position = position++;
				fields.push(field);
				for (var j = 0; j < field.fxfields.length; j++) {
					var subField = calculations.getCalcField(field.fxfields[j], selectAliasOffset++, field.alias);
					if (j === 0) { //use the first field as my field parameters
						field.id = subField.id;
					}
					if (ids.indexOf(field.fxfields[j]) === -1) {
						mykeys[subField.id] = 1;
						mykeys[subField.parsed.real_table] = 1;
						subField.position = position++;
						fields.push(subField);
					}
				}
			} else {
				mykeys[field.id] = 1;
				mykeys[field.parsed.real_table] = 1;
				field.position = position++;
				fields.push(field);
			}
		}
		var results = {};
		let tables = await this.getTableAndFields(options);
		var fieldLookup = {};
		var outTables = {};
		for (var t in tables.fact) {
			var table = tables.fact[t];
			for (var f in table.metrics) {
				var field = table.metrics[f];
				fieldLookup[field.id] = field;
			}
			fieldLookup[t] = {
				table: t,
				ltable: t,
				label: table.label,
				aliases: table.aliases,
				type: "fact",
				dimensions: table.dimensions,
				description: table.description || table.column || "",
				fullId: t
			};
			outTables[t] = table;
		}
		for (var t in tables.dimension) {
			var table = tables.dimension[t];
			for (var f in table.attributes) {
				var field = table.attributes[f];
				fieldLookup[field.id] = field;
			}
			fieldLookup[t] = {
				table: t,
				ltable: t,
				label: table.label,
				aliases: table.aliases,
				dimensions: table.dimensions,
				type: "dimension",
				description: table.description || table.column || "",
				fullId: t
			};
			outTables[t] = table;
		}

		var field;
		var factTables = {};
		var replacementVariables = {};
		for (i = 0; i < fields.length; i++) {
			field = fields[i];
			if (!(field.id in fieldLookup)) {
				logger.log(field.id);
				logger.log(fieldLookup);
				throw new Error(field.id + " does not exist");
			}
			field.setField(fieldLookup[field.id], outTables, fieldLookup);

			if (field.factTable) {
				var table = field.factTable();
				if (!(table in factTables)) {
					factTables[table] = {
						table: table,
						columns: [],
						dimensions: {}
					};
				}
				factTables[table].columns.push(field);
				fieldLookup[table].dimensions.forEach(function (i) {
					factTables[table].dimensions[i] = {};
				});
			}
			field.getReplacementVariables().forEach(function (replace) {
				replacementVariables[replace] = 1;
			});
		}
		// Right now it is only @date type filters that are possible
		for (var variable in replacementVariables) {
			replacementVariables[variable] = dynamicParse.parse(variable);
		}

		for (i = 0; i < fields.length; i++) {
			field = fields[i];
			field.replaceVariables(replacementVariables);
		}

		return {
			fields,
			factTables
		};

	}),
	pivot: require("../../../lib/report/format/pivot.js"),
	sort: function (result, inputColumns, sorts = [], numberOnly, options) {
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
	},
	limit: function (data, limit) {
		data.total = data.rows.length;
		data.rows = data.rows.slice(0, limit);
		data.count = data.rows.length;
		return data;
	},
	writeToS3: (async function (report, options) {
		options = Object.assign({
			zip: true,
			noExcel: false,
			s3prefix: "open/",
			use_tabs: false
		}, options);

		// write csv to s3
		let now = moment();
		let s3prefix = (options.s3prefix || "open/").replace(/\/+/g, "/").replace(/^\/(.*)/, "$1");
		let baseFilename = `files/dw_reports/${now.format("YYYY/MM/DD/")}${s3prefix}report_${now.valueOf()}_${Math.floor(Math.random() * 1000000)}`
		let streams = [{
			filename: `${baseFilename}.${options.zip?'zip': 'csv'}`,
			prefix: "",
			field: "download"
		}];
		if (!options.noExcel) {
			streams.push({
				filename: `${baseFilename}_excel.${options.zip?'zip': 'csv'}`,
				prefix: "=",
				field: "exceldownload"
			});
		}

		let leo = require("leo-sdk");
		return new Promise(resolve => {
			async.map(streams, (data, done) => {
				let archive = options.zip && archiver('zip') || undefined;
				let csvFilename = data.filename
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
							report[data.field] = {
								url: leo.aws.s3.getSignedUrl('getObject', {
									Bucket: leo.configuration.s3,
									Key: csvFilename
								})
							};
						} else {
							report[data.field] = {
								error: err.toString()
							};
						}
						done();
					}
				);
				this.createCSV(stream, report, options.use_tabs == undefined ? false : options.use_tabs, options.show_report_header == undefined ? true : options.show_report_header, options.show_headers == undefined ? true : options.show_headers, data.prefix);
				stream.end(() => {
					archive && archive.finalize();
				});

			}, () => {
				resolve(report);
			});
		})
	}),
	createCSV: function (stream, report, use_tabs, show_report_header, show_headers, dataPrefix = "") {
		var separator = (use_tabs ? '\t' : ',');
		var quote = (true ? '"' : '');
		let escapeQuotes = (v) => {
			if (v && v.replace) {
				return v.replace(/"/g, '""');
			}
			return v
		};

		var forceRowFormat = false;
		var dataOffset = 0;
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
				dataOffset++;
				if (column.type == "metrics") {
					forceRowFormat = true;
				} else {
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
				if (dataPrefix && v != undefined && (typeof v == "number" || (v.match && v.match(/^[\d\,\.\-]+$/)))) {
					// if the value only contains numbers, add the = to keep long numbers from being displayed as scientific notation.
					return dataPrefix + quote + escapeQuotes(v) + quote;
				} else {
					// just regular escape if it's not a number.
					return quote + escapeQuotes(v) + quote;
				}
			}).join(separator));
		});
	}
};
