"use strict";
var request = require("leo-auth");
var fields = require("../../lib/fields.js");
const util = require("util");

exports.handler = require("leo-sdk/wrappers/resource")(async (event, context, callback) => {
	return request.authorize(event, {
		lrn: 'lrn:leo:dw:::{resource}',
		action: "listFields",
		dw: {
			resource: "fields/"
		}
	}).then(async user => {
		return util.promisify(fields.getTableAndFields)({
			fieldsFromConfig: event.params.querystring.redshift == "false"
		}).then(r => {
			callback(null, r);
		});
	});
});
