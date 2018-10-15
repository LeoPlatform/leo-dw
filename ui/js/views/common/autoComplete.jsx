var React = require('react');

var ReportFilterActions = require('../../actions/ReportFilterActions');

module.exports = React.createClass({

	getInitialState: function() {
		return {}
	},


	componentDidMount: function() {
		$('.autoComplete input').on({
			blur: () => {
				this.hideTimeout = setTimeout(() => {
					$('.autoComplete ul').hide()
				}, 150)
			},
			focus: () => {
				$('.autoComplete ul').show()
			},
		})

		$('.autoComplete input').focus()
	},


	autoComplete: function(event) {
		var searchText = event.currentTarget.value.trim()
		if (searchText != '') {
			ReportFilterActions.autocomplete(this.props.field, searchText, (results) => {
				this.setState({ results: results })
			})
		} else {
			this.setState({ results: {} })
		}
	},


	callback: function(event) {
		var value = $(event.currentTarget).text()
		this.props.callback(value)
		clearTimeout(this.hideTimeout)
		$('.autoComplete input').focus()
	},


	render: function() {

		return (<div className="autoComplete core-autocomplete">
			<input placeholder={this.props.placeholder || 'Type to Add Value...'} onChange={this.autoComplete} />
			<ul>
				{
					this.state.results && this.state.results.suggestions
					? this.state.results.suggestions.map((suggestion) => {
						return <li key={suggestion.value} onClick={this.callback}>{suggestion.value}</li>
					})
					: false
				}
			</ul>
		</div>)
	}

});
