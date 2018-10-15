var keyMirror = require('keymirror');

module.exports = {

	ActionTypes: keyMirror({

		//Report
		INIT_REPORT: null,
		REPORT_LOADING: null,
		REPORT_LOADED: null,
		UPDATE_COLUMN: null,
		UPDATE_COLUMN_BY_INDEX: null,
		ADD_DIMENSION: null,
		REMOVE_DIMENSION: null,
		ADD_METRIC: null,
		REMOVE_METRIC: null,
		REMOVE_OTHER_METRICS: null,
		UPDATE_ROW_ORDER: null,
		UPDATE_COLUMN_ORDER: null,
		SWAP_SORT_CONTAINER: null,
		SWAP_ALL_SORT_CONTAINERS: null,
		SWAP_DIMS_IN_SORT_CONTAINERS: null,
		SWAP_METRICS_IN_SORT_CONTAINERS: null,
		SORT: null,
		UPDATE_LIMIT: null,

		//Report Filters
		INIT_REPORT_FILTERS: null,
		ADD_REPORT_FILTER: null,
		REMOVE_REPORT_FILTER: null,
		UPDATE_REPORT_FILTER: null,
		//UPDATE_REPORT_FILTER_VALUE: null,
		//UPDATE_REPORT_RANGE_FILTER_VALUE: null,
		//UPDATE_REPORT_FILTER_OPERATOR: null,

		//Fields
		INIT_FIELDS: null,
		FIND_QUICK_MATCHES: null,
		FIND_COMMON_DIMENSIONS: null,
		FIND_COMMON_FACTS: null,
		MODIFY_FIELD: null,
		ADD_FIELD: null,
		DELETE_FIELD: null,
		MODIFY_FIELD_DESCRIPTION: null,
		MODIFY_FIELD_LABEL: null

	}),

	PayloadSources: keyMirror({
		SERVER_ACTION: null,
		VIEW_ACTION: null
	})

};
