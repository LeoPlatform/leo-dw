var React = require('react')

module.exports = React.createClass({

	getInitialState: function() {
		return {

		}
	},


	componentDidMount: function() {

		LeoKit.modal(
			$('.themes-manager'), {
				close: false
			},
			'Themes',
			this.onClose
		)

	},


	onClose: function() {
		this.props.onClose && this.props.onClose()
	},


	render: function() {

		return (<div>
			<div className="themes-manager">

				<div className="theme-form-row">
					<label>Theme</label>
					<select>
						<option>Default</option>
					</select>
				</div>

				<h2>Dialogs</h2>

				<div className="flex-row flex-spread padding-0-20">
					<a onClick={() => { LeoKit.modal('Modal dialog box') }}>Modal</a>
					<a onClick={() => { LeoKit.dialog('Non-modal dialog box') }}>Dialog</a>
					<a onClick={() => { LeoKit.alert('Alert') }}>Alert</a>
					<a onClick={() => { LeoKit.alert('Info', 'info') }}>Info Alert</a>
					<a onClick={() => { LeoKit.alert('Error!', 'error') }}>Error Alert</a>
					<a onClick={() => { LeoKit.confirm('Are you sure?') }}>Confirm</a>
				</div>

				<h2>Buttons</h2>

				<button className="theme-button" type="button">Button</button>

				<button className="theme-button-primary" type="button">Primary Button</button>

				<button className="theme-button-danger" type="button">Danger Button</button>

				<button className="theme-button-warning" type="button">Warning Button</button>

				<button className="theme-button-success" type="button">Success Button</button>

				<button className="theme-button-disabled" disabled="disabled" type="button">Disabled Button</button>

				<button className="theme-button-icon" type="button"><i className="icon-cogs" /> icon button </button>


				<h2>Forms</h2>

				<div className="theme-form">

					<div>
						<label>Text Input Box</label><input type="text" placeholder="text box" />
					</div>

					<div>
						<label>Number Input Box</label><input type="number" placeholder="0.00" />
					</div>

					<div>
						<label>Text Area</label>
						<textarea />
					</div>

					<div>
						<label>Select Box</label>
						<select>
							<option>Option 1</option>
							<option>Option 2</option>
							<option>Option 3</option>
							<option>Option 4</option>
						</select>
					</div>

					<div>
						<label>Multi-Select Box</label>
						<select multiple>
							<option>Option 1</option>
							<option>Option 2</option>
							<option>Option 3</option>
							<option>Option 4</option>
						</select>
					</div>

				</div>

				<h2>Tabs</h2>

				<div className="theme-tabs">
					<ul>
						<li>First Tab</li>
						<li>2nd</li>
					</ul>
					<div>
						<div className="active">
							First Tab Contents
						</div>
						<div>
							2nd contents
						</div>
					</div>
				</div>

				<h2>Popups</h2>

				<h2>Dropdowns</h2>

				<ul>
					<li className="theme-dropdown-left">
						Dropdown to the left
						<ul>
							<li><a className="active">Item A</a></li>
							<li><a>Item B</a></li>
						</ul>
					</li>
					<li className="theme-dropdown-right">
						Dropdown to the right
						<ul>
							<li><a className="active">Item A</a></li>
							<li><a>Item B</a></li>
						</ul>
					</li>
				</ul>

				<h2>Loaders</h2>

				<div className="flex-row flex-spread">

					<a onClick={() => { LeoKit.alert('<h1>closing in 5 secs...</h1> <div class="theme-spinner-fill"></div>') }}>Full Screen</a>

					<span className="theme-spinner" style={{display: 'inline-block', width: 400, height: 300}}>Normal</span>

					<span className="theme-spinner-tiny" style={{display: 'inline-block', width: 200, height: 100}}>Tiny</span>

				</div>

				<h2>Misc.</h2>

					<a>links</a>

					<p>plain text</p>

					<select multiple>
						<option className="active">selected / active item</option>
						<option>scrollbars</option>
						<option>scrollbars</option>
						<option>scrollbars</option>
						<option>scrollbars</option>
						<option>scrollbars</option>
					</select>


				<h2>Tables</h2>

				<div className="icon-list theme-table-fixed-header" style={{width: 500, height: 200 }}>
					<table>
						<thead>
							<tr>
								<th>Icon</th>
								<th>Name</th>
							</tr>
						</thead>
						<tbody>

							<tr><td><i className="icon-ion-social-buffer-outline" title="icon-ion-social-buffer-outline" /></td><td>icon-ion-social-buffer-outline</td></tr>
							<tr><td><i className="icon-spin1" title="icon-spin1" /></td><td>icon-spin1</td></tr>
							<tr><td><i className="icon-spin2" title="icon-spin2" /></td><td>icon-spin2</td></tr>
							<tr><td><i className="icon-spin4" title="icon-spin4" /></td><td>icon-spin4</td></tr>
							<tr><td><i className="icon-spin6" title="icon-spin6" /></td><td>icon-spin6</td></tr>
							<tr><td><i className="icon-search" title="icon-search" /></td><td>icon-search</td></tr>
							<tr><td><i className="icon-cancel" title="icon-cancel" /></td><td>icon-cancel</td></tr>
							<tr><td><i className="icon-cancel-circled" title="icon-cancel-circled" /></td><td>icon-cancel-circled</td></tr>
							<tr><td><i className="icon-cancel-circled-o" title="icon-cancel-circled-o" /></td><td>icon-cancel-circled-o</td></tr>
							<tr><td><i className="icon-plus" title="icon-plus" /></td><td>icon-plus</td></tr>
							<tr><td><i className="icon-plus-circled" title="icon-plus-circled" /></td><td>icon-plus-circled</td></tr>
							<tr><td><i className="icon-plus-squared" title="icon-plus-squared" /></td><td>icon-plus-squared</td></tr>
							<tr><td><i className="icon-plus-squared-alt" title="icon-plus-squared-alt" /></td><td>icon-plus-squared-alt</td></tr>
							<tr><td><i className="icon-help-circled" title="icon-help-circled" /></td><td>icon-help-circled</td></tr>
							<tr><td><i className="icon-pin" title="icon-pin" /></td><td>icon-pin</td></tr>
							<tr><td><i className="icon-download" title="icon-download" /></td><td>icon-download</td></tr>
							<tr><td><i className="icon-code" title="icon-code" /></td><td>icon-code</td></tr>
							<tr><td><i className="icon-share" title="icon-share" /></td><td>icon-share</td></tr>
							<tr><td><i className="icon-edit" title="icon-edit" /></td><td>icon-edit</td></tr>
							<tr><td><i className="icon-copy" title="icon-copy" /></td><td>icon-copy</td></tr>
							<tr><td><i className="icon-cog" title="icon-cog" /></td><td>icon-cog</td></tr>
							<tr><td><i className="icon-cogs" title="icon-cogs" /></td><td>icon-cogs</td></tr>
							<tr><td><i className="icon-calendar" title="icon-calendar" /></td><td>icon-calendar</td></tr>
							<tr><td><i className="icon-move" title="icon-move" /></td><td>icon-move</td></tr>
							<tr><td><i className="icon-down-dir" title="icon-down-dir" /></td><td>icon-down-dir</td></tr>
							<tr><td><i className="icon-up-dir" title="icon-up-dir" /></td><td>icon-up-dir</td></tr>
							<tr><td><i className="icon-left-dir" title="icon-left-dir" /></td><td>icon-left-dir</td></tr>
							<tr><td><i className="icon-right-dir" title="icon-right-dir" /></td><td>icon-right-dir</td></tr>
							<tr><td><i className="icon-right" title="icon-right" /></td><td>icon-right</td></tr>
							<tr><td><i className="icon-level-up" title="icon-level-up" /></td><td>icon-level-up</td></tr>
							<tr><td><i className="icon-exchange" title="icon-exchange" /></td><td>icon-exchange</td></tr>
							<tr><td><i className="icon-history" title="icon-history" /></td><td>icon-history</td></tr>
							<tr><td><i className="icon-table" title="icon-table" /></td><td>icon-table</td></tr>
							<tr><td><i className="icon-ellipsis" title="icon-ellipsis" /></td><td>icon-ellipsis</td></tr>
							<tr><td><i className="icon-chart-pie" title="icon-chart-pie" /></td><td>icon-chart-pie</td></tr>
							<tr><td><i className="icon-sort" title="icon-sort" /></td><td>icon-sort</td></tr>
							<tr><td><i className="icon-spinner" title="icon-spinner" /></td><td>icon-spinner</td></tr>
							<tr><td><i className="icon-eraser" title="icon-eraser" /></td><td>icon-eraser</td></tr>
							<tr><td><i className="icon-jsfiddle" title="icon-jsfiddle" /></td><td>icon-jsfiddle</td></tr>
							<tr><td><i className="icon-info" title="icon-info" /></td><td>icon-info</td></tr>
							<tr><td><i className="icon-link" title="icon-link" /></td><td>icon-link</td></tr>
							<tr><td><i className="icon-shareable" title="icon-shareable" /></td><td>icon-shareable</td></tr>
							<tr><td><i className="icon-window" title="icon-window" /></td><td>icon-window</td></tr>
							<tr><td><i className="icon-switch" title="icon-switch" /></td><td>icon-switch</td></tr>
							<tr><td><i className="icon-chart-line" title="icon-chart-line" /></td><td>icon-chart-line</td></tr>
							<tr><td><i className="icon-chart-area" title="icon-chart-area" /></td><td>icon-chart-area</td></tr>
							<tr><td><i className="icon-database" title="icon-database" /></td><td>icon-database</td></tr>
							<tr><td><i className="icon-flow-tree" title="icon-flow-tree" /></td><td>icon-flow-tree</td></tr>
							<tr><td><i className="icon-pin-out" title="icon-pin-out" /></td><td>icon-pin-out</td></tr>
							<tr><td><i className="icon-sort-numeric" title="icon-sort-numeric" /></td><td>icon-sort-numeric</td></tr>
							<tr><td><i className="icon-pin-in" title="icon-pin-in" /></td><td>icon-pin-in</td></tr>
							<tr><td><i className="icon-chart-bar" title="icon-chart-bar" /></td><td>icon-chart-bar</td></tr>
							<tr><td><i className="icon-layers" title="icon-layers" /></td><td>icon-layers</td></tr>
							<tr><td><i className="icon-layers-alt" title="icon-layers-alt" /></td><td>icon-layers-alt</td></tr>
							<tr><td><i className="icon-menu" title="icon-menu" /></td><td>icon-menu</td></tr>
							<tr><td><i className="icon-attention-alt" title="icon-attention-alt" /></td><td>icon-attention-alt</td></tr>
							<tr><td><i className="icon-chart-column" title="icon-chart-column" /></td><td>icon-chart-column</td></tr>
							<tr><td><i className="icon-codepen" title="icon-codepen" /></td><td>icon-codepen</td></tr>
							<tr><td><i className="icon-ok-circled" title="icon-ok-circled" /></td><td>icon-ok-circled</td></tr>
							<tr><td><i className="icon-filter" title="icon-filter" /></td><td>icon-filter</td></tr>
							<tr><td><i className="icon-chart-gauge" title="icon-chart-gauge" /></td><td>icon-chart-gauge</td></tr>
							<tr><td><i className="icon-target" title="icon-target" /></td><td>icon-target</td></tr>
							<tr><td><i className="icon-signal" title="icon-signal" /></td><td>icon-signal</td></tr>
							<tr><td><i className="icon-eye" title="icon-eye" /></td><td>icon-eye</td></tr>
							<tr><td><i className="icon-resize-vertical" title="icon-resize-vertical" /></td><td>icon-resize-vertical</td></tr>
							<tr><td><i className="icon-resize-horizontal" title="icon-resize-horizontal" /></td><td>icon-resize-horizontal</td></tr>
							<tr><td><i className="icon-resize-full-alt" title="icon-resize-full-alt" /></td><td>icon-resize-full-alt</td></tr>
							<tr><td><i className="icon-resize-small" title="icon-resize-small" /></td><td>icon-resize-small</td></tr>
							<tr><td><i className="icon-resize-full" title="icon-resize-full" /></td><td>icon-resize-full</td></tr>
							<tr><td><i className="icon-book" title="icon-book" /></td><td>icon-book</td></tr>
							<tr><td><i className="icon-sort-alt-down" title="icon-sort-alt-down" /></td><td>icon-sort-alt-down</td></tr>
							<tr><td><i className="icon-calc" title="icon-calc" /></td><td>icon-calc</td></tr>

							<tr><td><i className="icon-bot" title="icon-bot" /></td><td>icon-bot</td></tr>
							<tr><td><i className="icon-brush" title="icon-brush" /></td><td>icon-brush</td></tr>
							<tr><td><i className="icon-ellipsis-vert" title="icon-ellipsis-vert" /></td><td>icon-ellipsis-vert</td></tr>

							<tr><td><i className="icon-left-open" title="icon-left-open" /></td><td>icon-left-open</td></tr>
							<tr><td><i className="icon-right-open" title="icon-right-open" /></td><td>icon-right-open</td></tr>
							<tr><td><i className="icon-down-open" title="icon-down-open" /></td><td>icon-down-open</td></tr>
							<tr><td><i className="icon-up-open" title="icon-up-open" /></td><td>icon-up-open</td></tr>
							<tr><td><i className="icon-pencil" title="icon-brush" /></td><td>icon-pencil</td></tr>

							</tbody>
						</table>

				</div>


			</div>
		</div>)

	}

})
