var React = require('react');

var MetricList = require('./metricList.jsx');
var DimensionList = require('./dimensionList.jsx');
var Serializer = require('../../utils/Serializer');
var FieldsActions = require('../../actions/FieldsActions');
var FieldsStore = require('../../stores/FieldsStore');
var ReportFilterActions = require('../../actions/ReportFilterActions');

var ColumnEditor = require('../report/dialogs/ColumnEditor.jsx')
var ColumnBuilder = require('../report/dialogs/ColumnBuilder.jsx')

var DatePicker = require('../report/dialogs/DatePicker.jsx');
var FilterEditor = require('../report/filters/FilterEditor.jsx');


module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired,

		field_selected: React.PropTypes.func,
		toggle_select_data: React.PropTypes.func.isRequired,

		close_popup: React.PropTypes.func
	},


	childContextTypes: {
		set_branch_state: React.PropTypes.func.isRequired,
		get_branch_state: React.PropTypes.func.isRequired,

		edit_column: React.PropTypes.func,
		date_filter: React.PropTypes.func,
		edit_filter: React.PropTypes.func
	},


	getChildContext: function() {
		return {
			set_branch_state: this.setBranchState,
			get_branch_state: this.getBranchState,

			edit_column: this.editColumn,
			date_filter: this.dateFilter,
			edit_filter: this.filterEditor
		}
	},


	setBranchState: function(branch, state) {
		var branchStates = this.state.branchStates;
		if (state) {
			branchStates[branch] = true;
		} else {
			delete(branchStates[branch]);
		}
		this.setState({branchStates: branchStates})
		localStorage.setItem('branchStates', JSON.stringify(branchStates))
	},


	getBranchState: function(branch) {
		return this.state.branchStates[branch];
	},


	editColumn: function(defaults, event) {
		event && event.stopPropagation()

		switch (defaults.kind) {
			case 'virtual': case 'derived':
				if (!defaults.calc) {
					defaults.calc = defaults.kind
				}
				var dialogDefaults = defaults;

				if (dialogDefaults['expression']) {
					//dialogDefaults['expression'] = dialogDefaults['expression'].replace(/((d|f)_[\w\.\|$#]+)/gim, '&nbsp;<span contentEditable="false">$1</span>&nbsp;');
				}

				this.showDialog('column_builder', dialogDefaults)
			break;

			default:
				this.showDialog('field_editor', {
					type: defaults.type,
					id: defaults.id,
					label: defaults.label,
					description: defaults.description,
					format: defaults.format,
					sort: defaults.sort,
					color: defaults.color || undefined
				});
			break;
		}

		this.context.close_popup() /* not working */
	},


	dateFilter: function(defaults, event) {
		event && event.stopPropagation()
		this.showDialog('date', defaults)
	},


	filterEditor: function(defaults, event) {
		event && event.stopPropagation()
		var pos = $(event.currentTarget).offset()
		defaults.left = pos.left;
		defaults.top = pos.top;
		this.showDialog('filter_editor', defaults)
	},


	closeDialog: function() {
		this.setState({ dialog: false })
	},


	showDialog: function(dialog, dialogDefaults) {
		this.setState({ dialog: false })
		setTimeout(() => {
			this.setState({ dialog: dialog, dialogDefaults: dialogDefaults })
		}, 1)
	},


	getInitialState: function() {
		FieldsActions.initFields();

		var branchStates = JSON.parse(localStorage.getItem('branchStates') || JSON.stringify({}))

		return {
			fieldDimensions: FieldsStore.getFieldDimensions(),
			fieldFacts: FieldsStore.getFieldFacts(),
			fieldCommonDimensions: FieldsStore.getCommonDimensions(),
			fieldCommonFacts: FieldsStore.getCommonFacts(),
			searchText: '',
			filter: { id: 0, type:'', value: null },
			expanded: this.props.selectDataExpanded,
			pinned: this.props.selectDataExpanded,

			branchStates: branchStates
		}
	},


	componentDidMount: function() {
		var thisComponent = this;

		FieldsStore.addChangeListener(this._onFieldsStoreChange);

		$(document.body).keydown(function(e) {
			if (e.keyCode == 27) {
				thisComponent.context.close_dialog();
			} else if (!e.ctrlKey || e.keyCode == 86) {
				if (!$(e.target).is('textarea') && !$(e.target).is('input') && !$(e.target).is('select') && !$(e.target).is('[contenteditable]')) {
					$('#fact_search input').focus();
				}
			}
		});


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

	},


	componentWillUnmount: function() {
		FieldsStore.removeChangeListener(this._onFieldsStoreChange);
	},


	_onFieldsStoreChange: function() {
		this.setState({
			fieldDimensions: FieldsStore.getFieldDimensions(),
			fieldFacts: FieldsStore.getFieldFacts(),
			fieldCommonDimensions: FieldsStore.getCommonDimensions(),
			fieldCommonFacts: FieldsStore.getCommonFacts()
		});
	},


	toggleSelectData: function(open, event) {
		if (event) event.stopPropagation();
		if (open || !this.state.pinned) {
			var thisComponent = this;
			thisComponent.context.toggle_select_data(open);
			thisComponent.setState({expanded:open});
		}
	},


	togglePinning: function(e) {
		localStorage.setItem('selectDataPinned', !this.state.pinned)
		this.setState({pinned:!this.state.pinned});
	},


	closeTimeout: null,

	delayedToggleSelectData: function() {
		var thisComponent = this;
		this.closeTimeout = setTimeout(function() {
			thisComponent.toggleSelectData(false);
			this.closeTimeout = null;
		}, 500);
	},

	cancelToggle: function() {
		if (this.closeTimeout) {
			clearTimeout(this.closeTimeout);
			this.closeTimeout = null;
		}
	},


	editFilter: function(params) {
		this.setState({filter:params});
	},


	closeFilter: function() {
		this.setState({filter: { type:'' }});
	},


	dataSearch: function(event) {
		$('.clear-search').toggle($('#fact_search input').val() != '');
		this.setState({searchText:$('#fact_search input').val().toLowerCase()});
	},


	clearSearch: function() {
		$('#fact_search input').val('');
		$('.clear-search').hide();
		this.setState({searchText:''});
	},


	handleShortcut: function(branchId, id, is_date, e) {

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

			var parent = $('#'+branchId);
			parent.removeClass('closed');

			this.setBranchState(branchId, true);

			if ($(e.target).hasClass('gray-out')) {
				this.clearSearch();
			}

			setTimeout(function() {
				var pos = parent.position();
				var first = $('.column-trees li:first-child').position();

				$('.column-trees > li:last-of-type').css({paddingBottom:0})

				var height = $('.column-trees').height() - $('.column-trees > li:last-of-type > ul > li:last-of-type').height();
				$('.column-trees > li:last-of-type').css({paddingBottom:height});

				if (pos && first) {
					$('.column-trees').scrollTop(pos.top-first.top);
				}

			}, 1);

		}

	},


	toggleRedShift: function(event) {
		event.preventDefault();
		event.stopPropagation();
		window.useredshift = !window.useredshift;
		Serializer.updateWindowHash();
	},


	saveScrollPosition: function() {
		localStorage.setItem('scrollTop', $('.column-trees').scrollTop())
	},


	render: function() {

		var thisComponent = this;
		var dimensions = (this.state.fieldCommonDimensions.length == 0 ? this.state.fieldDimensions : this.state.fieldCommonDimensions);
		var metrics = (this.state.fieldCommonFacts.length == 0) ? this.state.fieldFacts : this.state.fieldCommonFacts;
		var useMySQL = !window.useredshift;

		if (this.props.expand) {
			this.toggleSelectData(true);
		}

		return (

	<aside id="select-data" className={'data-dictionary '+(!this.state.expanded ? 'collapsed' : 'expanded')} onClick={!this.state.expanded ? this.toggleSelectData.bind(null, true) : false}>

		{
			!this.state.expanded || (dimensions.length == 0 && metrics.length == 0)
			? <div>
				<div className="rotate-text">Select Data</div>
				<div className="right-arrow">&rsaquo;</div>
			</div>
			: <div className="pop-out add-shadow" onMouseEnter={this.cancelToggle}>

			{
				this.state.pinned || this.props.dialogOpen
				? false
				: <div className="data-dictionary-mask" onMouseOver={this.delayedToggleSelectData}></div>
			}

			<button type="button" onClick={this.togglePinning} className={(this.state.pinned?'icon-pin-in':'icon-pin-out')+" toggle-popout pull-right add-shadow"}></button>

			<h2>Select Data <span>v{window.dw.version}</span></h2>

			<div className="clear-both clear-fix">

				<button className={'use-live pull-right theme-button '+(useMySQL ? 'active theme-button-danger':'')} onClick={this.toggleRedShift}>Use Live</button>

				<div id="fact_search">
					<input placeholder="Type to search..." defaultValue={this.state.searchText} onChange={this.dataSearch} />
					<span className="icon-cancel clear-search" onClick={this.clearSearch}></span>
				</div>
			</div>

			<div className="list-wrapper">

				<ul className="column-trees" onScroll={this.saveScrollPosition}>
					<li className="facts trunk">
						<div><i className="icon-sprite-123"></i> <label>Facts</label></div>

						<ul className="facts bough">
							{metrics.map(function(fact, index) {
								return (<MetricList type="metric" key={index} fact={fact} searchText={thisComponent.state.searchText} editFilter={thisComponent.editFilter} inputBoxArrows={thisComponent.props.inputBoxArrows} />)
							})}
						</ul>

					</li>
					<li className="dimensions trunk">
						<div><i className="icon-ion-social-buffer-outline"></i> <label>Dimensions</label></div>

						<ul className="dimensions bough">
							{dimensions.map(function(dimension, index) {
								return (<div key={index}>
									<DimensionList type="dimension" dimension={dimension} searchText={thisComponent.state.searchText} editFilter={thisComponent.editFilter} inputBoxArrows={thisComponent.props.inputBoxArrows} />
									{
										dimension.outriggers.map(function(outrigger, ndex) {
											outrigger.is_last_outrigger = (dimension.outriggers.length-1 == ndex);
											return <DimensionList type="dimension" key={ndex} dimension={outrigger} searchText={thisComponent.state.searchText} editFilter={thisComponent.editFilter} inputBoxArrows={thisComponent.props.inputBoxArrows} />
										})
									}
								</div>)
							})}
						</ul>

					</li>
				</ul>

				<ul id="short-cuts">

					<li className="facts trunk">
						<div><i className="icon-sprite-123"></i></div>

						<ul className="facts bough">
							{metrics.map(function(fact, index) {
								var branchId = ('shortcut-'+fact.id+'-'+fact.label).toLowerCase().replace(/\W/g, '-');
								var grayOut = (thisComponent.state.searchText == '' || (fact.label).toLowerCase().search(thisComponent.state.searchText) != -1) ? '' : ' gray-out';

								return (<li key={index} className={"metric branch" + grayOut} title={fact.label}  onClick={thisComponent.handleShortcut.bind(thisComponent, branchId, fact.id, false)}>
									<div>{fact.label}</div>
								</li>)
							})}
						</ul>
					</li>
					<li className="dimensions trunk">
						<div><i className="icon-ion-social-buffer-outline"></i></div>

						<ul key="dimensions" className="dimensions bough">
							{
								dimensions.map(function(dimension, index) {
									if (!dimension.is_outrigger) {
										var branchId = ('shortcut-'+dimension.id+'-'+dimension.label).toLowerCase().replace(/\W/g, '-');
										var isDate = !!(dimension.attributes && dimension.attributes[0] && dimension.attributes[0].quickFilters);
										var grayOut = (thisComponent.state.searchText == '' || (dimension.label).toLowerCase().search(thisComponent.state.searchText) != -1) ? '' : ' gray-out';

										return (<li key={index} className={"attribute branch" + (isDate ? ' is_date' : '') +  grayOut} title={dimension.label} onClick={thisComponent.handleShortcut.bind(thisComponent, branchId, dimension.id, isDate)}>
											<div>{dimension.label}</div>
										</li>)
									}
								})
							}
						</ul>
					</li>
				</ul>

			</div>

		</div>
		}


		{(function(dialog) {

			switch(dialog) {
				case 'field_editor':
					return <ColumnEditor defaults={thisComponent.state.dialogDefaults} />
				break;

				case 'column_builder':
					return <ColumnBuilder defaults={thisComponent.state.dialogDefaults} sendToPivot={thisComponent.sendToPivot} />
				break;

				case 'advanced':
					return <AdvancedDialog defaults={thisComponent.state.dialogDefaults} sendToPivot={thisComponent.sendToPivot} />
				break;

				case 'dimension_advanced':
					return <DimensionAdvanced defaults={thisComponent.state.dialogDefaults} sendToPivot={thisComponent.sendToPivot} />
				break;

				//case 'cohort':
				//	return <CohortEditor defaults={thisComponent.state.dialogDefaults} sendToPivot={thisComponent.sendToPivot} />
				//break;

				case 'date':
					return <DatePicker dimension_id={thisComponent.state.dialogDefaults.dimension_id} filter={thisComponent.state.dialogDefaults.filter} />
				break;

				case 'filter_editor':
					return <FilterEditor defaults={thisComponent.state.dialogDefaults} onClose={thisComponent.closeDialog} />
				break;

			}

		})(this.state.dialog)}


	</aside>


		);
	}

});
