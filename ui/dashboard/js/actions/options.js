var api = require("../webAPI.js");

module.exports = require("../react/flux/action.js")(function (my,dispatcher) {
	this.setFilter = function(group, id, comparison, value, label, checkboxes, api, isRequired, singleValue, isHidden) {
		dispatcher.emit("options.setFilter", {
			group: group||'default',
			id: id,
			comparison: comparison,
			value: value,
			checkboxes: checkboxes,
			label: label,
			api: api,
			isRequired: isRequired,
			singleValue: singleValue,
            isHidden: isHidden
		});
	};

	this.updateFilter = function (group, filter) {
		filter.group = group||'default';
		dispatcher.emit("options.setFilter", filter);
	};

	this.deleteFilter = function(group, id) {
		dispatcher.emit("options.deleteFilter", {
			group: group||'default',
			id: id
		});
	};

	this.setTimeFilter = function(group, value) {
		dispatcher.emit("options.setTimeFilter", {
			group: group||'default',
			value: value
		});
	};


	this.setTimeBreakdown = function(group, breakdown) {
		dispatcher.emit("options.setTimeBreakdown", {
			group: group||'default',
			breakdown: breakdown
		});
	};

	this.reset = function(group, breakdown) {
		dispatcher.emit("options.reset");
	};

	this.setLegendToggles = function(group, items) {
		dispatcher.emit("options.setLegendToggles", {
			group: group||'default',
			items: items
		});
	};

	this.setLegendToggle = function(group, name, status) {
		dispatcher.emit("options.setLegendToggle", {
			group: group||'default',
			name: name,
			status: status
		});
	};

	this.setColor = function(group, seriesName, color) {
		dispatcher.emit("options.setColor", {
			group: group||'default',
			color: color,
			seriesName:seriesName
		});
	};

	this.setDefaultColors = function(group, defaultColors) {
		dispatcher.emit("options.setDefaultColors", {
			group: group||'default',
			defaultColors: defaultColors
		});
	};

	this.setDefaultRefresh = function(group, rate) {
		dispatcher.emit("options.setRefresh", {
			group: group||'default',
			rate: rate
		});
	};
});
