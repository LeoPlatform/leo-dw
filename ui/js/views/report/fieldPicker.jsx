var React = require('react');

var ColumnSearch = require('../report/columnSearch.jsx');

module.exports = React.createClass({

	/*

		Fact
			Metric
				Aggregate / Calculation

		Dimension
			Attribute

	*/

	contextTypes: {
		selected_field: React.PropTypes.object
	},


	getInitialState: function() {
		return {
			parentId: this.props.parentId,
			lockParent: (this.props.name == 'column_builder_expression' && this.props.field == 'metric'),
			columnSearch: false
		};
	},


	onClick: function(e) {
		if (this.props.onClick) {
			this.props.onClick(e);
		}
	},


	componentDidMount: function() {
		if (this.props.parentId) {
			this.factLimit(this.props.parentId);
		}

		if (this.props.type == 'div' && (this.props.defaultValue || this.props.value || this.props.expression)) {
			var expression = this.props.expression;
			if (expression && expression.slice(0, 3) == 'fx(') {
				expression = expression.slice(3, -1)
				this.setState({
					is_fx: true
				})
			}

			var html = this.props.defaultValue || this.props.value || expression.replace(/((d|f)_[\w\.\|$#]+)/gim, '&nbsp;<span contentEditable="false">$1</span>&nbsp;');
			$(this.refs.fieldExpression).html(html);
		}

		jQuery.fn.cleanWhitespace = function() {
			var lastWasWhiteSpace = false;
			var textNodes = this.contents().filter(function() {
				var thisIsWhiteSpace = (this.nodeType == 3 && !/\S/.test(this.nodeValue));
				if (thisIsWhiteSpace && lastWasWhiteSpace) return true;
				lastWasWhiteSpace = thisIsWhiteSpace;
				return false;
			}).remove();
			return this;
		}

		this._enableFieldDeleting();
	},


	startFieldSelection: function(e) {
		this.inputBlur();
		$(document.body).addClass('column-builder-picking-'+(this.props.field || 'field'));
		$(this.refs.fieldExpression).addClass('column-builder-field-target');

		if (this.props.type != 'div') {
			switch(this.props.field) {
				case 'dimension': case 'metric': case 'filter': case 'fact': case 'date':
					var position = $(e.currentTarget).position();
					position.left += 20;
					position.top += 40;
					this.setState({
						columnSearch: {
							action: 'pick_' + this.props.field,
							input: e.currentTarget,
							position: position
						}
					});
				break;
			}
		}
	},


	closeColumnSearch: function() {
		this.setState({ columnSearch: false })
	},


	setColumn: function(action, column) {
		this.value(column.id);
		this.setState({ columnSearch: false })

		if (this.props.onChange) {
			this.props.onChange(column)
		}
	},


	lastFieldSent: null,

	componentDidUpdate: function() {
		if (this.context.selected_field) {
			if (this.lastFieldSent != this.context.selected_field._sent) {
				this.lastFieldSent = this.context.selected_field._sent;
				this.fieldSelected(this.context.selected_field);

				if (this.props.onChange) {
					this.props.onChange(this.context.selected_field)
				}

			}
			this._enableFieldDeleting();
		}
	},


	fieldSelected: function(selectedField) {

		if ($(this.refs.fieldExpression).hasClass('column-builder-field-target')) {

			if (selectedField.id == this.props.columnId) {
				return; //cant pick self
			}

			switch(this.props.field) {
				case 'fact':
					if (selectedField.type == 'fact' || selectedField.type == 'metric' || selectedField.type == 'aggregate' || selectedField.type == 'virtual') {
						var field_id = selectedField.id.split('|')[0];
						this.value(field_id, selectedField.expression);
					}
				break;

				case 'metric':
					if (selectedField.type == 'metric' || selectedField.type == 'aggregate' || selectedField.type == 'lag' || selectedField.type == 'virtual') {
						if (this.factLimit(selectedField.parent)) {
							var field_id = selectedField.id.split('|')[0];
							if (field_id.indexOf('.') != -1 || selectedField.type == 'lag') {
								this.value(field_id, selectedField.expression);
							}
						}
					}
				break;

				case 'lag':
					if (selectedField.type == 'lag') {
						var field_id = selectedField.id;
						this.value(field_id);
					}
				break;

				case 'dimension':
					if (selectedField.type == 'dimension' || selectedField.type == 'attribute') {
						var field_id = selectedField.id.split('|')[0];
						this.value(field_id);
					}
				break;

				case 'date':
					if (selectedField.type == 'dimension' || selectedField.type == 'attribute') {
						if (selectedField.parent == 'd_date' || selectedField.parent.indexOf('.d_date') != -1) {
							this.value(selectedField.parent);
						}
					}
				break;

				case 'parent':
					if (selectedField.type == 'parent') {
						this.value(selectedField.id);
					}
				break;

				case 'aggregated':
					if (selectedField.type == 'derived') {
						this.value(selectedField.id, selectedField.expression);
					} else if (selectedField.type == 'metric') {
						this.value(selectedField.id+'|sum');
					} else if ((selectedField.type == 'aggregate' && !!selectedField.expression) || selectedField.type == 'fact') {
						//skip
					} else {
						this.value(selectedField.id);
					}
				break;

				case 'field':
					if (selectedField.type == 'derived' || selectedField.type == 'virtual') {
						this.value(selectedField.id, selectedField.expression);
					} else {
						this.value(selectedField.id);
					}
				break;
			}

			if (this.props.updateParent && $('[name="'+this.props.updateParent+'"]').length > 0 && $('[name="'+this.props.updateParent+'"]').val() == '') {
				$('[name="'+this.props.updateParent+'"]').val(selectedField.parent).next().show();
			}

			if (this.props.updateType && $('[name="'+this.props.updateType+'"]').length > 0 && $('[name="'+this.props.updateType+'"]').val() == '') {
				switch(selectedField.type) {
					case 'fact': case 'metric': case 'aggregate':
						$('[name="'+this.props.updateType+'"]').val('metric');
					break;

					case 'dimension': case 'attribute':
						$('[name="'+this.props.updateType+'"]').val('dimension');
					break;
				}
			}

			if (this.props.updateLabel && $('[name="'+this.props.updateLabel+'"]').length > 0 && $('[name="'+this.props.updateLabel+'"]').val() == '') {
				var suffix = $($('[name="'+this.props.updateLabel+'"]').data('update-suffix')).text();
				$('[name="'+this.props.updateLabel+'"]').val(selectedField.label + ' ' + suffix);
			}

			if (this.props.onChange) {
				this.props.onChange(selectedField)
			}

		}

	},


	_enableFieldDeleting: function() {
		var thisComponent = this;
		$('[contentEditable="true"]').on('click', 'span', function() {
			$(this).remove();
			$('[contentEditable="true"]').cleanWhitespace();
			//thisComponent.setRange();
		})
		$('[contentEditable="true"]').cleanWhitespace();
	},


	factLimit: function(parent_id) {
		if (this.props.name == 'column_builder_expression') {
			if (this.state.parentId && this.state.parentId != parent_id) {
				//must belong to the same fact
				return false;
			}
			$('.metricParent').addClass('fact-limit');
			$('.metricParent[data-fact_id="'+parent_id+'"]').removeClass('fact-limit');
			this.setState({
				parentId: parent_id
			})
			return true;
		}
		return true;
	},


	expressionFocus: function(e) {
		this.startFieldSelection(e);

		var fieldTarget = $('.column-builder-field-target');
		fieldTarget[0].focus();

		if (this.range) {
			range = this.range;
		} else {
			var range = document.createRange();
			range.selectNodeContents(fieldTarget[0]);
			range.collapse(false);
		}

		var selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);

		this.validateExpression();
	},


	validateExpression: function() {
		var expressionField = $('.column-builder-field-target');
		expressionField.removeClass('column-builder-error');

		if (expressionField.text() == '' || !this.props.doValidation) {
			return;
		}

		var expression = expressionField.clone();
		expression.find('span').replaceWith(' 8 ');
		expression = expression.text();
		expression = expression.replace(/\s/g, ' ');

		try {
			var a = eval(expression);
			if (isNaN(a)) {
				throw new Error('Object is not a Number');
			}
		} catch(e) {
			expressionField.addClass('column-builder-error');
		}
	},


	inputBlur: function() {
		$(document.body).removeClass (function (index, css) {
			return (css.match(/(^|\s)column-builder-picking-\S+/g) || []).join(' ');
		});
		$('.column-builder-field-target').removeClass('column-builder-field-target');
	},


	clearField: function(e) {
		this.value('');
	},


	value: function(value, expression) {
		if (typeof value == 'undefined') {
			//getter
			return (this.refs.fieldExpression.contentEditable == 'true'
				? (false && this.state.is_fx ? 'fx(' + $(this.refs.fieldExpression).text() +')' : $(this.refs.fieldExpression).text()).replace(/\s/g, '')
				: this.refs.fieldExpression.value
			);
		} else {
			this.refs.fieldExpression.blur();

			//setter
			if (this.refs.fieldExpression.contentEditable == 'true') {
				if (expression) {
					var fragment = '&nbsp;('+expression.replace(/((d|f)_[\w\.\|$#]+)/gim, '&nbsp;<span contentEditable="false">$1</span>&nbsp;')+')&nbsp;';
				} else {
					var fragment = '&nbsp;<span contentEditable="false">'+value+'</span>&nbsp;';
				}
				if (this.range && this.range.insertNode) {
					this.range.insertNode(this.range.createContextualFragment(fragment));
					this.range.collapse();
				} else {
					$(this.refs.fieldExpression).append(fragment);
				}
			} else {
				this.refs.fieldExpression.value = value
				if (this.refs.clearFieldExpression) {
					$(this.refs.clearFieldExpression).toggle(value != '');
				}
			}

			this.refs.fieldExpression.focus();
		}
	},


	range: null,


	setRange: function(e) {
		var selection = window.getSelection();
		if (selection.rangeCount > 0) {
			this.range = selection.getRangeAt(0);
		}

		if (e.keyCode && e.keyCode >= 64 && e.keyCode <= 90) {
			e.preventDefault();
			e.stopPropagation();

			var position = $(e.currentTarget).position();
			position.left += 20;
			position.top += $(e.currentTarget).height()+10;
			this.setState({
				columnSearch: {
					defaultValue: String.fromCharCode(e.keyCode).toLowerCase(),
					action: 'pick_metric',
					input: e.currentTarget,
					position: position
				}
			});

		}

	},


	render: function() {
		var updateParent = this.props.updateParent ? this.props.updateParent : '';
		var updateType = this.props.updateType ? this.props.updateType : '';
		var updateLabel = this.props.updateLabel ? this.props.updateLabel : '';

		return (

			(this.props.type == 'div')

			? <div style={{display:'inline-block'}}>
				<div id={this.props.id} key={this.props.name} name={this.props.name} ref="fieldExpression" onClick={this.setRange} onFocus={this.expressionFocus} contentEditable="true" placeholder="click to choose field(s)" onBlur={this.validateExpression} onKeyDown={this.setRange} data-value={this.state.defaultValue} data-update-parent={updateParent} data-update-type={updateType} data-update-label={updateLabel} ></div>

				{
					this.state.columnSearch
					? <ColumnSearch
						action={'pick_' + this.props.field}
						position={this.state.columnSearch.position}
						closeChangeColumn={this.closeColumnSearch}
						save={this.setColumn}
						defaultValue={this.state.columnSearch.defaultValue}
					/>
					: false
				}


			</div>

			: <div style={{display:'inline-block'}}>
				<input id={this.props.id} key={this.props.name} name={this.props.name} ref="fieldExpression" type="text" onFocus={this.startFieldSelection} onBlur={this.blur} defaultValue={this.props.defaultValue || this.props.value} readOnly="true" placeholder="click to choose field" data-update-parent={updateParent} data-update-type={updateType} data-update-label={updateLabel} onClick={this.onClick} />
				<span ref="clearFieldExpression" className={"icon-cancel column-builder-clear-field "+(!this.props.defaultValue && !this.props.value ? 'display-none':'')} onClick={this.clearField}></span>

				{
					this.state.columnSearch
					? <ColumnSearch
						action={this.state.columnSearch.action}
						id={this.state.columnSearch.input.value}
						position={this.state.columnSearch.position}
						closeChangeColumn={this.closeColumnSearch}
						addClass="arrow-up-left"
						save={this.setColumn}
						maskOff="true"
					/>
					: false
				}

			</div>

		);

	}


});
