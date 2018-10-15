var base = require("../highcharts.js");
var Highcharts = require('highcharts');
var moment = require("moment");

module.exports = function (element,spec, options, my) {
	my = my || {};

	my.options = $.extend(true, {}, {
		ratios: {
			goal: 0.2,
			warning: -0.2
		}
	}, options);

	var timeframe = spec.timeframe;
	var asOf = moment(spec.asof);

	var metric = spec.metric;
	delete spec.metric;
	my.optionsChange = function(that) {
		that.columns = [];
		if (timeframe) {
			my.timeframe.id = timeframe;
		}
		var comparison = my.getComparisonMetrics(my.timeframe, metric, {
			notime: options.notime||(!spec.useTime),
			asOf: asOf
		});
		
		that.metrics = comparison.metrics;

		var skipSetFilter = false
		that.filters.forEach(function(filter) {
			if (filter.id == comparison.filter.id) {
				skipSetFilter = true;
			}
		})

		if (!skipSetFilter) {
			my.setFilter(comparison.filter, false);
		}
	};

	var that = base(element, $.extend(true, {
		filters: [],
		highcharts: {
			chart: {
				type: 'solidgauge',
			},
			pane: {
				center: ['50%', '85%'],
				size: parseInt(element.width() * 0.9),
				startAngle: -90,
				endAngle: 90,
				background: {
					backgroundColor: 'transparent',
					innerRadius: '60%',
					outerRadius: '100%',
					shape: 'arc'
				}
			},
			yAxis: {
				lineWidth: 0,
				minorTickInterval: null,
				tickWidth: 0
			},
			plotOptions: {
				solidgauge: {
					dataLabels: {
						y: 5,
						borderWidth: 0,
						useHTML: true
					}
				}
			},
			tooltip: {
				enabled: false
			},
			title: null,
			series: [
				{
					name: '',
					data: [],
					color: '#55BF3B',
					dataLabels: {
						format: '<div></div>'
					}
				}
			]
		}
	}, spec), options, my);


	my.redraw = function() {
		var chart = my.chart;

		var current = parseFloat(my.getMetricValue(0));
		var prevCompare = parseFloat(my.getMetricValue(1));
		var prev = parseFloat(my.getMetricValue(2));

		chart.series[0].yAxis.removePlotBand("lower",false);
		chart.series[0].yAxis.removePlotBand("met",false);
		chart.series[0].yAxis.removePlotBand("goal",false);

		var lower = prevCompare * (1 + my.options.ratios.warning);
		var met = prevCompare;
		var goal = prevCompare * (1 + my.options.ratios.goal);

		chart.series[0].yAxis.setExtremes(0, goal, false);
		chart.series[0].yAxis.addPlotBand({
			id: "lower",
			color: 'red',
			from: 0,
			to: lower
		},false);

		chart.series[0].yAxis.addPlotBand({
			id: "met",
			color: '#DDDF0D',
			from: lower,
			to: met
		},false);

		chart.series[0].yAxis.addPlotBand({
			id: "goal",
			color: '#55BF3B',
			from: met,
			to: goal
		},false);

		chart.series[0].setData([current],false);

		if (!spec.label) {
			var column = my.dataSources[0].columns[that.metrics[0]];
			spec.label = column.parent + " " + column.label;
		}

		if (!spec.prior) {
			spec.prior = {};
		}

		if (spec.prior && !spec.prior.title) {
			spec.prior.title = 'Prior Period';
		}

		chart.series[0].update({
			dataLabels: {
				format: '<div style="text-align:center;margin-top:-40%;">'+
					'<div style="line-height:1em;font-size:25px;color:' + ((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">{y:,2f}</div>' +
					'<div style="font-size:16px;color:silver">' + spec.label + '</div>'+
					'<div style="font-size:12px;color:silver;">' + spec.prior.title + ': <span style="color: ' + ((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">'+Highcharts.numberFormat(prevCompare,2)+'</span></div> ' +
				'</div>'
				}
			}
		);

		 chart.redraw();
	};

	return that;
};
