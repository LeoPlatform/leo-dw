import React from 'react';
import {inject, observer} from 'mobx-react';
import InfoBox from '../infoBox.jsx';
import IdUtils from '../../../../ui/js/utils/IdUtils';

@inject('dataStore')
@observer
export default class ColumnSearch extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;

        let browseIndex = -1;
        let searchIndex = -1;
        let parent_id = null;
        let which = '';
        let showFx = false;

        switch(props.action) {
            case 'select_dimension': //select dim for unique
            case 'add_dimension': //add report dimension
            case 'change_dimension': //change chart dimension
            case 'edit_series_dimension': //adding or editing dimension on metric in series on chart
            case 'update_chart_dimension': //adding or editing dimension on chart
            case 'drill_in': //only dimensions
            case 'pick_dimension': //portal
            case 'pick_partition': //portal
                which = 'dimension';
                break;

            case 'pick_fact':
            case 'select_fact':
                which = 'fact';
                break;

            case 'add_fact': //add report metric
            case 'select_metric': //add metric to empty report
            case 'add_series': //
            case 'add_metric_to_series': //
                showFx = true;
            case 'edit_series_metric': //
            case 'change_metric': //change report metric

            case 'pick_metric': //portal
                which = 'metric';
                break;

            case 'pick_date':
                which = 'date'
                break;

            case 'add_filter': //adding filter to report
            case 'pick_filter': //portal, metric filter
                which = 'filter';
                break;

            case 'pick_either':
                which = 'both';
                break;

            default:
                console.log('props.action undefined', props.action)
                break;
        }

        this.state =  {
            searchResults: [],
            lastFieldSent: null,
            searchText: '',
            searchIndex: searchIndex,
            readyToAdd: [],
            parent_id: parent_id,
            action: props.action || '',
            which: which,
            position: props.position || [],

            chart: (this.props.chartTypes ? this.props.chartTypes[Object.keys(this.props.chartTypes)[0]] : ''),
            showTree: false,
            browseIndex: browseIndex,
            openBranch: false,

            isCalculatedField: false,
            showFx: showFx
        }
    }


    componentDidMount() {
        let thisComponent = this;
        this.refs.searchText.focus();
        this.refs.searchText.selectionStart = this.refs.searchText.value.length;

        setTimeout(function() {
            $('.popup-menu').on('mouseenter', '.leaf, .search-results li', function() {
                if ($(this).hasClass('attribute')) { //only dimension attributes for now
                    let examples = $(this).find('aside .info-examples');
                    if (examples.is(':empty')) {
                        let column_id = $(this).find('aside').data('column_id');
                        if (column_id.slice(-6) == '|count' || column_id.indexOf('.') == -1) {
                            examples.append($('<strong></strong>'));
                        }
                    }
                }
                let position = $(this).offset()
                if (thisComponent.props.maskOff) {
                    let maskPosition = $(this).closest('.change-column').find('.mask').offset()
                    position.left -= maskPosition.left
                    position.top -= maskPosition.top
                }
                $(this).find('.info-box').css({ left: position.left, top:position.top}).show();
            }).on('mouseleave', '.leaf, .search-results li', function() {
                $(this).find('.info-box').hide();
            });
        }, 0);
    }


    componentDidUpdate() {
        if (this.state.isCalculatedField) {
            //this.refs.calculatedField.focus();
        } else {
            this.refs.searchText.focus();
        }

        let searchResultsWrapper = $(this.refs.searchResultsWrapper);

        let height = searchResultsWrapper.height();
        let scrollTop = searchResultsWrapper.scrollTop();
        let pos = searchResultsWrapper.find('li.hover').position();

        if (pos) {
            if (pos.top < 60) {
                searchResultsWrapper.scrollTop(scrollTop - 60)
            }

            if (pos.top > height) {
                searchResultsWrapper.scrollTop(pos.top - height + scrollTop)
            }

            if (pos.top < 0) {
                searchResultsWrapper.scrollTop(0);
            }
        }

        if (this.context.selected_field) {
            if (this.lastFieldSent != this.context.selected_field._sent) {
                this.lastFieldSent = this.context.selected_field._sent;
                this.fieldSelected(this.context.selected_field);
            }
        }

    }


    componentWillUnmount() {
        $(document.body).removeClass('column-builder-picking-metric');
    }


    fieldSelected(selectedField) {
        if (selectedField.id) {
            $('.column-builder-field-target').append('<span contenteditable="false">'+selectedField.id+'</span>')
        }
    }


    replaceColumn(column) {
        let id = (column ? column.id : null);
        if (!id) {
            let column = this.state.readyToAdd.shift();
            id = column.id;
        }

        let params = this.props && this.props.defaults && this.props.defaults.params || {};

        switch(this.state.action) {

            case 'pick_partition':
            case 'pick_metric':
            case 'pick_dimension':
            case 'pick_filter':
            case 'pick_either':
            case 'pick_both':
            case 'pick_fact':
            case 'pick_date':
                this.props.save(this.state.action, column, this.state.readyToAdd, this.state.chart);
                break;

            case 'add_series':
            case 'add_metric_to_series':
            case 'edit_series_metric':
            case 'edit_series_dimension':
            case 'update_chart_dimension':
                this.props.popUpSave(this.state.action, column, this.state.readyToAdd, this.state.chart);
                break;

            case 'add_filter':
                this.dataStore.addReportFilter(column);
                this.props.addReportFilterClose();
                break;

            case 'select_dimension':
                params.id += ':' + column.id;
                this.context.sendToPivot(params);
                break;

            case 'select_metric':
                //add dimension attibute|id...
                this.context.sendToPivot(params);
            //..fall thru to add metric(s)

            case 'change_dimension':
            case 'change_metric':
                let location = (this.props.partition ? 'column' : 'row');
                let type = this.state.action === 'change_dimension' ? 'dimensions' : 'metrics';
                id += (type == 'dimensions' || (id.slice(-6) == '|count') || (id.slice(0, 3) == 'fx(') || (id[0] == '(')) ? '' : '|sum';

                if (location === 'row') {
                    this.dataStore.urlObj[type].splice(this.props.series_index, 1);
                    this.dataStore.urlObj[type].splice(this.props.series_index, 0, id)
                } else {
                    this.dataStore.urlObj.partitions.splice(this.props.series_index, 1);
                    this.dataStore.urlObj.partitions.splice(this.props.series_index, 0, id)
                }
                this.dataStore.setUrlHash();
                this.dataStore.getInitialURL(window.location.hash,true);
                this.props.closeChangeColumn();
                break;


            case 'drill_in':
            case 'add_dimension':
            case 'select_dimension':
            default:

                let where = (this.props.where || 'row')
                let what = (this.state.action == 'drill_in' || this.state.action == 'add_dimension' || this.state.action == 'change_dimension' || this.state.action == 'select_dimension') ? 'dimensions' : 'metrics';
                id += (what == 'dimensions' || (id.slice(-6) == '|count') || (id.slice(0, 3) == 'fx(') || (id[0] == '(')) ? '' : '|sum';

                if (where === 'row') {
                    this.dataStore.urlObj[what].push(id)
                } else {
                    this.dataStore.urlObj.partitions.push(id)
                }
                this.dataStore.setUrlHash();
                this.dataStore.getInitialURL(window.location.hash,true);
                this.props.closeChangeColumn();
        }

    }


    setSearchIndex(index) {
        this.setState({searchIndex:index})
    }


    catchSpecialKeys(e) {
        switch(e.keyCode) {
            case 27: //esc
            case 9: //tab
                e.preventDefault();
                e.stopPropagation();
                break;
            case 40: //down
                e.preventDefault();
                e.stopPropagation();
                var searchIndex = (++this.state.searchIndex % this.state.searchResults.length);
                if (!this.state.isCalculatedField) {
                    this.refs.searchText.value = this.state.searchResults[searchIndex].id;
                }
                this.setState({ searchIndex: searchIndex });
                break;

            case 38: //up
                e.preventDefault();
                e.stopPropagation();
                if (this.state.searchIndex == 0) {
                    var searchIndex = this.state.searchResults.length-1;
                } else {
                    var searchIndex = (--this.state.searchIndex % this.state.searchResults.length);
                }
                if (!this.state.isCalculatedField) {
                    this.refs.searchText.value = this.state.searchResults[searchIndex].id;
                }
                this.setState({ searchIndex: searchIndex });
                break;
        }
    }


    searchColumns(e) {
        e.preventDefault();
        e.stopPropagation();
        switch(e.keyCode) {
            case 40: //down
            case 38: //up
                break;

            case 27: //esc
                this.props.closeChangeColumn();
                break;

            case 9: //tab
                switch(this.state.action) {
                    case 'select_fact':
                    case 'select_dimension':
                        //do nothing
                        break;

                    default:
                        if (this.state.searchResults > -1 && this.state.searchResults[this.state.searchIndex]) {
                            let readyToAdd = this.state.readyToAdd;
                            readyToAdd.push(this.state.searchResults[this.state.searchIndex])
                            this.setState({readyToAdd:readyToAdd});
                            this.refs.searchText.select();
                        }
                        break;
                }
                break;

            case 13: //enter
                if (this.state.isCalculatedField) {
                    this.columnClicked(this.state.searchResults[this.state.searchIndex]);
                } else {
                    if (this.state.searchResults.length <= this.state.searchIndex) {
                        let column = IdUtils.details(this.refs.searchText.value);
                        if (column) {
                            column.id = this.refs.searchText.value;
                            this.columnClicked(column);
                        } else {
                            window.messageModal('Invalid Column: ' + this.refs.searchText.value);
                        }
                    } else {
                        this.columnClicked(this.state.searchResults[this.state.searchIndex]);
                    }
                }
                break;

            default:
                let searchText = this.refs.searchText.value;

                if (this.state.isCalculatedField) {
                    if ($.trim($(this.refs.calculatedField).text()) === '') {
                       $(this.refs.calculatedField).empty();
                    } else {
                        let expression = $(this.refs.calculatedField).clone();
                        expression.find('span').replaceWith(' ');
                        let searchText = expression.text();

                        if (searchText.charCodeAt(0) != 160) {
                            $(this.refs.calculatedField).prepend('&nbsp;');
                        }
                        if (searchText.charCodeAt(searchText.length-1) != 160) {
                            $(this.refs.calculatedField).append('&nbsp;');
                        }

                        searchText = $.trim(searchText.replace(/[-\s+\/*\()0-9|]+/g, ' '));
                        expression = null;
                    }
                } else {
                    searchText = this.refs.searchText.value;
                }
                if (searchText != '') {
                    this.state.searchResults = this.dataStore.searchFields(this.state.which, this.state.parent_id, searchText) || [];
                } else if (this.props.id) {
                    this.state.searchResults = this.dataStore.searchFields(this.state.which, this.state.parent_id) || [];
                } else {
                    this.state.searchResults = [];
                }


                this.setState({
                    searchText: searchText,
                    searchIndex: 0,
                    showTree: false,
                });
                break;
        }

    }


    removeReady(index) {
        let readyToAdd = this.state.readyToAdd;
        readyToAdd.splice(index, 1);
        this.setState({readyToAdd:readyToAdd});
    }


    boldSearchText(str) {
        let rawMarkup = '';
        if (this.state.searchText != '') {
            let searchTextRegExp = new RegExp(this.state.searchText , "i");
            rawMarkup = str.replace(searchTextRegExp, '<b>$&</b>')
        } else {
            rawMarkup = str;
        }

        if (str == 'Date Range') {
            rawMarkup = '<i class="icon-calendar"></i>' + rawMarkup;
        }

        return { __html: rawMarkup };
    }


    showAdvanced(fx) {
        switch(this.state.action) {
            case 'add_fact':
                this.context.show_dialog('advanced', { id:this.props.id, editing:'row', iterator:this.props.iterator, params: this.props.params, fx:fx });
                break;

            default: case 'change_dimension': case 'add_dimension':
            this.context.show_dialog('dimension_advanced', { id:this.props.id, editing:(this.props.where || 'row'), iterator:this.props.iterator });
            break;
        }
        this.props.closeChangeColumn();
    }


    setChartType(chart) {
        this.setState({
            chart: chart
        });
    }


    toggleTree(toggle) {
        if (toggle === true || toggle === false) {
            this.setState({ showTree: toggle });
        } else {
            this.setState({ showTree: !this.state.showTree });
        }
    }


    toggleBranch(branch) {
        this.setState({ openBranch: (this.state.openBranch == branch ? false : branch) });
    }


    initFx() {
        this.showAdvanced('fx');
    }


    uninitFx() {
        $(document.body).removeClass('column-builder-picking-metric');
        this.setState({ isCalculatedField: false });
    }


    columnClicked(column) {

        let calculatedField = this.refs.calculatedField;

        if (this.state.isCalculatedField) {
            let cursorElement = '<span contentEditable="false">'+column.id+(column.id.indexOf('|') == -1 ? '|sum' : '')+'</span>';
            if (this.state.searchText == '') {
                $(calculatedField).append(cursorElement);
            } else {
                $(calculatedField).contents().each((i) => {
                    if (this.nodeType == 3 && this.textContent.indexOf(this.state.searchText) != -1) {
                        $(this).after(cursorElement, '&nbsp;');
                        let re = new RegExp(this.state.searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
                        $(this).replaceWith($(this).text().replace(re, ''));
                    }
                });
            }

            if ($(calculatedField).text().charCodeAt(0) != 160) {
                $(calculatedField).prepend('&nbsp;');
            }
            if ($(calculatedField).text().charCodeAt($(calculatedField).text().length-1) != 160) {
                $(calculatedField).append('&nbsp;');
            }

            $('.info-box').hide();
            calculatedField.focus();
            let range = document.createRange();
            let sel = window.getSelection();
            sel.removeAllRanges();
            range.setStartAfter(cursorElement);
            sel.addRange(range);

            this.setState({ searchText:'' });

        } else {
            this.replaceColumn(column);
        }
    }


    buildExpression() {
        let calculatedField = this.refs.calculatedField;
        let expression = $(calculatedField).text().replace(/\s/g, '');
        let column = {
            //format: '',
            id: 'fx(' + expression + ')',
            label: '(' + expression + ')',
            parent: {
                id: '',
                label: 'calculated field'
            },
            type: 'metric'
        }
        this.replaceColumn(column);
        $(document.body).removeClass('column-builder-picking-metric');
    }


    render() {

        let searchIndex = this.state.searchIndex;
        let browseIndex = this.state.browseIndex;

        let left = (this.state.position && this.state.position.left) ? this.state.position.left : 0;
        let top = (this.state.position && this.state.position.top) ? this.state.position.top : 0;
        let addClass = (this.props.addClass ? this.props.addClass : '');

        let className = (this.state.position.arrow || '');

        let icon = (this.state.which == 'metric') ? 'icon-sprite-123' : 'icon-ion-social-buffer-outline';
        let title = '';
        let placeholder = '';

        switch(this.state.action) {
            case 'add_series':
            case 'add_fact':
            case 'add_metric_to_series':
                title = 'Add Metric';
                placeholder = 'Type to add metric...';
                break

            case 'select_metric':
            case 'pick_metric':
                title = 'Select Metric';
                placeholder = 'Type to select metric...';
                break

            case 'pick_fact':
                title = 'Select Fact';
                placeholder = 'Type to select fact...';
                break

            case 'pick_date':
                title = 'Select Date';
                placeholder = 'Type to select delete...';
                break;

            case 'change_metric':
            case 'edit_series_metric':
                title = 'Change Metric';
                placeholder = 'Type to select metric...';
                break

            case 'pick_partition':
            case 'pick_dimension':
                title = 'Select Dimension';
                placeholder = 'Type to select dimension...';
                break;

            case 'select_dimension':
            case 'add_dimension':
            case 'edit_series_dimension':
            case 'update_chart_dimension':
                title = 'Add Dimension';
                placeholder = 'Type to add dimension...';
                break

            case 'add_filter':
                title = 'Add Filter';
                placeholder = 'Type to select column...';
                break;

            case 'pick_filter':
                title = 'Select Filter';
                placeholder = 'Type to select filter...';
                break;

            case 'pick_either':
                title = "Select column"
                placeholder = 'Type to select column...';
                break;

            case 'change_dimension':
                title = 'Change Dimension';
                placeholder = 'Type to add dimension...';
                break;

            case 'select_dimension':
            default:
                title = (this.props.drillIn ? 'Drill In' : 'Change Dimension');
                placeholder = (this.state.action && this.state.action == 'fact') ? 'Type to add metric...' : 'Type to add dimension...';
                addClass = 'arrow-left-top';
                break;
        }

        let style = {};

        let reportTableContentHeight = $('.report-table-content').height() || $('body').height();

        if (this.props.position && this.props.position.bottom < (reportTableContentHeight - this.props.position.bottom - 25)) {
            style = { left:left, bottom:this.props.position.bottom }
            className = (className + ' ' + addClass).replace('arrow-left-top', 'arrow-left-bottom').replace('arrow-right-top', 'arrow-right-bottom').replace('arrow-up-right', 'arrow-down-right');
        } else if (this.props.action === 'change_metric' || this.props.action === 'change_dimension') {
            style = { marginLeft:left, position:"fixed" };
            className += ' ' + addClass;
        } else {
            style = { left:left, top:top };
            className += ' ' + addClass;
        }

        if (this.props.partition) {
            title = 'Change Partition';
            placeholder = 'Type to select partition...';
        }

        if (this.props.position && this.props.position.right < 500) {
            let columnSortableContainerWidth = $('#reportMain .columnSortableContainer').width()*1.05;
            style.right = (this.props.position.right - columnSortableContainerWidth);
            delete(style.left);
            className = className.replace('arrow-left-top', 'arrow-right-top').replace('arrow-left-bottom', 'arrow-right-bottom');
        }

        if (this.state.isCalculatedField == true) {
            placeholder = 'Type to add fx...';
        }

        return (<div className={"popup-menu change-column add-shadow "+className} style={style}>

            {
               <div className="mask" onClick={this.props.closeChangeColumn}></div>
            }

            <div>

                <div className="controls-wrapper">

                    <div>
                        <i className={icon}></i>
                        <span>{title}</span>
                        <i className="icon-cancel pull-right" onClick={this.props.closeChangeColumn}></i>
                        {
                            this.state.showFx
                                ? (
                                    this.state.isCalculatedField
                                        ? <i className="icon-sprite-123 pull-right" onClick={this.uninitFx}></i>
                                        : <i className="icon-fx pull-right" onClick={this.initFx}></i>
                                )
                                : false
                        }
                    </div>

                    {
                        this.state.action == 'add_series' && this.props.chartTypes
                            ? <div className="series-type">
                                {
                                    this.props.chartTypes.map((chart, index) => {
                                        return <span key={index}>
										<input name="series_type" type="radio" id={"series_type-"+chart} value={chart} defaultChecked={index==0} onChange={this.setChartType.bind(null, chart)} />
										<label htmlFor={"series_type-"+chart} title={chart} className={"icon-chart-"+chart}></label>
									</span>
                                    })
                                }
                            </div>
                            :false
                    }

                    <div className="ready-to-add">
                        {
                            this.state.readyToAdd.map((ready, index) => {
                                return (<div className={ready.type} key={index}>
                                    <i className="icon-cancel pull-right" onClick={this.removeReady.bind(null, index)}></i>
                                    <div className="parent-label">{ready.parent.label}</div>
                                    <div className="column-label">{ready.label}</div>
                                </div>)
                            })
                        }
                        {
                            this.state.readyToAdd.length > 0
                                ? <p className="go-button text-right">
                                    <button type="button" onClick={this.replaceColumn.bind(null, null)}>GO &gt;</button>
                                </p>
                                : false
                        }
                    </div>

                    {
                        this.state.isCalculatedField
                            ? <div>
                                <div className="user-input expression-builder column-builder-field-target" ref="calculatedField" placeholder={placeholder} contentEditable="true" onKeyDown={(e)=> {this.catchSpecialKeys(e)}} onKeyUp={(e) => {this.searchColumns(e)}}></div>
                                <p className="go-button">
                                    <button type="button" onClick={() => this.buildExpression()}>GO &gt;</button>
                                </p>
                            </div>
                            : <input id="columnSearchInput" className="user-input" ref="searchText" placeholder={placeholder} defaultValue={this.props.defaultValue || ''} onKeyDown={(e) => {this.catchSpecialKeys(e)}} onKeyUp={(e) => {this.searchColumns(e)}} onClick={() => {this.toggleTree(false)}} />
                    }

                </div>

                {
                    <div className="search-results-wrapper" ref="searchResultsWrapper">
                        <ul className="search-results" ref="searchResults">
                            {
                                this.state.searchResults.map((column, index) => {
                                    if (index > 100) {
                                        return false;
                                    }
                                    if (column.type == 'lag') {
                                        return false;
                                    }
                                    if (column.parent && column.parent.label) {
                                        column.dimension = column.parent.label;
                                    }

                                    icon = (column.type == 'metric' || column.type == 'fact') ? 'icon-sprite-123' : 'icon-ion-social-buffer-outline';
                                    let column_type = (column.type || 'attribute');

                                    return <li key={index} className={column_type + ((searchIndex == index) ? ' hover' : '')} onClick={() => {this.columnClicked(column)}} onMouseEnter={() => {() => {this.setSearchIndex(index)}}}>
                                        <label dangerouslySetInnerHTML={this.boldSearchText(column.label)}></label>
                                        <span className="text-right">
                                    <i className={icon}></i>
                                    <span dangerouslySetInnerHTML={this.boldSearchText(column.parent ? column.parent.label : '')}></span>
                                </span>
                                        <InfoBox column={column} />
                                    </li>
                                })
                            }
                        </ul>
                    </div>
                }
            </div>
        </div>
        )
    }
}