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
	// body: {
	// 	"partitions": [],
	// 	"metrics": ["f_shipment|count"],
	// 	"locked": false,
	// 	"filters": [{
	// 		"id": "d_retailer.d_account.id",
	// 		"value": ["1000007328"],
	// 		"checkboxes": {"1000007328": true, "_": false},
	// 		"label": "Id",
	// 		"dimension": "Retailer"
	// 	}, {
	// 		"id": "d_order$d_first_invoice_created_at_date.d_date.is_valid",
	// 		"value": ["1"],
	// 		"checkboxes": {"1": true, "_": false},
	// 		"label": "Is Valid",
	// 		"dimension": "Invoice Date"
	// 	}, {
	// 		"id": "d_order$d_first_invoice_created_at_date.d_date.id",
	// 		"value": ["2018-07-26", "2018-07-29"],
	// 		"label": "Id",
	// 		"dimension": "Invoice Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [{"column": 8, "direction": "desc"}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_shipment.stated_carrier|concat: :d_shipment.stated_method|label: Shipping Method",
	// 		"direction": "asc"
	// 	},
	// 	"useMysql": false,
	// 	"groups": ["d_trading_partner.supplier_name|label:Vendor Name", "d_trading_partner.supplier_partner_id|label:Vendor Number", "d_order.po_number|label:PO Number", "d_shipment.tracking_number|label:Tracking Number", "d_order.ship_state|label:ShipTo State", "d_order.requested_ship_method|label:Ship Method", "d_order.ship_carrier|concat: :d_order.ship_method|label:Shipping Method", "d_order$d_retailer_created_at_date.d_date.date|label:Order Date", "d_order$d_first_invoice_created_at_date.d_date.date|label:Close Date", "d_order$d_expected_delivery_at_date.d_date.date|label:Expected Delivery Date", "d_order.ship_address1|label:ShipTo Address 1", "d_order.ship_address2|label:ShipTo Address 2", "d_shipment.status|label:Tracking Delivery Status"],
	// 	"redshift": true
	// }
	// _body: {
	// 	"partitions": [],
	// 	"metrics": ["f_order|count"],
	// 	"filters": [{
	// 		"id": "d_order$d_created_at_date.d_date.id",
	// 		"value": ["Today"],
	// 		"checkboxes": {
	// 			"Today": true
	// 		},
	// 		"label": "Date Range",
	// 		"dimension": "Order Created At Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [],
	// 	"redshift": false,
	// 	"groups": ["d_order$d_shipped_at_date.d_date.date|date:MM/DD/YY"]
	// },
	// _body: {
	// 	"partitions": [],
	// 	"metrics": ["f_order_item.quantity|sum|label:Quantity"],
	// 	"filters": [{
	// 		"id": "d_retailer.d_account.id",
	// 		"value": ["1000007328"],
	// 		"label": "Id",
	// 		"dimension": "Retailer"
	// 	}, {
	// 		"id": "d_order_item.substatus",
	// 		"value": ["created", "shipment_pending"],
	// 		"label": "Substatus",
	// 		"dimension": "Order Item"
	// 	}],
	// 	"sort": [],
	// 	"redshift": true,
	// 	"groups": [
	// 		"d_trading_partner.supplier_partner_id|label:Vendor ID",
	// 		"d_trading_partner.supplier_name|label:Vendor Name",
	// 		"d_order.po_number|label:PO Number",
	// 		"d_order.status|label:Order Status",
	// 		"d_order_item.substatus|label:Order Item Substatus",
	// 		"d_order$d_created_at_date.d_date.date|label:Insert Date",
	// 		"d_order$d_created_at_time.d_time.time_24|label:Insert Time",
	// 		"d_order$d_created_at_date.d_date.date|concat:  :d_order$d_created_at_time.d_time.time_24|label:Concat",
	// 		"d_order$d_retailer_created_at_date.d_date.date|label:Order Date",
	// 		"d_order$d_retailer_created_at_time.d_time.time_24|label:Order Time",
	// 		"d_order$d_expected_delivery_at_date.d_date.date|label:Expected Delivery Date",
	// 		"d_order.requested_ship_carrier|concat:  :d_order.requested_ship_method|label:Kohl's Ship Method",
	// 		"d_order.dsco_ship_carrier|concat:  :d_order.dsco_ship_method|label:Dsco Ship Method", "d_order.ship_postal|label:Ship to Post Code"
	// 	]
	// },
	// _body: {
	// 	"zip": true,
	// 	"partitions": [],
	// 	"metrics": ["f_shipment|count"],
	// 	"filters": [{
	// 		"id": "d_order$d_created_at_date.d_date.id",
	// 		"value": ["Yesterday"],
	// 		"label": "Date Range",
	// 		"dimension": "Order Created Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [],
	// 	"redshift": true,
	// 	"groups": ["d_shipment.tracking_number"]
	// },
	// _body: {
	// 	"partitions": [],
	// 	"metrics": ["f_order|count"],
	// 	"filters": [{
	// 		"id": "d_order$d_created_at_date.d_date.id",
	// 		"value": ["Yesterday"],
	// 		"checkboxes": {
	// 			"Today": true
	// 		},
	// 		"label": "Date Range",
	// 		"dimension": "Order Created At Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [],
	// 	"redshift": true,
	// 	"groups": ["d_order$d_created_at_date.d_date.date|label:WHAT|date-format:MM-DD-YY"]
	// },
	// _body: {
	// 	"partitions": [],
	// 	"metrics": [
	// 		"f_order_item|lag:days:d_order$d_shipped_at_date.d_date:d_order$d_created_at_date.d_date|max|f:numeric:0|label:Order Shipment Lag", "f_order_item.quantity|sum|label:Daily Demand Quantity", {
	// 			"id": "f_order_item.quantity|sum|label:Open Quantity",
	// 			"filters": [{
	// 				"id": "d_order_item.substatus",
	// 				"value": ["created", "shipment_pending"]
	// 			}]
	// 		},
	// 		"fx(f_order_item.cancelled_quantity|sum+f_order_item.rejected_quantity|sum)|label:Cancelled Quantity",
	// 		"fx(1 - (f_order_item.cancelled_quantity|sum + f_order_item.rejected_quantity|sum)/f_order_item.quantity)|f:percent|label:Fulfill Percent", "f_order|count"
	// 	],
	// 	"filters": [{
	// 		"id": "d_retailer.d_account.id",
	// 		"value": ["1000003564"],
	// 		"label": "Id",
	// 		"dimension": "Retailer"
	// 	}, {
	// 		"id": "d_order$d_created_at_date.d_date.id",
	// 		"value": ["2018-07-07", "2018-08-05"],
	// 		"label": "Date Range",
	// 		"dimension": "Order Created At Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [],
	// 	"redshift": true,
	// 	"advanced": {
	// 		"showTotals": true
	// 	},
	// 	"groups": ["d_order$d_created_at_date.d_date.date"]
	// },
	// _body: {
	// 	"redshift": true,
	// 	"reportId": "z-inventory-extract-2",
	// 	"params": {
	// 		"supplier_id": null,
	// 		"retailer_id": 1000007328,
	// 		"f_partner_id": null,
	// 		"f_vendor_sku": null,
	// 		"f_upc": null,
	// 		"f_ean": null,
	// 		"f_status": null,
	// 		"f_created_date": null,
	// 		"f_merchant_sku": null,
	// 		"f_partner_name": null
	// 	}
	// },
	// _body: {
	// 	"_partitions": [],
	// 	"_metrics": ["f_account|count"],
	// 	"_locked": false,
	// 	"_filters": [],
	// 	"_sort": [],
	// 	"_redshift": false,
	// 	"_groups": [],
	//
	// 	"partitions": [],
	// 	"metrics": ["f_order|count",
	// 		"f_order|lag:days:today:d_order$d_created_at_date.d_date|avg"
	// 	],
	// 	"locked": false,
	// 	"filters": [{
	// 		"id": "d_order$d_created_at_date.d_date.id",
	// 		"value": ["This Year"],
	// 		"label": "Order Created At Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [],
	// 	"redshift": true,
	// 	"groups": ["d_order$d_created_at_date.d_date.week_starting_date"]
	// },
	// _body: {
	// 	"poll": "report_1527279422787_924729.json",
	// 	"s3": "report_1527279422787_924729.json",
	// 	"partitions": [],
	// 	"metrics": ["f_order_item.qty|sum|label: Quantity Ordered"],
	// 	"locked": false,
	// 	"filters": [{
	// 		"id": "d_shipment.returned_flag",
	// 		"value": ["true"],
	// 		"checkboxes": {
	// 			"true": true
	// 		},
	// 		"label": "Returned Flag",
	// 		"dimension": "Shipment"
	// 	}, {
	// 		"id": "d_order$d_created_date.d_date.id",
	// 		"value": ["Last 2 Months-To-Date"],
	// 		"label": "Date Range",
	// 		"dimension": "Order Created Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 4,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 5,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 6,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 7,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 8,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_supplier.d_account.name|label: VENDOR",
	// 		"direction": "asc"
	// 	},
	// 	"useMysql": false,
	// 	"groups": ["d_supplier.d_account.name|label: Vendor", "d_order$d_created_date.d_date.date|label: Insert Date", "d_order.po_number|label: PO number", "d_order_item.line_number|label: Merchant Line Number", "d_item.upc|label: UPC", "d_item.ean|label: EAN", "d_order_item.Partner SKU|label: Merchant SKU", "d_order.status|label: Status", "d_order_item.substatus|label: Substatus", "d_shipment$d_return_date.d_date.date"],
	// 	"redshift": false
	// },
	// _body: {
	// 	"partitions": [],
	// 	"metrics": ["f_shipment_item|count", "f_order_item.qty|sum", "f_order_item.cost|sum", "f_order_item.consumer_price|sum"],
	// 	"locked": false,
	// 	"filters": [{
	// 		"id": "d_supplier.d_account.id",
	// 		"value": ["1000007352"],
	// 		"checkboxes": {
	// 			"1000007352": true,
	// 			"_": false
	// 		},
	// 		"label": "Id",
	// 		"dimension": "Supplier"
	// 	}, {
	// 		"id": "d_order$d_created_date.d_date.id",
	// 		"value": ["2018-03-01", "2018-03-01"],
	// 		"label": "Date Range",
	// 		"dimension": "Order Created Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 4,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 5,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 6,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 7,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 8,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 9,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 10,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 11,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 12,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 13,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 14,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 15,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 16,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 17,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 18,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 19,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 20,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 21,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_order.po_number|label: PO Number",
	// 		"direction": "asc"
	// 	},
	// 	"useMysql": false,
	// 	"groups": ["d_order.po_number|label: PO Number", "d_supplier.d_account.name|label: Vendor", "d_order$d_created_date.d_date.date|label: Insert Date", "d_order$d_created_time.d_time.time_24|label: Insert Time", "d_shipment.requested_carrier|label: Request Carrier", "d_shipment.requested_method|label: Request Method", "d_shipment.service_level", "d_order$d_expected_delivery_date.d_date.date|label: Expected Delivery Date", "d_order.item_count|label: Line Count", "d_shipment_item$d_item.upc|label: UPC", "d_shipment_item$d_item.ean|label: EAN", "d_order.status|label: Status", "d_order$d_invoice_date.d_date.date|label: Close Date", "d_order$d_invoice_time.d_time.time_24|label: Close Time", "d_order$d_shipped_date.d_date.date|label: Ship Date", "d_shipment.tracking_number|label: Tracking Number", "d_shipment$d_lasthub_date.d_date.date|label: Tracking Last Scan Date", "d_shipment$d_lasthub_time.d_time.time_24|label: Tracking Last Scan Time", "d_shipment.status|label: Tracking Delivery Status", "d_order.ship_city|label: ShipTo City", "d_order.ship_state|label: ShipTo State", "d_order.ship_postal|label: ShipTo Postal Code"],
	// 	"redshift": false
	// },
	// _body: {
	// 	"partitions": [],
	// 	"metrics": ["f_order|count",
	// 		"f_order|lag:days:today:d_order$d_created_at_date.d_date|avg"
	// 	],
	// 	"locked": false,
	// 	"filters": [{
	// 		"id": "d_order$d_created_at_date.d_date.id",
	// 		"value": ["This Year"],
	// 		"label": "Order Created At Date",
	// 		"comparison": "between"
	// 	}],
	// 	"sort": [],
	// 	"redshift": true,
	// 	"groups": ["d_order$d_created_at_date.d_date.week_starting_date"]
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_order|count",
	// 		//"1": "f_order|lag:hours:today:d_order$d_created_date.d_date:business|avg",
	// 		"1": "f_order|lag:hours:today:d_order$created_at_date.d_date|avg"
	// 	},
	// 	"groups": {
	// 		"0": "d_order$created_at_date.d_date.date"
	// 	},
	// 	"filters": [{
	// 		"id": "d_date.id",
	// 		"comparison": "between",
	// 		"value": ["Last 7 Days"],
	// 		"checkboxes": {
	// 			"Last 7 Days": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_order$d_created_date.d_date.date",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1526315906993,
	// 	"timestamp": "2018-05-14T10:38:26-06:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_account|count"
	// 	},
	// 	"groups": {},
	// 	"filters": [],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [],
	// 	"top": {
	// 		"limit": 2000
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1524866172175,
	// 	"timestamp": "2018-04-27T15:56:12-06:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_order|count"
	// 	},
	// 	"groups": {
	// 		"0": "d_order$d_created_at_date.d_date.date"
	// 	},
	// 	"filters": [],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_order$d_created_at_date.d_date.date",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1524865729969,
	// 	"timestamp": "2018-04-27T15:48:49-06:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_item|count"
	// 	},
	// 	"groups": {
	// 		"0": "d_supplier.d_account.id"
	// 	},
	// 	"filters": [],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_supplier.d_account.id",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1524855772972,
	// 	"timestamp": "2018-04-27T13:02:52-06:00"
	// },
	// orders_body: {
	// 	"metrics": {
	// 		"0": "f_order|count"
	// 	},
	// 	"groups": {
	// 		"0": "d_retailer.d_account.id",
	// 		"1": "d_supplier.d_account.id"
	// 	},
	// 	"filters": [],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_retailer.d_account.id",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1524848388310,
	// 	"timestamp": "2018-04-27T10:59:48-06:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_order|count"
	// 	},
	// 	"groups": {},
	// 	"filters": [],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [],
	// 	"top": {
	// 		"limit": 2000
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1524839256083,
	// 	"timestamp": "2018-04-27T08:27:36-06:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_order_item.qty|sum",
	// 		"1": "f_order_item.cancelled_qty|sum|label:Cancelled",
	// 		"2": "f_order_item.shipped_qty|sum|label:Shipped",
	// 		"3": "f_order_item.shipment_pending_qty|sum|label:Shipment Pending",
	// 		"4": "f_order_item.rejected_qty|sum|label:Rejected"
	// 	},
	// 	"groups": {
	// 		"0": "d_trading_partner.supplier_partner_id|label: Vendor ID",
	// 		"1": "d_trading_partner.supplier_name|label: Vendor",
	// 		"2": "d_order.po_number|label: PO Number",
	// 		"3": "d_order_item.Partner SKU|label: Merchant SKU",
	// 		"4": "d_order_item.reason|label: Cancel Reason",
	// 		"5": "d_order.ship_address1|label: Ship To Address1",
	// 		"6": "d_order$d_invoice_date.d_date.date|label: Close Date",
	// 		"7": "d_order_item.status|label: Status"
	// 	},
	// 	"filters": [{
	// 		"id": "d_order$d_created_date.d_date.id",
	// 		"comparison": "between",
	// 		"value": ["Yesterday"],
	// 		"checkboxes": {
	// 			"Yesterday": true,
	// 			"_": false
	// 		}
	// 	}, {
	// 		"id": "f_order_item.cancelled_qty",
	// 		"comparison": ">",
	// 		"value": ["0"],
	// 		"checkboxes": {
	// 			"0": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 8,
	// 		"direction": "desc"
	// 	}, {
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 4,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 5,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 6,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 7,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "f_order_item.rejected_qty|sum|label:Rejected",
	// 		"direction": "desc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1520870980236,
	// 	"timestamp": "2018-03-12T10:09:40-06:00"
	// },
	// _body: {
	// 	redshift: false,
	// 	reportId: "test-1",
	// 	params: {
	// 		"retailer_id": "1000007328",
	// 		"supplier_id": "1000007352"
	// 	}
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_lead|count"
	// 	},
	// 	"groups": {
	// 		"0": "d_community.state"
	// 	},
	// 	"filters": [],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_community.state",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1520641261042,
	// 	"timestamp": "2018-03-09T17:21:01-07:00"
	// },
	// _body: {
	// 	metrics: {
	// 		"0": "f_lead|count",
	// 		"1": "f_lead.min_bedrooms|avg"
	//
	// 	},
	// 	groups: {
	// 		"0": "d_desired_start_date.d_date.year",
	// 		"1": "d_community.state"
	// 	},
	// 	partitions: [],
	// 	redshift: true,
	// 	sort: []
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_shipment|count"
	// 	},
	// 	"groups": {
	// 		"0": "d_trading_partner.supplier_name|label: Vendor",
	// 		"1": "d_order.po_number|label: PO Number",
	// 		"2": "d_shipment.tracking_number|label: Tracking Number",
	// 		"3": "d_order.ship_state|label: ShipTo State",
	// 		"4": "d_order.request_method|label: Ship Method",
	// 		"5": "d_shipment.stated_carrier|concat: :d_shipment.stated_method|label: Shipping Method",
	// 		"6": "d_order$d_retailer_created_date.d_date.date|label: Order Date",
	// 		"7": "d_order$d_invoice_date.d_date.date|label: Close Date",
	// 		"8": "d_order$d_expected_delivery_date.d_date.date|label: Expected Delivery Date",
	// 		"9": "d_order.ship_address1|label: ShipTo Address 1",
	// 		"10": "d_order.ship_address2|label: ShipTo Address 2",
	// 		"11": "d_shipment.status|label: Tracking Delivery Status"
	// 	},
	// 	"filters": [{
	// 		"id": "d_retailer.d_account.id",
	// 		"value": ["1000003564"],
	// 		"checkboxes": {
	// 			"1000003564": true,
	// 			"_": false
	// 		}
	// 	}, {
	// 		"id": "d_order$d_created_date.d_date.id",
	// 		"comparison": "between",
	// 		"value": ["2018-02-01", "2018-02-01"],
	// 		"checkboxes": {
	// 			"2018-02-01": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 5,
	// 		"direction": "asc"
	// 	}, {
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 4,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 6,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 7,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 8,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 9,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 10,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 11,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_shipment.stated_carrier|concat: :d_shipment.stated_method|label: Shipping Method",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1519664484005,
	// 	"timestamp": "2018-02-26T10:01:24-07:00"
	// },
	// pivot_body: {
	// 	"pivots": {
	// 		"2": "Sub Status",
	// 		"3": "Sub Status",
	// 		"4": "Sub Status",
	// 		"5": "Sub Status"
	// 	},
	// 	"pivotDefaults": {
	// 		"Sub Status": "Accepted"
	// 	},
	// 	"metrics": {
	// 		"0": "f_order_item.qty|sum|label: Quantity Ordered",
	// 		"1": "f_order_item.expected_cost|sum|label: Unit Cost",
	// 		"2": "f_order_item.cancelled_qty|sum|label:Cancelled",
	// 		"3": "f_order_item.shipped_qty|sum|label:Shipped",
	// 		"4": "f_order_item.shipment_pending_qty|sum|label:Shipment Pending",
	// 		"5": "f_order_item.rejected_qty|sum|label:Rejected"
	// 	},
	// 	"groups": {
	// 		"0": "d_supplier.d_account.name|label: Vendor",
	// 		"1": "d_order.po_number|label: PO Number",
	// 		"2": "d_order_item.status|label: Status",
	// 		"3": "d_order$d_created_date.d_date.date|label: Insert Date",
	// 		"4": "d_order$d_invoice_date.d_date.date|label: Close Date",
	// 		"5": "d_order$d_invoice_time.d_time.time_24|label: Close Date/Time",
	// 		"6": "d_order_item.line_number|label: Order Line Number",
	// 		"7": "d_order_item.Partner SKU",
	// 		"8": "d_item.description|label: Description",
	// 		"9": "d_order_item.reason|label: Cancel Reason"
	// 	},
	// 	"filters": [{
	// 		"id": "d_supplier.d_account.id",
	// 		"value": ["1000005040"],
	// 		"checkboxes": {
	// 			"1000005040": true,
	// 			"_": false
	// 		}
	// 	}, {
	// 		"id": "d_date.id",
	// 		"comparison": "between",
	// 		"value": ["Last 30 Days"],
	// 		"checkboxes": {
	// 			"Last 30 Days": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 4,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 5,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 6,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 7,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 8,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 9,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_supplier.d_account.name|label: Vendor",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1519406435043,
	// 	"timestamp": "2018-02-23T10:20:35-07:00"
	// },
	// _body: {
	// 	"pivots": {
	// 		"f_order_item.shipped_qty|sum|label:Shipped": true,
	// 		"f_order_item.accepted_qty|sum|label:Accepted": true
	// 	},
	// 	"metrics": {
	// 		0: "f_order_item.shipped_qty|sum|label:Shipped",
	// 		1: "f_order_item.accepted_qty|sum|label:Accepted"
	// 	},
	// 	"groups": {
	// 		"0": "d_trading_partner.supplier_partner_id|label: Vendor ID",
	// 		"1": "d_trading_partner.supplier_name|label: Vendor",
	// 		"2": "d_order.po_number|label: PO Number",
	// 		"3": "d_order_item.Partner SKU|label: Merchant SKU",
	// 		"4": "d_order_item.reason|label: Cancel Reason",
	// 		"5": "d_order.ship_address1|label: Ship To Address1",
	// 		"6": "d_order$d_invoice_date.d_date.date|label: Close Date",
	// 		"7": "d_order_item.status|label: Substatus"
	// 	},
	// 	"filters": [{
	// 		"id": "d_supplier.d_account.id",
	// 		"value": ["1000005040"],
	// 		"checkboxes": {
	// 			"1000005040": true,
	// 			"_": false
	// 		}
	// 	}, {
	// 		"id": "d_order$d_created_date.d_date.id",
	// 		"comparison": "between",
	// 		"value": ["2018-02-18", "2018-02-19"],
	// 		"checkboxes": {
	// 			"2018-02-18": true,
	// 			"2018-02-19": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 8,
	// 		"direction": "desc"
	// 	}, {
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 4,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 5,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 6,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 7,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "f_order_item.shipped_qty|sum",
	// 		"direction": "desc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1519341536524,
	// 	"timestamp": "2018-02-22T16:18:56-07:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_order_item.qty|sum"
	// 	},
	// 	"groups": {
	// 		"0": "d_trading_partner.supplier_partner_id|label: Vendor ID",
	// 		"1": "d_trading_partner.supplier_name|label: Vendor",
	// 		"2": "d_order.po_number|label: PO Number",
	// 		"3": "d_order_item.Partner SKU|label: Merchant SKU",
	// 		"4": "d_order_item.reason|label: Cancel Reason",
	// 		"5": "d_order.ship_address1|label: Ship To Address1",
	// 		"6": "d_order$d_invoice_date.d_date.date|label: Close Date",
	// 		"7": "d_order_item.status|label: Substatus",
	// 		"8": "f_order_item.shipped_qty|string"
	// 	},
	// 	"filters": [{
	// 		"id": "d_supplier.d_account.id",
	// 		"value": ["1000005040"],
	// 		"checkboxes": {
	// 			"1000005040": true,
	// 			"_": false
	// 		}
	// 	}, {
	// 		"id": "d_order$d_created_date.d_date.id",
	// 		"comparison": "between",
	// 		"value": ["2018-02-18", "2018-02-19"],
	// 		"checkboxes": {
	// 			"2018-02-18": true,
	// 			"2018-02-19": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 8,
	// 		"direction": "desc"
	// 	}, {
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 4,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 5,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 6,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 7,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "f_order_item.shipped_qty|sum",
	// 		"direction": "desc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1519322609682,
	// 	"timestamp": "2018-02-22T11:03:29-07:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_order_item.accepted_qty|sum",
	// 		"1": "f_order_item.cancelled_qty|sum",
	// 		"2": "f_order_item.rejected_qty|sum"
	// 	},
	// 	"groups": {
	// 		"0": "d_order_item.sku"
	// 	},
	// 	"filters": [],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_order_item.sku",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1518650356768,
	// 	"timestamp": "2018-02-14T16:19:16-07:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_order|count"
	// 	},
	// 	"groups": {
	// 		"0": "d_trading_partner.supplier_partner_id|label: Vendor ID",
	// 		"1": "d_supplier.d_account.name|label: Vendor Name",
	// 		"2": "d_order.po_number|label: PO Number",
	// 		"3": "d_order.status|label: Status",
	// 		"4": "d_order.request_carrier|concat: :d_order.request_method|label: Shipping Code",
	// 		"5": "d_order$d_retailer_created_date.d_date.date|label: Customer Order Date",
	// 		"6": "d_order$d_created_date.d_date.date|label: Insert Date",
	// 		"7": "d_order$d_invoice_date.d_date.date|label: Close Date",
	// 		"8": "d_order$d_expected_delivery_date.d_date.date|label: Expected Delivery Date",
	// 		"9": "d_order.TS_Created"
	//
	// 	},
	// 	"filters": [{
	// 		"id": "d_supplier.d_account.id",
	// 		"value": ["1000005040"],
	// 		"checkboxes": {
	// 			"1000005040": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 13,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 14,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 15,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 16,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 4,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 5,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 6,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 7,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 12,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 8,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 9,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 10,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 11,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_trading_partner.supplier_partner_id|label: Vendor ID",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1518642049927,
	// 	"timestamp": "2018-02-14T14:00:49-07:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_order_item|count"
	// 	},
	// 	"groups": {
	// 		"0": "d_order$d_expected_delivery_date.d_date.date",
	// 		"1": "d_item.sku",
	// 		"2": "d_order_item.line_number",
	// 		"3": "d_order.suborder_id|join:d_shipment:suborder_id:_ts_delivered"
	// 	},
	// 	"filters": [{
	// 		"id": "d_date.id",
	// 		"comparison": "between",
	// 		"value": ["Today"],
	// 		"checkboxes": {
	// 			"Today": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 1,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 2,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}, {
	// 		"column": 3,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_order$d_expected_delivery_date.d_date.date",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1516917106818,
	// 	"timestamp": "2018-01-25T14:51:46-07:00"
	// },
	// _body: {
	// 	"metrics": {
	// 		"0": "f_item|count"
	// 	},
	// 	"groups": {
	// 		"0": "d_item.id|join:~-1000000001:d_partner_item:id:sku~$sku|join:~-1000000001:d_partner_item:id:sku~$sku",
	// 		"1": "d_item.sku"
	// 	},
	// 	"filters": [{
	// 		"id": "d_item.id",
	// 		"value": ["1028107254"],
	// 		"checkboxes": {
	// 			"1028107254": true,
	// 			"_": false
	// 		}
	// 	}],
	// 	"partitions": [],
	// 	"redshift": true,
	// 	"sort": [{
	// 		"column": 0,
	// 		"direction": "asc",
	// 		"auto": true
	// 	}],
	// 	"top": {
	// 		"limit": 2000,
	// 		"field": "d_item.sku",
	// 		"direction": "asc"
	// 	},
	// 	"showMissingDims": [],
	// 	"uid": 1516818206875,
	// 	"timestamp": "2018-01-24T11:23:26-07:00"
	// }
};