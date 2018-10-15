import React from 'react';
import {inject, observer} from 'mobx-react';
import {toJS} from 'mobx';
import ColumnBlock from './columnBlock.jsx';
import Aggregates from '../aggregates.jsx';
import ColumnSearch from '../filters/columnSearch.jsx';

@inject('dataStore')
@observer
export default class ReportColumns extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;

        this.state = {
            adding: false
        };
    }


    componentDidMount() {
        var thisComponent = this;
        $(this.refs.sortDimensions).sortable({
            axis:'x',
            handle: '.block-top',
            update: () => {
                thisComponent.updateColumnOrder();
            }
        });

        $(this.refs.sortFacts).sortable({
            axis:'x',
            handle: '.block-top',
            update: () => {
                thisComponent.updateColumnOrder();
            }
        });

    }


    updateColumnOrder() {
        let metricOrder = [];
        let dimOrder = [];
        let items = $(this.refs.rowSortableContainer).find('li:not(.empty)');

        if (Object.keys(toJS(this.dataStore.report)).length !== 0) {
            let updateRequired = false;
            let columnHeaders = toJS(this.dataStore.report.rowheaders);
            for (let i = 0; i < items.length; i++) {
                if (columnHeaders[i] && columnHeaders[i].id !== $(items[i]).data('id')) {
                    updateRequired = true;
                }
                let iterator = $(items[i]).data('iterator');
                if (iterator || iterator === 0) { //not a placeholder
                    if ($(items[i]).data('column_type') == 'dimension') {
                        dimOrder.push(items[i].dataset.value);
                    } else {
                        metricOrder.push(items[i].dataset.value);
                    }
                }
            }
        } else {
            for (let i = 0; i < items.length; i++) {
                let iterator = $(items[i]).data('iterator');
                if (iterator || iterator === 0) { //not a placeholder
                    if ($(items[i]).data('column_type') == 'dimension') {
                        dimOrder.push(items[i].dataset.value);
                    } else {
                        metricOrder.push(items[i].dataset.value);
                    }
                }
            }
        }
        this.dataStore.urlObj.metrics = metricOrder;
        this.dataStore.urlObj.dimensions = dimOrder;
        this.dataStore.setUrlHash();
    }


    addColumn(which, e) {
        let position = $(e.currentTarget).position();
        position.width = $(e.currentTarget).outerWidth();
        position.height = $(e.currentTarget).outerHeight();
        position.top += position.height;
        this.setState({ adding: 'add_' + which, position: position, add_class: 'arrow-up-left' })
    }


    closeAddColumn() {
        this.setState({ adding: false })
    }


    render() {
        let dims = [];
        let metrics = [];
        let rowHeaders = this.dataStore.reportInfo && this.dataStore.reportInfo.rows || [];
        let columns = [];
        let metricIterator = 0;
        let dimIterator = 0;

        rowHeaders.map((column, i) => {

            if (column.type === 'metric') {

                if(i === 0) {

                    dims.push(
                        <li ref="dimension" className="empty" key={i} data-id="empty" style={{width: 148}}>
                            <div className="heading"></div>
                        </li>
                    );
                }

                metrics.push(
                    <SortTab
                        type="metric"
                        column={column}
                        id={column.id}
                        label={column.label}
                        width={column.width}
                        typeIterator={metricIterator++}
                        iterator={i}
                        key={column.id+'-'+i}
                    />
                );


            } else if(column.type == 'metrics') {

                metrics.push(
                    <li key="columnHeader metrics" className="empty" ref="metrics" data-id="empty" style={{width: column.width}}>
                        <div className="">Metrics</div>
                    </li>
                );

            } else {
                if (dims && dims[0] && dims[0].props && dims[0].props.className === "empty") {
                    dims.splice(0,1);
                }

                dims.push(
                    <SortTab
                        type="dimension"
                        column={column}
                        id={column.id}
                        label={columns.label}
                        width={column.width}
                        typeIterator={dimIterator++}
                        iterator={i}
                        key={column.id+'-'+i}
                    />
                );

            }
        });

        return (
            <div className="rowSortableContainer" ref="rowSortableContainer">

                <div className="report-columns dimensions">
                    <div>
                        <i className="icon-ion-social-buffer-outline"></i> Dimensions
                        <i className="hover-box-shadow icon-plus-circled" onClick={this.addColumn.bind(this, 'dimension')}></i>
                    </div>
                    <ul ref="sortDimensions" className="reorder-columns">
                        {dims}
                    </ul>
                </div>

                <div className="report-columns facts">
                    <div>
                        <i className="icon-sprite-123"></i> Metrics
                        <i className="hover-box-shadow icon-plus-circled" onClick={this.addColumn.bind(this, 'fact')}></i>
                    </div>

                    <ul ref="sortFacts" className="reorder-columns">
                        {metrics}
                    </ul>
                </div>

                {
                    this.state.adding
                        ? <ColumnSearch action={this.state.adding} position={this.state.position} addClass={this.state.add_class} closeChangeColumn={() => this.closeAddColumn()} />
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
        if (this.props.column.where) {
            this.props.column.where = 'column'
        }
        let index = this.dataStore.reportInfo.rows.indexOf(this.props.column);
        this.dataStore.reportInfo.rows.splice(index, 1);
        this.dataStore.reportInfo.columns.push(this.props.column);
        this.dataStore.urlObj.partitions.push(this.props.column.urlId);
        if (this.props.column.type === 'dimension') {
            index = this.dataStore.urlObj.dimensions.indexOf(this.props.column.urlId);
            this.dataStore.urlObj.dimensions.splice(index, 1);
        } else if (this.props.column.type === 'metric') {
            index = this.dataStore.urlObj.metrics.indexOf(this.props.column.urlId);
            this.dataStore.urlObj.metrics.splice(index, 1);
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
        let id = (typeof this.props.id == 'object' ? this.props.id.id : this.props.id)
        let urlId = this.props.column && this.props.column.urlId || '';

        return (
            <li ref={id} data-value={urlId} style={{width: (this.props.width)}} className={"leo-"+this.props.type+"-header"+(id.indexOf('.') == -1 ? ' is_parent' :'')+(id.indexOf(':') != -1 ? ' is_advanced' :'')+(!this.props.parent ? ' is_derived' :'')} data-iterator={this.props.iterator} data-column_type={this.props.type} data-id={this.props.id} onClick={this.selectAxis} >

                <ColumnBlock key={this.props.iterator} type={this.props.column.type} column={this.props.column} column_index={this.props.iterator} series_index={this.props.typeIterator} width={this.props.width} updateColumn={this.updateColumn.bind(this)}/>

                {
                    this.props.type == "dimension"
                        ? <span title="To Right Bar" className="to-right-bar" onClick={() => {this.swapSortContainer()}}></span>
                        : false
                }

                {
                    (() => {

                        switch(this.state.changing) {
                            case 'change_dimension': case 'change_metric':
                                return <ColumnSearch action={this.state.changing} position={{left:20,arrow:'arrow-up-left'}} id={this.props.id} iterator={this.props.iterator} parent={this.props.parent ? this.props.parent : ''} column_index={this.props.iterator} series_index={this.props.typeIterator} closeChangeColumn={() => this.closeChangeColumn()} toRemove={this.props.column}/>
                            break;
                            case 'aggregates':
                                return <Aggregates id={this.props.id} column={this.props.column} iterator={this.props.iterator} closeChangeColumn={() => {this.closeChangeColumn()}}/>
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
