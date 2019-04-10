var base = require("./base.js");
//var hs = require('../vendor/highslide/highslide-full.js');
var chartDetails = require('../views/chartDetails.js');

var dateSerie = require("./highcharts/serie/date.js");
var categorySerie = require("./highcharts/serie/category.js");

var Highcharts = require('highcharts');
var DataAction = require("../actions/data.js");

var OptionActions = require("../actions/options.js");

function parseDetailsString(string, leo) {
	return string
		.replace(/\$\{series\}/g, leo.series)
		.replace(/\$\{value\}/g, leo.value)
		.replace(/\$\{column\}/g, leo.column);
}


module.exports = function (element, chart, options, my) {
	my = my || {};

	if (chart.dimensions && chart.dimensions.length > 1) {
		chart.dimensions = [chart.dimensions[0]];
	}

	if (window.parent.dashboardFilters) {
		chart.filters = chart.filters.concat(
			window.parent.dashboardFilters.filter((dashboardFilter) => {
				return !chart.filters.some((filter) => {
					return dashboardFilter.id == filter.id;
				});
			})
		);
	}

	var that = base(element, chart, options, my),
		highcharts
	;

	that.init = function() {

		chart.startDownload = function() {
			DataAction.downloadData("export", null, my.dataSources[0]);
		};

		highcharts = $.extend(true, {}, {
			chart: {
				events: {
					redraw: function () {
						element.trigger('leo-redraw');
					},
					click: function(e) {
						var events = $._data(element.get(0), 'events');
						if (events && events['leo-chart-click']) {
							element.trigger("leo-chart-click", [e.chartX, e.chartY, this.plotBox, this.spacing, this.margin]);
						}
					}
				}
			},
			tooltip: {
				valueDecimals: 2
			},
			plotOptions: {
				series: {
					cursor: 'pointer',
					point: {
						events: {
							click: function (e) {
								if(this.series.type == "pie") {
									var leo = {
										series: this.name,
										value: this.y,
										column: this.series.name
									};
								} else {
									var leo = {
										series: this.series.name,
										value: this.y,
										column: this.category
									};
								}
								var events = $._data( element.get(0), 'events' );
								if (events && events['leo-click']) {
									element.trigger("leo-click", [leo,this,e]);
								} else if (events && events['leo-chart-click']) {
									element.trigger("leo-chart-click", [e.chartX, e.chartY, this.series.chart.plotBox, this.series.chart.spacing, this.series.chart.margin]);
								} else {

									var details = options.details || {};
									var headingHTML = details.title || '';

									if (details.tableView) {

										var params = details.tableView.data.params;

										if (params[0] && params[0] == '#') {
											params = encodeURIComponent(params.slice(1));
										} else {
											params = encodeURIComponent(JSON.stringify(params));
										}

										headingHTML += '<a class="leo-tableView icon-table" title="table view" data-params="'+params+'" data-user_clicked="'+encodeURIComponent(JSON.stringify(leo))+'"></a>';
									}

									if (details.addFilter) {
										var metricData = my.getMetric(0);

										var dataValue = parseDetailsString(details.addFilter.data.value, leo),
											checkboxes = {}
										;
										for(var i=0;i<metricData.headers[0].length;i++) {
											var value = metricData.headers[0][i].value;
											checkboxes[value] = (value == dataValue);
										}

										headingHTML += '<a class="leo-addFilter icon-filter" title="filter by" data-id="'+details.addFilter.data.id+'" data-value="'+details.addFilter.data.value+'" data-checkboxes="'+encodeURIComponent(JSON.stringify(checkboxes))+'" data-comparison="'+details.addFilter.data.comparison+'" data-label="'+details.addFilter.data.label+'"></a>';
									}

									chartDetails.htmlExpand(null, {
										pageOrigin: {
											x: e.pageX || e.clientX,
											y: e.pageY || e.clientY
										},
										headingText: parseDetailsString(headingHTML, leo),
										maincontentText: parseDetailsString(details.text || '', leo),
										width: parseInt(details.width),
										height: parseInt(details.height)
									});

								}
							}
						}
					}
				}
			},
			credits: {
				enabled: false
			},
			title: {
				text: options.title || null,
				margin: 5,
				style: {
					color: '#333',
					fontSize: 14
				}
			},
			yAxis: [{}],
			legend: {
				/*align: 'right',
				verticalAlign: 'top',
				layout: 'vertical',
				y: 30,
				padding: 2,
				margin: 4*/
			}
		}, that.highcharts);

	};

	that.init();

	that.build = function() {
		element.highcharts(highcharts);
		my.chart = element.highcharts();
		my.chart.showLoading();
	};

	that.build();


	that.setOptions = function(options) {
		Highcharts.setOptions(options);
	};


	that.showLoading = function() {
		my.chart.showLoading();
	};


	that.hideLoading = function() {
		my.chart.hideLoading();
	};


	that.toggleLegendItem = function(name, checked) {
		name = name.toLowerCase();
		for(var i = 0; i < my.chart.series.length; i++) {
			var series = my.chart.series[i];
			if (series.type == "pie") {
				for(var j = 0; j < series.data.length; j++) {
					var data = series.data[j];
					if (data.name.trim().toLowerCase() == name) {
						if (checked) {
							data.visible = true;
						} else {
							data.visible = false;
						}
						//            			series.update({data: data});
						break;
					}
				}
			} else {
				if (series.name.trim().toLowerCase() == name) {
					if (checked) {
						series.show();
					} else {
						series.hide();
					}
				}
			}
		}
	};


	that.reflow = function() {
		my.chart.reflow();
	};


	my.redraw = function() {

		if (my.dataSources.length > 0) {
			if (!('leo' in window)) {
				window.leo = {};
			}
			window.leo = $.extend(true, window.leo, {
				charts: {
					colors: {}
				}
			});

			Object.keys(my.dataSources[0].columns || {}).forEach((columnId) => {
				var column = my.dataSources[0].columns[columnId];
				if (column.color && typeof column.color == 'object') {
					window.leo.charts.colors = $.extend(window.leo.charts.colors, column.color);
				}
			});

			if (window.leo.defaultColors) {
				OptionActions.setDefaultColors('default', window.leo.defaultColors);
			}

			for(var color in window.leo.charts.colors) {
				OptionActions.setColor('default', color, window.leo.charts.colors[color]);
			}
		}

		var chart = my.chart;

		var isBar = false;
		var mustRebuild = (chart.series.length > 0 && that.metrics.length != chart.series.length);

		/*
			must rebuild if:
				is not blank and number is not equal (is one of them bar?)
				is blank and one of the metric types is bar
				one has changed (is one of them bar?)
		*/
		for(let i=0;i<that.metrics.length;i++) {
			if (that.metrics[i].highcharts && that.metrics[i].highcharts.type == 'bar') {
				isBar = true;
				if (chart.series.length == 0) {
					mustRebuild = true;
				}
			}
			if (!mustRebuild && chart.series[i] && that.metrics[i].highcharts.type != chart.series[i].type) {
				mustRebuild = true;
			}
		}

		if (mustRebuild) {
			chart.destroy();
			if (isBar) {
				highcharts.chart.type = 'bar';
			} else {
				delete(highcharts.chart.type);
			}
			element.highcharts(highcharts);
			my.chart = element.highcharts();
			chart = my.chart;
		}

		//update legend
		if (that.advanced && that.advanced.legend) {
			$.extend(chart.legend.options, that.advanced.legend);
		}

		//update title
		if (that.advanced && that.advanced.title) {
			chart.setTitle(that.advanced.title);
		}

		//update tooltip
		if (that.advanced && that.advanced.tooltip) {
			$.extend(chart.tooltip, that.advanced.tooltip);
		}

		//draw each metric as it's own series
		var seriesMap = [];
		for(let i = chart.series.length -1 ; i >= 0; i--) {
			chart.series[i].remove(false);
		}
		for(let i = chart.axes.length -1 ; i >= 0; i--) {
			if (chart.axes[i].isXAxis == false) {
				chart.axes[i].remove(false);
			}
		}

		that.metrics.forEach((metric, i) => {

			if (metric.highcharts && metric.highcharts.yAxis && !(metric.highcharts.yAxis in chart.yAxis)) {
				chart.addAxis({ opposite:true }, false, false);
			}

			var metricData = my.getMetric(i);

			if (metricData.rows && metricData.rows.length) {
				var yAxisIndex = (metric.highcharts && metric.highcharts.yAxis ? metric.highcharts.yAxis : 0);
				if (chart.yAxis && chart.yAxis[yAxisIndex]) {
					chart.yAxis[yAxisIndex].setTitle({text: metricData.columns[metric.id].label});
					if (metric.id.indexOf('|percent') != -1) {
						chart.yAxis[yAxisIndex].update({ labels: { format: '{value} %' }}, false);
					} else {
						chart.yAxis[yAxisIndex].update({ labels: { format: null }}, false);
					}
				}

				var partitionSort = (metric.highcharts && metric.highcharts.sort ? metric.highcharts.sort : { column: 0, direction: 'asc' });

				if (metric.highcharts) {
					delete metric.highcharts.sort;
				}

				var xAxisColumn = metricData.columns[metricData.mapping[0].id];
				var totals = {};
				if ((chart.xAxis[0].options.type != 'category') && !(metric.highcharts && metric.highcharts.type === "pie") && dateSerie.isDate(xAxisColumn)) {
					var series = dateSerie.create(metric, metricData, chart, my.dashboardOptions, that.metrics[i].highcharts, totals);
				} else {
					if (i === 0) {
						chart.xAxis[0].setCategories(metricData.rows.map(function(e) {
							return e[0];
						}));
					}
					var series = categorySerie.create(metric, metricData, chart, my.dashboardOptions, that.metrics[i].highcharts, totals);
				}

				//sort partitions
				if (partitionSort.column == 1) {
					series.sort(function(a, b) {
						return totals[a.name] - totals[b.name];
					});
				} else {
					//assuming already sorted by label
				}

				if (partitionSort.direction == 'desc') {
					series.reverse();
				}

				series.forEach(function(serie) {
					chart.addSeries(serie, false);
				});
			}
		});

		//Get rid of any serie that should no longer be there
		var removeSeries =[];
		for(var serie in seriesMap) {
			removeSeries.push(seriesMap[serie]);
		}
		//Gotta remove in reverse order
		removeSeries = removeSeries.sort();
		for(let i = removeSeries.length-1; i >= 0; i--) {
			try {
				chart.series[removeSeries[i]].remove( false );
			} catch(e){
				console.error("Error trying to remove", e);
			}
		}

		chart.redraw();
		chart.reflow();
	};


	return that;
};
