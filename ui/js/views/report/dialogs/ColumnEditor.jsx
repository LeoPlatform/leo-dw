var React = require('react')

var WebAPI = require('../../../utils/WebAPI')

var FieldsActions = require('../../../actions/FieldsActions')
var ReportActions = require('../../../actions/ReportActions')
var Autocomplete = require('../../common/autoComplete.jsx')
var ReportFilterActions = require('../../../actions/ReportFilterActions');


module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired
	},


	getInitialState: function() {
		return {
			dimensionColoring: (this.props.defaults.color && Object.keys(this.props.defaults.color).length !== 0) ? this.props.defaults.color : false
		}
	},


	componentDidMount: function() {

		LeoKit.dialog($('#dialogBox'), {
				Save: this.saveColumn,
				close: this.context.close_dialog
			},
			'Edit Column',
			this.context.close_dialog
		)

	},


	deleteColumn: function() {
		//big warning!!!
		LeoKit.confirm("Are you sure you want to delete this column?  This cannot be undone!", function() {

			WebAPI.post("update_field/delete/", put, function(result) {
				if (result ==1) {
					window.messageLogNotify("Column Deleted");
				} else {

				}
				console.log('result', result)
			});

		});
	},


	saveColumn: function(data) {
		var errors = [];

		if (data.name.trim() == '') {
			errors.push('Name is required')
		}

		/*
		if (data.description.trim() == '') {
			errors.push('Description is required')
		}
		*/

		if (errors.length > 0) {

			window.messageModal(errors.join('\n'));
			return;

		} else {

			var put = {
				id: this.props.defaults.id,
				label: data.name.trim(),
				description: data.description.trim(),
				format: data.format.trim()
			}

			switch(this.props.defaults.type) {
				case 'fact':
				case 'metric':
				break

				default:
					put.sort = {
						type: data.sort_type.trim(),
						values: data.sort_values.trim() || undefined
					}
				break
			}

			if (this.state.dimensionColoring) {
				for(var i in this.state.dimensionColoring) {
					if (this.state.dimensionColoring[i] == '') {
						delete this.state.dimensionColoring[i]
					}
				}
				put.color = this.state.dimensionColoring
			}

			FieldsActions.updateField(this.props.defaults.type, put)

			setTimeout(function() {
				ReportActions.repivot()
			}, 500)

			this.context.close_dialog()
		}

	},


	sortChange: function(e) {
		$(e.target).next().toggle(e.target.value == 'enum')
	},


	triggerSubmit: function(e) {
		if (e.keyCode == 13) {
			e.preventDefault();
			this.saveColumn();
		}
	},


	enableColoring: function() {

		ReportFilterActions.autocomplete(this.props.defaults.id, '', (results) => {
			var dimensionColoring = {}
			if (results.suggestions.length < 11) {
				results.suggestions.map((suggestion) => {
					dimensionColoring[suggestion.value] = ''
				})
			}
			this.setState({ dimensionColoring: dimensionColoring })
		})

	},


	addColor: function(value) {
		var dimensionColoring = this.state.dimensionColoring
		if (typeof dimensionColoring[value] == 'undefined') {
			dimensionColoring[value] = ''
			this.setState({ dimensionColoring: dimensionColoring })
		}
	},


	editColor: function(dimension) {
		this.setState({ editing: dimension }, () => {
			this.refs.colorInput.focus()
		})
	},


	uneditColor: function(dimension) {
		this.setState({ editing: undefined })
	},


	setColor: function(dimension, event) {
		var dimensionColoring = this.state.dimensionColoring
		dimensionColoring[dimension] = event.currentTarget.value
		this.setState({ dimensionColoring: dimensionColoring })
	},


	deleteColor: function(deleteDimension) {
		var dimensionColoring = this.state.dimensionColoring
		Object.keys(dimensionColoring).forEach((dimension) => {
			if (dimension == deleteDimension) {
				delete dimensionColoring[deleteDimension]
			}
		})
		this.setState({ dimensionColoring: dimensionColoring })
	},


	render: function() {

		var formats = {
			base: 'Base (raw output)',
			'float': 'Float',
			money: 'Money',
			count: 'Count',
			'int': 'Integer',
			string: 'String',
		}

		var sorts = {
			string: 'String',
			'enum': 'Enumerated...',
			'int': 'Integer',
			'float': 'Float',
			pattern: 'Pattern',
		}

		var thisComponent = this

		var defaults = this.props.defaults
		var sort = defaults.sort
		if (typeof(sort) != "object"){
			defaults.sort = {"type": sort, values:""}
		}
		var showValuesClass = defaults.sort.type == "enum"  ? "" : "display-none"

		return (<div>
			<div id="dialogBox" className="theme-form">

				<input type="hidden" name="id" defaultValue={defaults.id} />

				<div className="req-parameter">
					<label>Name</label>
					<input type="text" name="name" defaultValue={defaults.label} />
				</div>

				<div className="">
					<label>Description</label>
					<textarea name="description" rows={defaults.description?Math.max(2,Math.ceil(defaults.description.length/40)):2} defaultValue={defaults.description} onKeyDown={this.triggerSubmit}></textarea>
				</div>
				<div className="req-parameter">
					<label>Format</label>
					<select name="format" defaultValue={defaults.format}>
					{
						Object.keys(formats).map(function(format, index) {
							return <option key={index} value={format}>{formats[format]}</option>
						})
					}
					</select>
				</div>

				{
					(function(type) {
						switch(type) {
							case 'fact':
							break

							default:
								return (<div className="req-parameter">
									<label>Sort As</label>
									<select name="sort_type" defaultValue={defaults.sort.type} onChange={thisComponent.sortChange}>
									{
										defaults.sort.type == 'pattern'
										? <option value="pattern">{sorts['pattern']}</option>
										: Object.keys(sorts).map(function(sort, index) {
											if (sort == 'pattern') {
												return false;
											}
											return <option key={index} value={sort}>{sorts[sort]}</option>
										 })

									}
									</select>
									<div className={showValuesClass}>
										<input name="sort_values" placeholder="enumerated values separated by commas" defaultValue={defaults.sort.values}/>
									</div>
								</div>)
							break
						}
					})(defaults.type)
				}

				{
					defaults.type == 'dimension'
					? <div className="">
						<label>Colors</label>
						{
							!this.state.dimensionColoring
							? <button type="button" className="theme-button" onClick={this.enableColoring}>Enable Dimension Coloring</button>
							: <div className="theme-tags">
								{
									Object.keys(this.state.dimensionColoring).sort().map((dimension) => {
										return (<span key={dimension}>
											{dimension}
											{
												(this.state.editing == dimension)
												? <div className="theme-popup-above-left">
													<strong>Color (rgb, hex, named)</strong>
													<input ref="colorInput" type="text" name="color" placeholder="enter color" defaultValue={this.state.dimensionColoring[dimension]} onChange={this.setColor.bind(null, dimension)} onBlur={this.uneditColor.bind(null, dimension)} />
												</div>
												: false
											}
											<s className="color-swatch" style={{background:this.state.dimensionColoring[dimension]}} onClick={this.editColor.bind(null, dimension)} />
											<i className="icon-cancel" onClick={this.deleteColor.bind(null, dimension)} />
										</span>)
									})
								}
								<Autocomplete field={this.props.defaults.id} callback={this.addColor} placeholder="search for dimension" />
							</div>
						}
					</div>
					: false
				}

				<div className="">
					<label>Database Id</label>
					<input type="text" className="gray-out" readOnly="readonly" value={defaults.id} />
				</div>

			</div>
		</div>)

	}


});
