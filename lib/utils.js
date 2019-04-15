var dynamodb = require("leo-sdk").aws.dynamodb;
var mysql = require("./report/mysql.js");

module.exports = {
	getId: function (type, name, id) {
		name = name.toLowerCase().trim();
		id = id.toString().toLowerCase().trim();
		if (type == "fact") {
			return "f_" + name + "-" + id;
		} else {
			name = name.split(/:/)[0];
			return "d_" + name + "-" + id;
		}
	},
	startsWithUpper: function (string) {
		var char = string.charAt(0);

		if (char !== char.toLowerCase() && char != '_') {
			return true;
		} else {
			return false;
		}
	},

	checkApiKey: function (apiKey, callback) {
		if (apiKey) {
			mysql.setDatabase(null);
			dynamodb.get("Apikeys", apiKey, {
				id: "Apikey"
			}, function (err, data) {
				if (err || !data) {
					console.log("Unable to Lookup ApiKey", apiKey, err);
					callback("Couldn't not find apikey:" + apiKey);
				} else {
					dynamodb.get("Clients", data.ClientID, {
						id: "ClientID"
					}, function (err2, data2) {
						if (!err && data2.Database) {
							mysql.setDatabase(data2.Database);
							callback(err, data2);
						} else {
							callback(err, data2);
						}
					});
				}
			});
		} else {
			callback();
		}
	}
};
