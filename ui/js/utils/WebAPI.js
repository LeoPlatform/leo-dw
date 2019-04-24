
var moment = require('moment-timezone');

var credentials = require('../credentials.js');

var apiEndpoint = credentials.apiEndpoint;
var apikey = credentials.apiKey;

var lastUID = {};

module.exports = {

	getKey: function() {
		return apikey;
	},

	setEndpoint: function(endpoint, key) {
		apiEndpoint = endpoint.replace(/\/*$/, '') + "/";
		apikey = key;
	},

	setKey: function(newkey) {
		apikey = newkey;
	},

	get: function(command, callback) {
		var sep = (command.indexOf("?") === -1) ? "?" : "&";
		lastUID[command] = new Date().valueOf();
		var data = sep + "apikey=" + apikey + "&uid=" + lastUID[command];
		$.get(apiEndpoint + command + data, function(res) {
			if (!res.uid || (lastUID[command] != 0 && res.uid >= lastUID[command])) {
				if (res.header) {
					callback(res.data);
				} else {
					callback(res);
				}
				lastUID[command] = 0;
			}
		}, 'json').fail(function(xhr, textStatus, errorThrown) {
			if (lastUID[command] != 0) {
				console.log(xhr.responseText);
			}
		});
	},

	post: function(command, data, callback) {

		lastUID[command] = new Date().valueOf();
		data.apikey = apikey;
		data.uid = lastUID[command];
		data.timestamp = moment().tz(window.leo && window.leo.timezone ? window.leo.timezone : moment.tz.guess()).format();
		$.ajax({
			type:     "post",
			data:     JSON.stringify(data),
			cache:    false,
			url:      apiEndpoint + command,
			dataType: 'json',
			contentType: 'application/json',
			error: function(xhr, status, error) {
				if (xhr.responseText) {
					xhr = xhr.responseText;
					try {
						xhr = JSON.parse(xhr);
					} catch(e) {
						xhr = { error: xhr };
					}
				}
				if (lastUID[command] != 0) {
					callback(xhr);
				}
			},
			success: function(res) {
				if (!res.uid || (lastUID[command] != 0 && res.uid >= lastUID[command])) {
					if (res.header) {
						callback(res.data);
					} else {
						if (command == 'report') {
							//localStorage.setItem('DataExplorer.hash', JSON.stringify(window.location.hash))
						}
						callback(res);
					}
					lastUID[command] = 0;
				}
			},
			complete: function(res, status) {
				if (command == 'report') {
					var history = JSON.parse(localStorage.getItem('DataExplorer.history') || '[]');
					history.unshift({
						hash: window.location.hash,
						timestamp: Date.now(),
						status: status,
						statusText: res.statusText
					});
					history = history.slice(0, 10);
					localStorage.setItem('DataExplorer.history', JSON.stringify(history));
				}
			}
		});
	},

	'delete': function(command, callback) {
		var sep = (command.indexOf("?") === -1) ? "?" : "&";
		lastUID[command] = new Date().valueOf();
		var data = sep + "apikey=" + apikey + "&uid=" + lastUID[command];
		$.ajax({
			url: apiEndpoint + command + data,
			type: 'DELETE',
			success: function(res) {
				if (!res.uid || (lastUID[command] != 0 && res.uid >= lastUID[command])) {
					if (res.header) {
						callback(res.data);
					} else {
						callback(res);
					}
					lastUID[command] = 0;
				}
			},
			data: {},
			contentType: 'application/json'
		});
	},

	put: function(command, data, callback) {
		lastUID[command] = new Date().valueOf();
		data.apikey = apikey;
		data.uid = lastUID[command];
		$.ajax({
			url: apiEndpoint + command,
			type: 'PUT',
			data: JSON.stringify(data),
			success: function(res) {
				if (!res.uid || (lastUID[command] != 0 && res.uid >= lastUID[command])) {
					if (res.header) {
						callback(res.data);
					} else {
						callback(res);
					}
					lastUID[command] = 0;
				}
			},
			contentType: 'application/json'
		});
	}

};
