var fixtures = {};


fixtures.simpledata = {
	columns: {
		1: {type: 'metric', label: 'Cost'},
		2: {type: 'metric', label: 'Taxes', format: 'money'}
	},
	rowheaders: [
		{type:"metrics", height: 34}
	],
	columnheaders: [
		{id: 1, type: 'metric', width: 100},
		{id: 2, type: 'metric', width: 100}	    
	],
	headers: [[
		{id: 1, width: 60},
		{id: 2, width: 45, last:true}
	]],
	rows: [
		[10.00,15.00],
		[10.00,-15],
		[-10,15]
	]
};
fixtures.multilineheaders = {
	columns: {
		1: {label: 'State'},
		2: {label: 'City'},
		3: {label: "Department"},
		5: {type: 'metric', label: 'Cost'},
		6: {type: 'metric', label: 'Taxes'}
	},
	rowheaders: [
		{id: 3, type:"dim", height: 32},
		{type:"metrics", height: 40}
	],
	columnheaders: [
  	   {id: 1, type:"dim", width: 150},
  	   {id: 2, type:"dim", width: 200},
  	   {id: 6, type: 'metric', width: 100},
  	   {id: 5, type: 'metric', width: 100}
  	],
	headers: [[
	   {id: 3, value: 'Computers', span: 2, last: true,spacer: true},
	   {id: 3, value: 'Apparel', span: 2, last: true,spacer: true}
	],[
	   {id: 6, span: 1, width: 60},
	   {id: 5, span: 1, last: true,spacer: true, width: 60},
	   {id: 6, span: 1, width: 60},
	   {id: 5, span: 1, last: true,spacer: true, width: 60},
	]],
	rows: [
	   ["Utah", "Ogden", 10.00,15.00,10.00,15.00],
	   ["Utah", "Salt Lake City",10.00,15.00,10.00,15.00]
	]
};

fixtures.factsonleft = {
	columns: {
		1: {label: 'State'},
		2: {label: 'City'},
		3: {label: "Department"},
		5: {type: 'metric', label: 'Count'},
		6: {type: 'metric', label: 'Taxes', format: "money"}
	},
	rowheaders: [
		{id: 3, type:"dim", height: 32},
		{id: 6, type: "metric", height: 24},
		{id: 5, type: "metric", height: 24}
	],
	columnheaders: [
	   {id: 1, type:"dim", width: 100},
	   {id: 2, type:"dim", width: 100},
	   {type:"metrics", width: 100}
	],
	headers: [[
   		{id: 3, value: "Computers", span: 1,last: true, width: 60},
   		{id: 3, value: "Apparel", span: 1,last: true, width: 60},
   	]],
   	rows:[
		["Utah", "Ogden", 6,10.00,15.00],
		["Utah", "Salt Lake City", 5,10.00,15.00]
   	]
};

fixtures.complexheaders = {
	columns: {
		1: {label: 'State'},
		2: {label: 'City'},
		3: {label: "Department"},
		4: {type: 'metric', label: 'Cost', format: "money"},
		5: {type: 'metric', label: 'Taxes', format: "money"},
		6: {label: "Year"},
	},
	rowheaders: [
	    {id: 3, type:"dim", height: 32},
	    {id: 6, type:"dim", height: 32},
 	    {type:"metrics", height: 52}
 	],
	columnheaders: [
		{id: 1, type:"dim", width: 100},
		{id: 2, type:"dim", width: 100},
		{id: 5, type: 'metric', width: 60},
	  	{id: 4, type: 'metric', width: 60}
	],
	headers: [[
		{id: 3, value:"Computers", span: 6,spacer: true},
		{id: 3, value:"Apparel",span: 6,spacer: true},
		{id: 3, value: "Books",span: 6,spacer: true},
		{id: 3, value:"Cell Phones", span: 6,spacer: true}
	],
	[
		{id: 6, value: "2014", span: 2},
		{id: 6, value: "2013", span: 2},
		{id: 6, value: "2012", span: 2, last: true,spacer: true},

		{id: 6, value: "2014", span: 2},
		{id: 6, value: "2013", span: 2},
		{id: 6, value: "2012", span: 2, last: true,spacer: true},

		{id: 6, value: "2014", span: 2},
		{id: 6, value: "2013", span: 2},
		{id: 6, value: "2012", span: 2, last: true,spacer: true},

		{id: 6, value: "2014", span: 2},
		{id: 6, value: "2013", span: 2},
		{id: 6, value: "2012", span: 2, last: true,spacer: true}
	],
	[
		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true, width: 60},
		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true, width: 60},
		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true,spacer: true, width: 60},

		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true, width: 60},
		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true, width: 60},
		{id: 5, span: 1, width: 120},
		{id: 4, span: 1, last: true,spacer: true, width: 60},

		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true, width: 60},
		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true, width: 60},
		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true,spacer: true, width: 60},

		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true, width: 60},
		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true, width: 60},
		{id: 5, span: 1, width: 60},
		{id: 4, span: 1, last: true,spacer: true, width: 60}
	]],
	rows: [
	  ["Utah", "Ogden",10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00],
	  ["Utah", "Salt Lake City",10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00],
	  ["Utah", "Provo",10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00],
	  ["Nevada", "Las Vegas",10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00],
	  ["Nevada", "Carson City",10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00,10.00,15.00]
	]
};
module.exports = fixtures;
