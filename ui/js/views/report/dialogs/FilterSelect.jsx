var React = require('react');

//var parse_date = require('../../../../../lib/utils/parse_date.js').parse_date;
var DateRangePicker = require('../dialogs/DateRangePicker.jsx');


module.exports = React.createClass({

	operators: [
		'==', '=',
		'<>', '!=', '!',
		'=>', '>=',
		'=<', '<=',
		'between', '><',
		'>', '<'
	],

	getInitialState: function() {

		var filter = this.props.filter;

		//fix value for dynamic ranges
		if (filter.description) {
			filter.value = [filter.description];
			delete(filter.description);
		}

		if (typeof filter.value == 'undefined') {
			filter.value = [];
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

		this.autoComplete(filter.id, '');

		return {
			isDateRange: (filter.comparison && filter.comparison == 'between'),
			isDynamic: (filter.value && filter.value[0] && !filter.value[0].toString().match(/\d{4}-\d{2}-\d{2}/)),
			isDate: (filter.id.toLowerCase().indexOf('date.id') > -1 || filter.id.toLowerCase().indexOf('date._id') > -1 || filter.id.toLowerCase().indexOf('date.date') !== -1),
			singleValue: (filter.singleValue),
			showEditor: (this.props.editingFilter == filter.id),
			filter: filter,
			searchText: '',
			searchIndex: -1,
			searchResults: [],
			comparison: comparison
		};
	},


	componentWillReceiveProps: function(nextProps) {
		if (nextProps.saving == true) {
			this.props.updateReportFilter(this.state.filter);
		}

		var filter = this.state.filter;

		if (!filter.label && nextProps.filter.label) {
			filter.label = nextProps.filter.label;
		}

		if (!filter.dimension && nextProps.filter.dimension) {
			filter.dimension = nextProps.filter.dimension;
		}

		this.setState({filter:filter});
	},


	componentDidMount: function() {

		this._isMounted = true
		this.initDatePicker();
		if (this.refs.searchText) {
			this.refs.searchText.select();
		}

		var offset = $(this.refs.filterSelect).offset()
		if (offset.top > window.innerHeight / 2) {
			$(this.refs.filterSelect).addClass('flow-up')
		} else {
			$(this.refs.filterSelect).removeClass('flow-up')
		}
		
	},


	componentWillUnmount: function() {

		this._isMounted = false

	},


	componentDidUpdate: function() {

		this.initDatePicker()

	},


	initDatePicker: function() {
		var thisComponent = this;
		if (this.state.isDate && !(this.state.isDynamic || this.state.isDateRange)) {
			var values = this.state.filter.value;
			if (this.refs && this.refs.multidatePicker) {
				$(this.refs.multidatePicker).multiDatesPicker({
					dateFormat: "yy-mm-dd",
					defaultDate: (values.length > 0 ? values[0] : null),
					addDates: (values.length > 0 ? values : null),
					onSelect: function(date, inst) {
						thisComponent.toggleValue(date);
					}
				});
			}
		}

		if (this.state.showEditor && this.refs.searchText) {
			this.refs.searchText.focus();
		}

	},


	autoComplete: function(filter_id, term) {
		if (this.props.autoComplete) {
			var thisComponent = this;
			this.props.autoComplete(filter_id, term, (results) => {
				var searchResults = [];
				for(var i = 0; i < results.suggestions.length; i++) {
					var val = results.suggestions[i].value;
					searchResults.push({
						id: results.suggestions[i].value,
						text: val
					});
				}
				if (this._isMounted) {
					this.setState({
						searchIndex: -1,
						searchResults: searchResults
					})
				}
			}, this.props.filter.api);
		}
	},


	catchSpecialKeys: function(e) {
		switch(e.keyCode) {
			case 27: //esc
			case 9: //tab
				e.preventDefault();
				e.stopPropagation();
			break;

			case 40: //down
				this.setState({searchIndex:(++this.state.searchIndex % this.state.searchResults.length)});
			break;

			case 38: //up
				if (this.state.searchIndex == 0) {
					this.setState({searchIndex:(this.state.searchResults.length-1)});
				} else {
					this.setState({searchIndex:(--this.state.searchIndex % this.state.searchResults.length)});
				}
			break;
		}
	},


	searchFilter: function(e) {
		e.preventDefault();
		e.stopPropagation();

		var thisComponent = this;

		switch(e.keyCode) {
			case 40: //down
			case 38: //up
			break;

			case 27: //esc
				if (this.props.closeDialog) {
					this.props.closeDialog();
				} else if (this.props.delayedClose) {
					this.props.delayedClose(true);
				}
			break;

			case 9: case 13: //tab, enter
				if (this.state.searchIndex == -1 || this.state.searchIndex > this.state.searchResults.length-1) {
					this.addValue(this.refs.searchText.value);
				} else {
					this.addValue(this.state.searchResults[this.state.searchIndex].id);
				}

				if (e.keyCode == 13) {
					if (this.props.saveFilter) {
						this.props.saveFilter();
					} else if (this.props.delayedClose) {
						this.props.delayedClose(true);
					}
				}
			break;

			default:
				var term = this.refs.searchText.value;
				this.autoComplete(this.state.filter.id, term);
			break;
		}
	},


	setRange: function(values) {
		var filter = this.state.filter;
		filter.value = values;
		filter.comparison = 'between';
		filter.checkboxes = { '_':'' };
		for(var i=0;i<values.length;i++) {
			filter.checkboxes[values[i]] = true;
		}
		filter.updated = true;
		this.setState({ filter: filter });
	},


	toggleValue: function(id) {
		var filter = this.state.filter;
		if (filter.value.indexOf(id) == -1) {
			this.addValue(id);
		} else {
			this.removeValue(id);
		}
	},


	addValue: function(id) {
		var filter = this.state.filter;
		id = $.trim(id);
		for(var i=0;i<this.operators.length;i++) {
			if (id.slice(0, this.operators[i].length) == this.operators[i]) {
				filter.comparison = this.operators[i];
				switch(filter.comparison) {
					case '==': filter.comparison = '='; break;
					case '!':  filter.comparison = '!='; break;
				}
				id = $.trim(id.slice(this.operators[i].length));
				break;
			}
		}
		if (this.state.singleValue) {
			filter.checkboxes = {};
			filter.value = [];
		}
		if (filter.comparison == 'between') {
			id = id.replace(/\band\b/i, '&');
			var values = id.split(/[ ,&]+/);
			for(var i=0;i<values.length;i++) {
				filter.checkboxes[values[i]] = true;
			}
			filter.value = values;
		} else {
			if (id != '' && id != '_') {
				filter.checkboxes[id] = true;
				if (filter.value.indexOf(id) == -1) {
					filter.value.push(id);
					filter.value.sort();
				}
			}
		}

		filter.updated = true;
		this.setState({ filter: filter });
		if (this.refs.searchText) {
			this.refs.searchText.select();
		}
		if (this.state.singleValue) {
			this.props.delayedClose(true);
		}
	},


	removeValue: function(id, e) {
		if (e) { e.stopPropagation(); }

		var filter = this.state.filter;
		delete(filter.checkboxes[id]);
		var index = filter.value.indexOf(id);
		if (index != -1) {
			filter.value.splice(index, 1);
		}
		filter.updated = true;
		this.setState({ filter: filter });
	},


	toggleCheck: function(id, e) {
		e.stopPropagation();
		var filter = this.state.filter;

		if (filter.singleChoice) {
			filter.value = [id];
			for(var i in filter.checkboxes) {
				filter.checkboxes[i] = false;
			}
			filter.checkboxes[id] = true;
		} else {
			filter.checkboxes[id] = !(filter.checkboxes[id] && filter.checkboxes[id] != 'false');
			var index = filter.value.indexOf(id);
			if (!filter.checkboxes[id]) {
				if (index !== -1) {
					filter.value.splice(index, 1);
				}
			} else {
				if (index === -1) {
					filter.value.push(id);
				}
			}
		}
		filter.updated = true;
		this.setState({ filter: filter });
	},


	setSearchIndex: function(index) {
		this.setState({searchIndex:index})
	},


	render: function()  {

		var thisComponent = this;

		var filter = this.state.filter;

		var possibleValues = [];
		for(var value in filter.checkboxes) {
			if (value !== '_')  { // skip _ which is a placeholder to keep this as an object, not an array
				var checked = (filter.checkboxes[value] !== 'false' && filter.checkboxes[value] !== false);
				possibleValues.push({
					value: value,
					checked: checked
				});
			}
		}

		if (!this.state.singleValue) {
			var defaultValue = '';
		} else {
			var defaultValue = (filter.comparison && filter.comparison !== '=' ? filter.comparison + ' ' : '') + filter.value.join();
		}

		return <div className="filter-select" ref="filterSelect">
			{
				this.state.isDate
				?  (
						(this.state.isDynamic || this.state.isDateRange)

						? <DateRangePicker filter={filter} setRange={this.setRange} delayedClose={this.props.delayedClose} />

						: <div className="clear-fix text-center" style={{padding: '10px'}}>
							<div id={'filter_date_picker_'+filter.id} ref="multidatePicker"></div>
						</div>
				)

				: <div className="filter-editing">

					<div className="filter-selected-values">
					{
						!this.state.singleValue
						? possibleValues.map(function(possible, index) {
							var inputType = thisComponent.props.filter.singleChoice ? 'radio' : 'checkbox';
							return <div key={index}>
								<label>
									<input type={inputType} name={thisComponent.props.filter.id} defaultChecked={possible.checked} onClick={thisComponent.toggleCheck.bind(null, possible.value)} />
									{possible.value}
								</label>
								{
									inputType == 'checkbox'
									? <i className="icon-cancel" onClick={thisComponent.removeValue.bind(thisComponent, possible.value)}></i>
									: false
								}
							</div>
						})
						: false
					}
					</div>

					{
						!filter.hideTypeAhead
						? <div className="filter-input-box">
							<input ref="searchText" placeholder="Type to Add Value..." defaultValue={defaultValue} onKeyDown={this.catchSpecialKeys} onKeyUp={this.searchFilter} />
						</div>
						: false
					}

					<ul className="filter-search-results" ref="searchResultsWrapper">
					{
						this.state.searchResults.map(function(result, index) {
							var className = (filter && filter.value && filter.value.indexOf(result.id) == -1 ? '' : 'selected') + (thisComponent.state.searchIndex == index ? ' hover' : '');
							return <li key={index} className={className} onMouseEnter={thisComponent.setSearchIndex.bind(null, index)} onClick={thisComponent.addValue.bind(null, result.id)}>{result.text}</li>
						})
					}
					</ul>

				</div>
			}
		</div>

	}

});
