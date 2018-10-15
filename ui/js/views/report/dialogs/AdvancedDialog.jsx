var React = require('react');

var FieldPicker = require('../fieldPicker.jsx');
//var Banding = require('../banding.jsx');

var MetricFiltering = require('../metricFiltering.jsx');
var MetricPartitioning = require('../metricPartitioning.jsx')

var ExpressionBuilder = require('../../common/ExpressionBuilder.jsx');

var IdUtils = require('../../../utils/IdUtils');

module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired
	},

	metricTypes: {
		'Standard': ['metric', 'aggregate', 'filter', 'partitions'],
		'fx': ['expression', 'format', 'decimals'],
		'Lag Time': ['fact', 'aggregate', 'period', 'start', 'end', 'filter', 'date_format', 'decimals'],
		'Count': ['fact', 'filter', 'partitions'],
		'Count Unique': ['fact', 'dimension', 'filter', 'partitions'],
		//'Sparkline': ['fact', 'filter', 'partitions']
	},

	aggregates: {
		fact: {
			count: 'Count',
			unique: 'Count Unique'
		},
		metric: {
			sum: 'Sum',
			avg: 'Avg',
			min: 'Min',
			max: 'Max'
		}
	},

	formats: {
		base: 'Base (raw output)',
		'float': 'Float',
		money: 'Money',
		count: 'Count',
		'int': 'Integer',
		percent: 'Percent'
	},

	date_formats: {
		humanized: 'humanized',
		numeric: 'numeric'
	},

	decimals: [0,1,2,3,4],

	periods: ['days', 'weeks', 'months', 'quarters', 'years'],

	funcs: {

		cumulative: {
			label: 'Cumulative',
			parameters: {
				horizontal: 'boolean',
				reverse: 'boolean',
				shift: 'radio|:none,up:(left in horizontal),down:(right in horizontal)'
			}
		},

		rank: {
			label: 'Rank',
			parameters: {
				horizontal: 'boolean',
				reverse: 'boolean',
				dense: 'boolean'
			}
		},

		percent: {
			label: 'Percent',
			parameters: {
				horizontal: 'boolean',
				type: 'radio|total:current/total,total_inverse:1-(current/total),growth:(current-previous)/previous,previous:current/previous,next:current/next'
			}
		},

		abs: {
			label: 'Absolute Value',
			parameters: {}
		},

		/*
		band: {
			label: 'Banding',
			parameters: {
				banding: 'banding'
			}
		},
		*/

	},


	getInitialState: function() {
		var metricType = 'Standard',
			parsed = IdUtils.parse(this.props.defaults.id),
			aggregate = IdUtils.aggregate(),
			metric = '',
			fact = '',
			expression = '',
			partitions = this.props.defaults.column ? this.props.defaults.column.partitions : []

		switch(IdUtils.type()) {
			case 'fact':
				if (parsed.lag) {
					metricType = 'Lag Time'
				} else {
					metricType = 'Count' + (aggregate == 'Unique' ? ' Unique' : '')
				}
				fact = IdUtils.raw()
			break;
			default: case 'metric':
				metricType = 'Standard'
				metric = IdUtils.raw()
			break;
			case 'fx':
				metricType = 'fx'
				expression = IdUtils.raw()
			break;
		}

		if (this.props.defaults.fx) {
			metricType = 'fx'
			expression = IdUtils.raw()
		}

		return {
			parsed: parsed,
			metric: metric,
			fact: fact,
			expression: expression,
			type: IdUtils.type(),
			aggregate: aggregate,
			filter: parsed.filter || [],
			label: parsed.label || '',
			dimension: (aggregate == 'unique') ? parsed['unique'][0] : '',
			transforms: IdUtils.transforms(),
			addAsNew: false, //'band' in IdUtils.transforms(),
			openLast: false,
			metricType: metricType,
			format: parsed['f'] ? parsed['f'][0] : '',
			decimals: parsed['f'] ? (parsed['f'][1] || 0) : '',
			partitions: partitions
		}
	},


	componentDidMount: function() {

		LeoKit.dialog($('#dialogBox'), {
				Save: this.applyChanges,
				close: this.context.close_dialog
			},
			'Metric Advanced',
			this.context.close_dialog
		)

		$('.transforms-accordion').sortable({
			axis:'y',
			update: () => {
				var sortedIndexes = $('.transforms-accordion').sortable('toArray', { attribute: 'data-index' } );
				var transforms = this.state.transforms;
				var newOrder = [];
				for(var i=0;i<sortedIndexes.length;i++) {
					newOrder.push(transforms[sortedIndexes[i]])
				}
				this.setState({ transforms: newOrder })
			}
		});
	},


	changeAddAsNew: function(checked) {
		this.setState({ addAsNew: checked == 1 });
	},


	addTransform: function() {
		var transforms = this.state.transforms
		var transform = {}
		transform[this.refs.addTransform.value] = (this.refs.addTransform.value == 'percent' ? ['total', (this.state.partitions && this.state.partitions.length > 0 ? 'horizontal' : undefined)] : [])
		transforms.push(transform)
		this.setState({ transforms: transforms, openLast: true  })
	},


	bandingChanged: function(index, value) {
		var transforms = this.state.transforms;
		var transform = transforms[index];

		var banding = value;
		var params = [banding];

		for(var i in transform) {
			transform[i] = params;
		}

		transforms[index] = transform;

		this.setState({transforms:transforms})
	},


	transformChanged: function(index) {
		var transformElement = $(this.refs['transform_'+index])
			,transforms = this.state.transforms
			,transform = transforms[index]
			,params = []

		transformElement.find('input').each(function() {
			if ($(this).is(':checked') && $(this).val() != '') {
				params.push($(this).val())
			}
		})

		for(var i in transform) {
			/* allow them to unselect
			if (i == 'percent' && this.state.partitions.length > 0 && params.indexOf('horizontal') == -1) {
				params.unshift('horizontal')
			}*/
			transform[i] = params
		}

		transforms[index] = transform
		this.setState({transforms:transforms})
	},


	removeTransform: function(index) {
		var transforms = this.state.transforms;
		transforms.splice(index, 1);
		this.setState({ transforms: transforms });
	},


	toggleTransform: function(index, e) {
		$(e.target).closest('div').toggleClass('closed');
		if (index == this.state.transforms.length -1) {
			this.setState({ openLast: false });
		}
	},


	applyChanges: function(form) {

		/*
		'Standard': ['metric', 'aggregate', 'filter'],
		'fx': ['expression', 'format', 'decimals'],
		'Lag Time': ['period', 'start', 'end', 'filter', 'format', 'decimals'],
		'Count': ['fact', 'filter'],
		'Count Unique': ['fact', 'dim', 'filter']
		*/
		var errors = [],
			column = {}

		if (this.refs.formMetric) {
			var metric = (typeof this.refs.formMetric.value === 'function') ? this.refs.formMetric.value() : typeof this.refs.formMetric.value
			if (!metric) {
				errors.push('Metric is required');
			} else {
				column[metric] = ''
			}
		}

		if (this.refs.formFact) {
			var fact = (typeof this.refs.formFact.value === 'function') ? this.refs.formFact.value() : typeof this.refs.formFact.value
			if (!fact) {
				errors.push('Fact is required');
			} else {
				column[fact] = ''
			}
		}

		if (this.refs.formExpression) {
			var expression = this.refs.formExpression.value()
			if (!expression) {
				errors.push('Expression is required');
			} else {
				column['fx(' + expression + ')'] = ''
			}
		}

		if (this.refs.formPeriod) {
			if (!this.refs.formstartDate.value()) {
				errors.push('Start Date is required');
			}
			if (!this.refs.formendDate.value()) {
				errors.push('End Date is required');
			}
			column['lag'] = [
				this.refs.formPeriod.value,
				this.refs.formendDate.value(),
				this.refs.formstartDate.value()
			]
		}

		if (this.refs.formAggregate) {
			column[this.refs.formAggregate.value] = ''
		}

		if (this.refs.formFormat) {
			if (this.refs.formDecimals) {
				column['f'] = [
					this.refs.formFormat.value,
					this.refs.formDecimals.value
				]
			} else {
				column['f'] = [
					this.refs.formFormat.value
				]
			}
		}

		if (this.state.metricType === 'Count') {
			column['count'] = ''
		}

		if (this.refs.formDimension) {
			var dimension = this.refs.formDimension.value()
			if (!dimension) {
				errors.push('Dimension is required');
			} else {
				column['unique'] = [dimension]
			}
		}

		if (errors.length > 0) {
			window.messageModal(errors.join('<br />'));
			return;
		}

		if (this.refs.formFilters && this.refs.formFilters.value) {
			//never called?
			column['filter'] = [this.refs.formFilters.value];
		} else if (this.refs.formFilters && this.refs.formFilters.state) {
			column['filter'] = []
			for(var i in this.refs.formFilters.state.filters) {
				var filter = this.refs.formFilters.state.filters[i]
				if (filter.value.length > 1) {
					column['filter'].push(filter.id + ' ' + (filter.comparison || 'in') + " ['" + filter.value.join("','") + "']")
				} else {
					column['filter'].push(filter.id + '' + (filter.comparison || '=') + "'" + filter.value.join("','") + "'")
				}
			}
		}

		for(var i=0;i<this.state.transforms.length;i++) {
			for(var j in this.state.transforms[i]) {
				column[j] = this.state.transforms[i][j];
			}
		}

		if (this.refs.formLabel.value) {
			column['label'] = [this.refs.formLabel.value];
		}

		var id = IdUtils.build(column)

		if (this.props.defaults.params && this.props.defaults.params.saveAdvancedMetric) {

			this.props.defaults.params.saveAdvancedMetric(id)

		} else if (this.props.inChartBuilder) {

			this.props.updateMetricAdvanced(this.props.defaults.params.column_index, id);

		} else {

			var type = (id.indexOf('|band') !== -1 ? 'dimension' : 'metric');

			if (this.refs.metricPartitions && this.refs.metricPartitions.state.partitions) {
				var partitions = this.refs.metricPartitions.state.partitions.map((partition) => {
					return partition.id
				})
				id = { id: id, partitions: partitions }
			}

			if (this.props.defaults.editing && (this.props.defaults.iterator || this.props.defaults.iterator === 0) && form.replace == 1) {
				if (id != this.props.defaults.id) {
					this.props.sendToPivot({
						where: this.props.defaults.editing,
						replace: this.props.defaults.iterator,
						type: type,
						id: id
					});
				}
			} else {
				this.props.sendToPivot({
					where: 'row', //column, actually
					type: type,
					id: id
				});
			}
		}

		this.context.close_dialog();
	},


	aggregateChanged: function() {
		this.setState({ aggregate: this.refs.formAggregate.value })
	},


	switchMetricType: function(e) {
		this.setState({ metricType: e.currentTarget.value })
	},


	fieldPicked: function(column) {
		if (this.state.metricType != 'fact' && column.type == 'fact') {
			this.setState({
				type: 'fact',
				metricType: 'Count',
				metric: null,
				fact: column.id
			});
		}

		if (this.state.metricType != 'metric' && column.type == 'metric') {
			this.setState({
				type: 'metric',
				metricType: 'Standard',
				metric: column.id,
				fact: null
			});
		}
	},


	selectedFormat: function(e) {
		this.setState({ format: e.currentTarget.value })
	},


	partitionsChanged: function(partitions) {
		var transforms = this.state.transforms
		if (partitions.length > 0) {
			transforms = transforms.map((transform) => {
				if (transform.percent) {
					if (transform.percent.indexOf('horizontal') == -1) {
						transform.percent.unshift('horizontal')
					}
				}
				return transform
			})
		}
		this.setState({
			partitions: partitions,
			transforms: transforms
		})
	},


	render: function() {
		var thisComponent = this;

		var defaults = {};
		//var aggregates = this.aggregates[this.state.type || 'metric'];
		var aggregates = this.aggregates['metric'];

		var defaultAggregate = thisComponent.state.aggregate || (this.state.metricType == 'Lag Time' ? 'avg' : 'sum')

		return (<div>
			<div id="dialogBox" className="theme-form">

				<div className="req-parameter">
					<label>Metric Type</label>
					<select onChange={this.switchMetricType} value={this.state.metricType}>
					{
						Object.keys(this.metricTypes).map(function(type, key) {
							return <option key={key} value={type}>{type}</option>
						})
					}
					</select>
				</div>

				{
					this.metricTypes[this.state.metricType].map(function(element, key) {

						switch(element) {
							case 'metric':
								return <div key="metric" className="req-parameter">
									<label>Select Metric</label>
									<FieldPicker ref="formMetric" type="input" field="metric" value={thisComponent.state.metric} onChange={thisComponent.fieldPicked} />
								</div>
							break;

							case 'fact':
								return <div key="fact" className="req-parameter">
									<label>Select Fact</label>
									<FieldPicker ref="formFact" type="input" field="fact" value={thisComponent.state.fact} />
								</div>
							break;

							case 'expression':
								return <div key="expression" className="req-parameter">
									<label>Expression</label>
									{/*<FieldPicker ref="formExpression" name="column_builder_expression" type="div" field="metric" expression={thisComponent.state.expression} />*/}

									<ExpressionBuilder ref="formExpression" name="column_builder_expression" defaultValue={thisComponent.state.expression || ''} />

								</div>
							break;

							case 'aggregate':
								return <div key="aggregate" className="req-parameter">
									<label>Aggregate</label>
									<select ref="formAggregate" value={defaultAggregate} onChange={thisComponent.aggregateChanged}>
										{Object.keys(aggregates).map(function(aggregate, index) {
											return <option value={aggregate} key={index}>{aggregates[aggregate]}</option>
										})}
									</select>
								</div>
							break;

							case 'dimension':
								return <div key="dimension" className="req-parameter">
									<label>Select Dimension</label>
									<FieldPicker ref="formDimension" type="input" field="dimension" value={thisComponent.state.dimension} />
								</div>
							break;

							case 'filter':
								return (<div key="filter" className="">
									<label>Filters</label>
									<MetricFiltering ref="formFilters" filter={thisComponent.state.filter} />
								</div>)
							break;

							case 'partitions':
								return (<div key="partitions" className="">
									<label>Partitions</label>
									<MetricPartitioning ref="metricPartitions" value={thisComponent.state.partitions} onChange={thisComponent.partitionsChanged} />
								</div>)
							break

							case 'format':
								return <div key="format" className="req-parameter">
									<label>Format</label>
									<select ref="formFormat" defaultValue={thisComponent.state.format} onChange={thisComponent.selectedFormat}>
									{
										Object.keys(thisComponent.formats).map(function(format, index) {
											return <option key={index} value={format}>{thisComponent.formats[format]}</option>
										})
									}
									</select>
								</div>
							break;

							case 'date_format':
								return <div key="date_format" className="req-parameter">
									<label>Format</label>
									<select ref="formFormat" defaultValue={thisComponent.state.format} onChange={thisComponent.selectedFormat}>
									{
										Object.keys(thisComponent.date_formats).map(function(format, index) {
											return <option key={index} value={format}>{thisComponent.date_formats[format]}</option>
										})
									}
									</select>
								</div>
							break;

							case 'decimals':
								{
									return (function() {
										switch(thisComponent.state.format) {
											case 'float': case 'money': case 'percent': case 'numeric':
												return <div key="decimals" className="req-parameter">
													<label>Decimals</label>
													<select ref="formDecimals" defaultValue={thisComponent.state.decimals}>
													{
														thisComponent.decimals.map((decimals, index) => {
															return <option key={index} value={decimals}>{decimals}</option>
														})
													}
													</select>
												</div>
											break;
											default:
												return false;
											break;
										}
									})()
								}
							break;

							case 'period':
								var period = thisComponent.state.parsed.lag ? thisComponent.state.parsed.lag[0] : ''
								return <div key="period" className="req-parameter">
									<label>Time Period</label>
									<select ref="formPeriod" defaultValue={period}>
									{
										thisComponent.periods.map((period, index) => {
											return <option key={index} value={period}>{period}</option>
										})
									}
									</select>
								</div>
							break;

							case 'start':
							case 'end':
								var date_dim = thisComponent.state.parsed.lag ? thisComponent.state.parsed.lag[element == 'start' ? 2 : 1] : ''
								return <div key={element} className="req-parameter">
									<label>{element + ' Date'}</label>
									<FieldPicker ref={'form'+element+'Date'} type="input" field="date" value={date_dim} />
								</div>
							break;
						}
					})
				}

				<div className="">
					<label>Label</label>
					<input type="text" ref="formLabel" defaultValue={thisComponent.state.label} />
				</div>

				{
					this.props.defaults.editing && !this.props.inChartBuilder && (this.props.defaults.iterator || this.props.defaults.iterator === 0)
					? <div className="req-parameter">
						<label></label>
						<div>
							<label><input type="radio" name="replace" value="1" checked={!this.state.addAsNew ? "checked" : false} onChange={this.changeAddAsNew.bind(null, 0)} />Replace Column</label>
							<label><input type="radio" name="replace" value="0" checked={this.state.addAsNew ? "checked" : false} onChange={this.changeAddAsNew.bind(null, 1)} />Add As New Column</label>
						</div>
					</div>
					: false
				}

				<div className="">
					<label>Transforms</label>
					<div>
						<div className="transforms-accordion">
						{
							thisComponent.state.transforms.map(function(transform, index) {

								var transform_name = '';
								for(transform_name in transform) {
									break
								}

								var params = transform[transform_name]
								if (typeof params == 'string') {
									params = [params]
								}

								return <div ref={'transform_'+index} key={'transform_'+index+'_'+transform_name} data-index={index}>
									<div className={"accordion-heading"+(thisComponent.state.openLast && (index == thisComponent.state.transforms.length-1) ? '' : ' closed') } onClick={thisComponent.toggleTransform.bind(thisComponent, index)}>
										<span>{'|'+transform_name+(params.length>0?':'+params.join(':'):'')}</span>
										<i className="icon-cancel" onClick={thisComponent.removeTransform.bind(null, index)}></i>
									</div>
									<div>
										{
											Object.keys(thisComponent.funcs[transform_name].parameters).length == 0
											? <div className="theme-form-row"><label>This transform has no options</label></div>
											: false
										}

										{
											Object.keys(thisComponent.funcs[transform_name].parameters).map(function(parameter, key) {

												var parts = thisComponent.funcs[transform_name].parameters[parameter].split('|');
												var input = parts.shift();

												return <div className="theme-form-row" key={key}>
													<label>{parameter}</label>
													{(function() {
														switch (input) {
															default:
															case 'radio':
																return <div>
																	{
																		parts[0].split(',').map(function(part, ndex) {
																			var x = part.split(':');
																			return <label className={x[1] ? 'display-block' : ''} key={ndex}><input type="radio" defaultChecked={params.indexOf(x[0])!=-1 || (x[0]=='') || (x[0]=='total')} name={transform_name+'_'+parameter} value={x[0]} onChange={thisComponent.transformChanged.bind(null, index)} />{x[0]+(x[1]?' '+x[1]:'')}</label>
																		})
																	}
																</div>
															break;

															case 'boolean':
																return <input type="checkbox" name={transform_name+'_'+parameter} onChange={thisComponent.transformChanged.bind(null, index)} checked={params.indexOf(parameter)!=-1} value={parameter} />
															break;

															//case 'banding':
															//	return <Banding ref={"bandingBands"+index} required="true" defaults={{preset:null, every:5, beginAt:0, bandCount:5, custom:'', column: true}} index={index} bandingChanged={thisComponent.bandingChanged} />
															//break;

														}
													})()}
												</div>

											})

										}

									</div>
								</div>
							})
						}
						</div>
						<div>
							<i className="icon-plus-circled"></i>
							<select ref="addTransform" onChange={this.addTransform} value="">
								<option>add new</option>
								{Object.keys(this.funcs).map(function(func, index) {
									return <option value={func} key={index}>{func}</option>
								})}
							</select>
						</div>
					</div>
				</div>
			</div>
		</div>)

	}


});
