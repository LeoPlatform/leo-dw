var React = require('react');

var ExternalCodeEditors = require('../common/ExternalCodeEditors.jsx')
var CopyToClipboard = require('../common/copyToClipboard.jsx')


module.exports = React.createClass({

	codeMirrorJSONOptions: {
		mode:  { name: "javascript", json: true },
		lineWrapping: true,
		lineNumbers: true,
		indentWithTabs: true,
		matchBrackets: true,
		autoCloseBrackets: true,
		theme: 'eclipse',
		gutters: ["CodeMirror-lint-markers"],
		lint: true,
		//autofocus: true
	},

	componentDidMount: function() {
		var thisComponent = this

		LeoKit.modal($('.dialogContent'),
			{
				Save: function(data) {
					try {
						data = JSON.parse(data['code-editor'])
					} catch(e) {
						LeoKit.alert(e)
						return false;
					}
					thisComponent.props.rawCode(data)
				},
				cancel: false
			},
			'Edit Code',
			thisComponent.onClose
		)

		var textArea = $('textarea.code-editor').get(0)

		this.codeMirrorInstance = CodeMirror.fromTextArea(textArea, this.codeMirrorJSONOptions);
		this.codeMirrorInstance.on('change', function() {
			thisComponent.codeMirrorInstance.save();
		})

	},


	onClose: function() {
		this.props.onClose && this.props.onClose()
	},


	render: function() {

		var rawCode = this.props.rawCode()
		if (typeof rawCode == 'string') {
			if (rawCode.trim() == '') {
				rawCode = {}
			} else {
				try {
					rawCode = decodeURI(rawCode)
					rawCode = JSON.parse(rawCode)
				} catch(e) { console.error(e) }
			}
		}

		return (<div>
			<div className="dialogContent" style={{ width: '80vw', height: '70vh' }}>
				<textarea id="reportCodeEditorCode" className="code-editor" name="code-editor" defaultValue={JSON.stringify(rawCode, null, 4)}></textarea>
				<div>
					<CopyToClipboard className="pull-right clear-both" text={function(trigger) { return $('#reportCodeEditorCode').val() }} />
					{
						this.props.buildCode
						? <ExternalCodeEditors code={this.props.buildCode(1)} />
						: false
					}
				</div>
			</div>
		</div>)
	}

});
