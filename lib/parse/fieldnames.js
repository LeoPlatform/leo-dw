require("../utilities/string.js");
var fieldParser = require("../parse/fieldTokenize.js");

RegExp.escape = function(s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};
var that = module.exports = {
	findFields: function(string) {
		var matchRegex = "d_\\w+(\\.d_\\w+)?(\\$d_\\w+(\\.d_\\w+)?)?(\\.\\w+)?";
		var matches = string.match(new RegExp(matchRegex, 'g'));
		if(!matches) {
			matches = [];
		}
		return matches.map(function(field) {
			var parsed = fieldParser(field);
			return {
				field: field,
				replacement: parsed.table + (parsed.column !== "_id" ? "." + parsed.column : ''),
				requiredTables: parsed.requiredTables
			};
		});
	},  
	replaceFields: function(string, matches) {
		matches.sort(function(a,b) {
			return b.field.localeCompare(a.field);
		}).forEach(function(match) {
			string = string.replace(match.field, match.replacement);
		});
		return string;
	},
	parse: function(string) {
		return this.replaceFields(string, this.findFields(string));
	}
  
};
