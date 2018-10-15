var moment = require('moment');
var util = require("util");

var format = "YYYY-MM-DD";
// These date presets should match what is in system.js
var epochDate = new Date(1400, 0, 1, 0, 0, 0, 0);
var epochDateTime = epochDate.getTime();
var oneDayInverse = 1 / (24 * 60 * 60 * 1000);
var dimensionSurrogateOffset = 10000;
var reusableDate = new Date(1400, 0, 1, 0, 0, 0, 0);

function getGroups(source) {
	// The regex below may change, and Javascript doesn't support named groups. So fake it:
	var named_groups = {
		"prefix": 1,
		"func": 3,
		"funcParams": 5,
		"fieldName": 7,
		"suffix": 8
	};
	var chunks = source.match(/^([ 0-9+-]*)?@(([a-z_]+)(\(([a-z0-9\-_,]+)\))?)(\.([a-z0-9_]+))?([+-][ 0-9+-]*)?$/i);
	var groups = {};
	for (gname in named_groups) {
		groups[gname] = chunks[named_groups[gname]];
	}
	return groups;
}

function parse_special(datestr, today) {
	today = today || undefined
	var groups = getGroups(datestr);
	switch (groups.func.toLowerCase()) {
	case "today":
		return [moment(today).format(format)];
		break;
	case "yesterday":
		return [moment(today).subtract(1, 'day').format(format)];
		break;
	case "tomorrow":
		return [moment(today).subtract(-1, 'day').format(format)];
		break;
	case "date":
		return [groups.funcParams];
		break;
	default:
		return [];
	}
}

function getLagDate(datestr) {
	var ftime;
	switch (typeof datestr) {
	case "string":
		var matches = datestr.match(/^\s*(\d+)\-(\d+)\-(\d+)/);
		reusableDate.setFullYear(matches[1], matches[2] - 1, matches[3]);
		ftime = reusableDate.getTime();
		break;
	case "number":
		ftime = datestr
		break;
	}
	return Math.round((ftime - epochDateTime) * oneDayInverse) + dimensionSurrogateOffset;
}

function parse_date(datestr, asOfDate) {
	var today;
	if (!asOfDate) {
		today = moment();
	} else if (moment.isMoment(asOfDate)) {
		today = moment(asOfDate);
	} else {
		today = moment(asOfDate).utcOffset(asOfDate);
	}

	datestr = datestr.toLowerCase().trim();
	if (datestr.match(/^\d+-\d+-\d+$/)) {
		return datestr;
	}
	if (datestr.match(/^@daterange/)) {
		var matches = datestr.match(/@daterange\((\d+)[\- ]*(\d+)? ?(\w+)/)
		if (matches[1] && matches[2] && matches[3]) {
			return [
				moment(today).subtract(Math.max(matches[1], matches[2]), matches[3]).startOf(matches[3]).format(format),
				moment(today).subtract(Math.min(matches[1], matches[2]), matches[3]).endOf(matches[3]).format(format)
			]
		} else if (matches[1] && matches[3]) {
			return [
				moment(today).subtract(matches[1], matches[3]).startOf(matches[3]).format(format),
				moment(today).subtract(matches[1], matches[3]).endOf(matches[3]).format(format)
			]
		}
		return moment(today)
	}
	if (datestr.match(/^@/)) {
		return parse_special(datestr, today);
	}
	var part1 = datestr.match(/^(today|yesterday|this|last|since|next)( [0-9]+)?( (month|week|year|quarter|day)s?)?/);
	datestr = datestr.replace(part1[0], '');
	var plusCurrent = !!datestr.match(/(plus|\+) ?current/);
	var plusFuture = !!datestr.match(/(plus|\+) ?future/);
	var toDate = !!datestr.match(/(to( |-)date|to( |-)now)/);
	var toYesterday = !!datestr.match(/to( |-)yesterday/);
	var agoTime = 0;
	var agoMeasure = "";
	var lastx;
	var lastAmt;
	if (!!(lastx = datestr.match(/([0-9]+) ([a-z]+) ago$/)) && !datestr.match(/^since/)) {
		lastAmt = parseInt(lastx[1]);
		lastx = lastx[2].replace(/s$/, '');
	} else if (['today', 'yesterday'].indexOf(part1[1]) > -1 && !!(lastx = (part1[0] + datestr).match(/([0-9]+) ([a-z]+) ago$/))) {
		lastAmt = parseInt(lastx[1]);
		lastx = lastx[2].replace(/s$/, '');
	} else if (!!(lastx = datestr.match(/last ([a-z]+)$/))) {
		lastx = lastx[1];
		lastAmt = 1;
	} else {
		lastx = false;
	}

	var num_back = (part1[2] === "0") ? 0 : parseInt(part1[2] || 1);

	function get_end_date() {
		if (plusFuture) {
			return '9999-01-01';
		} else if (plusCurrent) {
			if (toDate) return moment(today).format(format); // this combination essentially means the end date is always today
			if (toYesterday) return moment(today).subtract(1, 'days').format(format);
			switch (part1[4]) {
			case "day":
				// toYesterday is ignored here.
				return moment(today).format(format);
				break;
			case "week":
				return moment(today).endOf('week').format(format);
				break;
			case "month":
			case "year":
			case "quarter":
				return moment(today).endOf(part1[4] + 's').format(format);
				break;
			}
		} else if (toYesterday) {
			switch (part1[4]) {
			case "day":
				return moment(today).subtract(1, 'days').format(format);
				break;
			case "week":
				var subtract_num = (num_back == 0) ? 0 : 1;
				return moment(today).subtract(1, 'days').subtract(subtract_num, 'week').format(format);
				break;
			case "month":
			case "year":
			case "quarter":
				var subtract_num = (num_back == 0) ? 0 : 1;
				return moment(today).subtract(1, 'days').subtract(subtract_num, part1[4] + 's').format(format);
				break;
			}
		} else if (toDate) {
			switch (part1[4]) {
			case "day":
				return moment(today).format(format);
				break;
			case "week":
				var subtract_num = (num_back == 0) ? 0 : 1;
				return moment(today).subtract(subtract_num, 'week').format(format);
				break;
			case "month":
			case "year":
			case "quarter":
				var subtract_num = (num_back == 0) ? 0 : 1;
				return moment(today).subtract(subtract_num, part1[4] + 's').format(format);
				break;
			}
		} else {
			switch (part1[1]) {
			case "this":
				switch (part1[4]) {
					// Day should never get here
				case "week":
					// equivalent of a +current
					return moment(today).endOf("week").format(format);
					break;
				case "month":
				case "year":
				case "quarter":
					return moment(today).endOf(part1[4] + 's').format(format);
					break;
				}
			case "last":
				switch (part1[4]) {
				case "week":
					var subtract_num = (num_back == 0) ? 0 : 1;
					return moment(today).subtract(subtract_num, "week").endOf("week").format(format);
					break;
				case "day":
				case "month":
				case "year":
				case "quarter":
					var subtract_num = (num_back == 0) ? 0 : 1;
					return moment(today).subtract(subtract_num, part1[4] + 's').endOf(part1[4] + 's').format(format);
					break;
				}
			}
		}
	}

	function get_dates() {
		switch (part1[1]) {
		case 'today':
			return [moment(today).format(format)];
			break;
		case 'this':
			num_back = 0;
			switch (part1[4]) {
			case "day":
				// plus current and to date are meaningless here.
				return [moment(today).format(format)];
				break;
			case "week":
				return [moment(today).startOf('week').format(format), get_end_date()];
				break;
			case "month":
			case "year":
			case "quarter":
				return [moment(today).startOf(part1[4] + 's').format(format), get_end_date()];
				break;
			}
			break;
		case 'yesterday':
			return [moment(today).subtract(1, 'days').format(format)];
			break;
		case 'last':
			switch (part1[4]) {
			case "week":
				return [moment(today).startOf('week').subtract(num_back, 'week').format(format), get_end_date()];
				break;
			case "day":
				if (num_back == 0) return [moment(today).format(format)]; // same as "today"
				// fallthru
			default:
				return [moment(today).startOf(part1[4] + 's').subtract(num_back, part1[4] + 's').format(format), get_end_date()];
			}
			break;
		case 'since':
			return [moment(today).subtract(num_back, part1[4] + 's').format(format), ((plusCurrent || toDate) ? moment(today).format(format) : moment(today).subtract(1, 'days').format(format))]
			break;
		case 'next':

			break;
		}
	}
	var mydates = get_dates();
	if (mydates[1] == undefined) mydates = [mydates[0]];
	if (mydates[0] > mydates[1] && mydates[1] != undefined) return [];
	if (lastx) {
		if (mydates[0]) mydates[0] = moment(mydates[0]).subtract(lastAmt, lastx).format(format);
		if (mydates[1] && !plusCurrent && !plusFuture) mydates[1] = moment(mydates[1]).subtract(lastAmt, lastx).format(format);
	}

	return mydates;
}

function group_dates(datestr) {
	var ranges = datestr.split(/,|-/)
	var operations = datestr.match(/,|-/g);
	var result_fields;
	var last = "";
	for (var i = 0; i < operations.length; i++) {
		if (last == operations[i] && last == "-") return "Unexpected '-' in " + datestr;
		last = operations[i];
	}
	for (var i = 0; i < ranges.length; i++) {
		ranges[i] = parse_date(ranges[i])
	}
	console.log(parse_date("this month last year"));
	console.log(ranges);
	console.log(operations);
	return true;
}

if (require.main == module) {
	console.log(group_dates("today-yesterday,last year,last 2 days"));
}

module.exports = {
	parse_date: parse_date,
	group_dates: group_dates,
	getGroups: getGroups,
	getLagDate: getLagDate,
	parse_special: parse_special
}