/** @jsx React.DOM */
require("chai").should();
jest.dontMock('../../table/reportRows.jsx');
jest.dontMock('../../table/reportColumns.jsx');
jest.dontMock('../../fixtures/table/simple.js');
var fixtures = require('../../fixtures/table/simple.js');
var $ = require('jquery');
var React;
var TestUtils;
var HeadingRows;
var HeadingColumns;
describe('Headings-Columns', function() {
	beforeEach(function() {
		React = require('react');
	    TestUtils = React.addons.TestUtils;
	    HeadingColumns = require('../../table/reportColumns.jsx');
	});

  it('Should work with no dimensions', function() {
    var rows = TestUtils.renderIntoDocument(
      <HeadingColumns data={fixtures.simpledata}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
   		<ul className="heading columnheading">
   			<li draggable="true" data-sort="0" className="metrics" style={{marginLeft: 150}}>
   				<ul>
   				<li style={{width:100}}>Cost</li>
   				<li style={{width:100}}>Taxes</li>
   				</ul>
   			</li>
   		</ul>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });
  
  it('Should with simple rows', function() {
    var rows = TestUtils.renderIntoDocument(
      <HeadingColumns data={fixtures.multilineheaders}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
   		<ul className="heading columnheading">
   			<li data-sort="0" data-id="1" draggable="true" style={{width:150}}>State</li>
   			<li data-sort="1" data-id="2" draggable="true" style={{width:200}}>City</li>
   			<li draggable="true" data-sort="2" className="metrics">
				<ul>
					<li style={{width:100}}>Taxes</li>
					<li style={{width:100}}>Cost</li>
				</ul>
			</li>
   		</ul>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });  
  
  it('Should work with fact columns on left', function() {
    var rows = TestUtils.renderIntoDocument(
      <HeadingColumns data={fixtures.factsonleft}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
   		<ul className="heading columnheading">
   			<li data-sort="0" data-id="1" draggable="true" style={{width:100}}>State</li>
   			<li data-sort="1" data-id="2" draggable="true" style={{width:100}}>City</li>
   			<li data-sort="2" className="metrics" style={{width:100}}></li>
   		</ul>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });
});



describe('Headings-Rows', function() {
	beforeEach(function() {
		React = require('react');
	    TestUtils = React.addons.TestUtils;
	    HeadingRows = require('../../table/reportRows.js');
	});

  it('Should work with no dimensions', function() {
    var columns = TestUtils.renderIntoDocument(
      <HeadingRows data={fixtures.simpledata}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
   		<ul className="heading rowheading">
   			<li data-sort="0" className="metrics" style={{height: 58}}></li>
   		</ul>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    columns.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });
  
  it('Should work with simple rows', function() {
    var rows = TestUtils.renderIntoDocument(
      <HeadingRows data={fixtures.multilineheaders}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
   		<ul className="heading rowheading">
   			<li data-sort="0" data-id="3" draggable="true" style={{height:32}}>Department</li>
   			<li data-sort="1" className="metrics" style={{height: 64}}></li>
   		</ul>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });  
  
  it('Should work with fact columns on left', function() {
    var rows = TestUtils.renderIntoDocument(
      <HeadingRows data={fixtures.factsonleft}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
   		<ul className="heading rowheading">
   			<li data-sort="0" data-id="3" draggable="true" style={{height:56}}>Department</li>
   			<li draggable="true" data-sort="1" className="metrics">
			<ul>
				<li style={{height:24}}>Taxes</li>
				<li style={{height:24}}>Count</li>
			</ul>
		</li>
   		</ul>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });
  
});