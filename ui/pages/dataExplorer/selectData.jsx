import React from 'react';
import {inject, observer} from 'mobx-react';
import {toJS} from 'mobx';
import MetricList from './metricList.jsx';
import DimensionList from './dimensionList.jsx';

@inject('dataStore')
@observer
export default class SelectData extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;

        this.state = {
            expanded: true,
            searchText: '',
        };

        this.dataSearch = this.dataSearch.bind(this);
        this.clearSearch = this.clearSearch.bind(this);
        this.handleShortcut = this.handleShortcut.bind(this);
        this.hideBar = this.hideBar.bind(this);
        this.showBar = this.showBar.bind(this);
    }

    componentDidMount() {
        var lastTimeout = null;
        function deBounce(callback) {
            if (lastTimeout) {
                clearTimeout(lastTimeout);
            }
            lastTimeout = setTimeout(function() {
                lastTimeout = null;
                callback();
            }, 300);
        }

        var height = $('.column-trees').height() - $('.column-trees > li:last-of-type > ul > li:last-of-type').height();
        $('.column-trees > li:last-of-type').css({paddingBottom:height});

        setTimeout(() => {
            $('.column-trees').scrollTop(localStorage.getItem('scrollTop') || 0)
        }, 500)

        var lastTimeout = false;
        var autocompleteTimeout = false

        $('#select-data').on('mouseenter', '.insert-button', function(e) {
            e.stopPropagation();
            var offset = $(this).offset();
            var $this = $(this);
            if (offset) {
                offset.left -= 30
                deBounce(function() {
                    $this.find('.insert-box').css(offset).show();
                    $this.closest('div').find('.info-box').hide();
                })
            }
        }).on('mouseleave', '.insert-button', function(e) {
            var $this = $(this);
            setTimeout(function() {
                if (!$this.find('.insert-box').hasClass('frozen')) {
                    $this.find('.insert-box').hide();
                    var offset = $this.closest('div').find('.icon-info').offset();
                    if (offset) {
                        offset.left -= 30;
                        $this.closest('div').find('.info-box').css(offset).show();
                    }
                }
            }, 300);
        }).on('mouseenter', '.branch > div, .leaf', function(e) {
            e.stopPropagation();
            if ($(this).hasClass('attribute')) { //only dimension attributes for now
                var examples = $(this).find('aside .info-examples');
                if (examples.is(':empty')) {
                    var column_id = $(this).find('.info-box').data('column_id');
                    if (column_id.slice(-6) == '|count' || column_id.indexOf('.') == -1) {
                        examples.append($('<strong></strong>'));
                    } else {
                        if (autocompleteTimeout) {
                            clearTimeout(autocompleteTimeout)
                            autocompleteTimeout = false
                        }
                        autocompleteTimeout = setTimeout(function() {
                            ReportFilterActions.autocomplete2(column_id, '', function(results) {
                                if (results && results.suggestions) {
                                    examples.empty().append($('<strong>Examples: </strong>'));
                                    for(let i=0;i<Math.min(results.suggestions.length,4);i++) {
                                        if ($.trim(results.suggestions[i].value) != '') {
                                            examples.append($('<em></em>').text(results.suggestions[i].value));
                                        }
                                    }
                                } else { //failed, let's not try again
                                    examples.append($('<strong></strong>'));
                                }
                            });
                        }, 1000)
                    }
                }
            }
            var offset = $(this).find('.icon-info').offset();
            var $this = $(this);
            if (offset) {
                offset.left -= 30;
                deBounce(function() {
                    $this.find('.info-box').css(offset).show();
                });
            }
        }).on('mouseleave', '.branch > div, .leaf', function(e) {
            var $this = $(this);
            setTimeout(function() {
                $this.find('.info-box').hide();
            }, 300);
        });

    }

    dataSearch() {
        $('.clear-search').toggle($('#fact_search input').val() != '');
        this.setState({searchText:$('#fact_search input').val().toLowerCase()});
    }

    clearSearch() {
        $('#fact_search input').val('');
        $('.clear-search').hide();
        this.setState({searchText:''});
    }

    handleShortcut(branchId, id, is_date) {
        if ($(document.body).hasClass('column-builder-picking-date') && is_date) {

            this.context.field_selected({
                type: 'dimension',
                id: id,
                label: '',
                parent: id
            });

        } else if ($(document.body).hasClass('column-builder-picking-parent')) {

            this.context.field_selected({
                type: 'parent',
                id: id,
                label: '',
                parent: id
            });

        } else if ($(document.body).hasClass('column-builder-picking-fact') && $(e.target).hasClass('metric')) {

            this.context.field_selected({
                type: 'metric',
                id: id,
                label: '',
                parent: id
            });

        } else {

            let parent = $('#'+branchId);
            parent.removeClass('closed');

            let index = this.dataStore.openSelected.indexOf(parent[0].id);
            if (index === -1) {
                this.dataStore.openSelected.push(parent[0].id);
            }

            setTimeout(function() {
                let pos = parent.position();
                let first = $('.column-trees li:first-child').position();

                $('.column-trees > li:last-of-type').css({paddingBottom:0})

                let height = $('.column-trees').height() - $('.column-trees > li:last-of-type > ul > li:last-of-type').height();
                $('.column-trees > li:last-of-type').css({paddingBottom:height});

                if (pos && first) {
                    $('.column-trees').scrollTop(pos.top-first.top);
                }

            }, 1);

        }
    }

    hideBar(pass) {
        $('#select-data').hide();
        $('#select-data').removeClass('expanded');
        $('#reportMain').css('left', 0);
        if (!pass) {
            localStorage.sidebar = true;
        }
    }

    showBar() {
        $('#select-data').show();
        $('#reportMain').css('left', '475px');
        $('#select-data').addClass('expanded');
        localStorage.sidebar = false;
    }


    render() {
        let metrics =  toJS(this.dataStore._facts) || [];
        let dimensions = toJS(this.dataStore._dimensions) || [];
        let search = this.state.searchText;
        if (localStorage.sidebar === 'true') {
            this.hideBar(true);
        } else {
            this.showBar();
        }

        return (
            <aside id="select-data" className='data-dictionary'>
                {
                    metrics.length === 0
                        ?
                        <div className="theme-spinner-large"></div>
                        :
                        <div>
                            {
                                <div className="pop-out add-shadow">

                                    <h2>Select Data</h2>
                                    <i className="icon-left-open sidebar" style={{float: 'right', position: 'relative', top: '-50px', right: '15px', fontSize: '30px', width: '30px'}} onClick={() => this.hideBar(false)}></i>
                                    <div className="clear-both clear-fix">

                                        <div id="fact_search">
                                            <input placeholder="Type to search..." defaultValue={this.state.searchText} onChange={this.dataSearch}/>
                                            <span className="icon-cancel clear-search" onClick={this.clearSearch}></span>
                                        </div>
                                    </div>

                                    <div className="list-wrapper">

                                        <ul className="column-trees" onScroll={this.saveScrollPosition}>
                                            <li className="facts trunk">
                                                <div><i className="icon-sprite-123"></i> <label>Facts</label></div>

                                                <ul className="facts bough">
                                                    {Object.keys(metrics).map(function (fact, index) {
                                                        return (
                                                            <MetricList type="metric" key={index} fact={metrics[fact]}
                                                                        searchText={search}/>)
                                                    })}
                                                </ul>

                                            </li>
                                            <li className="dimensions trunk">
                                                <div><i className="icon-ion-social-buffer-outline"></i> <label>Dimensions</label>
                                                </div>

                                                <ul className="dimensions bough">
                                                    {dimensions.map(function (dimension, index) {
                                                        return (
                                                            <div key={index}>
                                                                <DimensionList type="dimension"
                                                                               dimension={dimension}
                                                                               searchText={search}/>
                                                                {
                                                                    dimension.outriggers.map((outrigger, ndex) => {
                                                                        outrigger.is_last_outrigger = (dimension.outriggers.length - 1 == ndex);
                                                                        return <DimensionList type="dimension"
                                                                                              key={ndex}
                                                                                              dimension={outrigger}
                                                                                              searchText={search}/>
                                                                    })
                                                                }
                                                            </div>
                                                        )
                                                    })}
                                                </ul>

                                            </li>
                                        </ul>

                                        <ul id="short-cuts">

                                            <li className="facts trunk">
                                                <div>
                                                    <i className="icon-sprite-123"></i>
                                                </div>
                                                <ul className="facts bough">
                                                    {
                                                        Object.keys(metrics).map((fact, index) => {
                                                            fact = metrics[fact];
                                                            let grayOut = (search == '' || (fact.label).toLowerCase().search(search) != -1) ? '' : ' gray-out';
                                                            let branchId = ('shortcut-' + fact.id + '-' + fact.label).toLowerCase().replace(/\W/g, '-');

                                                            return (
                                                                <li key={index} className={"metric branch" + grayOut}
                                                                    title={fact.label} onClick={() => {
                                                                    this.handleShortcut(branchId, fact.id, false)
                                                                }}>
                                                                    <div>{fact.label}</div>
                                                                </li>
                                                            )
                                                        })
                                                    }
                                                </ul>
                                            </li>
                                            <li className="dimensions trunk">
                                                <div><i className="icon-ion-social-buffer-outline"></i></div>

                                                <ul key="dimensions" className="dimensions bough">
                                                    {
                                                        dimensions.map((dimension, index) => {
                                                            let grayOut = (search == '' || (dimension.label).toLowerCase().search(search) != -1) ? '' : ' gray-out';
                                                            let branchId = ('shortcut-' + dimension.id + '-' + dimension.label).toLowerCase().replace(/\W/g, '-');
                                                            let isDate = !!(dimension.attributes && dimension.attributes[0] && dimension.attributes[0].quickFilters);
                                                            return (
                                                                <li key={index} className={"attribute branch" + grayOut}
                                                                    title={dimension.label} onClick={() => {
                                                                    this.handleShortcut(branchId, dimension.id, isDate)
                                                                }}>
                                                                    <div>{dimension.label}</div>
                                                                </li>
                                                            )
                                                        })
                                                    }
                                                </ul>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            }
                        </div>
                }
            </aside>
        )
    }
}