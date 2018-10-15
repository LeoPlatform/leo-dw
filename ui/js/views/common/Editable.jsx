var React = require('react');

module.exports = React.createClass({

	getInitialState: function() {
		return {
			editing: false
		}
	},


	edit: function() {
		this.setState({ editing: true })
	},


	unedit: function() {
		var value = this.refs.editableInput.value;
		if (this.props.children != value && this.props.onChange) {
			this.props.onChange(value);
		}
		this.setState({ editing: false });
	},


	componentDidUpdate: function() {
		if (this.state.editing) {
			this.refs.editableInput.focus()
			this.refs.editableInput.select();
		}
	},


	render: function() {

		return (
			this.state.editing
			? <span title={this.props.children} className={this.props.className}><input ref="editableInput" className="editable-input" defaultValue={this.props.children} onBlur={this.unedit} /></span>
			: <span title={this.props.children} className={this.props.className} onClick={this.edit}>{this.props.children}</span>
		)

	}

});
