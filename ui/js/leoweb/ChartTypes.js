/* global Highcharts */
/* global $ */

/* jshint curly: false, es5: false, loopfunc: true, forin: false, noempty: false */

var ChartTypes = {};
var _leoReportDataMap = null;

// Internal method used to share objects from LeoWeb into this class
ChartTypes.init = function(obj)
{
	_leoReportDataMap = obj.leoReportDataMap;
	return ChartTypes;
};

var firePointClick = function(rdo, dimAttrName, chartElId, val, xVal, yVal, name)
{
	var dim = rdo.params[dimAttrName] || {};
	var obj = {value: val, xVal: xVal, yVal: yVal, name: name, dimensionId: dim.id, dimensionName: dim.name, dimensionDisplayName: dim.displayName, leoDataObj: rdo};

	var eventObj = $.Event("LeoWeb:ChartClicked");
	$("#" + chartElId).trigger(eventObj, obj);
	return !eventObj.isDefaultPrevented();
};

var fireLegendClick = function(rdo, dimAttrName, chartElId, legendValue)
{
	var dim = rdo.params[dimAttrName] || {};
	var obj = {value: legendValue.toLowerCase(), dimensionId: dim.id, dimensionName: dim.name, dimensionDisplayName: dim.displayName, leoDataObj: rdo};

	var eventObj = $.Event("LeoWeb:LegendClicked");
	$("#" + chartElId).trigger(eventObj, obj);
	return !eventObj.isDefaultPrevented();
};

var chartClicked = function(e)
{
	var chartElId = this.series.chart.renderTo.id;
	var rdo = _leoReportDataMap[chartElId];
	var name = this.name || this.series.name;
	var value = this.value;
	var xVal = this.x;
	var yVal = this.y;
	return firePointClick(rdo, "dimension", chartElId, value, xVal, yVal, name);
};

var types = {
	solidgauge:
    {
    	chart: {type: 'solidgauge', animation: Highcharts.svg},
    	pane: {center: ['50%', '85%'], size: '140%', startAngle: -90,endAngle: 90, background: {backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || '#EEE', innerRadius: '60%', outerRadius: '100%', shape: 'arc'}},
    	yAxis: {lineWidth: 0, minorTickInterval: null, tickPixelInterval: 100, tickWidth: 0, title: {y: -70}, labels: {y: 16}},
    	plotOptions: {series: {point: {events: {click: chartClicked}}}, solidgauge: {dataLabels: {y: 5, borderWidth: 0, useHTML: true}}},
    	credits: {enabled: false}, tooltip: {enabled: false}, title: {text: ''}, series: [{name: '', data: [], color: '#55BF3B', dataLabels: {}}]
    },
	column:
    {
    	chart: {type: 'column', animation: Highcharts.svg},
    	legend: {enabled: true, verticalAlign: 'bottom', align: 'center'},
    	plotOptions: {column: {depth: 40}, series: {point: {events: {click: chartClicked}}}}, credits: {enabled: false}
    },
	line:
    {
    	xAxis: {allowDecimals: false},
    	chart: {type: 'line', animation: Highcharts.svg}, credits: {enabled: false},
    	plotOptions: {series: {point: {events: {click: chartClicked}}}}
    },
	heatmap:
    {
    	chart: {type: 'heatmap', marginTop: 40, marginBottom: 80},
    	xAxis: {categories: []},
    	yAxis: {categories: [], title: null},
    	plotOptions: {heatmap: {allowPointSelect: true}, series: {point: {events: {click: chartClicked}}}},
    	colorAxis: {min: 0, minColor: '#FFFFFF', maxColor: Highcharts.getOptions().colors[0]},
    	legend: {align: 'right', layout: 'vertical', margin: 0, verticalAlign: 'top', y: 25, symbolHeight: 280}, credits: {enabled: false}
    },
	treemap:
    {
    	chart: {type: 'treemap', marginTop: 40, marginBottom: 80}, credits: {enabled: false},
    	plotOptions: {series: {point: {events: {click: chartClicked}}}},
    },
	pie:
    {
    	chart: {plotBackgroundColor: null, plotBorderWidth: null, plotShadow: false},
    	tooltip: {pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'},
    	plotOptions:
        {
        	pie: {allowPointSelect: true, cursor: 'pointer',
        		dataLabels: {enabled: true, format: '<b>{point.name}</b>: {point.percentage:.1f} %', style: {color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'}}},
        	series: {point: {events: {click: chartClicked}}}
        },
    	series: [{type: 'pie', data: []}], credits: {enabled: false}
    }
};

var _chartTypeExtensions =
{
	column: function(typeObj, typeParams)
	{
		// Start by cloning the typeObj
		var result = $.extend(true, {}, typeObj);

		//legend: {"layout": "vertical", "align": "right", "verticalAlign": "middle", "borderWidth": 0},

		if (typeParams.legend)
			result = $.extend(true, {}, result, {legend: typeParams.legend});

		if (typeParams.fireLegendEvents === true)
		{
			result = $.extend(true, {}, result, {plotOptions: {series: {events:{legendItemClick: function(evt, obj)
			{
				var legendValue = this.name;
				var chartElId = this.chart.renderTo.id;
				var rdo = _leoReportDataMap[chartElId];
				return fireLegendClick(rdo, "dimension", chartElId, legendValue);
			}}}}});
		}

		result = $.extend(true, {}, result, {plotOptions: {column: {stacking: ((typeParams.stack === true || typeParams.stack === "true")) ? "normal" : null}}});

		return result;
	},
	pie: function(typeObj, typeParams)
	{
		// Start by cloning the typeObj
		var result = $.extend(true, {}, typeObj);

		if (typeParams.legend)
			result = $.extend(true, {}, result, {legend: typeParams.legend});

		if (typeParams.showLegend === true && typeParams.fireLegendEvents === true)
		{
			result = $.extend(true, {}, result, {plotOptions: {series: {point:{events:{legendItemClick: function(evt, obj)
			{
				var legendValue = this.name;
				var chartElId = this.series.chart.renderTo.id;
				var rdo = _leoReportDataMap[chartElId];
				return fireLegendClick(rdo, "dimension", chartElId, legendValue);
			}}}}}});
		}

		if (typeParams.showPercentages !== true)
			result = $.extend(true, {}, result, {plotOptions: {series: {dataLabels: {enabled: true, format: '{point.name}: {y:,.1f}'}}}});

		return result;
	},
	line: function(typeObj, typeParams)
	{
		// Start by cloning the typeObj
		var result = $.extend(true, {}, typeObj);

		if (typeParams.legend)
			result = $.extend(true, {}, result, {legend: typeParams.legend});

		if (typeParams.fireLegendEvents === true)
		{
			result = $.extend(true, {}, result, {plotOptions: {series: {events:{legendItemClick: function(evt, obj)
			{
				var legendValue = this.name;
				var chartElId = this.chart.renderTo.id;
				var rdo = _leoReportDataMap[chartElId];
				return fireLegendClick(rdo, "dimension", chartElId, legendValue);
			}}}}});
		}
		return result;
	}
};

ChartTypes.getTypes = function()
{
	return types;
};

ChartTypes.getTypeExtensions = function()
{
	return _chartTypeExtensions;
};

ChartTypes.fireLegendClick = fireLegendClick;

module.exports = ChartTypes;
