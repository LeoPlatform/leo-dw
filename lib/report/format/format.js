var numeral = require("numeral");
var moment = require("moment");

module.exports = Object.freeze({
	get: function (column, numberOnly) {
		if (!column || !column.format) {
			return this.base;
		}
		var type = column.format;
		if (!type && column.type === "metric") {
			type = "int";
		}
		if (column.alias && column.alias.match(/\|avg/)) {
			var newType = type + "avg";
			if (newType in this) {
				type = newType;
			}
		}

		if (numberOnly) {
			type = "n" + type;
			if (type in this) {
				return this[type];
			} else {
				return this.base;
			}
		} else {
			if (type in this) {
				return this[type];
			} else {
				return this.base;
			}
		}
	},
	base: function (value) {
		return value;
	},
	float: function (value) {
		var float = value / 1000;
		if (isNaN(float)) {
			float = 0;
		}
		return numeral(float).format('0,0.000');
	},
	nfloat: function (value) {
		var float = value / 1000;
		if (isNaN(float)) {
			float = 0;
		}
		return float;
	},
	money: function (value) {
		var float = value / 100;
		if (isNaN(float)) {
			float = 0;
		}
		return numeral(float).format('($0,.00)');
	},
	nmoney: function (value) {
		var float = value / 100;
		if (isNaN(float)) {
			float = 0;
		}
		return float;
	},
	lbs: function (value) {
		var lbFloat = value / 453.59237;
		var fullPounds = Math.floor(lbFloat);
		var ounces = Math.round((lbFloat - fullPounds) * 16)
		if (fullPounds >= 1) {
			return fullPounds + " lbs " + ounces + " oz";
		} else if (fullPounds == 1) {
			return ounces + " oz";
		}
	},
	kgs: function (value) {
		return numeral(value / 1000).format('0,0.000') + " kgs";
	},
	kgint: function (value) {
		return Math.ceil((value / 1000) * 0.453592);
	},
	count: function (value) {
		return numeral(value).format('0,0');
	},
	countavg: function (value) {
		return numeral(value).format('0,0.00');
	},
	nint: function (value) {
		return parseInt(value);
	},
	int: function (value) {
		return numeral(value).format('0,0');
	},
	integer: function (value) {
		return numeral(value).format('0,0');
	},
	intavg: function (value) {
		return numeral(value).format('0,0.00');
	},
	nintavg: function (value) {
		return parseFloat(value);
	},
	npercent: function (value) {
		if (value === null || isNaN(value) || value === undefined || value == Infinity || value == -Infinity) {
			return null;
		}
		return value;
	},
	percent: function (value) {
		if (value === null || isNaN(value) || value === undefined || value == Infinity || value == -Infinity) {
			return null;
		}
		return numeral(value).format('0.00%');
	},
	'duration-s': function (value) {
		if (value === null) {
			return null;
		}
		return moment.duration(value, "seconds").humanize();
	},
	'duration-m': function (value) {
		if (value === null) {
			return null;
		}
		return moment.duration(value, "minutes").humanize();
	},
	'duration-h': function (value) {
		if (value === null) {
			return null;
		}
		return moment.duration(value, "hours").humanize();
	},
	'duration-d': function (value) {
		if (value === null) {
			return null;
		}
		return moment.duration(value, "days").humanize();
	}
});