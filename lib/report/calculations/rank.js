var sort = require("../format/sort.js");
var fieldParser = require("../../parse/fieldTokenize.js");

module.exports = function (opt) {
	var options = {
		reversed: false,
		dense: false,
		row: false,
		column: true,
		dimension: null
	};

	opt.forEach(function (option) {
		option = option.trim().toLowerCase();
		if (option === "row") {
			options.row = true;
			options.column = false;
		} else if (option === "reversed" || option === "reverse") {
			options.reversed = true;
		} else if (option === "dense") {
			options.dense = true;
		} else {
			var f = fieldParser(option);
			if (f.isDimension) {
				options.dimension = option;
			}
		}
	});

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);

		this.outColumn.label = "Rank " + this.outColumn.label;
		this.sort = {
			type: 'int'
		};
		this.format = 'int';
		return this;
	});

	this.postProcess.wrap(function (parent, data, mapping, out) {
		parent(data, mapping, out);

		var columns = [];
		var alias = this.alias;
		var dimIndex = null;
		mapping.forEach(function (col, i) {
			if (col.alias === alias) {
				columns.push(i);
			}
			if (options.dimension && col.alias === options.dimension) {
				dimIndex = i;
			}
		});
		if (options.row) {
			processRows(data, columns, out.totals.rows, dimIndex);
		} else {
			processColumns(data, columns, out.totals.columns, dimIndex);
		}
	});

	function processColumns(data, columns, totals, dimIndex) {
		var rowsLength = data.length;
		var columnLength = columns.length;

		//I want to extract all the values and sort them independently
		var sortData = [];
		for (let i = 0; i < rowsLength; i++) {
			let row = data[i];
			var d = [i];
			for (let j = 0; j < columnLength; j++) {
				let x = columns[j];
				d[j + 1] = row[x];
			}
			sortData.push(d);
		}

		for (let j = 0; j < columnLength; j++) {
			var cmp = sort.getComparator({
				type: "metric"
			}, j + 1);
			if (options.reversed) {
				var sortedData = sortData.sort((a, b) => {
					return -1 * cmp(a, b)
				});
			} else {
				var sortedData = sortData.sort(cmp);
			}

			var rank = {};
			var prev = {};
			var first = {};
			var prevRank = {};

			var rankIndex = columns[j];

			var cat = '';
			for (let i = 0; i < sortedData.length; i++) {
				var value = sortedData[i][j + 1];
				if (dimIndex !== null) {
					cat = data[sortedData[i][0]][dimIndex];
				} else {
					cat = '';
				}
				if (!(cat in rank)) {
					rank[cat] = 1;
					prevRank[cat] = 1;
					prev[cat] = null;
					first[cat] = true;
				}

				if (value === prev[cat] && first[cat] !== true) {
					data[sortedData[i][0]][rankIndex] = prevRank[cat];
					if (!options.dense) {
						++rank[cat];
					}
				} else {
					prevRank[cat] = data[sortedData[i][0]][rankIndex] = rank[cat];
					rank[cat]++;
				}
				prev[cat] = value;
				first[cat] = false;
			}
		}
	}

	function processRows(data, columns, rowTotals) {}

};
