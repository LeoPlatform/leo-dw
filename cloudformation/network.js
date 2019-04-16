module.exports = {
	Resources: {
		"RedshiftClusterSubnetGroup": {
			"Type": "AWS::Redshift::ClusterSubnetGroup",
			"Properties": {
				"Description": "Cluster subnet group",
				"SubnetIds": [
					{
						"Ref": "Subnet"
					}
				]
			},
			"DependsOn": ["Subnet"]
		},
		"VPC": {
			"Type": "AWS::EC2::VPC",
			"Properties": {
				"CidrBlock": {
					"Fn::Sub": "${CidrBlockPrefix}.0.0/16"
				},
				"EnableDnsHostnames": true,
				"Tags": [
					{
						"Key": "Name",
						"Value": {
							"Fn::Sub": "${AWS::StackName}-VPC"
						}
					}
				]
			}
		},
		"InternetGateway": {
			"Type": "AWS::EC2::InternetGateway",
			"Properties": {
				"Tags": [
					{
						"Key": "Name",
						"Value": {
							"Fn::Sub": "${AWS::StackName}-Gateway"
						}
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"AttachInternetGateway": {
			"Type": "AWS::EC2::VPCGatewayAttachment",
			"Properties": {
				"VpcId": {
					"Ref": "VPC"
				},
				"InternetGatewayId": {
					"Ref": "InternetGateway"
				}
			},
			"DependsOn": ["VPC", "InternetGateway"]
		},
		"RouteTable": {
			"Type": "AWS::EC2::RouteTable",
			"Properties": {
				"VpcId": {
					"Ref": "VPC"
				},
				"Tags": [
					{
						"Key": "Name",
						"Value": "Leo DW"
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"RedshiftRouteTable": {
			"Type": "AWS::EC2::RouteTable",
			"Properties": {
				"VpcId": {
					"Ref": "VPC"
				},
				"Tags": [
					{
						"Key": "Name",
						"Value": "Leo DW Redshift"
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"Subnet": {
			"Type": "AWS::EC2::Subnet",
			"Properties": {
				"CidrBlock": {
					"Fn::Sub": "${CidrBlockPrefix}.1.0/24"
				},
				"AvailabilityZone": {
					"Fn::Select": [
						"0",
						{
							"Fn::GetAZs": ""
						}
					]
				},
				"VpcId": {
					"Ref": "VPC"
				},
				"Tags": [
					{
						"Key": "Name",
						"Value": "Leo DW Redshift Subnet"
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"Subnet2": {
			"Type": "AWS::EC2::Subnet",
			"Properties": {
				"CidrBlock": {
					"Fn::Sub": "${CidrBlockPrefix}.2.0/24"
				},
				"AvailabilityZone": {
					"Fn::Select": [
						"1",
						{
							"Fn::GetAZs": ""
						}
					]
				},
				"VpcId": {
					"Ref": "VPC"
				},
				"Tags": [
					{
						"Key": "Name",
						"Value": "Leo DW Redshift Subnet"
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"RedshiftSubnetRouteMatch": {
			"Type": "AWS::EC2::SubnetRouteTableAssociation",
			"Properties": {
				"RouteTableId": {
					"Ref": "RedshiftRouteTable"
				},
				"SubnetId": {
					"Ref": "Subnet"
				}
			},
			"DependsOn": ["RedshiftRouteTable", "Subnet"]
		},
		"RedshiftSubnetRouteMatch2": {
			"Type": "AWS::EC2::SubnetRouteTableAssociation",
			"Properties": {
				"RouteTableId": {
					"Ref": "RedshiftRouteTable"
				},
				"SubnetId": {
					"Ref": "Subnet2"
				}
			},
			"DependsOn": ["RedshiftRouteTable", "Subnet2"]
		},
		"AuroraSubnetGroup": {
			"Type": "AWS::RDS::DBSubnetGroup",
			"Condition": "CreateAuroraResources",
			"Properties": {
				"DBSubnetGroupDescription": "Aurora subnet group.",
				"SubnetIds": [
					{
						"Ref": "Subnet"
					},
					{
						"Ref": "Subnet2"
					}
				]
			},
			"DependsOn": ["Subnet", "Subnet2"]
		},
		"Security": {
			"Type": "AWS::EC2::SecurityGroup",
			"Properties": {
				"GroupDescription": "Leo DW security Group",
				"SecurityGroupIngress": [
					{
						"CidrIp": {
							"Fn::Sub": "${CidrBlockPrefix}.0.0/16"
						},
						"FromPort": 5439,
						"IpProtocol": "tcp",
						"ToPort": 5439
					},
					{
						"CidrIp": {
							"Fn::Sub": "${CidrBlockPrefix}.0.0/16"
						},
						"FromPort": 3306,
						"IpProtocol": "tcp",
						"ToPort": 3306
					},
					{
						"CidrIp": {
							"Fn::Sub": "${CidrBlockPrefix}.0.0/16"
						},
						"FromPort": 5432,
						"IpProtocol": "tcp",
						"ToPort": 5432
					},
					{
						"CidrIp": {
							"Fn::Sub": "${CidrBlockPrefix}.0.0/16"
						},
						"FromPort": 443,
						"IpProtocol": "tcp",
						"ToPort": 443
					},
					{
						"CidrIp": {
							"Fn::Sub": "${CidrBlockPrefix}.0.0/16"
						},
						"FromPort": 80,
						"IpProtocol": "tcp",
						"ToPort": 80
					}
				],
				"VpcId": {
					"Ref": "VPC"
				},
				"Tags": [
					{
						"Key": "Name",
						"Value": "Leo DW Security Group"
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"LambdaSubnetA": {
			"Type": "AWS::EC2::Subnet",
			"Properties": {
				"CidrBlock": {
					"Fn::Sub": "${CidrBlockPrefix}.101.0/24"
				},
				"AvailabilityZone": {
					"Fn::Select": [
						"2",
						{
							"Fn::GetAZs": ""
						}
					]
				},
				"VpcId": {
					"Ref": "VPC"
				},
				"Tags": [
					{
						"Key": "Name",
						"Value": "Leo DW Lambda Subnet"
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"LambdaSubnetRouteMatchA": {
			"Type": "AWS::EC2::SubnetRouteTableAssociation",
			"Properties": {
				"RouteTableId": {
					"Ref": "RouteTable"
				},
				"SubnetId": {
					"Ref": "LambdaSubnetA"
				}
			},
			"DependsOn": ["RouteTable", "LambdaSubnetA"]
		},
		"LambdaSubnetB": {
			"Type": "AWS::EC2::Subnet",
			"Properties": {
				"CidrBlock": {
					"Fn::Sub": "${CidrBlockPrefix}.102.0/24"
				},
				"AvailabilityZone": {
					"Fn::Select": [
						"1",
						{
							"Fn::GetAZs": ""
						}
					]
				},
				"VpcId": {
					"Ref": "VPC"
				},
				"Tags": [
					{
						"Key": "Name",
						"Value": "Leo DW Lambda Subnet"
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"LambdaSubnetRouteMatchB": {
			"Type": "AWS::EC2::SubnetRouteTableAssociation",
			"Properties": {
				"RouteTableId": {
					"Ref": "RouteTable"
				},
				"SubnetId": {
					"Ref": "LambdaSubnetB"
				}
			},
			"DependsOn": ["RouteTable","LambdaSubnetB"]
		},
		"LambdaSubnetC": {
			"Type": "AWS::EC2::Subnet",
			"Properties": {
				"CidrBlock": {
					"Fn::Sub": "${CidrBlockPrefix}.103.0/24"
				},
				"AvailabilityZone": {
					"Fn::Select": [
						"0",
						{
							"Fn::GetAZs": ""
						}
					]
				},
				"VpcId": {
					"Ref": "VPC"
				},
				"Tags": [
					{
						"Key": "Name",
						"Value": "Leo DW Lambda Subnet"
					}
				]
			},
			"DependsOn": ["VPC"]
		},
		"LambdaSubnetRouteMatchC": {
			"Type": "AWS::EC2::SubnetRouteTableAssociation",
			"Properties": {
				"RouteTableId": {
					"Ref": "RouteTable"
				},
				"SubnetId": {
					"Ref": "LambdaSubnetC"
				}
			},
			"DependsOn": ["RouteTable","LambdaSubnetC"]
		},
		"DynamodbEndpoint": {
			"Type": "AWS::EC2::VPCEndpoint",
			"Properties": {
				"PolicyDocument": {
					"Statement": [
						{
							"Action": "*",
							"Effect": "Allow",
							"Resource": "*",
							"Principal": "*"
						}
					]
				},
				"RouteTableIds": [
					{
						"Ref": "RouteTable"
					},
					{
						"Ref": "RedshiftRouteTable"
					}
				],
				"ServiceName": {
					"Fn::Sub": "com.amazonaws.${AWS::Region}.dynamodb"
				},
				"VpcId": {
					"Ref": "VPC"
				}
			},
			"DependsOn": ["VPC", "RouteTable", "RedshiftRouteTable"]
		},
		"S3Endpoint": {
			"Type": "AWS::EC2::VPCEndpoint",
			"Properties": {
				"PolicyDocument": {
					"Statement": [
						{
							"Action": "*",
							"Effect": "Allow",
							"Resource": "*",
							"Principal": "*"
						}
					]
				},
				"RouteTableIds": [
					{
						"Ref": "RouteTable"
					},
					{
						"Ref": "RedshiftRouteTable"
					}
				],
				"ServiceName": {
					"Fn::Sub": "com.amazonaws.${AWS::Region}.s3"
				},
				"VpcId": {
					"Ref": "VPC"
				}
			},
			"DependsOn": ["VPC","RouteTable","RedshiftRouteTable"]
		}
	}
};
