import React from 'react';
import { inject, observer } from 'mobx-react';
import CopyToClipboard from './copyToClipboard.jsx';
import ReportCodeEditor from '../report/reportCodeEditor.jsx';
import ReportQueriesViewer from '../report/reportQueriesViewer.jsx';
import AdvancedSettings from '../toolDock/advancedSettings.jsx';

@inject('dataStore')
@observer
export default class ToolDock extends React.Component {

	constructor(props) {
		super(props);
		this.dataStore = this.props.dataStore;

		this.state = ({
			dialog: false
		});

		this.showDialog = this.showDialog.bind(this);
		this.closeDialog = this.closeDialog.bind(this);
	}


	clearReport() {
		window.location.hash = '#';
		this.dataStore.loading = false;
		this.dataStore.report = {};
		this.dataStore._reportFilters = [];
		this.dataStore.reportInfo = { "rows": [], "columns": [] };
		this.dataStore.urlObj = { "partitions": [], "dimensions": [], "metrics": [], "filters": [], "sort": [], "redshift": true };
		this.dataStore.showQueries = ["No queries"];
		this.dataStore.getGrayOutLookup();
	}


	showDialog(dialog) {
		this.setState({ dialog: dialog });
	}


	closeDialog() {
		this.setState({ dialog: false });
	}


	exportReport() {
		let link = $('<a />')
			.attr('download', 'Datawarehouse Export.csv')
			.attr('href', this.dataStore.download.url);
		link[0].click()
	}

	exportReportExcel() {
		let link = $('<a />')
			.attr('download', 'Datawarehouse_Export.csv')
			.attr('href', this.dataStore.exceldownload.url);
		link[0].click()
	}

	render() {

		return (
			<nav className="page-sub-nav">

				<ul>
					<li onClick={this.dataStore.getReport}>
						<a title="Run Report">
							<i className="icon-spin6"></i>
						</a>
					</li>
					<li onClick={this.showDialog.bind(this, 'shareLink')}>
						<a title="Copy Report Link">
							<i className="icon-share" />
						</a>
					</li>
					<li onClick={(e) => this.clearReport(e)}>
						<a title="Clear Report">
							<i className="icon-eraser"></i>
						</a>
					</li>
					<li className="theme-dropdown-right">
						<a className="downloadReportToCSV" onClick={() => this.exportReport()}>
							<i className="icon-download"></i>
						</a>
						<ul>
							<li>
								<a className="downloadReportToCSV" onClick={() => this.exportReport()}>
									<i className="icon-download" /> Download CSV
                                </a>
							</li>

							<li>
								<a className="downloadReportToCSV" onClick={() => this.exportReportExcel()}>
									<i className="icon-download" /> Download CSV (Excel)
                                </a>
							</li>
							<li>
								<a className="copyReportToClipboard active">
									<i className="icon-copy" /> Copy to Clipboard
                                </a>
							</li>
						</ul>
					</li>

					<li className="theme-dropdown-right">
						<a onClick={this.showDialog.bind(this, 'advancedSettings')}>
							<i className="icon-cogs"></i>
						</a>
						<ul>
							<li>
								<a onClick={this.showDialog.bind(this, 'advancedSettings')}>
									<i className="icon-cog" /> Advanced Settings
                                </a>
							</li>
							<li onClick={this.showDialog.bind(this, 'editCode')}>
								<a>
									<i className="icon-code" /> View Code
                                </a>
							</li>

							{
								this.dataStore.showQueries || localStorage.return_queries === 'true'
								?	<li onClick={this.showDialog.bind(this, 'queries')}>
										<a>
											<i className="icon-info" /> View Queries
										</a>
									</li>
									: false
							}

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
						? <Themes onClose={() => { this.setState({ showThemes: false }) }} />
						: false
				}

				{
					(() => {

						switch (this.state.dialog) {
							case 'editCode':
								return <ReportCodeEditor rawCode={this.dataStore.urlObj} onClose={this.closeDialog} />
								break;

                            case 'queries':
                                return <ReportQueriesViewer queries={this.dataStore.showQueries} onClose={this.closeDialog} />
                                break;

							case 'shareLink':
								return <LinkModal reportLink={window.location} value={this.dataStore.bitlyLink} bitlyStatus={this.dataStore.bitlyStatus} dataStore={this.dataStore} onClose={this.closeDialog} />
								break;

							case 'advancedSettings':
								return <AdvancedSettings onClose={this.closeDialog} />
								break;

							default:
								return false
								break
						}

					})()
				}
			</nav>
		);
	}
}

let LinkModal = class LinkModal extends React.Component {

	handleClick(e) {
		e.target.select();
	}

	componentDidMount() {
		LeoKit.modal($('#linkModal'),
			{ close: false },
			'Share Report',
			this.props.onClose
		);
		this.props.dataStore.getBitlyUrl(this.props.reportLink);
	}

	render() {
		let url = this.props.dataStore.decodeURL(window.location.href);
		let urlDisplayed = this.props.bitlyStatus !== 200 ? url : this.props.value;
		return (<div>
			<div id="linkModal">
				<textarea id="shareReportLink" className="theme-monospace edit-script" value={urlDisplayed} readOnly onClick={(e) => this.handleClick(e)} style={{ width: '80vw' }} />
				<CopyToClipboard className="text-right" data-clipboard-target="#shareReportLink" />
			</div>
		</div>)
	}
};