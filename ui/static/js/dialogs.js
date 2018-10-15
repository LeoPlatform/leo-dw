
	$.fn.serializeObject = function() {
		var o = {}, a = this.serializeArray();
		$.each(a, function() {
			var key = this.name
			var s = this.name.split(/\[([^\]]*)\]/g)
			if (this.value === 'true') {
				this.value = true
			} else if (this.value === 'false') {
				this.value = false
			} else if (this.value.match(/^-?((\d+\.?\d*)|(\.?\d+))$/)) {
				this.value = parseFloat(this.value)
			} else {
				this.value = this.value || ''
			}
			if (s.length > 1) {
				key = s[0]
				if (!o[key]) {
					o[key] = []
				}
				if (o[key][s[1]] !== undefined) {
					if (!o[key][s[1]].push) {
						o[key][s[1]] = [o[key][s[1]]];
					}
					o[key][s[1]].push(this.value)
				} else {
					o[key][s[1]] = this.value
				}
			} else if (o[key] !== undefined) {
				if (!o[key].push) {
					o[key] = [o[key]]
				}
				o[key].push(this.value)
			} else {
				o[key] = this.value
			}
		});
		return o;
	};


	window.LeoKit = {};
	(function(me) {

		me.close = function(dialog, onClose) {
			if (!onClose || onClose() !== false) {
				var element = ((!dialog.hasClass('theme-dialog') && !dialog.hasClass('theme-modal')) ? dialog.closest('.theme-dialog') : dialog).removeClass('theme-dialog-open')
				element = ((element.parent().hasClass('theme-modal')) ? element.parent() : element).removeClass('theme-dialog-open')
				setTimeout(function() {
					element.remove()
				}, 200)
			}
		}

		me.center = function(dialog) {
			if (!dialog) {
				return false
			}
			dialog = (dialog.hasClass('theme-modal') ? dialog.find('.theme-dialog') : dialog)
			dialog.css({
				left: (window.innerWidth - parseFloat(dialog.css('width')))/2,
				top: (window.innerHeight - parseFloat(dialog.css('height')))/3,
				position: 'fixed'
			})
		}


		me.modalFull = function() {
			var dialog = me.dialog.apply(this, arguments)
			return dialog.wrap($('<div/>').addClass('theme-modal theme-modal-full')).parent()
		}


		me.modal = function() {
			var dialog = me.dialog.apply(this, arguments)
			return dialog.wrap($('<div/>').addClass('theme-modal')).parent()
		}


		me.dialog = function(content, buttons, title, onClose) {
			var dialog = $('<div/>').attr('tabIndex', -1).bind('keydown', function(e) {
				if (e.keyCode == 27 && onClose !== false) {
					me.close($(this), onClose)
				}
			})
			$('body').append(dialog)
			var footer = $('<footer/>')
			var header = $('<header />').attr('tabIndex', -2).html(title || '').addClass('theme-dialog-header')
			var primary = '-primary'
			for(var button in buttons) {
				footer.prepend($('<button/>').attr('type', primary ? 'submit' : 'button').addClass('theme-button'+primary+((['delete', 'reset'].indexOf(button.toLowerCase()) !== -1) ? '-danger pull-left' : '')).data('button', button).text(button).click(function(e) {
					e.preventDefault()
					if (buttons[$(this).data('button')]) {
						if (buttons[$(this).data('button')]( $(this).closest('form').serializeObject(), $(this) ) === false) {
							return
						}
					}
					me.close($(this), onClose)
				}))
				primary = ''
			}
			dialog.empty().attr('class', 'theme-dialog').append(
				header.append(
					onClose !== false
					? $('<i class="theme-icon-close"></i>').click(function(e) {
						me.close($(this), onClose)
					})
					: false
				),
				$('<form/>').addClass('theme-form').submit(function(e) { e.preventDefault(); $(this).find('button[type="submit"]').trigger('click') }).append(
					$('<main/>').html(content),
					footer
				)
			).removeClass("theme-dialog-open").show()

			setTimeout(() => {
				dialog.addClass('theme-dialog-open')
				dialog.find('input:not([type=hidden]), select, textarea, button').first().focus().select()
				dialog.find('textarea').bind('keydown', function(e) {
					if (e.keyCode == 9) {
						e.preventDefault()
						var val = this.value,
							start = this.selectionStart,
							end = this.selectionEnd
						this.value = val.substring(0, start) + '\t' + val.substring(end)
						this.selectionStart = this.selectionEnd = start + 1
						return false
					}
				})
				me.center(dialog)
				setTimeout(() => {
					me.center(dialog)
				}, 500)
				dialog.draggable({ handle:'.theme-dialog-header', containment: 'body' })
			}, 1)

			return dialog
		}

		me.alert = function(msg, type) {
			var modal = me.modal(msg, { close: () => {} }).addClass('alert-box' + (type ? ' theme-dialog-'+type: ''))
			if (!type) {
				setTimeout(function() {
					modal.removeClass('theme-dialog-open')
					setTimeout(function() { modal.remove() }, 200)
				}, 5000)
			}
			return modal
		}

		me.confirm = function(msg, buttons, cancel, onClose) {
			if (typeof buttons == 'function') {
				buttons = {
					OK: buttons,
					cancel: cancel
				}
				cancel = onClose
			}
			return me.modal(msg, buttons, undefined, cancel).addClass('theme-dialog-confirm')
		}

		me.prompt = function(title, defaultValue, buttons, cancel) {

			switch(typeof defaultValue) {
				case 'string':
					if (typeof buttons == 'function') {
						buttons = {
							OK: buttons,
							cancel: cancel
						}
					}
				break

				case 'function':
					buttons = {
						OK: defaultValue,
						cancel: cancel
					}
					defaultValue = ''
				break

				case 'object':
					buttons = defaultValue
					defaultValue = ''
				break
			}

			var content = $('<div/>').append(
				$('<label/>').text(title),
				$('<input id="dialog-prompt-value" name="prompt_value" value="'+defaultValue+'" />').css({width:'100%'})
			)
			return me.modal(content, buttons).addClass('prompt-box')
		}

	})(LeoKit);
