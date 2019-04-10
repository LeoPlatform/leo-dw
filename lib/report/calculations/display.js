var mysql = require("../mysql");
var redshift = require('../redshift.js').escape;
var fieldParser = require("../../parse/fieldTokenize.js");

module.exports = function (options) {
	var f = fieldParser(options[0]);
	if (f.isDimension) {
		this.addRequiredTables(f.requiredTables);
	}

	this.mysqlField.wrap(function (prev) {
		if (f.tablePath) {
			return "MAX(" + mysql.escapeId(f.tablePath) + "." + mysql.escapeId(f.column) + ")";
		} else {
			return "MAX(" + mysql.escapeId(f.column) + ")";
		}
	});
	this.redshiftField.wrap(function (prev) {
		if (f.tablePath) {
			return "MAX(" + redshift.escapeId(f.tablePath) + "." + redshift.escapeId(f.column) + ")";
		} else {
			return "MAX(" + redshift.escapeId(f.column) + ")";
		}
	});

	this.setField.wrap(function (prev, field, tables, fieldLookup) {
		prev(field, tables, fieldLookup);
		this.sort = {
			type: 'string'
		};
		this.outColumn.sort = this.sort;
		this.format = 'string';

		return this;
	});
};
