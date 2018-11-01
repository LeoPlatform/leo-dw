var dynamodb = require("leo-sdk").aws.dynamodb;
var utils = require("./utils.js");
var dynamicParse = require("./parse/dynamic.js");
var filterParse = require("./parse/filter.js");
var configure = require("leo-sdk/leoConfigure.js");
var leoConfigure = require("leo-config");

const config = require("leo-config");
const FIELDS_TABLE = config.Resources.Fields;

var fieldRank = {
	'datetime': 15000,
	'date': 15100,
	'string': 4000,
	'float': 3000,
	'bigint': 2500,
	'int': 2000,
	'bool': 1000
};
var tables;
module.exports = {
	rank: fieldRank,
	getDimensionColumn: (column, field) => {
		field = field || {};
		let dimCol = field[`dim_column${column.replace(field.id, "")}`];
		if (dimCol) {
			return dimCol;
		}
		return field.dim_column ? field.dim_column : `d_${column.replace(/_id$/,'').replace(/^d_/,'')}`
	},
	getTableAndFields: function (options, callback) {

		if (typeof options === "function") {
			callback = options;
			options = {};
		}

		if (0 && tables) {
			callback(null, tables);
		} else if (process.dw_fields && (Date.now() - (process.dw_fields_cache_time || 0) <= 300000)) {
			callback(null, process.dw_fields);
		} else {
			var doScan = dynamodb.scan;
			if (options.fieldsFromConfig && configure["dw-fields"]) {
				doScan = function (table, opts, callback) {
					process.dw_fields = configure["dw-fields"];
					callback(null, configure["dw-fields"]);
				}
			} else if (leoConfigure.dw_fields) {
				doScan = function (table, opts, callback) {
					callback(null, leoConfigure.dw_fields);
				}
			}
			//dynamodb.scan
			doScan(FIELDS_TABLE, {}, function (err, data) {
				var aliases = {};
				if (err) {
					console.log(err);
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
						if (table.hidden) {
							continue;
						}
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
									let hasDate = field.dimension && (hasDateTime || (dateDimensionIdentifier == field.dimension) || (["d_date", "date", "dim_date"].indexOf(field.dimension) !== -1));
									let hasTime = field.dimension && (hasDateTime || (timeDimensionIdentifier == field.dimension) || (["d_time", "time", "dim_time"].indexOf(field.dimension) !== -1));

									if (hasDate || hasTime || ["d_date", "d_time", "d_datetime", "datetime", "date", "time", "dim_datetime", "dim_date", "dim_time"].indexOf(field.dimension) !== -1) {
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
												aliases[field.dimension][field.column] = field.label.replace(/ *Id$/, '');
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

											if ((field.nk && table.isDateDimension) || (field.id == "id" && table.identifier == "d_date")) {
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
									let hasDate = hasDateTime || (dateDimensionIdentifier && dateDimensionIdentifier == field.dimension) || (["d_date", "date", "dim_date"].indexOf(field.dimension) !== -1);
									let hasTime = hasDateTime || (timeDimensionIdentifier && timeDimensionIdentifier == field.dimension) || (["d_time", "time", "dim_time"].indexOf(field.dimension) !== -1);

									if (hasDate || hasTime || ["d_date", "d_time", "d_datetime", "datetime", "date", "time", "dim_datetime", "dim_date", "dim_time"].indexOf(field.dimension) !== -1) {
										let dateDim;
										let timeDim;
										let fields = [];

										let prefix = field.dimension.match(/^dim/) ? 'dim' : 'd';
										if (field.dimension == "dim_time" || field.dimension == "dim_datetime" || field.dimension == "d_time" || field.dimension == "d_datetime" || field.dimension == "datetime" || field.dimension == "time") {
											timeDim = `${prefix}_time`;
										}
										if (field.dimension == "dim_date" || field.dimension == "dim_datetime" || field.dimension == "d_date" || field.dimension == "d_datetime" || field.dimension == "datetime" || field.dimension == "date") {
											dateDim = `${prefix}_date`;
										}

										if (timeDim || hasTime) {
											fields.push({
												column: module.exports.getDimensionColumn(`${field.column}_time`, field),
												dimension: timeDim || timeDimensionIdentifier,
												label: field.label + " Time",
												description: (field.description || field.column) + " Time"
											});
										}

										if (dateDim || hasDate) {
											fields.push({
												column: module.exports.getDimensionColumn(`${field.column}_date`, field),
												dimension: dateDim || dateDimensionIdentifier,
												label: field.label + " Date",
												description: (field.description || field.column) + " Date"
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
													aliases[field.dimension][field.column] = field.label.replace(/ *Id$/, '');;
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
					process.dw_fields_cache_time = Date.now()
					callback(null, tables);
				}
			});
		}
	},
	calcsByFieldId: function (ids, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}
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
		this.getTableAndFields(options, function (err, tables) {
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
					console.log(field.id);
					console.log(fieldLookup);
					callback(new Error(field.id + " does not exist"));
					return;
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

			callback(null, fields, factTables);
		});

	},
	checkTables: function (tables, callback) {
		dynamodb.batchGetHashkey(FIELDS_TABLE, "identifier", Object.keys(tables), {}, function (err, existingTables) {
			var fieldStream = dynamodb.createTableWriteStream(FIELDS_TABLE);
			Object.keys(tables).forEach((t) => {
				var table = tables[t];
				var eTable = existingTables[t];
				if (!eTable) {
					if (table.storeData) {
						existingTables[t] = table.storeData();
					} else {
						existingTables[t] = table;
					}
					existingTables[t].modified = true;
				} else {
					var newFields = table.fields;
					var eFields = eTable.fields;

					for (var f in newFields) {
						var field = newFields[f];
						var eField = eFields[f];

						if (!eField) {
							existingTables[t].modified = true;
							existingTables[t].fields[f] = field;
						} else { //Gotta compare the two fields
							if (fieldRank[field.dtype] > fieldRank[eField.dtype] && !eField.locked) {
								Object.assign(eField, {
									dtype: field.dtype,
									format: field.format,
									sort: field.sort,
									len: field.len
								});
								existingTables[t].modified = true;
							}
							field.len = Math.min(field.len, 255);
							if (field.dtype === "string" && field.len > eField.len) {
								Object.assign(eField, {
									len: field.len
								});
								existingTables[t].modified = true;
							}
						}
					}

					for (var alias in table.aliases) {
						if (!(alias in eTable.aliases)) {
							existingTables[t].aliases[alias] = table.aliases[alias];
							existingTables[t].modified = true;
						}
					}

				};
			});
			for (var t in existingTables) {
				if (existingTables[t].modified) {
					delete existingTables[t].modified;
					fieldStream.put(existingTables[t]);
				}
			}
			fieldStream.end(callback);
		});
	},
	applyDefaults: function (table, field) {
		if (table.identifier === "d_date") {
			if (field.id === "year_month") {
				field.sort = {
					"type": "pattern",
					"pattern": "(\\d+) (.*)",
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
					}]
				};
			} else if (field.id === "month_name") {
				field.sort = {
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
				};
			}
		}
	}
};

var calculations = require("./report/calculations.js");
