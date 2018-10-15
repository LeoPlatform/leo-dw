var mysql = require('../mysql.js');
var redshift = require('../redshift.js').escape;
var parseFieldName = require("../../parse/fieldTokenize.js");

let types = {
	"postgres": "numeric",
	"redshift": "float"
};
module.exports = function (options) {
	let asType = types[this.database] || "numeric";
	var parsed = options[0] && parseFieldName(options[0]);
	if (parsed && parsed.isDimension) {
		this.addRequiredTables(parsed.requiredTables);
		this.mysqlField.wrap(function (prev) {
			var p = prev();
			var distinct = mysql.escapeId(parsed.tablePath) + "." + mysql.escapeId(parsed.column);
			if (p === null) {
				return "round( count(*) / count(distinct " + distinct + "),2)";
			} else {
				return "round(sum(" + prev() + ") / count(distinct " + distinct + "),2)";
			}
		});
		this.redshiftField.wrap(function (prev) {
			var p = prev();
			var distinct = redshift.escapeId(parsed.tablePath) + "." + redshift.escapeId(parsed.column);
			if (p === null) {
				return `round(cast(count(*) as ${asType}) / count(distinct ` + distinct + "),2)";
			} else {
				return "round(cast(sum(" + prev() + `) as ${asType}) / count(distinct ` + distinct + "),2)";
			}
		});
	} else {
		this.mysqlField.wrap(function (prev) {
			return "round(avg(" + prev() + "),2)";
		});
		this.redshiftField.wrap(function (prev) {
			return "round(avg(cast(" + prev() + ` as ${asType})),2)`;
		});
	}
	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);

		this.outColumn.label = "Average " + this.outColumn.label;
		return this;
	});

};
