
var Highcharts = require('highcharts');
require('highcharts/highcharts-more.js')(Highcharts);
require('highcharts/highcharts-3d.js')(Highcharts);
require('highcharts/modules/heatmap')(Highcharts);
require('highcharts/modules/treemap')(Highcharts);
require('highcharts/modules/drilldown')(Highcharts);
require('highcharts/modules/solid-gauge')(Highcharts);
require('highcharts/modules/no-data-to-display')(Highcharts);

var OptionActions = require("../actions/options.js");
var DataActions = require("../actions/data.js");

var chartTypes = {
	chart: require("../charts/highcharts.js"),
	gauge: require("../charts/gauge/base.js"),
	line: require("../charts/line/base.js"),
	'line-with-piechart': require("../charts/line/piechart.js"),
	bar: require("../charts/bar/base.js"),
	'bar-with-line': require("../charts/bar/line.js"),
	ranked: require("../charts/custom/ranked.js"),
	comparison: require("../charts/custom/comparison.js"),
	single_number: require("../charts/custom/single_number.js"),
	calculated_metric: require("../charts/custom/calculated_metric.js"),
	table: require("../charts/custom/table.js"),
	simpletable: require("../charts/custom/simpletable.js"),
	google_map: require("../charts/custom/google_map.js"),
	html: require("../charts/html.js"),
	filter_bar: require("../charts/custom/filter_bar.js"),
	table: require("../charts/custom/data_table.js")
};


$(function() {
	Highcharts.setOptions({
		global: {
			useUTC: false
		},
		lang: {
			decimalPoint: '.',
			thousandsSep: ','
		}
	});
	$.fn.leo = function() {
		return $(this).data('leo');
	};
	$.fn.inlineStyle = function (prop) {
		return this.prop("style")[$.camelCase(prop)];
	};

	$('#leo-dashboard').on({
		'leo-click': function(e, leo) {

			var column_id = $(this).find('.leo-ranked-chart').data('column_id');

			var selector = $(this).data('controller-selector') || '*';
			$('figure.leo-chart, figure.leo-html').filter(selector).not($(this)).each(function() {
				if ($(this).leo()) {

					window.dashboardFilters = (window.dashboardFilters || []).filter((dashboardFilter) => {
						return dashboardFilter.id !== column_id;
					});

					if (leo.active) {
						var filter = {
							id: column_id,
							value: leo.series,
							fromController: true
						};
						$(this).leo().setFilter(filter);
						window.dashboardFilters.push(filter);
					} else {
						$(this).leo().removeFilter(column_id);
					}

				}
			});

		}
	}, 'figure.is-controller, .leo-charts-controller figure');

});


exports.runScripts = function() {
	if (!('leo' in window)) {
		window.leo = {};
	}
	window.leo = $.extend(true, window.leo, {
		charts: {
			colors: {}
		}
	});

	if (window.leo.defaultColors) {
		OptionActions.setDefaultColors('default', window.leo.defaultColors);
	}

	for(var color in window.leo.charts.colors) {
		OptionActions.setColor('default', color, window.leo.charts.colors[color]);
	}

	if (window.leo.refreshDefault) {
		OptionActions.setDefaultRefresh('default', window.leo.refreshDefault);
	}
	window.leo.refresh = DataActions.refresh;
};


exports.initAll = function(element, filters) {
	var charts = [];
	element.find("figure[class^='leo-'], figure[class*=' leo-'], [class='leo-html']").not(".leo-html figure").each(function(i, figure) {
		charts.push(chartFigure($(this), filters));
	});
	return charts;
};


exports.init = function(figure, filters) {
	return chartFigure(figure, filters);
};


exports.destroyAll = function(charts) {
	if (charts) {
		charts.forEach(function(chart) {
			if (chart.destroy) {
				chart.destroy();
			}
		});
	}
};


function chartFigure(figure, filters) {

	figure = $(figure);

	var data = figure.data();

	var spec = {};

	var specScript = figure.find("script[type^='text/x-leo']");

	if (specScript.length && $.trim(specScript.text()) != '') {
		spec = (new Function("return " + specScript.text()))();
		if (spec.type !== 'html') {
			figure.attr('data-script', JSON.stringify(specScript.text()));
			specScript.remove();
		}
	}

	if (!spec.type) {
		spec.type = "chart";
	}

	var figcaption = figure.find("figcaption");
	if (figcaption.length) {
		data.title = figcaption.html();
		figcaption.remove();
	}

	var details = figure.find("details");

	var addFilter = details.find('a.leo-addFilter');

	addFilter = ((addFilter.length != 0)
		? { data: addFilter.data() }
		: false
	);

	var tableView = details.find('a.leo-tableView');

	tableView = ((tableView.length != 0)
		? { data: tableView.data() }
		: false
	);

	var detaultDetails = '<div class="details-table"><div><label>column</label><span>${column}</span></div> <div><label>name</label><span>${series}</span></div> <div><label>value</label><span>${value}</span></div></div>';

	if (details) {
		data.details = {
			width: details.data('width') || 300,
			height: details.data('height') || 200,
			title: details.data('title') || '${series}',
			addFilter: addFilter,
			tableView: tableView,
			text: details.html() || detaultDetails
		};
		details.remove();
	} else {
		data.details = {
			width: 300,
			height: 200,
			title: '${series}',
			text: detaultDetails
		};
	}

	if (figure.find('select').length) {
		data.select = {
			options: []
		};
		figure.find('select option').each(function(index, element) {
			data.select.options.push({
				value: $(element).val(),
				text: $(element).text()
			});
			if ($(element).prop('selected')) {
				data.select.defaultValue = $(element).val();
			}
		});
	}

	if (figure.is(".leo-html")) {
		figure.find('hr.vertical, .hover-menu').remove();
		spec.type = figure.html().indexOf('text/x-leo-chart') != -1 ? "html" : '';
		spec.template = figure.html();
		figure.attr('data-html', figure.html());
	}

	if (!spec.type) {
		return false;
	}

	if (filters) {
		spec.filters = (spec.filters || []).concat(JSON.parse(JSON.stringify(filters)));
	}

	try {
		var chart = chartTypes[spec.type](figure, $.extend(true, {
			columns: [],
			metrics: [],
			filters: [],
			rows: [],
		}, spec), data).start();
		figure.addClass("active");
	} catch(e) {
		console.error("Cannot initialize ", figure, e, chart);
		var chart = false;
	}

	return chart;
}
