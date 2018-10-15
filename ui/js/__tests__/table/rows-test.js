/** @jsx React.DOM */
require("chai").should();
jest.dontMock('../../table/rows.jsx');
jest.dontMock('../../fixtures/table/simple.js');
var fixtures = require('../../fixtures/table/simple.js');
var $ = require('jquery');
var React;
var TestUtils;
var Rows;
describe('Rows', function() {
	beforeEach(function() {
		React = require('react');
	    TestUtils = React.addons.TestUtils;
	    Rows = require('../../table/rows.jsx');
	});

  it('Should handle simple rows with no dimensions', function() {

    var rows = TestUtils.renderIntoDocument(
      <Rows data={fixtures.simpledata}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
        <section id="maintable" style={{marginLeft: 150, height: 386}}>
	    	<div className="scroll yscroll">
				<span></span>
			</div>
			<div className="scroll xscroll">
				<span></span>
			</div>
	    	<div className="tablewrapper">
				<table style={{width: 105}}>
					<tbody>
						<tr>
							<td style={{width: 60}}>10</td>
							<td className="last" style={{width: 45}}>$15.00</td>
						</tr>
						<tr>
							<td style={{width: 60}}>10</td>
							<td className="last" style={{width: 45}}>($15.00)</td>
						</tr>
						<tr>
							<td style={{width: 60}}>-10</td>
							<td className="last" style={{width: 45}}>$15.00</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });

  it('Should handle spacers and multi line headers', function() {
    var rows = TestUtils.renderIntoDocument(
      <Rows data={fixtures.multilineheaders}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
    	<section id="maintable" style={{marginLeft: 350, height: 386}}>
	    	<div className="scroll yscroll">
				<span></span>
			</div>
			<div className="scroll xscroll">
				<span></span>
			</div>
	    	<div className="tablewrapper">
				<table style={{width: 245}}>
					<tbody>
						<tr>
							<td style={{width: 60}}>10</td>
							<td className="last" style={{width: 60}}>15</td>
							<td className="spacer"></td>
							<td style={{width: 60}}>10</td>
							<td className="last" style={{width: 60}}>15</td>
						</tr>
						<tr>
							<td style={{width: 60}}>10</td>
							<td className="last" style={{width: 60}}>15</td>
							<td className="spacer"></td>
							<td style={{width: 60}}>10</td>
							<td className="last" style={{width: 60}}>15</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });
  
  it('Should handle facts on the left', function() {
    var rows = TestUtils.renderIntoDocument(
      <Rows data={fixtures.factsonleft}/>
    );
    var expectedOutput = TestUtils.renderIntoDocument(
    	<section id="maintable" style={{marginLeft: 300, height: 386}}>
	    	<div className="scroll yscroll">
				<span></span>
			</div>
			<div className="scroll xscroll">
				<span></span>
			</div>
	    	<div className="tablewrapper">
				<table style={{width: 120}}>
					<tbody>
						<tr>
							<td className="last" style={{width: 60}}>$10.00</td>
							<td className="last" style={{width: 60}}>$15.00</td>
						</tr>
						<tr>
							<td className="last" style={{width: 60}}>10</td>
							<td className="last" style={{width: 60}}>15</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>
	).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    rows.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });

});