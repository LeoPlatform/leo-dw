/* global $ */
/* global Highcharts */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var Tree = {};
var _periodMap = null;

Tree.init = function(params)
{
	_periodMap = params.periodMap;
	return Tree;
};

var _report =  {
	name: "tree",
	type: 'treemap',
	rows: [],
	columns: [],
	isHighcharts: true,
	hcParams:
    {
    	series: [{
    		name: 'Sales per Customer',
    		data: [],
    		layoutAlgorithm: 'stripes',
    		color: Highcharts.getOptions().colors[0],
    		drilldown: true,
    		dataLabels: {
    			rotation: -90,
    			enabled: true,
    			shadow: false
    		}
    	}]
    },
	reportParams: {addPeriodRows: true}
};

_report.onRefreshFn = function(data, chart, reportDataObj)
{
	var entries = [];
	var dimensionName = reportDataObj.getDimensionName();
	var dimensionColIndex = data.columns[dimensionName].index;
	var metricName = reportDataObj.getMetric(); //"f_webship.margin|sum"
	var metricIsMoney = data.columns[metricName].format === "money";
	var metricColIndex = data.columns[metricName].index;
	var startOfPeriod = reportDataObj.getPeriodStartDate({periods: 1}).getTime();
	var name, rows = [], rowsHash = {};
    
	// We only want to consider the last period of time (1 day, week, month, quarter, year, etc.),
	// so, if the date of the row is in the period include it for use. 
	// Also, collapse any rows with the same name into a single entry
	var row, i, count = data.rows.length;
	for (i = 0; i < count; i++)
	{
		row = data.rows[i];
		// If there isn't a period, we'll get back null.
		var rowDate = reportDataObj.getRowPeriodDate(data.columns, row);
        
		if (!rowDate || rowDate.getTime() >= startOfPeriod)
		{
			name = row[dimensionColIndex];
			if (rowsHash[name] === undefined) rowsHash[name] = 0;
			rowsHash[name] += row[metricColIndex];
		}
	}
    
	// Turn hash table of collapsed names back into an array and deal with if money or not
	for (i in rowsHash)
	{
		rows[rows.length] = {name: i, value: metricIsMoney ? (rowsHash[i] / 100) : rowsHash[i]};
	}
    
	rows.sort(function(a,b)
	{
		return b.value - a.value;
	});
    
	// Money comes from server in pennies, turn back into dollars when use the metric if it is money.
    
	//TODO: why are we only considering 10 rows of data? Chart size gets too big?
	for(i = 0; i < Math.min(rows.length, 10) ; i++)
	{
		var metric = rows[i].value;
        
		//TODO: why are we doing this next line?
		if(!metric) metric = 0;
        
		entries.push({
			name: rows[i].name,
			value: rows[i].value//metricIsMoney ? (rows[i][metricColIndex] / 100) : rows[i][metricColIndex]
		});
	}
    
	if (entries.length === 0)
	{
		// Put in a dummy row when there's no data
		entries[0] = {name: "No data for period", value: 100};
	}
    
	chart.series[0].update({
		data: entries
	},true);
};

Tree.getReport = function()
{
	return _report;
};

module.exports = Tree;
