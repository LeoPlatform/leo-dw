var fs = require("fs");
var async = require("async");
var checksum = require("./checksumNibbler.js");
var leoDW = require("./connectors/leodw.js");

function resend(state, newEntries, finalize) {
	var stream = state.stream;
	var r = state.r;
	var perLine = state.perLine || 1000;

	if (newEntries.length) {
		state.r = r = r.concat(newEntries);
	}
	while (r.length >= perLine) {
		stream.write(r.splice(0, perLine).map(f => {
			return '"' + f.toString() + '"';
		}).join(',') + "\n");
	}

	if (finalize) {
		stream.end(r.splice(0, perLine).map(f => {
			return '"' + f.toString() + '"';
		}).join(','), function (err) {
			console.log("file now exists");
		});
	}
}

module.exports = function (configs, done) {
	async.forEachSeries(configs, function (config, callback) {
		if (config.skip) {
			callback();
			return;
		}
		var state = {
			stream: fs.createWriteStream(`/tmp/leo-checksum-resend-${config.filename || config.local.table || config.remote.table}.dat`),
			r: [],
			extra: []
		}
		if (config.on && config.on.init) {
			config.on.init(config);
		}

		config.local.connector(config.local, function (err, local) {
			config.remote.connector(config.remote, function (err, remote) {
				checksum(local, remote).sync(config, function (result, done) {
					resend(state, result.incorrect.concat(result.missing));
					state.extra = state.extra.concat(result.extra);
					if (config.on && config.on.result) {
						config.on.result(result, config, done);
					} else {
						done();
					}
				}, function (err, done) {
					resend(state, [], true);
					local.destroy();
					remote.destroy();
					callback();
				});
			});
		});

	}, function () {
		done();
	});
}