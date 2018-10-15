import React, { Component } from 'react'
import ReactDOM from 'react-dom';
import "../static/js/dialogs.js";
import { Provider } from 'mobx-react'
import DataStore from '../../stores/dataStore.js';
import App from "./views/main.jsx";

const dataStore = new DataStore();
require("../css/DataExplorer.less");

ReactDOM.render(
	<Provider dataStore={dataStore}>
		<App />
	</Provider>,
	document.getElementById('main')
);
