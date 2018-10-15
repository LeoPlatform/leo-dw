import React from 'react';
import {inject, observer} from 'mobx-react';
import SelectData from './selectData.jsx';
import ToolDock from './toolDock/toolDock.jsx';
import Filters from './filters/filters.jsx';
import ReportColumns from './report/reportColumns.jsx';
import ReportRows from './report/reportRows.jsx';
import ReportTable from './table/reportTable.jsx';


@inject('dataStore')
@observer
export default class DataExplorerPage extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
        window.onhashchange =()=>{
            let changed = window.hashChangeCallback;
            if(!changed) {
                this.dataStore.getInitialURL(window.location.hash)
            } else {
                changed();
            }
        }
        this.showBar = this.showBar.bind(this);
    }

    componentDidMount() {
        new Clipboard('.copyReportToClipboardNoHeaders', {
            text: () => {
                return this.dataStore.formatDataForExport(false, false)
            }
        }).on("success", () => {
            window.messageNotify('The contents are now on your clipboard', 'info')});

        new Clipboard('.copyReportToClipboard', {
            text: () => {
                return this.dataStore.formatDataForExport(false, true)
            }
        }).on("success", () => {
            window.messageNotify('The contents are now on your clipboard', 'info')});
    }

    showBar() {
        $('#select-data').show();
        $('#reportMain').css('left', '475px');
        $('#select-data').addClass('expanded');
        localStorage.sidebar = false;
    }

    abortQuery() {
        this.dataStore.reportRequest.abort();
        this.dataStore.loading = false;
        $("#showRendering").hide();
        $("#cancelQuery").hide()
    }

    render() {
        return (
            <main className="page-main-wrapper">
                <i className="icon-right-open sidebar" style={{float: 'left', position: 'relative', top: '8px', right: '-15px', fontSize: '30px', width: '30px'}} onClick={this.showBar}></i>
                <div id="tool-bar" className="page-sub-header">
                    <SelectData/>
                    <ToolDock rawCode={this.dataStore.rawCode}/>
                    <Filters key="filters" ref="filters"/>
                </div>

                <section id="reportMain" className={'select-data-expanded'}>

                    <ReportColumns key="columns"
                                   isLoading={this.dataStore.loading}
                                   advanced={false}
                    />

                    <div>
                        <button id="cancelQuery" className="cancelQuery" type="button" onClick={() => this.abortQuery()}>Cancel Query</button>
                        <h2 id="showRendering">Building Table...</h2>
                        {
                            !this.dataStore.loading
                                ? <ReportTable
                                    ref="reporttable"
                                    columnHeaders={this.dataStore.report.columnheaders}
                                    columns={this.dataStore.report.columns}
                                    rowHeaders={this.dataStore.report.rowheaders}
                                    headers={this.dataStore.report.headers}
                                    rows={this.dataStore.report.rows}
                                />
                                :
                                    <div>
                                        <section id="reporttable" className="report-table flexbox-parent">
                                            &nbsp;
                                            <div className="theme-spinner-fill"></div>
                                        </section>
                                    </div>

                        }
                        <ReportRows key="rows" isLoading={this.dataStore.loading}/>
                    </div>
                </section>
            </main>
        );
    }
}