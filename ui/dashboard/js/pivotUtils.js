var format = require('../../Insights/js/data/format.js');
var sort = require('../../../lib/report/sort.js');
var minColumnWidth = 120;
var columnWidths = {};

module.exports = {

	transform: function (pivotrows, pivotcolumns, input, sorts, numberOnly) {

		if (input === 'error') {
			var inputColumns = pivotcolumns.map(function (column) {
				return {
					id: column,
					label: column.replace(/^f_/, '').replace(/^d_/, '').replace(/[\.|]/, ' '),
					type: (column.match(/^f_/) ? 'metric' : '')
				};
			});
			var inputRows = pivotrows.map(function (row) {
				return {
					id: row,
					label: row.replace(/^f_/, '').replace(/^d_/, '').replace(/[\.|]/, ' '),
					type: (row.match(/^f_/) ? 'metric' : '')
				};
			});
			input = {
				columns: inputColumns.concat(inputRows),
				data: [
					[]
				]
			};
			input.error = 'An Unknown Error Occurred';
		}

		if (sorts == undefined) sorts = [];

		var columnDataMapping = {};
		var columnComparators = [];
		var result = {
			columns: {},
			rowheaders: [],
			columnheaders: [],
			headers: [],
			rows: [],
			filters: input.filters,
			mapping: []
		};

		if (input.error) {
			if (input.columns.length == 0) {
				var inputColumns = pivotcolumns.map(function (column) {
					return {
						id: column,
						label: column.replace(/^f_/, '').replace(/^d_/, '').replace(/[\.|]/, ' '),
						type: (column.match(/^f_/) ? 'metric' : '')
					};
				});
				var inputRows = pivotrows.map(function (row) {
					return {
						id: row,
						label: row.replace(/^f_/, '').replace(/^d_/, '').replace(/[\.|]/, ' '),
						type: (row.match(/^f_/) ? 'metric' : '')
					};
				});
				input.columns = inputColumns.concat(inputRows);
			}
			input.data = [
				[input.error]
			];
			result.error = input.error;
		}

		//    if (input.groups && input.groups.length > 0 && input.partitions && input.partitions.length > 0) {
		//      var rowDims = ReportStore.getDimensions();
		//      var rowMetrics = ReportStore.getMetrics();
		//      var partitions = input.partitions.slice(0);
		//      var addColumn = {};
		//      //Do we have a rank or cumulative calculation? Only add hidden fields if we do!
		//      for(var i in input.columns) {
		//        if(input.columns[i].calc && input.columns[i].partition && input.columns[i].partition.length) {
		//          if(typeof input.columns[i].partition == 'string') input.columns[i].partition = [input.columns[i].partition]
		//          partitions = partitions.concat(input.columns[i].partition);
		//        }
		//        addColumn[input.columns[i].id] = (input.columns[i].type == "metric") ? rowMetrics : rowDims;
		//      }
		//      if (partitions.length > input.partitions.length) {
		//        for(var i in input.groups) {
		//          var mydim = input.groups[i];
		//          //if(mydim[0] != "d") continue;
		//          if(rowDims.indexOf(mydim) == -1) {
		//            addColumn[mydim].push(mydim);
		//            if(pivotcolumns.indexOf(mydim) == -1 && pivotrows.indexOf(mydim) == -1) pivotcolumns.unshift(mydim);
		//          }
		//        }
		//      }
		//    }

		String.prototype.width = function (font) {
			var font = (font || '14px inherit'),
				o = $('<div>' + this + '</div>')
					.css({
						position: 'absolute',
						whiteSpace: 'nowrap',
						visibility: 'hidden',
						'font': font
					})
					.appendTo($('body')),
				w = o.width();
			o.remove();
			return w;
		};

		var widestRows = [];

		input.data.forEach(function (row, i) {
			row.forEach(function (cellData, j) {
				var columnId = input.columns[j].id;
				if (
					(widestRows[columnId] ? widestRows[columnId] : '').length < (cellData ? cellData.toString() : '').length
				) {
					widestRows[columnId] = cellData.toString();
				}
			});
		});

		input.columns.forEach(function (column, index) {
			columnWidths[column.id] = Math.max(
				(columnWidths[column.id] ? columnWidths[column.id] : minColumnWidth),
				(widestRows[column.id] ? widestRows[column.id].replace(/[ijlty:\.]/g, 'x').width() : 0)
			);

			result.columns[column.id] = column;
			column.formatter = format.get(column, numberOnly);
			columnDataMapping[column.id] = index;
			// This is the index of the column as it will appear in the rows of data, allowing the dynanmic
			// referencing of data in the row.
			column.index = index;
			columnComparators[index] = sort.getComparator(column, index);
		});

		var metrics = [];
		/***************************************************************************************************************************************************************************************************
		 * generate the columns section
		 **************************************************************************************************************************************************************************************************/
		var hasColumnMetrics = false;
		var columnIds = [];
		pivotcolumns.forEach(function (pivotid) {
			if (pivotid.id) {
				pivotid = pivotid.id;
			}
			var column = {
				id: pivotid,
				width: columnWidths[pivotid]
			};

			if (result.columns[pivotid].type) {
				column.type = result.columns[pivotid].type;
			}
			result.columnheaders.push(column);
			if (column.type == "metric") {
				column.width = columnWidths[pivotid]; //minColumnWidth;
				hasColumnMetrics = true;
				metrics.push(column);
			} else {
				result.mapping.push(result.columns[column.id]);
				columnIds.push(columnDataMapping[pivotid]);
			}
		});

		if (columnIds.length == 1) {
			result.columnheaders[0].width = Math.max(result.columnheaders[0].width, 150);
		}

		/***************************************************************************************************************************************************************************************************
		 * figure out the row elements
		 **************************************************************************************************************************************************************************************************/
		var hasRowMetrics = false;
		var rowIds = [];
		var indexMap = {};
		pivotrows.forEach(function (pivotid) {
			if (pivotid.id) {
				pivotid = pivotid.id;
			}
			var column = {
				id: pivotid,
				height: 38
			};
			if (result.columns[pivotid].type) {
				column.type = result.columns[pivotid].type;
			}
			result.rowheaders.push(column);
			if (column.type == "metric") {
				column.height = 28;
				hasRowMetrics = true;
				metrics.push(column);
			} else {
				rowIds.push(columnDataMapping[pivotid]);
			}
		});

		if (hasRowMetrics) {
			if (result.columnheaders.length == 0) {
				result.columnheaders.push({
					type: "metrics",
					width: 150
				});
			} else {
				result.columnheaders.push({
					type: "metrics",
					width: 120
				});
			}
		}

		if (hasColumnMetrics) {
			result.rowheaders.push({
				type: "metrics",
				height: 38
			});
		}

		var pivoted = pivot(input.data, columnIds, rowIds, {
			comparators: function (columnId, a, b) {
				return columnComparators[columnId](a, b);
			}
		});

		/***************************************************************************************************************************************************************************************************
		 * generate the headers section
		 **************************************************************************************************************************************************************************************************/
		var headers = [];

		var levels = 0;
		if (pivoted.columnHeaders.length > 0) {
			levels = pivoted.columnHeaders[0].length;
		}
		if (levels > 0) {
			var lastPoints = [];
			for (var level = 0; level < levels; level++) {
				headers[level] = [];
				var last = null;
				var span = 0;
				var offset = 0;

				if (hasColumnMetrics && level == levels - 1) {
					headers[level + 1] = [];
				}

				pivoted.columnHeaders.forEach(function (header, i) {

					if (last == null || last.value !== header[level] || lastPoints.indexOf(offset + last.span) !== -1) {

						if (last) {
							offset += last.span;
							if (lastPoints.indexOf(offset) !== -1) {
								last.last = true;
							}
							lastPoints.push(offset);
						}
						last = {
							id: pivotrows[level],
							value: header[level],
							span: hasColumnMetrics ? metrics.length : 1,
							width: hasColumnMetrics ? metrics.length * columnWidths[pivotrows[level]] : columnWidths[pivotrows[level]] //minColumnWidth : minColumnWidth
						};

						if (level == 0) last.last = true;

						headers[level].push(last);
						if (hasColumnMetrics && level == levels - 1) {
							metrics.forEach(function (metric, j) {
								var column = {
									id: metric.id,
									span: 1,
									type: 'metric',
									width: columnWidths[pivotrows[level]]
								};

								metrics[j].width = column.width;

								if (j === metrics.length - 1) {
									column.last = true;
								}
								headers[level + 1].push(column);
								result.mapping.push(result.columns[column.id]);
							});
						}
					} else {
						last.span += hasColumnMetrics ? metrics.length : 1;
						last.width += hasColumnMetrics ? metrics.length * columnWidths[pivotrows[level]] : columnWidths[pivotrows[level]]; //minColumnWidth : minColumnWidth;
					}

					if (i == (pivoted.columnHeaders.length - 1)) {
						last.last = true;
						lastPoints.push(offset + last.span);
					}
				});
			}
		} else {
			headers[0] = [];
			if (hasColumnMetrics) {
				metrics.forEach(function (metric, j) {
					var column = {
						id: metric.id,
						span: 1,
						type: 'metric',
						width: columnWidths[metric.id] //minColumnWidth
					};

					if (j === metrics.length - 1) {
						column.last = true;
					}
					headers[0].push(column);
					result.mapping.push(result.columns[column.id]);
				});
			} else {
				headers[0].push({
					value: '',
					span: 1,
					last: true,
					width: minColumnWidth
				});
			}
		}
		result.headers = headers;

		/***************************************************************************************************************************************************************************************************
		 * generate the rows
		 **************************************************************************************************************************************************************************************************/
		var mappingLength = result.mapping.length;

		var rows = [];
		pivoted.rows.forEach(function (row, index) {
			var headers = pivoted.rowHeaders[index];
			var newRow = [];
			headers.forEach(function (header, i) {
				newRow.push(header);
			});

			if (hasColumnMetrics) {
				for (var i = 0; i < row.length; i++) {
					var category = row[i];
					if (category == undefined) {
						metrics.forEach(function (metric) {
							if (hasColumnMetrics) {
								newRow.push(null);
							}
						});
					} else {
						metrics.forEach(function (metric) {
							indexMap[metric.id] = newRow.length;
							newRow.push(category[0][columnDataMapping[metric.id]]);
						});
					}
				}
				rows.push(newRow);
			} else {
				metrics.forEach(function (metric) {
					var c = result.columns[metric.id];
					var cols = [metric.id];
					for (var i = 0; i < row.length; i++) {
						var category = row[i];
						if (category == undefined) {
							cols.push(null);
						} else {
							cols.push(category[0][columnDataMapping[metric.id]]);
						}
					}
					rows.push(newRow.concat(cols));
				});
			}
		});
		for (var i = 0; i < result.mapping.length; i++) {
			if (indexMap[result.mapping[i].id]) result.mapping[i].index = indexMap[result.mapping[i].id];
		}
		rows = rows.sort(sort.getMultiCompare(sorts, result.mapping)).slice(0, 1000);
		result.sorted = {};
		for (var i = 0; i < sorts.length; i++) {
			result.sorted[sorts[i].column] = {
				position: i + 1,
				direction: sorts[i].direction,
				auto: sorts[i].auto
			};
		}
		var length = rows.length;
		var mapping = result.mapping;
		var zeroPops = {};
		result.rows = [];
		if (length) result.rows = rows;
		if (length) {
			var columnLength = rows[0].length;
			if (hasColumnMetrics) {
				for (var i = 0; i < length; i++) {
					var row = rows[i];
					for (var j = 0; j < columnLength; j++) {
						row[j] = mapping[j].formatter(row[j]);
						if (mapping[j].populateZero) {
							if (!zeroPops[j]) zeroPops[j] = 0;
							if (row[j] == 0) {
								row[j] = zeroPops[j];
							} else {
								zeroPops[j] = row[j];
							}
						}
					}
				}
			} else {
				var metricColumn = result.columnheaders.length - 1;
				for (var i = 0; i < length; i++) {
					var row = rows[i];
					var column = result.columns[row[metricColumn]];
					for (var j = 0; j < metricColumn; j++) {
						row[j] = mapping[j].formatter(row[j]);
					}
					row[metricColumn] = column.label;
					var formatter = column.formatter;
					for (var j = metricColumn + 1; j < columnLength; j++) {
						row[j] = formatter(row[j]);
					}
				}
			}
			result.rows = rows;
		}
		return result;
	}
};

/*
 * Copyright (c) 2010 Mark Bolusmjak
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to
 * do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var pivot = (function () {

	var SortedSet = (function () {

		function find(val, array, comparator) {
			var l = 0;
			var r = array.length - 1;
			var i;
			var compare;
			while (l <= r) {
				i = ((l + r) / 2) | 0;
				compare = comparator(array[i], val);
				if (compare < 0) {
					l = i + 1;
					continue;
				}
				if (compare > 0) {
					r = i - 1;
					continue;
				}
				return i;
			}
			return null;
		}

		var concat = (function () {
			var a = [];
			var c = a.concat;

			function concat() {
				return c.apply(a, arguments);
			}
			return concat;
		}());

		function insert(value, comparator, values) {
			var r = values.length - 1;
			if (r === -1) {
				return [value];
			}
			var l = 0;
			var i, compare;
			while (l <= r) {
				i = ((l + r) / 2) | 0;
				compare = comparator(values[i], value);
				if (compare < 0) {
					// array[i] is less than our value
					l = i + 1;

				} else if (compare > 0) {
					r = i - 1;
				} else {
					// already here
					return values;
				}
			}
			if (comparator(values[i], value) < 0) {
				// insert after i
				return concat(values.slice(0, i + 1), [value], values.slice(i + 1));
			} else {
				// insert before i

				return concat(values.slice(0, i), [value], values.slice(i));
			}
		}

		function SortedSet(comparator) {
			this.comparator = comparator;
			this.values = [];
		}

		SortedSet.prototype.insert = function (value) {
			this.values = insert(value, this.comparator, this.values);
		};

		SortedSet.prototype.indexOf = function (value) {
			return find(value, this.values, this.comparator);
		};

		SortedSet.prototype.size = function () {
			return this.values.length;
		};

		return SortedSet;
	}());

	var Utils = {
		copyProperties: function (source, dest) {
			for (var k in source) {
				if (source.hasOwnProperty(k)) {
					dest[k] = source[k];
				}
			}
		},
		isArray: function (testObject) {
			return testObject && !(testObject.propertyIsEnumerable('length')) && typeof testObject === 'object' && typeof testObject.length === 'number';
		},
		stringComparator: function (a, b) {
			return a.localeCompare(b);
		},
		numberComparator: function (a, b) {
			if (a > b) {
				return 1;
			} else if (b > a) {
				return -1;
			} else {
				return 0;
			}
		},
		defaultComparator: function () {
			return 0;
		},
		makeComparator: function (fields, data, comparators) {
			var len = fields.length;
			var i;
			var c = [];
			for (i = 0; i < len; i++) {
				c[i] = comparators;
			}
			return function (a, b) {
				var v = 0;
				for (i = 0; i < len; i++) {
					v = c[i](fields[i], a, b);
					if (v !== 0) {
						return v;
					}
				}
				return 0;
			};
		}
	};

	var pivot = (function () {

		var defaultOptions = {
			extractor: null,
			comparators: {}
		};

		function extractData(data, options) {
			var extractor = options.extractor;
			if (typeof extractor === 'function') {
				var extracted = [];
				var length = data.length;
				for (var i = 0; i < length; i++) {
					extracted = extracted.concat(extractor(data[i]));
				}
				return extracted;
			} else {
				return data;
			}
		}

		function buildPivotResult(data, leftSet, topSet) {
			var len = data.length;
			var dat;
			var i;
			for (i = 0; i < len; i++) {
				dat = data[i];
				leftSet.insert(dat);
				topSet.insert(dat);
			}

			var result = [];
			result.length = leftSet.size();

			for (i = 0; i < len; i++) {
				dat = data[i];
				var rowIndex = leftSet.indexOf(dat);
				var colIndex = topSet.indexOf(dat);
				var row = result[rowIndex];
				if (row === undefined) {
					row = [];
					row.length = topSet.size();
					result[rowIndex] = row;
				}
				var entry = row[colIndex];
				if (entry === undefined) {
					row[colIndex] = [dat];
				} else {
					entry.push(dat);
				}
			}
			return result;
		}

		function makeHeaders(data, fieldNames) {
			var result = [];
			var dataLength = data.length;
			var namesLength = fieldNames.length;
			var i, j;
			for (i = 0; i < dataLength; i++) {
				var datum = data[i];
				var entry = [];
				for (j = 0; j < namesLength; j++) {
					entry[j] = datum[fieldNames[j]];
				}
				result[i] = entry;
			}
			return result;
		}

		function pivotData(data, rowNames, columnNames, userOptions) {
			if (userOptions === undefined) {
				userOptions = {};
			}
			var options = {};
			Utils.copyProperties(defaultOptions, options);
			if (userOptions) {
				Utils.copyProperties(userOptions, options);
			}

			var leftSet = new SortedSet(Utils.makeComparator(rowNames, data, options.comparators));
			var topSet = new SortedSet(Utils.makeComparator(columnNames, data, options.comparators));

			data = extractData(data, options);

			var result = {
				rows: buildPivotResult(data, leftSet, topSet),
				rowHeaders: makeHeaders(leftSet.values, rowNames),
				columnHeaders: makeHeaders(topSet.values, columnNames)
			};
			return result;
		}

		return pivotData;
	}());

	return pivot;
}());
