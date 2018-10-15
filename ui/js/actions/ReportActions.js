var WebAPI = require('../utils/WebAPI');
var LeoDispatcher = require('../dispatcher/LeoDispatcher');
var LeoConstants = require('../constants/LeoConstants');
var ActionTypes = LeoConstants.ActionTypes;
var ReportUtils = require('../utils/ReportUtils');
var ReportStore = require('../stores/ReportStore');
var ReportFilterStore = require('../stores/ReportFilterStore');

module.exports = {

	initReport: function(reportData) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.INIT_REPORT,
			reportData: reportData
		});

	},

	repivot: function() {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.REPORT_LOADING
		});

		var columnMetrics = []
		var columnDims = ReportStore.getPartitions();
		var rowMetrics = ReportStore.getMetrics();
		var rowDims = ReportStore.getDimensions();
		var reportFilters = ReportFilterStore.getReportFilters();
		var sort = ReportStore.getSort();
		var top = ReportStore.getTopLimit()

		if (columnMetrics.length || rowMetrics.length) {

			var columns = columnDims.concat(columnMetrics);
			var rows = rowDims.concat(rowMetrics);

			var dimensions = columnDims.concat(rowDims);

			var apiData = ReportUtils.buildApiData(columns, rows, reportFilters, sort, dimensions, top);
			apiData.showMissingDims = ReportStore.getShowMissingDims();
			WebAPI.post("report", apiData, function(result) {

				//metric partition fix
				if (result.columnheaders) {
					var metricPartitions = []
					result.columnheaders = result.columnheaders.reduce(function(columnheaders, columnheader) {
						if (columnheader.id.indexOf('!') !== -1) {
							var metricPartition = columnheader.id.split('!')[0]
							if (metricPartitions.indexOf(metricPartition) === -1) {
								metricPartitions.push(metricPartition)
								rows.forEach((row) => {
									if (typeof row == 'object') {
										if (row.id == metricPartition) {
											result.columns[metricPartition] = $.extend({}, result.columns[columnheader.id], row)
											columnheader.partitions = row.partitions
										}
									}
								})
								columnheader.id = metricPartition
								columnheaders.push(columnheader)
							}
						} else {
							columnheaders.push(columnheader)
						}
						return columnheaders
					}, [])
				}
				//console.log('result', result)
				/* */

				if (result.filters && result.filters.length < reportFilters.length) {
					result.filters = reportFilters.map(function(filter) {
						for(var i=0;i<result.filters.length;i++) {
							if (filter.id == result.filters[i].id) {
								return result.filters[i];
							}
						}
						return filter
					});
				}

				if (Object.keys(result).length == 0) {
					result.error = 'An unknown error occurred'
				}

				LeoDispatcher.handleViewAction({
					type: ActionTypes.REPORT_LOADED,
					reportData: result
				});

				LeoDispatcher.handleViewAction({
					type: ActionTypes.INIT_REPORT_FILTERS,
					reportFilters: result.filters
				});

			});

		} else {

			LeoDispatcher.handleViewAction({
				type: ActionTypes.REPORT_LOADED,
				reportData: {}
			});

		}
	},

	repivotWithDelay: function() {
		var thisActionCreator = this;
		setTimeout(function() {
			thisActionCreator.repivot();
		}, 50);
	},


	updateColumnByIndex: function(column_type, from, id, replace, remove_type) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.UPDATE_COLUMN_BY_INDEX,
			column_type: column_type,
			from: from,
			id: id,
			replace: replace,
			remove_type: remove_type
		});
	},


	removeColumnByIndex: function(from, index) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.REMOVE_COLUMN_BY_INDEX,
			from: from,
			index: index,
		});
	},


	updateColumn: function(column_type, from, id, replace) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.UPDATE_COLUMN,
			column_type: column_type,
			from: from,
			id: id,
			replace: replace
		});

	},

	addDimension: function(to, position, dimension) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.ADD_DIMENSION,
			to: to,
			position: position,
			dimension: dimension
		});

	},

	removeDimension: function(from, dimension) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.REMOVE_DIMENSION,
			from: from,
			dimension: dimension
		});

	},

	addMetric: function(to, position, metric) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.ADD_METRIC,
			to: to,
			position: position,
			metric: metric
		});

	},

	removeMetric: function(from, metric) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.REMOVE_METRIC,
			from: from,
			metric: metric
		});

	},


	removeOtherMetrics: function(index) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.REMOVE_OTHER_METRICS,
			index: index
		});

	},


	updateRowOrder: function(dimOrder, metricOrder) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.UPDATE_ROW_ORDER,
			dimOrder: dimOrder,
			metricOrder: metricOrder
		});

	},


	updateColumnOrder: function(dimOrder, metricOrder) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.UPDATE_COLUMN_ORDER,
			dimOrder: dimOrder,
			metricOrder: metricOrder
		});

	},


	swapSortContainer: function(from, type, id) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.SWAP_SORT_CONTAINER,
			from: from,
			tabType: type,
			id: id
		});

	},

	swapDimsInSortContainers: function() {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.SWAP_DIMS_IN_SORT_CONTAINERS
		});

	},

	swapMetricsInSortContainers: function() {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.SWAP_METRICS_IN_SORT_CONTAINERS
		});

	},

	swapAllSortContainers: function() {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.SWAP_ALL_SORT_CONTAINERS
		});

	},


	updateLimit : function(limitAmount) {

		LeoDispatcher.handleViewAction({
			type : ActionTypes.UPDATE_LIMIT,
			limitAmount : limitAmount
		});

	},


	sort: function(column, order) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.SORT,
			column: column,
			order: order
		});

	}

}
