var React = require('react');
var WebAPI = require('../../utils/WebAPI');
var ReportStore = require('../../stores/ReportStore');
var FieldsStore = require('../../stores/FieldsStore');
var deepDiff = require("deep-diff");

var IdUtils = require('../../utils/IdUtils');
var Editable = require('./Editable.jsx');

module.exports = React.createClass({


	getInitialState: function() {
		return {
			library: false,
			dropDown: this.props.dropDown
		}
	},


	componentDidMount: function() {

		this.loadLibrary((library) => {
			this.setState({ library: library }, () => {
				if (this.props.addToLibrary) {
					this.addChart(this.props.addToLibrary)
				}
				if (!this.props.dropDown) {
					LeoKit.center(this.modal)
				}
			})
		})

		if (this.props.dropDown) {

			$('.hover' + this.props.dropDown + 'List').append($('.' + this.props.dropDown + 'ListDropDown'))

		} else {

			this.modal = LeoKit.modal(
				$('.report-library'), (
					this.props.editor != 'pe'
					? {
						'Add Current Report to Library': () => {
							this.addChart('current')
							return false
						},
						close: false
					}
					: {
						close: false
					}
				),
				'Report Library',
				this.onClose
			)

			setTimeout(() => {
				$('#report-library tbody').sortable({
					items: 'tr',
					handle: '.icon-menu',
					axis: 'y',
					stop: (event, ui) => {
						var ids = $('#report-library tbody').sortable('toArray', { attribute: 'data-id' });
						$('#report-library tbody').sortable('cancel');
						this.loadLibrary((library) => {
							library.sort(function(a, b) {
								return ids.indexOf(a.id.toString()) - ids.indexOf(b.id.toString())
							})
							this.setState({library:library}, () => {
								this.saveLibrary()
							})
						})
					}
				})

				$('.click-expand').click(function() {
					var expanded = $(this).hasClass('active')
					$('.click-expand').removeClass('active')
					if (!expanded) {
						$(this).addClass('active');
					}
				})

			}, 1000)

		}

	},


	onClose: function() {
		this.props.onClose && this.props.onClose()
	},


	addChart: function(report) {

		if (report === 'current') {
			report = document.location.hash.slice(1)
			$('.theme-dialog .theme-button-primary:contains("Add Current Report to Library")').attr('disabled', true)
		}

		this.loadLibrary((library) => {

			var obj = {},
				metrics = [],
				title = [],
				style = [],
				script = ''

			try {
				obj = JSON.parse(report)
			} catch(e) {
				try {
					obj = (new Function("return " + report))();
					script = report
				} catch(e) {
					console.log('script parse error', e)
					return false
				}
			}

			if (obj.series) {
				obj.series.forEach(function(serie) {
					serie.metrics.forEach(function(metric) {
						metrics.push(metric.id)
					});
				})
			} else if (obj.metrics) {
				obj.metrics.forEach(function(metric) {
					if (metric.id) {
						metrics.push(metric.id)
						if (metric.highcharts && metric.highcharts.type) {
							style.push(metric.highcharts.type)
						}
					} else {
						metrics.push(metric)
					}
				});
			} else if (obj.metric) {
				metrics.push(obj.metric)
			} else if (obj.rowMetrics) {
				obj.rowMetrics.forEach(function(metric) {
					metrics.push(metric)
				});
			} else if (obj.columnMetrics) {
				obj.columnMetrics.forEach(function(metric) {
					metrics.push(metric)
				});
			}

			metrics.forEach(function(metric) {
				var details = IdUtils.details(metric)
				if (!details || !details.label || !details.parent) {
					title.push(metric)
				} else if (details.parent.label === details.label) {
					title.push(details.label + ' Count')
				} else {
					title.push(details.parent.label + ' ' + details.label)
				}
			})

			if (obj.series) {
				obj.series.forEach(function(serie) {
					style.push(serie.type)
				})
			} else if (obj.type) {
				style.push(obj.type)
			} else if (style.length == 0) {
				style.push('table')
			}

			var reportTitle = obj.label || title.join(', ')

			LeoKit.prompt('Enter report title', reportTitle,
				(data) => {
					library.unshift({
						id: Date.now(),
						editor: this.props.editor,
						style: style.join('-'),
						title: data.prompt_value,
						report: (this.props.editor == 'pe' ? '{}' : report),
						script: script || JSON.stringify(this.reportToScript(obj, title.join(', '), this.props.editor), null, 4),
						added: Date.now()
					})

					this.setState({ library: library }, () => {
						this.saveLibrary()
						window.messageLogNotify('Report added: ' + data.prompt_value, 'info')
					})
				},
				false
			)

		})

	},


	reportToScript: function(report, title, editor) {
		var script = '';
		switch(editor) {
			case 'pe':
				script = report
			break;

			case 've':
				script = {
					dimensions: report.dimensions || report.columns || [],
					filters: [],
					highcharts: script.advanced || [],
					metrics: report.metrics || []
				}
				if (report.series) {
					for(let i = 0; i < report.series.length; i++) {
						var series = report.series[i];
						var metrics = series.metrics;
						var highcharts = series.highcharts || {};
						highcharts.type = series.type;
						for(let j = 0; j < metrics.length; j++) {
							script.metrics.push({
								id: metrics[j].id,
								partitions: metrics[j].partitions,
								highcharts: highcharts
							});
						}
					}
				}
				for(let i = 0; i < report.filters.length; i++) {
					var filter = report.filters[i];
					script.filters.push({
						id: filter.id,
						value: filter.value,
						label: filter.label,
						comparison: filter.comparison
					});
				}
			break;

			case 'de':
				var filters = report.filters.map(function(filter) {
					return {
						id: filter.id,
						comparison: filter.comparison,
						value: filter.value
					}
				})
				var sorts = [];
				report.sort.forEach((sort) => {
					if (!sort.auto && sort.auto !== 'true') {
						sorts.push({
							direction: sort.direction,
							column: sort.column
						})
					}
				});
				script = {
					type: 'table',
					title: title,
					dimensions: report.dimensions,
					partitions: report.partitions,
					metrics: report.metrics,
					filters: filters,
					sort: sorts
				}
			break;
		}

		return script
	},


	componentWillReceiveProps(newProps) {
		if (newProps.addToLibrary !== this.props.addToLibrary) {
			this.addChart(newProps.addToLibrary)
		}
	},


	deleteReport: function(id) {
		var thisComponent = this;
		LeoKit.confirm('Are you sure you want to delete this report?', function() {
			thisComponent.loadLibrary(function(library) {

				// save local state, assume the call will work.
				library = library.filter(function(report) {
					return (report.id != id)
				})
				thisComponent.setState({ library: library });

				// Delete the library from the db
				WebAPI.delete("library/" + id, function(result){
					thisComponent.loadLibrary(function(library){
						thisComponent.setState({library:library});
					});
				});

			})
		})
	},


	loadLibrary: function(callback) {
		var userId = 0;
		WebAPI.get("library/user/"+ userId, function(result){
			localStorage.setItem('library', JSON.stringify(result));
			callback(result);
		});
	},


	saveLibrary: function() {
		var library = JSON.parse(localStorage.getItem('library') || "");
		var reportmap = {};
		// Mirror of DB state
		for(var key in library){
			var report = library[key];
			reportmap[report.id] = {
				id: report.id,
				user_id: report.user_id || 0,
				editor: report.editor,
				style: report.style,
				title: report.title,
				report: report.report,
				script: report.script,
				added: report.added
			}
		}

		var changed = [];
		// Check what has changed
		for(var key in this.state.library){
			var report = this.state.library[key];
			var state = {
				id: report.id,
				user_id: report.user_id || 0,
				editor: report.editor,
				style: report.style,
				title: report.title,
				report: report.report,
				script: report.script,
				added: report.added
			}

			// Check for a new entry
			var prev = reportmap[state.id];
			if (!prev){
				state.id = undefined;
				changed.push({new:state, orig:report});
			} else {
				// Diff to see if it needs to be saved
				var diff = deepDiff(prev, state);
				if (diff && diff.length > 0){
					changed.push({new:state, orig:report});
				}
			}
		}


		var _this = this;
		var lib = this.state.library;
		var cnt = 0;
		for(var key in changed){
			// Send each request and update the id with the response
			WebAPI.post("library", changed[key].new, function(id){
				if (typeof id !== 'string' && id.message) {
					LeoKit.alert(id.message)
				} else {
					changed[key].orig.id = id;
					console.log("Done with: " + key);
					cnt++;
					if (cnt >= changed.length){
						// Update React and local storage when the last one completes
						localStorage.setItem('library', JSON.stringify(lib));
						_this.setState({library : lib});
					}
				}
			});
		}
	},


	loadReport: function(script) {
		if (script) {
			this.props.loadReport(script)
			$('#report-library').closest('.theme-dialog').find('.theme-icon-close').trigger('click')
		} else {
			alert('Missing Report Script!')
		}
	},


	closeDialog: function() {
		$('.report-library').closest('.theme-dialog').find('.theme-icon-close').trigger('click')
	},


	editTitle: function(id, title) {
		this.loadLibrary((library) => {
			library.forEach(function(report) {
				if (report.id == id) {
					report.title = title
				}
			})
			this.setState({ library: library }, function() {
				this.saveLibrary()
			})
		})
	},


	render: function() {

		return (<div className="report-library-wrapper">

		{
			this.props.dropDown
			? (<ul className={this.props.dropDown + 'ListDropDown'}>
			{
				this.state.library
				? (
					this.state.library.map((report, key) => {
						var href = (this.props.dropDown == 'DataExplorer' ? './builder#' : './chart#') + report.report
						return (<li key={key}>
							<a href={href}>{report.title}</a>
						</li>)
					})
				)
				: <li className="theme-spinner-tiny"></li>
			}
			</ul>)

			: (<div id="report-library" className="report-library">

				{
					this.state.library
					? (<div className="theme-table-fixed-header">
						<table>
							<thead>
								<tr>
									<th>Editor</th>
									<th>Chart(s)</th>
									<th>Title</th>
									<th>Link</th>
									{/*<th>Script</th>*/}
									<th>Added</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
							{
							this.state.library.map((report, key) => {

								if (window.top !== window.self) {
									if (this.props.editor != report.editor) {
										return false
									}
								}

								if (report.report) {
									try {
										report.formatted = JSON.stringify(JSON.parse(report.report), null, 4)
									} catch(e) {}
								}

								return (<tr key={key} data-id={report.id}>
									<td className="editor">
									{
										(() => {

											switch(report.editor) {
												case 'de':
													return (<a href={'./builder#' + report.report} onClick={this.closeDialog}>
														<i className="icon-layers"></i>
														<span>Data Explorer</span>
													</a>)
												break;
												case 've':
													return (<a href={'./chart#' + report.report} onClick={this.closeDialog}>
														<i className="icon-chart-line"></i>
														<span>Visual Explorer</span>
													</a>)
												break;
												case 'pe':
													return (<span>
														<i className="icon-spinner"></i>
														<span>Dashboards</span>
													</span>)
												break;
											}
										})()
									}
									</td>
									<td>
									{
										report.style.split('-').map(function(style, key) {
											switch(style) {
												case 'area': case 'bar': case 'column': case 'line': case 'pie': case 'gauge':
													return <i key={key} className={"icon-chart-" + style} title={style+' chart'}></i>
												break;
												case 'table': case 'simpletable':
													return <i key={key} className="icon-table" title="simpletable"></i>
												break;
												case 'ranked':
													return <i key={key} className="icon-sort-alt-down" title="ranked"></i>
												break;
												case 'single_number':
													return <i key={key} className="icon-sort-numeric" title="single number"></i>
												break;
												case 'calculated_metric':
													return <i key={key} className="icon-calc" title="calculated metric"></i>
												break;
											}
										})
									}
									</td>
									<th className="title"><Editable onChange={this.editTitle.bind(null, report.id)}>{report.title || '\u00a0'}</Editable></th>
									<td><div className="click-expand">{report.formatted || report.report}</div></td>
									{/*<td><div>{typeof report.script != 'string' ? JSON.stringify(report.script) : report.script}</div></td>*/}
									<td>{new Date(report.added).toLocaleString()}</td>
									<td className="actions">
										{
											this.props.loadFromLibrary
											? <button className={'display-none ' + (report.script ? 'theme-button-primary' : 'theme-button-disabled')} type="button" onClick={this.loadReport.bind(null, report.script)}>Select</button>
											: [
												<i key="0" className="icon-menu" title="reorder"></i>,
												<i key="1" className="icon-cancel" title="delete" onClick={this.deleteReport.bind(null, report.id)}></i>
											]
										}

									</td>
								</tr>)
							})
						}
							</tbody>
						</table>
					</div>)
					: <div>
						<div className="theme-spinner" style={{width:'100%',height:200}}></div>
					</div>
				}
			</div>)

		}

		</div>)

	}

});
