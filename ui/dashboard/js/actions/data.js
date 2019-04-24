var api = require("../webAPI.js");
var format = require("../format.js");

module.exports = require("../react/flux/action.js")(function (my, dispatcher) {
	this.load = function (id, data) {

		var apiData = {
			groups: data.groups,
			partitions: data.partitions,
			metrics: data.metrics,
			filters: data.filters,
			apikey: window.apiKey,
			redshift: ('useredshift' in window) ? window.useredshift : true,
			numericFormat: true,
			sort: data.sort
		};

		if (apiData.metrics.length > 0) {
			api.post("report", apiData, function (result) {
				if (result === 'error') {
					result = {
						error: true
					};
				}
				result.groups = data.groups;
				result.partitions = data.partitions;
				if (!result.error) {
					for (var columnId in result.columns) {
						result.columns[columnId].formatter = format.get(result.columns[columnId]);
					}
					for (var i = 0; i < (result.mapping || {}).length; i++) {
						result.mapping[i].formatter = format.get(result.mapping[i]);
					}
				}
				dispatcher.emit("data.data", {
					id: id,
					data: result
				});
			});
		}
	};

	this.reset = function () {
		dispatcher.emit("data.reset");
	};

	this.refresh = function () {
		dispatcher.emit("data.refresh");
	};

	this.downloadData = function (title, data, dataSource) {

		if (!data && dataSource) {
			var headerRow = [];
			dataSource.columnheaders.forEach((columnHeader) => {
				headerRow.push(
					dataSource.columns[columnHeader.id].label
				);
			});
			data = [headerRow];

			/*
			TODO: sort
			var position = dataSource.sorted[0].position
			var direction = dataSource.sorted[0].direction
			dataSource.rows.sort((a, b) => {
				if (direction == 'asc') {

				} else {
					if (a[sortParams.position]) {

					}
				}
			})
			console.log('dataSource', dataSource)
			*/

			dataSource.rows.forEach((row) => {
				data.push(
					row.map((value, index) => {
						return (dataSource.mapping[index].formatter) ? dataSource.mapping[index].formatter(value) : value;
					})
				);
			});
		}

		if (data) {
			var downloadForm = $("#downloadform");
			if (!downloadForm.length) {
				downloadForm = $('<div id="downloadform" style="display: none"><a>download</a>').appendTo("body");
			}
			var d = data.map(function (r) {
				return r.join(",");
			}).join("\r\n");
			var a = $("a", downloadForm);
			a.attr("target", "_blank");
			a.attr("download", title + ".csv");
			a.attr("href", 'data:text/csv;base64,' + btoa(d));
			a[0].click();
		}
	};
});
