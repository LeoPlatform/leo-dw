var parseFieldName = require("../../parse/fieldTokenize.js");
var mysql = require('mysql');
var redshiftLib = require('../redshift.js');
var util = require('util');
var calculations = require("../calculations.js");
var moment = require("moment");
var date = require("../../date.js");
var configure = require("leo-sdk/leoConfigure.js");

let lagNowAlias = "lag$now";
module.exports = function (options) {
	let redshift = redshiftLib.current().escape;
	var nowLookup = {
		"today()": true,
		"today().id": true,
		"today()._id": true,
		"today": true,
		"today.id": true,
		"today._id": true,
		"now()": true,
		"now().id": true,
		"now()._id": true,
		"now": true,
		"now.id": true,
		"now._id": true,
	};
	var mappings = {
		redshift: {
			years: "year",
			year_quarters: "qtr",
			quarters: "qtr",
			months: "month",
			weeks: "week",
			days: "day",
			hours: "hour"
		},
		mysql: {
			years: "YEAR",
			year_quarters: "QUARTER",
			quarters: "QUARTER",
			months: "MONTH",
			weeks: "WEEK",
			days: "DAY",
			hours: "HOUR"
		}
	};
	var asDays = {
		years: 1 / 365,
		year_quarters: 1 / (365 / 4),
		quarters: 1 / (365 / 4),
		months: 1 / 30,
		weeks: 1 / 7,
		days: 1,
		hours: 24
	};
	var asSeconds = {
		years: 3600 * 24 * 365,
		year_quarters: 3600 * 24 * (365 / 4),
		quarters: 3600 * 24 * (365 / 4),
		months: 3600 * 24 * 30,
		weeks: 3600 * 24 * 7,
		days: 3600 * 24,
		hours: 3600
	};
	var getField = (name) => {
		var fieldGetter = function (format, quotes) {
			var todayString = moment().format(format);
			var todayId = date.idFromString(todayString);
			return name === "today.id" ? (quotes + todayString + quotes) : todayId;
		};
		if (nowLookup[name.replace(/\..*/, "")]) {
			return "sysdate";
		} else {
			var [column, outrigger] = name.split("$").reverse();
			var prefix = "";
			if (outrigger) {
				var field = calculations.getCalcField(outrigger + ".id");
				this.addRequiredTables(field.requiredTables);
				prefix = field.parsed.tablePath + ".";
			} else {
				prefix = this.mainTable() + ".";
			}
			return process.env.DW_VERSION == "1.0" ? (prefix + "_" + column) : (prefix + column.replace(/^d_/, ""));
		}
	};

	var start = getField(options[2].replace(/\.d_date$/, "").replace(/_date$/, ""));
	console.log(start);
	var end = getField(options[1].replace(/\.d_date$/, "").replace(/_date$/, ""));
	console.log(end);

	var timeframe = options[0].toLowerCase();
	var type = options[3] || "normal";
	let isBusiness = type == "business" || type == "business_days";

	let startParsed = parseFieldName(options[2]);
	let endParsed = parseFieldName(options[1]);

	if (nowLookup[options[2].replace(/\..*/, "")]) {
		startParsed.table = lagNowAlias;
	}
	if (nowLookup[options[1].replace(/\..*/, "")]) {
		endParsed.table = lagNowAlias;
	}

	let _id = "." + process.dw_fields.dimension.d_date.sk;
	this.redshiftField.wrap(function (prev) {
		function get(start, end) {
			if (redshift.version == "redshift") {
				return `(datediff(${mappings.redshift[timeframe]}, ${start}, ${end}))`;
			} else {
				return `(extract(epoch from age(${end}, ${start})) / ${asSeconds[timeframe]})`;
			}
		}
		if (redshift.version != "redshift") {
			if (start == "sysdate") {
				start = "now()";
			}
			if (end == "sysdate") {
				end = "now()";
			}
		}
		var p = prev();
		if (isBusiness) {
			let business_day = redshift.escapeId(options[4] || "business_day");
			let business_day_indicator = redshift.escapeId("business_day_indicator");
			let start_ts = start.replace(/\_d\_/, '_ts_');
			let end_ts = end.replace(/\_d\_/, '_ts_');

			let start_date_id = (startParsed.table + _id);
			let end_date_id = (endParsed.table + _id);
			let start_date_business = (startParsed.table + "." + business_day);
			let end_date_business = (endParsed.table + "." + business_day);
			
			let start_date_business_indicator = (startParsed.table + "." + business_day_indicator);
			let end_date_business_indicator = (endParsed.table + "." + business_day_indicator);
			
			let start_case_business = `(CASE WHEN ${start_date_business_indicator} = 'Not Business Day' THEN 24 - DATE_PART(hour, ${start_ts}) ELSE 0 END)`;
			let end_case_business = `(CASE WHEN ${end_date_business_indicator} = 'Not Business Day' THEN 24 - DATE_PART(hour, ${end_ts}) ELSE 0 END)`;
			
			//return `(datediff(${mappings.redshift[timeframe]},${start_ts}, ${end_ts}) - ((${end_date_id} - ${start_date_id}) - (${end_date_business} - ${start_date_business}))*${asDays[timeframe]})`
			return `(${get(start_ts, end_ts)} - ((${end_date_id} - ${start_date_id}) - (${end_date_business} - ${start_date_business}))*${asDays[timeframe]}) - ${start_case_business} + ${end_case_business}`;
		}
		//return `(datediff(${mappings.redshift[timeframe]}, ${start.replace(/\_d\_/, '_ts_')}, ${end.replace(/\_d\_/, '_ts_')}))`;

		return get(start.replace(/\_d\_/, '_ts_'), end.replace(/\_d\_/, '_ts_'));
	});

	this.mysqlField.wrap(function (prev) {
		var p = prev();
		if (start == "sysdate") {
			start = "now()";
		}
		if (end == "sysdate") {
			end = "now()";
		}
		if (isBusiness) {
			let business_day = mysql.escapeId(options[4] || "business_day");
			let start_ts = start.replace(/\_d\_/, '_ts_');
			let end_ts = end.replace(/\_d\_/, '_ts_');

			let start_date_id = (startParsed.table + _id);
			let end_date_id = (endParsed.table + _id);
			let start_date_business = (startParsed.table + "." + business_day);
			let end_date_business = (endParsed.table + "." + business_day);

			return `(TIMESTAMPDIFF(${mappings.mysql[timeframe]},${start_ts}, ${end_ts}) - ((${end_date_id} - ${start_date_id}) - (${end_date_business} - ${start_date_business}))*${asDays[timeframe]})`;
		}
		return `(TIMESTAMPDIFF(${mappings.mysql[timeframe]}, ${start.replace(/\_d\_/, '_ts_')}, ${end.replace(/\_d\_/, '_ts_')}))`;
	});

	if (true) {
		function getField(name) {
			var fieldGetter = function (format, quotes) {
				var todayString = moment().format(format);
				var todayId = date.idFromString(todayString);
				return (name === "today.id" || name === "now.id" || name === "today().id" || name === "now().id") ? (quotes + todayString + quotes) : todayId;
			};
			if (nowLookup[name.replace(/\..*/, "")]) {
				return {
					isToday: true,
					mysqlField: function () {
						return fieldGetter("YYYY-MM-DD", "\"");
					},
					redshiftField: function () {
						return fieldGetter("YYYY-MM-DD", "'");
					},
					addRequiredTable: function () {},
					requiredTables: []
				};
			} else {
				return calculations.getCalcField(name);
			}
		}

		var timeframe = options[0].toLowerCase();
		var startIdColumn = getField(options[2] + _id);
		var endIdColumn = getField(options[1] + _id);
		var startColumn = getField(options[2] + ".id");
		var endColumn = getField(options[1] + ".id");
		startColumn.addRequiredTable(this.mainRequiredTable());
		endColumn.addRequiredTable(this.mainRequiredTable());
		startIdColumn.addRequiredTable(this.mainRequiredTable());
		endIdColumn.addRequiredTable(this.mainRequiredTable());

		if (isBusiness && nowLookup[options[1].replace(/\..*/, "")]) {
			this.addRequiredTables([{
				alias: lagNowAlias,
				table: "d_date",
				on: `${lagNowAlias}${_id} = ${endIdColumn.redshiftField()}`
			}]);
		} else if (isBusiness && nowLookup[options[2].replace(/\..*/, "")]) {
			this.addRequiredTables([{
				alias: lagNowAlias,
				table: "d_date",
				on: `${lagNowAlias}${_id} = ${startIdColumn.redshiftField()}`
			}]);
		}

		if (options.length > 0) {
			if (timeframe in mappings.mysql && (timeframe !== "days" || isBusiness)) {
				this.addRequiredTables(startColumn.requiredTables);
				this.addRequiredTables(endColumn.requiredTables);
				// this.redshiftField.wrap(function (prev) {
				// 	//return prev();
				// 	//return `(case when ${startIdColumn.redshiftField()} < 10000 or ${endIdColumn.redshiftField()} < 10000 then null else ${p} end)`;
				// });
				this.mysqlField.wrap(function (prev) {
					var p = prev();
					return `(case when ${startIdColumn.mysqlField()} < 10000 or ${endIdColumn.mysqlField()} < 10000 then null else ${p} end)`;
					//return `(case when ${startIdColumn.mysqlField()} < 10000 or ${endIdColumn.mysqlField()} < 10000 then null else TIMESTAMPDIFF(${mappings.mysql[timeframe]}, ${startColumn.mysqlField()}, ${endColumn.mysqlField()}) end)`;
				});
			} else {
				this.addRequiredTables(startIdColumn.requiredTables);
				this.addRequiredTables(endIdColumn.requiredTables);
				// this.redshiftField.wrap((prev) => {
				// 	return prev();
				// 	//	return `(case when ${startIdColumn.redshiftField()} < 10000 or ${endIdColumn.redshiftField()} < 10000 then null else ${endIdColumn.redshiftField()} - ${startIdColumn.redshiftField()} end)`;
				// });
				this.mysqlField.wrap((prev) => {
					return `(case when ${startIdColumn.mysqlField()} < 10000 or ${endIdColumn.mysqlField()} < 10000 then null else ${endIdColumn.mysqlField()} - ${startIdColumn.mysqlField()} end)`;
					// 	return `(case when ${startIdColumn.mysqlField()} < 10000 or ${endIdColumn.mysqlField()} < 10000 then null else ${endIdColumn.mysqlField()} - ${startIdColumn.mysqlField()} end)`;
				});
			}
		}

	}

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);
		this.format = 'int';
		this.outColumn.format = 'int';
		this.outColumn.label = "Lag " + this.outColumn.label;
		return this;
	});

};
