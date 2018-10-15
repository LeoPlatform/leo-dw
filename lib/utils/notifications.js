var aws = require('aws-sdk');
var config = require("../../config.json");

var SNS = new aws.SNS();
var reportingSystems = {};

module.exports = function (system) {
	if (!(system in reportingSystems)) {
		reportingSystems[system] = createReportingSystem(system);
	}
	return reportingSystems[system];
};

function createReportingSystem(system, subsystem) {
	var my = {};
	var that = {
		system: system,
		subsystem: subsystem,
		alert: function (severity, message, subject, callback) {
			subject = subject || "Error";
			if (!config.testbox) {
				SNS.publish({
					Message: "\n\n\n" + config.server_name + " ERROR: \n\n" + message + "\n\n", // required
					Subject: config.server_name + ' : ' + subject,
					TopicArn: 'arn:aws:sns:us-east-1:134898387190:Errors'
				}, function (err, data) {
					console.log(err, data);
					callback();
				});
			} else {
				console.log("Would have sent SNS", config.server_name + ' : ' + subject);
				callback();
			}
		}
	};
	return that;
}
