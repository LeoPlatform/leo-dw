var React = require('react');
var ReactDOM = require('react-dom');

module.exports = React.createClass({

	columnRowMapping: [],

	findPath: function(offset, depth) {
		var parent = $(this.refs.tableheader);
		var divs = parent.find(">div.row");
		if(depth === undefined) {
			depth = divs.length;
		}
		var path = [];
		for(var i = 0; i < depth; i++) {
			var row = $(divs[i]);
			var spanOffset = this.columnRowMapping[i][offset];
			if(!isNaN(spanOffset)) {
				var span = row.find(">span:nth-child("+(spanOffset+1)+")");
				if(!span.is('.metric')) {
					path.push(span.get(0));
				}
			}
		}
		return $(path);
	},

	drillIn: function(offset, row) {
		var drillIns = [];
		var path = this.findPath(offset,row);
		for(var i = 0; i < path.length; i++) {
			var span = $(path[i]);
			drillIns.push({
				id: span.data("id"),
				value: span.text()
			});
		}
		if(this.props.drillIn) this.props.drillIn(drillIns);
	},


	componentDidMount: function() {
		var component = this;
		$(this).on({
			click: function() {
				component.drillIn($(this).data('offset'), $(this).data('row'));
			}
		},'span.dimension');
		if (this.props.drillIn) {
			$(this).on({
				mouseenter: function() {
					component.findPath($(this).data('offset'), $(this).data('row')).addClass("hover");
				},
				mouseleave: function() {
					component.findPath($(this).data('offset'), $(this).data('row')).removeClass("hover");
				}
			},'span.dimension');
		}
	},

	reactScrollLeft: function(offset) {
		if(offset !== undefined) {
			ReactDOM.findDOMNode(this).scrollLeft = offset;
		}
		return ReactDOM.findDOMNode(this).scrollLeft;
	},

	render: function() {
		var marginLeft = 0;
		var component = this;
		var rowHeaders = [];
		var columnHeaders = [];
		var columnLookups = {};
		var headers = [];
		var rows = [];

		if (this.props.columnHeaders.length > 0 && this.props.rowHeaders.length > 0 && this.props.columns) {
			rowHeaders = this.props.rowHeaders;
			columnHeaders = this.props.columnHeaders;
			columnLookups = this.props.columns;
			headers = this.props.headers;
		}

		var hasDim = false;
		var columnIndexOffset = 0;
		rowHeaders.map(function(column) {
			if(column.type != "metric") {
				marginLeft += column.width;
				hasDim=true;
				columnIndexOffset++;
			}
		});

		marginLeft = Math.max(150, marginLeft);
		var tablewidth = 0;

		var count = headers.length-1;

		var lastRowColumns = headers[headers.length - 1];
		this.columnRowMapping = [];
		headers.map(function(row, i) {
			var columns = [];
			var isLastRow = i == (headers.length - 1);
			var height = null;

			var rowheader = columnHeaders[i];
			component.columnRowMapping[i] = [];

			if(isLastRow) {
				height = rowheader.height;
			} else if(rowheader.height) {
				height = rowheader.height;
			}
			var lastColumnOffset = 0;
			var spanOffset = 0;
			row.map(function(column,j) {
				var columnIndex = j + columnIndexOffset;
				var width = 0;
				if(isLastRow) {
					tablewidth += column.width;
					width = column.width;
				} else {
					for(var x = lastColumnOffset; x < lastColumnOffset+column.span; x++) {
						width += lastRowColumns[x].width;
					}
				}
				for(var x = lastColumnOffset; x < lastColumnOffset + column.span; x++) {
					component.columnRowMapping[i][x] = spanOffset;
				}

				lastColumnOffset += column.span;
				var isLastColumn = j == (row.length -1);
				var classes = "";
				if(rowheader.type == "metrics") {
					classes += " metric";
				} else {
					classes += " dimension";
				}
				if(column.last) {
					classes += " last";
				}
				if(isLastRow && columnIndex in component.props.sorted) {
					classes += " sorted_" + component.props.sorted[columnIndex].direction;
				}
				columns.push(<span key={"level"+ (count - i) + j} data-id={column.id} className={classes} data-row={i+1} data-offset={lastColumnOffset - column.span} data-columnindex={columnIndex} colSpan={column.span !== 1?column.span:null} style={{width: width}} title={column.value!==undefined?column.value:columnLookups[column.id].label}>{column.value!==undefined?column.value:columnLookups[column.id].label}</span>);

				if(column.spacer && !isLastColumn) {
					columns.push(<span key={"slevel"+ (count - i) + j} className="spacer"/>);
					if(isLastRow) {
						tablewidth += 5;
					}
				}
				spanOffset++;
			});
			rows.push(<div key={"level"+ (count - i)} className={"row level"+ (count - i)} style={{height: height}}>{columns}</div>);
		});

		return (
			<header className="metrics">
				<div ref="tableheader" className="tableheader" style={{width: tablewidth+"px"}}>
					{rows}
					{
						this.props.advanced && this.props.advanced.inlineFilters
						? <div className="row inline-filters" style={{height: '2em',background:'#eee'}}>
							<span style={{width:'100%'}}>&nbsp;</span>
						</div>
						: false
					}
				</div>
			</header>
		)
	}

});
