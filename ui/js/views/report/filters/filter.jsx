var React = require('react');

var parse_date = require('../../../../../lib/utils/parse_date.js').parse_date;

var FilterSelect = require('../dialogs/FilterSelect.jsx');
var IdUtils = require('../../../utils/IdUtils.js');

var missingRequired = "-99999999";


module.exports = React.createClass({

	getInitialState: function() {

		var filter = this.props.filter;

		//fix value for dynamic ranges
		if (filter.description) {
			filter.value = [filter.description];
			delete(filter.description);
		}

		if (filter.isRequired && filter.length === 0) {
			filter.value = [missingRequired];
		}

		//force to array
		if (!Array.isArray(filter.value)) {
			if (filter.value == '') {
				filter.value = [];
			} else {
				filter.value = [filter.value];
			}
		}

		//retro fit
		if (!filter.checkboxes) {
			filter.checkboxes = {};
			for(var i in filter.value) {
				filter.checkboxes[filter.value[i]] = true;
			}
		}

		var comparison = filter.comparison;

		var isDateRange = (filter.comparison && filter.comparison == 'between');
		var isDynamic = (filter.value && filter.value[0] && !filter.value[0].toString().match(/\d{4}-\d{2}-\d{2}/));
		var isDate = (filter.id.toLowerCase().indexOf('date.id') > -1 || filter.id.toLowerCase().indexOf('date._id') > -1 || filter.id.toLowerCase().indexOf('date.date') !== -1);

		if (!isDateRange && isDate && !filter.singleChoice) {
			if (filter.value.length == 0) {
				filter.value.push('today');
			}
			filter.value = filter.value.map(function(value) {
				if (!value.match(/\d{4}-\d{2}-\d{2}/)) {
					var isChecked = filter.checkboxes[value];
					delete filter.checkboxes[value];
					value = parse_date(value)[0];
					filter.checkboxes[value] = isChecked;
				}
				return value;
			})
		}

		return {
			isDateRange: isDateRange,
			//isDynamic: (filter.value && filter.value[0] && !filter.value[0].toString().match(/\d{4}-\d{2}-\d{2}/)),
			isDate: isDate,
			//singleValue: (filter.singleValue),
			updated: false,
			showEditor: (this.props.editingFilter == filter.id),
			filter: filter,
			//searchText: '',
			//searchIndex: -1,
			//searchResults: [],
			comparison: comparison
		};
	},


	componentWillReceiveProps: function(nextProps) {
		var filter = this.state.filter;

		if (!filter.label && nextProps.filter.label) {
			filter.label = nextProps.filter.label;
		}

		if (!filter.dimension && nextProps.filter.dimension) {
			filter.dimension = nextProps.filter.dimension;
		}

		if (nextProps.filter.checkboxes) {
			filter.checkboxes = $.extend({}, filter.checkboxes, nextProps.filter.checkboxes);
		}

		if (nextProps.filter.value) {
			if (nextProps.filter.value.length == 1 && nextProps.filter.value[0] == '') {
				filter.value = [];
			} else {
				filter.value = nextProps.filter.value;
			}
		}

		this.setState({filter:filter});
	},

	/*
	closeTimeout: null,
	openTimeout: null,

	delayedClose: function(no_delay) {
		var thisComponent = this;

		if (thisComponent.openTimeout) {
			clearTimeout(thisComponent.openTimeout);
			thisComponent.openTimeout = null;
		}

		this.closeTimeout = setTimeout(function() {
			if (thisComponent.openTimeout) {
				clearTimeout(thisComponent.openTimeout);
				thisComponent.openTimeout = null;
			}

			var state = thisComponent.state;

			thisComponent.setState({
				updated: false,
				showEditor:false
			});

			if (state.updated || no_delay) {
				thisComponent.props.updateReportFilter(thisComponent.state.filter);
			}

			thisComponent.closeTimeout = null;
		}, (no_delay == true ? 0 : 500));
	},

	delayedOpen: function() {

		var thisComponent = this;

		if (thisComponent.closeTimeout) {
			clearTimeout(thisComponent.closeTimeout);
			thisComponent.closeTimeout = null;
		}

		this.openTimeout = setTimeout(function() {
			if (thisComponent.closeTimeout) {
				clearTimeout(thisComponent.closeTimeout);
				thisComponent.closeTimeout = null;
			}
			thisComponent.setState({showEditor:true});
			thisComponent.openTimeout = null;
		}, 200);
	},*/


	close: function(e, f) {
		if (e && e !== true) {
			e.stopPropagation();
		}

		if (this.state.filter.updated) {
			delete this.state.filter.updated;
			if (this.state.filter.value.length == 0 && this.state.filter.isRequired) {
			  this.state.filter.value = [missingRequired];
			}
			this.props.updateReportFilter(this.state.filter);
		}

		this.setState({
			updated: false,
			showEditor:false
		});
	},


	open: function(e) {
		this.setState({showEditor:true});
	},


	render: function()  {

		var thisComponent = this;

		var filter = this.state.filter;

		var filterName = (filter.fact || filter.dimension || '') + ' ' + (filter.label ? filter.label : ' ')

		if (filterName.trim() == '') {
			var details = IdUtils.details(filter.id)
			if (details) {
				filterName = details.parent.label + ' ' + details.label
			}
		}

		var display = "";
		if (filter.isRequired && filter.value[0] == missingRequired ) {
			display = <em>none</em>;
		} else if (filter.value.length > 0) {
			display = filter.value.join ? filter.value.join(this.state.isDateRange ? ' - ' : ', ') : filter.value;
		} else {
			display = <em>All</em>;
		}

		return (<li ref="filter" className={"filter-wrapper" + (this.state.showEditor ? ' active' : '') + " " + (this.props.className || '')}>
				{
					this.state.showEditor
					? <div className="mask" onClick={this.close}></div>
					: false
				}
				<div className="filter-heading" onClick={this.state.showEditor ? this.close : this.open}>
					{
						this.props.removeFilter
						? <i className="icon-cancel pull-right" onClick={this.props.removeFilter.bind(null, filter.id)} />
						: false
					}
					<div className="filter-name">{filterName}</div>
					<div className="filter-text filter-values">
						{ !this.state.isDate && filter.comparison && filter.comparison != '=' && filter.comparison != 'in' ? filter.comparison + ' ' : '' }
						{display}
					</div>
				</div>
				{
					this.state.showEditor
					? <FilterSelect filter={filter} removeFilter={this.props.removeFilter} delayedClose={this.close} autoComplete={this.props.autoComplete} />
					: false
				}
		</li>)

	}

});
