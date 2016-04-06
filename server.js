var express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	UUID = require('node-uuid'),
	path = require('path'),
	extend = require('extend');

app.use(express.static(path.join(__dirname, 'public_html')));

http.listen(8080, function(){
	addConsoleLog('listening on *:8080');
});

// Random shit functions
function addConsoleLog(str){
	var t = new Date;
	console.log(t.getHours()+':'+t.getMinutes()+':'+t.getSeconds()+' - '+str);
}
function stripHtml(Str){
	return Str.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>?/gi, '').trim();
}
function getCookieFromStr(cookie_name,str){
	if(typeof str != 'undefined' && str.length>0){
		var strSplit = str.split(';');
		for(var i=0; i<strSplit.length;i++){
			var name = strSplit[i].split('=')[0].replace(/^\s+/,''), value = strSplit[i].split('=')[1];
			if(cookie_name==name)
				return value;
		}
	}
	return false;
}

var GabeChat_User = function(ID, Key, Client, Options){
	var Defaults = {
		clientid: ID,
		key: Key,
		nick: 'Gaben '+ID,
		colour: '#333',
		ip: false,
		lastActive: new Date(),
		state: 'inactive',
		client: Client
	}
	if(Client)
		Defaults.ip = Client.handshake.address;

	return extend({}, Defaults, Options);
}

var GabeChat_Server = function(){
	var self = this;

	// Regex match strings
	var image_regex_match = /^https?:\/\/(?:[a-z\-]+\.)+[a-z]{2,6}(?:\/[^\/#?]+)+\.(?:jpe?g|gif|png)$/,
		audio_regex_match = /^https?:\/\/(?:[a-z\-]+\.)+[a-z]{2,6}(?:\/[^\/#?]+)+\.(?:mp3|ogg|wave)$/,
		youtube_regex_match = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/,
		link_regex_match = /((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi;

	var cookie_name = 'gabeChat';

	// Main
	var Users = {},
		Stats = {
			messageCount: 0,
			userCount: 0
		},
		ServerUser = false,
		AvailableCommands = ['all', 'pm', 'nick', 'whois', 'users'];


	function _construct(){

		ServerUser = userCreate('server', false, {
			'nick': 'Gabe Newell',
			'colour': '#333',
			'ip': 'Unknown',
			'state': 'active'
		});

		socketIOListeners();
	}

	function socketIOListeners(){
		io.on('connection', userConnect);
	}
	function userAssignSocketIOClientListners(User){

		User.client.emit('client_key', User.key);
		User.client.emit('availableCommands', AvailableCommands);

		User.client.on('disconnect', function(Reason){
			userBroadcastDisconnect(User, Reason);
		});
		User.client.on('msg',function(Message){
			onMessageReceive(User, Message);
		});
	}

	function userConnect(Client){
		var user = false;

		var cookie_key = getCookieFromStr(cookie_name, Client.handshake.headers.cookie);
		if(cookie_key)
			user = userReassign(cookie_key, Client);

		if(!user)
			user = userCreate(UUID(), Client);

		if(Client)
			userAssignSocketIOClientListners(user)
	}
	function userDisconnect(user, reason){

	}

	function userCreate(Key, Client, Options){
		Users[Key] = new GabeChat_User(createUserID(), Key, Client, Options);
		userBroadcastConnection(Users[Key]);
		return Users[Key];
	}
	function userReassign(Key, Client){
		if(typeof Users[Key] != 'undefined'){
			var user = Users[Key];
			user.client = Client;
			userBroadcastConnection(user);
			return user;
		}
		return false;
	}

	function getUserByNick(Nick){
		Nick = Nick.toLowerCase();
		for(var key in Users){
			if(Users[key].nick.toLowerCase()==Nick)
				return Users[key];
		}
		return false;
	}

	function userBroadcastConnection(User){
		User.state = 'active';
		addConsoleLog('User Connected: '+User.ip+':'+User.nick);
		broadcastMessage(
			buildMessage(ServerUser, User.nick+' Connected',{
				'type': 'status'
			})
		);
		updateUserList();
	}
	function userBroadcastDisconnect(User, Reason){
		User.state = 'inactive';
		addConsoleLog('User Disconnect: '+User.ip+':'+User.nick+' - '+Reason);
		broadcastMessage(
			buildMessage(ServerUser, User.nick+' Disconnect - '+Reason,{
				'type': 'status'
			})
		);
		updateUserList();
	}

	function updateUserList(){
		var user_return = [];
		for(var key in Users){
			if(Users[key].state=='active')
				user_return.push({
					id: Users[key].clientid,
					nick: Users[key].nick,
					lastActive: Users[key].lastActive,
					ip: Users[key].ip
				});
		}
		io.emit('updateUsers', user_return);
	}

	function buildMessage(User, MessageStr, Options){
		var Message = extend({}, {
			'id': createMessageID(),
			'time': Date(),
			'type': 'message',
			'user': User.nick,
			'color': User.colour,
			'ip': User.ip,
			'msg': MessageStr
		}, Options);

		return parseMessage(Message);
	}

	function sendMessage(Recipient, Message){
		if(Message)
			Recipient.client.emit('msg', Message);
	}
	function broadcastMessage(Message){
		if(Message)
			io.emit('msg', Message);

		updateUserList();
	}

	// Message IN
	function onMessageReceive(User, MessageStr){

		User.state = 'active';
		User.lastActive = new Date();

		// Strip out the all command
		if(MessageStr.substring(0,4)=='/all'){
			MessageStr = MessageStr.substring(4, MessageStr.length).trim();
		}

		if(MessageStr.substring(0,1)=='/'){
			parseCommand(User, MessageStr.substring(1, MessageStr.length).trim());
			return;
		}

		if(MessageStr.length<1){
			return;
		}

		broadcastMessage(buildMessage(User, MessageStr));
	}

	function parseMessage(Message){
		var messageStr = stripHtml(Message.msg);

		if(messageStr.substring(0,1)!='!'){
			if(image_regex_match.test(messageStr)){
				messageStr = '<a href="' + messageStr + '" target="_BLANK"> <img src="' + messageStr + '"/></a>';
				Message.type = 'image';
			}else if(audio_regex_match.test(messageStr)){
				messageStr = '<audio controls id="audioMsg'+Message.id+'"><source src="'+messageStr+'">Your shit browser doesn\'t support HTML audio</audio>';
				Message.type = 'audio';
			}else if(match_split = messageStr.match(youtube_regex_match)){
				var video_id = match_split[1];
				messageStr = '<iframe width="360" height="200" src="https://www.youtube.com/embed/'+video_id+'" frameborder="0" allowfullscreen></iframe>';
				Message.type = 'youtube';
			}else{
				messageStr =  messageStr.replace(link_regex_match, function(url) {
					return '<a href="' + url + '" target="_BLANK">' + url + '</a>';
				});
			}
		}

		Message.msg = messageStr;

		return Message;
	}
	function parseCommand(User, Line){
		if(Line.length>0){
			arguments = Line.match(/\w+|"(?:\\"|[^"])+"/g);
			// Loop through and strip quotes
			for(var i in arguments){
				arguments[i] = arguments[i].replace(/"/g,"");
			}
			switch(arguments[0].toLowerCase()){
				case 'pm':
					if((typeof arguments[1]!='undefined' && arguments[1].length>0) && 
						(typeof arguments[2]!='undefined' && arguments[2].length>0)){
						var messageStr = arguments[2],
							targetUser = getUserByNick(arguments[1]);

						if(targetUser==false){
							sendMessage(User, buildMessage(ServerUser, 'We couldn\'t find a user with that name', {
								'type': 'status'
							}));
							break;
						}

						sendMessage(User, buildMessage(User, messageStr, {
							'type': 'private'
						}));
						sendMessage(targetUser, buildMessage(User, messageStr, {
							'type': 'private'
						}));
					}
				break;
				case 'nick':
					// TODO: Limit name length
					if(typeof arguments[1]!='undefined' && arguments[1].length>0){
						var oldNick = User.nick, 
							newName = stripHtml(arguments[1]).replace(/\s/g,'');

						if(getUserByNick(newName)!=false){

							sendMessage(User, buildMessage(ServerUser, 'Username has already been taken', {
								'type': 'status'
							}));

							break;
						}
						User.nick = newName;

						broadcastMessage(buildMessage(ServerUser, oldNick+' renamed to '+newName, {
							'type': 'status'
						}));
						updateUserList();
					}
				break;
				case 'whois':
					if(typeof arguments[1]!='undefined' && arguments[1].length>0){
						var name = stripHtml(arguments[1]);
						broadcastMessage(buildMessage(ServerUser, 'Who is '+name+'? '+name+' is a very nice person.', {
							'type': 'status'
						}));
					}
				break;
				case 'users':
					var user_string_return = '', i=0;
					for(var key in Users){
						var sep = (i>0) ? ', ' : '';
						user_string_return+=sep+Users[key].nick;
						i++;
					}
					sendMessage(User, buildMessage(ServerUser, user_string_return, {
						'type': 'status'
					}));
				break;
			}
		}
	}

	function createUserID(){
		return Stats.userCount++;
	}
	function createMessageID(){
		return Stats.messageCount++;
	}

	return _construct();
}

new GabeChat_Server();