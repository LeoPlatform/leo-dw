var epochDate = new Date(1400, 0, 1, 0, 0, 0, 0);
var epochDateTime = epochDate.getTime();
var oneDay = (24 * 60 * 60 * 1000);
var oneDayInverse = 1 / oneDay;

// Single object that can be reused anywhere that doesn't need to be remembered.
var reusableDate = new Date(1400, 0, 1, 0, 0, 0, 0);
// Dimensions Surrogate offset for smart tables, such as date and time
var dimensionSurrogateOffset = 10000;

const config = require("leo-config");
const configure = config.Resources;
var calendar = Object.assign({
	week: {}
}, configure.calendar);

var moment = require("moment");
moment.updateLocale('en', {
	week: {
		dow: calendar.week.dow || 0,
		doy: calendar.week.doy || 4
	}
});

var idCache = {};
var objCache = {};

module.exports = {
	idFromMoment: function (val) {
		if (val.isValid()) {
			return Math.round(Math.abs((val.valueOf() - epochDateTime) * oneDayInverse)) + dimensionSurrogateOffset
		} else {
			return 1;
		}
	},
	idFromDate: function (val) {
		if (val && val !== "0000-00-00") {
			var d = new Date(val.getTime());
			d.setHours(0, 0, 0, 0);
			return Math.round(Math.abs((d.valueOf() - epochDateTime) * oneDayInverse)) + dimensionSurrogateOffset
		} else {
			return 1;
		}
	},
	idFromString: function (val) {
		if (!(val in idCache)) {
			var matches;
			if (matches = val.match(/^\s*(\d+)\-(\d+)\-(\d+)/)) {
				reusableDate.setFullYear(matches[1], matches[2] - 1, matches[3]);
				idCache[val] = Math.floor(Math.abs((reusableDate.getTime() - epochDateTime) * oneDayInverse)) + dimensionSurrogateOffset;
			} else if (val.toLowerCase().trim() == "notyet") {
				idCache[val] = 1;
			}
		}
		return idCache[val];
	},
	dateFromId: function (id) {
		return moment((id - dimensionSurrogateOffset) * oneDay + epochDateTime).format("YYYY-MM-DD");
	},
	momentFromId: function (id) {
		return moment((id - dimensionSurrogateOffset) * oneDay + epochDateTime);
	},
	objFromId: function (id) {
		if (id == 1) {
			return {
				_id: 1,
				id: "Not Yet",
				date: '0000-00-00',
				description: null,
				day_of_week_name: null,
				day_of_week_number: 0,
				day_of_month: 0,
				week_ending_date: null,
				month_ending_date: null,
				month_name: null,
				month_number: 0,
				year_month: null,
				quarter: 0,
				year_quarter: null,
				year: null,
				weekday_indicator: null,
				week_number: 0,
				year_week: null,
				days_left_in_month: 0,
				business_days_left_in_month: 0,
				is_valid: 0
			}
		} else if (id == 2) {
			return {
				_id: 2,
				id: "Invalid date",
				date: '0000-00-00',
				description: null,
				day_of_week_name: null,
				day_of_week_number: 0,
				day_of_month: 0,
				week_ending_date: null,
				month_ending_date: null,
				month_name: null,
				month_number: 0,
				year_month: null,
				quarter: 0,
				year_quarter: null,
				year: null,
				weekday_indicator: null,
				week_number: 0,
				year_week: null,
				days_left_in_month: 0,
				business_days_left_in_month: 0,
				is_valid: 0
			}
		} else {
			var date = this.momentFromId(id);
			var daysLeftInMonth = parseInt(date.clone().endOf('month').format("D")) - parseInt(date.format("D"));
			var fullWeeks = Math.floor(daysLeftInMonth / 7);
			var partialWeekDays = daysLeftInMonth % 7;
			var businessDaysLeftInMonth = daysLeftInMonth - (fullWeeks * 2) - (partialWeekDays < 6 ? 1 : 0);
			return {
				_id: id,
				id: date.format("YYYY-MM-DD"),
				date: date.format("YYYY-MM-DD"),
				description: date.format("ll"),
				day_of_week_name: date.format("dddd"),
				day_of_week_number: parseInt(date.format("e")) + 1,
				day_of_month: parseInt(date.format("D")),
				week_ending_date: date.clone().endOf('week').format("YYYY-MM-DD"),
				month_ending_date: date.clone().endOf('month').format("YYYY-MM-DD"),
				month_name: date.format("MMMM"),
				month_number: parseInt(date.format("M")),
				year_month: date.format("YYYY MMMM"),
				quarter: parseInt(date.format("Q")),
				year_quarter: date.format("YYYY [Q]Q"),
				year: date.format("YYYY"),
				weekday_indicator: [0, 6].indexOf(date.format("e")) !== -1 ? 'Weekend' : 'Weekday',
				week_number: parseInt(date.format("w")),
				year_week: date.format("YYYY[,] wo [week]"),
				days_left_in_month: daysLeftInMonth,
				business_days_left_in_month: businessDaysLeftInMonth,
				is_valid: id >= 10000
			};
		}
	},
	objFromString: function (val) {
		var id = this.idFromString(val);
		if (!(id in objCache)) {
			if (id >= dimensionSurrogateOffset) {
				var date = moment(val, "YYYY-MM-DD");

				var daysLeftInMonth = parseInt(date.clone().endOf('month').format("D")) - parseInt(date.format("D"));
				var fullWeeks = Math.floor(daysLeftInMonth / 7);
				var partialWeekDays = daysLeftInMonth % 7;
				var businessDaysLeftInMonth = daysLeftInMonth - (fullWeeks * 2) - (partialWeekDays < 6 ? 1 : 0);

				objCache[id] = {
					_id: id,
					id: date.format("YYYY-MM-DD"),
					date: date.format("YYYY-MM-DD"),
					description: date.format("ll"),
					day_of_week_name: date.format("dddd"),
					day_of_week_number: parseInt(date.format("e")) + 1,
					day_of_month: parseInt(date.format("D")),
					week_ending_date: date.clone().endOf('week').format("YYYY-MM-DD"),
					month_ending_date: date.clone().endOf('month').format("YYYY-MM-DD"),
					month_name: date.format("MMMM"),
					month_number: parseInt(date.format("M")),
					year_month: date.format("YYYY MMMM"),
					quarter: parseInt(date.format("Q")),
					year_quarter: date.format("YYYY [Q]Q"),
					year: date.format("YYYY"),
					weekday_indicator: [0, 6].indexOf(date.format("e")) !== -1 ? 'Weekend' : 'Weekday',
					week_number: parseInt(date.format("w")),
					year_week: date.format("YYYY[,] wo [week]"),
					days_left_in_month: daysLeftInMonth,
					business_days_left_in_month: businessDaysLeftInMonth,
					is_valid: id >= 10000
				};
			} else {
				objCache[id] = {
					_id: id,
					id: val
				};
			}
		}
		return objCache[id];
	}
};
