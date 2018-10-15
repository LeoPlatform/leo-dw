import React from 'react';
import CreateReport from '../../pages/dataExplorer/dataExplorerPage.jsx'
import Header from './header.jsx';
import {inject, observer} from 'mobx-react';


var WebAPI = require('../utils/WebAPI.js');
var ReportActions = require('../actions/ReportActions');
var ReportStore = require('../stores/ReportStore');
var Serializer = require('../utils/Serializer');
//var ColumnEditor = require('./report/dialogs/ColumnEditor.jsx');
//var ColumnBuilder = require('./report/dialogs/ColumnBuilder.jsx');
var AdvancedDialog = require('./report/dialogs/AdvancedDialog.jsx');
var DimensionAdvanced = require('./report/dialogs/DimensionAdvanced.jsx');
//var CohortEditor = require('./report/dialogs/CohortEditor.jsx');
//var FilterEditor = require('./report/filters/FilterEditor.jsx');
var ColumnSearch = require('./report/columnSearch.jsx');
var ReportLibrary = require('./common/ReportLibrary.jsx')
var PortalList = require('./portals/portalList.jsx')


@inject('dataStore')
@observer
export default class Main extends React.Component {

	constructor(props) {
		super(props);
		this.dataStore = this.props.dataStore;

		let select_data_pinned = localStorage.getItem('selectDataPinned') || false;

		this.state = {
			selectDataExpanded: (select_data_pinned && select_data_pinned != 'false') || !window.location.hash,
			dialog: false,
			dialogDefaults: {},
			popups: {},
			selected_field: {}
		};

        this.dataStore.getFields(window.location.hash);
	}


	componentDidMount() {

		$('.hoverPortalList').mouseenter(() => {
			this.setState({ loadPortalList: true })
		})

		$('.hoverDataExplorerList').mouseenter(() => {
			this.setState({ loadDataExplorerList: true })
		})

		$('.hoverVisualExplorerList').mouseenter(() => {
			this.setState({ loadLibraryList: true })
		})

	}

	field_selected(selected_field) {
		selected_field._sent = new Date().valueOf();
		this.setState({
			selected_field: selected_field
		});
	}


	showDialog(which, defaults, e) {
		if (e) {
			e.stopPropagation();
		}

		var thisComponent = this;
		if (this.state.dialog) {
			this.setState({ dialog: false });
		}
		setTimeout(function() {
			thisComponent.setState({ dialog: which, dialogDefaults: defaults }, function() {
				$('.leo-dialog').css({ marginTop: -$('.leo-dialog').height()/2 });
			});
		}, 1)
	}


	closeDialog() {
		$(document.body).removeClass (function (index, css) {
			return (css.match(/(^|\s)column-builder-picking-\S+/g) || []).join(' ');
		});
		$('.column-builder-field-target').removeClass('column-builder-field-target');
		$('.fact-limit').removeClass('fact-limit');
		this.setState({ dialog: false });
	}


	showPopup(which, defaults) {
		var thisComponent = this;
		var popups = this.state.popups

		if (popups[which]) {
			delete popups[which]
			this.setState({ popups: popups });
		}

		popups[which] = defaults;

		setTimeout(function() {
			thisComponent.setState({ popups:popups });
		}, 1)
	}


	closePopup(which) {
		var popups = this.state.popups;
		if (popups[which]) {
			delete popups[which]
			this.setState({ popups: popups });
		}
		$('.insert-box.frozen').removeClass('frozen').hide();
	}


	sendToPivot(params, e) {
		var metrics = ReportStore.getMetrics();
		if (params.type == 'dimension' && params.ag == 'id' && metrics.length == 0) {
			delete(params.ag);
			var position = $(e.currentTarget).offset();
			position.left += 70;
			position.arrow = 'arrow-left-top';
			var defaults = {
				position: position,
				action: 'select_metric',
				id: '',
				params: params
			}
			$(e.currentTarget).closest('.insert-box').addClass('frozen')
			this.showPopup('column_search', defaults);
		} else if (params.ag == 'unique') {
			delete(params.ag);
			var metrics = ReportStore.getMetrics();
			var position = $(e.currentTarget).offset();
			position.left += 110;
			position.arrow = 'arrow-left-top';
			var defaults = {
				position: position,
				action: 'select_dimension',
				id: metrics[0],
				params: params
			}
			$(e.currentTarget).closest('.insert-box').addClass('frozen')
			this.showPopup('column_search', defaults);
		} else {
			ReportActions.updateColumnByIndex(params.type, params.where, params.id, params.replace);
			$('#fact_search input').select().focus();
			this.closePopup('column_search');
			setTimeout(function() {
				Serializer.updateWindowHash();
			}, 50);
		}
	}


	changeKey(e) {
		WebAPI.setEndpoint("http://"+document.location.hostname+":8080/", e.target.value);
		React.unmountComponentAtNode(document.getElementById('main'));
		React.render(
				<App />,
				document.getElementById('main')
		);
	}


	render() {

		if (window.top !== window.self) {
			//remove if in iframe
			$('.page-header').remove()
			setTimeout(() => {
				$('main').css({top: 0})
				$('#main section#reportMain').css({top: 85})
			})
			var style = {top:0}
		} else {
			var style = {}
		}

		var thisComponent = this;

		return (<div style={style}>
			<Header />

			<CreateReport />

			{(function(dialog) {

				switch(dialog) {
					//case 'field_editor':
					//	return <ColumnEditor defaults={thisComponent.state.dialogDefaults} />
					//break;

					//case 'column_builder':
					//	return <ColumnBuilder defaults={thisComponent.state.dialogDefaults} sendToPivot={thisComponent.sendToPivot} />
					//break;

					case 'advanced':
						return <AdvancedDialog defaults={thisComponent.state.dialogDefaults} sendToPivot={thisComponent.sendToPivot} />
					break;

					case 'dimension_advanced':
						return <DimensionAdvanced defaults={thisComponent.state.dialogDefaults} sendToPivot={thisComponent.sendToPivot} />
					break;

					//case 'cohort':
					//	return <CohortEditor defaults={thisComponent.state.dialogDefaults} sendToPivot={thisComponent.sendToPivot} />
					//break;

					//case 'filter_editor':
					//	return <FilterEditor defaults={thisComponent.state.dialogDefaults} />
					//break;

				}

			})(this.state.dialog)}

			{
				Object.keys(this.state.popups).map(function(popup) {

					switch(popup) {
						case 'column_search':
							return <ColumnSearch key={popup} defaults={thisComponent.state.popups[popup]} closeChangeColumn={thisComponent.closePopup.bind(null, 'column_search')} />
						break;
					}

				})
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
}