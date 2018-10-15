var React = require('react');

module.exports = React.createClass({
  getInitialState: function() {
    return {
    	charttype: 'Column'
     };
  },
  componentDidMount: function() {
  	this.redraw();
  },
  componentDidUpdate: function() {
  	this.redraw();
  },
  redraw: function() {
 	if(!this.props.data || this.props.data.rows.length == 0) {
  		return;
  	}
  	var series = [];

	var dataSize = 1;
	var columns = [];
	for(var i = 0; i < this.props.data.headers[this.props.data.headers.length-1].length; i++) {
		columns.push([]);
		dataSize++;
	}
	var data = this.props.data;
	var hasDimensionMetrics = true;
	var dimensionMetricCount=0;
	$.each(data.headers, function(i,heading) {
		var offset = 0;
		$.each(heading, function(x, column) {
			if(column.type == "metric") {
				hasDimensionMetrics = false;
				columns[x].push(data.columns[column.id].label);
				series.push({stack: data.columns[column.id].label});
			} else {
				for(var j = 0; j < column.span; j++) {
					columns[offset++].push(column.value);
				}
			}
		});
	});
	if(hasDimensionMetrics) {
		for(var i = 0; i < data.rowheaders.length; i++) {
			if(data.rowheaders[i].type=="metric") {
				dimensionMetricCount++;
			}
		}
	}

	var rows = [];
	var row = [null];
	for(var i = 0; i < columns.length; i++) {
		row.push(columns[i].join(" "));
	}
	rows.push(row);

  	for(var i = 0; i < data.rows.length; i++) {
  		var row = data.rows[i];
  		var dimLength = row.length - columns.length;

  		var graphRowData = new Array(columns.length + 1);
		graphRowData[0] = row.slice(0, dimLength).join(" ");
		var metrics = row.slice(dimLength);


  		var offset = 1;
		var total = 0;
		for(var x = 0; x < metrics.length; x++) {
			var value = metrics[x]?metrics[x]:0;
			graphRowData[x+offset] = value;
			total += value;
		}
		rows.push(graphRowData);
  	}

    $(this).highcharts({
        chart: {
            type: 'column'
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: true,
                    color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white',
                    style: {
                        textShadow: '0 0 3px black'
                    }
                }
            }
        },
        title: {
            text: 'Test'
        },
        data: {
            rows: rows
        },
        series: series
	 });
  },
  render: function() {
    return (<div style={{float: 'left', width: this.props.width, height: this.props.height}}>Pretty Graph</div>);
  }
});
