import React, { Component } from 'react'
import MessageCenter from './common/messageCenter.jsx'
import {inject, observer} from 'mobx-react'

@inject('dataStore')
@observer
export default class Header extends React.Component {

    constructor(props) {
        super(props);
        this.dataStore = this.props.dataStore;

        this.state = ({
            menu: {
                logo: "//cdnleo.s3.amazonaws.com/logos/leo_icon.png",
                navigation: [
                    //{ icon:"icon-database", href:"/dw", title:"DataWarehouse"},
                    //{ icon:"icon-bot", href:"/botmon", title:"EventBus"}
                ]
            }
        });
	}

	render() {
		return (
			<header className="page-header">

				<MessageCenter />

				<div className="page-logo">
					<img src={this.state.menu.logo} />
					<ul>
						{
							this.state.menu.navigation.map((navigation, key) => {
								return (<li key={key}>
									<a className={navigation.href.split('/').pop() == 'dw' ? 'active' : ''} href={navigation.href}>
									<i className={navigation.icon.replace('fa fa-', 'icon-')} />
									{navigation.title}
									</a>
								</li>)
							})
						}
					</ul>
				</div>

				<div className="page-title">
					DataWarehouse
				</div>

				<nav className="page-nav">
					<ul>
	{/*					<li className="hoverPortalList theme-dropdown-right">
							<a href="portals" className={(document.location.pathname.split('/').indexOf('portals') != -1) ? 'active' : ''}>
								<i className="icon-spinner fixed-width-icon"></i>
								Dashboards
							</a>
						</li>
						*/}
						{/*<li className="hoverDataExplorerList theme-dropdown-right">*/}
							{/*<a href="builder" className={(document.location.pathname.split('/').indexOf('builder') != -1) ? 'active' : ''}>*/}
								{/*<i className="icon-layers fixed-width-icon"></i>*/}
								{/*Data Explorer*/}
							{/*</a>*/}
						{/*</li>*/}
						<li style={{'textTransform': 'uppercase',
							'color': 'inherit',
                            'textDecoration': 'none',
                            'display': 'inline-block',
                            'padding': '0 11px 4px 8px',
                            'textAlign': 'center',
                            'position': 'relative',
                            'verticalAlign': 'middle',
                            'overflow': 'hidden',
                            'maxWidth': '100%',
                            'lineHeight': '2.8125rem'
						}}>
							<i className="icon-layers fixed-width-icon"></i>
							Data Explorer
						</li>
						{/*<li className="hoverVisualExplorerList theme-dropdown-right">*/}
							{/*<a href="chart" className={(document.location.pathname.split('/').indexOf('chart') != -1) ? 'active' : ''}>*/}
								{/*<i className="icon-chart-line fixed-width-icon"></i>*/}
								{/*Visual Explorer*/}
							{/*</a>*/}
						{/*</li>*/}
					</ul>

					{/*<ul>*/}
						{/*<li>*/}
							{/*<a href="http://docs.leoinsights.com/v1.0/docs" target="documentation">*/}
								{/*<i className="icon-help-circled fixed-width-icon"></i>*/}
							{/*</a>*/}
						{/*</li>*/}
					{/*</ul>*/}

				</nav>
			</header>
		)
	}
}