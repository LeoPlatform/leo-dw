var dataSources = {};
var sourceId = 1;

var DataActions = require("../actions/data.js");

module.exports = require("../react/flux/store.js")(function (my,dispatcher) {
	var reports = [];
	var datas = {};
	var graphSources = {};


	dispatcher.on("data.data",	(e)=> {
		my.emit(e.id, e.data);
	});


	dispatcher.on("data.reset",	(e)=> {
		var ids = graphs.map(function(graph) {
			return graph.id;
		});
		graphs = [];
		pruneDataSources();

		ids.map(function(id) {
			my.off(id);
		});
	});


	var repeaters = {};
	my.onWatched("*", (e) => {
		if(e === "loading" || e === "loaded") return;
		var dataSource = dataSources[e];
		//Give other reports time to jump in and be part of this data source
		setTimeout(function() {
			repeaters[e] = my.createRepeater(dataSource.interval, function(done) {
				my.emit("loading", graphSources[e]);
				dataSource.lastLoadRequest = new Date();
				DataActions.load(e,dataSource);
				done();
			}, function() {
			}).start();
		}, 0);
	}, (e) => {
		if(repeaters[e]) {
			repeaters[e].stop();
		}
	});


	dispatcher.on("data.refresh",	(e)=> {
		for(var e in repeaters) {
			repeaters[e].start();
		}
	});


	var graphs = [];
	function pruneDataSources() {
		for(var reportId in dataSources) {
			dataSources[reportId].metrics = [];
		}
		for(var i = 0; i < graphs.length; i++) {
			var graph = graphs[i];
			parseGraph(graph);
		}

		for(reportId in dataSources) {
			if(dataSources[reportId].metrics.length === 0) {
				delete dataSources[reportId];
				delete datas[reportId];
			}
		}
	}


	this.watchGraph = (graph, onUpdate) => {
		if (graph.requireControl) {
			var hasControl = false;
			for(var i=0;i<graph.filters.length;i++) {
				if (graph.filters[i].fromController) {
					hasControl = true;
					break;
				}
			}
			if (!hasControl) {
				graph.showNeedsFilter();
				return {
					id: graph.id,
					refresh: () => {},
					stop: () => {}
				};
			} else {
				graph.hideNeedsFilter();
			}
		}

		graph.id = sourceId++;
		graphs.push(graph);
		if (!graph.refreshInterval) {
			graph.refreshInterval = {minutes: 5};
		}

		var watchIds = parseGraph(graph);

		var newSources = {};

		for(var d in graphSources) {
			if(graphSources[d] !== graph.id) {
				newSources[d] = graphSources[d];
			}
		}

		watchIds.forEach(function(id) {
			newSources[id] = graph.id;
		});

		graphSources = newSources;

		var hasData = function() {
			var hasAllData = true;
			watchIds.forEach(function(watching, i) {
				if (!(watching in datas) || datas[watching].timestamp < dataSources[watching].lastLoadRequest) {
					hasAllData = false;
				}
			});

			if (hasAllData) {
				var data = [];
				watchIds.forEach(function(watching, i) {
					data.push(datas[watching].data);
				});
				my.emit("loaded", graph.id);
				onUpdate(data);
			}
		};

		watchIds.forEach(function(watching, i) {
			my.on(graph.id, watching, function(data, other) {
				datas[watching] = {
					timestamp: new Date(),
					data: data
				};
				hasData();
			});
		});

		hasData();

		return {
			id: graph.id,
			refresh: function() {
				watchIds.forEach(function(watching, i) {
					repeaters[watching].start();
				});
			},
			stop: () => {
				for(var i = graphs.length-1; i >= 0; i--) {
					var g = graphs[i];
					if (g.id === graph.id) {
						graphs.splice(i, 1);
					}
				}
				pruneDataSources();
				my.off(graph.id);
			}
		};

	};

});


function parseField(field) {
	var i;
	let fields = {
		metrics: [],
		groups: []
	};
	if (field.fields) {
		for(i = 0; i < field.fields.length; i++) {
			var f = field.fields[i];
			if (f.match(/^d_/)||f.match(/\.dd_/)||f.match(/\|band/)) {
				fields.groups.push(f);
			} else {
				fields.metrics.push(f);
			}
		}
	} else if(Array.isArray(field)) {
		for(i = 0; i < field.length; i++) {
			var f = field[i];
			if (f.match(/^d_/)||f.match(/\.dd_/)||f.match(/\|band/)) {
				fields.groups.push(f);
			} else {
				fields.metrics.push(f);
			}
		}
	} else {
		fields.metrics.push(field);
	}
	return fields;
}


function parseGraph(graph) {
	var i,j;
	var dataSourceIds={};

	var groups = [];
	if (!graph.columns || graph.columns.length === 0) {
		graph.columns = graph.dimensions || [];
	}
	for(i = 0; i < graph.columns.length; i++) {
		groups.push(graph.columns[i]);
	}

	var filters = [];
	for(i = 0; i < graph.filters.length; i++) {
		if (graph.filters[i].value && graph.filters[i].value.length != 0) {
			filters.push(graph.filters[i]);
		}
	}

	var partitions = [];
	if (!graph.partitions) {
		graph.partitions = [];
	}
	for(i = 0; i < graph.partitions.length; i++) {
		partitions.push(graph.partitions[i]);
	}

	if ((!graph.metrics || graph.metrics.length === 0) && graph.series) {
		var metrics = [];
		graph.series.forEach(function(serie) {
			serie.metrics.forEach(function(metric) {
				metrics.push({
					id: metric.id,
					highcharts: serie.highcharts || { type: serie.type }
				});
			});
		});
		graph.metrics = metrics;
	}

	for(i =0; i < graph.metrics.length; i++) {
		let metric = graph.metrics[i];
		if (typeof metric == 'string') {
			metric = { id: metric };
		} else if (metric.field) {
			metric.id = metric.field;
			delete metric.field;
		}

		//Determine which Groups are needed
		let myGroups = [];
		let myPartitions = [];

		if (metric.highcharts && metric.highcharts.type == 'pie') {
			if (metric.partitions) {//IF partitions are set, then use that instead of columns
				metric.columns = [];
			} else {
				metric.partitions = metric.columns;
				metric.columns = [];
			}
		}

		if (metric.columns) {
			myGroups = metric.columns.slice();
		} else {
			myGroups = groups.slice(0);
		}
		if (metric.partitions || metric.colors) {
			var fields = parseField(metric.partitions || metric.colors);
			for(j = 0; j < fields.groups.length; j++) {
				myPartitions.push(fields.groups[j]);
			}
		} else if (partitions.length) {
			myPartitions = partitions.slice(0);
		}

		//Determine which Filters are needed
		let myFilters = filters.slice(0);
		if (metric.filters) {
			for(j = 0; j < metric.filters.length; j++) {
				myFilters.push(metric.filters[j]);
			}
		}

		//Determine which metrics are needed
		let metrics = [];
		metrics.push(metric.id || metric.field);

		//Parse the tooltip
		if (metric.tooltip) {
			var fields = parseField(metric.tooltip);
			for(j = 0; j < fields.groups.length; j++) {
				myGroups.push(fields.groups[j]);
			}
			for(j = 0; j < fields.metrics.length; j++) {
				metrics.push(fields.metrics[j]);
			}
		}

		/* this makes no sense.  why would we parse a label?
		//Parse the label
		if (false && metric.label) {
			var fields = parseField(metric.label);
			for(j = 0; j < fields.groups.length; j++) {
				myGroups.push(fields.groups[j]);
			}
			for(j = 0; j < fields.metrics.length; j++) {
				metrics.push(fields.metrics[j]);
			}
		}
		*/

		//Generate a reportID
		myGroups = myGroups.filter( (value,index,self) => {
			return self.indexOf(value) === index;
		}).sort();
		myPartitions = myPartitions.filter( (value,index,self) => {
			return self.indexOf(value) === index;
		}).sort();
		myFilters = myFilters.map(function(e) {
			//This should likely be more complex, such as ordering the values
			//e.values.sort();????
			return JSON.stringify(e);
		}).filter( (value,index,self) => {
			return self.indexOf(value) === index;
		}).map(function(e) {
			return JSON.parse(e);
		}).sort(function(a,b) {
			return a.id.localeCompare(b.id);
		});

		var reportId = JSON.stringify([myGroups, myPartitions, myFilters]);
		if(!(reportId in dataSources)) {
			dataSources[reportId] = {
				groups: myGroups,
				partitions: myPartitions,
				interval: graph.refreshInterval,
				metrics: [],
				filters: myFilters,
				sort: graph.sort
			};
		}
		dataSourceIds[reportId] = 1;

		var source = dataSources[reportId];
		var m = source.metrics;
		for(j =0; j < metrics.length; j++) {
			let metric = metrics[j];
			if(m.indexOf(metric) === -1) {
				m.push(metrics[j]);
			}
		}
	}

	return Object.keys(dataSourceIds);
}
