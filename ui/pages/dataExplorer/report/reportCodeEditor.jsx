import React from 'react';
import {inject, observer} from 'mobx-react';
import CopyToClipboard from '../toolDock/copyToClipboard.jsx';


@inject('dataStore')
@observer
export default class ReportCodeEditor extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
        this.state = {
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
            }
        }
        this.onClose = this.onClose.bind(this);
        this.saveCodeMirror = this.saveCodeMirror.bind(this);
    }

    componentDidMount() {
        var thisComponent = this;

        LeoKit.modal($('.dialogContent'),
            {
                Save(data) {
                    try {
                        data = JSON.parse(data['code-editor'])
                    } catch(e) {
                        LeoKit.alert(e);
                        return false;
                    }
                    thisComponent.saveCodeMirror(data)
                },
                cancel: false
            },
            'Edit Code',
            thisComponent.onClose
        );

        let textArea = $('textarea.code-editor').get(0)

        this.codeMirrorInstance = CodeMirror.fromTextArea(textArea, this.state.codeMirrorJSONOptions);
        this.codeMirrorInstance.on('change', () => {
            thisComponent.codeMirrorInstance.save();
        })

    }


    onClose() {
        this.props.onClose();
    }

    saveCodeMirror(data) {
        let stringifyData = JSON.stringify(data);
        this.dataStore.urlObj = stringifyData;
        this.dataStore.getInitialURL('#'+stringifyData, true);
        this.dataStore.getReport();
    }


    render() {

        let rawCode = this.props.rawCode;
        if (typeof rawCode == 'string') {
            if (rawCode.trim() == '') {
                rawCode = {}
            } else {
                try {
                    rawCode = JSON.parse(this.dataStore.decodeURL(rawCode));
                } catch(e) { console.error(e) }
            }
        }

        return (<div>
            <div className="dialogContent" style={{ width: '80vw', height: '70vh' }}>
                <textarea id="reportCodeEditorCode" className="code-editor" name="code-editor" defaultValue={JSON.stringify(rawCode, null, 4)}></textarea>
                <div>
                    <CopyToClipboard className="pull-right clear-both" text={function(trigger) { return $('#reportCodeEditorCode').val() }} />
                </div>
            </div>
        </div>)
    }
}