import React from 'react';
import {inject, observer} from 'mobx-react';
import CopyToClipboard from '../toolDock/copyToClipboard.jsx';


@inject('dataStore')
@observer
export default class ReportQueriesViewer extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
        this.state = {
            codeMirrorJSONOptions: {
                mode: "text/x-sql",
                lineWrapping: true,
                lineNumbers: true,
                indentWithTabs: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                theme: 'eclipse',
                gutters: ["CodeMirror-lint-markers"],
                readOnly: true
            }
        }
        this.onClose = this.onClose.bind(this);
    }

    componentDidMount() {
        var thisComponent = this;

        LeoKit.modal($('.dialogContent'),
            {
                cancel: false
            },
            'Queries',
            thisComponent.onClose
        );

        let textArea = $('textarea.code-editor').get(0)
        this.codeMirrorInstance = CodeMirror.fromTextArea(textArea, this.state.codeMirrorJSONOptions);
    }


    onClose() {
        this.props.onClose();
    }


    render() {
        let queries = this.props.queries;
        let buildString = queries.join('\n');

        return (<div>
            <div className="dialogContent" style={{ width: '80vw', height: '70vh' }}>
                <textarea id="reportCodeEditorCode" className="code-editor" name="code-editor" defaultValue={buildString}></textarea>
                <div>
                    <CopyToClipboard className="pull-right clear-both" text={function(trigger) { return $('#reportCodeEditorCode').val() }} />
                </div>
            </div>
        </div>)
    }
}