var React = require('react');
var td = require("throttle-debounce");
var Serializer = require('../../utils/Serializer');

var FieldsActions = require('../../actions/FieldsActions');
var ReportActions = require('../../actions/ReportActions');
var ReportFilterActions = require('../../actions/ReportFilterActions');

var FieldsStore = require('../../stores/FieldsStore');
var ReportStore = require('../../stores/ReportStore');
var ReportFilterStore = require('../../stores/ReportFilterStore');

var ReportGrid = require('./reportGrid.jsx');
var Graphs = require('./graphs.jsx');
var ReportRows = require('./reportRows.jsx');
var ReportColumns = require('./reportColumns.jsx');
var Filters = require('./filters.jsx');
var ToolDock = require('../report/toolDock.jsx');
var SelectData = require('../report/SelectData.jsx');
var CopyToClipboard = require('../common/copyToClipboard.jsx')

module.exports = React.createClass({

	getInitialState: function() {
		return {
			isLoading: ReportStore.getLoadingStatus(),
			reportFilters: ReportFilterStore.getReportFilters(),
			columnDims: ReportStore.getPartitions(),
			columnHeaders: ReportStore.getColumnHeaders(),
			columns: ReportStore.getColumns(),
			rows: ReportStore.getRows(),
			headers: ReportStore.getHeaders(),
			rowHeaders: ReportStore.getRowHeaders(),
			rowDims: ReportStore.getDimensions(),
			rowMetrics: ReportStore.getMetrics(),
			isLocked: ReportStore.getLockedStatus(),
			fieldDimensions: FieldsStore.getFieldDimensions(),
			fieldFacts: FieldsStore.getFieldFacts(),
			fieldCommonDimensions: FieldsStore.getCommonDimensions(),
			sorted: ReportStore.getSorted(),
			top: ReportStore.getTopLimit(),
			advanced: ReportStore.getAdvanced()
		}
	},


	componentWillMount: function() {
		/*
		if (window.location.hash == '') {
			var dataExplorerHash = localStorage.getItem('DataExplorer.hash')
			if (dataExplorerHash) {
				window.location.hash = JSON.parse(dataExplorerHash)
			}
		}
		*/

		setTimeout(function() { //prevent double report load
			$(window).on('hashchange',function() {
				Serializer.deSerialize();
				ReportActions.repivot();
			})
		}, 1000)
	},


	componentDidMount: function() {
		var thisComponent = this;

		$(".viewSimpleTableCode").on("click", (e) => {
			e.preventDefault();

			var obj = this.state
			var title = 'title'

			var outColumns = obj.rowHeaders.map(function(header) {
				if (header.type == 'metric' && obj.columnDims.length > 0) {
					title = header.parent.label + ' ' + header.label
				}
				return 	{
					label: ((header.type == 'metric' && obj.columnDims.length > 0) ? '* ' : '') + header.parent.label + ' ' + header.label,
					value: header.id + ((header.type == 'metric' && obj.columnDims.length > 0) ? ':*' : ''),
					filter: false
				}
			})

			var filters = obj.reportFilters.map(function(filter) {
				return {
					id: filter.id,
					comparison: filter.comparison,
					value: filter.value
				}
			})

			var sort = [];
			for(var i in obj.sorted) {
				if (!obj.sorted[i].auto || obj.sorted[i].auto != 'true') {
					sort.push({
						direction: obj.sorted[i].direction,
						column: i
					})
				}
			}

			var code = {
				type: 'simpletable',
				title: title,
				columns: obj.rowDims,
				partitions: obj.columnDims,
				metrics: obj.rowMetrics || obj.columnMetrics,
				filters: filters,
				sort: sort,
				onEmpty: 'No Results',
				showTotals: false,
				outColumns: outColumns
			}

			this.setState({ simpletableCode: JSON.stringify(code, null, 4) }, () => {

				LeoKit.modal($('#simpletableCode'), {
						close: false
					},
					'SimpleTable Code',
					() => { this.setState({ simpletableCode: undefined }) }
				)

			})

		});

		$(".downloadReportToCSV").on("click", function(e) {
			e.preventDefault()

			var modal = LeoKit.confirm('Do you want to apply the Top ' + ReportStore.getLimit() + ' filter for this download?', {
				'No, do not limit results': function(e) {
					thisComponent.exportReport($(this), false, modal, true)
				},
				'Yes, limit results': function(e) {
					thisComponent.exportReport($(this), true, modal, true)
				}
			})

		})

		$(".downloadReportToCSVNOHeaders").on("click", function(e) {
			e.preventDefault()

			var modal = LeoKit.confirm('Do you want to apply the Top ' + ReportStore.getLimit() + ' filter for this download?', {
				'No, do not limit results': function(e) {
					thisComponent.exportReport($(this), false, modal, false)
				},
				'Yes, limit results': function(e) {
					thisComponent.exportReport($(this), true, modal, false)
				}
			})

		})

		var reportClient = new Clipboard('.copyReportToClipboard', {
			text: function() {
				return ReportStore.exportData(true, true)
			}
		});
		reportClient.on("success", function(readyEvent) {
			window.messageNotify('The contents are now on your clipboard', 'info')
		});

		var reportClient = new Clipboard('.copyReportToClipboardNoHeaders', {
			text: function() {
				return ReportStore.exportData(true, false)
			}
		});
		reportClient.on("success", function(readyEvent) {
			window.messageNotify('The contents are now on your clipboard', 'info')
		});

		//REGISTER STORE CHANGE LISTENERS
		ReportStore.addChangeListener(this._onReportStoreChange);
		ReportFilterStore.addChangeListener(this._onReportFilterStoreChange);

		//MAKE INITIAL ACTION CALLS HERE
		Serializer.deSerialize();
		ReportActions.repivot();
	},


	componentWillUnmount: function() {
		//UNREGISTER STORE CHANGE LISTENERS
		ReportStore.removeChangeListener(this._onReportStoreChange);
		ReportFilterStore.removeChangeListener(this._onReportFilterStoreChange);
	},


	_onReportStoreChange: function() {

		/* skip if loading and we already know about it */
		if (!ReportStore.getLoadingStatus() || !this.state.isLoading) {
			this.setState({
				isLoading: ReportStore.getLoadingStatus(),
				columnMetrics: [],
				columnDims: ReportStore.getPartitions(),
				rowDims: ReportStore.getDimensions(),
				rowMetrics: ReportStore.getMetrics(),
				isLocked: ReportStore.getLockedStatus(),
				columnHeaders: ReportStore.getColumnHeaders(),
				columns: ReportStore.getColumns(),
				rows: ReportStore.getRows(),
				rowHeaders: ReportStore.getRowHeaders(),
				headers: ReportStore.getHeaders(),
				sorted: ReportStore.getSorted(),
				top: ReportStore.getTopLimit(),
				advanced: ReportStore.getAdvanced()
			}, function() {
				if (this.state.columnMetrics.length > 0 || this.state.rowMetrics.length > 0){
					var thisComponent = this;
					setTimeout(function() { //Give the dispatcher room to breathe
						FieldsActions.findCommonDimensions(thisComponent.state.columnMetrics.concat(thisComponent.state.rowMetrics));
						FieldsActions.findCommonFacts(thisComponent.state.columnDims.concat(thisComponent.state.rowDims));
					}, 100);
				}
			}.bind(this));
			var error = ReportStore.getLastError();
			if (error != '' && !ReportStore.getLoadingStatus()) {
				window.messageModal(error, 'error')
			}
		}
	},


	_onReportFilterStoreChange: function() {
		this.setState({
			reportFilters: ReportFilterStore.getReportFilters()
		});
	},


	removeFilter: function(columnId) {
		ReportFilterActions.removeReportFilter(columnId);
		Serializer.updateWindowHash();
	},


	updateColumn: function(column_type, from, id, replace) {
		ReportActions.updateColumn(column_type, from, id, replace);
		Serializer.updateWindowHash();
	},

	addDimension: function(to, position, dimension) {
		ReportActions.addDimension(to, position, dimension);
	},

	removeDimension: function(from, dimension) {
		ReportActions.removeDimension(from, dimension);
		Serializer.updateWindowHash();
	},

	addMetric: function (to, position, metric) {
		ReportActions.addMetric(to, position, metric);
	},

	removeMetric: function(from, metric) {
		ReportActions.removeMetric(from, metric);
		Serializer.updateWindowHash();
	},

	swapSortContainer: function(from, type, id) {
		ReportActions.swapSortContainer(from, type, id);
		Serializer.updateWindowHash();
	},

	updateFilter: function(filter) {
		ReportFilterActions.updateReportFilter(filter);

		setTimeout(function() {
			Serializer.updateWindowHash();
		}, 50);
	},


	updateLimit: function(limitAmount) {
		ReportActions.updateLimit(limitAmount);
		Serializer.updateWindowHash();
	},


	autoComplete: function(filter_id, term, callback) {
		ReportFilterActions.autocomplete2(filter_id, term, callback);
	},


	rawCode: function(values) {
		if (values) {
			document.location.hash = '#' + JSON.stringify(values)
		} else {
			try {
				return JSON.parse(document.location.hash.slice(1))
			} catch(e) {
				return document.location.hash.slice(1)
			}
		}
	},


	updateAdvanced: function(advanced) {
		ReportStore.setAdvanced(advanced)
		Serializer.updateWindowHash()
	},


	render: function() {

		var className = "report expandheight";
		if (this.state.dragging) {
			className += " dragging";
		}

		var limitLabel = ReportStore.getLimitLabel()

		return (

		<main className="page-main-wrapper">

			<div id="tool-bar" className="page-sub-header">

				<SelectData dialogOpen={this.props.dialogOpen} selectDataExpanded={this.props.selectDataExpanded} inputBoxArrows={{ metric: ['row'], dimension: ['row', 'column'] }} />

				<ToolDock rawCode={this.rawCode} advanced={this.state.advanced} chart_id={this.state.chart_id} updateAdvanced={this.updateAdvanced} />

				<Filters key="filters" ref="filters"
					selectDataExpanded={this.props.selectDataExpanded}
					isLocked={this.state.isLocked}
					removeFilter={this.removeFilter}
					reportFilters={this.state.reportFilters}
					fieldDimensions={this.state.fieldDimensions}
					hasRowMetrics={this.state.rowMetrics.length>0}
					hasColumnMetrics="false"
					updateFilter={this.updateFilter}
					autoComplete={this.autoComplete}
					limit={this.state.top ? this.state.top.limit : 2000}
					limitLabel={limitLabel}
					updateLimit={this.updateLimit}
				/>

			</div>

			<section id="reportMain" className={this.props.selectDataExpanded ? 'select-data-expanded' : ''}>

				<ReportColumns key="columns"
					isLoading={this.state.isLoading}
					isLocked={this.state.isLocked}
					columns={this.state.columns}
					rowHeaders={this.state.rowHeaders}
					removeDimension={this.removeDimension}
					removeMetric={this.removeMetric}
					dragging={this.dragging}
					swapSortContainer={this.swapSortContainer}
					advanced={this.state.advanced}
				/>

				<div>

					{
						this.state.locked || !this.state.isLoading

						? <ReportGrid
							ref="reporttable"
							isLoading={this.state.isLoading}
							drillIn={this.drillIn}
							columnHeaders={this.state.columnHeaders}
							columns={this.state.columns}
							rowHeaders={this.state.rowHeaders}
							headers={this.state.headers}
							rows={this.state.rows}
							sorted={this.state.sorted}
							advanced={this.state.advanced}
							updateAdvanced={this.updateAdvanced}
						/>

						: <div>
							<section id="reporttable" className="report-table flexbox-parent">
								&nbsp;
								<div className="theme-spinner-fill"></div>
							</section>
						</div>
					}

					<ReportRows key="rows"
						isLoading={this.state.isLoading}
						isLocked={this.state.isLocked}
						columns={this.state.columns}
						columnHeaders={this.state.columnHeaders}
						removeDimension={this.removeDimension}
						removeMetric={this.removeMetric}
						dragging={this.dragging}
						swapSortContainer={this.swapSortContainer} />

				</div>

			</section>

			{
				this.state.simpletableCode
				? (<div>
					<div id="simpletableCode">
						<pre style={{ width: '80vw', maxHeight: '70vh', overflow: 'auto' }}>{this.state.simpletableCode}</pre>
						<div>
							<CopyToClipboard className="pull-right" text={() => { return $('#simpletableCode pre').text() }} />
						</div>
					</div>
				</div>)
				: false
			}

		</main>

		);
	},

	drillIn: function(filters) {
		var thisComponent = this;

		for(var i = 0; i < filters.length; i++) {
			var filter = filters[i];

			var position = $.inArray(filter.id, this.columnDims);
			if (position !== -1) {
				this.columnDims.splice(position, 1);
			}
			var position = $.inArray(filter.id, this.rowDims);
			if (position !== -1) {
				this.rowDims.splice(position, 1);
			}

			filter.checkboxes = { '_':null };
			if (!Array.isArray(filter.value)) {
				filter.value = [filter.value];
			}
			filter.checkboxes[filter.value[0]] = 'true';
			ReportFilterActions.updateReportFilter(filter);
		}

		setTimeout(function() {
			Serializer.updateWindowHash();
		}, 50);
	},

	dragging: function(isDragging) {
		this.setState({dragging: isDragging});
	},


	exportReport: function(a, limit, modal, show_headers) {

		if (!limit) {
			if (!this.state.isLoading) {
				var top = this.state.top
				if (top.limit < 2000) {
					this.setState({
						isLoading: true,
						top: null
					}, () => {
						this.updateLimit(null)
						setTimeout(() => {
							this.exportReport(false, limit, modal, show_headers)
						}, 1000)
					})
					return
				}
			} else {
				setTimeout(() => {
					this.exportReport(false, limit, modal.show_headers)
				}, 1000)
				return
			}
		}

		//The Report Store is in charge of output
		var exportData = ReportStore.exportData(false, show_headers)

		var link = $('<a />')
			.attr('target', '_blank')
			.attr('download', 'Datawarehouse Export.csv')
			.attr('href', 'data:text/csv;base64,' + btoa(exportData))
		link[0].click()

		modal.find('.theme-close').trigger('click')
	}


});
