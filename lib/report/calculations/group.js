var mysql = require("../mysql");
var redshift = require('../redshift.js').escape;
var filterParse = require("../../parse/filter.js").parse;

module.exports = function (options) {
	this.isGrouping = true;
	this.factTable = null;
	this.type = "attribute";
	var groupings = JSON.parse(options.join(':').replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'));

	this.sort = {
		type: 'enum',
		values: groupings.map(g => g.label || g.else || "N/A")
	};

	this.mysqlField.wrap(function (prev) {
		var sql = "CASE";
		groupings.forEach(function (group) {
			group.label = group.label || group.else || "N/A";
			if (group.in) {
				var hasNull = false;
				var list = [];
				group.in.map(function (val) {
					if (val === null || val === undefined) {
						hasNull = true;
					} else {
						list.push(val);
					}
				});
				sql += " WHEN (" + prev() + ") in (" + list.map(mysql.escape) + ") then " + mysql.escape(group.label);
				if (hasNull) {
					sql += " WHEN (" + prev() + ") is null then " + mysql.escape(group.label);
				}
			} else if (group.else) {
				sql += " ELSE " + mysql.escape(group.else);
			} else {
				['<', '<=', '>', '>=', '<>', '!='].forEach(function (compare) {
					if (compare in group) {
						var value = group[compare];

						//This is a hack, where should this be placed
						var matches = group[compare].toString().match(/^@today\.(\w+)/);
						var dateDim = process.dw_fields && process.dw_fields.dateDimension || {};
						var dateDimId = dateDim.id || "d_date";
						if (matches) {
							var filter = filterParse({
								id: dateDimId + '.' + matches[1],
								value: 'today'
							});
							value = filter.value;
						}
						//end hack

						if (compare == '<>') {
							compare = "!=";
						}
						sql += " WHEN (" + prev() + ") " + compare + " " + mysql.escape(value) + " then " + mysql.escape(group.label);
					}
				});
			}
		});
		sql += " END";

		return sql;
	});
	this.redshiftField.wrap(function (prev) {
		var sql = "CASE";
		groupings.forEach(function (group) {
			group.label = group.label || group.else || "N/A";
			if (group.in) {
				var hasNull = false;
				var list = [];
				group.in.map(function (val) {
					if (val === null || val === undefined) {
						hasNull = true;
					} else {
						list.push(val);
					}
				});
				sql += " WHEN (" + prev() + ") in (" + list.map(redshift.escapeValue) + ") then " + redshift.escapeValue(group.label);
				if (hasNull) {
					sql += " WHEN (" + prev() + ") is null then " + redshift.escapeValue(group.label);
				}
			} else if (group.else) {
				sql += " ELSE " + redshift.escapeValue(group.else);
			} else {
				['<', '<=', '>', '>=', '<>'].forEach(function (compare) {
					if (compare in group) {
						var value = group[compare];

						//This is a hack, where should this be placed
						var matches = group[compare].toString().match(/^@today\.(\w+)/);
						if (matches) {
							var dateDim = process.dw_fields && process.dw_fields.dateDimension || {};
							var dateDimId = dateDim.id || "d_date";
							var filter = filterParse({
								id: dateDimId + '.' + matches[1],
								value: 'today'
							});
							value = filter.value;
						}
						//end hack

						if (compare == '<>') {
							compare = "!=";
						}
						sql += " WHEN (" + prev() + ") " + compare + " " + redshift.escapeValue(value) + " then " + redshift.escapeValue(group.label);
					}
				});
			}
		});
		sql += " END";

		return sql;
	});

	this.setField.wrap(function (prev, field, tables, fieldLookup) {
		prev(field, tables, fieldLookup);
		this.format = 'string';
	});
};
