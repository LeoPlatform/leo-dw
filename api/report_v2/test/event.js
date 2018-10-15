module.exports = {

	body: {
		return_queries: false,
		"partitions": [],
		"dimensions": [],
		"metrics": [
			"f_lead|count"
		],
		"filters": [{
			"id": "f_lead.clint_test",
			"value": [
				"1"
			],
			"label": "Clint Test",
			"dimension": "Lead"
		}],
		"sort": [],
		"redshift": false
	},
	_body: {
		"partitions": ["d_desired_start_date.d_date.year"],
		"metrics": ["f_lead|count"],
		"filters": [],
		"sort": [{
			"column": 0,
			"direction": "asc"
		}],
		"redshift": true,
		"groups": [
			"d_desired_start_date.d_date.month_name",
			"dim_client2.state"
		]
	},
	_body: {
		"partitions": [],
		"metrics": ["f_lead|count"],
		"filters": [],
		"sort": [],
		"redshift": true,
		"groups": ["d_desired_start_date.d_date.year_month"]
	},
	_body: {
		"partitions": [],
		"groups": [
			"d_desired_start_date.d_date.month_name"
		],
		"metrics": ["f_lead|count"],
		"filters": [],
		"sort": []
	},
	"requestContext": {
		"accountId": '',
		"resourceId": '',
		"stage": 'DEV',
		'request-id': '',
		"identity": {
			"cognitoIdentityPoolId": null,
			"accountId": null,
			"_cognitoIdentityId": "us-east-1:b852a9fa-d493-4d9a-be6e-15c35fcf08bb",
			"s_cognitoIdentityId": "us-east-1:55642450-2217-4b46-8fef-747797c72d35",
			"r_cognitoIdentityId": "us-east-1:b852a9fa-d493-4d9a-be6e-15c35fcf08bb",
			"caller": null,
			"apiKey": null,
			"sourceIp": '67.207.40.96',
			"cognitoAuthenticationType": null,
			"cognitoAuthenticationProvider": null,
			"userArn": null,
			"userAgent": 'PostmanRuntime/2.4.5',
			"user": null,
			'source-ip': '67.207.40.96',
			"SourceIp": '67.207.40.96'
		},
		"resourcePath": '',
		"httpMethod": 'GET',
		"apiId": ''
	}
};
