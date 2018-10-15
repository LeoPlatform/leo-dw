module.exports = function (opt) {
	var options = {
		total: false,
		total_inverse: false,
		growth: false,
		previous: false,
		next: false,
		row: false,
		column: true
	};

	opt.forEach(function (option) {
		option = option.trim().toLowerCase();
		if (option === "row" || option === "horizontal") {
			options.row = true;
			options.column = false;
		} else if (["total_inverse", "growth", "previous", "next"].indexOf(option) !== -1) {
			options.total = false;
			options[option] = true;
		}
	});

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);
		this.outColumn.format = "percent";
		this.format = "percent";
		this.outColumn.label = "Percent " + this.outColumn.label;
		return this;
	});

	this.postProcess.wrap(function (parent, data, mapping, out) {
		parent(data, mapping, out);

		var columns = [];
		var alias = this.alias;
		mapping.forEach(function (col, i) {
			if (col.alias === alias) {
				columns.push(i);
			}
		});
		if (options.row) {
			rows(data, columns, out.totals.rows);
		} else {
			processColumns(data, columns, out.totals.columns);
		}
	});

	function processColumns(data, columns, totals) {
		var rowsLength = data.length;
		var columnLength = columns.length;
		var prev = [];
		var i, x, j, p, t, val, row;

		for (i = 0; i < columnLength; i++) {
			x = columns[i];
			prev[x] = null;
		}

		if (options.growth) {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					p = prev[x];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}

					if (!p) {
						row[x] = null;
					} else {
						row[x] = (val - p) / p;
					}

					prev[x] = val;
				}
			}
		} else if (options.previous) {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					p = prev[x];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}

					if (!p) {
						row[x] = null;
					} else {
						row[x] = val / p;
					}

					prev[x] = val;
				}
			}
		} else if (options.next) { //same as previous except we do it in reverse
			for (i = rowsLength - 1; i >= 0; i--) {
				row = data[i];
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					p = prev[x];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}

					if (!p) {
						row[x] = null;
					} else {
						row[x] = val / p;
					}

					prev[x] = val;
				}
			}
		} else {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					t = totals[x];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}

					if (!t) {
						val = null;
					} else if (options.total_inverse) {
						row[x] = 1 - (val / t);
					} else {
						row[x] = (val / t);
					}
				}
			}
		}
	}

	function rows(data, columns, totals) {
		var rowsLength = data.length;
		var columnLength = columns.length;
		var i, x, j, p, t, val, row;

		if (options.growth) {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				p = null;
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}

					if (!p) {
						row[x] = null;
					} else {
						row[x] = (val - p) / p;
					}
					p = val;
				}
			}
		} else if (options.previous) {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				p = null;
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}
					if (!p) {
						row[x] = null;
					} else {
						row[x] = val / p;
					}
					p = val;
				}
			}
		} else if (options.next) { //same as previous except we do it in reverse
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				p = null;
				for (j = columnLength; j >= 0; j--) {
					x = columns[j];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}
					if (!p) {
						row[x] = null;
					} else {
						row[x] = val / p;
					}
					p = val;
				}
			}
		} else {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					t = totals[i];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}

					if (!t) {
						val = null;
					} else if (options.total_inverse) {
						row[x] = 1 - (val / t);
					} else {
						row[x] = (val / t);
					}
				}
			}
		}
	}

};