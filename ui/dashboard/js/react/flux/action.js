var util = require("util");
var dispatcher = require("./dispatcher.js");

module.exports = function(action) {
  var my = {};
  
  var that = {};  
  action.call(that, my,dispatcher);
  
  return that;
};