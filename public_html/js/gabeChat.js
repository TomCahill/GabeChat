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
		lostFocusCount = 0;

	$(window).resize(function(){
		var h = $(window).outerHeight()-($('.chat-wrapper .chat-header').outerHeight()+$('.chat-wrapper .chat-input').outerHeight())-10;
		$('.chat-wrapper .chat-window').css('height',h+'px');
	});
	$(window).resize();

	$('.btn-sound').click(function(){
		if($(this).hasClass('glyphicon-volume-up')){
			$(this).removeClass('glyphicon-volume-up');
			$(this).addClass('glyphicon-volume-off');
			document.getElementById('chatNotification').volume = 0;
		}else{
			$(this).removeClass('glyphicon-volume-off');
			$(this).addClass('glyphicon-volume-up');
			document.getElementById('chatNotification').volume = 0.6;
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

	var socket = io.connect('/');
	$('.chat-input-wrapper').submit(function(){
		socket.emit('msg',$('.chat-input-wrapper input').val());
		$('.chat-input-wrapper input').val('');
		return false;
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
		addStatus(data);
	});

	setInterval(function(){
		loop();
	},1000);

	function loop(){
		updateUserListTimes();
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
		$('.chat-window').scrollTop($('.chat-window ul').height());
	}
}