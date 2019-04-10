var moment = require('moment');

module.exports = {
	parse : function(derived) {
		switch (derived.tick) {
		case 'hour':
			return {
				fields : [ 'd_date.date', 'd_time.hour24' ]
			};
			break;
		case 'day':
			return {
				fields : [ 'd_date.date' ]
			};
			break;
		case 'week':
			return {
				fields : [ 'd_date.week_ending_date' ]
			};
			break;
		case 'month':
			return {
				fields : [ 'd_date.year_month' ]
			};
			break;
		case 'yearly':
			return {
				fields : [ 'd_date.year' ]
			};
			break;
		}
	},
	transform : function(derived, mapping, data, columns) {
		derived.sort = {
			type : 'int'
		};
		var length = data.length;
		var index = mapping[derived.id];
		switch (derived.tick) {
		case 'hour':
			for (i = 0; i < length; i++) {
				var row = data[i];
				row[index] = moment(row[mapping['d_date.date']], "YYYY-MM-DD").valueOf() + (row[mapping['d_time.hour24']] * 3600000);
			}
			break;
		case 'day':
			for (i = 0; i < length; i++) {
				var row = data[i];
				row[index] = moment(row[mapping['d_date.date']], "YYYY-MM-DD").valueOf();
			}
			break;
		case 'week':
			for (i = 0; i < length; i++) {
				var row = data[i];
				row[index] = moment(row[mapping['d_date.week_ending_date']], "YYYY-MM-DD").valueOf();
			}
			break;
		case 'month':
			for (i = 0; i < length; i++) {
				var row = data[i];
				row[index] = moment(row[mapping['d_date.year_month']], "YYYY MMMM").valueOf();
			}
			break;
		case 'yearly':
			for (i = 0; i < length; i++) {
				var row = data[i];
				row[index] = moment(row[mapping['d_date.year']], "YYYY").valueOf();
			}
			break;
		}
		derived.onEmpty = "";
	}
};
