const config = require("leo-config");
const request = require("leo-auth");
const logger = require("leo-logger")("dw.reports");
const lib = require("./lib/util.js");

exports.handler = require("leo-sdk/wrappers/resource")(async function (event, context, callback) {

	let datasource = lib.wrapFunctions(await config.datasource);
	//await config.run;
	logger.time("prepare");
	let data = await lib.prepare(event.body);
	logger.timeEnd("prepare");

	logger.log(data);

	logger.time("auth");
	let user = await request.authorize(event, {
		lrn: 'lrn:leo:dw:::',
		action: "report",
		context: ["leo_dw_report"],
		dw: lib.authorizeData(data.options)
	});
	logger.timeEnd("auth");

	logger.time("preprocess");
	data = await lib.preprocess(datasource, data, user);
	logger.timeEnd("preprocess");

	logger.time("run");
	let response = await lib.run(datasource, data);
	logger.timeEnd("run");

	logger.time("postprocess");
	let result = await lib.postprocess(response, data);
	logger.timeEnd("postprocess");

	if (event.headers && "x-leo-accept-encoding" in event.headers) {
		callback(null, {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Content-Encoding': 'gzip'
			},
			body: zlib.gzipSync(JSON.stringify(result)).toString("base64"),
			isBase64Encoded: true
		});
	} else {
		callback(null, result);
	}
});
