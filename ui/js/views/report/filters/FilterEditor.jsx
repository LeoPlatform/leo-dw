var React = require('react');

var ReportFilterActions = require('../../../actions/ReportFilterActions');
var ReportFilterStore = require('../../../stores/ReportFilterStore');
var Serializer = require('../../../utils/Serializer');

var FilterSelect = require('../dialogs/FilterSelect.jsx');


module.exports = React.createClass({

	getInitialState: function() {
		return {
			saving: false
		}
	},


	updateReportFilter: function(filter, e) {
		if (e) { e.stopPropagation(); }

		this.setState({
			addingFilter: false,
			editingFilter: ''
		});

		ReportFilterActions.updateReportFilter({ id: filter.id, value: filter.value, checkboxes: filter.checkboxes, comparison: filter.comparison });

		setTimeout(function() {
			Serializer.updateWindowHash();
		}, 50);

		this.props.onClose()
	},


	saveFilter: function() {
		this.setState({ saving: true });
	},


	autoComplete: function(filter_id, term, callback) {
		ReportFilterActions.autocomplete2(filter_id, term, callback);
	},


	render: function() {

		var filter = {
			checkboxes: { '_':null },
			dimension: this.props.defaults.parent.label,
			id: this.props.defaults.id,
			label: this.props.defaults.label,
			value: []
		}

		var reportFilters = ReportFilterStore.getReportFilters();

		if (reportFilters) {
			for (var i=0;i<reportFilters.length;i++) {
				var reportFilter = reportFilters[i]
				if (filter.id == reportFilter.id) {
					filter.checkboxes = reportFilter.checkboxes
					filter.value = reportFilter.value
					break;
				}
			}
		}

		var style = {
			top: this.props.defaults.top,
			left: this.props.defaults.left
		}

		if ((window.innerHeight - this.props.defaults.top) < 450) {
			var style = {
				bottom: window.innerHeight - this.props.defaults.top,
				left: this.props.defaults.left
			}
		}

		return (<div className="filter-box add-shadow theme-dialog theme-dialog-open" style={style}>

			<div className="mask" onClick={this.props.onClose}></div>

			<header tabIndex="-2" className="theme-dialog-header">
				{'Filter on ' + (filter.dimension || '') + ' ' + (filter.label || '')}
				<i className="theme-icon-close" onClick={this.props.onClose}></i>
			</header>

			<form>
				<main>
					<FilterSelect filter={filter} saving={this.state.saving} updateReportFilter={this.updateReportFilter} autoComplete={this.autoComplete} closeDialog={this.props.onClose} saveFilter={this.saveFilter} />
				</main>
				<footer className="text-right">
					<button type="button" className="theme-button" onClick={this.props.onClose}>Close</button> &nbsp;
					<button type="button" className="theme-button-primary" onClick={this.saveFilter}>Save Filter</button>
				</footer>
			</form>

		</div>)

	}

});
