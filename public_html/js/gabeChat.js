function timeSince(date) {
	date = new Date(date);
    var seconds = Math.floor((new Date() - date) / 1000);
    var interval = Math.floor(seconds / 31536000);

    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hrs";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " mins";
    }
    return Math.floor(seconds) + " secs";
}

var gabe_chat = function(name){

	var socket=null,
		users=[],
		appTitle = name || 'Gabe Chat',
		isFocused = true,
		lostFocusCount = 0,
		isSilentClient = false,
		isShowYoutubeEmbedded = true;

	var availableCommands = ['all', 'pm', 'nick', 'whois', 'setcolour', 'users'];

	$(window).resize(function(){
		var h = $(window).outerHeight()-($('.chat-wrapper .chat-header').outerHeight()+$('.chat-wrapper .chat-input').outerHeight())-10;
		$('.chat-wrapper .chat-window').css('height',h+'px');
	});
	$(window).resize();

	$('.btn-sound').click(function(){
		if($(this).hasClass('fa-volume-up')){
			$(this).removeClass('fa-volume-up');
			$(this).addClass('fa-volume-off');
			isSilentClient=true;
			document.getElementById('chatNotification').volume = 0;
		}else{
			$(this).removeClass('fa-volume-off');
			$(this).addClass('fa-volume-up');
			isSilentClient=false;
			document.getElementById('chatNotification').volume = 0.6;
		}
	});
	$('.btn-youtube').click(function(){
		if(!isShowYoutubeEmbedded){
			$(this).removeClass('disabled');
			isShowYoutubeEmbedded = true;
		}else{
			$(this).addClass('disabled');
			isShowYoutubeEmbedded = false;
		}
	});

	$(window).focus(function(){
		isFocused = true;
		switchFav('fav1');
		lostFocusCount=0;
		updateTitleCount(lostFocusCount);
	}).blur(function(){
		isFocused = false;
	});

	var socket = io.connect(':8080');
	socket.on('client_key', function(data){
		console.log(data);
		var date = new Date();
		date.setTime(date.getTime()+(30*24*60*60*1000));
		document.cookie = 'gabeChat='+data+'; expires='+date.toGMTString()+'; path=/'
	});
	$('.chat-input-wrapper').submit(function(e){
		e.preventDefault();
		preEmitMessage($('.chat-input-wrapper input').val());
		$('.chat-target').text('/all');
		$('.chat-input-wrapper input').val('');
		return false;
	});
	$('.chat-input-wrapper input').keyup(function(e){
		checkStrForCommand($('.chat-input-wrapper input').val());
	});
	socket.on('updateUsers', function(data){
		users = data;
		updateUserList();
	});
	socket.on('msg', function(data){
		if(!isFocused){
			switchFav('fav2');
			lostFocusCount++;
			updateTitleCount(lostFocusCount);
			document.getElementById('chatNotification').pause();
			document.getElementById('chatNotification').play();
		}
		parseMessageData(data);
	});

	setInterval(function(){
		loop();
	},1000);

	function loop(){
		updateUserListTimes();
	}
	function checkStrForCommand(str){
		if(str.length>0 && str.substring(0,1)=='/'){
			arguments = str.match(/\w+|"(?:\\"|[^"])+"/g);
			if(arguments){
				if(typeof arguments[0]!='undefined' && arguments[0].length>0){
					if(availableCommands.indexOf(arguments[0])>=0){
						var command = '/'+arguments[0];
						$('.chat-input-wrapper input').val($('.chat-input-wrapper input').val().replace(command, ''));
						$('.chat-target').text(command);
					}
				}
			}
		}
	}
	function preEmitMessage(msg){
		// Do some pre shit here
			// Try to wrap the message with quotes
		socket.emit('msg', $('.chat-target').text()+' '+$('.chat-input-wrapper input').val());
	}
	function updateTitleCount(int){
		$('head title').text(appTitle+' ('+int+')');
	}
	function switchFav(fav){
		$('#fav').attr('href','images/'+fav+'.jpg');
	}
	function updateUserList(){
		var user_list = '';
		for(var i=0;i<users.length;i++){
			user_list+='<li class="user'+users[i].id+' title="'+users[i].ip+'">'+users[i].nick+' <span class="lastActive">0 secs</span></li>';
		}
		$('.chat-userlist ul').html(user_list);

		// Stupid code
		$('.chat-userlist li.user0').click(function(){
			if($('.chat-window').hasClass('gaben')){
				$('.chat-window').removeClass('gaben');
			}else{
				$('.chat-window').addClass('gaben');
			}
		});
	}
	function updateUserListTimes(){
		for(var i=0;i<users.length;i++){
			$('.user'+users[i].id+' .lastActive').html(timeSince(users[i].lastActive));
		}
	}
	function parseMessageData(data){
		if(data.type=='youtube' && !isShowYoutubeEmbedded){
			var video_url = $(data.msg).attr('src');
			data.msg = 'You have embedded videos off: <a href="'+video_url+'" target="_BLANK">'+video_url+'</a>';
			data.type = 'message';
		}else if(data.type=='audio' && !isSilentClient){

		}

		addStatus(data);
	}
	function addStatus(data){
		var time = new Date(data.time),
			h=(time.getHours()<10) ? '0'+time.getHours() : time.getHours(),
			m=(time.getMinutes()<10) ? '0'+time.getMinutes() : time.getMinutes(),
			s=(time.getSeconds()<10) ? '0'+time.getSeconds() : time.getSeconds();

		$('.chat-window ul').append('<li class="'+data.type+'">'+
			'<span class="time">'+h+':'+m+':'+s+'</span>'+
			'<span class="from" title="'+data.ip+'">'+data.user+'</span>'+
			'<span class="text" style="color:'+data.color+'">'+data.msg+'</span>'+
		'</li>');

		if(data.type=='audio' && !isSilentClient){
			document.getElementById('audioMsg'+data.id).play();
		}

		$('.chat-window').scrollTop($('.chat-window ul').height());
	}
}