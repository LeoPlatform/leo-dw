var React = require('react')
var Serializer = require('../../../utils/Serializer')
var ReportStore = require('../../../stores/ReportStore')

module.exports = React.createClass({

	advanced: {
		showTotals: false,
		inlineFilters: false,

		'Dashboard Settings': 'form-heading',

		chart_id: '',
		title: '',
		columnWidths: [],

		//showDownloadIcon: false
	},


	componentDidMount: function() {
		var thisComponent = this

		LeoKit.modal($('.advanced-settings'),
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
		//put it back for react
		$('.advanced-settings-wrapper').append($('.advanced-settings'))
		this.props.onClose()
	},


	saveAdvancedSettings: function(data) {
		for(var label in data) {
			if (JSON.stringify(data[label]) == '[true,false]') {
				data[label] = true
			}
		}

		data.columnWidths = data.columnWidths.split(',')

		ReportStore.setAdvanced(data)
		Serializer.updateWindowHash()
		this.onClose()
	},


	render: function() {
		var advanced = $.extend({}, this.advanced, this.props.advanced)
		return (<div className="advanced-settings-wrapper">
			<div className="advanced-settings theme-form">
				{
					Object.keys(this.advanced).map((setting) => {

						switch(typeof this.advanced[setting]) {
							case 'boolean':
								return (<div key={setting} className="">
									<label>{setting}</label>
									<input name={setting} type="checkbox" defaultChecked={advanced[setting]} value="true" />
									<input name={setting} type="hidden" value="false" />
								</div>)
							break

							case 'object':

								return (<div key={setting} className="">
									<label>{setting}</label>
									<input name={setting} type="text" defaultValue={advanced[setting]} placeholder="comma separated values" />
								</div>)

								/*
								return (<div key={setting} className="">
									<label>{setting}</label>
									{
										advanced[setting].length == 0 || typeof advanced[setting] != 'object'
										? <input name={setting} type="checkbox" value="true" defaultChecked={advanced[setting] == 'true'} />
										: (<select name={setting} defaultValue={advanced[setting]} multiple="true">
										{
											advanced[setting].map((value) => {
												return (<option key={value}>{value}</option>)
											})
										}
										</select>)
									}
								</div>)
								*/
							break

							default:
							case 'string':

								if (this.advanced[setting] === 'form-heading') {
									return (<div className="" key={setting}>
										<strong className="theme-form-heading">{setting}</strong>
									</div>)
								}

								return (<div key={setting} className="">
									<label>{setting.replace('_', ' ')}</label>
									<input name={setting} defaultValue={advanced[setting] || ''} />
								</div>)
							break
						}
					})

				}
			</div>
		</div>)

	}


});
