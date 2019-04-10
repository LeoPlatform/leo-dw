/* global $ */
/* global Highcharts */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var Line = {};
var _periodMap = null;

Line.init = function(params)
{
	_periodMap = params.periodMap;
	return Line;
};

var _report =  {
	name: "line",
	type: 'line',
	rows: [],
	columns: [],
	isHighcharts: true,
	hcParams: {
		//    xAxis: {type: 'datetime'}
	},
	reportParams: {addPeriodRows: true}
};

_report.onRefreshFn = function(data, chart, reportDataObj)
{
	// PRECONDITION: as a precondition of using this chart a period must be set
	//-var now = new Date();
	//-var startTime2 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()-36-1, 0,0).getTime();

	reportDataObj.seriesNames = reportDataObj.seriesNames ? reportDataObj.seriesNames : {};
    
	var dimensionName = reportDataObj.getDimensionName();
	var dimensionColIndex = data.columns[dimensionName].index;
	var metricName = reportDataObj.getMetric();
	var metricIsMoney = data.columns[metricName].format === "money";
	var metricColIndex = data.columns[metricName].index;
	var tickName = reportDataObj.getTick();
	var store, tickColIndex = data.columns[tickName].index;
	var rowCount = data.rows.length, now = new Date();
	var tickValue, startTime = reportDataObj.getPeriodLogicalStart(now, reportDataObj.params.periods ? (reportDataObj.params.periods - 1) : 1).getTime();

	var series = {};
	var total = {};
	for (store in reportDataObj.seriesNames) {
		series[store]= {data: []};
		total[store] = 0;
	}

	for(var i = 0; i < rowCount; i++) {
		var row = data.rows[i];

		var rowTime = reportDataObj.getRowPeriodDate(data.columns, row);
		if (!rowTime || rowTime.getTime() >= startTime)
		{
			if (!(row[dimensionColIndex] in series))
			{
				series[row[dimensionColIndex]] = {data: []};
				total[row[dimensionColIndex]] = 0;
			}
            
			var point = parseInt(row[metricColIndex], 10);
			total[row[dimensionColIndex]] += point;
			if(reportDataObj.params.cumulative) {point = total[row[dimensionColIndex]];}
            
			tickValue = row[tickColIndex];
            
			series[row[dimensionColIndex]].data.push({
				y: metricIsMoney ? (point / 100) : point,
				x: tickValue
			});
            
			if (i === (rowCount - 1))
			{
				// We're on the last row so lets see if the period ended exactly or not
				var numberLeftInPeriod = reportDataObj.getNumberLeftInPeriodFromDate(rowTime);
				if (numberLeftInPeriod > 0)
				{
					// Tack on extra points to take them to the end of the priod using the previously used metric
					for (var j = 0; j < numberLeftInPeriod; j++)
					{
						series[row[dimensionColIndex]].data.push({
							y: metricIsMoney ? (point / 100) : point,
							x: ++tickValue
						});
					}
				}
			}
		}
	}
	for (store in series) {
		if(!(store in reportDataObj.seriesNames) || !chart.series[reportDataObj.seriesNames[store]]) {
			reportDataObj.seriesNames[store] = chart.series.length;
            
			chart.addSeries({
				name: store,
				data: series[store].data,
				pointInterval: 3600 * 1000
			},false);
		} else {
			chart.series[reportDataObj.seriesNames[store]].update({
				pointStart: startTime,
				data: series[store].data
			}, false);
		}
	}
    
	chart.redraw();
};

Line.getReport = function()
{
	return _report;
};

module.exports = Line;
