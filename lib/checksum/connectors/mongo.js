var MongoDb = require('mongodb');
var MongoClient = MongoDb.MongoClient;
var ObjectID = MongoDb.ObjectId;
var crypto = require('crypto');
var moment = require('moment');

module.exports = function (database, collectionName, options, callback) {
	// New Interface is options and callback
	if (arguments.length >= 2 && typeof (arguments[1]) === "function") {
		options = arguments[0];
		callback = arguments[1];
		database = options.database;
		collectionName = options.collectionName || options.table;
	}

	MongoClient.connect(database, function (err, db) {
		if (err) {
			console.log(err);
			process.exit(1);
		}
		var dbCollection = db.collection(collectionName);

		callback(null, {
			name: "MongoDB",
			destroy: function () {
				db.close();
			},
			getChecksum: function (opts, callback) {
				var startTime = moment.now();

				var checksum = {
					qty: 0,
					start: opts.start,
					end: opts.end,
					hash: [0, 0, 0, 0]
				};
				var where = {};
				if (opts.start || opts.end) {
					where[options.sortField] = {};

					if (opts.start) {
						where[options.sortField].$gte = opts.start;
					}
					if (opts.end) {
						where[options.sortField].$lte = opts.end;
					}
				}

				var cursor = dbCollection.find(where, options.projectionFields || {}, {
					'sort': [
						[options.sortField, 1]
					]
				}).stream();
				cursor.on("end", function () {
					// console.log("---------------Local Checksums DONE------------------");

					checksum.duration = moment.now() - startTime;
					checksum.consumption = Math.round((1000 / Math.max(checksum.duration)));

					callback(null, checksum);
				}).on("err", function (err) {
					// console.log("---------------ERROR------------------");
					console.log("error");
					throw err;
				}).on("data", function (obj) {
					var value;
					var allFields = "";
					if (options.preprocess) {
						obj = options.preprocess(obj);
					}
					if (typeof options.fields === "function") {
						options.fields(obj).forEach(value => {
							if (value instanceof Date) {
								allFields += crypto.createHash('md5').update(Math.round(value.getTime() / 1000).toString()).digest('hex');
							} else if (value !== null && value !== undefined && value.toString) {
								allFields += crypto.createHash('md5').update(value.toString()).digest('hex');
							} else {
								allFields += " ";
							}
						});
					} else {
						options.fields.forEach((f) => {
							if (typeof f == "function") {
								value = f(obj);
							} else {
								value = obj[f];
							}
							if (value instanceof Date) {
								allFields += crypto.createHash('md5').update(Math.round(value.getTime() / 1000).toString()).digest('hex');
							} else if (value !== null && value !== undefined && value.toString) {
								allFields += crypto.createHash('md5').update(value.toString()).digest('hex');
							} else {
								allFields += " ";
							}
						});
					}
					var hash = crypto.createHash('md5').update(allFields).digest();

					checksum.hash[0] += hash.readUInt32BE(0);
					checksum.hash[1] += hash.readUInt32BE(4);
					checksum.hash[2] += hash.readUInt32BE(8);
					checksum.hash[3] += hash.readUInt32BE(12);
					checksum.qty += 1;
				});
			},
			getIndividualChecksums: function (opts, callback) {
				var data = {
					qty: 0,
					start: opts.start,
					end: opts.end,
					checksums: []
				};
				var where = {
					[options.sortField]: {
						$gte: opts.start,
						$lte: opts.end
					}
				};
				var cursor = dbCollection.find(where, options.projectionFields || {}, {
					'sort': [
						[options.sortField, 1]
					]
				}).stream();
				cursor.on("end", function () {
					// console.log("---------------DONE------------------");
					callback(null, data);
				}).on("err", function (err) {
					// console.log("---------------ERROR------------------");
					console.log("error");
					throw err;
				}).on("data", function (obj) {
					var value;
					var allFields = "";

					if (options.preprocess) {
						obj = options.preprocess(obj);
					}
					if (typeof options.fields === "function") {
						options.fields(obj).forEach(value => {
							if (value instanceof Date) {
								allFields += crypto.createHash('md5').update(Math.round(value.getTime() / 1000).toString()).digest('hex');
							} else if (value !== null && value !== undefined && value.toString) {
								allFields += crypto.createHash('md5').update(value.toString()).digest('hex');
							} else {
								allFields += " ";
							}
						});
					} else {
						options.fields.forEach((f) => {
							if (typeof f == "function") {
								value = f(obj);
							} else {
								value = obj[f];
							}
							if (value instanceof Date) {
								allFields += crypto.createHash('md5').update(Math.round(value.getTime() / 1000).toString()).digest('hex');
							} else if (value !== null && value !== undefined && value.toString) {
								allFields += crypto.createHash('md5').update(value.toString()).digest('hex');
							} else {
								allFields += " ";
							}
						});
					}
					var hash = crypto.createHash('md5').update(allFields).digest('hex');
					data.checksums.push({
						id: obj[options.sortField],
						hash: hash
					});
					data.qty += 1;
				});
			},
			sample: function (opts, callback) {
				var data = {
					qty: 0,
					ids: [],
					start: opts.start,
					end: opts.end,
					checksums: []
				};

				var where = {};

				if (opts.ids) {
					if (options.sortField == "_id") {
						where = {
							[options.sortField]: {
								$in: opts.ids.map(f => new ObjectID(f))
							}
						};
					} else {
						where = {
							[options.sortField]: {
								$in: opts.ids
							}
						};
					}
				} else {
					where = {
						[options.sortField]: {
							$gte: opts.start,
							$lte: opts.end
						}
					};
				}
				var cursor = dbCollection.find(where, {}, {
					'sort': [
						[options.sortField, 1]
					]
				}).stream();
				cursor.on("end", function () {
					callback(null, data);
				}).on("err", function (err) {
					console.log("error");
					throw err;
				}).on("data", function (obj) {
					var out = [];

					if (options.preprocess) {
						obj = options.preprocess(obj);
					}
					if (typeof options.fields === "function") {
						options.fields(obj).forEach(value => {
							if (value instanceof Date) {
								out.push(Math.round(value.getTime() / 1000) + "  " + moment(value).utc().format());
							} else if (value && typeof value == "object" && value.toHexString) {
								out.push(value.toString());
							} else {
								out.push(value);
							}
						});
					} else {
						options.fields.forEach((f) => {
							if (typeof f == "function") {
								out.push(f(obj));
							} else {
								value = obj[f];
								if (value instanceof Date) {
									out.push(Math.round(value.getTime() / 1000) + "  " + moment(value).utc().format());
								} else if (value && typeof value == "object" && value.toHexString) {
									out.push(obj[f].toString());
								} else {
									out.push(obj[f]);
								}
							}
						});
					}
					data.ids.push(obj[options.sortField]);
					data.checksums.push(out);
					data.qty += 1;
				});
			},
			range: function (opts, callback) {
				var max = {};
				var min = {};
				var total = {};

				if (opts.start || opts.end) {
					total[options.sortField] = {};
				}
				if (opts.start) {
					min[options.sortField] = {
						$gte: options.sortField == "_id" ? new ObjectID(opts.start) : opts.start
					};
					total[options.sortField].$gte = options.sortField == "_id" ? new ObjectID(opts.start) : opts.start;
				}
				if (opts.end) {
					max[options.sortField] = {
						$lte: options.sortField == "_id" ? new ObjectID(opts.end) : opts.end
					};
					total[options.sortField].$lte = options.sortField == "_id" ? new ObjectID(opts.end) : opts.end;
				}
				dbCollection.findOne(min, {
					[options.sortField]: 1
				}, {
					'sort': [
						[options.sortField, 1]
					],
					"limit": 1
				}, (err, start) => {
					dbCollection.findOne(max, {
						[options.sortField]: 1
					}, {
						'sort': [
							[options.sortField, -1]
						],
						"limit": 1
					}, (err, end) => {
						dbCollection.count(total, (err, total) => {
							callback(null, {
								min: start[options.sortField],
								max: end[options.sortField],
								total: total
							});
						});
					});
				});
			},
			nibble: function (nibble, callback) {

				var forward = !nibble.reverse;

				var where = {
					[options.sortField]: {
						$gte: forward ? nibble.start : nibble.min,
						$lte: forward ? nibble.max : nibble.end
					}
				};
				dbCollection.find(where, {
					[options.sortField]: 1
				}, {
					'sort': [
						[options.sortField, forward ? 1 : -1]
					],
					"limit": 2,
					"skip": nibble.limit - 1
				}).toArray(function (err, rows) {

					if (forward) {
						nibble.end = rows[0] ? rows[0][options.sortField] : nibble.max;
						nibble.next = rows[1] ? rows[1][options.sortField] : null;
					} else {
						nibble.start = rows[0] ? rows[0][options.sortField] : nibble.min;
						nibble.next = rows[1] ? rows[1][options.sortField] : null;
					}

					callback(null, nibble);
				});
			}
		});
	});
};