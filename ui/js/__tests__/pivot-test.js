/** @jsx React.DOM */
require("chai").should();
jest.dontMock('../pivot.js');
jest.dontMock('util');
jest.dontMock('../fixtures/pivot.js');
var fixtures = require('../fixtures/pivot.js');
var util = require('util');
var pivot = require('../pivot.js');

describe('Simple Pivot', function() {
  it('Should handle no dimensions with no pivot', function() {
  	var result = pivot.transform([],[1,2],fixtures.simple);
  	result.should.eql({
  		columns: {
  			1: {id:1, type: 'metric', label: 'Count'},
  			2: {id:2, type: 'metric', label: 'Taxes', format: 'money'}
  		},
  		rowheaders: [
  		  {type:"metrics", height: 38}
  		],
  		columnheaders: [
				{id: 1, width: 60, type: 'metric'},
				{id: 2, width: 60, type: 'metric'}              
  		],
  		headers: [[
				{id: 1, span: 1, width: 60, type: 'metric'},
				{id: 2, span: 1, width: 60, type: 'metric', last:true}          
  		]],
  		rows: [
	   		[10.00,15.00]          
	   	]
  	});
  });
  it('Should handle no dimensions with fact pivot', function() {
  	var result = pivot.transform([1,2],[],fixtures.simple);
  	result.should.eql({
  		columns: {
  			1: {id:1, type: 'metric', label: 'Count'},
  			2: {id:2, type: 'metric', label: 'Taxes', format: 'money'}
  		},
  		rowheaders: [
				{id: 1, height: 38, type: 'metric'},
				{id: 2, height: 38, type: 'metric'} 
			],
  		columnheaders: [
  		  {type:"metrics", width: 150}
  		],
  		headers: [[
				{value: '', last: true}          
  		]],
  		rows: [
	   		[1, 10.00],
	   		[2, 15.00],
	   	]
  	});
  });
  it('Should handle column dimensions with no fact pivot', function() {
  	var result = pivot.transform([],[1,2,3,5,6],fixtures.multilineheaders);
  	result.should.eql({
  		columns: {
  			1: {id:1, label: 'State'},
  			2: {id:2, label: 'City'},
  			3: {id:3, label: 'Department'},
  			5: {id:5, type: 'metric', label: 'Count'},
  			6: {id:6, type: 'metric', label: 'Taxes', format: 'money'}
  		},
  		rowheaders: [
  		  {type:"metrics", height: 38}
			],       
  		columnheaders: [
        {id: 1, width: 120},
        {id: 2, width: 120},
  		  {id: 3, width: 120},
				{id: 5, width: 60, type: 'metric'},
				{id: 6, width: 60, type: 'metric'} 
			],
  		headers: [[
				{id: 5, span: 1, width: 60, type: 'metric'},
				{id: 6, span: 1, width: 60, type: 'metric', last:true}    
  		]],
  		rows: [
  		  ["Utah", "Ogden", "Apparel", 3,4],
	   		["Utah", "Ogden", "Computers", 10.00,15.00],
	  		["Utah", "Salt Lake City", "Apparel", 7.00,8.00],
	  	  ["Utah", "Salt Lake City","Computers", 5.00,6.00]
	   	]
  	});
  });
  it('Should handle column dimensions with dimension pivot', function() {
  	var result = pivot.transform([3],[1,2,6,5],fixtures.multilineheaders);
  	result.should.eql({
  		columns: {
  			1: {id:1, label: 'State'},
  			2: {id:2, label: 'City'},
  			3: {id:3, label: 'Department'},
  			5: {id:5, type: 'metric', label: 'Count'},
  			6: {id:6, type: 'metric', label: 'Taxes', format: 'money'}
  		},
  		rowheaders: [
  		  {id: 3, height: 38},
  		  {type:"metrics", height: 38}
			],       
  		columnheaders: [
        {id: 1, width: 120},
        {id: 2, width: 120},
				{id: 6, width: 60, type: 'metric'},
				{id: 5, width: 60, type: 'metric'} 
			],
  		headers: [[
				{id: 3, value: 'Apparel', span: 2, width:120, last:true},
				{id: 3, value: 'Computers', span: 2, width:120, last:true}         
  		],[
				{id: 6, span: 1,type: 'metric',width:60},
				{id: 5, span: 1,type: 'metric',width:60, last:true},
				{id: 6, span: 1,type: 'metric',width:60},
				{id: 5, span: 1,type: 'metric',width:60, last:true}
  		]],
  		rows: [
	   		["Utah", "Ogden", 4,3, 15.00,10.00],
	  	  ["Utah", "Salt Lake City",8,7,6,5]
	   	]
  	});
  	
  	
  	var result = pivot.transform([3,2,1],[6,5],fixtures.multilineheaders);
  	result.headers.should.eql([[
			{id: 3, value: 'Apparel', width: 240, span: 4, last:true},
			{id: 3, value: 'Computers', width: 240, span: 4, last:true}         
		],[
			{id: 2, value: 'Ogden', width: 120, span: 2},
			{id: 2, value: 'Salt Lake City', width: 120, span: 2, last:true},         
			{id: 2, value: 'Ogden', width: 120, span: 2},
			{id: 2, value: 'Salt Lake City', width: 120, span: 2, last:true}
		],[
			{id: 1, value: 'Utah', width: 120, span: 2, last:true},
			{id: 1, value: 'Utah', width: 120, span: 2, last:true},
			{id: 1, value: 'Utah', width: 120, span: 2, last:true},
			{id: 1, value: 'Utah', width: 120, span: 2, last:true}
		],[
			{id: 6, span: 1,type: 'metric', width: 60},
			{id: 5, span: 1,type: 'metric', width: 60, last:true},
			{id: 6, span: 1,type: 'metric', width: 60},
			{id: 5, span: 1,type: 'metric', width: 60, last:true},
			{id: 6, span: 1,type: 'metric', width: 60},
			{id: 5, span: 1,type: 'metric', width: 60, last:true},
			{id: 6, span: 1,type: 'metric', width: 60},
			{id: 5, span: 1,type: 'metric', width: 60, last:true}
		]]);
  	result.rows.should.eql([
   		[4,3, 8,7,15.00,10.00,6,5]
   	]);
  });
  it('Should handle facts on the left not on the top', function() {
  	var result = pivot.transform([3,6,5],[1,2],fixtures.multilineheaders);
  	result.should.eql({
  		columns: {
  			1: {id:1, label: 'State'},
  			2: {id:2, label: 'City'},
  			3: {id:3, label: 'Department'},
  			5: {id:5, type: 'metric', label: 'Count'},
  			6: {id:6, type: 'metric', label: 'Taxes',format: 'money'}
  		},
  		rowheaders: [
	      {id: 3, height: 38},
  		  {id: 6, type: 'metric', height: 38},
				{id: 5, type: 'metric', height: 38} 
			],       
  		columnheaders: [
  		  {id: 1, width: 120},
  		  {id: 2, width: 120},        
        {type:"metrics", width: 120}				
			],
  		headers: [[
				{id: 3, value: 'Apparel', span: 1, width: 60, last:true},
				{id: 3, value: 'Computers', span: 1, width: 60, last:true}         
  		]],
  		rows: [
	   		["Utah", "Ogden", 6, 4, 15],
	   		["Utah", "Ogden", 5, 3, 10],
	  	  ["Utah", "Salt Lake City",6, 8,6],
	   		["Utah", "Salt Lake City",5, 7,5]
	   	]
  	});
  	
  	
  	
  	var result = pivot.transform([1,2,6,5],[3],fixtures.multilineheaders);
  	result.should.eql({
  		columns: {
  			1: {id:1, label: 'State'},
  			2: {id:2, label: 'City'},
  			3: {id:3, label: 'Department'},
  			5: {id:5, type: 'metric', label: 'Count'},
  			6: {id:6, type: 'metric', label: 'Taxes', format: 'money'}
  		},
  		rowheaders: [
	      {id: 1, height: 38},
	      {id: 2, height: 38},
  		  {id: 6, type: 'metric', height: 38},
				{id: 5, type: 'metric', height: 38} 
			],       
  		columnheaders: [
  		  {id: 3, width: 150},
        {type:"metrics", width: 120}				
			],
  		headers: [[
				{id: 1, value: 'Utah', span: 2, width: 120, last:true},
			],[
			  {id: 2, value: 'Ogden', span: 1, width: 60},
				{id: 2, value: 'Salt Lake City', span: 1, width: 60, last:true}         
  		]],
  		rows: [
	   		["Apparel", 6, 4, 8],
	   		["Apparel", 5, 3, 7],
	   		["Computers", 6, 15, 6],
	   		["Computers", 5, 10, 5]
	   	]
  	});
  });
});