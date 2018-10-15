var React = require('react')

var ReportStore = require('../../stores/ReportStore')
var Serializer = require('../../utils/Serializer')

module.exports = React.createClass({

	delimiter: '.',

	settings: {
		chart_id: '',
		sort: {
			column: { 0:'label', 1:'value' },
			direction: ['asc', 'desc']
		},
		legend: {
			align: ['center', 'left', 'right'],
			enabled: true,
			layout: ['horizontal', 'vertical'],
			margin: 12,
			padding: 8,
			verticalAlign: ['bottom', 'top', 'middle'],
			x: 0,
			y: 0
		},
		tooltip: {
			shared: false,
			dateTimeLabelFormats: {
				"millisecond": "%A, %b %e, %H:%M:%S.%L",
				"second": "%A, %b %e, %H:%M:%S",
				"minute": "%A, %b %e, %H:%M",
				"hour": "%A, %b %e, %H:%M",
				"day": "%A, %b %e, %Y",
				"week": "Week from %A, %b %e, %Y",
				"month": "%B %Y",
				"year": "%Y"
			}
		}
	},

	componentDidMount: function() {
		var thisComponent = this

		LeoKit.modal($('.chartAdvancedSettings'),
			{
				Save: (data) => {
					thisComponent.saveAdvancedSettings(data)
				},
				cancel: false
			},
			'Advanced Settings',
			thisComponent.onClose
		)

	},


	onClose: function() {
		this.props.onClose()
	},


	saveAdvancedSettings: function(raw) {
		var data = {}
		for(var i in raw) {
			/* handle boolean */
			if (JSON.stringify(raw[i]) == '[true,false]') {
				raw[i] = true
			}
			var parts = i.split(this.delimiter)
			var temp = data
			parts.forEach((part, j) => {
				if (j == parts.length-1) {
					temp[part] = raw[i]
				} else if (typeof temp[part] == 'undefined') {
					temp[part] = {}
				}
				temp = temp[part]
			})
		}
		this.props.onSave(data)
		this.onClose()
	},


	render: function() {
		var advanced = this.props.advanced

		return (<div>
			<div className="chartAdvancedSettings theme-form">
			{
				Object.keys(this.settings).map((section, index) => {
					var group = this.settings[section]

					if (typeof group == 'string') {
						return (<div key={index}>
							<label>{section.replace('_', ' ')}</label>
							<input name={section} type="text" defaultValue={advanced[section]} />
						</div>)
					}

					return (<div key={index} className="theme-row-group">
						<strong className="theme-form-heading">{section}</strong>
						{
							Object.keys(group).map((setting, index) => {
								var defaultValue = (advanced[section] && typeof advanced[section][setting] != 'undefined' ? advanced[section][setting] : group[setting]);

								switch(typeof group[setting]) {
									case 'object':

										if (group[setting].length || group[setting][0]) {

											if (typeof defaultValue == 'object') {
												defaultValue = defaultValue[0]
											}

											return (<div key={index}>
												<label>{setting}</label>
												<select name={section + this.delimiter + setting} defaultValue={defaultValue}>
													{
														(group[setting].length ? group[setting] : Object.keys(group[setting])).map(function(value, index) {
															return <option key={index} value={value}>{group[setting][index]}</option>
														})
													}
												</select>
											</div>)
										} else {
											/* object */
											var data = (defaultValue || group[setting])
											return (<div key={index} title={setting}>
												<label>{setting}</label>
												<div className="theme-form">
												{
													Object.keys(data).map((label) => {
														return (<div key={label}>
															<label>{label}</label>
															<input name={section + this.delimiter + setting + this.delimiter + label} defaultValue={data[label]} />
														</div>)
													})
												}
												</div>
											</div>)
										}
									break;

									case 'number':
										return (<div key={index}>
											<label>{setting}</label>
											<input name={section + this.delimiter + setting} type="number" defaultValue={defaultValue} step="any" />
										</div>)
									break;

									case 'boolean':
										return (<div key={index}>

											<input id={'chart_advanced_'+section + this.delimiter + setting} name={section + this.delimiter + setting} type="checkbox" defaultChecked={defaultValue} value="true" />

											<label htmlFor={'chart_advanced_'+section + this.delimiter + setting}>{setting}</label>

											<input name={section + this.delimiter + setting} type="hidden" value="false" />

										</div>)
									break;

									default:

										return (<div key={index}>
											<label>{setting}</label>
											<input name={section + this.delimiter + setting} type="text" defaultValue={defaultValue} />
										</div>)
									break;
								}

							})
						}

					</div>)
				})
			}

			</div>

		</div>)

	}


});
