module.exports = function (field, lookup) {
	lookup = lookup || process.dw_fields;
	var table, alias, calcId, joinDimensionAlias;

	var parsed = {
		requiredTables: [],
		alias: field,
		table: null,
		calcs: [],
		options: []
	};
	var parts;

	var isFX = false;
	if (field.match(/^fx\(/i)) {
		isFX = true;
	}

	if (isFX) {
		parts = field.trim().match(/^fx\((.*)(\)|\)\|.*)$/)[2].split('|');
		parts.shift();
		parsed.calcs.push({
			calcId: 'fx'
		});
	} else {
		// Check for functions
		parts = field.split('|');
		field = parts.shift();
	}

	let stringCalcPos = parsed.calcs.length;
	let isPiped = field.match(/\|/);
	let hasTransforms = parts.length && parts[0].indexOf("label") !== 0;

	if (parts.length) {
		var iter = parts.length;
		for (var i = 0; i < iter; i++) {
			calcId = parts.shift();
			var myoptions = calcId.split(':');
			calcId = myoptions.shift();
			parsed.calcs.push({
				calcOptions: myoptions.slice(0),
				calcId: calcId
			});
		}
		parts = parsed.calcs[0].calcOptions;
	}

	if (!isFX) {
		// Check for outrigger
		parts = field.split('$');
		if (parts.length > 1) {
			field = parts[1];
			var joinDimension = parts[0];

			parts = joinDimension.split('.');
			if (parts.length > 1) {
				table = parts[1];
				alias = parts[0];
			} else {
				table = joinDimension;
				alias = joinDimension;
			}

			parsed.requiredTables.push({
				table: table,
				alias: alias
			});
			joinDimensionAlias = alias;
		}

		// Now field is just the field name
		// Get the table and alias
		parts = field.split('.');
		alias = parts.shift();
		if (parts.length === 2) {
			table = parts.shift();
		} else {
			table = alias;
		}
		parsed.column = parts.shift();
		if (parsed.column != "_id") {
			parsed.requiredTables.push({
				table: table,
				alias: joinDimensionAlias ? joinDimensionAlias + '$' + alias : alias,
				joinTable: joinDimensionAlias ? joinDimensionAlias : null
			});
		}

		if (parsed.column) {
			parts = parsed.column.split(':');
			if (parts.length > 1) {
				parsed.column = parts[0];
				parsed.options = parts.slice(1);
			}
		}

		parsed.id = table;
		parsed.real_table = table;
		if (parsed.column) {
			parsed.id += "." + parsed.column;
		}

		parsed.table = joinDimensionAlias ? joinDimensionAlias + '$' + alias : alias;
		parsed.tablePath = joinDimensionAlias ? joinDimensionAlias + '.' + alias : alias;

		let dimTable = lookup.dimension[parsed.real_table];
		let factTable = lookup.fact[parsed.real_table];
		parsed.real_table_def = dimTable || factTable;
		parsed.isDimension = !!dimTable;
		parsed.isFact = !!factTable;
	}
	parsed.factTable = function () {
		return '';
	};

	if (!hasTransforms && (parsed.isDimension || (!parsed.isFact && !isPiped))) {
		parsed.calcs.splice(stringCalcPos, 0, {
			calcId: 'string'
		});
	}

	return parsed;
};
