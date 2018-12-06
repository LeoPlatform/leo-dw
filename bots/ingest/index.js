"use strict";

exports.handler = require("leo-sdk/wrappers/cron")(async (event, context, callback) => {

	const config = require("leo-config");
	await config.run;

	const leo = require("leo-sdk");
	const ls = leo.streams;
	const load = require("leo-connector-common/datawarehouse/load.js");
	const connections = require("../../lib/connections");
	var dynamodb = leo.aws.dynamodb;

	let primaryClientConfig = connections.getDefault();
	let redshiftClientConfig = connections.getRedshift();

	let client;
	if (primaryClientConfig.type === 'MySql') {
		client = require("leo-connector-mysql/lib/dwconnect.js")(primaryClientConfig);
	} else {
		client = require("leo-connector-postgres/lib/dwconnect.js")(primaryClientConfig);
	}

	let redshiftVersion = redshiftClientConfig.version;
	let primaryVersion = primaryClientConfig.version;
	if (redshiftVersion == primaryVersion) {
		redshiftVersion = redshiftClientConfig.host;
		primaryVersion = primaryClientConfig.host;
	}
	let StackName = config.Resources.StackName || "dw";
	let systemQueue = `system:${StackName}_${primaryVersion}`;

	const FIELDS_TABLE = config.Resources.Fields;
	let cache = null;

	function describeTables(callback) {
		if (cache) {
			callback(null, cache);
		} else {
			client.describeTables(function (err, schema) {
				cache = schema;
				callback(err, schema);
			});
		}
	}

	client.setAuditdate();
	client.setSchemaCache(cache);
	deleteTmpFiles();
	context.callbackWaitsForEmptyEventLoop = false;
	const ID = event.botId;
	let stats = ls.stats(ID, event.source);
	dynamodb.scan(FIELDS_TABLE, {}, function (err, tables) {
		if (err) {
			return callback(err);
		}
		let desiredConfig = {};
		tables.map(table => {
			desiredConfig[table.identifier] = table;
		});
		describeTables((err, schema) => {
			if (err) {
				return callback(err);
			}
			client.changeTableStructure(desiredConfig, (err, results) => {
				if (err) {
					//console.log(err);
					return callback(err);
				}
				if (Object.keys(results).filter(t => results[t] != "Unmodified").length) {
					client.clearSchemaCache();
					cache = null;
				}
				// After table changes, get the new schema
				describeTables((err, schema) => {
					if (err) {
						return callback(err);
					}

					let pipe = [
						leo.read(ID, event.source, {
							start: event.start,
							limit: event.limit || 1000000,
							stopTime: Date.now() + (1000 * (event.seconds || 60))
						}),
						stats
					];

					if (event.code) {
						let fn = eval(`(${event.code})`);
						let cleanup = ls.through(fn);
						pipe.push(cleanup);

					}

					load(client, desiredConfig, ls.pipeline.apply(ls, pipe), err => {
						err && console.log(err);
						//client.disconnect();
						if (!err) {
							let statsData = stats.get();
							stats.checkpoint(() => {
								if (statsData.units > 0) {
									let l = leo.load(ID, systemQueue);
									l.write({
										payload: statsData,
										units: statsData.units,
										started_timestamp: statsData.timestamp,
										timestamp: statsData.timestamp,
										source_timestamp: statsData.source_timestamp,
									});
									l.end(() => {
										callback();
									});
								} else {
									callback();
								}
							});
						} else {
							callback(err);
						}
					});
				});
			}, schema);
		});
	});
});

let fs = require("fs");
let path = require("path");

function deleteTmpFiles() {
	fs.readdirSync(path.resolve("/tmp")).forEach(file => {
		let fullPath = path.resolve("/tmp", file);
		if (file.match(/^leo_dw_/)) {
			console.log("Removing temp file:", file)
			fs.unlinkSync(fullPath)
		}
	});
}