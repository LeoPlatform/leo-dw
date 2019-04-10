var parseFieldName = require("../../parse/fieldTokenize.js");
var mysql = require("mysql");
var redshiftLib = require('../redshift.js');
var util = require('util');
var extend = require('lodash').extend;

module.exports = function (field) {
	let redshift = redshiftLib.current().escape;
	var parsed = parseFieldName(field);
	var that = {
		database: redshift.version == "redshift" ? redshift.version : "postgres",
		mysql: mysql,
		redshift: redshift,
		requiredTables: parsed.requiredTables,
		alias: parsed.alias,
		column: parsed.column,
		parsed: parsed,
		id: parsed.id,
		addRequiredTable: function (table, end) {
			if (end) {
				this.requiredTables.push(table);
			} else {
				for (var i = 0; i < this.requiredTables.length; i++) {
					var eTable = this.requiredTables[i];
					if (eTable.alias === table.alias) {
						if (i != this.requiredTables.length - 1) {
							this.requiredTables.splice(i, 1);
						} else {
							return true;
						}
					}
				}
				this.requiredTables.unshift(table);
			}
		},
		addRequiredTables: function (requireds) {
			for (var i = requireds.length - 1; i >= 0; i--) {
				this.addRequiredTable(requireds[i]);
			}
		},
		mainRequiredTable: function () {
			return this.requiredTables[this.requiredTables.length - 1];
		},
		factTable: function () {
			return this.mainTable();
		},
		mainTable: function () {
			return this.requiredTables[this.requiredTables.length - 1].alias;
		},
		mysqlSelect: function () {
			return this.mysqlField() + " as " + this.selectAlias;
		},
		redshiftSelect: function () {
			return this.redshiftField() + " as " + this.selectAlias;
		},
		type: 'metric',
		outColumn: {
			id: parsed.alias,
			label: "",
			type: 'metric',
			format: undefined,
			parent: "",
			sort: {
				type: 'int'
			}
		},
		getReplacementVariables: function () {
			return [];
		},
		replaceVariables: function () {
			return true;
		},
		mysqlField: function (prev, factTable, convertedColumn) {
			if (this.sqlFieldOverride != undefined) {
				return this.sqlFieldOverride;
			} else if (this.field && this.field.customCalc) {
				return this.field.customCalc;
			} else if (this.column) {
				if (this.requiredTables.length) {
					if (this.column === "_id") {
						if (this.parsed.tablePath.match(/\./)) {
							return mysql.escapeId(this.parsed.tablePath);
						} else {
							return mysql.escapeId(this.mainTable()) + "." + mysql.escapeId(this.parsed.tablePath);
						}
					} else {
						return mysql.escapeId(this.mainTable()) + "." + mysql.escapeId(convertedColumn ? convertedColumn : this.column);
					}
				} else {
					if (this.field.isJunkField) {
						return (factTable ? mysql.escapeId(factTable) + "." : '') + mysql.escapeId("_" + this.parsed.tablePath + "-" + this.column);
					} else {
						return (factTable ? mysql.escapeId(factTable) + "." : '') + this.parsed.tablePath.split('.').map(mysql.escapeId).join('.');
					}
				}
			} else {
				return null;
			}
		},
		redshiftField: function (prev, factTable, convertedColumn) {
			if (this.redshiftFieldOverride != undefined) {
				return this.redshiftFieldOverride;
			} else if (this.field && this.field.customCalc) {
				return this.field.customCalc;
			}
			if (this.column) {
				if (this.requiredTables.length) {
					if (this.column === "_id") {
						if (this.parsed.tablePath.match(/\./)) {
							return redshift.escapeId(this.parsed.tablePath);
						} else {
							return redshift.escapeId(this.mainTable()) + "." + redshift.escapeId(this.parsed.tablePath);
						}
					} else {
						return redshift.escapeId(this.mainTable()) + "." + redshift.escapeId(convertedColumn ? convertedColumn : this.column);
					}
				} else {
					if (this.field.isJunkField) {
						return (factTable ? redshift.escapeId(factTable) + "." : '') + redshift.escapeId("_" + this.parsed.tablePath + "-" + this.column);
					} else {
						return (factTable ? redshift.escapeId(factTable) + "." : '') + this.parsed.tablePath.split('.').map(redshift.escapeId).join('.');
					}
				}
			} else {
				return null;
			}
		},
		filter: function (f, factTable) {
			var comparison = f.comparison || '=';
			comparison = comparison.trim().toLowerCase();
			if (this.dtype !== "string" && this.type !== "attribute") {
				var value = f.value || 0;
			} else {
				var value = f.value || '';
			}

			var isArray = util.isArray(value);
			if (isArray && comparison === "=") {
				comparison = "in";
			} else if (isArray && (comparison === "!=" || comparison === "<>")) {
				comparison = "not in";
			}
			if (!isArray && comparison === "between") {
				comparison = '>=';
			}

			if (!isArray) {
				value = [value];
			}
			var filter = {
				idFilter: this.alias.replace(/.[^\.]*$/, '._id'),
				tablePath: this.parsed.tablePath,
				requiredTables: this.requiredTables,
				where: {
					mysql: null,
					redshift: null
				}
			};

			var mysqlField = null;
			var redshiftField = null;

			var mysqlValues;
			var redshiftValues;
			if (this.dtype !== "string" && this.type !== "attribute") {
				mysqlValues = value.map(function (x) {
					return parseInt(x);
				});
				redshiftValues = value.map(function (x) {
					return parseInt(x);
				});
			} else { // String
				mysqlValues = value.map(mysql.escape);
				redshiftValues = value.map(redshift.escapeValue);
			}

			if (f.converted_column === "_id" && factTable) {
				if (this.parsed.tablePath.match(/\./) || !factTable) {
					mysqlField = this.parsed.tablePath.split('.').map(mysql.escapeId).join('.');
					redshiftField = this.parsed.tablePath.split('.').map(redshift.escapeId).join('.');
				} else {
					mysqlField = mysql.escapeId(factTable) + "." + mysql.escapeId(this.parsed.tablePath);
					redshiftField = redshift.escapeId(factTable) + "." + redshift.escapeId(this.parsed.tablePath);
				}

				//I have changed the filter, so I don't need to join the table
				filter.requiredTables = filter.requiredTables.slice(0);
				filter.requiredTables.pop();
			} else {
				if (this.dtype !== "string") { //format === "money" || this.format === "int" || this.format === "count" || this.column === "_id" || f.converted_column === "_id") {
					redshiftField = this.redshiftField(factTable, f.converted_column);
				} else {
					redshiftField = "LOWER(" + this.redshiftField(factTable, f.converted_column) + ")";
				}
				mysqlField = this.mysqlField(factTable, f.converted_column);
				if ((filter.requiredTables.length && filter.requiredTables[0].table === factTable) || f.converted_column === "_id" && factTable) {
					filter.requiredTables = filter.requiredTables.slice(0);
					filter.requiredTables.pop();
				}
			}

			switch (comparison) {
			case 'between':
				filter.where.mysql = mysqlField + " between " + mysqlValues[0] + " and " + mysqlValues[1];
				filter.where.redshift = redshiftField + " between " + redshiftValues[0] + " and " + redshiftValues[1];
				break;
			case 'in':
				filter.where.mysql = mysqlField + " in (" + mysqlValues.join(',') + ")";
				filter.where.redshift = redshiftField + " in (" + redshiftValues.join(',') + ")";
				break;
			case 'not in':
				filter.where.mysql = mysqlField + " not in (" + mysqlValues.join(',') + ")";
				filter.where.redshift = redshiftField + " not in (" + redshiftValues.join(',') + ")";
				break;
			case '!=':
			case '<':
			case '<=':
			case '>':
			case '>=':
			case '=':
				filter.where.mysql = mysqlField + comparison + mysqlValues[0];
				filter.where.redshift = redshiftField + comparison + redshiftValues[0];
				break;
			case 'sql':
				filter.where.mysql = mysqlField + " IN (" + value + ")";
				filter.where.redshift = redshiftField + " IN (" + value + ")";
				break;
			}
			return filter;
		},
		preProcess: function () {
			return true;
		},
		postProcess: function () {
			return true;
		},
		toDBValue: function (value) {
			if (this.field.format === "money") {
				return Math.round(100 * value);
			} else {
				return value;
			}
		},
		setField: function (prev, field, tables, fieldLookup) {
			if (typeof (prev) == 'function') {
				prev();
			} else {
				fieldLookup = tables;
				tables = field;
				field = prev;
			}

			this.field = extend({}, field);
			this.format = field.format;
			this.dtype = field.dtype;
			this.isJunkField = field.isJunkField;
			if (field.column) {
				this.column = field.column;
			}
			var parent = "";
			for (var i = 0; i < this.requiredTables.length; i++) {
				var table = this.requiredTables[i];
				if (table.table in tables) {
					if (table.table !== table.alias) {
						parent = tables[table.table].aliases[table.alias.split(/\$/).pop()];
					} else {
						parent = tables[table.table].label;
					}
				} else {
					if (!parent) {
						parent += " ??";
					}
				}
			}

			if (this.field && this.field.customCalc) {
				var matches = this.field.customCalc.match(/(d_[^\.]+\.\w+)/g);
				if (matches) {
					matches.forEach((field) => {
						this.addRequiredTables(parseFieldName(field).requiredTables);
					});
				}
			}

			this.outColumn.parent = parent;
			this.outColumn.label = field.label;
			this.outColumn.format = field.format;
			if (field.type) {
				this.outColumn.type = field.type;
			}
			if (field.sort) {
				this.sort = field.sort;
				this.outColumn.sort = this.sort;
			}

			if (this.parsed.options[0] && this.parsed.options[0].toLowerCase() === 'usd') {
				this.column = "_" + this.column;
			}

			if (field.isJunkField) {
				this.requiredTables = [];
			}

			this.outColumn.color = field.color;
			this.tables = tables;
			this.fieldLookup = fieldLookup;

			return this;
		}
	};
	return that;
};
