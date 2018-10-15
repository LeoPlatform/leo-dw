/** @jsx React.DOM */
require("chai").should();
jest.dontMock('../../table/headers.jsx');

jest.dontMock('../../fixtures/table/simple.js');
var fixtures = require('../../fixtures/table/simple.js');

var $ = require('jquery');
var React;
var TestUtils;
var Headers;
describe('Headers', function() {

	beforeEach(function() {
		React = require('react');
	    TestUtils = React.addons.TestUtils;
	    Headers = require('../../table/headers.jsx');
	});
	it('Should work with no dimensions', function() {
	    var headers = TestUtils.renderIntoDocument(
	      <Headers data={fixtures.simpledata}/>
	    );

	    var expectedOutput = TestUtils.renderIntoDocument(
		    <header style={{marginLeft: 150}}>
				<div className="tableheader" style={{width: 105}}>
					<div className="row level0"  style={{height: 58}} >
						<span style={{width: 60}}>Cost</span>
						<span className="last" style={{width: 45}}>Taxes</span>
					</div>
				</div>
			</header>).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

	    headers.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
	  });
  it('Should display simple headers', function() {
    var headers = TestUtils.renderIntoDocument(
      <Headers data={fixtures.multilineheaders}/>
    );

    var expectedOutput = TestUtils.renderIntoDocument(
	    <header style={{marginLeft: 350}}>
			<div className="tableheader" style={{width: 245}}>
				<div className="row level1" style={{height: 32}}>
					<span className="last" colSpan="2" style={{width: 120}}>Computers</span>
					<span className="spacer" />
					<span className="last" colSpan="2" style={{width: 120}}>Apparel</span>
				</div>
				<div className="row level0" style={{height: 64}}>
					<span style={{width: 60}}>Taxes</span>
					<span className="last" style={{width: 60}}>Cost</span>
					<span className="spacer" />
					<span style={{width: 60}}>Taxes</span>
					<span className="last" style={{width: 60}}>Cost</span>
				</div>
			</div>
		</header>).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');

    headers.getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });
  it('Should display complex headers', function() {
	    var trs = $(TestUtils.renderIntoDocument(
	      <Headers data={fixtures.complexheaders}/>
	    ).getDOMNode()).find("div.row");


	    var expectedOutput = TestUtils.renderIntoDocument(
			<div className="row level2" style={{height: 32}}>
				<span colSpan="6" style={{width: 360}}>Computers</span>
				<span className="spacer"></span>
				<span colSpan="6" style={{width: 420}}>Apparel</span>
				<span className="spacer"></span>
				<span colSpan="6" style={{width: 360}}>Books</span>
				<span className="spacer"></span>
				<span colSpan="6" style={{width: 360}}>Cell Phones</span>
		    </div>
	    ).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
	    trs[0].outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);



	    expectedOutput = TestUtils.renderIntoDocument(
		    <div className="row level1" style={{height: 32}}>
				<span colSpan="2" style={{width: 120}}>2014</span>
				<span colSpan="2" style={{width: 120}}>2013</span>
				<span className="last" colSpan="2" style={{width: 120}}>2012</span>
				<span className="spacer"></span>
				<span colSpan="2" style={{width: 120}}>2014</span>
				<span colSpan="2" style={{width: 120}}>2013</span>
				<span className="last" colSpan="2" style={{width: 180}}>2012</span>
				<span className="spacer"></span>
				<span colSpan="2" style={{width: 120}}>2014</span>
				<span colSpan="2" style={{width: 120}}>2013</span>
				<span className="last" colSpan="2" style={{width: 120}}>2012</span>
				<span className="spacer"></span>
				<span colSpan="2" style={{width: 120}}>2014</span>
				<span colSpan="2" style={{width: 120}}>2013</span>
				<span className="last" colSpan="2" style={{width: 120}}>2012</span>
		    </div>
		).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
	    trs[1].outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);

	    expectedOutput = TestUtils.renderIntoDocument(
			<div className="row level0"  style={{height: 76}}>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span className="spacer"></span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span style={{width: 120}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span className="spacer"></span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span className="spacer"></span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
				<span style={{width: 60}}>Taxes</span>
				<span className="last" style={{width: 60}}>Cost</span>
			</div>
		).getDOMNode().outerHTML.replace(/ data-reactid="[^"]*"/g,'');
	    trs[2].outerHTML.replace(/ data-reactid="[^"]*"/g,'').should.eql(expectedOutput);
  });

});