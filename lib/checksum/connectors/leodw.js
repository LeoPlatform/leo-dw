var httpsObj = require("https");
var httpObj = require("http");

module.exports = function (opts, callback) {
	var https = opts.useHttp ? httpObj : httpsObj;
	callback(null, {
		name: "LeoDW",
		destroy: function () {},
		getChecksum: function (checksum, callback) {
			checksum.table = opts.table;
			checksum.id_column = opts.sortField;
			checksum.fields = opts.fields;
			if (opts.idMap) {
				checksum.start = opts.idMap(checksum.start);
				checksum.end = opts.idMap(checksum.end);
			}
			if (opts.where) {
				checksum.where = opts.where;
			}

			var req = https.request({
				hostname: opts.hostname,
				port: opts.port,
				path: (opts.prefix || "/dw") + '/api/checksum/batch',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				}
			}, function (res) {
				res.setEncoding('utf8');
				var data = '';
				res.on('data', function (chunk) {
					data += chunk;
				});
				res.on('end', function () {
					try {
						var results = JSON.parse(data);
					} catch (e) {
						var results = {
							errorMessage: data
						}
					}
					if (results.errorMessage) {
						callback(new Error(results.errorMessage));
					} else {
						results.consumption = Math.round((10000 / Math.max(results.duration)));
						callback(null, results);
					}
				})
			});
			req.on('error', function (e) {
				console.log('problem with request: ' + e.message);
				callback(e);
			});
			// write data to request body
			req.write(JSON.stringify(checksum));
			req.end();
		},
		sample: function (checksum, callback) {
			if (opts.idMap) {
				checksum.ids = checksum.ids.map(opts.idMap);
			}
			if (opts.where) {
				checksum.where = opts.where;
			}
			var req = https.request({
				hostname: opts.hostname,
				port: opts.port,
				path: (opts.prefix || "/dw") + '/api/checksum/sample',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				}
			}, function (res) {
				res.setEncoding('utf8');
				var data = '';
				res.on('data', function (chunk) {
					data += chunk;
				});
				res.on('end', function () {
					var results = JSON.parse(data);
					callback(null, results);
				})
			});
			req.on('error', function (e) {
				console.log('problem with request: ' + e.message);
				callback(e);
			});
			// write data to request body
			req.write(JSON.stringify({
				ids: checksum.ids,
				start: checksum.start,
				end: checksum.end,
				table: opts.table,
				id_column: opts.sortField,
				fields: opts.fields,
				where: checksum.where
			}));
			req.end();
		},
		getIndividualChecksums: function (checksums, callback) {
			checksums.table = opts.table;
			checksums.id_column = opts.sortField;
			checksums.fields = opts.fields;
			if (opts.where) {
				checksums.where = opts.where;
			}
			if (opts.idMap) {
				checksums.start = opts.idMap(checksums.start);
				checksums.end = opts.idMap(checksums.end);
			}

			var req = https.request({
				hostname: opts.hostname,
				port: opts.port,
				path: (opts.prefix || "/dw") + '/api/checksum/individual',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				}
			}, function (res) {
				res.setEncoding('utf8');
				var data = '';
				res.on('data', function (chunk) {
					data += chunk;
				});
				res.on('end', function () {
					try {
						var results = JSON.parse(data);
					} catch (e) {
						var results = {
							errorMessage: data
						}
					}
					if (results.errorMessage || results.message) {
						callback(new Error(results.errorMessage));
					} else {
						callback(null, results);
					}
				})
			});
			req.on('error', function (e) {
				console.log('problem with request: ' + e.message);
				callback(e);
			});
			// write data to request body
			req.write(JSON.stringify(checksums));
			req.end();
		}
	});
}