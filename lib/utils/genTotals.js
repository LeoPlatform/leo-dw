var sort = require('../report/format/sort');
var util = require('util');


function genTotals(columns,rows,options) {
	var rowTotal = [];//Contains one element for each row in the same order they should appear on the front end
	var idxRowTotal = {};
	var colTotal = [];//Contains one element for each column with the same index the column should have on the front end
	var total = [];
	var partitions = options.partitions.slice(0);
	var colLookup = {};
	var colMap = {};
	var rowLookup = {};
  
	var getPartitionColumn = function(row) {
		var partKey = [];
		for(var i = 0;i<startAt;i++) {
			if(partitions.indexOf(columns[i].id) == -1) partKey.push(row[i]);
		}
		partKey = partKey.join("||");
		if(colLookup[partKey]) return colLookup[partKey];
		colLookup[partKey] = [];
		for(var i = 0; i < columns.length;i++) {
			if(columns[i].type=="metric") {
				colLookup[partKey][i] = 0;
			} else if(partitions.indexOf(columns[i].id) > -1) {
				colLookup[partKey][i] = "Total";
			} else {
				if(options.groups.indexOf(columns[i].id) > -1) colLookup[partKey][i] = row[i];
			}
		}
		return colLookup[partKey];
	};
	var getPartitionRow = function(row) {
		var partKey = [];
		for(var i = 0;i<partitions.length;i++) {
			partKey.push(row[colMap[partitions[i]]]);
		}
		partKey = partKey.join("||");
		if(rowLookup[partKey]) return rowLookup[partKey];
		rowLookup[partKey] = [];
		for(var i = 0; i < columns.length;i++) {
			if(columns[i].type=="metric") {
				rowLookup[partKey][i] = 0;
			} else if(partitions.indexOf(columns[i].id) > -1) {
				rowLookup[partKey][i] = row[i];
			} else {
				if(options.groups.indexOf(columns[i].id) > -1) rowLookup[partKey][i] = "Total";
			}
		}
		return rowLookup[partKey];
	};
  
	//TODO partitioning
  
	var startAt = -1;
	for(var i = 0;i < columns.length;i++) {
		colMap[columns[i].id] = i;
		if(columns[i] && columns[i].type == 'metric') {
			if(startAt == -1) startAt = i;
      
		} else if(columns[i]) {
			if(options.groups.indexOf(columns[i].id) == -1) continue;
			total[i] = columns[i].label;
		}
		if(startAt >= 0) total[i] = 0;
	}
	for(var j = 0;j<rows.length;j++) {
		var row = rows[j];
		var partitionRow = getPartitionRow(row);
		var partitionColumn = getPartitionColumn(row);
		for(var i=startAt;i<row.length;i++) {
			if(row[i] === null || row[i] === undefined) continue;
			total[i] += row[i];
			partitionRow[i] += row[i];
			partitionColumn[i] += row[i];
		}
	}
	for(var key in colLookup) {
		colTotal.push(colLookup[key]);
	}
	for(var key in rowLookup) {
		rowTotal.push(rowLookup[key]);
	}
	return {
		colTotal:colTotal,
		rowTotal:rowTotal,
		total:total
	};
}


module.exports = {
	genTotals : genTotals
};

