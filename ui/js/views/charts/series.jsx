var React = require('react');
var Editable = require('../common/Editable.jsx');
var ColumnSearch = require('../report/columnSearch.jsx');
var IdUtils = require('../../utils/IdUtils');
var ColumnBlock = require('../common/ColumnBlock.jsx');
var FieldsStore = require('../../stores/FieldsStore');
var SeriesAdvanced = require('../charts/seriesAdvanced.jsx');


module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		show_popup: React.PropTypes.func.isRequired,
	},


	getInitialState: function() {
		return {
			popup: false,
			metrics: this.props.metrics,
			showAdvanced: -1
		}
	},


	componentDidMount: function() {
		var thisComponent = this;
		$('.series-wrapper').on('click', '.series-chart, .series-label', function() {
			$(this).toggleClass('active');
			//$(this).closest('div').find('.series-chart').toggleClass('active');
		})
	},


	componentDidUpdate: function() {
		var thisComponent = this;
		$('.series-wrapper').sortable({
			items: '.series-block',
			handle: '.block-top',
			//connectWith: '.metrics-wrapper',
			axis: 'y',
			stop: function(event, ui) {
				var metrics = thisComponent.props.metrics
				var temp = []
				$(this).find('.series-block').each(function() {
					temp.push(thisComponent.props.metrics[$(this).data('metric_index')])
				})
				$('.series-wrapper').sortable('cancel').sortable('destroy')
				setTimeout(function() {
					thisComponent.props.updateSeries('reorder_metrics', null, temp)
				}, 50)
			}
		}).disableSelection();
	},

	/* pop ups */
	addSeries: function(e) {
		this.context.show_popup('add_series', e.currentTarget, 'up-right', { column_index:-1 } )
	},

	/*
	addMetric: function(series_index, e) {
		this.context.show_popup('add_metric_to_series', e.currentTarget, 'up-right', { column_index:-1 } )
	},
	*/


	seriesAdvanced: function(series_index) {
		if (this.state.showAdvanced == series_index) {
			this.setState({ showAdvanced: -1 })
		} else {
			this.setState({ showAdvanced: series_index })
		}
	},


	updateChartName: function(value) {
		this.props.applyAdvancedChanges({ title: { text: value || undefined } })
	},


	render: function() {

		var thisComponent = this
		var advanced = JSON.parse(JSON.stringify(this.props.advanced))

		if (this.props.sort) {
			advanced.sort = this.props.sort
		}

		return <div className="metric-wrapper flex-column">

			<div className="series-wrapper">

				<div>
					<div className="flex-row" style={{margin:'10px 12px',fontWeight:'bold'}}>
						<Editable className="flex-grow" onChange={this.updateChartName}>{advanced.title && advanced.title.text ? advanced.title.text : 'Chart title'}</Editable>
					</div>
				</div>

				{
					this.props.metrics.map(function(metric, metric_index) {
						metric = {
							id: metric.id,
							partitions: metric.partitions || [],
							highcharts: metric.highcharts || { type: 'area' }
						}
						var details = IdUtils.details(metric.id)
						if (details) {
							metric.label = details.label
							metric.parent = details.parent
						}
						return <div className="series-block" key={metric_index} data-metric_index={metric_index}>
					<div className="flex-row">
						<div className="series-chart">
							<i className={"icon-chart-"+metric.highcharts.type}></i>
							<div className="popup-menu arrow-up-left change-chart">
								<div className="mask"></div>
							{
								thisComponent.props.chartTypes.map(function(chart) {
									return <i key={chart} title={chart} className={"icon-button icon-chart-"+chart+( chart == metric.type ? ' active' : '')} onClick={thisComponent.props.updateSeries.bind(null, 'change_chart_type', metric_index, chart)}></i>
								})
							}
							</div>
						</div>
						<div className="series-label">
							<span title={metric.highcharts.type + ' chart'}>{metric.highcharts.type + ' chart'}</span>
						</div>
						<div className="series-icons pull-right">

							{/*<i className="icon-plus-circled" onClick={thisComponent.addMetric.bind(null, metric_index)}></i>*/}

							<i className={"icon-cog "+(thisComponent.state.showAdvanced == metric_index ? ' active' : '')} onClick={thisComponent.seriesAdvanced.bind(null, metric_index)}></i>

							<i className="icon-cancel" onClick={thisComponent.props.updateSeries.bind(null, 'remove_metric', metric_index)}></i>

						</div>
					</div>

					{
						thisComponent.state.showAdvanced === metric_index
						? <SeriesAdvanced defaults={{ metric_index: metric_index, metric: metric }} applyChanges={thisComponent.props.applyChanges} />
						: false

					}

					<div className="metrics-wrapper">
						<ColumnBlock key={metric_index + '-1'} type="metric" showPartition="true" column={metric} column_index={metric_index} metric_index={metric_index} updateColumn={thisComponent.props.updateColumn} />
					</div>
				</div>
					})
				}


			</div>

			<div className="flex-grow text-center metrics-wrapper new-series">
				<div className="add-button" onClick={this.addSeries}>
					<i className="icon-sprite-123"></i> Add Data
				</div>
			</div>

		</div>

	}

});
