/* global $ */
/* global Highcharts */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var CumulativeTimeSeries = {};
var _periodMap = null;

CumulativeTimeSeries.init = function(params)
{
	_periodMap = params.periodMap;
	return CumulativeTimeSeries;
};

var _report =  {
	name: "cumulativeTimeSeries",
	type: "column",
	rows: [],
	columns: [],
	isHighcharts: true,
	hcParams:
    {
    	xAxis: { type: 'datetime' },
    	yAxis: [{}, {opposite: true}]
    },
	reportParams: {addPeriodRows: true}
};

_report.onRefreshFn = function(data, chart, reportDataObj)
{
	reportDataObj.seriesNames = reportDataObj.seriesNames ? reportDataObj.seriesNames : {};
	//reportDataObj.seriesNamesZ = reportDataObj.seriesNamesZ ? reportDataObj.seriesNamesZ : {};
	reportDataObj.zSeriesIndex = reportDataObj.zSeriesIndex || null;
    
	var now = new Date();
	var dimensionName = reportDataObj.getDimensionName();
	var dimensionColIndex = dimensionName ? data.columns[dimensionName].index : null;
	var haveDimension = dimensionColIndex !== null;
	var metricName = reportDataObj.getMetric();
	var metricIsMoney = data.columns[metricName].format === "money";
	var metricColIndex = data.columns[metricName].index;
	var zAxisMetricName = reportDataObj.getZAxisName();
	var zAxisMetricDisplayName = reportDataObj.getZAxisDisplayName();
	var zAxisMetricIsMoney = zAxisMetricName ? data.columns[zAxisMetricName].format === "money" : null;
	var zAxisMetricColIndex = zAxisMetricName ?  data.columns[zAxisMetricName].index : null;
	var startTime = reportDataObj.getPeriodStartDate({day_over_day: 36}).getTime();
    
	zAxisMetricDisplayName = zAxisMetricDisplayName || zAxisMetricName;
    
	var seriesName, series = {}, seriesZ = null, seriesZTimeIndex = null;
	for(seriesName in reportDataObj.seriesNames)
	{
		series[seriesName]= {data: []};
	}
    
	if (zAxisMetricName)
	{
		seriesZ = [];
		seriesZTimeIndex = {};
	}
    
	for (var i = 0; i < data.rows.length; i++)
	{
		var row = data.rows[i];
		var seriesName, seriesObj, seriesObjZ, rowTime = reportDataObj.getRowPeriodDate(data.columns, row);
        
		if (!rowTime || rowTime.getTime() >= startTime)
		{
			// If the report doesn't have a dimension, use a dimension name of "" as the key so we can use the same logic.
			seriesName = haveDimension ? row[dimensionColIndex] : "";
			if(!(seriesName in series))
				series[seriesName] = {data: []};
            
			seriesObj = {
				y: metricIsMoney ? (parseInt(row[metricColIndex], 10) / 100) : parseInt(row[metricColIndex], 10),
				x: rowTime.getTime()
			};
            
			series[seriesName].data.push(seriesObj);
            
			if (zAxisMetricName)
			{
				/*
                if (!(row[dimensionColIndex] in seriesZ))
                    seriesZ[row[dimensionColIndex]] = {data: []};
                
                seriesZ[row[dimensionColIndex]].data.push({
                    y: zAxisMetricIsMoney ? (parseInt(row[zAxisMetricColIndex], 10) / 100) : parseInt(row[zAxisMetricColIndex], 10),
                    x: rowTime.getTime()
                });
                */
				var seriesZYVal = zAxisMetricIsMoney ? (parseInt(row[zAxisMetricColIndex], 10) / 100) : parseInt(row[zAxisMetricColIndex], 10);
				var seriesZObj = seriesZTimeIndex[!rowTime ? "" : rowTime.getTime() + ""];
				if (seriesZObj)
				{
					seriesZObj.y += seriesZYVal;
				}
				else
				{
					seriesZObj = {y: seriesZYVal, x: !rowTime ? "" : rowTime.getTime()};
					seriesZ.push(seriesZObj);
					seriesZTimeIndex[!rowTime ? "" : rowTime.getTime() + ""] = seriesZObj;
				}
                    
			}
		}
	}
    
	if (seriesZ && seriesZ.length > 0)
	{
		// Have to sort them ascending based on time.
		seriesZ.sort(function(a, b)
		{
			return a.x - b.x;
		});
	}

	for (seriesName in series)
	{
		if (!(seriesName in reportDataObj.seriesNames) || !chart.series[reportDataObj.seriesNames[seriesName]])
		{
			reportDataObj.seriesNames[seriesName] = chart.series.length;
			chart.addSeries({
				name: haveDimension ? seriesName : "Data",
				showInLegend: haveDimension, 
				data: series[seriesName].data,
				pointStart: startTime,
				pointInterval: 3600 * 1000
			},false);
		}
		else
		{
			chart.series[reportDataObj.seriesNames[seriesName]].update({
				pointStart: startTime,
				data: series[seriesName].data
			}, false);
		}
	}
    
	if (zAxisMetricName)
	{
		if (reportDataObj.zSeriesIndex === null)
		{
			reportDataObj.zSeriesIndex = chart.series.length;
			chart.addSeries({
				name: zAxisMetricDisplayName,
				yAxis: 1,
				type: "line",
				data: seriesZ,
				pointStart: startTime,
				pointInterval: 3600 * 1000
			},false);
		}
		else
		{
			chart.series[reportDataObj.zSeriesIndex].update({
				pointStart: startTime,
				data: seriesZ,
				axis: 2
			}, false);
		}
	}
	chart.redraw();
};

CumulativeTimeSeries.getReport = function()
{
	return _report;
};

module.exports = CumulativeTimeSeries;
