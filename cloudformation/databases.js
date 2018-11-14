module.exports = {
    Resources: {
        "Redshift": {
            "Type": "AWS::Redshift::Cluster",
            "Condition": "CreateRedshiftResources",
            "Properties": {
                "AllowVersionUpgrade": true,
                "AutomatedSnapshotRetentionPeriod": 7,
                "ClusterType": {
                    "Fn::If": ["RedshiftIsMultiNode", "multi-node", "single-node"]
                },
                "ClusterSubnetGroupName": {
                    "Ref": "RedshiftClusterSubnetGroup"
                },
                "DBName": "datawarehouse",
                "MasterUsername": {
                    "Ref": "DBUsername"
                },
                "MasterUserPassword": {
                    "Ref": "DBPassword"
                },
                "IamRoles": [
                    {
                        "Fn::Sub": "${LoaderRole.Arn}"
                    }
                ],
                "NodeType": {
                    "Ref": "RedshiftNodeType"
                },
                "NumberOfNodes": {
                    "Fn::If": [
                        "RedshiftIsMultiNode",
                        {
                            "Ref": "RedshiftNumberOfNodes"
                        },
                        {
                            "Ref": "AWS::NoValue"
                        }
                    ]
                },
                "PubliclyAccessible": false,
                "VpcSecurityGroupIds": [
                    {
                        "Ref": "Security"
                    }
                ]
            },
            "DependsOn": [
                "RedshiftClusterSubnetGroup"
            ]
        },
        "AuroraClusterParameterGroup": {
            "Type": "AWS::RDS::DBClusterParameterGroup",
            "Condition": "CreateAuroraResources",
            "Properties": {
                "Description": "CloudFormation Sample Aurora Cluster Parameter Group",
                "Family": "manfred9.6",
                "Parameters": {
                    "autovacuum": 0
                }
            }
        },
        "AuroraCluster": {
            "Type": "AWS::RDS::DBCluster",
            "Condition": "CreateAuroraResources",
            "Properties": {
                "Engine": {
                    "Fn::FindInMap": [
                        "ConnectionMap",
                        {
                            "Ref": "AuroraType"
                        },
                        "Engine"
                    ]
                },
                "Port": {
                    "Fn::FindInMap": [
                        "ConnectionMap",
                        {
                            "Ref": "AuroraType"
                        },
                        "Port"
                    ]
                },
                "MasterUsername": {
                    "Ref": "DBUsername"
                },
                "MasterUserPassword": {
                    "Ref": "DBPassword"
                },
                "DBSubnetGroupName": {
                    "Ref": "AuroraSubnetGroup"
                },
                "VpcSecurityGroupIds": [
                    {
                        "Ref": "Security"
                    }
                ],
                "BackupRetentionPeriod": 7,
                "DBClusterParameterGroupName": {
                    "Ref": "AuroraClusterParameterGroup"
                },
                "DatabaseName": "datawarehouse"
            },
            "DependsOn": [
                "AuroraSubnetGroup"
            ]
        },
        "AuroraInstance": {
            "Type": "AWS::RDS::DBInstance",
            "Condition": "CreateAuroraResources",
            "Properties": {
                "PubliclyAccessible": true,
                "Engine": {
                    "Fn::FindInMap": [
                        "ConnectionMap",
                        {
                            "Ref": "AuroraType"
                        },
                        "Engine"
                    ]
                },
                "DBClusterIdentifier": {
                    "Ref": "AuroraCluster"
                },
                "DBInstanceClass": "db.r4.large",
                "DBSubnetGroupName": {
                    "Ref": "AuroraSubnetGroup"
                }
            },
            "DependsOn": [
                "AuroraSubnetGroup"
            ]
        }
    }
}