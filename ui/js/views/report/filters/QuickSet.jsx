var React = require('react');

var ReportFilterActions = require('../../../actions/ReportFilterActions');
var Serializer = require('../../../utils/Serializer');

module.exports = React.createClass({
	
	componentDidMount: function() {
		
		if (this.refs.dateRangePicker) {
			$(this.refs.dateRangePicker).leoDateRange(1, function() {	
				var dates = JSON.parse($(this).val());
				var filter = {"id":"d_date.date","comparison":"between","value":[dates.start, dates.end]};
				ReportFilterActions.updateReportFilter(filter);
				Serializer.updateWindowHash();
			});
		}
		
	},

	componentDidMount: function() {

		if (this.refs.dateRangePicker) {
			$(this.refs.dateRangePicker).leoDateRange(1, function() {	
				var dates = JSON.parse($(this).val());
				var filter = {"id":"d_date.date","comparison":"between","value":[dates.start, dates.end]};
				ReportFilterActions.updateReportFilter(filter);
				Serializer.updateWindowHash();
			});
		}

	},

	render: function() {

		return (
			this.props.quick_sets ?
			(
				<span className="pull-right">
								
					{/*<select>
						<option></option>
						{this.props.quick_sets.map(function(a,b) {
							return <option value={a}>{a}</option>
						})}
					</select>*/}
					
					
					<div className="leo-date-range leo-align-right">
						{/*<input ref="dateRangePicker" type="text" />*/}
						<div ref="dateRangePicker"></div>
					</div>
					
				</span>
			) :
			false
		);
	}

});
