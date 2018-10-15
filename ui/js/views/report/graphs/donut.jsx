var React = require('react');

module.exports = React.createClass({
  componentDidMount: function() {
  	this.redraw();
  },
  componentDidUpdate: function() {
  	this.redraw();
  },
  redraw: function() {
  	var component = this;
 	if(!this.props.data || this.props.data.rows.length == 0) {
  		return;
  	}
  	var columnMap = {};
  	for(var i = 0; i < this.props.data.columnheaders.length; i++) {
  		columnMap[this.props.data.columnheaders[i].id] = i;
  	}

  	var series = [];
  	for(var i = 0; i < this.props.options.series.length; i++) {
  		var set = this.props.options.series[j];
  		var data = [];
  		series[i] = {
  			name: this.props.data.columns[set].label,
            data: data,
            size: i==0?'60%':'80%',
            dataLabels: {
                formatter: function () {
                    return this.y > 5 ? this.point.name : null;
                },
                color: 'white',
                distance: -30
            }
  		};

  		for(var x = 0; x < this.props.data.rows.length; x++) {
  			var row = this.props.data.rows[x];


  		}
  	}

  	var series = [];
  	for(var i = 0; i < this.props.data.rows.length; i++) {
  		var row = this.props.data.rows[i];
  		for(var j = 0; j < this.props.options.series.length; j++) {

  			if(set == "metrics") {
  				for(var x = 0; x < this.props.options.metrics.length; x++) {
  					var metric = this.props.options.metrics[x];
  				}
  			}
  		}
  	}
  	return;
  	for(var i = 0; i < series.length; i++)  {
  		var series
  		var grouping = {};
  		if(series.length == 3) {
  			versionsData.push({
                name: data[i].drilldown.categories[j],
                y: data[i].drilldown.data[j],
                color: Highcharts.Color(data[i].color).brighten(brightness).get()
            });
  		}

  	}


    $(this).highcharts({
        chart: {
            type: 'pie'
        },
        title: {
            text: 'Test'
        },
        series: series
	 });
  },
  render: function() {
    return (<div style={{float: 'left', width: this.props.width, height: this.props.height}}>Pretty Graph</div>);
  }
});
