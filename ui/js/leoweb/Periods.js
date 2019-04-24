/* global Highcharts */
/* global $ */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var Periods = {};

Periods.init = function()
{
	// Nothing to do in here right now but it's here for consistency sake.
	return Periods;
};

var _periodMap = {
	"day_over_day": {
		filters: {"id":"d_date.id", "value":"last {periods} days plus current"},
		rows: ["d_date.date", "d_time.hour24_offset"],
		durationHours: 24,
		subPeriodDurationHours: 1,
		getNumberLeftInPeriodFromDate: function(date)
		{
			return (23 - moment(date).hours());
		},
		getStartOfLogicalPeriod: function(date, prevPeriods)
		{
			var result = moment(date).startOf("day").toDate();
            
			if (prevPeriods)
			{
				for (var i = 0; i < prevPeriods; i++)
				{
					result = moment(result).subtract(1, "minute").startOf("day").toDate();
				}
			}
            
			return result;
		},
		getDateColumnIndex: function(columns, ticks)
		{
			//TODO: replace d_date.epoch with d_date.date 
			return ticks ? columns["d_date.date"].index : [columns["d_date.date"].index, columns["d_time.hour24_offset"].index];
		},
		parseValToDate: function(val1, val2)
		{
			//TODO: refactor to use d_date.date instead of epoch
			//TODO: why are we multiplying but 1 second?
			// val1 should be date since epoch and val2 should be 24 hour offset
            
			// val2 won't be present in some rare cases
			var dateMili = moment(val1, "YYYY-MM-DD").toDate().getTime();
			if(val2) {
				dateMili += (parseInt(val2, 10) * 1000);
			}
          
			return moment(dateMili).toDate();
		},
		periodKey: "day",
		durationTitle: "Yesterday"
	},
	"week_over_week": {
		filters: {"id":"d_date.id", "value":"last {periods} weeks plus current to date"},
		rows: ["d_date.week_ending_date", "d_date.date"],
		durationHours: 168,
		subPeriodDurationHours: 24,
		getNumberLeftInPeriodFromDate: function(date)
		{
			return (7 - moment(date).weekday());
		},
		getStartOfLogicalPeriod: function(date, prevPeriods)
		{
			var result = moment(date).startOf("week").toDate();
            
			if (prevPeriods)
			{
				for (var i = 0; i < prevPeriods; i++)
				{
					result = moment(result).subtract(1, "minute").startOf("week").toDate();
				}
			}
            
			return result;
		},
		getDateColumnIndex: function(columns, ticks)
		{
			return columns["d_date.date"].index;
		},
		parseValToDate: function(val)
		{
			// val should be d_date.date and be in this format "2015-04-13"
			return moment(val, "YYYY-MM-DD").toDate();
		},
		periodKey: "week",
		durationTitle: "Last Week"
	},
	"month_over_month": {
		filters: {"id":"d_date.id", "value":"last {periods} months plus current to date"},
		rows: ["d_date.week_ending_date"],
		durationHours: 730.484,
		subPeriodDurationHours: 168,
		getNumberLeftInPeriodFromDate: function(date)
		{
			var now = moment(date);
			return (now.clone().endOf("month").date() - now.date());
		},
		getStartOfLogicalPeriod: function(date, prevPeriods)
		{
			var result = moment(date).startOf("month").toDate();
            
			if (prevPeriods)
			{
				for (var i = 0; i < prevPeriods; i++)
				{
					result = moment(result).subtract(1, "minute").startOf("month").toDate();
				}
			}
            
			return result;
		},
		getDateColumnIndex: function(columns, ticks)
		{
			return ticks ? columns["d_date.date"].index : columns["d_date.week_ending_date"].index;
		},
		parseValToDate: function(val)
		{
			// val should be d_date.date and be in this format "2015-04-13"
			return moment(val, "YYYY-MM-DD").toDate();
		},
		periodKey: "month",
		durationTitle: "Last Month"
	},
	"quarter_over_quarter": {
		filters: {"id":"d_date.id", "value":"last {periods} quarters plus current to date"},
		rows: ["d_date.month"],
		durationHours: 2191.455,
		subPeriodDurationHours: 730.484,
		getNumberLeftInPeriodFromDate: function(date)
		{
			var now = moment(date);
			return (now.clone().endOf("quarter").week() - now.week());
		},
		getStartOfLogicalPeriod: function(date, prevPeriods)
		{
			var result = moment(date).startOf("quarter").toDate();
            
			if (prevPeriods)
			{
				for (var i = 0; i < prevPeriods; i++)
				{
					result = moment(result).subtract(1, "minute").startOf("quarter").toDate();
				}
			}
            
			return result;
		},
		getDateColumnIndex: function(columns, ticks)
		{
			return ticks ? columns["d_date.date"].index : columns["d_date.month"].index;
		},
		parseValToDate: function(val)
		{
			// val should be d_date.date and be in this format "2015-04-13"
			return moment(val, "YYYY-MM-DD").toDate();
		},
		periodKey: "month",
		durationTitle: "Last Quarter"
	},
	"year_over_year": {
		filters: {"id":"d_date.id", "value":"last {periods} years plus current to date"},
		rows: ["d_date.year_month"],
		durationHours: 8765.8,
		subPeriodDurationHours: 730.484,
		getNumberLeftInPeriodFromDate: function(date)
		{
			var now = moment(date);
			return (now.weeksInYear() - now.week());
		},
		getStartOfLogicalPeriod: function(date, prevPeriods)
		{
			var result = moment(date).startOf("year").toDate();
            
			if (prevPeriods)
			{
				for (var i = 0; i < prevPeriods; i++)
				{
					result = moment(result).subtract(1, "minute").startOf("year").toDate();
				}
			}
            
			return result;
		},
		getDateColumnIndex: function(columns, ticks)
		{
			return ticks ? columns["d_date.date"].index : columns["d_date.year_month"].index;
		},
		parseValToDate: function(val)
		{
			// val should be d_date.year_month and be in this format "2015 February"
			var m = moment(val, "YYYY MMMM");
			if (!m.isValid())
				m = moment(val, "YYYY-MM-DD");
            
			return m.toDate();
		},
		periodKey: "year",
		durationTitle: "Last Year"
	}
};

Periods.getPeriods = function()
{
	return _periodMap;
};

module.exports = Periods;
