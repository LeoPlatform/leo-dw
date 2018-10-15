import React from 'react';
import {inject, observer} from 'mobx-react';
import {toJS} from 'mobx';
import ColumnBlock from './columnBlock.jsx';
import ColumnSearch from '../filters/columnSearch.jsx';

@inject('dataStore')
@observer
export default class ReportRows extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;

        this.state = {
            adding: false
        };
    }


    componentDidMount() {
        $(this.refs.sortDimensions).sortable({
            axis:'y',
            handle: '.block-top',
            update: () => {
                this.updateRowOrder();
            }
        });

        $(this.refs.sortFacts).sortable({
            axis:'y',
            handle: '.block-top',
            update: () => {
                this.updateRowOrder();
            }
        });

    }


    updateRowOrder() {
        let partOrder = [];
        let items = $(this.refs.columnSortableContainer).find('li');

        if (Object.keys(toJS(this.dataStore.report)).length !== 0) {
            let updateRequired = false;
            let rowHeaders = toJS(this.dataStore.report.columnheaders);
            for(let i = 0; i < items.length; i++) {
                if (rowHeaders[i] && rowHeaders[i].id !== $(items[i]).data('id')) {
                    updateRequired = true;
                }
                let iterator = $(items[i]).data('iterator');
                if (iterator || iterator === 0) {
                    if ($(items[i]).data('column_type') === 'dimension') {
                        partOrder.push(items[i].dataset.value);
                    }
                }
            }
        } else {
            for (let i = 0; i < items.length; i++) {
                let iterator = $(items[i]).data('iterator');
                if (iterator || iterator === 0) { //not a placeholder
                    if ($(items[i]).data('column_type') === 'dimension') {
                        partOrder.push(items[i].dataset.value);
                    }
                }
            }
        }
        this.dataStore.urlObj.paritions = partOrder;
        this.dataStore.setUrlHash();
    }

    addRow(which, e) {
        let position = $(e.currentTarget).position();

        position.width = $(e.currentTarget).outerWidth();
        position.height = $(e.currentTarget).outerHeight();
        position.left += position.width / 2;
        position.top += position.height;

        this.setState({ adding: 'add_' + which, position: position, add_class: 'arrow-up-right' })
    }


    closeAddRow() {
        this.setState({ adding: false })
    }


    render() {
        let dims = [];
        let metrics = [];
        let columnHeaders = this.dataStore.reportInfo && this.dataStore.reportInfo.columns || [];
        let columns = {};
        let rowCount = 0;

        columnHeaders.forEach(function(column, i) {
            if (column.type != "metric") rowCount++;
        });

        if (rowCount == 0) {

            dims.push(
                <li ref="emptyDimension" className="empty" key="drop" data-id="empty">
                    <div className=""></div>
                </li>
            );

        }

        columnHeaders.map(function(column,i) {
            let isLastRow = (i == rowCount - 1);
            let height = column.height;

            if(column.type == 'metric') {

                metrics.push(
                    <SortTab
                        type="metric"
                        column={column}
                        id={column.id}
                        label={column.label}
                        width={column.width}
                        iterator={i}
                        key={column.id+'-'+i}
                    />
                );

            } else if(column.type == 'metrics') {

                metrics.push(
                    <li key="metrics" ref="emptyMetric" data-id="empty" className="empty">
                        <div className="" style={{height: height, lineHeight: height+'px'}}></div>
                    </li>
                );

            } else {

                dims.push(
                    <SortTab
                        type="dimension"
                        column={column}
                        id={column.id}
                        label={columns.label}
                        width={column.width}
                        iterator={i}
                        key={column.id+'-'+i}
                    />
                );

            }
        });

        return (
            <div className="columnSortableContainer" ref="columnSortableContainer" style={{float:'right'}}>
                <div className="report-rows dimensions">
                    <div>
                        <i className="icon-ion-social-buffer-outline"></i> Partitions
                        <i className="hover-box-shadow icon-plus-circled" onClick={this.addRow.bind(this, 'dimension')}></i>
                    </div>
                    <ul ref="sortDimensions" className="reorder-rows">
                        {dims}
                    </ul>
                </div>

                {
                    this.state.adding
                        ? <ColumnSearch action={this.state.adding} where="column" position={this.state.position} addClass={this.state.add_class} closeChangeColumn={() => this.closeAddRow()} />
                        : false
                }

            </div>
        );
    }
}



@inject('dataStore')
@observer
class SortTab extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
        this.state = {
            changing: false
        }
    }


    swapSortContainer() {
        if (this.props.column && this.props.column.where) {
            this.props.column.where = 'row'
        }
        let index = this.dataStore.reportInfo.columns.indexOf(this.props.column);
        this.dataStore.reportInfo.columns.splice(index, 1);
        this.dataStore.reportInfo.rows.push(this.props.column);
        if (this.props.column.type === 'dimension') {
            this.dataStore.urlObj.dimensions.push(this.props.column.urlId);
            index = this.dataStore.urlObj.partitions.indexOf(this.props.column.urlId);
            this.dataStore.urlObj.partitions.splice(index, 1);
        } else if (this.props.column.type === 'metric') {
            this.dataStore.urlObj.metrics.push(this.props.column.urlId);
            index = this.dataStore.urlObj.partitions.indexOf(this.props.column.urlId);
            this.dataStore.urlObj.partitions.splice(index, 1);
        }
    }


    closeChangeColumn() {
        try {
            this.setState({changing:false})
        } catch(e) {}
    }


    updateColumn(action, type, column_index, value) {
        switch(action) {
            case 'edit_column':
                this.setState({ changing: (type == 'metric' ? 'change_metric' : 'change_dimension') });
                break;

            case 'change_aggregate':
                this.setState({ changing: 'aggregates' });
                break;

            case 'change_metric_filter':
                this.setState({ changing: 'metric_filtering' });
                break;

            default:
                console.log('not implimented:', action, type, column_index, value)
                break;
        }
    }


    render() {
        let urlId = this.props.column && this.props.column.urlId || '';

        return (
            <li ref={this.props.id} data-value={urlId} className={"leo-"+this.props.type+"-header"} data-id={this.props.id} data-iterator={this.props.iterator} data-column_type={this.props.type} onClick={this.selectAxis}>
                <ColumnBlock key={this.props.iterator} type={this.props.column.type} isPartition="true" column={this.props.column} column_index={this.props.iterator} series_index={this.props.iterator} width={this.props.width} updateColumn={this.updateColumn.bind(this)} />
                <span title="To Top Bar" className="to-top-bar" onClick={() => {this.swapSortContainer()}}></span>
                {
                    (() => {

                        switch(this.state.changing) {
                            case 'change_dimension': case 'change_metric':
                                return <ColumnSearch action={this.state.changing} partition={true} position={{left:-120,arrow:'arrow-up-right'}} id={this.props.id} iterator={this.props.iterator} column_index={this.props.iterator} series_index={this.props.iterator} parent={this.props.parent ? this.props.parent : ''} closeChangeColumn={() => this.closeChangeColumn()} toRemove={this.props.column}/>
                            break;
                            default:
                                return false;
                                break;
                        }

                    })()
                }
            </li>
        );
    }
}
