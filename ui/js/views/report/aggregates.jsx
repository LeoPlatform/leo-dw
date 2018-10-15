var React = require('react');

var IdUtils = require('../../utils/IdUtils');

module.exports = React.createClass({

	menu: {
		metric: {
			raw: {
				sum: 'Sum',
				avg: 'Avg',
				min: 'Min',
				max: 'Max'
			},
			percent: {
				sum: 'Sum',
				avg: 'Avg'
			},
			cumulative: {
				sum: 'Sum',
			},
			rank: {
				sum: 'Sum',
				avg: 'Avg'
			}
		},
		fact: {
			raw: {
				count: 'Count'
			},
			percent: {
				count: 'Count'
			},
			cumulative: {
				count: 'Count'
			},
			rank: {
				count: 'Count'
			}
		},
		fx: {
			raw: {
				fx: 'fx'
			},
			percent: {
				fx: 'fx'
			},
			cumulative: {
				fx: 'fx'
			},
			rank: {
				fx: 'fx'
			}
		}
	},


	getInitialState: function() {
		var column = IdUtils.parse(this.props.id)
		var type = IdUtils.type()
		var aggregate = IdUtils.aggregate()
		var transforms = IdUtils.transforms()
		var hasPartitions = (this.props.column && this.props.column.partitions && this.props.column.partitions.length > 0)

		return {
			column: column,
			type: type,
			aggregate: aggregate,
			transforms: transforms,
			hasPartitions: hasPartitions
		}
	},


	contextTypes: {
		show_dialog: React.PropTypes.func,
	},


	componentDidMount: function() {
		var thisComponent = this;
		$(document.body).keydown(function(e) {
			if (e.keyCode == 27) {
				thisComponent.props.closeChangeColumn();
			}
		});
	},


	updateColumn: function(aggregate, transform, addColumn, e) {
		e.preventDefault();
		e.stopPropagation();

		var column = this.state.column;
		var transforms = this.state.transforms;

		if (this.state.aggregate != aggregate) {
			delete(column[this.state.aggregate]);
			if (aggregate != 'fx') {
				column[aggregate] = [];
			}
		}

		for(var i=0;i<transforms.length;i++) {
			for(var old_transform in transforms[i]) {}
			delete(column[old_transform]);
		}

		if (transform != 'raw') {
			column[transform] = (transform=='percent' ? ['total', (this.state.hasPartitions ? 'horizontal' : undefined)] : []);
		}

		var id = IdUtils.build(column);
		this.props.saveAggregate(id, (addColumn ? null : this.props.iterator || 0));
	},


	showAdvanced: function() {
		this.context.show_dialog('advanced', { id: this.props.id, column: this.props.column, editing: 'row', iterator: this.props.iterator, params: this.props.params });
		this.props.closeChangeColumn(true);
	},


	render: function() {

		var thisComponent = this;

		var menu = this.menu[this.state.type];

		//var top = this.props.position && this.props.position.top || 58;
		//var right = this.props.position && this.props.position.right || -15;

		if (this.props.position && this.props.position.right) {
			var style = {
				top: this.props.position && this.props.position.top || 58,
				right: this.props.position && this.props.position.right || -15
			}
		} else {
			var style = {
				top: this.props.position && this.props.position.top || 58,
				left: this.props.position && this.props.position.left || -30
			}
		}

		return (<div className="popup-menu change-aggregate arrow-up-right" style={style}>

		{/* return (<div className="popup-menu change-column arrow-up" style={{top:0,marginLeft:35}}> */}

			<div className="mask" onClick={this.props.closeChangeColumn}></div>

			<div>

				{/*<div>
					<i className="icon-sprite-123"></i>
					<span>Aggregates</span>
					<i className="icon-cancel pull-right" onClick={this.props.closeChangeColumn}></i>
				</div>*/}

				<ul className="menu" style={{minWidth:150}}>
				{/* <ul className="aggregate-list">*/}
					{
						Object.keys(menu).map(function(transform) {
							var submenu = menu[transform];
							return <li className={transform} key={transform}>
								<label>{transform}</label>
								<ul>
									{
										Object.keys(submenu).map(function(aggregate, index) {

											var className = (
												(
													thisComponent.state.aggregate == aggregate
													&& ((thisComponent.state.transforms.length == 0 && transform == 'raw') || (thisComponent.state.transforms.length == 1 && transform in thisComponent.state.transforms[0]))
												)
												? 'active'
												: ''
											);

											return <li key={aggregate} className={className} onClick={thisComponent.updateColumn.bind(null, aggregate, transform, false)}>
												<label>{submenu[aggregate]}</label>
												{
													(thisComponent.props.hidePlus)
													? false
													: <i className="icon-plus pull-right cursor-pointer" title="add as new" onClick={thisComponent.updateColumn.bind(null, aggregate, transform, true)}></i>
												}

											</li>
										})
									}
								</ul>
							</li>
						})
					}

					<li className="footer" onClick={this.showAdvanced}>
						Advanced...
					</li>
				</ul>

			</div>

		</div>)
	}

})
