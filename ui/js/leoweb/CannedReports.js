/* global Highcharts */
/* global $ */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var CannedReports = {};
var leoReportDataMap = null;
var _reports = {};
var _params = null;

function registerCannedReports()
{
    CannedReports.registerReport(require('./reports/PieChart').init(_params).getReport());
    CannedReports.registerReport(require('./reports/IntervalComparison').init(_params).getReport());
    CannedReports.registerReport(require('./reports/Timeline').init(_params).getReport());
    CannedReports.registerReport(require('./reports/CumulativeTimeSeries').init(_params).getReport());
    CannedReports.registerReport(require('./reports/Tree').init(_params).getReport());
    CannedReports.registerReport(require('./reports/MatrixCompare').init(_params).getReport());
    CannedReports.registerReport(require('./reports/Column').init(_params).getReport());
    CannedReports.registerReport(require('./reports/Line').init(_params).getReport());
    CannedReports.registerReport(require('./reports/MetricCompare').init(_params).getReport());
}

CannedReports.init = function(params)
{
    _params = params;
    registerCannedReports();
    return CannedReports;
};

CannedReports.registerReport = function(report)
{
    _reports[report.name] = report;
};

CannedReports.getReports = function()
{
    return _reports;
};

module.exports = CannedReports;