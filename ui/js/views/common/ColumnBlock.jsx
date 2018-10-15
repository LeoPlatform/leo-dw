var React = require('react');

var IdUtils = require('../../utils/IdUtils');

var Editable = require('../common/Editable.jsx');

module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func,
		show_popup: React.PropTypes.func,
	},


	componentDidUpdate: function() {

	},


	labelChanged: function(column_index, series_index, value) {
		this.props.updateColumn('update_label', this.props.type, column_index, value)
	},


	removeColumn: function(column_index, series_index) {
		this.props.updateColumn('remove_column', this.props.type, column_index, null)
	},


	editColumn: function(column_index, series_index, e) {
		this.props.updateColumn('edit_column', this.props.type, column_index, null, e)
	},


	editAggregate: function(column_index, column, e) {
		this.props.updateColumn('change_aggregate', this.props.type, column_index, column, e)
	},


	selectFilter: function(series_index, column_index, id, e) {
		this.props.updateColumn('change_metric_filter', this.props.type, column_index, id, e)
	},


	selectDimension: function(series_index, column_index, id, e) {
		this.context.show_popup('edit_series_dimension', e.currentTarget, 'up-right', { column_index: column_index, id: id } )
	},


	removeDimension: function(series_index, column_index, e) {
		e.stopPropagation();
		this.props.updateColumn('remove_metric_dimension', this.props.type, column_index, null, e)
	},


	render: function() {
		var thisComponent = this;

		var column = this.props.column;
		var column_index = this.props.column_index;

		var parsed = IdUtils.parse(column.id);

		var aggregate = IdUtils.aggregate();
		var transforms = IdUtils.transforms();
		var transform = '';
		var details = IdUtils.details();

		column.label = (details && details.label ? details.label : column.label);

		if (transforms.length == 1) {
			if ('percent' in transforms[0]) {
				transform = '%';
			} else if ('cumulative' in transforms[0]) {
				//aggregate = '\u2211 '+aggregate;
				transform = '\u2211';
			} else {
				aggregate = '. . .';
			}
		} else if (transforms.length != 0) {
			aggregate = '. . .';
		}

		var series_index = thisComponent.props.series_index;

		var style = {};
		if (this.props.column.width) {
			style = { width: this.props.column.width-2 };
		};

		return <div className={"column-block "+this.props.type+"-block"} data-series_index={series_index} data-column_index={column_index} style={style}>
			<div className="block-top flex-row">
				<i className="icon-menu" title="reorder"></i>
				<Editable onChange={thisComponent.labelChanged.bind(null, column_index, series_index)} className="flex-grow">{parsed.label || column.label || '-'}</Editable>
				<span>
					{
						thisComponent.props.type == 'metric'
						? <i className={"icon-filter"+(parsed.filter?' active':'')} onClick={thisComponent.selectFilter.bind(null, series_index, column_index, column.id)}></i>
						: false
					}
					<i className="icon-cancel" onClick={thisComponent.removeColumn.bind(null, column_index, series_index)}></i>
				</span>
			</div>
			<div className="block-bottom flex-row">
				<div className="column-name flex-grow drop-down-arrow" onClick={thisComponent.editColumn.bind(null, column_index, series_index)} title={column.parent && column.parent.label ? column.parent.label : ''+' '+(column.label || column.id)}>
					<div>{column.parent && column.parent.label ? column.parent.label : '-'}</div>
					<div>{column.label || column.id}</div>
				</div>
				{
					thisComponent.props.type == 'metric'
					? <div className="column-aggregate" onClick={thisComponent.editAggregate.bind(null, column_index, column)}>
						{
							transform
							? <span className="font-serif">{transform}</span>
							: false
						}
						<div>{aggregate || 'fx'}</div>
					</div>
					: false
				}
			</div>
			{
				thisComponent.props.type == 'metric' && thisComponent.props.showPartition
				? <div className="block-dimension">
					<i className="icon-ion-social-buffer-outline"></i>
					{
						column.partitions && column.partitions.length > 0
						? <div>
							{column.partitions.map(function(partition, index) {
								var details = IdUtils.details(partition) || {}
								var label = details.label || '';
								var parent = details.parent || '';
								return (<div key={index} onClick={thisComponent.selectDimension.bind(null, series_index, column_index, partition)}>
									<i className="icon-cancel" onClick={thisComponent.removeDimension.bind(null, series_index, column_index)}></i>
									<div>{parent.label}</div>
									<div>{label}</div>
								</div>)
							})}
						</div>
						: <div onClick={thisComponent.selectDimension.bind(null, series_index, column_index, '')} className="gray-out">Select Partition</div>
					}
				</div>
				: false
			}
		</div>

	}

});
