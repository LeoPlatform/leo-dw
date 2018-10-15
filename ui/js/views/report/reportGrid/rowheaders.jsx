var React = require('react');
var ReactDOM = require('react-dom');

var ColumnSearch = require('../columnSearch.jsx');

module.exports = React.createClass({

	getInitialState: function() {
		return {
			drillIn: null
		};
	},


	closeChangeColumn: function() {
		this.setState({
			drillIn: null
		});
	},


	drillIn: function (rowIndex, columnIndex, pos, metricIndex) {
		var row = this.props.rows[rowIndex];
		var drillIns = [];
		if (columnIndex === undefined) {
			columnIndex = this.props.rowHeaders.length;
		}

		for(var i = 0; i < row.length && i < columnIndex; i++) {
			var column = this.props.rowHeaders[i];
			if (column.type != "metrics" && column.type != "metric" && column.id.indexOf('|band') ==-1) {
				drillIns.push({
					id: column.id,
					value: row[i]
				})
			}
		}

		if (this.props.columnHeaders.length > 0 && typeof metricIndex != 'undefined') {
			this.props.columnHeaders.forEach((columnHeader, index) => {
				if (columnHeader.type != 'metrics') {
					var column = this.props.headers[index][metricIndex]
					drillIns.push({
						id: column.id,
						value: column.value
					})
				}
			})
		}

		if (this.props.drillIn) {
			this.setState({
				drillIn: {
					drillIns: drillIns,
					column: this.props.rowHeaders[columnIndex-1],
					position: pos,
					metricIndex: metricIndex
				}
			});
		}

	},


	componentDidMount: function() {
		var thisComponent = this;
		$(ReactDOM.findDOMNode(this)).on({
			mouseenter: function(e) {
				var filterIcon = $('<i class="icon-filter"></i>').click(function() {
					var td = $(this).closest("td");
					var tr = $(this).closest("tr");

					var offset = $('#reporttable').offset();

					var td_offset = td.offset();
					var left = td_offset.left-offset.left+td.width()+30;
					var top = td_offset.top-offset.top;
					var bottom = (window.innerHeight - td_offset.top);
					var right = (window.innerWidth - td_offset.left);

					thisComponent.drillIn(tr.data("row"), td.prevAll().length+1, { left:left, top:top, bottom: bottom, right: right } );
				});
				$(this).append(filterIcon);
			},
			mouseleave: function(e) {
				$(this).find('.icon-filter').remove();
			}
		},'td');
		if (this.props.drillIn) {
			$(this).on({
				mouseenter: function() {
					$(this).closest("td").addClass("hover").prevAll("td").addClass("hover");
				},
				mouseleave: function() {
					$(this).closest("td").removeClass("hover").prevAll("td").removeClass("hover");
				}
			}, 'td');
		}
	},

	reactScrollTop: function(offset) {
		if (offset !== undefined) {
			this.refs.wrapper.scrollTop = offset
			//ReactDOM.findDOMNode(this).scrollTop = offset;
			this.setState({ startRow: this.props.getStartRow() }) //force update
		}
		return this.refs.wrapper.scrollTop
		//return ReactDOM.findDOMNode(this).scrollTop;
	},


	reactScrollLeft: function() {
		return ReactDOM.findDOMNode(this).scrollLeft;
	},


	scroll: function(e) {
		if ($(e.target).scrollLeft() !== false) {
			this.props.scrollDimensionsLeft();
		}
	},


	widenColumn: function(columnOffset) {
		this.setState({ widenColumn: (this.state.widenColumn == columnOffset ? null : columnOffset) })
	},


	render: function() {
		var thisComponent = this
		   ,width = 0
		   ,displayColumns = []
		   ,rowHeaders = []
		   ,columns = {}
		   ,rows = []
		   ,minWidth = 0
		   ,maxWidths = []

		if (this.props.rowHeaders.length > 0 && this.props.columns && this.props.rows){
			rowHeaders = this.props.rowHeaders;
			columns = this.props.columns;
			rows = this.props.rows;
		}

		displayColumns = rowHeaders.filter(function(column, i) {
			if (column.type != "metric") {
				width += column.width
				maxWidths.push(column.width)
				return true
			}
			return false
		})

		return (
			<aside style={{ width: Math.max(150, width), minWidth: minWidth }} className="fill-area-content fill-area content" onWheel={this.props.onWheel} onScroll={this.scroll}>
				<div ref="wrapper" className="dimensions-table-wrapper">
					<table>
						<tbody>
							<tr className="fixed-spacing" />
							<tr className="top-filler"><td colSpan={displayColumns.length} /></tr>
							{
								rows.slice(this.props.getStartRow(), this.props.getStartRow() + this.props.visibleRowCount).map((row, j) => {
									return (<tr key={"hrow"+j} data-row={j}>{
										displayColumns.map(function(column, columnOffset) {
											var value = row[columnOffset]
											if (value === null || value === undefined || value === ""  || value === " ") {
												value = String.fromCharCode(160)
											}
											maxWidths[columnOffset] = Math.max(maxWidths[columnOffset], (value.length * 7))
											if (!minWidth) {
												minWidth = column.width
											}
											var columnWidth = (thisComponent.state.widenColumn == columnOffset ? maxWidths[columnOffset]: column.width)
											return (<td key={"hr"+j+"x"+columnOffset} className={column.type=='metrics'?'metric':'dimension'} style={{width:columnWidth, minWidth:columnWidth, maxWidth:columnWidth}} onDoubleClick={thisComponent.widenColumn.bind(null, columnOffset)}>
												<span>{value}</span>
											</td>)
										})
									}</tr>)
								})
							}
							<tr className="bottom-filler"><td colSpan={displayColumns.length} /></tr>
						</tbody>
					</table>
				</div>
				{
					(thisComponent.state.drillIn)
					? <ColumnSearch
						action="drill_in"
						position={thisComponent.state.drillIn.position}
						id={this.state.drillIn.column.id}
						drillIns={this.state.drillIn.drillIns}
						metricIndex={this.state.drillIn.metricIndex}
						closeChangeColumn={this.closeChangeColumn}
						drillIn={this.props.drillIn}
						/>
					: false
				}
				{
					this.props.advanced && this.props.advanced.showTotals
					? <table className="table-totals dimensions">
						<tbody>
							<tr>
							{
								displayColumns.map((column, columnOffset) => {
									var columnWidth = (thisComponent.state.widenColumn == columnOffset ? maxWidths[columnOffset]: column.width)
									return (<th key={columnOffset} style={{width:columnWidth, minWidth:columnWidth, maxWidth:columnWidth}}>
										&nbsp;
									</th>)
								})
							}
							</tr>
						</tbody>
					</table>
					: false
				}
			</aside>
		);
	}

});
