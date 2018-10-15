module.exports = function (opt) {
	var options = {
		reversed: false,
		shiftup: false,
		shiftdown: false,
		row: false,
		column: true
	};

	this.setField.wrap((prev, field, tables, fieldLookup) => {
		prev(field, tables, fieldLookup);

		this.outColumn.label = "Cumulative " + this.outColumn.label;
		return this;
	});

	opt.forEach(function (option) {
		option = option.trim().toLowerCase();
		if (option === "row" || option === "horizontal") {
			options.row = true;
			options.column = false;
		} else if (option === "reversed" || option === "reverse") {
			options.reversed = true;
		} else if (option === "up") {
			options.shiftup = true;
		} else if (option === "down") {
			options.shiftdown = true;
		}
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
			processRows(data, columns, out.totals.rows);
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
			prev[x] = 0;
		}

		var lastRow = [];
		if (options.reversed) {
			for (i = rowsLength - 1; i >= 0; i--) {
				row = data[i];
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}
					if (options.shiftup) {
						row[x] = prev[x];
						prev[x] = prev[x] + val;
					} else if (options.shiftdown) {
						prev[x] = lastRow[x] = val + prev[x];
					} else {
						prev[x] = row[x] = prev[x] + val;
					}
				}
				lastRow = row;
			}
			if (options.shiftdown) {
				data[0] = prev;
			}
		} else {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}
					if (options.shiftup) {
						prev[x] = lastRow[x] = val + prev[x];
					} else if (options.shiftdown) {
						row[x] = prev[x];
						prev[x] = prev[x] + val;
					} else {
						prev[x] = row[x] = prev[x] + val;
					}
				}
				lastRow = row;
			}
			if (options.shiftup) {
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					data[i - 1][x] = prev[x];
				}
			}
		}
	}

	function processRows(data, columns, rowTotals) {
		var rowsLength = data.length;
		var columnLength = columns.length;
		var prev = [];
		var i, x, j, p, t, val, row;

		var lastx = null;

		if (options.reversed) {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				p = 0;
				for (j = columnLength - 1; j >= 0; j--) {
					x = columns[j];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}
					if (options.shiftup) {
						row[x] = p;
						p = p + val;
					} else if (options.shiftdown) {
						if (lastx) {
							p = row[lastx] = val + p;
						}
					} else {
						p = row[x] = p + val;
					}
					lastx = x;
				}
				if (options.shiftdown) {
					row[columns[0]] = p;
				}
			}
		} else {
			for (i = 0; i < rowsLength; i++) {
				row = data[i];
				p = 0;
				for (j = 0; j < columnLength; j++) {
					x = columns[j];
					val = row[x];
					if (!val || isNaN(val)) {
						val = 0;
					}
					if (options.shiftup) {
						p = row[lastx] = val + p;
					} else if (options.shiftdown) {
						row[x] = p;
						p = p + val;
					} else {
						p = row[x] = p + val;
					}
					lastx = x;
				}
				if (options.shiftup) {
					row[x] = p;
				}

			}
		}
	}

};