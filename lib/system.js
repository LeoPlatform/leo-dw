var Q = require("q");
var util = require("util");
var crypto = require('crypto');
var temp = require('temp');
var fs = require('fs');
var async = require('async');
var config = require("../config.json");
var uuid = require('uuid');
var inspect = require('util').inspect;
var apikeys = {};
var istream; // passed into the configure function
var dynamo = require("./utils/dynamodb.js");
var solr = require("./solr.js");
var moment = require('moment');

var mysql = require('mysql');
var calculations = require("./report/calculations.js");

var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var dwcollection, latestcollection, triggerCollection, counterCollection, errCollection;

var epochDate = new Date(1400, 0, 1, 0, 0, 0, 0);
var epochDateTime = epochDate.getTime();
var oneDayInverse = 1 / (24 * 60 * 60 * 1000);

// Single object that can be reused anywhere that doesn't need to be remembered.
var reusableDate = new Date(1400, 0, 1, 0, 0, 0, 0);

// Dimensions Surrogate offset for smart tables, such as date and time
var dimensionSurrogateOffset = 10000;

var pool = mysql.createPool({
	connectionLimit: 10,
	host: config.mysql,
	user: config.mysql_user,
	password: config.mysql_pass,
	database: 'auth'
});
var api_keys = {};

if (typeof String.prototype.startsWith != 'function') {
	// see below for better implementation!
	String.prototype.startsWith = function (str) {
		return this.indexOf(str) === 0;
	};
}

function humanize(str) {
	var frags = str.split('_');
	if (frags[0] == "dd") {
		frags.shift();
	}
	for (var i = 0; i < frags.length; i++) {
		frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1);
	}
	return frags.join(' ');
}

function toTitleCase(str) {
	return str.replace(/\w\S*/g, function (txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	});
}

function configure(db, callback, remote_istream) {
	latestcollection = db.collection('entities', {
		w: 1
	});
	dwcollection = db.collection('dw', {
		w: 1
	});
	counterCollection = db.collection('counters', {
		w: 1
	});
	errCollection = db.collection('errors', {
		w: 1
	});
	callback();
}

function startup(callback) {
	MongoClient.connect('mongodb://' + config.mongodb + ':27017/events', function (err, db) {
		if (err) throw err;
		latestcollection = db.collection('entities');
		dwcollection = db.collection('dw');
		counterCollection = db.collection('counters');
		errCollection = db.collection('errors');
		latestcollection.drop(function () {
			dwcollection.drop(function () {
				counterCollection.drop(function () {
					errCollection.drop(function () {
						dwcollection.ensureIndex({
							type: 1,
							id: 1
						}, function () {});
						callback();
					});
				});
			});
		});
	});
}

function clearSingle(cid, callback) {
	MongoClient.connect('mongodb://' + config.mongodb + ':27017/events', function (err, db) {
		if (err) throw err;
		latestcollection = db.collection('entities');
		dwcollection = db.collection('dw');
		counterCollection = db.collection('counters');
		latestcollection.remove({
			'customer': cid
		}, function (err, result) {
			if (err) throw err;
			dwcollection.remove({
				'customer': cid
			}, function (err, result) {
				if (err) throw err;
				counterCollection.remove({
					'_id': String(cid) + 'dimids'
				}, function (err, result) {
					callback();
				});
			});
		});
	});
}

function getId(customer, type, entity, id) {
	if (id && id['$func']) {
		id = id.value;
	}
	return String(customer) + "-" + (type == 'fact' ? 'f_' : 'd_') + entity.split(":", 2)[0].replace(/ /g, "_").toLowerCase() + (id !== undefined ? ("-" + id) : '');
}

function getIdAliased(customer, type, entity, id) {
	if (id && id['$func']) {
		id = id.value;
	}
	return String(customer) + "-" + (type == 'fact' ? 'f_' : 'd_') + entity.split(":", 2).pop().replace(/ /g, "_").toLowerCase() + (id !== undefined ? ("-" + id) : '');
}

function parseTableName(tablename, do_full) {
	if (typeof tablename == 'undefined') return "";
	if (do_full) return tablename.replace(/^[0-9]+-([df]_)?/, '');
	return tablename.replace(/^[0-9]+-/, '');
}

function getTables(tablelist, fieldGroups, callback, can_create) {
	var tableNames = Object.keys(tablelist);
	var customerid = 1;
	var tables = {};
	var dbs = [];
	var fields = {};
	var hasDw = false;

	var bulkdw = dwcollection.initializeUnorderedBulkOp();

	// Need to load up the existing fields
	// TODO: Table names here need to include the database
	dwcollection.find({
		table: {
			$in: tableNames
		}
	}).toArray(
		function (err, docs) {
			docs.forEach(function (doc) {
				if (doc.type == "fact" || doc.type == "dimension") {
					tables[doc._id] = doc;
				} else {
					if (!(doc.table in fields)) {
						fields[doc.table] = {};
					}
					fields[doc.table][doc.id] = doc;
				}
			});

			for (var i = 0; i < tableNames.length; i++) {
				var tablename = tableNames[i];
				var isDimension = parseTableName(tablename).charAt(0) === 'd';
				var isFact = !isDimension;
				var table = null;
				if (tables[tablename] === undefined) {
					if (dbs.indexOf(tablelist[tablename].db) == -1 && can_create) {
						dbs.push(tablelist[tablename].db);
						istream.put({
							d: "",
							a: "ad",
							sql: "CREATE DATABASE IF NOT EXISTS " + mysql.escapeId(tablelist[tablename].db) + " CHARACTER SET utf8 COLLATE utf8_general_ci;"
						});
					}
					fields[tablename] = {};
					table = {
						_id: tablename,
						customer: tablelist[tablename].cid,
						table: tablename.split(':')[0], // globally unique table name (table name with customer id prefix added, the actual table in the database won't have the prefix)
						ltable: parseTableName(tablename.split(':')[0]),
						label: tablelist[tablename].name.toLowerCase().replace(/(^| )(\w)/g, function (x) {
							return x.toUpperCase();
						}),
						aliases: tablelist[tablename].aliases,
						type: isDimension ? 'dimension' : 'fact'
					};
					tables[tablename] = table;
					if (isFact) {
						table.calculations = [{
							"label": table.label + "s Count",
							"customcalc": "count(*)",
							"id": "count",
							"format": "count"
						}];
					}
					if (can_create) {
						bulkdw.find({
							_id: tablename
						}).upsert().update({
							$set: tables[tablename]
						});
						bulkdw.find({
							_id: tablename + "-_id"
						}).upsert().update({
							$set: {}
						});
						hasDw = true;
						if (isDimension) {
							istream.put({
								d: "",
								a: "at",
								sql: "create table " + mysql.escapeId(tablelist[tablename].db) + "." + mysql.escapeId(parseTableName(tablename)) + " ( `_id` int(11) not null, Primary Key (`_id`) ) Engine=MyIsam;"
							});
						} else {
							istream.put({
								d: "",
								a: "at",
								sql: "create table " + mysql.escapeId(tablelist[tablename].db) + "." + mysql.escapeId(parseTableName(tablename)) + " ( dd_id varchar(50) null default null, unique key (`dd_id`) ) Engine=MyIsam;"
							});
						}
						istream.put({
							d: "",
							a: "at",
							sql: "alter table " + mysql.escapeId(tablelist[tablename].db) + "." + mysql.escapeId(parseTableName(tablename)) + " Engine=INNODB;"
						});
					}
				} else {
					table = tables[tablename];
					if (!(tablename in fields)) {
						fields[tablename] = {};
					}
					var set = {};
					var hasTableUpdate = false;
					for (var aliasDim in tablelist[tablename].aliases) {
						if (!(aliasDim in table.aliases)) {
							set['aliases.' + parseTableName(aliasDim)] = tablelist[tablename].aliases[aliasDim];
							hasTableUpdate = true;
						}
					}
					if (hasTableUpdate && can_create) {
						hasDw = true;
						bulkdw.find({
							_id: tablename
						}).upsert().update({
							$set: set
						});
					}
				}
			}

			// Tables have to be created first
			for (var i = 0; i < tableNames.length; i++) {
				var tablename = tableNames[i];
				var isTableDimension = parseTableName(tablename).charAt(0) === 'd';
				var isTableFact = !isTableDimension;
				var table = tables[tablename];
				// Now let's setup the fields
				var columns = [];
				var fieldGroup = fieldGroups[table._id];
				Object.keys(fieldGroup).forEach(
					function (fieldName) {
						if (!(fieldName in fields[table._id]) && !fieldName.startsWith('_')) {
							var isDimension = fieldName.charAt(0) === fieldName.charAt(0).toUpperCase() && fieldName.charAt(0) !== fieldName.charAt(0).toLowerCase();
							var field = {
								id: fieldName,
								fullId: parseTableName(table.table.split(':')[0]) + "-" + fieldName,
								customer: tablelist[tablename].cid,
								label: humanize(fieldName),
								table: table.table,
								ltable: parseTableName(table.table.split(':')[0]),
								type: isDimension ? 'field' : (isTableDimension ? 'attribute' : 'metric')
							};
							if (isDimension) {
								var isAliased = fieldName.indexOf(":") > 0;
								if (isAliased) {
									field.label = humanize(fieldName.split(":", 2).pop());
									field.dimension = fieldName.split(":", 2)[0];
									field.column = parseTableName(getIdAliased(tablelist[tablename].cid, "dimension", field.id));
								} else {
									field.dimension = fieldName;
									field.column = parseTableName(getId(tablelist[tablename].cid, "dimension", field.id));
								}
								field.dtype = "int(11)";
							} else if (field.id.startsWith('dd')) {
								field.id = field.id.toLowerCase();
								field.column = field.id.replace(/[^a-z0-9\_]/gmi, '').toLowerCase();
								field.label = humanize(fieldName);
								field.degenerate = table.label;
								field.dtype = "varchar(100)";
							} else {
								field.id = field.id.toLowerCase();
								field.column = field.id.replace(/[^a-z0-9\_]/gmi, '').toLowerCase();
								if (table.type != "dimension" && field.id == "id") {
									field.column = "dd_id";
									field.dtype = "int(11)";
								} else if (table.type == "dimension") {
									field.dtype = "varchar(100)";
								} else {
									field.dtype = "int(11)";
									field.calculations = [{
										label: "Total " + field.label,
										calc: 'sum',
										id: "sum"
									}, {
										label: "Average " + field.label,
										calc: "avg",
										id: 'avg'
									}, {
										label: "Min " + field.label,
										calc: "min",
										id: 'min'
									}, {
										label: "Max " + field.label,
										calc: "max",
										id: 'max'
									}];
								}
							}
							if (field.id == "id") {
								if (table.type == "dimension") {
									columns.push("add column `" + parseTableName(field.column) + "` " + field.dtype);
									columns.push("add Unique (`" + parseTableName(field.column) + "`,`_id`)");
								}
							} else {
								columns.push("add column `" + parseTableName(field.column) + "` " + field.dtype);
								if (table.type == "dimension") {
									columns.push("add index (`" + parseTableName(field.column) + "`)");
								} else if (field.dimension) {
									columns.push("ADD CONSTRAINT " + mysql.escapeId(parseTableName(table._id) + "-" + parseTableName(field.column)) + " FOREIGN KEY (" + mysql.escapeId(parseTableName(field.column)) + ") REFERENCES " + mysql.escapeId(parseTableName(getId(tablelist[tablename].cid, "dimension", field.dimension))) + " (`_id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
								}
							}
							if (fieldGroup[fieldName] == 'money') {
								field.format = 'money';
							}
							fields[table._id][field.id] = field;
							bulkdw.find({
								_id: table._id + "-" + field.id.toLowerCase()
							}).upsert().update({
								$set: fields[table._id][field.id]
							});
							hasDw = true;
						}
					});
				if (columns.length > 0 && can_create) {
					istream.put({
						d: "",
						a: "at",
						sql: "Alter table " + mysql.escapeId(tablelist[tablename].db) + "." + mysql.escapeId(parseTableName(table.table)) + " " + columns.join(", ") + ";"
					});
				}
			}
			if (hasDw && can_create) {
				bulkdw.execute(function (err, res) {
					// add fields onto the table reference at this point, since the tables
					// have been added to the db
					for (var table in tables) {
						tables[table].fields = fields[table];
					}
					callback(tables);
				});
			} else {
				// add fields onto the table reference at this point, since the tables
				// have been added to the db
				for (var table in tables) {
					tables[table].fields = fields[table];
				}
				callback(tables);
			}
		});
}

function reserveIdsHelper(customerid, newIdsRequired, result, callback) {
	counterCollection.findAndModify({
		_id: customerid + "dimids"
	}, null, {
		$inc: newIdsRequired[customerid]
	}, {
		'new': true,
		upsert: true
	}, function (err, doc) {
		if (err) console.log(err);
		for (var table in newIdsRequired[customerid]) {
			result[customerid][table] = doc[table] - (newIdsRequired[customerid][table] - 1);
		}
		callback();
	});
}

function reserveIds(newIdsRequired, callback) {
	var result = {};
	var promises = [];
	for (var customerid in newIdsRequired) {
		result[customerid] = {};
		promises.push(Q.promise(function (resolve, reject, notify) {
			// The customerid would not stay consistent due to the asynchronous nature of node, so move it to a local scope.
			reserveIdsHelper(customerid, newIdsRequired, result, resolve);
		}));
	}

	Q.all(promises).then(function () {
		callback(null, result);
	}).fail(function (err) {
		if (err) console.log(err);
		callback(err);
	});
}

// This looks up all events and gets their previous dimension status.
// Should probably also skip duplicate events eventually instead of doing that later
// Also splits out events into separate groups
function preProcess(date, events, callback) {
	var ids = [];
	var records = [];
	var eventIds = [];
	var lookups = {};
	var dynamicLookups = {};
	var runner = 0;
	var target = events.length;

	var runEvent = function () {
		latestcollection.find({
			_id: {
				$in: ids
			}
		}).toArray(function (err, entities) {
			if (err) console.log(err);
			ids = [];
			entities.forEach(function (entity) {
				lookups[entity._id] = entity.data;
				for (var name in entity.data) {
					var field = entity.data[name];
					if (field && field._id) { // is dimension
						// TODO: add customer id here
						ids.push(getId(entity.customer, "dimension", name, field.val));
					}
				}
			});
			latestcollection.find({
				_id: {
					$in: ids
				}
			}).toArray(function (err, entities) {
				if (err) console.log(err);
				ids = [];
				entities.forEach(function (entity) {
					lookups[entity._id] = entity.data;
				});
				var runner = 0;
				// I should have all facts and existing dimensions now
				// Now we want to loop through all the events again and load up any dimensions that are gonna be new
				events.forEach(function (event) {
					if (!event.key) {
						console.log("Rejected event (nokey)");
						return;
					}
					if (!apikeys[event.key]) {
						console.log("Rejected event (badkey)");
						return;
					}
					var mainId = getId(apikeys[event.key].cid, event.type, event.entity, event.data.id);

					for (var key in event.data) {
						var dim = event.data[key];
						if (key.charAt(0) === key.charAt(0).toUpperCase() && key.charAt(0) !== key.charAt(0).toLowerCase()) { // This is a dimension
							if (dim === Object(dim) && dim['$func'] == undefined) {
								if ("id" in dim) {
									// When the id is present, this is simple. Just use the one they provided us.
									var id = getId(apikeys[event.key].cid, "dimension", key, dim.id);
									if (!(id in lookups)) {
										ids.push(id);
									}
									records.push({
										customer: apikeys[event.key].cid,
										type: 'dimension',
										entity: key.split(':')[0].toLowerCase(),
										table: getId(apikeys[event.key].cid, "dimension", key.split(':')[0].toLowerCase()),
										e: id,
										eid: event.eventid,
										date: date,
										c: dim,
										db: apikeys[event.key].db,
										cid: apikeys[event.key].cid
									});
									event.data[key] = dim.id;
								} else {
									// When a dimension was sent in with no id, it is a dynamic dimension and we must discover the id
									var dimData = {};
									if (mainId in dynamicLookups && key in dynamicLookups[mainId]) {
										for (var field in dynamicLookups[mainId][key]) {
											if (!field.startsWith('_') && field.toLowerCase() != "id") dimData[field.toLowerCase()] = dynamicLookups[mainId][key][field];
										}
									} else if (mainId in lookups && key in lookups[mainId]) {
										var oldDimId = getId(apikeys[event.key].cid, "dimension", key.split(':')[0].toLowerCase(), lookups[mainId][key].val);
										// put the old attributes on first
										for (var field in lookups[oldDimId]) {
											if (!field.startsWith('_') && field.toLowerCase() != "id") dimData[field.toLowerCase()] = lookups[oldDimId][field];
										}
									}
									// now replace with new attributes
									for (var field in dim) {
										dimData[field.toLowerCase()] = dim[field];
									}
									var shasum = crypto.createHash('sha1');
									var keys = Object.keys(dimData).sort();
									for (var i = 0; i < keys.length; i++) {
										var k = keys[i];
										if (dimData[k] !== null) shasum.update(k + ":" + dimData[k]);
									}
									dimData.id = shasum.digest("base64");
									dimData._dynamic = true;
									records.push({
										customer: apikeys[event.key].cid,
										type: 'dimension',
										entity: key.split(':')[0].toLowerCase(),
										table: getId(apikeys[event.key].cid, "dimension", key.split(':')[0].toLowerCase()),
										e: getId(apikeys[event.key].cid, "dimension", key.split(':')[0].toLowerCase(), dimData.id),
										eid: event.eventid,
										date: date,
										c: dimData,
										db: apikeys[event.key].db,
										cid: apikeys[event.key].cid
									});
									var id = getId(apikeys[event.key].cid, "dimension", key.split(':')[0].toLowerCase(), dimData.id);
									if (!(id in lookups)) {
										ids.push(id);
									}
									event.data[key] = dimData.id;
									if (!(key in dynamicLookups)) {
										dynamicLookups[mainId] = {};
									}
									dynamicLookups[mainId][key] = dimData;
								}
							} else {
								// When a dimension is sent with nothing but an id as a string, ensure the table exists and the record has something there for foreign key lookups. Data may be added later.
								var id = getId(apikeys[event.key].cid, "dimension", key, dim);
								if (!(id in lookups)) {
									ids.push(id);
								}
								records.push({
									customer: apikeys[event.key].cid,
									type: 'dimension',
									entity: key.split(':')[0].toLowerCase(),
									table: getId(apikeys[event.key].cid, "dimension", key.split(':')[0].toLowerCase()),
									e: id,
									eid: event.eventid,
									date: date,
									c: {
										id: dim
									},
									db: apikeys[event.key].db,
									cid: apikeys[event.key].cid
								});
							}
						}
					}
					if (!(mainId in lookups)) {
						ids.push(mainId);
					}
					records.push({
						customer: apikeys[event.key].cid,
						type: event.type,
						entity: event.entity.split(':')[0].toLowerCase(),
						table: getId(apikeys[event.key].cid, event.type, event.entity.split(':')[0].toLowerCase()),
						e: mainId,
						eid: event.eventid,
						date: date,
						c: event.data,
						db: apikeys[event.key].db,
						cid: apikeys[event.key].cid
					});
					eventIds.push(event.eventid);

				});
				callback(records, eventIds, lookups, ids);
			});
		});
	};
	checkAndLoadKeys(events, function () {
		for (var i = 0; i < events.length; i++) {
			var event = events[i];
			if (event.type == "fact" && "id" in event.data) {
				if (apikeys[event.key]) ids.push(getId(apikeys[event.key].cid, event.type, event.entity, event.data.id));
			}
		}
		runEvent();
	});
}

function processEvents(events) {
	// var split the events on any deletes
	var lasti = 0;
	var breakouts = [];
	for (var i = 0; i < events.length; i++) {
		if (events[i].type == "delete") {
			if (i > lasti) {
				breakouts.push({
					events: events.slice(lasti, i)
				});
			}
			breakouts.push({
				type: 'delete',
				event: events[i]
			});
			lasti = i + 1;
		}
	}
	// shortcut for slice if no deletes
	if (lasti === 0) {
		return doProcessEvents(events);
	} else if (lasti < i) {
		breakouts.push({
			events: events.slice(lasti, i)
		});
	}

	var result = Q(true);
	breakouts.forEach(function (breakout) {
		if (breakout.type == "delete") {
			result = result.then(function () {
				return doDeletions(breakout.event);
			});
		} else {
			result = result.then(function () {
				return doProcessEvents(breakout.events);
			});
		}
	});
	return result;
}

function checkAndLoadKeys(events, callback) {
	var fetchKeys = {};
	for (var i = 0; i < events.length; i++) {
		var event = events[i];
		if (!(event.key in apikeys)) {
			fetchKeys[event.key] = 1;
		}
	}
	dynamo.getClientInfo(Object.keys(fetchKeys), function (err, newKeys) {
		for (var key in newKeys) {
			apikeys[key] = newKeys[key];
		}
		callback();
	});
}

function doDeletions(deletion) {
	return Q.promise(function (resolve, reject, notify) {
		checkAndLoadKeys([deletion], function () {
			if (!apikeys[deletion.key]) {
				console.log("Rejected event (badkey)");
				resolve();
				return;
			}
			var customer = apikeys[deletion.key];

			var tables = {};
			var fields = {};
			var table = getId(customer.cid, "fact", deletion.entity);
			if (!(table in tables)) {
				tables[table] = {
					name: deletion.entity,
					aliases: {},
					db: customer.db,
					cid: customer.cid
				};
				fields[table] = {};
			}
			getTables(tables, fields, function (tables) {
				var multi = false;
				if (deletion.data.multi && (deletion.data.multi === true || (deletion.data.multi.toLowerCase && deletion.data.multi.toLowerCase() === 'true'))) {
					multi = true;
				}
				var prefix = (deletion.data.prefix && deletion.data.prefix.toString()) ? deletion.data.prefix.toString().toLowerCase().trim() : '';
				var inArray = deletion.data['in'];
				if (inArray && !inArray.map) {
					inArray = Object.keys(inArray).map(function (key) {
						return inArray[key];
					});
				}

				if (!multi && prefix.length) {
					inArray = [prefix];
					prefix = '';
				}
				if (prefix.length === 0 && (!inArray || inArray.length === 0)) {
					resolve();
					return;
				}

				if (prefix) {
					if (prefix === "*") {
						prefix = '';
					}
					var constraint = {
						_id: multi ? new RegExp("^" + getId(customer.cid, "fact", deletion.entity, prefix)) : getId(customer.cid, "fact", deletion.entity, prefix),
						customer: customer.cid
					};
					latestcollection.remove(constraint, {
						multi: multi
					}, function (err, data) {
						if (multi) {
							prefix += "%";
						}
						var sql = "delete from " + mysql.escapeId(customer.db) + "." + mysql.escapeId(parseTableName(getId(customer.cid, "fact", deletion.entity))) + " where dd_id like " + mysql.escape(prefix);
						if (!multi) {
							sql += " limit 1";
						}
						sql += ";";
						istream.put({
							d: "",
							a: "dr",
							c: customer.cid,
							sql: sql
						});
						resolve();
					});
				} else {
					var constraint = {
						_id: {
							$in: inArray.map(function (id) {
								return getId(customer.cid, "fact", deletion.entity, id);
							})
						},
						customer: customer.cid
					};
					latestcollection.remove(constraint, {
						multi: multi
					}, function (err, data) {
						var sql = "delete from " + mysql.escapeId(customer.db) + "." + mysql.escapeId(parseTableName(getId(customer.cid, "fact", deletion.entity))) + " where dd_id in (" + inArray.map(function (id) {
							return mysql.escape(id);
						}).join(",") + ")";
						if (!multi) {
							sql += " limit 1";
						}
						sql += ";";
						istream.put({
							d: "",
							a: "dr",
							c: customer.cid,
							sql: sql
						});
						resolve();
					});
				}

			}, true);
		});
	});
}

function doProcessEvents(events) {
	// console.time("Process Events");
	console.log("Going to process " + events.length + " records");

	return Q.promise(function (resolve, reject, notify) {
		if (events.length == 0) {
			resolve();
			return;
		}
		var tables = {};
		var fields = {};

		var hasRecordsToProcess = false;
		var hasFieldsToProcess = false;
		var date = new Date();

		preProcess(date, events, function (records, eventIds, lookups, ids) {
			for (var i = 0; i < records.length; i++) {
				var record = records[i];
				var table = record.table;
				if (!(table in tables)) {
					tables[table] = {
						name: record.entity,
						aliases: {},
						db: record.db,
						cid: record.cid
					};
					fields[table] = {};
				}

				for (var name in record.c) {
					if (name.charAt(0) === name.charAt(0).toUpperCase() && name.charAt(0) !== name.charAt(0).toLowerCase()) { // isDimension
						fields[table][name] = 'dim';
						var dimName = getId(record.cid, "dimension", name);
						var parts = name.split(':', 2);
						if (!(dimName in tables)) {
							tables[dimName] = {
								name: parts[0],
								aliases: {},
								db: record.db
							};
							fields[dimName] = {};
						}
						if (parts.length > 1) {
							var alias = getIdAliased(record.cid, "dimension", name);
							if (!(alias in tables[dimName].aliases)) {
								tables[dimName].aliases[parseTableName(alias)] = parts[1];
							}
						}
					} else {
						var value = record.c[name];
						if (value && value.currency) {
							fields[table][name] = 'money';
						} else {
							fields[table][name] = 'int';
						}
					}
				}
			}

			var bulkentities = latestcollection.initializeUnorderedBulkOp({
				w: 1
			});
			var hasSolr = false;
			getTables(tables, fields, function (tables) {
				latestcollection.find({
					_id: {
						$in: ids
					}
				}).toArray(
					function (err, entities) {
						if (err) console.log(err);
						entities.forEach(function (entity) {
							lookups[entity._id] = entity.data;
						});
						var newRecords = {};
						var newRecordCounts = {};
						var countLookups = {};
						var list_cids = {};
						records.forEach(function (record) {
							if (record.type == "dimension") {
								if (!(record.e in countLookups) && !(record.e in lookups)) {
									var val = record.c.id;
									if (val && val['$func']) {
										val = val.value;
										if (!val) val = '';
									}

									if (record.entity == "date") {
										var matches;
										if (matches = val.match(/^\s*(\d+)\-(\d+)\-(\d+)/)) {
											reusableDate.setFullYear(matches[1], matches[2] - 1, matches[3]);
											if (reusableDate < epochDate) {
												lookups[record.e] = {
													_id: 1
												};
											} else {
												lookups[record.e] = {
													_id: Math.round(Math.abs((reusableDate.getTime() - epochDateTime) * oneDayInverse)) + dimensionSurrogateOffset
												};
												if (moment(reusableDate).format("YYYY-MM-DD") == val) {
													// This was a valid date, so create it if we can't find it
													newRecords[record.e] = true;
												}
											}
										} else {
											lookups[record.e] = {
												_id: 1
											};
										}
									} else if (record.entity == "time") {
										if (val.match(/^\s*(\d+):(\d+):(\d+)/)) {
											var timeMatches = val.match(/^\s*(\d+):(\d+):(\d+)/);
											lookups[record.e] = {
												_id: (parseInt(timeMatches[1]) * 3600) + (parseInt(timeMatches[2]) * 60) + parseInt(timeMatches[3]) + dimensionSurrogateOffset
											};
											newRecords[record.e] = true;
										} else {
											lookups[record.e] = {
												_id: 1
											};
										}
									} else {
										countLookups[record.e] = 1;
										if (!(record.customer in newRecordCounts)) {
											newRecordCounts[record.customer] = {};
										}
										if (!(record.table in newRecordCounts[record.customer])) {
											newRecordCounts[record.customer][record.table] = 1;
										} else {
											newRecordCounts[record.customer][record.table]++;
										}
									}
								}
							}
						});
						reserveIds(newRecordCounts, function (err, newIds) {
							if (err) {
								console.log(err);
								reject(err);
								return;
							}
							var entitiesToUpdate = {};
							var length = records.length;
							for (var i = 0; i < length; i++) {
								var record = records[i];
								var sqlUpdate = {};
								if (record.type == "dimension") {
									if (record.e === null || !(record.e in lookups)) {
										var id = newIds[record.customer][record.table]++;
										lookups[record.e] = {
											_id: id
										};
									} else if (newRecords[record.e]) { // we may have forced the _id for example for Dates/times where surrogate is allowed to be smart
										newRecords[record.e] = false;
									}
								} else if (record.e === null || !(record.e in lookups)) {
									lookups[record.e] = {};
								}
								var entity = lookups[record.e];
								var changes = record.c;

								if (record.type == "dimension") {
									sqlUpdate['_id'] = entity._id;
								} else {
									sqlUpdate['dd_id'] = entity.id;
								}

								for (var fieldName in changes) {
									var newValue = changes[fieldName];
									var oldValue = entity[fieldName];

									var isDimension = fieldName.charAt(0) === fieldName.charAt(0).toUpperCase() && fieldName.charAt(0) !== fieldName.charAt(0).toLowerCase();
									if (!isDimension) {
										fieldName = fieldName.toLowerCase();
									}

									// Let's get the field needed
									var table = tables[getId(record.cid, record.type, record.entity)];
									var field = table.fields[fieldName];
									if (newValue && newValue['$func']) {
										var operator = newValue['$func'].toLowerCase();
										newValue = newValue.value;
										if (newValue === null) {
											newValue = '';
										}
										if (oldValue) {
											var compareValue = oldValue;
											if (field && field.dimension) {
												compareValue = oldValue.val;
											}
											if (operator == "min") {
												if (newValue.localeCompare(compareValue) >= 0) {
													newValue = compareValue; // We are not less, so ignore us
												}
											} else if (operator == "max") {
												if (newValue.localeCompare(compareValue) <= 0) {
													newValue = compareValue; // We are not more, so ignore us
												}
											} else if (operator == "add") {
												newValue = parseInt(compareValue) + parseInt(newValue);
												if (isNaN(newValue)) newValue;
											} else if (operator == "sub" || operator == "subtract") {
												newValue = parseInt(compareValue) - parseInt(newValue);
												if (isNaN(newValue)) newValue = parseInt(newValue) * -1;
											}
										} else if (operator == "sub" || operator == "subtract") {
											newValue = parseInt(newValue) * -1; // Subtracting whatever was sent in from 0, since this is a new value
										}
									}

									if (field && field.dimension) {
										if (!oldValue || newValue !== oldValue.val) {
											entity[fieldName] = {
												_id: lookups[getId(record.cid, "dimension", field.dimension, newValue)]._id,
												val: newValue
											};
											sqlUpdate[parseTableName(field.column)] = entity[fieldName]._id;
										} else if (oldValue) {
											sqlUpdate[parseTableName(field.column)] = oldValue._id;
										}
									} else {
										if (newValue && newValue.currency) {
											entity[fieldName] = newValue;
											if (!fieldName.startsWith('_')) {
												sqlUpdate[parseTableName(field.column)] = newValue.pennies;
											}
										} else {
											entity[fieldName] = newValue;
											if (!fieldName.startsWith('_')) {
												sqlUpdate[parseTableName(field.column)] = newValue;
											}
										}
									}
								}

								var keys = Object.keys(sqlUpdate);
								//@todo: This needs to be done better
								//if(! ( record.type == "dimension" && (record.entity == "date" || record.entity == "time") ) ) {
								istream.put({
									sql: "insert into " + mysql.escapeId(record.db) + "." + mysql.escapeId(parseTableName(getId(record.customer, record.type, record.entity))) + "(" + keys.map(mysql.escapeId).join(',') + ") " +
										" Values (" + keys.map(function (key) {
										return mysql.escape(sqlUpdate[key]);
									}) + ")" +
										" on DUPLICATE KEY UPDATE " + keys.map(mysql.escapeId).map(function (key) {
										return key + "=VALUES(" + key + ")";
									}) + ";"
								});
								hasRecordsToProcess = true;
								entitiesToUpdate[record.e] = record.type;
								list_cids[record.e] = record.cid;
								//}
								delete record.customer;
								delete record.type;
								delete record.table;
								delete record.entity;
							}
							if (hasRecordsToProcess) {
								Object.keys(entitiesToUpdate).forEach(function (key) {
									bulkentities.find({
										_id: key
									}).upsert().replaceOne({
										_id: key,
										customer: list_cids[key],
										type: entitiesToUpdate[key],
										date: date,
										data: lookups[key]
									});
								});
								bulkentities.execute(function (err, res) {
									if (err) console.log(err);
									resolve(ids);
								});
							} else {
								resolve([]);
							}
						});
					});
			}, true);
		});
	});
}

function getlog(type, entity, id, customer) {
	var ident = getId(customer.cid, type, entity, id);
	return Q.promise(function (resolve, reject, notify) {
		var log = {
			id: id,
			type: type,
			entity: entity,
			log: []
		};
		logcollection.find({
			e: ident
		}, {
			sort: [
				["_id", "desc"]
			]
		}).toArray(function (err, events) {
			if (err) console.log(err);
			events.forEach(function (event) {
				var id = new ObjectID(event._id);
				log.log.push({
					date: event.date,
					changes: event.c
				});
			});
			resolve(log);
		});
	});
}

function getEntity(type, entity, id, customer) {
	var ident = getId(customer.cid, type, entity, id);
	return Q.promise(function (resolve, reject, notify) {
		var result = {
			id: id,
			type: type,
			entity: entity,
			data: {

			}
		};
		latestcollection.findOne({
			_id: ident
		}, function (err, e) {
			if (err) console.log(err);
			result.data = e.data;
			result.lastModified = e.date;
			resolve(result);
		});
	});
}

function getTable(type, entity, customer) {
	return Q.promise(function (resolve, reject, notify) {
		dwcollection.find({
			table: getId(customer.cid, type, entity)
		}).toArray(function (err, entries) {

			var fields = {};
			var table = null;
			entries.forEach(function (entry) {
				if (entry.type == "fact" || entry.type == "dimension") {
					table = entry;
				} else if (entry.id !== "_id") {
					fields[entry.id] = entry;
					delete entry._id;
					delete entry.table;
					delete entry.customer;
					delete entry.label;
					delete entry.type;
				}
			});
			table.fields = fields;
			resolve(table);
		});
	});
}

function getFactTables(type, entity) {
	return Q.promise(function (resolve, reject, notify) {
		dwcollection.find({
			type: 'fact'
		}, {
			fields: ['label']
		}).toArray(function (err, docs) {
			docs.map(function (doc) {
				delete doc._id;
			});
			resolve(docs);
		});
	});
}

function updateField(type, entity, name, params, customer) {
	return Q.promise(function (resolve, reject, notify) {
		if (['fact', 'dimension'].indexOf(type) == -1) {
			reject();
			return;
		}
		var _id = getId(customer.cid, type, entity);
		if (name) _id += "-" + name.toLowerCase();
		dwcollection.update({
			_id: _id
		}, {
			$set: params
		}, function (err) {
			resolve();
		});
	});
}

function updateLabel(id, label, customer, callback) {
	return Q.promise(function (resolve, reject, notify) {
		var chunks = id.split('.');
		id = customer.cid + "-" + chunks.join('-');
		dwcollection.update({
			_id: id
		}, {
			$set: {
				label: label
			}
		}, function (err) {
			if (callback) callback(err);
			resolve();
		});
	});
}

function getFields(callback, key) {
	var tables = {
		dimension: {},
		fact: {}
	};
	dynamo.getCustomer(function (err, customer) {
		if (err === null) {
			dwcollection.find({
				customer: customer.cid
			}).each(function (err, doc) {
				if (doc) {
					var type;
					if (typeof doc.ltable == 'undefined') doc.ltable = parseTableName(doc.table);
					var tableName = doc.ltable.replace(/^._/, '');
					if (doc.ltable.startsWith("d_") || doc.degenerate) {
						type = 'dimension';
					} else {
						type = "fact";
					}
					if (!(tableName in tables[type])) {
						if (type == "fact") {
							tables[type][tableName] = {
								type: type,
								dimensions: [],
								aliases: {},
								metrics: [],
								autoFilters: []
							};
						} else {
							tables[type][tableName] = {
								type: type,
								attributes: [],
								dimensions: [],
								aliases: {},
								laggable: false
							};
						}
					}
					if (doc.type == "fact") {
						tables[type][tableName].label = doc.label;
						tables[type][tableName].description = doc.description;
						tables[type][tableName].id = doc.ltable || doc.table.replace(/^[0-9]+-/, '');
						tables[type][tableName].format = doc.format;
						tables[type][tableName].metrics.push({
							id: "f_" + tableName,
							label: doc.label
						});
						if (doc.calculations) {
							for (var i = 0; i < doc.calculations.length; i++) {
								if (doc.calculations[i].id != "count") tables[type][tableName].metrics.push(doc.calculations[i]);
							}
						}
						if (doc.autoFilters) {
							doc.autoFilters.forEach(function (filter) {
								tables[type][tableName].autoFilters.push(filter);
							});
						}
					} else if (doc.type == "dimension") {
						tables[type][tableName].label = doc.label;
						tables[type][tableName].description = doc.description;
						tables[type][tableName].id = doc.ltable || doc.table.replace(/^[0-9]+-/, '');
						tables[type][tableName].format = doc.format;
						for (var alias in doc.aliases) {
							tables[type][tableName].aliases[alias] = doc.aliases[alias];
						}
						if (doc.calculations) {
							tables[type][tableName].attributes = tables[type][tableName].attributes.concat(doc.calculations);
						}
						if (doc.ltable == "d_date" || doc.ltable == "d_time") {
							tables[type][tableName].laggable = true;
						}
					} else if (doc.dimension) {
						tables[type][tableName].dimensions.push(doc.column);
					} else if (doc.degenerate) {
						if (!tables[type][tableName].label) {
							tables["fact"][tableName].dimensions.push("dd_" + doc.ltable);
							tables[type][tableName].label = doc.degenerate;
							tables[type][tableName].description = "Degenerate Dimension Attributes";
						}
						var attr = {
							id: "f_" + tableName + "." + doc.id,
							label: doc.label
						};
						tables[type][tableName].id = "dd_" + doc.ltable;
						attr.description = doc.description;
						tables[type][tableName].format = doc.format;
						tables[type][tableName].attributes.push(attr);
					} else if (type == "fact" && doc.id != "id") {
						tables[type][tableName].metrics.push({
							id: "f_" + tableName + "." + doc.id,
							label: doc.label,
							expression: doc.customCalc,
							calculations: doc.calculations,
							description: doc.description,
							type: doc.type,
							format: doc.format,
							filter: doc.filter
						});
					} else if (type == "dimension") {
						var attr = {
							id: "d_" + tableName + "." + doc.id,
							label: doc.label
						};
						if (tableName == "date" && doc.id == "id") {
							attr.quickFilters = ["Last 7 days", "Last 30 days", "Last Month"];
						}
						attr.description = doc.description;
						attr.format = doc.format;
						tables[type][tableName].attributes.push(attr);
					}
				} else {
					callback(tables);
				}
			});
		} else if (err === false) {
			callback({
				error: "Invalid api key"
			});
		} else {
			// Error was from the sql call and should have been logged out to the console
			callback({
				error: "Internal error"
			});
		}
	}, key);
}

function getCalculations(customer, callback) {
	var query = {
		$and: [{
			$where: "this._id == this.table"
		}, {
			customer: customer.cid
		}]
	};
	dwcollection.find(query).toArray(function (err, docs) {
		var calcLookups = {};
		var calcs = {};
		var fieldsById = {};
		for (var i in docs) {
			var doc = docs[i];
			fieldsById[doc.id] = doc;
			if (!doc.calculations) continue;
			for (var k in doc.calculations) {
				var calc = doc.calculations[k];
				calcs[calc.id] = calc;
				calcLookups[calc.id] = doc.id;
			}
		}
		callback({
			lookups: calcLookups,
			fields: fieldsById,
			calcs: calcs
		});
	});
}

function getFieldsById(fields, customer, callback, options) {
	if (typeof customer == 'undefined') {
		callback([], {});
		return;
	}
	if (typeof options == 'undefined') {
		options = {
			metrics: []
		};
	}
	var fieldIds = {};
	var neededCalcs = [];
	var tables = {};
	var dedup = {};
	var fieldMap = {};
	var moreFields;
	var i = 0;

	for (var j = 0; j < 2; j++) {
		moreFields = [];
		for (; i < fields.length; i++) {
			var field = fields[i];
			if (!(field in dedup)) {
				dedup[field] = 1;
				var calc = calculations.getCalcField(field);
				if (calc.moreFields) {
					moreFields.push(calc.moreFields); // more fields are just this field expanded out with extra options.
				}
				fieldIds[calc.id] = 1;
				calc.requiredTables.forEach(function (table) {
					fieldIds[table.table] = 1;
				});
				neededCalcs.push(calc);
				fieldMap[calc.alias] = calc;
			}
		}
		if (moreFields.length == 0) break;
		var newFields = [];
		for (var k = 0; k < moreFields.length; k++) {
			newFields = newFields.concat(moreFields[k](options.metrics, fieldMap));
		}
		if (newFields.length == 0) break;
		fields = fields.concat(newFields);
	}

	var mykeys = [];
	for (var myfield in fieldIds) {
		mykeys.push(customer.cid + "-" + myfield);
	}
	dwcollection.find({
		_id: {
			$in: mykeys
		},
		customer: customer.cid
	}).toArray(function (err, docs) {
		var dimensions = [];
		var metrics = [];

		var lookup = {};
		var foundkeys = [];
		for (var i = 0; i < docs.length; i++) {
			var doc = docs[i];
			foundkeys.push(doc._id);
			if (doc.calculations) {
				doc.calcLookups = {};
				for (var x = 0; x < doc.calculations.length; x++) {
					var calc = doc.calculations[x];
					doc.calcLookups[calc.id] = calc;
				}
			}
			if (doc.type == "dimension" || doc.type == "fact") {
				tables[doc.ltable] = doc;
			}
			lookup[doc._id.replace(/^\d+\-/, '')] = doc;
		}
		var unfound = mykeys.filter(function (el) {
			return foundkeys.indexOf(el) < 0;
		});
		if (unfound.length > 0) {
			for (var i = 0; i < unfound.length; i++) {
				unfound[i] = unfound[i].replace(/^[0-9]+-/, '');
			}
			return callback(null, unfound);
		}
		for (i = 0; i < neededCalcs.length; i++) {
			var calc = neededCalcs[i];
			calc.setField(lookup[calc.id], tables);
		}
		callback(neededCalcs, tables, fieldMap);
	});
}

function update_calculations(data, customer, callback) {
	for (var i in data) {
		if (["f", "d"].indexOf(i[0]) == -1) continue;
		var table = data[i];
		if (table.put && table.put.calc == 'virtual') {
			var field = table.put;
			var fieldObj = {
				_id: String(customer.cid) + "-" + field.id.replace(".", "-"),
				id: field.id.split('.')[1],
				fullId: field.id.replace(".", "-"),
				customer: customer.cid,
				label: field.label,
				table: String(customer.cid) + "-" + i,
				ltable: i,
				type: 'metric',
				format: field.format,
				column: null,
				dtype: "int",
				customCalc: field.expression,
				description: field.description,
				filter: field.filter
			};
			dwcollection.update({
				_id: fieldObj._id
			}, fieldObj, {
				upsert: true
			}, callback);
			return;
		} else if (table.delete && table.delete[0].match(/^(f|d)_[a-z_]+\.c_/)) {
			for (var j = 0; j < table.delete.length; j++) {
				table.delete[j] = String(customer.cid) + "-" + table.delete[j].replace(".", "-");
			}
			return dwcollection.remove({
				_id: {
					$in: table.delete
				}
			}, {
				w: 1
			}, function (err, result) {
				callback();
			});
		}
	}

	// OLD STUFF
	var search = [];
	var lookup = {};
	for (var i in data) {
		if (["f", "d"].indexOf(i[0]) == -1) continue;
		search.push(String(customer.cid) + "-" + i);
		lookup[String(customer.cid) + "-" + i] = data[i];
	}
	dwcollection.find({
		_id: {
			$in: search
		}
	}).toArray(function (err, docs) {
		if (!docs.length) {
			callback("No records found to update");
			return;
		}
		var bulkdw = dwcollection.initializeUnorderedBulkOp();
		for (var item in docs) {
			var doc = docs[item];
			var calculation = doc.calculations || [];

			var hasUpdate = false;
			if (typeof lookup[doc._id]['delete'] == 'undefined') lookup[doc._id]['delete'] = [];
			if (lookup[doc._id].put) lookup[doc._id]['delete'].push(lookup[doc._id].put.id);
			if (lookup[doc._id]['delete']) {
				var newcalc = [];
				for (var i in calculation) {
					if (lookup[doc._id]['delete'].indexOf(calculation[i].id) == -1) newcalc.push(calculation[i]);
				}
				calculation = newcalc;
				hasUpdate = true;
			}
			if (lookup[doc._id].put) {
				calculation.push(lookup[doc._id].put);
				hasUpdate = true;
			}

			if (hasUpdate) {
				bulkdw.find({
					_id: doc._id
				}).upsert().update({
					$set: {
						calculations: calculation
					}
				});
			}
		}
		bulkdw.execute(function (err, result) {
			if (err) {
				callback("Failed to save changes");
			} else {
				// success!
				callback(false);
			}
		});
	});
}

function updateFieldProperties(props, customer, callback) {
	var chunks = props.id.split('.');
	var id = customer.cid + "-" + chunks.join('-');
	var newprops = {};
	if (props.label) newprops.label = props.label;
	if (props.description) newprops.description = props.description;
	if (props.format) newprops.format = props.format;
	dwcollection.update({
		_id: id
	}, {
		$set: newprops
	}, function (err) {
		if (callback) callback(err);
	});
}

function update_calculation_description(calculation_id, parent_id, description, customer, callback) {
	dwcollection.find({
		_id: customer.cid + "-" + parent_id
	}).toArray(function (err, data) {
		for (var i = 0; i < data.length; i++) {
			if (!data[i].calculations) continue;
			var has_update = false;
			for (var j = 0; j < data[i].calculations.length; j++) {
				var calc = data[i].calculations[j];
				if (calc.id == calculation_id) {
					calc.description = description;
					has_update = true;
				}
			}
			if (has_update) {
				dwcollection.update({
					_id: customer.cid + "-" + parent_id
				}, {
					$set: {
						calculations: data[i].calculations
					}
				}, callback);
			}
		}
	});
}

function autoComplete(params, customer, callback) {
	return Q.promise(function (resolve, reject, notify) {
		solr.autoComplete(params, function (err, result) {
			if (err) {
				reject();
				callback(err);
				return;
			}
			var suggestions = result.suggestions;

			var tables = {};
			var fields = {};
			for (var i = 0; i < suggestions.length; i++) {
				var suggestion = suggestions[i];
				tables[customer.cid + "-d_" + parseTableName(suggestion.dimension, true)] = {
					name: suggestion.dimension,
					db: customer.db,
					cid: customer.cid
				};
				if (!(suggestion.dimension in fields)) {
					fields[customer.cid + "-d_" + parseTableName(suggestion.dimension, true)] = {};
				}
				fields[customer.cid + "-d_" + parseTableName(suggestion.dimension, true)][suggestion.attribute] = 1;
			}
			getTables(tables, fields, function (tables) {
				for (var i = 0; i < suggestions.length; i++) {
					var suggestion = suggestions[i];
					if (customer.cid + "-d_" + parseTableName(suggestion.dimension, true) in tables && suggestion.attribute in tables[customer.cid + "-d_" + parseTableName(suggestion.dimension, true)].fields) {
						suggestion.label = tables[customer.cid + "-d_" + parseTableName(suggestion.dimension, true)].fields[suggestion.attribute].label;
					}
				}
				suggestions.sort(function (a, b) {
					if (a.value > b.value) return 1;
					if (a.value < b.value) return -1;
					return 0;
				});
				if (callback) {
					callback(null, result);
				}
				resolve(result);
			}, false);
		});
	});
}

module.exports = Object.freeze({
	startup: startup,
	clearSingle: clearSingle,
	configure: configure,

	processEvents: processEvents,
	getlog: getlog,
	getEntity: getEntity,
	getTable: getTable,
	updateField: updateField,
	getFactTables: getFactTables,
	getFields: getFields,
	getFieldsById: getFieldsById,
	getCustomer: dynamo.getCustomer,
	getPreferredKey: dynamo.getPreferredKey,
	parseTableName: parseTableName,
	autoComplete: autoComplete,
	dynamo: dynamo.dynamo,
	update_calculations: update_calculations,
	update_calculation_description: update_calculation_description,
	update_label: updateLabel,
	updateFieldProperties: updateFieldProperties,
	getCalculations: getCalculations
});
