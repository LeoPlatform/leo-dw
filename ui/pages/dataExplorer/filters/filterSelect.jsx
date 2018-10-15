import React from 'react';
import {inject, observer} from 'mobx-react';
import {toJS} from 'mobx';
import DateRangePicker from '../DateRangePicker.jsx';



@inject('dataStore')
@observer
export default class FilterSelect extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;


        let filter = toJS(this.props.filter);

        // //fix value for dynamic ranges
        // if (filter.description) {
        //     filter.value = [filter.description];
        //     delete(filter.description);
        // }

        if (typeof filter.value == 'undefined') {
            filter.value = [];
        }

        //retro fit
        if (!filter.checkboxes) {
            filter.checkboxes = {};
            for(let i in filter.value) {
                filter.checkboxes[filter.value[i]] = true;
            }
        }

        let comparison = filter.comparison;

        this.autoComplete(filter.id, '');

        this.state = {
            isDateRange: (filter.comparison && filter.comparison == 'between'),
            isDynamic: (filter.value && filter.value[0] && !filter.value[0].toString().match(/\d{4}-\d{2}-\d{2}/)),
            isDate: (filter.id.toLowerCase().indexOf('date.id') > -1 || filter.id.toLowerCase().indexOf('date._id') > -1 || filter.id.toLowerCase().indexOf('date.date') !== -1),
            singleValue: (filter.singleValue),
            showEditor: (this.props.editingFilter == filter.id) || (this.dataStore.openDatePicker === filter.id),
            filter: filter,
            searchText: '',
            searchIndex: -1,
            searchResults: [],
            comparison: comparison,
            operators: [
                '==', '=',
                '<>', '!=', '!',
                '=>', '>=',
                '=<', '<=',
                'between', '><',
                '>', '<'
            ]
        };
    }


    componentWillReceiveProps(nextProps) {
        if (nextProps.saving == true) {
            this.props.updateReportFilter(this.state.filter);
        }

        let filter = this.state.filter;

        if (!filter.label && nextProps.filter.label) {
            filter.label = nextProps.filter.label;
        }

        if (!filter.dimension && nextProps.filter.dimension) {
            filter.dimension = nextProps.filter.dimension;
        }

        this.setState({filter:filter});
    }


    componentDidMount() {

        this._isMounted = true
        this.initDatePicker();
        if (this.refs.searchText) {
            this.refs.searchText.select();
        }

        let offset = $(this.refs.filterSelect).offset()
        if (offset.top > window.innerHeight / 2) {
            $(this.refs.filterSelect).addClass('flow-up')
        } else {
            $(this.refs.filterSelect).removeClass('flow-up')
        }

    }


    componentWillUnmount() {

        this._isMounted = false

    }


    componentDidUpdate() {

        this.initDatePicker()

    }


    initDatePicker () {
        var thisComponent = this;
        if (this.state.isDate && !(this.state.isDynamic || this.state.isDateRange)) {
            var values = this.state.filter.value;
            if (this.refs && this.refs.multidatePicker) {
                $(this.refs.multidatePicker).multiDatesPicker({
                    dateFormat: "yy-mm-dd",
                    defaultDate: (values.length > 0 ? values[0] : null),
                    addDates: (values.length > 0 ? values : null),
                    onSelect: function(date, inst) {
                        thisComponent.toggleValue(date);
                    }
                });
            }
        }

        if (this.state.showEditor && this.refs.searchText) {
            this.refs.searchText.focus();
        }

    }


    autoComplete(filter_id, term) {
        if (this.props.autoComplete) {
            this.props.autoComplete(filter_id, term, (results) => {
                let searchResults = [];
                for(let i = 0; i < results.suggestions.length; i++) {
                    let val = results.suggestions[i].value;
                    searchResults.push({
                        id: results.suggestions[i].value,
                        text: val
                    });
                }
                if (this._isMounted) {
                    this.setState({
                        searchIndex: -1,
                        searchResults: searchResults
                    })
                }
            }, this.props.filter.api);
        }
    }


    catchSpecialKeys(e) {
        switch(e.keyCode) {
            case 27: //esc
            case 9: //tab
                e.preventDefault();
                e.stopPropagation();
                break;

            case 40: //down
                this.setState({searchIndex:(++this.state.searchIndex % this.state.searchResults.length)});
                break;

            case 38: //up
                if (this.state.searchIndex == 0) {
                    this.setState({searchIndex:(this.state.searchResults.length-1)});
                } else {
                    this.setState({searchIndex:(--this.state.searchIndex % this.state.searchResults.length)});
                }
                break;
        }
    }


    searchFilter(e) {
        e.preventDefault();
        e.stopPropagation();

        switch(e.keyCode) {
            case 40: //down
            case 38: //up
                break;

            case 27: //esc
                if (this.props.closeDialog) {
                    this.props.closeDialog();
                } else if (this.props.delayedClose) {
                    this.props.delayedClose(true);
                }
                break;

            case 9: case 13: //tab, enter
            if (this.state.searchIndex == -1 || this.state.searchIndex > this.state.searchResults.length-1) {
                this.addValue(this.refs.searchText.value);
            } else {
                this.addValue(this.state.searchResults[this.state.searchIndex].id);
            }

            if (e.keyCode == 13) {
                if (this.props.saveFilter) {
                    this.props.saveFilter();
                } else if (this.props.delayedClose) {
                    this.props.delayedClose(true);
                }
            }
            break;

            default:
                let term = this.refs.searchText.value;
                this.autoComplete(this.state.filter.id, term);
                break;
        }
    }


    setRange(values) {
        let filter = this.state.filter;
        let filterbefore = filter;
        filter.value = values;
        filter.comparison = 'between';
        delete filter.checkboxes;
        filter.updated = true;
        this.dataStore.addValueFilter(filter, filterbefore);
        this.setState({ filter: filter });
    }


    toggleValue(id) {
        let filter = this.state.filter;
        if (filter.value.indexOf(id) == -1) {
            this.addValue(id);
        } else {
            this.removeValue(id);
        }
    }


    addValue(id) {
        let filter = this.state.filter;
        let filterbefore = filter;
        id = $.trim(id);
        for(let i=0;i<this.state.operators.length;i++) {
            if (id.slice(0, this.state.operators[i].length) == this.state.operators[i]) {
                filter.comparison = this.state.operators[i];
                switch(filter.comparison) {
                    case '==': filter.comparison = '='; break;
                    case '!':  filter.comparison = '!='; break;
                }
                id = $.trim(id.slice(this.state.operators[i].length));
                break;
            }
        }
        if (this.state.singleValue) {
            filter.checkboxes = {};
            filter.value = [];
        }
        if (filter.comparison == 'between') {
            id = id.replace(/\band\b/i, '&');
            let values = id.split(/[ ,&]+/);
            for(let i=0;i<values.length;i++) {
                filter.checkboxes[values[i]] = true;
            }
            filter.value = values;
        } else {
            if (id != '' && id != '_') {
                filter.checkboxes[id] = true;
                if (filter.value.indexOf(id) == -1) {
                    filter.value.push(id);
                    filter.value.sort();
                }
            }
        }

        filter.updated = true;
        delete filter.checkboxes;
        this.dataStore.addValueFilter(filter, filterbefore);

        if (this.refs.searchText) {
            this.refs.searchText.select();
        }
        if (this.state.singleValue) {
            this.props.delayedClose(true);
        }
    }


    removeValue(id, e) {
        if (e) { e.stopPropagation(); }

        let filter = this.state.filter;
        let filterbefore = filter;
        delete(filter.checkboxes[id]);
        let index = filter.value.indexOf(id);
        if (index != -1) {
            filter.value.splice(index, 1);
        }
        filter.updated = true;
        this.dataStore.addValueFilter(filter, filterbefore);

        this.setState({ filter: filter });
    }


    toggleCheck(id, e) {
        e.stopPropagation();
        let filter = this.state.filter;
        let filterbefore = filter;

        if (filter.singleChoice) {
            filter.value = [id];
            for(let i in filter.checkboxes) {
                filter.checkboxes[i] = false;
            }
            filter.checkboxes[id] = true;
        } else {
            filter.checkboxes[id] = !(filter.checkboxes[id] && filter.checkboxes[id] != 'false');
            let index = filter.value.indexOf(id);
            if (!filter.checkboxes[id]) {
                if (index !== -1) {
                    filter.value.splice(index, 1);
                }
            } else {
                if (index === -1) {
                    filter.value.push(id);
                }
            }
        }
        filter.updated = true;
        this.dataStore.addValueFilter(filter, filterbefore);
        this.setState({ filter: filter });
    }


    setSearchIndex(index) {
        this.setState({searchIndex:index})
    }


    render()  {
        let filter = this.state.filter;
        let possibleValues = [];
        for(let value in filter.checkboxes) {
            if (value !== '_')  { // skip _ which is a placeholder to keep this as an object, not an array
                let checked = (filter.checkboxes[value] !== 'false' && filter.checkboxes[value] !== false);
                possibleValues.push({
                    value: value,
                    checked: checked
                });
            }
        }

        let defaultValue = '';
        if (!this.state.singleValue) {
            defaultValue = '';
        } else {
            defaultValue = (filter.comparison && filter.comparison !== '=' ? filter.comparison + ' ' : '') + filter.value.join();
        }

        return <div className="filter-select" ref="filterSelect">
            {
                this.state.isDate
                    ?  (
                        (this.state.isDynamic || this.state.isDateRange)

                            ? <DateRangePicker filter={filter} setRange={(values) => this.setRange(values)} delayedClose={this.props.delayedClose} />

                            : <div className="clear-fix text-center" style={{padding: '10px'}}>
                                <div id={'filter_date_picker_'+filter.id} ref="multidatePicker"></div>
                            </div>
                    )

                    : <div className="filter-editing">

                        <div className="filter-selected-values">
                            {
                                !this.state.singleValue
                                    ? possibleValues.map((possible, index) => {
                                        let inputType = this.props.filter.singleChoice ? 'radio' : 'checkbox';
                                        return <div key={index}>
                                            <label>
                                                <input type={inputType} name={this.props.filter.id} defaultChecked={possible.checked} onClick={(e) => {this.toggleCheck(possible.value,e )}}/>
                                                {possible.value}
                                            </label>
                                            {
                                                inputType == 'checkbox'
                                                    ? <i className="icon-cancel" onClick={this.removeValue.bind(this, possible.value)}></i>
                                                    : false
                                            }
                                        </div>
                                    })
                                    : false
                            }
                        </div>

                        {
                            !filter.hideTypeAhead
                                ? <div className="filter-input-box">
                                    <input ref="searchText" placeholder="Type to Add Value..." defaultValue={defaultValue} onKeyDown={this.catchSpecialKeys} onKeyUp={(e) => this.searchFilter(e)} />
                                </div>
                                : false
                        }

                        <ul className="filter-search-results" ref="searchResultsWrapper">
                            {
                                this.state.searchResults.map((result, index) => {
                                    let className = (filter && filter.value && filter.value.indexOf(result.id) == -1 ? '' : 'selected') + (this.state.searchIndex == index ? ' hover' : '');
                                    return <li key={index} className={className} onMouseEnter={this.setSearchIndex.bind(null, index)} onClick={this.addValue.bind(null, result.id)}>{result.text}</li>
                                })
                            }
                        </ul>

                    </div>
            }
        </div>
    }
}