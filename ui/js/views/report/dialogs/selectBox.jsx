var React = require('react');

module.exports = React.createClass({
	
	contextTypes: {
		field_selected: React.PropTypes.func.isRequired,
	},

	
	render: function() {
		var thisComponent = this;
		var columnType = this.props.column.type;
		var id = this.props.column.id;
		var ags = this.props.column.ags;
		var parent_id = this.props.column.parent_id;
				
		var defaultSet = false;
		var defaultArgs = {};
		
		return (
			<aside className="select-box">
				<div>
					<p>
						{
							ags.map(function(ag) {
								var pipe_ag = (ag == 'id' ? '' : '|'+ag);
								var args = {
									type: 'aggregate',
									id: id+pipe_ag,
									label: '',
									parent: parent_id,
									expression: ''
								}
								if (!defaultSet) {
									defaultArgs = args
									defaultSet = true;
								}
								return <b className={defaultSet ? '' : 'hover'} onClick={thisComponent.context.field_selected.bind(null, args)}>{ag.toUpperCase()}</b>
							})
						}
					</p>
				</div>
			</aside>
		);
		
	}


});
