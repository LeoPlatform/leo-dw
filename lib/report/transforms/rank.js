function simpleRank(derived, mapping, data) {
  var index = mapping[derived.id];
  var length = data.length;
  var dense = derived.options.dense === true;

  var rankArray = [];
  var compareIndex = mapping[derived.order[0].column];
  for (var i = 0; i < length; i++) {
    rankArray.push({
      index : i,
      val : data[i][compareIndex] || 0
    });
  }
  rankArray.sort(function(a, b) {
    if(derived.options.direction == 'asc') {
      return b.val - a.val;
    } else {
      return a.val - b.val;
    }
  });

  var lastRank = {
    current : 0,
    next : 1
  };
  var lastVal = null;
  var rank = null;
  for (i = 0; i < length; i++) {
    rank = rankArray[i];

    if (lastVal == rank.val) {
      data[rank.index][index] = lastRank.current;
      if (!dense) lastRank.next++;
    } else {
      data[rank.index][index] = lastRank.current = lastRank.next++;
      lastVal = rank.val;
    }
  }
  if (!lastVal) {
    derived.onEmpty = lastRank.current;
  } else {
    derived.onEmpty = lastRank.next;
  }

}
function partitionRank(derived, mapping, data) {
  var index = mapping[derived.id];
  var length = data.length;
  var dense = derived.options.dense === true;
  var rankArray = [];
  var lastGroupRank = {};
  var lastGroupVal = {};
  var compareIndex = mapping[derived.order[0].column];
  var groupIndex = mapping[derived.partition[0]];
  for (var i = 0; i < length; i++) {
    var group = data[i][groupIndex];
    rankArray.push({
      index : i,
      val : data[i][compareIndex] || 0,
      group : group
    });
    lastGroupRank[group] = {
      current : 0,
      next : 1
    };
  }
  rankArray.sort(function(a, b) {
    if(derived.options.direction == 'asc') {
      return b.val - a.val;
    } else {
      return a.val - b.val;
    }
  });

  var rank = null;
  for (i = 0; i < length; i++) {
    rank = rankArray[i];

    if (lastGroupVal[rank.group] == rank.val) {
      data[rank.index][index] = lastGroupRank[rank.group].current;
      if (!dense) lastGroupRank[rank.group].next++;
    } else {
      data[rank.index][index] = lastGroupRank[rank.group].current = lastGroupRank[rank.group].next++;
      lastGroupVal[rank.group] = rank.val;
    }
  }
  derived.onEmpty = '';
}

module.exports = {
  parse : function(derived,inclusive) {
    var requiredFields = [ ];
    if(inclusive) requiredFields.push(derived.order[0].column);
    return {
      fields : requiredFields
    };
  },
  transform : function(derived, mapping, data) {
    derived.format = 'int';
    derived.sort = {
      type : 'int'
    };
    if (derived.partition) {
      partitionRank(derived, mapping, data);
    } else {
      simpleRank(derived, mapping, data);
    }
  }
};
