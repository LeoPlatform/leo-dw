if (process.argv.length < 4) {
	console.error("Usage: node backup.js warehouse_id output_file");
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
	};
};

var send = {
	TableName: "Clients",
	Key: {
		ClientID: {
			S: process.argv[2]
		}
	}
};
dynamo.getItem(send, function (err, data) {
	if (err) {
		console.log(err);
		throw err;
	}
	var client_id = data.Item.ClientID.S;
	var client_db = data.Item.Database.S;
	console.log("Extracting " + data.Item.ClientName.S);

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
			var result = [];
			var prefix = new RegExp('^' + client_id + '-');
			for (var i = 0; i < docs.length; i++) {
				var mydoc = docs[i];
				mydoc._id = mydoc._id.replace(prefix, '');
				mydoc.table = mydoc.table.replace(prefix, '');
				result.push(mydoc);
			}
			var s3Info = parse_s3_url(process.argv[3]);
			if (s3Info === false) {
				fs.writeFileSync(process.argv[3], JSON.stringify(result));
				console.log("Files saved successfully");
				process.exit();
			} else {
				s3Info.Body = JSON.stringify(result);
				s3.putObject(s3Info, function (err, data) {
					if (!err) {
						console.log("File is now on S3");
					} else {
						console.warn(err);
					}
					process.exit();
				});
			}
		});
	});

});
