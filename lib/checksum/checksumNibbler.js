var fs = require("fs");
var async = require("async");
var createNibbler = require("../utils/nibbler.js");

module.exports = function (local, remote, opts) {

	var nibbler = createNibbler(local, opts);
	var data = {
		progress: 0,
		totalCorrect: 0,
		totalMissing: 0,
		totalIncorrect: 0,
		totalExtra: 0,
		streak: 0,
	};

	// Add extra param to this sync;
	var sync = nibbler.sync;
	nibbler.sync = function (opts, resultCallback, callback) {

		var update = function (nibble, obj, results) {
			obj.progress += results.qty;
			obj.totalCorrect += results.correct;
			obj.totalMissing += results.missing;
			obj.totalIncorrect += results.incorrect;
			obj.totalExtra += results.extra;

			if (!results.missing && !results.incorrect && !results.extra) {
				obj.streak++;
			} else {
				obj.streak = 0;
			}

			nibble.progress = data.progress;
			nibbler.log(`Correct: ${results.correct}, Incorrect: ${results.incorrect}, Missing: ${results.missing}, Extra: ${results.extra}   ${results.start}-${results.end}`);
		};

		var compare = function (start, end, callback) {
			nibbler.timeLog("Running Local Batch Checksum");
			local.getChecksum({
				start,
				end
			}, function (err, localData) {
				if (err) {
					nibbler.normalLog(err);
					callback(err);
					return;
				}
				nibbler.timeLog("Running Remote Batch Checksum: " + localData.qty + " records");
				remote.getChecksum({
					start,
					end
				}, function (err, remoteData) {
					if (err) {
						nibbler.normalLog(err);
						callback(err);
						return;
					}
					var result = {
						start: start,
						end: end,
						errors: []
					};
					result[local.name] = localData;
					result[remote.name] = remoteData;

					if (localData.qty > remoteData.qty) {
						result.errors.push(remote.name + " has to few");
					}
					if (localData.qty < remoteData.qty) {
						result.errors.push(remote.name + " has to many");
					}

					if (localData && remoteData && localData.hash && remoteData.hash) {
						if (
							localData.hash[0] != remoteData.hash[0] ||
							localData.hash[1] != remoteData.hash[1] ||
							localData.hash[2] != remoteData.hash[2] ||
							localData.hash[3] != remoteData.hash[3]
						) {
							result.errors.push("Hashes do not match");
						}
					} else {
						console.log("Got invalid results back");
						console.log("remoteData: " + JSON.stringify(remoteData, null, 4) + "\n");
						result.errors.push("Got invalid results back");
					}

					result.duration = Math.max(localData.duration, remoteData.duration);
					result.consumption = Math.max(localData.consumption, remoteData.consumption);
					result.qty = localData.qty;

					if (result.errors.length == 0) {
						callback(null, result);
					} else {
						callback(true, result);
					}
				});
			});
		};

		var compareIndividual = function (start, end, callback) {
			// log("running individual", start, end);
			nibbler.timeLog("Running Local Individual Checksum");
			local.getIndividualChecksums({
				start,
				end
			}, function (err, localData) {
				if (err) {
					nibbler.normalLog(err);
					callback(err);
					return;
				}
				nibbler.timeLog("Running Remote Individual Checksum");
				remote.getIndividualChecksums({
					start,
					end,
				}, function (err, remoteData) {
					if (err) {
						nibbler.normalLog(err);
						callback(err);
						return;
					}
					var results = {
						start: start,
						end: end,
						missing: [],
						extra: [],
						incorrect: []
					};

					var localLookup = {};
					var remoteLookup = {};
					localData.checksums.map((o, i) => {
						localLookup[o.id] = i;
					});
					remoteData.checksums.map((o, i) => {
						remoteLookup[o.id] = i;
						if (!(o.id in localLookup)) {
							results.extra.push(o.id);
						}
					});
					localData.checksums.map((o, i) => {
						if (!(o.id in remoteLookup)) {
							results.missing.push(o.id)
						} else if (o.hash != remoteData.checksums[remoteLookup[o.id]].hash) {
							results.incorrect.push(o.id);
						}
					});
					callback(null, results);
				});
			});
		};

		var sample = function (ids, callback) {
			if (local.sample && remote.sample) {
				nibbler.timeLog("Running Local Sample");
				local.sample({
						ids
					},
					function (err, localData) {
						if (err) {
							nibbler.normalLog(err);
							callback(err);
							return;
						}
						nibbler.timeLog("Running Remote Sample");
						remote.sample({
								ids
							},
							function (err, remoteData) {
								if (err) {
									nibbler.normalLog(err);
									callback(err);
									return;
								}
								var diffs = [];
								var paddedLocalName = local.name;
								var paddedRemoteName = remote.name;
								if (paddedRemoteName.length > paddedLocalName.length) {
									paddedLocalName = paddedLocalName + " ".repeat(paddedRemoteName.length - paddedLocalName.length)
								} else if (paddedLocalName.length > paddedRemoteName.length) {
									paddedRemoteName = paddedRemoteName + " ".repeat(paddedLocalName.length - paddedRemoteName.length)
								}
								localData.checksums.forEach((l, i) => {
									var diff = {};
									var r = remoteData.checksums[i];
									l.forEach((v, k) => {
										if (v !== r[k]) {
											diff[k] = {
												[paddedLocalName]: v,
												[paddedRemoteName]: r[k]
											};
										}
									});
									diffs.push({
										id: localData.ids[i],
										diff
									});
								});
								diffs.map(r => {
									nibbler.normalLog(`${r.id}: ${JSON.stringify(r.diff,null,2)}`);
								});
								callback();
							});
					});
			} else {
				callback();
			}

		};

		var nibblerOpts = {
			whilst: function (nibble) {
				return !opts.stopOnStreak || data.streak < opts.stopOnStreak
			},
			onInit: function (nibble) {},
			onEnd: function (err, nibble, callback) {
				console.log(`Summary`);
				console.log(`Correct: ${data.totalCorrect}, Incorrect:${data.totalIncorrect}, Missing:${data.totalMissing}, Extra:${data.totalExtra}`);
				callback();
			},
			onError: function (err, result, nibble, done) {
				if (nibble.limit <= 20000 || result.qty <= 20000) { //It is small enough, we need to do individual checks
					compareIndividual(nibble.start, nibble.end, (err, dataResult) => {
						if (err) {
							console.log(err);
							nibble.move();
							done();
							return;
						}

						//Submit them to be resent
						resultCallback(dataResult, () => {
							//We can now move on, as we have dealt with it
							nibble.move();
							update(nibble, data, {
								start: result.start,
								end: result.end,
								qty: result.qty,
								correct: result.qty - (dataResult.incorrect.length + dataResult.extra.length + dataResult.missing.length),
								incorrect: dataResult.incorrect.length,
								missing: dataResult.missing.length,
								extra: dataResult.extra.length
							});

							if (opts.sample && dataResult.incorrect.length) {
								sample(dataResult.incorrect.slice(0).sort(() => {
									return 0.5 - Math.random()
								}).slice(0, 4), () => {
									done();
								});
							} else {
								done();
							}
						});

					});
				} else {
					nibble.limit = Math.max(20000, Math.round(nibble.limit / 4));
					if (nibble.limit < 35000) {
						nibble.limit = 20000;
					}
					done();
				}
			},
			onBite: function (nibble, done) {
				compare(nibble.start, nibble.end, (err, result) => {
					if (err) {
						// nibbler.log("FAILED: ", nibble.start, nibble.end, err, JSON.stringify(result,null,2));
						done(err, result);
					} else { //No problem, we want to move on to the next bucket
						update(nibble, data, {
							start: result.start,
							end: result.end,
							qty: result.qty,
							correct: result.qty,
							incorrect: 0,
							missing: 0,
							extra: 0
						});

						done(null, result);
					}
				});
			}
		};

		Object.assign(opts, nibblerOpts);

		return sync(opts, callback);
	}

	return nibbler;
};
