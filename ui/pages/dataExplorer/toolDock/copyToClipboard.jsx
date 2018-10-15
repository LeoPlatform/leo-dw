import React from 'react';
import {inject, observer} from 'mobx-react';

@inject('dataStore')
@observer
export default class CopyToClipboard extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
    }

    componentDidMount() {
        let clipboard = new Clipboard('.clipboardButton',
            this.props.text ? { text: this.props.text } : undefined
        ).on("success", function(readyEvent) {
            $(readyEvent.trigger).prev('.clipboardResults').text('Copied to clipboard')
        })
    }

    render() {

        return (
            <div style={this.props.style || {}} className={this.props.className || false}>
                <span className="clipboardResults theme-message-success">&nbsp;</span>
                <button className="clipboardButton theme-button" type="button" data-clipboard-target={this.props['data-clipboard-target'] || this.props.target || undefined}>Copy to Clipboard</button>
            </div>
        )
    }
}