var express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	UUID = require('node-uuid');

var cookie_name = 'gabeChat';

var path = require('path');

app.use(express.static(path.join(__dirname, 'public_html')));

http.listen(8080, function(){
  console.log('listening on *:8080');
});

var Gaben_User = function(id,key,client){
	return {
		clientid: id,
		key: key,
		nick: 'Gaben '+id,
		colour: '#333',
		ip: client.handshake.address,
		lastActive: new Date(),
		state: 'inactive',
		client: client
	}
}

var Chat = function(){

	var users = {
		'server': {
			clientid: 0,
			key: 'server',
			nick: 'Gabe Newell',
			colour: '#333',
			ip: 'Lord Gabe doesn\'t need an ip address, he is everywhere and everything',
			lastActive: new Date(),
			state: 'active',
			client: false
		}
	},
	userCount = 0;

	function stripHtml(str){
		return str.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>?/gi, '').trim();
	}
	function isUserNickTaken(newNick){
		for(var key in users){
			if(users[key].nick.toLowerCase()==newNick)
				return true;
		}
		return false;
	}

	return {
		addUser: function(key,client){
			userCount++;
			var user = new Gaben_User(userCount,key,client);
			users[key] = user;
			this.connectUser(user);
			return user;
		},
		reassignUser: function(key,client){
			var user = false;
			if(typeof users[key] != 'undefined'){
				user = users[key];
				user.client = client;
				this.connectUser(user);
			}
			return user;
		},
		connectUser: function(user){ // Not really a connection function - Just to broadcast that the user has re/joined
			this.broadcastMsg(this.buildMsg('server','status', user.nick+' Connected'));
			this.updateUserList();
		},
		disconnectUser: function(user){
			//delete users[user.key];
			this.broadcastMsg(this.buildMsg('server','status', user.nick+' Disconnect'));
			this.updateUserList();
		},
		updateUserList: function(){
			var user_return = [];
			for(var user_key in users){
				user_return.push({
					id: users[user_key].clientid,
					nick: users[user_key].nick,
					lastActive: users[user_key].lastActive,
					ip: users[user_key].ip
				});
			}
			io.emit('updateUsers', user_return);
		},
		broadcastMsg: function(object){
			io.emit('msg', object);
			this.updateUserList();
		},
		sendMsg: function(key,object){
			users[key].emit('msg', object);
		},
		buildMsg: function(sender,type,msg){
			return {
				'time': Date(),
				'type': type,
				'user': users[sender].nick,
				'color': users[sender].colour,
				'ip': users[sender].ip,
				'msg': msg
			}
		},
		parseMsg: function(key,msg){

			users[key].lastActive = new Date();

			if(msg.substring(0,1)=='/'){
				this.parseCommand(key,msg.substring(1,msg.length));
				return;
			}

			msg = stripHtml(msg);

			var image_regex_match = /^https?:\/\/(?:[a-z\-]+\.)+[a-z]{2,6}(?:\/[^\/#?]+)+\.(?:jpe?g|gif|png)$/;
			if(image_regex_match.test(msg)){
				msg = '<a href="' + msg + '" target="_BLANK"> <img src="' + msg + '"/></a>';
			}else{
				link_regex_match = /((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi;			
				msg =  msg.replace(link_regex_match, function(url) {
					return '<a href="' + url + '" target="_BLANK">' + url + '</a>';
				});
			}

			if(msg.length>0){
				this.broadcastMsg(this.buildMsg(key,'message',msg));
			}
		},
		parseCommand: function(key,command){
			if(command.length>0){
				command = command.split(' ');
				switch(command[0].toLowerCase()){
					case 'nick':
						if(typeof command[1]!='undefined' && command[1].length>0){
							var oldNick = users[key].nick, newName = stripHtml(command[1]);

							if(isUserNickTaken(newName.toLowerCase())){
								this.sendMsg(key,this.buildMsg('server','status', 'Username has already been taken'));
								break;
							}
							users[key].nick = newName;
							this.broadcastMsg(this.buildMsg('server','status', oldNick+' renamed to '+newName));
							this.updateUserList();
						}
					break;
					case 'whois':
						if(typeof command[1]!='undefined' && command[1].length>0){
							var name = stripHtml(command[1]);
							this.broadcastMsg(this.buildMsg('server','status', 'Who is '+name+'? '+name+' is a faggot'));
						}
					break;
					case 'setcolour':
						if(typeof command[1]!='undefined' && command[1].length>0){
							// Parse hex code
							users[key].colour = stripHtml(command[1]);
							this.sendMsg(key,this.buildMsg('server','status', 'Your text colour has changed'));
						}
					break;
					case 'users':
						var user_string_return = '', i=0;
						for(var key in users){
							var sep = (i>0) ? ', ' : '';
							user_string_return+=sep+users[key].nick;
							i++;
						}
						this.broadcastMsg(this.buildMsg('server','status', user_string_return));
					break;
				}
			}
		},
	}
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

var chat_server = new Chat();
io.on('connection', function(client){
	var user = false;

	/* Don't look, this bit is going to be nasty - #YOLO */
	var cookie_key = getCookieFromStr(cookie_name,client.handshake.headers.cookie);
	if(cookie_key){
		user = chat_server.reassignUser(cookie_key,client);
	}
	if(!user){
		user = chat_server.addUser(UUID(),client);
	}
	/* You can look now */

	user.client.emit('client_key',user.key);

	user.client.on('disconnect',function(){
		chat_server.disconnectUser(user);
	});
	user.client.on('msg',function(msg){
		chat_server.parseMsg(user.key,msg);
	});
});