var WebAPI = require('../utils/WebAPI');
var LeoDispatcher = require('../dispatcher/LeoDispatcher');
var LeoConstants = require('../constants/LeoConstants');
var ActionTypes = LeoConstants.ActionTypes;

module.exports = {

	initFields : function() {

        let redshift = true;

        if ('useredshift' in window) {
            redshift = window.useredshift;
         } else {
            var input = {};
            if (window.location.hash) {
                try {
                    var input = JSON.parse(decodeURI(window.location.hash.slice(1)));
                } catch(e) {
                    try {
                        var input = JSON.parse(window.location.hash.slice(1));
                    } catch(e) {
                    }
                }
            }
            redshift = !input.useMysql;
         };
        WebAPI.get("fields?redshift=" + redshift, function(result) {

			LeoDispatcher.handleServerAction({
				type: ActionTypes.INIT_FIELDS,
				result: result
			});

		});

	},

	findCommonDimensions: function(metrics) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.FIND_COMMON_DIMENSIONS,
			metrics: metrics
		});

	},

	findCommonFacts: function(dims) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.FIND_COMMON_FACTS,
			dims: dims
		});

	},

	findQuickMatches: function(term) {

		LeoDispatcher.handleViewAction({
			type: ActionTypes.FIND_QUICK_MATCHES,
			term: term.toLowerCase()
		});

	},


	addField: function(type, put) {

		WebAPI.post("update_field/calc/", put, function(result) {

			LeoDispatcher.handleServerAction({
				type: ActionTypes.ADD_FIELD,
				result: result,
				put: put,
				fieldType: type
			});

		});

	},


	updateDerivedField: function(id, type, put) {

		WebAPI.post("update_field/calc/", put, function(result) {

			LeoDispatcher.handleServerAction({
				type: ActionTypes.DELETE_FIELD,
				result: result,
				put: put,
				id: id
			});

			LeoDispatcher.handleServerAction({
				type: ActionTypes.ADD_FIELD,
				result: result,
				put: put,
				fieldType: type
			});

		});

	},


	deleteField: function(id, put) {

		WebAPI.post("update_field/calc/", put, function(result) {

			LeoDispatcher.handleServerAction({
				type: ActionTypes.DELETE_FIELD,
				result: result,
				put: put,
				id: id
			});

		});

	},



	updateField: function(type, put) {

		WebAPI.post("update_field/multi/", put, function(result) {

			LeoDispatcher.handleServerAction({
				type: ActionTypes.MODIFY_FIELD,
				result: result,
				put: put,
				fieldType: type
			});

		});

	},


	changeFieldLabel: function(id, value) {

		WebAPI.post("update_field/label", {id: id, label: value}, function(result) {

			LeoDispatcher.handleServerAction({
				type: ActionTypes.MODIFY_FIELD_LABEL,
				result: result
			});

		});

	},

	changeFieldDescription: function(id, description, parent_id) {

		WebAPI.post("update_field/description", { id: id, description: description, parent_id: parent_id }, function(result) {

			LeoDispatcher.handleServerAction({
				type: ActionTypes.MODIFY_FIELD_DESCRIPTION,
				result: result
			});

		});

	}

}
