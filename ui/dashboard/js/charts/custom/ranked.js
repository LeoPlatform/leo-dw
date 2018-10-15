var base = require("../base.js")
var React = require("react")
var DataAction = require("../../actions/data.js")


module.exports = function (element, spec, options, my) {

	if (spec.select) {
		options.select = spec.select;
	} else {
		var select = {
			options: []
		}
		var metrics = [];
		spec.metrics.map(function(metric) {
			if (metric.default) {
				metrics.unshift({
					id: metric.id || metric.field,
					partitions: metric.partitions || undefined
				})
			} else {
				metrics.push({
					id: metric.id || metric.field,
					partitions: metric.partitions || undefined
				})
			}
			if (metric.label) {
				select.options.push({
					text: metric.label,
					value: metric.id || metric.field,
					partitions: metric.partitions || undefined
				})
				if (!select.defaultValue || metric.default) {
					select.defaultValue = metric.id || metric.field
				}
			}
		})
		if (select.options.length != 0) {
			options.select = select
		}
		spec.metrics = metrics;
	}

	if (spec.sort) {
		options.sorts = spec.sort
	} else {
		options.sorts = spec.sort = [{
			column: 1,
			direction: 'desc'
		}]
	}

	options = JSON.parse(JSON.stringify(options))

	metrics.map((metric, index) => {
		if (!select.defaultValue && metric.id == select.defaultValue) {
			options.select.defaultIndex = index
		}
	})

	if (!spec.controller) {
		element.removeClass('is-controller')
		element.removeClass('is-not-controller')
		element.removeAttr('data-controller-selector')
	} else if (spec.controller && spec.controller.enabled === true) {
		element.addClass('is-controller')
		element.removeClass('is-not-controller')
		element.attr('data-controller-selector', spec.controller.selector)
	} else {
		element.removeClass('is-controller')
		element.addClass('is-not-controller')
		element.removeAttr('data-controller-selector')
	}

	my = my || {};

	spec.columns = spec.dimensions || spec.columns

	var that = base(element, spec, options, my)

	spec.startDownload = function() {
		DataAction.downloadData("export", null, my.dataSources[0])
	}

	my.redraw = function() {
		var data = my.getMetric(0)
			,metricOffset = data.metricOffsets[0]
			,column = data.mapping[data.metricOffsets[0]]
			,compareValue = Math.max.apply(Math, data.rows.map((row) => {
				var rowTotal = 0
				data.metricOffsets.forEach((offset) => {
					rowTotal += row[offset]
				})
				row.push(rowTotal)
				return rowTotal
			}))

		if (spec.sort[0] && spec.sort[0].column != 0) {
			data.rows.sort((a,b) => {
				var column = a.length-1
				if (spec.sort[0].direction == 'asc') {
					if (a[column] < b[column]) {
						return -1
					}
					if (a[column] > b[column]) {
						return 1
					}
				} else {
					if (a[column] > b[column]) {
						return -1
					}
					if (a[column] < b[column]) {
						return 1
					}
				}
				return 0
			})
		}

		var colors = my.dashboardOptions.getDefaultColors()

		var dimensionColors = ((typeof window.leo != 'undefined' && window.leo.charts && window.leo.charts.colors)
			? window.leo.charts.colors
			: {}
		)

		return (<div className="leo-ranked-chart" data-column_id={spec.columns[0]}>

			<div>
				{
					options.select
					? <select defaultValue={options.select.defaultIndex} className={options.select.options.length < 2 ? 'disabled' : ''} onChange={ (e) => {
							my.changeChart({
								metrics: [
									{
										id: options.select.options[e.currentTarget.value].value,
										partitions: options.select.options[e.currentTarget.value].partitions
									}
								],
								sort: [(options.sorts[e.currentTarget.selectedIndex || 0]) || ({ column: 1, direction: 'desc' })]
							})
						}}>
						{
							options.select.options.map(function(option, index) {
								return <option key={index} value={index}>{option.text}</option>
							})
						}
					</select>
					: false
				}
			</div>
			<div className="table-wrapper">
				<table>
					<tbody>
					{
						data.rows.map((row, i) => {
							var label = row[0] ? row[0].toString().trim() : '\u00a0' //non-breaking space
							var value = row[row.length-1]
							var percentage = (compareValue == 0 ? 0 : (value/compareValue))
							return (<tr key={label} onClick={(e) => {
									var target = $(e.currentTarget);
									if (target.is(".active")) {
										target.removeClass("active");
										element.trigger('leo-click', [{active: false, series: row[0], value: value}]);
									} else {
										target.addClass('active').siblings().removeClass('active');
										element.trigger('leo-click', [{active: true, series: row[0], value: value}]);
									}
								}}>
								<td>
									<div>
										<span className={percentage < 0 ? 'negative': ''} style={{ width: Math.abs(percentage * 100) + "%" }}>
											<label>{label}</label>
											{
												data.metricOffsets.map((offset, index) => {
													var title = data.headers[0][index].value ? (data.headers[0][index].value + ': ' + column.formatter(row[offset])) : ''
													var width = Math.abs( (row[offset] / row[row.length-1]) *100) + '%'
													var background = dimensionColors[data.headers[0][index].value] || colors[index % colors.length]
													return (<b key={index} title={title} style={{ width: width, background: background}}>&nbsp;</b>)
												})
											}
										</span>
									</div>
								</td>
								<td>
									<div className="gray-zero">{column.formatter(value) || ''}</div>
								</td>
							</tr>)
						})
					}
					</tbody>
				</table>
			</div>
		</div>)
	};
	return that;
};
