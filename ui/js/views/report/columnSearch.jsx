var React = require('react');

var FieldsStore = require('../../stores/FieldsStore');
var ReportActions = require('../../actions/ReportActions');
var ReportFilterActions = require('../../actions/ReportFilterActions');
var Serializer = require('../../utils/Serializer');
var IdUtils = require('../../utils/IdUtils');
var InfoBox = require('../common/infoBox.jsx');
//var FieldPicker = require('./fieldPicker.jsx');

module.exports = React.createClass({

	searchResults: [],

	browseResults: [],

	contextTypes: {
		sendToPivot: React.PropTypes.func,
		show_dialog: React.PropTypes.func,
		selected_field: React.PropTypes.object
	},


	getInitialState: function() {
		var props = (this.props.defaults ? this.props.defaults : this.props);

		var browseIndex = -1;
		var searchIndex = -1;
		var parent_id = null;
		var which = '';
		var showFx = false;

		switch(props.action) {
			case 'select_dimension': //select dim for unique
			case 'add_dimension': //add report dimension
			case 'change_dimension': //change chart dimension
			case 'edit_series_dimension': //adding or editing dimension on metric in series on chart
			case 'update_chart_dimension': //adding or editing dimension on chart
			case 'drill_in': //only dimensions
			case 'pick_dimension': //portal
			case 'pick_partition': //portal
				var which = 'dimension';
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
				var which = 'metric';
			break;

			case 'pick_date':
				var which = 'date'
			break;

			case 'add_filter': //adding filter to report
			case 'pick_filter': //portal, metric filter
				var which = 'filter';
			break;

			case 'pick_either':
				var which = 'both';
			break;

			default:
				console.log('props.action undefined', props.action)
			break;
		}

		if (props.id) {
			var parsed = IdUtils.parse(props.id);
			var parent_id = IdUtils.parent();
			this.searchResults = FieldsStore.searchFields(which, parent_id) || [];

			for(var i=0;i<this.searchResults.length;i++) {
				//if (this.searchResults[i].id == props.id) {
				if (props.id.indexOf(this.searchResults[i].id) != -1) {
					searchIndex = i;
					break;
				}
			}
		}

		this.browseResults = [];

		if (which == 'metric' || which == 'filter' || which == 'both' || which =='fact') {
			this.browseResults['facts'] = FieldsStore.getCommonFacts();
			if (this.browseResults['facts'].length == 0) {
				this.browseResults['facts'] = FieldsStore.getFieldFacts();
			}
		}

		if (which == 'dimension' || which == 'filter' || which == 'both' || which == 'date') {
			this.browseResults['dimensions'] = FieldsStore.getCommonDimensions();
			if (this.browseResults['dimensions'].length == 0) {
				this.browseResults['dimensions'] = FieldsStore.getFieldDimensions();
			}

			if (which == 'date') {
				this.browseResults['dimensions'] = JSON.parse(JSON.stringify(this.browseResults['dimensions']))
				this.browseResults['dimensions'].forEach((dimension) => {
					if (dimension.outriggers.length > 0) {
						dimension.outriggers.forEach((outrigger) => {
							this.browseResults['dimensions'].push(outrigger)
						})
					}
				})
			}

		}

		return {
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
	},


	componentDidMount: function() {
		var thisComponent = this;
		this.refs.searchText.focus()
		this.refs.searchText.selectionStart = this.refs.searchText.value.length

		setTimeout(function() {
			$('.popup-menu').on('mouseenter', '.leaf, .search-results li', function() {
				if ($(this).hasClass('attribute')) { //only dimension attributes for now
					var examples = $(this).find('aside .info-examples');
					if (examples.is(':empty')) {
						var column_id = $(this).find('aside').data('column_id');
						if (column_id.slice(-6) == '|count' || column_id.indexOf('.') == -1) {
							examples.append($('<strong></strong>'));
						} else {
							ReportFilterActions.autocomplete2(column_id, '', function(results) {
								if (results && results.suggestions) {
									examples.append($('<strong>Examples: </strong>'));
									for(let i=0;i<Math.min(results.suggestions.length,4);i++) {
										if ($.trim(results.suggestions[i].value) != '') {
											examples.append($('<em></em>').text(results.suggestions[i].value));
										}
									}
								} else { //failed, let's not try again
									examples.append($('<strong></strong>'));
								}
							});
						}
					}
				}
				var position = $(this).offset()
				if (thisComponent.props.maskOff) {
					var maskPosition = $(this).closest('.change-column').find('.mask').offset()
					position.left -= maskPosition.left
					position.top -= maskPosition.top
				}
				$(this).find('.info-box').css({ left: position.left, top:position.top}).show();
			}).on('mouseleave', '.leaf, .search-results li', function() {
				$(this).find('.info-box').hide();
			});
		}, 0);
	},


	lastFieldSent: null,

	componentDidUpdate: function() {
		if (this.state.isCalculatedField) {
			this.refs.calculatedField.focus();
		} else {
			this.refs.searchText.focus();
		}

		var searchResultsWrapper = $(this.refs.searchResultsWrapper);

		var height = searchResultsWrapper.height();
		var scrollTop = searchResultsWrapper.scrollTop();
		var pos = searchResultsWrapper.find('li.hover').position();

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

		/*$('.expression-builder').on('click', 'span', function() {
			$(this).remove();
		})*/

		if (this.context.selected_field) {
			if (this.lastFieldSent != this.context.selected_field._sent) {
				this.lastFieldSent = this.context.selected_field._sent;
				this.fieldSelected(this.context.selected_field);
			}
		}

	},


	componentWillUnmount: function() {
		$(document.body).removeClass('column-builder-picking-metric');
	},


	fieldSelected: function(selectedField) {
		if (selectedField.id) {
			$('.column-builder-field-target').append('<span contenteditable="false">'+selectedField.id+'</span>')
		}
	},


	replaceColumn: function(column) {
		var id = (column ? column.id : null);
		if (!id) {
			var column = this.state.readyToAdd.shift();
			id = column.id;
		}

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
				this.props.addReportFilter(column);
			break;

			case 'select_dimension':
				var params = this.props.defaults.params;
				params.id += ':' + column.id;
				this.context.sendToPivot(params);
			break;

			case 'select_metric':
				//add dimension attibute|id...
				var params = this.props.defaults.params;
				this.context.sendToPivot(params);
			//..fall thru to add metric(s)

			case 'change_dimension':
			case 'drill_in':
			case 'add_dimension':
			case 'select_dimension':
			default:

				var where = (this.props.where || 'row')
				var drillIns = this.props.drillIns

				var what = (this.state.action == 'drill_in' || this.state.action == 'add_dimension' || this.state.action == 'change_dimension' || this.state.action == 'select_dimension') ? 'dimension' : 'metric';
				id += (what == 'dimension' || (id.slice(-6) == '|count') || (id.slice(0, 3) == 'fx(') || (id[0] == '(')) ? '' : '|sum';

				if (this.props.drillIn && drillIns) {
					var propsColumnObject = IdUtils.parse(this.props.id)
					if (propsColumnObject.filter) {
						var filter = propsColumnObject.filter.split(/([=<>!]+)/)
						if (filter[2] && filter[2][0] === "'" && filter[2][filter[2].length-1] === "'") {
							filter[2] = filter[2].slice(1, -1)
						}
						drillIns.push({
							id: filter[0],
							comparison: filter[1],
							value: filter[2]
						})
					}
					this.props.drillIn(drillIns)
					for(var i=0;i<this.props.drillIns.length;i++) {
						ReportActions.removeDimension('row', this.props.drillIns[i].id);
					}
				}

				if (id != this.props.id) {
					if (typeof this.props.iterator != 'undefined' || what == 'metric') {
						ReportActions.updateColumnByIndex(what, where, id, this.props.iterator)
					} else {
						ReportActions.addDimension(where, null, id)
					}
				}

				for(var i=0;i<this.state.readyToAdd.length;i++) {
					var ready = this.state.readyToAdd[i];
					if (ready.kind == 'attribute') {
						ReportActions.addDimension(where, null, ready.id)
					} else {
						var ag = (ready.id.slice(-6) != '|count' && ready.id.slice(0, 3) != 'fx(') ? '|sum' : '';
						ReportActions.addMetric(where, null, ready.id+ag)
					}
				}

				if (typeof this.props.metricIndex != 'undefined') {
					ReportActions.removeOtherMetrics(this.props.metricIndex);
				}

				this.props.closeChangeColumn();

				setTimeout(function() {
					Serializer.updateWindowHash();
				}, 50);
			break;

		}

	},


	setSearchIndex: function(index) {
		this.setState({searchIndex:index})
	},


	setBrowseIndex: function(index) {
		this.setState({browseIndex:index});
	},


	catchSpecialKeys: function(e) {
		switch(e.keyCode) {
			case 27: //esc
			case 9: //tab
				e.preventDefault();
				e.stopPropagation();
			break;
			case 40: //down
				e.preventDefault();
				e.stopPropagation();
				var searchIndex = (++this.state.searchIndex % this.searchResults.length);
				if (!this.state.isCalculatedField) {
					this.refs.searchText.value = this.searchResults[searchIndex].id;
				}
				this.setState({ searchIndex: searchIndex });
			break;

			case 38: //up
				e.preventDefault();
				e.stopPropagation();
				if (this.state.searchIndex == 0) {
					var searchIndex = this.searchResults.length-1;
				} else {
					var searchIndex = (--this.state.searchIndex % this.searchResults.length);
				}
				if (!this.state.isCalculatedField) {
					this.refs.searchText.value = this.searchResults[searchIndex].id;
				}
				this.setState({ searchIndex: searchIndex });
			break;
		}
	},


	searchColumns: function(e) {
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
						if (this.searchResults > -1 && this.searchResults[this.state.searchIndex]) {
							var readyToAdd = this.state.readyToAdd;
							readyToAdd.push(this.searchResults[this.state.searchIndex])
							this.setState({readyToAdd:readyToAdd});
							this.refs.searchText.select();
						}
					break;
				}
			break;

			case 13: //enter
				if (this.state.isCalculatedField) {
					this.columnClicked(this.searchResults[this.state.searchIndex]);
				} else {
					if (this.searchResults.length <= this.state.searchIndex || this.refs.searchText.value.indexOf('|') > -1) {
						var column = IdUtils.details(this.refs.searchText.value);
						if (column) {
							column.id = this.refs.searchText.value;
							this.columnClicked(column);
						} else {
							window.messageModal('Invalid Column: ' + this.refs.searchText.value);
						}
					} else {
						this.columnClicked(this.searchResults[this.state.searchIndex]);
					}
				}
			break;

			default:
				if (this.state.isCalculatedField) {
					if ($.trim($(this.refs.calculatedField).text()) === '') {
						$(this.refs.calculatedField).empty();
					} else {
						var expression = $(this.refs.calculatedField).clone();
						expression.find('span').replaceWith(' ');
						var searchText = expression.text();

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
					var searchText = this.refs.searchText.value;
				}
				if (searchText != '') {
					this.searchResults = FieldsStore.searchFields(this.state.which, this.state.parent_id, searchText) || [];
				} else if (this.props.id) {
					this.searchResults = FieldsStore.searchFields(this.state.which, this.state.parent_id) || [];
				} else {
					this.searchResults = [];
				}

				this.setState({
					searchText: searchText,
					searchIndex: 0,
					showTree: false,
				});
			break;
		}

	},


	removeReady: function(index) {
		var readyToAdd = this.state.readyToAdd;
		readyToAdd.splice(index, 1);
		this.setState({readyToAdd:readyToAdd});
	},


	boldSearchText: function(str) {
		if (this.state.searchText != '') {
			var searchTextRegExp = new RegExp(this.state.searchText , "i");
			var rawMarkup = str.replace(searchTextRegExp, '<b>$&</b>')
		} else {
			var rawMarkup = str;
		}

		if (str == 'Date Range') {
			rawMarkup = '<i class="icon-calendar"></i>' + rawMarkup;
		}

		return { __html: rawMarkup };
	},


	showAdvanced: function(fx) {
		switch(this.state.action) {
			case 'add_fact':
				this.context.show_dialog('advanced', { id:this.props.id, editing:'row', iterator:this.props.iterator, params: this.props.params, fx:fx });
			break;

			default: case 'change_dimension': case 'add_dimension':
				this.context.show_dialog('dimension_advanced', { id:this.props.id, editing:(this.props.where || 'row'), iterator:this.props.iterator });
			break;
		}
		this.props.closeChangeColumn();
	},


	setChartType: function(chart) {
		this.setState({
			chart: chart
		});
	},


	toggleTree: function(toggle) {
		if (toggle === true || toggle === false) {
			this.setState({ showTree: toggle });
		} else {
			this.setState({ showTree: !this.state.showTree });
		}
	},


	toggleBranch: function(branch) {
		this.setState({ openBranch: (this.state.openBranch == branch ? false : branch) });
	},


	initFx: function() {

		this.showAdvanced('fx');

		/*
		$(document.body).addClass('column-builder-picking-metric');
		this.setState({ isCalculatedField: true }, function() {
			$('.expression-builder').empty();
		});
		*/


	},


	uninitFx: function() {
		$(document.body).removeClass('column-builder-picking-metric');
		this.setState({ isCalculatedField: false });
	},


	columnClicked: function(column) {

		var thisComponent = this;
		var calculatedField = this.refs.calculatedField;

		if (this.state.isCalculatedField) {
			var cursorElement = '<span contentEditable="false">'+column.id+(column.id.indexOf('|') == -1 ? '|sum' : '')+'</span>';
			if (thisComponent.state.searchText == '') {
				$(calculatedField).append(cursorElement);
			} else {
				$(calculatedField).contents().each(function(i) {
					if (this.nodeType == 3 && this.textContent.indexOf(thisComponent.state.searchText) != -1) {
						$(this).after(cursorElement, '&nbsp;');
						var re = new RegExp(thisComponent.state.searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
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
			var range = document.createRange();
			var sel = window.getSelection();
			sel.removeAllRanges();
			range.setStartAfter(cursorElement);
			sel.addRange(range);

			this.setState({ searchText:'' });

		} else {
			this.replaceColumn(column);
		}
	},


	buildExpression: function() {
		var calculatedField = this.refs.calculatedField;
		var expression = $(calculatedField).text().replace(/\s/g, '');
		var column = {
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
	},


	render: function() {

		var thisComponent = this;

		var searchIndex = thisComponent.state.searchIndex;
		var browseIndex = thisComponent.state.browseIndex;

		var left = (this.state.position && this.state.position.left) ? this.state.position.left : 0;
		var top = (this.state.position && this.state.position.top) ? this.state.position.top : 0;
		var addClass = (this.props.addClass ? this.props.addClass : '');

		var className = (this.state.position.arrow || '');

		var icon = (this.state.which == 'metric') ? 'icon-sprite-123' : 'icon-ion-social-buffer-outline';

		switch(this.state.action) {
			case 'add_series':
			case 'add_fact':
			case 'add_metric_to_series':
				var title = 'Add Metric';
				var placeholder = 'Type to add metric...';
			break

			case 'select_metric':
			case 'pick_metric':
				var title = 'Select Metric';
				var placeholder = 'Type to select metric...';
			break

			case 'pick_fact':
				var title = 'Select Fact';
				var placeholder = 'Type to select fact...';
			break

			case 'pick_date':
				var title = 'Select Date';
				var placeholder = 'Type to select delete...';
			break;

			case 'change_metric':
			case 'edit_series_metric':
				var title = 'Change Metric';
				var placeholder = 'Type to select metric...';
			break

			case 'pick_partition':
			case 'pick_dimension':
				var title = 'Select Dimension';
				var placeholder = 'Type to select dimension...';
			break;

			case 'select_dimension':
			case 'add_dimension':
			case 'edit_series_dimension':
			case 'update_chart_dimension':
				var title = 'Add Dimension';
				var placeholder = 'Type to add dimension...';
			break

			case 'add_filter':
				var title = 'Add Filter';
				var placeholder = 'Type to select column...';
			break;

			case 'pick_filter':
				var title = 'Select Filter';
				var placeholder = 'Type to select filter...';
			break;

			case 'pick_either':
				var title = "Select column"
				var placeholder = 'Type to select column...';
			break;

			case 'change_dimension':
				var title = 'Change Dimension';
				var placeholder = 'Type to add dimension...';
			break;

			case 'select_dimension':
			default:
				var title = (this.props.drillIn ? 'Drill In' : 'Change Dimension');
				var placeholder = (this.state.action && this.state.action == 'fact') ? 'Type to add metric...' : 'Type to add dimension...';
				addClass = 'arrow-left-top';
			break;
		}

		var style = {};

		var reportTableContentHeight = $('.report-table-content').height() || $('body').height();

		if (this.props.position && this.props.position.bottom < (reportTableContentHeight - this.props.position.bottom - 25)) {
			style = { left:left, bottom:this.props.position.bottom }
			className = (className + ' ' + addClass).replace('arrow-left-top', 'arrow-left-bottom').replace('arrow-right-top', 'arrow-right-bottom').replace('arrow-up-right', 'arrow-down-right');
		} else {
			style = { left:left, top:top }
			className += ' ' + addClass;
		}

		if (this.props.position && this.props.position.right < 500) {
			var columnSortableContainerWidth = $('#reportMain .columnSortableContainer').width()*1.05;
			style.right = (this.props.position.right - columnSortableContainerWidth);
			delete(style.left);
			className = className.replace('arrow-left-top', 'arrow-right-top').replace('arrow-left-bottom', 'arrow-right-bottom');
		}

		if (this.state.isCalculatedField == true) {
			placeholder = 'Type to add fx...';
		}

		return (<div className={"popup-menu change-column add-shadow "+className} style={style}>

			{
				false && this.props.maskOff
				? false
				: <div className="mask" onClick={this.props.closeChangeColumn}></div>
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
								this.props.chartTypes.map(function(chart, index) {
									return <span key={index}>
										<input name="series_type" type="radio" id={"series_type-"+chart} value={chart} defaultChecked={index==0} onChange={thisComponent.setChartType.bind(null, chart)} />
										<label htmlFor={"series_type-"+chart} title={chart} className={"icon-chart-"+chart}></label>
									</span>
								})
							}
						</div>
						:false
					}

					<div className="ready-to-add">
						{
							this.state.readyToAdd.map(function(ready, index) {
								return (<div className={ready.type} key={index}>
									<i className="icon-cancel pull-right" onClick={thisComponent.removeReady.bind(null, index)}></i>
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
							<div className="user-input expression-builder column-builder-field-target" ref="calculatedField" placeholder={placeholder} contentEditable="true" onKeyDown={this.catchSpecialKeys} onKeyUp={this.searchColumns}></div>
							<p className="go-button">
								<button type="button" onClick={this.buildExpression}>GO &gt;</button>
							</p>
						</div>
						: <input id="columnSearchInput" className="user-input" ref="searchText" placeholder={placeholder} defaultValue={this.props.defaultValue || ''} onKeyDown={this.catchSpecialKeys} onKeyUp={this.searchColumns} onClick={this.toggleTree.bind(null, false)} />
					}

					<i className={this.state.showTree ? "icon-search" : "icon-flow-tree"} title={this.state.showTree ? "search" : "browse"} onClick={this.toggleTree}></i>

				</div>

				{
					this.state.showTree

					? <div className="browse-results-wrapper" ref="browseResultsWrapper">

						<ul className="browse-results" ref="browseResults">
							{
								Object.keys(thisComponent.browseResults).map(function(column_type, index) {

									switch(column_type) {
										case 'facts':
											var icon = 'icon-sprite-123';
											var parent_type = 'fact';
											var child_type = 'metric';
										break;

										case 'dimensions':
											var icon = 'icon-ion-social-buffer-outline';
											var parent_type = 'dimension';
											var child_type = 'attribute';
										break;
									}

									return <li key={index}>
										<i className={icon}></i><span style={{textTransform:'capitalize'}}>{column_type}</span>
										<ul className={"bough "+column_type}>
										{
											thisComponent.browseResults[column_type].map(function(parent, index) {

												if (thisComponent.state.action === 'pick_date' && !parent.is_date) {
													return false
												}

												return <li key={index} className={"branch "+parent_type+(thisComponent.state.openBranch != parent.label ? ' closed' : '')}
													onClick={
														thisComponent.state.action === 'pick_fact' || thisComponent.state.action === 'pick_date'
														? thisComponent.columnClicked.bind(null, parent)
														: thisComponent.toggleBranch.bind(null, parent.label)
													}>
													<div>{parent.label}</div>
													{
														(thisComponent.state.openBranch == parent.label)
														? <ul className={"twig "+child_type+"s"}>
														{
															parent[child_type+'s'].map(function(column, index) {
																if (column.type == 'lag') {
																	return false;
																}
																if (column.label == parent.label) {
																	//column.id += '|count';
																	column.label += ' Count';
																	column.type = 'fact';
																}
																return <li key={index} className={"leaf "+child_type} onClick={thisComponent.columnClicked.bind(null, column)}>
																	<div>{column.label}</div>
																	<InfoBox column={column} />
																</li>
															})
														}
														</ul>
														: false
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

					: <div className="search-results-wrapper" ref="searchResultsWrapper">
						<ul className="search-results" ref="searchResults">
							{
								this.searchResults.map(function(column, index) {
									if (index > 100) {
										return false;
									}
									if (column.type == 'lag') {
										return false;
									}

									icon = (column.type == 'metric' || column.type == 'fact') ? 'icon-sprite-123' : 'icon-ion-social-buffer-outline';
									var column_type = (column.type || 'attribute');

									return <li key={index} className={column_type + ((searchIndex == index) ? ' hover' : '')} onClick={thisComponent.columnClicked.bind(null, column)} onMouseEnter={thisComponent.setSearchIndex.bind(null, index)}>
										<label dangerouslySetInnerHTML={thisComponent.boldSearchText(column.label)}></label>
										<span className="text-right">
											<i className={icon}></i>
											<span dangerouslySetInnerHTML={thisComponent.boldSearchText(column.parent ? column.parent.label : '')}></span>
										</span>
										<InfoBox column={column} />
									</li>
								})
							}
						</ul>
					</div>
				}

				{
					this.state.action == 'change_dimension' || this.state.action == 'add_dimension'
					|| this.state.action == 'add_fact'
					? <div className="advanced-link" onClick={this.showAdvanced}>Advanced...</div>
					: false
				}

			</div>

		</div>)
  }


})
