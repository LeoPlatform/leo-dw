var apiEndpoint = window.location.protocol + '//' + window.location.hostname + ':8080/';
function getCookie(name) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}
function adminUtil() {
	this.showLogin = function() {
		$("#main_content").html("\n        <div class=\"row\">\n          <div class=\"large-4 large-centered columns login_form\">\n            <div class=\"login-box\">\n            <div class=\"large-12 columns\">\n              <form>\n                 <div class=\"row\">\n                   <div class=\"large-12 columns\">\n                       <input type=\"text\" class='username' name=\"username\" placeholder=\"Username\">\n                   </div>\n                 </div>\n                <div class=\"row\">\n                   <div class=\"large-12 columns\">\n                       <input type=\"password\" class='password' name=\"password\" placeholder=\"Password\">\n                   </div>\n                </div>\n                <div class=\"row\">\n                  <div class=\"large-12 large-centered columns\">\n                    <input type=\"button\" class=\"button expand login_btn\" value=\"Log In\">\n                  </div>\n                </div>\n              </form>\n            </div>\n          </div>\n          </div>\n          </div>\n          \n        ");
	};
	this.showNewClientForm = function() {
		$("#main_content").prepend("<div class='row' id='new_client_form'><div class='large-4 columns'><label>New client name <input type='text' id='new_client_name' placeholder='Client Name' /> </label></div><div class='large-4 columns'><label>database <input type='text' id='new_client_db' placeholder='database' /> </label></div><div class='large-4 columns' style='margin-top:22px'><span class='button radius add_new_client tiny' onclick='leoAdmin.createNewClientClick(this)'>Create client</span></div></div>");
	};
	this.showClients = function(clientList) {
		for(i in clientList) {
			var mytable = this.makeClientTable(clientList[i]);
			$("#main_content").append(mytable);
		}
		if(!$('#new_client_form').length) this.showNewClientForm();
	};
	this.createNewClientClick = function(that) {
		var send = {
			new_name: $("#new_client_name").val(),
			new_db: $("#new_client_db").val()
		};
		this.getEndpoint('newClient',send);
	};
	this.createKeyClick = function(that) {
		var clientid = $(that).attr('data-clientid');
		var send = {
			description:$("#new_description_"+clientid).val(),
			client_id:clientid
		};
		this.getEndpoint('newApikey',send);
	};
	this.deleteKeyClick = function(that) {
		if(confirm("Are you sure? This will break any app trying to use that api key.")) {
			var keyid = $(that).attr('data-keyid');
			var send = {
				apikey: keyid
			};
			this.getEndpoint('deleteApikey',send);
		}
	};
	this.makeClientTable = function(client) {
		var mybody = $('<tbody />');
		for(i in client) {
			var mykey = client[i];
			if (mykey.keyid == null) continue;
			mybody.append($("<tr><td>"+mykey.keyid+"</td><td data-keyid='"+client[i].keyid+"' class='key_description'>"+mykey.description+"</td><td><span class='button radius secondary tiny delete_key_btn' data-keyid='"+client[i].keyid+"' onclick='leoAdmin.deleteKeyClick(this)' data-confirm='testy'>delete key</span></td></tr>"));
		}
		mybody.append($("<tr><td></td><td><input type='text' placeholder='Description' style='margin-bottom:0' id='new_description_"+client[0].id+"' class='new_description_box' /></td><td><span class='button radius tiny add_key_btn' data-clientid='"+client[0].id+"' onclick='leoAdmin.createKeyClick(this)'>Create key</span></td></tr>"));
		var mytable = $("<div id='client_"+i+"' class='client_cont row'><div class='large=12'><h4 class='client_name_header' data-clientid='"+client[0].id+"'>"+client[0].name+"</h4><table style='width:100%'><thead><tr><th width='40%'>Key</th><th width='40%'>description</th><th></th></tr></thead>"+mybody.html()+"</table></div></div>");
		return mytable;
	};
	this.alert = function(title,message) {
		if(typeof title == 'object') {
			message = title.message;
			title = title.title;
		}
		if(typeof message == 'undefined') {
			message = title;
			title = '';
		}
		var myid = this.makeid();
		$('body').append("<div id='"+myid+"' class='reveal-modal' data-reveal aria-labelledby='' role='dialog'><h2>"+title+"</h2><p class='lead'>"+message+"</p><a class='close-reveal-modal' aria-label='Close'>&#215;</a></div>");
		$(document).foundation();
		$("#"+myid).foundation('reveal','open');
	};
	this.makeid = function() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 10; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	};
	this.parseResponse = function(response) {
		if(response.alert) {
			this.alert(response.alert);
		}
		if(response.auth) {
			document.cookie="auth="+response.auth;
		}
		if(response.doLogin) {
			this.showLogin();
			return;
		}
		if(response.showClients) {
			this.showNewClientForm();
		}
		if(response.clients) {
			$("#main_content").html("");
			this.showClients(response.clients,false);
		}
	};
	this.getEndpoint = function(endpoint,payload) {
		if(typeof payload == 'undefined') payload = {};
		payload.auth = getCookie('auth');
		var that = this;
		$.post(apiEndpoint+"admin/"+endpoint,payload,function(response) {
			that.parseResponse(response);
		},'JSON');
	};
}

var leoAdmin = new adminUtil();
$(document).ready(function() {
	leoAdmin.getEndpoint('getClients',{holycrap:1});
	$("#main_content").on("click",".login_btn",function() {
		var send = {
			username: $('#main_content .username').val(),
			password: $('#main_content .password').val()
		};
		leoAdmin.getEndpoint("login",send);
	});
	$('#main_content').on('keyup','.username',function(e) {
		if(e.which == 13) {
			$('#main_content .password').focus();
		}
	});
	$('#main_content').on('keyup','[name=password]',function(e) {
		if(e.which == 13) {
			$('#main_content .login_btn').click();
		}
	});
	$("#main_content").on('keyup','.new_description_box',function(e) {
		if(e.which == 13) {
			$(this).closest('tr').find('.add_key_btn').click();
		}
	});
	$("#main_content").on('dblclick','.key_description',function() {
		var orig = $(this).text();
		var keyid = $(this).attr("data-keyid");
		$(this).data('orig',orig);
		var myid = leoAdmin.makeid();
		$(this).html("<div class='row collapse'><div class='small-10 columns'><input type='text' placeholder='description' value="+JSON.stringify(orig)+" style='margin-bottom:0' id='input_"+myid+"' /></div><div class='small-2 columns'><span id='"+myid+"' class='button postfix'>save</span></div></div>");
		$("#"+myid).click(function() {
			var value = $("#input_"+myid).val();
			var send = {
				description: value,
				apikey: keyid
			};
			leoAdmin.getEndpoint('newKeyDescription',send);
		});
	});
	$("#main_content").on('dblclick','.client_name_header',function() {
		var clientid = $(this).attr('data-clientid');
		var orig = $(this).text();
		var myid = leoAdmin.makeid();
		$(this).replaceWith("<div class='row collapse'><div class='small-10 columns'><input type='text' placeholder='Client Name' value="+JSON.stringify(orig)+" id='input_"+myid+"' /></div><div class='small-2 columns'><span id='"+myid+"' class='button postfix'>save</span></div></div>");
		$("#"+myid).click(function() {
			var value = $("#input_"+myid).val();
			var send = {
				name: value,
				client_id: clientid
			};
			leoAdmin.getEndpoint('newClientName',send);
		});
	});
});
