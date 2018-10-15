var React = require('react');

module.exports = React.createClass({

	typeSettings: {
		all: ['showInLegend', 'dataLabels', 'yAxis'],
		area: ['stacking', 'marker'],
		bar: ['stacking', 'marker'],
		column: ['stacking', 'marker'],
		line: ['stacking', 'marker'],
		pie: ['center', 'size']
	},

	settings: {
		'type': '',
		'center': '',
		'centerLeft': '',
		'centerTop': '',
		'size': '',
		'stacking': '',
		'showInLegend': '',
		'dataLabels': 'disabled',
		'yAxis': '',
		'marker': 'enabled',
		'sort': {
			column: {
				0: 'label',
				1: 'value'
			},
			direction: ['asc','desc']
		}
	},


	getInitialState: function() {
		return {
			pickingCenter: false
		}
	},


	componentDidMount: function() {
		var thisComponent = this;
		$('#chart-preview').on({
			'leo-chart-click': function(e, x, y, box, spacing, margin) {
				if (thisComponent.state.pickingCenter) {
					//console.log('chart click', x, y, box, spacing, margin)
					thisComponent.setState({
						center: [
							(((x - box.x - 20) / (box.width - 40)) * 100).toFixed(2),
							(((y - box.y - 20) / (box.height - 40)) * 100).toFixed(2)
						],
						pickingCenter: false
					}, () => {
						thisComponent.debounceApply();
					});
				}
			},
		});
	},


	timeout: null,

	debounceApply: function() {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		this.timeout = setTimeout(() => {
			this.applyChanges();
			this.timeout = null;
		}, 500)
	},


	applyChanges: function() {
		var thisComponent = this;
		var form = this.refs.advancedForm;
		var highcharts = {}
		$(form).find('input, select').each(function() {
			if ($(this).val() != '') {
				switch($(this).attr('name')) {
					case 'pairName': case 'centerTop':
						//skip
					break;

					case 'pairValue':
						if (form.pairName && form.pairName.value && form.pairValue.value) {
							highcharts[form.pairName.value] = form.pairValue.value;
							form.pairName.value = '';
							form.pairValue.value = '';
						}
					break;

					case 'centerLeft':
						//from user clicking center
						if (thisComponent.state.center) {
							form.centerLeft.value = thisComponent.state.center[0];
							form.centerTop.value = thisComponent.state.center[1];
						}

						if (form.centerTop.value != '') {
							highcharts.center = [form.centerLeft.value + '%', form.centerTop.value + '%'];
						}
					break;

					case 'dataLabelsEnabled':
						highcharts.dataLabels = { enabled: (form.dataLabelsEnabled.checked ? true : false) };
					break;

					case 'markerEnabled':
						highcharts.marker = { enabled: (form.markerEnabled.checked ? true : false) };
					break;

					case 'showInLegend':
						highcharts.showInLegend = (form.showInLegend.checked ? true : false);
					break;

					case 'yAxis':
						if (form.yAxis.checked) {
							highcharts.yAxis = 1;
						}
					break;

					case 'size':
						highcharts[$(this).attr('name')] = ($(this).val()+'%');
					break;

					case 'sort.column':
					case 'sort.direction':
						highcharts.sort = $.extend({}, highcharts.sort, {
							[$(this).attr('name').split('.')[1]]: $(this).val()
						})
					break

					default:
						if ($(this).attr('type') == 'checkbox') {
							if ($(this).is(':checked')) {
								highcharts[$(this).attr('name')] = true;
							}
						} else {
							highcharts[$(this).attr('name')] = $(this).val();
						}
					break;
				}
			}
		});

		this.props.applyChanges(highcharts, this.props.defaults.metric_index)

		this.setState({ center: false });
	},


	pickCenter: function(showMask, e) {
		this.setState({ pickingCenter: true });
	},


	render: function() {
		var thisComponent = this;
		var highcharts = this.props.defaults.metric.highcharts || {}
		var chartType = this.props.defaults.metric.highcharts.type
		var centerLeft = (highcharts && highcharts.center ? parseFloat(highcharts.center[0]) : '50');
		var centerTop = (highcharts && highcharts.center ? parseFloat(highcharts.center[1]) : '50');
		var size = (highcharts && highcharts.size ? parseFloat(highcharts.size) : '100');

		if (chartType == 'pie') {
			var dataLabelsEnabled = ((!highcharts.dataLabels || highcharts.dataLabels.enabled) ? true : false); //defaults to true
			var showInLegend = (highcharts.showInLegend ? true : false); //defaults to false
		} else {
			var dataLabelsEnabled = ((highcharts.dataLabels && highcharts.dataLabels.enabled) ? true : false); //defaults to false
			var showInLegend = (highcharts.showInLegend || highcharts.showInLegend === false ? highcharts.showInLegend : true); // defaults to true
		}

		return (
			<div>

				{
					this.state.pickingCenter
					? <div id="pickingCenter"><span>click location for center of pie chart</span></div>
					: false
				}

				<form ref="advancedForm" className="theme-form inline-table wide-form">

					<div>
						<span style={{width:'50%'}}></span>
						<span style={{width:'50%'}}></span>
					</div>

				{
					chartType == 'pie'
					? [
						<div key="0">
							<label>center <i className="icon-target" onClick={this.pickCenter.bind(null, true)} title="pick center point"></i></label>
							<div>
								<input name="centerLeft" type="number" placeholder="left" defaultValue={centerLeft} style={{width:'5em'}} onChange={this.debounceApply} /><span> %</span>
								<input name="centerTop" type="number" placeholder="top" defaultValue={centerTop} style={{width:'5em'}} onChange={this.debounceApply} /><span> %</span>
							</div>
						</div>,
						<div key="1">
							<label>size</label>
							<div>
								<input name="size" type="number" min="0" defaultValue={size} style={{width:'5em'}} onChange={this.debounceApply} />
								<span> %</span>
							</div>
						</div>
					]
					: false
				}

				{
					chartType == 'area' || chartType == 'bar' || chartType == 'column' || chartType == 'line'
					? <div>
						<label>stacking</label>
						<select name="stacking" defaultValue={highcharts.stacking} onChange={this.debounceApply}>
							<option value="">none</option>
							<option value="normal">Normal</option>
							<option value="percent">Percent</option>
						</select>
					</div>
					: false
				}

					<div>
						<input id="yAxis" name="yAxis" type="checkbox" defaultChecked={highcharts.yAxis} onChange={this.debounceApply} />
						<label htmlFor="yAxis">secondary axis</label>
					</div>

					<div>
						<input id="showInLegend" name="showInLegend" type="checkbox" defaultChecked={showInLegend} onChange={this.debounceApply} />
						<label htmlFor="showInLegend">showInLegend</label>
					</div>

					<div>
						<input id="dataLabelsEnabled" name="dataLabelsEnabled" type="checkbox" defaultChecked={dataLabelsEnabled} onChange={thisComponent.debounceApply} />
						<label htmlFor="dataLabelsEnabled">dataLabels</label>
					</div>

				{
					chartType == 'area' || chartType == 'bar' || chartType == 'column' || chartType == 'line'
					? <div>
						<input id="markerEnabled" name="markerEnabled" type="checkbox" defaultChecked={!highcharts.marker || highcharts.marker.enabled} onChange={thisComponent.debounceApply} />
						<label htmlFor="markerEnabled">marker</label>
					</div>
					: false
				}

				{
					Object.keys(highcharts).map((setting, index) => {
						if (setting in this.settings) {
							return false;
						} else {
							var value = highcharts[setting];
							var type = (!isNaN(parseFloat(value)) && isFinite(value)) ? 'number' : 'text';
							return (<div key={index}>
								<label>{setting}</label>
								<input type={type} name={setting} defaultValue={value} style={{width:'100%'}} onChange={thisComponent.debounceApply} />
							</div>)
						}
					})
				}

					<div>
						<span style={{display:'table-cell',textAlign:'right',verticalAlign:'top',textTransform:'capitalize'}}>
							<input name="pairName" placeholder="Add Name" style={{width:'100%'}} onChange={this.debounceApply} />
						</span>
						<input name="pairValue" placeholder="Add Value" style={{width:'100%'}} onChange={this.debounceApply} />
					</div>

					<strong className="theme-form-heading">Partition Sorting</strong>

					<div>
						<label>Column</label>
						<select name="sort.column" defaultValue={highcharts.sort ? highcharts.sort.column : 0} onChange={this.debounceApply}>
							<option value="0">label</option>
							<option value="1">total</option>
						</select>
					</div>

					<div>
						<label>Direction</label>
						<select name="sort.direction" defaultValue={highcharts.sort ? highcharts.sort.direction : 'asc'} onChange={this.debounceApply}>
							<option value="asc">asc</option>
							<option value="desc">desc</option>
						</select>
					</div>

				</form>

			</div>
		);

	}


});
