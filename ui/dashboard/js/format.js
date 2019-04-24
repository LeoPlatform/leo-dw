var numeral = require("numeral");
var moment = require("moment");


function numeralFormat(value, format) {
	if(!value || isNaN(value) || !isFinite(value)) {
		value = 0;
	}
	return numeral(value).format(format);
}

module.exports = Object.freeze({
	get : function(column,numberOnly) {
		if (!column||!column.format) {
			return this.base;
		}
		var type = column.format;
		if(!type && column.type === "metric") {
			type = "int";
		}
		if (type in this) {
			return this[type];
		} else {
			return this.base;
		}
	},
	base : function(value) {
		return value;
	},
	float : function(value, decimals=3) {
		return numeralFormat(parseFloat(value), '0,0.'+('0'.repeat(decimals)));
	},
	money: function(value, dollarsOnly=false) {
		if (!isNaN(parseFloat(dollarsOnly)) && isFinite(dollarsOnly)) {
			return numeralFormat(parseFloat(value), '($0,0.'+('0'.repeat(dollarsOnly))+')');
		} else if (dollarsOnly) {
			return numeralFormat(parseFloat(value), '($0,0)');
		} else {
			return numeralFormat(parseFloat(value), '($0,0.00)');
		}
	},
	count : function(value) {
		return numeralFormat(parseInt(value),'0,0');
	},
	countavg : function(value) {
		return numeralFormat(parseFloat(value),'0,0.00');
	},
	int: function(value) {
		return numeralFormat(parseInt(value),'0,0');
	},
	intavg: function(value) {
		return numeralFormat(parseFloat(value),'0,0.00');
	},
	percent: function(value, decimals=2) {
		return numeralFormat(parseFloat(value),'0.'+('0'.repeat(decimals))+'%');
	},
	'duration-s' : function(value) {
		if(value === null) {
			return null;
		}
		return moment.duration(value, "seconds").humanize();
	},
	'duration-m' : function(value) {
		if(value === null) {
			return null;
		}
		return moment.duration(value, "minutes").humanize();
	},
	'duration-h' : function(value) {
		if(value === null) {
			return null;
		}
		return moment.duration(value, "hours").humanize();
	},
	'duration-d' : function(value) {
		if(value === null) {
			return null;
		}
		return moment.duration(value, "days").humanize();
	}
});
