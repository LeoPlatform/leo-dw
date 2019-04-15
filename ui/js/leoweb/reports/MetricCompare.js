/* global $ */
/* global Highcharts */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var MetricCompare = {};
var _periodMap = null;

MetricCompare.init = function(params)
{
	_periodMap = params.periodMap;
	return MetricCompare;
};

var _report =  {
	name: "metricCompare",
	rows: [],
	columns: [],
	isHighcharts: false,
	reportParams: {addPeriodRows: true}
};

_report.createReportFn = function(reportParams)
{
	var baselineH = 300;
	var gradientCssBgArr, gradientCssBg = "{c1}, -moz-linear-gradient(top,  {c1} 0%, {c2} 100%);-webkit-gradient(linear, left top, left bottom, color-stop(0%,{c1}), color-stop(100%,{c2}));-webkit-linear-gradient(top,  {c1} 0%,{c2} 100%);-o-linear-gradient(top,  {c1} 0%,{c2} 100%);-ms-linear-gradient(top,  {c1} 0%,{c2} 100%);linear-gradient(to bottom,  {c1} 0%,{c2} 100%)";
	var filterCss = "progid:DXImageTransform.Microsoft.gradient( startColorstr='{c1}', endColorstr='{c2}',GradientType=0 );"; 
	var chart = {params: reportParams, margin: "hit"};
	var buf = [], el = $("#" + reportParams.id);
	//close: c2bd25
	var defaultMarginType = {"miss": {"c1": "#e05721", "c2": "#be3e23", "pct": 80}, "close": {"c1": "#d9e31c", "c2": "#c2d41e", "pct": 100}, "hit": {"c1": "#21e03b", "c2": "#3abe23", "pct": 120}, "kill": {"c1": "#2e21e0", "c2": "#2352be"}};
	var height = (el.height() - 20);
	var marginTypeObj = chart.params.marginType;
	var baseFontSize = (12 * height) / baselineH;
    
	if (!marginTypeObj)
	{
		chart.params.marginType = defaultMarginType;
		marginTypeObj = defaultMarginType;
	}
	else
	{
		marginTypeObj.miss.pct = marginTypeObj.miss.pct || defaultMarginType.miss.pct;
		marginTypeObj.close.pct = marginTypeObj.close.pct || defaultMarginType.close.pct;
		marginTypeObj.hit.pct = marginTypeObj.hit.pct || defaultMarginType.hit.pct;
		marginTypeObj.kill.pct = marginTypeObj.kill.pct || defaultMarginType.kill.pct;
	}

	el.addClass("leo-metric-compare");
	el.css("text-align", "center");
    
	buf[buf.length] = '<div class="report-body" style="display:inline-block; font-size:' + baseFontSize + 'pt; text-align:center; height:' + height + 'px; box-sizing:border-box; margin:10px auto; overflow: hidden; width:90%;">';
	buf[buf.length] = '<div class="report-title" style="position: relative; top: 5%; color: white; font-size: 1em;font-family: verdana">';
	buf[buf.length] = chart.params.title;
	buf[buf.length] = '</div>';
	buf[buf.length] = '<div class="report-current-period-total" style="position: relative; top: 30%; color: white; font-size: 3.67em;font-family: verdana">';
	buf[buf.length] = "-";
	buf[buf.length] = '</div>';
	buf[buf.length] = '<hr style="position: relative; height: 1px; border: 0; margin-left: 8%; margin-right: 8%; top: 45%; background-color: white; " />';
	buf[buf.length] = '<div style="position: relative; top: 51%; margin-left: 8%; margin-right: 8%; ">';
	buf[buf.length] = '<div class="report-prev-period-total" style="float: left; text-align: left; width: 45%; color: white; font-family: arial; font-size: 1.17em">';
	buf[buf.length] = "-";
	buf[buf.length] = '</div>';
	buf[buf.length] = '<div class="report-percent" style="float: right; text-align: right; width: 45%; color: white; font-family: arial; font-size: 1em; font-weight: bold">';
	buf[buf.length] = "-";
	buf[buf.length] = '</div>';
	buf[buf.length] = '</div>';
	buf[buf.length] = '</div>';
	el.html(buf.join(""));
    
	el = $("#" + reportParams.id + " .report-body");
    
	// Set colors based on margin type
	var colors = chart.params.marginType ? chart.params.marginType[chart.margin] : defaultMarginType[chart.margin];
	gradientCssBg = gradientCssBg.replace(/\{c1\}/g, colors.c1).replace(/\{c2\}/g, colors.c2);
	gradientCssBgArr = gradientCssBg.split(";");
	$.each(gradientCssBgArr, function(index, gradientCssStr)
	{
		el.css("background", gradientCssStr);
	});
	el.css("filter", filterCss.replace(/\{c1\}/g, colors.c1).replace(/\{c2\}/g, colors.c2));
    
	return chart;
};

_report.onRefreshFn = function(data, chart, reportDataObj)
{
	// As a precondition, this report only works if you have set a period
	// We want to get three numbers...
	// 1) all of the previous period where period is a day, week, month, quarter or yar
	// 2) the previous period up until the corresponding time in the current period; so if week_over_week and today is Tuesday
	//    then we want last week from Sunday to Tuesday
	// 3) the current period up until now; so if the period is a day then we want from the beginning of the day until now, if the
	//    period is a week we want from the beginning of the week until now, etc.

	var now = new Date();
    
	// Get the date to the beginning of the logical period from now (beginning of day until now, beginning of week until now, etc.)
	var periodLogicalStart = reportDataObj.getPeriodLogicalStart(now).getTime();
    
	// Get the previous period's logical start date (1 full day before first period began, 1 full week before first period began)
	var prevPeriodLogicalStart = reportDataObj.getPeriodLogicalStart(now, 1).getTime();
    
	// Get previous period translated into current period. If period is day and it's 9PM, then this will return 9PM yesterday.  If period is week and it's wed @5am
	// then this will return last week wed @5am, etc.
	var period = reportDataObj.getPeriod();
	var prevPeriodEndDateTranslatedFromCurPeriod = period ? (moment(now).subtract(_periodMap[period].periodKey === "quarter" ? 3 : 1, _periodMap[period].periodKey).toDate().getTime()) : 0;
    
	var i, count = data.rows.length, prevPeriodTotal = 0, prevPeriodPartialTotal = 0, curPeriodTotal = 0;
	var metricName = reportDataObj.getMetric(); //"f_webship.margin|sum"
	var metricIsMoney = data.columns[metricName].format === "money";
	var metricColIndex = data.columns[metricName].index;

	for (i = 0; i < count; i++)
	{
		var row = data.rows[i];
        
		// If there isn't a period, we'll get back null and this will break.
		// Having a period set is a precondition of using this report.
		var rowDate = reportDataObj.getRowPeriodDate(data.columns, row).getTime();
        
		if (rowDate >= periodLogicalStart)
		{
			// The row's date is in between the start of the current period and now
			curPeriodTotal += parseInt(row[metricColIndex], 10);
		}
		else if (rowDate >= prevPeriodEndDateTranslatedFromCurPeriod)
		{
			// The row's date is after the beginning of the previous period's end and the current period's start
			// which means it only counts for the prev period's total
			prevPeriodTotal += parseInt(row[metricColIndex], 10);
		}
		else if (rowDate >= prevPeriodLogicalStart)
		{
			// The row's date is after the start of the previous period and before the end of the previous period's partial date
			// so it counts toward both.
			prevPeriodPartialTotal += parseInt(row[metricColIndex], 10);
			prevPeriodTotal += parseInt(row[metricColIndex], 10);
		}
		else
		{
			// Don't consider the row since it's not within the date range.
		}
	}
    
	if (metricIsMoney)
	{
		// Money comes from server in pennies, turn back into dollars
		prevPeriodPartialTotal = prevPeriodPartialTotal / 100;
		prevPeriodTotal = prevPeriodTotal / 100;
		curPeriodTotal = curPeriodTotal / 100;
	}
    
	// curPeriodTotal metric1
	// prevPeriodPartialTotal metric2
    
	//TODO: move to utils
	function commaSeparateNumber(val){
		while (/(\d+)(\d{3})/.test(val.toString())){
			val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
		}
		return val;
	}
    
	//var pct = curPeriodTotal === 0 ? 0 : ((curPeriodTotal - prevPeriodPartialTotal) / curPeriodTotal) * 100;
	var pct = prevPeriodPartialTotal === 0 ? 0 : (curPeriodTotal / prevPeriodPartialTotal) * 100;
	curPeriodTotal = Math.round(curPeriodTotal * 100) / 100;
	prevPeriodPartialTotal = Math.round(prevPeriodPartialTotal * 100) / 100;
	pct = (Math.round(pct * 100) / 100);

	$("#" + chart.params.id + " .report-current-period-total").html(commaSeparateNumber(curPeriodTotal));
	$("#" + chart.params.id + " .report-prev-period-total").html(commaSeparateNumber(prevPeriodPartialTotal));
	$("#" + chart.params.id + " .report-percent").html(pct === 0 ? "-" : pct + "%");
    
	if (pct <= chart.params.marginType.miss.pct)
		chart.margin = "miss";
	else if (pct <= chart.params.marginType.close.pct)
		chart.margin = "close";
	else if (pct <= chart.params.marginType.hit.pct)
		chart.margin = "hit";
	else
		chart.margin = "kill";
    
	var el = $("#" + chart.params.id + " .report-body");
	var gradientCssBgArr, gradientCssBg = "{c1}, -moz-linear-gradient(top,  {c1} 0%, {c2} 100%);-webkit-gradient(linear, left top, left bottom, color-stop(0%,{c1}), color-stop(100%,{c2}));-webkit-linear-gradient(top,  {c1} 0%,{c2} 100%);-o-linear-gradient(top,  {c1} 0%,{c2} 100%);-ms-linear-gradient(top,  {c1} 0%,{c2} 100%);linear-gradient(to bottom,  {c1} 0%,{c2} 100%)";
	var filterCss = "progid:DXImageTransform.Microsoft.gradient( startColorstr='{c1}', endColorstr='{c2}',GradientType=0 );"; 
	var marginType = chart.params.marginType[chart.margin];
	gradientCssBg = gradientCssBg.replace(/\{c1\}/g, marginType.c1).replace(/\{c2\}/g, marginType.c2);
	gradientCssBgArr = gradientCssBg.split(";");
	$.each(gradientCssBgArr, function(index, gradientCssStr)
	{
		el.css("background", gradientCssStr);
	});
	el.css("filter", filterCss.replace(/\{c1\}/g, marginType.c1).replace(/\{c2\}/g, marginType.c2));
};

MetricCompare.getReport = function()
{
	return _report;
};

module.exports = MetricCompare;
