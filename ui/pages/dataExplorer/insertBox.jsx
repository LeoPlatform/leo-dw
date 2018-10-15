import React from 'react';
import {inject, observer} from 'mobx-react';

@inject('dataStore')
@observer
export default class InsertBox extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;
        this.sendToPivot = this.sendToPivot.bind(this);
    }

    sendToPivot(params, e) {
        if (!$(e.currentTarget).closest('aside').hasClass('frozen')) {
            $(e.currentTarget).closest('aside').hide();
        }
        this.dataStore.updateUrlAndHeaders(params);
    }


    render() {
        let columnType = this.props.column.type
            , ags = this.props.column.ags
            , wheres = this.props.inputBoxArrows[columnType]
            , defaultSet = 0;
        return (
            <aside className="insert-box">
                <div>

                        <b className="advanced-link">
                            <i>Advanced &gt;</i>
                        </b>

                    <div>
                        {
                            wheres.map((where, index) => {
                                return (<p key={index}>
                                    <i className={"fixed-width-icon icon-" + (where == 'row' ? 'level-up' : 'right' )+ ' ' + this.props.column.type}></i>
                                    {
                                        ags
                                            ? ags.map((ag, ndex) => {

                                                let args = {
                                                    where: where,
                                                    type: (columnType == 'dimension' && ag == 'count') ? 'metric' : columnType,
                                                    tableType: columnType,
                                                    id: this.props.column.id,
                                                    urlId: this.props.column.id + (ag == 'id' ? '' : '|'+ag),
                                                    label: this.props.column.label,
                                                    picked: ag,
                                                    parent_id: this.props.column.id,
                                                    parent: this.props.column.parent
                                                };
                                                return <b key={ndex} className={(defaultSet++ ? '' : 'hover')} onClick={this.sendToPivot.bind(null, args)}>{(ag == 'id' ? this.props.column.label : ag).toUpperCase()}</b>
                                            })
                                            : false
                                    }
                                </p>)
                            })
                        }
                    </div>
                </div>
            </aside>
        )
    }
}