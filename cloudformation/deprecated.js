module.exports = {
	Resources: {
		"DWStateMachineRole": {
			"Type": "AWS::IAM::Role",
			"Properties": {
				"AssumeRolePolicyDocument": {
					"Version": "2012-10-17",
					"Statement": [
						{
							"Effect": "Allow",
							"Principal": {
								"Service": [
									{
										"Fn::Join": [
											"",
											[
												"states.",
												{
													"Ref": "AWS::Region"
												},
												".amazonaws.com"
											]
										]
									}
								]
							},
							"Action": [
								"sts:AssumeRole"
							]
						}
					]
				},
				"Policies": [
					{
						"PolicyName": "Leo_invoker",
						"PolicyDocument": {
							"Version": "2012-10-17",
							"Statement": [
								{
									"Effect": "Allow",
									"Action": [
										"lambda:InvokeFunction"
									],
									"Resource": "*"
								}
							]
						}
					}
				]
			}
		},

	}
};
