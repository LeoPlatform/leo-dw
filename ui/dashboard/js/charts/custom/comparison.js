var base = require("../base.js");
var React = require("react");
var moment = require("moment");

module.exports = function (element, spec, options, my) {
	my = my || {};

	spec = $.extend(true, {}, {
		goal: .2,
		warning: .2,
		metrics: [],
	}, spec);

	var timeframe = spec.timeframe;
	var asOf = moment(spec.asof);

	var metric = spec.metric;
	delete spec.metric;
	my.optionsChange = function(that) {
		that.columns = [];
		if (timeframe) {
			my.timeframe.id = timeframe;
		}
		var comparison = my.getComparisonMetrics(my.timeframe, metric, {
			notime: options.notime||(!spec.useTime),
			asOf: asOf
		});
		that.metrics = comparison.metrics;

		var skipSetFilter = false
		that.filters.forEach(function(filter) {
			if (filter.id == comparison.filter.id) {
				skipSetFilter = true;
			}
		})

		if (!skipSetFilter) {
			my.setFilter(comparison.filter, false);
		}
	};

	var that = base(element, spec, options, my);

	my.redraw = function() {
		var column = my.dataSources[0].columns[that.metrics[0]];
		var current = parseFloat(my.getMetricValue(0));
		var prevCompare = parseFloat(my.getMetricValue(1));
		var prev = parseFloat(my.getMetricValue(2));

		var status = "status_good";
		if (current < prevCompare * (1 - that.warning)) {
			status = "status_bad";
		} else if (current < prevCompare) {
			status = "status_warning";
		} else if (current < prevCompare * (1 + that.goal)) {
			status = "status_good";
		} else {
			status = "status_goal";
		}

		if (prevCompare) {
			var growth = ((current / prevCompare) * 100).toFixed(2) + "%";
		} else {
			var growth = "N/A";
		}

		if (options.title) {
			var title = options.title;
		} else if(spec.label) {
			title = spec.label;
		} else {
			title = column.parent + " " + column.label + " Comparison";
		}

		switch(my.timeframe.id) {
			case 'hour':
				var currentTimespan = asOf.format("Do H");
				var lastTimespan = asOf.subtract(1,"hour").format("Do H");
			break;

			case 'day':
				var currentTimespan = asOf.format("Do");
				var lastTimespan = asOf.subtract(1,"day").format("Do");
			break;

			case 'week':
				var currentTimespan = asOf.format("l");
				var lastTimespan = asOf.subtract(1, "week").endOf('week').format('l');
			break;

			default:
			case 'month':
				var currentTimespan = asOf.format("MMMM YYYY");
				var lastTimespan = asOf.subtract(1, "month").format("MMMM YYYY");
			break;

			case 'quarter':
				var currentTimespan = asOf.format('YYYY \\QQ');
				var lastTimespan = asOf.subtract(1,"quarter").format('YYYY \\QQ');
			break;

			case 'year':
				var currentTimespan = asOf.format("YYYY");
				var lastTimespan = asOf.subtract(1, "year").format("YYYY");
			break;
		}

		var scale = Math.floor(Math.min(Math.min(element.width()/2, element.height()/3), 125));

		return <section key="graph" className={"leo-comparison "+status+" size-"+Math.floor((scale+1)/25)} style={{width:scale*2.5,height:scale*2.3}}>
			<header>{title}</header>
			<div className="align-middle">
				<label>
					<span>{column.formatter(current).toString().replace(/\D\d*$/,'')}</span>
					<small>{currentTimespan + ' to date'}</small>
				</label>
			</div>
			<div className="footer">
				<div className="delta">
					<span>{growth}</span>
					<small>growth %</small>
				</div>
				<div>
					<span>{column.formatter(prevCompare).toString().replace(/\D\d*$/,'')}</span>
					<small>{lastTimespan} to date</small>
				</div>
			</div>
		</section>
	};

	return that;

};
