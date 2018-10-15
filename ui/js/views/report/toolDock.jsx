var React = require('react');

var Serializer = require('../../utils/Serializer');
var ReportLibrary = require('../common/ReportLibrary.jsx')
var ExternalCodeEditors = require('../common/ExternalCodeEditors.jsx')
var ReportCodeEditor = require('../common/ReportCodeEditor.jsx')
var AdvancedSettings = require('./dialogs/AdvancedSettings.jsx')
var ChartAdvancedSettings = require('../charts/chartAdvancedSettings.jsx')
var Themes = require('../common/themes.jsx')
var CopyToClipboard = require('../common/copyToClipboard.jsx')

var MessageList = require('../common/messageList.jsx')

module.exports = React.createClass({

	getInitialState: function() {
		return {
			dialog: false
		}
	},


	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired
	},


	clearReport: function(e) {
		e.preventDefault()
		if (window.location.pathname.split('/').indexOf('builder') != -1) {
			localStorage.removeItem('DataExplorer.hash')
		} else if (window.location.pathname.split('/').indexOf('chart') != -1) {
			localStorage.removeItem('VisualExplorer.hash')
		}
		document.location.hash = '#'
	},


	showDialog: function(dialog) {
		this.setState({ dialog: dialog })
	},


	closeDialog: function() {
		this.setState({ dialog: undefined })
	},


	openIn: function() {
		document.location.href = (this.props.buildCode ? 'builder' : 'chart') + document.location.hash
	},


	render: function() {

		return (
			<nav className="page-sub-nav">

				<ul>
					<li>
						<a title="Clear Report" onClick={this.clearReport}>
							<i className="icon-eraser"></i>
						</a>
					</li>
					<li className="theme-dropdown-right">
						<a className="copyReportToClipboard">
							<i className="icon-download"></i>
						</a>
						<ul>
							<li>
								<a className="copyReportToClipboard active">
									<i className="icon-copy"/> Copy to Clipboard
								</a>
							</li>
							<li>
								<a className="downloadReportToCSV">
									<i className="icon-download" /> Download CSV
								</a>
							</li>
							<li>
								<a className="copyReportToClipboardNoHeaders active">
									<i className="icon-copy"/> Copy to Clipboard (no headers)
								</a>
							</li>
							<li>
								<a className="downloadReportToCSVNOHeaders">
									<i className="icon-download" /> Download CSV (no headers)
								</a>
							</li>
						</ul>
					</li>
					<li className="theme-dropdown-right">
						<a onClick={() => { this.setState({ showLibrary: true }) }}>
							<i className="icon-book"></i>
						</a>
						<ul>
							<li>
								<a className="active" onClick={() => { this.setState({ showLibrary: true }) }}>
									<i className="icon-book" /> View Library
								</a>
							</li>
							<li>
								<a onClick={() => { this.setState({ addToLibrary: 'current' }) }}>
									<i className="icon-plus" /> Add Current to Library
								</a>
							</li>
						</ul>
					</li>

					<li className="theme-dropdown-right">
						<a onClick={this.showDialog.bind(this, this.props.buildCode ? 'editVEAdvancedSettings' : 'editDEAdvancedSettings')}>
							<i className="icon-cogs"></i>
						</a>
						<ul>
							<li onClick={this.showDialog.bind(this, this.props.buildCode ? 'editVEAdvancedSettings' : 'editDEAdvancedSettings')}>
								<a className="active">
									<i className="icon-cog" /> Advanced Settings
								</a>
							</li>
							<li onClick={this.showDialog.bind(this, 'editCode')}>
								<a>
									<i className="icon-code" /> View Code
								</a>
							</li>
							{
								this.props.buildCode
								? <li>
									<a onClick={this.showDialog.bind(this, 'codeModal')}>
										<i className="icon-code" /> Embeddable Code
									</a>
								</li>
								: <li>
									<a className="viewSimpleTableCode">
										<i className="icon-table" /> View SimpleTable Code
									</a>
								</li>
							}
							<li>
								<a onClick={this.showDialog.bind(this, 'shareLink')}>
									<i className="icon-share" /> View Share Report Link
								</a>
							</li>
							<li>
								<a onClick={this.openIn}>
								{
									this.props.buildCode
									? (<span><i className="icon-layers" /> Toggle to Data Explorer</span>)
									: (<span><i className="icon-chart-line" /> Toggle to Visual Explorer</span>)
								}
								</a>
							</li>

							<li>
								<a onClick={this.showDialog.bind(this, 'historyModal')}>
									<i className="icon-history" /> Last 10 Reports
								</a>
							</li>

							<li>
								<a onClick={this.showDialog.bind(this, 'messages')}>
									<i className="icon-comment" /> View Messages
								</a>
							</li>

							{
								localStorage.getItem('leo-testing')
								? <li>
									<a onClick={() => { this.setState({ showThemes: true }) }}>
										<i className="icon-shareable" /> Themes
									</a>
								</li>
								: false
							}

							<li>
								<div className="special-link text-center">Version <span>{(window.dw ? window.dw.version : '-')}</span></div>
							</li>

						</ul>
					</li>
				</ul>

				{
					this.state.showLibrary || this.state.addToLibrary
					? <ReportLibrary editor={this.props.buildCode ? 've' : 'de'} addToLibrary={this.state.addToLibrary} onClose={() => { this.setState({ showLibrary: false, addToLibrary: false }) }} />
					: false
				}

				{
					this.state.showThemes
					? <Themes onClose={() => { this.setState({ showThemes: false })}} />
					: false
				}

				{
					(function(thisComponent) {

						switch(thisComponent.state.dialog) {

							case 'historyModal':
								return <HistoryModal buildCode={thisComponent.props.buildCode} onClose={thisComponent.closeDialog} />
							break

							case 'editCode':
								return <ReportCodeEditor rawCode={thisComponent.props.rawCode} buildCode={thisComponent.props.buildCode} onClose={thisComponent.closeDialog} />
							break

							case 'shareLink':
								return <LinkModal reportLink={(!thisComponent.props.reportLink) ? Serializer.createLinkToReport() : thisComponent.props.reportLink} onClose={thisComponent.closeDialog} />
							break

							case 'codeModal':
								return <CodeModal buildCode={thisComponent.props.buildCode} onClose={thisComponent.closeDialog} />
							break

							case 'editDEAdvancedSettings':

								var advanced = JSON.parse(JSON.stringify(thisComponent.props.advanced || {}))
								if (thisComponent.props.chart_id) {
									advanced.chart_id = thisComponent.props.chart_id
								}

								return <AdvancedSettings ref="editAdvancedSettings" advanced={advanced} onClose={thisComponent.closeDialog} />
							break

							case 'editVEAdvancedSettings':

								var advanced = JSON.parse(JSON.stringify(thisComponent.props.advanced || {}))
								if (thisComponent.props.sort && thisComponent.props.sort.length > 0) {
									advanced.sort = thisComponent.props.sort[0]
								}
								if (thisComponent.props.chart_id) {
									advanced.chart_id = thisComponent.props.chart_id
								}

								return <ChartAdvancedSettings ref="editVEAdvancedSettings" advanced={advanced} onClose={thisComponent.closeDialog} onSave={thisComponent.props.applyAdvancedChanges}/>
							break

							case 'messages':
								return <MessageList onClose={thisComponent.closeDialog} />
							break

							default:
								return false
							break
						}

					})(this)
				}

			</nav>
		);

	}

});


var HistoryModal = React.createClass({

	handleClick: function(e) {
		e.target.select();
	},

	componentDidMount: function() {

		LeoKit.modal($('#historyModal'),
			{ close: false },
			'Last 10 Reports',
			this.props.onClose
		)

	},

	render: function() {

		var history = JSON.parse(localStorage.getItem(this.props.buildCode ? 'VisualExplorer.history' : 'DataExplorer.history') || '[]')

		return (<div>
			<div id="historyModal" className="theme-table-fixed-header">
				<table>
					<thead>
						<tr>
							<th style={{ width: 150 }}>ran at</th>
							<th style={{ width: 100 }}>result</th>
							<th>hash</th>
						</tr>
					</thead>
					<tbody>
						{
							history.map((report, key) => {

								var hash = report.hash
								try {
									hash = JSON.stringify(JSON.parse(report.hash.slice(1)), null, 4)
								} catch(e) {}

								return (<tr key={key}>
									<td style={{ width: 150 }}>{moment(report.timestamp).format('MMM d, Y h:mm:ss a')}</td>
									<td style={{ width: 100 }}>{report.statusText || report.status || ''}</td>
									<td style={{ whiteSpace: 'nowrap', 'overflow': 'hidden'}}>
										<a href={(this.props.buildCode ? 'chart' : 'builder') + report.hash} className="xtheme-pre">{hash}</a>
									</td>
								</tr>)
							})
						}
					</tbody>
				</table>
			</div>
		</div>)

	}

})


var LinkModal = React.createClass({

	handleClick: function(e) {
		e.target.select();
	},

	componentDidMount: function() {

		LeoKit.modal($('#linkModal'),
			{ close: false },
			'Share Report',
			this.props.onClose
		)

	},

	render: function() {

		return (<div>
			<div id="linkModal">
				<textarea id="shareReportLink" className="theme-monospace edit-script" value={this.props.reportLink} readOnly onClick={this.handleClick} style={{ width: '80vw' }} />
				<CopyToClipboard className="text-right" data-clipboard-target="#shareReportLink" />
			</div>
		</div>)

	}

})


var CodeModal = React.createClass({

	handleClick: function(e) {
		e.target.select();
	},


	componentDidMount: function() {

		LeoKit.modal($('#codeModal'),
			{ close: false },
			'Embeddable Code',
			this.props.onClose
		)

	},


	render: function() {

		return(<div>
			<div id="codeModal">
				<textarea id="shareCode" className="edit-script" value={this.props.buildCode()} readOnly onClick={this.handleClick} style={{ width: '80vw', height:'75vh'}} />
				<div>
					<CopyToClipboard className="pull-right" data-clipboard-target="#shareCode" />
					<ExternalCodeEditors code={this.props.buildCode(1)} />
				</div>
			</div>
		</div>)

	}

})
