import React from 'react';
import {inject, observer} from 'mobx-react';
import FilterSelect from './filterSelect.jsx';

let missingRequired = "-99999999";


@inject('dataStore')
@observer
export default class Filter extends React.Component {
    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;

        let filter = this.props.filter;
        let comparison = filter.comparison;
        let isDateRange = (filter.comparison && filter.comparison == 'between');
        let isDate = (filter.id.toLowerCase().indexOf('date.id') > -1 || filter.id.toLowerCase().indexOf('date._id') > -1 || filter.id.toLowerCase().indexOf('date.date') !== -1);

        this.state = {
            isDateRange: isDateRange,
            isDate: isDate,
            updated: false,
            showEditor: (this.props.editingFilter === filter.id) || (this.dataStore.openDatePicker === filter.id),
            filter: filter,
            comparison: comparison
        };
    }

    componentWillReceiveProps(nextProps) {
        let filter = this.state.filter;

        if (!filter.label && nextProps.filter.label) {
            filter.label = nextProps.filter.label;
        }

        if (!filter.dimension && nextProps.filter.dimension) {
            filter.dimension = nextProps.filter.dimension;
        }

        if (nextProps.filter.checkboxes) {
            filter.checkboxes = $.extend({}, filter.checkboxes, nextProps.filter.checkboxes);
        }

        if (nextProps.filter.value) {
            if (nextProps.filter.value.length == 1 && nextProps.filter.value[0] == '') {
                filter.value = [];
            } else {
                filter.value = nextProps.filter.value;
            }
        }

        this.setState({filter:filter});
    }

    close(e,f) {
        if (e && e !== true) {
            e.stopPropagation();
        } else {
            this.dataStore.openDatePicker = false;
        }
        if (this.state.filter.updated) {
            delete this.state.filter.updated;
            if (this.state.filter.value && this.state.filter.value.length == 0 && this.state.filter.isRequired) {
                this.state.filter.value = [missingRequired];
            }
        }

        this.setState({
            updated: false,
            showEditor:false
        });
    }


    open() {
        this.setState({showEditor:true});
    }


    render()  {
        let filter = this.state.filter;
        let filterName = (filter.fact || filter.dimension || '') + ' ' + (filter.label ? filter.label : ' ');

        let display = "";
        if (filter.isRequired && filter.value[0] == missingRequired ) {
            display = <em>none</em>;
        } else if (filter.value && filter.value.length > 0) {
            display = filter.value.join ? filter.value.join(this.state.isDateRange ? ' - ' : ', ') : filter.value;
        } else {
            display = <em>All</em>;
        }

        return (
            <li ref="filter" className={"filter-wrapper" + (this.state.showEditor ? ' active' : '') + " " + (this.props.className || '')}>
                {
                    this.state.showEditor
                        ? <div className="mask" onClick={() => this.close()}></div>
                        : false
                }
                <div className="filter-heading" onClick={(e) => {this.state.showEditor ? this.close(e) : this.open()}}>
                    <i className="icon-cancel pull-right" onClick={() => {this.dataStore.removeReportFilter(filter.id)}} />
                    <div className="filter-name">{filterName}</div>
                    <div className="filter-text filter-values">
                        { !this.state.isDate && filter.comparison && filter.comparison != '=' && filter.comparison != 'in' ? filter.comparison + ' ' : '' }
                        {display}
                    </div>
                </div>
                {
                    this.state.showEditor
                        ? <FilterSelect filter={filter} removeFilter={this.props.removeFilter} delayedClose={() => {this.close()}}/>
                        : false
                }
            </li>
        )
    }
}