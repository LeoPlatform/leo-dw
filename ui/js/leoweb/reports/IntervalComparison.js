/* global $ */
/* global Highcharts */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var moment = require("moment");

var IntervalComparison = {};
var _periodMap = null;

IntervalComparison.init = function(params)
{
    _periodMap = params.periodMap;
    return IntervalComparison;
};

var _report =  {
    name: "intervalComparison",
    type: 'solidgauge',
    rows: [],
    columns: [],
    isHighcharts: true,
    hcParams:
    {
        series: [
        {
            name: 'Estimated Margin',
            data: [],
            color: '#55BF3B',
            dataLabels: {}
        }]
    },
    reportParams: {addPeriodRows: true}
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
    
    chart.series[0].yAxis.removePlotBand("yesterday",false);
    chart.series[0].yAxis.removePlotBand("margin",false);
    chart.series[0].yAxis.removePlotBand("todaygoal",false);

    chart.series[0].yAxis.setExtremes(0, prevPeriodPartialTotal * 1.2, false);
    
    chart.series[0].yAxis.addPlotBand({
        id: "yesterday",
        color: 'red',
        from: 0,
        to: prevPeriodPartialTotal * 0.8
    },false);
    
    // yesterday partial * .8 to yesterday partial
    chart.series[0].yAxis.addPlotBand({
        id: "margin",
        color: '#DDDF0D',
        from: prevPeriodPartialTotal * 0.8,
        to: prevPeriodPartialTotal,
    },false);
    
    //yesterday partial to yesterday partial * 1.2
    chart.series[0].yAxis.addPlotBand({
        id: "todaygoal",
        color: '#55BF3B',
        from: prevPeriodPartialTotal,
        to: prevPeriodPartialTotal * 1.2
    },false);
    
    //curPeriodTotal
    chart.series[0].setData([curPeriodTotal],false);
    
    //TODO: abstract the timeframe label out into the period
    var durationTitle = reportDataObj.getPeriodDurationTitle();
    durationTitle = durationTitle || "Yesterday";
    
    chart.series[0].update({
        dataLabels: {
            format: '<div style="text-align:center;">'+
                '<span style=" line-height: 25px; font-size:25px;color:' + ((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">{y:,2f}</span><br/>' +
                '<span style="font-size:16px;color:silver">' + reportDataObj.params.title + '</span><br />'+
                '<span style=" font-size:12px;color:silver;">' + durationTitle + ': <span style="color: ' + ((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">'+Highcharts.numberFormat(prevPeriodTotal,2)+'</span></span> ' +
            '</div>'
            }
        }
    );
};

IntervalComparison.getReport = function()
{
    return _report;
};

module.exports = IntervalComparison;