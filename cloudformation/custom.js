module.exports = {
	Resources: {
		"EncryptedPassword": {
			"Type": "Custom::Install",
			"Properties": {
				"ServiceToken": {
					"Fn::Sub": "${LeoDwInstall.Arn}"
				},
				"Action": "encrypt",
				"Value": {
					"Ref": "DBPassword"
				},
				"Version": "1.5"
			},
			"DependsOn": [
				"LeoDwInstall"
			]
		},
		"RunBotsOnInstall": {
			"Type": "Custom::Install",
			"Properties": {
				"ServiceToken": {
					"Fn::Sub": "${LeoDwInstall.Arn}"
				},
				"Action": "trigger",
				"Value": [{
					"Fn::Sub": "${AWS::StackName}-leo_dw_dates"
				}]
			},
			"DependsOn": [
				"LeoDwInstall",
				"LeoDwDates",
				"LeoRegister"
			]
		},
		"KmsVpcEndpoint": {
			"Type": "Custom::Install",
			"Properties": {
				"ServiceToken": {
					"Fn::Sub": "${LeoDwInstall.Arn}"
				},
				"Action": "KmsEndpoint",
				"Value": {
					"VpcId": {
						"Ref": "VPC"
					},
					"SecurityGroupIds": [{
						"Ref": "Security"
					}],
					"SubnetIds": [{
							"Ref": "Subnet"
						},
						{
							"Ref": "Subnet2"
						}
					]
				},
				"Version": "1.0"
			},
			"DependsOn": [
				"LeoDwInstall"
			]
		},
		"KinesisVpcEndpoint": {
			"Type": "Custom::Install",
			"Properties": {
				"ServiceToken": {
					"Fn::Sub": "${LeoDwInstall.Arn}"
				},
				"Action": "KinesisEndpoint",
				"Value": {
					"VpcId": {
						"Ref": "VPC"
					},
					"SecurityGroupIds": [{
						"Ref": "Security"
					}],
					"SubnetIds": [{
							"Ref": "Subnet"
						},
						{
							"Ref": "Subnet2"
						}
					]
				},
				"Version": "1.1"
			},
			"DependsOn": [
				"LeoDwInstall"
			]
		},
		"DwKmsKey": {
			"Type": "AWS::KMS::Key",
			"Properties": {
				"Description": "DW KMS Key",
				"Enabled": true,
				"EnableKeyRotation": false,
				"KeyPolicy": {
					"Version": "2012-10-17",
					"Statement": [{
							"Sid": "Enable IAM User Permissions",
							"Effect": "Allow",
							"Principal": {
								"AWS": {
									"Fn::Sub": "arn:aws:iam::${AWS::AccountId}:root"
								}
							},
							"Action": "kms:*",
							"Resource": "*"
						},
						{
							"Sid": "Allow access for Key Administrators",
							"Effect": "Allow",
							"Principal": {
								"AWS": {
									"Fn::Sub": "arn:aws:iam::${AWS::AccountId}:root"
								}
							},
							"Action": [
								"kms:*"
							],
							"Resource": "*"
						},
						{
							"Sid": "Allow use of the key",
							"Effect": "Allow",
							"Principal": {
								"AWS": [{
										"Fn::Sub": "${ApiRole.Arn}"
									},
									{
										"Fn::Sub": "${LoaderRole.Arn}"
									}
								]
							},
							"Action": [
								"kms:Encrypt",
								"kms:Decrypt",
								"kms:ReEncrypt*",
								"kms:GenerateDataKey*",
								"kms:DescribeKey"
							],
							"Resource": "*"
						},
						{
							"Sid": "Allow attachment of persistent resources",
							"Effect": "Allow",
							"Principal": {
								"AWS": [{
										"Fn::Sub": "${ApiRole.Arn}"
									},
									{
										"Fn::Sub": "${LoaderRole.Arn}"
									}
								]
							},
							"Action": [
								"kms:CreateGrant",
								"kms:ListGrants",
								"kms:RevokeGrant"
							],
							"Resource": "*",
							"Condition": {
								"Bool": {
									"kms:GrantIsForAWSResource": "true"
								}
							}
						}
					]
				}
			}
		},
		"DwKmsKeyAlias": {
			"Type": "AWS::KMS::Alias",
			"Properties": {
				"AliasName": {
					"Fn::Sub": "alias/${AWS::StackName}-KmsKey"
				},
				"TargetKeyId": {
					"Ref": "DwKmsKey"
				}
			}
		}
	}
}