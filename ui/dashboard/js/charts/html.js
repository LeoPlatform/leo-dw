var base = require("./base.js");
var handlebars = require("handlebars");
var format = require("../format.js");

handlebars.registerHelper('format', function(type, value) {
	return format[type](value);
});
handlebars.registerHelper('money', function(value) {
	return format.money(value);
});

module.exports = function (element,spec, options, my) {
	my = my || {};
	let templates = [];
	element.find("script[type='text/x-handlebars-template']").each(function(i, e) {
		templates[$(e).data("id")] = handlebars.compile($(e).html());  
	});
  
	var that = base(element, spec, options, my);
	my.context.handlebars = handlebars;
	my.context.templates = templates;

	if (spec.init) {
		spec.init.call(my.context);
	}
	
	my.redraw = function() {
		var source = my.dataSources[0];
		if (source) {
			var data = {
				columns: source.columns,
				mapping: source.mapping,
				rows: []
			};
			for(var i =0; i < source.rows.length; i++) {
				var newRow = [];
				var row = source.rows[i]; 
				for(let j = 0; j < row.length; j++) {
					newRow[source.mapping[j].id] = row[j];
				}
				data.rows.push(newRow);
			}
			var result = spec.draw.call(my.context, data);
			if (result) {
				element.html(result);
			}
		}
	};
	return that;
};
