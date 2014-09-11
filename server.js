var express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	UUID = require('node-uuid');

var path = require('path');

app.use(express.static(path.join(__dirname, 'public_html')));

http.listen(8080, function(){
  console.log('listening on *:8080');
});


var userCount = 0;

io.on('connection', function(user){
	userCount++;
	user.key = UUID();
	user.nick = 'Gabe '+userCount;

	console.log('socket.io:: user ' + user.key + ' connected');
	user.on('disconnect',function(){
		console.log('\t socket.io:: user disconnected ' + user.key );
	});
	user.on('msg',function(msg){
		var now = Date();
		io.emit('msg', {
			'time': now,
			'user': user.nick,
			'msg': msg
		});
	});
});