var numeral = require("numeral")

module.exports = {

	create: function(metric, metricData, chart, dashboardOptions, highchartSettings, totals) {
		var column = metricData.columns[metric.id]
		var tooltip = {}
		if (column.format == "money") {
			tooltip.valueDecimals = 0
			tooltip.valuePrefix = numeral.languageData().currency.symbol
		}

		if (metric.highcharts && metric.highcharts.type === "pie") {
			var data = []
			tooltip.headerFormat = '<span style="font-size: 10px">{series.name}</span><br/>'
			tooltip.pointFormat = '<span style="color:{point.color}">\u25CF</span> {point.name}: <b>{point.y}</b><br/>'
			var serie = $.extend(true, {
				name: metricData.columns[metric.id].label,
				data: data,
				tooltip: tooltip
			}, highchartSettings)

			for(let j = 0; j < metricData.mapping.length; j++) {
				if (metricData.mapping[j].id == metricData.metric.id) {
					var header = metricData.headers[0][metricData.headerMapping[0][j]]
					let name = ("value" in header) ? header.value || "N/A" : metricData.columns[header.id].label
					data.push({
						name: name,
						color: dashboardOptions.getColor(name),
						y: metricData.rows[0][j] ? metricData.rows[0][j] : 0
					})
					totals[name] += (parseFloat(metricData.rows[0][j]) || 0)
				}
			}
			return [serie]
		} else {
			var categories = chart.xAxis && chart.xAxis[0] && chart.xAxis[0].categories;
			var categoryMap = {}
			categories.forEach(function(cat,i) {
				categoryMap[cat] = i
			})
			var series = []

			for(let j = 0; j < metricData.mapping.length; j++) {
				if (metricData.mapping[j].id == metricData.metric.id) {
					var header = metricData.headers[0][metricData.headerMapping[0][j]];
					if (categories) {
						var data = Array.apply(null, Array(categories.length)).map(()=>{return null;})
					} else {
						var data = []
					}
					var name = ("value" in header) ? header.value || "N/A" : metricData.columns[header.id].label
					var serie = $.extend(true, {
						name: name,
						color: dashboardOptions.getColor(name),
						data: data,
						visible: dashboardOptions.isToggleOn(name),
						tooltip
					}, highchartSettings)

					for(let k = 0; k < metricData.rows.length; k++) {
						if (categories) {
							data[categoryMap[metricData.rows[k][0]]] = metricData.rows[k][j] ? metricData.rows[k][j] : 0
						} else {
							data.push({
								name: metricData.rows[k][0],
								y: metricData.rows[k][j] ? metricData.rows[k][j] : 0
							})
							totals[name] += (parseFloat(metricData.rows[k][j]) || 0)
						}
					}
					series.push(serie)
				}
			}
			return series
		}
	}
}
