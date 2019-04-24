var LeoDispatcher = require('../dispatcher/LeoDispatcher');
var LeoConstants = require('../constants/LeoConstants');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var ActionTypes = LeoConstants.ActionTypes;
var CHANGE_EVENT = 'change';

var FieldsStore = require('./FieldsStore');

var _reportFilters = [];

var ReportFilterStore = assign({}, EventEmitter.prototype, {

	updateReportFilter: function (filterObject) {
		updateReportFilter(filterObject);
	},

	getReportFilters: function () {
		return _reportFilters;
	},

	emitChange: function () {
		this.emit(CHANGE_EVENT);
	},

	addChangeListener: function (callback) {
		this.on(CHANGE_EVENT, callback);
	},

	removeChangeListener: function (callback) {
		this.removeListener(CHANGE_EVENT, callback);
	}

});

ReportFilterStore.dispatchToken = LeoDispatcher.register(function (payload) {
	var action = payload.action;
	switch (action.type) {
	case ActionTypes.INIT_REPORT_FILTERS:
		if (action.reportFilters) {
			for (var i = 0; i < action.reportFilters.length; i++) {
				if (!action.reportFilters[i].checkboxes) {
					action.reportFilters[i].checkboxes = [];
				}
				//there can only be one underscore
				for (var j in action.reportFilters[i].checkboxes) {
					if (j.charCodeAt(0) == 95 || j.charCodeAt(0) == 8203) {
						delete action.reportFilters[i].checkboxes[j];
					}
				}
				action.reportFilters[i].checkboxes['_'] = false; //prevent object becoming array
				if (action.reportFilters[i].description) {
					action.reportFilters[i].value = [action.reportFilters[i].description];
					delete(action.reportFilters[i].description);
				}
				if (typeof action.reportFilters[i].value == 'string') {
					action.reportFilters[i].value = [action.reportFilters[i].value];
				}
			}
			_reportFilters = action.reportFilters;
		} else {
			_reportFilters = [];
		}
		ReportFilterStore.emitChange();
		break;

	case ActionTypes.ADD_REPORT_FILTER:
		addReportFilter(action.reportFilter);
		ReportFilterStore.emitChange();
		break;

	case ActionTypes.REMOVE_REPORT_FILTER:
		removeReportFilter(action.filterId);
		ReportFilterStore.emitChange();
		break;

	case ActionTypes.UPDATE_REPORT_FILTER:
		updateReportFilter(action.filterObject);
		ReportFilterStore.emitChange();
		break;

	default:
		//do nothing
		break;
	}

});

module.exports = ReportFilterStore;

function addReportFilter(filter) {

	//When we add filters we need to fill in the missing information
	//that is normally added by the report data. This fills in the labels for the UI.
	var commonDimensions = FieldsStore.getCommonDimensions();

	//for each dimension
	for (var i = 0; i < commonDimensions.length; i++) {

		//for each attribute in the dimension
		for (var j = 0; j < commonDimensions[i].attributes.length; j++) {

			//if the ids match.....assign, break, and set the found flag
			if (commonDimensions[i].attributes[j].id == filter.id) {
				filter.label = commonDimensions[i].attributes[j].label;
				var found = true;
				break;
			}

		}

		if (found) {
			filter.dimension = commonDimensions[i].label;
			break;
		}

	}

	_reportFilters.push(filter);

}

function removeReportFilter(filterId) {

	for (var i = 0; i < _reportFilters.length; i++) {
		if (_reportFilters[i].id == filterId) {
			_reportFilters.splice(i, 1);
			break;
		}
	}

}

/* add and update together */
function updateReportFilter(filterObject) {
	var found = false;

	_reportFilters = _reportFilters.map(function (filter) {
		if (filter.id == filterObject.id) {
			found = true;
			filter.value = filterObject.value;
			if (!Array.isArray(filter.value)) {
				if (filter.value === '') {
					filter.value = [];
				} else {
					filter.value = [filter.value];
				}
			}
			if (filter.value[0] == '') {
				filter.value.shift();
			}
			filter.checkboxes = filterObject.checkboxes;
			if (filterObject.comparison) {
				filter.comparison = filterObject.comparison;
			}
		}

		return filter;
	});

	if (!found) {
		_reportFilters.push(filterObject);
	}

}
