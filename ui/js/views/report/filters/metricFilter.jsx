var React = require('react');

var IdUtils = require('../../../utils/IdUtils');

module.exports = React.createClass({
	
	getInitialState: function() {
		
		var column = IdUtils.parse(this.props.id);

		var filter = (column['filter'] || '');
		//var label = (column['label'] || '');
		
		return {
			column: column,
			filter: filter
		}
	},
	
	
	componentDidMount: function() {
		this.refs.filterBuilder.focus();
	},


	catchSpecialKeys: function(e) {
		switch(e.keyCode) {
			case 27: //esc
			case 9: //tab
				e.preventDefault();
				e.stopPropagation();
			break;
		}
	},
	
	  
	filterColumn: function() {
		this.props.saveMetricFilter(this.refs.filterBuilder.value);
	},
	
	
	handleKeyDown: function(e) {
		switch(e.keyCode) {
			case 27:
				this.props.closeChangeColumn();
			break;
		
			case 9:
				if ($(e.target).is('.metric_filter_text')) {
					$('.metric_filter_label').focus();
					e.preventDefault();
				} else if ($(e.target).is('.metric_filter_label')) {
					$('.metric_filter_text').focus();
					e.preventDefault();
				}
			break;
		
			case 13:
				this.filterColumn();
			break;
		}
	},

	
	render: function() {
		
		var thisComponent = this;
				
		return (<div className="popup-menu arrow-down-right" style={{bottom:this.props.position.bottom, right:this.props.position.right}}>
				
			<div className="mask" onClick={this.props.closePopup}></div>
			
			<div className="metric-filter">
			
				<div>
					<i className="icon-filter"></i>
					<span>Add Filter</span>
				</div>
				
				<div className="input">
					<input ref="filterBuilder" className="metric_filter_text" placeholder="Enter filter" defaultValue={this.state.filter} onKeyDown={this.handleKeyDown} />
					<i className="icon-ok-circled" onClick={this.filterColumn}></i>
				</div>
				
				
			</div>
			
		</div>)
	}
    
})
