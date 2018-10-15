import {
	observable,
	computed,
	action,
	toJS
} from 'mobx';
import autoBind from 'react-autobind';
import {
	parse_date
} from '../lib/utils/parse_date.js';

export default class DataStore {

	@observable ACCESSTOKENBITLY = "0bd6ed7d910fa6c68ed655dbbe99b95cf8030f47";
	@observable aliases = {};
	@observable bitlyLink = "";
	@observable bitlyStatus = 0;
	@observable columns = {};
	@observable download = {};
	@observable factForColumnSearch = [];
	@observable fields = {};
	@observable grayoutCountDim = 0;
	@observable grayoutLookupDim = {};
	@observable grayoutCountMet = 0;
	@observable grayoutLookupMet = {};
	@observable hidden = localStorage.getItem('sidebar') === "true";
	@observable loading = false;
	@observable locked = false;
	@observable lookup = {};
	@observable lookupOutrigger = {};
	@observable openDatePicker = false;
	@observable openSelected = [];
	@observable outriggerLookup = {};
	@observable ranOnce = false;
	@observable rawCode = {};
	@observable report = {};
	@observable reportInfo = {
		"rows": [],
		"columns": []
	};
	@observable reportRequest = null;
	@observable showQueries = false;
	@observable showTotals = false;
	@observable tiedTogether = {};
	@observable urlObj = {
		"partitions": [],
		"dimensions": [],
		"metrics": [],
		"filters": [],
		"sort": [],
		"redshift": true
	};

	@observable _dimensions = [];
	@observable _facts = [];
	@observable _quickFilters = [];
	@observable _factColumnLookup = {};
	@observable _dimensionColumnLookup = {};
	@observable _dimsById = {};
	@observable _autoFilters = {};
	@observable _columnLookup = {};
	@observable _commonDimensions = [];
	@observable _commonFacts = [];
	@observable _reportFilters = [];

	constructor() {
		autoBind(this);
	}

	@action
	decodeURL(urlObj) {
		try {
			urlObj = decodeURIComponent(urlObj);
		} catch(e) {
            urlObj = urlObj.replace(/%[0-9A-Z]{2}/g, decodeURIComponent)
		}
      	return urlObj
	}

	@action
	getBitlyUrl(url) {
		url = encodeURIComponent(url);
		$.get(`https://api-ssl.bitly.com/v3/shorten?access_token=${this.ACCESSTOKENBITLY}&longUrl=${url}`, (response) => {
			this.bitlyStatus = response && response.status_code;
			this.bitlyLink = response && response.data && response.data.url;
		}).fail((result) => {
			if (result.status !== 0) {
				window.messageLogNotify('Error getting bitly link', 'warning', result)
			}
		})
	}

	@action
	getFields(location) {
		$.get("api/fields?redshift=true&uuid=" + Date.now(), (response) => {
			this.postProcessFields(response);
			this.fields = response;
			this.getInitialURL(location);
		}).fail((result) => {
			if (result.status !== 0) {
				window.messageLogNotify('Error getting fields', 'warning', result)
			}
		})
	};

	@action
	getInitialURL(hash, fromCodeViewer) {
		let str = '';
		if (hash !== '') {
			this.reportInfo = {
				"rows": [],
				"columns": []
			};
			this._reportFilters = [];

			if (!this.ranOnce) {
				let lookup = {};
				let outRiggerLookup = {};
				this._dimensions.map(table => {
					table.attributes.map(a => {
						lookup[a.id] = table;
					});
					if (table.outriggers.length > 0) {
						table.outriggers.map(a => {
							a.attributes.map(b => {
								outRiggerLookup[b.id] = b;
							});
						});
					}
				});
				Object.keys(this.fields.fact).map(key => {
					let table = this.fields.fact[key];
					table.metrics.map(a => {
						lookup[a.id] = table
					});
				});
				this.lookup = lookup;
				this.lookupOutrigger = outRiggerLookup;
				this.ranOnce = true;
			}
			let o = hash.substr(1);
			str = this.decodeURL(o);
			let obj = JSON.parse(str);
			this.urlObj = obj;

			if (obj.return_queries) {
				this.showQueries = ["No queries"]
			}

			if (obj.metrics && obj.metrics.length > 0) {
				this.findCommonDimensions(obj.metrics);
			}

			if (obj.advanced && obj.advanced.showTotals) {
				this.showTotals = obj.advanced.showTotals;
			}

			if (obj.partitions && obj.partitions.length > 0) {
				obj.partitions.forEach((partition) => {
					if (typeof partition === "object") {
						partition = partition.id
					}
					let url = partition;
					partition = partition.split("|")[0];
					let outrigger = false;
					if (partition.indexOf('$') > -1) {
						let regex = /^(.*)\./;
						url = partition;
						partition = regex.exec(partition)[1];
						outrigger = true;
					}
					if (outrigger) {
						let outriggerInfo = this.lookupOutrigger[url];
						let args = {
							type: 'dimension',
							id: outriggerInfo.id,
							urlId: url,
							label: outriggerInfo.label,
							where: 'column',
							parent_id: outriggerInfo.parent.id,
							parent: outriggerInfo.parent
						};
						this.reportInfo.columns.push(args)
					} else {
						if (!!this.lookup[partition] && this.lookup[partition].type === 'dimension') {
							this.lookup[partition].attributes.forEach((attribute) => {
								if (attribute.id === partition) {
									let args = {
										type: 'dimension',
										id: attribute.id,
										urlId: url,
										label: attribute.label,
										where: 'column',
										parent_id: attribute.parent.id,
										parent: attribute.parent
									};
									this.reportInfo.columns.push(args)
								}
							});
						} else if (!!this.lookup[partition] && this.lookup[partition].type === 'fact') {
							this.lookup[partition].metrics.forEach((metric) => {
								if (metric.id === partition) {
									let args = {
										type: metric.type,
										id: metric.id,
										urlId: url,
										label: metric.label,
										where: 'column',
										parent_id: metric.parent.id,
										parent: metric.parent
									};
									this.reportInfo.columns.push(args)
								}
							});
						} else {
							let parentLabel = null;
							let childLabel = null;
							let commonDims = this._commonDimensions;

							let labels = partition.split('.');
							let parent = labels[0] + '.' + labels[1];
							for (let i = 0; i < commonDims.length; i++) {
								if (commonDims[i].id.toLowerCase() === parent.toLowerCase()) {
									parentLabel = commonDims[i].label;

									for (var j = 0; j < commonDims[i].attributes.length; j++) {
										if (commonDims[i].attributes[j].id === partition) {
											childLabel = commonDims[i].attributes[j].label;
											break;
										}
									}
									break;
								}
							}

							let parentObj = {
								label: parentLabel
							};

							let args = {
								type: "dimension",
								urlId: url,
								id: partition,
								label: childLabel,
								parent: parentObj,
								where: 'column',
							};
							this.reportInfo.columns.push(args);
						}
					}
				})
			}
			if (obj.dimensions && obj.dimensions.length > 0) {
				obj.dimensions.forEach((dimension) => {
					if (typeof dimension === "object") {
						dimension = dimension.id
					}
					let url = dimension;
					dimension = dimension.split("|")[0];
					let outrigger = false;
					if (dimension.indexOf('$') > -1) {
						let regex = /^(.*)\./;
						url = dimension;
						dimension = regex.exec(dimension)[1];
						outrigger = true;
					}

					if (outrigger) {
						let outriggerInfo = this.lookupOutrigger[url];
						let args = {
							type: 'dimension',
							id: outriggerInfo.id,
							urlId: url,
							label: outriggerInfo.label,
							where: 'row',
							parent_id: outriggerInfo.parent.id,
							parent: outriggerInfo.parent
						};
						this.reportInfo.rows.push(args)
					} else {
						if (!!this.lookup[dimension] && this.lookup[dimension].type === 'dimension') {
							this.lookup[dimension].attributes.forEach((attribute) => {
								if (attribute.id === dimension) {
									let args = {
										type: 'dimension',
										id: attribute.id,
										urlId: url,
										label: attribute.label,
										where: 'row',
										parent_id: attribute.parent.id,
										parent: attribute.parent
									};
									this.reportInfo.rows.push(args)
								}
							});
						} else if (!!this.lookup[dimension] && this.lookup[dimension].type === 'fact') {
							this.lookup[dimension].metrics.forEach((metric) => {
								if (metric.id === dimension) {
									let args = {
										type: metric.type,
										id: metric.id,
										urlId: url,
										label: metric.label,
										where: 'row',
										parent_id: metric.parent.id,
										parent: metric.parent
									};
									this.reportInfo.rows.push(args)
								}
							});
						} else {
							let parentLabel = null;
							let childLabel = null;
							let commonDims = this._commonDimensions;

							let labels = dimension.split('.');
							let parent = labels[0] + '.' + labels[1];
							for (let i = 0; i < commonDims.length; i++) {
								if (commonDims[i].id.toLowerCase() === parent.toLowerCase()) {
									parentLabel = commonDims[i].label;

									for (var j = 0; j < commonDims[i].attributes.length; j++) {
										if (commonDims[i].attributes[j].id === dimension) {
											childLabel = commonDims[i].attributes[j].label;
											break;
										}
									}
									break;
								}
							}

							let parentObj = {
								label: parentLabel
							};

							let args = {
								type: "dimension",
								urlId: url,
								id: dimension,
								label: childLabel,
								parent: parentObj,
								where: 'row',
							};
							this.reportInfo.rows.push(args);
						}
					}
				})
			}
			if (obj.metrics && obj.metrics.length > 0) {
				this.findCommonDimensions(obj.metrics);
				obj.metrics.forEach((metric) => {
					if (typeof metric === "object") {
						// if (metric.filters && Object.keys(metric.filters).length !== 0) {
						//     Object.keys(metric.filters).map(filter => {
						//         if (!metric.filters[filter].dimension) {
						//             metric.filters[filter].dimension = metric.filters[filter].id;
						//         }
						//         if (!Array.isArray(metric.filters[filter].value)) {
						//             metric.filters[filter].value = [metric.filters[filter].value];
						//         }
						//         this._reportFilters.push(metric.filters[filter]);
						//     })
						// }
						metric = metric.id
					}
					let regex = /^(.*?)[|](.*?)(?:$|\|)/;
					let match = regex.exec(metric);
					if (!!this.lookup[match[1]] && this.lookup[match[1]].type === 'fact') {
						this.lookup[match[1]].metrics.forEach((metric2) => {
							if (metric2.id === match[1]) {
								let args = {
									type: 'metric',
									id: metric2.id,
									urlId: metric,
									picked: match[2],
									label: metric2.label,
									where: 'row',
									kind: 'fact',
									parent_id: metric2.parent.id,
									parent: metric2.parent
								};
								this.reportInfo.rows.push(args)
							}
						});
					}
				})
			}
			if (obj.filters && obj.filters.length > 0) {
				Object.keys(obj.filters).forEach((i) => {
					this._reportFilters.push(obj.filters[i]);
				})
			}
			this.getGrayOutLookup();

			if (obj.reportId || (obj.metrics && obj.metrics.length > 0 && !fromCodeViewer)) {
				this.getReport();
			}
		}
	}

	@action
	setUrlHash() {
		let urlObj = JSON.stringify(toJS(this.urlObj));
        let o = window.location.hash.substr(1);
        let str = this.decodeURL(o);
		if (urlObj !== str) {
			window.hashChangeCallback = () => {
				window.hashChangeCallback = false;
			};
			window.location.hash = JSON.stringify(toJS(this.urlObj));
		}
	}

	@action
	getReport() {
        $("#cancelQuery").show()
        $("#showRendering").hide()
		this.report = {};
		this.loading = true;
		let payload = toJS(this.urlObj);
		payload.return_queries = localStorage.return_queries === 'true' ? true : payload.return_queries;
		this.setUrlHash();
		payload.groups = payload.dimensions;
		delete payload.dimensions;
		if (payload.redshift === undefined) {
			payload.redshift = true;
		}
		if (payload.filters) {
			payload.filters = payload.filters.filter(f => !(f.value == undefined || ($.isArray(f.value) && f.value.length == 0) || f.value == ""));
		}

		// If lambda function name exist
		if (window.dw.ReportApi && window.dw.ReportApi !== 'undefined') {
			var lambda = new window.AWS.Lambda({
				apiVersion: '2015-03-31'
			});
			let params = {
				FunctionName: window.dw.ReportApi,
				InvocationType: "RequestResponse",
				Payload: JSON.stringify({
					body: payload
				})
			};

            this.reportRequest = lambda.invoke(params, (err, data) => {
                let reg = /is not authorized to perform: lambda:InvokeFunction on resource/g
				let reg2 = /Request aborted/g
				let gettingOldReport = false;
				if (err) {
					if (reg2.exec(err.message)) {
						//Do nothing
					} else if (reg.exec(err.message)) {
						gettingOldReport = true;
						this.getReportOldWay(payload)
					} else {
						window.messageLogNotify('Error getting report', 'warning', err);
					}
				} else {
					let response = JSON.parse(data.Payload);
					if (!data.FunctionError && response.statusCode >= 200 && response.statusCode < 300) {
						let body = JSON.parse(response.body);
						if (!body.download.url) {
							window.messageLogNotify('Error getting report', 'warning');
						}
						this.download = body.download;
						this.exceldownload = body.exceldownload;
                        this.showQueries = body.queries;
                        $("#cancelQuery").hide()
                        $("#showRendering").show()
                        // Delay report render for running Jquery hide,show
						setTimeout(()=> {this.report = body; this.loading = false;}, 10);
					} else {
						window.messageLogNotify('Error getting report', 'warning');
					}
				}
			});
		} else {
			this.getReportOldWay(payload)
		}
	}

	@action
	getReportOldWay(payload) {
		if (this.urlObj.reportId || this.urlObj.metrics && this.urlObj.metrics.length !== 0) {
			this.reportRequest = $.post("api/report", JSON.stringify(payload), (response) => {
                $("#cancelQuery").hide()
                $("#showRendering").show()
				this.download = response.download;
				this.exceldownload = response.exceldownload;
                this.showQueries = response.queries;
                // Delay report render for running Jquery hide,show
                setTimeout(()=> {this.report = response; this.loading = false;}, 10);
			}).fail((result) => {
				this.loading = false;
				if (result.status !== 0) {
					window.messageLogNotify('Error getting report', 'warning', result)
				}
			})
		} else {
			this.loading = false;
			window.messageLogNotify('No metric selected', 'warning')
		}
	}

	@action
	getGrayOutLookup() {
		this.grayoutCountDim = 0;
		this.grayoutLookupDim = {};
		this.grayoutCountMet = 0;
		this.grayoutLookupMet = {};
		this.factForColumnSearch = [];

		this.reportInfo.rows.forEach(obj => {
			if (obj.type !== 'dimension') {
				let key = obj.parent_id;
				this.tiedTogether[key].map(key2 => {
					if (key2 in this.grayoutLookupDim) {
						this.grayoutLookupDim[key2] = this.grayoutLookupDim[key2] + 1;
					} else {
						this.grayoutLookupDim[key2] = 1;
					}
				});
				this.grayoutCountDim++;
			} else if (obj.type === 'dimension') {
				let key = obj.id.replace(/[.$].*$/, "");
				this.tiedTogether[key] && this.tiedTogether[key].map(key2 => {
					if (key2 in this.grayoutLookupMet) {
						this.grayoutLookupMet[key2] = this.grayoutLookupMet[key2] + 1;
					} else {
						this.grayoutLookupMet[key2] = 1;
					}
				});
				this.grayoutCountMet++;
			}
		});

		this.reportInfo.columns.forEach(obj => {
			if (obj.type === 'dimension') {
				let key = obj.id.replace(/[.$].*$/, "");
				this.tiedTogether[key] && this.tiedTogether[key].map(key2 => {
					if (key2 in this.grayoutLookupMet) {
						this.grayoutLookupMet[key2] = this.grayoutLookupMet[key2] + 1;
					} else {
						this.grayoutLookupMet[key2] = 1;
					}
				});
				this.grayoutCountMet++;
			}
		});
	}

	@action
	sort(rowNumber) {
		let direction = 'asc';
		if (this.urlObj.sort && this.urlObj.sort[0] && this.urlObj.sort[0].direction === 'asc' && rowNumber === this.urlObj.sort[0].column) {
			direction = 'desc';
		}
		this.urlObj.sort = [];
		let obj = {
			column: rowNumber,
			direction: direction
		};
		this.urlObj.sort.push(obj);
		this.getReport();
	}

	@action
	postProcessFields(result) {

		let _dimensions = [];
		let _facts = [];
		let _quickFilters = [];
		let _factColumnLookup = {};
		let _dimensionColumnLookup = {};
		let _dimsById = {};
		let _autoFilters = {};
		let _columnLookup = {};
		let outriggerLookup = {};

		$.each(result.dimension, function (i, dim) {

			dim.attributes.sort(function (a, b) {
				if (a.label.toLowerCase() == 'id') return -1;
				if (b.label.toLowerCase() == 'id') return 1;
				return a.label.localeCompare(b.label);
			});

			dim.outriggers = [];

			dim.is_date = !!(dim.attributes && dim.attributes[0] && dim.attributes[0].quickFilters);

			if (Object.keys(result.fact).filter(factId => result.fact[factId].dimensions.indexOf(dim.id) !== -1).length) {
				_dimensions.push(dim)
			}

			_dimensionColumnLookup[dim.id] = dim;
			_dimsById[dim.id] = dim.label;

			for (let alias in dim.aliases) {
				_dimsById[alias] = dim.aliases[alias];
				if (_dimensionColumnLookup[alias]) {
					continue;
				}

				let newDim = $.extend(true, {}, dim);

				for (let i = 0; i < newDim.attributes.length; i++) {
					newDim.attributes[i].id = alias + "." + newDim.attributes[i].id;
				}

				newDim.label = dim.aliases[alias];
				newDim.id = alias + "." + newDim.id;

				newDim.is_alias = true;

				$.each(newDim.attributes, function (i, attribute) {
					attribute.parent = {
						label: newDim.label,
						id: newDim.id
					}

					_columnLookup[attribute.id] = attribute;
				});

				_dimensionColumnLookup[alias] = newDim;
				_dimensionColumnLookup[newDim.id] = newDim;

				if (Object.keys(result.fact).filter(factId => result.fact[factId].dimensions.indexOf(alias) !== -1).length) {
					_dimensions.push(newDim)
				}
			}

			$.each(dim.attributes, function (i, attribute) {

				attribute.is_date = dim.is_date;

				attribute.parent = {
					label: dim.label,
					id: dim.id
				}

				_columnLookup[attribute.id] = attribute;

				if (attribute.quickFilters) {
					for (let i = 0; i < attribute.quickFilters.length; i++) {
						_quickFilters.push({
							value: attribute.quickFilters[i],
							match: attribute.quickFilters[i].toLowerCase(),
							attribute: attribute.id
						});
					}
				}
			});

		});

		_dimensions.sort(function (a, b) {
			return a.label.localeCompare(b.label);
		});

		/* outriggers */
		for (let i = 0; i < _dimensions.length; i++) {
			let dimension = _dimensions[i];
			for (let index in dimension.dimensions) {
				if (_dimensionColumnLookup[dimension.dimensions[index]]) {
					let outrigger = JSON.parse(JSON.stringify(_dimensionColumnLookup[dimension.dimensions[index]]));
					outrigger.label = dimension.label + ' ' + outrigger.label;
					outrigger.id = dimension.id + '$' + outrigger.id;
					outrigger.is_outrigger = true;

					let aliases = [];
					for (let j in outrigger.aliases) {
						aliases[dimension.id + '$' + j] = outrigger.aliases[j];
					}
					outrigger.aliases = aliases;

					for (let j = 0; j < outrigger.attributes.length; j++) {
						outrigger.attributes[j].id = dimension.id + '$' + outrigger.attributes[j].id;
						outrigger.attributes[j].parent.label = dimension.label + ' ' + outrigger.attributes[j].parent.label;

						_columnLookup[outrigger.attributes[j].id] = outrigger.attributes[j]
					}

					if (!dimension.outriggers) {
						dimension.outriggers = [];
					}

					dimension.outriggers.push(outrigger);

					dimension.outriggers.sort(function (a, b) {
						return a.label.localeCompare(b.label);
					})

					dimension.has_outrigger = true;

					if (!outriggerLookup[dimension.id]) {
						outriggerLookup[dimension.id] = [];
					}
					outriggerLookup[dimension.id].push(outrigger.id);
					_dimensionColumnLookup[outrigger.id] = outrigger;

				}
			}
		}

		$.each(result.fact, function (i, fact) {
			$.each(fact.dimensions, function (j, dim) {
				if (dim in outriggerLookup) {
					$.each(outriggerLookup[dim], function (k, outrigger) {
						fact.dimensions.push(outrigger)
					});
				}
			});

			$.each(fact.dimensions, function (j, dim) {
				if (_dimensionColumnLookup[dim] && !!_dimensionColumnLookup[dim].laggable) {
					fact.metrics.push({
						calculations: [],
						id: _dimensionColumnLookup[dim].id,
						label: _dimensionColumnLookup[dim].label,
						type: 'lag'
					})
				}
			});

			_autoFilters[fact.id] = fact.autoFilters;

			_facts.push(fact);
			$.each(fact.metrics, function (j, metric) {
				if (metric.type == 'field') {
					metric.type = 'metric';
				}
				metric.parent = {
					label: fact.label,
					id: fact.id
				}

				_columnLookup[metric.id] = metric;

				_factColumnLookup[metric.id] = fact;
			});

			fact.metrics.sort(function (a, b) {
				if (a.label == a.parent.label) {
					return -1
				}
				if (b.label == b.parent.label) {
					return 1
				}
				return a.label.localeCompare(b.label);
			});

		});

		_facts.sort(function (a, b) {
			return a.label.localeCompare(b.label);
		});

		let obj = {};
		_facts.map(key => {
			obj[key.id] = key.dimensions;
			let parent_id = key.id;
			obj[key.id].forEach(key => {
				if (!(key in obj)) {
					obj[key] = {};
				}
				obj[key][parent_id] = 1;
			});
		});

		Object.keys(obj).map(key => {
			if (!Array.isArray(obj[key])) {
				obj[key] = Object.keys(obj[key]);
			}
		});

		this.tiedTogether = obj;
		this._dimensions = _dimensions;
		this._facts = _facts;
		this._quickFilters = _quickFilters;
		this._factColumnLookup = _factColumnLookup;
		this._dimensionColumnLookup = _dimensionColumnLookup;
		this._dimsById = _dimsById;
		this._autoFilters = _autoFilters;
		this._columnLookup = _columnLookup;
		this.outriggerLookup = outriggerLookup;

	}

	@action
	updateFilters(filter, action) {
		let buildObj = {
			id: filter.id,
			value: filter.value,
			checkboxes: filter.checkboxes,
			label: filter.label,
			dimension: filter.dimension
		};
		let exists = false;
		Object.keys(this.urlObj.filters).map((key) => {
			if (key === buildObj) {
				exists = true
			}
		});
		if (!exists) {
			this.urlObj.filters.push(buildObj);
		}
	}

	@action
	addReportFilter(filter) {
		let commonDimensions = this._commonDimensions;
		for (let i = 0; i < commonDimensions.length; i++) {
			for (let j = 0; j < commonDimensions[i].attributes.length; j++) {
				if (commonDimensions[i].attributes[j].id == filter.id) {
					filter.label = commonDimensions[i].attributes[j].label;
					var found = true;
					break;
				}
			}
			if (found) {
				filter.dimension = commonDimensions[i].label;
				break;
			}

		}
		if (filter.kind == 'date_range') {
			if (filter.id.slice(-3) !== '.id') {
				filter.id = filter.id + '.id';
			}
			filter.comparison = 'between';
			filter.value = ['Today'];
		}

		if (filter.type == 'metric') {
			filter.fact = filter.parent.label;
			filter.singleValue = true;
		} else {
			filter.dimension = filter.parent && filter.parent.label;
		}
		// //fix value for dynamic ranges
		// if (filter.description) {
		//     filter.value = [filter.description];
		//     delete(filter.description);
		// }

		if (filter.isRequired && filter.length === 0) {
			filter.value = [missingRequired];
		}

		//force to array
		if (!Array.isArray(filter.value)) {
			if (filter.value == '') {
				filter.value = [];
			} else {
				if (filter.value === undefined) {
					filter.value = [];
				} else {
					filter.value = [filter.value];
				}
			}
		}

		//retro fit
		if (!filter.checkboxes) {
			filter.checkboxes = {};
			for (let i in filter.value) {
				filter.checkboxes[filter.value[i]] = true;
			}
		}

		let isDateRange = (filter.comparison && filter.comparison == 'between');
		let isDate = (filter.id.toLowerCase().indexOf('date.id') > -1 || filter.id.toLowerCase().indexOf('date._id') > -1 || filter.id.toLowerCase().indexOf('date.date') !== -1);

		if (!isDateRange && isDate && !filter.singleChoice) {
			if (filter.value.length == 0) {
				filter.value.push('today');
			}
			filter.value = filter.value.map(function (value) {
				if (!value.match(/\d{4}-\d{2}-\d{2}/)) {
					let isChecked = filter.checkboxes[value];
					delete filter.checkboxes[value];
					value = parse_date(value)[0];
					filter.checkboxes[value] = isChecked;
				}
				return value;
			})
		}
		let buildObj = {
			"id": filter.id,
			"value": filter.value,
			"label": filter.label,
			"dimension": filter.dimension
		};
		if (isDateRange) {
			buildObj = {
				"id": filter.id,
				"value": filter.value,
				"checkboxes": filter.checkboxes,
				"label": filter.label,
				"dimension": filter.dimension,
				comparison: filter.comparison
			};
		}
		this.urlObj.filters.push(buildObj);
		this._reportFilters.push(filter);
	}

	@action
	addValueFilter(newFilter, oldFilter) {
		for (let i = 0; i < this._reportFilters.length; i++) {
			if (this._reportFilters[i].id == oldFilter.id) {
				this._reportFilters.splice(i, 1);
				this._reportFilters.push(newFilter);
				this.openDatePicker = newFilter.id;
			}
			if (this.urlObj.filters[i].id == oldFilter.id) {
				this.urlObj.filters.splice(i, 1);
				let isDateRange = (newFilter.comparison && newFilter.comparison == 'between');
				let buildObj = {
					"id": newFilter.id,
					"value": newFilter.value,
					"checkboxes": newFilter.checkboxes,
					"label": newFilter.label,
					"dimension": newFilter.dimension
				};
				if (isDateRange) {
					if (newFilter.id.slice(-3) !== '.id') {
						newFilter.id = newFilter.id + '.id';
					}
					buildObj = {
						"id": newFilter.id,
						"value": newFilter.value,
						"checkboxes": newFilter.checkboxes,
						"label": newFilter.label,
						"dimension": newFilter.dimension,
						comparison: newFilter.comparison
					};
				}
				this.urlObj.filters.push(buildObj);
			}
		}
		this.setUrlHash();
	}

	@action
	formatDataForExport(use_tabs, show_headers) {
		var separator = (true ? '\t' : ', ');
		var quote = (true ? '' : '"');

		var forceRowFormat = false;
		var dataOffset = 0;
		var rowsResult = [];

		var column_or_row_metrics = [];
		var column_dimensions = [];
		var row_dimensions = [];

		this.report.rowheaders.map((column, i) => {

			if (column.type != "metric") {
				dataOffset++;
				if (column.type == "metrics") {
					forceRowFormat = true;
				} else {
					column_dimensions.push(this.report.columns[column.id].parent + '.' + this.report.columns[column.id].label);
				}
			} else {
				column_or_row_metrics.push(this.report.columns[column.id].parent + ' ' + this.report.columns[column.id].label);
			}

		});

		this.report.columnheaders.map((row, i) => {
			if (row.type != "metric") {
				if (row.type != "metrics") {
					row_dimensions.push(this.report.columns[row.id].parent + '.' + this.report.columns[row.id].label);
				}
			} else {
				column_or_row_metrics.push(this.report.columns[row.id].parent + ' ' + this.report.columns[row.id].label);
			}

		});

		if (show_headers) {

			rowsResult.push(column_or_row_metrics.join(' and ') + (column_dimensions.length > 0 ? ' BY: ' + column_dimensions.join(' and ') : '') + (column_dimensions.length > 0 && row_dimensions.length > 0 ? ' and' : '') + (row_dimensions.length > 0 ? ' BY: ' + row_dimensions.join(' and ') : ''));

			var row_2_filters = [];
			var filterData = this._reportFilters;

			for (var i = 0; i < filterData.length; i++) {
				row_2_filters.push(filterData[i].dimension + '.' + filterData[i].label + ' ' + (filterData[i].comparison || 'in') + ' ' + filterData[i].value.join(', '))
			}

			rowsResult.push(quote + 'Filtered By: ' + (row_2_filters.length > 0 ? row_2_filters.join(' and ') : '') + quote);

			let url = this.decodeURL(document.location.href);
			rowsResult.push(quote + url.replace(/"/g, '"' + quote) + quote);

			rowsResult.push(' ');
		}

		//for each actual header row, build the csv row
		$.each(this.report.headers, (rowIndex, headerGroup) => {

			//Pad the left for each column header row
			var row = [];
			for (var i = 0; i < this.report.columnheaders.length; i++) {
				if (this.report.columnheaders[i].type == "metrics") {
					if (rowIndex == this.report.headers.length - 1) {
						row.push("Metrics");
					} else {
						row.push("");
					}
				} else {
					if (this.report.columnheaders[i].type != "metric") {
						if (rowIndex == this.report.headers.length - 1) {
							row.push(this.report.columns[this.report.columnheaders[i].id].label);
						} else {
							row.push("");
						}
					}
				}
			}

			//Push the header values
			$.each(headerGroup, (index, header) => {
				if (header.type == "metric") {
					row.push(this.report.columns[header.id].label);
				} else {
					if (header.span) {
						for (var i = 0; i < header.span; i++) {
							row.push(header.value);
						}
					} else {
						row.push(header.value);
					}
				}
			});

			//push on to rows
			rowsResult.push(quote + row.join(separator) + quote);
		});

		//This is where we actually build the rows of data, including the row headers
		return rowsResult.join("\n") + "\n" + this.report.rows.map((column, i) => {
			return quote + column.join(separator) + quote;
		}).join("\n");
	}

	@action
	removeReportFilter(filterId) {
		for (let i = 0; i < this._reportFilters.length; i++) {
			if (this._reportFilters[i].id == filterId) {
				this._reportFilters.splice(i, 1);
			}
			if (this.urlObj.filters[i].id == filterId) {
				this.urlObj.filters.splice(i, 1);
			}
		}
	}

	@action
	searchFields(which, table, contains) {

		if (table && !contains) {
			if (which == 'dimension' || which == 'both' || which == 'filter') {
				if (table in this._dimensionColumnLookup) {
					return this._dimensionColumnLookup[table].attributes;
				}
			}

			if (which == 'metric' || which == 'both' || which == 'filter') {
				if (table in this._factColumnLookup) {
					return this._factColumnLookup[table].metrics;
				}
			}

			if (which == 'fact') {
				if (table in this._factColumnLookup) {
					return [{
						id: this._factColumnLookup[table].id,
						label: this._factColumnLookup[table].label,
						type: 'fact'
					}];
				}
			}
		}

		let foundColumns = [],
			preferredColumns = [];

		contains = contains ? contains.split('|')[0] : false;
		contains = contains ? $.trim(contains).split(' ') : [];

		if (which == 'dimension' || which == 'both' || which == 'filter') {
			let dimensions = ((this._commonDimensions.length > 0) ? this._commonDimensions : this._dimensions);

			for (let i = 0; i < dimensions.length; i++) {
				let dimension = dimensions[i];

				//make a copy
				let attributes = JSON.parse(JSON.stringify(dimension.attributes));

				if (which == 'filter' && dimension.id && (dimension.id.indexOf('d_date') > -1)) {
					attributes.unshift({
						id: dimension.id + '.id',
						kind: 'date_range',
						label: 'Date Range',
						parent: {
							id: dimension.id,
							label: dimension.label
						}
					});
				}

				if (dimension.has_outrigger) {
					for (let j = 0; j < dimension.outriggers.length; j++) {
						let outrigger = dimension.outriggers[j];
						if (which == 'filter' && outrigger.id && (outrigger.id.indexOf('d_date') > -1)) {
							attributes.unshift({
								id: outrigger.id + '.id',
								kind: 'date_range',
								label: 'Date Range',
								parent: {
									id: outrigger.id,
									label: outrigger.label
								}
							});
						}
						for (let k = 0; k < outrigger.attributes.length; k++) {
							attributes.push({
								id: outrigger.attributes[k].id,
								label: outrigger.attributes[k].label,
								parent: {
									id: outrigger.id,
									label: outrigger.label
								}
							});
						}
					}
				}

				for (let j = 0; j < attributes.length; j++) {
					let attribute = attributes[j];
					let passed = contains.every(function (value) {
						return (((attribute.parent.id || dimension.id) + '.' + attribute.id + ' ' + (attribute.parent.label || dimension.label) + ' ' + attribute.label + (attribute.description ? ' ' + attribute.description : '')).toLowerCase().indexOf(value.toLowerCase()) != -1);
					})
					if (passed) {
						if (!attribute.parent) {
							attribute.parent = {
								id: dimension.id,
								label: dimension.label
							}
						}

						if (
							contains.length > 1 &&
							(
								(attribute.label + ' ' + (attribute.parent.label || dimension.label)).toLowerCase() == contains.join(' ').toLowerCase() ||
								((attribute.parent.label || dimension.label) + ' ' + attribute.label).toLowerCase() == contains.join(' ').toLowerCase()
							)
						) {
							preferredColumns.unshift(attribute);
						} else if (contains.length == 1 && (attribute.parent.label || dimension.label).toLowerCase() == contains[0].toLowerCase()) {
							preferredColumns.push(attribute);
						} else if (table == attribute.parent.id) {
							preferredColumns.push(attribute);
						} else {

							let preferred = contains.length > 1 && contains.some(function (value) {
								return (
									((attribute.parent.label || dimension.label).toLowerCase().indexOf(value.toLowerCase()) != -1) &&
									(attribute.label.toLowerCase().indexOf(value.toLowerCase()) != -1)
								);
							})

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
			let dimensions = ((_commonDimensions.length > 0) ? _commonDimensions : this._dimensions);
			for (let i = 0; i < dimensions.length; i++) {
				let dimension = dimensions[i];
				if (dimension.id && (dimension.id.indexOf('d_date') !== -1)) {
					let passed = contains.every(function (value) {
						return (dimension.label.toLowerCase().indexOf(value.toLowerCase()) != -1);
					})
					if (passed) {
						foundColumns.push({
							id: dimension.id,
							label: dimension.label,
							type: 'dimension'
						});
					}
				}
				if (dimension.has_outrigger) {
					for (let j = 0; j < dimension.outriggers.length; j++) {
						let outrigger = dimension.outriggers[j];
						if (outrigger.id && (outrigger.id.indexOf('d_date') !== -1)) {
							let passed = contains.every(function (value) {
								return (outrigger.label.toLowerCase().indexOf(value.toLowerCase()) != -1);
							})
							if (passed) {
								foundColumns.push({
									id: outrigger.id,
									label: outrigger.label,
									type: 'dimension'
								});
							}
						}
					}
				}
			}
		}

		if (which == 'metric' || which == 'both' || which == 'filter') {
			for (let i = 0; i < this.factForColumnSearch.length; i++) {
				let fact = this.factForColumnSearch[i];

				//make a copy
				let metrics = JSON.parse(JSON.stringify(fact.metrics));

				if (which == 'metric') {
					metrics.unshift({
						id: fact.id + '|count',
						type: 'metric',
						label: 'Count',
						kind: 'fact',
						parent: {
							id: fact.id,
							label: fact.label
						}
					});
				}

				for (let j = 0; j < metrics.length; j++) {
					let metric = metrics[j];
					let passed = contains.every(function (value) {
						return ((fact.id + '.' + metric.id + ' ' + fact.label + ' ' + metric.label + (metric.description ? ' ' + metric.description : '')).toLowerCase().indexOf(value.toLowerCase()) != -1);
					})
					if (passed && metric.type == 'metric') {
						if (!metric.parent) {
							metric.parent = {
								id: fact.id,
								label: fact.label
							}
						}
						if (table == metric.parent.id) {
							preferredColumns.push(metric); //will never happen, but oh well
						} else {
							let preferred = contains.length > 1 && contains.some(function (value) {
								return (
									(fact.label.toLowerCase().indexOf(value.toLowerCase()) != -1) &&
									(metric.label.toLowerCase().indexOf(value.toLowerCase()) != -1)
								);
							})
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
			for (let i = 0; i < this.factForColumnSearch.length; i++) {
				let fact = this.factForColumnSearch[i];

				let passed = contains.every(function (value) {
					return (fact.label.toLowerCase().indexOf(value.toLowerCase()) != -1);
				})
				if (passed) {
					foundColumns.push({
						id: fact.id,
						label: fact.label,
						type: 'fact'
					});
				}
			}
		}

		return preferredColumns.concat(foundColumns);
	}

	@action
	findCommonDimensions(metrics) {
		let metricCount = 0;
		let tempCommon = {};
		for (let i = 0; i < metrics.length; i++) {

			if (typeof metrics[i] == 'string') {
				let metric = metrics[i].split(/(\.[cw]_|\|)/)[0];
				metricCount++;

				if (metric in this._factColumnLookup) {
					let dims = this._factColumnLookup[metric].dimensions;
					for (let x = 0; x < dims.length; x++) {
						if (!(dims[x] in tempCommon)) {
							tempCommon[dims[x]] = 1;
						} else {
							tempCommon[dims[x]]++;
						}
					}
				}
			}

		}

		this._commonDimensions = [];
		for (let dim in tempCommon) {
			if (tempCommon[dim] >= metricCount) {
				let name = dim.toLowerCase();
				if (name in this._dimensionColumnLookup && !this._dimensionColumnLookup[name].is_outrigger) {
					this._commonDimensions.push(this._dimensionColumnLookup[name]);
				}
			}
		}

		this._commonDimensions.sort(function (a, b) {
			return a.label.localeCompare(b.label);
		})

	}

	@action
	findCommonFacts(rawmetrics) {
		let metrics = [];
		for (let i in rawmetrics) {
			metrics.push(this._dimsById[rawmetrics[i].split(/(\.|\|)/)[0]]);
		}
		for (let i in this._facts) {
			let fact = this._facts[i];
			let canAdd = true;
			for (let j in metrics) {
				if (fact.dimensions.indexOf(metrics[j]) == -1)
					canAdd = false;
			}
			if (canAdd) {
				this._commonFacts.push(fact);
			}
		}
	}

	@action
	updateUrlAndHeaders(args) {
		if (args.type === 'metric') {
			this.reportInfo.rows.push(args);
			this.urlObj.metrics.push(args.urlId)
			this.findCommonDimensions(this.urlObj.metrics);
		} else if (args.type === 'dimension' && args.where === 'row') {
			this.reportInfo.rows.push(args);
			this.urlObj.dimensions.push(args.urlId)
		} else if (args.type === 'dimension' && args.where === 'column') {
			this.reportInfo.columns.push(args);
			this.urlObj.partitions.push(args.urlId)
		}
		let hash = `#${JSON.stringify(this.urlObj)}`;
		this.getInitialURL(hash, true);
	}
}