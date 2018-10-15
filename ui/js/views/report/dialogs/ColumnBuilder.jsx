var React = require('react');
var WebAPI = require('../../../utils/WebAPI');

var ReportActions = require('../../../actions/ReportActions');
var FieldsActions = require('../../../actions/FieldsActions');

var FieldPicker = require('../fieldPicker.jsx');

module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired,
		sendToPivot: React.PropTypes.func.isRequired
	},


	calcs: {

		virtual: {
			name: 'Virtual Metric',
			type: 'metric',
			parameters: {
				expression:'expression_metric*',
				format:'format*',
				filter: 'expression_field'
			}
		},

		/*
		math: {
			name: 'Calculated Field',
			type: 'metric',
			parameters: {
				expression:'expression_aggregated*',
				format:'format*'
			}
		},
		*/

		/*
		lag: {
			name: 'Lag Time',
			type: 'metric',
			parameters: {
				start_date: 'lag_date*',
				end_date: 'lag_date*',
				//expression:'lag_dates*', //we build this: start date, end date
				filter: 'expression_field'
			}
		},
		*/

		/*
		rank: {
			name: 'Rank',
			type: 'metric',
			parameters: {
				order:[{
					column:'field*',
					direction:'direction*'
				}],
				partition:'field',
			}
		},

		percentage: {
			name: 'Percentage',
			type: 'metric',
			parameters: {
				field: 'field*',
				order:[{
					column:'field*',
					direction:'direction*'
				}],
				partition:'field',
				prior: 'denominator*',
				inverse: 'boolean',
				cumulative: 'boolean',
				//axis: 'axis'
			}
		},

		cumulative: {
			name: 'Cumulative',
			type: 'metric',
			parameters: {
				field:'field*',
				order:[{
					column:'field*',
					direction:'direction*'
				}],
				partition:'field',
				populate_zero:'boolean',
				prior: 'denominator*',
				inverse: 'boolean',
				percent: 'boolean',
				//axis: 'axis'
			}
		}
		*/

	},


	getInitialState: function() {
		return {
			func: this.props.defaults.calc || (this.props.defaults.columnType == 'metric' ? Object.keys(this.calcs)[0] : Object.keys(this.calcs)[1])
		};
	},


	componentDidMount: function() {

		var defaults = this.props.defaults

		var buttons = {
			Save: this.save,
			close: this.context.close_dialog
		}

		if (defaults && defaults.id) {
			buttons.Delete = this.deleteColumn.bind(null, defaults.parent.id)
		}

		LeoKit.dialog($('#columnBuilder'),
			buttons,
			'Column Builder',
			this.context.close_dialog
		)

	},


	inputBlur: function() {
		$(document.body).removeClass (function (index, css) {
			return (css.match(/(^|\s)column-builder-picking-\S+/g) || []).join(' ');
		});
		$('.column-builder-field-target').removeClass('column-builder-field-target');
	},


	save: function(formData) {

		String.prototype.capitalize = function(){
			return this.replace(/\b\w/g, function (m) {
				return m.toUpperCase();
			});
		};

		var errors = [];

		//check that required fields are completed
		$('#columnBuilder div[contentEditable], #columnBuilder input[type="text"]').each(function() {
			if (
				(
					($(this).is('input[type="text"]') && $.trim($(this).val()) == '')
					|| ($(this).is('div[contentEditable]') && $.trim($(this).html()) == '')
				)
				&& $(this).closest('.theme-form-row').is('.req-parameter')
			) {
				errors.push($(this).closest('.theme-form-row').find('label').text().capitalize()+' is required');
			}

			if ($(this).hasClass('column-builder-error')) {
				errors.push($(this).closest('.theme-form-row').find('label').text().capitalize()+' is not valid');
			}
		})

		if (errors.length > 0) {

			window.messageModal(errors.join('<br />'));
			return;

		} else {
			var key = formData.column_builder_calc
			var type = formData.column_builder_type  //$('#column_builder_type').val();
			var label = $.trim(formData.column_builder_label) //$.trim($('#column_builder_label').val());
			var parent = $.trim(formData.column_builder_parent) //$.trim($('#column_builder_parent').val());
			var description = this.refs.columnDescription.value;
			var prefix = (key == 'virtual' || key == 'lag' ? 'c_' : 'w_');

			var calc_id = (this.props.defaults.id
				? this.props.defaults.id
				: parent+'.'+prefix+label.toLowerCase().replace(/[^\w]/g, '_')
			);

			var template = $.extend(true, {},  this.calcs[key]);

			var calc = {
				calc: key,
				type: type,
				label: label,
				id: calc_id,
				description: description
			};

			function column_builder_extract(parent, parameters, index) {

				if (typeof parameters == 'object') {
					var child = (typeof index != 'undefined' ? parent[index] = parameters : parent);
					$.each(parameters, function(index, value) {
						column_builder_extract(child, value, index);
					});
				} else {

					var input = $('[name="column_builder_expression"]') //$(formElements['column_builder_'+index]); // $('#column_builder_'+index);

					if (input.length == 0) {
						input = $('[name="column_builder_'+index+'"]');
					}

					if (input.is('[contentEditable]')) {
						parent[index] = input.text().replace(/\s+/g, ' ');
					} else if (input.is('[type=checkbox]')) {
						parent[index] = (input.is(':checked') ? '1': '') ;
					} else if (input.is('[type=radio]')) {
						parent[index] = input.filter(':checked').val();
					} else {
						parent[index] = $.trim(input.val());
					}

				}
			}

			column_builder_extract(calc, template.parameters);

			if (calc.calc == 'lag') {
				calc.expression = (calc.end_date + '-' + calc.start_date)
				calc.calc = 'virtual';
				//delete(calc.start_date);
				//delete(calc.end_date);
			}

			var put = {};
			put[parent] = { put: calc };

			//console.log('put', put)

			var thisComponent = this;

			var addToPivot = ($('#column_builder_add_to_top').is(':checked') ? 'row' : ($('#column_builder_add_to_right').is(':checked') ? 'column' : '')); //rows are columns :(

			if (this.props.defaults && this.props.defaults.id) {
				FieldsActions.updateDerivedField(this.props.defaults.id, type, put);
			} else {
				FieldsActions.addField(type, put);
			}

			setTimeout(function() {
				var id = calc.id + (key == 'virtual' ? '|sum' : '');
				if (addToPivot) {
					thisComponent.context.sendToPivot({where:addToPivot,type:type, id:id, calc:calc});
				} else {
					ReportActions.repivot();
				}
			}, 1000);

			this.context.close_dialog();
		}
	},


	deleteColumn: function() {
		if (this.props.defaults && this.props.defaults.id) {
			var put = {
				[this.props.defaults.parent.id]: {
					['delete']: [this.props.defaults.id]
				}
			};
			FieldsActions.deleteField(this.props.defaults.id, put);
			this.context.close_dialog();
		}
	},


	clearField: function(e) {
		$(e.target).prev('input').val('');
		$(e.target).hide();
	},


	triggerSubmit: function(e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			this.save();
		}
	},


	changeFunction: function(e) {
		this.setState({ func: e.target.value });
	},


	render: function() {
		var thisComponent = this;

		/*
		if (this.props.defaults.calc == this.state.func) {
			var defaults = this.props.defaults;
		} else {
			var defaults = {};
		}
		*/

		var defaults = this.props.defaults;

		var column_id = this.props.defaults.id;
		var parent_id = this.props.defaults.parent ? this.props.defaults.parent.id : this.props.defaults.parent_id;

		var formats = {
			base: 'Base (raw output)',
			'float': 'Float',
			money: 'Money',
			count: 'Count',
			'int': 'Integer'
		};

		var isDeprecated = !this.calcs[this.state.func];

		return (<div>
			<div id="columnBuilder">

					<div ref="columnBuilderForm" className={"theme-form "+this.props.defaults.type+"-builder"}>

						<input type="hidden" name="column_builder_type" value={this.props.defaults.columnType || this.props.defaults.type} />
						<input type="hidden" name="column_builder_parent" value={parent_id} />

						{
							isDeprecated
							? false
							:
							<div className="theme-form-row req-parameter">
								<label>Function</label>
								<select id="column_builder_calc" name="column_builder_calc" onFocus={this.inputBlur} defaultValue={this.state.func} ref="defaultInput" onChange={this.changeFunction}>
									{Object.keys(thisComponent.calcs).map(function(key, index) {
										return (<option key={index} value={key}>{thisComponent.calcs[key].name}</option>)
									})}
								</select>
							</div>
						}

						{
							isDeprecated
							? false
							:

							Object.keys(this.calcs[this.state.func].parameters).map(function(key, index) {
								var parameters = this.calcs[this.state.func].parameters[key];

								if (typeof parameters == 'string') {
									var temp = {}
									temp[key] = parameters
									temp = [ temp ];
									parameters = temp;
								}

								return Object.keys(parameters[0]).map(function(subkey, index) {

									var label = key + (key == subkey ? '' : ' ' + subkey);
									switch(label) {
										case 'order column': 	label = 'order by';				break;
										case 'order direction': label = 'direction';			break;
										case 'partition':		label = 'partition by';			break;
										case 'prior':			label = 'denominator';			break;
										case 'populate_zero':	label = 'populate zero rows';	break;
									}

									var parameter = parameters[0][subkey];

									var input = parameter.split(/\W/)[0];
									var required = parameter.slice(-1) == '*';

									return (
								<div key={index} className={"theme-form-row"+(required ? " req-parameter" : '')}>
									<label>{label}</label>

									{(function() {

										switch(input) {
											case 'expression_metric': case 'expression_aggregated': case 'expression_field':
												return <FieldPicker key={input} name={"column_builder_"+subkey} type="div" field={input.split('_')[1]} expression={defaults[subkey]} parentId={parent_id} columnId={column_id} doValidation={thisComponent.state.func == 'math'} />
											break;

											case 'lag_date':
												return <FieldPicker name={"column_builder_"+subkey} type="input" field="lag" value={defaults[subkey]} columnId={column_id} />
											break;

											case 'format':
												return <select name="column_builder_format" onFocus={thisComponent.inputBlur} defaultValue={defaults[subkey]}>
													{Object.keys(formats).map(function(format, index) {
														return (<option key={index} value={format}>{formats[format]}</option>)
													})}
												</select>
											break;

											case 'field':
												return <FieldPicker name={"column_builder_"+subkey} type="input" field="field" value={defaults[subkey]} columnId={column_id} />
											break;

											case 'direction':
												return (<select name="column_builder_direction" onFocus={thisComponent.inputBlur} defaultValue={defaults[subkey]}>
													<option value="asc">asc</option>
													<option value="desc">desc</option>
												</select>)
											break;

											case 'denominator':
												return (<div>
													<label> <input type="radio" name="column_builder_prior" value="" defaultChecked={!defaults[subkey]} /> Total </label>
													<label> <input type="radio" name="column_builder_prior" value="1" defaultChecked={defaults[subkey]} /> Prior </label>
												</div>)
											break;

											case 'boolean':
												return <input name={"column_builder_"+subkey} type="checkbox" defaultChecked={defaults[subkey]*1} />
											break;
										}

									})()}

								</div>);


								});

							}, this)

						}

						<div className="req-parameter">
							<label>Column Name</label>
							<input type="text" name="column_builder_label" onFocus={this.inputBlur} defaultValue={defaults.label} data-update-suffix="#column_builder_calc :selected" />
						</div>

						<div>
							<label>Description</label>
							<textarea ref="columnDescription" rows={defaults.description?Math.max(2,Math.ceil(defaults.description.length/40)):2} defaultValue={defaults.description} onKeyDown={this.triggerSubmit}></textarea>
						</div>

						<div>
							<label>Add to Pivot Table</label>
							<div>
								<label>
									<input type="radio" name="add-to-table" defaultChecked="checked" /> do not add
								</label>
								<label>
									<input id="column_builder_add_to_top" type="radio" name="add-to-table" /><i className="icon-level-up fixed-width-icon"></i> add as column
								</label>
								<label>
									<input id="column_builder_add_to_right" type="radio" name="add-to-table" /><i className="icon-right fixed-width-icon"></i> add as row
								</label>
							</div>
						</div>

						<div>
							<label>Database Id</label>
							<input type="text" className="gray-out" readOnly="readonly" value={this.props.defaults.id} />
						</div>

					</div>

				</div>
			</div>
		);


	}


});
