var React = require('react');
var OptionActions = require("../../actions/options.js");
var DashboardOptions = require("../../stores/options.js")();

module.exports = React.createClass({
	
	getDefaultProps: function() {
		return {
			group: 'default'
		};
	},
	
	
	componentDidMount: function() {
		DashboardOptions.on('togglelistchange', (e, group) => {
			this.forceUpdate();
		});
		DashboardOptions.on('togglechange', (e, group) => {
			this.forceUpdate();
		});
	},
	
	
	onClick: function(filter) {
		OptionActions.setLegendToggle(this.props.group, filter.name, !filter.checked);
	},
	
	
	render: function() {
		var legendToggles = DashboardOptions.getGroup(this.props.group).legendToggles;
		return <ul>
			{legendToggles.map((filter, i) => {
				return <li key={"key"+i} onClick={this.onClick.bind(this, filter)}>
					<input type="checkbox" readOnly={true} checked={filter.checked ? 'checked' : false} name="legendToggles" /><label style={{color: filter.color}}><span>{filter.name}</span></label>
				</li>;
			})}
		</ul>;
	}
});
