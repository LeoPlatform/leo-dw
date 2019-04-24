//!function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);var j=new Error("Cannot find module '"+g+"'");throw j.code="MODULE_NOT_FOUND",j}var k=c[g]={exports:{}};b[g][0].call(k.exports,function(a){var c=b[g][1][a];return e(c?c:a)},k,k.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b){b.exports=function(a){var b=function(c,d,e){var f=c.splice(0,50);e=e||[],e=e.concat(a.add(f)),c.length>0?setTimeout(function(){b(c,d,e)},1):(a.update(),d(e))};return b}},{}],2:[function(a,b){b.exports=function(a){return a.handlers.filterStart=a.handlers.filterStart||[],a.handlers.filterComplete=a.handlers.filterComplete||[],function(b){if(a.trigger("filterStart"),a.i=1,a.reset.filter(),void 0===b)a.filtered=!1;else{a.filtered=!0;for(var c=a.items,d=0,e=c.length;e>d;d++){var f=c[d];f.filtered=b(f)?!0:!1}}return a.update(),a.trigger("filterComplete"),a.visibleItems}}},{}],3:[function(a,b){b.exports=function(a){return function(b,c,d){var e=this;this._values={},this.found=!1,this.filtered=!1;var f=function(b,c,d){if(void 0===c)d?e.values(b,d):e.values(b);else{e.elm=c;var f=a.templater.get(e,b);e.values(f)}};this.values=function(b,c){if(void 0===b)return e._values;for(var d in b)e._values[d]=b[d];c!==!0&&a.templater.set(e,e.values())},this.show=function(){a.templater.show(e)},this.hide=function(){a.templater.hide(e)},this.matching=function(){return a.filtered&&a.searched&&e.found&&e.filtered||a.filtered&&!a.searched&&e.filtered||!a.filtered&&a.searched&&e.found||!a.filtered&&!a.searched},this.visible=function(){return e.elm.parentNode==a.list?!0:!1},f(b,c,d)}}},{}],4:[function(a,b){b.exports=function(b){var c=a("./item")(b),d=function(a){for(var b=a.childNodes,c=[],d=0,e=b.length;e>d;d++)void 0===b[d].data&&c.push(b[d]);return c},e=function(a,d){for(var e=0,f=a.length;f>e;e++)b.items.push(new c(d,a[e]))},f=function(a,c){var d=a.splice(0,50);e(d,c),a.length>0?setTimeout(function(){f(a,c)},1):(b.update(),b.trigger("parseComplete"))};return b.handlers.parseComplete=b.handlers.parseComplete||[],function(){var a=d(b.list),c=b.valueNames;b.indexAsync?f(a,c):e(a,c)}}},{"./item":3}],5:[function(a,b){var c=a("./utils/events"),d=a("./utils/get-by-class"),e=a("./utils/to-string");b.exports=function(a){var b,f,g,h,i={resetList:function(){a.i=1,a.templater.clear(),h=void 0},setOptions:function(a){2==a.length&&a[1]instanceof Array?f=a[1]:2==a.length&&"function"==typeof a[1]?h=a[1]:3==a.length&&(f=a[1],h=a[2])},setColumns:function(){f=void 0===f?a.valueNames:f},setSearchString:function(a){a=e(a).toLowerCase(),a=a.replace(/[-[\]{}()*+?.,\\^$|#]/g,"\\$&"),g=a},toArray:function(a){var b=[];for(var c in a)b.push(c);return b}},j={list:function(){for(var b=0,c=a.items.length;c>b;b++)j.item(a.items[b])},item:function(a){a.found=!1;for(var b=0,c=f.length;c>b;b++)if(j.values(a.values(),f[b]))return void(a.found=!0)},values:function(a,c){return a.hasOwnProperty(c)&&(b=e(a[c]).toLowerCase(),""!==g&&b.search(g)>-1)?!0:!1},reset:function(){a.reset.search(),a.searched=!1}},k=function(b){return a.trigger("searchStart"),i.resetList(),i.setSearchString(b),i.setOptions(arguments),i.setColumns(),""===g?j.reset():(a.searched=!0,h?h(g,f):j.list()),a.update(),a.trigger("searchComplete"),a.visibleItems};return a.handlers.searchStart=a.handlers.searchStart||[],a.handlers.searchComplete=a.handlers.searchComplete||[],c.bind(d(a.listContainer,a.searchClass),"keyup",function(b){var c=b.target||b.srcElement,d=""===c.value&&!a.searched;d||k(c.value)}),c.bind(d(a.listContainer,a.searchClass),"input",function(a){var b=a.target||a.srcElement;""===b.value&&k("")}),a.helpers.toString=e,k}},{"./utils/events":9,"./utils/get-by-class":12,"./utils/to-string":16}],6:[function(a,b){var c=a("./utils/natural-sort"),d=a("./utils/classes"),e=a("./utils/events"),f=a("./utils/get-by-class"),g=a("./utils/get-attribute");b.exports=function(a){a.sortFunction=a.sortFunction||function(a,b,d){return d.desc="desc"==d.order?!0:!1,c(a.values()[d.valueName],b.values()[d.valueName],d)};var b={els:void 0,clear:function(){for(var a=0,c=b.els.length;c>a;a++)d(b.els[a]).remove("asc"),d(b.els[a]).remove("desc")},getOrder:function(a){var b=g(a,"data-order");return"asc"==b||"desc"==b?b:d(a).has("desc")?"asc":d(a).has("asc")?"desc":"asc"},getInSensitive:function(a,b){var c=g(a,"data-insensitive");b.insensitive="true"===c?!0:!1},setOrder:function(a){for(var c=0,e=b.els.length;e>c;c++){var f=b.els[c];if(g(f,"data-sort")===a.valueName){var h=g(f,"data-order");"asc"==h||"desc"==h?h==a.order&&d(f).add(a.order):d(f).add(a.order)}}}},h=function(){a.trigger("sortStart");var c={},d=arguments[0].currentTarget||arguments[0].srcElement||void 0;d?(c.valueName=g(d,"data-sort"),b.getInSensitive(d,c),c.order=b.getOrder(d)):(c=arguments[1]||c,c.valueName=arguments[0],c.order=c.order||"asc",c.insensitive="undefined"==typeof c.insensitive?!0:c.insensitive),b.clear(),b.setOrder(c),c.sortFunction=c.sortFunction||a.sortFunction,a.items.sort(function(a,b){return c.sortFunction(a,b,c)}),a.update(),a.trigger("sortComplete")};return a.handlers.sortStart=a.handlers.sortStart||[],a.handlers.sortComplete=a.handlers.sortComplete||[],b.els=f(a.listContainer,a.sortClass),e.bind(b.els,"click",h),a.on("searchStart",b.clear),a.on("filterStart",b.clear),a.helpers.classes=d,a.helpers.naturalSort=c,a.helpers.events=e,a.helpers.getAttribute=g,h}},{"./utils/classes":8,"./utils/events":9,"./utils/get-attribute":11,"./utils/get-by-class":12,"./utils/natural-sort":14}],7:[function(a,b){var c=a("./utils/get-by-class"),d=function(a){function b(b){if(void 0===b){for(var c=a.list.childNodes,d=0,e=c.length;e>d;d++)if(void 0===c[d].data)return c[d];return null}if(-1!==b.indexOf("<")){var f=document.createElement("div");return f.innerHTML=b,f.firstChild}return document.getElementById(a.item)}var d=b(a.item),e=this;this.get=function(a,b){e.create(a);for(var d={},f=0,g=b.length;g>f;f++){var h=c(a.elm,b[f],!0);d[b[f]]=h?h.innerHTML:""}return d},this.set=function(a,b){if(!e.create(a))for(var d in b)if(b.hasOwnProperty(d)){var f=c(a.elm,d,!0);f&&("IMG"===f.tagName&&""!==b[d]?f.src=b[d]:f.innerHTML=b[d])}},this.create=function(a){if(void 0!==a.elm)return!1;var b=d.cloneNode(!0);return b.removeAttribute("id"),a.elm=b,e.set(a,a.values()),!0},this.remove=function(b){b.elm.parentNode===a.list&&a.list.removeChild(b.elm)},this.show=function(b){e.create(b),a.list.appendChild(b.elm)},this.hide=function(b){void 0!==b.elm&&b.elm.parentNode===a.list&&a.list.removeChild(b.elm)},this.clear=function(){if(a.list.hasChildNodes())for(;a.list.childNodes.length>=1;)a.list.removeChild(a.list.firstChild)}};b.exports=function(a){return new d(a)}},{"./utils/get-by-class":12}],8:[function(a,b){function c(a){if(!a||!a.nodeType)throw new Error("A DOM element reference is required");this.el=a,this.list=a.classList}var d=a("./index-of"),e=/\s+/,f=Object.prototype.toString;b.exports=function(a){return new c(a)},c.prototype.add=function(a){if(this.list)return this.list.add(a),this;var b=this.array(),c=d(b,a);return~c||b.push(a),this.el.className=b.join(" "),this},c.prototype.remove=function(a){if("[object RegExp]"==f.call(a))return this.removeMatching(a);if(this.list)return this.list.remove(a),this;var b=this.array(),c=d(b,a);return~c&&b.splice(c,1),this.el.className=b.join(" "),this},c.prototype.removeMatching=function(a){for(var b=this.array(),c=0;c<b.length;c++)a.test(b[c])&&this.remove(b[c]);return this},c.prototype.toggle=function(a,b){return this.list?("undefined"!=typeof b?b!==this.list.toggle(a,b)&&this.list.toggle(a):this.list.toggle(a),this):("undefined"!=typeof b?b?this.add(a):this.remove(a):this.has(a)?this.remove(a):this.add(a),this)},c.prototype.array=function(){var a=this.el.getAttribute("class")||"",b=a.replace(/^\s+|\s+$/g,""),c=b.split(e);return""===c[0]&&c.shift(),c},c.prototype.has=c.prototype.contains=function(a){return this.list?this.list.contains(a):!!~d(this.array(),a)}},{"./index-of":13}],9:[function(a,b,c){var d=window.addEventListener?"addEventListener":"attachEvent",e=window.removeEventListener?"removeEventListener":"detachEvent",f="addEventListener"!==d?"on":"",g=a("./to-array");c.bind=function(a,b,c,e){a=g(a);for(var h=0;h<a.length;h++)a[h][d](f+b,c,e||!1)},c.unbind=function(a,b,c,d){a=g(a);for(var h=0;h<a.length;h++)a[h][e](f+b,c,d||!1)}},{"./to-array":15}],10:[function(a,b){b.exports=function(a){for(var b,c=Array.prototype.slice.call(arguments,1),d=0;b=c[d];d++)if(b)for(var e in b)a[e]=b[e];return a}},{}],11:[function(a,b){b.exports=function(a,b){var c=a.getAttribute&&a.getAttribute(b)||null;if(!c)for(var d=a.attributes,e=d.length,f=0;e>f;f++)void 0!==b[f]&&b[f].nodeName===b&&(c=b[f].nodeValue);return c}},{}],12:[function(a,b){b.exports=function(){return document.getElementsByClassName?function(a,b,c){return c?a.getElementsByClassName(b)[0]:a.getElementsByClassName(b)}:document.querySelector?function(a,b,c){return b="."+b,c?a.querySelector(b):a.querySelectorAll(b)}:function(a,b,c){var d=[],e="*";null===a&&(a=document);for(var f=a.getElementsByTagName(e),g=f.length,h=new RegExp("(^|\\s)"+b+"(\\s|$)"),i=0,j=0;g>i;i++)if(h.test(f[i].className)){if(c)return f[i];d[j]=f[i],j++}return d}}()},{}],13:[function(a,b){var c=[].indexOf;b.exports=function(a,b){if(c)return a.indexOf(b);for(var d=0;d<a.length;++d)if(a[d]===b)return d;return-1}},{}],14:[function(a,b){b.exports=function(a,b,c){var d,e,f=/(^([+\-]?(?:\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?)?$|^0x[\da-fA-F]+$|\d+)/g,g=/^\s+|\s+$/g,h=/\s+/g,i=/(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,j=/^0x[0-9a-f]+$/i,k=/^0/,l=c||{},m=function(a){return l.insensitive&&(""+a).toLowerCase()||""+a},n=m(a)||"",o=m(b)||"",p=n.replace(f,"\x00$1\x00").replace(/\0$/,"").replace(/^\0/,"").split("\x00"),q=o.replace(f,"\x00$1\x00").replace(/\0$/,"").replace(/^\0/,"").split("\x00"),r=parseInt(n.match(j),16)||1!==p.length&&Date.parse(n),s=parseInt(o.match(j),16)||r&&o.match(i)&&Date.parse(o)||null,t=function(a,b){return(!a.match(k)||1==b)&&parseFloat(a)||a.replace(h," ").replace(g,"")||0},u=l.desc?-1:1;if(s){if(s>r)return-1*u;if(r>s)return 1*u}for(var v=0,w=p.length,x=q.length,y=Math.max(w,x);y>v;v++){if(d=t(p[v],w),e=t(q[v],x),isNaN(d)!==isNaN(e))return isNaN(d)?1:-1;if(typeof d!=typeof e&&(d+="",e+=""),e>d)return-1*u;if(d>e)return 1*u}return 0}},{}],15:[function(a,b){function c(a){return"[object Array]"===Object.prototype.toString.call(a)}b.exports=function(a){if("undefined"==typeof a)return[];if(null===a)return[null];if(a===window)return[window];if("string"==typeof a)return[a];if(c(a))return a;if("number"!=typeof a.length)return[a];if("function"==typeof a&&a instanceof Function)return[a];for(var b=[],d=0;d<a.length;d++)(Object.prototype.hasOwnProperty.call(a,d)||d in a)&&b.push(a[d]);return b.length?b:[]}},{}],16:[function(a,b){b.exports=function(a){return a=void 0===a?"":a,a=null===a?"":a,a=a.toString()}},{}],17:[function(a,b){!function(c,d){"use strict";var e=c.document,f=a("./src/utils/get-by-class"),g=a("./src/utils/extend"),h=a("./src/utils/index-of"),i=function(b,c,j){var k,l=this,m=a("./src/item")(l),n=a("./src/add-async")(l);k={start:function(){l.listClass="list",l.searchClass="search",l.sortClass="sort",l.page=200,l.i=1,l.items=[],l.visibleItems=[],l.matchingItems=[],l.searched=!1,l.filtered=!1,l.handlers={updated:[]},l.plugins={},l.helpers={getByClass:f,extend:g,indexOf:h},g(l,c),l.listContainer="string"==typeof b?e.getElementById(b):b,l.listContainer&&(l.list=f(l.listContainer,l.listClass,!0),l.parse=a("./src/parse")(l),l.templater=a("./src/templater")(l),l.search=a("./src/search")(l),l.filter=a("./src/filter")(l),l.sort=a("./src/sort")(l),this.handlers(),this.items(),l.update(),this.plugins())},handlers:function(){for(var a in l.handlers)l[a]&&l.on(a,l[a])},items:function(){l.parse(l.list),j!==d&&l.add(j)},plugins:function(){for(var a=0;a<l.plugins.length;a++){var b=l.plugins[a];l[b.name]=b,b.init(l,i)}}},this.add=function(a,b){if(b)return void n(a,b);var c=[],e=!1;a[0]===d&&(a=[a]);for(var f=0,g=a.length;g>f;f++){var h=null;a[f]instanceof m?(h=a[f],h.reload()):(e=l.items.length>l.page?!0:!1,h=new m(a[f],d,e)),l.items.push(h),c.push(h)}return l.update(),c},this.show=function(a,b){return this.i=a,this.page=b,l.update(),l},this.remove=function(a,b,c){for(var d=0,e=0,f=l.items.length;f>e;e++)l.items[e].values()[a]==b&&(l.templater.remove(l.items[e],c),l.items.splice(e,1),f--,e--,d++);return l.update(),d},this.get=function(a,b){for(var c=[],d=0,e=l.items.length;e>d;d++){var f=l.items[d];f.values()[a]==b&&c.push(f)}return c},this.size=function(){return l.items.length},this.clear=function(){return l.templater.clear(),l.items=[],l},this.on=function(a,b){return l.handlers[a].push(b),l},this.off=function(a,b){var c=l.handlers[a],d=h(c,b);return d>-1&&c.splice(d,1),l},this.trigger=function(a){for(var b=l.handlers[a].length;b--;)l.handlers[a][b](l);return l},this.reset={filter:function(){for(var a=l.items,b=a.length;b--;)a[b].filtered=!1;return l},search:function(){for(var a=l.items,b=a.length;b--;)a[b].found=!1;return l}},this.update=function(){var a=l.items,b=a.length;l.visibleItems=[],l.matchingItems=[],l.templater.clear();for(var c=0;b>c;c++)a[c].matching()&&l.matchingItems.length+1>=l.i&&l.visibleItems.length<l.page?(a[c].show(),l.visibleItems.push(a[c]),l.matchingItems.push(a[c])):a[c].matching()?(l.matchingItems.push(a[c]),a[c].hide()):a[c].hide();return l.trigger("updated"),l},k.start()};"function"==typeof define&&define.amd&&define(function(){return i}),b.exports=i,c.List=i}(window)},{"./src/add-async":1,"./src/filter":2,"./src/item":3,"./src/parse":4,"./src/search":5,"./src/sort":6,"./src/templater":7,"./src/utils/extend":10,"./src/utils/get-by-class":12,"./src/utils/index-of":13}]},{},[17]);
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f;}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e);},l,l.exports,e,t,n,r);}return n[o].exports;}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s;})({1:[function(require,module,exports){
	module.exports = function(list) {
		var addAsync = function(values, callback, items) {
			var valuesToAdd = values.splice(0, 50);
			items = items || [];
			items = items.concat(list.add(valuesToAdd));
			if (values.length > 0) {
				setTimeout(function() {
					addAsync(values, callback, items);
				}, 1);
			} else {
				list.update();
				callback(items);
			}
		};
		return addAsync;
	};

},{}],2:[function(require,module,exports){
	module.exports = function(list) {

		// Add handlers
		list.handlers.filterStart = list.handlers.filterStart || [];
		list.handlers.filterComplete = list.handlers.filterComplete || [];

		return function(filterFunction) {
			list.trigger('filterStart');
			list.i = 1; // Reset paging
			list.reset.filter();
			if (filterFunction === undefined) {
				list.filtered = false;
			} else {
				list.filtered = true;
				var is = list.items;
				for (var i = 0, il = is.length; i < il; i++) {
					var item = is[i];
					if (filterFunction(item)) {
						item.filtered = true;
					} else {
						item.filtered = false;
					}
				}
			}
			list.update();
			list.trigger('filterComplete');
			return list.visibleItems;
		};
	};

},{}],3:[function(require,module,exports){
	module.exports = function(list) {
		return function(initValues, element, notCreate) {
			var item = this;

			this._values = {};

			this.found = false; // Show if list.searched == true and this.found == true
			this.filtered = false;// Show if list.filtered == true and this.filtered == true

			var init = function(initValues, element, notCreate) {
				if (element === undefined) {
					if (notCreate) {
						item.values(initValues, notCreate);
					} else {
						item.values(initValues);
					}
				} else {
					item.elm = element;
					var values = list.templater.get(item, initValues);
					item.values(values);
				}
			};
			this.values = function(newValues, notCreate) {
				if (newValues !== undefined) {
					for(var name in newValues) {
						item._values[name] = newValues[name];
					}
					if (notCreate !== true) {
						list.templater.set(item, item.values());
					}
				} else {
					return item._values;
				}
			};
			this.show = function() {
				list.templater.show(item);
			};
			this.hide = function() {
				list.templater.hide(item);
			};
			this.matching = function() {
				return (
					(list.filtered && list.searched && item.found && item.filtered) ||
        (list.filtered && !list.searched && item.filtered) ||
        (!list.filtered && list.searched && item.found) ||
        (!list.filtered && !list.searched)
				);
			};
			this.visible = function() {
				return (item.elm.parentNode == list.list) ? true : false;
			};
			init(initValues, element, notCreate);
		};
	};

},{}],4:[function(require,module,exports){
	module.exports = function(list) {

		var Item = require('./item')(list);

		var getChildren = function(parent) {
			var nodes = parent.childNodes,
				items = [];
			for (var i = 0, il = nodes.length; i < il; i++) {
				// Only textnodes have a data attribute
				if (nodes[i].data === undefined) {
					items.push(nodes[i]);
				}
			}
			return items;
		};

		var parse = function(itemElements, valueNames) {
			for (var i = 0, il = itemElements.length; i < il; i++) {
				list.items.push(new Item(valueNames, itemElements[i]));
			}
		};
		var parseAsync = function(itemElements, valueNames) {
			var itemsToIndex = itemElements.splice(0, 50); // TODO: If < 100 items, what happens in IE etc?
			parse(itemsToIndex, valueNames);
			if (itemElements.length > 0) {
				setTimeout(function() {
					parseAsync(itemElements, valueNames);
				}, 1);
			} else {
				list.update();
				list.trigger('parseComplete');
			}
		};

		list.handlers.parseComplete = list.handlers.parseComplete || [];

		return function() {
			var itemsToIndex = getChildren(list.list),
				valueNames = list.valueNames;

			if (list.indexAsync) {
				parseAsync(itemsToIndex, valueNames);
			} else {
				parse(itemsToIndex, valueNames);
			}
		};
	};

},{"./item":3}],5:[function(require,module,exports){
	var events = require('./utils/events'),
		getByClass = require('./utils/get-by-class'),
		toString = require('./utils/to-string');

	module.exports = function(list) {
		var item,
			text,
			columns,
			searchString,
			customSearch;

		var prepare = {
			resetList: function() {
				list.i = 1;
				list.templater.clear();
				customSearch = undefined;
			},
			setOptions: function(args) {
				if (args.length == 2 && args[1] instanceof Array) {
					columns = args[1];
				} else if (args.length == 2 && typeof(args[1]) == "function") {
					customSearch = args[1];
				} else if (args.length == 3) {
					columns = args[1];
					customSearch = args[2];
				}
			},
			setColumns: function() {
				columns = (columns === undefined) ? list.valueNames : columns;
			},
			setSearchString: function(s) {
				s = toString(s).toLowerCase();
				s = s.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&"); // Escape regular expression characters
				searchString = s;
			},
			toArray: function(values) {
				var tmpColumn = [];
				for (var name in values) {
					tmpColumn.push(name);
				}
				return tmpColumn;
			}
		};
		var search = {
			list: function() {
				for (var k = 0, kl = list.items.length; k < kl; k++) {
					search.item(list.items[k]);
				}
			},
			item: function(item) {
				item.found = false;
				for (var j = 0, jl = columns.length; j < jl; j++) {
					if (search.values(item.values(), columns[j])) {
						item.found = true;
						return;
					}
				}
			},
			values: function(values, column) {
				if (values.hasOwnProperty(column)) {
					text = toString(values[column]).toLowerCase();
					if ((searchString !== "") && (text.search(searchString) > -1)) {
						return true;
					}
				}
				return false;
			},
			reset: function() {
				list.reset.search();
				list.searched = false;
			}
		};

		var searchMethod = function(str) {
			list.trigger('searchStart');

			prepare.resetList();
			prepare.setSearchString(str);
			prepare.setOptions(arguments); // str, cols|searchFunction, searchFunction
			prepare.setColumns();

			if (searchString === "" ) {
				search.reset();
			} else {
				list.searched = true;
				if (customSearch) {
					customSearch(searchString, columns);
				} else {
					search.list();
				}
			}

			list.update();
			list.trigger('searchComplete');
			return list.visibleItems;
		};

		list.handlers.searchStart = list.handlers.searchStart || [];
		list.handlers.searchComplete = list.handlers.searchComplete || [];

		events.bind(getByClass(list.listContainer, list.searchClass), 'keyup', function(e) {
			var target = e.target || e.srcElement, // IE have srcElement
				alreadyCleared = (target.value === "" && !list.searched);
			if (!alreadyCleared) { // If oninput already have resetted the list, do nothing
				searchMethod(target.value);
			}
		});

		// Used to detect click on HTML5 clear button
		events.bind(getByClass(list.listContainer, list.searchClass), 'input', function(e) {
			var target = e.target || e.srcElement;
			if (target.value === "") {
				searchMethod('');
			}
		});

		list.helpers.toString = toString;
		return searchMethod;
	};

},{"./utils/events":9,"./utils/get-by-class":12,"./utils/to-string":16}],6:[function(require,module,exports){
	var naturalSort = require('./utils/natural-sort'),
		classes = require('./utils/classes'),
		events = require('./utils/events'),
		getByClass = require('./utils/get-by-class'),
		getAttribute = require('./utils/get-attribute');

	module.exports = function(list) {
		list.sortFunction = list.sortFunction || function(itemA, itemB, options) {
			options.desc = options.order == "desc" ? true : false; // Natural sort uses this format
			return naturalSort(itemA.values()[options.valueName], itemB.values()[options.valueName], options);
		};

		var buttons = {
			els: undefined,
			clear: function() {
				for (var i = 0, il = buttons.els.length; i < il; i++) {
					classes(buttons.els[i]).remove('asc');
					classes(buttons.els[i]).remove('desc');
				}
			},
			getOrder: function(btn) {
				var predefinedOrder = getAttribute(btn, 'data-order');
				if (predefinedOrder == "asc" || predefinedOrder == "desc") {
					return predefinedOrder;
				} else if (classes(btn).has('desc')) {
					return "asc";
				} else if (classes(btn).has('asc')) {
					return "desc";
				} else {
					return "asc";
				}
			},
			getInSensitive: function(btn, options) {
				var insensitive = getAttribute(btn, 'data-insensitive');
				if (insensitive === "true") {
					options.insensitive = true;
				} else {
					options.insensitive = false;
				}
			},
			setOrder: function(options) {
				for (var i = 0, il = buttons.els.length; i < il; i++) {
					var btn = buttons.els[i];
					if (getAttribute(btn, 'data-sort') !== options.valueName) {
						continue;
					}
					var predefinedOrder = getAttribute(btn, 'data-order');
					if (predefinedOrder == "asc" || predefinedOrder == "desc") {
						if (predefinedOrder == options.order) {
							classes(btn).add(options.order);
						}
					} else {
						classes(btn).add(options.order);
					}
				}
			}
		};
		var sort = function() {
			list.trigger('sortStart');
			var options = {};

			var target = arguments[0].currentTarget || arguments[0].srcElement || undefined;

			if (target) {
				options.valueName = getAttribute(target, 'data-sort');
				buttons.getInSensitive(target, options);
				options.order = buttons.getOrder(target);
			} else {
				options = arguments[1] || options;
				options.valueName = arguments[0];
				options.order = options.order || "asc";
				options.insensitive = (typeof options.insensitive == "undefined") ? true : options.insensitive;
			}
			buttons.clear();
			buttons.setOrder(options);

			options.sortFunction = options.sortFunction || list.sortFunction;
			list.items.sort(function(a, b) {
				return options.sortFunction(a, b, options);
			});
			list.update();
			list.trigger('sortComplete');
		};

		// Add handlers
		list.handlers.sortStart = list.handlers.sortStart || [];
		list.handlers.sortComplete = list.handlers.sortComplete || [];

		buttons.els = getByClass(list.listContainer, list.sortClass);
		events.bind(buttons.els, 'click', sort);
		list.on('searchStart', buttons.clear);
		list.on('filterStart', buttons.clear);

		// Helpers
		list.helpers.classes = classes;
		list.helpers.naturalSort = naturalSort;
		list.helpers.events = events;
		list.helpers.getAttribute = getAttribute;

		return sort;
	};

},{"./utils/classes":8,"./utils/events":9,"./utils/get-attribute":11,"./utils/get-by-class":12,"./utils/natural-sort":14}],7:[function(require,module,exports){
	var getByClass = require('./utils/get-by-class');

	var Templater = function(list) {
		var itemSource = getItemSource(list.item),
			templater = this;

		function getItemSource(item) {
			if (item === undefined) {
				var nodes = list.list.childNodes,
					items = [];

				for (var i = 0, il = nodes.length; i < il; i++) {
					// Only textnodes have a data attribute
					if (nodes[i].data === undefined) {
						return nodes[i];
					}
				}
				return null;
			} else if (item.indexOf("<") !== -1) { // Try create html element of list, do not work for tables!!
				var div = document.createElement('div');
				div.innerHTML = item;
				return div.firstChild;
			} else {
				return document.getElementById(list.item);
			}
		}

		/* Get values from element */
		this.get = function(item, valueNames) {
			templater.create(item);
			var values = {};
			for(var i = 0, il = valueNames.length; i < il; i++) {
				var elm = getByClass(item.elm, valueNames[i], true);
				values[valueNames[i]] = elm ? elm.innerHTML : "";
			}
			return values;
		};

		/* Sets values at element */
		this.set = function(item, values) {
			if (!templater.create(item)) {
				for(var v in values) {
					if (values.hasOwnProperty(v)) {
						// TODO speed up if possible
						var elm = getByClass(item.elm, v, true);
						if (elm) {
							/* src attribute for image tag & text for other tags */
							if (elm.tagName === "IMG" && values[v] !== "") {
								elm.src = values[v];
							} else {
								elm.innerHTML = values[v];
							}
						}
					}
				}
			}
		};

		this.create = function(item) {
			if (item.elm !== undefined) {
				return false;
			}
			/* If item source does not exists, use the first item in list as
    source for new items */
			var newItem = itemSource.cloneNode(true);
			newItem.removeAttribute('id');
			item.elm = newItem;
			templater.set(item, item.values());
			return true;
		};
		this.remove = function(item) {
			if (item.elm.parentNode === list.list) {
				list.list.removeChild(item.elm);
			}
		};
		this.show = function(item) {
			templater.create(item);
			list.list.appendChild(item.elm);
		};
		this.hide = function(item) {
			if (item.elm !== undefined && item.elm.parentNode === list.list) {
				list.list.removeChild(item.elm);
			}
		};
		this.clear = function() {
			/* .innerHTML = ''; fucks up IE */
			if (list.list.hasChildNodes()) {
				while (list.list.childNodes.length >= 1)
				{
					list.list.removeChild(list.list.firstChild);
				}
			}
		};
	};

	module.exports = function(list) {
		return new Templater(list);
	};

},{"./utils/get-by-class":12}],8:[function(require,module,exports){
/**
 * Module dependencies.
 */

	var index = require('./index-of');

	/**
 * Whitespace regexp.
 */

	var re = /\s+/;

	/**
 * toString reference.
 */

	var toString = Object.prototype.toString;

	/**
 * Wrap `el` in a `ClassList`.
 *
 * @param {Element} el
 * @return {ClassList}
 * @api public
 */

	module.exports = function(el){
		return new ClassList(el);
	};

	/**
 * Initialize a new ClassList for `el`.
 *
 * @param {Element} el
 * @api private
 */

	function ClassList(el) {
		if (!el || !el.nodeType) {
			throw new Error('A DOM element reference is required');
		}
		this.el = el;
		this.list = el.classList;
	}

	/**
 * Add class `name` if not already present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

	ClassList.prototype.add = function(name){
		// classList
		if (this.list) {
			this.list.add(name);
			return this;
		}

		// fallback
		var arr = this.array();
		var i = index(arr, name);
		if (!~i) arr.push(name);
		this.el.className = arr.join(' ');
		return this;
	};

	/**
 * Remove class `name` when present, or
 * pass a regular expression to remove
 * any which match.
 *
 * @param {String|RegExp} name
 * @return {ClassList}
 * @api public
 */

	ClassList.prototype.remove = function(name){
		if ('[object RegExp]' == toString.call(name)) {
			return this.removeMatching(name);
		}

		// classList
		if (this.list) {
			this.list.remove(name);
			return this;
		}

		// fallback
		var arr = this.array();
		var i = index(arr, name);
		if (~i) arr.splice(i, 1);
		this.el.className = arr.join(' ');
		return this;
	};

	/**
 * Remove all classes matching `re`.
 *
 * @param {RegExp} re
 * @return {ClassList}
 * @api private
 */

	ClassList.prototype.removeMatching = function(re){
		var arr = this.array();
		for (var i = 0; i < arr.length; i++) {
			if (re.test(arr[i])) {
				this.remove(arr[i]);
			}
		}
		return this;
	};

	/**
 * Toggle class `name`, can force state via `force`.
 *
 * For browsers that support classList, but do not support `force` yet,
 * the mistake will be detected and corrected.
 *
 * @param {String} name
 * @param {Boolean} force
 * @return {ClassList}
 * @api public
 */

	ClassList.prototype.toggle = function(name, force){
		// classList
		if (this.list) {
			if ("undefined" !== typeof force) {
				if (force !== this.list.toggle(name, force)) {
					this.list.toggle(name); // toggle again to correct
				}
			} else {
				this.list.toggle(name);
			}
			return this;
		}

		// fallback
		if ("undefined" !== typeof force) {
			if (!force) {
				this.remove(name);
			} else {
				this.add(name);
			}
		} else {
			if (this.has(name)) {
				this.remove(name);
			} else {
				this.add(name);
			}
		}

		return this;
	};

	/**
 * Return an array of classes.
 *
 * @return {Array}
 * @api public
 */

	ClassList.prototype.array = function(){
		var className = this.el.getAttribute('class') || '';
		var str = className.replace(/^\s+|\s+$/g, '');
		var arr = str.split(re);
		if ('' === arr[0]) arr.shift();
		return arr;
	};

	/**
 * Check if class `name` is present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

	ClassList.prototype.has =
ClassList.prototype.contains = function(name){
	return this.list ? this.list.contains(name) : !! ~index(this.array(), name);
};

},{"./index-of":13}],9:[function(require,module,exports){
	var bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
		unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent',
		prefix = bind !== 'addEventListener' ? 'on' : '',
		toArray = require('./to-array');

	/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el, NodeList, HTMLCollection or Array
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @api public
 */

	exports.bind = function(el, type, fn, capture){
		el = toArray(el);
		for ( var i = 0; i < el.length; i++ ) {
			el[i][bind](prefix + type, fn, capture || false);
		}
	};

	/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el, NodeList, HTMLCollection or Array
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @api public
 */

	exports.unbind = function(el, type, fn, capture){
		el = toArray(el);
		for ( var i = 0; i < el.length; i++ ) {
			el[i][unbind](prefix + type, fn, capture || false);
		}
	};

},{"./to-array":15}],10:[function(require,module,exports){
/*
 * Source: https://github.com/segmentio/extend
 */

	module.exports = function extend (object) {
		// Takes an unlimited number of extenders.
		var args = Array.prototype.slice.call(arguments, 1);

		// For each extender, copy their properties on our object.
		for (var i = 0, source; source = args[i]; i++) {
			if (!source) continue;
			for (var property in source) {
				object[property] = source[property];
			}
		}

		return object;
	};

},{}],11:[function(require,module,exports){
/**
 * A cross-browser implementation of getAttribute.
 * Source found here: http://stackoverflow.com/a/3755343/361337 written by Vivin Paliath
 *
 * Return the value for `attr` at `element`.
 *
 * @param {Element} el
 * @param {String} attr
 * @api public
 */

	module.exports = function(el, attr) {
		var result = (el.getAttribute && el.getAttribute(attr)) || null;
		if( !result ) {
			var attrs = el.attributes;
			var length = attrs.length;
			for(var i = 0; i < length; i++) {
				if (attr[i] !== undefined) {
					if(attr[i].nodeName === attr) {
						result = attr[i].nodeValue;
					}
				}
			}
		}
		return result;
	};

},{}],12:[function(require,module,exports){
/**
 * A cross-browser implementation of getElementsByClass.
 * Heavily based on Dustin Diaz's function: http://dustindiaz.com/getelementsbyclass.
 *
 * Find all elements with class `className` inside `container`.
 * Use `single = true` to increase performance in older browsers
 * when only one element is needed.
 *
 * @param {String} className
 * @param {Element} container
 * @param {Boolean} single
 * @api public
 */

	module.exports = (function() {
		if (document.getElementsByClassName) {
			return function(container, className, single) {
				if (single) {
					return container.getElementsByClassName(className)[0];
				} else {
					return container.getElementsByClassName(className);
				}
			};
		} else if (document.querySelector) {
			return function(container, className, single) {
				className = '.' + className;
				if (single) {
					return container.querySelector(className);
				} else {
					return container.querySelectorAll(className);
				}
			};
		} else {
			return function(container, className, single) {
				var classElements = [],
					tag = '*';
				if (container === null) {
					container = document;
				}
				var els = container.getElementsByTagName(tag);
				var elsLen = els.length;
				var pattern = new RegExp("(^|\\s)"+className+"(\\s|$)");
				for (var i = 0, j = 0; i < elsLen; i++) {
					if ( pattern.test(els[i].className) ) {
						if (single) {
							return els[i];
						} else {
							classElements[j] = els[i];
							j++;
						}
					}
				}
				return classElements;
			};
		}
	})();

},{}],13:[function(require,module,exports){
	var indexOf = [].indexOf;

	module.exports = function(arr, obj){
		if (indexOf) return arr.indexOf(obj);
		for (var i = 0; i < arr.length; ++i) {
			if (arr[i] === obj) return i;
		}
		return -1;
	};

},{}],14:[function(require,module,exports){
/*
 * Natural Sort algorithm for Javascript - Version 0.8 - Released under MIT license
 * Author: Jim Palmer (based on chunking idea from Dave Koelle)
 */
	//module.exports = function(a, b, opts) {
	//    var re = /(^([+\-]?(?:\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?)?$|^0x[\da-fA-F]+$|\d+)/g,
	//        sre = /^\s+|\s+$/g,   // trim pre-post whitespace
	//        snre = /\s+/g,        // normalize all whitespace to single ' ' character
	//        dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
	//        hre = /^0x[0-9a-f]+$/i,
	//        ore = /^0/,
	//        options = opts || {},
	//        i = function(s) { return options.insensitive && (''+s).toLowerCase() || ''+s; },
	//        // convert all to strings strip whitespace
	//        x = i(a) || '',
	//        y = i(b) || '',
	//        // chunk/tokenize
	//        xN = x.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
	//        yN = y.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
	//        // numeric, hex or date detection
	//        xD = parseInt(x.match(hre), 16) || (xN.length !== 1 && Date.parse(x)),
	//        yD = parseInt(y.match(hre), 16) || xD && y.match(dre) && Date.parse(y) || null,
	//        normChunk = function(s, l) {
	//            // normalize spaces; find floats not starting with '0', string or 0 if not defined (Clint Priest)
	//            return (!s.match(ore) || l == 1) && parseFloat(s) || s.replace(snre, ' ').replace(sre, '') || 0;
	//        },
	//        oFxNcL, oFyNcL,
	//        mult = options.desc ? -1 : 1;
	//    // first try and sort Hex codes or Dates
	//    if (yD) {
	//        if ( xD < yD ) { return -1 * mult; }
	//        else if ( xD > yD ) { return 1 * mult; }
	//    }
	//    // natural sorting through split numeric strings and default strings
	//    for(var cLoc=0, xNl = xN.length, yNl = yN.length, numS=Math.max(xNl, yNl); cLoc < numS; cLoc++) {
	//        oFxNcL = normChunk(xN[cLoc], xNl);
	//        oFyNcL = normChunk(yN[cLoc], yNl);
	//        // handle numeric vs string comparison - number < string - (Kyle Adams)
	//        if (isNaN(oFxNcL) !== isNaN(oFyNcL)) { return (isNaN(oFxNcL)) ? 1 : -1; }
	//        // rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
	//        else if (typeof oFxNcL !== typeof oFyNcL) {
	//            oFxNcL += '';
	//            oFyNcL += '';
	//        }
	//        if (oFxNcL < oFyNcL) { return -1 * mult; }
	//        if (oFxNcL > oFyNcL) { return 1 * mult; }
	//    }
	//    return 0;
	//};
	//BX: reverted back to Version 0.7 (see above) since 0.8 through exceptions
	module.exports = function(a, b, options) {
		var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi,
			sre = /(^[ ]*|[ ]*$)/g,
			dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
			hre = /^0x[0-9a-f]+$/i,
			ore = /^0/,
			options = options || {},
			i = function(s) { return options.insensitive && (''+s).toLowerCase() || ''+s; },
			// convert all to strings strip whitespace
			x = i(a).replace(sre, '') || '',
			y = i(b).replace(sre, '') || '',
			// chunk/tokenize
			xN = x.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
			yN = y.replace(re, '\0$1\0').replace(/\0$/,'').replace(/^\0/,'').split('\0'),
			// numeric, hex or date detection
			xD = parseInt(x.match(hre)) || (xN.length != 1 && x.match(dre) && Date.parse(x)),
			yD = parseInt(y.match(hre)) || xD && y.match(dre) && Date.parse(y) || null,
			oFxNcL, oFyNcL,
			mult = options.desc ? -1 : 1;
		// first try and sort Hex codes or Dates
		if (yD)
			if ( xD < yD ) return -1 * mult;
			else if ( xD > yD ) return 1 * mult;
		// natural sorting through split numeric strings and default strings
		for(var cLoc=0, numS=Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
			// find floats not starting with '0', string or 0 if not defined (Clint Priest)
			oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
			oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;
			// handle numeric vs string comparison - number < string - (Kyle Adams)
			if (isNaN(oFxNcL) !== isNaN(oFyNcL)) { return (isNaN(oFxNcL)) ? 1 : -1; }
			// rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
			else if (typeof oFxNcL !== typeof oFyNcL) {
				oFxNcL += '';
				oFyNcL += '';
			}
			if (oFxNcL < oFyNcL) return -1 * mult;
			if (oFxNcL > oFyNcL) return 1 * mult;
		}
		return 0;
	};

},{}],15:[function(require,module,exports){
/**
 * Source: https://github.com/timoxley/to-array
 *
 * Convert an array-like object into an `Array`.
 * If `collection` is already an `Array`, then will return a clone of `collection`.
 *
 * @param {Array | Mixed} collection An `Array` or array-like object to convert e.g. `arguments` or `NodeList`
 * @return {Array} Naive conversion of `collection` to a new `Array`.
 * @api public
 */

	module.exports = function toArray(collection) {
		if (typeof collection === 'undefined') return [];
		if (collection === null) return [null];
		if (collection === window) return [window];
		if (typeof collection === 'string') return [collection];
		if (isArray(collection)) return collection;
		if (typeof collection.length != 'number') return [collection];
		if (typeof collection === 'function' && collection instanceof Function) return [collection];

		var arr = [];
		for (var i = 0; i < collection.length; i++) {
			if (Object.prototype.hasOwnProperty.call(collection, i) || i in collection) {
				arr.push(collection[i]);
			}
		}
		if (!arr.length) return [];
		return arr;
	};

	function isArray(arr) {
		return Object.prototype.toString.call(arr) === "[object Array]";
	}

},{}],16:[function(require,module,exports){
	module.exports = function(s) {
		s = (s === undefined) ? "" : s;
		s = (s === null) ? "" : s;
		s = s.toString();
		return s;
	};

},{}],17:[function(require,module,exports){
/*
List.js 1.1.1
By Jonny Strömberg (www.jonnystromberg.com, www.listjs.com)
*/
	(function( window, undefined ) {
		"use strict";

		var document = window.document,
			getByClass = require('./src/utils/get-by-class'),
			extend = require('./src/utils/extend'),
			indexOf = require('./src/utils/index-of');

		var List = function(id, options, values) {

			var self = this,
				init,
				Item = require('./src/item')(self),
				addAsync = require('./src/add-async')(self);

			init = {
				start: function() {
					self.listClass      = "list";
					self.searchClass    = "search";
					self.sortClass      = "sort";
					self.page           = 200;
					self.i              = 1;
					self.items          = [];
					self.visibleItems   = [];
					self.matchingItems  = [];
					self.searched       = false;
					self.filtered       = false;
					self.handlers       = { 'updated': [] };
					self.plugins        = {};
					self.helpers        = {
						getByClass: getByClass,
						extend: extend,
						indexOf: indexOf
					};

					extend(self, options);

					self.listContainer = (typeof(id) === 'string') ? document.getElementById(id) : id;
					if (!self.listContainer) { return; }
					self.list       = getByClass(self.listContainer, self.listClass, true);

					self.parse      = require('./src/parse')(self);
					self.templater  = require('./src/templater')(self);
					self.search     = require('./src/search')(self);
					self.filter     = require('./src/filter')(self);
					self.sort       = require('./src/sort')(self);

					this.handlers();
					this.items();
					self.update();
					this.plugins();
				},
				handlers: function() {
					for (var handler in self.handlers) {
						if (self[handler]) {
							self.on(handler, self[handler]);
						}
					}
				},
				items: function() {
					self.parse(self.list);
					if (values !== undefined) {
						self.add(values);
					}
				},
				plugins: function() {
					for (var i = 0; i < self.plugins.length; i++) {
						var plugin = self.plugins[i];
						self[plugin.name] = plugin;
						plugin.init(self, List);
					}
				}
			};
  
			/*
   * Re-parse the List, use if html have changed
   */
			this.reIndex = function() {
				self.items          = [];
				self.visibleItems   = [];
				self.matchingItems  = [];
				self.searched       = false;
				self.filtered       = false;
				self.parse(self.list);
			};

			/*
  * Add object to list
  */
			this.add = function(values, callback) {
				if (callback) {
					addAsync(values, callback);
					return;
				}
				var added = [],
					notCreate = false;
				if (values[0] === undefined){
					values = [values];
				}
				for (var i = 0, il = values.length; i < il; i++) {
					var item = null;
					if (values[i] instanceof Item) {
						item = values[i];
						item.reload();
					} else {
						notCreate = (self.items.length > self.page) ? true : false;
						item = new Item(values[i], undefined, notCreate);
					}
					self.items.push(item);
					added.push(item);
				}
				self.update();
				return added;
			};

			this.show = function(i, page) {
				this.i = i;
				this.page = page;
				self.update();
				return self;
			};

			/* Removes object from list.
  * Loops through the list and removes objects where
  * property "valuename" === value
  */
			this.remove = function(valueName, value, options) {
				var found = 0;
				for (var i = 0, il = self.items.length; i < il; i++) {
					if (self.items[i].values()[valueName] == value) {
						self.templater.remove(self.items[i], options);
						self.items.splice(i,1);
						il--;
						i--;
						found++;
					}
				}
				self.update();
				return found;
			};

			/* Gets the objects in the list which
  * property "valueName" === value
  */
			this.get = function(valueName, value) {
				var matchedItems = [];
				for (var i = 0, il = self.items.length; i < il; i++) {
					var item = self.items[i];
					if (item.values()[valueName] == value) {
						matchedItems.push(item);
					}
				}
				return matchedItems;
			};

			/*
  * Get size of the list
  */
			this.size = function() {
				return self.items.length;
			};

			/*
  * Removes all items from the list
  */
			this.clear = function() {
				self.templater.clear();
				self.items = [];
				return self;
			};

			this.on = function(event, callback) {
				self.handlers[event].push(callback);
				return self;
			};

			this.off = function(event, callback) {
				var e = self.handlers[event];
				var index = indexOf(e, callback);
				if (index > -1) {
					e.splice(index, 1);
				}
				return self;
			};

			this.trigger = function(event) {
				var i = self.handlers[event].length;
				while(i--) {
					self.handlers[event][i](self);
				}
				return self;
			};

			this.reset = {
				filter: function() {
					var is = self.items,
						il = is.length;
					while (il--) {
						is[il].filtered = false;
					}
					return self;
				},
				search: function() {
					var is = self.items,
						il = is.length;
					while (il--) {
						is[il].found = false;
					}
					return self;
				}
			};

			this.update = function() {
				var is = self.items,
					il = is.length;

				self.visibleItems = [];
				self.matchingItems = [];
				self.templater.clear();
				for (var i = 0; i < il; i++) {
					if (is[i].matching() && ((self.matchingItems.length+1) >= self.i && self.visibleItems.length < self.page)) {
						is[i].show();
						self.visibleItems.push(is[i]);
						self.matchingItems.push(is[i]);
					} else if (is[i].matching()) {
						self.matchingItems.push(is[i]);
						is[i].hide();
					} else {
						is[i].hide();
					}
				}
				self.trigger('updated');
				return self;
			};

			init.start();
		};


		// AMD support
		if (typeof define === 'function' && define.amd) {
			define(function () { return List; });
		} 
		module.exports = List;
		window.List = List;

	})(window);

},{"./src/add-async":1,"./src/filter":2,"./src/item":3,"./src/parse":4,"./src/search":5,"./src/sort":6,"./src/templater":7,"./src/utils/extend":10,"./src/utils/get-by-class":12,"./src/utils/index-of":13}]},{},[17]);
