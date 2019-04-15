var read_cookie = function (name, dfault) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
	}
	return dfault;
};

var url_params = {};
try {
	var mysearch = window.parent.location.search.replace("?", "").split("&");
} catch (e) {
	var mysearch = '';
}
for (var i in mysearch) {
	if (mysearch[i] && mysearch[i].split) { //fixes a weird bug with a unique value on all objects
		var myParam = mysearch[i].split("=");
		if (myParam.length >= 1) {
			url_params[myParam[0]] = myParam[1];
		}
	}
}

module.exports = {
	apiEndpoint: "api/",
	liveVersion: '.1.10.1.',
	apiKey: '' || url_params['key'] || read_cookie('key')
};
