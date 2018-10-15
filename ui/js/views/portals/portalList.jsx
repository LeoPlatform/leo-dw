var React = require('react')

var WebAPI = require('../../utils/WebAPI')

module.exports = React.createClass({

	getInitialState: function() {
		return {
			portals: false,
			dropDown: this.props.dropDown
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

		if (this.props.dropDown) {
			$('.hoverPortalList').append($('.portalListDropDown'))
		} else {
			var modal = LeoKit.modal(
				$('.portal-list'), {
					close: false,
					'Build New Dashboard': this.addPortal
				},
				document.location.hash ? 'Manage Dashboards' : 'Select Dashboard',
				this.onClose
			)
		}

	},


	onClose: function() {
		this.props.onClose && this.props.onClose()
	},


	/*
	editPortalName: function(portalId, portalName) {
		var thisComponent = this;
		LeoKit.prompt('Enter dashboard name', portalName, function(form) {
			if ($.trim(form.prompt_value) == '') {
				window.messageModal('Name is required.');
				return false;
			}
			var portalName = form.prompt_value;
			var portals = thisComponent.state.portals;

			portals[portalId].name = portalName;

			WebAPI.post('portals/'+portalId, portals[portalId], function(result) {
				thisComponent.setState({
					portals: portals
				});
			});
		})

	},
	*/


	deletePortal: function(portalId) {
		LeoKit.confirm('Are you sure you want to delete this dashboard?', () => {
			WebAPI.delete('portals/' + portalId, (result) => {
				var portals = this.state.portals
				delete portals[portalId]
				this.setState({ portals: portals })
			})
		})
	},


	addPortal: function() {
		LeoKit.prompt('Enter Dashboard Name', (form) => {
			var portalName = form.prompt_value
			var portals = this.state.portals
			WebAPI.post('portals', { name: portalName }, (portalId) => {
				if (!portalId) {
					window.messageModal('Error saving new dashboard')
				} else {
					document.location = 'portals?' + portalId
				}
			})
		})
		return false
	},


	render: function() {

		var defaultDashboard = localStorage.getItem('defaultDashboard') || 'last viewed'
		if (defaultDashboard == 'last viewed') {
			defaultDashboard = localStorage.getItem('lastDashboard')
			if (defaultDashboard) {
				defaultDashboard = defaultDashboard.split('#')[0]
			}
		}

		return (<div className="portal-list-wrapper">

			{
				this.props.dropDown
				? (<ul className="portalListDropDown">
					{
						this.state.portals
						? (
							Object.keys(this.state.portals).map((portalId, key) => {
								var portalName = this.state.portals[portalId].name || 'unnamed';
								if (portalName == 'leo-testing' && !(localStorage.getItem('leo-testing'))) {
									return false
								}
								return (<li key={key} className={(portalName == 'leo-testing' ? 'leo-testing' : '')}>
									<a href={'portals?'+portalId} className={(portalId == defaultDashboard ? 'active' : '' )}>{portalName}</a>
								</li>)
							})
						)
						: <li className="theme-spinner-tiny"></li>
					}
					<li className="special-link">
						<a onClick={this.addPortal}>
							<i className="icon-plus"/> &nbsp; Build New Dashboard
						</a>
					</li>
				</ul>)

				: <div className="portal-list theme-table-fixed-header">
					<table className="width-1-1">
						<thead>
							<tr>
								<th>Dashboard Name</th>
								<th>Added</th>
								<th>Last Updated</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
						{
							Object.keys(this.state.portals).map((portalId, key) => {
								var portalName = this.state.portals[portalId].name || 'unnamed';
								if (portalName == 'leo-testing' && !(localStorage.getItem('leo-testing'))) {
									return false
								}
								return (<tr key={key} className={portalName == 'leo-testing' ? 'leo-testing' : ''}>
									<td>
										<a href={'portals?'+portalId}>{portalName}</a>
									</td>
									<td></td>
									<td></td>
									<td>
										{/*<i className="icon-edit" onClick={this.editPortalName.bind(null, portalId, portalName)}></i>*/}
										<i className="icon-menu" title="reorder" />
										<i className="icon-cancel" onClick={this.deletePortal.bind(null, portalId)} />
									</td>
								</tr>)
							})
						}
						</tbody>
					</table>
				</div>
			}

		</div>)

	}

})
