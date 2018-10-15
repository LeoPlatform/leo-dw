var leo = require("@leo-sdk/core/lib/test");
var configure = require("@leo-sdk/core/leoConfigure");

describe("local", function () {
	it("Should be able to read events from DynamoDB", function (done) {
		this.timeout(60000);
		leo.invoke.lambda.api(require("../index.js"), {
			"body": {
				"metrics": {
					"0": "f_webship.margin|sum",
				},
				"groups": {
					"0": "d_customer$d_first_webship_date.d_date.year_month"
				},
				"partitions": ["f_webship.margin|lag:days:d_shipped_date.d_date:d_customer$d_first_webship_date.d_date|band:<0,0-30,30-60,60-90,90-120,120+"],
				"redshift": false,
				"sort": [],
				"top": {
					"limit": 2000
				},
				"showMissingDims": [],
				"apikey": "78599896-2db7-4457-ada3-61b389f342f7",
				"uid": 1486054328597,
				"timestamp": "2017-02-02T20:13:57-07:00"
			},
			"params": {
				"path": {},
				"querystring": {},
				"header": {}
			},
			"stage-variables": {},
			"context": {
				"account-id": "842137980019",
				"api-id": "78f9ltyjx3",
				"api-key": "test-invoke-api-key",
				"authorizer-principal-id": "",
				"caller": "AIDAJMDYKGLZNKNYYMS7Y",
				"cognito-authentication-provider": "",
				"cognito-authentication-type": "",
				"cognito-identity-id": "",
				"cognito-identity-pool-id": "",
				"http-method": "PUT",
				"stage": "test-invoke-stage",
				"source-ip": configure.test.users.default["source-ip"] || "127.0.0.1",
				"user": "AIDAJMDYKGLZNKNYYMS7Y",
				"user-agent": "Apache-HttpClient/4.3.4 (java 1.5)",
				"user-arn": "arn:aws:iam::842137980019:user/slyon",
				"request-id": "test-invoke-request",
				"resource-id": "1ivls4",
				"resource-path": "/settings/{client}/{id}"
			}
		}, function (err, data) {
			if (err) throw err;
			console.log("data is ");
			console.log(data);
			done();
		});
	});
});