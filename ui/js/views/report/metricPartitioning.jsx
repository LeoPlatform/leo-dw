var React = require('react');

var ColumnSearch = require('../report/columnSearch.jsx')
var IdUtils = require('../../utils/IdUtils')


module.exports = React.createClass({

	getInitialState: function() {
		var partitions = this.props.value || []
		partitions = partitions.map((partition) => {
			return IdUtils.details(partition)
		})

		return {
			partitions: partitions
		}
	},


	selectColumn: function(action, instance, e) {
		var position = {
			left: 27,
			top: 52
		}
		this.setState({ action: action, position: position, input: e.currentTarget, instance: instance });
	},


	closeAddColumn: function() {
		this.setState({
			action: null
		})
	},


	addColumn: function(action, column) {
		var partitions = this.state.partitions || []
		partitions.push(column)
		this.setState({
			partitions: partitions,
			action: null
		}, () => {
			if (this.props.onChange) {
				this.props.onChange(this.state.partitions)
			}
		})
	},


	removeColumn: function(index) {
		var partitions = this.state.partitions || []
		partitions.splice(index, 1)
		this.setState({
			partitions: partitions,
			action: null
		}, () => {
			if (this.props.onChange) {
				this.props.onChange(this.state.partitions)
			}
		})
	},


	render: function() {

		return (<div className="metric-partitioning">
			<ul>
			{
				this.state.partitions
				? this.state.partitions.map((partition, index) => {
					return (<li key={index}>
						<input value={partition.id} name="partition" type="hidden" />
						{partition.parent.label} {partition.label}
						<i className="icon-cancel pull-right" onClick={this.removeColumn.bind(this, index)}></i>
					</li>)
				})
				: false
			}
			</ul>
			<div className="cursor-pointer" onClick={this.selectColumn.bind(null, 'pick_dimension', 0)}>
				<i className="icon-plus-circled"></i><label> Add Partition</label>
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

		</div>)
	}

})
