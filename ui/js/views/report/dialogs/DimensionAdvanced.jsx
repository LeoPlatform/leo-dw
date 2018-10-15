var React = require('react');

var FieldPicker = require('../fieldPicker.jsx');
var Banding = require('../banding.jsx');

var IdUtils = require('../../../utils/IdUtils');

var MultiSelect = require('../../common/multiSelect.jsx');

var ReportStore = require('../../../stores/ReportStore');
//var ReportFilterActions = require('../../../actions/ReportFilterActions');

module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired
	},


	date_formats: {
		humanized: 'humanized',
		numeric: 'numeric'
	},


	funcs: {

		Standard: {
			parameters: {
				Dimension: 'dimension',
				Label: 'label'
			},
			syntax: '{dimension}|label:{label}'
		},

		Banding: {
			parameters: {
				Metric: 'metric',
				Banding: 'banding'
			},
			syntax: '{metric}|band:{banding}'
		},

		Group_Values: {
			parameters: {
				Dimension: 'dimension',
				Groups: 'groups'
			},
			//syntax: '{dimension}|group:[{in:["{values}"],label:"{group_label}"},{else:"{label}"}]'

			//{groups} = [{group}...,{else}]

			//{group} = {in:["{values}"],label:"{group_label}"}

			//{else} = {else:"{label}"}

			//values = "value", "value"...

			syntax: '{dimension}|group:{groups}'
		},

		/*
		Group_by_Date: {
			parameters: {
				Dimension: 'dimension',
				Group: {
					Condition: ['=', '>', '>=', '<', '<=', '!='],
					Date_Type: ['@today', '@yesterday', '@tomorrow'],
					Group_Label: 'label',
				},
				Else_Label: 'label',
			},
			syntax: '{dimension}|group:[{"{condition}":"{date_type}",label:"{group_label}"},{else:"{label}"}]'
			//syntax: '{dimension}|group:[{{condition}:{date_type},label:{group_label}},{else:{label}}]'
		},
		*/

		/*
		Normalize_Date: {
			parameters: {
				Select_Fact: 'fact',
				//Aggregate: ['sum', 'avg', 'min', 'max'], //'aggregate',
				Time_Period: ['days', 'weeks', 'months', 'quarters', 'years'],
				Start_Date: 'date',
				End_Date: 'date',
				Filters: 'filters',
				Format: 'date_format',
				Banding: 'banding',
				Label: 'label',

				Transforms: 'transforms'
			},
			syntax: '{fact}|lag:{time_period}:{end_date}:{start_date}|band:{banding}|f:{date_format}|label:{label}|filters:{filters}'

			//"f_user_signup|lag:months:d_user$d_cancel_date.d_date:d_user$d_first_bill_invoice_date.d_date|band:0,1,2,3,4-6,7-9,10-12,13-15,16-18,19+|f:percent|label:Cancel Month"

		}

		/*
		Normalize_Date: {
			parameters: {
				Select_Fact: 'fact',
				Dimension_to_Cohort: 'dimension',
				Dimension_to_Normalize: 'dimension',
				Normalize_Timeframe: ['days', 'weeks', 'months', 'quarters', 'years'],
				Aggregate: ['sum', 'avg', 'min', 'max'], //'aggregate',
				Banding: 'banding'
			},
			syntax: '{fact}|lag:{normalize_timeframe}:{dimension_to_cohort}:{dimension_to_normalize}|{aggregate}|band:{banding}'
		}*/

	},


	getInitialState: function() {

		var id = this.props.defaults.id || '';

		var column = IdUtils.parse(id)
		var raw = IdUtils.raw()
		var type = IdUtils.type()

		//default metric
		var metrics = ReportStore.getMetrics();
		var metric = (metrics.length == 1) ? IdUtils.raw(metrics[0]) : ''

		var func = 'Standard',
			group = [{'in':[],'label':''},{'else':''}]

		if (column.band) {
			func = 'Banding'
		} else if (column.group) {
			func = 'Group_Values'
			try {
				group = (new Function('return '+column.group))()
			} catch(e) {
				console.log('Error: '+e);
			}
		}

		return {
			dimension: (type === 'attribute' ? raw : ''),
			metric: (type === 'metric' ? raw : metric),
			fact: (type === 'fact' ? raw : ''),
			column: column,
			group: group,
			suggestions: [],

			func: func,
			//metric: metric,
			//band: column.band || ''
		}
	},


	componentDidMount: function() {

		LeoKit.dialog($('#dialogBox'), {
				Save: this.applyChanges,
				close: this.context.close_dialog
			},
			'Dimension Advanced',
			this.context.close_dialog
		)

	},


	applyChanges: function() {
		var formData = $(this.refs.advancedForm).serializeObject(),
			id = this.funcs[this.state.func].syntax,
			errors = []

		if (formData.dimension == '') {
			errors.push('Dimension is required.')
		}

		if (formData.metric == '') {
			errors.push('Metric is required.')
		}

		if (formData.groups_label && !formData.groups_in) {
			errors.push('Groups Values is required.')
		}

		if (formData.groups_label && formData.groups_label.length == 1 && formData.groups_label[0] == '') {
			errors.push('Groups Label is required.')
		}

		if (formData.groups_else === '') {
			errors.push('Groups Else Label is required.')
		}

		if (errors.length > 0) {
			window.messageModal(errors.join('<br/>\n'));
			return;
		}

		if (formData.groups_in && formData.groups_label && formData.groups_else) {
			var groups = []
			formData.groups_in.forEach(function(groups_in, index) {
				if (typeof groups_in == 'string') {
					groups_in = [groups_in]
				}
				groups.push('{in:["'+groups_in.join('","')+'"],label:"'+formData.groups_label[index]+'"}')
			})
			groups.push('{else:"'+formData.groups_else+'"}')
			formData.groups = '['+groups.join(',')+']'
		}

		for(var data in formData) {
			id = id.replace('{'+data+'}', formData[data])
		}

		//remove empty fields
		id = id.replace(/\|(f|label|filters):\|/g, '|').replace(/\|(f|label|filters):$/g, '')

		//add to report
		if (this.props.defaults.editing) {
			if (id != this.props.defaults.id) {
				this.props.sendToPivot({
					where: this.props.defaults.editing,
					replace: this.props.defaults.iterator,
					type: 'dimension',
					id: id
				});
			}
		} else {
			this.props.sendToPivot({
				where: this.props.editing, //'row', //column, actually
				type: 'dimension',
				id: id
			});
		}

		this.context.close_dialog();
	},


	changeFunc: function(e) {
		this.setState({func: e.currentTarget.value})
	},


	addGroup: function() {
		var group = this.state.group
		var elseLabel = group.pop();
		group.push({'in':[],'label':''})
		group.push(elseLabel)
		this.setState({group:group})
	},


	updateDimension: function(column) {
		this.setState({ dimension: column.id })
	},


	render: function() {
		var thisComponent = this;
		var defaults = {};
		var group = this.state.group

		return (<div>
				<div id="dialogBox">

					<form ref="advancedForm" className="theme-form" >

						<div className="req-parameter">
							<label>Function</label>
							<select onChange={this.changeFunc} defaultValue={this.state.func}>
							{
								Object.keys(this.funcs).map(function(func) {
									return <option key={func} value={func}>{func.replace(/_/g, ' ')}</option>
								})
							}
							</select>
						</div>

						{
							Object.keys(this.funcs[this.state.func].parameters).map((param, key) => {

								var subparams = this.funcs[this.state.func].parameters[param]

								switch(subparams) {
									case 'dimension':
										return <div className="req-parameter" key={key}>
											<label>{param.replace(/_/g,' ')}</label>
											<FieldPicker ref="selectDimension" type="input" name={param.toLowerCase()} field="dimension" defaultValue={thisComponent.state.dimension} onChange={this.updateDimension} />
										</div>
									break;

									case 'label':
										return <div className="" key={key}>
											<label>{param.replace(/_/g,' ')}</label>
											<input ref="label" type="text" name="label" defaultValue={thisComponent.state.column.label} />
										</div>
									break;

									case 'metric':
										return <div className="req-parameter" key={key}>
											<label>{param.replace(/_/g,' ')}</label>
											<FieldPicker ref="selectMetric" type="input" field="metric" name="metric" defaultValue={thisComponent.state.metric} />
										</div>
									break;

									case 'banding':
										return <div className="req-parameter" key={key}>
											<label>{param.replace(/_/g,' ')}</label>
											<Banding ref="banding" band={this.state.column.band} name="banding" />
										</div>
									break;

									case 'fact':
										return <div className="req-parameter" key={key}>
											<label>{param.replace(/_/g,' ')}</label>
											<FieldPicker ref="selectFact" type="input" field="fact" name="fact" defaultValue={thisComponent.state.fact} />
										</div>
									break;

									case 'aggregate':
										return <div className="req-parameter" key={key}>
											<label>{param.replace(/_/g,' ')}</label>
											<select name="aggregate">
											{
												['sum', 'avg', 'max', 'min'].map((ag) => {
													return <option key={ag} value={ag}>{ag}</option>
												})
											}
											</select>
										</div>
									break;

									case 'filters':
										return <div className="" key={key}>
											<label>Filters</label>
											<input type="text" ref="formFilters" name="filters" defaultValue={thisComponent.state.filters} />
										</div>
									break;

									case 'date_format':
										return <div key={key} className="req-parameter">
											<label>Format</label>
											<select ref="formFormat" name="date_format" defaultValue={thisComponent.state.format} onChange={thisComponent.selectedFormat}>
											{
												Object.keys(thisComponent.date_formats).map(function(format, index) {
													return <option key={index} value={format}>{thisComponent.date_formats[format]}</option>
												})
											}
											</select>
										</div>
									break;

									case 'start':
									case 'end':
									case 'date':
										//var date_dim = thisComponent.state.parsed.lag ? thisComponent.state.parsed.lag[element == 'start' ? 2 : 1] : ''
										return <div key={key} className="req-parameter">
											<label>{param.replace(/_/g,' ')}</label>
											<FieldPicker type="input" field="date" defaultValue="" name={param.toLowerCase()} />
										</div>
									break;

									case 'groups':

										return <div className="theme-form-row req-parameter" key={key}>
											<label>{param.replace(/_/g,' ')}</label>
											<div>
											{
												group.map((group, key2) => {
													return (
														typeof group['in'] == 'object'
														? <div key={key2}>
															<div className="theme-form-row req-parameter">
																<label>Values</label>
																<MultiSelect name={'groups_in['+key2+']'} defaultValue={group['in']} autoCompleteId={this.state.dimension} />
															</div>
															<div className="theme-form-row req-parameter">
																<label>label</label>
																<input name={'groups_label['+key2+']'} defaultValue={group.label} />
															</div>
														</div>
														: <div key="else">
															<button type="button" className="theme-button" onClick={this.addGroup}>add group</button>
															<div className="theme-form-row req-parameter">
																<label>else label</label>
																<input name={'groups_else'} defaultValue={group.else} />
															</div>
														</div>
													)
												})
											}

											</div>
										</div>

									break;

									default:

										if ($.isArray(subparams)) {

												return <div className="theme-form-row req-parameter" key={key}>
													<label>{param.replace(/_/g,' ')}</label>
													<select name={param.toLowerCase()}>
													{
														subparams.map((option) => {
															return <option key={option} value={option}>{option}</option>
														})
													}
													</select>
												</div>

										} else if (param == 'Group') {

											return <div className="theme-form-row req-parameter" key={key}>
												<label>{param}</label>
												<div>
												{
													Object.keys(this.funcs[this.state.func].parameters[param]).map((label, index, fields) => {

														var field = this.funcs[this.state.func].parameters[param][label]

														if (typeof field == 'object') {

															return <div className="theme-form-row req-parameter" key={index}>
																<label>{label.replace(/_/g,' ')}</label>
																<select name={label.toLowerCase()}>
																	{
																		field.map(function(option, optionIndex) {
																			return <option key={optionIndex} value={option}>{option}</option>
																		})
																	}
																</select>
															</div>

														} else {

															switch(field) {
																case 'label':
																	return <div className="theme-form-row req-parameter" key={index}>
																		<label>{label.replace(/_/g,' ')}</label>
																		<input name={label.toLowerCase()} />
																	</div>
																break;

																case 'values':
																	return <div className="theme-form-row req-parameter" key={index}>
																		<label>{label.replace(/_/g,' ')}</label>
																		<select name={label.toLowerCase()}></select>
																	</div>
																break;
															}

														}

													})
												}
												</div>
												{
													param == 'Groups'
													? <button className="theme-button" type="button">add group</button>
													: false
												}
											</div>

										}
									break;
								}

							})
						}

					</form>

				</div>
			</div>
		);

	}


});
