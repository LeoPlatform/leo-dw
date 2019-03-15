module.exports = {
	Resources: {
		"ApiRole": {
			"Properties": {
				"Policies": [
					undefined,
					{
						"PolicyName": "Leo_DW",
						"PolicyDocument": {
							"Version": "2012-10-17",
							"Statement": [{
									"Effect": "Allow",
									"Action": [
										"dynamodb:PutItem",
										"dynamodb:BatchWriteItem",
										"dynamodb:BatchGetItem",
										"dynamodb:GetItem",
										"dynamodb:UpdateItem",
										"dynamodb:GetRecords",
										"dynamodb:Query",
										"dynamodb:DeleteItem",
										"dynamodb:Scan",
										"dynamodb:GetShardIterator",
										"dynamodb:DescribeStream",
										"dynamodb:ListStreams"
									],
									"Resource": [{
											"Fn::Sub": "${Portals.Arn}"
										},
										{
											"Fn::Sub": "${Dashboards.Arn}"
										},
										{
											"Fn::Sub": "${Library.Arn}"
										},
										{
											"Fn::Sub": "${Shorturls.Arn}"
										},
										{
											"Fn::Sub": "${Fields.Arn}"
										}
									]
								},
								{
									"Effect": "Allow",
									"Action": [
										"ec2:CreateNetworkInterface",
										"ec2:DescribeNetworkInterfaces",
										"ec2:DetachNetworkInterface",
										"ec2:DeleteNetworkInterface"
									],
									"Resource": "*"
								}
							]
						}
					},
					{
						"PolicyName": "Leo_endpoint_create",
						"PolicyDocument": {
							"Version": "2012-10-17",
							"Statement": [{
								"Effect": "Allow",
								"Action": [
									"ec2:CreateVpcEndpoint",
									"route53:AssociateVPCWithHostedZone"
								],
								"Resource": "*"
							}]
						}
					}
				]
			}
		},
		"LoaderRole": {
			"Type": "AWS::IAM::Role",
			"Properties": {
				"AssumeRolePolicyDocument": {
					"Version": "2012-10-17",
					"Statement": [{
						"Effect": "Allow",
						"Principal": {
							"Service": [
								"redshift.amazonaws.com"
							]
						},
						"Action": "sts:AssumeRole"
					}]
				},
				"Policies": [{
					"PolicyName": "Load_S3_Files",
					"PolicyDocument": {
						"Version": "2012-10-17",
						"Statement": [{
							"Effect": "Allow",
							"Action": [
								"s3:GetObject",
								"s3:ListBucket",
								"s3:PutObject"
							],
							"Resource": {
								"Fn::Sub": [
									"arn:aws:s3:::${LeoS3}*",
									{
										"LeoS3": {
											"Fn::ImportValue": {
												"Fn::Sub": "${leosdk}-LeoS3"
											}
										}
									}
								]
							}
						}]
					}
				}]
			},
			"Metadata": {
				"AWS::CloudFormation::Designer": {
					"id": "4b6d2587-b510-4fbc-9a78-fd697a741d64"
				}
			}
		}
	}
}
