var React = require('react');
var ReactDOM = require('react-dom');
var ReportActions = require('../../actions/ReportActions');
var Serializer = require('../../utils/Serializer');

var Headers = require('./reportGrid/headers.jsx');
var Rows = require('./reportGrid/rows.jsx');
var Rowheaders = require('./reportGrid/rowheaders.jsx');
var numeral = require("numeral");

module.exports = React.createClass({

	getInitialState: function() {
		return {
			inlineFilters: {}
		}
	},


	setStartRow: function(startRow) {
		this.startRow = startRow
	},


	getStartRow: function() {
		return this.startRow || 0
	},


	scrollDimensionsLeft: function() {
		var left = this.refs.rowHeaders.reactScrollLeft();
		this.refs.dimensionHeaders.scrollLeft = left;
	},


	scrollHorizontally: function() {
		var left = this.refs.rows.reactScrollLeft();
		this.refs.headers.reactScrollLeft(left);
		$('.rowSortableContainer .leo-metric-header').css({left:-left});
		$('.table-totals.metrics').css({left:-left})
	},


	scrollVertically: function() {
		var top = this.refs.rows.reactScrollTop();
		this.refs.rowHeaders.reactScrollTop(top);
	},


	componentDidMount: function() {
		var component = this;
		$(ReactDOM.findDOMNode(this)).on({
			click: function() {
				var e = $(this).closest(".row>span");
				ReportActions.sort(e.data('columnindex'), e.is('.sorted_asc') ? 'desc' : 'asc');
				Serializer.updateWindowHash();
			},
			mouseenter: function() {

			},
			mouseleave: function() {

			}
		},'div.row.level0 span');
	},


	factDrillIn: function(row, metricIndex, pos) {
		//this.refs.headers.drillIn(offset);
		this.refs.rowHeaders.drillIn(row, undefined, pos, metricIndex);
	},


	onWheel: function(e) {
		if (this.refs.rowHeaders.scrollTop) {
			var moveTo = this.refs.rowHeaders.scrollTop() + e.deltaY ;
			this.refs.rows.scrollTop(moveTo);
		}
	},


	addInlineFilter: function(column_id) {
		var advanced = this.props.advanced
		advanced.inlineFilters = advanced.inlineFilters || []
		if (typeof advanced.inlineFilters == 'string') {
			advanced.inlineFilters = (advanced.inlineFilters == 'true' ? [] : [advanced.inlineFilters])
		}
		advanced.inlineFilters.push(column_id)
		this.props.updateAdvanced(advanced)
	},


	removeInlineFilter: function(column_id) {
		var advanced = this.props.advanced

		if (typeof advanced.inlineFilters != 'object') {
			advanced.inlineFilters = Object.keys(this.props.columns).filter((column_id) => {
				return (this.props.columns[column_id].type != 'metric' && this.props.columns[column_id].type != 'fact')
			})
		}

		advanced.inlineFilters = advanced.inlineFilters.filter((filter) => {
			return filter != column_id
		})
		this.props.updateAdvanced(advanced)
	},


	changeInlineFilter: function(column_id, event) {
		var inlineFilters = this.state.inlineFilters
		inlineFilters[column_id] = event.currentTarget.value
		this.setState({ inlineFilters: inlineFilters })
	},


	render: function() {
		var component = this;
		var height = 0;
		var lastHeight = 0;
		var width = 0;

		this.props.headers.map(function(row, i) {
			var rowheader = component.props.columnHeaders[i];
			var isLastRow = i == (component.props.headers.length - 1);
			if (isLastRow) {
				lastHeight += ((rowheader || {}).height || 0);
			} else if (rowheader.height) {
				height += rowheader.height;
			}
		});

		var width = 0;
		this.props.rowHeaders.map(function(column,i) {
			if (column.type == 'metrics' || column.type != 'metric') {
				width += column.width;
			}
		});
		width = Math.max(150, width);

		var visibleRowCount = 300

		var totals = []
		   ,dataOffset = 0
		   ,rowHeaders = this.props.rowHeaders
		   ,lastRowColumns = this.props.headers.length > 0 ? this.props.headers[this.props.headers.length - 1] : []
		   ,rows

		rowHeaders.forEach((column,i) => {
			if (column.type != "metric") {
				dataOffset++
			}
		})

		rows = this.props.rows.filter((row, j) => {
			lastRowColumns.forEach((column, i) => {
				column = this.props.columns[column.id] || column
				var columnOffset = i + dataOffset
				var value = numeral().unformat(row[columnOffset])
				if (typeof value == 'number' && column.format !== 'string') {
					totals[i] = (typeof totals[i] == 'undefined' ? 0 : totals[i]) + value
				}
			})

			var matched = true
			rowHeaders.forEach((column, i) => {
				if (column.type != "metric") {
					if (this.state.inlineFilters[column.id] && matched) {
						var re = new RegExp(this.state.inlineFilters[column.id], 'i')
						matched = !!row[i].match(re)
					}
				}
			})
			return !!matched
		})

		return (
			<section key="reporttable" ref="reporttable" id="reporttable" className="report-table flexbox-parent">

				<div className="report-table-headers flexbox-item header">
					<header ref="dimensionHeaders" className="dimensionRow" style={{width: width}}>
						<div className="tableheader" style={{width: width, paddingRight: 0, marginTop: height}}>
							<div className="row level0" style={{height: lastHeight}}>
								{this.props.rowHeaders.map(function(column,i) {
									var classes= '';
									if (i in component.props.sorted && !component.props.sorted[i].auto) {
										classes += " sorted_" + component.props.sorted[i].direction;
									}
									if (column.type == 'metrics') {
										return (<span key={"dimheader"+ i} className={classes} data-id={column.id} style={{width: column.width}} data-columnindex={i}></span>);
									} else if (column.type != "metric") {
										return (<span key={"dimheader"+ i} className={classes} data-id={column.id} style={{width: column.width}} data-columnindex={i} title={component.props.columns[column.id].label}>
											{component.props.columns[column.id].label}
										</span>)
									}
								})}
							</div>
							{
								this.props.advanced && this.props.advanced.inlineFilters
								? (<div className="row inline-filters">
									{this.props.rowHeaders.map((column,i) => {
										if (column.type == 'metrics') {
											return false //(<span key={i} style={{width: column.width}}></span>)
										} else if (column.type != "metric") {

											if (this.props.advanced.inlineFilters && typeof this.props.advanced.inlineFilters == 'object' && this.props.advanced.inlineFilters.indexOf(column.id) == -1) {
												return (<span key={i} style={{width: column.width, position: 'relative'}} onClick={component.addInlineFilter.bind(null, column.id)} title="Add Filter">
												</span>)
											}

											return (<span key={i} style={{width: column.width, position: 'relative'}}>
												<input placeholder={'filter ' + component.props.columns[column.id].label} onChange={this.changeInlineFilter.bind(null, column.id)} />
												<i className="icon-cancel" onClick={component.removeInlineFilter.bind(null, column.id)} title="Remove Filter"></i>
											</span>)
										}
									})}
								</div>)
								: false
							}
						</div>
					</header>
					<Headers ref="headers" className="metricHeaders"
						drillIn={this.props.drillIn}
						columnHeaders={this.props.columnHeaders}
						columns={this.props.columns}
						rowHeaders={this.props.rowHeaders}
						sorted={this.props.sorted}
						headers={this.props.headers}
						advanced={this.props.advanced}
					/>
				</div>

				<div className="report-table-content flexbox-item fill-area content flexbox-item-grow">

					<Rowheaders ref="rowHeaders" className="dimensionRows"
						drillIn={this.props.drillIn}
						rowHeaders={this.props.rowHeaders}
						columns={this.props.columns}
						rows={rows}
						onWheel={this.onWheel}

						headers={this.props.headers}
						columnHeaders={this.props.columnHeaders}

						scrollDimensionsLeft={this.scrollDimensionsLeft}

						visibleRowCount={visibleRowCount}
						getStartRow={this.getStartRow}
						advanced={this.props.advanced}
					/>

					<Rows ref="rows" className="metricRows"
						isLoading={this.props.isLoading}
						factDrillIn={this.factDrillIn}
						rowHeaders={this.props.rowHeaders}

						columns={this.props.columns}
						headers={this.props.headers}
						rows={rows}
						scrollVertically={this.scrollVertically}
						scrollHorizontally={this.scrollHorizontally}

						visibleRowCount={visibleRowCount}
						setStartRow={this.setStartRow}
						totals={totals}
						advanced={this.props.advanced}
					/>

				</div>

			</section>
		);

	}

});
