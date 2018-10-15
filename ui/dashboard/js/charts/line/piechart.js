var base = require("./base.js");

module.exports = function (element,spec, options, my) {
	my = my || {};

	var chart = {
		metrics: [],
		highcharts: {
			yAxis:[{opposite: false},{
				opposite: true
			}],
		}
	};
	var piechartWidth = element.width()/5;
	chart.metrics[1] = {
		field: options.pie,
		partitions: options.partitions.split(';'),
		highcharts: {
			type: 'pie',
			yAxis: 1,
			center: [piechartWidth/3, piechartWidth/3],
			size: piechartWidth,
			showInLegend: false,
			dataLabels: {
				enabled: false
			}
		}
	};

	var that = base(element,$.extend(true, chart, spec),options, my);
	return that;
};
