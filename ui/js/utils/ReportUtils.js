var WebAPI = require('./WebAPI');
//var PivotUtils = require('./PivotUtils');

module.exports = Object.freeze({

	/* not used? */
	reportData : function(options, callback) {

		options.sort = options.sort || {};

		var apiData = this.buildApiData(options.columns, options.rows, options.filters, options.sort, options.top);

		WebAPI.post("report", apiData, function(result) {

			callback(null, PivotUtils.transform(options.columns, options.rows, result));

		});

	},


	buildApiData : function(columns, rows, filters, sort, dimensions, top) {

		/* columns are rows and rows are columns :( */

		var apiData = {
			metrics : [],
			groups : [],
			filters : [],
			partitions : [],
			redshift : ('useredshift' in window) ? window.useredshift : true,
			sort: sort,
			top: top
		};

		for (var i = 0; i < columns.length; i++) {
			var col = columns[i];
			if (col) {
				if (dimensions.indexOf(col) != -1) {
				//if (col.match && !col.match(/\|count$/) && !col.match(/\|percent/) && !col.match(/\|cumulative/) && (col.match(/^d_/) || col.match(/\.dd/))) {
					apiData.partitions.push(columns[i]);
				} else {
					apiData.metrics.push(col);
				}
			}
		}

		for (var i = 0; i < rows.length; i++) {
			var col = rows[i];
			if (col) {
				if (dimensions.indexOf(col) != -1) {
				//if (
				//	(col.match && !col.match(/\|count$/) && !col.match(/\|percent/) && !col.match(/\|cumulative/) && (col.match(/^d_/) || col.match(/\.dd/))) ||
				//	(col.id && !col.match(/\|count$/) && !col.match(/\|percent/) && !col.match(/\|cumulative/) && col.id.match(/^d/))
				//) {
					apiData.groups.push(col);
				} else {
					apiData.metrics.push(col);
				}
			}
		}

		//Fixes a bug with mixed objects in an array
		var metrics = {};
		apiData.metrics.map(function(element,i) {
			metrics[i] = element;
		});
		apiData.metrics = metrics;

		//Fixes a bug with mixed objects in an array
		var groups = {};
		apiData.groups.map(function(element,i) {
			groups[i] = element;
		});
		apiData.groups = groups;

		if (window.parent.dashboardFilters) {
			filters = JSON.parse(JSON.stringify(filters));
			filters = filters.concat(
				window.parent.dashboardFilters.filter((dashboardFilter) => {
					return !filters.some((filter) => {
						return dashboardFilter.id == filter.id;
					});
				})
			);
		}

		for (var i = 0; i < filters.length; i++) {
			var filter = filters[i];
			var comparison = filter.comparison;

			if (($.isArray(filter.value) && filter.value.length == 0) || filter.value == "") {
				filter.value = "";
			} else {

				// IF the value is or is not an array, make sure we send the correct var
				if ($.isArray(filter.value)) {

					if (comparison == "=") {
						comparison = "in";
					}
					if (comparison == "!=") {
						comparison = "!in";
					}

				} else {

					if (comparison == "in") {
						comparison = "=";
					}
					if (comparison == "!in") {
						comparison = "!=";
					}

				}

				apiData.filters.push({
					id : filter.id,
					comparison : comparison,
					value : filter.value || '',
					checkboxes : filter.checkboxes || ''
				});

			}
		}

		return apiData;
	}

});
