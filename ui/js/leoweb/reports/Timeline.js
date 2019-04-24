/* global $ */
/* global Highcharts */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var Timeline = {};
var _periodMap = null;

Timeline.init = function(params)
{
	_periodMap = params.periodMap;
	return Timeline;
};

var _report =  {
	name: "timeline",
	type: "line",
	rows: [],
	columns: [],
	isHighcharts: true,
	hcParams: {xAxis: {type: 'datetime'}},
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
    
	var store, startTime = reportDataObj.getPeriodStartDate({day_over_day: 36}).getTime();

	var series = {};
	var total = {};
	for (store in reportDataObj.seriesNames) {
		series[store]= {data: []};
		total[store] = 0;
	}

	reportDataObj.sortRowsByPeriod(data);
    
	//                data.rows.sort(function(a,b) {
	//                    var arowTime = (parseInt(a[1]) + parseInt(a[2])) * 1000;
	//                    var browTime = (parseInt(b[1]) + parseInt(b[2])) * 1000;
	//                    return arowTime - browTime;
	//                });
    
	// hour by hour
	// days
    
	// Money comes from server in pennies, turn back into dollars when use the metric if it is money.
    
	for(var i = 0; i < data.rows.length; i++) {
		var row = data.rows[i];
		//var rowTime = (parseInt(row[1]) + parseInt(row[2])) * 1000;
        
		// If there isn't a period, we'll get back null.
		var rowTime = reportDataObj.getRowPeriodDate(data.columns, row);
        
		if (!rowTime || rowTime.getTime() >= startTime) {
			if(!(row[dimensionColIndex] in series)) {
				series[row[dimensionColIndex]] = {
					data: []
				};
				total[row[dimensionColIndex]] = 0;
			}
            
			var point = parseInt(row[metricColIndex], 10);
			total[row[dimensionColIndex]] += point;
			if(reportDataObj.params.cumulative) {
				point = total[row[dimensionColIndex]];
			}
            
            
			series[row[dimensionColIndex]].data.push({
				y: metricIsMoney ? (point / 100) : point,
				x: rowTime.getTime()
			});
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

Timeline.getReport = function()
{
	return _report;
};

module.exports = Timeline;
