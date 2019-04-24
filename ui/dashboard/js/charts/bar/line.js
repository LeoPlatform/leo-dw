var base = require("./base.js");

module.exports = function (element,spec, options, my) {
	my = my || {};
  
	var chart = {
		metrics: [],
		highcharts: {
			yAxis:[{opposite: false},{
				opposite: true
			}]
		}
	};
	chart.metrics[1] = {
		field: options.line,
		highcharts: {
			type: 'line',
			yAxis: 1
		}
	};
  
	var that = base(element,$.extend(true, chart, spec),options, my);
	return that;
};
