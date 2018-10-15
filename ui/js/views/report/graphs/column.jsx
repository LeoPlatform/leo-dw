var React = require('react');
var colorMap = {
	orange: '#F79861',
	purple: '#5E0B67',
	black: '#211D1E',
	green: '#009F5B',
	blue: '#00A5E5',
	yellow: '#FEF56A',
	pink: '#DD4698',
	white: '#FDFDFD'
};
var brightnessMap = {
	'<5': .3,
	'5-15': .2,
	'15-30': .15,
	'30-60': .1,
	'60-90': .05,
	'90-120': 0,
	'120+': -.1,

}

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
	var pieData = [];
	$.each(data.headers, function(i,heading) {
		var offset = 0;
		$.each(heading, function(x, column) {
			if(column.type == "metric") {
				hasDimensionMetrics = false;
			} else {
				if(i == 0) {
					for(var j = 0; j < column.span; j++) {
						columns[offset++].push(column.value);
					}
				} 
				if(i == 1 || data.headers.length == 2) {
					var s = {type: 'column', stack: column.value,drilldown: true};
					if(["orange", "green", "black", "purple"].indexOf(column.value) !== -1) {
						s.color = colorMap[column.value];
						s.color = Highcharts.Color(colorMap[column.value]).brighten(brightnessMap[columns[x]]).get();
					}
					series.push(s);
					pieData.push({
						name: columns[x].value,
						y: 0,
						color: s.color				
					});				
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
	var legend = {};
	if(this.props.title == "Presenter Signups by Market/Recognized Rank") {
		legend = {
              text: 'Days since Signup<br/><span style="font-size: 9px; color: #666; font-weight: normal">(Click to hide)</span>',
                style: {
                    fontStyle: 'italic'
                }
            };
	}
	if(this.props.options.showPie) {
		series.push({
            type: 'pie',
            name: 'Totals',
            data: pieData,
            center: [70, 30],
            size: 100,
            showInLegend: false,
            dataLabels: {
                enabled: false
            }
		});
		if(this.props.title == "Presenter Signups by Market/Recognized Rank") {
			labels.items.push({
	                html: 'Total Signups',
	                style: {
	                    left: '130px',
	                    top: '10px',
	                    color: (Highcharts.theme && Highcharts.theme.textColor) || 'black'
	                }
	        });
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
			if(this.props.title == "Order Totals by Month" || this.props.title == "Love it Bundle Total Sales $") {
				graphRowData[x+offset] = (value/100).toFixed(2);
			}else {
				graphRowData[x+offset] = parseInt(value);
			} 
			total += parseInt(value);
			pieData[x].y += parseInt(value);
		}
		rows.push(graphRowData);
  	}
    $(this).highcharts({
        chart: {
        	height: 300,
            options3d: {
                enabled: true,
                alpha: 15,
                beta: 15,
                viewDistance: 25,
                depth: 40
            },
            events: {
            	drilldown: function (e) {
		            if (!e.seriesOptions) {
		                // e.point.name is info which bar was clicked
		                chart.showLoading('Simulating Ajax ...');
		                $.get("path/to/place.html?name=" + e.point.name, function(data) {
		                    /***
		                    where data is this format:
		                    data = {
		                        name: 'Cars',
		                        data: [
		                            ['Toyota', 1],
		                            ['Volkswagen', 2],
		                            ['Opel', 5]
		                        ]
		                    }
		                    ***/
		                    chart.hideLoading();
		                    chart.addSeriesAsDrilldown(e.point, data);
		                });
		            }
		    	}
	        }
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                depth: 40
            }
        },
        legend: {
        	enabled: true,
        	layout: 'vertical',
        	align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0,
            title: legend
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
