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
        }
    }
}