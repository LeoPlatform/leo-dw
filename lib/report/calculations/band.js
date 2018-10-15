"use strict";
var extend = require('lodash').extend;

module.exports = function (options) {
	this.isGrouping = true;
	var that = this;
	this.type = 'attribute';
	this.sort = {
		type: 'int'
	};
	var labelText = options[1];

	var algorithms = {
		custom: function (prev, options) {
			var whenRanges = [];
			var ranges = options[0].split(',');
			that.sort = {
				type: 'enum',
				values: []
			};

			for (let i = 0; i < ranges.length; i++) {
				var range = ranges[i].toString().trim();
				that.sort.values.push(range);

				if (range.startsWith('<=')) {
					let n = that.toDBValue(parseFloat(range.replace("<=", "")));
					whenRanges.push(`when ${prev} <= ${n} then '${range}'`);
				} else if (range.startsWith('<')) {
					let n = that.toDBValue(parseFloat(range.replace("<", "")));
					whenRanges.push(`when ${prev} < ${n} then '${range}'`);
				} else if (range.endsWith('+')) {
					let n = that.toDBValue(parseFloat(range.replace("+", "")));
					whenRanges.push(`when ${prev} >= ${n} then '${range}'`);
				} else if (range.startsWith('>=')) {
					let n = that.toDBValue(parseFloat(range.replace(">=", "")));
					whenRanges.push(`when ${prev} >= ${n} then '${range}'`);
				} else if (range.startsWith('>')) {
					let n = that.toDBValue(parseFloat(range.replace(">", "")));
					whenRanges.push(`when ${prev} > ${n} then '${range}'`);
				} else {
					var matches = range.match(/^\s*(\-?[\d\.]+)(-)?([\-\d\.]+)?\s*$/);
					if (matches) {
						var [junk, start, junk2, end] = matches;
						var oStart = start;
						var oEnd = end;
						start = that.toDBValue(parseFloat(start));
						if (end) {
							end = that.toDBValue(parseFloat(end));
							if (end < start) {
								var temp = start;
								start = end;
								end = temp;
							}
							whenRanges.push(`when ${prev} >= ${start} and ${prev} <= ${end} then '${oStart}-${oEnd}'`);
						} else {
							whenRanges.push(`when ${prev} = ${start} then '${oStart}'`);
						}
					}
				}
			}
			that.sort.values.push('Uncategorized');
			that.outColumn.sort = this.sort;
			return "CASE " + whenRanges.join(" ") + " ELSE 'Uncategorized' END";
		},
		all: function (prev, options) {
			return prev;
		},
		single: function (prev, options) {
			var range = [];
			for (var i = 0; i < 10; i++) {
				range.push(i + "-" + (i + 1));
			}
			range.push(10 + "+");
			return this.custom(prev, [range.join(',')]);
		},
	};
	var mysqlAlgorithms = extend({
		every: (prev, options) => {
			var increment = this.toDBValue(options[1]);
			var incrementMinus1 = increment - 1;
			return `concat((floor(${prev} / ${increment}) * ${increment}),'-',(floor(${prev} / ${increment}) * ${increment} + ${incrementMinus1}))`;
		}
	}, algorithms);
	var redshiftAlgorithms = extend({
		every: (prev, options) => {
			var increment = this.toDBValue(options[1]);
			var incrementMinus1 = increment - 1;
			return `(floor(${prev} / ${increment}) * ${increment}) || '-' || (floor(${prev} / ${increment}) * ${increment} + ${incrementMinus1}))`;
		}
	}, algorithms);

	this.mysqlField.wrap(function (prev) {
		if (options[0] in mysqlAlgorithms) {
			return mysqlAlgorithms[options[0]](prev(), options);
		} else {
			return mysqlAlgorithms.custom(prev(), options);
		}
	});

	this.redshiftField.wrap(function (prev) {
		if (options[0] in redshiftAlgorithms) {
			return redshiftAlgorithms[options[0]](prev(), options);
		} else {
			return redshiftAlgorithms.custom(prev(), options);
		}
	});

	this.setField.wrap(function (prev, field, tables, fieldLookup) {
		prev(field, tables, fieldLookup);

		this.outColumn.sort = this.sort;
		this.format = 'string';
		return this;
	});

	this.preProcess.wrap(function (parent, data, mapping) {
		parent(data, mapping);
		if (labelText) {
			var oldSort = this.sort;
			oldSort.group = 1;
			this.outColumn.sort = this.sort = {
				type: "pattern",
				pattern: labelText.replace(/\?/, "(.*)").replace(/\(s\)/, 's?'),
				order: [oldSort]
			};

			var myIndex = mapping[this.alias];
			for (var i = 0; i < data.length; i++) {
				var col = data[i][myIndex];
				if (col.match(/[\-\+]/)) { //multiple
					data[i][myIndex] = labelText.replace(/\(s\)/, 's').replace(/\?/, col);
				} else { //singular
					data[i][myIndex] = labelText.replace(/\(s\)/, '').replace(/\?/, col);
				}
			}
		}
	});
};