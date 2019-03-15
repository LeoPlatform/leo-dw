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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
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
            }
        }
    }
}