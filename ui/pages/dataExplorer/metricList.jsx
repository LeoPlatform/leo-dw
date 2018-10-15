import React from 'react';
import {inject, observer} from 'mobx-react';
import {toJS} from 'mobx';
import InsertBox from './insertBox.jsx';

@inject('dataStore')
@observer
export default class MetricList extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;

        this.state = {
            metricListItemSelected: null,
            openBranch: []
        }
    }

    getBranchState(id) {
        if(this.state.openBranch.indexOf(id) === -1) {
            return false
        }
        return true
    }

    toggleBranch(id) {
        let branches = this.state.openBranch;
        if (branches.indexOf(id) === -1) {
            branches.push(id);
        } else {
            let index = branches.indexOf(5);
            branches.splice(index, 1);
        }
        let index = this.dataStore.openSelected.indexOf(id);
        if (index > -1) {
            this.dataStore.openSelected.splice(index, 1);
        }
        this.setState({ openBranch: branches});
    }

    stopPropagation(e) {
        e.stopPropagation();
    }

    render() {
        let searchText = this.props.searchText;
        let fact = JSON.parse(JSON.stringify(this.props.fact));
        let branchId = ('shortcut-'+fact.id+'-'+fact.label).toLowerCase().replace(/\W/g, '-');
        let metrics = [];
        let lastMetricId = null;
        let inputBoxArrows = { metric: ['row'], dimension: ['row', 'column'] };
        let tiedTogetherstyle = {};
        let hideClick = false;

        let fid = fact.id.replace(/[.$].*$/,"")
        if ((this.dataStore.grayoutLookupMet[fid] || 0) !== this.dataStore.grayoutCountMet) {
            hideClick = true;
            tiedTogetherstyle = {'color': '#9c9ba0'}
        } else {
            this.dataStore.factForColumnSearch.push(fact);
        }

        if (this.getBranchState(branchId)) {
            fact.metrics.sort((a, b) => {
                a.label
            }).map((metric) => {
                let kind = 'metric';

                if (lastMetricId == metric.id) {
                    return false
                }
                lastMetricId = metric.id;
                if (metric.label == fact.label) {
                    return false;
                }
                if (metric.calc == 'math') {
                    return false;
                }
                if (searchText != '' && (fact.label + ' ' + metric.label).toLowerCase().search(searchText) == -1) {
                    return false;
                }

                let ags = ['sum', 'avg', 'max', 'min'];
                let advanced = true;

                if (metric.type == 'lag') {
                    kind = 'lag';
                    ags = false;
                    advanced = false;
                } else if (metric.calc == 'math') {
                    kind = 'derived';
                    ags = ['id'];
                    advanced = false;
                } else if (metric.expression) {
                    kind = 'virtual';
                } else {
                    kind = 'metric';
                }

                let args = {
                    type: 'metric',
                    id: metric.id,
                    urlId: metric.id + (kind == 'derived' ? '' : '|sum'),
                    picked: (kind == 'derived' ? '' : 'sum'),
                    label: metric.label,
                    ags: ags,
                    advanced: advanced,
                    parent_id: fact.id,
                    parent: {
                        label: fact.label,
                        id: fact.id
                    }
                };

                metric.parent = {
                    label: fact.label,
                    id: fact.id,
                };
                metric.kind = kind;

                if (metric.type !== 'lag') {
                    metrics.push(
                        <li className={"leaf " + kind} key={metric.id}>
                            <div>
                                <label>{metric.label}</label>
                                {!hideClick ?
                                    <span className="insert-button">
                                <i className="icon-sprite-select fixed-width-icon" onClick={() => {
                                    this.dataStore.updateUrlAndHeaders(args)
                                }}></i>
                                <InsertBox column={args} inputBoxArrows={inputBoxArrows}/>
						    </span>
                                    : false
                                }
                            </div>
                        </li>
                    );
                }
            });
        }

        if (searchText != '' && (fact.label).toLowerCase().search(searchText) == -1 && metrics.length == 0) {
            return false;
        }

        let args = {
            type: 'metric',
            id: fact.id,
            urlId: fact.id+'|count',
            picked: 'count',
            label: fact.label,
            ags: ['count','unique'],
            advanced: true,
            kind: 'fact',
            parent_id: fact.id,
            parent: {
                label: fact.label,
                id: fact.id
            }
        };

        fact.parent = {
            label: fact.label,
            id: fact.id,
        };

        let index = this.dataStore.openSelected.indexOf(branchId);
        if(toJS(this.dataStore.openSelected).length > 0 && !this.getBranchState(this.dataStore.openSelected[index])) {
            let branches = this.state.openBranch;
            branches.push(this.dataStore.openSelected[index]);
        }

        return (
            <li className={"fact branch"+(this.getBranchState(branchId) ? '' : ' closed')} style={tiedTogetherstyle} id={branchId} key={fact.id} onClick={this.toggleBranch.bind(this, branchId)}>
                <div onClick={this.stopPropagation.bind(this)}>
                    <label>{fact.label}</label>
                    {
                        !hideClick ?
                            <span className="insert-button">
                                <i className="icon-sprite-select fixed-width-icon" onClick={() => {this.dataStore.updateUrlAndHeaders(args)}}></i>
                                <InsertBox column={args} inputBoxArrows={inputBoxArrows}/>
                            </span>
                            : false
                    }
                </div>
                <ul className="metrics twig" onClick={this.stopPropagation.bind(this)}>
                    {metrics}
                </ul>
            </li>
        )
    }
}