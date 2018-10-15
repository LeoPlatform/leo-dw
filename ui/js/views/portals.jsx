var React = require('react');
var ReactDOM = require('react-dom');

var credentials = require('../credentials.js');

window.apiEndpoint = credentials.apiEndpoint;
window.apiKey = credentials.apiKey;
window.liveVersion = credentials.liveVersion;

var WebAPI = require('../utils/WebAPI');

var Portal = require('./portals/portal.jsx');
var FieldsActions = require('../actions/FieldsActions');

var ReportLibrary = require('./common/ReportLibrary.jsx')
var PortalList = require('./portals/portalList.jsx')

var Header = require('./header.jsx')

module.exports = React.createClass({

	getInitialState: function() {

		var portalId = decodeURIComponent(document.location.href.split('?')[1] || '')
		var defaultDashboard = localStorage.getItem('defaultDashboard') || 'last viewed'

		if (portalId) {
			if (defaultDashboard == 'last viewed') {
				localStorage.setItem('lastDashboard', portalId)
			}
		} else {
			if (defaultDashboard == 'last viewed') {
				portalId = localStorage.getItem('lastDashboard')
			} else {
				portalId = defaultDashboard
				var defaultPage = localStorage.getItem('defaultPage')
				if (defaultPage) {
					portalId += '#' + defaultPage
				}
			}
			if (portalId) {
				document.location = 'portals?' + portalId
			}
		}

		FieldsActions.initFields()

		return {
			portalId: portalId
		}
	},


	componentDidMount: function() {

		$('.hoverPortalList').mouseenter(() => {
			this.setState({ loadPortalList: true })
		})

		$('.hoverDataExplorerList').mouseenter(() => {
			this.setState({ loadDataExplorerList: true })
		})

		$('.hoverVisualExplorerList').mouseenter(() => {
			this.setState({ loadLibraryList: true })
		})

	},


	render: function() {
		return (<div>
			<Header />

			{
				this.state.portalId
				? <Portal portal={this.state.portalId} />
				: <PortalList />
			}

			{
				this.state.loadPortalList
				? <PortalList dropDown="true" />
				: false
			}

			{
				this.state.loadDataExplorerList
				? <ReportLibrary dropDown="DataExplorer" />
				: false
			}

			{
				this.state.loadLibraryList
				? <ReportLibrary dropDown="VisualExplorer" />
				: false
			}

		</div>)
	}

});
