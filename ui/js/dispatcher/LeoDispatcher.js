var LeoConstants = require('../constants/LeoConstants');
var Dispatcher = require('flux').Dispatcher;
var assign = require('object-assign');

var PayloadSources = LeoConstants.PayloadSources;

var LeoDispatcher = assign(new Dispatcher(), {

	/**
	*	@param {object} action
	*	The details of the action, including the action's type and additional data coming from the server.
	*/
	handleServerAction: function(action) {

		if (typeof action.type !== 'string') throw new Error('action.type must be a string. Make sure your action exists in constants.');

		var payload = {
			source: PayloadSources.SERVER_ACTION,
			action: action
		};

		this.dispatch(payload);

	},

	/**
	*	@param {object} action
	*	The details of the action, including the action's type and additional data coming from the view.
	*/
	handleViewAction: function(action) {

		if (typeof action.type !== 'string') throw new Error('action.type must be a string. Make sure your action exists in constants.');

		var payload = {
			source: PayloadSources.VIEW_ACTION,
			action: action
		};

		this.dispatch(payload);

	}

});

module.exports = LeoDispatcher;
