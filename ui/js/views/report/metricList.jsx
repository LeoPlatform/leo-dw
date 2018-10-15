var React = require('react');

var commonList = require('./commonList.jsx');
var InfoBox = require('../common/infoBox.jsx');
var InsertBox = require('./dialogs/insertBox.jsx');
//var SelectBox = require('./dialogs/selectBox.jsx');

module.exports = React.createClass({

	mixins: [commonList], // Use the mixin

	getInitialState: function() {
		return {
			metricListItemSelected: null
		}
	},


	getDefaultProps: function() {
		return {
			fact: {}
		}
	},


	render: function() {
		var searchText = this.props.searchText;

		var thisComponent = this;

		var fact = JSON.parse(JSON.stringify(this.props.fact));
		console.log('fact',fact, this.props)

		var branchId = ('shortcut-'+fact.id+'-'+fact.label).toLowerCase().replace(/\W/g, '-');

		var metrics = [];

		var lastMetricId = null;

		fact.metrics.sort(function(a,b) {return a.label.localeCompare(b.label)}).map(function(metric) {

			if (lastMetricId == metric.id) {
				return false
			}
			lastMetricId = metric.id;

			if (metric.label == fact.label) {
				return false;
			}

			if (searchText != '' && (fact.label + ' ' + metric.label).toLowerCase().search(searchText) == -1) {
				//if there's a search and it does not match
				return false;
			}

			if (metric.calc == 'math') {
				 //derived disabled
				return false;
			}

			// if (!thisComponent.context.get_branch_state(branchId)) {
			// 	//if this is closed
			// 	if (searchText != '') {
			// 		//search matches, but it is closed
			// 		return <u></u>
			// 	} else {
			// 		return false;
			// 	}
			// }

			var ags = ['sum','avg','max','min'];
			var advanced = true;

			//TODO: move kind determination to back end
			if (metric.type == 'lag') {
				var kind = 'lag';
				ags = false;
				advanced = false;
			} else if (metric.calc == 'math') {
				var kind = 'derived';
				ags = ['id'];
				advanced = false;
			} else if (metric.expression) {
				var kind = 'virtual';
			} else {
				var kind = 'metric';
			}

			var args = {
				type:'metric',
				id:metric.id,
				label:metric.label,
				ags:ags,
				advanced:advanced,
				parent_id: fact.id
			}

			var defaultArgs = {
				where:'row',
				type:'metric',
				id:metric.id+(kind=='derived'?'':'|sum')
			};

			metric.parent = {
				label: fact.label,
				id: fact.id,
			};
			metric.kind = kind;

			metrics.push( <li className={"leaf "+kind} key={metric.id} onClick={thisComponent.selectField.bind(thisComponent, metric.id, metric.label, fact.id, 'metric', kind, false, metric.expression)}>
				<div>
					<label>{metric.label}</label>
				{
					!ags
					? false
					: <span>
						<span className="insert-button">
							<i className="icon-sprite-select fixed-width-icon" onClick={thisComponent.context.sendToPivot.bind(null,defaultArgs)}></i>
							{/*<InsertBox column={args} inputBoxArrows={thisComponent.props.inputBoxArrows} />*/}
						</span>
						{/*<span className="select-button">
							<i className="icon-ellipsis fixed-width-icon" onClick={thisComponent.context.field_selected.bind(null, defaultArgs)}></i>
						</span>*/}
						{/*<i className="icon-info fixed-width-icon" onClick={thisComponent.context.edit_column.bind(null, metric)} ></i>*/}
					</span>
				}
					<InfoBox column={metric} showMore="true" />

				</div>
			</li> );

		})

		if (searchText != '' && (fact.label).toLowerCase().search(searchText) == -1 && metrics.length == 0) {
			return false;
		}

		var args = {
			type: 'metric',
			id: fact.id,
			label: fact.label,
			ags: ['count','unique'],
			advanced: true,
			kind: 'fact',
			parent_id: fact.id
		}

		var defaultArgs = {
			// where: this.props.inputBoxArrows.metric[0],
			type: 'metric',
			id: fact.id+'|count'
		};

		fact.parent = {
			label: fact.label,
			id: fact.id,
		};

		return	<li className={"fact branch"} id={branchId} key={fact.id} onClick={this.toggleBranch.bind(this, branchId)}>
					<div onClick={thisComponent.selectField.bind(thisComponent, fact.id, fact.label, 0, 'fact', 'fact', false, '')}>
						<label>{fact.label}</label>
						<span>
							<span className="insert-button">
								<i className="icon-sprite-select fixed-width-icon" onClick={thisComponent.context.sendToPivot.bind(null, defaultArgs)}></i>
								{/*<InsertBox column={args} inputBoxArrows={thisComponent.props.inputBoxArrows} />*/}
							</span>
							<i className="icon-info fixed-width-icon"></i>
						</span>
						<InfoBox column={fact} showMore="true" />
					</div>
					<ul className="metrics twig">
						{ metrics }
						{<li key="fact-add" className="leaf fact-add">
							<div>
								<label><i className="icon-plus"></i></label>
							</div>
						</li>}
					</ul>
				</li>

	}


});
