var React = require('react');
var ReactDOM = require('react-dom');
var numeral = require("numeral");

module.exports = React.createClass({

	getInitialState: function() {
		this.visibleRowCount = this.props.visibleRowCount
		return {
			startRow: 0,
		}
	},


	drillIn: function(rowIndex, columnIndex, pos) {
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
				});
			}
		}

		if (this.props.drillIn) {
			this.setState({
				drillIn: {
					drillIns: drillIns,
					column: this.props.rowHeaders[columnIndex-1],
					position: pos
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
					var row = td.closest('tr').data('row');

					var offset = $('#reporttable').offset();
					var td_offset = td.offset();
					var left = td_offset.left-offset.left+td.width()-60;
					var top = td_offset.top-offset.top;
					var bottom = (window.innerHeight - td_offset.top);
					var right = (window.innerWidth - td_offset.left);

					var column = td.data('column');

					if (thisComponent.props.factDrillIn) {
						thisComponent.props.factDrillIn(row, column, { left:left, top:top, bottom: bottom, right: right });
					}

				});
				$(this).prepend(filterIcon);
			},
			mouseleave: function(e) {
				$(this).find('.icon-filter').remove();
			},
			mouseup: function(e) {
				e.preventDefault();

				var doc = document
				   ,text = $(e.target)[0]
				   ,range
				   , selection
				;
				if (doc.body.createTextRange) {
					range = document.body.createTextRange();
					range.moveToElementText(text);
					range.select();
				} else if (window.getSelection) {
					selection = window.getSelection();
					range = document.createRange();
					range.selectNodeContents(text);
					selection.removeAllRanges();
					selection.addRange(range);
				}

				/*
				var td =$(this).closest('td');
				var row = td.closest('tr').data('row');
				var offset = td.data('column');
				if(thisComponent.props.factDrillIn) thisComponent.props.factDrillIn(row, offset);
				*/
			}
		},'td');
	},


	componentDidUpdate: function() {
		this.adjustScrollFiller()
	},


	reactScrollTop: function(offset) {
		if (offset !== undefined) {
			this.refs.wrapper.scrollTop = offset;
		}
		return this.refs.wrapper.scrollTop;
	},


	reactScrollLeft: function(offset) {
		if(offset !== undefined) {
			this.refs.wrapper.scrollLeft = offset;
		}
		return this.refs.wrapper.scrollLeft;
	},

	/*
	scroll: function(e) {
		if ($(e.target).scrollLeft() !== false) {
			this.props.scrollHorizontally();
		}
		if ($(e.target).scrollTop() !== false) {
			this.props.scrollVertically();
		}
	},
	*/

	rowHeight: 29,

	adjustScrollFiller: function(startRow) {
		startRow = startRow || this.state.startRow
		var $element = $(this.refs.rowsTable)
		this.rowHeight = $element.find('.top-filler').next().height()
		$('#reporttable .top-filler').css({ height: this.rowHeight * startRow })
		$('#reporttable .bottom-filler').css({ height: this.rowHeight * (this.totalRows - startRow - this.visibleRowCount) })
	},


	handleScroll: function(event) {
		var scrollTop = $(event.currentTarget).scrollTop()
		var startRow = Math.floor(scrollTop / (this.rowHeight * (this.visibleRowCount/3))) * (this.visibleRowCount/3)
		if (startRow != this.state.startRow) {
			this.setState({ startRow: startRow }, () => {
				this.adjustScrollFiller(startRow)
			})
			this.props.setStartRow(startRow)
		} else {
			this.adjustScrollFiller(startRow)
		}

		if ($(event.target).scrollLeft() !== false) {
			this.props.scrollHorizontally();
		}
		if ($(event.target).scrollTop() !== false) {
			this.props.scrollVertically();
		}
	},


	widenColumn: function(columnOffset) {
		this.setState({ widenColumn: (this.state.widenColumn == columnOffset ? null : columnOffset) })
	},


	componentWillReceiveProps: function(newProps) {
		//console.log('componentWillReceiveProps', newProps)
	},


	render: function() {
		var thisComponent = this
		   ,tablewidth = 0
		   ,marginLeft = 0
		   ,dataOffset = 0
		   ,rowHeaders = this.props.rowHeaders
		   ,columnLookup = this.props.columns
		   ,lastRowColumns = this.props.headers.length > 0 ? this.props.headers[this.props.headers.length - 1] : []
		   ,rows = this.props.rows
		   ,maxWidths = []

		rowHeaders.forEach(function(column,i) {
			if (column.type != "metric") {
				dataOffset++
				marginLeft += column.width
			} else {
				maxWidths.push(column.width)
			}
		})

		lastRowColumns.forEach(function(column, i) {
			//calculate table width, account for last column borders
			var isLastColumn = (i !== lastRowColumns.length - 1)
			tablewidth += column.width
			if (column.spacer && isLastColumn ) {
				tablewidth += 5
			}
		})

		this.totalRows = rows.length

		var totals = this.props.totals

		return (
			<section key="maintable" id="maintable" className="fill-area content flexbox-item-grow">
				<div ref="wrapper" className="fill-area-content metrics-table-wrapper" onScroll={this.handleScroll}>
					<table style={{width: tablewidth, borderCollapse: 'separate'}} ref="rowsTable">
						<tbody>
							<tr className="fixed-spacing" />
							<tr className="top-filler"><td colSpan={lastRowColumns.length} /></tr>
							{
								rows.slice(this.state.startRow, this.state.startRow + this.visibleRowCount).map((row, j) => {
									return (<tr key={'r'+(j+this.state.startRow)} data-row={j}>{
										lastRowColumns.map((column, i) => {
											var columnOffset = i + dataOffset
											var isLastColumn = (columnOffset == (row.length -1))
											var muteText = ''
											var value = row[columnOffset];
											if (value == null) {
												value = '0'
												muteText = " uk-text-muted"
											}
											maxWidths[i] = Math.max(maxWidths[i], (value.length * 7))
											var columnWidth = (thisComponent.state.widenColumn == i ? maxWidths[i]: column.width-1)
											return (<td key={"r"+(j+this.state.startRow)+"x"+i} data-column={i} className={(column.last?'last':null) + muteText} style={{ width:columnWidth, minWidth:columnWidth, maxWidth:columnWidth }} onDoubleClick={thisComponent.widenColumn.bind(null, i)}>
												{value}
											</td>)
										})
									}</tr>)
								})
							}
							<tr className="bottom-filler"><td colSpan={lastRowColumns.length} /></tr>
						</tbody>
					</table>
				</div>
				{
					this.props.advanced && this.props.advanced.showTotals
					? <table className="table-totals metrics">
						<tbody>
							<tr>
							{
								lastRowColumns.map((column, i) => {

									switch(this.props.columns[column.id].format) {
										case 'base':
										case 'float':
											var total = numeral(totals[i]).format('0,0.00')
										break

										case 'money':
											var total = numeral(totals[i]).format('$0,0.00')
										break

										default:
										case 'count':
										case 'int':
											var total = numeral(totals[i]).format('0,0')
										break

										case 'string':
											var total = '-'
										break
									}

									var columnWidth = (thisComponent.state.widenColumn == i ? maxWidths[i]: column.width)

									return (<th key={i} style={{ width:columnWidth, minWidth:columnWidth, maxWidth:columnWidth }}>{total}</th>)
								})
							}
							</tr>
						</tbody>
					</table>
					: false
				}
			</section>
		);
	}
});
