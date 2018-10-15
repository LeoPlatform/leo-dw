module.exports = {
    Resources: {
        "InstallFields": {
            "Type": "Custom::Install",
            "Properties": {
                "ServiceToken": {
                    "Fn::Sub": "${LeoDwInstall.Arn}"
                },
                "Action": "fields",
                "Value": [
                    {
						"identifier": "d_date",
						"isDateDimension":true,
                        "isDimension": true,
                        "label": "Date",
                        "structure": {
                            "business_days_left_in_month": {
                                "default": 0,
                                "label": "Business Days Left In Month",
                                "type": "integer"
                            },
                            "d_id": {
                                "default": 0,
                                "label": " Id",
                                "sk": true,
                                "type": "integer"
                            },
                            "date": {
                                "default": " ",
                                "label": "Date",
                                "type": "varchar(13)"
                            },
                            "day_of_month": {
                                "default": 0,
                                "label": "Day Of Month",
                                "type": "integer"
                            },
                            "day_of_week_name": {
                                "default": " ",
                                "label": "Day Of Week Name",
								"type": "varchar(12)",
								"sort": {
									"type": "enum",
									"values": [
									  "Sunday",
									  "Monday",
									  "Tuesday",
									  "Wednesday",
									  "Thursday",
									  "Friday",
									  "Saturday"
									]
								  }
                            },
                            "day_of_week_number": {
                                "default": 0,
                                "label": "Day Of Week Number",
                                "type": "integer"
                            },
                            "days_left_in_month": {
                                "default": 0,
                                "label": "Days Left In Month",
                                "type": "integer"
                            },
                            "description": {
                                "default": " ",
                                "label": "Description",
                                "type": "varchar(15)"
                            },
                            "id": {
                                "default": " ",
                                "label": "Id",
                                "nk": true,
                                "type": "varchar(12)"
                            },
                            "is_valid": {
                                "default": false,
                                "label": "Is Valid",
                                "type": "boolean"
                            },
                            "month_ending_date": {
                                "default": " ",
                                "label": "Month Ending Date",
                                "type": "varchar(13)"
                            },
                            "month_name": {
                                "default": " ",
                                "label": "Month Name",
								"type": "varchar(12)",
								"sort": {
									"type": "enum",
									"values": [
										"January",
										"February",
										"March",
										"April",
										"May",
										"June",
										"July",
										"August",
										"September",
										"October",
										"November",
										"December"
									]
								}
                            },
                            "month_number": {
                                "default": 0,
                                "label": "Month Number",
                                "type": "integer"
                            },
                            "quarter": {
                                "default": 0,
                                "label": "Quarter",
                                "type": "integer"
                            },
                            "week_ending_date": {
                                "default": " ",
                                "label": "Week Ending Date",
                                "type": "varchar(13)"
                            },
                            "week_number": {
                                "default": 0,
                                "label": "Week Number",
                                "type": "integer"
                            },
                            "weekday_indicator": {
                                "default": " ",
                                "label": "Weekday Indicator",
                                "type": "varchar(10)"
                            },
                            "year": {
                                "default": " ",
                                "label": "Year",
                                "type": "varchar(7)"
                            },
                            "year_month": {
                                "default": " ",
                                "label": "Year Month",
								"type": "varchar(17)",
								"sort": {
									"order": [
									  {
										"group": 1,
										"type": "int"
									  },
									  {
										"group": 2,
										"type": "enum",
										"values": [
										  "January",
										  "February",
										  "March",
										  "April",
										  "May",
										  "June",
										  "July",
										  "August",
										  "September",
										  "October",
										  "November",
										  "December"
										]
									  }
									],
									"pattern": "(\\d+) (.*)",
									"type": "pattern"
								  }
                            },
                            "year_quarter": {
                                "default": " ",
                                "label": "Year Quarter",
                                "type": "varchar(10)"
                            },
                            "year_week": {
                                "default": " ",
                                "label": "Year Week",
                                "type": "varchar(18)"
                            }
                        },
                        "type": "dimension"
                    },
                    {
                        "identifier": "d_time",
						"isTimeDimension":true,
                        "isDimension": true,
                        "label": "Time",
                        "structure": {
                            "am_pm": {
                                "default": " ",
                                "label": "Am Pm",
                                "type": "varchar(6)"
                            },
                            "d_id": {
                                "default": 0,
                                "label": " Id",
                                "sk": true,
                                "type": "integer"
                            },
                            "hour": {
                                "default": 0,
                                "label": "Hour",
                                "type": "integer"
                            },
                            "hour_24": {
                                "default": 0,
                                "label": "Hour 24",
                                "type": "integer"
                            },
                            "id": {
                                "default": " ",
                                "label": "Id",
                                "nk": true,
                                "type": "varchar(15)"
                            },
                            "is_valid": {
                                "default": false,
                                "label": "Is Valid",
                                "type": "boolean"
                            },
                            "minute": {
                                "default": 0,
                                "label": "Minute",
                                "type": "integer"
                            },
                            "second": {
                                "default": 0,
                                "label": "Second",
                                "type": "integer"
                            },
                            "time": {
                                "default": " ",
                                "label": "Time",
                                "type": "varchar(11)"
                            },
                            "time_24": {
                                "default": " ",
                                "label": "Time 24",
                                "type": "varchar(11)"
                            }
                        },
                        "type": "dimension"
                    }
                ],
                "Version": "2.0.1"
            },
            "DependsOn": [
                "LeoDwInstall"
            ]
        }
    }
}