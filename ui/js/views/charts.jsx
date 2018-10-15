var React = require('react');

var credentials = require('../credentials.js');

window.apiEndpoint = credentials.apiEndpoint;
window.apiKey = credentials.apiKey;
window.liveVersion = credentials.liveVersion;

var Filters = require('./report/filters.jsx');
var ColumnSearch = require('./report/columnSearch.jsx');
var FieldsActions = require('../actions/FieldsActions');
var FieldsStore = require('../stores/FieldsStore');
var ToolDock = require('./report/toolDock.jsx');
var Aggregates = require('./report/aggregates.jsx');
var MetricFiltering = require('./report/metricFiltering.jsx');
var Editable = require('./common/Editable.jsx');
var Series = require('./charts/series.jsx');
var IdUtils = require('./../utils/IdUtils');
var AdvancedDialog = require('./report/dialogs/AdvancedDialog.jsx')
var ColumnBlock = require('./common/ColumnBlock.jsx');
var ReportFilterActions = require('../actions/ReportFilterActions');
var Chart = require("../../dashboard/js/charts/highcharts.js");

var ReportLibrary = require('./common/ReportLibrary.jsx')
var PortalList = require('./portals/portalList.jsx')
var ReportStore = require('../stores/ReportStore.js')

var Header = require('./header.jsx')

var SelectData = require('./report/SelectData.jsx');


var myChart = '';

module.exports = React.createClass({

	chartTypes: [
		'area',
		'bar',
		'column',
		//'gauge',
		'line',
		'pie'
	],


	childContextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired,

		show_popup: React.PropTypes.func.isRequired,
		close_popup: React.PropTypes.func.isRequired,

		sendToPivot: React.PropTypes.func.isRequired,

		toggle_select_data: React.PropTypes.func.isRequired,

		field_selected: React.PropTypes.func,

		edit_column: React.PropTypes.func
	},


	getChildContext: function() {
		return {
			show_dialog: this.showDialog,
			close_dialog: this.closeDialog,

			show_popup: this.popupShow,
			close_popup: this.closePopup,

			toggle_select_data: this.toggleSelectData,

			field_selected: this.field_selected,

			//edit_column: this.editColumn,

			sendToPivot: (args) => {
				if (args.type == 'metric') {
					var details = IdUtils.details(args.id)
						, arg = (details.column == 'id')
							? {
								id: details.parent.id,
								label: details.parent.label + ' Count',
								parent: {
									id: details.parent.id,
									label: details.parent.label
								},
								type: 'fact'
							}
							: details
					this.popUpSave('add_series', arg, [], 'area')
				} else {
					this.popUpSave('update_chart_dimension', IdUtils.details(args.id), [], 'area')
				}
			}
		};
	},


	showDialog: function(which, defaults, e) {
		if (e) {
			e.stopPropagation();
		}

		var thisComponent = this;
		if (this.state.dialog) {
			this.setState({ dialog: false });
		}
		setTimeout(function() {
			thisComponent.setState({ dialog: which, dialogDefaults: defaults });
		}, 1)
	},


	closeDialog: function() {
		this.setState({ dialog: false });
	},


	toggleSelectData: function(open) {
		this.setState({selectDataExpanded: open}, () => {
			$(window).resize()
		})
	},


	field_selected: function(selected_field) {
		selected_field._sent = new Date().valueOf();
		this.setState({
			selected_field: selected_field
		});
	},


	_serialize: function() {
		if (this.state.dimensions.length == 0 && this.state.metrics.length == 0  && this.state.filters.length == 0) {
			return ''
		}

		var settings = {
			chart_id: this.state.chart_id || undefined,
			dimensions: this.state.dimensions,
			metrics: this.state.metrics,
			filters: this.state.filters,
			sort: this.state.sort
		}
		if (Object.keys(this.state.advanced).length != 0) {
			settings.advanced = this.state.advanced;
		}
		return JSON.stringify(settings)
	},


	buildGraph: function(oneDimension) {
		var graph = {
			dimensions: this.state.dimensions || [],
			metrics: this.state.metrics || [],
			filters: this.state.filters || [],
			sort: this.state.sort || undefined,
			advanced: this.state.advanced || []
		}

		if (window.parent.dashboardFilters) {
			graph.filters = graph.filters.concat(
				window.parent.dashboardFilters.filter((dashboardFilter) => {
					return !graph.filters.some((filter) => {
						return dashboardFilter.id == filter.id
					})
				})
			)
		}

		if (oneDimension) {
			graph.dimensions = [graph.dimensions[0]]
		}

		/*
		for(let i = 0; i < this.state.filters.length; i++) {
			var filter = this.state.filters[i];
			graph.filters.push({
				id: filter.id,
				value: filter.value,
				label: filter.label,
				comparison: filter.comparison
			});
		}*/

		return graph
	},


	_deSerialize: function() {
		var input = {};

		if (window.location.hash) {
			try {
				var input = JSON.parse(decodeURI(window.location.hash.slice(1)));
				window.hasHash = true;
			} catch(e) {
				try {
					var input = JSON.parse(window.location.hash.slice(1));
					window.hasHash = true;
				} catch(e) {
					window.messageLogNotify('Invalid Request', 'warning', e)
					var input = {}
				}
			}
		}

		//retrofit
		if (input.series) {
			input.metrics = []
			input.series.forEach((serie) => {
				if (serie.metrics) {
					serie.metrics.forEach((metric) => {
						if (metric.colors) {
							metric.partitions = metric.colors
							delete metric.colors
						}
						if (metric.field) {
							metric.id = metric.field
							delete metric.field
						}
						metric.highcharts = {
							type: serie.type
						}
						input.metrics.push(metric)
					})
				}
			})
			delete input.series
		}

		if (input.advanced && input.advanced.sort) {
			input.sort = [input.advanced.sort]
			delete input.advanced.sort
		}

		if (input.metrics) {
			input.metrics = input.metrics.map((metric) => {
				if (typeof metric == 'string') {
					metric = {
						id: metric
					}
				}
				if (!metric.highcharts) {
					metric.highcharts = {
						type: 'area'
					}
				}
				if (input.partitions && !metric.partitions) {
					metric.partitions = input.partitions
				}
				return metric
			})
		}

		this.setState({
			popup: false,
			dimensions: input.dimensions || [],
			metrics: input.metrics || [],
			sort: input.sort || undefined,
			chart_id: input.chart_id || undefined,
			filters: input.filters || [],
			advanced: input.advanced || {}
		}, () => {
			if (myChart.changeChart) {
				myChart.changeChart(this.buildGraph(true), true)
			}
		})
	},


	updateWindowHash: function() {
		window.location.hash = this._serialize()
	},


	getInitialState: function() {

		var select_data_pinned = localStorage.getItem('selectDataPinned') || false

		return {
			selectDataExpanded: (select_data_pinned && select_data_pinned != 'false'),
			popup: false,
			dimensions: [],
			metrics: [],
			sort: undefined,
			filters: [],
			advanced: {}
		}
	},


	componentWillMount: function() {
		var thisComponent = this;
		if (window.location.hash == '') {
			var visualExplorerHash = localStorage.getItem('VisualExplorer.hash')
			if (visualExplorerHash) {
				window.location.hash = JSON.parse(visualExplorerHash)
			}
		}

		setTimeout(function() { //prevent double report load
			$(window).on('hashchange',function(){
				thisComponent._deSerialize()
			});
		}, 1000)
	},


	componentDidMount: function() {

		$(".downloadReportToCSV").on("click", (event) => {
			event.preventDefault()
			ReportStore.setData(myChart.getMetric(0))
			var exportData = ReportStore.exportData(false, true)
			var link = $('<a />')
				.attr('target', '_blank')
				.attr('download', 'Datawarehouse Export.csv')
				.attr('href', 'data:text/csv;base64,' + btoa(exportData))
			link[0].click()
		})

		$(".downloadReportToCSVNOHeaders").on("click", (event) => {
			event.preventDefault()
			ReportStore.setData(myChart.getMetric(0))
			var exportData = ReportStore.exportData(false, false)
			var link = $('<a />')
				.attr('target', '_blank')
				.attr('download', 'Datawarehouse Export.csv')
				.attr('href', 'data:text/csv;base64,' + btoa(exportData))
			link[0].click()
		})

		$('.hoverPortalList').mouseenter(() => {
			this.setState({ loadPortalList: true })
		})

		$('.hoverDataExplorerList').mouseenter(() => {
			this.setState({ loadDataExplorerList: true })
		})

		$('.hoverVisualExplorerList').mouseenter(() => {
			this.setState({ loadLibraryList: true })
		})

		var thisComponent = this;
		FieldsStore.addChangeListener(this._onFieldsStoreChange);
		FieldsActions.initFields();

		myChart = Chart($(this.refs.chart), {
			columns: [],
			metrics: [],
			filters: [],
			rows: []
		}, {}).start();

		myChart.setOptions({
			lang: {
				thousandsSep: ','
			}
		});

		var reportClient = new Clipboard('.copyReportToClipboard', {
			text: function() {
				ReportStore.setData(myChart.getMetric(0))
				return ReportStore.exportData(false, true)
			}
		});
		reportClient.on("success", function(readyEvent) {
			window.messageNotify('The contents are now on your clipboard', 'info')
		});

		var reportClient = new Clipboard('.copyReportToClipboardNoHeaders', {
			text: function() {
				ReportStore.setData(myChart.getMetric(0))
				return ReportStore.exportData(false, false)
			}
		});
		reportClient.on("success", function(readyEvent) {
			window.messageNotify('The contents are now on your clipboard', 'info')
		});

		$('.dimensions-list').sortable({
			items: '.dimension-block',
			handle: '.block-top',
			axis: 'x',
			stop: function(event, ui) {
				var dimensions = thisComponent.state.dimensions
				var temp = [];
				$(this).find('.dimension-block').each(function(dimension_index) {
					temp.push(dimensions[$(this).data('column_index')]);
				})
				$('.dimensions-list').sortable('cancel');
				thisComponent.setState({
					dimensions: temp
				}, () => {
					thisComponent.updateWindowHash();
				});
			}
		}).disableSelection();

		//force highcharts into preview box
		$(window).resize(() => {
			var maxWidth = ($('body').width() - (this.state.selectDataExpanded ? 480 : 0) - 220)
			var maxHeight = ($('body').height() - $('.page-header').height() - $('#tool-bar').height() - $('.dimensions-wrapper').height())
			$('#chart-preview-wrapper').css({
				width: maxWidth, height: maxHeight
			})
			myChart && myChart.redraw && myChart.redraw()
			myChart && myChart.reflow && myChart.reflow()
		}).trigger('resize')
	},


	componentWillUnmount: function() {
		FieldsStore.removeChangeListener(this._onFieldsStoreChange);
	},


	_onFieldsStoreChange: function() {
		this.findCommon();
		this._deSerialize();
	},


	componentDidUpdate: function() {

	},


	popupShow: function(action, target, arrow, params) {
		var position = $(target).position();
		position.width = $(target).outerWidth();
		position.height = $(target).outerHeight();
		position.arrow = 'arrow-'+arrow;

		switch(arrow) {
			case 'up-middle':
			case 'up-left':
				position.left += position.width / 2
				position.top += position.height
				position.bottom = $(target).offsetParent().height() - position.top - $(target).height()
			break;

			case 'up-right':
				position.top += position.height;
				position.bottom = $(target).offsetParent().height() - position.top - $(target).height()
				position.right = $(target).offsetParent().width() - position.left - $(target).width() - 20
			break;

			case 'down-right':
				position.bottom = $(target).offsetParent().height() - position.top - $(target).height()
				position.right = $(target).offsetParent().width() - position.left - $(target).width()
			break;
		}

		this.setState({
			popup: {
				position: position,
				action: action,
				params: params
			}
		});
	},


	closePopup: function() {
		this.setState({ popup: false });
	},


	popUpSave: function(action, column, readyToAdd, chart) {
		var autoAddDimension = false;
		switch(action) {
			case 'add_series':
				if (chart == 'pie') {
					column.partitions = ['d_date.year_month'];
					column.highcharts = {
						dataLabels: {
							enabled: false
						},
						showInLegend: true
					};
				} else if (this.state.dimensions.length == 0) {
					autoAddDimension = 'd_date.year_month';
				}
			//fall thru

			case 'add_metric_to_series':
				var autoFilters = FieldsStore.getAutoFilters(column.parent.id)
				if (autoFilters) {
					for(var i=0; i<autoFilters.length; i++) {
						var details = IdUtils.details(autoFilters[i].id);
						if (details) {
							autoFilters[i].label = details.label
							autoFilters[i].dimension = details.parent.label
						}
						this.updateFilter(autoFilters[i])
					}
				}
			//fall thru

			case 'edit_series_metric':
				var column_index = (this.state.popup.params || {}).column_index || -1
				var metrics = this.state.metrics || []
				var metric = {
					id: column.id + (column.id.indexOf('|') == -1 ? (column.id == column.parent.id ? '|count' : '|sum') : ''),
					partitions: column.partitions || undefined,
					highcharts: {
						type: chart
					}
				}

				if (column_index == -1) {
					metrics.push(metric)
				} else {
					metrics[column_index] = metric
				}

				for(var i=0;i<readyToAdd.length;i++) {
					metrics.unshift({
						id: readyToAdd[i].id + (readyToAdd[i].id.indexOf('|') == -1 ? (readyToAdd[i].id == readyToAdd[i].parent.id ? '|count' : '|sum') : ''),
						highcharts: {
							type: chart
						}
					})
				}

				this.setState({
					metrics: metrics,
					dimensions: autoAddDimension ? [autoAddDimension] : this.state.dimensions
				}, () => {
					this.findCommon()
					this.updateWindowHash()
				})

				this.closePopup()
			break

			case 'edit_series_dimension':
				var column_index = this.state.popup.params.column_index
				var metrics = this.state.metrics
				metrics[column_index].partitions = [column.id]

				if (metrics[column_index].highcharts.type == 'area' && !metrics[column_index].highcharts.stacking) {
					metrics[column_index].highcharts.stacking = 'normal'
				}

				this.setState({
					popup: false,
					metrics: metrics
				}, () => {
					this.findCommon();
					this.updateWindowHash();
				});
			break;

			case 'update_chart_dimension':
				var dimensions = this.state.dimensions;

				if (this.state.popup.params && this.state.popup.params.index != -1) {
					dimensions[this.state.popup.params.index] = column.id;
				} else {
					dimensions.push(column.id)
				}

				this.setState({
					popup: false,
					dimensions: dimensions
				}, () => {
					this.findCommon();
					this.updateWindowHash();
				});
			break;

			default:
				console.log('not implimented', action)
			break;

		}
	},


	findCommon: function() {
		var dimensions = JSON.parse(JSON.stringify(this.state.dimensions))
		var metrics = JSON.parse(JSON.stringify(this.state.metrics))

		metrics.forEach((metric) => {
			if (metric.partitions) {
				metric.partitions.forEach((partition) => {
					dimensions.push(partition)
				})
			}
		})

		if (metrics.length) {
			var thisComponent = this;
			setTimeout(function() { //Give the dispatcher room to breathe
				FieldsActions.findCommonDimensions(metrics);
				FieldsActions.findCommonFacts(dimensions);
			}, 100);
		}
	},


	addDimension: function(e) {
		this.popupShow('update_chart_dimension', e.currentTarget, 'up-middle', { index:-1, id:'' });
	},


	saveMetricFilter: function(id) {
		var metrics = this.state.metrics
		metrics[this.state.popup.params.column_index].id = id
		this.setState({
			metrics: metrics,
			popup: false
		}, () => {
			this.updateWindowHash();
		});
	},


	saveAggregate: function(id, addNew) {
		var metrics = this.state.metrics
		if (addNew === 0) {
			metrics[this.state.popup.params.column_index].id = id;
		} else {
			metrics.push({ id:id });
		}
		this.setState({
			metrics: metrics,
			popup: false
		}, () => {
			this.updateWindowHash();
		});
	},


	updateSeries: function(action, column_index, value) {

		switch(action) {

			case 'reorder_metrics':
				this.setState({
					metrics: value
				}, () => {
					this.updateWindowHash()
				});
			break

			case 'change_chart_type':
				var metrics = this.state.metrics
				metrics[column_index].highcharts.type = value
				this.setState({
					metrics: metrics
				}, () => {
					this.updateWindowHash();
				});
			break

			case 'remove_metric':
				var metrics = this.state.metrics
				metrics.splice(column_index, 1)
				this.setState({
					metrics: metrics
				}, () => {
					this.updateWindowHash();
				})
			break

			case 'update_metric':
				var metrics = this.state.metrics
				metrics[column_index].id = value
				this.setState({
					metrics: metrics
				}, () => {
					this.updateWindowHash();
				})
			break

			default:
				console.log('not implimented:', action, series_index, column_index, value)
			break
		}

	},


	updateColumn: function(action, type, column_index, value, e) {

		switch(action) {
			case 'update_label':
				if (type == 'dimension') {
					var dimensions = this.state.dimensions;
					var parsed = IdUtils.parse(dimensions[column_index]);
					parsed.label = value;
					dimensions[column_index] = IdUtils.build();
					this.setState({
						dimensions: dimensions
					}, () => {
						this.updateWindowHash();
					});
				} else {
					var metrics = this.state.metrics
					var parsed = IdUtils.parse(metrics[column_index].id)
					parsed.label = value
					metrics[column_index].id = IdUtils.build()
					this.setState({
						metrics: metrics
					}, () => {
						this.updateWindowHash();
					});
				}
			break;

			case 'remove_column':
				if (type == 'dimension') {
					var dimensions = this.state.dimensions;
					dimensions.splice(column_index, 1);
					this.setState({
						dimensions: dimensions
					}, () => {
						this.updateWindowHash();
					});
				} else {
					var metrics = this.state.metrics
					metrics.splice(column_index, 1)
					this.setState({
						metrics: metrics
					}, () => {
						this.updateWindowHash();
					});
				}
			break;

			case 'edit_column':
				if (type == 'dimension') {
					this.popupShow('update_chart_dimension', e.currentTarget, 'up-left', { index: column_index, id: this.state.dimensions[column_index] })
				} else {
					this.popupShow('edit_series_metric', e.currentTarget, 'up-right', { column_index: column_index, id: this.state.metrics[column_index].id } )
				}
			break;

			case 'remove_metric_dimension':
				var metrics = this.state.metrics
				metrics[column_index].partitions = [];
				this.setState({
					popup: false,
					metrics: metrics
				}, () => {
					this.updateWindowHash();
				});
			break;

			case 'change_aggregate':
				this.popupShow('change_aggregate', e.currentTarget, 'up-right', { column_index: column_index, column: value } )
			break;

			case 'change_metric_filter':
				this.popupShow('change_metric_filter', e.currentTarget, 'up-right', { column_index:column_index, id:value } );
			break;

			default:
				console.log('not implimented:', action, type, column_index, value)
			break;
		}
	},


	updateFilter: function(filter) {
		var filters = this.state.filters;
		var updated = false;
		for(var i=0;i<filters.length;i++) {
			if (filters[i].id == filter.id) {
				filters[i].checkboxes = filter.checkboxes;
				filters[i].value = filter.value;
				filters[i].comparison = filter.comparison;
				updated = true;
				break;
			}
		}
		if (!updated) {
			filters.push(filter);
		}
		this.setState({
			filters: filters
		}, () => {
			this.updateWindowHash();
		});
	},


	removeFilter: function(filter_id) {
		var filters = this.state.filters;
		var updated = false;
		for(var i=0;i<filters.length;i++) {
			if (filters[i].id == filter_id) {
				filters.splice(i, 1);
				break;
			}
		}
		this.setState({
			filters: filters
		}, () => {
			this.updateWindowHash();
		});
	},


	autoComplete: function(filter_id, term, callback) {
		ReportFilterActions.autocomplete2(filter_id, term, callback);
	},


	applySeriesAdvancedChanges: function(highcharts, metric_index) {
		var metrics = this.state.metrics
		highcharts.type = metrics[metric_index].highcharts.type || 'area'
		metrics[metric_index].highcharts = highcharts
		this.setState({
			metrics: metrics,
			dialog: false
		}, () => {
			this.updateWindowHash();
		});
	},


	applyAdvancedChanges: function(advanced) {
		var sort = advanced.sort ? [advanced.sort] : this.state.sort
		var chart_id = advanced.chart_id || this.state.chart_id

		advanced = $.extend(true, {}, this.state.advanced, advanced)
		delete advanced.sort
		delete advanced.chart_id

		this.setState({
			advanced: advanced,
			sort: sort,
			chart_id: chart_id
		}, () => {
			this.updateWindowHash()
		});
	},


	buildCode: function(all) {
		var scriptText = '<script type="text/x-leo-chart">'+JSON.stringify(this.buildGraph(false), null, 4)+'</script>';
		if (all) {
			return '<body>\n\t<div class="leo-charts-wrapper">\n\t\t<figure class="leo-chart">\n\t\t\t' + scriptText + '\n\t\t</figure>\n\t</div>\n</body>';
		}
		return scriptText;
	},


	rawCode: function(values) {
		if (values) {
			document.location.hash = '#' + JSON.stringify(values)
		} else {
			try {
				return JSON.parse(document.location.hash.slice(1))
			} catch(e) {
				return document.location.hash.slice(1)
			}
		}
	},


	render: function() {
		var thisComponent = this;

		if (window.top !== window.self) {
			//remove if in iframe
			$('.page-header').remove()
			$('main').css({top: 0})
			var style = {top:0}
		} else {
			var style = {}
		}

		return (<div>

			<Header />

			<main className="page-main-wrapper" style={style}>

				<div id="tool-bar" className="page-sub-header">

					<SelectData selectDataExpanded={this.state.selectDataExpanded} inputBoxArrows={{ metric: ['column'], dimension: ['row'] }} />

					<ToolDock reportLink={window.location.protocol + '//' + window.location.host + '/chart#' + this._serialize()} buildCode={this.buildCode} rawCode={this.rawCode} applyAdvancedChanges={this.applyAdvancedChanges} advanced={this.state.advanced} sort={this.state.sort} chart_id={this.state.chart_id} />

					<div style={{display: 'inline-block', float: 'left', width: 10}}></div>

					<Filters key="filters" ref="filters"
						reportFilters={this.state.filters}
						hasRowMetrics="true"
						hasColumnMetrics="true"
						removeFilter={this.removeFilter}
						addFilter={this.updateFilter}
						updateFilter={this.updateFilter}
						autoComplete={this.autoComplete}
					/>
				</div>

				<div className="chart-builder-wrapper flex-grow flex-row">

					{
						this.state.selectDataExpanded
						? <div className="data-dictionary-footprint">&nbsp;</div>
						: false
					}

					<div className="flex-grow flex-column">
						<div className="dimensions-wrapper flex-row">
							<div className="dimensions-list flex-row">
							{
								this.state.dimensions.map(function(dimension_id, dimension_index) {
									var dimension = { id: dimension_id }
									var details = IdUtils.details(dimension_id);
									if (details) {
										dimension.label = details.label;
										dimension.parent = details.parent;
									}
									return <ColumnBlock key={dimension_index} type="dimension" column={dimension} column_index={dimension_index} updateColumn={thisComponent.updateColumn} />
								})
							}
							</div>

							<div className="flex-grow flex-align-middle text-center">
								<div className="add-button" onClick={this.addDimension}>
									<i className="icon-ion-social-buffer-outline"></i> <span>Add Dimension</span>
								</div>
							</div>

						</div>
						<div id="chart-preview-wrapper" className="flex-grow overflow-hidden">
							<div ref="chart" id="chart-preview">
								Chart
							</div>
						</div>
					</div>

					<Series
						metrics={this.state.metrics}
						chartTypes={this.chartTypes}
						updateSeries={this.updateSeries}
						updateColumn={this.updateColumn}
						applyChanges={this.applySeriesAdvancedChanges}
						applyAdvancedChanges={this.applyAdvancedChanges}
						sort={this.state.sort}
						advanced={this.state.advanced}
					/>

				</div>


				{
					this.state.popup
					? (function() {

							var popup = thisComponent.state.popup;

							switch(popup.action) {
								case 'change_aggregate':
									return <Aggregates id={popup.params.column.id} column={popup.params.column} position={popup.position} params={popup.params} saveAggregate={thisComponent.saveAggregate} closeChangeColumn={thisComponent.closePopup} />
								break;

								case 'change_metric_filter':
									return <MetricFiltering id={popup.params.id} position={{ top: popup.position.top, right: 10 }} popupMenu="arrow-up-right" closeChangeColumn={thisComponent.closePopup} saveMetricFilter={thisComponent.saveMetricFilter} />
								break;

								default:
									return <ColumnSearch id={popup.params.id} action={popup.action} position={popup.position} popUpSave={thisComponent.popUpSave} closeChangeColumn={thisComponent.closePopup} chartTypes={thisComponent.chartTypes} />
								break;
							}

						})()
					: false
				}

				{
					this.state.dialog
					? (function() {
							var dialog = thisComponent.state.dialog
							switch(dialog) {
								case 'advanced':
									return <AdvancedDialog defaults={thisComponent.state.dialogDefaults} inChartBuilder="true" updateMetricAdvanced={thisComponent.updateSeries.bind(null, 'update_metric')} />
								break;
							}
						})()
					: false
				}

				{
					this.state.loadPortalList
					? <PortalList dropDown="true" />
					: false
				}

				{
					this.state.loadDataExplorerList
					? <ReportLibrary dropDown="DataExplorer" />
					: false
				}

				{
					this.state.loadLibraryList
					? <ReportLibrary dropDown="VisualExplorer" />
					: false
				}

			</main>
		</div>)

	}

});
