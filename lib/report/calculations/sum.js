module.exports = function(options) {
  this.fieldWrap(function(prev) {
    return "sum("+prev()+")";
  });
};