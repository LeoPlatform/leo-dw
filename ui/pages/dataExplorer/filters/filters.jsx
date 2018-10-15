import React from 'react';
import {inject, observer} from 'mobx-react';
import Filter from './filter.jsx';
import ColumnSearch from './columnSearch.jsx';

@inject('dataStore')
@observer
export default class Filters extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
        this.state = ({
            addingFilter: false,
            editingFilter: ''
        });
    }

    updateReportFilter(filter, e) {
        if (e) { e.stopPropagation(); }

        this.setState({
            addingFilter: false,
            editingFilter: ''
        });
    }


    addReportFilterClose(e) {
        if (e) { e.stopPropagation(); }
        this.setState({ addingFilter: false });
    }


    openAddFilter(e) {
        if (e) { e.stopPropagation(); }
        this.setState({ addingFilter: true });
    }


    closeAddFilter(e) {
        if (e) { e.stopPropagation(); }
        this.setState({ addingFilter: false });
    }


    render() {

        
        return (
            <div className={"filters-wrapper"+(this.props.selectDataExpanded ? ' select-data-expanded' : '')}>
                <ul>
                    {
                        this.dataStore._reportFilters && this.dataStore._reportFilters.length === 0
                            ? false
                            : this.dataStore._reportFilters.filter(f=>!f.isHidden).map((filter, index) => {
                                return (<Filter
                                    key={"filter-"+filter.id+"-"+(!Array.isArray(filter.value) ? filter.value : filter.value.join('|'))+'-'+index}
                                    ref={"filter-"+filter.id}
                                    filter={filter}
                                    reportFilters={this.dataStore._reportFilters}
                                    updateReportFilter={() => this.updateReportFilter()}
                                    editingFilter={this.state.editingFilter}
                                />)
                            })
                    }

                    {
                             <li className="filter-wrapper">
                                <div className="add-filter align-middle cursor-pointer">
                                    <div onClick={() => {this.openAddFilter()}}>
                                        <i className="icon-plus-circled"></i> <label>Add Filter</label>
                                    </div>
                                    {
                                        this.state.addingFilter
                                            ? <ColumnSearch closeChangeColumn={() => this.closeAddFilter()} action="add_filter" position={{left:25,top:50,arrow:'arrow-up-left'}} addReportFilterClose={(e) => {this.addReportFilterClose(e)}} maskOff={true} />
                                            :false
                                    }
                                </div>
                            </li>
                    }
                </ul>
            </div>
        );
    }
}