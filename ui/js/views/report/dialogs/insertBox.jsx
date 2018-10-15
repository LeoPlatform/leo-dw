var React = require('react');

module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		sendToPivot: React.PropTypes.func.isRequired
	},


	sendToPivot: function(params, e) {
		this.context.sendToPivot(params, e);
		if (!$(e.currentTarget).closest('aside').hasClass('frozen')) {
			$(e.currentTarget).closest('aside').hide();
		}
	},


	render: function() {
		var columnType = this.props.column.type
			, ags = this.props.column.ags
			, wheres = this.props.inputBoxArrows[columnType]
			, defaultSet = 0

		return (
			<aside className="insert-box">
				<div>
					{
						this.props.column.advanced
						? <b className="advanced-link" onClick={this.context.show_dialog.bind(null, 'advanced', { id: this.props.column.id })}>
							<i>Advanced &gt;</i>
						</b>
						: false
					}
					<div>
						{
							wheres.map((where, index) => {
								return (<p key={index}>
									<i className={"fixed-width-icon icon-" + (where == 'row' ? 'level-up' : 'right' )+ ' ' + this.props.column.type}></i>
									{
										ags
										? ags.map((ag, ndex) => {
											var arg = {
												where: where,
												type: (columnType == 'dimension' && ag == 'count') ? 'metric' : columnType,
												id: this.props.column.id + (ag == 'id' ? '' : '|'+ag),
												tableType: columnType,
												ag: ag
											}
											return <b key={ndex} className={(defaultSet++ ? '' : 'hover')} onClick={this.sendToPivot.bind(null, arg)}>{(ag == 'id' ? this.props.column.label : ag).toUpperCase()}</b>
										})
										: false
									}
								</p>)
							})
						}
					</div>
				</div>
			</aside>
		)

	}


})
