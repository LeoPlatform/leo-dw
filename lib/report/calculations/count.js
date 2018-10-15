var mysql = require('../mysql.js');
var redshift = require('../redshift.js').escape;

module.exports = function (options) {
	this.factTable = function () {
		if (options[0]) {
			return options[0];
		}
		return this.mainTable();
	};
	this.fieldWrap(function (prev) {
		var p = prev();
		if (!p) {
			return "count(*)";
		} else if (this.column) {
			return "count(DISTINCT " + p + ")";
		} else {
			return "count(" + p + ")";
		}
	});

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);
		this.format = "count";
		this.outColumn.label += (this.column ? " Distinct Count" : " Count");
		return this;
	});
};