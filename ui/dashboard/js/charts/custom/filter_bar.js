var base = require("../base.js");
var React = require("react");

var Filters = require('../../../../js/views/report/filters.jsx')
var ReportFilterActions = require('../../../../js/actions/ReportFilterActions')


module.exports = function (element, spec, options, my) {
	my = my || {}

	var that = base(element, spec, options, my)

	my.redraw = function () {
		return <FilterBar spec={spec} options={options} data={my.dataSources[0]} element={element} />
	}

	return that
}


var FilterBar = React.createClass({

	getInitialState: function() {
		window.dashboardFilters = window.dashboardFilters || []
		return {
			filters: this.props.spec.filters
		}
	},


	runFilter: function(filter) {
		var filters = filter ? [filter] : this.state.filters
		var selector = this.props.spec.controller.selector || '*'
		filters.forEach((filter, filterIndex) => {

			window.dashboardFilters = window.dashboardFilters.filter((dashboardFilter) => {
				return dashboardFilter.id !== filter.id
			})

			if ((filter.value && filter.value.length > 0)) {
				window.dashboardFilters.push(filter)
			}

			$('figure.leo-chart, figure.leo-html').filter(selector).not($(this)).each(function() {
				if ($(this).leo()) {
					if ((filter.value && filter.value.length > 0)) {
						$(this).leo().setFilter({
							id: filter.id,
							value: filter.value,
							comparison: filter.comparison,
							fromController: true
						}, filterIndex == (filters.length - 1))
					} else {
						$(this).leo().removeFilter(filter.id)
					}
				}
			})
		})
	},


	autoComplete: function(filter_id, term, callback) {
		ReportFilterActions.autocomplete2(filter_id, term, callback)
	},


	componentDidMount: function() {
		$(this.props.element).addClass('is-controller')

		setTimeout(() => {
			this.runFilter()
		}, 0)
	},


	render: function() {
		return (<div className="filter-bar">
			<Filters key="filters"
				reportFilters={this.state.filters}
				hasRowMetrics="true"
				addFilter="false"
				updateFilter={this.runFilter}
				autoComplete={this.autoComplete}
			/>
		</div>)
	}


})
