/* global $ */
/* global Highcharts */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var Column = {};
var _periodMap = null;

Column.init = function(params)
{
    _periodMap = params.periodMap;
    return Column;
};

var _report =  {
    name: "column",
    type: "column",
    rows: [],
    columns: [],
    isHighcharts: true,
//    hcParams: {xAxis: { type: 'datetime' }},
    pivot: false,
    reportParams: {addPeriodRows: false}
};

//TODO: use this to turn off allowDecimals
//http://jsfiddle.net/sBC9K/
/*
yAxis: {
      allowDecimals:true,
      labels: {
        style: {
          fontSize: '9px',
          width: '175px'
        }
      },
      title: {
        text: ''
      }
    },
 */

_report.onRefreshFn = function(data, chart, reportDataObj)
{
    var now = new Date();
    
    var xAxisName = reportDataObj.getXAxisName();
    var xAxisColIndex = data.columns[xAxisName].index;
    var yAxisName = reportDataObj.getYAxisName();
    var yAxisColIndex = data.columns[yAxisName].index;
    var metricName = reportDataObj.getMetric();
    var metricIsMoney = data.columns[metricName].format === "money";
    var metricColIndex = data.columns[metricName].index;
    //var startTime = reportDataObj.getPeriodStartDate({day_over_day: 36}).getTime();
    
    var series = {}, seriesName, rowTime, row, i, count = chart.series ? chart.series.length : 0;
    
    // Start by removing all series' from the chart...
    for (i = count - 1; i >= 0; i--)
    {
        chart.series[i].remove(false);
    }
    
    // Now start collating the data, we want a map of xVals that contain a map of series values
    var metricVal, xVal, yVal, xVals = {};
    var seriesNamesFound = {};
    count = data.rows.length;
    
    for (i = 0; i < count; i++)
    {
        row = data.rows[i];
        xVal = row[xAxisColIndex];
        yVal = row[yAxisColIndex];
        metricVal = metricIsMoney ? (parseInt(row[metricColIndex], 10) / 100) : parseInt(row[metricColIndex], 10);
        
        if (!(xVal in xVals)) {xVals[xVal] = {};}
        
        xVals[xVal][yVal] = metricVal;
        
        if (!(yVal in seriesNamesFound)) {seriesNamesFound[yVal] = true;}
    }

    // Create the X categories for the chart
    var seriesData, chartXCategories = [];
    for (xVal in xVals) {chartXCategories[chartXCategories.length] = xVal;}
    chartXCategories.sort();
    chart.xAxis[0].update({categories: chartXCategories}, false);
    
    // Now get the series data and add the series'
    count = chartXCategories.length;
    for (seriesName in seriesNamesFound)
    {
        seriesData = [];
        
        for (i = 0; i < count; i++)
        {
            xVal = chartXCategories[i];
            seriesData[i] = xVals[xVal][seriesName] ? xVals[xVal][seriesName] : 0;
        }

        chart.addSeries(
        {
            name: seriesName,
            data: seriesData
        }, false);
    }
    
    chart.redraw();
};

Column.getReport = function()
{
    return _report;
};

module.exports = Column;