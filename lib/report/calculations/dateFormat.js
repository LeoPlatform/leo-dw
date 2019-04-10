var mysql = require('mysql');
var redshift = require('../redshift.js').escape;
var util = require('util');

let map = {
	YYYY: '%Y',
	YY: '%y',
	MM: "%m",
	DDD: "%j",
	DD: "%d",

	HH: "%l",
	HH12: "%l",
	HH24: "%k",
	MI: "%i",
	SS: "%S",
	US: "%f"
};

function convert(format) {
	Object.keys(map).map(k => format = format.replace(k, map[k]));
	return format;
}

module.exports = (type) => {
	return function (options) {
		let format = options[0];
		if (type != undefined && format != undefined) {
			this.isGrouping = true;
			this.factTable = null;
			this.type = "attribute";

			this.mysqlField.wrap(function (prev) {
				let mysqlFormat = convert(format);
				return `DATE_FORMAT(STR_TO_DATE(${prev()}, '%Y-%m-%d'), ${this.mysql.escapeValueNoToLower(mysqlFormat)})`;
			});
			this.redshiftField.wrap(function (prev) {
				let p = prev();

				if (this.database == "redshift")
					return `(case when REGEXP_COUNT(${p},'^[: 0-9-]+$') = 1 then to_char(${p}::${type}, ${this.redshift.escapeValueNoToLower(format)}) else ${p} end)`;
				else
					return `(case when length(regexp_replace(${p}, '^[: 0-9-]+$', '')) = 0 then to_char(${p}::${type}, ${this.redshift.escapeValueNoToLower(format)}) else ${p} end)`;
				//return `to_char(${prev()}::${type}, ${this.redshift.escapeValueNoToLower(format)})`;
			});
		}
	};
};
