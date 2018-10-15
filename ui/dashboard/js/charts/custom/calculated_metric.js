var base = require("../base.js");
var React = require("react");
var moment = require("moment");
var format = require("../../format.js");
var math = require("mathjs");

module.exports = function (element, spec, options, my) {
	my = my || {};
		
	//spec.metrics = spec.expression.match(/([a-z_]+\.?[a-z_|:]*)/ig)
	spec.metrics = spec.expression.match(/([^()+*\/\-0-9 ]+[^()+*\/\-]*)/ig)
	spec.metrics = spec.metrics.map(function(metric) {
		return metric.trim();
	})
	
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
		var title = options.title || spec.title || spec.label || '',
			current, currentFormatted,
			expression = spec.expression
			
		spec.metrics.forEach(function(column_id, index) {
			expression = expression.replace(column_id, parseFloat(my.getMetricValue(index)))
		})
		
		current = math.eval(expression.replace(/\s+/g, ' '))
		currentFormatted = format[spec.format](current, spec.decimals)
		
		setTimeout(function() { my.resize(); }, 1)
		
		return <div className="leo-single-number">
			<div>
				<div className="label resize">{title}</div>
				<div className="value resize">{currentFormatted}</div>
			</div>
		</div>
		
	};
	return that;
};
