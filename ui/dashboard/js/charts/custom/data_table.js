var base = require("../base.js");
var React = require("react");
var ReactDOM = require("react-dom");
var debounce = require('lodash.debounce');
var Highcharts = require('highcharts');

var DataAction = require("../../actions/data.js");

var sort = require("../../../../../lib/report/format/sort.js");

var IdUtils = require('../../../../js/utils/IdUtils.js')


module.exports = function (element, spec, options, my) {
	my = my || {}

	spec.advanced = spec.advanced || {}

	if (spec.showTotals) {
		spec.advanced.showTotals = spec.showTotals
	}

	spec.dimensions = spec.dimensions || []
	spec.partitions = spec.partitions || []

	// generate outColumns
	spec.outColumns = spec.dimensions.concat(spec.metrics).map(function(column_id, index, allColumns) {

		if (typeof column_id == 'object' && column_id.id) {
			column_id = column_id.id
		}
		var parse = IdUtils.parse(column_id)
		var details = IdUtils.details(column_id)
		var useStar = (!!details && details.type != 'dimension' && details.type != 'attribute' && spec.partitions.length > 0)

		spec.advanced = spec.advanced || {}

		var label = ''
		if (parse.label) {
			label = parse.label.toString()
		} else if (!details) {
			label = '-'
		} else {
			if (parse.abs) { label += 'ABS ' }
			if (parse.rank) { label += 'Rank ' }
			if (parse.cumulative) { label += 'Cumulative ' }
			if (parse.percent) { label += 'Percent ' }
			if (parse.min) { label += 'Minimum ' }
			if (parse.max) { label += 'Maximum ' }
			if (parse.avg) { label += 'Average ' }
			if (label == '') { label = details.parent.label + ' ' }
			label += ((details.parent.label === details.label || details.label === 'Id') ? 'Count' : details.label)
		}

		label = (useStar ? '* ' : '') + label

		return {
			label: label,
			value: column_id + (useStar ? ':*' : ''),
			filter: (typeof spec.advanced.inlineFilters != 'undefined' && (spec.advanced.inlineFilters == true || (typeof spec.advanced.inlineFilters == 'object' && spec.advanced.inlineFilters.indexOf(column_id) !== -1))),
			width: spec.advanced.columnWidths && spec.advanced.columnWidths[index] ? spec.advanced.columnWidths[index] : Math.floor(allColumns.length/100) + '%'
		}
	})

	var that = base(element, spec, options, my)

	my.redraw = function () {
		return <Table spec={spec} options={options} data={my.dataSources[0]} element={element} />
	}

	return that
}


var Table = React.createClass({

	getInitialState: function () {
		var sortBy = false;
		var sortDir = 1;
		if (this.props.spec && this.props.spec.sort && this.props.spec.sort[0]) {
			sortBy = (this.props.spec.sort[0].column || this.props.spec.sort[0].column === 0) ? this.props.spec.sort[0].column : sortBy;
			sortDir = this.props.spec.sort[0].direction == 'desc' ? -1 : 1
		}

		this.props.spec.startDownload = this.exportData

		return {
			filters: [],
			sortBy: sortBy, //false,
			sortDir: sortDir, //1
			startRow: 0
		};
	},


	componentWillMount: function() {
		this.preProcess()
	},


	componentWillReceiveProps: function(props) {
		this.preProcess(props)
	},


	componentDidMount: function () {
		var scrolls = $('#leo-dashboard .simple-table-wrapper .table-body:not(.has-scroll-handler)');
		var thisComponent = this
		scrolls.each(function () {
			$(this).scroll(function () {
				thisComponent.sparkline.doChart($(this))
			}).addClass('has-scroll-handler')
		})

		this.componentDidUpdate()
	},


	componentDidUpdate: function() {
		this.adjustScrollFiller()
	},


	filterChange: function (col, e) {
		var filters = this.state.filters
		filters[col] = e.currentTarget.value
		this.setState({ filters: filters }, () => {
			this.preProcess()
		})
	},


	exportData: function (data, columns) {

		if (!data) {
			data = this.rows
			columns = this.columns
		}

		var outColumns = [];
		columns.forEach(function (col, i) {
			if (col.export !== false) {
				col.export.forEach(function (ex, i) {
					outColumns.push(ex);
				});
				if (col.export.length == 0 && col.func) {
					outColumns.push({
						label: col.label,
						func: col.func
					})
				}
			}
		});

		var outRows = [];

		// HEADERS
		let newRow = [];
		outColumns.forEach(function (col, i) {
			newRow.push(col.label);
		});
		outRows.push(newRow);

		for (let i = 0; i < data.length; i++) {
			var row = data[i];
			let newRow = [];
			outColumns.forEach((col, i) => {
				let v = '';
				if (col.formatter) {
					v = col.formatter(row[col.rowIndex]);
				} else {
					v = col.func(this.getValue.bind(this, row));
				}
				if (v && v.replace) {
					newRow.push('"' + v.replace(/\"/g, '') + '"');
				} else {
					newRow.push(v);
				}
			});
			outRows.push(newRow);
		}
		DataAction.downloadData("export", outRows);
	},


	sortBy: function (col, e) {
		this.setState({
			sortBy: col,
			sortDir: (col == this.state.sortBy ? -this.state.sortDir : -1)
		}, function () {
			setTimeout(() => {
				var element = ReactDOM.findDOMNode(this)
				$(element).trigger('leo-after-sort', [$(element)]);
			}, 500)
		});
	},


	sparkline: {
		start: 0,
		$tds: [],
		fullLen: 0,
		lastcall: 0,
		hasSparkline: false,

		init: function () {
			var sparkline = this;

			if (!sparkline.hasSparkline) {
				sparkline.hasSparkline = true;

				$('#leo-dashboard').on({
					'leo-after-render': function (event, element) {
						sparkline.doChart(element);
					},
					'leo-after-sort': function (event, element) {
						sparkline.doChart(element);
					}
				});

				Highcharts.SparkLine = function (a, b, c) {
					var hasRenderToArg = typeof a === 'string' || a.nodeName,
						options = arguments[hasRenderToArg ? 1 : 0],
						defaultOptions = {
							chart: {
								renderTo: (options.chart && options.chart.renderTo) || this,
								backgroundColor: null,
								borderWidth: 0,
								type: 'area',
								height: 20,
								margin: [0, 0, 0, 0],
								style: {
									overflow: 'visible'
								},
								skipClone: true
							},
							title: {
								text: ''
							},
							credits: {
								enabled: false
							},
							xAxis: {
								labels: {
									enabled: false
								},
								title: {
									text: null
								},
								startOnTick: false,
								endOnTick: false,
								tickPositions: []
							},
							yAxis: {
								endOnTick: false,
								startOnTick: false,
								labels: {
									enabled: false
								},
								title: {
									text: null
								},
								tickPositions: [0]
							},
							legend: {
								enabled: false
							},
							tooltip: {
								backgroundColor: null,
								borderWidth: 0,
								shadow: false,
								useHTML: true,
								hideDelay: 0,
								shared: true,
								padding: 0,
								positioner: function (w, h, point) {
									return {
										x: -5,
										y: -10
									};
								}
							},
							plotOptions: {
								series: {
									animation: false,
									lineWidth: 1,
									shadow: false,
									states: {
										hover: {
											lineWidth: 1
										}
									},
									marker: {
										radius: 1,
										states: {
											hover: {
												radius: 2
											}
										}
									},
									fillOpacity: 0.25
								},
								column: {
									negativeColor: '#910000',
									borderColor: 'silver'
								}
							}
						};

					options = Highcharts.merge(defaultOptions, options);

					return hasRenderToArg ?
						new Highcharts.Chart(a, options, c) :
						new Highcharts.Chart(options, b);
				};

			}
		},

		doChart: function (element) {
			var sparkline = this;
			this.start = new Date();
			this.$tds = element.find('span[data-sparkline]');

			var scrollTop = element.parent().scrollTop(),
				scrollBottom = scrollTop + element.parent().height(),
				start = 0,
				end = 0

			this.$tds.each(function (index) {
				var visiblePoint = $(this).position().top;
				if (visiblePoint <= scrollTop) {
					start = index
				}
				if (visiblePoint <= scrollBottom) {
					end = (index + 1)
				} else {
					return false;
				}
			})

			this.$tds = this.$tds.slice(start, end)
			this.$tds = this.$tds.filter(':not([data-highcharts-chart])');
			this.fullLen = this.$tds.length;

			//if ($.now() - this.lastcall > 5000) {
			sparkline.doChunk(sparkline);
			//}
		},

		doChunk: function (sparkline) {
			var time = new Date(),
				i,
				len = sparkline.$tds.length,
				$td,
				stringdata,
				arr,
				data,
				chart;

			for (i = 0; i < len; i++) {
				this.lastcall = $.now();
				$td = $(this.$tds[i]);
				stringdata = $td.data('sparkline');
				arr = stringdata.split('; ');
				data = $.map(arr[0].split(','), parseFloat);
				chart = {};
				if (arr[1]) {
					chart.type = arr[1];
				}
				$td.highcharts('SparkLine', {
					series: [{
						data: data,
						pointStart: 1
					}],
					tooltip: {
						formatter: (typeof sparkLineToolTipFormatter == 'function') ? function () {
							return sparkLineToolTipFormatter(this.x, this.y)
						} : null
					},
					chart: chart
				});

				// If the process takes too much time, run a timeout to allow interaction with the browser
				if (new Date() - time > 500) {
					this.$tds.splice(0, i + 1);
					setTimeout(function () {
						sparkline.doChunk(sparkline)
					}, 0);
					break;
				}
			}
		}

	},


	// provide value getter
	getValue: function (row, column, format = true) {
		let index = null;
		let matches;

		if (column.index !== undefined) {
			index = this.colMapping[column.col.id || column.col][column.index];
		} else if (matches = column.match(/^(.*)\:(\d+)$/)) {
			index = this.colMapping[matches[1]][matches[2]];
		} else if (this.colMapping[column]) {
			index = this.colMapping[column][0];
		} else {
			index = -1
		}

		let c = this.props.data.mapping[index];
		if (format && c && c.formatter) {
			return c.formatter(row[index]);
		} else {
			return row[index];
		}
	},


	colMapping: {},
	rows: [],
	columns: [],

	preProcess: function(props) {

		props = props || this.props

		this.rows = props.data.rows;

		/** **************This should only happen on datasource change instead of every render*********************************** */

		// Map IN columns
		this.colMapping = {};
		if (props.data.mapping) {
			for (var i = 0; i < props.data.mapping.length; i++) {
				if (!(props.data.mapping[i].id in this.colMapping)) {
					this.colMapping[props.data.mapping[i].id] = [];
				}
				this.colMapping[props.data.mapping[i].id].push(i);
			}
		}

		//expand "*"
		var outColumns = [];
		props.spec.outColumns.map((col) => {
			if (col.value && typeof col.value === 'string' && col.value.match(/\:\*$/)) {
				var value = col.value.replace(/\:\*$/, '');
				for (var j = 0; j < props.data.headers[0].length; j++) {
					var col2 = JSON.parse(JSON.stringify(col));
					col2.label = col2.label.replace('*', props.data.headers[0][j].value);
					col2.value = value + ':' + j;
					outColumns.push(col2)
				}
			} else {
				outColumns.push(col)
			}
		});

		// Map OUT columns
		this.columns = []
		outColumns.map((col, i) => {
			var column = {
				col: null,
				export: []
			};

			var colName = false;
			if (col.sparkline) {
				if (typeof col.sparkline === 'string') {
					col.sparkline = [col.sparkline];
				}

				if (col.sparkline.length == 1 && col.sparkline[0].match(/\:\*$/)) {
					var value = col.sparkline[0].replace(/\:\*$/, '');
					col.sparkline = [];
					for (var j = 0; j < props.data.headers[0].length; j++) {
						col.sparkline.push(value + ':' + j)
					}
				}

				column.func = (values) => {
					this.sparkline.init();
					return '<span data-sparkline="' + col.sparkline.map(function (query) {
						var value = values(query);
						return (value ? value.toString().replace(/[^0-9.-]/g, '') : 0);
					}).join(',') + '"></span>';
				}
			} else if (col.value && typeof col.value === 'function') {
				column.func = col.value;
			} else {
				var colName = col.value;
			}

			if (colName) {
				if (colName.match(/\:\d+$/)) {
					var index = colName.split(/\:/).pop();
					colName = colName.replace(/\:\d+$/, '');
				} else {
					index = 0;
				}
				column.id = colName;
				column.index = index;
				column.col = props.data.columns[colName];
				column.formatter = column.col ? column.col.formatter : (n) => {
					return n
				}
				column.sort = column.col ? column.col.sort : (n) => {
						return n
					} //this.props.data.dimensions[colName].sort;
			} else {
				column.sort = col.sort || {
					type: 'string'
				};
			}
			column.width = col.width || (Math.floor(100 / outColumns.length) + '%') // 60;
			column.className = col.className || '';

			if (column.col) {
				column.type = col.type || column.col.type;
				column.label = col.label || column.col.label;
			} else {
				column.type = col.type;
				column.label = col.label;
			}
			if (column.type === "metric" || column.type === "fact") {
				column.className += " numeric";
			}
			if (col.filter === false) {
				column.filter = false;
			} else {
				column.filter = col.filter || null;
			}

			if (col.sparkline) {
				col.export = false;
			}

			if (col.export === false) {
				column.export = false;
			} else if (col.export || column.id) {
				if (!col.export) {
					col.export = [column.id];
				} else if (!$.isArray(col.export)) {
					col.export = [col.export];
				}
				col.export.forEach((ex, i) => {
					let e = {};
					if (!ex.label && !ex.value) {
						e.label = column.label;
						e.value = column.id;
					} else {
						e.label = ex.label || column.label;
						e.value = ex.value || column.id;
					}

					var colName = e.value;
					e.formatter = props.data.columns[colName] ? props.data.columns[colName].formatter : (n) => {
						return n
					}
					var index = 0;
					if (colName.match(/\:\d+$/)) {
						index = colName.split(/\:/).pop();
						colName = colName.replace(/\:\d+$/, '');
					}
					e.rowIndex = this.colMapping[colName] ? this.colMapping[colName][index] : -1
					column.export.push(e);
				});
			}

			if (!column.func) {
				column.rowIndex = this.colMapping[column.id] ? this.colMapping[column.id][column.index] : -1;
			}

			this.columns.push(column);
		});

		// Translate IN columns into OUT columns
		this.outRows = []
		for (let i = 0; i < this.rows.length; i++) {
			var row = this.rows[i];
			var newRow = [];
			this.columns.forEach((column, i) => {
				var value = null;
				if (column.func) {
					newRow.push(column.func(this.getValue.bind(this, row)));
				} else {
					newRow.push(row[column.rowIndex]);
				}
			});
			this.outRows.push(newRow);
		}
		/** ***************************END*********************************** */
	},


	visibleRowCount: 300,
	rowHeight: 24,

	handleScroll: function(event) {
		var scrollTop = $(event.currentTarget).scrollTop()
		   ,startRow = Math.floor(scrollTop / (this.rowHeight * (this.visibleRowCount/3))) * (this.visibleRowCount/3)

		if (startRow != this.state.startRow) {
			this.adjustScrollFiller(startRow)
			this.setState({ startRow: startRow })
		}
	},


	adjustScrollFiller: function(startRow) {
		startRow = startRow || this.state.startRow
		var $element = $(this.props.element)
		this.rowHeight = $element.find('.top-filler').next().height()
		$element.find('.top-filler').css({ height: this.rowHeight * startRow })
		$element.find('.bottom-filler').css({ height: this.rowHeight * (this.totalRows - startRow - this.visibleRowCount) })
	},


	render: function () {

		// Filter this new table
		this.outRows = this.outRows.filter((row, i) => {
			var matched = true;
			this.columns.map((column, j) => {
				if (column.filter && this.state.filters[j] !== undefined && matched) {
					var r = new RegExp(this.state.filters[j], 'i')
					if (column.filter === true) {
						matched = String(row[j]).match(r)
					} else {
						matched = column.filter(row, this.getValue.bind(this, this.rows[i]), r)
					}
				}
			});
			return !!matched;
		})

		this.totals = []
		this.outRows.forEach((row, rowNum) => {
			this.columns.forEach((column, i) => {
				if (typeof row[i] == 'number') {
					this.totals[i] = (typeof this.totals[i] == 'undefined' ? 0 : this.totals[i]) + parseFloat(0 + row[i])
				}
			})
		})

		this.totalRows = this.outRows.length

		var totals = this.totals

		if (this.props.data.error || this.rows.length == 0) {
			return <span>{this.props.spec.onEmpty||"No Data"}</span>;
		}

		let className = ''

		// sort the rows
		var sortBy = this.state.sortBy;
		if (sortBy || sortBy === 0) {
			var mappings = {};
			mappings[sortBy] = this.columns[sortBy];
			if (mappings[sortBy]) {
				this.outRows = this.outRows.sort(sort.getMultiCompare([{
					direction: this.state.sortDir === 1 ? 'asc' : 'desc',
					column: sortBy
				}], mappings));
			}
		}

		return (<div className="data-table-wrapper">
			<table className={className + (this.props.spec.advanced.showTotals ? ' has-totals' : '')} onScroll={this.handleScroll}>
				<thead>
					<tr className="fixed-spacing">
						{this.columns.map((column,i) => {
							return <td key={i} style={{width: column.width}} className={column.className}/>
						})}
					</tr>
					<tr className="title text-left">
						<th colSpan={this.columns.length}>
							{/*
								this.props.spec.advanced.showDownloadIcon
								? <i title="download" className="icon-download pull-right" onClick={this.exportData.bind(this, this.rows, this.columns)}></i>
								: false
							*/}
							<span>{this.props.options.title || this.props.spec.title || this.props.spec.advanced.title || ''}&nbsp;</span>
						</th>
					</tr>
					<tr className="headers">
						{this.columns.map((column,i) => {
							return (<th key={i} style={{width: column.width, maxWidth: column.width}} className={column.className + (this.state.sortBy == i ? ' active ' : ' ') + column.type} onClick={this.sortBy.bind(this, i)}>
								<span title={column.label}>{column.label}</span>
								<i className={(this.state.sortBy == i ? (this.state.sortDir==1 ? "icon-up-dir" : "icon-down-dir") :"icon-sort")}></i>
							</th>)
						})}
					</tr>
					<tr className="filters">
						{this.columns.map((column,i) => {
							if (column.type != "metric" && column.type != "fact" && !column.className.match('numeric') && column.filter !== false) {
								return (<th key={i} style={{width: column.width, maxWidth: column.width}} className={column.className}>
									<input type="search" value={this.state.filters[i] || ''} onChange={this.filterChange.bind(this, i)} className="filter" placeholder={"Filter " + column.label} />
								</th>)
							} else {
								return (<th key={i} style={{width: column.width, maxWidth: column.width}} className={column.className}>&nbsp;</th>)
							}
						})}
					</tr>
				</thead>
				<tbody>
					<tr className="fixed-spacing">
						{this.columns.map((column,i) => {
							return <td key={i} style={{width: column.width}} className={column.className}/>
						})}
					</tr>
					<tr className="top-filler"><td colSpan={this.columns.length} /></tr>
					{this.outRows.slice(this.state.startRow, this.state.startRow + this.visibleRowCount).map((row, rowNum) => {
						return (<tr key={rowNum}>
							{this.columns.map((column, i) => {
								return <td key={i} style={{width: column.width, maxWidth: column.width}} className={column.className + ' ' + column.type} dangerouslySetInnerHTML={{__html: column.formatter?column.formatter(row[i]):row[i] }} />
							})}
						</tr>)
					})}
					<tr className="bottom-filler"><td colSpan={this.columns.length} /></tr>
				</tbody>
				{
					this.props.spec.advanced.showTotals
					? <tfoot>
						<tr className="fixed-spacing">
							{this.columns.map((column,i) => {
								return <td key={i} style={{width: column.width, maxWidth: column.width}} className={column.className + ' ' + column.type} dangerouslySetInnerHTML={{__html: (column.formatter ? column.formatter(totals[i]) : totals[i]) || '&nbsp;' }} />
							})}
						</tr>
					</tfoot>
					: false
				}
			</table>
		</div>)

	}
})
