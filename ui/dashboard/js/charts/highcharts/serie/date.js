var moment = require("moment");
var numeral = require("numeral");

module.exports = {
	matches: {
		'\\.year$': {
			format: 'YYYY',
			highcharts: {
				type: 'datetime'
			}
		},
		'\\.year_month$': {
			format: 'YYYY MMMM',
			highcharts: {
				type: 'datetime'
			}
		},
		'\\.date$':{
			format: 'YYYY-MM-DD',
			highcharts: {
				type: 'datetime',
				//					tickInterval: moment.duration(1, 'day').asMilliseconds()
			}
		},
		'd_date\\.id$':{
			format: 'YYYY-MM-DD',
			highcharts: {
				type: 'datetime',
				//					tickInterval: moment.duration(1, 'day').asMilliseconds()
			}
		},
		'\\.week_ending_date$':{
			format: 'YYYY-MM-DD',
			highcharts: {
				type: 'datetime',
				//					tickInterval: moment.duration(1, 'week').asMilliseconds(),
				startOfWeek: 6,
			}
		}
	},

	isDate: function(column) {
		for(var match in this.matches) {
			var regEx = new RegExp(match);
			if(column.id.match(regEx)) {
				return this.matches[match];
			}
		}
		return false;
	},

	create: function(metric, metricData, chart, dashboardOptions, highchartSettings, totals) {
		var column = metricData.columns[metric.id];
		var tooltip = {};
		if (column.format == "money") {
			tooltip.valueDecimals = 0;
			tooltip.valuePrefix = numeral.languageData().currency.symbol;
		}

		var dateType = this.isDate(metricData.columns[metricData.mapping[0].id]);
		var series = [];

		for(let j = 0; j < metricData.mapping.length; j++) {
			if (metricData.mapping[j].id == metricData.metric.id) {
				var header = metricData.headers[0][metricData.headerMapping[0][j]];
				var data = [];
				var name = ("value" in header) ? header.value || "N/A" : metricData.columns[header.id].label;
				var serie = $.extend(true, {
					name: name,
					color: dashboardOptions.getColor(name),
					data: data,
					visible: dashboardOptions.isToggleOn(name),
					tooltip: tooltip
				}, highchartSettings);

				totals[name] = 0;

				for(let k = 0; k < metricData.rows.length; k++) {
					var timestamp = moment(metricData.rows[k][0],dateType.format).valueOf();
					if (!isNaN(timestamp)) {
						data.push([
							timestamp,
							metricData.rows[k][j] ? metricData.rows[k][j] : 0
						]);
						totals[name] += (metricData.rows[k][j] || 0);
					}
				}

				data = data.sort(function(a, b) {
					return a[0] - b[0];
				});

				chart.xAxis[0].update(dateType.highcharts);
				series.push(serie);
			}
		}

		return series;
	}
};
