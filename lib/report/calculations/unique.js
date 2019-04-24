var parseFieldName = require("../../parse/fieldTokenize.js");
var mysql = require('mysql');
var redshift = require('../redshift.js').escape;
var util = require('util');

module.exports = function (options) {
	var distinctField = null;
	if (options.length > 0) {
		distinctField = parseFieldName(options[0]);
		this.addRequiredTables(distinctField.requiredTables);
	}

	if (distinctField) {
		this.sqlFieldOverride = mysql.escapeId(distinctField.tablePath) + "." + mysql.escapeId(distinctField.column);
	    this.redshiftFieldOverride = redshift.escape(distinctField.tablePath) + "." + redshift.escape(distinctField.column);
	}

	this.mysqlField.wrap(function (prev) {
		return "count(DISTINCT " + prev() + ")";
	});

	this.redshiftField.wrap(function (prev) {
		return "count(DISTINCT " + prev() + ")";
	});

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);
		this.format = "count";
		this.outColumn.label = "Unique " + this.outColumn.label;
		return this;
	});

};
