var mysql = require('mysql');
var util = require('util');

module.exports = function (options) {
	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);
		this.format = options[0];
		this.outColumn.format = this.format || this.type;
		return this;
	});
};
