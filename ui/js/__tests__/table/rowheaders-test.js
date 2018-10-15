/** @jsx React.DOM */
require("chai").should();
jest.dontMock('../../table/rowheaders.jsx');
jest.dontMock('../../fixtures/table/simple.js');
var fixtures = require('../../fixtures/table/simple.js');
var $ = require('jquery');
var React;
var TestUtils;
var RowHeaders;
describe('Rows', function() {
	beforeEach(function() {
		React = require('react');
	    TestUtils = React.addons.TestUtils;
	    RowHeaders = require('../../table/rowheaders.jsx');
	});

  it('Should handle simple rows with no dimensions', function() {
    var rows = TestUtils.renderIntoDocument(
      <RowHeaders data={fixtures.simpledata}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
        <aside style={{width: 150}}>
        	<table>
        		<tbody>
        			<tr></tr>
        			<tr></tr>
        			<tr></tr>
        		</tbody>
        	</table>
		</aside>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });

  it('Should handle row dimensions', function() {
    var rows = TestUtils.renderIntoDocument(
      <RowHeaders data={fixtures.multilineheaders}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
    	<aside style={{width: 350}}>
        	<table>
        		<tbody>
        			<tr>
        				<td style={{width: 150}}><span>Utah</span></td>
        				<td style={{width: 200}}><span>Ogden</span></td>
        			</tr>
        			<tr>
        				<td><span>Utah</span></td>
        				<td><span>Salt Lake City</span></td>
        			</tr>
        		</tbody>
        	</table>
		</aside>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });

  it('Should handle facts on the left', function() {
    var rows = TestUtils.renderIntoDocument(
      <RowHeaders data={fixtures.factsonleft}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
   		<aside style={{width: 300}}>
        	<table>
        		<tbody>
        			<tr>
        				<td style={{width: 100}}><span>Utah</span></td>
        				<td style={{width: 100}}><span>Ogden</span></td>
        				<td style={{width: 100}}><span>Taxes</span></td>
        			</tr>
        			<tr>
        				<td><span>Utah</span></td>
        				<td><span>Salt Lake City</span></td>
        				<td><span>Count</span></td>
        			</tr>
        		</tbody>
        	</table>
		</aside>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });

});