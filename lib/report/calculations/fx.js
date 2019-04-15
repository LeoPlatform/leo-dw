var mathjs = require("mathjs");

module.exports = function (options) {
	this.isFX = true;

	var fieldMapping = {};
	var counter = 0;
	var expression = this.alias.trim().replace(/^fx\((.*)(\)|\)\|.*)$/, '$1');
	var fields = expression.replace(/[\(\)]/g, '')
		.split(/\s*[\+\-\*\/]\s*/)
		.filter((e) => {
			return e.trim() !== '';
		})
		.map((e) => {
			return e.trim();
		});
	fields.filter((f) => {
		return f.match(/^[^\d]/);
	}).sort(function (a, b) {
		return b.length - a.length;
	}).forEach((f) => {
		if (!(f in fieldMapping)) {
			fieldMapping[f] = "field_" + counter++;
			expression = expression.replace(new RegExp(f.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g'), fieldMapping[f]);
		}
	});
	console.log(expression);
	this.fxfields = Object.keys(fieldMapping);
	var compiled = mathjs.compile(expression).eval;

	this.factTable = null;

	this.preProcess.wrap(function (parent, data, mapping) {
		parent(data, mapping);
		var scopeMapping = {};
		for (var f in fieldMapping) {
			scopeMapping[fieldMapping[f]] = mapping[f];
		}
		var myIndex = mapping[this.alias];

		for (var i = 0; i < data.length; i++) {
			var row = data[i];
			var scope = {};
			for (var f in scopeMapping) {
				scope[f] = row[scopeMapping[f]] || 0;
			}
			row[myIndex] = compiled(scope);
		}
	});
};
