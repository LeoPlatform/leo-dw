var parse = require("../../parse/dynamic.js");
var fieldParse = require("../../parse/fieldnames.js");
module.exports = function (options) {
	var that = this;
	var filters;
	this.setField.wrap(function (prev, field, tables, fieldLookup) {
		prev(field, tables, fieldLookup);

		filters = options[0].split(';').map((filter) => {
			var fields = fieldParse.findFields(filter);
			for (var i = 0; i < fields.length; i++) {
				that.addRequiredTables(fields[i].requiredTables);
			}
			return fieldParse.replaceFields(filter, fields).trim();
		});
		if (options[1]) {
			var fields = fieldParse.findFields(options[1]);
			for (var i = 0; i < fields.length; i++) {
				that.addRequiredTables(fields[i].requiredTables);
			}
		}

		return this;
	});

	//Wrap functions
	this.getReplacementVariables.wrap(function () {
		var variables = [];
		filters.forEach(function (filter) {
			variables = variables.concat(parse.findVariables(filter));
		});
		return variables;
	});
	this.replaceVariables.wrap(function (prev, variables) {
		filters = filters.map(function (filter) {
			return parse.replaceVariables(filter, variables);
		});
		prev(variables);
	});
	this.mysqlField.wrap(function (prev) {
		var p = options[1] || prev() || 1;
		return "if(" + filters.join(' and ') + ", " + p + ", null)";
	});
	this.redshiftField.wrap(function (prev) {
		var p = options[1] || prev() || 1;
		return "CASE WHEN " + filters.join(' and ') + " THEN " + p + " ELSE NULL END";
	});
};
