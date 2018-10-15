var dispatcher = require('./dispatcher.js');
var emitter = require("../emitter.js");
var util = require("util");

var version = 0;
module.exports = function(store) {
  var timers = {};
  
  var my = {};
  
  emitter(my);
  

  var that = {};  
  store.call(that, my,dispatcher);
  
  return function() {
    var out = {};
    for(var i in that) {
      out[i] = that[i];
    };
    out.version = version++;
    out.on = my.on.bind(my, "store-"+out.version);
    out.off = my.off.bind(my, "store-"+out.version);
    return out;
  };
};