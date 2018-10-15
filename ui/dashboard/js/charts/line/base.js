var base = require("../highcharts.js");

module.exports = function (element,spec, options, my) {
	my = my || {};

	var that = base(element, $.extend(true, {
		columns: [options.column],
		metrics: [{
			field: options.metric,
			partitions: options.partitions.split(';')
		}],
		highcharts: {
			xAxis: {
				allowDecimals: false
			},
			chart: {
				type: 'line'
			},
			plotOptions: {
				column: {
					stacking: 'normal',
				}
			}
		}
	}, spec), options, my);

	return that;
};
