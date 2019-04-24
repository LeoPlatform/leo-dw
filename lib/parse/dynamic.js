var moment = require('moment');

var parseString = require('../utils/parse_date.js').parse_date;

// These date presets should match what is in system.js
var epochDate = new Date(1400, 0, 1, 0, 0, 0, 0);
var epochDateTime = epochDate.getTime();
var oneDayInverse = 1 / (24 * 60 * 60 * 1000);
var dimensionSurrogateOffset = 10000;
var reusableDate = new Date(1400, 0, 1, 0, 0, 0, 0);
moment.updateLocale('en', {
	week: {
		dow: 7,
		doy: 4
	}
});

RegExp.escape = function (s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var that = module.exports = {
	findVariables: function (string) {
		var matchRegex = "@(today|yesterday|daterange|date|now|time)(\\(([^\\)]+)\\)){0,1}(\\.\\w+){0,1}";
		return string.match(new RegExp(matchRegex, 'g'));
	},
	replaceVariables: function (string, variables) {
		Object.keys(variables).sort(function (a, b) {
			return b.localeCompare(a);
		}).forEach(function (key) {
			string = string.replace(new RegExp(RegExp.escape(key), 'g'), variables[key]);
		});

		return string;
	},
	parse: function (string, asOfDate, variables) {
		var today;
		if (!asOfDate) {
			today = moment();
		} else {
			today = moment(asOfDate);
		}

		var matchRegex = "@(today|yesterday|daterange|date|now|time)(\\(([^\\)]+)\\)){0,1}(\\.\\w){0,1}";
		var matches = string.match(new RegExp(matchRegex, 'g'));
		if (!matches) {
			return string;
		}
		for (var i = 0; i < matches.length; i++) {
			var pattern = matches[i];
			var match = pattern.match(new RegExp(matchRegex));
			var id = null;
			switch (match[1]) {
			case 'today':
				id = that.dateToId(today.toDate());

				break;
			case 'yesterday':
				id = that.dateToId(today.subtract(1, 'days').toDate());
				break;
			case 'date':
				if (match[3].trim().match(/^[\d\-]+$/)) {
					id = that.dateToId(moment(match[3].trim()).toDate());
				} else {
					var dates = that.stringToTime(match[3], today);
					if (dates.length === 2) {
						string = string.replace(new RegExp("=\\s+" + RegExp.escape(pattern)), "between " + pattern);
						id = that.dateToId(moment(dates[0]).toDate()) + " and " + that.dateToId(moment(dates[1]).toDate());
					} else {
						id = that.dateToId(moment(dates[0]).toDate());
					}
				}
				break;
			case 'now':
				id = that.timeToId(today.format("HH:mm:ss"));
				break;
			case 'time':
				break;
			case 'daterange':
				var rangeDirection = "reverse";
				var range = match[3].replace(/\s*ago\s*/i, '');
				var m = range.match(/\s+(\w+)/g);
				var period = m[0].trim();
				range = range.replace(period, '').trim();
				var start = null;
				var end = null;

				var parts = range.split(/\-/).map((e) => {
					return parseInt(e);
				});
				var align = period.replace(/s$/, '');
				if (parts.length == 2) {
					start = today.clone().subtract(parts[1], period).startOf(align);
					end = today.clone().subtract(parts[0], period).endOf(align).startOf('day');
				} else {
					start = today.clone().subtract(parts[0], period).startOf(align);
					end = today.clone().subtract(parts[0], period).endOf(align).startOf('day');
				}

				id = this.dateToId(start.toDate()) + " and " + this.dateToId(end.toDate());
				break;
			}

			// Are we looking for a field other than _id?
			if (match[4]) {
				console.log(match[4]);
			} else {
				string = string.replace(pattern, id);
			}
		}

		return string;
	},
	dateToId: function (date) {
		return Math.round(Math.abs((date.getTime() - epochDateTime) * oneDayInverse)) + dimensionSurrogateOffset;
	},
	timeToId: function (time) {
		var timeMatches = time.match(/^\s*(\d+):(\d+):(\d+)/);
		return (parseInt(timeMatches[1]) * 3600) + (parseInt(timeMatches[2]) * 60) + parseInt(timeMatches[3]) + dimensionSurrogateOffset;
	},
	stringToTime: function (string, today) {
		return parseString(string, today);
	}
};
