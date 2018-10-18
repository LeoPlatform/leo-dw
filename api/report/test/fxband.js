module.exports = {
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
	},
	body: {
		"partitions": [],
		"metrics": [
			"f_lead|count",
			"f_lead|filter:f_lead.min_bedrooms>1|count",
			"f_lead|filter:f_lead.min_bedrooms<=1|count",
			"fx(f_lead|filter:f_lead.min_bedrooms>1|count/f_lead|count)",
			"fx(f_lead|filter:f_lead.min_bedrooms>1|count/f_lead|count)|band:<=0.3;Fail,>0.3;Pass",
			"fx(f_lead|filter:f_lead.min_bedrooms<=1|count/f_lead|count)",
			"fx(f_lead|filter:f_lead.min_bedrooms<=1|count/f_lead|count)|band:<=0.3;Fail,>0.3;Pass",
			//"fx(f_lead|filter:f_lead.min_bedrooms>1|count/f_lead|count)",
			//"fx(f_lead|filter:f_lead.min_bedrooms>0|count/f_lead|count)"
			//"fx(f_lead|filter:f_lead.min_bedrooms>1|count/f_lead|count)|band:<=0.10;Fail,.11-.3;OK,>0.3;Pass"
			//"f_lead|filter:f_lead.min_bedrooms>1|count",
			//"fx(f_lead|filter:f_lead.min_bedrooms>1|count/f_lead|count)|band:<=0.3;Fail,>0.3;Pass"
			//"f_lead|filter:d_lead.state='Arizona'|count"
		],
		"filters": [],
		"sort": [],
		"redshift": false,
		"return_queries": true,
		"dimensions": [
			"d_lead.state",
			//"fx(f_lead|filter:d_lead.state='Arizona'|count/f_lead|count)|label:Shipped Percent"
		]
	}
};
