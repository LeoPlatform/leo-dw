var base = require("../base.js");
var React = require("react");
var moment = require("moment");
var configure = {
	static: {
		uri: "__CDN__/"
	}
};
// require("../leoConfigure.js");

var DataAction = require("../../actions/data.js")

module.exports = function (element, spec, options, my) {
	my = my || {};

	spec = $.extend(true, {}, {
		colors: {
			low: 'red',
			high: 'green',
			invalid: '#444',
			outline: '#FFF'
		},
		zoom: 4,
		mapTypeId: 'roadmap'
			//roadmap displays the default road map view. This is the default map type.
			//satellite displays Google Earth satellite images
			//hybrid displays a mixture of normal and satellite views
			//terrain displays a physical map based on terrain information.
			,
		center: {
			lat: 39.5,
			lng: -98.35
		},
		startDownload: function () {
			DataAction.downloadData("export", null, my.dataSources[0])
		}
	}, spec)

	var that = base(element, spec, options, my);

	var baseChangeChart = my.changeChart

	my.changeChart = function (newSpec, replace, keepFilters) {

		spec = $.extend(true, {}, spec, newSpec)

		RGB()

		var newParams = {
			metrics: (newSpec.metrics ? spec.metrics : undefined),
			columns: (stateLevel ? [spec.state] : [spec.country]),
			filters: (newSpec.filters ? spec.filters : undefined)
		}
		baseChangeChart(newParams, replace, keepFilters)
	}

	my.googleMap = null

	var googleMap,
		countryBorders = 'country.geo.json',
		stateLevel = false,
		stats = {},
		legendBoxes, features = [],
		max = 0,
		min = -1,
		formattedMax = '',
		formattedMin = '',
		divisor = 1,
		RGB = {},
		stateBorders = {
			'united states': 'us_admin_level_4.geojson' //'gz_2010_us_040_00_20m.json'
				,
			'canada': 'canada_admin_level_4.geojson',
			'mexico': 'mexico_admin_level_4.geojson',
			'australia': 'australia_admin_level_4.geojson',
			'united kingdom': 'uk_admin_level_4.geojson',
			'spain': 'spain_admin_level_4.geojson',
			'brazil': 'brazil_admin_level_4.geojson'
		},
		googleMapWrapper, countryData;

	$.getJSON(configure.static.uri + 'js/maps/' + countryBorders, function (data) {
		countryData = data

		if (spec.defaultCountry) {
			countryData.features.forEach(function (feature) {
				if (feature.properties.iso_a2 == spec.defaultCountry) {
					stateLevel = feature.properties.name.toLowerCase()
				} else if (feature.properties.iso_a3 == spec.defaultCountry) {
					stateLevel = feature.properties.name.toLowerCase()
				}
				if (feature.properties.name == spec.defaultCountry) {
					stateLevel = feature.properties.name.toLowerCase()
				}
			})
		}
	})

	if (spec.defaultCountry && spec.state) {
		my.setFilter({
			id: spec.country,
			comparison: '=',
			value: spec.defaultCountry
		}, false)
		spec.columns = [spec.state]
	} else {
		spec.columns = [spec.country]
	}

	RGB = function () {
		var colorToRGB = $('<div>');
		$('body').append(colorToRGB)
		for (var i in spec.colors) {
			colorToRGB.css({
				color: spec.colors[i]
			})
			RGB[i] = window.getComputedStyle(colorToRGB[0]).color.split(/[(,)] ?/).slice(1, 5)
			RGB[i][3] = (RGB[i][3] || 1)
		}
		colorToRGB.remove()
	}

	RGB()

	function initMap() {

		googleMapWrapper = element.find('.google-map-wrapper')

		my.googleMap = googleMap = new google.maps.Map(element.find('.google-map')[0], {
			zoom: parseInt(spec.zoom),
			mapTypeId: spec.mapTypeId,
			center: {
				lat: parseFloat(spec.center.lat),
				lng: parseFloat(spec.center.lng)
			}
		});

		element.data('leo').googleMap = googleMap
		element.data('leo').changeChart = my.changeChart

		features = googleMap.data.addGeoJson(countryData);

		googleMap.data.setStyle(function (feature) {
			var code = _lookup(feature),
				name = _unify(feature.getProperty('name')),
				color = 'transparent',
				strokeWeight = 0,
				fillOpacity = 0,
				zIndex = 1

			if ((!stateLevel || stateLevel != name) && name != 'antarctica') {
				color = 'rgba(' + RGB.invalid.join(',') + ')'
				fillOpacity = .8
			}

			if (code && stateLevel != name) {

				stats[code].percent = ((stats[code].raw - min) / divisor) || 0

				function scaleColor(i) {
					return Math.floor((stats[code].raw - min) / divisor * (RGB.high[i] - RGB.low[i]) + RGB.low[i] * 1)
				}

				color = 'rgb(' + scaleColor(0) + ', ' + scaleColor(1) + ', ' + scaleColor(2) + ')'
				strokeWeight = 0.5
				fillOpacity = Math.min(RGB.high[3], RGB.low[3], .75)
			}

			if (feature.getProperty('state') === 'hover') {
				strokeWeight = zIndex = 2
			}

			return {
				visible: color !== 'transparent',
				fillColor: color,
				strokeWeight: strokeWeight,
				fillOpacity: fillOpacity,
				strokeColor: 'rgba(' + RGB.outline.join(',') + ')',
				zIndex: zIndex
			}
		})

		if (stateLevel in stateBorders) {
			element.trigger("leo-loading");
			that.showLoading()
			var mapFile = stateBorders[stateLevel]
			$.getJSON(configure.static.uri + 'js/maps/' + mapFile, function (data) {
				features = googleMap.data.addGeoJson(data);
			});
		}

		my.legendBoxes = legendBoxes = element.find('.legend-boxes')

		legendBoxes.find('.scale-wrapper .min').text(formattedMin)
		legendBoxes.find('.scale-wrapper .max').text(formattedMax)

		legendBoxes.find('.scale-wrapper .scale').css({
			background: 'linear-gradient(90deg, rgba(' + RGB.low.join(',') + '), rgba(' + RGB.high.join(',') + '))'
		})

		googleMap.controls[google.maps.ControlPosition.TOP_LEFT].push(legendBoxes.get(0))

		googleMap.data.addListener('mouseover', function (event) {
			var code = _lookup(event.feature)
			if (code) {
				$('.selected-region label').text(event.feature.getProperty('name') || event.feature.getProperty('NAME'))
				$('.selected-region strong').text(stats[code].formatted)
				legendBoxes.find('.caret').css({
					marginLeft: (stats[code].percent + '%')
				})
			}
			event.feature.setProperty('state', 'hover')
		});

		googleMap.data.addListener('mouseout', function (event) {
			$('.selected-region label, .selected-region strong').text('')
			event.feature.setProperty('state', 'normal')
			legendBoxes.find('.caret').css({
				marginLeft: 0
			})
		});

		googleMap.data.addListener('click', function (event) {
			var code = _lookup(event.feature),
				name = _unify(event.feature.getProperty('name'))

			if (spec.state && code && name in stateBorders) {
				element.trigger("leo-loading");
				that.showLoading()
				googleMapWrapper.append($('.legend-boxes'))
				stateLevel = name
				my.setFilter({
					id: spec.country,
					comparison: '=',
					value: stats[code].code
				}, false)
				baseChangeChart({
					columns: [spec.state]
				})
			} else if (stateLevel !== false) {
				element.trigger("leo-loading");
				that.showLoading()
				googleMapWrapper.append($('.legend-boxes'))
				stateLevel = false
				my.setFilter({
					id: spec.country
				}, false)
				baseChangeChart({
					columns: [spec.country]
				})
			}
		})

		googleMap.addListener('zoom_changed', function () {
			spec.zoom = googleMap.getZoom()
		})

		googleMap.addListener('center_changed', function () {
			var center = googleMap.getCenter()
			spec.center = {
				lat: center.lat(),
				lng: center.lng()
			}
		})

		element.trigger("leo-complete");
		that.hideLoading()

	}

	function _lookup(feature, key) {
		if (!key) {
			if (stateLevel) {
				return _lookup(feature, 'ref') || _lookup(feature, 'ISO3166-2') || _lookup(feature, 'name') || false

			} else {
				return _lookup(feature, 'iso_a2') || _lookup(feature, 'iso_a3') || _lookup(feature, 'name') || false
			}
		}
		var temp = (feature.getProperty(key) || '').toLowerCase()
		if (temp in stats) {
			return temp
		} else {
			return false
		}
	}

	function _unify(s) {
		if (typeof s == 'undefined') {
			return ''
		}
		var accents = {
			a: 'àáâãäåæ',
			c: 'ç',
			e: 'èéêëæ',
			i: 'ìíîï',
			n: 'ñ',
			o: 'òóôõöø',
			s: 'ß',
			u: 'ùúûü',
			y: 'ÿ'
		}
		s = s.toString().trim().toLowerCase()
		for (var i in accents) {
			var re = new RegExp('[' + accents[i] + ']', 'g')
			s = s.replace(re, i)
		}
		return s
	}

	function changeMetric(e) {
		baseChangeChart({
			metrics: [{
				id: e.currentTarget.value
			}]
		})
	}

	my.redraw = function () {

		element.trigger("leo-loading")
		that.showLoading()
		googleMapWrapper && googleMapWrapper.append($('.legend-boxes'))

		var results = my.dataSources[0]

		max = 0
		min = -1
		formattedMin = formattedMax = ''
		stats = {}

		;
		(results.rows || []).forEach(function (row) {
			var raw = ((row[1] || '').toString().replace(/,/g, '') * 1),
				code = _unify(row[0])

			stats[code] = {
				code: row[0],
				raw: raw,
				formatted: results.mapping[1].formatter(row[1])
			}

			if (raw > max) {
				max = raw
				formattedMax = stats[code].formatted
			}

			if (raw < min || min == -1) {
				min = raw
				formattedMin = stats[code].formatted
			}
		})

		divisor = ((max - min)) || 1

		var selectBox = {
				values: []
			},
			metrics = []

		spec.metrics.forEach((metric) => {
			if (typeof metric == 'string') {
				metric = {
					id: metric,
					label: metric
				}
			}
			if (metric.default) {
				metrics.unshift(metric)
			} else {
				metrics.push(metric)
			}
			if (metric.label) {
				selectBox.values.push({
					text: metric.label,
					value: metric.id
				})
				if (!selectBox.defaultValue || metric.default) {
					selectBox.defaultValue = metric.id
				}
			}
		})

		setTimeout(initMap, 0)

		return (<div className="google-map-wrapper">
			<div className="google-map"></div>
			<div className="legend-boxes">
				<div className="legend-wrapper legend-box">
					<select defaultValue={selectBox.defaultValue} className={selectBox.values.length < 2 ? 'disabled' : ''} onChange={changeMetric}>
					{
						selectBox.values.map(function(option, index) {
							return <option key={option.value} value={option.value}>{option.text}</option>
						})
					}
					</select>
					<div className="scale-wrapper">
						<strong className="min"></strong>
						<div className="scale">
							<span className="caret"></span>
						</div>
						<strong className="max"></strong>
					</div>
				</div>
				<div className="selected-region legend-box">
					<label></label><strong></strong>
				</div>
			</div>
		</div>)
	};

	return that;

};