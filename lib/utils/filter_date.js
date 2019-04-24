var mysql = require('../report/mysql.js');
var redshift = require('../report/redshift.js').escape;
var getGroups = require('./parse_date.js').getGroups;
var getLagDate = require('./parse_date.js').getLagDate;
var util = require('util');
var moment = require('moment');
var async = require("async");
require('moment-range');



function relative_date(filter,field,customer,callback) {
	//For now, just look for the @ symbol and return as a noop if it's not present.
  
	var funcs = [];
	if(typeof filter.value != "object") filter.value = [filter.value];
	var err;
	filter.value.forEach(function(firstValue,i) {
		funcs.push(function(resolve) {
			if(firstValue.indexOf("@") == -1 || filter.comparison == "sql") return resolve();
			var comparison = "=";
			if(filter.comparison) comparison = filter.comparison.trim();
			if(['>',">=","<","<=","=","!="].indexOf(comparison) == -1) return;
			firstValue = firstValue.trim().toLowerCase();
      
			var groups = getGroups(firstValue);
			if(!groups.func) {
				err = "Could not parse "+firstValue;
				return resolve();
			}
			if(!groups.fieldName) {
				groups.fieldName = 'id';
			}
			var todayId;
			switch(groups.func.toLowerCase()) {
			case "today":
				console.log("got time: ",new Date().getTime());
				todayId = getLagDate(new Date().getTime());
				break;
			case "yesterday":
				var d = new Date();
				d.setDate(d.getDate() - 1);
				todayId = getLagDate(d.getTime());
				break;
			case "tomorrow":
				var d = new Date();
				d.setDate(d.getDate() + 1);
				todayId = getLagDate(d.getTime());
				break;
			case "date":
				todayId = getLagDate(groups.funcParams);
				break;
			default:
				err = "Did not recognize "+groups.func+" on "+firstValue;
				return resolve();
			}
			var table = field.field.ltable;
      
			mysql.queryForValue(table,todayId,groups.fieldName,customer,function(result) {
				if(result.length) {
					filter.value[i] = result[0][groups.fieldName];
					resolve();
				}
			});
		});
	});
	async.parallelLimit(funcs,2,function() {
		callback(err);
	});
  
}

function fillRange(myRange) {
	for(var i = 0;i < myRange.length;i++) {
		myRange[i] = moment(myRange[i]);
	}
	var range = moment.range(myRange);
	var acceptedDates = [];
	range.by('days',function(thisDay) {
		acceptedDates.push(thisDay.format('YYYY-MM-DD'));
	});
	return acceptedDates;
}

function local_tests() {
	return {
		getGroups:getGroups,
		getLagDate:getLagDate
	};
  
}
if(require.main === module) local_tests();

module.exports = {
	relative_date : relative_date,
	fillRange :  fillRange,
	local_tests : local_tests
};
