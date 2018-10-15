var React = require('react');

var chartFigure = require("../../../dashboard/js/lib/chartFigure.js");

var Wizard = require("./wizard.jsx");
var Clone = require("./clone.jsx");
var ReportLibrary = require('../common/ReportLibrary.jsx')
var ExternalCodeEditors = require('../common/ExternalCodeEditors.jsx')
var Filters = require('../report/filters.jsx')
var PortalAdvancedSettings = require('./portalAdvancedSettings.jsx')
var PortalList = require('./portalList.jsx')
var Themes = require('../common/themes.jsx')
var CopyToClipboard = require('../common/copyToClipboard.jsx')
var WebAPI = require('../../utils/WebAPI');

var MessageList = require('../common/messageList.jsx')

module.exports = React.createClass({

	codeMirrorJSONOptions: {
		mode:  { name: "javascript", json: true },
		lineWrapping: true,
		lineNumbers: true,
		indentWithTabs: true,
		matchBrackets: true,
		autoCloseBrackets: true,
		theme: 'eclipse',
		gutters: ["CodeMirror-lint-markers"],
		lint: true,
		//autofocus: true
	},

	codeMirrorJavascriptOptions: {
		mode:  { name: "javascript", json: false },
		lineWrapping: true,
		lineNumbers: true,
		indentWithTabs: true,
		matchBrackets: true,
		autoCloseBrackets: true,
		theme: 'eclipse',
		gutters: ["CodeMirror-lint-markers"],
		lint: true,
		//autofocus: true
	},

	codeMirrorHTMLOptions: {
		mode: 'text/html',
		lineWrapping: true,
		lineNumbers: true,
		indentWithTabs: true,
		matchBrackets: true,
		//autoCloseBrackets: true,
		theme: 'eclipse',
		gutters: ["CodeMirror-lint-markers"],
		lint: true,
		//autofocus: true
	},

	codeMirrorInstance: {},


	versions: {
		major: undefined,
		minor: undefined
	},

	lastMinorVersion: Date.now(),


	getInitialState: function() {


		$(window).resize(() => {

			var isFullscreen = !!(
				document.fullscreen || document.fullscreenElement
				|| document.webkitIsFullScreen, document.webkitFullscreenElement
				|| document.mozFullScreen || document.mozFullScreenElement
				|| document.msFullscreenElement
				|| (window.innerHeight == screen.height)
			)

			$('body').toggleClass('full-screen', isFullscreen)

			if (window.dashboardRotateInterval) {
				clearTimeout(window.dashboardRotateInterval)
				window.dashboardRotateInterval = undefined
			}

			if (isFullscreen) {
				window.dashboardRotateInterval = setInterval(() => {
					var nextId, found = false
					this.state.portal.navigation.forEach((navigation) => {
						if (found && !nextId) {
							nextId = navigation.id
						}
						if (navigation.id == this.state.dashboard.id) {
							found = true
						}
						navigation.children.forEach((child) => {
							if (found && !nextId) {
								nextId = child.id
							}
							if (child.id == this.state.dashboard.id) {
								found = true
							}
						})
					})
					if (!nextId) {
						nextId = this.state.portal.navigation[0].id
					}
					if (nextId) {
						this.switchDashboards(nextId)
					}
				}, 60000)
			}

		})


		Math.reduce = function(numerator, denominator) {
			var gcd = function gcd(a,b) { return b ? gcd(b, a%b) : a; };
			gcd = gcd(numerator,denominator);
			return [numerator/gcd, denominator/gcd];
		};

		var thisComponent = this;

		var portalId = this.props.portal;

		if (portalId == 'leo-testing') {
			localStorage.setItem('leo-testing', true)
		}

		WebAPI.get('portals/'+portalId, (portal) => {

			if (portal.dashboards) { //retro fit

				console.log('retro fitting')

				//save each dashboard separately
				var dashboards = JSON.parse(portal.dashboards)
				var filters = JSON.parse(portal.filters || '{}')
				var scripts = JSON.parse(portal.scripts || '{}')

				for(var name in dashboards) {
					var dashboard = {
						id: name,
						name: name,
						layout: dashboards[name] || [],
						filters: filters[name] || [],
						script: scripts[name] || '',
					}
					this.saveDashboard(dashboard)
				}

				//save portal separately
				var nav = JSON.parse(portal.nav)
					,navigation = []

				for(var name in nav) {
					var children = []
					nav[name].forEach(function(child) {
						children.push({
							id: child,
							name: child
						})
					})

					navigation.push({
						id: name,
						name: name,
						children: children
					})
				}

				portal = {
					id: portal.name,
					name: portal.name,
					navigation: navigation || [],
					script: portal.script || ''
				}

				this.savePortal(portal)

			} //end retro fit

			if (portal.script) {
				$('head').append(
					$('<script />').attr('type', 'text/javascript').attr('id', 'portal-script').text(
						"; try { " + portal.script + " } catch(e) { console.log('Error running dashboard script: ' + e) }; "
					)
				)
			}

			this.setState({
				portal: portal
			}, () => {
				//get first dashboard
				var dashboardId = null
				if (portal.navigation) {
					if (document.location.hash) {
						var hash = decodeURIComponent(document.location.hash.slice(1))
						//verify it
						portal.navigation.forEach((navigation) => {
							if (navigation.id == hash || navigation.name == hash && !dashboardId) {
								dashboardId = navigation.id
							} else if (!dashboardId) {
								navigation.children.forEach((child) => {
									if ((child.id == hash || (navigation.name + '|' + child.name) == hash) && !dashboardId) {
										dashboardId = child.id
									}
								})
							}
						})

						if (dashboard) {
							dashboardId = dashboard.id
						}
					}
					if (!dashboardId) {
						dashboardId = portal.navigation[0].id
					}
				}

				this.switchDashboards(dashboardId, null)
			})

		})

		return {
			portal: { id: '', name: '', navigation: [] },
			dashboard: {},
			dialog: false,
			code: '',
			filters: [],

			editMode: false
		}
	},


	componentDidMount: function() {
		var thisComponent = this;

		/* sorting nav */

		$('#sort-navigation').sortable({
			items: 'li:not(.add-overview)',
			handle: '.sort-handle',
			axis: 'y',
			placeholder: 'sortable-placeholder',
			opacity: 0.7,
			helper: "clone",
			forceHelperSize: true,
			forcePlaceholderSize: true,
			cancel: '.add-dashboard,.add-overview',
			stop: function(event, ui) {
				var navigation = [];
				$('#sort-navigation > li[data-navigation-id]').each(function() {
					var children = []
					$(this).find('li[data-navigation-id]').each(function() {
						children.push({
							id: $(this).data('navigation-id'),
							name: $(this).children('a').text()
						});
					});
					navigation.push({
						id: $(this).data('navigation-id'),
						name: $(this).children('a').text(),
						children: children
					})
				})
				$('#sort-navigation').sortable('cancel')
				var portal = thisComponent.state.portal
				portal.navigation = navigation
				thisComponent.setState({ portal: portal }, function() {
					thisComponent.savePortal(portal)
				});
			}
		});


		/* hovers */

		$('#leo-dashboard article').on({
			mouseover: function() {

				var inController = ($(this).closest('.leo-charts-controller').length > 0);

				if ($(this).find('.hover-menu').length == 0) {

					var threshold = thisComponent.state.editMode ? 250 : 90
					var offset = $(this).offset()
					var position = ((window.innerHeight - offset.top) < threshold ? 'position-above' : '')
						+ ((offset.left + $(this).width()) < 350 ? ' position-left' : '')

					if (thisComponent.state.editMode) {

						var verb = (!$(this).hasClass('leo-chart') && !$(this).hasClass('leo-html')) ? 'Add' : 'Edit'
						var size = $(this).data('size')

						$(this).append(
							$('<div class="hover-menu chart-hover ' + position + '"/>').append(
								'<div> <i class="icon-ellipsis-vert fixed-width-icon" /> </div>',
								`<ul>
									<li><a class="editChart"><i class="icon-edit fixed-width-icon" /> ` + verb + ` chart</a></li>

									<li><a class="split-left"><i class="icon-left-dir fixed-width-icon" /> Split, insert left</a></li>
									<li><a class="split-right"><i class="icon-right-dir fixed-width-icon" /> Split, insert right</a></li>
									<li><a class="split-up"><i class="icon-up-dir fixed-width-icon" /> Split, insert above</a></li>
									<li><a class="split-down"><i class="icon-down-dir fixed-width-icon" /> Split, insert below</a></li>

									<li><a class="swapCharts"><i class="icon-exchange fixed-width-icon" /> Swap charts</a></li>

									<li class="block-size">Dimensions: ` + size + `</li>
								</ul>`
							)
						)

					} else {

						var buttons = ''
						switch($.trim($(this).children('div').attr('class'))) {
							case 'data-table-wrapper':
							case 'simple-table-wrapper':
							case 'leo-ranked-chart':
							case 'google-map-wrapper':
							case 'highcharts-container':
								buttons = '<li><a class="downloadCSV"><i class="icon-download fixed-width-icon" /> Download CSV </a></li>'
								buttons += '<li><a class="openInDataExplorer" target="_blank"><i class="icon-layers fixed-width-icon" /> Open in Data Explorer </a></li>'
								buttons += '<li><a class="openInVisualExplorer" target="_blank"><i class="icon-chart-line fixed-width-icon" /> Open in Visual Explorer </a></li>'
							break

							case 'leo-single-number':
							case 'filter-bar':
							default:
								//console.log('class', $(this).children('div').attr('class'))
							break
						}

						if (buttons) {
							$(this).append(
								$('<div class="hover-menu chart-hover ' + position + '"/>').append(
									'<div> <i class="icon-ellipsis-vert fixed-width-icon" /> </div>',
									`<ul>`+buttons+`</ul>`
								)
							)
						}

					}
				}

			},
			mouseleave: function() {
				$(this).find('.hover-menu').remove();
			}
		}, 'figure');


		var hrTimeout = 0;

		$('#leo-dashboard article').on({
			mouseover: function() {
				var mergeResize = $(this).find('.merge-resize');
				mergeResize.parent().parent().addClass('dashed-border');
				if (mergeResize.length == 0) {
					if ($('.merge-resize').length > 0) {
						$('.merge-resize').remove();
					}
					var swap = $('<div/>').append('<div> <a class="swapBlocks">swap <i class="icon-exchange"/></a> </div>');
					if ($(this).hasClass('vertical')) {
						var merge = $('<div/>').append('<div> <a class="merge-horizontally">merge <i class="icon-right-dir"><b class="icon-left-dir"/></i></a> </div>');
						var resize = $('<div/>').append('<div> <a><i class="resize-left icon-left-dir"></i> <span class="resize-horizontally">resize</span> <i class="resize-right icon-right-dir"></i></a> </div>');
					} else {
						var merge = $('<div/>').append('<div> <a class="merge-vertically">merge <i class="icon-down-dir"><b class="icon-up-dir"/></i></a> </div>')
						var resize = $('<div/>').append('<div> <a><i class="resize-up icon-up-dir"></i> <span class="resize-vertically">resize</span> <i class="resize-down icon-down-dir"></i></a> </div>')
					}
					$(this).append($('<div />').addClass('merge-resize').addClass('chart-hover').append(merge,resize,swap));

					if ($(this).hasClass('vertical')) {

						$('.merge-resize').draggable({
							axis: 'x',
							handle: '.resize-horizontally',
							containment: '.dashed-border',
							drag: function(event, ui) {
								var hr = ui.helper.closest('hr');
								var wrapper = hr.parent();
								var prev = hr.prev(),
									next = hr.next(),
									prevSize = thisComponent.getClasses(prev),
									nextSize = thisComponent.getClasses(next),
									ratio = Math.round(((ui.position.left + prev.width()) / wrapper.width()) * 12),
									p = prevSize.width,
									n = nextSize.width
								;

								p[1]*= (12/p[2]);	p[2]*= (12/p[2]); 	n[1]*= (12/n[2]);	n[2]*= (12/n[2]);

								var avail = (p[1] + n[1]);

								if (0 < ratio && ratio < avail) {
									var p = [ 'width', ratio, 12  ];
									var n = [ 'width', (avail - ratio), 12 ];

									var r = Math.reduce(p[1], p[2]);
									p[1] = r[0]; p[2] = r[1];
									var r = Math.reduce(n[1], n[2]);
									n[1] = r[0]; n[2] = r[1];

									prev.removeClass(prevSize.widthClass).addClass(p.join('-'));
									next.removeClass(nextSize.widthClass).addClass(n.join('-'));
								}
								$('.dashed-border').removeClass('.dashed-border');
							},
							stop: function() {
								$('figure').each(function() {
									thisComponent.calcSize($(this))
								})
								thisComponent.saveDashboard()
								thisComponent.chartsReflow();
							}
						});

					} else {

						$('.merge-resize').draggable({
							axis: 'y',
							handle: '.resize-vertically',
							containment: '.dashed-border',
							drag: function(event, ui) {
								var hr = ui.helper.closest('hr');
								var wrapper = hr.parent();
								var prev = hr.prev(),
									next = hr.next(),
									prevSize = thisComponent.getClasses(prev),
									nextSize = thisComponent.getClasses(next),
									ratio = Math.round(((ui.position.top + prev.height()) / wrapper.height()) * 12)
									p = prevSize.height,
									n = nextSize.height
								;

								p[1]*= (12/p[2]);	p[2]*= (12/p[2]); 	n[1]*= (12/n[2]);	n[2]*= (12/n[2]);

								var avail = (p[1] + n[1]);

								if (0 < ratio && ratio < avail) {
									var p = [ 'height', ratio, 12  ];
									var n = [ 'height', (avail - ratio), 12 ];

									var r = Math.reduce(p[1], p[2]);
									p[1] = r[0]; p[2] = r[1];
									var r = Math.reduce(n[1], n[2]);
									n[1] = r[0]; n[2] = r[1];

									prev.removeClass(prevSize.heightClass).addClass(p.join('-'));
									next.removeClass(nextSize.heightClass).addClass(n.join('-'));
								}
								$('.dashed-border').removeClass('dashed-border');
							},
							stop: function() {
								$('figure').each(function() {
									thisComponent.calcSize($(this))
								})
								thisComponent.saveDashboard()
								thisComponent.chartsReflow();
							}
						});

					}

				} else if (hrTimeout) {
					clearTimeout(hrTimeout);
					hrTimeout = 0;
				}
			},
			mouseleave: function() {
				var mergeResize = $(this).find('.merge-resize');
				hrTimeout = setTimeout(function() {
					$('.dashed-border').removeClass('dashed-border');
					mergeResize.remove();
				}, 200);
			}
		}, 'hr');


		/* click actions */

		$('#leo-dashboard article').on('click', '.controller-toggle', function() {
			var figure = $(this).closest('figure');
			if (figure.parent().hasClass('leo-charts-controller')) {
				//turn off
				var controller = figure.parent();
				var classes = thisComponent.getClasses(controller);
				figure.removeClass('width-1-1').removeClass('height-1-1').addClass(classes.widthClass).addClass(classes.heightClass);
				figure.prev('header').remove();
				figure.unwrap();
			} else {
				var classes = thisComponent.getClasses(figure);
				figure.wrap($('<div class="leo-charts-controller" />').addClass(classes.widthClass).addClass(classes.heightClass));
				figure.removeClass(classes.widthClass).removeClass(classes.heightClass).addClass('width-1-1').addClass('height-1-1');
				figure.before('<header id="tool-bar"/>');
			}
			$(this).remove();
			thisComponent.saveDashboard()
		});


		$('#leo-dashboard article').on('click', '.swapCharts, .swapBlocks', function() {

			if ($(this).closest('.leo-charts-controller').length > 0) {
				$(this).closest('.leo-charts-controller').toggleClass('swap-widgets'); //controller
			} else if ($(this).hasClass('swapCharts')) {
				$(this).closest('figure').toggleClass('swap-widgets'); //figure
			} else {
				$(this).closest('hr').parent().toggleClass('swap-widgets'); //div
			}

			var swapWidgets = $('.swap-widgets');
			if (swapWidgets.length == 2) {

				swapWidgets.removeClass('swap-widgets');

				if ($.contains(swapWidgets[0], swapWidgets[1]) || $.contains(swapWidgets[1], swapWidgets[0]) ) {
					window.messageModal('Cannot swap a child widget with its parent');
					return false;
				}

				if (swapWidgets.first().hasClass('leo-charts-controller')) {
					swapWidgets.first().removeClass('leo-charts-controller');
					swapWidgets.last().addClass('leo-charts-controller');
				} else if (swapWidgets.last().hasClass('leo-charts-controller')) {
					swapWidgets.last().removeClass('leo-charts-controller');
					swapWidgets.first().addClass('leo-charts-controller');
				}

				var temp = [
					{ className: swapWidgets.last().attr('class') },
					{ className: swapWidgets.first().attr('class') }
				];

				if (swapWidgets.first()[0].tagName == 'FIGURE') {
					temp[0].script = swapWidgets.first().attr('data-script') || '';
					temp[0].html = swapWidgets.first().attr('data-html') || '';
				} else {
					temp[0].children = swapWidgets.first().children();
				}

				if (swapWidgets.last()[0].tagName == 'FIGURE') {
					temp[1].script = swapWidgets.last().attr('data-script') || '';
					temp[1].html = swapWidgets.last().attr('data-html') || '';
				} else {
					temp[1].children = swapWidgets.last().children();
				}

				thisComponent.chartDestroy(swapWidgets.first());
				thisComponent.chartDestroy(swapWidgets.last());

				if (temp[0].children) {
					swapWidgets.last().replaceWith($('<div />').attr('class', temp[0].className).append(temp[0].children));
				} else if (temp[0].script) {
					var replacement = $('<figure />').attr('class', temp[0].className).html('<script type="text\/x-leo-chart">' + JSON.parse(temp[0].script) + '<\/script>').removeClass('leo-html').addClass('leo-chart');
					swapWidgets.last().replaceWith(replacement);
					thisComponent.charts.push(chartFigure.init(replacement, thisComponent.state.filters));
				} else if (temp[0].html) {
					var replacement = $('<figure />').attr('class', temp[0].className).html(temp[0].html).removeClass('leo-chart').addClass('leo-html');
					swapWidgets.last().replaceWith(replacement);
					thisComponent.charts.push(chartFigure.init(replacement, thisComponent.state.filters));
				} else {
					swapWidgets.last().replaceWith($('<figure />').attr('class', temp[0].className).empty().removeClass('leo-html leo-chart').removeAttr('data-script').removeAttr('data-html'));
				}

				if (temp[1].children) {
					swapWidgets.first().replaceWith($('<div />').attr('class', temp[1].className).append(temp[1].children));
				} else if (temp[1].script) {
					var replacement = $('<figure />').attr('class', temp[1].className).html('<script type="text\/x-leo-chart">' + JSON.parse(temp[1].script) + '<\/script>').removeClass('leo-html').addClass('leo-chart');
					swapWidgets.first().replaceWith(replacement);
					thisComponent.charts.push(chartFigure.init(replacement, thisComponent.state.filters));
				} else if (temp[1].html) {
					var replacement = $('<figure />').attr('class', temp[1].className).html(temp[1].html).removeClass('leo-chart').addClass('leo-html');
					swapWidgets.first().replaceWith(replacement);
					thisComponent.charts.push(chartFigure.init(replacement, thisComponent.state.filters));
				} else {
					swapWidgets.first().replaceWith($('<figure />').attr('class', temp[1].className).empty().removeClass('leo-html leo-chart').removeAttr('data-script').removeAttr('data-html'));
				}
				thisComponent.saveDashboard()

				$('figure').each(function() {
					thisComponent.calcSize($(this));
				});
			}

		});


		$('#leo-dashboard article').on('click', '.editChart', function() {
			var figure = $(this).closest('figure');
			thisComponent.setState({
				figure: figure, dialog: 'wizard'
			})
		})


		$('#leo-dashboard article').on('click', '.downloadCSV', function() {
			var guid = $(this).closest('figure').data('guid')
			var chart = false
			thisComponent.charts.forEach(function(temp) {
				if (temp.guid == guid) {
					chart = temp
				}
			})
			chart && chart.startDownload && chart.startDownload()
		})


		$('#leo-dashboard article').on('mousedown', '.openInDataExplorer, .openInVisualExplorer', function() {
			var location = $(this).hasClass('openInDataExplorer') ? 'builder#' : 'chart#'
			var script = $(this).closest('figure').data('script')
			while(typeof script == 'string') {
				script = JSON.parse(script)
			}
			if (script.columns && !script.dimensions) {
				script.dimensions = script.columns
				delete script.columns
			}
			if (script.metric && !script.metrics) {
				script.metrics = [script.metric]
				delete script.metric
			}
			if (script.country) {
				script.dimensions = [
					script.country,
					script.state
				]
			}

			if (window.parent.dashboardFilters) {
				script.filters = (script.filters || []).concat(
					window.parent.dashboardFilters.filter((dashboardFilter) => {
						return !(script.filters || []).some((filter) => {
							return dashboardFilter.id == filter.id
						})
					})
				)
			}

			$(this).attr('href', location + JSON.stringify(script))
		})


		$('#leo-dashboard article').on('click', '.resize-left, .resize-right, .resize-up, .resize-down', function() {
			var hr = $(this).closest('hr'),
				prev = hr.prev(),
				next = hr.next(),
				prevSize = thisComponent.getClasses(prev),
				nextSize = thisComponent.getClasses(next),
				resize = thisComponent.getClasses($(this)).resize
			if (resize == 'left' || resize == 'right') {
				var p = prevSize.width, n = nextSize.width;
			} else {
				var p = prevSize.height, n = nextSize.height;
			}

			p[1]*= (12/p[2]);	p[2]*= (12/p[2]); 	n[1]*= (12/n[2]);	n[2]*= (12/n[2]);

			if (resize == 'left' || resize == 'up') {
				p[1]--; n[1]++;
			} else {
				p[1]++; n[1]--;
			}

			if (0 < p[1] && p[1] < 12) {

				var r = Math.reduce(p[1], p[2]);
				p[1] = r[0]; p[2] = r[1];
				var r = Math.reduce(n[1], n[2]);
				n[1] = r[0]; n[2] = r[1];

				if (resize == 'left' || resize == 'right') {
					prev.removeClass(prevSize.widthClass).addClass(p.join('-'));
					next.removeClass(nextSize.widthClass).addClass(n.join('-'));
				} else {
					prev.removeClass(prevSize.heightClass).addClass(p.join('-'));
					next.removeClass(nextSize.heightClass).addClass(n.join('-'));
				}
			}

			$('figure').each(function() {
				thisComponent.calcSize($(this))
			})
			thisComponent.saveDashboard()
			thisComponent.chartsReflow();
		});


		$('#leo-dashboard article').on('click', '.split-right, .split-left, .split-up, .split-down', function() {
			var figure = $(this).closest('figure');
			var classes = thisComponent.getClasses(figure);
			var split = thisComponent.getClasses($(this)).split;
			var property = (split == 'left' || split == 'right') ? 'width' : 'height';
			var where = (split == 'left' || split == 'up') ? 'before' : 'after';

			figure.wrap($('<div/>').addClass(classes.widthClass).addClass(classes.heightClass));
			figure.removeClass(classes.widthClass).removeClass(classes.heightClass);
			figure.find('.split').remove();
			if (property == 'width') {
				figure.addClass('width-1-2').addClass('height-1-1');
			} else {
				figure.addClass('width-1-1').addClass('height-1-2');
			}
			if (where == 'after') {
				figure.after(figure.clone().html('').removeAttr('data-script').removeAttr('data-html').removeClass('leo-chart leo-html active'));
				figure.after($('<hr/>').addClass(property=='width'?'vertical':'horizontal'));
			} else {
				figure.before(figure.clone().html('').removeAttr('data-script').removeAttr('data-html').removeClass('leo-chart leo-html active'));
				figure.before($('<hr/>').addClass(property=='width'?'vertical':'horizontal'));
			}
			$('figure').each(function() {
				thisComponent.calcSize($(this))
			})
			thisComponent.saveDashboard()
			thisComponent.chartsReflow();
		});


		$('#leo-dashboard article').on('click', '.merge-vertically, .merge-horizontally', function() {
			var div = $(this).closest('hr').parent();
			var classes = thisComponent.getClasses(div);
			var figure = div.find('figure:not(:empty)');
			switch(figure.length) {
				case 0:
					figure = div.find('figure').first();
				break;

				case 1:
					//good to go
				break;

				default:
					window.messageModal('Merge would destroy charts.');
					return false;
				break;
			}
			figure.prop('class', classes.widthClass+' '+classes.heightClass);
			if (div[0].tagName != 'DIV') { //article
				div.empty().append(figure).css({outline:''});
			} else {
				div.replaceWith(figure);
			}
			$('figure').each(function() {
				thisComponent.calcSize($(this))
			})
			thisComponent.saveDashboard()
			thisComponent.chartsReflow();
		});

	},


	componentDidUpdate: function() {
		$('.edit-link').focus().select();
	},


	chartDestroy: function(figure) {
		this.charts = this.charts.filter(function(chart) {
			if (chart.guid == figure.data('guid')) {
				try {
					chart.destroy(true)
				} catch(e) {}
				return false
			}
			return true
		})
	},


	chartsReflow: function() {
		for(var i=0;i<this.charts.length;i++) {
			if (this.charts[i] && this.charts[i].reflow) {
				this.charts[i].reflow();
			}
		}
	},


	calcSize: function(figure) {
		var classes = this.getClasses(figure);
		var width = classes.widthRatio;
		var height = classes.heightRatio;
		var parent = figure.parent();
		while(parent[0].tagName != 'ARTICLE' && parent[0].tagName != 'BODY') {
			classes = this.getClasses(parent);
			width *= classes.widthRatio;
			height *= classes.heightRatio;
			parent = parent.parent();
		}
		figure.attr('data-size', Math.round(width*100) + '% x ' + Math.round(height*100) + '%');
	},


	getClasses: function(el) {
		var classes = {
			widthClass: 'width-1-1',
			heightClass: 'height-1-1',
			width: ['width',12,12],
			height: ['height',12,12]
		};
		if (el.prop('class')) {
			el.prop('class').split(' ').forEach(function(className) {
				if (className.slice(0, 6) == 'width-') {
					classes.widthClass = className;
					classes.width = className.split('-');
					classes.widthRatio = classes.width[1] / classes.width[2];
				}
				if (className.slice(0, 7) == 'height-') {
					classes.heightClass = className;
					classes.height = className.split('-');
					classes.heightRatio = classes.height[1] / classes.height[2];
				}
				if (className.slice(0, 6) == 'split-') {
					classes.splitClass = className;
					classes.split = className.split('-')[1];
				}
				if (className.slice(0, 7) == 'resize-') {
					classes.resize = className.split('-')[1];
				}
				if (className == 'leo-charts-controller') {
					classes.controller = className
				}
			});
		}
		return classes;
	},


	initWidgets: function() {

		window.dashboardFilters = []

		var thisComponent = this, wrapper = null, rowWidth = 0, rowHeight = 0, lastChild = null, wrapperWidthRatio = 0;

		$('#leo-dashboard article').children().each(function() {
			var classes = thisComponent.getClasses($(this));
			if ((rowWidth + classes.widthRatio) > 1) {
				if (wrapper) {
					var hr = $('<hr class="horizontal"/>');
					wrapper.after(hr);
					lastChild = hr;
				} else if (lastChild) {
					var hr = $('<hr class="horizontal"/>');
					lastChild.after(hr);
					lastChild = hr;
				}
				wrapper = null;
				rowWidth = 0;
			}

			if (rowHeight != classes.heightRatio) {
				if (wrapper) {
					wrapper.removeClass(thisComponent.getClasses(wrapper).widthClass).addClass('width-1-'+Math.floor(rowWidth*10));
					wrapper.children().each(function() {
						$(this).removeClass(thisComponent.getClasses($(this)).widthClass).addClass('width-1-1');
					})
					lastChild = wrapper;
				}
				wrapper = null;
				rowHeight = classes.heightRatio;
			}

			if (this.tagName == 'FIGURE') {
				if (!wrapper) {
					wrapperWidthRatio = (1 - rowWidth);
					var fraction = Math.reduce(Math.floor(wrapperWidthRatio*12), 12);
					wrapper = $('<div class="width-'+fraction[0]+'-'+fraction[1]+'" />').addClass(classes.heightClass);
					if (lastChild) {
						lastChild.after(wrapper);
					} else {
						$('#leo-dashboard article').prepend(wrapper);
					}
				} else {
					wrapper.append('<hr class="vertical"/>')
				}
				$(this).removeClass(classes.heightClass).addClass('height-1-1');
				if (wrapperWidthRatio != 1) {
					$(this).removeClass(classes.widthClass).addClass('width-1-'+Math.floor(wrapperWidthRatio / classes.widthRatio));
				}
				$(this).appendTo(wrapper);
			} else if (this.tagName == 'DIV') {
				$(this).find('div:not(:last-child), figure:not(:last-child)').each(function() {
					if (thisComponent.getClasses($(this).prev()).widthRatio == 1 || thisComponent.getClasses($(this).next()).widthRatio == 1) {
						$(this).after('<hr class="horizontal"/>');
					} else {
						$(this).after('<hr class="vertical"/>');
					}
				});
			}
			rowWidth += classes.widthRatio;
			lastChild = $(this);
		});


		$('figure').each(function() {
			thisComponent.calcSize($(this));
		});
	},


	savePortal: function(portal) {
		WebAPI.put('portals/'+portal.id, portal, () => {})
	},


	saveDashboard: function(dashboard, callback) {
		if (!dashboard) {
			/* remove extraneous wrappers */
			$('#leo-dashboard article').find('div[class="width-1-1 height-1-1"]').each(function(one) {
				if ($(this).children().length == 1) {
					$(this).children().unwrap();
				}
			})
			dashboard = this.state.dashboard;
			dashboard.layout = this.htmlToJSON();
		}

		if ((Date.now() - this.lastMinorVersion) > (5 * 60 * 1000)) {
			this.versions.minor = undefined
			this.lastMinorVersion = Date.now()
		}

		dashboard.versions = this.versions

		WebAPI.put('dashboard/'+dashboard.id, dashboard, (response) => {
			this.versions = response.versions
			callback && callback()
		})
	},


	htmlToJSON: function(element) {
		var thisComponent = this;
		var widgets = [];
		var parent = element || $('#leo-dashboard article');
		parent.children().not('hr').each(function() {
			var classes = thisComponent.getClasses($(this));
			var widget = {
				width: classes.widthClass,
				height: classes.heightClass,
				controller: classes.controller
			};
			if ($(this)[0].tagName == 'FIGURE') {
				widget.figure = $(this).attr('data-html') || $(this).attr('data-script') || {}
			} else if ($(this)[0].tagName == 'HEADER') {
				widget.header = $(this).attr('id') || '';
			} else if ($(this).children().length > 0) {
				widget.widgets = thisComponent.htmlToJSON($(this));
			}
			widgets.push(widget);
		});
		return widgets
	},


	charts: [],

	jsonToHTML: function(widgets, element) {
		var thisComponent = this;

		if (!element) {
			chartFigure.destroyAll(thisComponent.charts);
		}

		var parent = element || $('#leo-dashboard article');
		parent.empty();
		for(var i in widgets) {
			if (widgets[i].figure) {
				var tag = 'figure'
			} else if (widgets[i].header) {
				var tag = 'header'
			} else {
				var tag = 'div'
			}
			var widget = $('<'+tag+'/>').addClass(widgets[i].width).addClass(widgets[i].height).addClass(widgets[i].controller).attr('id', widgets[i].header);
			parent.append(widget);
			if (widgets[i].widgets) {
				this.jsonToHTML(widgets[i].widgets, widget);
			}
			if (widgets[i].figure && !$.isEmptyObject(widgets[i].figure)) {
				try {
					var script = $('<script type="text\/x-leo-chart" />').text(JSON.parse(widgets[i].figure));
					widget.append(script).addClass('leo-chart');
				} catch(e) {
					var html = widgets[i].figure;
					widget.html(html).addClass('leo-html');
				}
			}
		}

		if (!element) {
			if ($('#leo-dashboard article').children().length == 0) {
				$('#leo-dashboard article').append('<figure class="width-1-1 height-1-1"/>')
			}
			setTimeout(function() {
				thisComponent.charts = thisComponent.charts.concat(chartFigure.initAll($('#leo-dashboard > article'), thisComponent.state.filters))
			}, 100)
		}
	},


	generateUUID: function() {
		var d = new Date().getTime();
		if (window.performance && typeof window.performance.now === "function"){
			d += performance.now(); //use high-precision timer if available
		}
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});
		return uuid;
	},


	addDashboard: function(parentId, e) {
		var thisComponent = this;

		var templates = [
			[1],
			[[1,[1,1]]],
			[[1,1,1],[1,1]],
			[[1,1,1],[1,1],[1,1]]
		];

		var ts = $('<article />').addClass('template-list');

		templates.map(function(template, i) {
			var t = $('<div/>');
			for(var j=0;j<template.length;j++) {
				var width = 1;
				var height = template.length;
				var tag = (typeof template[j] == 'number' ? 'figure' : 'div');
				var t2 = $('<'+tag+'/>').addClass('width-1-'+width).addClass('height-1-'+height);
				for(var k=0;k<template[j].length;k++) {
					var width = (typeof template[j] == 'number' ? 1 : template[j].length);
					var height = 1;
					var tag = (typeof template[j][k] == 'number' ? 'figure' : 'div');
					var t3 = $('<'+tag+'/>').addClass('width-1-'+width).addClass('height-1-'+height);
					for(var l=0;l<template[j][k].length;l++) {
						var width = 1;
						var height = (typeof template[j][k] == 'number' ? 1 : template[j][k].length);
						var tag = (typeof template[j][k][l] == 'number' ? 'figure' : 'div');
						var t4 = $('<'+tag+'/>').addClass('width-1-'+width).addClass('height-1-'+height);
						t3.append(t4);
					}
					t2.append(t3);
				}
				t.append(t2);
			}
			ts.append($('<label></label>').append('<input type="radio" name="template" value="'+i+'" '+(i==0?'checked':'')+'/>').append(t));
		})


		var dialogContent = $('<div></div>')
			.append('<label>Enter name of ' + (!parentId ? 'overview page' : 'detail page') + '</label>')
			.append('<input name="page_name" style="width: 100%;" />')
			.append($('<div class="edit-mode"></div>')
				.append('<label>Select layout</label>')
				.append($('<div></div>').append(ts))
			)
		;

		LeoKit.modal(dialogContent, {
			OK: function(form) {
				var name = form.page_name;

				if ($.trim(name) == '') {
					window.messageModal('Name is required.');
					return false;
				}

				var portal = thisComponent.state.portal;
				var dashboard = {
					id: thisComponent.generateUUID(),
					name: name,
					layout: thisComponent.htmlToJSON($('.template-list label:nth-child('+(parseInt(form.template)+1)+') > div')),
					filters: [],
					script: ''
				}

				if (!parentId) {
					if (!portal.navigation) {
						portal.navigation = []
					}
					portal.navigation.push({
						id: dashboard.id,
						name: name,
						children: []
					})
				} else {
					var parent = {}
					portal.navigation.forEach((branch) => {
						if (branch.id == parentId) {
							parent = branch
						}
					})

					parent.children.push({
						id: dashboard.id,
						name: name
					})
				}

				thisComponent.setState({
					portal: portal,
					dashboard: dashboard
				}, function() {
					thisComponent.savePortal(portal)
					thisComponent.saveDashboard(dashboard, () => {
						thisComponent.switchDashboards(dashboard.id, null)
					})
				})

			},
			cancel: false
		})

	},


	downloadDashboard: function() {
		var article = $('<article/>');
		this.jsonToHTML(this.state.portal.dashboards[this.state.nav], article);
		var code = $('<div/>').append(article).html();
		var indent = 0, lastMatch = '<';
		code = code.replace(/\s*(<\/?)/g, function(withSpace, match) {
			if (match == lastMatch) {
				if (match == '<') {
					indent++;
				} else {
					indent--;
				}
			}
			lastMatch = match;
			return "\r\n"+Array(indent).join("\t")+match;
		});
		var downloadForm = $("#warehouse-downloadform");
		if (!downloadForm.length) {
			downloadForm = $('<form id="warehouse-downloadform" style="display: none" method="POST" action="/download" />').appendTo("body");
		}
		downloadForm.attr("action", "/download").empty().append(
			$('<input type="hidden" name="title" value="dashboard.html"/>'),
			$('<input type="hidden" name="data" />').val(code),
			$('<input type="hidden" name="mime" value="text/html"/>')
		).submit();
	},


	downloadPortal: function() {},


	switchDashboards: function(dashboardId, version) {

		if (!dashboardId) {

			this.addDashboard(null);

		} else {

			this.charts = this.charts.filter((chart) => {
				try {
					chart.destroy()
				} catch(e) {}
				return false
			})

			if (version) {
				var get = 'history/dashboards/'+dashboardId+'/'+version
			} else {
				var get = 'dashboard/'+dashboardId
			}

			WebAPI.get(get, (dashboard) => {

				if (!dashboard) {
					window.messageModal('missing dashboard')
					return
				}

				$('#dashboard-script').remove();
				if (dashboard.script) {
					$('head').append(
						$('<script />').attr('type', 'text/javascript').attr('id', 'dashboard-script').text(
							"; try { " + dashboard.script + " } catch(e) { console.log('Error running page script: ' + e) }; "
						)
					)
					//chartFigure.runScripts();
				}

				this.setState({
					dashboard: dashboard,
					filters: dashboard.filters || [],
					version: version,
					history: (version ? this.state.history : false)
				})

				this.jsonToHTML(dashboard.layout)
				this.initWidgets()

				if (this.state.portal.script || dashboard.script) {
					chartFigure.runScripts()
				}

				var hash = dashboardId

				this.state.portal.navigation.forEach((navigation) => {
					if (navigation.id == dashboardId) {
						hash = encodeURIComponent(navigation.name)
					} else {
						navigation.children.forEach((child) => {
							if (child.id == dashboardId) {
								hash = encodeURIComponent(navigation.name) + '|' + encodeURIComponent(child.name)
							}
						})
					}
				})

				localStorage.setItem('lastDashboard', this.state.portal.id + '#' + hash)

				document.location.hash = '#' + hash

			})
		}

	},


	editDashboardName: function(dashboardId, parentId) {
		var thisComponent = this;
		var name = this.state.dashboard.name
		LeoKit.prompt('Enter page name', name, function(form) {
			var name = $.trim(form.prompt_value);
			if (name == '') {
				window.messageModal('Name is required.');
				return false;
			}
			var portal = thisComponent.state.portal
			var dashboard = thisComponent.state.dashboard

			dashboard.name = name

			for(var i in portal.navigation) {
				if (parentId && portal.navigation[i].id == parentId) {
					for(var j in portal.navigation[i].children) {
						if (portal.navigation[i].children[j].id == dashboardId) {
							portal.navigation[i].children[j].name = name
						}
					}
				} else if (portal.navigation[i].id == dashboardId) {
					portal.navigation[i].name = name
				}
			}

			thisComponent.setState({
				portal: portal,
				dashboard: dashboard
			}, () => {
				thisComponent.savePortal(portal)
				thisComponent.saveDashboard(dashboard)
			});
		})
	},


	deleteDashboard: function(dashboardId, parentId) {
		var thisComponent = this;
		LeoKit.confirm('Are you sure you want to delete this '+(parentId?'detail':'overview')+' page?', function() {
			var portal = thisComponent.state.portal;

			//delete actual dashboard
			WebAPI.delete('dashboards/'+dashboardId)

			//delete from nav
			for(var i=0;i<portal.navigation.length;i++) {
				if (portal.navigation[i].id == dashboardId) {
					portal.navigation.splice(i, 1)
					break
				} else if (portal.navigation[i].id == parentId) {
					for(var j=0;j<portal.navigation[i].children.length;j++) {
						if (portal.navigation[i].children[j].id == dashboardId) {
							portal.navigation[i].children.splice(j, 1)
							break
						}
					}
				}
			}
			thisComponent.savePortal(portal)
			thisComponent.setState({
				portal: portal,
				dashboard: false
			}, function() {
				setTimeout(function() {
					if (parentId) {
						thisComponent.switchDashboards(parentId, null)
					} else {
						var dashboard = thisComponent.state.portal.navigation[0]
						if (dashboard) {
							thisComponent.switchDashboards(dashboard.id, null)
						} else {
							thisComponent.addDashboard(null);
						}
					}
				}, 1)
			});

		});
	},


	editPortalName: function() {
		if (this.state.editMode) {
			LeoKit.prompt('Enter dashboard name', this.state.portal.name, (form) => {
				if ($.trim(form.prompt_value) == '') {
					window.messageModal('Name is required.');
					return false;
				}
				var portal = this.state.portal;
				portal.name = form.prompt_value;
				this.setState({ portal: portal }, function() {
					this.savePortal(portal)
				});
			})
		}
	},


	viewDashboardCode: function() {
		var article = $('<article/>')
		this.jsonToHTML(this.state.dashboard.layout, article)
		var code = ('<div class="leo-style-gravity"><div id="leo-dashboard">'+$('<div/>').append(article).html().trim()+'</div></div>')
			.replace(/></g, ">\r\n<")
			.replace(/}</g, "}\r\n<")
			.replace(/>{/g, ">\r\n{")
		var indent = 0
		code = code.replace(/^<?\/?/gm, function(match) {
			if (match == '<') {
				indent++
			}
			var indented = Array(indent).join("\t") + match
			if (match == '</' && indent > 0) {
				indent--
			}
			return indented
		})

		if (this.state.portal.script || this.state.dashboard.script) {
			code = '<script type="text/javascript">' + "\r\n" + "\r\n"
				+ '/* dashboard script */' + "\r\n" + "\r\n"
				+ (this.state.portal.script || '') + "\r\n" + "\r\n"
				+ '/* page script */' + "\r\n" + "\r\n"
				+ (this.state.dashboard.script || '') + "\r\n" + "\r\n"
			+ '</script>' + "\r\n" + "\r\n"
			+ code
		}

		this.setState({
			code: code,
			dialog: 'code'
		}, () => {

			LeoKit.modal($('#dashboardCode'), {
					close: false
				},
				'Dashboard Page Code',
				this.setState({ dialog: false })
			)

		})

	},


	addChart: function(script, html) {
		var figure = $(this.state.figure)
		this.chartDestroy(figure)

		if (html) {
			figure.html(html).addClass('leo-html')
			this.charts.push(chartFigure.init(figure, this.state.filters))
		} else {
			figure.html('<script type="text\/x-leo-chart">' + script + '<\/script>').addClass('leo-chart');
			this.charts.push(chartFigure.init(figure, this.state.filters))
		}
		this.saveDashboard()
		this.closeDialog()
	},


	loadReport: function(script) {
		if (typeof script != 'string') {
			script = JSON.stringify(script, null, 4);
		}
		this.codeMirrorInstance['edit-script-textarea'].getDoc().setValue(script)
	},


	showDialog: function(dialog) {
		this.setState({ dialog: dialog });
	},


	closeDialog: function() {
		this.setState({ dialog: false });
	},


	saveAdvancedSettings: function(form) {

		localStorage.setItem('defaultDashboard', form.defaultDashboard)
		localStorage.setItem('defaultPage', form.defaultPage)

		var portalScript = $.trim(form.portalScript.replace(/(<([^>]+)>)/ig, '')) || ''
		try {
			var test = (new Function(portalScript))()
		} catch(e) {
			window.messageModal('Dashboard Script Error: '+e);
			return false;
		}

		var dashboardScript = $.trim(form.dashboardScript.replace(/(<([^>]+)>)/ig, '')) || ''
		try {
			var test = (new Function(dashboardScript))()
		} catch(e) {
			window.messageModal('Page Script Error: '+e, 'error');
			return false;
		}

		var portal = this.state.portal
		portal.script = portalScript
		var dashboard = this.state.dashboard
		dashboard.script = dashboardScript

		this.setState({
			portal: portal,
			dashboard: dashboard
		}, () => {
			this.savePortal(portal)
			this.saveDashboard(dashboard)
			LeoKit.confirm('Script changes may not take effect until the page is reloaded.  Do you wish to reload now?', function() {
				document.location.reload();
			})
		})
	},


	initCodeMirror: function(modal) {
		var thisComponent = this;
		var textAreas = modal.find('.theme-dialog form textarea[name]:not(.expression-builder-input):visible');
		if (textAreas.length > 0) {
			textAreas.each(function() {
				var textArea = this
				var isJSON = !$(textArea).hasClass('edit-html')
				var instanceName = $(textArea).attr('name')
				thisComponent.codeMirrorInstance[instanceName] = CodeMirror.fromTextArea(textArea, (isJSON ? thisComponent.codeMirrorJSONOptions : thisComponent.codeMirrorHTMLOptions) );
				thisComponent.codeMirrorInstance[instanceName].on('change', function() {
					thisComponent.codeMirrorInstance[instanceName].save();
				});
				if (isJSON) {
					thisComponent.codeMirrorInstance[instanceName].on('paste', function(e) {
						setTimeout(function() {
							var script = e.doc.getValue();
							if (/<[a-z][\s\S]*>/i.test(script)) {
								e.doc.setValue(script.replace(/(<\/?script([^>]+)>)/ig, ''))
							}
						}, 0)
					});
				}
			})
		}
	},


	deleteChart: function(figure) {
		this.chartDestroy(figure);
		figure.empty().removeClass('leo-chart leo-html is-controller is-not-controller').removeAttr('data-html').removeAttr('data-script').removeAttr('id')
		if (figure.parent().is('.leo-charts-controller')) {
			//turn off controller
			var controller = figure.parent();
			var classes = this.getClasses(controller);
			figure.removeClass('width-1-1 height-1-1').addClass(classes.widthClass).addClass(classes.heightClass);
			figure.prev('header').remove();
			figure.unwrap();
		}
		this.saveDashboard()
		this.setState({ figure: false, dialog: false })
	},


	updateFilter: function(filter) {
		var dashboard = this.state.dashboard
		var filters = dashboard.filters || []
		var update = false
		filters = filters.map(function(f) {
			if (f.id == filter.id) {
				filter = $.extend({}, f, filter)
				update = true
				return filter
			}
			return f
		})
		if (!update) {
			filters.push(filter)
		}
		dashboard.filters = filters
		this.setState({
			filters: filters,
			dashboard: dashboard
		}, () => {
			$('figure.leo-chart, figure.leo-html').each(function() {
				if ($(this).leo()) {
					$(this).leo().setFilter(filter)
				}
			});
			this.saveDashboard()
		})
	},


	removeFilter: function(filter_id) {
		var dashboard = this.state.dashboard
		dashboard.filters = dashboard.filters.filter(function(filter) {
			return (filter_id !== filter.id)
		})
		this.setState({
			filters: dashboard.filters,
			dashboard: dashboard
		}, () => {
			$('figure.leo-chart, figure.leo-html').each(function() {
				if ($(this).leo()) {
					$(this).leo().removeFilter(filter_id)
				}
			});
			this.saveDashboard()
		})
	},


	toggleRevisionList: function() {
		if (this.state.history) {
			this.switchDashboards(this.state.dashboard.id)
		} else {
			WebAPI.get('history/dashboards/major/' + this.state.dashboard.id, (response) => {
				this.setState({
					major_revisions: response,
					history: 'major_revisions'
				})
			})
		}
	},


	toggleRevisionDetailed: function() {
		if (this.state.history == 'minor_revisions') {

			WebAPI.get('history/dashboards/major/' + this.state.dashboard.id, (response) => {
				this.setState({
					major_revisions: response,
					history: 'major_revisions'
				})
			})

		} else {

			WebAPI.get('history/dashboards/minor/' + this.state.dashboard.id, (response) => {
				this.setState({
					minor_revisions: response,
					history: 'minor_revisions'
				})
			})

		}
	},


	restoreRevision: function(e) {
		e.preventDefault()
		e.stopPropagation()
		var dashboard = this.state.dashboard
		delete dashboard.version
		this.saveDashboard(dashboard)
		this.setState({
			version: false,
			history: false
		})
	},


	cloneDashboard: function() {
		var json = this.htmlToJSON();
		this.setState({ dialog: 'clone', json: json })
	},


	showFullscreen: function() {
		if (document.documentElement.mozRequestFullScreen) {
			document.documentElement.mozRequestFullScreen()
		} else if (document.documentElement.webkitRequestFullscreen) {
			document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT)
		} else if (document.documentElement.msRequestFullscreen) {
			document.documentElement.msRequestFullscreen()
		}
	},


	loadFromLibrary: function() {
		this.setState({ loadFromLibrary: true })
	},


	addToLibrary: function(script) {
		this.setState({ addToLibrary: script })
	},


	render: function() {

		return (<main className={'page-main-wrapper '+(this.state.editMode ? 'edit-mode' : '')}>

			<div id="portal-controls" className="page-sub-header">

				<nav className="page-sub-nav">

					<ul>
						{/*
						<li>
							<a id="reportLibraryButton" onClick={() => { this.setState({ showLibrary: true }) }}>
								<i className="icon-book"></i>
							</a>
							<ul>
								<li>
									<a className="active" onClick={() => { this.setState({ showLibrary: true }) }}>
										<i className="icon-book" /> View Library
									</a>
								</li>
							</ul>
						</li>*/}
						<li className="theme-dropdown-right">
							<a title="Revision History" onClick={this.toggleRevisionList}>
								<i className="icon-history"></i>
							</a>
						</li>
						<li className="theme-dropdown-right">
							<a onClick={() => { this.setState({ dialog: 'advanced' }) }}>
								<i className="icon-cogs"></i>
							</a>
							<ul>
								<li>
									<a className="active" onClick={() => { this.setState({ dialog: 'advanced' }) }}>
										<i className="icon-cog"/> Advanced Settings
									</a>
								</li>
								<li>
									<a onClick={this.viewDashboardCode}>
										<i className="icon-code" /> View Code
									</a>
								</li>
								<li>
									<a onClick={this.cloneDashboard}>
										<i className="icon-copy" /> Clone Dashboard...
									</a>
								</li>
								<li>
									{/*<a href={window.apiEndpoint + 'portals/' + this.props.portal + '?apikey=' + window.apiKey} target="_blank">*/}
									<a onClick={this.showFullscreen}>
										<i className="icon-window" /> Presentation Mode
									</a>
								</li>
								<li>
									<a onClick={() => { this.setState({ showPortalList: true }) }}>
										<i className="icon-spinner" /> Manage Dashboards
									</a>
								</li>

								<li>
									<a onClick={this.showDialog.bind(this, 'messages')}>
										<i className="icon-comment" /> View Messages
									</a>
								</li>

								{
									localStorage.getItem('leo-testing')
									? <li>
										<a onClick={() => { this.setState({ showThemes: true }) }}>
											<i className="icon-shareable" /> Themes
										</a>
									</li>
									: false
								}

								<li>
									<div className="special-link text-center">Version <span>{(window.dw ? window.dw.version : '-')}</span></div>
								</li>

							</ul>

						</li>
					</ul>
				</nav>

				<div>

					<div className="radio-toggle">
						<label>
							<input type="radio" checked={!this.state.editMode} onChange={() => { this.setState({ editMode: false }) }} />
							<span>View</span>
						</label>
						<label>
							<input type="radio" checked={this.state.editMode} onChange={() => { this.setState({ editMode: true }) }} />
							<span>Edit</span>
						</label>
					</div>

				</div>

				{/*<button type="button" onClick={this.downloadPortal} disabled> Download Portal <i className="icon-download"></i> </button>*/}

				{/*<button className="theme-button" type="button" onClick={this.downloadDashboard}> Download Dashboard <i className="icon-download"></i> </button>*/}

			</div>

			{
				this.state.loadFromLibrary || this.state.addToLibrary
				? <ReportLibrary editor="pe" addToLibrary={this.state.addToLibrary} loadFromLibrary={this.state.loadFromLibrary} loadReport={this.loadReport} onClose={() => { this.setState({ loadFromLibrary: false, addToLibrary: false }) }} />
				: false
			}

			{
				this.state.showPortalList
				? <PortalList onClose={() => { this.setState({ showPortalList: false })}} />
				: false
			}

			{
				this.state.showThemes
				? <Themes onClose={() => { this.setState({ showThemes: false })}} />
				: false
			}

			{
				this.state.history
				? <div className="history-wrapper">
					<div className="history-mask"></div>
					<div className="history-list">
						<a className="pull-right" onClick={this.toggleRevisionList}>cancel</a>
						<header>Revision History</header>
						<ul>
							{
								this.state[this.state.history].map((history, index) => {

									return (<li key={history.version} className={(history.version == this.state.version || (!this.state.version && index == 0)) ? 'active' : ''} onClick={this.switchDashboards.bind(this, this.state.dashboard.id, history.version)}>
										<div>
											{
												moment(history.timestamp).calendar(null, {
													sameDay: '[Today], LT',
													lastDay: '[Yesterday], LT',
													lastWeek: 'dddd, LT',  //not last week at all, but this week
													sameElse: 'MMMM D, LT'
												})
											}
										</div>
										{
											this.state.version == history.version
											? (
													index != 0
													? <a onClick={this.restoreRevision}>Restore this revision</a>
													: false
											)
											: false
										}
									</li>)
								})
							}
						</ul>
						<div>
							<button type="button" onClick={this.toggleRevisionDetailed}>{this.state.history == 'major_revisions' ? 'Show more detailed revisions' : 'Show less detailed revisions'}</button>
						</div>
					</div>
				</div>
				: false
			}

			<div className="leo-style-gravity" style={{height:'100%'}}>

				<header>
					<h1 onClick={this.editPortalName}>{this.state.portal.name}</h1>
					<div className="page-name">{this.state.dashboard.name}</div>
					&nbsp;
				</header>

				<nav>
					<ul id="sort-navigation">
						{
							(this.state.portal && this.state.portal.navigation)

							? this.state.portal.navigation.map((navigation) => {
									if (!navigation) {
										navigation = {
											id: '',
											name: 'noname',
											children: []
										}
									}
									return (<li key={navigation.id} data-navigation-id={navigation.id}>
										<a className={navigation.id == this.state.dashboard.id ? 'active' : ''} onClick={this.switchDashboards.bind(null, navigation.id, null)}>{navigation.name}</a>
										{
											(this.state.editMode && navigation.id == this.state.dashboard.id)
											? <span className="link-controls">
												<i className="icon-resize-vertical sort-handle"></i>
												<i className="icon-edit" onClick={this.editDashboardName.bind(null, navigation.id, null)}></i>
												{
													navigation.children.length == 0
													? <i className="icon-cancel" onClick={this.deleteDashboard.bind(null, navigation.id, null)}></i>
													: false
												}
											</span>
											: false
										}
										<ul>
											{
												navigation.children.map((child) => {
													if (!child) {
														child = {id: '', name: '_' }
													}
													return (<li key={child.id} data-navigation-id={child.id}>
														<a className={child.id == this.state.dashboard.id ? 'active' : ''} onClick={this.switchDashboards.bind(null, child.id, null)}>{child.name}</a>
														{
															(this.state.editMode && child.id == this.state.dashboard.id)
															? <span className="link-controls">
																<i className="icon-resize-vertical sort-handle"></i>
																<i className="icon-edit" onClick={this.editDashboardName.bind(null, child.id, navigation.id)}></i>
																<i className="icon-cancel" onClick={this.deleteDashboard.bind(null, child.id, navigation.id)}></i>
															</span>
															: false
														}
													</li>)
												})
											}
											{
												this.state.editMode
												? <li className="add-dashboard"><a onClick={this.addDashboard.bind(null, navigation.id)}><i className="icon-plus"></i> add detail page</a></li>
												: false
											}
										</ul>
									</li>)
								})

							: false
						}

						{
							this.state.editMode
							? <li className="add-overview"><a onClick={this.addDashboard.bind(null, null)}><i className="icon-plus"></i> add overview page</a></li>
							: false
						}
					</ul>

				</nav>

				<div id="leo-dashboard">
					<article></article>
				</div>


			</div>


			{
				(() => {

					switch(this.state.dialog) {
						case 'wizard':
							return (<Wizard figure={this.state.figure}
								addChart={this.addChart} closeDialog={this.closeDialog}
								codeMirrorJSONOptions={this.codeMirrorJSONOptions}
								onUpdate={this.initCodeMirror}
								deleteChart={this.deleteChart}
								loadFromLibrary={this.loadFromLibrary}
								addToLibrary={this.addToLibrary}
							/>)
						break;

						case 'clone':
							return <Clone json={this.state.json} script={this.state.dashboard.script} onClose={this.closeDialog} />
						break;

						case 'advanced':
							return <PortalAdvancedSettings onClose={this.closeDialog} portalScript={this.state.portal.script || ''} dashboardScript={this.state.dashboard.script || ''} saveAdvancedSettings={this.saveAdvancedSettings} initCodeMirror={this.initCodeMirror} />
						break

						case 'code':
							return (<div>
								<div id="dashboardCode">
									<pre style={{ width: '80vw', maxHeight: '70vh', overflow: 'auto' }}>{this.state.code}</pre>
									<CopyToClipboard className="pull-right clear-both" text={function(trigger) { return $('#dashboardCode pre').text() }} />
									{/*<ExternalCodeEditors code={this.state.code} />*/}
								</div>
							</div>)
						break

						case 'messages':
							return <MessageList onClose={this.closeDialog} />
						break

						default:
							return false;
						break;
					}
				})()
			}

		</main>)
	}

});
