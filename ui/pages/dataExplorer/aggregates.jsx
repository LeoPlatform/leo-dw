import React from 'react';
import {inject, observer} from 'mobx-react';
import IdUtils from '../../../ui/js/utils/IdUtils.js';


@inject('dataStore')
@observer
export default class Aggregates extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
        let type = IdUtils.type();
        let aggregate = IdUtils.aggregate();
        let transforms = IdUtils.transforms();
        let hasPartitions = (this.props.column && this.props.column.partitions && this.props.column.partitions.length > 0);

        this.state =  {
            column: this.props.column,
            type: type,
            aggregate: aggregate,
            transforms: transforms,
            hasPartitions: hasPartitions,
            menu: {
                metric: {
                    raw: {
                        sum: 'Sum',
                        avg: 'Avg',
                        min: 'Min',
                        max: 'Max'
                    },
                    percent: {
                        sum: 'Sum',
                        avg: 'Avg'
                    },
                    cumulative: {
                        sum: 'Sum',
                    },
                    rank: {
                        sum: 'Sum',
                        avg: 'Avg'
                    }
                },
                fact: {
                    raw: {
                        count: 'Count'
                    },
                    percent: {
                        count: 'Count'
                    },
                    cumulative: {
                        count: 'Count'
                    },
                    rank: {
                        count: 'Count'
                    }
                },
                fx: {
                    raw: {
                        fx: 'fx'
                    },
                    percent: {
                        fx: 'fx'
                    },
                    cumulative: {
                        fx: 'fx'
                    },
                    rank: {
                        fx: 'fx'
                    }
                }
            }
        }
    }

    componentDidMount() {
        $(document.body).keydown(function(e) {
            if (e.keyCode == 27) {
                this.props.closeChangeColumn();
            }
        });
    }


    updateColumn(aggregate, transform, addColumn, e) {
        e.preventDefault();
        e.stopPropagation();

        let column = this.state.column;
        let index;
        let type = (column.type === 'metric' ? 'metrics' : (column.type === 'dimension' ? 'dimensions' : 'partitions'));

        if (!addColumn) {
            let index2 = this.dataStore.reportInfo.rows.indexOf(column);
            if (index2 > -1) {
                this.dataStore.reportInfo.rows[index2] = 'null';
            }

            if (transform === 'raw') {
                column.picked = aggregate;
                column.urlId = column.id + `|${aggregate}`;
            } else if (transform === 'percent') {
                column.picked = aggregate;
                column.urlId = column.id + `|${aggregate}` + '|percent:total:';
            } else if (transform === 'cumulative') {
                column.picked = aggregate;
                column.urlId = column.id + `|${aggregate}` + '|cumulative';
            } else if (transform === 'rank') {
                column.picked = aggregate;
                column.urlId = column.id + `|${aggregate}` + '|rank';
            }
            this.dataStore.reportInfo.rows[index2] = column;
            index = this.dataStore.urlObj.dimensions.indexOf(column.urlId);
            this.dataStore.urlObj[type].splice(index, 1);
            this.dataStore.urlObj[type].push(column.urlId);
        } else {
            if (transform === 'raw') {
                column.urlId = column.id + `|${aggregate}`;
            } else if (transform === 'percent') {
                column.urlId = column.id + `|${aggregate}` + '|percent:total:';
            } else if (transform === 'cumulative') {
                column.urlId = column.id + `|${aggregate}` + '|cumulative';
            } else if (transform === 'rank') {
                column.urlId = column.id + `|${aggregate}` + '|rank';
            }
            let newColumn = Object.assign({},column, {"picked": aggregate});
            this.dataStore.reportInfo.rows.push(newColumn);
            this.dataStore.urlObj[type].push(column.urlId);
        }
        this.dataStore.setUrlHash();
        this.props.closeChangeColumn();
    }


    showAdvanced() {
        this.context.show_dialog('advanced', { id: this.props.id, column: this.props.column, editing: 'row', iterator: this.props.iterator, params: this.props.params });
        this.props.closeChangeColumn(true);
    }


    render() {
        let menu = this.state.menu[this.state.type];
        let style = '';

        if (this.props.position && this.props.position.right) {
            style = {
                position: "fixed",
                marginRight: this.props.position && this.props.position.right || -30
            }
        } else {
            style = {
                position: "fixed",
                marginLeft: this.props.position && this.props.position.left || -65
            }
        }

        return (
            <div className="popup-menu change-aggregate arrow-up-right" style={style}>

                <div className="mask" onClick={this.props.closeChangeColumn}></div>

            <div>


                <ul className="menu" style={{minWidth:150}}>
                    {
                        Object.keys(menu).map((transform) => {
                            let submenu = menu[transform];
                            return <li className={transform} key={transform}>
                                <label>{transform}</label>
                                <ul>
                                    {
                                        Object.keys(submenu).map((aggregate, index) => {

                                            let className = (
                                                (
                                                    this.state.aggregate == aggregate
                                                    && ((this.state.transforms.length == 0 && transform == 'raw') || (this.state.transforms.length == 1 && transform in this.state.transforms[0]))
                                                )
                                                    ? 'active'
                                                    : ''
                                            );

                                            return <li key={aggregate} className={className} onClick={(e) => {this.updateColumn(aggregate, transform, false, e)}}>
                                                <label>{submenu[aggregate]}</label>
                                                {
                                                    (this.props.hidePlus)
                                                        ? false
                                                        : <i className="icon-plus pull-right cursor-pointer" title="add as new" onClick={(e) => {this.updateColumn(aggregate, transform, true, e)}}></i>
                                                }
                                            </li>
                                        })
                                    }
                                </ul>
                            </li>
                        })
                    }
                </ul>
            </div>
        </div>
        )
    }
}