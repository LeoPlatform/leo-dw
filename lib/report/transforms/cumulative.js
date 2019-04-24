var sort = require("../format/sort.js");

function simpleCumulative(derived, mapping, data, columns) {
	var index = mapping[derived.id];
	var fieldIndex = mapping[derived.field];
	var sortIndex = mapping[derived.order[0].column];
	derived.format = columns[fieldIndex].format;
	var sortColumn = columns[sortIndex];
	var length = data.length;
	var arr = [];
	var total = 0;
	for (var i = 0; i < length; i++) {
		arr.push({
			index : i,
			val : data[i][fieldIndex],
			sort : data[i][sortIndex]
		});
		total += parseFloat(data[i][fieldIndex]) || 0;
	}
	arr.sort(sort.getComparator(columns[sortIndex], 'sort'));
	var row = null;
	var prev = 0;
	for (i = 0; i < data.length; i++) {
		row = arr[i];
		var val = row.val + prev;
		if (derived.inverse) {
			if (!derived.prior) {
				data[row.index][index] = total - prev;
			} else {
				data[row.index][index] = total - val;
			}
		} else {
			if (!derived.prior) {
				data[row.index][index] = val;
			} else {
				data[row.index][index] = prev;
			}
		}
		prev = val;
	}
}
function partitionedCumulative(derived, mapping, data, columns) {
	var index = mapping[derived.id];
	var fieldIndex = mapping[derived.field];
	var sortIndex = mapping[derived.order[0].column];
	var partitionIndex = mapping[derived.partition[0]];
	derived.format = columns[fieldIndex].format;

	var sortColumn = columns[sortIndex];

	var length = data.length;
	var arr = [];
	var total = {};
	var prev = {};
	for (var i = 0; i < length; i++) {
		var partition = data[i][partitionIndex];
		arr.push({
			index : i,
			val : data[i][fieldIndex],
			sort : data[i][sortIndex],
			partition : partition
		});
		if (!(partition in total)) {
			total[partition] = data[i][fieldIndex] || 0;
		} else {
			total[partition] += data[i][fieldIndex] || 0;
		}
	}
	arr.sort(sort.getComparator(columns[sortIndex], 'sort'));
	var row = null;
	for (i = 0; i < length; i++) {
		row = arr[i];
		var p = (prev[row.partition] || 0);
		var t = total[row.partition];
		var val = row.val + p;
		if (derived.inverse) {
			if (derived.prior) {
				data[row.index][index] = t - p;
			} else {
				data[row.index][index] = t - val;
			}
		} else {
			if (derived.prior) {
				data[row.index][index] = p;
			} else {
				data[row.index][index] = val;
			}
		}

		prev[row.partition] = val;
	}
}
module.exports = {
	parse : function(derived,inclusive) {
		var requiredFields = [ derived.field ];
		if(inclusive) requiredFields.push(derived.order[0].column);
		if (derived.partition && derived.partition[0]) {
			requiredFields.push(derived.partition[0]);
		}
		return {
			fields : requiredFields
		};
	},
	transform : function(derived, mapping, data, columns) {
		if (derived.partition && derived.partition[0]) {
			partitionedCumulative(derived, mapping, data, columns);
		} else {
			simpleCumulative(derived, mapping, data, columns);
		}
		derived.onEmpty = "";
	}
};
