var data = require('../../js/stores/data.js')();
var data2 = require('../../js/stores/data.js')();

var FieldsAction = require('../../js/actions/field.js');

var DataSource = require('../../js/stores/data.js')();

describe("Store", function() {
	it("should do cool store stuff", function(done) {
		//    data2.on({'new_fields': (a,b) => {
		//      console.log("data2", data.getFields());
		//    }});
		//    data.on({
		//      'new_fields': (a,b=7) =>{
		//        console.log(a,b, data.getFields());
		//        data.off();
		//        data2.off();
		//        done();
		//      },
		//      new_fields2: (a) =>{
		//        console.log("howdy");
		//      }
		//    });
		//    
		//    FieldsAction.saveField({});
    
    
		//    FieldsAction.addGraph("#element", );
    
    
    
		var g = DataSource.watchGraph(graph1, (data)=>{
			console.log("repeating1", data);
		});
    
		//Check if duplicate but diffrent order filters work
		var g2 = DataSource.watchGraph(graph2, (data) =>{
			console.log("repeating2", data);
		}); 
    
    
		setTimeout(function() {
			g2.stop();  
			setTimeout(function() {
				g.stop();
				done();
			}, 1000);
		}, 200);
    
	});
});

var graph1 = {
	columns: [
		"d_date.year_month",
		"d_market.name"
	],
	refreshInterval: {minutes: 1},
	rows: [
		//This would show one graph per distinct row type...i.e if this was market, then there would be a line chart per country     
	],
	filters: [
		{
			"id":"d_date.year",
			"cmp":"between",
			values:['2010','2015']
		}
	],
	metrics: [{
		field: 'f_airbill.margin|sum',
		type: 'line',
		colors: {fields:["d_market.name"], colors: {
			"USA":"green",
			"Russia":"blue"
		},
		},
		yaxis: {
			opposite: true,
			format:  '{value}°C',
			style: {
				//  color: Highcharts.getOptions().colors[2]
			}
		},
		size: 'f_airbil.revenue|sum',
		tooltip: 'f_airbill.margin|percent',
		label: {fields:['f_airbill.margin|percent'],callback: function(field1, field2) {
			return `<test>${field1}</test>`;
		}}
	},{
		field: 'f_airbill.margin|avg',
		type: 'line',
		colors: {fields:["d_market.name"], colors: {
			"USA":"green",
			"Russia":"blue"
		},
		},
		filters: [
			{
				"id":"d_date.year",
				"cmp":"between",
				values:['2010','2015']
			},
			{
				"id":"d_date.something",
				"cmp":"between",
				values:['something else']
			},
        
		],
		yaxis: {
			opposite: true,
			format:  '{value}°C',
			style: {
				//  color: Highcharts.getOptions().colors[2]
			}
		},
		size: 'f_airbil.revenue|sum',
		tooltip: 'f_airbill.margin|avg|percent',
		label: {fields:['f_airbill.margin|avg|percent'],callback: function(field1, field2) {
			return `<test>${field1}</test>`;
		}}
	}]
};

var graph2 = {
	columns: [
		"d_date.year_month",
		"d_market.name"
	],
	refreshInterval: {milliseconds: 200},
	rows: [
		//This would show one graph per distinct row type...i.e if this was market, then there would be a line chart per country     
	],
	filters: [
		{
			"id":"d_date.something",
			"cmp":"between",
			values:['something else']
		}
	],
	metrics: [{
		field: 'f_airbill.margin|sum',
		type: 'bar',
		yaxis: {
			opposite: true,
			format:  '{value}°C',
			style: {
				// color: Highcharts.getOptions().colors[2]
			}
		},
		colors: ["d_date.year", "d_date.year_month"],
		size: 'f_airbil.revenue|sum',
		tooltip: {fields:['f_airbill.margin|percent'],callback: function(field1, field2) {
			return `<test>${field1}</test>`;
		}}
	},{
		field: 'f_airbill.margin|avg',
		type: 'line',
		colors: {fields:["d_market.name"], colors: {
			"USA":"green",
			"Russia":"blue"
		},
		},
		yaxis: {
			opposite: true,
			format:  '{value}°C',
			style: {
				//  color: Highcharts.getOptions().colors[2]
			}
		},
		size: 'f_airbil.revenue|sum',
		tooltip: 'f_airbill.margin|avg|percent',
		label: {fields:['f_airbill.margin|avg|percent'],callback: function(field1, field2) {
			return `<test>${field1}</test>`;
		}}
	},{
		field: 'f_airbill.margin|avg',
		type: 'line',
		colors: {fields:["d_market.name"], colors: {
			"USA":"green",
			"Russia":"blue"
		},
		},
		filters: [
			{
				"id":"d_date.year",
				"cmp":"between",
				values:['2010','2015']
			}
		],
		yaxis: {
			opposite: true,
			format:  '{value}°C',
			style: {
				//  color: Highcharts.getOptions().colors[2]
			}
		},
		size: 'f_airbil.revenue|sum',
		tooltip: 'f_airbill.margin|avg|percent',
		label: {fields:['f_airbill.margin|avg|percent'],callback: function(field1, field2) {
			return `<test>${field1}</test>`;
		}}
	}]
};
