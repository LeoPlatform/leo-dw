"use strict";
var aurora = require("../report/mysql.js");
var redshift = require("../report/redshift.js");

var dynamodb = require("@leo-sdk/core/lib/dynamodb");
var config = require("@leo-sdk/core/leoConfigure.js");
var moment = require("moment");
var async = require("async");

module.exports = function (tableData, opts, callback) {
	if (typeof opts == "function") {
		callback = opts;
		opts = {};
	}

	opts = Object.assign({
		concurrency: 4,
		defaultAuditDate: undefined,
		useAuditDate: true
	}, opts);

	let role = config.redshift.loaderRole;
	let timestamp = moment();
	let time = timestamp.format("YYYY/MM/DD/HH/mm/" + timestamp.valueOf());

	let startTime = moment();
	let tableNames = Object.keys(tableData).filter(k => !tableData[k].skip);
	redshift.getFields(tableNames, (err, tables) => {
		if (err) {
			console.log(err);
			return callback();
		}
		Object.keys(tables).map(k => {
			tables[k].identifier = k;
		});

		aurora.checkTables(tables, (err, auroraData) => {
			if (err) {
				console.log(err);
				return callback(err);
			}
			async.eachLimit(Object.keys(tables), opts.concurrency, (key, done) => {
				let table = tables[key];
				let now = timestamp;
				let lastKey = `${table.identifier}_last_dw_aurora`;
				dynamodb.get("Leo_setting", lastKey, (err, lastSyncTime) => {
					if (err) {
						return done(err);
					}
					lastSyncTime = moment.utc(opts.lastSyncTime || (lastSyncTime && lastSyncTime.value) || opts.defaultAuditDate).subtract({
						minutes: 5
					}).format();
					let conditional = tableData[key].where ? ("and " + tableData[key].where) : "";
					let where = (!!table.fields._auditdate && opts.useAuditDate) ? `where _auditdate >= \\'${lastSyncTime}\\' and _auditdate is not null ${conditional}` : (conditional ? `where ${conditional}` : "");
					let tableName = aurora.escapeId(table.identifier);
					let fileBase = `s3://${config.bus.s3}/files/dsco_redshift/${table.identifier}/${time}_`;
					let query = `UNLOAD ('select * from ${redshift.escape.escapeId(table.identifier)} ${where}') to '${fileBase}' MANIFEST ESCAPE iam_role '${role}';`;

					let st = moment.now();
					redshift.query(query, (err, data) => {
						if (err) {
							console.log(err, data);
							return done(err);
						}

						aurora.query(`LOAD DATA FROM S3 MANIFEST '${fileBase}manifest' REPLACE INTO TABLE ${tableName} FIELDS TERMINATED BY '|' LINES TERMINATED BY '\n' (${table.fieldPositions.map(i=>aurora.escapeId(i))})`, (err, data) => {
							console.log("Done with table", key, moment.duration(moment.now() - st).toString(), err || "");
							if (err) {
								return done(err);
							}
							dynamodb.put("Leo_setting", lastKey, {
								value: now.valueOf()
							}, (err) => {
								done();
							});
						});
					});

				});
			}, (err) => {
				let endTime = moment();
				let d = moment.duration(endTime - startTime);
				console.log("Done with all tables", d.toString(), err || "");
				redshift.pool.end();
				callback(err);
			});

		});
	});
};

// var allTableNames = [
// 	"d_account",
// 	"d_date",
// 	"d_destination",
// 	"d_invoice",
// 	"d_item",
// 	"d_itemupdatedetails",
// 	"d_job",
// 	"d_job_lookup",
// 	"d_order",
// 	"d_order_item",
// 	"d_origination",
// 	"d_process",
// 	"d_product",
// 	"d_report_card_rank",
// 	"d_service",
// 	"d_shipment",
// 	"d_supplier",
// 	"d_time",
// 	"d_trading_partner",
// 	"d_ts",
// 	"d_user",
// 	"d_user_lookup",
// 	"f_account",
// 	"f_invoice",
// 	"f_invoice_item",
// 	"f_item",
// 	"f_item_updates",
// 	"f_order",
// 	"f_order_item",
// 	"f_product",
// 	"f_report_card",
// 	"f_shipment",
// 	"f_trading_partners"
// ];

// let tableNames = ["d_account", "f_account", "d_order", "f_order", "d_date", "d_time", "d_item", "d_order_item", "f_item", "f_order_item", "f_invoice", "f_invoice_item", "d_invoice", "f_item_updates", "f_product", "f_report_card", "f_shipment", "f_trading_partners",
// 	"d_report_card_rank", "d_shipment", "d_trading_partner", "d_product", "d_supplier", "d_ts"
// ];

// let allFinished = false;
// let q = async.queue((task, callback) => {
// 	aurora.query(task.query, (err, data) => {
// 		console.log("Done with table", task.key, moment.duration(moment.now() - task.st).toString(), err || "");
// 		done(err);
// 	});
// }, 4);
// q.drain = function () {
// 	if (allFinished) {
// 		let endTime = moment();
// 		let d = moment.duration(endTime - startTime);
// 		console.log("Done with all tables", d.toString(), err || "");
// 		redshift.pool.end();
// 	}
// }

// async.eachLimit(Object.keys(tables), 5, (key, done) => {
// 	let table = tables[key];
// 	let where = tableData[key].where || "";
// 	let tableName = aurora.escapeId(table.identifier);
// 	let fileBase = `s3://${leo.configuration.bus.s3}/files/dsco_redshift/${table.identifier}/${time}_`;
// 	let query = `UNLOAD ('select * from ${redshift.escape.escapeId(table.identifier)} ${where}') to '${fileBase}' MANIFEST ESCAPE iam_role '${role}';`

// 	let st = moment.now();
// 	redshift.query(query, (err, data) => {
// 		if (err) {
// 			console.log(err, data);
// 			return done(err);
// 		}
// 		q.push({
// 			query: `LOAD DATA FROM S3 MANIFEST '${fileBase}manifest' REPLACE INTO TABLE ${tableName} FIELDS TERMINATED BY '|' LINES TERMINATED BY '\n' (${auroraData[table.identifier].fieldPositions.map(i=>aurora.escapeId(i))})`,
// 			key: key,
// 			st: st
// 		});
// 	});

// }, (err) => {
// 	allFinished = true;
// });
