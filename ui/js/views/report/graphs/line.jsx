var React = require('react');
module.exports = React.createClass({
  getInitialState: function() {
    return {
    	charttype: 'Line'
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
	var pieData = [];
	$.each(data.headers, function(i,heading) {
		var offset = 0;
		$.each(heading, function(x, column) {
			if(column.type == "metric") {
				hasDimensionMetrics = false;
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

	var labels = {
		items: []
	};



	var rows = [];
	var row = [null];
	for(var i = 0; i < columns.length; i++) {
		row.push(columns[i].join(" "));
	}
	rows.push(row);
  	var columnTotals = {};
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
			if(this.props.title == "Order Totals by Month") {
				graphRowData[x+offset] = (value/100).toFixed(2);
			}else {
				graphRowData[x+offset] = parseInt(value);
			}
			total += value;
			if(!(x in columnTotals)) {
				columnTotals[x] = parseInt(value);
			} else {
				columnTotals[x] += parseInt(value);
			}

			if(this.props.title == "Love it Bundles by Day (incremental)") {
				graphRowData[x+offset] = columnTotals[x];
			}
		}
		rows.push(graphRowData);
  	}
    $(this).highcharts({
        chart: {
        	type: 'line',
        	height: 300,
        },
        legend: {
        	enabled: true,
        	layout: 'vertical',
        	align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        labels: labels,
        title: {
            text: this.props.title
        },
        data: {
            rows: rows
        },
        series: series
	 });
  },
  render: function() {
    return (<div style={{width: this.props.width, height: this.props.height}}>Pretty Graph</div>);
  }
});
