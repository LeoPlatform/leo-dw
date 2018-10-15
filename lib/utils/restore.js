if (process.argv.length < 4) {
	console.error("Usage: node backup.js warehouse_id output_file")
	process.exit();
}

var config = require("../../config.json");
var MongoClient = require('mongodb').MongoClient;
var aws = require("aws-sdk");
var s3 = new aws.S3();
var dynamo = new aws.DynamoDB();
var fs = require('fs');

var parse_s3_url = function (url) {
	var chunks = url.match(/^s3:\/\/([a-zA-Z\._-]+)\/(.*)$/);
	if (!chunks) return false;
	return {
		Bucket: chunks[1],
		Key: chunks[2]
	}
}

var send = {
	TableName: "Clients",
	Key: {
		ClientID: {
			S: process.argv[2]
		}
	}
}
dynamo.getItem(send, function (err, data) {
	if (err) {
		console.log(err);
		throw err;
	}
	var doImport = function () {
		var source = {};
		var virtual_metrics = [];
		for (var i = 0; i < raw_source.length; i++) {
			source[raw_source[i]._id] = raw_source[i];
			if (raw_source[i]._id.match(/^[^\-]+-c_/) && raw_source[i].customCalc) {
				virtual_metrics.push(raw_source[i]);
			}
		}

		MongoClient.connect('mongodb://' + config.mongodb + ':27017/events', {
			w: 1
		}, function (err, db) {
			if (err) {
				console.log(err);
				throw err;
			}
			dwcollection = db.collection('dw', {
				w: 1
			});
			dwcollection.find({
				customer: parseInt(client_id)
			}).toArray(function (err, docs) {
				var bulkdw = dwcollection.initializeUnorderedBulkOp();
				var prefix = new RegExp('^' + client_id + '-');
				for (var i = 0; i < docs.length; i++) {
					var mydoc = docs[i];
					if (mydoc._id.match(/^[^\-]+-c_/) && mydoc.customCalc) {
						continue; //Handled below
					}
					var result = {};
					var id = mydoc._id.replace(prefix, '');
					if (source[id] == undefined) continue;
					if (source[id].calculations && source[id].calculations.length) {
						var keyedCalculations = {};
						if (!mydoc.calculations) mydoc.calculations = [];
						for (var j = 0; j < mydoc.calculations.length; j++) {
							keyedCalculations[mydoc.calculations[j].id] = mydoc.calculations[j];
						}
						for (var j = 0; j < source[id].calculations.length; j++) {
							keyedCalculations[source[id].calculations[j].id] = source[id].calculations[j]
						}
						result.calculations = [];
						for (var j = 0 in keyedCalculations) {
							result.calculations.push(keyedCalculations[j]);
						}
					}

					if (source[id].label) result.label = source[id].label;
					if (source[id].format) result.format = source[id].format;
					if (source[id].description) result.description = source[id].description;
					if (source[id].autoFilters) result.autoFilters = source[id].autoFilters;
					if (Object.keys(result).length > 0) bulkdw.find({
						_id: mydoc._id
					}).upsert().update({
						$set: result
					});
				}
				for (var i = 0; i < virtual_metrics.length; i++) {
					var mydoc = virtual_metrics[i];
					mydoc._id = process.argv[2] + "-" + mydoc._id
					mydoc.customer = parseInt(process.argv[2]);
					if (mydoc.ltable) mydoc.table = process.argv[2] + "-" + mydoc.ltable;
					bulkdw.find({
						_id: mydoc._id
					}).upsert().update({
						$set: mydoc
					});
				}
				bulkdw.execute(function (err, res) {
					if (err) {
						console.error("Error occurred!");
						process.exit(1);
					}
					console.log("operation complete!");
					process.exit();
				});
			});
		});
	}

	var client_id = data.Item.ClientID.S;
	var client_db = data.Item.Database.S;
	console.log("Importing to " + data.Item.ClientName.S);
	var s3Info = parse_s3_url(process.argv[3]);
	var raw_source;
	if (s3Info === false) {
		raw_source = JSON.parse(fs.readFileSync(process.argv[3]));
		doImport();
	} else {
		s3.getObject(s3Info, function (err, data) {
			if (err) {
				console.log("Could not get that file from S3\n");
				console.log(err);
				process.exit();
			} else {
				raw_source = JSON.parse(data.Body.toString());
				doImport();
			}
		})
	}

});
