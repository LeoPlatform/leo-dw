var mysql = require("../mysql");
var redshift = require('../redshift.js').escape;
var filterParse = require("../../parse/filter.js").parse;

module.exports = function (options) {
	let dateLinkColumn = options[0] || "d_date";
	this.mysqlField.wrap(function (prev) {
		return `(select ${prev().replace(this.factTable(), "innerf")} from ${this.factTable()} as innerf where ${dateLinkColumn} > 10000 and ${dateLinkColumn} <= max(${this.factTable()}.${dateLinkColumn}))`;
	});
	this.redshiftField.wrap(function (prev) {
		return `(select ${prev().replace(this.factTable(), "innerf")} from "${this.factTable()}" as "innerf" where ${dateLinkColumn} > 10000 and ${dateLinkColumn} <= max("${this.factTable()}".${dateLinkColumn}))`;
	});
};
