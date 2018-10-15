
var FieldsStore = require('../stores/FieldsStore');

module.exports = {

	_parsed: {},


	reset: function() {
		this._parsed = {}
	},


	_check: function(parsed) {
		var parsed = parsed || this._parsed;
		if (typeof parsed == 'string') {
			return this.parse(parsed);
		}
		return parsed;
	},


	parse: function(id) {
		var parsed = {}
		if (id) {
			if (typeof id == 'object') {
				//parsed = id
				id = id.id
				//delete parsed.id
			}
			if (id.slice(0, 3) == 'fx(' || id[0] == '(') {
				parsed[id.slice(0, id.lastIndexOf(')')+1)] = []
				id = id.slice(id.lastIndexOf(')')+1)
			}
			var parts = id.split('|')
			for(var i=0;i<parts.length;i++) {
				if (parts[i] != '') {
					if (parts[i].indexOf('!') != -1) {
						parts[i] = parts[i].split('!')[0]
					}
					var temp = parts[i].split(':')
					var name = temp.shift()
					if (typeof temp == 'object' && temp[0] && temp[0].indexOf(';') !== -1) {
						temp = temp[0].split(';')
					}
					parsed[name] = temp //.join(':')
				}
			}
		}
		this._parsed = parsed
		//console.log('parsed', id, parsed)
		return parsed
	},


	raw: function(parsed) {
		var parsed = this._check(parsed);
		var prop; for (prop in parsed) break;
		return prop;
	},


	parent: function(parsed) {
		var parsed = this._check(parsed);
		var raw = this.raw(parsed);
		if (raw.lastIndexOf('.') != -1) {
			return raw.slice(0, raw.lastIndexOf('.'));
		}
		return raw;
	},


	type: function(parsed) {
		var parsed = this._check(parsed);
		var raw = this.raw(parsed);
		if (!raw) {
			return false;
		} else if (parsed['lag']) {
			return 'fact';
		} else if (raw.slice(0, 2) == 'd_') {
			return (raw.indexOf('.') == -1) ? 'dimension' : 'attribute';
		} else {
			if (raw.slice(0, 3) == 'fx(' || raw[0] == '(') {
				return 'fx';
			}
			return (raw.indexOf('.') == -1) ? 'fact' : 'metric';
		}
	},


	aggregate: function(parsed) {
		var parsed = this._check(parsed);
		//var aggregates = ['sum', 'avg', 'min', 'max', 'band', 'percent', 'cumulative'];
		var aggregates = ['count', 'unique', 'sum', 'avg', 'min', 'max'];
		for(var i=0;i<aggregates.length;i++) {
			if (aggregates[i] in parsed) {
				return aggregates[i];
			}
		}
		return false;
	},


	/*
	advanced: function() {
		var parsed = this._check(parsed);
		var advances = ['band', 'percent', 'cumulative', 'rank'];
		for(var i=0;i<advances.length;i++) {
			if (advances[i] in parsed) {
				return advances[i];
			}
		}
		return false;
	},
	*/


	transforms: function() {
		var parsed = this._check(parsed);
		var all_transforms = ['band', 'percent', 'cumulative', 'rank', 'abs'];
		var transforms = [];
		for(var j in parsed) {
			if (all_transforms.indexOf(j) != -1) {
				var transform = {}
				transform[j] = parsed[j];
				transforms.push(transform);
			}
		}
		return transforms;
	},


	build: function(parsed, prepend) {
		var parsed = this._check(parsed);
		for(var j in prepend) {
			delete(parsed[j]);
		}

		if (parsed['label']) {
			var label = parsed['label'];
			delete(parsed['label']);
		} else if (prepend && prepend['label']) {
			var label = prepend['label'];
			delete(prepend['label']);
		} else {
			var label = false;
		}

		var joined = [];
		for(var i in parsed) {
			if (typeof parsed[i] == 'string' && parsed[i] != '') {
				parsed[i] = [parsed[i]]
			}
			if (i !== 'filter' || parsed[i].length !== 0) {
				joined.push(i + (parsed[i].length > 0 ? ':'+parsed[i].join(':') : ''));
			}
			for(var j in prepend) {
				if (prepend[j]) {
					joined.push(j + ':'+prepend[j]);
				}
				delete(prepend[j]);
			}
		}

		if (label) {
			joined.push('label:'+label);
		}

		return joined.join('|');
	},


	details: function(parsed) {
		var parsed = this._check(parsed);
		var raw = this.raw(parsed)
		if (raw) {
			if (raw.indexOf('date._id') > -1) {
				raw = raw.replace('date._id', 'date.id')
			}
			return FieldsStore.getColumnDetails(raw + (raw.indexOf('.') === -1 ? '.id' : '')) || FieldsStore.getColumnDetails(raw)
		}
		return undefined
	},


	isDate: function() {
		var parsed = this._check(parsed);
		var raw = this.raw(parsed).toLowerCase()
		return (raw.indexOf('date.id') > -1 || raw.indexOf('date._id') > -1 || raw.indexOf('date.date') !== -1)
	}

}
