/* global $ */
/* global Highcharts */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var MatrixCompare = {};
var ChartTypes = null;

var createTickClickHandler = function(rdo, dimAttrName, chartElId)
{
	return function(e)
	{
		return ChartTypes.fireLegendClick(rdo, dimAttrName, chartElId, $(this).text());
	};
};

MatrixCompare.init = function(params)
{
	ChartTypes = params.ChartTypes;
	return MatrixCompare;
};

var _report =  {
	name: "matrixCompare",
	type: 'heatmap',
	rows: [],
	columns: [],
	isHighcharts: true,
	hcParams:
    {
    	tooltip: {
    		formatter: function () {
    			//TODO: abstract this
    			return '<b>' + this.series.xAxis.categories[this.point.x] + '</b> sold <br><b>' +
                this.point.value + '</b> in gross through <br><b>' + this.series.yAxis.categories[this.point.y] + '</b>';
    		}
    	},
    	colorAxis: {
    		min: 0,
    		minColor: '#FFFFFF',
    		maxColor: Highcharts.getOptions().colors[0]
    	},
    	series: [{
    		name: 'Sales per Franchise', //TODO: abstract this
    		data: [],
    		color: '#55BF3B',
    		drilldown: true,
    		dataLabels: {
    			enabled: true,
    			color: '#000000'
    		}
    	}]
    },
	pivot: true,
	reportParams: {addPeriodRows: false}
};

_report.onRefreshFn = function(data, chart, reportDataObj)
{
	chart.xAxis.categories = [];
	chart.yAxis.categories = [];

	//TODO: can I count on the x axis value always being the first in each row?
	var xAxisColIndex = 0;
    
	var metricName = reportDataObj.getMetric();
	var metricIsMoney = data.columns[metricName].format === "money";

	//TODO: how can I count on data.headers[0] being the right list of values (carriers in first chart we created for this type)
	// Loop through and gather up all the yaxis values and then update the chart with them
	var value, entries = [], yAxisValues = [], xAxisValues = [], i, j, count = data && data.headers && data.headers.length > 0 ? data.headers[0].length : 0;
	for (i = 0; i < count; i++)
	{
		yAxisValues.push(data.headers[0][i].value);
	}
    
	chart.yAxis[0].update({categories : yAxisValues}, false);
    
	// Now loop through the rows.  The first value in each row is the xAxis value.  The following values in each
	// row are the metrics for each of yaxis values in the order of the yaxis values pull from the headers
	// array above.
	for (i = 0; i < data.rows.length; i++)
	{
		xAxisValues.push(data.rows[i][xAxisColIndex]);
		var entry = [];
		for (j = 0; j < yAxisValues.length; j++)
		{
			value = data.rows[i][xAxisColIndex + j + 1];
			value = value || 0; // Metric could be null or undefined
			value = metricIsMoney ? (value / 100) : value;
			entries.push({x: i, y: j, value: value});
		}
	}
    
	// Update the X axis values and then the data for the report itself.
	chart.xAxis[0].update({categories : xAxisValues}, false);
	chart.series[0].update({data: entries}, false);
	chart.redraw();
    
	var xTicks = chart.xAxis[0].ticks;
	var yTicks = chart.yAxis[0].ticks;
    
	var chartElId = $(chart).attr("renderTo").id;
    
	for (i in xTicks)
	{
		if (xTicks[i].label)
			$(xTicks[i].label.element).unbind('click').click(createTickClickHandler(reportDataObj, "xAxis", chartElId)).css({cursor: 'pointer'});
	}
    
	for (i in yTicks)
	{
		if(yTicks[i].label)
			$(yTicks[i].label.element).unbind('click').click(createTickClickHandler(reportDataObj, "yAxis", chartElId)).css({cursor: 'pointer'});
	}
};

MatrixCompare.getReport = function()
{
	return _report;
};

module.exports = MatrixCompare;
