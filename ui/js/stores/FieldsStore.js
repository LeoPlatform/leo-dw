var LeoDispatcher = require('../dispatcher/LeoDispatcher');
var LeoConstants = require('../constants/LeoConstants');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var ActionTypes = LeoConstants.ActionTypes;
var CHANGE_EVENT = 'change';

var ReportStore = require('./ReportStore');

var _dimensions = [];
var _facts = [];
var _quickFilters = [];
var _factColumnLookup = {};
var _dimensionColumnLookup = {};
var _matches = [];
var _commonDimensions = [];
var _commonFacts = [];
var _dimsById = {};
var _autoFilters = {};


var _columnLookup = {};


var FieldsStore = assign({}, EventEmitter.prototype, {

	getColumnDetails: function(id) {
		return _columnLookup[id];
	},

	getFieldDimensions: function() {
		return _dimensions;
	},

	getFieldFacts: function() {
		return _facts;
	},

	getCommonFacts: function() {
		return _commonFacts;
	},

	getMatches: function() {
		return _matches;
	},

	getCommonDimensions: function() {
		return _commonDimensions;
	},

	deleteCommonDimensions: function() {
		//Common dimensions and common facts are alwasy going to be deleted together, so take care of both here:
		_commonDimensions = [];
		_commonFacts = [];
		this.emitChange();
	},

	getDimensionColumnLookup: function() {
		return _dimensionColumnLookup;
	},

	emitChange: function() {
		this.emit(CHANGE_EVENT);
	},

	addChangeListener: function(callback) {
		this.on(CHANGE_EVENT, callback);
	},

	removeChangeListener: function(callback) {
		this.removeListener(CHANGE_EVENT, callback);
	},

	getAutoFilters: function(fact) {
		return _autoFilters[fact];
	},


	searchFields: function(which, table, contains) {

		if (table && !contains) {
			if (which == 'dimension' || which == 'both' || which == 'filter') {
				if (table in _dimensionColumnLookup) {
					return _dimensionColumnLookup[table].attributes;
				}
			}

			if (which == 'metric' || which == 'both' || which == 'filter') {
				if (table in _factColumnLookup) {
					return _factColumnLookup[table].metrics;
				}
			}

			if (which == 'fact') {
				if (table in _factColumnLookup) {
					return [{ id:_factColumnLookup[table].id, label:_factColumnLookup[table].label, type:'fact' }];
				}
			}
		}

		var foundColumns = [], preferredColumns = [];

		contains = contains ? contains.split('|')[0] : false;
		contains = contains ? $.trim(contains).split(' ') : [];

		if (which == 'dimension' || which == 'both' || which == 'filter') {
			var dimensions = ((_commonDimensions.length > 0) ? _commonDimensions : _dimensions);

			for(var i=0;i<dimensions.length;i++) {
				var dimension = dimensions[i];

				//make a copy
				var attributes = JSON.parse(JSON.stringify(dimension.attributes));

				if (which == 'filter' && dimension.id && (dimension.id.indexOf('d_date') > -1)) {
					attributes.unshift({
						id: dimension.id+'.id',
						kind: 'date_range',
						label:'Date Range',
						parent:{
							id: dimension.id,
							label: dimension.label
						}
					});
				}

				if (dimension.has_outrigger) {
					for(var j=0;j<dimension.outriggers.length;j++) {
						var outrigger = dimension.outriggers[j];
						if (which == 'filter' && outrigger.id && (outrigger.id.indexOf('d_date') > -1)) {
							attributes.unshift({
								id: outrigger.id+'.id',
								kind: 'date_range',
								label:'Date Range',
								parent:{
									id: outrigger.id,
									label: outrigger.label
								}
							});
						}
						for(var k=0;k<outrigger.attributes.length;k++) {
							attributes.push({
								id: outrigger.attributes[k].id,
								label: outrigger.attributes[k].label,
								parent:{
									id: outrigger.id,
									label: outrigger.label
								}
							});
						}
					}
				}

				for(var j=0;j<attributes.length;j++) {
					var attribute = attributes[j];
					var passed = contains.every(function(value) {
						return (((attribute.parent.id || dimension.id) + '.' + attribute.id + ' ' + (attribute.parent.label || dimension.label) + ' ' + attribute.label + (attribute.description ? ' ' + attribute.description : '')).toLowerCase().indexOf(value.toLowerCase()) != -1);
					});
					if (passed) {
						if (!attribute.parent) {
							attribute.parent = {
								id: dimension.id,
								label: dimension.label
							};
						}

						if (
							contains.length > 1
							&& (
								(attribute.label+' '+(attribute.parent.label || dimension.label)).toLowerCase() == contains.join(' ').toLowerCase()
								|| ((attribute.parent.label || dimension.label)+' '+attribute.label).toLowerCase() == contains.join(' ').toLowerCase()
							)
						) {
							preferredColumns.unshift(attribute);
						} else if (contains.length == 1 && (attribute.parent.label || dimension.label).toLowerCase() == contains[0].toLowerCase()) {
							preferredColumns.push(attribute);
						} else if (table == attribute.parent.id) {
							preferredColumns.push(attribute);
						} else {

							var preferred = contains.length > 1 && contains.some(function(value) {
								return (
									((attribute.parent.label || dimension.label).toLowerCase().indexOf(value.toLowerCase()) != -1)
									&& (attribute.label.toLowerCase().indexOf(value.toLowerCase()) != -1)
								);
							});

							if (preferred) {
								preferredColumns.push(attribute);
							} else {
								foundColumns.push(attribute);
							}
						}
					}
				}
			}
		}

		if (which == 'date') {
			var dimensions = ((_commonDimensions.length > 0) ? _commonDimensions : _dimensions);
			for(var i=0;i<dimensions.length;i++) {
				var dimension = dimensions[i];
				if (dimension.id && (dimension.id.indexOf('d_date') !== -1)) {
					var passed = contains.every(function(value) {
						return (dimension.label.toLowerCase().indexOf(value.toLowerCase()) != -1);
					});
					if (passed) {
						foundColumns.push({ id:dimension.id, label:dimension.label, type: 'dimension' });
					}
				}
				if (dimension.has_outrigger) {
					for(var j=0;j<dimension.outriggers.length;j++) {
						var outrigger = dimension.outriggers[j];
						if (outrigger.id && (outrigger.id.indexOf('d_date') !== -1)) {
							var passed = contains.every(function(value) {
								return (outrigger.label.toLowerCase().indexOf(value.toLowerCase()) != -1);
							});
							if (passed) {
								foundColumns.push({ id:outrigger.id, label:outrigger.label, type: 'dimension' });
							}
						}
					}
				}
			}
		}

		if (which == 'metric' || which == 'both' || which == 'filter') {
			for(var i=0;i<_facts.length;i++) {
				var fact = _facts[i];

				//make a copy
				var metrics = JSON.parse(JSON.stringify(fact.metrics));

				if (which == 'metric') {
					metrics.unshift({
						id: fact.id+'|count',
						type: 'metric',
						label:'Count',
						kind: 'fact',
						parent:{
							id: fact.id,
							label: fact.label
						}
					});
				}

				for(var j=0;j<metrics.length;j++) {
					var metric = metrics[j];
					var passed = contains.every(function(value) {
						return ((fact.id + '.' + metric.id + ' ' + fact.label + ' ' + metric.label + (metric.description ? ' ' + metric.description : '')).toLowerCase().indexOf(value.toLowerCase()) != -1);
					});
					if (passed && metric.type == 'metric') {
						if (!metric.parent) {
							metric.parent = {
								id: fact.id,
								label: fact.label
							};
						}
						if (table == metric.parent.id) {
							preferredColumns.push(metric); //will never happen, but oh well
						} else {
							var preferred = contains.length > 1 && contains.some(function(value) {
								return (
									(fact.label.toLowerCase().indexOf(value.toLowerCase()) != -1)
									&& (metric.label.toLowerCase().indexOf(value.toLowerCase()) != -1)
								);
							});
							if (preferred) {
								preferredColumns.push(metric);
							} else {
								foundColumns.push(metric);
							}
						}
					}
				}
			}
		}

		if (which == 'fact') {
			for(var i=0;i<_facts.length;i++) {
				var fact = _facts[i];

				var passed = contains.every(function(value) {
					return (fact.label.toLowerCase().indexOf(value.toLowerCase()) != -1);
				});
				if (passed) {
					foundColumns.push({ id:fact.id, label:fact.label, type: 'fact' });
				}
			}
		}

		return preferredColumns.concat(foundColumns);
	}

});


FieldsStore.dispatchToken = LeoDispatcher.register(function(payload) {
	var isVirtual = false;
	var action = payload.action;
	switch(action.type) {
	case ActionTypes.INIT_FIELDS:
		initFields(action.result);
		FieldsStore.emitChange();
		break;

	case ActionTypes.FIND_QUICK_MATCHES:
		findQuickMatches(action.term);
		FieldsStore.emitChange();
		break;

	case ActionTypes.FIND_COMMON_DIMENSIONS:
		var old = JSON.stringify(_commonDimensions);
		findCommonDimensions(action.metrics);
		if (old != JSON.stringify(_commonDimensions)) {
			FieldsStore.emitChange();
		}
		break;

	case ActionTypes.FIND_COMMON_FACTS:
		var old = JSON.stringify(_commonFacts);
		findCommonFacts(action.dims);
		if (old != JSON.stringify(_commonFacts)) {
			FieldsStore.emitChange();
		}
		break;

	case ActionTypes.MODIFY_FIELD:

		var values = action.put;

		switch(action.fieldType) {
		case 'fact':
			var facts = _facts;
			for(var i=0; i<facts.length; i++) {
				var fact = facts[i];
				if (fact.id == values.id) {
					fact.label = values.label;
					fact.description = values.description;
				}
				facts[i] = fact;
			}
			_facts = facts;
			break;

		case 'metric':
			var facts = _facts;
			for(var i=0; i<facts.length; i++) {
				var fact = facts[i];
				for(var j=0; j<fact.metrics.length; j++) {
					var metric = fact.metrics[j];
					if (metric.id == values.id) {
						metric.label = values.label;
						metric.description = values.description;
						metric.format = values.format;
						fact.metrics[j] = metric;
					}
				}
				facts[i] = fact;
			}
			_facts = facts;
			break;

		case 'dimension':
			var dimensions = _dimensions;
			for(var i=0; i<dimensions.length; i++) {
				var dimension = dimensions[i];
				if (dimension.id == values.id) {
					dimension.label = values.label;
					dimension.description = values.description;
					dimension.format = values.format;
					dimension.sort = values.sort || '';
					dimension.color = values.color || undefined;
				}
				for(var j=0; j<dimension.attributes.length; j++) {
					var attribute = dimension.attributes[j];
					if (attribute.id == values.id) {
						attribute.label = values.label || '';
						attribute.description = values.description || '';
						attribute.format = values.format || '';
						attribute.sort = values.sort || '';
						attribute.color = values.color || undefined;
						dimension.attributes[j] = attribute;
					}
				}
				dimensions[i] = dimension;
			}
			_dimensions = dimensions;
			break;
		}
		//ReportActions.repivot();
		FieldsStore.emitChange();
		break;


	case ActionTypes.ADD_FIELD:

		var calcs = action.put;
		var type = action.fieldType;

		delete(calcs.apikey);
		delete(calcs.uid);

		switch(type) {
		default:
		case 'metric':
			var facts = _facts;
			for(var i=0; i<facts.length; i++) {
				var fact = facts[i];
				for(var id in calcs) {
					if (id == fact.id) {
						var virtual = calcs[id].put;
						fact.metrics.push(virtual);
						isVirtual = true;
					}
				}
				facts[i] = fact;
			}
			_facts = facts;

			break;

		case 'dimension':
			var dimensions = _dimensions;
			dimensions = dimensions.map(function(dimension) {
				for(var id in calcs) {
					if (id.split('.')[0] == dimension.id) {
						dimension.attributes.push(calcs[id].put);
					}
				}
				return dimension;
			});
			_dimensions = dimensions;

			break;
		}

		FieldsStore.emitChange();
		break;


	case ActionTypes.DELETE_FIELD:

		var id = action.id;

		var facts = _facts;
		for(var i=0; i<facts.length; i++) {
			var fact = facts[i];
			fact.metrics = fact.metrics.filter(function(metric) {
				if (metric.id == id) {
					return false;
				} else if (metric.calculations) {
					metric.calculations = metric.calculations.filter(function(calculation) {
						if (calculation.id == id) {
							return false;
						}
						return true;
					});
				}
				return true;
			});
		}

		var dimensions = _dimensions;
		dimensions = dimensions.map(function(dimension) {
			dimension.attributes = dimension.attributes.filter(function(attribute) {
				return (attribute.id != id);
			});
			return dimension;
		});

		FieldsStore.emitChange();

		break;


	default:
			//do nothing
	}
});

module.exports = FieldsStore;

function initFields(result) {

	if (result.errorMessage) {
		window.messageLogNotify('Error loading field', 'warning', result);
		return;
	}

	_dimensions = [];
	_facts = [];
	_dimensionColumnLookup = {};

	var outriggerLookup = {};

	$.each(result.dimension, function(i, dim) {

		dim.attributes.sort(function(a,b) { if (a.label.toLowerCase() == 'id') return -1; if (b.label.toLowerCase() == 'id') return 1; return a.label.localeCompare(b.label); });

		dim.outriggers = [];

		dim.is_date = !!(dim.attributes && dim.attributes[0] && dim.attributes[0].quickFilters);

		if (Object.keys(result.fact).filter(factId => result.fact[factId].dimensions.indexOf(dim.id) !== -1).length) {
			_dimensions.push(dim);
		}

		_dimensionColumnLookup[dim.id] = dim;
		_dimsById[dim.id] = dim.label;

		for (let alias in dim.aliases) {
			_dimsById[alias] = dim.aliases[alias];
			if (_dimensionColumnLookup[alias]) {
				continue;
			}

			var newDim = $.extend(true, {}, dim);

			for (var i = 0; i < newDim.attributes.length; i++) {
				newDim.attributes[i].id = alias + "." + newDim.attributes[i].id;
			}

			newDim.label = dim.aliases[alias];
			newDim.id = alias + "." + newDim.id;

			newDim.is_alias = true;

			$.each(newDim.attributes, function(i, attribute) {
				attribute.parent = {
					label: newDim.label,
					id: newDim.id
				};

				_columnLookup[attribute.id] = attribute;
			});

			_dimensionColumnLookup[alias] = newDim;
			_dimensionColumnLookup[newDim.id] = newDim;

			if (Object.keys(result.fact).filter(factId => result.fact[factId].dimensions.indexOf(alias) !== -1).length) {
				_dimensions.push(newDim);
			}
		}

		$.each(dim.attributes, function(i, attribute) {

			attribute.is_date = dim.is_date;

			attribute.parent = {
				label: dim.label,
				id: dim.id
			};

			_columnLookup[attribute.id] = attribute;

			if (attribute.quickFilters) {
				for (var i = 0; i < attribute.quickFilters.length; i++) {
					_quickFilters.push({
						value : attribute.quickFilters[i],
						match : attribute.quickFilters[i].toLowerCase(),
						attribute : attribute.id
					});
				}
			}
		});

	});

	_dimensions.sort(function(a,b) {
		return a.label.localeCompare(b.label);
	});

	/* outriggers */
	for(var i=0; i<_dimensions.length; i++) {
		var dimension = _dimensions[i];
		for (var index in dimension.dimensions) {
			if (_dimensionColumnLookup[dimension.dimensions[index]]) {
				var outrigger = JSON.parse(JSON.stringify(_dimensionColumnLookup[dimension.dimensions[index]]));
				outrigger.label = dimension.label+' '+outrigger.label;
				outrigger.id = dimension.id+'$'+outrigger.id;
				outrigger.is_outrigger = true;

				var aliases = [];
				for(var j in outrigger.aliases) {
					aliases[dimension.id+'$'+j] = outrigger.aliases[j];
				}
				outrigger.aliases = aliases;

				for(var j=0;j<outrigger.attributes.length;j++) {
					outrigger.attributes[j].id = dimension.id+'$'+outrigger.attributes[j].id;
					outrigger.attributes[j].parent.label = dimension.label + ' ' + outrigger.attributes[j].parent.label;

					_columnLookup[outrigger.attributes[j].id] = outrigger.attributes[j];
				}

				if (!dimension.outriggers) {
					dimension.outriggers = [];
				}

				dimension.outriggers.push(outrigger);

				dimension.outriggers.sort(function(a,b) {
					return a.label.localeCompare(b.label);
				});

				dimension.has_outrigger = true;

				if (!outriggerLookup[dimension.id]) {
					outriggerLookup[dimension.id] = [];
				}
				outriggerLookup[dimension.id].push(outrigger.id);
				_dimensionColumnLookup[outrigger.id] = outrigger;

			}
		}
	}

	$.each(result.fact, function(i, fact) {
		$.each(fact.dimensions, function(j, dim) {
			if (dim in outriggerLookup) {
				$.each(outriggerLookup[dim], function(k, outrigger) {
					fact.dimensions.push(outrigger);
				});
			}
		});

		$.each(fact.dimensions, function(j, dim) {
			if (_dimensionColumnLookup[dim] && !!_dimensionColumnLookup[dim].laggable) {
				fact.metrics.push({
					calculations: [],
					id: _dimensionColumnLookup[dim].id,
					label: _dimensionColumnLookup[dim].label,
					type: 'lag'
				});
			}
		});

		_autoFilters[fact.id] = fact.autoFilters;

		_facts.push(fact);
		$.each(fact.metrics, function(j, metric) {
			if (metric.type == 'field') { //rocksolid fix
				metric.type = 'metric';
			}
			metric.parent = {
				label: fact.label,
				id: fact.id
			};

			_columnLookup[metric.id] = metric;

			_factColumnLookup[metric.id] = fact;
		});

		fact.metrics.sort(function(a,b) {
			if (a.label == a.parent.label) {
				return -1;
			}
			if (b.label == b.parent.label) {
				return 1;
			}
			return a.label.localeCompare(b.label);
		});

	});

	_facts.sort(function(a,b) {
		return a.label.localeCompare(b.label);
	});

}


function findQuickMatches(term) {
	_matches = [];

	for (var i = 0; i < _quickFilters.length; i++) {
		if (_quickFilters[i].match.indexOf(term) == 0) {
			_matches.push(_quickFilters[i]);
		}
	}
}


function findCommonDimensions(metrics) {
	var metricCount = 0;
	var tempCommon = {};
	for (var i = 0; i < metrics.length; i++) {

		if (typeof metrics[i] == 'string') {
			var metric = metrics[i].split(/(\.[cw]_|\|)/)[0];
			metricCount++;

			if (metric in _factColumnLookup) {
				var dims = _factColumnLookup[metric].dimensions;
				for (var x = 0; x < dims.length; x++) {
					if (!(dims[x] in tempCommon)) {
						tempCommon[dims[x]] = 1;
					} else {
						tempCommon[dims[x]]++;
					}
				}
			} else {
				//Is this a dimension?
				var tmpfacts = findCommonFacts([metric],true);
				metricCount += tmpfacts.length - 1;
				for (var j = 0; j < tmpfacts.length; j++) {
					var dims = _factColumnLookup[tmpfacts[j]].dimensions;
					for (var x = 0; x < dims.length; x++) {
						if (!(dims[x] in tempCommon)) {
							tempCommon[dims[x]] = 1;
						} else {
							tempCommon[dims[x]]++;
						}
					}
				}
			}
		}

	}

	_commonDimensions = [];
	for ( var dim in tempCommon) {
		if (tempCommon[dim] >= metricCount) {
			var name = dim.toLowerCase();
			if (name in _dimensionColumnLookup && !_dimensionColumnLookup[name].is_outrigger) {
				_commonDimensions.push(_dimensionColumnLookup[name]);
			}
		}
	}

	_commonDimensions.sort(function(a,b) {
		return a.label.localeCompare(b.label);
	});

}


function findCommonFacts(rawmetrics,returnInstead) {
	_commonFacts = [];
	var metrics = [];
	var returnVal = [];
	for(var i in rawmetrics) {
		//var mymetric =
		metrics.push(_dimsById[rawmetrics[i].split(/(\.|\|)/)[0]]);
	}
	for(var i in _facts) {
		var fact = _facts[i];
		var canAdd = true;
		for(var j in metrics) {
			if(fact.dimensions.indexOf(metrics[j]) == -1) canAdd = false;
		}
		if(canAdd) {
			if(!returnInstead) _commonFacts.push(fact);
			returnVal.push(fact.id);
		}
	}
	return returnVal;
}
