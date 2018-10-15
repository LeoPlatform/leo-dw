try { var moment = require("moment"); } catch(e) {}

(function($, window, undefined) {

	var uniqueId = 0; // used for unique ID generation within multiple plugin instances

	$.widget('leo.dateRangePicker', {
		version: '0.1',

		options: {
			dateFormat: 'yy-mm-dd', // displayed date format. Available formats: http://api.jqueryui.com/datepicker/#utility-formatDate
			altFormat: 'yy-mm-dd', // submitted date format - inside JSON {"start":"...","end":"..."}
			onChange: null, // callback that executes when the date range changes
			appendTo: 'body', // element to append the range picker to
			applyOnRangeSelect: true, //auto-apply when user selects range manually
			datepickerOptions: { // object containing datepicker options. See http://api.jqueryui.com/datepicker/#options
				numberOfMonths: 2,
				minDate: null,
				maxDate: null,
				showWeek: false,
				firstDay: 0
			}
		},

		_create: function() {
			this._dateRangePicker = buildDateRangePicker(this.element, this.options);
		},

		_destroy: function() {
			this._dateRangePicker.destroy();
		},

		_setOptions: function(options) {
			this._super(options);
			this._dateRangePicker.enforceOptions();
		},

		setRange: function(range) {
			this._dateRangePicker.setRange(range);
		},

		getRange: function() {
			return this._dateRangePicker.getRange();
		},

		clearRange: function() {
			this._dateRangePicker.clearRange();
		},

		widget: function() {
			return this._dateRangePicker.getContainer();
		}
	});

	/**
	 * factory for the multiple month date picker
	 *
	 * @param {String} classnameContext classname of the parent container
	 * @param {Object} options
	 */
	function buildCalendar(classnameContext, options, setRange) {
		var $self,
			range = {start: null, end: null}; // selected range

		function init() {
			$self = $('<div></div>', {'class': classnameContext + '-calendar ui-widget-content'});

			$self.datepicker($.extend({}, options.datepickerOptions, {beforeShowDay: beforeShowDay, onSelect: onSelectDay}));
			updateAtMidnight();
		}

		function enforceOptions() {
			$self.datepicker('option', $.extend({}, options.datepickerOptions, {beforeShowDay: beforeShowDay, onSelect: onSelectDay}));
		}

		// called when a day is selected
		function onSelectDay(dateText, instance) {
			var dateFormat = options.datepickerOptions.dateFormat || $.datepicker._defaults.dateFormat,
				selectedDate = $.datepicker.parseDate(dateFormat, dateText);

			if (!range.start || range.end) { // start not set, or both already set
				range.start = selectedDate;
				range.end = null;
			} else if (selectedDate < range.start) { // start set, but selected date is earlier
				range.end = range.start;
				range.start = selectedDate;
			} else {
				range.end = selectedDate;
			}

			if (options.datepickerOptions.hasOwnProperty('onSelect')) {
				options.datepickerOptions.onSelect(dateText, instance);
			}

			if (options.applyOnRangeSelect) {
				setRange(range);
			}
		}

		// called for each day in the datepicker before it is displayed
		function beforeShowDay(date) {
			var result = [
					true, // selectable
					range.start && ((+date === +range.start) || (range.end && range.start <= date && date <= range.end)) ? 'ui-state-highlight' : '' // class to be added
				],
				userResult = [true, ''];

			if (options.datepickerOptions.hasOwnProperty('beforeShowDay')) {
				userResult = options.datepickerOptions.beforeShowDay(date);
			}
			return [
					result[0] && userResult[0],
					result[1] + ' ' + userResult[1]
					];
		}

		function updateAtMidnight() {
			setTimeout(function() {
				refresh();
				updateAtMidnight();
			}, moment().endOf('day') - moment());
		}

		function scrollToRangeStart() {
			if (range.start) {
				$self.datepicker('setDate', range.start);
			}
		}

		function refresh(scroll) {
			$self.datepicker('refresh');
			if (scroll) {
				scrollToRangeStart();
			}
		}

		function reset() {
			range = {start: null, end: null};
			refresh();
		}

		init();
		return {
			getElement: function() { return $self; },
			scrollToRangeStart: function() { return scrollToRangeStart(); },
			getRange: function() { return range; },
			setRange: function(value, scroll) { range = value; refresh(scroll); },
			refresh: refresh,
			reset: reset,
			enforceOptions: enforceOptions
		};
	}

	/**
	 * factory for the widget
	 *
	 * @param {jQuery} $originalElement jQuery object containing the input form element used to instantiate this widget instance
	 * @param {Object} options
	 */
	function buildDateRangePicker($originalElement, options) {
		var classname = 'leo-daterangepicker',
			$container, // the dropdown
			calendar
		;

		function init() {
			calendar = buildCalendar(classname, options, setRange);
			render();
			reset();
		}

		function render() {
			$container = calendar.getElement();
			$(options.appendTo).append($container);
		}


		function destroy() {
			$container.remove();
			$originalElement.show();
		}

		// formats a date range as JSON
		function formatRange(range) {
			var dateFormat = options.altFormat,
				formattedRange = {};
			formattedRange.start = $.datepicker.formatDate(dateFormat, range.start);
			formattedRange.end = $.datepicker.formatDate(dateFormat, range.end);
			return JSON.stringify(formattedRange);
		}

		// parses a date range in JSON format
		function parseRange(text) {
			var dateFormat = options.altFormat,
				range = null;
			if (text) {
				try {
					range = JSON.parse(text, function(key, value) {
						return key ? $.datepicker.parseDate(dateFormat, value) : value;
					});
				} catch (e) {
				}
			}
			return range;
		}

		function reset() {
			var range = getRange();
			if (range) {
				calendar.setRange(range);
			} else {
				calendar.reset();
			}
		}

		function setRange(value) {
			var range = value || calendar.getRange();
			if (!range.start) {
				return;
			}
			value && calendar.setRange(range);
			$originalElement.val(formatRange(range)).change();
			if (options.onChange) {
				options.onChange();
			}
		}

		function getRange() {
			return parseRange($originalElement.val());
		}

		function clearRange() {
			calendar.reset();
			$originalElement.val('');
		}

		function killEvent(event) {
			event.preventDefault();
			event.stopPropagation();
		}

		function getContainer(){
			return $container;
		}

		function enforceOptions() {
			calendar.enforceOptions();
			var range = getRange();
		}

		init();
		return {
			destroy: destroy,
			setRange: setRange,
			getRange: getRange,
			clearRange: clearRange,
			reset: reset,
			enforceOptions: enforceOptions,
			getContainer: getContainer
		};
	}

})(jQuery, window);
