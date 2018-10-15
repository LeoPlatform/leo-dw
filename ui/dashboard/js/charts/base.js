var Data = require('../stores/data.js')();
var DashboardOptions = require('../stores/options.js')();
var parse_date = require("../../../../lib/parse_date.js").parse_date;
var ReactDom = require("react-dom");
var moment = require("moment");

var timeframes = {
	"hour": {
		id: "hour",
		columns: ["{d_date}.date", "{d_time}.hour24"],
		dimensions: {
			d_date: "d_date",
			d_time: "d_time"
		}
	},
	"day": {
		id: "day",
		columns: ["{d_date}.date"],
		dimensions: {
			d_date: "d_date",
			d_time: "d_time"
		}
	},
	"week": {
		id: "week",
		columns: ["{d_date}.week_ending_date"],
		dimensions: {
			d_date: "d_date",
			d_time: "d_time"
		}
	},
	"month": {
		id: "month",
		columns: ["{d_date}.year_month"],
		dimensions: {
			d_date: "d_date",
			d_time: "d_time"
		}
	},
	"quarter": {
		id: "quarter",
		columns: ["{d_date}.year_quarter"],
		dimensions: {
			d_date: "d_date",
			d_time: "d_time"
		}
	},
	"year": {
		id: "year",
		columns: ["{d_date}.year"],
		dimensions: {
			d_date: "d_date",
			d_time: "d_time"
		}
	}

};

function getComparisonMetrics(timeframe, metric, options) {

	const DATE_FORMAT = 'YYYY-MM-DD'

	var [metric, modifiers] = metric.split('|', 2);
	var asOfDate = options.asOf || moment();
	var timeLimit = (options.notime ? '' : `and ${timeframe.dimensions.d_time}._id<=@time(${asOfDate.format('HH:mm:ss')}`);

	var filter = {
		id: timeframe.dimensions.d_date + ".id",
		comparison: 'between',
		value: [],
        fromController:false
	};

	if (!timeframe.id && timeframe.value && typeof timeframe.value == 'object') {
		var count = 0

		if (timeframe.value.length == 1) {

			var s = timeframe.value[0].split(/[- +]+/)
			switch(s[0].toLowerCase()) {
				case 'this':
					count = 0
					timeframe.id = s[1]
				break

				case 'yesterday':
					timeframe.id = 'day'
					count = 1
				break

				case 'today':
					timeframe.id = 'day'
					count = 0
				break

				default:
					if (parseInt(s[1]) || s[1] == '0') {
						count = parseInt(s[1])
						timeframe.id = s[2]
					} else {
						count = 1
						timeframe.id = s[1]
					}
				break
			}

		} else {
			timeframe.id = 'day'
			count = -(moment(timeframe.value[0]).diff(timeframe.value[1], 'days')-1)
		}

		var parsedDate = parse_date(timeframe.value[0], asOfDate)
		if (typeof parsedDate == 'string') {
			parsedDate = [parsedDate]
		}
		var [currentStart, currentEnd] = parsedDate

		currentEnd = currentEnd || currentStart
		var prevStart = moment(currentStart, DATE_FORMAT).subtract(count, timeframe.id).format(DATE_FORMAT)
		var prevEnd = moment(currentEnd, DATE_FORMAT).subtract(count, timeframe.id).format(DATE_FORMAT)
		var todayLastPeriod = prevEnd

	} else {

		var [currentStart, currentEnd] = parse_date('last 0 ' + timeframe.id + ' to date', asOfDate)
		currentEnd = currentEnd || currentStart
		var [prevStart, prevEnd] = parse_date('last ' + timeframe.id, asOfDate)
		var todayLastPeriod = parse_date('today last ' + timeframe.id, asOfDate)[0]
	}

	filter.value = [prevStart, currentEnd]

	var metrics = [
		metric + `|filter:${timeframe.dimensions.d_date}._id between @date(${currentStart}) and @date(${currentEnd})|${modifiers}`,
		metric + `|filter:${timeframe.dimensions.d_date}._id >= @date(${prevStart}) and (${timeframe.dimensions.d_date}._id < @date(${todayLastPeriod}) or (${timeframe.dimensions.d_date}._id = @date(${todayLastPeriod}) ${timeLimit}))|${modifiers}`,
		metric + `|filter:${timeframe.dimensions.d_date}._id between @date(${prevStart}) and @date(${prevEnd})|${modifiers}`
	]

	return {
		filter: filter,
		metrics: metrics
	}
}

module.exports = function (element, chart, options, my) {

	var that = chart || {};

	that.guid = that.guid || Date.now() + Math.random()

	element.data('guid', that.guid)

	my = my || {};

	my.dashboardOptions = DashboardOptions;

	my.graphWatching = null;
	my.optiongroup = options['leo-option-group'] || 'default';

	that.refreshInterval = DashboardOptions.getGroup(my.optiongroup).refreshRate;

	my.context = {};
	element.empty();

	var chartId = chart.chart_id
		|| (chart.advanced && chart.advanced.chart_id ? chart.advanced.chart_id : undefined)
		|| (chart.advanced && chart.advanced.title
			? (typeof chart.advanced.title == 'string' ? chart.advanced.title : chart.advanced.title.text)
			: undefined
		)

	if (chartId) {
		element.prop('id', chartId.replace(/[ .:#]/gi, '_'))
	}

	if (chart.type) {
		element.addClass(chart.type)
	}

	var hasColumns = (that.columns && that.columns.length > 0);
	var optionsChange = function () {

		var optionsGroup = DashboardOptions.getGroup(my.optiongroup);
		my.timeframe = $.extend(true, {}, timeframes[optionsGroup.timebreakdown], {
			periods: 2,
			dimensions: {
				d_date: options.date || "d_date",
				d_time: options.time || "d_time"
			}
		});
		if (!hasColumns && my.timeframe.columns) {
			that.columns = my.timeframe.columns.map(function (col) {
				return col.replace("{d_date}", my.timeframe.dimensions.d_date).replace("{d_time}", my.timeframe.dimensions.d_time);
			});
		}

		var hasTimeFrame = false;
		for (var j = that.filters.length - 1; j >= 0; j--) {
			var filter = that.filters[j];
			if (filter.timeframe || filter.optionsGroup) {
				that.filters.splice(j, 1);
			} else if (filter.id.match(new RegExp('^' + my.timeframe.dimensions.d_date))) {
				hasTimeFrame = true;
			}
		}

		if (optionsGroup.timeframe && !hasTimeFrame) {
			let newFilter = {
				timeframe: true
			};
			newFilter.id = optionsGroup.timeframe.id.replace("{d_date}", my.timeframe.dimensions.d_date).replace("{d_time}", my.timeframe.dimensions.d_time);
			var values = optionsGroup.timeframe.value;
			if (typeof values == 'string') {
				values = [values];
			} else {
				newFilter.comparison = "between";
			}
			for (var i = 0; i < values.length; i++) {
				values[i] = values[i].replace("{d_date}", my.timeframe.dimensions.d_date).replace("{d_time}", my.timeframe.dimensions.d_time).replace("{periods}", my.timeframe.periods - 1);
			}
			newFilter.value = values;
			that.filters.push(newFilter);
		}
		for (let id in optionsGroup.filters) {
			let f = optionsGroup.filters[id];

			let newFilter = {
				optionsGroup: true
			};
			newFilter.id = f.id;
			newFilter.value = f.value;
            newFilter.isHidden = f.isHidden;

			that.filters.push(newFilter);
		}
		if (my.optionsChange) {
			my.optionsChange(that);
		}
	};

	DashboardOptions.on("change", function (groupId) {
		if (groupId === my.optiongroup) {
			optionsChange();
			my.graphWatching.stop();
			my.graphWatching = Data.watchGraph(that, function (dataSources) {
				my.dataSources = dataSources;
				var result = my.redraw();
				if (result) {
					ReactDom.render(result, element.get(0));
				}
				that.hideLoading();
			});
		}
	});

	DashboardOptions.on("togglechange", function (group, name, checked) {
		if (group == my.optiongroup) {
			that.toggleLegendItem(name, checked);
		}
	});

	DashboardOptions.on("togglelistchange", function (group, items) {
		if (group == my.optiongroup) {
			for (var i = 0; i < items.legendToggles.length; i++) {
				var toggle = items.legendToggles[i];
				//setTimeout(function() {
				that.toggleLegendItem(toggle.name, toggle.checked);
				//}, 1000)
			}
		}
	});

	that.showLoading = function () {
		element.append($('<div/>').addClass('leo-charts-loading').append('<span>Loading...</span>'));
	};

	that.hideLoading = function () {
		element.find('.leo-charts-loading').remove();
	};

	that.showNeedsFilter = function () {
		element.empty();
		element.append($('<div/>').addClass('leo-charts-loading').append('<span>Select a Filter to Load Data</span>'));
	};

	that.hideNeedsFilter = function () {
		element.find('.leo-charts-loading').remove();
	};

	that.toggleLegendItem = function (name, checked) {};

	that.refresh = function () {
		my.graphWatching.refresh();
	};

	that.start = function () {
		my.graphWatching = Data.watchGraph(that, function(dataSources) {
			my.dataSources = dataSources;
			var result = my.redraw();
			if (result) {
				ReactDom.render(result, element.get(0), function () {
					element.trigger("leo-after-render", [element]);
				});
			} else {
				element.trigger("leo-after-render", [element]);
			}
		});

		Data.on('loading', function (id) {
			if (id === my.graphWatching.id) {
				element.trigger("leo-loading");
				that.showLoading();
			}
		});
		Data.on('loaded', function (id) {
			if (id === my.graphWatching.id) {
				that.hideLoading();
				element.trigger("leo-complete");
			}
		});
		return that;
	};

	that.destroy = function (keepElement) {
		my.graphWatching.stop();
		DashboardOptions.off("change");
		DashboardOptions.off("togglechange");
		DashboardOptions.off("togglelistchange");
		if (keepElement) {
			element.empty();
		} else {
			element.remove();
		}
	};

	my.getComparisonMetrics = getComparisonMetrics

	my.getMetricValue = function (metricNumber) {
		var result = my.getMetric(metricNumber);
		if (!result.rows || !result.metricOffsets) {
			return undefined
		}
		return result.rows[0][result.metricOffsets[0]];
	};

	my.getMetric = that.getMetric = function (metricNumber) {
		var metric = that.metrics[metricNumber]

		if (typeof metric == 'string') {
			metric = {
				id: metric
			}
		}
		var metricName = metric.id
		var columns = metric.columns || that.columns || [];

		var partitions = metric.partitions || metric.colors || []
		var filters = metric.filters || [];

		for (var i in my.dataSources) {
			var dataSource = my.dataSources[i];

			if (!dataSource.error) {
				var hasCorrectGroupings = (
					dataSource.groups.toString() === columns.toString() &&
					dataSource.partitions.toString() === partitions.toString()
					/* &&
										dataSource.filters.toString() === filters.toString()*/
				);
				if (!hasCorrectGroupings) {
					continue;
				}

				var offset = 0;
				for (let j = 0; j < (dataSource.columnheaders || []).length; j++) {
					if (dataSource.columnheaders[j].type !== "metric") {
						offset++;
					}
				}

				var metricOffsets = [];
				for (let j = 0; j < (dataSource.mapping || []).length; j++) {
					if (dataSource.mapping[j].id == metric.id) {
						metricOffsets.push(j);
					}
				}
				if (!metricOffsets.length) {
					continue;
				}

				return {
					metric: metric,
					rows: dataSource.rows || [],
					columns: dataSource.columns || {},
					columnheaders: dataSource.columnheaders || [],
					headers: dataSource.headers || [],
					mapping: dataSource.mapping || [],
					headerMapping: dataSource.headerMapping || [],
					metricOffsets: metricOffsets
				};
			} else {
				return {};
			}
		}
		return {};
	};

	function render() {
		my.graphWatching.stop();
		my.graphWatching = Data.watchGraph(that, function(dataSources) {
			my.dataSources = dataSources;
			element.trigger("leo-before-render");
			var result = my.redraw();
			if (result) {
				ReactDom.render(result, element.get(0), function () {
					element.trigger("leo-after-render", [element]);
				});
			} else {
				element.trigger("leo-after-render", [element]);
			}
			that.hideLoading();
		});
	}

	my.redraw = function () {};

	my.changeChart = that.changeChart = function(newParams, replace, keepFilters) {

		my.graphWatching.stop()
		if (replace) {
			that.columns = []
			if (!keepFilters) {
				that.filters = []
			}
			that.metrics = []
		}
		that.outColumns = [] // NEW - THIS LINE FIXES THE ISSUE WITH DUPLICATING COLUMNS
		if (newParams.sort) {
			that.sort = []
		}
		that = $.extend(true, that, newParams)
		render()
	}

	my.setFilter = function(filter, redraw = true) {

		/* DO NOT USE: this keeps page filters from working
        var existing = that.filters.filter(f=>f.id == filter.id)[0];
        if (existing && existing.fromController === false && filter.fromController === true) {
            return;
        }
		/* */

		that.filters = that.filters.filter(f => (f.id != filter.id))
		that.filters.push({
			id: filter.id,
			value: filter.value,
			comparison: filter.comparison || '=',
			fromController: filter.fromController || false
		})

		if (filter.id.slice(-9) == 'd_date.id') {
			my.updateTimeframe && my.updateTimeframe(that, filter)
		}

		if (redraw && my.graphWatching) {
			render()
		}
	};

	element.data('leo', {
		setFilter: my.setFilter,
		changeChart: my.changeChart,
		removeFilter: function (filterId) {
			that.filters = that.filters.filter(function (f) {
				if (f.id != filterId) {
					return f;
				}
			});
			render();
		}
	});

	optionsChange();
	return that;
};
