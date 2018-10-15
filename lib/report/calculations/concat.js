var mysql = require("../mysql");
var redshift = require('../redshift.js').escape;
var fieldParser = require("../../parse/fieldTokenize.js");

module.exports = function (options) {
	this.isGrouping = true;
	this.factTable = null;
	this.type = "attribute";

	var fields = options.map((f) => {
		var parsed = fieldParser(f);
		if (parsed.isDimension) {
			this.addRequiredTables(parsed.requiredTables);
			return parsed;
		} else {
			return f;
		}
	});

	this.mysqlField.wrap(function (prev) {
		return `concat( ${prev()},` +
			fields.map((f) => {
				if (f.table) {
					return mysql.escapeId(f.table) + "." + mysql.escapeId(f.column);
				} else {
					return mysql.escape(f);
				}
			}) + `)`;
	});
	this.redshiftField.wrap(function (prev) {
		return `${prev()} || ` +
			fields.map((f) => {
				if (f.table) {
					return redshift.escapeId(f.table) + "." + redshift.escapeId(f.column);
				} else {
					return redshift.escapeValue(f);
				}
			}).join('||');
	});
};
