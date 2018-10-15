var React = require('react');

var ReportActions = require('../../actions/ReportActions');
var ReportFilterActions = require('../../actions/ReportFilterActions');
var Serializer = require('../../utils/Serializer');

var Filter = require('../report/filters/filter.jsx');
var ColumnSearch = require('../report/columnSearch.jsx');
var IdUtils = require('../../utils/IdUtils');

module.exports = React.createClass({

	getInitialState: function() {
		var column = IdUtils.parse(this.props.id),
			filters = column['filter'] || this.props.filter

		filters = (typeof filters == 'string') ? filters.split(';') : filters || []

		if (filters.length > 0) {
			filters = filters.map(function(filter) {
				var parts = filter.split(/([<>=!]+| in| between)/gi)
				var values = []
				if (parts.length > 1) {
					switch(parts[1].trim()) {
						case '!=':
						case '<': case '>':
						case '>=': case '<=':
						case '=>': case '=>':
						case '=':
							values = [parts[2]]
						break;

						case 'in':
							values = parts[2].trim().replace(/^\((.*)\)$/, '$1').split(',')
						break;

						case 'between':
							values = parts[2].split(' and ')
						break;
					}

					return {
						id: parts[0].trim(),
						comparison: parts[1].trim(),
						value: values.map(function(value) {
							return value.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
						})
					}
				}
			})
		}

		return {
			column: column,
			filters: filters
		}
	},


	componentDidMount: function() {
		$(this.refs.saveButton).focus();
	},


	filterColumn: function() {
		var filters = [];
		this.state.filters.forEach(function(filter) {
			if (filter.value.length > 0) {
				filter.value = filter.value.map((value) => {
					return (value[0] === "'" && value[value.length - 1] === "'") ? value.slice(1, -1) : value
				})
				if (filter.comparison == 'between') {
					if (filter.value.length == 1) {
						filters.push(filter.id.replace('date.id', 'date._id') + " between " + filter.value.join())
					} else {
						filters.push(filter.id.replace('date._id', 'date.id') + " between '" + filter.value.join("' and '")+ "'")
					}
				} else if (filter.value.length == 1) {
					filters.push(filter.id + (filter.comparison || '=') + "'" + filter.value[0]+ "'")
				} else {
					filters.push(filter.id + " in ('" + filter.value.join("','")+ "')")
				}
			}
		})

		var column = this.state.column;
		var id = IdUtils.build(column, {
			filter: filters.join(';')
		});

		if (id != this.props.id) {

			if (this.props.saveMetricFilter) {

				this.props.saveMetricFilter(id);

			} else {
				ReportActions.updateColumnByIndex('metric', 'row', id, this.props.iterator);

				setTimeout(function() {
					Serializer.updateWindowHash();
				}, 50);
			}

		}

		this.props.closeChangeColumn();
	},


	handleKeyDown: function(e) {
		switch(e.keyCode) {
			case 27:
				this.props.closeChangeColumn();
			break;

			case 13:
				this.filterColumn();
			break;
		}
	},


	selectColumn: function(action, instance, e) {
		var position = {
			left: 27,
			top: 52
		}
		this.setState({ action: action, position: position, input: e.currentTarget, instance: instance });
	},


	addColumn: function(action, column) {
		var filter = {
			id: column.id,
			value: [],
			checkboxes: {"_":null},
			label: column.label
		}

		if (column.kind == 'date_range') {
			filter.comparison = 'between';
			filter.value = ['@daterange(0 days ago)'];
		}

		if (column.type == 'metric') {
			filter.fact = column.parent.label;
			filter.singleValue = true;
		} else {
			filter.dimension = column.parent.label;
		}

		var filters = this.state.filters
		filters.push(filter);
		this.setState({
			filters: filters
		})

		this.closeAddColumn()
	},


	closeAddColumn: function() {
		this.setState({
			action: false
		}, () => {
			$(this.refs.saveButton).focus();
		})
	},


	updateFilter: function(column) {
		//console.log('updateFilter', column)
	},


	removeFilter: function(column_id) {
		var filters = this.state.filters
		filters = filters.filter(function(filter) {
			return (filter.id != column_id)
		})
		this.setState({
			filters: filters
		})
	},


	autoComplete: function(filter_id, term, callback) {
		if (filter_id.indexOf('.') != -1) {
			ReportFilterActions.autocomplete2(filter_id, term, callback);
		}
	},


	render: function() {

		return (<div className={this.props.popupMenu ? 'popup-menu ' + this.props.popupMenu : ''} style={this.props.position}>

			<div id="tool-bar">
				<div className="filters-wrapper">
					<ul>
					{
						this.state.filters.map((filter, key) => {
							if (!filter.label) {
								var details = IdUtils.details(filter.id);
								if (details && details.label) {
									filter.label = details.label
								} else {
									filter.label = 'Unknown';
								}
								if (details && details.parent && details.parent.label) {
									filter.dimension = details.parent.label
								} else {
									filter.dimension = 'Unknown';
								}
								filter.is_metric_filter = true
							}
							return <Filter key={key} filter={filter} updateReportFilter={this.updateFilter} removeFilter={this.removeFilter} autoComplete={this.autoComplete} />
						})
					}
						<li className="filter-wrapper" style={{position:'relative'}}>
							<div className="add-filter align-middle cursor-pointer" onClick={this.selectColumn.bind(null, 'pick_filter', 0)}>
								<i className="icon-plus-circled"></i><label> Add Filter</label>
							</div>

							{
								this.state.action
								? <ColumnSearch
									action={this.state.action}
									id={this.state.input.value}
									position={this.state.position}
									closeChangeColumn={this.closeAddColumn}
									addClass={this.props.popupMenu}
									save={this.addColumn}
								/>
								: false
							}

						</li>
					</ul>
				</div>
			</div>

			{
				this.props.popupMenu
				? <div className="clear-fix" style={{padding: 10}}>
					<a className="pull-left" style={{color:'white'}} onClick={this.props.closeChangeColumn}>Cancel</a>
					<button type="button" ref="saveButton" className="theme-button pull-right" tabIndex="-1" onKeyDown={this.handleKeyDown} onClick={this.filterColumn}>Save</button>
				</div>
				: false
			}

		</div>)
	}

})
