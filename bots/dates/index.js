"use strict";
exports.handler = require("leo-sdk/wrappers/cron")(async (event, context, callback) => {
	const config = require("leo-config");
	await config.run;

	const leo = require("leo-sdk");

	const ls = leo.streams;
	const async = require("async");
	const moment = require("moment");

	const connections = require("../../lib/connections");
	let primaryClientConfig = connections.getDefault();

	let client;
	if (primaryClientConfig.type === 'MySql') {
		client = require("leo-connector-mysql/lib/dwconnect.js")(primaryClientConfig);
	} else {
		client = require("leo-connector-postgres/lib/dwconnect.js")(primaryClientConfig);
	}

	const FIELDS_TABLE = require("leo-config").Resources.Fields;

	const ID = context.botId;
	const _auditdate = moment.utc().format();
	const _startdate = "1900-01-01 00:00:00";
	const _enddate = "9999-01-01 00:00:00";
	leo.aws.dynamodb.scan(FIELDS_TABLE, {}, (err, tables) => {
		if (err) {
			return callback(err);
		}
		let desiredConfig = {};
		tables.map(table => {
			desiredConfig[table.identifier] = table;
		});

		let tasks = [];

		tasks.push(done => {
			client.changeTableStructure({
				d_date: desiredConfig.d_date,
				d_time: desiredConfig.d_time
			}, function (err, results) {
				console.log(err);
				done(err);
			});
		});
		async.parallelLimit(tasks, 5, (err) => {
			if (err) {
				console.log(err);
				callback(err);
			}
			let tasks = [];
			tasks.push(done => {
				//let's make sure time has everything it should
				client.query(`select count(*) as count from d_time`, (err, result) => {
					if (err) return done(err);

					if (result[0].count < 86400) {

						let s = client.streamToTable("d_time");
						let start = moment().startOf('day');
						let end = moment().endOf('day');
						let id = 10000;

						s.write(Object.assign(timeObject(1, start), {
							id: 'Unknown'
						}));
						s.write(Object.assign(timeObject(2, start), {
							id: 'Not Yet'
						}));
						s.write(Object.assign(timeObject(3, start), {
							id: 'Invalid'
						}));
						while (start <= end) {
							s.write(timeObject(id++, start));
							start.add(1, 'second');
						}
						s.end(err => {
							done(err);
						});
					} else {
						done();
					}
				});
			});

			tasks.push(done => {
				//let's make sure time has everything it should
				client.query(`select count(*) as count from d_date`, (err, result) => {
					if (err) return done(err);

					if (result[0].count < 20000) {

						let s = client.streamToTable("d_date");
						let start = moment("1400-01-01").startOf('day');
						let end = moment("2200-01-01").startOf('day');
						let id = 10000;
						s.write(Object.assign(dateObject(1, start), {
							id: 'Unknown'
						}));
						s.write(Object.assign(dateObject(2, start), {
							id: 'Not Yet'
						}));
						s.write(Object.assign(dateObject(3, start), {
							id: 'Invalid'
						}));

						async.doWhilst((done) => {
							let pass = s.write(dateObject(id++, start));
							start.add(1, 'day');

							if (!pass) {
								s.once('drain', done);
							} else {
								process.nextTick(() => done());
							}
						}, () => {
							return start < end;
						}, (err) => {
							s.end(err => {
								done(err);
							});
						});
					} else {
						done();
					}
				});
			});
			async.series(tasks, (err, results) => {
				client.disconnect();
				callback(err);
			});
		});
	});

	function timeObject(id, date) {
		return {
			d_id: id++,
			id: date.format("HH:mm:ss"),
			am_pm: date.format("A"),
			hour: parseInt(date.format("h")),
			hour_24: parseInt(date.format("H")),
			minute: parseInt(date.format("m")),
			second: parseInt(date.format("s")),
			time: date.format("hh:mm:ss"),
			time_24: date.format("HH:mm:ss"),
			is_valid: id >= 10000,
			_auditdate: _auditdate,
			_startdate: _startdate,
			_enddate: _enddate,
			_current: true
		};

	}

	function dateObject(id, date) {
		var daysLeftInMonth = parseInt(date.clone().endOf('month').format("D")) - parseInt(date.format("D"));
		var fullWeeks = Math.floor(daysLeftInMonth / 7);
		var partialWeekDays = daysLeftInMonth % 7;
		var businessDaysLeftInMonth = daysLeftInMonth - (fullWeeks * 2) - (partialWeekDays < 6 ? 1 : 0);
		return {
			d_id: id,
			id: date.format("YYYY-MM-DD"),
			date: date.format("YYYY-MM-DD"),
			description: date.format("ll"),
			day_of_week_name: date.format("dddd"),
			day_of_week_number: parseInt(date.format("e")) + 1,
			day_of_month: parseInt(date.format("D")),
			week_ending_date: date.clone().endOf('week').format("YYYY-MM-DD"),
			month_ending_date: date.clone().endOf('month').format("YYYY-MM-DD"),
			month_name: date.format("MMMM"),
			month_number: parseInt(date.format("M")),
			year_month: date.format("YYYY MMMM"),
			quarter: parseInt(date.format("Q")),
			year_quarter: date.format("YYYY [Q]Q"),
			year: date.format("YYYY"),
			weekday_indicator: [0, 6].indexOf(date.format("e")) !== -1 ? 'Weekend' : 'Weekday',
			week_number: parseInt(date.format("w")),
			year_week: date.format("YYYY[,] wo [week]"),
			days_left_in_month: daysLeftInMonth,
			business_days_left_in_month: businessDaysLeftInMonth,
			is_valid: id >= 10000,
			_auditdate: _auditdate,
			_startdate: _startdate,
			_enddate: _enddate,
			_current: true
		};
	}
});