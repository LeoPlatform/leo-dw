var React = require('react');

var ReportActions = require('../../actions/ReportActions');
var ReportStore = require('../../stores/ReportStore');
var Serializer = require('../../utils/Serializer');

var ColumnSearch = require('./columnSearch.jsx');

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
			axis:'y',
			handle: '.block-top',
			update: function() {
				thisComponent.updateRowOrder();
			}
		});

		$(this.refs.sortFacts).sortable({
			axis:'y',
			handle: '.block-top',
			update: function() {
				thisComponent.updateRowOrder();
			}
		});

	},


	updateRowOrder: function() {
		var updateRequired = false;
		var rowHeaders = this.props.columnHeaders;
		var items = $(this.refs.columnSortableContainer).find('li');

		var metricOrder = [];
		var dimOrder = [];

		for(var i = 0; i < items.length; i++) {
			if (rowHeaders[i].id !== $(items[i]).data('id')) {
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
			ReportActions.updateRowOrder(dimOrder, metricOrder);
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


	addRow: function(which, e) {
		var position = $(e.currentTarget).position();
		//position.left -= 270;
		//position.top += 10;

		position.width = $(e.currentTarget).outerWidth();
		position.height = $(e.currentTarget).outerHeight();

		position.left += position.width / 2;
		position.top += position.height;

		this.setState({ adding: 'add_' + which, position: position, add_class: 'arrow-up-right' })
	},


	closeAddRow: function() {
		this.setState({ adding: false })
	},


	render: function() {

		var thisComponent = this;
		var dims = [];
		var metrics = [];
		var columnHeaders = [];
		var columns = {};
		var rowCount = 0;

		if (this.props.columnHeaders.length > 0 && this.props.columns) {
		  	columnHeaders = this.props.columnHeaders;
		  	columns = this.props.columns;
		}

		columnHeaders.forEach(function(column, i) {
			if (column.type != "metric") rowCount++;
		});

		if (rowCount == 0) {

			dims.push(
				<li ref="emptyDimension" className="empty" key="drop" data-id="empty">
					<div className=""></div>
				</li>
			);

		}

		columnHeaders.map(function(column,i) {
			var isLastRow = (i == rowCount - 1);

			var height = column.height;

			if(isLastRow) {
			//	height += 24;
			}

			if(column.type == 'metric') {

				metrics.push(
					<SortTab
						type="metric"
						column={column}
						id={column.id}
						parent={columns[column.id].parent}
						label={columns[column.id].label}
						height={height}
						iterator={i}
						key={column.id+'-'+i}
						removeMetric={thisComponent.props.removeMetric}
						swapSortContainer={thisComponent.props.swapSortContainer} />
				);

			} else if(column.type == 'metrics') {

				metrics.push(
					<li key="metrics" ref="emptyMetric" data-id="empty" className="empty">
						<div className="" style={{height: height, lineHeight: height+'px'}}></div>
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
						height={height}
						iterator={i}
						key={column.id+'-'+i}
						removeDimension={thisComponent.props.removeDimension}
						swapSortContainer={thisComponent.props.swapSortContainer} />
				);

			}
		});

		return (
			<div className="columnSortableContainer" ref="columnSortableContainer">
				<div className="report-rows dimensions">
					<div>
						<span className="pull-right">
							<i className="hover-box-shadow icon-exchange" onClick={this.swapDims}></i>
						</span>
						<i className="icon-ion-social-buffer-outline"></i> Partitions
						<i className="hover-box-shadow icon-plus-circled" onClick={this.addRow.bind(this, 'dimension')}></i>
					</div>
					<ul ref="sortDimensions" className="reorder-rows">
						{dims}
					</ul>
				</div>

				{/*<div className="report-rows facts">
					<ul ref="sortFacts" className="reorder-rows">
						{metrics}
					</ul>
					<div>
						<i className="icon-sprite-123"></i> Metrics
						<i className="icon-plus-circled" onClick={this.addRow.bind(this, 'fact')}></i>
					</div>
				</div>*/}

				{
					this.state.adding
					? <ColumnSearch action={this.state.adding} where="column" position={this.state.position} addClass={this.state.add_class} closeChangeColumn={thisComponent.closeAddRow} />
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
		this.props.swapSortContainer("column", this.props.type, this.props.id);
	},

	removeItem: function() {
		if (this.props.type == "dimension") {
			this.props.removeDimension("column", this.props.id);
		} else {
			this.props.removeMetric("column", this.props.id);
		}
	},


	selectAxis: function(e) {
		var target = $(e.target).closest('li');
		var axis = target.find('.axis-heading').children();

		this.context.field_selected({
			type: target.hasClass('leo-metric-header') ? 'metric' : 'dimension',
			id: target.data('id'),
			label: $.trim(axis.last().text()),
			parent: $.trim(axis.first().text())
		});


		if (
			(target.hasClass('leo-metric-header') && $(document.body).hasClass('selecting-metric'))
			|| (target.hasClass('leo-dimension-header') && $(document.body).hasClass('selecting-dimension'))
		) {
			var axisName = [];
			target.find('.axis-heading').children().each(function() {
				var axisNamePart = $.trim($(this).text());
				if (axisNamePart != '') {
					axisName.push(axisNamePart);
				}
			})
			axisName = axisName.join(' - ');
			$('.selecting-axis.axis-name').val(axisName);
			if ($('[name="title"]').val() == '' && $('.selecting-axis ~ input[type="hidden"]').is('[name="metric"]')) {
				$('[name="title"]').val(axisName);
			}
			$('.selecting-axis ~ input[type="hidden"]').val(target.data('id'));
			var next = $('.selecting-axis').parent().next();
			$('.selecting-axis').removeClass('selecting-axis');
			$(document.body).removeClass (function (index, css) {
				return (css.match(/(^|\s)column-builder-picking-\S+/g) || []).join(' ');
			});
			$('.column-builder-field-target').removeClass('column-builder-field-target');
			if (next.length > 0) {
				next[0].focus()
				next[0].click();
			}

		}

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
					ReportActions.updateColumnByIndex((type=='metric' ? 'metric' : 'dimension'), 'column', id, column_index);
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
		if (this.props.type == "dimension") {
			var buttonStyle = "theme-button-primary";
			var textMod = '';
		} else {
			var buttonStyle = "theme-button-success";
			var textMod = "uk-text-small";
		}

		return (
			<li ref={this.props.id} className={"leo-"+this.props.type+"-header"} data-id={this.props.id} data-iterator={this.props.iterator} data-column_type={this.props.type} onClick={this.selectAxis}>

				<ColumnBlock key={this.props.iterator} type={this.props.column.type} isPartition="true" column={this.props.column} column_index={this.props.iterator} width={this.props.width} updateColumn={thisComponent.updateColumn} />

				<span title="To Top Bar" className="to-top-bar" onClick={this.swapSortContainer}></span>

				{
					(function() {

						switch(thisComponent.state.changing) {
							case 'change_dimension': case 'change_metric':
								return <ColumnSearch action={thisComponent.state.changing} where="column" position={{left:70,top:60,arrow:'arrow-up-right'}} id={thisComponent.props.id} iterator={thisComponent.props.iterator} parent={thisComponent.props.parent ? thisComponent.props.parent : ''} closeChangeColumn={thisComponent.closeChangeColumn} />
							break;

							case 'aggregates':
								return <Aggregates id={thisComponent.props.id} column={thisComponent.props.column} iterator={thisComponent.props.iterator} closeChangeColumn={thisComponent.closeChangeColumn} saveAggregate={thisComponent.saveAggregate} />
							break;

							case 'metric_filtering':
								return <MetricFiltering id={thisComponent.props.id} iterator={thisComponent.props.iterator} closeChangeColumn={thisComponent.closeChangeColumn} />
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
