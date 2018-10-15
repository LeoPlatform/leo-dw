var React = require('react');
var Graph = require('./graphs/graph.jsx');

module.exports = React.createClass({
  onClick: function() {
  	$(this).hide();
  	this.props.onHide();
  },
  render: function() {
  	var component = this;
  	
    return (
    	<div className="graphs" onClick={this.onClick}>
    		<Graph data={this.props.data} width="1050" height="500" charttype="StackedColumnChart"/>
		</div>
	);
  }
});
