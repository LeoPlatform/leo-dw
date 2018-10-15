var React = require('react');


module.exports = {

	contextTypes: {
		show_dialog: React.PropTypes.func.isRequired,
		close_dialog: React.PropTypes.func.isRequired,
		sendToPivot: React.PropTypes.func.isRequired,
		field_selected: React.PropTypes.func.isRequired,

		show_popup: React.PropTypes.func.isRequired,
		close_popup: React.PropTypes.func.isRequired,

		set_branch_state: React.PropTypes.func.isRequired,
		get_branch_state: React.PropTypes.func.isRequired,

		edit_column: React.PropTypes.func.isRequired,
		date_filter: React.PropTypes.func.isRequired,
		edit_filter: React.PropTypes.func.isRequired
	},


	selectParent: function(field_id, field_label, type, is_date, e) {
		e.stopPropagation();
		if ($(document.body).hasClass('column-builder-picking-parent')) {

			this.context.field_selected({
				type: 'parent',
				id: field_id,
				label: field_label,
				parent: field_id
			});

		} else if ($(document.body).hasClass('column-builder-picking-date') && is_date) {

			this.context.field_selected({
				type: type,
				id: field_id,
				label: field_label,
				parent: field_id
			});

		} else if ($(document.body).hasClass('column-builder-picking-fact') && type == 'metric') {

			this.context.field_selected({
				type: type,
				id: field_id,
				label: field_label,
				parent: field_id
			});

		} else {
			if ($(e.target).is('.branch, .branch>span, .branch>form>span, .branch>form>label')) {
				$(e.target).closest('li').toggleClass('opened closed').children('ul').toggle();
			}
		}
	},


	editFilter: function(e) {
		var id = $(e.target).closest('.optionIcon').data('id');

		//Call the parent to delegate
		this.props.editFilter({
			type: this.props.type,
			id: id
		});

	},


	closeFilter: function(e) {
		//Call the parent to delegate
		this.props.closeFilter();
	},


	selectField: function(field_id, field_label, parent_id, parent_type, sub_type, is_date, expression, e) {
		e.stopPropagation();

		var fieldTarget = $('.column-builder-field-target');

		/*
		//auto set column name
		var column_builder_label = $(fieldTarget.data('update-label'));
		if (column_builder_label && column_builder_label.val() == '') {
			if (column_builder_label.data('update-suffix')) {
				field_label += ' '+$(column_builder_label.data('update-suffix')).text();
			}
			column_builder_label.val(field_label);
		}*/

		//parent auto
		var column_builder_parent = $(fieldTarget.data('update-parent'));
		if (column_builder_parent.is('[type=text]')) {
			column_builder_parent.val(parent_id).next().show();
		}

		//type auto
		var column_builder_parent_type = $(fieldTarget.data('update-type'));
		if (column_builder_parent_type) {
			column_builder_parent_type.val(parent_type);
		}

		this.context.field_selected({
			type: sub_type,
			id: field_id,
			label: field_label,
			parent: parent_id,
			expression: expression
		});

	},


	triggerEdit: function(column_id) {
		this.refs[column_id].toggleEdit();
	},


	lastTimeout: null,

	unsetTimeout: function(which) {
		if (this.lastTimeout) {
			clearTimeout(this.lastTimeout);
			this.lastTimeout = null;
			this.context.close_popup(which);
		}
	},

	showPopup: function(which, args, e) {

		//$('.info-box').hide();

		e.stopPropagation();

		var thisComponent = this;
		var pos = $(e.target).offset();
		if (pos) {
			args.left = pos.left;
			args.top = pos.top;
		}

		if (this.lastTimeout) {
			clearTimeout(this.lastTimeout);
			this.lastTimeout = null;
		}

		this.lastTimeout = setTimeout(function() {
			thisComponent.context.show_popup(
				which,
				args
			)
			thisComponent.lastTimeout = null;
		}, 300)
	},


	toggleBranch: function(branchId, e) {
		e.stopPropagation();
		this.context.set_branch_state(branchId, $(e.target).hasClass('closed'))
		$(e.target).toggleClass('closed');
	},


};
