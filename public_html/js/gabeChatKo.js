/*
 * Login View Model
 * Dependencies: none
 * Params: jQuery, Knockout, Ajax.
 */
define(function () {

    // Create Login object.
    var Gabe = window.Gabe = window.Gabe || {};

    Gabe.ViewModel = function ($, ko) {

        // **** Main ****
        var self = this;
        self.jSelector = "#theBodyOfGabe";
        self.chat_users = [];
        self.appTitle = ko.observable(name || 'GabeChat');

        self.isFocused = ko.observable(false);
        self.lostFocusCount = ko.observable(0);
        self.isSilentClient = ko.observable(false);
        self.isVoice = ko.observable(false);
        self.isShowYoutubeEmbedded = ko.observable(true);

        self.CommandListFirstLoad = ko.observable(false);
        self.ServerCommands = [];
        self.AvailableCommands = [];
		
        
        self.editor = ko.observable();
        self.editorDefault = ko.observable("using System;\nusing System.Collections.Generic;\nusing System.Linq;\n\nnamespace Gaben\n{\n\tpublic class Script : IScript\n\t{\n\t\tpublic string RunScript()\n\t\t{\n\t\t\t\n\t\t}\n\t}\n}");

        // **** Functions ****
        self.fn = {};

        self.fn.construct = function(){

            // Init shit
            self.sockets.socket(io.connect(':8080'));
            self.fn.setChatInputPrefix('/all');

            self.fn.init();

            return self;
        }

        self.fn.init = function () {
            self.sockets.fn.socketIOListeners();
            self.fn.jQueryListeners();
            self.fn.updateUserListTimes();
            self.sockets.fn.buildAvailableCommands();
        }

        self.fn.jQueryListeners = function () {
            $(window).resize(function () {
                var h = $(window).outerHeight() - ($('.chat-wrapper .chat-header').outerHeight() + $('.chat-wrapper .chat-input').outerHeight()) - 10;
                $('.chat-wrapper .chat-window').css('height', h + 'px');
                self.fn.resizeChatInput();
            });
            $(window).resize();

            $(window).focus(function () {
                self.isFocused(true);
                self.fn.switchFav('fav1');
                self.lostFocusCount(0);
                self.fn.updateTitleCount(self.lostFocusCount());
            }).blur(function () {
               self.isFocused(false);
            });

            $('.chat-wrapper').click(function () {
                if (!self.isFocused())
                    $(window).triggerHandler('focus');
            });

            // jQuery Listeners UI
            $('.btn-sound').click(function () {
                if ($(this).hasClass('fa-volume-up')) {
                    $(this).removeClass('fa-volume-up');
                    $(this).addClass('fa-volume-off');
                    self.isSilentClient(true);
                    document.getElementById('chatNotification').volume = 0;
                } else {
                    $(this).removeClass('fa-volume-off');
                    $(this).addClass('fa-volume-up');
                    self.isSilentClient(false);
                    document.getElementById('chatNotification').volume = 0.6;
                }
            });
            $('.btn-youtube').click(function () {
                if (!self.isShowYoutubeEmbedded()) {
                    $(this).removeClass('disabled');
                    self.isShowYoutubeEmbedded(true);
                } else {
                    $(this).addClass('disabled');
                    self.isShowYoutubeEmbedded(false);
                }
            });
            $('.btn-voice').click(function () {
                if (!self.isVoice()) {
                    $(this).removeClass('disabled');
                } else {
                    $(this).addClass('disabled');
                }
                self.isVoice(!self.isVoice());
            });
            $('.btn-script').click(function () {
                self.editor(ace.edit("editor"));
                self.editor().setValue(self.editorDefault());
                self.editor().setTheme("ace/theme/sqlserver");
                self.editor().getSession().setMode("ace/mode/csharp");
                self.editor().setShowPrintMargin(false);
                self.editor().gotoLine(11);
                $('#editorWindow').modal();
            });

            $('.btn-random').click(function () {

                $('#random').modal();
            });

            $('#scriptSave').click(function () {
                var script = editor.getValue();
                var name = $('#scriptName').val();

                var message = script + "|" + name;

                self.fn.postScript(message);
            });

            $('#scriptReset').click(function () {
                self.editor().setValue(editorDefault);
                self.editor().setShowPrintMargin(false);
                self.editor().gotoLine(11);
            });

            $('.chat-input-wrapper input').autocomplete({
                source: self.AvailableCommands,
                position: { my: "left bottom", at: "left top", collision: "flip" }
            });

            // Input
            $('.chat-input-wrapper input').on('input propertychange paste', function (e) {
                self.sockets.fn.checkStrForCommand($('.chat-input-wrapper input').val());
            });
            $('.chat-input-wrapper').submit(function (e) {
                e.preventDefault();
                self.sockets.fn.preEmitMessage($('.chat-input-wrapper input').val());
                self.fn.setChatInputPrefix('/all');
                $('.chat-input-wrapper input').val('');
                return false;
            });
        }

        self.fn.postScript = function(script) {
            var fullMessage = "!script " + script;

            self.fn.preEmitMessage(fullMessage);

            self.fn.messageEmit(fullMessage);
        }

        self.fn.updateTitleCount = function(int) {
            $('head title').text(self.appTitle() + ' ('+int+')');
        }

        self.fn.switchFav = function(fav){
            $('#fav').attr('href','images/'+fav+'.jpg');
        }

        self.fn.setChatInputPrefix = function(prefix){
            $('.chat-target').text(prefix);
            self.fn.resizeChatInput();
        }

        self.fn.resizeChatInput = function(){
            $('.chat-wrapper .chat-input .chat-target').width('auto');
            $('.chat-input-wrapper input').outerWidth($('.chat-input-wrapper').width()-$('.chat-wrapper .chat-input .chat-target').outerWidth()-2);
        }

        self.fn.updateUserListTimes = function(){
            for(var i=0; i < self.chat_users.length; i++){
                $('.user' + self.chat_users[i].id+' .lastActive').html(self.fn.timeSince(chat_users[i].lastActive));
            }

            setTimeout(self.fn.updateUserListTimes(), 1000);
        }

        self.fn.timeSince = function(date) {
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

        self.fn.updateUserListDOM = function(){
            var user_list = '';
            if (self.chat_users) {
                for (var i = 0; i < self.chat_users.length; i++) {
                    user_list += '<li class="user' + self.chat_users[i].id + ' title="' + self.chat_users[i].ip + '">' + self.chat_users[i].nick + ' <span class="lastActive">0 secs</span></li>';
                }
                $('.chat-userlist ul').html(user_list);
            }
        }


        // **** Sockets ****

        self.sockets = {};
        self.sockets.socket = ko.observable(null);

        // **** Functions ****

        self.sockets.fn = {};

        self.sockets.fn.socketIOListeners = function () {
            self.sockets.socket().on('client_key', self.sockets.fn.onSocketConnect);
            self.sockets.socket().on('updateUsers', self.sockets.fn.onUpdateUsers);
            self.sockets.socket().on('availableCommands', self.sockets.fn.onAvailableCommands);
            self.sockets.socket().on('msg', self.sockets.fn.onMessageReceive);
        }

        self.sockets.fn.onSocketConnect = function (key) {
            console.log(key);
            var date = new Date();
            date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000));
            document.cookie = 'gabeChat=' + key + '; expires=' + date.toGMTString() + '; path=/'
        }

        self.sockets.fn.onAvailableCommands = function (data) {
            self.ServerCommands = data;
        }

        self.sockets.fn.onUpdateUsers = function (data) {
            self.chat_users = data;
            if (self.CommandListFirstLoad()) {
                self.sockets.fn.buildAvailableCommands();
            }

            self.fn.updateUserListDOM();
        }

        self.sockets.fn.onMessageReceive = function (data) {
            if (!self.isFocused()) {
                self.fn.switchFav('fav2');
                self.lostFocusCount(self.lostFocusCount() + 1);
                self.fn.updateTitleCount(self.lostFocusCount());
                document.getElementById('chatNotification').pause();
                document.getElementById('chatNotification').play();
            }
            self.sockets.fn.parseMessageData(data);
        }

        self.sockets.fn.parseMessageData = function (data) {
            if (data.type == 'youtube' && !self.isShowYoutubeEmbedded()) {
                var video_url = $(data.msg).attr('src');
                data.msg = 'You have embedded videos off: <a href="' + video_url + '" target="_BLANK">' + video_url + '</a>';
                data.type = 'message';
            } else if (data.type == 'audio' && !self.isSilentClient()) { }

            self.sockets.fn.addMessage(data);
        }

        self.sockets.fn.addMessage = function (data) {
            var time = new Date(data.time),
                h = (time.getHours() < 10) ? '0' + time.getHours() : time.getHours(),
                m = (time.getMinutes() < 10) ? '0' + time.getMinutes() : time.getMinutes(),
                s = (time.getSeconds() < 10) ? '0' + time.getSeconds() : time.getSeconds();

            $('.chat-window ul').append('<li class="' + data.type + '">' +
                '<span class="time">' + h + ':' + m + ':' + s + '</span>' +
                '<span class="from" title="' + data.ip + '">' + data.user + '</span>' +
                '<span class="text" style="color:' + data.color + '">' + data.msg + '</span>' +
            '</li>');

            if (data.type == 'audio' && !isSilentClient) {
                document.getElementById('audioMsg' + data.id).play();
            }

            if (self.isVoice() && !data.msg.contains("http")) {
                var msg = new SpeechSynthesisUtterance();
                msg.rate = 0.7;
                msg.text = data.msg;
                speechSynthesis.speak(msg);
            }

            String.prototype.contains = function (text) {
                return this.indexOf(text) != -1;
            };

            $('.chat-window').scrollTop($('.chat-window ul').height());
        }

        self.sockets.fn.checkStrForCommand = function (str) {
            if (str.length > 0 && str.substring(0, 1) == '/') {
                var arguments = str.match(/\w+|"(?:\\"|[^"])+"/g);
                if (arguments) {
                    if (typeof arguments[0] != 'undefined' && arguments[0].length > 0) {
                        var command = '/' + arguments[0];
                        if (self.AvailableCommands.indexOf(command) >= 0) {
                            $('.chat-input-wrapper input').val($('.chat-input-wrapper input').val().replace(command, '').trim());
                            self.fn.setChatInputPrefix(command);
                        }
                    }
                }
            }
        }

        self.sockets.fn.preEmitMessage = function (msg) {
            self.sockets.fn.messageEmit($('.chat-target').text() + ' ' + $('.chat-input-wrapper input').val());
        }

        self.sockets.fn.messageEmit = function (message) {
            self.sockets.socket().emit('msg', message);
        }

        self.sockets.fn.buildAvailableCommands = function () {
            // Combine users with server commands for AvailableCommands
            if (self.ServerCommands.length > 0 && self.chat_users.length > 0) {
                self.CommandListFirstLoad(true);
                var flatusers = [];
                for (var i in self.chat_users) {
                    flatusers.push(self.chat_users[i].nick.toLowerCase());
                }
                self.AvailableCommands = self.ServerCommands.concat(flatusers);
                // Prepend forward slash
                for (var i in self.AvailableCommands) {
                    self.AvailableCommands[i] = '/' + self.AvailableCommands[i];
                }

                $('.chat-input-wrapper input').autocomplete("option", { source: self.AvailableCommands });
            } else {
                // Lists haven't been loaded check again
                setTimeout(buildAvailableCommands, 1000);
            }
        }

    };

    return Gabe;
});