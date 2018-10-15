import React from 'react';
import {inject, observer} from 'mobx-react';


@inject('dataStore')
@observer
export default class InfoBox extends React.Component {


    editColumn() {
        this.context.edit_column(this.props.column);
    }


    render() {
        let column = this.props.column;
        let icon = ((column.type == 'metric' || column.type == 'fact') ? 'icon-sprite-123' : 'icon-ion-social-buffer-outline');
        let format = (column.format || ((column.type == 'metric' || column.type == 'fact') ? 'int' : 'string'));
        let label = column.label + (column.label == parent.label ? ' Count' : '');
        return(
            <aside className="info-box" data-column_id={column.id}>
                <div>
                    <header>
                        <i className={icon}></i>{column.parent ? column.parent.label : ''}
                    </header>
                    <div>
                        <strong>{label}</strong>
                        <em>{'  |  '+format}</em></div>
                    <div>{column.description || ''}</div>
                    <div ref="infoExamples" className="info-examples"></div>
                    {
                        this.props.showMore
                            ? <div className="info-more" onClick={this.editColumn}>
                                <i className="icon-info"></i>
                                <span> more &gt; </span>
                            </div>
                            : false
                    }
                </div>
            </aside>
        )
    }
}