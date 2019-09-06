"use strict";

exports.handler = require("leo-sdk/wrappers/cron")(async (event, context, callback) => {
	const config = require("leo-config");
	await config.run;
	const async = require("async");
	const moment = require("moment");
	const leo = require("leo-sdk");
	const dynamodb = leo.aws.dynamodb;
	//const ls = leo.streams;
	//const load = require("leo-connector-common/datawarehouse/load.js");
	const connections = require("../../lib/connections");

	let postgresConnector = require("leo-connector-postgres/lib/dwconnect");
	let mysqlConnector; // = require("leo-connector-mysql/lib/dwconnect");

	let primaryClientConfig = connections.getDefault();
	let primaryClient;
	if (primaryClientConfig.type == "Postgres") {
		primaryClient = postgresConnector(primaryClientConfig);
	} else {
		console.log("Mysql sync not supported yet.");
		process.exit();
		primaryClient = mysqlConnector(primaryClientConfig);
	}
	let redshiftClientConfig = connections.getRedshift();
	let redshiftClient = postgresConnector(redshiftClientConfig);

	const FIELDS_TABLE = config.Resources.Fields;
	let LOADER_ROLE = config.Resources.LoaderRole;
	let StackName = config.Resources.StackName || "dw";

	context.callbackWaitsForEmptyEventLoop = false;
	if (!redshiftClientConfig || !redshiftClientConfig.database || connections.equals(redshiftClientConfig, primaryClientConfig)) {
		return callback();
	}

	let ID = event.botId;
	let startTime = moment.now();
	let runDirectory = `${(moment().format("YYYY/MM/DD/HH/mm/") + moment.now())}`;
	dynamodb.scan(FIELDS_TABLE, {}, function (err, tables) {
		if (err) {
			return callback(err);
		}

		let desiredConfig = {};
		tables.map(table => {
			if (table.sync !== false) {
				desiredConfig[table.identifier] = table;
			}
		});

		// Cache table defs
		primaryClient.describeTables((err, tableStructures) => {
			redshiftClient.describeTables(() => {
				redshiftClient.changeTableStructure(desiredConfig, function (err) {
					if (err) {
						callback(err);
						return;
					}
					let tasks = [];
					Object.keys(desiredConfig).forEach(tableName => {
						tasks.push((done) => {
							let table = desiredConfig[tableName];
							table.nks = [];
							let structure = table.structure;
							Object.keys(structure).map(f => {
								let field = structure[f];
								if (field == "sk" || field.sk) {
									table.sk = f;
								} else if (field.nk) {
									table.nks.push(f);
								}
								return f;
							});
							let fields = tableStructures[tableName].map(f => f.column_name);
							redshiftClient.findAuditDate(tableName, (err, auditdate) => {
								if (err) {
									return done(null, {
										table: tableName,
										error: err
									});
								}

								primaryClient.exportChanges(tableName, fields, auditdate, {
									bucket: leo.configuration.s3,
									file: `files/Leo_dw_sync/${ID}/${runDirectory}`,
									isDimension: table.isDimension
								}, (err, file, count, oldest) => {
									if (err) {
										return done(null, {
											count: count,
											oldest: oldest,
											table: tableName,
											error: err
										});
									}

									if (count > 0) {
										redshiftClient.importChanges(file, table, fields, {
											role: LOADER_ROLE,
											isDimension: table.isDimension
										}, (err) => {
											done(null, {
												count: count,
												oldest: oldest,
												table: tableName,
												error: err
											});
										});
									} else {
										done(null, {
											count: count,
											oldest: oldest,
											table: tableName
										});
									}
								});
							});
						})
					});

					async.parallelLimit(tasks, 4, (err, results) => {
						if (err) {
							console.log(err);
							callback(err);
							return;
						}
						let totalCount = 0;
						let details = {};
						let oldest = null;
						let loadingError = [];
						results.forEach((count) => {
							if (count.error) {
								loadingError.push(count.error);
								details[count.table] = count.error;
								console.log(`${count.table} Error: ${count.error}`);
								return;
							}
							details[count.table] = {
								count: count.count,
								oldest: count.oldest || undefined,
								error: count.error || undefined
							};
							totalCount += count.count;
							if (!oldest) {
								oldest = count.oldest;
							} else if (count.oldest && count.oldest < oldest) {
								oldest = count.oldest;
							}
						});
						console.log("found ", totalCount, " changes- oldest ", oldest);
						console.log(JSON.stringify(details, null, 2));
						if (totalCount > 0) {
							let redshiftVersion = redshiftClientConfig.version;
							let primaryVersion = primaryClientConfig.version;
							if (redshiftVersion == primaryVersion) {
								redshiftVersion = redshiftClientConfig.host;
								primaryVersion = primaryClientConfig.host;
							}
							let load = leo.load(ID, `system:${StackName}_${redshiftVersion}`)
							load.write({
								payload: details,
								started_timestamp: startTime,
								timestamp: moment.now(),
								source_timestamp: moment.utc(oldest).valueOf(),
								units: totalCount,
								correlation_id: {
									source: `system:${StackName}_${primaryVersion}`,
									start: oldest,
									units: totalCount
								}
							})
							load.end(() => {
								callback(loadingError.length > 0 ? loadingError : null, details);
							});
						} else {
							console.log("nothing loaded");
							callback(loadingError.length > 0 ? loadingError : null);
						}

					});
				});
			});
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
