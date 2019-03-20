module.exports = {
    "Conditions": {
        "CreateRedshiftResources": {
            "Fn::Equals": [
                {
                    "Ref": "AddRedshift"
                },
                "yes"
            ]
        },
        "RedshiftIsMultiNode": {
            "Fn::Not": [
                {
                    "Fn::Equals": [
                        {
                            "Ref": "RedshiftNumberOfNodes"
                        },
                        1
                    ]
                }
            ]
        },
        "CreateAuroraResources": {
            "Fn::Not": [
                {
                    "Fn::Equals": [
                        {
                            "Ref": "AuroraType"
                        },
                        "None"
                    ]
                }
            ]
        }
    },
    "Parameters": {
        "CognitoId": {
            "Type": "String",
            "Description": "Cognito Id used for request authentication"
        },
        "AuroraType": {
            "Description": "Aurora Cluster",
            "Default": "Postgres",
            "Type": "String",
            "AllowedValues": [
                "Postgres",
                "MySql",
                "None"
            ],
            "ConstraintDescription": "must specify Postgres, MySql, or None."
        },
        "AuroraNodeType": {
            "Type": "String",
            "Description": "Node type for Aurora (e.g., db.r4.large)",
            "Default": "db.r4.large",
            "AllowedValues": [
                "db.r4.large",
                "db.r4.xlarge",
                "db.r4.2xlarge",
                "db.r4.4xlarge",
                "db.r4.8xlarge",
                "db.r4.16xlarge"
            ],
            "ConstraintDescription": "must select valid Aurora node type (db.r4.large, db.r4.xlarge, db.r4.2xlarge, db.r4.4xlarge, db.r4.8xlarge, db.r4.16xlarge)"
        },
        "AddRedshift": {
            "Description": "Include Redshift Cluster",
            "Default": "yes",
            "Type": "String",
            "AllowedValues": [
                "yes",
                "no"
            ],
            "ConstraintDescription": "must specify yes or no."
        },
        "RedshiftNodeType": {
            "Type": "String",
            "Description": "Node type for Redshift (e.g., dc2.large)",
            "Default": "dc2.large",
            "AllowedValues": [
                "dc2.large",
                "dc2.8xlarge",
                "dc1.large",
                "dc1.8xlarge",
                "ds2.xlarge",
                "ds2.8xlarge"
            ],
            "ConstraintDescription": "must select valid Redshift node type (dc2.large, dc2.8xlarge, dc1.large, dc1.8xlarge, ds2.xlarge, or ds2.8xlarge)"
        },
        "RedshiftNumberOfNodes": {
            "Type": "Number",
            "Description": "The number of compute nodes in the Redshift cluster",
            "Default": 1,
            "AllowedValues": [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12,
                13,
                14,
                15,
                16,
                17,
                18,
                19,
                20,
                21,
                22,
                23,
                24,
                25,
                26,
                27,
                28,
                29,
                30,
                31,
                32
            ],
            "ConstraintDescription": "must select valid number of Redshift nodes (1-32)"
        },
        "CidrBlockPrefix": {
            "Description": "The prefix (first two octets) for the CIDR block for the VPC, subnets, and security groups (e.g., 10.172, 172.90, etc.)",
            "Default": "10.172",
            "Type": "String"
        },
        "CustomDBEndpoint": {
            "Description": "Custom database endpoint",
            "Type": "String"
        },
        "CustomDBType": {
            "Description": "Custom database type",
            "Default": "Postgres",
            "Type": "String",
            "AllowedValues": [
                "Postgres",
                "MySql",
                "None"
            ],
            "ConstraintDescription": "must specify Postgres, MySql, or None."
        },
        "DBUsername": {
            "Description": "Database User",
            "Type": "String"
        },
        "DBPassword": {
            "Description": "Database Password",
            "Type": "String",
            "NoEcho": true
        },
        "IngestSourceQueue": {
            "Default": "dw.load",
            "Description": "Source queue for the Ingest bot",
            "Type": "String"
        },
        "CustomCSS": {
            "Description": "Custom CSS for the DW web app",
            "Type": "String"
        },
        "CustomJS": {
            "Description": "Custom Javascript for the DW web app",
            "Type": "String"
        },
        "CustomFavicon": {
            "Description": "Custom Fav Icon for the DW web app",
            "Type": "String"
        }
    },
    "Outputs": {
        "Register": {
            "Description": "Leo Register Table Data",
            "Value": {
                "Fn::Sub": "${LeoDwInstall.Arn}"
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-Register"
                }
            }
        },
        "Region": {
            "Description": "DW Region",
            "Value": {
                "Fn::Sub": "${AWS::Region}"
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-Region"
                }
            }
        },
        "Fields": {
            "Description": "DW Fields Table",
            "Value": {
                "Fn::Sub": "${Fields}"
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-Fields"
                }
            }
        },
        "RedshiftAddress": {
            "Description": "Redshift Endpoint Address",
            "Value": {
                "Fn::GetAtt": [
                    "Redshift",
                    "Endpoint.Address"
                ]
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-RedshiftAddress"
                }
            }
        },
        "RedshiftPort": {
            "Description": "Redshift Endpoint Port",
            "Value": {
                "Fn::GetAtt": [
                    "Redshift",
                    "Endpoint.Port"
                ]
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-RedshiftPort"
                }
            }
        },
        "AuroraClusterAddress": {
            "Description": "Aurora Cluster Endpoint Address",
            "Value": {
                "Fn::GetAtt": [
                    "AuroraCluster",
                    "Endpoint.Address"
                ]
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-AuroraClusterAddress"
                }
            }
        },
        "AuroraClusterPort": {
            "Description": "Aurora Cluster Endpoint Port",
            "Value": {
                "Fn::GetAtt": [
                    "AuroraCluster",
                    "Endpoint.Port"
                ]
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-AuroraClusterPort"
                }
            }
        },
        "SecurityGroupId": {
            "Description": "Security Group Id",
            "Value": {
                "Fn::GetAtt": [
                    "Security",
                    "GroupId"
                ]
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-SecurityGroupId"
                }
            }
        },
        "LambdaSubnetA": {
            "Description": "Lambda Subnet A",
            "Value": {
                "Fn::Sub": "${LambdaSubnetA}"
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-LambdaSubnetA"
                }
            }
        },
        "LambdaSubnetB": {
            "Description": "Lambda Subnet B",
            "Value": {
                "Fn::Sub": "${LambdaSubnetB}"
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-LambdaSubnetB"
                }
            }
        },
        "LambdaSubnetC": {
            "Description": "Lambda Subnet C",
            "Value": {
                "Fn::Sub": "${LambdaSubnetC}"
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-LambdaSubnetC"
                }
            }
        },
        "DBUsername": {
            "Description": "Database Username",
            "Value": {
                "Fn::Sub": "${DBUsername}"
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-DBUsername"
                }
            }
        },
        "DBPassword": {
            "Description": "Database Encrypted Password",
            "Value": {
                "Fn::Sub": "${EncryptedPassword.Value}"
            },
            "Export": {
                "Name": {
                    "Fn::Sub": "${AWS::StackName}-DBPassword"
                }
            }
        }
    }
}