var EventEmitter = require('events').EventEmitter;
var util = require("util");
var moment = require("moment");

module.exports = function(my) {
	var emitter = new EventEmitter();
	var watchers = {};
	var watchCount = {};
	if(!my.onWatch) {
		my.onWatch = {};
	}
	my.on = function(caller, obj, ...args) {
		if(args.length > 0) {
			var e = obj;
			obj = {};
			obj[e] = args[0];
		} 
    
		for(var e in obj) {
			watchCount[e] = watchCount[e]+1||1;
			emitter.on(e, obj[e]);
			if(watchCount[e] === 1) {
				if((e in my.onWatch) && my.onWatch[e].watch) {
					my.onWatch[e].watch(e);
				}
				if('*' in my.onWatch && my.onWatch['*'].watch) {
					my.onWatch['*'].watch(e);
				}
			}
			if(!(caller in watchers)) {
				watchers[caller] = [];
			}
			watchers[caller].push({e: e, func: obj[e]});
      
		}
	};
	my.off = function(caller) {
		var methods = watchers[caller];
		if(methods) {
			for(var i = 0; i < methods.length; i++) {
				removeListener(methods[i].e, methods[i].func);
			}
		}
		watchers[caller] = [];
	};
	function removeListener(e,func) {
		watchCount[e] = watchCount[e]-1;
		if(watchCount[e] === 0) {
			if((e in my.onWatch) && my.onWatch[e].unwatch) { 
				my.onWatch[e].unwatch(e);
			}
			if('*' in my.onWatch && my.onWatch['*'].unwatch) {
				my.onWatch['*'].unwatch(e);
			}
		}
		emitter.removeListener(e,func);
	}
  
	my.removeListener = removeListener;
  
	my.emit = function(...args) {
		emitter.emit(...args);
	};
  
  
  
	var repeaters = {};
	var repeaterId=0;
	my.createRepeater = function(time, repeatFunction, stopFunction, params) {
		var id = repeaterId++;
		repeaters[id] = {
			interval: moment.duration(time).as('milliseconds'),
			timeout: null,
			func: repeatFunction,
			stop: stopFunction,
			params: params
		};
		return {
			start: function() {
				my.repeat(id);
				return this;
			},
			stop: function() {
				if(repeaters[id]) {
					if(repeaters[id].timeout) {
						clearTimeout(repeaters[id].timeout);
					}
					if(repeaters[id].stop) {
						repeaters[id].stop();
					}
					delete(repeaters[id]);
				}
				return this;
			}
		};
	};
 
	my.repeat = function (id) {
		var repeater = repeaters[id];
		if(repeater) {
			clearTimeout(repeater.timeout);// If it is already schedule to run, we don't want it to anymore as we are going to run it now
			repeater.func(function() {
				repeater.timeout = setTimeout(function() {
					my.repeat(id);
				}, repeater.interval);
			});
		}
	};
	my.onWatched = function (event, watch, unwatch) {
		my.onWatch[event] = {
			watch:  watch,
			unwatch: unwatch
		};
	};
	my.onWatchedTimer = function (event, time, repeatFunction, cleanupFunction) {
		var repeater = my.createRepeater(time, repeatFunction, cleanupFunction, {e: event});
		my.onWatch[event] = {
			watch:  (e) => {
				repeater.start();
			},
			unwatch: (e) => {
				repeater.stop();
			}
		};
	};
};
