var fs = require("fs");
var async = require("async");

/**
 * Interface
 * nibbler.sync({
 *      onInit: function(nibble) { }, // setup stuff for sync; Async is not allowed
 *      whilst: function(nibble) { return true; }, // return true to continue;  Async is not allowed
 *      onBite: function(nibble, done) { done(); }, // do something with the nibble data
 *      onError: function(err, data, nibble, done) { nibble.limit = nibble.limit / 2; done(); }, // Fix the error by addressing nibble settings or nibble.move() or settings to end
 *      onEnd: function(err, nibble, done) { done(); }
 *
 * }, callback);
 */

module.exports = function (connector, opts) {
	var nibble = {};

	var logTimeout = null;
	//@todo: Update all this to use the log-update node module
	function clearLog() {
		process.stdout.write("\r\x1b[K");
		if (logTimeout) clearInterval(logTimeout);
	}
	var log = function () {
		clearLog();
		var percent = (nibble.progress / nibble.total) * 100;
		var fixed = percent.toFixed(2);

		if (fixed == "100.00" && percent < 100) {
			fixed = "99.99";
		}

		console.log(fixed + "% :", Object.keys(arguments).map(k => arguments[k]).join(", "));
	};

	function timeLog(message) {
		clearLog();
		var time = new Date();

		function writeMessage() {
			process.stdout.write("\r\x1b[K");
			process.stdout.write(((new Date() - time) / 1000).toFixed(1) + "s : " + message);
		}
		writeMessage();
		logTimeout = setInterval(writeMessage, 200);
	}

	function normalLog(message) {
		clearLog();
		console.log(message);
	}

	return {
		log: log,
		timeLog: timeLog,
		normalLog: normalLog,
		sync: function (opts, callback) {
			if (typeof opts == "function") {
				callback = opts;
				opts = {};
			}
			var opts = Object.assign({
				time: 1,
				limit: Math.max(20000, opts.minLimit || 0),
				maxLimit: 1000000,
				sample: false,
				reverse: false,
			}, opts || {});

			connector.range(opts, (err, range) => {
				if (err) {
					callback(err);
					return;
				}

				//Now let's nibble our way through it.
				nibble = {
					start: range.min,
					end: range.max,
					limit: opts.limit,
					next: null,
					max: range.max,
					min: range.min,
					total: range.total,
					progress: 0,
					reverse: opts.reverse,
					hadRecentErrors: 0,
					move: function () {
						if (!this.reverse)
							this.start = this.next;
						else
							this.end = this.next;
					}
				};

				if (opts.onInit) {
					opts.onInit(nibble);
				}

				log(`Starting.  Total: ${nibble.total}`);
				//var hadRecentErrors = 0;
				async.doWhilst((done) => {
					timeLog("Nibbling the next set of Data from Locale");
					connector.nibble(nibble, (err, n) => {
						if (err) {
							callback(err);
							return;
						}
						nibble = n;

						opts.onBite(nibble, (err, result) => {
							if (err) {
								opts.onError(err, result, nibble, done);
								nibble.hadRecentErrors = opts.errorAllowance || 4;
							} else {
								nibble.move();

								//we had no errors this time nor last time, so lets up the limit
								if (nibble.hadRecentErrors) {
									nibble.hadRecentErrors--;
								} else {
									nibble.limit = Math.min(
										nibble.limit * 4,
										opts.maxLimit,
										(result && result.consumption) ? (result.consumption * nibble.limit) : 0
									);
								}
								done(null, result);
							}

						});
					});
				},
				function () {
					return (!nibble.reverse ? nibble.start != null : nibble.end != null) && (!opts.whilst || opts.whilst(nibble));
				},
				function (err, data) {
					if (opts.onEnd) {
						opts.onEnd(err, nibble, function (err2, data) {
							callback(err || err2, data);
						});
					} else {
						callback(err);
					}
				});
			});
		}
	};
};
