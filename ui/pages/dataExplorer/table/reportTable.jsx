import React from 'react';
import { inject, observer } from 'mobx-react';
import { toJS } from 'mobx';
import numeral from 'numeral';

@inject('dataStore')
@observer
export default class ReportTable extends React.Component {

	constructor(props) {
		super(props);
		this.dataStore = this.props.dataStore;
		this.state = {
			inlineFilters: {}
		};
	}

	componentDidMount() {
		$("#showRendering").hide();
		$("#cancelQuery").hide()
	}

	render() {
		let totals = [];
		let totalColumns = this.dataStore.report && this.dataStore.report.mapping && this.dataStore.report.mapping.length > 0 ? this.dataStore.report.mapping : [];

		let dimensionHeader = {
			'backgroundColor': '#dbedf8',
			'borderTop': '2px solid #3b86c7',
			'borderRight': '2px solid #97c1e7',
			'borderBottom': '1px solid #97c1e7',
			'borderLeft': '2px solid #97c1e7',
			'boxSizing': 'border-box',
			'textAlign': 'center',
			'color': '#172945',
			'verticalAlign': 'middle',
			'fontSize': '.75rem',
			'overflow': 'hidden',
			'textOverflow': 'ellipsis',
			'whiteSpace': 'nowrap',
			'height': '30px'
		};

		let metricOrPartitionHeader = {
			'backgroundColor': '#eef5da',
			'borderTop': '3px solid #a2c539',
			'borderRight': '2px solid #a2c539',
			'borderBottom': '1px solid #a2c539',
			'boxSizing': 'border-box',
			'textAlign': 'center',
			'color': '#567e39',
			'verticalAlign': 'middle',
			'fontSize': '.75rem',
			'overflow': 'hidden',
			'textOverflow': 'ellipsis',
			'whiteSpace': 'nowrap',
			'height': '30px'
		};

		let dimensionData = {
			'padding': '0 8px',
			'boxSizing': 'border-box',
			'lineHeight': '28px',
			'whiteSpace': 'nowrap',
			'overflow': 'hidden',
			'textOverflow': 'ellipsis',
			'borderLeft': '1px solid #d6e6f3',
			'borderRight': '1px solid #d6e6f3',
			'borderBottom': '1px solid #d6e6f3',
		};

		let widthArr = [];
		let mappingWidth = {};

		this.dataStore.report && this.dataStore.report.columnheaders && this.dataStore.report.columnheaders.map((row, i) => {
			widthArr.push(`${row.width}px`);
			mappingWidth[row.id] = `${row.width}px`;
		});


		let dimensions = [];
		this.dataStore.report && this.dataStore.report.mapping && this.dataStore.report.mapping.map((row, i) => {
			if (row.type === 'attribute') {
				dimensions.push(row);
			}
			if (row.sort == undefined) {
				row.sort = {
					type: row.format
				}
			}
		});

		this.dataStore.report && this.dataStore.report.rows && this.dataStore.report.rows.filter((row, j) => {
			totalColumns.forEach((column, i) => {
				column = this.dataStore.report.columns[column.id] || column;
				let value = numeral().unformat(row[i]);
				if (typeof value === 'number' && column.format !== 'string') {
					totals[i] = (typeof totals[i] === 'undefined' ? 0 : totals[i]) + value
				} else {
					totals[i] = null;
				}
			})
		});

		return (
			<section key="reporttable" ref="reporttable" id="reporttable" className="report-table flexbox-parent">
				{
					!this.dataStore.loading && this.dataStore.urlObj.reportId ?
						<div style={{ fontSize: "14px", fontWeight: "bold", paddingBottom: "5px" }}>Report Id: {this.dataStore.urlObj.reportId}</div>
						: <div></div>
				}
				{
					this.dataStore.report.count !== this.dataStore.report.total ?
						<div style={{ fontSize: "14px", fontWeight: "bold", paddingBottom: "5px" }}>Showing {this.dataStore.report.count} of {this.dataStore.report.total} rows. <a href={this.dataStore.download.url} download="'Datawarehouse_Export.csv'">Click here</a> to download full report, or <a href={this.dataStore.exceldownload.url} download="'Datawarehouse_Export.csv'">here</a> for the excel report.</div>
						: <div></div>
				}
				{

					this.dataStore.loading
						?
						<div>
						</div>
						:
						this.dataStore.report && this.dataStore.report.rows && this.dataStore.report.rows.length === 0
							?
							<div style={{ "fontSize": "100px" }}>NO DATA</div>
							:
							<table className='fixed_headers'>
								<thead>
									{
										this.dataStore.report && this.dataStore.report.headers && (this.dataStore.report.length !== 0) && this.dataStore.report.headers.map((row, i) => {
											return <tr key={i}>
												{
													dimensions.map((val, j) => {
														let widthArrPositionNeeded = dimensions[i] === undefined ? dimensions.length - 1 : i;
														let widthOfDimensionHeader = mappingWidth[dimensions[widthArrPositionNeeded].id];
														let valueOfDimensionHeader = '';
														let style = { width: widthOfDimensionHeader, 'minWidth': widthOfDimensionHeader, 'maxWidth': widthOfDimensionHeader, height: '30px' };
														let className = 'row level0';
														if (j === (this.dataStore.urlObj && this.dataStore.urlObj.sort && this.dataStore.urlObj.sort.length !== 0 && this.dataStore.urlObj.sort[0] && this.dataStore.urlObj.sort[0].column) && i === this.dataStore.report.headers.length - 1) {
															className += ` sorted_${this.dataStore.urlObj.sort[0].direction}`
														}
														if (i === this.dataStore.report.headers.length - 1) {
															valueOfDimensionHeader = val.label || val.value;
															style = Object.assign(dimensionHeader, style)
														}
														return <th key={'a' + j} className={className} style={style} onClick={() => this.dataStore.sort(j)}>{valueOfDimensionHeader}</th>
													})
												}
												{
													this.dataStore.report && this.dataStore.report.headers && this.dataStore.report.headers.length !== 0 && this.dataStore.report.headers[i] && this.dataStore.report.headers[i].map((row, x) => {
														let colSpan = toJS(this.dataStore.report.headerMapping[i].filter(num => num === x)).length;
														let widthObj = Object.assign({ 'minWidth': row.width, 'maxWidth': row.width, 'width': row.width }, metricOrPartitionHeader)
														let className = 'row level0';
														let added = dimensions.length;
														if (x + added === (this.dataStore.urlObj && this.dataStore.urlObj.sort && this.dataStore.urlObj.sort.length !== 0 && this.dataStore.urlObj.sort[0] && this.dataStore.urlObj.sort[0].column) && i === this.dataStore.report.headers.length - 1) {
															className += ` sorted_${this.dataStore.urlObj.sort[0].direction}`
														}

														if (i === this.dataStore.report.headers.length - 1) {
															let label = (this.dataStore.report && this.dataStore.report.columns && this.dataStore.report.columns[row.id] && this.dataStore.report.columns[row.id].label) || '';
															if (this.dataStore.report.rows.length === 0 && this.dataStore.report.mapping.length === 0) {
																return <span></span>
															}
															return <th colSpan={colSpan} className={className} style={widthObj} key={x} onClick={() => this.dataStore.sort(x + added)}>{label}</th>
														}

														let partitionStyle = Object.assign(widthObj, { 'backgroundColor': '#f5f5f6', 'borderLeft': '2px solid #b0b0bc', 'borderRight': '2px solid #bfc0c3', 'borderTop': null, 'borderBottom': null, 'color': null });
														if (i === 0) {
															partitionStyle = Object.assign(widthObj, { 'borderTop': '2px solid #a8b8df', 'backgroundColor': '#eeeeef' });
														}

														return <th colSpan={colSpan} className={className} style={partitionStyle} key={x} onClick={() => this.dataStore.sort(x + added)}>{row.value}</th>
													})
												}
											</tr>
										})
									}
								</thead>
								<tbody>
									{
										this.dataStore.report && this.dataStore.report.rows && this.dataStore.report.rows.map((row, i) => {
											return (
												<tr key={i}>{row.map((column, x) => {
													let type = this.dataStore.report.mapping[x].format || (this.dataStore.report.mapping[x].sort.type === 'int' ? 'integer' : '');
													let isMetric = this.dataStore.report.mapping[x].type;
													if (this.dataStore.report.mapping[x].sort.type === 'integer') {
														type = 'integer'
													}
													let widthPx = widthArr[x] === undefined ? widthArr[widthArr.length - 1] : widthArr[x];
													let dimensionData2 = Object.assign({ 'width': widthPx, 'maxWidth': widthPx, 'minWidth': widthPx }, dimensionData);
													if (type === 'integer' || isMetric === 'fact' || isMetric === 'metric') {
														dimensionData2 = Object.assign({ 'textAlign': 'right' }, dimensionData2);
													}
													return <td style={dimensionData2} key={x}>{column}</td>
												})
												}
												</tr>
											)
										})
									}
								</tbody>
								<tfoot>
									{
										this.dataStore.showTotals
											?
											<tr key={'r' + i} data-row={i}>
												{
													totals.map((value, i) => {
														let type = this.dataStore.report.mapping[i].format || (this.dataStore.report.mapping[i].sort.type === 'int' ? 'integer' : '');
														let typeStyle = metricOrPartitionHeader;
														if (this.dataStore.report.mapping[i].type === "attribute") {
															typeStyle = dimensionHeader;
															value = '';
														}
														let widthPx = widthArr[i] === undefined ? widthArr[widthArr.length - 1] : widthArr[i];
														let styling = Object.assign({ 'width': widthPx, 'maxWidth': widthPx, 'minWidth': widthPx }, typeStyle);
														if (type === 'integer') {
															styling = Object.assign(styling, { 'textAlign': 'right', 'paddingRight': '8px' });
														}
														return (
															<td style={styling} key={i}>
																{value}
															</td>
														)
													})
												}
											</tr>
											: false
									}
								</tfoot>
							</table>
				}
			</section>
		);
	}
}
