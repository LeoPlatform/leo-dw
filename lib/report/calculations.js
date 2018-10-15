var calculations;

module.exports = {
	calculations: calculations,
	getCalcField: function (field, selectAlias, parentAlias) {
		var fieldCalc = calculations.base(field);

		fieldCalc.selectAlias = "c_" + selectAlias;
		fieldCalc.parentAlias = parentAlias;

		var wrap = function (funcName, oldFunc, newFunc) {
			fieldCalc[funcName] = function () {
				var newArguments = [oldFunc];
				for (var i = 0; i < arguments.length; ++i) {
					newArguments.push(arguments[i]);
				}
				return newFunc.apply(fieldCalc, newArguments);
			};
			fieldCalc[funcName].wrap = function (newFunc) {
				wrap(funcName, fieldCalc[funcName], newFunc);
			};
		};
		var wrapConcat = function (funcName, oldFunc, newFunc) {
			fieldCalc[funcName] = function () {
				return newFunc.apply(fieldCalc, arguments).concat(oldFunc.apply(fieldCalc, arguments));
			};
			fieldCalc[funcName].wrap = function (newFunc) {
				wrapConcat(funcName, fieldCalc[funcName], newFunc);
			};
		};

		[
			'mysqlField',
			'redshiftField',
			'replaceVariables',
			'postProcess',
			'preProcess',
			'setField'
		].forEach(function (funcName) {
			wrap(funcName, function () {}, fieldCalc[funcName]);
		});
		fieldCalc.fieldWrap = function (func) {
			fieldCalc.mysqlField.wrap(func);
			fieldCalc.redshiftField.wrap(func);
		};

		[
			'getReplacementVariables'
		].forEach(function (funcName) {
			wrapConcat(funcName, function () {}, fieldCalc[funcName]);
		});

		fieldCalc.parsed.calcs.forEach(function (calc) {
			if (!calc.calcOptions) {
				calc.calcOptions = [];
			}
			calculations[calc.calcId].call(fieldCalc, calc.calcOptions);
		});
		return fieldCalc;
	}
};

calculations = {
	base: require("./calculations/base.js"),

	count: require("./calculations/count.js"),
	unique: require("./calculations/unique.js"),
	sum: require("./calculations/sum.js"),
	avg: require("./calculations/avg.js"),
	max: require("./calculations/max.js"),
	min: require("./calculations/min.js"),
	band: require("./calculations/band.js"),
	filter: require("./calculations/filter.js"),

	abs: require("./calculations/abs.js"),
	running: require("./calculations/running.js"),

	//attribute calculatuions
	string: require("./calculations/string.js"),
	lag: require("./calculations/lag.js"),

	group: require("./calculations/group.js"),
	label: require("./calculations/label.js"),
	f: require("./calculations/format.js"),
	format: require("./calculations/format.js"),

	percentage: require("./calculations/percentage.js"),
	percent: require("./calculations/percentage.js"),
	cumulative: require("./calculations/cumulative.js"),
	rank: require("./calculations/rank.js"),

	//virtual
	//vcalc : require("./calculations/vcalc.js"),
	fx: require("./calculations/fx.js"),
	concat: require("./calculations/concat.js"),
	display: require("./calculations/display.js"),
	join: require("./calculations/join.js"),
	date: require("./calculations/dateFormat.js")("date"),
	'date-format': require("./calculations/dateFormat.js")("date"),
	timestamp: require("./calculations/dateFormat.js")("timestamp"),
	'timestamp-format': require("./calculations/dateFormat.js")("timestamp")
};