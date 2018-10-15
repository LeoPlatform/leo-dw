var React = require('react');

var ReportFilterActions = require('../../actions/ReportFilterActions');

module.exports = React.createClass({

	getInitialState: function() {
		return {
			values: this.props.defaultValue || [],
			suggestions: [],
			selectedIndex: -1
		}
	},


	mouseInside: false,
	isFocused: false,

	componentDidMount: function() {
		var thisComponent = this
		$(this.refs.multiSelect).mouseenter(function() {
			thisComponent.mouseInside = true
			$(this).find('.drop-down').addClass('active')
		}).mouseleave(function() {
			thisComponent.mouseInside = false
			if (thisComponent.isFocused == false) {
				$(this).find('.drop-down').removeClass('active')
			}
		})

		$(this.refs.multiSelect).find('input').focus(function() {
			thisComponent.isFocused = true;
			$(this).next('.drop-down').addClass('active')
		}).blur(function(e) {
			thisComponent.isFocused = false;
			if (thisComponent.mouseInside == false) {
				$(this).next('.drop-down').removeClass('active')
			}
		})
	},


	autoComplete: function(e) {
		var filter_id = this.props.autoCompleteId
		var term = e.currentTarget.value
		if (filter_id && term) {
			ReportFilterActions.autocomplete2(filter_id, term, (results) => {
				this.setState({
					selectedIndex: -1,
					suggestions: results.suggestions
				})
			});
		} else {
			this.setState({
				selectedIndex: -1,
				suggestions: []
			})
		}
	},


	addValue: function(value) {
		var values = this.state.values
		values.push(value)
		this.setState({
			values: values,
			selectedIndex: -1
		});
	},


	removeValue: function(value) {
		var values = this.state.values
		delete values[values.indexOf(value)]
		this.setState({
			values: values,
			selectedIndex: -1
		});
	},


	handleKeyUp: function(e) {
		switch(e.keyCode) {
			case 40: //down
				if (this.state.selectedIndex < this.state.suggestions.length-1) {
					this.setState({ selectedIndex: (++this.state.selectedIndex % this.state.suggestions.length) })
				}
			break;

			case 38: //up
				if (this.state.selectedIndex > 0) {
					this.setState({ selectedIndex: (Math.abs(--this.state.selectedIndex) % this.state.suggestions.length) })
				}
			break;

			case 13: //enter
				this.addValue(this.state.suggestions[this.state.selectedIndex].value)
			break;
		}
	},


	render: function() {

		var index = -1;

		return <div className="multi-select" ref="multiSelect">
			<ul className="">
			{
				this.state.values.map((value) => {
					return <li key={value} data-value={value}>
						<input type="hidden" name={this.props.name} value={value} />
						<span>{value}</span>
						<i className="icon-cancel" onClick={this.removeValue.bind(null, value)}></i>
					</li>
				})
			}
			</ul>
			<input type="text" onChange={this.autoComplete} placeholder="Type to Add Value..." onKeyUp={this.handleKeyUp} />
			<ul className="drop-down">
			{
				this.state.suggestions.length > 0
				? this.state.suggestions.map((suggestion) => {
					var value = suggestion.value
					if (this.state.values.indexOf(value) == -1) {
						index++;
						return <li key={value} data-value={value} onClick={this.addValue.bind(null, value)} className={this.state.selectedIndex == index ? 'hover' : ''}>{value}</li>
					}
				})
				: <li key="no results"><em>no results</em></li>
			}
			</ul>
		</div>

	}
});
