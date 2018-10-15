var fs = require("fs");
var async = require("async");

var checksum = module.exports = function (local, remote, opts) {
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
	}

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

	var diff = function (a, b) {
		var allKeys = Object.keys(a).concat(Object.keys(b));
		//for()
	}
	return {
		compare: function (start, end, callback) {
			timeLog(`Running Local Batch Checksum on ${nibble.limit}`);
			local.getChecksum({
				start,
				end
			}, function (err, localData) {
				if (err) {
					callback(err);
					return;
				}
				timeLog(`Running Remote Batch Checksum on ${nibble.limit}`);
				remote.getChecksum({
					start,
					end
				}, function (err, remoteData) {
					if (err) {
						callback(err);
						return;
					}
					var result = {
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
					if (
						localData.hash[0] != remoteData.hash[0] ||
						localData.hash[1] != remoteData.hash[1] ||
						localData.hash[2] != remoteData.hash[2] ||
						localData.hash[3] != remoteData.hash[3]
					) {
						result.errors.push("Hashes do not match");
					}

					result.duration = Math.max(localData.duration, remoteData.duration);
					result.qty = localData.qty;

					if (result.errors.length == 0) {
						callback(null, result);
					} else {
						callback(true, result);
					}
				});
			});

		},
		compareIndividual: function (start, end, callback) {
			// log("running individual", start, end);
			timeLog("Running Local Individual Checksum");
			local.getIndividualChecksums({
				start,
				end
			}, function (err, localData) {
				if (err) {
					callback(err);
					return;
				}
				timeLog("Running Remote Individual Checksum");
				remote.getIndividualChecksums({
					start,
					end,
				}, function (err, remoteData) {
					if (err) {
						callback(err);
						return;
					}
					var results = {
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
		},
		sample: function (ids, callback) {
			if (local.sample && remote.sample) {
				timeLog("Running Local Sample");
				local.sample({
						ids
					},
					function (err, localData) {
						if (err) {
							callback(err);
							return;
						}
						timeLog("Running Remote Sample");
						remote.sample({
								ids
							},
							function (err, remoteData) {
								if (err) {
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
									normalLog(`${r.id}: ${JSON.stringify(r.diff,null,2)}`);
								});
								callback();
							});
					});
			} else {
				callback();
			}

		},
		sync: function (opts, resultCallback, callback) {
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
			local.range(opts, (err, range) => {
				if (err) {
					callback(err);
					return;
				}

				//Let's do book ends first, this is important, specifically the end one as we don't want a lot of false positives from new entries being added to the table
				// this.compare(range.max, null, function (err, data) {
				//      console.log(err, data);
				// });
				// this.compare(null, range.min, function (err, data) {
				//      console.log(err, data);
				// });

				//Now let's nibble our way through it.
				nibble = {
					start: range.min,
					end: range.max,
					limit: opts.limit,
					next: null,
					max: range.max,
					min: range.min,
					progress: 0,
					total: range.total,
					totalCorrect: 0,
					totalMissing: 0,
					totalIncorrect: 0,
					totalExtra: 0,
					streak: 0,
					reverse: opts.reverse,
					move: function (results) {
						this.progress += results.qty;
						this.totalCorrect += results.correct;
						this.totalMissing += results.missing;
						this.totalIncorrect += results.incorrect;
						this.totalExtra += results.extra;

						if (!results.missing && !results.incorrect && !results.extra) {
							this.streak++;
						} else {
							this.streak = 0;
						}

						log(`Correct: ${results.correct}, Incorrect: ${results.incorrect}, Missing: ${results.missing}, Extra: ${results.extra}   ${this.start}-${this.end} `);

						if (!this.reverse)
							this.start = this.next;
						else
							this.end = this.next;
					}
				};
				log(`Starting.  Total: ${nibble.total}`);
				var hadRecentErrors = 0;
				async.doWhilst((done) => {
						timeLog("Nibbling the next set of Data from Locale");
						local.nibble(nibble, (err, n) => {
							if (err) {
								callback(err);
								return;
							}
							nibble = n;
							this.compare(nibble.start, nibble.end, (err, result) => {
								//log(err, result, nibble);
								if (err) {
									if (nibble.limit <= 20000 || result.qty < 20000) { //It is small enough, we need to do individual checks
										this.compareIndividual(nibble.start, nibble.end, (err, dataResult) => {

											//Submit them to be resent
											resultCallback(dataResult, () => {
												//We can now move on, as we have dealt with it
												nibble.move({
													qty: result.qty,
													correct: result.qty - (dataResult.incorrect.length + dataResult.extra.length + dataResult.missing.length),
													incorrect: dataResult.incorrect.length,
													missing: dataResult.missing.length,
													extra: dataResult.extra.length
												});
												if (opts.sample && dataResult.incorrect.length) {
													this.sample(dataResult.incorrect.slice(0).sort(() => {
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
										nibble.limit = Math.max(20000, Math.round(nibble.limit / 3));
										if (nibble.limit < 35000) {
											nibble.limit = 20000;
										}
										done();
									}
									hadRecentErrors = opts.errorAllowance || 1;
								} else { //No problem, we want to move on to the next bucket
									nibble.move({
										qty: result.qty,
										correct: result.qty,
										incorrect: 0,
										missing: 0,
										extra: 0
									});

									//we had no errors this time nor last time, so lets up the limit
									if (hadRecentErrors) {
										hadRecentErrors--;
									} else {
										nibble.limit = Math.min(
											opts.maxLimit,
											nibble.total - nibble.progress,
											Math.round((1000 / Math.max(result.duration)) * nibble.limit)
										);
									}
									done();
								}
							});
						});
					},
					function () {
						return (!nibble.reverse ? nibble.start != null : nibble.end != null) && (!opts.stopOnStreak || nibble.streak < opts.stopOnStreak);
					},
					function (err, data) {
						console.log(`Summary`);
						console.log(`Correct: ${nibble.totalCorrect}, Incorrect:${nibble.totalIncorrect}, Missing:${nibble.totalMissing}, Extra:${nibble.totalExtra}`);
						callback(err);
					});
			});
		}
	};
};