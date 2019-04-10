"use strict";

const https = require("https");
const url = require("url");
const AWS = require('aws-sdk');
const extend = require("extend");

const config = require("leo-config");
const FIELDS_TABLE = config.Resources.Fields;

exports.handler = (event, context, callback) => {
	function sendResponse(result) {
		var responseBody = JSON.stringify(result);
		var parsedUrl = url.parse(event.ResponseURL);
		var options = {
			hostname: parsedUrl.hostname,
			port: 443,
			path: parsedUrl.path,
			method: "PUT",
			headers: {
				"content-type": "",
				"content-length": responseBody.length
			}
		};

		var request = https.request(options, function (response) {
			console.log("Status code: " + response.statusCode);
			console.log("Status message: " + response.statusMessage);
			callback(null, result);
		});

		request.on("error", function (error) {
			console.log("send(..) failed executing https.request(..): " + error);
			callback(error);
		});
		request.write(responseBody);
		request.end();
	}

	process.on('uncaughtException', function (err) {
		console.log("Got unhandled Exception");
		console.log(err);
		sendResponse({
			Status: 'FAILED',
			Reason: 'Uncaught Exception',
			PhysicalResourceId: event.PhysicalResourceId,
			StackId: event.StackId,
			RequestId: event.RequestId,
			LogicalResourceId: event.LogicalResourceId
		});
	});

	event.PhysicalResourceId = event.LogicalResourceId;
	let steps = [];

	let actions = {
		encrypt: encrypt,
		decrypt: decrypt,
		fields: fields,
		KmsEndpoint: KmsEndpoint,
		KinesisEndpoint: KinesisEndpoint,
		trigger: trigger
	};

	let out = {};
	if (event.ResourceProperties.Action in actions) {
		steps.push(actions[event.ResourceProperties.Action](event, event.ResourceProperties.Name || "Value", fixTypes(event.ResourceProperties.Value), out));
	}

	Promise.all(steps).then(() => {
		console.log("Got success");
		sendResponse({
			Status: 'SUCCESS',
			PhysicalResourceId: event.PhysicalResourceId,
			StackId: event.StackId,
			RequestId: event.RequestId,
			LogicalResourceId: event.LogicalResourceId,
			Data: out
		});
	}).catch((err) => {
		console.log("Got error");
		console.log(err);
		sendResponse({
			Status: 'FAILED',
			Reason: 'it failed',
			PhysicalResourceId: event.PhysicalResourceId,
			StackId: event.StackId,
			RequestId: event.RequestId,
			LogicalResourceId: event.LogicalResourceId,
			Data: out
		});
	});
};

function KinesisEndpoint(event, key, data, out) {

	return new Promise((resolve, reject) => {

		if (data.VpcId && (event.RequestType === "Create" || event.RequestType === "Update")) {
			let ec2 = new AWS.EC2({
				region: config.Resources.Region,
			});

			ec2.createVpcEndpoint({
				ServiceName: `com.amazonaws.${config.Resources.Region}.kinesis-streams`,
				VpcId: data.VpcId,
				ClientToken: Date.now().toString(),
				PrivateDnsEnabled: true,
				SecurityGroupIds: data.SecurityGroupIds,
				SubnetIds: data.SubnetIds,
				VpcEndpointType: "Interface"
			}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					out[key] = result.VpcEndpoint.VpcEndpointId;
					event.PhysicalResourceId = result.VpcEndpoint.VpcEndpointId;
					resolve();
				}
			});
		} else {
			resolve();
		}
	});
}

function KmsEndpoint(event, key, data, out) {

	return new Promise((resolve, reject) => {

		if (data.VpcId && (event.RequestType === "Create" || event.RequestType === "Update")) {
			let ec2 = new AWS.EC2({
				region: config.Resources.Region,
			});

			ec2.createVpcEndpoint({
				ServiceName: `com.amazonaws.${config.Resources.Region}.kms`,
				VpcId: data.VpcId,
				ClientToken: Date.now().toString(),
				PrivateDnsEnabled: true,
				SecurityGroupIds: data.SecurityGroupIds,
				SubnetIds: data.SubnetIds,
				VpcEndpointType: "Interface"
			}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					out[key] = result.VpcEndpoint.VpcEndpointId;
					event.PhysicalResourceId = result.VpcEndpoint.VpcEndpointId;
					resolve();
				}
			});
		} else {
			resolve();
		}
	});
}

function encrypt(event, key, data, out) {
	return new Promise((resolve, reject) => {
		if (event.RequestType === "Create" || event.RequestType === "Update") {
			util.encryptString(data, (err, value) => {
				out[key] = value;
				!err ? resolve() : reject(err);
			});
		} else {
			resolve();
		}
	});
}

function decrypt(event, key, data, out) {
	return new Promise((resolve, reject) => {
		if (event.RequestType === "Create" || event.RequestType === "Update") {
			util.decryptString(data, (err, value) => {
				out[key] = value;
				!err ? resolve() : reject(err);
			});
		} else {
			resolve();
		}

	});
}

function trigger(event, key, ids, out) {
	if (event.RequestType === "Create") {
		if (!Array.isArray(ids)) {
			ids = [ids];
		}
		let leo = require("leo-sdk");
		let tasks = ids.map(id => {
			return new Promise((resolve, reject) => {
				if (!id) {
					// Skip any bad ids
					return resolve();
				}
				leo.bot.trigger({
					id: id
				}, (err) => {
					if (err)
						reject(err);
					else
						resolve();
				});
			});
		});
		return Promise.all(tasks);
	} else {
		Promise.resolve();
	}
}

function fields(event, key, tables, out) {
	if (event.RequestType === "Create" || event.RequestType === "Update") {
		if (!Array.isArray(tables)) {
			tables = [tables];
		}
		let tasks = tables.map(table => {
			return new Promise((resolve, reject) => {
				let id = table.identifier || table.id;
				delete table.id;
				if (!id) {
					return reject("identifier is required for tables");
				}
				util.merge(FIELDS_TABLE, id, table, {
					id: "identifier"
				}, (err, data) => {
					if (err) {
						reject();
					} else {
						resolve();
					}
				});
			});
		});
		return Promise.all(tasks);
	} else {
		Promise.resolve();
	}
}
let docClient = new AWS.DynamoDB.DocumentClient({
	region: config.Resources.Region,
	maxRetries: 2,
	convertEmptyValues: true,
	httpOptions: {
		agent: new https.Agent({
			ciphers: 'ALL',
			secureProtocol: 'TLSv1_method',
			// keepAlive: true
		})
	}
});
let numberRegex = /^\d+(?:\.\d*)?$/;
let boolRegex = /^(?:false|true)$/i;
let nullRegex = /^null$/;
let undefinedRegex = /^undefined$/;

function fixTypes(node) {
	let type = typeof node;
	if (Array.isArray(node)) {
		for (let i = 0; i < node.length; i++) {
			node[i] = fixTypes(node[i]);
		}
	} else if (type == "object" && node !== null) {
		Object.keys(node).map(key => {
			node[key] = fixTypes(node[key]);
		});
	} else if (type == "string") {
		if (numberRegex.test(node)) {
			return parseFloat(node);
		} else if (boolRegex.test(node)) {
			return node.toLowerCase() == "true";
		} else if (nullRegex.test(node)) {
			return null;
		} else if (undefinedRegex.test(node)) {
			return undefined;
		}
	}

	return node;
}

let util = {
	decryptString: function (value, done) {
		let kms = new AWS.KMS({
			region: config.Resources.Region,
		});

		if (typeof value == "string") {
			value = {
				CiphertextBlob: new Buffer(value, 'base64')
			};
		} else {
			value.CiphertextBlob = new Buffer(value.CiphertextBlob, 'base64');
		}

		kms.decrypt(value, function (err, data) {
			console.log("kms.decrypt Plaintext?", data);
			if (err) {
				return done(err);
			} else {
				done(null, data.Plaintext.toString('ascii'));
			}
		});
	},
	encryptString: function (value, done) {
		let kms = new AWS.KMS({
			region: config.Resources.Region,
		});
		console.log("encryptString value?", value);
		if (typeof value == "string") {
			value = {
				KeyId: config.Resources.DwKmsKey,
				Plaintext: value
			};
		}
		kms.encrypt(value, function (err, data) {
			if (err) {
				return done(err);
			} else {
				done(null, data.CiphertextBlob.toString("base64"));
			}
		});
	},
	get: function (table, id, opts, callback) {
		if (!callback) {
			callback = opts;
			opts = {};
		}
		docClient.get({
			TableName: table,
			Key: {
				[opts.id || 'id']: id
			},
			ConsistentRead: true,
			"ReturnConsumedCapacity": 'TOTAL'
		}, function (err, data) {
			if (err) {
				console.log(err);
				callback(err);
			} else {
				callback(null, data.Item);
			}
		});
	},
	put: function (table, id, item, opts, callback) {
		if (!callback) {
			callback = opts;
			opts = {};
		}
		item[opts.id || 'id'] = id;
		docClient.put({
			TableName: table,
			Key: {
				[opts.id || 'id']: id
			},
			Item: item,
			"ReturnConsumedCapacity": 'TOTAL'
		}, function (err) {
			if (err) {
				console.log(err);
				callback(err);
			} else {
				callback(null, "Success");
			}
		});
	},

	merge: function (table, id, obj, opts, callback) {
		if (!callback) {
			callback = opts;
			opts = {};
		}
		this.get(table, id, opts, (err, data) => {
			if (err) {
				return callback(err);
			}
			var data = extend(true, data, obj);
			this.put(table, id, data, opts, callback);
		});
	}
};
