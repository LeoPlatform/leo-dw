var React = require('react');

var Filter = require('./filters/filter.jsx');

var ColumnSearch = require('./columnSearch.jsx');


module.exports = React.createClass({


	getInitialState: function() {
		return {
			addingFilter: false,
			editingFilter: '',
		};
	},


	updateReportFilter: function(filter, e) {
		if (e) { e.stopPropagation(); }

		this.setState({
			addingFilter: false,
			editingFilter: ''
		});

		this.props.updateFilter({ id: filter.id, value: filter.value, checkboxes: filter.checkboxes, comparison: filter.comparison })
	},


	addReportFilter: function(column, e) {
		if (e) { e.stopPropagation(); }

		var filter = {
			id: column.id,
			value: [],
			checkboxes: {"_":null},
			label: column.label
		}

		if (column.kind == 'date_range') {
			filter.comparison = 'between';
			filter.value = ['Today'];
		}

		if (column.type == 'metric') {
			filter.fact = column.parent.label;
			filter.singleValue = true;
		} else {
			filter.dimension = column.parent.label;
		}

		this.props.updateFilter(filter);

		this.setState({
			addingFilter: false,
			editingFilter: column.id
		});
	},


	openAddFilter: function(e) {
		if (e) { e.stopPropagation(); }
		this.setState({ addingFilter: true });
	},


	closeAddFilter: function(e) {
		if (e) { e.stopPropagation(); }
		this.setState({ addingFilter: false });
	},


	editLimit: function(e) {
		this.setState({ editingLimit: true }, () => {
			this.refs.limitAmount.focus()
			this.refs.limitAmount.select()
		})
	},


	updateLimit: function(e) {
		this.props.updateLimit(e.currentTarget.value)
		this.setState({ editingLimit: false })
	},


	handleLimitKeyDown: function(e) {
		if (e.keyCode == 13) {
			this.props.updateLimit(e.currentTarget.value)
			this.setState({ editingLimit: false })
		}
	},


	render: function() {

		var thisComponent = this;

		return (
			<div className={"filters-wrapper"+(this.props.selectDataExpanded ? ' select-data-expanded' : '')}>
				<ul>
					{
						this.props.limitLabel
						? <li className="filter-wrapper" onClick={this.editLimit}>
							<div className="filter-heading">
								<div className="filter-name">Top {this.props.limitLabel}</div>
								<div className="filter-text filter-values">
									{
										this.state.editingLimit
										? <input ref="limitAmount" type="text" min="1" defaultValue={this.props.limit} onBlur={this.updateLimit} onKeyDown={this.handleLimitKeyDown} style={{width:'4em'}} />
										: <div>{this.props.limit}</div>
									}
								</div>
							</div>
						</li>
						: false
					}

					{
						!this.props.reportFilters

						? false

						: this.props.reportFilters.filter(f=>!f.isHidden).map(function(filter, index) {
							return (<Filter
								key={"filter-"+filter.id+"-"+(!Array.isArray(filter.value) ? filter.value : filter.value.join('|'))+'-'+index}
								ref={"filter-"+filter.id}
								locked={thisComponent.props.locked}
								filter={filter}
								reportFilters={thisComponent.props.reportFilters}
								removeFilter={thisComponent.props.removeFilter}
								autoComplete={thisComponent.props.autoComplete}
								updateReportFilter={thisComponent.updateReportFilter}
								editingFilter={thisComponent.state.editingFilter}
							/>)
						})
					}

					{
						this.props.addFilter != 'false'
						? <li className="filter-wrapper">
							<div className="add-filter align-middle cursor-pointer">
								<div onClick={this.openAddFilter}>
									<i className="icon-plus-circled"></i> <label>Add Filter</label>
								</div>
								{
									this.state.addingFilter
									? <ColumnSearch closeChangeColumn={thisComponent.closeAddFilter} action="add_filter" position={{left:25,top:50,arrow:'arrow-up-left'}} addReportFilter={this.addReportFilter} />
									:false
								}
							</div>
						</li>
						: false
					}
				</ul>
			</div>
		);
	}

});
