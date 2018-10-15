var base = require("../base.js");
var React = require("react");
import {Table, Column, Cell, ColumnGroup} from 'fixed-data-table';

const TextCell = ({rowIndex, data, col, formatter, ...props}) => (
  <Cell {...props}>
    {formatter(data[rowIndex][col])}
  </Cell>
);


module.exports = function (element,spec, options, my) {
  my = my || {};
  var that = base(element, spec, options, my);
  element.on('mousewheel DOMMouseScroll', function(e) {
    e.preventDefault();
  });
  
  my.redraw = function() {
    var compareValue = null;
    var data = my.dataSources[0];
    
    var columns = [];
    if(data.rowheaders.length) {//has partitions
      var groupColumns=[];
      var lastHeader = null;
      for(let i = 0; i < data.headerMapping[1].length; i++) {
        var map = data.headerMapping[0][i];
        if(map === null) {//then it is a dimension
          var column = data.columns[data.columnheaders[i].id];
          groupColumns.push(<Column
            header={<Cell>{column.label}</Cell>}
            cell={<TextCell data={data.rows} col={i} formatter={column.formatter}/>}
            width={120}
            fixed={true}
          />);
        } else {
          var header = data.headers[0][map];
          if(!lastHeader || header.value !== lastHeader.value) {
            if(lastHeader || groupColumns.length) {
              columns.push(<ColumnGroup fixed={lastHeader===null} header={<Cell>{lastHeader?lastHeader.value:''}</Cell>}>{groupColumns}</ColumnGroup>);
            }
            groupColumns = [];
          }
          lastHeader = header;
          
          var column = data.columns[data.headers[1][data.headerMapping[1][i]].id];
          groupColumns.push(<Column
            header={<Cell className="overflow-ellipsis" title={column.label}>{column.label}</Cell>}
            cell={<TextCell className="align-right" data={data.rows} col={i} formatter={column.formatter} />}
            width={120}
            />);
        }
      }
      if(lastHeader) {
        columns.push(<ColumnGroup header={<Cell>{lastHeader.value}</Cell>}>{groupColumns}</ColumnGroup>);
      }
    }
    
    return <Table
      rowsCount={data.rows.length}
      width={element.width()}
      maxHeight={element.height()}
      groupHeaderHeight={25}
      headerHeight={30}
      rowHeight={30}>
      {columns}
    </Table>
  };
  return that;
};
