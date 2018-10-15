var base = require("../base.js");
var React = require("react");
var moment = require("moment");

module.exports = function (element, spec, options, my) {
	my = my || {};

	spec = $.extend(true, {}, {
		metrics: [],
		extraNumbers: {}
	}, spec);

	if (spec.showCents === true) {
		spec.decimals = 2
	} else if (spec.showCents === false) {
		spec.decimals = 0
	}

	var timeframe = spec.timeframe || 'year';
	var asOf = moment(spec.asof);

	var metric = spec.metric;
	delete spec.metric;
	my.optionsChange = function(that) {

		that.columns = [];
		if (timeframe) {
			my.timeframe.id = timeframe;
		}
		var singleNumber = my.getComparisonMetrics(my.timeframe, metric, {
			notime: options.notime || (!spec.useTime),
			asOf: asOf
		});
		that.metrics = singleNumber.metrics;

		my.setFilter(singleNumber.filter, false);
	}

	my.updateTimeframe = function(that, filter) {

		my.timeframe.value = filter.value
		that.columns = []

		if (filter.fromController) {
			delete my.timeframe.id
		} else if (timeframe) {
			my.timeframe.id = timeframe
		}

		var singleNumber = my.getComparisonMetrics(my.timeframe, metric, {
			notime: options.notime || (!spec.useTime),
			asOf: asOf
		})
		that.metrics = singleNumber.metrics

	}

	var that = base(element, spec, options, my);

	my.resize = function() {
		$('.leo-single-number').each(function() {
			var smallElements = $(this).find('.label, .growth');
			var largeElement = $(this).find('.value');
			smallElements.css({fontSize:5});
			largeElement.css({fontSize:10});
			var parentDiv = $(this);
			var initialHeight = parentDiv.height();
			var initialWidth = parentDiv.width();

			for(var i=5;i<144;i+=.25) {
				smallElements.css({fontSize:i});
				largeElement.css({fontSize:i*2});
				if (parentDiv.width() > initialWidth || parentDiv.height() > initialHeight) {
					smallElements.css({fontSize:--i});
					largeElement.css({fontSize:i*2});
					break;
				}
			}
		});
	}


	that.reflow = function() {
		my.resize();
	}


	$(window).resize(function() {
		my.resize();
	})


	my.redraw = function() {

		var showExtraNumbers = !!spec.growth || spec.extraNumbers.show,
			asPercent = !!spec.asPercent,
			column = my.dataSources[0].columns[that.metrics[0]],
			current = parseFloat(my.getMetricValue(0)),
			prevCompare = parseFloat(my.getMetricValue(1)),
			//unused: var prev = parseFloat(my.getMetricValue(2)),
			growth = (prevCompare ? (((current / prevCompare) - 1) * 100).toFixed((asPercent ? spec.decimals : spec.extraNumbers.decimals) || 2) + '%' : 'N/A'),
			currentFormatted = column.formatter(current, (asPercent ? spec.extraNumbers.decimals : spec.decimals) || 0),
			previousFormatted = column.formatter(prevCompare, (asPercent ? spec.extraNumbers.decimals : spec.decimals) || 0),
			title = options.title || spec.title || spec.label || column.parent + " " + column.label

		setTimeout(function() { my.resize(); }, 1)

		return <div className="leo-single-number">
			<div>
				<div className="label resize">{title}</div>
				<div className="value resize">{asPercent ? growth : currentFormatted}</div>
				{
					showExtraNumbers
					? <div className="growth resize">
						{
							asPercent
							? <div>
								{previousFormatted}
								<small>{spec.extraNumbers.previous || 'previous'}</small>
							</div>
							: <div>{spec.extraNumbers.growth || (spec.growth && spec.growth.title ? spec.growth.title : 'growth')}</div>
						}
						{
							asPercent
							? <div>
								{currentFormatted}
								<small>{spec.extraNumbers.current || 'current'}</small>
							</div>
							: <div>{growth}</div>
						}
					</div>
					: false
				}
			</div>
		</div>

	};
	return that;
};
