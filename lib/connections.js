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

module.exports = {
	getPostgres: function () {
		let config = (customConfig && customConfig.type == "Postgres" && customConfig) || (auroraConfig && auroraConfig.type == "Postgres" && auroraConfig) || redshiftConfig || {};

		if (config.endpoint) {
			let parts = config.endpoint.match(/(.*?):([0-9]{4})\/(.*)$/);
			config = {
				"host": parts[1],
				"port": parseInt(parts[2]),
				"user": config.user,
				"password": config.password,
				"database": parts[3],
				"version": config.version,
				"type": config.type
			};
		}
		return config;
	},
	getMySql: function () {
		let mysqlConfig = (customConfig && customConfig.type == "MySql" && customConfig) || (auroraConfig && auroraConfig.type == "MySql" && auroraConfig) || {};
		if (mysqlConfig.endpoint) {
			let parts = mysqlConfig.endpoint.match(/(.*?):([0-9]{4})\/(.*)$/)
			mysqlConfig = {
				"host": parts[1],
				"port": parseInt(parts[2]),
				"user": mysqlConfig.user,
				"password": mysqlConfig.password,
				"database": parts[3],
				"version": mysqlConfig.version,
				"type": mysqlConfig.type
			};
		}

		return mysqlConfig;
	},
	getRedshift: function () {
		return this.parse(redshiftConfig || {});
	},
	getAurora: function () {
		return this.parse(auroraConfig || {});
	},
	getCustom: function () {
		return this.parse(customConfig || {});
	},
	getDefault: function () {
		return this.parse(customConfig || auroraConfig || redshiftConfig || {});
	},
	parse: function (config) {
		if (config.endpoint && config.type == "Postgres") {
			let parts = config.endpoint.match(/(.*?):([0-9]{4})\/(.*)$/);
			return {
				"host": parts[1],
				"port": parseInt(parts[2]),
				"user": config.user,
				"password": config.password,
				"database": parts[3],
				"version": config.version,
				"type": config.type
			};
		} else if (config.endpoint && config.type == "MySql") {
			let parts = config.endpoint.match(/(.*?):([0-9]{4})\/(.*)$/)
			return {
				"host": parts[1],
				"port": parseInt(parts[2]),
				"user": config.user,
				"password": config.password,
				"database": parts[3],
				"version": config.version,
				"type": config.type
			};
		} else {
			return config;
		}
	},
	equals: function (a, b) {
		if (a == b ||
			(
				a.host == b.host &&
				a.port == b.port &&
				a.database == b.database)
		) {
			return true;
		}
		return false;
	}
}