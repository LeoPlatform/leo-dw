var base = require("../highcharts.js");

module.exports = function (element,spec, options, my) {
	my = my || {};
	var that = base(element,$.extend(true, {
		columns: [options.column],
		metrics: [{
			field: options.metric,
			partitions: options.partitions.split(';')
		}],
		highcharts: {
			chart: {
				type: 'column'
			},
			plotOptions: {
				column: {
					stacking: options.stack===true?'normal':null
				}
			}
		}
	}, spec), options, my);

	return that;
};
