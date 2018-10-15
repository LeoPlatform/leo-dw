var leo = require("@leo-sdk/core/lib/test");

describe("local", function () {
	it("Should be able to read events from DynamoDB", function (done) {
		leo.mock.authorize(true);
		leo.invoke.lambda.api(require("../index.js"), {
			"body": "{\"weight_min\":0}",
			"params": {
				"path": {
					"client": "pscrems",
					"id": "123123"
				},
				"querystring": {},
				"header": {}
			}
		}, function (err, data) {
			if (err) throw err;

			console.log(data.fact, data.dimension);
			done();
		});
	});
});