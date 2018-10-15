import React from 'react';
import {inject, observer} from 'mobx-react';
import {toJS} from 'mobx';
import InsertBox from './insertBox.jsx';

@inject('dataStore')
@observer
export default class DimensionList extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;

        this.state = {
            openBranch: [],
            filter: {},
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

    setRange(values) {
        let filter = this.state.filter;
        let filterbefore = filter;
        filter.value = values;
        filter.comparison = 'between';
        filter.checkboxes = { '_':'' };
        if (values && values.length) {
            for(let i=0;i<values.length;i++) {
                filter.checkboxes[values[i]] = true;
            }
        }
        filter.updated = true;
        this.dataStore.addValueFilter(filter, filterbefore);
        this.setState({ filter: filter });
    }


    openDateFilter(dimension) {
        dimension.kind = 'date_range';
        if (dimension.id.slice(-3) !== '.id') {
            dimension.id = dimension.id+'.id';
        }
        this.dataStore.addReportFilter(dimension);
        this.dataStore.openDatePicker = dimension.id;
    }

    stopPropagation(e) {
        e.stopPropagation();
    }

    render() {
        let searchText = this.props.searchText;
        let dimension = this.props.dimension;
        let branchId = ('shortcut-'+dimension.id+'-'+dimension.label).toLowerCase().replace(/\W/g, '-');
        let attributes = [];
        let tiedTogetherstyle = {};
        let hideClick = false;

        let did = dimension.id.replace(/[.$].*$/,"")
        if ((this.dataStore.grayoutLookupDim[did] || 0) !== this.dataStore.grayoutCountDim) {
            hideClick = true;
            tiedTogetherstyle = {'color': '#9c9ba0'}
        }

        dimension.attributes.map((attribute) => {
            attribute.type='dimension';
            if (searchText != '' && (dimension.label + ' ' + attribute.label).toLowerCase().search(searchText) == -1) {
                //if there's a search and it does not match
                return false;
            }
            if (attribute.calc == 'math') {
                return false;
            }
            if (attribute.calc == 'math') {
                var kind = 'derived';
            } else {
                var kind = 'attribute';
            }

            let inputBoxArrows = { metric: ['row'], dimension: ['row', 'column'] };

            let args = {
                type: 'dimension',
                id: attribute.id,
                urlId: attribute.id,
                label: attribute.label,
                where: inputBoxArrows.dimension[0],
                ags: ['id'],
                parent_id: dimension.id,
                parent: {
                    label: dimension.label,
                    id: dimension.id
                }
            };

            attribute.kind = kind;

            attributes.push(
                <li className={"attribute leaf "+kind} key={attribute.id}>
                    <div>
                        <label>{attribute.label}</label>
                        {
                            !hideClick ?
                            <span>
                                <span className="insert-button">
                                    <i className="icon-sprite-select fixed-width-icon" onClick={() => {this.dataStore.updateUrlAndHeaders(args)}}></i>
                                    <InsertBox column={args} inputBoxArrows={inputBoxArrows}/>
                                </span>
                            </span>
                                : false
                        }
                    </div>
                </li>
            )
        });

        if (searchText != '' && (dimension.label).toLowerCase().search(searchText) == -1 && attributes.length == 0) {
            return false;
        }

        let className = "dimension branch"
            + (dimension.is_date ? ' is_date' : '')
            + (dimension.has_outrigger ? ' has_outrigger' : '')
            + (dimension.is_outrigger ? ' is_outrigger' : '')
            + (dimension.is_last_outrigger ? ' is_last_outrigger' : '')
        ;

        let index = this.dataStore.openSelected.indexOf(branchId);
        if(toJS(this.dataStore.openSelected).length > 0 && !this.getBranchState(this.dataStore.openSelected[index])) {
            let branches = this.state.openBranch;
            branches.push(this.dataStore.openSelected[index]);
        }

        return (
            <li className={className +(this.getBranchState(branchId) ? '' : ' closed')} id={branchId} style={tiedTogetherstyle} key={dimension.id} onClick={this.toggleBranch.bind(this, branchId)}>
                <div onClick={this.stopPropagation.bind(this)}>
                    <label title={dimension.label}>{dimension.label}</label>
                    {
                        dimension.is_date && !hideClick
                            ? <span>
                                <i className="icon-calendar fixed-width-icon" onClick={()=> this.openDateFilter(dimension)}></i>
                            </span>
                            : false
                    }
                </div>

                <ul className="attributes twig" onClick={this.stopPropagation.bind(this)}>
                    {this.getBranchState(branchId) ? attributes : false}
                </ul>
            </li>
        )
    }
}
