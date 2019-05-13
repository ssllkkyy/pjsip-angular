'use strict';

proySymphony.factory('chatWebsocket', function($q, $rootScope, $cookies, $websocket, $http,
    usefulTools, $interval, $timeout, $filter, $myModal, $location, $window, $auth,
    notificationService, mmApi, __env, symphonyConfig, userService, chatService) {
    var service = {
        responseCallbacks: [],
        currentTypingUsers: {}
    };
    //if (!$rootScope.chatDisabled && $auth.isAuthenticated()) {
    if (false) {
        var dataStream = $websocket(__env.chatWebsocket && __env.chatWebsocket !== '' ?
            __env.chatWebsocket : symphonyConfig.chatWebsocket, null, {
                reconnectIfNotNormalClose: true
            });

        var collection = [];

        var symphonyURL = __env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl :
            symphonyConfig.symphonyUrl;
        $rootScope.chatSeq = 1;

        function sendChallenge() {
            var challenge = {
                "seq": $rootScope.chatSeq++,
                "action": "authentication_challenge",
                "data": {
                    "token": $cookies.get('mmToken')
                }
            };
            console.log(challenge);
            dataStream.send(JSON.stringify(challenge));
        }

        dataStream.onOpen(function(result) {
            console.log("WEBSOCKET HAS BEEN OPENED TO MATTERMOST SERVER " + JSON.stringify(
                result));
            console.log("CHAT WEBSOCKET READYSTATE");
            console.log(dataStream.readyState);
            sendChallenge();

        });

        dataStream.onClose(function(result) {
            console.log("WEBSOCKET HAS BEEN CLOSED TO MATTERMOST SERVER " + JSON.stringify(
                result));
            console.log("WEBSOCKET READYSTATE");
            console.log(dataStream.readyState);
            //$rootScope.reconnectChatWebsocket();
        });

        dataStream.onError(function(result) {
            if (__env.enableDebug) console.log(
                "ERROR WITH MATTERMOST WEBSOCKET SERVER - " + JSON.stringify(
                    result));

        });

        function keepAlive() {
            var data = {
                "seq": $rootScope.chatSeq++,
                "action": "get_statuses",
                "data": null
            };
            //console.log(data);
            dataStream.send(JSON.stringify(data));
        }
        $rootScope.mmWebsocketAlive = $interval(function() {
            console.log("Keepalive");
            keepAlive();
        }, 30000);
        $rootScope.$watch('alive', function(newVal, oldVal) {
            //if (newVal === false) $interval.cancel(alive);
        });
        $rootScope.$watch('openMmWebsocket', function(newVal, oldVal) {
            if (newVal === 'true') {
                //dataStream  = $websocket(__env.chatWebsocket && __env.chatWebsocket!=='' ? __env.chatWebsocket : symphonyConfig.chatWebsocket, null, {reconnectIfNotNormalClose: true});
            }
        });
        /*    $rootScope.$watch('closeMmWebsocket', function(newVal, oldVal){
                if (newVal === 'true') {
                    console.log(dataStream);
                    //dataStream.close(true, 1000);
                    //this.socket.socket.close(1000, "Client closed socket");
                    //$interval.cancel(alive);
                } else if (newVal === 'refresh') {
                    $rootScope.closeMmWebsocket = 'false';
                    //dataStream.close(true, 1000);
                    //dataStream  = $websocket(__env.chatWebsocket && __env.chatWebsocket!=='' ? __env.chatWebsocket : symphonyConfig.chatWebsocket, null, {reconnectIfNotNormalClose: true});
                }
            });*/

        dataStream.onMessage(function(message) {
            //collection.push(JSON.parse(message.data));
            //console.log(dataStream);
            //console.log(message);
            var activity = JSON.parse(message.data);
            //if (activity.event) {
            if (__env.enableDebug) console.log("New Message from Server - " +
                moment().format());
            if (__env.enableDebug) console.log(message.data);
            if (activity.status === 'FAIL') sendChallenge();
            //console.log(activity);
            //}
            if (activity.seq_reply) {
                if (service.responseCallbacks[activity.seq_reply]) {
                    service.responseCallbacks[activity.seq_reply](activity);
                }
            }
            switch (activity.event) {
                case 'hello':
                    //$rootScope.socket = activity.event;
                    //var message = "status changed to "+$filter('uppercase')(activity.event);
                    //$myModal.open('', '', 'Hello to Server ', message);
                    break;

                case 'channel_deleted':
                    if (__env.enableDebug) console.log(activity);
                    var channelId = activity.data.channel_id;
                    var index = $filter('getIndexById')($rootScope.availableChannels,
                        channelId);
                    if (index !== null) $rootScope.availableChannels.splice(index,
                        1);
                    var index = $filter('getIndexById')($rootScope.unsubscribedChannels,
                        channelId);
                    if (index !== null) $rootScope.unsubscribedChannels.splice(
                        index, 1);
                    if ($rootScope.curChannel && channelId == $rootScope.curChannel
                        .id) {
                        var townsquare = $filter('getByName')($rootScope.availableChannels,
                            'town-square');
                        $rootScope.curChannel = townsquare;
                        $rootScope.showChannel();
                    }
                    break;
                case 'user_added':
                    if (__env.enableDebug) console.log(activity);
                    var broadcast = activity.broadcast;
                    if (__env.enableDebug) console.log("NEW CHANNEL " + broadcast.channel_id);
                    $rootScope.getChannel(broadcast.channel_id);
                    chatService.refreshChatInfo();
                    chatService.updateChannelMembers();
                    break;

                case 'direct_added':
                    if (__env.enableDebug) console.log(activity);
                    var broadcast = activity.broadcast;
                    if (__env.enableDebug) console.log("NEW DIRECT CHANNEL " +
                        broadcast.channel_id);

                    chatService.updateChannelMembers()
                        .then(function(response) {
                            //console.log(response);
                            var channel = $filter('getById')($rootScope.availableChannels,
                                broadcast.channel_id);
                            //console.log(channel);
                            var members = channel.name.split('__');
                            var teammate = null;
                            //console.log(members);
                            angular.forEach(members, function(member) {
                                if (member !== $rootScope.mmProfile.id)
                                    teammate = member;
                            });
                            //console.log(teammate);
                            if (teammate !== null) $rootScope.updateUserPreference(
                                'direct_channel_show', teammate, 'true');
                            //chatService.refreshChatInfo();
                        });
                    //$rootScope.getChannel(broadcast.channel_id);



                    break;
                case 'preference_changed':
                    var pref = JSON.parse(activity.data.preference);
                    if (__env.enableDebug) console.log(pref);
                    if (pref.category === 'direct_channel_show' && pref.value ===
                        'true') {
                        if (__env.enableDebug) console.log($rootScope.allPreferences);
                        var index = $filter('getPrefByName')($rootScope.allPreferences,
                            pref.name);
                        if (index !== null) {
                            $rootScope.allPreferences[index] = pref;
                        } else {
                            $rootScope.allPreferences.push(pref);
                        }
                    }
                    break;
                case 'posted':
                    var showDesktopNotice = false;
                    var mention = false;
                    var newpost = JSON.parse(activity.data.post);
                    if (chatService.isThreadPost(newpost)) {
                        chatService.handleNewThreadPost(newpost);
                        // break;
                    } else {
                        chatService.addNewRootPostId(newpost);
                    }
                    if (activity.data.mentions && JSON.parse(activity.data.mentions)
                        .indexOf($rootScope.mmProfile.id) !== -1) mention = true;

                    var go = true;
                    var counter = 0;
                    var checkChannel = null;
                    var index = $filter('getIndexById')($rootScope.availableChannels,
                        newpost.channel_id);
                    var channel = $filter('getById')($rootScope.availableChannels,
                        newpost.channel_id);
                    if (channel && index !== null) {

                        processPost(newpost, activity);
                    } else {
                        /*
                        checkChannel = $interval( function() {
                            if(__env.enableDebug) console.log("DOING checkChannel Interval");
                            console.log(newpost);
                            var index  = $filter('getIndexById')($rootScope.availableChannels, newpost.channel_id);
                            if (index!==null) {
                                processPost(newpost, activity);
                            } else {
                                counter++;
                                if (counter==10) {
                                    chatService.refreshChatInfo();
                                    if (checkChannel) $interval.cancel(checkChannel);
                                }
                            }
                        }, 5000);*/
                    }

                    function processPost(newpost, activity) {
                        var index = $filter('getIndexById')($rootScope.availableChannels,
                            newpost.channel_id);
                        var channel = $filter('getById')($rootScope.availableChannels,
                            newpost.channel_id);
                        if (channel && index !== null) {
                            var volume = 2;
                            if (activity.data.sender_name !== $rootScope.mmProfile.username) {
                                mention = true;
                            }
                            var calledOut = chatService.postCallsOutCurrentUser(
                                newpost);
                            var isDirectMessage = activity.data.channel_type ===
                                'D'; // channel, here, everyone
                            if (mention && (calledOut || isDirectMessage)) {
                                showDesktopNotice = true;
                            }
                            if ($rootScope.curChannel && newpost.channel_id ===
                                $rootScope.curChannel.id) {
                                if ($rootScope.order && $rootScope.order.indexOf(
                                        newpost.id) == -1) {
                                    var addpost = {};
                                    if (newpost.file_ids && newpost.file_ids.length >
                                        0) {

                                        mmApi.getFileInfoPosts(newpost.id)
                                            .then(function(response2) {
                                                if (response2.data) {
                                                    newpost.fileinfoposts =
                                                        response2.data;
                                                    angular.forEach(newpost.fileinfoposts,
                                                        function(file) {
                                                            mmApi.getPublicLink(
                                                                    file.id
                                                                )
                                                                .then(
                                                                    function(
                                                                        response2
                                                                    ) {
                                                                        file
                                                                            .link =
                                                                            response2
                                                                            .data;
                                                                        file
                                                                            .obj = {
                                                                                obj: file
                                                                                    .link
                                                                            };
                                                                    });
                                                        });
                                                }
                                            });
                                        var fileinfo = [];
                                        newpost.fileinfo = fileinfo;
                                    }
                                    addpost[newpost.id] = newpost;
                                    if (!$rootScope.order[newpost.id]) {
                                        angular.extend($rootScope.posts, addpost);
                                        var neworder = $rootScope.order.length;
                                        $rootScope.order.push(newpost.id);
                                        chatService.updatePostInfo(newpost.id,
                                            neworder);
                                    }
                                    if ($location.path() === "/chatplus") {
                                        $timeout(function() {
                                            usefulTools.goToId('post_' +
                                                newpost.id);
                                        });
                                        //}, 1000, false);
                                    } else {
                                        if (mention) $rootScope.availableChannels[
                                            index].mention_count += 1;
                                    }
                                    $rootScope.removeFirstPost();
                                    if ($rootScope.newMessagesStart[newpost.channel_id] ==
                                        '' || $rootScope.newMessagesStart[newpost.channel_id] ==
                                        null) $rootScope.newMessagesStart[newpost.channel_id] =
                                        newpost.id;
                                }
                            } else {
                                if (mention) {
                                    $rootScope.availableChannels[index].mention_count +=
                                        1;
                                    var index2 = $filter('getIndexByChannelId')(
                                        $rootScope.channelMembers, newpost.channel_id
                                    );
                                    $rootScope.channelMembers[index].mention_count +=
                                        1;
                                }
                                $rootScope.availableChannels[index].hasUnread =
                                    true;
                                if ($rootScope.newMessagesStart[newpost.channel_id] ==
                                    '' || $rootScope.newMessagesStart[newpost.channel_id] ==
                                    null) $rootScope.newMessagesStart[newpost.channel_id] =
                                    newpost.id;
                            }
                            if ($rootScope.availableChannels[index]) $rootScope.availableChannels[
                                index].last_post_at = (new Date).getTime();
                            //console.log("SHOW NOTICE??");
                            //console.log(showDesktopNotice);
                            if (showDesktopNotice) {
                                var showOnPageHidden = false;
                                var audioFile;
                                if ($rootScope.user.chatRingtonePath) {
                                    audioFile = symphonyConfig.audioUrl +
                                        $rootScope.user.chatRingtonePath;
                                } else if ($rootScope.user.domain.chatRingtone) {
                                    audioFile = symphonyConfig.audioUrl +
                                        $rootScope.user.domain.chatRingtone.filepath;
                                } else {
                                    audioFile =
                                        "https://res.cloudinary.com/freebizads/video/upload/v1485316626/msg_text_ogk1ty.mp3";
                                }
                                //console.log(audioFile);
                                if ($location.path() === "/chatplus" && $rootScope.curChannel &&
                                    $rootScope.curChannel.id === newpost.channel_id
                                ) showOnPageHidden = true;
                                if ($rootScope.user.chatRingtoneVolume) {
                                    volume = $rootScope.user.chatRingtoneVolume /
                                        10;
                                } else if ($rootScope.user.domain.chatRingtoneVolume) {
                                    volume = $rootScope.user.domain.chatRingtoneVolume /
                                        10;
                                }
                                var notice = {
                                    icon: 'https://res.cloudinary.com/freebizads/image/upload/v1482344729/sms-icon_eu8epj.png',
                                    message: newpost.message,
                                    title: 'New ChatPlus Mention',
                                    audioFile: audioFile,
                                    audioVolume: volume,
                                    duration: 5,
                                    showOnPageHidden: showOnPageHidden,
                                    url: symphonyURL + '/chatplus/' + newpost.channel_id +
                                        '/' + newpost.id
                                };
                                notificationService.fullNotification(notice);
                            }
                            showDesktopNotice = false;

                            $window.localStorage.setItem("availableChannels", JSON.stringify(
                                $rootScope.availableChannels));
                            $window.localStorage.setItem("channelMembers", JSON.stringify(
                                $rootScope.channelMembers));
                            $rootScope.numNewChatMessages++;
                            if (checkChannel) $interval.cancel(checkChannel);

                        } else {
                            if (checkChannel) $interval.cancel(checkChannel);
                        }
                    }

                    break;
                case 'post_deleted':
                    //alert(activity.data.sender_name+ " Mew message posted");
                    var post = JSON.parse(activity.data.post);
                    if ($rootScope.curChannel && post.channel_id === $rootScope.curChannel
                        .id) {
                        if ($rootScope.order) {
                            var index = $rootScope.order.indexOf(post.id);
                            if (index > -1) {
                                $rootScope.order.splice(index, 1);
                            }
                        }
                    }
                    break;
                case 'typing':
                    var mmUser = $rootScope.teamUsers[activity.data.user_id];
                    channelId = activity.broadcast.channel_id;
                    console.log(mmUser);
                    if (mmUser) service.addTypingUser(channelId, mmUser);
                    break;
                case 'user_updated':
                    if ($rootScope.u) {
                        console.log($rootScope.u);
                        console.log(activity);
                        var mmUser = $rootScope.teamUsers[activity.data.user.id];
                        console.log(mmUser);
                        if (mmUser) {
                            $rootScope.teamUsers[activity.data.user.id].first_name =
                                activity.data.user.first_name;
                            $rootScope.teamUsers[activity.data.user.id].last_name =
                                activity.data.user.last_name;
                            $rootScope.teamUsers[activity.data.user.id].username =
                                activity.data.user.username;
                            $rootScope.u[activity.data.user.id] = $rootScope.teamUsers[
                                activity.data.user.id];
                        }
                    }
                    // if (mmUser) service.addTypingUser(channelId, mmUser);
                    break;
                case 'channel_viewed':
                    channelId = activity.data.channel_id;
                    channel = $filter('getById')($rootScope.availableChannels,
                        channelId);
                    var prevChannelId = $rootScope.mmProfile.lastChannel;
                    if (channelId !== $rootScope.curChannel.id) {
                        index = $filter('getIndexById')($rootScope.availableChannels,
                            channelId);
                        $rootScope.availableChannels[index].mention_count = 0;
                        channel.hasUnread = false;
                        $window.localStorage.setItem("availableChannels",
                            JSON.stringify($rootScope.availableChannels));
                    }
                    break;
                case 'new_user':
                    var newUserId = activity.user_id;
                    //alert(newUserId + " User has been created");
                    //NEED TO ADD NEW USERS TO THE TEAM MEMBERS
                    break;
                case 'post_edited':
                    var data = JSON.parse(activity.data.post);
                    post = $rootScope.posts[data.id];
                    post.message = data.message;
                default:
            }
        });

        var methods = {
            collection: collection,
            get: function() {
                dataStream.send(JSON.stringify({
                    action: 'get'
                }));
            }
        };

        service.closeSocket = function() {
            console.log("Closing socket");
            dataStream.close();
        };

        service.sendMessage = function(action, data, responseCallback) {
            const msg = {
                action: action,
                seq: $rootScope.chatSeq++,
                data: data
            };


            if (responseCallback) {
                service.responseCallbacks[msg.seq] = responseCallback;
            }

            //console.log("MESSAGE");
            //console.log(msg);
            dataStream.send(JSON.stringify(msg));
        };

        service.userTyping = function(channelId, parentId, callback) {
            if (!service.lastTypingTimeout) {
                const data = {};
                data.channel_id = channelId ? channelId : $rootScope.curChannel.id;
                data.parent_id = parentId ? parentId : '';

                service.sendMessage('user_typing', data, callback);
                service.lastTypingTimeout = $timeout(function() {
                    $timeout.cancel(service.lastTypingTimeout);
                    delete service.lastTypingTimeout;
                }, 3000);
            }
        };

        service.addTypingUser = function(channelId, mmUser) {
            if (!service.currentTypingUsers[channelId]) {
                service.currentTypingUsers[channelId] = {};
            }
            if (service.currentTypingUsers[channelId][mmUser.id]) {
                $timeout.cancel(service.currentTypingUsers[channelId][mmUser.id].typingTimeout);
                delete service.currentTypingUsers[channelId][mmUser.id];
            }
            var typingTimeout = $timeout(function() {
                delete service.currentTypingUsers[channelId][mmUser.id];
                $timeout.cancel(typingTimeout);
                console.log("CURRENT TYPING USERS");
                console.log(service.currentTypingUsers[channelId]);
                console.log(service.getCurrentlyTypingUsersByChannelId(
                    channelId));
            }, 3000);
            service.currentTypingUsers[channelId][mmUser.id] = {
                typingTimeout: typingTimeout,
                mmUser: mmUser
            };
        };

        service.getCurrentlyTypingUsersByChannelId = function(channelId, namesOnly) {
            if (!channelId) {
                channelId = $rootScope.curChannel.id;
            }
            var channelTypists = service.currentTypingUsers[channelId];
            if (!channelTypists) {
                channelTypists = {};
            }
            var users = Object.keys(channelTypists).map(function(key) {
                return channelTypists[key].mmUser;
            });
            return namesOnly ? users.map(function(user) {
                return user.first_name;
            }) : users;
        };

    }
    return service;
});
