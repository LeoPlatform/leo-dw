var React = require('react');

var ReportFilterActions = require('../../../actions/ReportFilterActions');
var Serializer = require('../../../utils/Serializer');

var parse_date = require('../../../../../lib/utils/parse_date.js').parse_date

module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func,
		close_dialog: React.PropTypes.func
	},

	periods: {
		days:     'Day',
		weeks:    'Week',
		months:   'Month',
		quarters: 'Quarter',
		years:    'Year'
	},

	toDates: {
		'-to-yesterday': 'to date of yesterday', //-to-yesterday
		'-to-date':      'to date of today',  //-to-date
		'period':        'to end of period', //
		' plus future':  'no end date' // plus future
	},

	quickSets: {
						'today': [ 0, 'days',   'period', true],
					'yesterday': [ 1, 'days',   'period', false],
				  'last 7 days': [ 7, 'days',   'period', false],
				 'last 30 days': [30, 'days',   'period', false],
					'Last week': [ 1, 'weeks',  'period', false], //duplicated below
				   'Last month': [ 1, 'months', 'period', false], //duplicated below
	  'This month-to-yesterday': [ 0, 'months', '-to-yesterday', true], //duplicated below

					'this week': [0, 'weeks', 	 'period',			true],
			'this week-to-date': [0, 'weeks', 	 '-to-date',		true],
	   'this week-to-yesterday': [0, 'weeks', 	 '-to-yesterday',	true],

				   'this month': [0, 'months',	 'period',			true],
		   'this month-to-date': [0, 'months',	 '-to-date',		true],
	  'this month-to-yesterday': [0, 'months',	 '-to-yesterday',	true],

				 'this quarter': [0, 'quarters', 'period',			true],
		 'this quarter-to-date': [0, 'quarters', '-to-date',		true],
	'this quarter-to-yesterday': [0, 'quarters', '-to-yesterday',	true],

					'this year': [0, 'years',	 'period',			true],
			'this year-to-date': [0, 'years',	 '-to-date',		true],
	   'this year-to-yesterday': [0, 'years',	 '-to-yesterday',	true],

					'last week': [1, 'weeks',	 'period',			false],
			'last week-to-date': [1, 'weeks',	 '-to-date',		false],
	   'last week-to-yesterday': [1, 'weeks',	 '-to-yesterday',	false],

				   'last month': [1, 'months',	 'period',			false],
		   'last month-to-date': [1, 'months',	 '-to-date',		false],
	  'last month-to-yesterday': [1, 'months',	 '-to-yesterday',	false],

				 'last quarter': [1, 'quarters', 'period',			false],
		 'last quarter-to-date': [1, 'quarters', '-to-date',		false],
	'last quarter-to-yesterday': [1, 'quarters', '-to-yesterday',	false],

					'last year': [1, 'years',	 'period',			false],
			'last year-to-date': [1, 'years',	 '-to-date',		false],
	   'last year-to-yesterday': [1, 'years',	 '-to-yesterday',	false]

	},


	getInitialState: function() {
		return {
			quickset: '',
			tab: 'dynamic-dates',
			number: 2,
			period: 'days',
			toDate: 'period', //'exclude',

			includeCurrent: false
		}
	},


	componentDidMount: function() {

		LeoKit.dialog($('#dialogContent'),
			{
				'Save Filter': this.updateFilter,
				close: this.close
			},
			'Date Range Filter',
		)

		$(this.refs.quickSets).menu();

	},


	componentWillUnmount: function() {
		var thisComponent = this;
		try {
			$(thisComponent.refs.dateRangePicker).daterangepicker('destroy');
		} catch(e) {}
		$('.comiseo-daterangepicker-mask').remove();
	},


	componentWillUpdate: function(nextProps, nextState) {
		var thisComponent = this;
		if ((nextState.tab != 'static-dates') && thisComponent.refs.dateRangePicker) {
			try {
				$(thisComponent.refs.dateRangePicker).daterangepicker('destroy');
			} catch(e) {}
			$('.comiseo-daterangepicker-mask').remove();
		}
	},


	componentDidUpdate: function(prevProps, prevState) {

		var thisComponent = this;

		if (this.props.filter && this.props.filter.value != prevProps.filter.value) {

			if (this.props.filter.value[0].indexOf('Last') == 0) {
				var parts = this.props.filter.value[0].split(/[ \+]/);
				this.setState({
					number: parts[1],
					period: parts[2],
					toDate: (!parts[4] ? 'period' : parts[4]),
					tab: 'dynamic-dates',
					includeCurrent:!!this.props.filter.value[0].match(/\+current/)
				});
			} else {
				this.setState({ tab: 'static-dates' })
			}
		}

		if (thisComponent.state.tab == 'static-dates' && thisComponent.refs.dateRangePicker) {

			var presetRanges = []

			for(var dateText in this.quickSets) {
				var dates = parse_date(dateText);
				presetRanges.push({
					text: dateText,
					dateStart: new Function('return moment("'+dates[0]+'", "YYYY-MM-DD")'),
					dateEnd: new Function('return moment("'+(dates[1] || dates[0])+'", "YYYY-MM-DD")'),
				});
			}

			$(thisComponent.refs.dateRangePicker).daterangepicker({
				dateFormat: 'yy-mm-dd',

				presetRanges: presetRanges,

				applyOnMenuSelect: true,
				applyButtonText: false,
				cancelButtonText: false,
				clearButtonText: false,
				inline: true, // do not close, position static
				applyOnRangeSelect: true,
				appendTo: $(thisComponent.refs.dateRangePicker).parent(),
				icon: false,

				useMonthTrigger: true,
				useWeekTrigger: true,

				datepickerOptions: {
					minDate: null,
					maxDate: null,
					weekHeader: 'week',
					showWeek: true,
					firstDay: 0,
				},

			}).daterangepicker("open");

			if (this.props.filter && this.props.filter.value && this.props.filter.value.length > 1) {
				var start = moment(this.props.filter.value[0], 'YYYY-MM-DD').toDate();
				var end = this.props.filter.value[1] ? moment(this.props.filter.value[1], 'YYYY-MM-DD').toDate() : start;
				$(thisComponent.refs.dateRangePicker).daterangepicker("setRange", {start: start, end: end});
			}

		}

	},


	changeNumber: function(e) {
		//if (e.target.value == 0 && this.state.toDate == 'exclude') {
	//		this.setState({ toDate: 'current-to-yesterday' });
		//}
		//if (e.target.value == 0 && this.state.period == 'days' && (this.state.toDate == 'exclude' || this.state.toDate == 'current-to-yesterday')) {
		//	this.setState({ toDate: 'current-to-date' });
		//}
		this.setState({ number: e.target.value });
	},


	changePeriod: function(period) {
		this.setState({ period:period });
	},


	changeToDate: function(toDate) {
		//if (this.state.number == 0 && (toDate == 'exclude' || (this.state.period == 'days' && toDate == 'current-to-yesterday'))) {
		//	this.setState({ number: 1 });
		//}
		this.setState({ toDate:toDate });
	},


	changeIncludeCurrent: function(e) {
		this.setState({ includeCurrent: e.target.checked });
	},


	switchTabs: function(e) {
		var tab = $(e.target).data('tab')
		if (tab) {
			this.setState({ tab: tab });
		}
	},


	updateFilter: function() {

		if (this.state.tab == 'dynamic-dates') {
			var filter = {
				"id":this.props.dimension_id,
				"comparison":"between",
				//"value":'Last ' + this.state.number + ' ' + this.state.period + (this.state.toDate == 'exclude' ? '' : ' plus ' + this.state.toDate)
				"value":'Last ' + this.state.number + ' ' + this.state.period + (this.state.includeCurrent ? '+current' : '')+(this.state.toDate == 'period' ? '' : this.state.toDate)
			};
		} else {
			var dates = JSON.parse($(this.refs.dateRangePicker).val());
			var filter = {
				"id":this.props.dimension_id,
				"comparison":"between",
				"value":[dates.start, dates.end]
			};
		}
		ReportFilterActions.updateReportFilter(filter);
		Serializer.updateWindowHash();
		this.close();
	},


	close: function() {
		if (this.props.type == 'inline') {
			$('.filter-select').hide();
			setTimeout(function() {
				$('.filter-select').css({display:''})
			}, 500);
		} else {
			this.context.close_dialog();
		}
	},


	doQuickSet: function(e) {
		var values = this.quickSets[e.target.innerText.toLowerCase()];
		if (values && values.length == 4) {
			this.setState({
				quickset: e.target.innerText.toLowerCase(),
				number: values[0],
				period: values[1],
				toDate: values[2],
				includeCurrent: values[3]
			});
		}
		//re-enable highlight
		$(e.target).mouseleave().mouseenter();
	},


	render: function() {

		var thisComponent = this;

		var format = 'MMM Do YYYY';
		var period = this.state.period;
		var number = this.state.number;
		var toDate = this.state.toDate;
		var current = (toDate == 'period') ? 1 : 0;

		var result = ('Last ' + this.state.number + ' ' + this.state.period + (this.state.includeCurrent ? '+current' : '')+(this.state.toDate == 'period' ? '' : this.state.toDate));

		//var dates = parse_date('Last '+number+' '+period+' plus '+toDate).join(' - ');

		var dates = parse_date(result).join(' - ');

		return (

			<div ref="dialogBox">
				<div id="dialogContent" style={{ minWidth: 900 }}>

					<div id="dateRangePicker" className="theme-tabs">

						<ul onClick={thisComponent.switchTabs}>
							<li className={this.state.tab=='dynamic-dates'?'active':''} data-tab="dynamic-dates">Dynamic Date Range</li>
							<li className={this.state.tab=='static-dates'?'active':''} data-tab="static-dates">Static Date Range</li>
						</ul>

						<div>
							<div className={this.state.tab=='dynamic-dates' ? 'active' : ''}>

								<div ref="daterangeResult" className="daterange-result ui-button ui-widget">{dates}</div>

								<div className="dynamic-dates clear-fix">

									<ul ref="quickSets" className="quick-sets" onClick={this.doQuickSet}>
										{Object.keys(this.quickSets).map(function(quick, key) {
											return <li key={key}>{quick}</li>
										})}
									</ul>

									<div className="theme-form">

										<div>

											<div>
												Last <input name={thisComponent.props.dimension_id+"-number"} className="numbers-box" type="number" step="1" min="0" value={number} onChange={thisComponent.changeNumber} />
											</div>

											<div className="periods-box">
												{Object.keys(this.periods).map(function(period, i) {
													return (<label key={i}>
														<input type="radio" name="period-selected" className={"period-selected-"+i} checked={thisComponent.state.period==period} onChange={thisComponent.changePeriod.bind(thisComponent, period)} />
														{thisComponent.periods[period]+(number==1?'':'s')}
													</label>)
												})}
											</div>

											<div className="to-date-box">

												{Object.keys(this.toDates).map(function(toDate, i) {
													return (<label key={i}>
														<input type="radio" name="to-date-selected" checked={thisComponent.state.toDate==toDate} onChange={thisComponent.changeToDate.bind(thisComponent, toDate)} />
														{thisComponent.toDates[toDate]}
													</label>)
												})}
											</div>

										</div>

										<div>
											<label> <input type="checkbox" checked={thisComponent.state.includeCurrent} onChange={this.changeIncludeCurrent} /> Include Current </label>
										</div>

										<div> &nbsp; </div>

									</div>

								</div>
							</div>
							<div className={this.state.tab=='static-dates'?'active':''}>
								<input ref="dateRangePicker" defaultValue={this.props.filter ? JSON.stringify(this.props.filter.value) : ''} />
							</div>
						</div>
					</div>

				</div>
			</div>

		);
	}

});
