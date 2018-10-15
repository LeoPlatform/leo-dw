var React = require('react')

module.exports = React.createClass({

	componentDidMount: function() {

		var clipboard = new Clipboard('.clipboardButton',
			this.props.text ? { text: this.props.text } : undefined
		).on("success", function(readyEvent) {
			$(readyEvent.trigger).prev('.clipboardResults').text('Copied to clipboard')
		})

	},


	render: function() {

		return (<div style={this.props.style || {}} className={this.props.className || false}>
			<span className="clipboardResults theme-message-success">&nbsp;</span>
			<button className="clipboardButton theme-button" type="button" data-clipboard-target={this.props['data-clipboard-target'] || this.props.target || undefined}>Copy to Clipboard</button>
		</div>)

	}

})
