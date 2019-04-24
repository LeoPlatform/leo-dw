var WebAPI = require('../utils/WebAPI');
var LeoDispatcher = require('../dispatcher/LeoDispatcher');
var LeoConstants = require('../constants/LeoConstants');
var ActionTypes = LeoConstants.ActionTypes;

var td = require("throttle-debounce");
var ReportActions = require('./ReportActions');

module.exports = {

	initReportFilters : function(reportFilters) {

		LeoDispatcher.handleViewAction({
			type : ActionTypes.INIT_REPORT_FILTERS,
			reportFilters : reportFilters
		});

	},

	addReportFilter : function(reportFilter) {

		LeoDispatcher.handleViewAction({
			type : ActionTypes.ADD_REPORT_FILTER,
			reportFilter : reportFilter
		});

	},

	removeReportFilter : function(filterId) {

		LeoDispatcher.handleViewAction({
			type : ActionTypes.REMOVE_REPORT_FILTER,
			filterId : filterId
		});

	},

	updateReportFilter : function(filterObject) {

		LeoDispatcher.handleViewAction({
			type : ActionTypes.UPDATE_REPORT_FILTER,
			filterObject : filterObject
		});

	},


	autocomplete : td.throttle(1000, function(field, term, callback) {

		if (arguments.length == 2) {
			callback = term;
			term = field;
			field = "*";
		}

		WebAPI.get("autocomplete/" + field + "/" + encodeURIComponent(term), function(result) {
			callback(result);
		});

	}),
	autocomplete2 : function(field, term, callback) {

		if (arguments.length == 2) {
			callback = term;
			term = field;
			field = "*";
		}

		WebAPI.get("autocomplete/" + field + "/" + encodeURIComponent(term), function(result) {
			callback(result);
		});

	},

	search : td.throttle(1000, function(dimension, fields, term, callback) {
		dimension = dimension.replace(/^d_/, '');
		fields = fields || [ '*' ];
		WebAPI.get("search/" + encodeURIComponent(dimension) + "/" + encodeURIComponent(fields.join(';')) + "/" + encodeURIComponent(term), function(result) {
			callback(result);
		});

	})
};
