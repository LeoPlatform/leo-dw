var React = require('react');

var ReportFilterActions = require('../../actions/ReportFilterActions');

module.exports = React.createClass({

	contextTypes: {
		edit_column: React.PropTypes.func,
	},

	
	editColumn: function() {
		this.context.edit_column(this.props.column);
	},
	
	
	render: function() {
		var column = this.props.column;
		var icon = ((column.type == 'metric' || column.type == 'fact') ? 'icon-sprite-123' : 'icon-ion-social-buffer-outline');
		var format = (column.format || ((column.type == 'metric' || column.type == 'fact') ? 'int' : 'string'));
		var label = column.label + (column.label == parent.label ? ' Count' : '');
		return <aside className="info-box" data-column_id={column.id}>
			<div>
				<header><i className={icon}></i>{column.parent ? column.parent.label : ''}</header>
				<div><strong>{label}</strong> <em>{'  |  '+format}</em></div>
				<div>{column.description || ''}</div>
				<div ref="infoExamples" className="info-examples"></div>
				{
					this.props.showMore
					? <div className="info-more" onClick={this.editColumn}>
						<i className="icon-info"></i>
						<span> more &gt; </span>
					</div>
					: false
				}
			</div>
		</aside>
	}
});
