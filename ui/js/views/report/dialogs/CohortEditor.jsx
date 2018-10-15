var React = require('react');

var FieldPicker = require('../fieldPicker.jsx');
var Banding = require('../banding.jsx');

module.exports = React.createClass({

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired
	},


	quickSets: {
		today: 'Today',
		yesterday: 'Yesterday',
		'end of last month': 'End of Last Month'
	},


	getInitialState: function() {

		var band = '';
		var date = '';

		var defaults = this.props.defaults;

		if (defaults.cohort) {
			var dimension_id = defaults.cohort.split('|normalize')[0];
			dimension_id = dimension_id.slice(0, dimension_id.lastIndexOf('.'));
			var temp = defaults.cohort.split('|');
			var date_range = '.' + temp[0].split('.')[1];
			var params = temp[1].split(':');
			params.shift(); // 'normalize'
			var companion = params.shift();

			if (this.quickSets[companion] || !isNaN(Date.parse(companion))) {
				var date = companion;
				var companion = '';
			}

			var params = temp[2].split(':');
			if (params.shift() == 'band') {
				var band = params[0];
			}

		} else {
			var dimension_id = this.props.defaults.id;
			var date_range = '.id';
			var companion = '';
		}

		return {
			dimension_id: dimension_id,
			date_range: date_range,
			companion: companion,
			date: date,
			band: band
		}
	},


	componentDidMount: function() {
		$(this.refs.dialogBox).draggable({handle:'.uk-modal-header'});

		var thisComponent = this;

		$(this.refs.datePicker).datepicker({
			dateFormat: 'yy-mm-dd',
			onSelect: function(date) {
				thisComponent.refs.selectedDate.value = date;
				thisComponent.hideDateDropdown();
			}
		});

		$(this.refs.quickSets).menu();

		$(this.refs.quickSets).on('click', 'li', function() {
			thisComponent.refs.selectedDate.value = $(this).text().toLowerCase();
			thisComponent.hideDateDropdown();
		})

	},


	save: function() {

		String.prototype.capitalize = function(){
			return this.replace(/\b\w/g, function (m) {
				return m.toUpperCase();
			});
		};

		var form = this.refs.cohortForm;

		var errors = {};

		//check that required fields are completed
		$(form).find('input').each(function() {
			if (
				$(this).is(':visible')
				&& (
					($(this).is('input[type=text]') && $(this).val() == '')
					|| ($(this).is('input[type=radio]') && $(form).find('[name="'+$(this).prop('name')+'"]:checked').length == 0)
				)
				&& $(this).closest('.form-row').is('.req-parameter')
			) {
				errors[($(this).closest('.form-row').children('label').text().capitalize()+' is required')] = true;
			}
		})

		if (form.compare_to.value == '') {
			errors['Compare With is required'] = true;
		} else if (form.compare_to.value == 'dimension' && form.compare_to_dimension.value == '') {
			errors['Compare With Dimension is required'] = true;
		} else if (form.compare_to.value == 'date' && form.compare_to_date.value == '') {
			errors['Compare With Date is required'] = true;
		}

		errors = Object.keys(errors);

		if (errors.length > 0) {
			window.messageModal(errors.join('<br />'));
			return;
		}

		var column = this.refs.cohortDimension.value()+this.refs.cohortDateRange.value;
		if (this.refs.compareToDimension.checked) {
			var companion = this.refs.cohortCompanion.value();
		} else {
			var companion = this.refs.selectedDate.value;
		}
		var band = this.refs.cohortBanding.value();

		var type = 'dimension';
		var id = column + '|normalize:' + companion + (band ? '|band:'+band : '');

		if (this.props.defaults.editing) {
			if (id != this.props.defaults.cohort) {
				this.props.sendToPivot({
					where: this.props.defaults.editing,
					replace: this.props.defaults.cohort,
					type: type,
					id: id
				});
			}
		} else {
			this.props.sendToPivot({
				where: 'row', //column, actually
				type: type,
				id: id
			});
		}

		this.context.close_dialog();
	},


	showDateDropdown: function() {
		$(this.refs.dateDropdown).show();
		$(this.refs.dateDropdownMask).show();
		$(this.refs.compareToDate).prop('checked', true);
	},


	hideDateDropdown: function() {
		$(this.refs.dateDropdown).hide();
		$(this.refs.dateDropdownMask).hide();
	},


	selectDimension: function() {
		$(this.refs.compareToDimension).prop('checked', true);
	},


	render: function() {
		var thisComponent = this;

		var dateRanges = {
			Day: '.id',
			Week: '.id',
			Month: '.year_month',
			//Quarter: 'Quarter',
			Year: '.year',
		};

		return (

		<div ref="dialogBox" className="leo-dialog shift-right">
			<div className="uk-modal-dialog uk-text-left">

				<button className="uk-modal-close uk-close" onClick={this.context.close_dialog}></button>
				<div className="uk-modal-header">
					<h2 className="uk-h2">Normalized Cohorts</h2>
				</div>

				<form ref="cohortForm" className="theme-form wide-form">

					<div className="form-row req-parameter parameter-field">
						<label>Select Dimension</label>
						<FieldPicker ref="cohortDimension" type="input" field="date" value={this.state.dimension_id} />
					</div>

					<div className="form-row req-parameter parameter-field">
						<label>Normalized Date Range</label>
						<select ref="cohortDateRange" defaultValue={this.state.date_range}>
							{
								Object.keys(dateRanges).map(function(range , index) {
									return <option key={index} value={dateRanges[range]}>{range}</option>
								})
							}
						</select>
					</div>

					<div className="form-row req-parameter">
						<label>Compare With</label>
						<div>
							<div className="form-row">
								<label>Dimension</label>
								<input ref="compareToDimension" defaultChecked={this.state.companion} name="compare_to" type="radio" value="dimension" />
								<FieldPicker ref="cohortCompanion" type="input" field="date" value={this.state.companion} name="compare_to_dimension" onClick={this.selectDimension} />
							</div>

							<div className="form-row">
								<label>Date</label>
								<input ref="compareToDate" defaultChecked={this.state.date} name="compare_to" type="radio" value="date" />
								<input ref="selectedDate" defaultValue={this.state.date} name="compare_to_date" onFocus={this.showDateDropdown} onClick={this.showDateDropdown} />

								<div ref="dateDropdown" className="date-dropdown">
									<div>
										<div>
											<h5>Dynamic</h5>
											<ul ref="quickSets">
												<li>Today</li>
												<li>Yesterday</li>
												<li>End of Last Month</li>
											</ul>
										</div>
										<div>
											<h5>Static</h5>
											<div ref="datePicker" style={{verticalAlign:'top'}}></div>
										</div>
									</div>
								</div>
								<div ref="dateDropdownMask" onMouseDown={this.hideDateDropdown}></div>

							</div>

						</div>
					</div>

					<label>Advanced Options</label>

					<div className={"form-row"+(this.props.required == 'true' ? " req-parameter":'')}>
						<label>Banding</label>
						<Banding ref="cohortBanding" defaults={this.state.band} />
					</div>

					<div className="form-row">
						<label>Database Id</label>
						<input type="text" className="gray-out" readOnly="readonly" value={this.props.defaults.id} />
					</div>

				</form>

				<div className="uk-modal-footer">

					<div className="uk-text-right">
						<button type="button" className="uk-button uk-modal-close" onClick={this.context.close_dialog}>Close</button> &nbsp;
						<button type="button" className="theme-button-primary" onClick={this.save}>Apply</button>
					</div>

				</div>

			</div>

		</div>

		);
	}

});
