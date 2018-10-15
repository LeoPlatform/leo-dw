var ReactDom = require('react-dom');;

var React = require('react');

var Filters = require('./views/filters.jsx');
var OptionActions = require("./actions/options.js");
var DataActions = require("./actions/data.js");
var TableView = require('./views/controls/tableView.jsx');

var chartFigure = require("./lib/chartFigure.js");

var Highcharts = require('highcharts');

var charts = [];

var LEO = require("./lib/leo.js");
var self = module.exports = $.extend({}, LEO, {
	init: function(opts) {
		if (opts){
			window.leo = $.extend(true, window.leo || {}, opts);
			window.apiEndpoint = opts.apiEndpoint;
			window.apiKey = undefined;
		}
		doStart();
	},
	initDashboard: function (element, filterBarId) {
		element = $(element);
		var filterBar = $("#" + filterBarId);

		if (!element.length) {
			return;
		}

		if (element.find('#tool-bar').length > 0) {
			element.find(".leo-charts-wrapper").addClass('has-header');
		}

		if (element.find('#leo-viewfilter').length > 0) {
			element.find(".leo-charts-wrapper").addClass('has-footer');
		}

		element.find(".leo-filters").each(function (i, filterSection) {
			var leoGroup = $(filterSection).data("leo-group");
			if (!leoGroup) {
				leoGroup = 'default';
			}

			if ($(filterSection).find(".leo-timeframe").length) {
				OptionActions.setTimeFilter(leoGroup, $(filterSection).find(".leo-timeframe").val());
			}
			if ($(filterSection).find(".leo-timeframe-breakdown").length) {
				OptionActions.setTimeBreakdown(leoGroup, $(filterSection).find(".leo-timeframe-breakdown").val());
			}

			$(filterSection).find(".leo-filter").each(function (i, f) {
				var filter = $(f);
				var label = filter.find("label").remove().text();
				var checkboxes = null;
				var values = [];
				var api = $(f).data('api');
				var isRequired = $(f).data('required') || false;
				var singleValue = $(f).data('single-value') || false;
				var comparison = $(f).data('comparison') || 'in';

				if (filter.find("select").length) {
					checkboxes = {};
					filter.find("select").find("option").each(function (i, o) {
						var option = $(o);
						if (option.attr("selected")) {
							values.push(option.val());
							checkboxes[option.val()] = true;
						} else {
							checkboxes[option.val()] = false;
						}
					});
				}
				OptionActions.setFilter(leoGroup, filter.data("column"), comparison, values, label, checkboxes, api, isRequired, singleValue);
			});

			$(filterSection).remove();
		});

		for(var f in leo.reportFilters){
			var filter = leo.reportFilters[f];
			if (!filter.checkboxes && filter.value){
				filter.checkboxes = {};
				if (typeof filter.value == "string"){
					filter.checkboxes[filter.value] = true;
				} else {
					filter.value.map(f=>filter.checkboxes[f] = true);
				}
			}
			OptionActions.setFilter(filter.group || 'default', filter.id, filter.comparison, filter.value, filter.label, filter.checkboxes, filter.api, filter.isRequired, filter.singleValue, true);
		}

		charts = chartFigure.initAll($(element));

		if (filterBar.length) {
			ReactDom.render(<Filters />, document.getElementById(filterBarId));
		}

		if ($(element).find("#leo-viewfilter").length) {
			var Legend = require('./views/controls/legend.jsx');

			var toggles = [];
			$(element).find("#leo-viewfilter input").each(function (i, input) {
				input = $(input);
				toggles.push({
					name: input.attr('name'),
					checked: input.is(":checked"),
					color: input.inlineStyle('color') || null
				});
			});
			OptionActions.setLegendToggles('default', toggles);
			ReactDom.render(<Legend />, $(element).find("#leo-viewfilter").get(0));
		}
	},

	showDashboard: function (dashboard, params) {
		charts.map(function (chart) {
			chart.destroy();
		});
		DataActions.reset();
		OptionActions.reset();

		$.get(window.leodashboardurl + "dashboards/" + dashboard, function (result) {
			$("#leo-dashboard").html(result.replace(/^[\s\S]*<body[^>]*>/im, "").replace(/<\/body>[\s\S]*$/im, ""));
			module.exports.initDashboard("#leo-dashboard", 'tool-bar');
		});

		$('[data-dashboard].active').removeClass('active');
		$('[data-dashboard="' + dashboard + '"]').addClass('active');
		$('[data-dashboard="' + dashboard + '"]').closest('ul').closest('li').children('a').addClass('active-parent');
	},

	initMenu: function (id) {
		window.onhashchange = function () {
			let [dashboard, params] = location.hash.replace(/^#/, '').split('|');
			self.showDashboard(dashboard, params);
		};

		$('body').on('click', '[data-dashboard]', function (e) {
			e.preventDefault();
			if (window.location.hash == "#" + $(this).data('dashboard')) {
				window.onhashchange();
			} else {
				window.location = "#" + $(this).data('dashboard');
			}
		});

		if (window.location.hash) {
			let [dashboard, params] = window.location.hash.replace(/^#/, '').split('|');
			self.showDashboard(dashboard, params);
		} else {
			$($('nav').find('a')[0]).trigger('click');
		}
	},
    initChart : function(figure, filters){
        return chartFigure.init(figure, filters);
    }

});

/*yepnope1.5.x|WTFPL*/
(function (a, b, c) {
	function d(a) {
		return "[object Function]" == o.call(a)
	}

	function e(a) {
		return "string" == typeof a
	}

	function f() {}

	function g(a) {
		return !a || "loaded" == a || "complete" == a || "uninitialized" == a
	}

	function h() {
		var a = p.shift();
		q = 1, a ? a.t ? m(function () {
			("c" == a.t ? B.injectCss : B.injectJs)(a.s, 0, a.a, a.x, a.e, 1)
		}, 0) : (a(), h()) : q = 0
	}

	function i(a, c, d, e, f, i, j) {
		function k(b) {
			if (!o && g(l.readyState) && (u.r = o = 1, !q && h(), l.onload = l.onreadystatechange = null, b)) {
				"img" != a && m(function () {
					t.removeChild(l)
				}, 50);
				for (var d in y[c]) y[c].hasOwnProperty(d) && y[c][d].onload()
			}
		}
		var j = j || B.errorTimeout,
			l = b.createElement(a),
			o = 0,
			r = 0,
			u = {
				t: d,
				s: c,
				e: f,
				a: i,
				x: j
			};
		1 === y[c] && (r = 1, y[c] = []), "object" == a ? l.data = c : (l.src = c, l.type = a), l.width = l.height = "0", l.onerror = l.onload = l.onreadystatechange = function () {
			k.call(this, r)
		}, p.splice(e, 0, u), "img" != a && (r || 2 === y[c] ? (t.insertBefore(l, s ? null : n), m(k, j)) : y[c].push(l))
	}

	function j(a, b, c, d, f) {
		return q = 0, b = b || "j", e(a) ? i("c" == b ? v : u, a, b, this.i++, c, d, f) : (p.splice(this.i++, 0, a), 1 == p.length && h()), this
	}

	function k() {
		var a = B;
		return a.loader = {
			load: j,
			i: 0
		}, a
	}
	var l = b.documentElement,
		m = a.setTimeout,
		n = b.getElementsByTagName("script")[0],
		o = {}.toString,
		p = [],
		q = 0,
		r = "MozAppearance" in l.style,
		s = r && !!b.createRange().compareNode,
		t = s ? l : n.parentNode,
		l = a.opera && "[object Opera]" == o.call(a.opera),
		l = !!b.attachEvent && !l,
		u = r ? "object" : l ? "script" : "img",
		v = l ? "script" : u,
		w = Array.isArray || function (a) {
			return "[object Array]" == o.call(a)
		},
		x = [],
		y = {},
		z = {
			timeout: function (a, b) {
				return b.length && (a.timeout = b[0]), a
			}
		},
		A, B;
	B = function (a) {
		function b(a) {
			var a = a.split("!"),
				b = x.length,
				c = a.pop(),
				d = a.length,
				c = {
					url: c,
					origUrl: c,
					prefixes: a
				},
				e, f, g;
			for (f = 0; f < d; f++) g = a[f].split("="), (e = z[g.shift()]) && (c = e(c, g));
			for (f = 0; f < b; f++) c = x[f](c);
			return c
		}

		function g(a, e, f, g, h) {
			var i = b(a),
				j = i.autoCallback;
			i.url.split(".").pop().split("?").shift(), i.bypass || (e && (e = d(e) ? e : e[a] || e[g] || e[a.split("/").pop().split("?")[0]]), i.instead ? i.instead(a, e, f, g, h) : (y[i.url] ? i.noexec = !0 : y[i.url] = 1, f.load(i.url, i.forceCSS || !i.forceJS && "css" == i.url.split(".").pop().split("?").shift() ? "c" : c, i.noexec, i.attrs, i.timeout), (d(e) || d(j)) && f.load(function () {
				k(), e && e(i.origUrl, h, g), j && j(i.origUrl, h, g), y[i.url] = 2
			})))
		}

		function h(a, b) {
			function c(a, c) {
				if (a) {
					if (e(a)) c || (j = function () {
						var a = [].slice.call(arguments);
						k.apply(this, a), l()
					}), g(a, j, b, 0, h);
					else if (Object(a) === a)
						for (n in m = function () {
								var b = 0,
									c;
								for (c in a) a.hasOwnProperty(c) && b++;
								return b
							}(), a) a.hasOwnProperty(n) && (!c && !--m && (d(j) ? j = function () {
							var a = [].slice.call(arguments);
							k.apply(this, a), l()
						} : j[n] = function (a) {
							return function () {
								var b = [].slice.call(arguments);
								a && a.apply(this, b), l()
							}
						}(k[n])), g(a[n], j, b, n, h))
				} else !c && l()
			}
			var h = !!a.test,
				i = a.load || a.both,
				j = a.callback || f,
				k = j,
				l = a.complete || f,
				m, n;
			c(h ? a.yep : a.nope, !!i), i && c(i)
		}
		var i, j, l = window.yepnope.loader;
		if (e(a)) g(a, 0, l, 0);
		else if (w(a))
			for (i = 0; i < a.length; i++) j = a[i], e(j) ? g(j, 0, l, 0) : w(j) ? B(j) : Object(j) === j && h(j, l);
		else Object(a) === a && h(a, l)
	}, B.addPrefix = function (a, b) {
		z[a] = b
	}, B.addFilter = function (a) {
		x.push(a)
	}, B.errorTimeout = 1e4, null == b.readyState && b.addEventListener && (b.readyState = "loading", b.addEventListener("DOMContentLoaded", A = function () {
		b.removeEventListener("DOMContentLoaded", A, 0), b.readyState = "complete"
	}, 0)), a.yepnope = k(), a.yepnope.executeStack = h, a.yepnope.injectJs = function (a, c, d, e, i, j) {
		var k = b.createElement("script"),
			l, o, e = e || B.errorTimeout;
		k.src = a;
		for (o in d) k.setAttribute(o, d[o]);
		c = j ? h : c || f, k.onreadystatechange = k.onload = function () {
			!l && g(k.readyState) && (l = 1, c(), k.onload = k.onreadystatechange = null)
		}, m(function () {
			l || (l = 1, c(1))
		}, e), i ? k.onload() : n.parentNode.insertBefore(k, n)
	}, a.yepnope.injectCss = function (a, c, d, e, g, i) {
		var e = b.createElement("link"),
			j, c = i ? h : c || f;
		e.href = a, e.rel = "stylesheet", e.type = "text/css";
		for (j in d) e.setAttribute(j, d[j]);
		g || (n.parentNode.insertBefore(e, n), m(c, 0))
	}
})(window, document);

function doStart() {

	window.Highcharts = Highcharts;

	$("#leo-dashboard").show();

	/*
	// close on mouse out
	hs.Expander.prototype.onMouseOut = function (sender) {
		sender.close();
	};
	// close if mouse is not over on expand (using the internal mouseIsOver property)
	hs.Expander.prototype.onAfterExpand = function (sender) {
		if (!sender.mouseIsOver) sender.close();
	};
	*/

	var DateRangePicker = require('../../static/js/jquery.leo.daterangepicker.js');
	var DateRangePicker = require('../../static/js/vendor/jquery-ui.multidatespicker.js');

	chartFigure.runScripts();

	module.exports.initDashboard("body", 'tool-bar');
	module.exports.initMenu("leo-menu");

	$("body").on({
		click: function (e) {
			var data = $(this).data();
			var checkboxes = JSON.parse(decodeURIComponent(data.checkboxes));
			OptionActions.setFilter(data.group, data.id, data.comparison, data.value, data.label, checkboxes);
		}
	}, '#leoChartDetails header a.leo-addFilter');

	$('body').on({
		click: function (e) {
			var div = $("body #dialog-box");
			if (div.length == 0) {
				div = $('<div id="dialog-box"/>');
				$('body').append(div)
			}
			var params = JSON.parse(decodeURIComponent($(this).data('params')));
			var userClicked = JSON.parse(decodeURIComponent($(this).data('user_clicked')));
			ReactDom.render(<TableView params={params} userClicked={userClicked} />, div.get(0));
		}
	}, '#leoChartDetails header a.leo-tableView');
}

yepnope([{
	load: [
		"__CDN__/css/leo-oem__VERSION__css",
	],
}]);
$(function(){
	$("#leo-dashboard").hide();
})
