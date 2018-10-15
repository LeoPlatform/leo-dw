
var React = require('react');

var ColumnSearch = require('../report/columnSearch.jsx');
var IdUtils = require('../../utils/IdUtils.js');
var FieldsActions = require('../../actions/FieldsActions');
var Filter = require('../report/filters/filter.jsx');
var ReportFilterActions = require('../../actions/ReportFilterActions');

var ExpressionBuilder = require('../common/ExpressionBuilder.jsx');

var configure = require("../leoConfigure.js");


module.exports = React.createClass({

	charts: {

		'DataExplorer': {
			type: 'table',
			DataExplorer: true
		},

		'VisualExplorer': {
			type: 'visual_explorer',
			VisualExplorer: true
		},

		FilterBar: {
			type: 'filter_bar',
			filters: 'pick_filter',
			controller: {
				selector: '*'
			}
		},

		Ranked: {
			type: 'ranked',
			metrics: 'pick_metric', //1 req, can be multiple
			dimensions: 'pick_dimension', //not req, but weird without,
			filters: 'pick_filter', //not req
			requireControl: false,
			controller: {
				enabled: true,
				selector: '*',
				//filters: 'pick_filter'
			}
		},

		Google_Map: {
			type: 'google_map',
			metrics: 'pick_metric',
			country: 'pick_dimension',
			state: 'pick_dimension',
			defaultCountry: 'autocomplete:country',
			filters: 'pick_filter', //not req
			center: 'latitude-longitude',
			colors: {
				low: 'color',
				high: 'color',
				invalid: 'color',
				outline: 'color'
			},
			mapTypeId: ['roadmap', 'satellite', 'hybrid', 'terrain'],
			zoom: [0,'1 World',2,3,4,'5 Landmass/continent',6,7,8,9,'10 City',11,12,13,14,'15 Streets',16,17,18,19,'20 Buildings',21]
		},

		Single_Metric: {
			type: 'single_number',
			label: '{metric label}',
			metric: 'pick_metric',  //req
			timeframe: ['year', 'quarter', 'month', 'week', 'day'], //req?
			asPercent: false,
			decimals: [0,1,2,3,4],
			extraNumbers: {
				show: false,
				growth: '"growth"',
				previous: '"previous"',
				current: '"current"',
				decimals: [0,1,2,3,4]
			},
			requireControl: false,
			filters: 'pick_filter'
		},

		Calculated_Metric: {
			type: 'calculated_metric',
			label: 'enter label',
			expression: 'expression',  //req
			format: ['float', 'money', 'percent'],
			decimals: [0,1,2,3,4],
			requireControl: false,
			filters: 'pick_filter'
		},

		Gauge: {
			type: 'gauge',
			label: '{metric label}',
			metric: 'pick_metric',
			timeframe: ['year', 'quarter', 'month', 'week', 'day'],
			prior: {
				title: '"Prior Period"'
			},
			requireControl: false,
			filters: 'pick_filter'
		},

		Comparison: {
			type: 'comparison',
			label: '{metric label}',
			metric: 'pick_metric',
			timeframe: ['year', 'quarter', 'month', 'week', 'day'],
			useTime: false,
			requireControl: false
		},

		'raw script': {
			type: 'script',
			script: ''
		},

		/*
		SimpleTable: {
			type: 'simpletable',
			title: 'enter title',
			dimensions: 'pick_dimension',
			partitions: 'pick_dimension',
			metrics: 'pick_metric',
			filters: 'pick_filter',
			onEmpty: 'No Results'
		}
		/* */

		'HTML': {
			type: 'html',
			html: ''
		},

	},


	getInitialState: function() {
		var chart = 'script';
		var html = this.props.figure.attr('data-html') || ''
		var script = this.props.figure.attr('data-script') || ''
		var scriptObject = script;

		try {
			//double encoded!!!
			while(typeof scriptObject === 'string') {
				script = scriptObject
				scriptObject = JSON.parse(scriptObject)
			}
			chart = 'script'
		} catch(e) {
			scriptObject = {};
			//console.log('error', e)
		}

		if (scriptObject
			&& (
				scriptObject.type == 'chart'
				|| (!scriptObject.type && (scriptObject.metrics && scriptObject.metrics[0] && scriptObject.metrics[0].highcharts) || scriptObject.series)
			)
		) {
			scriptObject.type = chart = 'visual_explorer'
		}

		var filters = [],
			metrics = [],
			dimensions = []
		if (scriptObject && scriptObject.type) {
			switch(scriptObject.type) {
				case 'ranked':
				case 'single_number':
				case 'calculated_metric':
				case 'gauge':
				case 'comparison':
				case 'google_map':
				case 'visual_explorer':
				case 'table':
					chart = scriptObject.type
					filters = scriptObject.filters || []
					metrics = scriptObject.metrics || []
					dimensions = scriptObject.columns || scriptObject.dimensions || []
				break;
				case 'filter_bar':
					chart = scriptObject.type
					filters = scriptObject.filters || []
				break
			}
		} else if (html) {
			chart = 'html'
		}

		return {
			title: (html || script) ? 'Edit Chart' : 'Add Chart',
			action: false,
			position: false,
			chart: chart,
			filters: filters,
			metrics: metrics,
			dimensions: dimensions,
			html: html,
			script: script,
			scriptObject: scriptObject,
			sort: scriptObject.sort || [],
			autoCompleteResults: []
		};
	},


	componentDidMount: function() {
		setTimeout(() => {
			this.componentDidUpdate()
		}, 0)

		$('.wizard-form').on('click', '[name="asPercent"]', this.toggleExtraTitles)

		var buttons = {
			Save: this.saveChart,
			close: this.props.closeDialog
		}

		if (this.state.title == 'Edit Chart') {
			buttons.Delete = this.props.deleteChart.bind(null, this.props.figure)
		}

		this.modal = LeoKit.modal($('#wizard'),
			buttons,
			this.state.title,
			this.props.closeDialog
		).on('click', '.addToLibrary', () => {
			var script = $('.edit-script').val()
			this.props.addToLibrary(script)
		}).on('click', '.loadFromLibrary', () => {
			this.props.loadFromLibrary()
		})

	},


	toggleExtraTitles: function() {
		if ($('[name="asPercent"]').is(':checked')) {
			$('[name="extraNumbers.growth"]').parent().hide();
			$('[name="extraNumbers.previous"], [name="extraNumbers.current"]').parent().show();
		} else {
			$('[name="extraNumbers.growth"]').parent().show();
			$('[name="extraNumbers.previous"], [name="extraNumbers.current"]').parent().hide();
		}
	},


	componentDidUpdate: function() {
		this.props.onUpdate(this.modal)
		this.toggleExtraTitles()
	},


	selectColumn: function(action, instance, e) {
		var position = $(e.currentTarget).position();
		position.left += 200;
		position.top += 30;
		this.setState({ action: action, position: position, input: e.currentTarget, instance: instance });
	},


	closeAddColumn: function() {
		this.setState({ action: null });
	},


	openForm: function(chart) {
		this.setState({
			chart: chart,
			filter: []
		}, function() {
			$('.form-block').find('input, select, textarea').first().focus();
		});
	},


	saveColumn: function(action, column) {
		var input = this.state.input
		var filters = this.state.filters
		var metrics = this.state.metrics
		var dimensions = this.state.dimensions

		switch(action) {
			case 'pick_metric':
				if (column.id.indexOf('|') == -1) {
					column.id += '|sum'
				}
				input.value = column.id
				metrics[this.state.instance] = column.id
			break;

			case 'pick_partition':
			case 'pick_dimension':
				input.value = column.id
				dimensions[this.state.instance] = column.id
			break;

			case 'pick_filter':
				var filter = {
					id: column.id,
					value: [],
					checkboxes: {"_":null},
					label: column.label
				}

				if (column.kind == 'date_range') {
					filter.comparison = 'between';
					filter.value = ['Today'];
				}

				if (column.type == 'metric') {
					filter.fact = column.parent.label;
					filter.singleValue = true;
				} else {
					filter.dimension = column.parent.label;
				}

				filters.push(filter);
				input.value = '';
			break;
		}

		this.setState({
			action: null,
			input: input,
			filters: filters,
			metrics: metrics,
			dimensions: dimensions
		});

		var dimensions = [];
		$('.pick_dimension, .pick_partition').each(function() {
			dimensions.push($(this).val())
		})
		var metrics = [];
		$('.pick_metric').each(function() {
			metrics.push($(this).val())
		})

		FieldsActions.findCommonDimensions(metrics);
		FieldsActions.findCommonFacts(dimensions);
	},


	saveChart: function(chart) {

		var html = chart['edit-html-textarea'];

		if (chart.type == 'visual_explorer') {

			var script = JSON.parse($('#VisualExplorer')[0].contentWindow.location.hash.slice(1))
			script.type = 'chart'
			chart = JSON.stringify(script, null, 4)

		} else if (chart.type == 'table') {

			var script = JSON.parse($('#DataExplorer')[0].contentWindow.location.hash.slice(1))
			script.type = 'table'
			chart = JSON.stringify(script, null, 4)

		} else if (chart.type == 'script' || chart['edit-script-textarea']) {

			var script = $.trim(chart['edit-script-textarea'].replace(/(<\/?script([^>]*)>)/ig, ''));
			try {
				var test = (new Function("return " + script))();
				if (!test || typeof test !== "object" || test === null) {
					window.messageModal('Error: Invalid Script');
					return false;
				}
			} catch(e) {
				window.messageModal('Error: '+e, 'error', e);
				return false;
			}
			chart = script;
		} else {

			var errors = []

			switch(chart.type) {
				case 'html':
					if (!chart['edit-html-textarea']) {
						errors.push('HTML is required')
					}
				break

				case 'google_map':
					if (!chart.country) {
						errors.push('Country is required')
					}
				//fall thru to ranked

				case 'ranked':
					if (!chart.metrics) {
						errors.push('All least one metric is required')
					}
				break

				case 'calculated_metric':
					if (!chart.expression) {
						errors.push('Expression is required')
					}
				break

				case 'filter_bar':
					if (this.state.filters.length == 0) {
						errors.push('A filter is required')
					}
				break

				default:
					if (!chart.metric) {
						errors.push('Metric is required')
					}
				break
			}

			if (errors.length > 0) {
				window.messageModal(errors.join('<br/>'))
				return
			}

			if (chart.metrics) {
				var metrics = (typeof chart.metrics === 'string' ? chart.metrics.split(',') : chart.metrics)
				chart.metrics = [];
				metrics.forEach(function(metricId, i) {
					if (metricId !== '') {
						if (metricId.indexOf('|') == -1) {
							metricId += '|sum';
						}
						var details = IdUtils.details(metricId)
						var label = (chart.metrics_label[i] || (details ? details.parent.label + ' ' + details.label : ''))
						var metric = {
							default: (i==0),
							id: metricId,
							label: label
						}
						if (typeof chart.partitions == 'object') {
							metric.partitions = [chart.partitions[i]]
						} else if (typeof chart.partitions == 'string') {
							metric.partitions = [chart.partitions]
						}
						chart.metrics.push(metric)
					}
				})
			}
			delete chart.metrics_label
			delete chart.partitions

			if (chart.sort) {
				if (typeof chart.sort !== 'object') {
					chart.sort = [chart.sort]
				}

				chart.sort = chart.sort.map((sort_params) => {
					sort_params = sort_params.toString().split(' ')
					return {
						column: sort_params[0],
						direction: sort_params[1]
					}
				})
			}

			if (chart.column) {
				chart.dimensions = [chart.column]
				delete chart.column
			}

			if (chart.dimension) {
				chart.dimensions = [chart.dimension]
				delete chart.dimension
			}

			if (chart.dimensions) {
				chart.dimensions = chart.dimensions.filter((dimension) => {
					return dimension
				})
			}

			for(var i in chart) {
				if (chart[i] === 'true') {
					chart[i] = true;
				} else if (chart[i] === 'false') {
					chart[i] = false;
				} else if (chart[i] === '') {
					delete chart[i];
				}
				if (i.indexOf('.') !== -1) {
					var j = i.split('.');
					if (!chart[j[0]]) {
						chart[j[0]] = {};
					}
					chart[j[0]][j[1]] = chart[i];
					delete chart[i];
				}
			}

			if (this.state.filters.length) {
				chart.filters = this.state.filters.map(function(filter) {
					return {
						id: filter.id,
						value: filter.value,
						comparison: filter.comparison
					}
				})
			}

			if (chart.controller && chart.controller.selector && $(chart.controller.selector).length == 0) {
				LeoKit.confirm('The selector you have entered does not match any charts.  Do you want to continue anyway? (See <a href="https://api.jquery.com/category/selectors/" target="_blank">https://api.jquery.com/category/selectors/</a> for more information on JQuery selectors)', () => {
					chart = JSON.stringify(chart, null, 4);
					this.props.addChart(chart);
					this.props.closeDialog();
				})
				return false;
			}

			chart = JSON.stringify(chart, null, 4);
		}

		this.props.addChart(chart, html)
		this.props.closeDialog()
	},


	updateFilter: function() {
		//console.log('updateFilter', arguments)
	},


	removeFilter: function(filter_id, e) {
		e.preventDefault();
		var filters = this.state.filters.filter(function(filter) {
			return filter.id != filter_id
		})
		this.setState({ filters:filters })
	},


	clearField: function(element, instance) {
		$('[name="'+element+'"]').get(instance).value = ''
		if (element === 'metrics') {
			var metrics = this.state.metrics
			metrics.splice(instance, 1)
			this.setState({ metrics: metrics })
		} else if (element === 'dimensions') {
			var dimensions = this.state.dimensions
			dimensions.splice(instance, 1)
			this.setState({ dimensions: dimensions })
		}
	},


	autoComplete: function(filter_id, term, callback) {
		ReportFilterActions.autocomplete2(filter_id, term, callback);
	},


	formatScript: function() {
		var thisComponent = this;
		var script = $('.edit-script').val();
		if (script.indexOf('function(') !== -1) {
			window.messageModal('Formatting this code will remove functions.  Cannot continue.', 'warning')
			return
		}
		LeoKit.confirm('Warning: Formatting this script may cause undesired changes.  Are you sure you want to continue? (Changes can be undone by typing CTRL-Z or Command-Z)', function() {
			try {
				var test = (new Function("return " + script))();
				if (!test || typeof test !== "object" || test === null) {
					window.messageModal('Error: Invalid Script');
					return false;
				}
				$('.CodeMirror')[0].CodeMirror.setValue(JSON.stringify(test, null, 4))
			} catch(e) {
				window.messageModal('Error: '+e, 'error');
				return false;
			}
		})
	},


	setValue: function(e) {
		$(e.currentTarget).prev().val(e.currentTarget.value)
	},


	findLatLng: function(e) {
		var geocoder = new google.maps.Geocoder();
		var address = $(e.currentTarget).prev('.location-name').val()
		var latitudeLongitude = $(e.currentTarget).closest('.latitude-longitude')
		if (address.trim() != '') {
			geocoder.geocode({'address': address}, function(results, status) {
				if (status === 'OK') {
					latitudeLongitude.find('.latitude').val(results[0].geometry.location.lat())
					latitudeLongitude.find('.longitude').val(results[0].geometry.location.lng())
				} else {
					window.messageModal('Geocode was not successful for the following reason: ' + status, 'error')
				}
			});
		}
	},


	wizardAutoComplete: function(e) {
		var fieldName = $(e.currentTarget).attr('data-autocomplete')
		var filter_id = $('[name="'+fieldName+'"]').val()
		var term = e.currentTarget.value
		if (filter_id) {
			ReportFilterActions.autocomplete2(filter_id, term, (results) => {
				this.setState({
					autoCompleteResults: results.suggestions
				})
			});
		} else {
			this.setState({
				autoCompleteResults: []
			})
		}
		$(e.currentTarget).next().addClass('active')
	},


	selectAutoComplete: function(e) {
		$(e.currentTarget).prev().val($(e.target).text())
		$(e.currentTarget).removeClass('active')
	},


	scriptToURL: function(which) {
		var scriptObject = this.state.scriptObject
		var script = {
			chart_id: scriptObject.chart_id || undefined,
			dimensions: scriptObject.columns || scriptObject.dimensions || [],
			metrics: [],
			filters: scriptObject.filters,
			advanced: scriptObject.advanced || undefined,
			partitions: scriptObject.partitions || undefined,
			sort: scriptObject.sort || undefined,
			type: scriptObject.type || undefined,
			title: scriptObject.title || undefined
		}

		if (scriptObject.series) {
			script.series = scriptObject.series
		} else if (scriptObject.metrics) {
			//script.metrics = scriptObject.metrics
			scriptObject.metrics.map(function(metric) {
				if (metric && metric.highcharts) {
					script.metrics.push({
						id: metric.id || metric.field,
						partitions: metric.partitions || metric.colors || undefined,
						highcharts: metric.highcharts
					})
				} else {
					script.metrics.push({
						id: metric.id || metric.field || metric,
						partitions: metric.partitions || metric.colors || undefined
					})
				}
			})
		}

		return './' + which + '#' + JSON.stringify(script)
	},


	render: function() {

		var thisComponent = this,
			scriptObject = this.state.scriptObject,
			defaultChartId = 1

		while($('figure[id="chart-'+defaultChartId+'"]').length > 0) {
			defaultChartId++
		}

		return <div>
			<div id="wizard" className="wizard-form">
				<ul className="wizard-chart-types">
				{
					Object.keys(this.charts).map((chart, key) => {

						return (<li key={key}>
							<label>
								<input type="radio" name="type" value={this.charts[chart].type} defaultChecked={this.state.chart == this.charts[chart].type} onClick={this.openForm.bind(null, this.charts[chart].type)} />
								<div>
									<img src={configure.static.uri + "images/"+this.charts[chart].type+".png"} />
									<span>{chart.replace('_', ' ')}</span>
								</div>
							</label>
						</li>)
					})
				}
				</ul>

				{
					Object.keys(this.charts).map((chart, key) => {

						return (this.state.chart !== this.charts[chart].type)
							? false
							: <div key={key} className={((this.state.chart == 'data_explorer' || this.state.chart == 'visual_explorer' || this.state.chart == 'table' || this.state.chart == 'script' || this.state.chart == 'html') ? 'iframe-script-wrapper' : 'form-rows-wrapper')}>
								<div>
								{
									(this.state.chart != 'data_explorer' && this.state.chart != 'visual_explorer' && this.state.chart != 'table' && this.state.chart != 'script' && this.state.chart != 'html')
									? <div className="theme-form-row">
										<label>Chart Id</label>
										<input name="chart_id" defaultValue={scriptObject['chart_id'] || 'chart-'+defaultChartId} />
									</div>
									: false
								}

								{
									Object.keys(this.charts[chart]).map((attribute, key) => {

										switch (attribute) {

											case 'VisualExplorer':
												return <iframe key={key} id="VisualExplorer" src={this.scriptToURL('chart')} onLoad={() => { $('iframe').show() }} style={{display:'none'}}></iframe>
											break

											case 'DataExplorer':
												return <iframe key={key} id="DataExplorer" src={this.scriptToURL('builder')} onLoad={() => { $('iframe').show() }} style={{display:'none'}}></iframe>
											break

											case 'type':
												return false
											break;

											case 'script':
												return (<div key={key}>
													<textarea ref="editScript" name="edit-script-textarea" className="edit-script" placeholder="Enter script for chart" defaultValue={this.state.script} />
													<div className="library-buttons">
														<button className="theme-button" type="button" onClick={thisComponent.formatScript}><i className="icon-cogs"></i> Format Script</button>
														<button className="addToLibrary theme-button" type="button"><i className="icon-plus"></i> Add to Library</button>
														<button className="loadFromLibrary theme-button" type="button"><i className="icon-book"></i> Load from Library...</button>
													</div>
												</div>)
											break;

											case 'html':
												return (<div key={key}>
													<textarea ref="editHTML" name="edit-html-textarea" className="edit-html" placeholder="Enter html for chart" defaultValue={this.state.html} />
												</div>)
											break;
										}

										return <div key={key} className="theme-form-row">
											<label>{attribute.replace(/([A-Z])/g, function($1) { return ' '+$1 }) }</label>
											{
												(function(that) {
													var values = thisComponent.charts[chart][attribute];

													switch(values) {
														case 'expression':
															//return <input type="text" name={attribute} placeholder={values} defaultValue={scriptObject[attribute] || ''} />
															return <ExpressionBuilder name={attribute} defaultValue={scriptObject[attribute] || ''} />
														break;

														case 'pick_metric':
														case 'pick_dimension':
														case 'extra_dimension':

															var defaultValues = []
															if (attribute === 'dimensions') {
																defaultValues = thisComponent.state.dimensions
																if (defaultValues[defaultValues.length-1] != '') {
																	defaultValues.push('')
																}
															} else if (attribute === 'metrics') {
																defaultValues = thisComponent.state.metrics
																if (defaultValues[defaultValues.length-1] != '') {
																	defaultValues.push('')
																}
															} else if (!scriptObject[attribute]) {
																defaultValues = [''];
															} else if (typeof scriptObject[attribute] === 'string') {
																defaultValues = [scriptObject[attribute]];
															} else {
																defaultValues = scriptObject[attribute]
															}

															return (<div>
																{
																	defaultValues.map((defaultValue, key) => {

																		var sortDefault = (thisComponent.state.sort[key] ? Object.keys(thisComponent.state.sort[key]).map((v,i,a) => {
																			return thisComponent.state.sort[key][v]
																		}).join(' ') : '1 desc')

																		return (<div key={key+(defaultValue.field || defaultValue.id || defaultValue)}>
																			<input type="text" className={values} name={attribute} onFocus={thisComponent.selectColumn.bind(null, values, key)} placeholder="select" defaultValue={defaultValue.field || defaultValue.id || defaultValue} />
																			<i className="icon-cancel" onClick={thisComponent.clearField.bind(null, attribute, key)}></i>
																			{
																				attribute === 'metrics'
																				? [
																					<input key="0" name={attribute + '_label'} placeholder="label" defaultValue={defaultValue.label || ''} />,
																					(
																						(thisComponent.state.chart == 'ranked' && key < (defaultValues.length-1))
																						? <select key="1" name="sort" defaultValue={sortDefault}>
																							<option value="1 asc">Sort Ascending</option>
																							<option value="1 desc">Sort Descending</option>
																							<option value="0 asc">Alphabetized A - Z</option>
																							<option value="0 desc">Alphabetized Z - A</option>
																						</select>
																						: false
																					),
																					(
																						(thisComponent.state.chart == 'ranked' && key < (defaultValues.length-1))
																						? [
																							<input type="text" className="pick_partition" name="partitions" onFocus={thisComponent.selectColumn.bind(null, "pick_partition", key)} placeholder="partition" defaultValue={defaultValue.partitions ? defaultValue.partitions[0] : ''} />,
																							<i className="icon-cancel" onClick={thisComponent.clearField.bind(null, 'partitions', key)}></i>
																						]
																						: false
																					)
																				]
																				: false
																			}
																		</div>)
																	})
																}
															</div>)
														break

														case 'pick_filter':
															return (<div id="tool-bar">
																<div className="filters-wrapper">
																	<ul>
																	{
																		thisComponent.state.filters.map(function(filter, key) {
																			if (!filter.label) {
																				var details = IdUtils.details(filter.id);
																				if (details && details.label) {
																					filter.label = details.label
																				} else {
																					filter.label = 'Unknown';
																				}
																				if (details && details.parent && details.parent.label) {
																					filter.dimension = details.parent.label
																				} else {
																					filter.dimension = 'Unknown';
																				}
																			}
																			return <Filter key={filter.id} filter={filter} updateReportFilter={thisComponent.updateFilter} removeFilter={thisComponent.removeFilter} autoComplete={thisComponent.autoComplete}/>
																		})
																	}
																		<li className="filter-wrapper">
																			<div className="add-filter align-middle cursor-pointer" onClick={thisComponent.selectColumn.bind(null, values, 0)}>
																				<i className="icon-plus-circled"></i><label> Add Filter</label>
																			</div>
																		</li>
																	</ul>
																</div>
															</div>)
														break;

														case 'latitude-longitude':
															return (<div className="latitude-longitude">
																<div className="theme-form-row">
																	<label>Latitude</label>
																	<div>
																		<input name={attribute+'.lat'} className="latitude" defaultValue={scriptObject[attribute] ? scriptObject[attribute].lat : ''} />
																		<input className="location-name" placeholder="location name" />
																		<button type="button" className="theme-button" onClick={thisComponent.findLatLng}>Look up</button>
																	</div>
																</div>
																<div className="theme-form-row">
																	<label>Longitude</label>
																	<input name={attribute+'.lng'} className="longitude" defaultValue={scriptObject[attribute] ? scriptObject[attribute].lng : ''} />
																</div>
															</div>)
														break;

														case false: case true:
															return <input type="checkbox" name={attribute} defaultChecked={scriptObject[attribute] || values} value="true" />
														break;

														case 'json':
															return <textarea name={attribute} className="CodeMirror" defaultValue={scriptObject[attribute]} />
														break

														default:

															if (typeof values == 'object') {
																if (values.length) {
																	return (<select name={attribute} defaultValue={scriptObject[attribute] || (attribute == 'zoom' ? '3' : '')}>
																		{
																			values.map(function(value, key) {
																				return <option key={key} value={value}>{value}</option>
																			})
																		}
																	</select>)
																} else {

																	return (<div>
																		{
																			Object.keys(values).map(function(value, key) {

																				var attributeValue = (scriptObject[attribute] ? scriptObject[attribute][value] : '')

																				return (<div key={key} className="theme-form-row">
																					<label>{value}</label>
																					{
																						typeof values[value] == 'object'
																						? <select name={attribute+'.'+value} defaultValue={attributeValue || ''}>
																							{
																								values[value].map(function(value, key) {
																									return <option key={key} value={value}>{value}</option>
																								})
																							}
																							</select>

																						: (function(val) {

																							switch(val) {
																								case true: case false:
																									return <input type="checkbox" name={attribute+'.'+value} defaultChecked={(attributeValue || values[value])} value="true" />
																								break;

																								case 'color':
																									return (<div>
																										<input name={attribute+'.'+value} placeholder={values[value]} defaultValue={attributeValue || ''} />
																										<input type="color" pattern="#[a-f0-9]{6}" placeholder="#000000" defaultValue={attributeValue || '#FFFFFF'} onChange={thisComponent.setValue} />
																									</div>)
																								break;

																								case 'latitude':
																									return (<div>
																										<input name={attribute+'.'+value} placeholder={values[value]} defaultValue={attributeValue || ''} />
																										<input type="range" min="-90" max="90" step="1" onChange={thisComponent.setValue} />
																									</div>)
																								break;

																								case 'longitude':
																									return (<div>
																										<input name={attribute+'.'+value} placeholder={values[value]} defaultValue={attributeValue || ''} />
																										<input type="range" min="-180" max="180" step="1" onChange={thisComponent.setValue} />
																									</div>)
																								break;

																								default:
																									return <input name={attribute+'.'+value} placeholder={values[value]} defaultValue={attributeValue || ''} />
																								break;
																							}

																						})(values[value])

																					}
																				</div>)
																			})
																		}
																	</div>)
																}

															} else if (values.split(':')[0] == 'autocomplete') {
																return (<div className="autocomplete-wrapper">
																	<input type="text" name={attribute} placeholder="autocomplete" data-autocomplete={values.split(':')[1]} defaultValue={scriptObject[attribute] || ''} onKeyUp={thisComponent.wizardAutoComplete} />
																	<ul onClick={thisComponent.selectAutoComplete}>
																	{
																		thisComponent.state.autoCompleteResults.map(function(result) {
																			return <li key={result.value} value={result.value}>{result.value}</li>
																		})
																	}
																	</ul>
																</div>)
															} else {
																return <input type="text" name={attribute} placeholder={values} defaultValue={scriptObject[attribute] || ''} />
															}
														break;
													}

												})(this)
											}
										</div>
									})
								}
							</div>
						</div>
					})
				}

				{
					thisComponent.state.action
					? <ColumnSearch
						action={thisComponent.state.action}
						id={thisComponent.state.input.value}
						position={thisComponent.state.position}
						closeChangeColumn={thisComponent.closeAddColumn}
						addClass="arrow-up-middle"
						save={thisComponent.saveColumn}
					/>
					: false
				}

			</div>
		</div>

	}

});
