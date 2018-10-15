import React from 'react';
import {inject, observer} from 'mobx-react';

@inject('dataStore')
@observer
export default class AdvancedSettings extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
        this.state = {
            advanced: {
                showTotals: this.dataStore.showTotals
            }
        };
        this.onClose = this.onClose.bind(this);
        this.saveAdvancedSettings = this.saveAdvancedSettings.bind(this);
    }


    componentDidMount() {
        LeoKit.modal($('.advanced-settings'),
            {
                Save: (data) => {
                    this.saveAdvancedSettings(data)
                },
                cancel: false
            },
            'Advanced Settings',
            this.onClose
        )
    }


    onClose() {
        this.props.onClose()
    }


    saveAdvancedSettings(data) {
        this.dataStore.showTotals = data['showTotals'];
        this.dataStore.urlObj['advanced'] = {"showTotals": data['showTotals']};
        this.dataStore.setUrlHash();
        this.onClose()
    }


    render() {
        let advanced = this.state.advanced;
        return (<div className="advanced-settings-wrapper">
            <div className="advanced-settings theme-form">
                {
                    Object.keys(this.state.advanced).map((setting) => {
                        return (<div key={setting} className="">
                            <label>{setting}</label>
                            <input name={setting} type="checkbox" defaultChecked={advanced[setting]} value="true" />
                        </div>)
                    })
                }
            </div>
        </div>
        )
    }
}