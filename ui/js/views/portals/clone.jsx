var React = require('react');

var WebAPI = require('../../utils/WebAPI');

module.exports = React.createClass({


	getInitialState: function() {
		WebAPI.get('portals', (dashboards) => {
			if (typeof dashboards != 'object') {
				LeoKit.alert(dashboards);
				dashboards = {};
			}

			dashboards[-1] = {
				name: 'New Dashboard'
			}

			this.setState({ portals: dashboards })
		})
		return {
			portals: [],
			portalId: '',
			//nav: {},
			portal: {},
			navId: false
		};
	},


	componentDidMount: function() {

		LeoKit.modal($('.clone-dashboard'),
			{
				Save: this.saveClone,
				cancel: false
			},
			'Clone Dashboard',
			this.props.onClose
		)

	},


	showOverviews: function(portalId) {
		var thisComponent = this;
		if (portalId == -1) {
			this.setState({
				portalId: -1,
				portal: {},
				//nav: {}
			})
		} else {
			WebAPI.get('portals/'+portalId, function(portal) {
				thisComponent.setState({
					portalId: portalId,
					portal: portal,
					navId: false,
				})
			});
		}
	},


	showDashboards: function(navId) {
		this.setState({
			navId: navId
		})
	},


	generateUUID: function() {
		var d = new Date().getTime();
		if (window.performance && typeof window.performance.now === "function"){
			d += performance.now(); //use high-precision timer if available
		}
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});
		return uuid;
	},


	saveClone: function(form) {
		//var form  = $(this.refs.cloneForm).serializeObject()

		var portalId = form.clone_portal
		if (!portalId) {
			window.messageModal('Select dashboard to clone into', 'error')
			return false
		} else if (!form.clone_overview && form.clone_overview !== 0) {
			window.messageModal('Select overview page to clone into', 'error')
			return false
		} else if (portalId == -1) {
			var portalName = form.new_portal.trim();
			if (portalName == '') {
				window.messageModal('New dashboard name is required', 'error')
				return false
			}
			var portal = {
				id: portalName,
				name: portalName,
				navigation: navigation || [],
				script: portal.script || ''
			}
		} else {
			//use this portal
			var portal = this.state.portal
		}

		var navigation = portal.navigation || []

		if (form.clone_overview == -1) {
			var dashboard = {
				id: this.generateUUID(),
				name: form.new_overview.trim(),
				layout: this.props.json,
				script: this.props.script || ''
			}
			if (dashboard.name == '') {
				window.messageModal('New overview page name is required', 'error');
				return false;
			}
			//create new overview
			navigation.push({
				children: [],
				id: dashboard.id,
				name: dashboard.name
			})
		} else if (form.clone_dashboard == -1) {
			var dashboard = {
				id: this.generateUUID(),
				name: form.new_dashboard.trim(),
				layout: this.props.json,
				script: this.props.script || ''
			}
			if (dashboard.name == '') {
				window.messageModal('New detail page name is required', 'error');
				return false;
			}
			//create new dashboard
			navigation.forEach((overview, index) => {
				if (overview.id == form.clone_overview) {
					navigation[index].children.push({
						id: dashboard.id,
						name: dashboard.name
					})
				}
			})
		} else {
			//overwrite?
			return false;
		}

		portal.navigation = navigation

		if (portalId == -1) {
			//create new portal
			WebAPI.put('portals', portal, function() {

				WebAPI.put('dashboard/'+dashboard.id, dashboard, (response) => {
					document.location = 'portals?' + portalName
				})

			})
		} else {
			WebAPI.put('portals/'+portalId, portal, function(result) {

				WebAPI.put('dashboard/'+dashboard.id, dashboard, (response) => {
					document.location = 'portals?' + portalId
				})

			})
		}

		this.props.onClose()

		return true
	},


	render: function() {

		var leoTesting = localStorage.getItem('leo-testing') || false

		return (<div id="dashboard-clone">

			<div className="theme-form clone-dashboard">
				<div>
					<label>Select Dashboard</label>
					<ul>
						{
							Object.keys(this.state.portals).map((portalId, key) => {
								var portalName = this.state.portals[portalId].name || 'unnamed';
								if (portalName == 'leo-testing' && !leoTesting) {
									return false;
								}

								return (<li key={key} className={portalName == 'leo-testing' && leoTesting ? 'leo-testing' : ''}>
									<label>
										<input type="radio" name="clone_portal" value={portalId} onClick={this.showOverviews.bind(null, portalId)} />
										{portalName}
										{
											portalId == -1
											? <input type="text" name="new_portal" />
											: false
										}
									</label>
									{
										this.state.portalId == portalId
										?
											<ul>
											{
												(this.state.portal.navigation || []).map((navigation, key) => {
													return (<li key={key}>
														<label>
															<input type="radio" name="clone_overview" value={navigation.id} onClick={this.showDashboards.bind(null, navigation.id)} />
															{navigation.name}
														</label>

														{
															this.state.navId === navigation.id
															?
																<ul>
																	{
																		navigation.children.map((child, key) => {
																			return (<li key={key}>
																				<label>
																					{<input type="radio" value={child.id} name="clone_dashboard" disabled style={{opacity:.5}} />}
																					{child.name}
																				</label>
																			</li>)
																		})
																	}
																	<li>
																		<label>
																			<input type="radio" name="clone_dashboard" value="-1" defaultChecked="true" />
																			New Detail Page <input type="text" name="new_dashboard" />
																		</label>
																	</li>
																</ul>
															: false
														}
													</li>)

												})
											}
												<li>
													<label>
														<input type="radio" name="clone_overview" value="-1" defaultChecked={Object.keys(this.state.portal.navigation || []).length == 0 ? true : false} onClick={this.showDashboards.bind(null, -1)} />
														New Overview Page <input type="text" name="new_overview" />
													</label>
												</li>
											</ul>
										: false
									}
								</li>)
							})
						}
					</ul>
				</div>
			</div>
		</div>)

	}

});
