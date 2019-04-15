var math = require('mathjs');
var expression_match = /([a-zA-Z][a-zA-Z0-9_.:|\#\$]*|'[^']*')/g;

function prepare_scope(raw, mycount) {
	var result = {};
	for (var i = 0; i < mycount; i++) {
		result['var' + String(i)] = (raw[i] === null || raw[i] === undefined) ? 0 : parseInt(raw[i]);
	}
	return result;
}

module.exports = {
	parse : function(derived) {
		return {
			fields : derived.expression.match(expression_match).map(function(s) {
				return s.trim().replace(/'/g, "");
			})
		};
	},
	transform : function(derived, mapping, data, columns) {
		var index = mapping[derived.id];
		var string = derived.expression;
		var mylength = Object.keys(mapping).length;
		var replacements = string.match(expression_match).map(function(s) {
			s = s.trim();
			string = string.replace(s, "var" + mapping[s]);
		});
		var code = math.compile(string);
		var results = [];
		for (var i = 0; i < data.length; i++) {
			try {
				data[i][index] = code.eval(prepare_scope(data[i], mylength));
				if (!isFinite(data[i][index])) data[i][index] = null;
			} catch (e) {
				console.log(e);
				return [];
			}
		}
		return results;
	}
};
