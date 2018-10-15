var sort = require("../format/sort.js");

function simple(derived, mapping, data, columns) {
  var index = mapping[derived.id];
  var fieldIndex = mapping[derived.field];
  var length = data.length;
  var total = 0;
  for (var i = 0; i < length; i++) {
    total += data[i][fieldIndex] || 0;
  }
  var lastVal = 0;
  var prev = 0;
  if (derived.prior || derived.cumulative) {
    var sortIndex = mapping[derived.order[0].column];
    data.sort(sort.getComparator(columns[sortIndex], sortIndex));
  }
  for (i = 0; i < length; i++) {
    var row = data[i];
    var val = row[fieldIndex];
    if (derived.cumulative) {
      val += prev;
    }

    if (derived.prior) {
      if (!prev) {
        row[index] = 0;
      } else {
        row[index] = (val / prev) - 1;
      }
    } else {
      if (total) {
        row[index] = val / total;
      } else {
        row[index] = 0;
      }
    }

    if (derived.inverse) {
      row[index] = 1 - row[index];
    }

    prev = val;
  }
}
function partitioned(derived, mapping, data, columns) {
  var index = mapping[derived.id];
  var fieldIndex = mapping[derived.field];
  var partitionIndex = mapping[derived.partition[0]];

  if (derived.cumulative || derived.prior) {
    var sortIndex = mapping[derived.order[0].column];
    data.sort(sort.getComparator(columns[sortIndex], sortIndex));
  }
  var length = data.length;
  var total = {};
  for (var i = 0; i < length; i++) {
    var group = data[i][partitionIndex];
    if (group in total) {
      total[group] += data[i][fieldIndex] || 0;
    } else {
      total[group] = data[i][fieldIndex] || 0;
    }
  }
  var last = {};
  var prior = {};
  for (i = 0; i < length; i++) {
    var row = data[i];
    var t = total[row[partitionIndex]];
    var p = last[row[partitionIndex]] || 0;
    var val = row[fieldIndex];
    if (derived.cumulative) {
      val += p;
    }
    if (derived.prior) {
      var prevVal = prior[row[partitionIndex]];
      if (!prevVal) {
        row[index] = 0;
      } else {
        row[index] = val / prevVal - 1;
      }
    } else {
      if (!t) {
        row[index] = 0;
      } else {
        row[index] = val / t;
      }
    }

    if (derived.inverse) {
      row[index] = 1 - row[index];
    }
    prior[row[partitionIndex]] = val;
    last[row[partitionIndex]] = val;
  }
}
module.exports = {
  parse : function(derived,inclusive) {
    var requiredFields = [ derived.field ];
    if (derived.order && derived.order.length && derived.order[0].column && inclusive) requiredFields.push(derived.order[0].column)
    if (derived.partition && derived.partition[0]) {
      requiredFields.push(derived.partition[0])
    }
    return {
      fields : requiredFields
    };
  },
  transform : function(derived, mapping, data, columns) {
    derived.format = 'percent';
    if (derived.partition && derived.partition[0]) {
      partitioned(derived, mapping, data, columns);
    } else {
      simple(derived, mapping, data, columns);
    }
    derived.onEmpty = "";
  }
};
