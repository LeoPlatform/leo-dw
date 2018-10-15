var React = require('react');

var commonList = require('./commonList.jsx');
var InfoBox = require('../common/infoBox.jsx');
var InsertBox = require('./dialogs/insertBox.jsx');
//var SelectBox = require('./dialogs/selectBox.jsx');

module.exports = React.createClass({

	mixins: [commonList], // Use the mixin


	getInitialState: function() {
		return {
			dimListItemSelected: null,
			editingRange: ''
		}
	},


	getDefaultProps: function() {
		return {
			dims: {}
		}
	},


	render: function() {

		var searchText = this.props.searchText;

		var thisComponent = this;

		var dimension = this.props.dimension;

		var branchId = ('shortcut-'+dimension.id+'-'+dimension.label).toLowerCase().replace(/\W/g, '-');
		var attributes = [];

		dimension.attributes.map(function(attribute) {
			attribute.type='dimension';
			if (searchText != '' && (dimension.label + ' ' + attribute.label).toLowerCase().search(searchText) == -1) {
				//if there's a search and it does not match
				return false;
			}

			if (attribute.calc == 'math') {
				 //derived disabled
				return false;
			}

			if (!thisComponent.context.get_branch_state(branchId)) {
				//if this is closed
				if (searchText != '') {
					//search matches, but it is closed
					return <u></u>
				} else {
					return false;
				}
			}

			var ags = ['id'];

			//TODO: move kind determination to back end
			if (attribute.calc == 'math') {
				var kind = 'derived';
				ags = ['id'];
			} else {
				var kind = 'attribute';
			}

			var args = {
				type: 'dimension',
				id: attribute.id,
				label: attribute.label,
				ags: ags,
				parent_id: dimension.id,
				parent: {
					label: dimension.label,
					id: dimension.id
				}
			}

			var defaultArgs = {
				where: thisComponent.props.inputBoxArrows.dimension[0],
				type: 'dimension',
				id: attribute.id,
				ag: 'id'
			};

			attribute.kind = kind;

			attributes.push( <li className={"attribute leaf "+kind} key={attribute.id} onClick={thisComponent.selectField.bind(thisComponent, attribute.id, attribute.label, dimension.id, 'dimension', kind, attribute.is_date, attribute.expression)}>
				<div>
					<label>{attribute.label}</label>
					<span>
						<span className="insert-button">
							<i className="icon-sprite-select fixed-width-icon" onClick={thisComponent.context.sendToPivot.bind(null, defaultArgs)}></i>
							<InsertBox column={args} inputBoxArrows={thisComponent.props.inputBoxArrows} />
						</span>
						<i className="icon-info fixed-width-icon" onClick={thisComponent.context.edit_column.bind(null, attribute)}></i>
						<i className="icon-filter fixed-width-icon" onClick={thisComponent.context.edit_filter.bind(null, args)}></i>
					</span>
					<InfoBox column={attribute} showMore="true" />
				</div>
			</li> )

		})

		if (searchText != '' && (dimension.label).toLowerCase().search(searchText) == -1 && attributes.length == 0) {
			return false;
		}

		var className = "dimension branch"
			+ (this.context.get_branch_state(branchId) ? '' : ' closed')
			+ (dimension.is_date ? ' is_date' : '')
			+ (dimension.has_outrigger ? ' has_outrigger' : '')
			+ (dimension.is_outrigger ? ' is_outrigger' : '')
			+ (dimension.is_last_outrigger ? ' is_last_outrigger' : '')
		;

		return (<li className={className} id={branchId} key={dimension.id} onClick={this.toggleBranch.bind(this, branchId)}>
			<div onClick={thisComponent.selectField.bind(thisComponent, dimension.id, dimension.label, dimension.id, 'dimension', 'dimension', dimension.is_date, '')}>
				<label title={dimension.label}>{dimension.label}</label>
			{
				dimension.is_date
				? <span>
					<i className="icon-calendar fixed-width-icon" onClick={this.context.date_filter.bind(null, { dimension_id: dimension.attributes[0].id, filter: this.props.filter } )}></i>
				</span>
				: false
			}
			</div>

			<ul className="attributes twig">
				{ attributes }
				<li key="dimension-add" className="leaf dimension-add" onClick={this.context.edit_column.bind(null, { parent_id: dimension.id, columnType: 'dimension', kind: 'derived' })}>
					<div>
						<label><i className="icon-plus"></i></label>
					</div>
				</li>
			</ul>
		</li>)

	}

});
