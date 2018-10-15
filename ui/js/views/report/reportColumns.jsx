var React = require('react');
var ReportActions = require('../../actions/ReportActions');
var ReportStore = require('../../stores/ReportStore');
var Serializer = require('../../utils/Serializer');
var ColumnSearch = require('./columnSearch.jsx');
var Aggregates = require('./aggregates.jsx');
var MetricFiltering = require('./metricFiltering.jsx');
var ColumnBlock = require('../common/ColumnBlock.jsx');
var IdUtils = require('../../utils/IdUtils');


module.exports = React.createClass({

	getInitialState: function() {
		return {
			adding: false
		}
	},


	componentDidMount: function() {

		var thisComponent = this;

		$(this.refs.sortDimensions).sortable({
			axis:'x',
			handle: '.block-top',
			update: function() {
				thisComponent.updateColumnOrder();
			}
		});

		$(this.refs.sortFacts).sortable({
			axis:'x',
			handle: '.block-top',
			update: function() {
				thisComponent.updateColumnOrder();
			}
		});

	},


	updateColumnOrder: function() {
		var updateRequired = false;
		var columnHeaders = this.props.rowHeaders;
		var items = $(this.refs.rowSortableContainer).find('li:not(.empty)');

		var metricOrder = [];
		var dimOrder = [];

		for(var i = 0; i < items.length; i++) {
			if (columnHeaders[i].id !== $(items[i]).data('id')) {
				updateRequired = true;
			}
			var iterator = $(items[i]).data('iterator');
			if (iterator || iterator === 0) { //not a placeholder
				if ($(items[i]).data('column_type') == 'dimension') {
					dimOrder.push(iterator);
				} else {
					metricOrder.push(iterator);
				}
			}
		}

		if (updateRequired) {
			ReportActions.updateColumnOrder(dimOrder, metricOrder);
			Serializer.updateWindowHash();
		}
	},


	swapDims: function() {
		ReportActions.swapDimsInSortContainers();
		Serializer.updateWindowHash();
	},


	swapMetrics: function() {
		ReportActions.swapMetricsInSortContainers();
		Serializer.updateWindowHash();
	},


	addColumn: function(which, e) {
		var position = $(e.currentTarget).position();
		position.width = $(e.currentTarget).outerWidth();
		position.height = $(e.currentTarget).outerHeight();
		position.top += position.height;
		this.setState({ adding: 'add_' + which, position: position, add_class: 'arrow-up-left' })
	},


	closeAddColumn: function() {
		this.setState({ adding: false })
	},


	editAdvancedSettings: function() {
		this.setState({ editAdvancedSettings: true })
	},


	render: function() {
		var thisComponent = this;
		var dims = [];
		var metrics = [];
		var rowHeaders = [];
		var columns = [];

		if (this.props.rowHeaders.length > 0 && this.props.columns) {
			rowHeaders = this.props.rowHeaders;
			columns = this.props.columns;
		}

		rowHeaders.map(function(column, i) {

			if (column.type == 'metric') {

				if(i == 0) {

					dims.push(
						<li ref="dimension" className="empty" key={i} data-id="empty" style={{width: 148}}>
							<div className="heading"></div>
						</li>
					);

				}

				column.label = columns[column.id].label;
				column.parent = { label: columns[column.id].parent };

				metrics.push(
					<SortTab
						type="metric"
						column={column}
						id={column.id}
						parent={columns[column.id].parent}
						label={columns[column.id].label}
						width={column.width}
						iterator={i}
						key={column.id+'-'+i}
						removeMetric={thisComponent.props.removeMetric}
						swapSortContainer={thisComponent.props.swapSortContainer} />
				);


			} else if(column.type == 'metrics') {

				metrics.push(
					<li key="columnHeader metrics" className="empty" ref="metrics" data-id="empty" style={{width: column.width}}>
						<div className="">Metrics</div>
					</li>
				);

			} else {

				column.label = columns[column.id].label;
				column.parent = { label: columns[column.id].parent };

				dims.push(
					<SortTab
						type="dimension"

						column={column}

						id={column.id}
						parent={columns[column.id].parent}
						label={columns[column.id].label}
						width={column.width}
						iterator={i}
						key={column.id+'-'+i}
						removeDimension={thisComponent.props.removeDimension}
						swapSortContainer={thisComponent.props.swapSortContainer} />
				);

			}
		});

		return (
			<div className="rowSortableContainer" ref="rowSortableContainer">

				<div className="report-columns dimensions">
					<div>
						<i className="icon-ion-social-buffer-outline"></i> Dimensions
						<i className="hover-box-shadow icon-plus-circled" onClick={this.addColumn.bind(this, 'dimension')}></i>
						<span className="pull-right">
							<i className="hover-box-shadow icon-exchange" onClick={this.swapDims}></i>
						</span>
					</div>
					<ul ref="sortDimensions" className="reorder-columns">
						{dims}
					</ul>
				</div>

				<div className="report-columns facts">
					<div>
						<i className="icon-sprite-123"></i> Metrics
						<i className="hover-box-shadow icon-plus-circled" onClick={this.addColumn.bind(this, 'fact')}></i>
					</div>

					<ul ref="sortFacts" className="reorder-columns">
						{metrics}
					</ul>
				</div>

				{
					this.state.adding
					? <ColumnSearch action={this.state.adding} position={this.state.position} addClass={this.state.add_class} closeChangeColumn={thisComponent.closeAddColumn} />
					: false
				}

			</div>
		);

	}

});


var SortTab = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired,
		field_selected: React.PropTypes.func.isRequired
	},


	getInitialState: function() {
		return {
			changing: false
		}
	},


	swapSortContainer: function() {
		this.props.swapSortContainer("row", this.props.type, this.props.id);
	},


	removeItem: function() {
		if (this.props.type == "dimension") {
			this.props.removeDimension("row", this.props.id);
		} else {
			this.props.removeMetric("row", this.props.id);
		}
	},


	selectAxis: function(e) {
		var target = $(e.target).closest('li');
		var axis = target.find('.axis-heading').children();

		var parent_id = this.props.id.slice(0, this.props.id.lastIndexOf('.'));

		this.context.field_selected({
			type: target.hasClass('leo-metric-header') ? 'metric' : 'attribute',
			id: target.data('id'),
			label: $.trim(axis.last().text()),
			parent: parent_id
		});
	},


	changeColumn: function() {
		this.setState({
			changing: (this.props.type == 'dimension' ? 'column_search' : 'aggregates')
		})
	},


	filterMetric: function() {
		this.setState({
			changing: 'metric_filtering'
		})
	},


	saveAggregate: function(id, iterator) {
		ReportActions.updateColumnByIndex('metric', 'row', id, iterator);

		this.closeChangeColumn();

		setTimeout(function() {
			Serializer.updateWindowHash();
		}, 50);
	},


	closeChangeColumn: function() {
		try {
			this.setState({changing:false})
		} catch(e) {}
	},


	updateColumn: function(action, type, column_index, value) {
		switch(action) {
			case 'remove_column':
				this.removeItem()
			break;

			case 'edit_column':
				this.setState({ changing: (type == 'metric' ? 'change_metric' : 'change_dimension') });
			break;

			case 'change_aggregate':
				this.setState({ changing: 'aggregates' });
			break;

			case 'change_metric_filter':
				this.setState({ changing: 'metric_filtering' });
			break;

			case 'update_label':
				var id = IdUtils.build(this.props.id, {label:value});
				if (id != this.props.id) {
					ReportActions.updateColumnByIndex((type=='metric' ? 'metric' : 'dimension'), 'row', id, column_index);
					setTimeout(function() {
						Serializer.updateWindowHash();
					}, 50);
				}
			break;

			default:
				console.log('not implimented:', action, type, column_index, value)
			break;
		}
	},


	render: function() {

		var thisComponent = this;

		var tooltip = this.props.parent ? this.props.parent+' - '+this.props.label : this.props.label;

		var id = (typeof this.props.id == 'object' ? this.props.id.id : this.props.id)

		var is_normalized = (id.indexOf('|normalize') != -1);

		var is_advanced = (id.indexOf('|percent') != -1 || id.indexOf('|cumulative') != -1 || id.indexOf('|rank') != -1 || id.indexOf('|band') != -1);

		var is_distinct_count = (id[0] == 'd' && id.indexOf('|count') != -1);

		return (
			<li ref={id} style={{width: (this.props.width)}} className={"leo-"+this.props.type+"-header"+(id.indexOf('.') == -1 ? ' is_parent' :'')+(id.indexOf(':') != -1 ? ' is_advanced' :'')+(!this.props.parent ? ' is_derived' :'')} data-iterator={this.props.iterator} data-column_type={this.props.type} data-id={this.props.id} onClick={this.selectAxis} >

				<ColumnBlock key={this.props.iterator} type={this.props.column.type} column={this.props.column} column_index={this.props.iterator} width={this.props.width} updateColumn={thisComponent.updateColumn} />

				{
					this.props.type == "dimension"
					? <span title="To Right Bar" className="to-right-bar" onClick={this.swapSortContainer}></span>
					: false
				}

				{
					(function() {

						switch(thisComponent.state.changing) {
							case 'change_dimension': case 'change_metric':
								return <ColumnSearch action={thisComponent.state.changing} position={{left:20,top:60,arrow:'arrow-up-left'}} id={thisComponent.props.id} iterator={thisComponent.props.iterator} parent={thisComponent.props.parent ? thisComponent.props.parent : ''} closeChangeColumn={thisComponent.closeChangeColumn} />
							break;

							case 'aggregates':
								return <Aggregates id={thisComponent.props.id} column={thisComponent.props.column} iterator={thisComponent.props.iterator} closeChangeColumn={thisComponent.closeChangeColumn} saveAggregate={thisComponent.saveAggregate} />
							break;

							case 'metric_filtering':
								return <MetricFiltering id={thisComponent.props.id} popupMenu="arrow-up-left" position={{ top: 25, marginLeft: 53 }} iterator={thisComponent.props.iterator} closeChangeColumn={thisComponent.closeChangeColumn} />
							break;

							default:
								return false;
							break;
						}

					})()
				}

			</li>
		);

	}

});
