'use strict';
let fs = require("fs");
let path = require("path");
let merge = require("lodash.merge");

let externalConfigPath = path.resolve(process.env.externalConfigPath || ".", "../config/dw/leo_config.js");
let externalConfig = {};
if (fs.existsSync(externalConfigPath)) {
	externalConfig = require(externalConfigPath);
}

async function doDecrypt(kms, value) {
	if (value != undefined && value.match(/^KMS:/)) {
		value = await kms.decrypt(value.replace(/^KMS:/, ""));
	}
	return value;
}
module.exports = merge({
	/**defaults applied to every system**/
	_global: {
		run: (async function (cache) {
			const leoaws = require('leo-aws')(require("leo-sdk").configuration);
			if (process.env.DBPassword) {
				process.env.DBPassword = await doDecrypt(leoaws.kms, process.env.DBPassword);
			}
			if (process.env.DBRedshiftPassword) {
				process.env.DBRedshiftPassword = await doDecrypt(leoaws.kms, process.env.DBRedshiftPassword);
			}
			if (process.env.DBAuroraPassword) {
				process.env.DBAuroraPassword = await doDecrypt(leoaws.kms, process.env.DBAuroraPassword);
			}
			if (process.env.DBCustomPassword) {
				process.env.DBCustomPassword = await doDecrypt(leoaws.kms, process.env.DBCustomPassword);
			}
			return (a => a);
		}),
		datasource: (async function (cache) {
			await this.run();
			var redshiftConfig = process.env.RedshiftEndpoint && {
				user: process.env.DBUsername,
				password: process.env.DBRedshiftPassword || process.env.DBPasswordKMS || process.env.DBPassword,
				endpoint: process.env.RedshiftEndpoint,
				type: "Postgres",
				version: "redshift"
			};
			var auroraConfig = process.env.AuroraEndpoint && {
				user: process.env.DBUsername,
				password: process.env.DBAuroraPassword || process.env.DBPasswordKMS || process.env.DBPassword,
				endpoint: process.env.AuroraEndpoint,
				type: process.env.AuroraType,
				version: "aurora"
			};
			var customConfig = process.env.CustomDBEndpoint && {
				user: process.env.DBUsername,
				password: process.env.DBCustomPassword || process.env.DBPasswordKMS || process.env.DBPassword,
				endpoint: process.env.CustomDBEndpoint,
				type: process.env.CustomDBType,
				version: "aurora"
			};

			return require("./api/report_v2/lib/dwPostgresDS")(
				require("./lib/connections").parse(customConfig || auroraConfig));
		}),
		deletedColumn: "_deleted",
		leoauth: process.env.leoauthsdk && JSON.parse(process.env.leoauthsdk).resources,
		leosdk: process.env.leosdk && JSON.parse(process.env.leosdk).resources,
		Resources: process.env.Resources && JSON.parse(process.env.Resources),
		CustomDBEndpoint: process.env.CustomDBEndpoint,
		AuroraEndpoint: process.env.AuroraEndpoint,
		AuroraType: process.env.AuroraType,
		CustomDBType: process.env.CustomDBType,
		DBPassword: process.env.DBPassword,
		DBUsername: process.env.DBUsername,
		RedshiftEndpoint: process.env.RedshiftEndpoint,
		ui: {
			CustomFavicon: "//cdnleo.s3.amazonaws.com/logos/leo_icon.png",
			staticAssets: "https://CLOUDFRONT_LINK_TO_STATIC_ASSETS/leo_dw"
		}
	},
	_local: {
		leoaws: {
			profile: 'default',
			region: 'us-west-2'
		}
	}
}, externalConfig);
