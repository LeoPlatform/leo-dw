var ReportActions = require('../actions/ReportActions');
var ReportStore = require('../stores/ReportStore');

var ReportFilterActions = require('../actions/ReportFilterActions');
var ReportFilterStore = require('../stores/ReportFilterStore');

module.exports = {

	createLinkToReport: function () {
		return window.location.protocol + '//' + window.location.host + '/builder#' + this.serialize();
	},

	updateWindowHash: function () {
		window.location.hash = this.serialize();
	},

	serialize: function () {
		//CALL ALL STORES AND SERIALIZE
		return JSON.stringify({
			chart_id: ReportStore.getChartId(),
			partitions: ReportStore.getPartitions(),
			dimensions: ReportStore.getDimensions(),
			metrics: ReportStore.getMetrics(),
			locked: ReportStore.getLockedStatus(),
			filters: ReportFilterStore.getReportFilters(),
			sort: ReportStore.getSort(),
			top: ReportStore.getTopLimit(),
			advanced: ReportStore.getAdvanced(),
			useMysql: !window.useredshift
		});
	},

	deSerialize: function () {
		//DESERIALIZE AND DISPATCH TO THE APPROPRIATE STORE
		var input = {};
		if (window.location.hash) {
			try {
				var input = JSON.parse(decodeURI(window.location.hash.slice(1)));
				window.hasHash = true;
			} catch (e) {
				try {
					var input = JSON.parse(window.location.hash.slice(1));
					window.hasHash = true;
				} catch (e) {
					window.messageLogNotify('Invalid request', 'warning', e)
					var input = {}
				}
			}
		}

		var inputFilters = input.filters || []

		input = {
			pivots: input.pivots,
			pivotDefaults: input.pivotDefaults,
			columnDims: input.columnDims || input.partitions || [],
			//columnMetrics: input.columnMetrics || [],
			rowDims: input.rowDims || input.dimensions || [],
			rowMetrics: input.rowMetrics || input.columnMetrics || input.metrics || [],
			locked: input.locked || false,
			sort: input.sort || [],
			top: input.top,
			advanced: input.advanced || undefined,
			useMysql: input.useMysql
		}

		if (input.columnDims.length == 0) {
			var partitions = false
			var setAsReportPartition = true
			input.rowMetrics.forEach((metric) => {
				if (!partitions) {
					partitions = metric.partitions
				}
				if (!metric.partitions || (JSON.stringify(partitions) != JSON.stringify(metric.partitions))) {
					setAsReportPartition = false
				}
			})
			if (setAsReportPartition) {
				input.columnDims = partitions
				input.rowMetrics.map((metric) => {
					delete metric.partitions
					return metric
				})
			}
		}

		ReportActions.initReport(input)

		if (input.useMysql) {
			window.useredshift = false
		} else {
			window.useredshift = true
		}

		ReportFilterActions.initReportFilters(inputFilters)
	}

};