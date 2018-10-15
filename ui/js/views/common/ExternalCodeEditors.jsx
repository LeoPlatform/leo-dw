var React = require('react');

module.exports = React.createClass({

	render: function() {

		return (<div className="code-editors" style={this.props.style || { float: 'left', margin:'-.7em 0px 0px' }}>
			<form method="post" action="//jsfiddle.net/api/post/jquery/2.1.4/dependencies/ui/" target="_blank" style={{margin:'10px',display:'inline-block'}}>
				<div style={{display:'none'}}>
					<input name="wrap" value="l" readOnly="readOnly" />
					<textarea name="resources" readOnly="readOnly" value={[
						"//s3-us-west-2.amazonaws.com/cdnleo/leo-oem"+window.liveVersion+"css",
						//"//ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js",
						//"//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js",
						"//s3-us-west-2.amazonaws.com/cdnleo/leo-oem"+window.liveVersion+"js"
					].map(function(r) {	return r+','; })}></textarea>
					<textarea name="js" readOnly="readOnly" value={
						"window.apiEndpoint='"+window.apiEndpoint+"';\n"
						+ "window.apiKey='"+window.apiKey+"';\n"
						+ "window.leodashboardurl='./';\n"
					}></textarea>
					<textarea name="html" readOnly="readOnly" value={this.props.code}></textarea>
				</div>
				<button id="submit-to-jsfiddle" className="theme-button" type="submit">Load in JSFiddle</button>
			</form>

			<form method="post" action="//codepen.io/pen/define" target="_blank" style={{margin:'10px',display:'inline-block'}}>
				<div style={{display:'none'}}>
					<textarea name="data" readOnly="readOnly" value={
						JSON.stringify({
							html: this.props.code,
							editors: "101",
							js: "window.apiEndpoint='"+window.apiEndpoint+"';\n"
								+ "window.apiKey='"+window.apiKey+"';\n"
								+ "window.leodashboardurl='./';\n",
							css_external: "//s3-us-west-2.amazonaws.com/cdnleo/leo-oem"+window.liveVersion+"css;",
							js_external: "//ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js;"
								+ "//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js;"
								+ "//s3-us-west-2.amazonaws.com/cdnleo/leo-oem"+window.liveVersion+"js"
						})
					}></textarea>
				</div>
				<button id="submit-to-codepen" className="theme-button" type="submit">Load in CodePen</button>
			</form>
		</div>)
	}

});
