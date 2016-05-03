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

/**
 * GabeChat
 * Main chat class to manage everything
 *
 * @returns {object} self
 */
var GabeChat_Client = function(name){
	var self = this,
		socket = null,
		chat_users = [],
		appTitle = name || 'GabeChat',
		editor = null,
		editorDefault = 'using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\nnamespace Gaben\n{\n\tpublic class Script : IScript\n\t{\n\t\tpublic string RunScript()\n\t\t{\n\t\t\t\n\t\t}\n\t}\n}';

	var isFocused = false,
		lostFocusCount = 0,
		isSilentClient = false,
        isVoice = false,
		isShowYoutubeEmbedded = true;

	var CommandListFirstLoad = false,
		ServerCommands = [],
		AvailableCommands = [];

	/**
	 * construct
	 * Function is called when class is created.
	 *
	 * @returns {Object} self - Returns the current class
	 */
	function _construct(){

		// Init shit
		socket = io.connect(':8080');
		setChatInputPrefix('/all');

		init();

		return self;
	}

	/**
	 * init
	 * Initialise some of the dependencies (jQuery and socketIO Listeners).
	 *
	 * @returns {void}
	 */
	function init(){
		socketIOListeners();
		jQueryListeners();
		updateUserListTimes();
		buildAvailableCommands();
	}

	/**
	 * jQueryListeners
	 * Initialise the jQuery listeners for the UI
	 *
	 * @returns {void}
	 */
	function jQueryListeners(){
		// jQuery Listeners
		$(window).resize(function(){
			var h = $(window).outerHeight()-($('.chat-wrapper .chat-header').outerHeight()+$('.chat-wrapper .chat-input').outerHeight())-10;
			$('.chat-wrapper .chat-window').css('height',h+'px');
			resizeChatInput();
		});
		$(window).resize();
		
		$(window).focus(function(){
			isFocused = true;
			switchFav('fav1');
			lostFocusCount=0;
			updateTitleCount(lostFocusCount);
		}).blur(function(){
			isFocused = false;
		});
		$('.chat-wrapper').click(function(){
			if(!isFocused)
				$(window).triggerHandler('focus');
		});

		// jQuery Listeners UI
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
		$('.btn-voice').click(function () {
		    if (!isVoice) {
		        $(this).removeClass('disabled');
		    } else {
		        $(this).addClass('disabled');
		    }
		    isVoice = !isVoice;
		});
		$('.btn-script').click(function(){
			editor = ace.edit("editor");
			editor.setValue(editorDefault);
			editor.setTheme("ace/theme/sqlserver");
			editor.getSession().setMode("ace/mode/csharp");
			editor.setShowPrintMargin(false); 
			editor.gotoLine(11);
			$('#editorWindow').modal();
		});

		$('.btn-random').click(function () {
		   
		    $('#random').modal();
		});
		
		$('#scriptSave').click(function(){
			var script = editor.getValue();
			var name = $('#scriptName').val();
			
			var message = script + "|" + name;
			
			postScript(message);
		});
		
		$('#scriptReset').click(function(){
			editor.setValue(editorDefault);
			editor.setShowPrintMargin(false); 
			editor.gotoLine(11);
		});

		$('.chat-input-wrapper input').autocomplete({
			source: AvailableCommands,
			position: { my: "left bottom", at: "left top", collision: "flip" }
		});

		// Input
		$('.chat-input-wrapper input').on('input propertychange paste', function(e){
			checkStrForCommand($('.chat-input-wrapper input').val());
		});
		$('.chat-input-wrapper').submit(function(e){
			e.preventDefault();
			preEmitMessage($('.chat-input-wrapper input').val());
			setChatInputPrefix('/all');
			$('.chat-input-wrapper input').val('');
			return false;
		});
	}
	
	function postScript(script){
		var fullMessage = "!script " + script;
		
		preEmitMessage(fullMessage);
		
		messageEmit(fullMessage);
	}
	
	/**
	 * socketIOListeners
	 * Initialise socket IO listeners
	 *
	 * @returns {void}
	 */
	function socketIOListeners(){
		socket.on('client_key', onSocketConnect);
		socket.on('updateUsers', onUpdateUsers);
		socket.on('availableCommands', onAvailableCommands);
		socket.on('msg', onMessageReceive);
	}

	/**
	 * onSocketConnect
	 * Method is called when socket connection is opened
	 *
	 * @param {String} key - unique string given by the server to identify the user 
	 * @returns {void}
	 */
	function onSocketConnect(key){
		console.log(key);
		var date = new Date();
		date.setTime(date.getTime()+(30*24*60*60*1000));
		document.cookie = 'gabeChat='+key+'; expires='+date.toGMTString()+'; path=/'
	}
	/**
	 * onAvailableCommands
	 * Fetch avaiable server commands
	 *
	 * @param {object} data - list of server commands
	 * @returns {void}
	 */
	function onAvailableCommands(data){
		ServerCommands = data;
	}
	/**
	 * onUpdateUsers
	 * Method is called when the server user list has been updated (connected/disconnected) users
	 *
	 * @param {object} data - list of users currently connected to the server
	 * @returns {void}
	 */
	function onUpdateUsers(data){
		chat_users = data;
		if(CommandListFirstLoad)
			buildAvailableCommands();
		updateUserListDOM();
	}
	/**
	 * onMessageReceive
	 * Method is called when a message is received from the server
	 *
	 * @param {object} data - message data object
	 * @returns {void}
	 */
	function onMessageReceive(data){
		if(!isFocused){
			switchFav('fav2');
			lostFocusCount++;
			updateTitleCount(lostFocusCount);
			document.getElementById('chatNotification').pause();
			document.getElementById('chatNotification').play();
		}
		parseMessageData(data);
	}

	/**
	 ** Message IN
	 */

	/**
	 * parseMessageData
	 * Catch message for final checks before updating the chat window
	 *
	 * @param {object} data - message data object
	 * @returns {void}
	 */
	function parseMessageData(data){
		if(data.type=='youtube' && !isShowYoutubeEmbedded){
			var video_url = $(data.msg).attr('src');
			data.msg = 'You have embedded videos off: <a href="'+video_url+'" target="_BLANK">'+video_url+'</a>';
			data.type = 'message';
		}else if(data.type=='audio' && !isSilentClient){ }

		addMessage(data);
	}
	/**
	 * addMessage
	 * Add the message data to the chat window
	 *
	 * @param {object} data - message data object
	 * @returns {void}
	 */
	function addMessage(data){
		var time = new Date(data.time),
			h=(time.getHours()<10) ? '0'+time.getHours() : time.getHours(),
			m=(time.getMinutes()<10) ? '0'+time.getMinutes() : time.getMinutes(),
			s=(time.getSeconds()<10) ? '0'+time.getSeconds() : time.getSeconds();

		$('.chat-window ul').append('<li class="'+data.type+'">'+
			'<span class="time">'+h+':'+m+':'+s+'</span>'+
			'<span class="from" title="'+data.ip+'">'+data.user+'</span>'+
			'<span class="text" style="color:'+data.color+'">'+data.msg+'</span>'+
		'</li>');

		if (data.type == 'audio' && !isSilentClient) {
		    document.getElementById('audioMsg' + data.id).play();
		}

		if (isVoice && !data.msg.contains("http")) {
		    var msg = new SpeechSynthesisUtterance();
		    msg.rate = 0.7;
		    msg.text = data.msg;
		    speechSynthesis.speak(msg);
		}
		

		$('.chat-window').scrollTop($('.chat-window ul').height());
	}

    //check for containing text
	String.prototype.contains = function (text) {
	    return this.indexOf(text) != -1;
	};

	/**
	 ** Message OUT
	 */

	/**
	 * checkStrForCommand
	 * Check the message against available commands and move to "chat target" if matched
	 *
	 * @param {string} str - raw user chat input
	 * @returns {void}
	 */
	function checkStrForCommand(str){
		if(str.length>0 && str.substring(0,1)=='/'){
			arguments = str.match(/\w+|"(?:\\"|[^"])+"/g);
			if(arguments){
				if(typeof arguments[0]!='undefined' && arguments[0].length>0){
					var command = '/'+arguments[0];
					if(AvailableCommands.indexOf(command)>=0){
						$('.chat-input-wrapper input').val($('.chat-input-wrapper input').val().replace(command, '').trim());
						setChatInputPrefix(command);
					}
				}
			}
		}
	}
	/**
	 * preEmitMessage
	 * Final check of users message before emitting to the server
	 *
	 * @param {string} msg - raw user chat input
	 * @returns {void}
	 */
	function preEmitMessage(msg){
		messageEmit($('.chat-target').text()+' '+$('.chat-input-wrapper input').val());
	}
	/**
	 * messageEmit
	 * Pass message string to the server
	 *
	 * @param {string} message - checked user input
	 * @returns {void}
	 */
	function messageEmit(message){
		socket.emit('msg', message);
	}

	/**
	 ** Useful Shit
	 */

	function buildAvailableCommands(){
		// Combine users with server commands for AvailableCommands
		if(ServerCommands.length>0 && chat_users.length>0){
			CommandListFirstLoad = true;
			var flatusers = []; 
			for(var i in chat_users){
				flatusers.push(chat_users[i].nick.toLowerCase());
			}
			AvailableCommands = ServerCommands.concat(flatusers);
			// Prepend forward slash
			for(var i in AvailableCommands){
				AvailableCommands[i]='/'+AvailableCommands[i];
			}

			$('.chat-input-wrapper input').autocomplete("option", { source: AvailableCommands });
		}else{
			// Lists haven't been loaded check again
			setTimeout(buildAvailableCommands, 1000);
		}
	}

	/**
	 * updateTitleCount
	 * Update the message count in the DOM title
	 *
	 * @param {int} int - number of messages
	 * @returns {void}
	 */
	function updateTitleCount(int){
		$('head title').text(appTitle+' ('+int+')');
	}
	/**
	 * switchFav
	 * Update the current favicon for the filename provided
	 *
	 * @param {string} fav - image filename
	 * @returns {void}
	 */
	function switchFav(fav){
		$('#fav').attr('href','images/'+fav+'.jpg');
	}
	/**
	 * setChatInputPrefix
	 * Change the chat input prefix
	 *
	 * @param {string} prefix
	 * @returns {void}
	 */
	function setChatInputPrefix(prefix){
		$('.chat-target').text(prefix);
		resizeChatInput();
	}
	/**
	 * resizeChatInput
	 * Resize the chat input taking into account the prefix size
	 *
	 * @param {string} fav - image filename
	 * @returns {void}
	 */
	function resizeChatInput(){
		$('.chat-wrapper .chat-input .chat-target').width('auto');
		$('.chat-input-wrapper input').outerWidth($('.chat-input-wrapper').width()-$('.chat-wrapper .chat-input .chat-target').outerWidth()-2);
	}
	/**
	 * updateUserListTimes
	 * Recursive loop to update the users time since last message
	 *
	 * @returns {void}
	 */
	function updateUserListTimes(){
		for(var i=0;i<chat_users.length;i++){
			$('.user'+chat_users[i].id+' .lastActive').html(timeSince(chat_users[i].lastActive));
		}

		setTimeout(updateUserListTimes, 1000);
	}
	/**
	 * updateUserListDOM
	 * Create a new userlist based on the current chat_users
	 *
	 * @returns {void}
	 */
	function updateUserListDOM(){
		var user_list = '';
		for(var i=0;i<chat_users.length;i++){
			user_list+='<li class="user'+chat_users[i].id+' title="'+chat_users[i].ip+'">'+chat_users[i].nick+' <span class="lastActive">0 secs</span></li>';
		}
		$('.chat-userlist ul').html(user_list);
	}

	return _construct();
}