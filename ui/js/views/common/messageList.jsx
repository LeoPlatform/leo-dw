import React, {Component} from 'react'


module.exports = React.createClass({

	getInitialState: function() {
		return {
			dialog: false
		}
	},

	componentDidMount: function() {

		LeoKit.dialog($('.messageList'),
			{ close: false },
			'Messages',
			this.props.onClose
		)

	},


	render() {

		var messages = sessionStorage.getItem('messageQueue') || '[]'
		try {
			messages = JSON.parse(messages)
		} catch(e) {
			messages = []
		}

		return (<div>
			<div className="messageList message-list">
				{
					messages && messages.length > 0
					? messages.reverse().map((message, index) => {
						return (<div key={index} className={'message ' + (message.priority || 'success')}>
							<div>
								{(message.message || message).map((message, key) => {
									return (<div key={key}>{message}</div>)
								})}
								<small>{message.timestamp ? moment(message.timestamp).format('MMM D @ h:mm:ss a') : '-'}</small>
								{
									message.details
									? <div className="details">{JSON.stringify(message.details || {}, null, 4)}</div>
									: false
								}
							</div>
						</div>)
					})
					: (<div>No messages</div>)
				}
			</div>
		</div>)

	}

})
