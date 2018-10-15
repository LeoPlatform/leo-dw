import React from 'react';
import {inject, observer} from 'mobx-react';
import IdUtils from '../../../js/utils/IdUtils.js';

@inject('dataStore')
export default class ColumnBlock extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
    }

    remove(column, reportIndex, urlObjIndex) {
        let where = column.where || 'row';
        let type = (column.type === 'metric' ? 'metrics' : 'dimensions');
        if (where === 'row' && this.dataStore && this.dataStore.reportInfo && this.dataStore.reportInfo.rows) {
            this.dataStore.reportInfo.rows.splice(reportIndex, 1);
            this.dataStore.urlObj[type].splice(urlObjIndex, 1);
        } else if (this.dataStore && this.dataStore.reportInfo && this.dataStore.reportInfo.columns) {
            this.dataStore.reportInfo.columns.splice(reportIndex, 1);
            this.dataStore.urlObj.partitions.splice(urlObjIndex, 1);
        }
        this.dataStore.setUrlHash();
        this.dataStore.getGrayOutLookup();
    }


    editColumn(column_index, series_index) {
        this.props.updateColumn('edit_column', this.props.type, column_index, null)
    }


    editAggregate(column) {
        this.props.updateColumn('change_aggregate', column)
    }


    selectDimension(series_index, column_index, id, e) {
        this.context.show_popup('edit_series_dimension', e.currentTarget, 'up-right', { column_index: column_index, id: id } )
    }


    render() {
        let column = this.props.column;
        let column_index = this.props.column_index;
        let parsed = IdUtils.parse(column.id);
        let aggregate = column.picked || false;
        let transforms = IdUtils.transforms();
        let transform = '';
        let details = IdUtils.details();

        column.label = (details && details.label ? details.label : column.label);

        if (transforms.length == 1) {
            if ('percent' in transforms[0]) {
                transform = '%';
            } else if ('cumulative' in transforms[0]) {
                transform = '\u2211';
            } else {
                aggregate = '. . .';
            }
        } else if (transforms.length != 0) {
            aggregate = '. . .';
        }

        let series_index = this.props.series_index;
        let style = {'paddingRight': '3px'};

        return (
            <div className={"column-block "+this.props.type+"-block"} data-series_index={series_index} data-column_index={column_index} style={style}>
            <div className="block-top flex-row">
                <i className="icon-menu" title="reorder"></i>
                <span title={parsed.label || column.label || '-'} className="flex-grow">{parsed.label || column.label || '-'}</span>
                <span>
                    {/*{*/}
                        {/*this.props.type == 'metric'*/}
                            {/*? <i className={"icon-filter"+(parsed.filter?' active':'')} onClick={this.selectFilter.bind(null, series_index, column_index, column.id)}></i>*/}
                            {/*: false*/}
                    {/*}*/}
                    <i className="icon-cancel" onClick={() => {this.remove(column, this.props.column_index, this.props.series_index)}}></i>
				</span>
            </div>
            <div className="block-bottom flex-row">
                <div className="column-name flex-grow drop-down-arrow" onClick={() => {this.editColumn(column_index, series_index)}} title={column.parent && column.parent.label ? column.parent.label : ''+' '+(column.label || column.id)}>
                    <div>{column.parent && column.parent.label ? column.parent.label : '-'}</div>
                    <div>{column.label || column.id}</div>
                </div>
                {
                    this.props.type == 'metric'
                        ? <div className="column-aggregate" onClick={() => {this.editAggregate(column)}}>
                            {
                                transform
                                    ? <span className="font-serif">{transform}</span>
                                    : false
                            }
                            <div>{aggregate || 'fx'}</div>
                        </div>
                        : false
                }
            </div>
            {
                this.props.type == 'metric' && this.props.showPartition
                    ? <div className="block-dimension">
                        <i className="icon-ion-social-buffer-outline"></i>
                        {
                            column.partitions && column.partitions.length > 0
                                ? <div>
                                    {column.partitions.map(function(partition, index) {
                                        let details = IdUtils.details(partition) || {}
                                        let label = details.label || '';
                                        let parent = details.parent || '';
                                        return (<div key={index} onClick={this.selectDimension.bind(null, series_index, column_index, partition)}>
                                            <i className="icon-cancel" onClick={() => {this.remove(column, this.props.column_index, this.props.series_index)}}></i>
                                            <div>{parent.label}</div>
                                            <div>{label}</div>
                                        </div>)
                                    })}
                                </div>
                                : <div onClick={this.selectDimension.bind(null, series_index, column_index, '')} className="gray-out">Select Partition</div>
                        }
                    </div>
                    : false
            }
        </div>
        )
    }
}