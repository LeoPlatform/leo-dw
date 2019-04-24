var moment = require('moment');
var parseString = require('../utils/parse_date.js');
var dynamic = require("./dynamic.js");
var fieldParser = require("../parse/fieldTokenize.js");
var asOfDate = moment();
var extend = require('lodash').extend;
var util = require('util');

var fieldParse = {
	"d_date": {
		"id": function (filter, asOfDate) {
			filter.converted_column = "_id";
			if (util.isArray(filter.value) && filter.value[1]) {
				var values = filter.value;
				filter.value = [];
				for (var i = 0; i < values.length; i++) {
					var dates = parseString.parse_date(values[i], asOfDate);
					if (dates == "0000-00-00" || (dates.trim && dates.trim() == "")) {
						filter.value.push(1);
					} else if (util.isArray(dates) && dates.length >= 2) {
						filter.comparison = "in";

						var dateStart = Math.min(dynamic.dateToId(moment(dates[0], 'YYYY-MM-DD').toDate()), dynamic.dateToId(moment(dates[1], 'YYYY-MM-DD').toDate()));
						var dateEnd = Math.max(dynamic.dateToId(moment(dates[1], 'YYYY-MM-DD').toDate()), dynamic.dateToId(moment(dates[0], 'YYYY-MM-DD').toDate()));
						while (dateStart <= dateEnd) {
							filter.value.push(dateStart++);
						}
					} else if (util.isArray(dates)) {
						filter.value.push(dynamic.dateToId(moment(dates[0], 'YYYY-MM-DD').toDate()));
					} else {
						filter.value.push(dynamic.dateToId(moment(dates, 'YYYY-MM-DD').toDate()));
					}
				}

			} else {
				if (util.isArray(filter.value)) {
					filter.value = filter.value[0];
				}
				var dates = parseString.parse_date(filter.value, asOfDate);
				if (util.isArray(dates)) {
					filter.comparison = "between";
					if (!dates[1]) {
						dates[1] = dates[0];
					}
					filter.value = [dynamic.dateToId(moment(dates[0], 'YYYY-MM-DD').toDate()), dynamic.dateToId(moment(dates[1], 'YYYY-MM-DD').toDate()), ];
				} else {
					filter.value = dynamic.dateToId(moment(dates, 'YYYY-MM-DD').toDate());
				}
			}
			return filter;
		},
		"day_of_month": function (filter, asOfDate) {
			if (util.isArray(filter.value)) {
				filter.value = filter.value[0];
			}
			if (!filter.value.toString().match(/^\d+$/)) {
				var dates = parseString.parse_date(filter.value, asOfDate);
				filter.value = moment(dates[0]).format("DD");
			}
			return filter;
		},
		"days_left_in_month": function (filter, asOfDate) {
			if (util.isArray(filter.value)) {
				filter.value = filter.value[0];
			}
			if (!filter.value.toString().match(/^\d+$/)) {
				var dates = parseString.parse_date(filter.value, asOfDate);
				var start = moment(dates[0]).format("DD");
				filter.value = parseInt(moment(dates[0]).endOf('month').format("DD")) - start;
			}
			return filter;
		},
		"week_ending_date": function (filter, asOfDate) {
			if (util.isArray(filter.value)) {
				filter.value = filter.value[0];
			}
			if (!filter.value.toString().match(/^\d+-\d+-\d+$/)) {
				var dates = parseString.parse_date(filter.value, asOfDate);
				filter.value = moment(dates[0]).endOf('week').format("YYYY-MM-DD");
			}
			return filter;
		},
		"day_of_week_number": function (filter, asOfDate) {
			if (util.isArray(filter.value)) {
				filter.value = filter.value[0];
			}
			if (filter.value.toString().match(/^\d+-\d+-\d+$/)) {
				filter.value = (parseInt(moment(filter.value).format("d")) + 1).toString();
			} else if (!filter.value.toString().match(/^\d+$/)) {
				var dates = parseString.parse_date(filter.value, asOfDate);
				filter.value = (parseInt(moment(dates[0]).format("d")) + 1).toString();
			}
			return filter;
		}
	}
};
fieldParse.d_date.date = fieldParse.d_date.id;

var that = module.exports = {
	parse: function (filter, asOfDate) {
		var today;
		if (!asOfDate) {
			today = moment();
		} else if (moment.isMoment(asOfDate)) {
			today = moment(asOfdate);
		} else {
			today = moment(asOfDate).utcOffset(asOfDate);
		}
		var newFilter = extend({}, filter);

		var field = fieldParser(newFilter.id);
		var dimTable = field.requiredTables[field.requiredTables.length - 1].table;

		var dimTableDef = process.dw_fields && process.dw_fields.dimension[dimTable] || {};
		if (dimTableDef.isDateDimension) {
			dimTable = "d_date";
		}
		if (dimTable in fieldParse && field.column in fieldParse[dimTable]) {
			return fieldParse[dimTable][field.column](newFilter, asOfDate);
		}
		return newFilter;
	}
};
