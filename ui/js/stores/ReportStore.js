var LeoDispatcher = require('../dispatcher/LeoDispatcher');
var LeoConstants = require('../constants/LeoConstants');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var ActionTypes = LeoConstants.ActionTypes;
var CHANGE_EVENT = 'change';

var Format = require('../data/format.js');
var FieldsStore = require('./FieldsStore');
var ReportFilterStore = require('./ReportFilterStore');

var _columnDims = [];
var _columnMetrics = [];
var _rowDims = [];
var _rowMetrics = [];
var _isLocked = false;
var _isLoading = true;

var _columnHeaders = [];
var _columns = [];
var _headers = [];
var _rowHeaders = [];
var _rows = [];
var _allRows = [];
var _showMissingDims = [];

var _sortVars = [];
var _sorted = {};
var _limitAmount = 2000

var _error = '';

var _advanced = undefined
var _chart_id = undefined

var _raw_data = {};

var ReportStore = assign({}, EventEmitter.prototype, {

	getLastError: function () {
		var error = _error;
		_error = '';
		return error;
	},

	getReportData: function () {
		return {
			pivots: _raw_data && _raw_data.pivots,
			pivotDefaults: _raw_data && _raw_data.pivotDefaults,
			columnDims: _columnDims,
			columnMetrics: _columnMetrics,
			rowDims: _rowDims,
			rowMetrics: _rowMetrics,
			locked: _isLocked,
			showMissingDims: _showMissingDims,

			columns: _columns,
			columnheaders: _columnHeaders,
			rowheaders: _rowHeaders,
			headers: _headers,
			rows: _rows
		}
	},

	getPartitions: function () {
		return _columnDims;
	},

	getDimensions: function () {
		return _rowDims;
	},

	getMetrics: function () {
		if (_columnMetrics.length) return _columnMetrics;
		return _rowMetrics;
	},

	getColumnHeaders: function () {
		return _columnHeaders;
	},

	getColumns: function () {
		return _columns;
	},

	getRowHeaders: function () {
		return _rowHeaders;
	},

	getHeaders: function () {
		return _headers;
	},

	getRows: function () {
		return _rows;
	},

	getShowMissingDims: function () {
		return _showMissingDims;
	},

	getLockedStatus: function () {
		return _isLocked;
	},

	getLoadingStatus: function () {
		return _isLoading;
	},

	exportData: function (use_tabs, show_headers) {
		return formatDataForExport(use_tabs, show_headers);
	},

	emitChange: function () {
		this.emit(CHANGE_EVENT);
	},

	addChangeListener: function (callback) {
		this.on(CHANGE_EVENT, callback);
	},

	removeChangeListener: function (callback) {
		this.removeListener(CHANGE_EVENT, callback);
	},

	getSortWithColumnNames: function () {
		var columns = _rowDims.concat(_rowMetrics);
		if (_sortVars.length) {
			var sort = [];
			for (var i in _sortVars) {
				if (_sortVars[i] && _sortVars[i].column) {
					var columnNum = parseInt(_sortVars[i].column);
					if (columnNum >= _rowDims.length) {
						var columnName = _rowMetrics[(columnNum - _rowDims.length) % _rowMetrics.length]; //sort by metric
					} else {
						var columnName = _rowDims[columnNum];
					}
					sort.push({
						column: columnName,
						direction: _sortVars[i].direction,
						auto: _sortVars[i].auto
					});
				}
			}
			return sort;
		} else {
			return {};
		}

	},

	getSort: function () {
		//delete sort when sorted column is deleted
		_sortVars = _sortVars.filter(function (sort) {
			return (typeof sort.column != 'undefined' && !(sort.column >= _rowDims && sort.auto));
		});

		if (_sortVars.length) {
			var existingSorts = _sortVars.map(function (sort) {
				return sort.column;
			});
			var sorts = _sortVars.concat(_rowDims.map(function (id, index) {
				return {
					column: index,
					direction: 'asc',
					auto: true
				};
			}).filter(function (c) {
				return existingSorts.indexOf(c.column) == -1;
			}));
		} else {
			var sorts = _rowDims.map(function (id, index) {
				return {
					column: index,
					direction: 'asc',
					auto: true
				};
			});
		}
		return sorts;
	},

	getSorted: function () {
		return _sorted;
	},

	getLimit: function () {
		return _limitAmount || 2000
	},

	getLimitLabel: function () {
		if (_sortVars[0]) {
			var sort_column_index = _sortVars[0].column
			if (sort_column_index < _rowDims.length) {
				var column_id = _rowDims[sort_column_index]
			} else if (_columnDims.length > 0) {
				var column_id = _rowMetrics[(sort_column_index - _rowDims.length) % _rowMetrics.length]
			} else {
				var column_id = _rowMetrics[_rowMetrics.length - 1]
			}
			if (typeof column_id == 'object' && column_id.id) {
				column_id = column_id.id
			}
			var column = FieldsStore.getColumnDetails((column_id + '|').split('|')[0])
			return column ? column.parent.label + ' ' + column.label : column_id
		}
	},

	getTopLimit: function () {
		var field = ''
		var direction = ''
		var filters = []

		if (_sortVars[0]) {
			direction = _sortVars[0].direction
			var sort_column_index = _sortVars[0].column
			if (sort_column_index < _rowDims.length) {
				field = _rowDims[sort_column_index]
			} else if (_columnDims.length > 0) {
				field = _rowMetrics[(sort_column_index - _rowDims.length) % _rowMetrics.length]
				_headers.map(function (headers) {
					if (headers[0].id != field && typeof headers[0].value !== 'undefined') {
						var header = headers[Math.floor((sort_column_index - _rowDims.length) / headers[0].span)] || {}
						filters.push({
							id: header.id,
							value: header.value
						})
					}
				})
			} else {
				field = _rowMetrics[_rowMetrics.length - 1]
			}
		}

		if (typeof field == 'object' && field.id) {
			field = field.id
		}

		return {
			limit: this.getLimit(),
			field: field || undefined,
			direction: direction || undefined,
			filters: filters.length == 0 ? undefined : filters
		}
	},

	getChartId: function () {
		return _chart_id
	},

	getAdvanced: function () {
		return _advanced
	},

	setAdvanced: function (advanced) {
		if (advanced.chart_id) {
			_chart_id = advanced.chart_id
			delete advanced.chart_id
		}
		_advanced = advanced
	},

	setData: function (data) {
		_rowHeaders = data.rowheaders || []
		_columns = data.columns || {}
		_columnHeaders = data.columnheaders || []
		_headers = data.header || []
		_allRows = data.rows || []
	}

});

ReportStore.dispatchToken = LeoDispatcher.register(function (payload) {
	var action = payload.action;

	switch (action.type) {
	case ActionTypes.INIT_REPORT:
		_isLoading = true;
		assignInitialReportData(action.reportData);
		ReportStore.emitChange();
		break;

	case ActionTypes.REPORT_LOADING:
		_isLoading = true;
		ReportStore.emitChange();
		break;

	case ActionTypes.REPORT_LOADED:
		assignReportData(action.reportData);
		_isLoading = false;
		ReportStore.emitChange();
		break;

	case ActionTypes.UPDATE_COLUMN_BY_INDEX:
		_isLoading = true;
		updateColumnByIndex(action.column_type, action.from, action.id, action.replace, action.remove_type);
		ReportStore.emitChange();
		break;

	case ActionTypes.UPDATE_COLUMN:
		_isLoading = true;
		updateColumn(action.column_type, action.from, action.id, action.replace);
		ReportStore.emitChange();
		break;

	case ActionTypes.ADD_DIMENSION:
		_isLoading = true;
		addDimension(action.to, action.position, action.dimension);
		ReportStore.emitChange();
		break;

	case ActionTypes.REMOVE_DIMENSION:
		_isLoading = true;
		removeDimension(action.from, action.dimension);
		ReportStore.emitChange();
		break;

	case ActionTypes.ADD_METRIC:
		_isLoading = true;
		addMetric(action.to, action.position, action.metric);
		ReportStore.emitChange();
		break;

	case ActionTypes.REMOVE_OTHER_METRICS:
		_isLoading = true;
		removeOtherMetrics(action.index);
		ReportStore.emitChange();
		break;

	case ActionTypes.REMOVE_METRIC:
		_isLoading = true;
		removeMetric(action.from, action.metric);
		ReportStore.emitChange();
		break;

	case ActionTypes.UPDATE_ROW_ORDER:
		_isLoading = true;
		updateRowOrder(action.dimOrder, action.metricOrder);
		ReportStore.emitChange();
		break;

	case ActionTypes.UPDATE_COLUMN_ORDER:
		_isLoading = true;
		updateColumnOrder(action.dimOrder, action.metricOrder);
		ReportStore.emitChange();
		break;

	case ActionTypes.SWAP_SORT_CONTAINER:
		_isLoading = true;
		swapSortContainer(action.from, action.tabType, action.id);
		ReportStore.emitChange();
		break;

	case ActionTypes.SWAP_ALL_SORT_CONTAINERS:
		_isLoading = true;
		swapAllSortContainers();
		ReportStore.emitChange();
		break;

	case ActionTypes.SWAP_DIMS_IN_SORT_CONTAINERS:
		_isLoading = true;
		swapDimsInSortContainers();
		ReportStore.emitChange();
		break;

	case ActionTypes.SWAP_METRICS_IN_SORT_CONTAINERS:
		_isLoading = true;
		swapMetricsInSortContainers();
		ReportStore.emitChange();
		break;

	case ActionTypes.SORT:
		_sortVars = [{
			column: action.column,
			direction: action.order == "desc" ? 'desc' : 'asc'
		}];
		ReportStore.emitChange();
		break;

	case ActionTypes.UPDATE_LIMIT:
		_limitAmount = action.limitAmount
		ReportStore.emitChange();
		break;

	default:
		//do nothing
		break
	}
});

module.exports = ReportStore;

function assignInitialReportData(reportData) {
	_raw_data = reportData;
	_columnDims = reportData.columnDims || [];
	_columnMetrics = reportData.columnMetrics || [];
	_rowDims = reportData.rowDims || [];
	_rowMetrics = reportData.rowMetrics || [];
	_isLocked = reportData.locked || false;
	_sortVars = reportData.sort || [];
	_limitAmount = reportData.top ? reportData.top.limit : 2000
	_showMissingDims = reportData.showMissingDims || [];
	_advanced = reportData.advanced || undefined

	if (_columnMetrics.length == 0 && _rowMetrics.length == 0) {
		FieldsStore.deleteCommonDimensions();
	}
}

function assignReportData(reportData) {

	_raw_data = reportData;
	if (reportData.error || reportData.errorMessage || reportData.name == 'error') {

		_error = reportData.error || reportData.errorMessage || reportData.detail || reportData.routine || 'An unknown error occurred'

		/* attempt to build the headers anyway */

		var columns = {},
			rowheaders = [],
			columnheaders = [],
			headers = [
				[]
			]

		_columnDims.forEach((partitionId) => {
			var partition = FieldsStore.getColumnDetails(partitionId)
			if (partition) {
				columns[partitionId] = {
					id: partition.id,
					label: partition.label,
					type: 'attribute', //partition.type,
					format: partition.format,
					parent: partition.parent.label,
					sort: partition.sort
				}
				columnheaders.push({
					id: partitionId,
					height: 38,
					type: 'attribute', //partition.type,
				})
			}
		})

		_rowDims.forEach((dimensionId) => {
			var dimension = FieldsStore.getColumnDetails(dimensionId)
			if (dimension) {
				columns[dimensionId] = {
					id: dimension.id,
					label: dimension.label,
					type: 'attribute', //dimension.type,
					format: dimension.format,
					parent: dimension.parent.label,
					sort: dimension.sort
				}
				rowheaders.push({
					id: dimensionId,
					width: 150,
					type: 'attribute', //dimension.type
				})
			}
		})

		_rowMetrics.forEach((metricId) => {
			if (metricId.id) {
				metricId = metricId.id
			}
			var metric = FieldsStore.getColumnDetails(metricId.split('|')[0])
			if (metric) {
				columns[metricId] = {
					id: metric.id,
					label: metric.label,
					type: metric.type,
					format: metric.format,
					parent: metric.parent.label,
					sort: metric.sort
				}
				rowheaders.push({
					id: metricId,
					width: 120,
					type: metric.type
				})
				headers[0].push({
					id: metricId,
					span: 1,
					type: metric.type,
					width: 120
				})
			}
		})

		columnheaders.push({
			height: 38,
			type: 'metrics'
		})

		/*
		console.log('columns', columns)
		console.log('rowheaders', rowheaders)
		console.log('columnheaders', columnheaders)
		console.log('headers', headers)
		/* */

		_columnHeaders = columnheaders
		_columns = columns
		_headers = headers
		_rowHeaders = rowheaders
		_allRows = _rows = []
		_sorted = {}

	} else {

		//NEED TO REFACTOR THIS
		//IMPORTANT!!! ROWHEADERS AND COLUMNHEADERS COME BACK IN REVERSE TO THE REST OF THE APPLICATION
		_columnHeaders = reportData.rowheaders || []
		_columns = reportData.columns || {}
		_headers = reportData.headers || []
		_rowHeaders = reportData.columnheaders || []
		_rows = reportData.rows || []
		_allRows = reportData.rows || []
		_sorted = reportData.sorted || {}
		_limitAmount = reportData.top ? reportData.top.limit : 2000
		_showMissingDims = reportData.showMissingDims || []

	}
}

function removeFieldByIndex(from, index) {
	var offset = 0;
	if (from == "column") {
		var headers = _columnHeaders;
		if (index >= _columnDims.length) {
			var arr = _columnMetrics;
			offset = _columnDims.length;
			index -= offset;
		} else {
			var arr = _columnDims;
		}
	} else {
		var headers = _rowHeaders;
		if (index >= _rowDims.length) {
			var arr = _rowMetrics;
			offset = _rowDims.length;
			index -= offset;
		} else {
			var arr = _rowDims;
		}
	}

	arr.splice(index, 1);
	headers.splice(offset + index, 1);
	return index;
}

function updateColumnByIndex(column_type, from, id, index) {
	var isUpdate = (index || index === 0);
	if (isUpdate) {
		index = removeFieldByIndex(from, index);
	} else {
		var index = null;
	}

	switch (column_type) {
	case 'metric':
		addMetric(from, index, id, isUpdate);
		break;

	case 'dimension':
		addDimension(from, index, id, isUpdate);
		break;
	}
}

function updateColumn(column_type, from, id, replace) {
	if (replace) {
		var dims = _columnDims.concat(_rowDims);
		if (dims.indexOf(replace) != -1) {
			var position = removeDimension(from, replace, true);
		} else {
			var position = removeMetric(from, replace, true);
		}
	} else {
		var position = null;
	}

	switch (column_type) {
	case 'metric':
		addMetric(from, position, id, !!replace);
		break;

	case 'dimension':
		addDimension(from, position, id, !!replace);
		break;
	}
}

function addDimension(to, position, dimension, isUpdate) {

	if (!isUpdate && to == 'row') {
		//if sort column is > # dim increment by 1
		for (var i = 0; i < _sortVars.length; i++) {
			if (_sortVars[i].column >= _rowDims.length) {
				_sortVars[i].column++;
			}
		}
	}

	var parentLabel = null;
	var childLabel = null;

	//Need to front load the column/row headers
	var commonDims = FieldsStore.getCommonDimensions();

	var labels = dimension.substring(2).split('.'); //Skip the "d_" then split the parent.child
	var parent = labels[0]; //Only relevant one to cut down on searching

	//Search through the selection overlay fields and find the corresponding labels for the dimension
	for (var i = 0; i < commonDims.length; i++) {
		if (commonDims[i].label.toLowerCase() == parent.toLowerCase()) {
			parentLabel = commonDims[i].label;

			for (var j = 0; j < commonDims[i].attributes.length; j++) {
				if (commonDims[i].attributes[j].id == dimension) {
					childLabel = commonDims[i].attributes[j].label;
					break;
				}
			}
			break;
		}
	}

	//Assign the dimension and the headers
	if (to == "column") {
		var arr = _columnDims;
		_columnHeaders.push({
			id: dimension,
			width: 150
		});
	} else {
		var arr = _rowDims;
		_rowHeaders.push({
			id: dimension,
			height: 38
		});
	}

	_columns[dimension] = {
		id: dimension,
		label: childLabel,
		parent: parentLabel,
		type: "dimension"
	};

	//add to the corresponding dimension object
	if (position === null) {
		arr.push(dimension);
	} else {
		arr.splice(position, 0, dimension);
	}

}

function removeDimension(from, dimension, isUpdate) {

	//find the right dimensions object
	if (from == "column") {
		var arr = _columnDims;
		var headers = _columnHeaders;
	} else {
		var arr = _rowDims;
		var headers = _rowHeaders;
	}

	//find and remove by index
	var index = $.inArray(dimension, arr);

	if (index >= -1) {

		arr.splice(index, 1);

		for (var i = 0; i < headers.length; i++) {
			if (headers[i].id == dimension) {
				headers.splice(i, 1);
				break;
			}
		}

		if (!isUpdate) {
			//if sort column is > index decrement by 1

			_sortVars = _sortVars.filter(function (sortVar, i) {
				if (sortVar.column == index) {
					return false;
				} else if (sortVar.column > index && sortVar.column > 0) {
					sortVar.column--;
				}
			})

			/*
			for(var i=_sortVars.length-1; i>=0; i--) {
				if (_sortVars[i].column == index) {
					delete(_sortVars[i]);
				} else if (_sortVars[i].column > index && _sortVars[i].column > 0) {
					_sortVars[i].column--;
				}
			}
			/* */
		}
	}

	return index;
}

function addMetric(to, position, metric, isUpdate) {

	//Need to move ALL metrics to one container or the other
	//They can't exist in both!
	if (to == "column") {

		if (_rowMetrics.length > 0) {
			_columnMetrics = $.extend(true, [], _rowMetrics);
			_rowMetrics = [];
		}

		if (position === null) {
			_columnMetrics.push(metric);
		} else {
			_columnMetrics.splice(position, 0, metric);
		}

	} else {

		if (_columnMetrics.length > 0) {
			_rowMetrics = $.extend(true, [], _columnMetrics);
			_columnMetrics = [];
		}

		if (position === null) {
			_rowMetrics.push(metric);
		} else {
			_rowMetrics.splice(position, 0, metric);
		}

	}

	var offset = _rowDims.length;

	//Assign the dimension and the headers
	if (to == "column") {
		if (position === null) {
			_columnHeaders.push({
				id: metric,
				height: 38,
				type: "metric"
			});
		} else {
			_columnHeaders.splice(offset + position, 0, {
				id: metric,
				height: 38,
				type: "metric"
			});
		}
	} else {
		if (position === null) {
			_rowHeaders.push({
				id: metric,
				width: 120,
				type: "metric"
			});
		} else {
			_rowHeaders.splice(offset + position, 0, {
				id: metric,
				width: 120,
				type: "metric"
			});
		}
	}

	//auto filters
	var fact = (typeof metric == 'object' ? metric.id : metric).split(/[|.]/)[0];
	//if fact already in table
	for (var i in _columns) {
		if (i.indexOf(fact) == 0) {
			fact = '';
			break;
		}
	}
	var autoFilters = FieldsStore.getAutoFilters(fact);
	if (autoFilters) {
		for (var i = 0; i < autoFilters.length; i++) {
			ReportFilterStore.updateReportFilter(autoFilters[i]);
		}
	}

	//Modify the headers if needed
	//if (!_columns[metric]) {

	//load the column/row header data
	var facts = FieldsStore.getFieldFacts();

	var metricId = (typeof metric == 'string') ? metric : metric.id

	//Depending on the metric, we have to divide it up differently
	//to get down to the same pieces in the facts array
	//Example: f_webship_carrier_activation|count vs. f_webship.quote|sum
	if (metricId.indexOf(".") !== -1) {

		var labels = metricId.substring(2).split('.'); //Skip the "f_" then split the parent.child
		var parent = labels[0];
		var metricSplitOnPipe = metricId.split('|');

	} else {

		var labels = metricId.substring(2).split('|'); //Skip the "f_" then split the parent.child
		var parent = labels[0].replace(/_/g, " ");
		var metricSplitOnPipe = metricId.split('|');

	}

	var parentLabel = null;
	var childLabel = null;

	//Search through the selection overlay fields and find the corresponding labels for the metric
	for (var i = 0; i < facts.length; i++) {

		//FIRST look for parent label
		if (facts[i].label.toLowerCase() == parent.toLowerCase()) {
			parentLabel = facts[i].label;

			for (var j = 0; j < facts[i].metrics.length; j++) {

				//SECOND look for corresponding metric
				if (facts[i].metrics[j].id == metricSplitOnPipe[0]) {

					if (facts[i].metrics[j].calculations) {

						for (var k = 0; k < facts[i].metrics[j].calculations.length; k++) {

							//FINALLY, look for the correct calculation to get the proper child label
							if (facts[i].metrics[j].calculations[k].id == metricSplitOnPipe[1]) {
								childLabel = facts[i].metrics[j].calculations[k].label;
								break;
							}
						}
					}
					break;
				}
			}
			break;
		}
	}

	_columns[metric] = {
		id: metricId,
		label: childLabel,
		parent: parentLabel,
		type: "metric"
	};

	//}

}

function removeOtherMetrics(index) {
	if (index < _rowMetrics.length) {
		_rowMetrics = _rowMetrics.splice(index, 1);
	}
}

function removeMetric(from, metric, isUpdate) {

	//get the right metrics object
	if (from == "column") {
		var arr = _columnMetrics;
		var headers = _columnHeaders;
	} else {
		var arr = _rowMetrics;
		var headers = _rowHeaders;
	}

	//find and remove by index
	var index = $.inArray(metric, arr);

	if (index >= -1) {

		arr.splice(index, 1);

		for (var i = 0; i < headers.length; i++) {
			if (headers[i].id == metric) {
				headers.splice(i, 1);
				break;
			}
		}

		if (!isUpdate) {
			//if sort column is > index decrement by 1
			for (var i = _sortVars.length - 1; i >= 0; i--) {
				if (_sortVars[i].column == index + _rowDims.length) {
					delete(_sortVars[i]);
				} else if (_sortVars[i].column > index + _rowDims.length && _sortVars[i].column > 0) {
					_sortVars[i].column--;
				}
			}
		}
	}

	if (!isUpdate) {
		//reset if necessary
		if (arr.length == 0) {
			_columnDims = [];
			_rowDims = [];
			FieldsStore.deleteCommonDimensions();
		}
	}

	return index;
}

function updateColumnOrder(dimOrder, metricOrder) {
	/* really IS for columns */
	var newColumnDims = [];
	var newColumnMetrics = [];
	var newColumnHeaders = [];

	dimOrder.map(function (order, index) {
		for (var i = 0; i < _rowHeaders.length; i++) {
			if (i == order) {
				newColumnHeaders.push(_rowHeaders[i]);
			}
		}
		for (var i = 0; i < _rowDims.length; i++) {
			if (i == order) {
				newColumnDims.push(_rowDims[i]);
			}
		}
	});

	var offset = _rowDims.length;

	metricOrder.map(function (order, index) {
		for (var i = 0; i < _rowHeaders.length; i++) {
			if (i == order) {
				newColumnHeaders.push(_rowHeaders[i]);
			}
		}
		for (var i = 0; i < _rowMetrics.length; i++) {
			if (offset + i == order) {
				newColumnMetrics.push(_rowMetrics[i]);
			}
		}
	});

	_rowMetrics = newColumnMetrics;
	_rowDims = newColumnDims;
	_rowHeaders = $.extend(true, {}, newColumnHeaders);
}

function updateRowOrder(dimOrder, metricOrder) {
	/* really is for rows */
	var newRowDims = [];
	var newRowMetrics = [];
	var newRowHeaders = [];

	dimOrder.map(function (order, index) {
		for (var i = 0; i < _columnHeaders.length; i++) {
			if (i == order) {
				newRowHeaders.push(_columnHeaders[i]);
			}
		}
		for (var i = 0; i < _columnDims.length; i++) {
			if (i == order) {
				newRowDims.push(_columnDims[i]);
			}
		}
	});

	var offset = _columnDims.length;

	metricOrder.map(function (order, index) {
		for (var i = 0; i < _columnHeaders.length; i++) {
			if (i == order) {
				newRowHeaders.push(_columnHeaders[i]);
			}
		}
		for (var i = 0; i < _columnMetrics.length; i++) {
			if (offset + i == order) {
				newRowMetrics.push(_columnMetrics[i]);
			}
		}
	});

	_columnMetrics = newRowMetrics;
	_columnDims = newRowDims;
	_columnHeaders = $.extend(true, {}, newRowHeaders);
}

function swapSortContainer(from, type, id) {
	var sendingArray;
	//Find the correct objects to modify
	//Init calls to add the Id to the correct objects
	if (type == "dimension") {

		if (from == "column") {
			var sendingArray = _columnDims;
			addDimension("row", null, id);
			var headers = _columnHeaders;
		} else {

			//decrease sort
			for (var i = _sortVars.length - 1; i >= 0; i--) {
				if (_sortVars[i].column > 0) {
					_sortVars[i].column--;
				}
			}

			var sendingArray = _rowDims;
			addDimension("column", null, id, true);
			var headers = _rowHeaders;
		}

		//remove from the indexes
		var index = $.inArray(id, sendingArray);
		if (index >= -1) {
			sendingArray.splice(index, 1);
		}

		//remove from the headers
		for (var i = 0; i < headers.length; i++) {
			if (headers[i].id == id) {
				headers.splice(i, 1);
			}
		}

	} else { //metric

		if (from == "column") {

			//Remove the "Metrics" stub and add it to the other
			_rowHeaders.splice(_rowHeaders.length - 1, 1);
			_columnHeaders.push({
				type: "metrics",
				height: 38
			});

			//Send all the headers over and remove from it's origin
			for (var i = 0; i < _columnHeaders.length; i++) {
				if (_columnHeaders[i].type == "metric") {
					_rowHeaders.push({
						id: _columnHeaders[i].id,
						width: 120,
						type: "metric"
					});
					_columnHeaders.splice(i, 1);
					i--;
				}
			}

			addMetric("row", null, id);

		} else {

			//Remove the "Metrics" stub and add it to the other
			_columnHeaders.splice(_columnHeaders.length - 1, 1);
			_rowHeaders.push({
				type: "metrics",
				width: 120
			});

			//Send all the headers over and remove from it's origin
			for (var i = 0; i < _rowHeaders.length; i++) {
				if (_rowHeaders[i].type == "metric") {
					_columnHeaders.push({
						id: _rowHeaders[i].id,
						height: 38,
						type: "metric"
					});
					_rowHeaders.splice(i, 1);
					i--;
				}
			}

			addMetric("column", null, id);
		}

	}

}

function swapAllSortContainers() {
	var tempColumnDims = $.extend(true, [], _columnDims);
	var tempRowDims = $.extend(true, [], _rowDims);
	var tempColumnMetrics = $.extend(true, [], _columnMetrics);
	var tempRowMetrics = $.extend(true, [], _rowMetrics);

	_columnDims = tempRowDims;
	_rowDims = tempColumnDims;
	_columnMetrics = tempRowMetrics;
	_rowMetrics = tempColumnMetrics;
}

function swapDimsInSortContainers() {
	var tempColumnDims = $.extend(true, [], _columnDims);
	var tempRowDims = $.extend(true, [], _rowDims);

	_columnDims = tempRowDims;
	_rowDims = tempColumnDims;
}

function swapMetricsInSortContainers() {
	var tempColumnMetrics = $.extend(true, [], _columnMetrics);
	var tempRowMetrics = $.extend(true, [], _rowMetrics);

	_columnMetrics = tempRowMetrics;
	_rowMetrics = tempColumnMetrics;
}

function formatDataForExport(use_tabs, show_headers) {

	var separator = (use_tabs ? '\t' : '","');
	var quote = (use_tabs ? '' : '"');

	var forceRowFormat = false;
	var dataOffset = 0;
	var rowsResult = [];

	var column_or_row_metrics = [];
	var column_dimensions = [];
	var row_dimensions = [];

	//If the metrics are in the columnHeaders, running horizontally,
	//force the format for the whole row. It's easier. We search for
	//the "metrics" stub in the rowHeaders for simplicity while
	//incrementing the dataOffset

	_rowHeaders.map(function (column, i) {

		if (column.type != "metric") {
			//Increase the row offset for enforcing the format
			dataOffset++;

			//if the a column in the rowHeaders is "metrics", force the format for the whole row
			if (column.type == "metrics") {
				forceRowFormat = true;
			} else {
				column_dimensions.push(_columns[column.id].parent + '.' + _columns[column.id].label);
			}
		} else {
			column_or_row_metrics.push(_columns[column.id].parent + ' ' + _columns[column.id].label);
		}

	});

	_columnHeaders.map(function (row, i) {
		if (row.type != "metric") {
			if (row.type != "metrics") {
				row_dimensions.push(_columns[row.id].parent + '.' + _columns[row.id].label);
			}
		} else {
			column_or_row_metrics.push(_columns[row.id].parent + ' ' + _columns[row.id].label);
		}

	});

	if (show_headers) {

		rowsResult.push(column_or_row_metrics.join(' and ') + (column_dimensions.length > 0 ? ' BY: ' + column_dimensions.join(' and ') : '') + (column_dimensions.length > 0 && row_dimensions.length > 0 ? ' and' : '') + (row_dimensions.length > 0 ? ' BY: ' + row_dimensions.join(' and ') : ''));

		var row_2_filters = [];
		var filterData = ReportFilterStore.getReportFilters();

		for (var i = 0; i < filterData.length; i++) {
			row_2_filters.push(filterData[i].dimension + '.' + filterData[i].label + ' ' + (filterData[i].comparison || 'in') + ' ' + filterData[i].value.join(', '))
		}

		rowsResult.push(quote + 'Filtered By: ' + (row_2_filters.length > 0 ? row_2_filters.join(' and ') : '') + quote);

		rowsResult.push(quote + document.location.href.replace(/"/g, '"' + quote) + quote);

		rowsResult.push(' ');
	}

	//for each actual header row, build the csv row
	$.each(_headers, function (rowIndex, headerGroup) {

		//Headers
		//Don't let the starting row offset be less than zero
		var paddedOffset = dataOffset - 1;
		if (paddedOffset === -1) {
			paddedOffset = 0;
		}

		//Pad the left for each column header row
		var row = [];
		for (var i = 0; i < _rowHeaders.length; i++) {
			if (_rowHeaders[i].type == "metrics") {
				if (rowIndex == _headers.length - 1) {
					row.push("Metrics");
				} else {
					row.push("");
				}
			} else {
				if (_rowHeaders[i].type != "metric") {
					if (rowIndex == _headers.length - 1) {
						row.push(_columns[_rowHeaders[i].id].label);
					} else {
						row.push("");
					}
				}
			}
		}

		//Push the header values
		$.each(headerGroup, function (index, header) {
			if (header.type == "metric") {
				row.push(_columns[header.id].label);
			} else {
				if (header.span) {
					for (var i = 0; i < header.span; i++) {
						row.push(header.value);
					}
				} else {
					row.push(header.value);
				}
			}
		});

		//push on to rows
		rowsResult.push(quote + row.join(separator) + quote);
	});

	//This is where we actually build the rows of data, including the row headers
	return rowsResult.join("\n") + "\n" + _allRows.map(function (column, i) {
		return quote + column.join(separator) + quote;
	}).join("\n");
}