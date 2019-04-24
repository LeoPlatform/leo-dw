/* global $ */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var PieChart = {};

PieChart.init = function(params)
{
	return PieChart;
};

var _report =  {
	name: "pieChart",
	type: "pie",
	rows: [],
	isHighcharts: true,
	columns: [],
	hcParams: {},
	reportParams: {addPeriodRows: true}
};

_report.onRefreshFn = function(data, chart, reportDataObj)
{
	var entries = [];
	var dimensionName = reportDataObj.getDimensionName();
	var dimensionColIndex = dimensionName ? data.columns[dimensionName].index : -1;
	var metricIsMoney, displayName, metricName, metricColIndex, seriesName = "";
	//var startOfPeriod = reportDataObj.getPeriodStartDate({periods: 1}).getTime();
	var now = new Date();

	var startOfPeriod = reportDataObj.getPeriodLogicalStart(now, reportDataObj.params.periods ? (reportDataObj.params.periods - 1) : 1).getTime();
	var name, rows = [], rowsHash = {};
	var rowDate, row, i, count = data.rows.length;
    
	if (dimensionColIndex > -1)
	{
		metricName = reportDataObj.getMetric(); //"f_webship.margin|sum"
		seriesName = data.columns[metricName].label;
		metricIsMoney = data.columns[metricName].format === "money";
		metricColIndex = data.columns[metricName].index;
    
		// We only want to consider the last period of time (1 day, week, month, quarter, year, etc.),
		// so, if the date of the row is in the period include it for use. 
		// Also, collapse any rows with the same name into a single entry
    
		for (i = 0; i < count; i++)
		{
			row = data.rows[i];
            
			// If there isn't a period, we'll get back null.
			rowDate = reportDataObj.getRowPeriodDate(data.columns, row);
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
	}
	else
	{
		// There's no dimension, so the names of the values in the rows needs to come from the columns
		// and we just take the values without aggregating them.  Also, there must be multiple 
		// metrics in this case only.
		var metrics = reportDataObj.getMetric();
		if (!$.isArray(metrics))
		{
			throw new Error("IllegalStateException: pie chart expected array of metrics since dimension not provided but instead found: " + metrics);
		}

		var metricsDef = [];
		$.each(metrics, function(index, metric)
		{
			metricName = ($.type(metric) === "string") ? metric : metric.name;
			displayName = data.columns[metricName].label;
			metricIsMoney = data.columns[metricName].format === "money";
			metricColIndex = data.columns[metricName].index;
			metricsDef[index] = {idx: metricColIndex, metricIsMoney: metricIsMoney, displayName: displayName};
		});
        
		// There should only be one row from the result that contains all the metrics...
		for (i = 0; i < count; i++)
		{
			row = data.rows[i];
            
			// If there isn't a period, we'll get back null.
			rowDate = reportDataObj.getRowPeriodDate(data.columns, row);
			if (!rowDate || rowDate.getTime() >= startOfPeriod)
			{
				$.each(metricsDef, function(index, metricDef)
				{
					rows[rows.length] = {name: metricDef.displayName, value: metricIsMoney ? (row[metricDef.idx] / 100) : row[metricDef.idx]};
				});
			}
		}
	}
    
	rows.sort(function(a,b)
	{
		return b.value - a.value; //b[metricColIndex] - a[metricColIndex];
	});
    
	// Money comes from server in pennies, turn back into dollars when use the metric if it is money.
    
	//TODO: why are we only considering 10 rows of data? Chart size gets too big?
	var  maxPieSlices = 10, otherValue = 0, totalAmt = 0;
    
	count = rows.length;
	for (i = 0; i < count ; i++)
	{
		var value = parseFloat(rows[i].value); //metricIsMoney ? (rows[i][metricColIndex] / 100) : rows[i][metricColIndex];
		name = rows[i].name; //rows[i][dimensionColIndex];
        
		totalAmt += value;
        
		//TODO: why are we doing this?
		if (!name) name = 0;
        
		if (i < (maxPieSlices - 1))
		{
			// We're still within the number of allowed slices, add the slice...
			entries.push({name: name, y: value});
		}
		else
		{
			otherValue += value;
			if (i === (count - 1))
			{
				// We're on the last one, add the other slice
				entries.push({name: "Other", y: otherValue});
			}
		}
	}
    
	if (reportDataObj.params.displayPercentages === true)
	{
		// Now that we've got totals, figure out what the percentages are
		count = entries.length;
		for (i = 0; i < count; i++)
		{
			entries[i].y = Math.round((entries[i].y / totalAmt) * 1000) / 10;
		}
	}
    
	if (entries.length === 0) entries[0] = {name: "No data for period", y: 100};
	updateParams = chart.series[0].options;
	updateParams.name = seriesName;
	updateParams.showInLegend = reportDataObj.params.showLegend === true;
	updateParams.data = entries;
	if(typeof reportDataObj.params.hcParams.dataLabels != 'undefined' && typeof reportDataObj.params.hcParams.dataLabels.enabled != 'undefined') updateParams.dataLabels.enabled = !(reportDataObj.params.hcParams.dataLabels.enabled === false || reportDataObj.params.hcParams.dataLabels.enabled == "false");
	chart.series[0].update(updateParams, true);
};

PieChart.getReport = function()
{
	return _report;
};

module.exports = PieChart;
