var fixtures = {};



fixtures.simple = {
	columns: [
		{id: 1, type: 'metric', label: 'Count'},
		{id: 2, type: 'metric', label: 'Taxes', format: 'money'}
	],
	data: [
		[10.00,15.00]
	]
};

fixtures.multilineheaders = {
	columns: [
	  {id: 1, label: 'State'},
	  {id: 2, label: 'City'},
	  {id: 3, label: "Department"},
	  {id: 5, type: 'metric', label: 'Count'},
	  {id: 6, type: 'metric', label: 'Taxes', format: 'money'}
	],
	data: [
		["Utah", "Ogden", "Computers", 10.00,15.00],
		["Utah", "Ogden", "Apparel", 3.00,4.00],
	  ["Utah", "Salt Lake City","Computers", 5.00,6.00],
		["Utah", "Salt Lake City", "Apparel", 7.00,8.00]
	]
};



module.exports = fixtures;
