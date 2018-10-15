
var moment = require('moment-timezone')

module.exports = {
	post: function (command, data, callback) {
        var l = {}
		if (!(typeof leo == 'undefined')) {
            l = leo || {};
        }

		data.timestamp = moment().tz(window.leo && window.leo.timezone ? window.leo.timezone : moment.tz.guess()).format()

        var config;
        if (l.postDefaults == "form"){
            config = {dataType:"json", contentType:"application/x-www-form-urlencoded", dataTransform:function(d){return d;}, cache:false}
        } else{
            config = $.extend({dataType:"json", contentType:"application/json", dataTransform:JSON.stringify, cache:false}, l.postDefaults);
        }

		$.ajax({
			type:     "post",
			data:     config.dataTransform(data),
			cache:    config.cache,
			url:      window.apiEndpoint + command,
			dataType: config.dataType,
			contentType: config.contentType,
			error: function(xhr, status, error) {
				if (xhr.responseText) {
					xhr = xhr.responseText
					try {
						xhr = JSON.parse(xhr)
					} catch(e) {
						xhr = { error: xhr }
					}
				}
				window.messageLogNotify('Error loading data from server', 'warning', xhr)
				callback(xhr);
			},
			success: function(res) {
				if (res.header) {
					callback(res.data);
				} else {
					if (command == 'report') {
						if (window.location.pathname.split('/').pop() == 'chart') {
							//localStorage.setItem('VisualExplorer.hash', JSON.stringify(window.location.hash))
						}
					}
					callback(res);
				}
			},
			complete: function(res, status) {
				if (command == 'report' && window.location.pathname.split('/').pop() == 'chart') {
					var history = JSON.parse(localStorage.getItem('VisualExplorer.history') || '[]')
					history.unshift({
						hash: window.location.hash,
						timestamp: Date.now(),
						status: status
					})
					history = history.slice(0, 10)
					localStorage.setItem('VisualExplorer.history', JSON.stringify(history))
				}
			}
		});

	}
};
