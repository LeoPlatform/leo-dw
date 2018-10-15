var React = require('react');

module.exports = React.createClass({
		
	getInitialState: function() {
		return {
			band: this.props.band || '',
			pattern: (this.props.band == 'all') ? '' : (this.props.band || '')
		}
	},
	
	
	parsePattern: function() {
		
		var pattern = this.refs.pattern.value;
		
		//remove spaces, plus signs, double commas; and split on commas
		var nums = pattern.replace(/\s/g,'').replace(/\+/g,'').replace(/,{2,}/g, ',').split(',');
		for(var i=0;i<nums.length;i++) {
			//if there is a hyphen we are good to go otherwise:
			if (nums[i].indexOf('-') < 1) { 
				if (i == (nums.length-1)) { //if this is the last one
					if (nums[i] == '' && i != 0) {
						var lastNum = parseInt(nums[i-1].split('-').pop(), 10);
						nums[i] += (1+lastNum)
					}
					nums[i] += '+'
				} else {
					var nextNum = parseInt(nums[i+1], 10);
					if (nextNum > (parseInt(nums[i])+1)) {
						nums[i] += '-' + (nextNum-1)
					}
				}
			}
		}
		pattern = nums.join(', ');
				
		if (this.props.bandingChanged) {
			console.log('?')
			//this.props.bandingChanged(this.props.index, this.value(nextState));
		}
		
		this.setState({
			band: pattern,
			pattern: pattern
		})
		
		this.refs.pattern_checkbox.checked = true;
		this.refs.pattern_checkbox.value = pattern.replace(/\s/g, '')
	},
	
	
	setPattern: function(pattern) {
		this.setState({
			band: pattern,
			pattern: pattern
		});
		this.refs.pattern.value = pattern;
		this.refs.pattern_checkbox.checked = true;
		this.refs.pattern_checkbox.value = pattern.replace(/\s/g, '')
	},
	
	
	setBand: function(band) {
		this.setState({ band: this.refs[band].value });
	},
	
	
	value: function(state) {
		var state = state || this.state;
		return state.band;
	},
	

	patterns: [
		'0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10+',
		'0, 1-15, 16-45, 46-90, 91+',
		'0-30, 31-60, 61-90, 91-120, 121+',
		'0, 1, 2-10, 11-50, 51+'
	],

	
	render: function() {
		
		var thisComponent = this;
		
		return <div>
			<div>
				<label>
					<input ref="pattern_checkbox" type="radio" name="banding" defaultValue="custom" defaultChecked={this.state.band != 'all'} onClick={thisComponent.setBand.bind(null, 'pattern')} />
					<span>Pattern</span>
				</label>
				<input ref="pattern" onInput={this.changeCustom} defaultValue={this.state.pattern} onChange={thisComponent.parsePattern} />
			</div>

			<div>
				<label>examples:</label>
			{
				this.patterns.map(function(pattern, index) {
					return <div key={index}>
						<label className="cursor-pointer" onClick={thisComponent.setPattern.bind(null, pattern)}>{pattern}</label>
					</div>
				}, this)
			}
			</div>
			
			<div>
				<label>
					<input ref="all" type="radio" name="banding" value="all" defaultChecked={this.state.band == 'all'} onClick={thisComponent.setBand.bind(null, 'all')} />All
				</label>
			</div>
					
		</div>
		
	}


});
