var utils = require("./utils.js");
var fieldUtils = require("./fields.js");
var fieldRank = fieldUtils.rank;
var dateUtils = require("./date.js");
var timeUtils = require("./time.js");
var moment = require("moment");

var cache = {};
var d, dString, tString, date, time, alias, fields, matches;

module.exports = {
	tableCreator: function () {
		var tables = {};
		var relatedField = {};
		var relatedDim = {};

		function getTable(type, t, isJunkDim) {
			type = type == "dimension" ? 'dimension' : 'fact';
			if (t.match(/:/)) {
				t = t.split(/:/)[0];
			}
			t = t.toLowerCase().replace(/[^a-z\_]+/g, '_');
			var identifier = (type === "dimension" ? "d_" : "f_") + t;

			if (!(identifier in tables)) {
				tables[identifier] = {
					fields: {},
					fieldsByColumn: {},
					isDimension: type === "dimension",
					isJunkDim: isJunkDim,
					noAssign: false,
					identifier: identifier,
					type: type,
					label: t.replace(/^\w_/, '').split(/_/).map((e) => {
						return e.charAt(0).toUpperCase() + e.slice(1);
					}).join(' '),
					storeData: function () {
						return {
							fields: this.fieldsByColumn,
							isDimension: this.isDimension,
							isJunkDim: this.isJunkDim,
							identifier: this.identifier,
							type: this.type,
							label: this.label
						};
					},
					getField: function (field) {
						var id = field.id;

						if (!(id in this.fields)) {
							var regex = /[^a-z\_0-9]+/g;
							if (field.isSubField) {
								regex = /[^a-z\_\-0-9]+/g;
							}
							if (field.isHidden && !field.isSubField) {
								field.id = field.id.slice(1);
							}
							var column;
							var dim;
							var matches;
							if (field.isDimension) {
								dim = getTable("dimension", field.id);
								if (field.isHidden) {
									relatedField[field.id] = dim.getField({
										id: "id"
									});
								}
								column = "d_" + field.id.split(/\:/).pop().toLowerCase().replace(regex, '_');
							} else if (field.isSubField) {
								field.isJunkField = true;
								dim = getTable("dimension", field.isSubField, true);
								relatedField[field.id] = dim.getField({
									id: field.id.replace(/^[^\-]*\-/, ''),
									isJunkField: true
								});
								column = "d_" + field.id.toLowerCase().replace(regex, '_');
							} else {
								column = field.id.toLowerCase().replace(regex, '_');
							}
							if (field.isHidden) {
								column = "_" + column;
							}

							if (column == undefined) {
								console.log(id);
							}

							if (column in this.fieldsByColumn) {
								this.fields[id] = this.fieldsByColumn[column];
								return this.fields[id];
							}

							var defaultValue;
							if (field.isDimension) {
								if (field.isHidden || field.isSubField) {
									defaultValue = null;
								} else {
									defaultValue = 1; //we don't want dangling dimensions
								}
							} else {
								defaultValue = null; //we don't want attributes to have null as a value
							}
							this.fields[id] = {
								id: field.id,
								column: column,
								dimension: dim ? dim.identifier : false,
								isJunkField: field.isJunkField,
								hidden: field.isHidden,
								default: defaultValue || null, //starts as int
								dtype: "int",
								sort: {
									type: "int"
								},
								format: 'int',
								len: null,
								label: (field.isDimension || field.isJunkField ? column.replace(/^_?\w_/, '') : column).split(/_/).map((e) => {
									if (field.isSubField) {
										e = e.replace(/^.*-/, '');
									}
									return e.charAt(0).toUpperCase() + e.slice(1);
								}).join(' '),
								shouldSupport: function (value, opts) {
									opts = opts || {};
									if (this.id in relatedField) {
										relatedField[this.id].shouldSupport(value);
									}
									var type = "int";
									if (opts.isTimestamp) {
										type = "datetime";
									} else if (opts.isDate) {
										type = "date";
									} else if (typeof value === "number") {
										if (Number.isInteger(value)) {
											if (value >= 2147483647 || value <= -2147483648) {
												type = "bigint";
											} else {
												type = "int";
											}
										} else if (isNaN(value)) {
											type = "int";
										} else {
											type = "float";
										}
									} else if (value === null || value === undefined) {
										type = "int";
									} else {
										type = "string";
									}
									var len = 0;

									if (fieldRank[type] > fieldRank[this.dtype]) {
										switch (type) {
										case 'string':
											Object.assign(this, {
												dtype: "string",
												format: "string",
												sort: {
													type: "string"
												},
												default: defaultValue || null
											});
											break;
										case 'float':
											Object.assign(this, {
												dtype: "float",
												format: "float",
												sort: {
													type: "float"
												},
												default: defaultValue || null
											});
											break;
										case 'int':
											Object.assign(this, {
												dtype: "int",
												format: "int",
												sort: {
													type: "int"
												},
												default: defaultValue || null
											});
											break;
										case 'bigint':
											Object.assign(this, {
												dtype: "bigint",
												format: "int",
												sort: {
													type: "int"
												},
												default: defaultValue || null
											});
											break;
										case 'datetime':
											Object.assign(this, {
												dtype: "datetime",
												format: "date",
												sort: {
													type: "string"
												},
												default: defaultValue || null
											});
											break;
										case 'date':
											Object.assign(this, {
												dtype: "date",
												format: "date",
												sort: {
													type: "string"
												},
												default: defaultValue || null
											});
											break;
										}
									}
									if (value !== undefined && value !== null && this.dtype == "string" && value.toString) {
										this.len = Math.max(3, this.len || 0, Buffer.byteLength(value.toString(), "utf8") || 0);
									}
								}
							};
							this.fieldsByColumn[column] = this.fields[id];
						}
						return this.fields[id];
					}
				};
				if (tables[identifier].isDimension && !tables[identifier].isJunkDim) {
					tables[identifier].getField({
						id: "_id"
					}).shouldSupport(1);
					tables[identifier].getField({
						id: "id"
					});
				}
			}
			return tables[identifier];
		}
		return {
			getTable: getTable,
			getTableStore: function () {
				var out = [];
				for (var i in tables) {
					out.push(tables[i].storeData());
				}
				return out;
			}
		};
	},
	parseInput: function (obj) {
		fields = [];
		matches;
		for (var key in obj) {
			if (utils.startsWithUpper(key)) {
				var value = obj[key];
				if (value && typeof value == "object") {
					for (var subkey in value) {
						var subvalue = value[subkey];
						fields.push({
							id: key + "-" + subkey,
							val: subvalue,
							isDimension: false,
							isHidden: true,
							isSubField: key
						});
					}
				} else if ((matches = key.toLowerCase().match(/^ts(:.*|$)/)) || (matches = key.toLowerCase().match(/^date(:.*|$)/))) {
					if (value) {
						d = new Date(value);
						if (isFinite(d)) {
							dString = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
							tString = d.getHours() + ":" + d.getMinutes() + "-" + d.getSeconds();

							if (dString in cache) {
								date = cache[dString];
							} else {
								date = cache[dString] = dateUtils.idFromDate(d);
							}
							if (tString in cache) {
								time = cache[tString];
							} else {
								time = cache[tString] = timeUtils.idFromParts(d.getHours(), d.getMinutes(), d.getSeconds());
							}

							alias = '';
							if (matches[1].trim() !== '') {
								alias = matches[1];
							}
							fields.push({
								id: `Date${alias?alias+' Date':''}`,
								val: date,
								isDimension: true,
								isHidden: false,
								isSubField: false
							});
							fields.push({
								id: `Time${alias?alias+' Time':''}`,
								val: time,
								isDimension: true,
								isHidden: false,
								isSubField: false
							});
							fields.push({
								id: "_" + key,
								val: d.toISOString(),
								isDimension: false,
								isHidden: true,
								isSubField: false,
								isTimestamp: true
							});
						} else {
							fields.push({
								id: `Date${alias?alias+' Date':''}`,
								val: 1,
								isDimension: true,
								isHidden: false,
								isSubField: false
							});
							fields.push({
								id: `Time${alias?alias+' Time':''}`,
								val: 1,
								isDimension: true,
								isHidden: false,
								isSubField: false
							});
							fields.push({
								id: "_" + key,
								val: null,
								isDimension: false,
								isHidden: true,
								isSubField: false,
								isTimestamp: true
							});
						}
					}
				} else {
					fields.push({
						id: key,
						val: null,
						isDimension: true,
						isHidden: false,
						isSubField: false
					});
					fields.push({
						id: "_" + key,
						val: value,
						isDimension: true,
						isHidden: true,
						isSubField: false
					});
				}
			} else {
				if (typeof obj[key] == "string" && obj[key].length > 200) {
					obj[key] = obj[key].slice(0, 200);
				}
				fields.push({
					id: key,
					val: obj[key],
					isDimension: false,
					isHidden: false,
					isSubField: false
				});
			}
		}
		return fields;
	},
	parseValues: function (obj, transformList) {
		let outObj = {};
		let matches;
		for (var key in obj) {
			var value = obj[key];
			if (utils.startsWithUpper(key)) {
				if (matches = key.toLowerCase().match(/^ts(:.*|$)/)) {
					var columnName = key.replace(/^ts:?/i, '') + "_ts";
					if (columnName == "_ts") {
						columnName = "ts";
					}
					if (value) {
						try {
							outObj[transformList[columnName.toLowerCase()]] = new Date(value).toISOString();
						} catch (err) {
							//ignore this field
						}
					}
				} else if (value && typeof value == "object") {
					for (var subkey in value) {
						var subvalue = value[subkey];
						outObj[transformList[subkey.toLowerCase()]] = subvalue;
					}
				} else {
					let l = key.replace(/^[^:]*:/i, '').toLowerCase() + "_id";
					outObj[transformList[l]] = value;
				}
			} else {
				if (typeof value == "string" && value.length > 4000) {
					outObj[transformList[key.toLowerCase()]] = value.slice(0, 4000);
				} else {
					outObj[transformList[key.toLowerCase()]] = value;
				}
			}
		}
		return outObj;
	}
};
