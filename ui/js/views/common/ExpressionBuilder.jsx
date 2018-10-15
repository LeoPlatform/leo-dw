var React = require('react');

//var FieldsStore = require('../../stores/FieldsStore');
var ColumnSearch = require('../report/columnSearch.jsx');
//var ColumnBlock = require('../common/ColumnBlock.jsx');
var IdUtils = require('../../utils/IdUtils');
var Aggregates = require('../report/aggregates.jsx');

module.exports = React.createClass({

	getInitialState: function() {
		var expression = this.props.defaultValue || ''

		if (expression.slice(0,3) == 'fx(') {
			expression = expression.slice(3, -1)
		}

		expression = expression.split(/([a-z_.|:]+)/gi)

		return {
			expression: expression,
			columnSearch: false,
			changeAggregate: false
		}
	},


	componentDidMount: function() {
		this.state.expression.map((fragment) => {
			this.addColumn(fragment)
		})

		this.setRange();

		$(this.refs.fieldExpression).on('click', '.column-name', (e) => {
			var defaultValue = $(e.currentTarget).closest('.column-block').find('.column-fragment').text()
			var blockId = $(e.currentTarget).closest('.column-block').attr('id')
			var position = $(e.currentTarget).position();
			position.top += $(e.currentTarget).height()+10;
			this.setState({
				columnSearch: {
					id: defaultValue,
					defaultValue: defaultValue,
					action: 'pick_metric',
					input: e.currentTarget,
					position: position,
					blockId: blockId
				}
			});
		})

		$(this.refs.fieldExpression).on('click', '.column-aggregate', (e) => {
			var defaultValue = $(e.currentTarget).closest('.column-block').find('.column-fragment').text()
			var blockId = $(e.currentTarget).closest('.column-block').attr('id')
			var position = $(e.currentTarget).position();
			position.left -= 117
			position.top += 25
			this.setState({
				changeAggregate: {
					defaultValue: defaultValue,
					position: position,
					blockId: blockId
				}
			});
		})

	},


	componentDidUpdate: function() {


	},


	addColumn: function(fragment, replaceId) {
		var block
		   ,fixedFragment = fragment
		if (/[a-z]/.test(fragment)) {
			var aggregate = IdUtils.aggregate(fragment) || ''
			if (!aggregate) {
				aggregate = 'sum'
				var column = IdUtils.parse(fragment)
				column.sum = '';
				fixedFragment = IdUtils.build(column)
			}
			var details = IdUtils.details(fixedFragment)
			if (details) {
				block = $('<div class="column-block metric-block contentEditable="false"/>').attr('id', 'content-block-'+fixedFragment.replace(/[^a-z0-9]/ig, '_')).append(
					$('<div class="block-bottom flex-row" contentEditable="false"/>').append(
						$('<div class="column-name flex-grow drop-down-arrow"/>').append(
							$('<div/>').text(details ? details.label : ''),
							$('<div/>').text(details && details.parent ? details.parent.label : '')
						),
						$('<div class="column-aggregate"/>').text(aggregate)
					),
					$('<div class="column-fragment"/>').text(fixedFragment)
				)
			} else {
				block = fragment
			}
		} else {
			block = fragment
		}

		if (replaceId) {
			$('#'+replaceId).replaceWith(block)
		} else {
			$(this.refs.fieldExpression).append(block)
		}

		this.updateTextField();

		//add spacing
		var contents = $(this.refs.fieldExpression).contents()
		var toggle = 3
		contents.each(function(index, content) {
			if (toggle == 3) {
				if (content.nodeType != 3) {
					$(content).before('&nbsp;')
				}
				toggle = 1
			} else if (toggle == 1 && content.nodeType == 1) {
				toggle = 3
			}
		})

		if (toggle == 3) {
			$(this.refs.fieldExpression).append('&nbsp;')
		}

		//set cursor position
		if (typeof block == 'object') {
			setTimeout(() => {
				var element = block[0]
				var sel = window.getSelection();
				if (sel.rangeCount > 0) {
					sel.removeAllRanges();
				}
				var range = document.createRange();
				range.selectNode(element);
				range.collapse(false);
				sel.addRange(range);
				if (sel.rangeCount > 0) {
					var textNode = sel.focusNode;
					sel.collapse(textNode, textNode.length);
				}
			}, 1)
		}

	},


	updateTextField: function() {
		var expression = '';
		$(this.refs.fieldExpression).contents().each(function(index, content) {
			if (content.nodeType == 1) {
				var temp = $(content).clone();
				temp.find('.block-bottom').remove();
				expression += $.trim(temp.text())
			} else if (content.nodeType == 3) {
				expression += $.trim($(content).text())
			}
		})
		$(this.refs.expressionText).val(expression)
	},


	range: null,

	setRange: function(e) {
		if (e && e.altKey == false && e.ctrlKey == false && e.keyCode && e.keyCode >= 64 && e.keyCode <= 90) {
			e.preventDefault();
			e.stopPropagation();

			var position = $(e.currentTarget).position();
			position.left += 20;
			position.top += $(e.currentTarget).height()+10;
			this.setState({
				columnSearch: {
					id: String.fromCharCode(e.keyCode).toLowerCase(),
					defaultValue: String.fromCharCode(e.keyCode).toLowerCase(),
					action: 'pick_metric',
					input: e.currentTarget,
					position: position
				}
			});

		} else {
			setTimeout(() => { this.updateTextField() });
		}

		if (e && e.keyCode == 46) { //delete
			var sel = window.getSelection();
			if (sel.rangeCount != 0) {
				var range = sel.getRangeAt(0);
				var post_range = document.createRange();
				post_range.selectNodeContents($(this.refs.fieldExpression)[0]);
				post_range.setEnd(range.startContainer, range.startOffset);
			}
			if (post_range.toString().length === 0) {
				$(this.refs.fieldExpression).prepend('&nbsp;')
			}
		}

		if (e && e.keyCode == 8) { //backspace
			var sel = window.getSelection();
			if (sel.rangeCount != 0) {
				var range = sel.getRangeAt(0);
				var post_range = document.createRange();
				post_range.selectNodeContents($(this.refs.fieldExpression)[0]);
				post_range.setStart(range.endContainer, range.endOffset);
			}
			if (post_range.toString().length === 0) {
				$(this.refs.fieldExpression).append('&nbsp;')
			}
		}

	},


	closePopups: function(loadingAdvanced) {
		this.setState({
			columnSearch: false,
			changeAggregate: false,
			changeAdvanced: loadingAdvanced ? { blockId: this.state.changeAggregate.blockId } : null
		})
	},


	setColumn: function(action, column) {
		this.addColumn(column.id, this.state.columnSearch.blockId)
		this.closePopups()
	},


	saveAggregate: function(column_id) {
		this.addColumn(column_id, this.state.changeAggregate.blockId)
		this.closePopups()
	},


	saveAdvancedMetric: function(column_id) {
		this.addColumn(column_id, this.state.changeAdvanced.blockId)
	},


	value: function() {
		return this.refs.expressionText.value
	},


	render: function() {

		return <div className="expression-builder">

			<div id={this.props.id} ref="fieldExpression" contentEditable="true" placeholder="click to choose field(s)" onClick={this.setRange} onKeyDown={this.setRange}></div>

			<input type="hidden" className="expression-builder-input" ref="expressionText" name={this.props.name} />

			{
				this.state.columnSearch
				? <ColumnSearch
					action="pick_metric"
					position={this.state.columnSearch.position}
					closeChangeColumn={this.closePopups}
					save={this.setColumn}
					id={this.state.columnSearch.id}
					defaultValue={this.state.columnSearch.defaultValue}
					maskOff="true"
				/>
				: false
			}

			{
				this.state.changeAggregate
				? <Aggregates id={this.state.changeAggregate.defaultValue} position={this.state.changeAggregate.position} saveAggregate={this.saveAggregate} closeChangeColumn={this.closePopups} params={{saveAdvancedMetric: this.saveAdvancedMetric}} />
				: false
			}

		</div>

	}

});
