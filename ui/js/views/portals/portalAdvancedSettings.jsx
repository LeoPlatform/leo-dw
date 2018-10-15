var React = require('react')

var WebAPI = require('../../utils/WebAPI')

module.exports = React.createClass({

	getInitialState: function() {
		return {
			defaultDashboard: localStorage.getItem('defaultDashboard') || '',
			defaultPage: localStorage.getItem('defaultPage') || '',
			portals: []
		}
	},

	componentDidMount: function() {

		WebAPI.get('portals', (portals) => {
			if (typeof portals != 'object') {
				LeoKit.alert(portals)
				portals = {}
			}
			this.setState({ portals: portals })
		})

		var modal = LeoKit.modal(
			$('.portal-advanced-settings'), {
				Save: (data) => {
					this.props.saveAdvancedSettings(data)
				},
				cancel: false
			},
			'Advanced Settings',
			this.props.onClose
		)

		this.props.initCodeMirror(modal)

	},


	render: function() {

		var leoTesting = localStorage.getItem('leo-testing') || false

		return (<div className="portal-advanced-settings-wrapper">
			<div className="portal-advanced-settings" style={{width:'80vw'}}>

				<div className="theme-form-row">
					<label>Default Dashboard</label>
					<select name="defaultDashboard" value={this.state.defaultDashboard} onChange={(event) => { this.setState({ defaultDashboard: event.currentTarget.value }) }}>
						<option style={{fontStyle: 'italic'}}>last viewed</option>
						{
							Object.keys(this.state.portals).map((portalId, index) => {
								if (!leoTesting && (portalId == 'leo-testing' || this.state.portals[portalId].name == 'leo-testing')) {
									return false
								}
								return <option key={index} value={portalId}>{this.state.portals[portalId].name}</option>
							})
						}
					</select>
				</div>

				{
					this.state.defaultDashboard && this.state.portals[this.state.defaultDashboard] && this.state.portals[this.state.defaultDashboard].navigation
					? (<div className="theme-form-row">
						<label>Default Page</label>
						<select name="defaultPage" defaultValue={this.state.defaultPage}>
						{
							this.state.portals[this.state.defaultDashboard].navigation.map((navigation, index) => {
								var options = []
								options.push(<option key={index} value={navigation.id}>{navigation.name}</option>)
								navigation.children.map((child, index2) => {
									options.push(<option key={index+'.'+index2} value={child.id}> &mdash; {child.name}</option>)
								})
								return options
							})
						}
						</select>
					</div>)
					: false
				}

				<hr />

				<div>
					<label>Dashboard Script</label>
					<textarea name="portalScript" className="edit-script" placeholder="Enter script for whole dashboard" defaultValue={this.props.portalScript} />
				</div>

				<div>
					<label>Page Script</label>
					<textarea name="dashboardScript" className="edit-script" placeholder="Enter script for this page" defaultValue={this.props.dashboardScript} />
				</div>

			</div>
		</div>)

	}


})
