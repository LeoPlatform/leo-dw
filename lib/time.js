var epochDate = new Date(1400, 0, 1, 0, 0, 0, 0);
var epochDateTime = epochDate.getTime();

// Single object that can be reused anywhere that doesn't need to be remembered.
var reusableDate = new Date(1400, 0, 1, 0, 0, 0, 0);
// Dimensions Surrogate offset for smart tables, such as date and time
var dimensionSurrogateOffset = 10000;

var moment = require("moment");
moment.updateLocale('en', {
	week: {
		dow: 7,
		doy: 4
	}
});
var idCache = {};
var objCache = {};

module.exports = {
	idFromMoment: function (val) {
		if (val.isValid()) {
			return Math.round((val.hours() * 3600) + (val.minutes() * 60) + val.seconds() + dimensionSurrogateOffset);
		} else {
			return 1;
		}
	},
	idFromParts: function (hour, minutes, seconds) {
		return (hour * 3600) + (minutes * 60) + seconds + dimensionSurrogateOffset;
	},
	idFromString: function (val) {
		if (!(val in idCache)) {
			var matches;
			if (matches = val.match(/^.*\s*(\d+):(\d+):(\d+)\s*$/)) {
				idCache[val] = (parseInt(matches[1]) * 3600) + (parseInt(matches[2]) * 60) + parseInt(matches[3]) + dimensionSurrogateOffset;
			} else if (val.toLowerCase().trim() == "notyet") {
				idCache[val] = 1;
			}
		}
		return idCache[val];
	},
	timeFromId: function (id) {
		var t = moment.duration(id - 10000, "seconds");
		return moment({
			hour: t.hours(),
			minute: t.minutes(),
			seconds: t.seconds()
		}).format("HH:mm:ss");
	},
	momentFromId: function (id) {
		var t = moment.duration(id - 10000, "seconds");
		return moment({
			hour: t.hours(),
			minute: t.minutes(),
			seconds: t.seconds()
		});
	},
	objFromId: function (id) {
		if (id == 1) {
			return {
				minute: 0,
				seconds: 0,
				hour_24: 0,
				_id: 1,
				hour: 0,
				id: "Not Yet",
				is_valid: 0
			};
		} else if (id == 2) {
			return {
				minute: 0,
				seconds: 0,
				hour_24: 0,
				_id: 2,
				hour: 0,
				id: "Invalid date",
				is_valid: 0
			};
		} else {
			var date = this.momentFromId(id);
			return {
				_id: id,
				id: date.format("HH:mm:ss"),
				am_pm: date.format("A"),
				hour: parseInt(date.format("h")),
				hour_24: parseInt(date.format("H")),
				minute: parseInt(date.format("m")),
				second: parseInt(date.format("s")),
				time: date.format("hh:mm:ss"),
				time_24: date.format("HH:mm:ss"),
				is_valid: id >= 10000
			};
		}
	},
	objFromString: function (val) {
		var id = this.idFromString(val);
		if (!(id in objCache)) {
			if (id >= dimensionSurrogateOffset) {
				var date = moment(val, "HH:mm:ss");

				objCache[id] = {
					_id: id,
					id: val,
					am_pm: date.format("A"),
					hour: parseInt(date.format("h")),
					hour_24: parseInt(date.format("H")),
					minute: parseInt(date.format("m")),
					second: parseInt(date.format("s")),
					time: date.format("hh:mm:ss"),
					time_24: date.format("HH:mm:ss"),
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
