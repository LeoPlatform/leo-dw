/** @jsx React.DOM */
require("chai").should();
jest.dontMock('../../table/filters.jsx');
jest.dontMock('../../fixtures/table/simple.js');
var fixtures = require('../../fixtures/table/simple.js');
var $ = require('jquery');
var React;
var TestUtils;
var Filters;
describe('Filters', function() {
	beforeEach(function() {
		React = require('react');
	    TestUtils = React.addons.TestUtils;
	    Filters = require('../../table/filters.jsx');
	});

  it('Should handle filter addition', function() {
    var filters = TestUtils.renderIntoDocument(
      <Filters columns={fixtures.multilineheaders.columns}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
      <ul className="filters"></ul>
  	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
    filters.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
    
    var filters = TestUtils.renderIntoDocument(
      <Filters columns={fixtures.multilineheaders.columns}/>
    );
    filters.addFilter({id: 1});
    var expectedOutput = TestUtils.renderIntoDocument(
      <ul className="filters">
      	<li>State<input type="text" name="value"/></li>
      </ul>
  	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
    filters.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
    
    
    var filters = TestUtils.renderIntoDocument(
      <Filters columns={fixtures.multilineheaders.columns}/>
    );
    filters.addFilter({id: 1, value: 'test'});
    filters.addFilter({id: 3, value: 'who'});
    filters.addFilter({id: 2, range:true, start: '100', end: '200'});
    var expectedOutput = TestUtils.renderIntoDocument(
      <ul className="filters">
      	<li>State<input type="text" name="value" value="test" /></li>
      	<li>Department<input type="text" name="value" value="who" /></li>
      	<li>City<input type="text" name="start" value="100" /> to <input type="text" name="end" value="200" /></li>
      </ul>
  	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
    filters.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });
  
  it('Should handle filter removal', function() {
    var filters = TestUtils.renderIntoDocument(
      <Filters columns={fixtures.multilineheaders.columns}/>
    );
    filters.addFilter({id: 1, value: 'test'});
    filters.addFilter({id: 3, value: 'who'});
    filters.addFilter({id: 2, range:true, start: '100', end: '200'});
    
    
    filters.removeFilter(3);
    var expectedOutput = TestUtils.renderIntoDocument(
      <ul className="filters">
      	<li>State<input type="text" name="value" value="test" /></li>
      	<li>City<input type="text" name="start" value="100" /> to <input type="text" name="end" value="200" /></li>
      </ul>
  	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
    filters.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
    
    
    filters.removeFilter(2);
    var expectedOutput = TestUtils.renderIntoDocument(
      <ul className="filters">
      	<li>State<input type="text" name="value" value="test" /></li>
      </ul>
  	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
    filters.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });
  
  
  it('Should notify of changes to filters', function() {
  	var changedStack = {};
  	function changed(columnId, value) {
  		changedStack[columnId] = value;
  	}
    var filters = TestUtils.renderIntoDocument(
      <Filters columns={fixtures.multilineheaders.columns} change={changed}/>
    );
    filters.addFilter({id: 1, value: 'test'});
    filters.addFilter({id: 3, value: 'who'});
    filters.addFilter({id: 2, range:true, start: '100', end: '200'});
    
  });  
});