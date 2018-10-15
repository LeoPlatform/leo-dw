var mysql = require('mysql');
var redshift = require('../redshift.js').escape;
var util = require('util');

module.exports = function (options) {

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);
		this.outColumn.label = options[0];
		return this;
	});

};