'use strict';

proySymphony.service('newChatService', function(_, mmApi, $rootScope, $sce, $filter, Slug, $cookies,
    usefulTools, metaService, dataFactory, contactService, $timeout, notificationService, integrationService,
    chatMessages, $location, fileService, statusService) {


    var getDefaultServiceObject = function() {
        return {
            userProfile: {},
            teamMembers: {},
            availableChannels: {},
            privateChannels: {},
            publicChannels: {},
            directChannels: {},
            onChatInitCallbacks: [],
            chatInitialized: false,
            favorites: [],
            serviceEvents: {
                chatInitialized: {
                    occurred: 0,
                    callbacks: []
                },
                successfulLogin: {
                    occurred: 0,
                    callbacks: []
                },
                teamMembersLoaded: {
                    occurred: 0,
                    callbacks: []
                },
                channelAdded: {
                    occurred: 0,
                    callbacks: []
                },
                channelRemoved: {
                    occurred: 0,
                    callbacks: []
                },
                memberAdded: {
                    occurred: 0,
                    callbacks: []
                }
            },
            publicData: {
                currentChannel: {}
            },
            postPlaceholderCount: 0,
            inProgressMessages: {},
            postFiles: [],
            ownPostsProcessing: 0,
            postHandlingQueue: [],
            lastNotifiedChannel: null
        };
    };

    var service = getDefaultServiceObject();

    service.allChannels = function() {
        var privateChannels = Object.values(service.privateChannels);
        var publicChannels = Object.values(service.publicChannels);
        var directChannels = Object.values(service.directChannels);
        return privateChannels.concat(publicChannels).concat(directChannels);
    };

    service.unreadTotal = function() {
        var channels = service.allChannels();
        var unreadVals = channels.map(function(channel) {
            return channel.getUnreadCount();
        });
        return unreadVals.reduce(function(acc, val) {
            return acc + val;
        });
    };

    service.reset = function() {
        var defaultServiceObject = getDefaultServiceObject();

        function customizer(objValue, srcValue) {
            if (_.isObject(srcValue) && _.isEmpty(srcValue)) {
                return srcValue;
            }
            return undefined;
        };
        _.mergeWith(service, defaultServiceObject, customizer);
        return true;
    };

    service.login = function() {
        var email = $rootScope.user.symphony_user_settings.email_address;
        var pass = $rootScope.user.symphony_user_settings.mattermost_user_pass;
        var data = {
            login_id: email,
            password: pass
        };
        return mmApi.doLogin(data)
            .then(function(result) {
                var token = result.headers().token;
                if (token) {
                    $cookies.put('accessToken', token);
                    runEventCallbacks('successfulLogin');
                    return token;
                } else {
                    return null;
                }
            }, defaultFailureHandler);
    };

    service.init = function() {
        if ($rootScope.user.symphony_user_settings.chat_access_token) {
            $cookies.put('accessToken', $rootScope.user.symphony_user_settings.chat_access_token);
            service.loadInfo();
        } else {
            service.login().then(function(response) {
                if (response) {
                    service.loadInfo();
                }
            });
        }
    };

    service.setUserStatus = function(status, userId) {
        var data = {
            status: status
        };
        mmApi.updateUserStatus(userId, data);
    };

    service.loadInfo = function(userId) {
        if (!userId) userId = $rootScope.user.symphony_user_settings.mattermost_user_id;
        service.getUser(userId).then(function(userProfile) {
            if (userProfile) {
                $rootScope.chatMessages = chatMessages;
                service.setUserStatus('online', userId);
                service.getUserPreferences().then(function(userProfile) {
                    if (userProfile) {
                        service.getUserTeam().then(function(userProfile) {
                            service.getUserTeamMembers().then(
                                function(teamMembers) {
                                    service.getUserChannels()
                                        .then(function(
                                            response) {
                                            service.registerCallbacks();
                                            runEventCallbacks
                                                (
                                                    'chatInitialized'
                                                );
                                        });
                                    service.getAvailableChannels();
                                });
                        });
                    }
                });
            }
        });
        metaService.registerOnRootScopeUserLoadCallback(function() {
            service.getChatFavorites($rootScope.user.id);
        });
    };

    service.setUserStatus = function(status, userId) {
        var data = {
            status: status
        };
        mmApi.updateUserStatus(userId, data);
    };

    // RESOURCE FUNCTIONS

    service.setInProgress = function(id, message) {
        return service.inProgressMessages[id] = message;
    };

    service.getInProgress = function(id) {
        return service.inProgressMessages[id];
    };

    service.getUser = function(userId) {
        return mmApi.getMe(userId).then(function(response) {
            if (successResponse(response)) {
                service.userProfile = response.data;
                service.userProfile.isThisUser = true;
                return service.userProfile;
            }
            return null;
        });
    };

    service.getUserSessions = function(userId) {
        return mmApi.getUserSessions(userId)
            .then(function(response) {
                return response.data;
            });
    };

    service.getUserAudits = function(userId) {
        return mmApi.getUserAudits(userId)
            .then(function(response) {
                return response.data;
            });
    };

    service.getSessionByToken = function(sessions, token) {
        var i = 0;
        for (i; i < sessions.length; i++) {
            if (sessions[i].token == token) return sessions[i];
        }
        return null;
    };

    service.getUserPreferences = function() {
        return mmApi.getAllUserPreferences(service.userProfile.id).then(function(
            response) {
            if (successResponse(response)) {
                service.userProfile.preferences = response.data;
                return service.userProfile;
            }
            return null;
        });
    };

    service.getUserTeam = function() {
        return mmApi.getUsersTeams(service.userProfile.id).then(function(response) {
            if (successResponse(response)) {
                service.userProfile.team = response.data[0];
                return service.userProfile;
            }
            return null;
        });
    };

    service.deleteMemberFromChannel = function(channelId, memberId) {
        return mmApi.deleteMemberFromChannel(channelId, memberId)
            .then(function(response) {
                if (successResponse(response)) {
                    service.handleUserRemoved(channelId);
                }
            });
    };

    service.joinChannel = function(channelId, memberId) {
        service.joiningChannel = channelId;
        var data = {
            user_id: memberId,
            channel_id: channelId
        };
        return mmApi.addMembertoChannel(channelId, data)
            .then(function(response) {
                if (successResponse(response)) {
                    var channel = service.availableChannels[channelId];
                    service.publicChannels[channelId] = channel;
                    return service.processChannel(channel)
                        .then(function(response) {
                            if (response) {
                                service.setCurrentChannel(channel);
                                service.joiningChannel = null;
                                return true;
                            }
                            return null;
                        });
                    runEventCallbacks('channelAdded');
                } else {
                    return false;
                }
            });
    };

    service.goToNotificationChannel = function(channelId) {
        var channel = findChannelById(channelId);
        if (channel) {
            if (isDirectChannel(channel) && !channel.showDirect) {
                service.updateUserPreference('direct_channel_show', channel.partner_id,
                    'true');
                channel.showDirect = true;
            }
            service.setCurrentChannel(channel);
            return true;
        }
        return false;
    };

    service.getAvailableChannels = function() {
        return mmApi.getPublicChannels(service.userProfile.team.id)
            .then(function(response) {
                if (successResponse(response)) {
                    var channels = response.data;
                    service.userProfile.availchannels = channels;
                    service.availableChannels = usefulTools.arrayToObjectByProp(
                        channels, 'id', service.availableChannels);
                    return service.availableChannels;
                }
                return [];
            });
    };

    service.getUserChannels = function() {
        return mmApi.getUsersChannels(service.userProfile.id, service.userProfile.team.id)
            .then(function(response) {
                if (successResponse(response)) {
                    var channels = response.data;
                    service.userProfile.channels = channels;
                    var privateChannels = _.filter(channels, isPrivateChannel);
                    var publicChannels = _.filter(channels, isPublicChannel);
                    var directChannels = _.filter(channels, isDirectChannel);
                    usefulTools.arrayToObjectByProp(privateChannels, 'id', service.privateChannels);
                    _.forEach(service.privateChannels, service.processChannel);
                    usefulTools.arrayToObjectByProp(publicChannels, 'id', service.publicChannels);
                    _.forEach(service.publicChannels, service.processChannel);
                    usefulTools.arrayToObjectByProp(directChannels, 'id', service.directChannels);
                    _.forEach(service.directChannels, service.processChannel);
                    //_.forEach(service.directChannels, service.processDirectChannel);
                    return service.userProfile;
                }
                return null;
            });
    };

    service.processChannel = function(channel) {
        channel.getUnreadCount = function() {
            return this.total_msg_count - this.msg_count;
        };
        return service.processMemberData(channel);
    };

    service.processMemberData = function(channel) {
        // console.log(channel);
        return mmApi.getChannelMember(channel.id, service.userProfile.id)
            .then(function(member) {
                channel.mention_count = member.data.mention_count;
                channel.last_viewed_at = member.data.last_viewed_at;
                channel.roles = member.data.roles;
                channel.msg_count = member.data.msg_count;
                channel.isAdmin = false;
                if (channel.roles.indexOf('channel_admin') !== -1) channel.isAdmin =
                    true;

                return mmApi.getUsersInChannel(channel.id, 100)
                    .then(function(response) {
                        // console.log(response);
                        contactService.registerOnUserContactLoadCallback(function() {
                            channel.member_count = response.data.length;
                            channel.members = response.data;
                            if (channel.type === 'D') {
                                angular.forEach(channel.members,
                                    function(member) {
                                        if (member.user_id !==
                                            service.userProfile.id) {
                                            channel.partner_id =
                                                member.user_id;
                                            var teamMember =
                                                service.teamMembers[
                                                    member.user_id];
                                            if (teamMember) {
                                                var contact = contactService.getContactbyMMId(member.user_id);
                                                channel.display_name = (contact ? contact.name : 
                                                    teamMember.first_name + ' ' + teamMember.last_name);
                                            }
                                        }
                                    });
                                channel.showDirect = service.isActiveDirectChannel(
                                    channel);
                            }
                        });
                        return channel;
                    });
            });
    };

    service.totalMentionCount = function() {
        var publicChannels = {};
        var privateChannels = {};
        var directChannels = {};
        angular.copy(service.publicChannels, publicChannels);
        angular.copy(service.privateChannels, privateChannels);
        angular.copy(service.directChannels, directChannels);
        var channels = _.merge(directChannels, _.merge(publicChannels, privateChannels));
        channels = usefulTools.convertObjectToArray(channels);
        var total = _.reduce(channels, function(sum, channel) {
            if (_.isObject(sum)) {
                sum = sum.mention_count;
            }
            return channel.mention_count ? sum + channel.mention_count : sum;
        });
        return total;
    };

    service.isActiveDirectChannel = function(channel) {
        var check = false;
        angular.forEach(service.userProfile.preferences, function(pref) {
            if (pref.category === 'direct_channel_show' &&
                channel.partner_id === pref.name && pref.value === 'true') check =
                true;
        });
        return check;
    };

    service.activateDirectChannel = function(channel, memberId) {
        service.updateUserPreference('direct_channel_show', memberId, 'true');
        service.directChannels[channel.id].showDirect = true;
        service.setCurrentChannel(service.directChannels[channel.id]);
    };

    service.createDirectChannel = function(member) {
        var channel = service.getDMChannelByUserId(member.id);
        if (channel) {
            service.updateUserPreference('direct_channel_show', member.id, 'true');
            channel.showDirect = true;
            var data = {
                users: [member.id, service.userProfile.id],
                channelId: channel.id,
                type: channel.type,
                noticeType: 'new_channel_users',
                sender: service.userProfile.id
            };
            dataFactory.postSendChatNotice(data);
            service.restartWebsocket();
            service.setCurrentChannel(channel.id);
            return true;
        } else {
            return mmApi.postCreateDirectChannel(member.id, service.userProfile.id)
                .then(function(result) {
                    if (successResponse(result)) {
                        channel = result.data;
                        return service.processMemberData(channel)
                            .then(function(response) {
                                service.updateUserPreference(
                                    'direct_channel_show', member.id,
                                    'true');
                                var data = {
                                    users: [member.id, service.userProfile.id],
                                    channelId: channel.id,
                                    type: channel.type,
                                    noticeType: 'new_channel_users',
                                    sender: service.userProfile.id
                                };
                                dataFactory.postSendChatNotice(data);
                                service.restartWebsocket();
                                channel.showDirect = true;
                                service.directChannels[channel.id] = channel;
                                service.setCurrentChannel(channel);
                                return channel;
                            });
                    } else {
                        return false;
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                    return false;
                });
        }
    };

    service.handleNewDirectChannelNotice = function(teammateId, channelId) {
        service.addNewChannelInfo(channelId)
            .then(function(response) {
                var channel = response;
                var members = channel.name.split('__');
                angular.forEach(members, function(member) {
                    if (member !== service.userProfile.id) {
                        service.updateUserPreference('direct_channel_show',
                            member, 'true');
                    }
                });
                service.userProfile.preferences.push({
                    user_id: service.userProfile.id,
                    category: "direct_channel_show",
                    name: teammateId,
                    value: "true"
                });
            });
    };

    service.handleTeamMemberUpdate = function(member) {
        $timeout(function() {
            var contact = contactService.getContactbyMMId(member.id);
            if (contact) {
                service.teamMembers[member.id] = member;
            }
        });
    };

    service.handleNewRole = function(info) {
        var channel = service.findChannelById(info.channelId);
        if (channel) {
            var i = 0;
            for (i; i < channel.members.length; i++) {
                if (channel.members[i].user_id === info.memberId) {
                    channel.members[i].roles = info.role;
                    if (info.memberId === service.userProfile.id) {
                        if (info.role.indexOf('channel_admin') !== -1) {
                            channel.isAdmin = true;
                        } else {
                            channel.isAdmin = false;
                        }
                    }
                    break;
                }
            }
        }
    };

    service.handleNewChannel = function(info) {
        var channel = service.findChannelById(info.channelid);
        if (!channel) {
            mmApi.getChannel(info.channelid)
                .then(function(response) {
                    if (successResponse(response)) {
                        channel = response.data;
                        if (isPublicChannel(channel)) {
                            service.availableChannels[info.channelid] = channel;
                        } else {
                            service.processChannel(channel)
                                .then(function(response) {
                                    if (info.memberId && info.memberId ===
                                        service.userProfile.id) {
                                        service.privateChannels[info.channelid] =
                                            channel;
                                    }
                                    if (isDirectChannel(channel)) {
                                        service.directChannels[info.channelid] =
                                            channel;
                                        service.updateUserPreference(
                                            'direct_channel_show', channel.partner_id,
                                            'true');
                                        service.directChannels[channel.id].showDirect =
                                            true;
                                    }
                                    service.restartWebsocket();
                                });
                        }
                    }
                });
        } else {
            if (isDirectChannel(channel)) {
                service.processChannel(channel)
                    .then(function(response) {
                        service.updateUserPreference('direct_channel_show', channel
                            .partner_id, 'true');
                        channel.showDirect = true;
                        service.restartWebsocket();
                    });
            }
        }
    };

    service.restartWebsocket = function() {
        $timeout(function() {
            $rootScope.$broadcast('websocket.restart.needed');
            //chatMessages.closeSocket();
        }, 2000);
    };

    service.handleUserAdded = function(info) {
        var channel = service.findChannelById(info.channelId);
        if (!channel && service.joiningChannel !== info.channelId) {
            service.addNewChannelInfo(info.channelId)
                .then(function(response) {
                    channel = service.findChannelById(info.channelId);
                    service.updateCurrentChannelWithDb(channel);
                });
        }
    };

    service.handleUserRemoved = function(info) {
        var channel = service.findChannelById(info.channelId);
        if (channel) {
            if (info.userId === service.userProfile.id) {
                if (info.channelId === service.publicData.currentChannel.id) {
                    var remover = service.teamMembers[info.removerId];
                    var removedBy = remover ? ' by ' + remover.first_name + ' ' +
                        remover.last_name : '';
                    $rootScope.showInfoAlert('Your access to "' + channel.display_name +
                        '" has been removed' + removedBy +
                        ' and you have been redirected to Town Square.');
                    $timeout(function() {
                        service.goToTownSquare();
                        if (isPrivateChannel(channel)) {
                            delete service.privateChannels[info.channelId];
                        }
                        if (isPublicChannel(channel)) delete service.publicChannels[
                            info.channelId];
                    }, 5000);
                } else {
                    if (isPrivateChannel(channel)) delete service.privateChannels[info.channelId];
                    if (isPublicChannel(channel)) delete service.publicChannels[info.channelId];
                }
            } else {
                if (channel.members) {
                    if (service.isChannelMember(channel, info.user_id)) {
                        var index = $filter('getById')(channel.members, info.user_id);
                        if (index !== null) channel.members.splice(index, 1);
                    }
                }
            }
        }
    };

    service.handleEditedPost = function(post, channelId) {
        var channelList = getChannelListById(channelId);
        if (channelList[channelId].postInfo && channelList[channelId].postInfo.posts[
                post.id]) {
            channelList[channelId].postInfo.posts[post.id].message = post.message;
        }
    };

    service.handleDeletedPost = function(post, channelId) {
        var channelList = getChannelListById(channelId);
        if (channelList[channelId].postInfo && channelList[channelId].postInfo.posts[
                post.id]) {
            channelList[channelId].postInfo.posts[post.id].delete_at = (new Date).getTime();
        }
    };

    service.handleChannelViewed = function(channelId) {
        var channel = service.findChannelById(channelId);
        if (channel) {
            channel.mention_count = 0;
            channel.msg_count = channel.total_msg_count;
        }
    };

    service.handleChannelUpdated = function(channelinfo) {
        var channel = service.findChannelById(channelinfo.id);
        if (channel) {
            channel.display_name = channelinfo.display_name;
            channel.header = channelinfo.header;
            channel.purpose = channelinfo.purpose;
        }
    };

    service.handleChannelDeleted = function(channelId) {
        if (service.availableChannels[channelId]) delete service.availableChannels[
            channelId];
        var channel = service.findChannelById(channelId);
        if (channel) {
            if (channel.id === service.publicData.currentChannel.id) {
                service.goToTownSquare();
                if (channel.creator_id !== service.userProfile.id) {
                    var message = 'The "' + channel.display_name +
                        '" channel has been deleted and you have been redirected to Town Square.';
                    $rootScope.showInfoAlert(message);
                }
            }
            if (isPrivateChannel(channel)) delete service.privateChannels[channelId];
            if (isPublicChannel(channel)) delete service.publicChannels[channelId];
        }
    };

    service.addUserToTeam = function(userId) {
        if (!service.teamMembers[userId]) {
            $timeout(function() {
                // the new_user broadcast event from mm broadcasts all users to all agencies 
                // so we need to make sure user is in authenticated agency before adding to team
                var contact = contactService.getContactbyMMId(userId);
                if (contact) {
                    var users = [userId];
                    mmApi.getUsersByIds(users)
                    .then(function(response) {
                        if (successResponse(response)) {
                            service.teamMembers[userId] =
                                response.data[0];
                            runEventCallbacks('memberAdded');
                        }
                    });
                }
            }, 15000);
            // delay is in place because when a user is created in onescreen, 
            // the mm user is created earlier in the method then the extrasettings record is created at end
            // we need this extra settings record to tie the mm userid to the bridge domain
        }
    };

    service.getUserTeamMembers = function() {
        return mmApi.getTeamMembers(service.userProfile.team.id).then(function(response) {
            if (successResponse(response)) {
                var members = response.data;
                console.log("SETTING TEAM MEMBERS");
                console.log(members);
                var retrieveUserIdFromTeamMember = function(member) {
                    return member.user_id;
                };
                var userIds = members.map(retrieveUserIdFromTeamMember);
                return mmApi.getUsersByIds(userIds).then(function(response) {
                    if (successResponse(response)) {
                        contactService.registerOnUserContactLoadCallback(
                            function() {
                                var members = response.data;
                                angular.copy({}, service.teamMembers);
                                var userContacts = usefulTools.arrayToObjectByProp(
                                    Object.values(
                                        contactService.getUserContactsOnly()
                                    ), 'chat_id'
                                );

                                function memberHasContact(member) {
                                    return Boolean(userContacts[
                                        member.id]);
                                }
                                members = members.filter(
                                    memberHasContact);
                                usefulTools.arrayToObjectByProp(
                                    members, 'id', service.teamMembers
                                );
                                runEventCallbacks(
                                    'teamMembersLoaded');
                                return service.teamMembers;
                            });
                        return true;
                    }
                    return null;
                });
            }
            return null;
        });
    };

    service.getChatFavorites = function(userUuid) {
        dataFactory.getUserChatFavorites(userUuid).then(function(response) {
            if (response.data.success) {
                var favorites = response.data.success.data;
                angular.copy(favorites, service.favorites);
                return service.favorites;
            } else {
                return false;
            }
        });
    };

    service.isChannelMember = function(channel, memberId) {
        var channelmembers = channel.members;
        var i = 0,
            len = channelmembers.length;
        for (i; i < len; i++) {
            if (channelmembers[i].user_id == memberId) return true;
        }
        return false;
    };
    //
    service.editPost = function(post, message) {
        console.log("POST", post.file_ids);

        var data = {
            message: message,
            file_ids: post.file_ids
        };
        var channelList = getChannelListById(post.channel_id);
        var postInfo = channelList[post.channel_id].postInfo;
        var previousMessage = post.message;
        var previousEditAt = post.edit_at;
        post.message = message;
        post.edit_at = (new Date).getTime();
        return mmApi.patchPost(data, post.id)
            .then(function(response) {
                if (successResponse(response)) {
                    return true;
                } else {
                    post.message = previousMessage;
                    post.edit_at = previousEditAt;
                    return false;
                }
            });
    };

    service.deletePost = function(post) {
        var channelList = getChannelListById(post.channel_id);
        var postInfo = channelList[post.channel_id].postInfo;
        var previousDeleteAt = post.delete_at;
        post.delete_at = (new Date).getTime();
        return mmApi.postDeleteChatPost(post.id)
            .then(function(response) {
                if (successResponse(response)) {
                    return true;
                } else {
                    post.delete_at = previousDeleteAt;
                    return false;
                }
            });
    };

    service.editChannel = function(info) {
        var channel = service.findChannelById(info.id);
        var data = {
            display_name: info.display_name,
            header: info.header ? info.header : null,
            purpose: info.purpose
        };
        return mmApi.patchChannel(data, channel.id)
            .then(function(response) {
                if (__env.enableDebug) console.log(response);
                channel.display_name = data.display_name;
                channel.header = data.header;
                channel.purpose = data.purpose;
                return true;
            }, function(error) {
                return false;
            });
    };

    service.leaveChannel = function(channel) {
        return mmApi.deleteMemberFromChannel(channel.id, service.userProfile.id)
            .then(function(response) {
                service.goToTownSquare();
                return service.removeChannelFromAvailableChannels(channel);
            });
    };

    service.removeChannelMember = function(channelId, memberId) {
        var channel = service.findChannelById(channelId);
        if (channel && channel.members) {
            if (service.isChannelMember(channel, memberId)) {
                return mmApi.deleteMemberFromChannel(channel.id, memberId)
                    .then(function(response) {
                        if (successResponse(response)) {
                            var index = $filter('getIndexByUserId')(channel.members,
                                memberId);
                            if (index !== null) channel.members.splice(index, 1);
                            channel.member_count--;
                            return true;
                        }
                        return false;
                    });
            }
        }
        return false;
    };

    service.addChannelMember = function(channelId, memberId) {
        var data = {
            user_id: memberId,
            channel_id: channelId
        };
        var channel = service.findChannelById(channelId);
        return mmApi.addMembertoChannel(channelId, data)
            .then(function(response) {
                channel.member_count++;
                channel.members.push(response.data);
                return true;
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                return false;
            });
    };

    service.goToTownSquare = function() {
        var channel = _.filter(service.publicChannels, isTownSquare);
        if (channel) service.setCurrentChannel(channel[0]);
    };

    service.removeChannelFromAvailableChannels = function(channel) {
        if (isPublicChannel(channel)) delete service.publicChannels[channel.id];
        if (isPrivateChannel(channel)) delete service.privateChannels[channel.id];
        if (isDirectChannel(channel)) delete service.directChannels[channel.id];
    };

    service.deleteChannel = function(channel) {
        return mmApi.deleteChannel(channel.id)
            .then(function(result) {
                if (__env.enableDebug) console.log(result);
                if (result.data) {
                    service.goToTownSquare('town-square');
                    service.removeChannelFromAvailableChannels(channel);
                    runEventCallbacks('channelRemoved');
                    return true;
                }
                return false;
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                return false;
            });
    };

    service.addChannelToFavorites = function(channel) {
        return dataFactory.createChatFavorite($rootScope.user.id, channel.id)
            .then(function(response) {
                if (response.data.success) {
                    var chatFavorite = response.data.success.data;
                    service.favorites.push(chatFavorite);
                    return chatFavorite;
                } else {
                    return null;
                }
            });
    };

    service.removeChannelFromFavorites = function(channel) {
        var chatFavoriteUuid = getFavoriteByChannelId(channel.id).chat_favorite_uuid;
        return dataFactory.deleteChatFavorite(chatFavoriteUuid).then(function(response) {
            if (response.data.success) {
                return usefulTools.remove(service.favorites,
                    'chat_favorite_uuid', chatFavoriteUuid);
            } else {
                return null;
            }
        });
    };

    service.sendPost = function(channel, message, opts) {
        var file_ids = service.extractFileIdsFromPostFiles();
        if (!opts) {
            opts = {};
        };
        if (opts.metaData) {
            message = addMetaData(message, opts.metaData);
        }
        var data = {
            channel_id: channel.id,
            message: message,
            root_id: opts.root_id ? opts.root_id : null,
            file_ids: file_ids
        };
        var postPlaceholder = service.constructPostPlaceholder(channel, message, opts);
        service.handleNewPost(postPlaceholder);
        service.ownPostsProcessing += 1;
        return mmApi.sendNewPost(data).then(function(response) {
            if (successResponse(response)) {
                var post = response.data;
                service.broadcastChatMessage(response.data);
                if (service.textIsGiphyInvocation(message)) {
                    service.postGiphy(post);
                }
                service.handleNewPost(post, {
                    placeholderId: postPlaceholder.id,
                    isOwnPost: true
                });
                return post;
            }
            service.ownPostsProcessing -= 1;
            return null;
        }, function(error) {
            service.ownPostsProcessing -= 1;
            return null;
        });
    };

    service.broadcastChatMessage = function(message) {
        var data = {
            message: message
        };
        if (_.every(Object.values(data), Boolean)) {
            dataFactory.broadcastChatMessage(data);
        }
    };

    service.extractFileIdsFromPostFiles = function() {
        if (service.postFiles && service.postFiles.length > 0) {
            var array = [];
            angular.forEach(service.postFiles, function(file) {
                array.push(file.id);
            });
            service.postFiles = [];
            return array;
        }
        return [];
    };

    service.sendPostWithFiles = function() {
        var file_ids = service.extractFileIdsFromPostFiles();
        service.sendPost(service.currentChannel, service.currentMessageToSend, file_ids);
    };

    // UTILITY FUNCTIONS

    service.getDMChannelByUserId = function(userId) {
        var dmChannels = usefulTools.convertObjectToArray(service.directChannels);
        var channelMatchesUserId = function(channel) {
            return channel.partner_id === userId;
        };
        return _.find(dmChannels, channelMatchesUserId);
    };

    service.currentChannel = function() {
        return service.publicData.currentChannel;
    };

    service.userOwnsPost = function(post) {
        if (post) {
            return post.user_id === service.userProfile.id;
        }
        return null;
    };

    service.isThreadPost = function(post) {
        if (post) {
            return post.root_id;
        }
        return null;
    };

    service.constructPostPlaceholder = function(channel, message, opts) {
        if (!opts) {
            opts = {};
        };
        var count = service.postPlaceholderCount += 1;
        var date = Date.now();
        return {
            channel_id: channel.id,
            create_at: date,
            delete_at: 0,
            edit_at: 0,
            hashtags: '',
            id: 'placeholder-' + count,
            is_pinned: false,
            message: message,
            original_id: '',
            parent_id: '',
            pending_post_id: '',
            props: {},
            root_id: opts.root_id ? opts.root_id : null,
            type: '',
            update_at: date,
            user_id: service.userProfile.id
        };
    };

    service.postCallsOutCurrentUser = function(post) {
        var searchText = '@' + service.userProfile.username;
        var message = post.message;
        var publicChannels = service.publicChannels;
        var privateChannels = service.privateChannels;
        var channels = usefulTools.convertObjectToArray(publicChannels);
        var matches = [
            searchText = '@' + service.userProfile.username,
            '@channel',
            '@here',
            '@everyone'
        ];
        _.forEach(channels, function(channel) {
            matches.push('#' + channel.name);
        });
        var match;
        for (var i = 0; i < matches.length; i++) {
            match = matches[i];
            if (message.indexOf(match) > -1) {
                return true;
            }
        }
        return false;
    };

    service.findChannelById = function(channelId) {
        var publicChannel = service.publicChannels[channelId];
        if (publicChannel) {
            return publicChannel;
        };
        var directChannel = service.directChannels[channelId];
        if (directChannel) {
            return directChannel;
        };
        var privateChannel = service.privateChannels[channelId];
        if (privateChannel) {
            return privateChannel;
        };
        return null;
    };

    function removeLastPost(postInfo) {
        var order = postInfo.order;
        var posts = postInfo.posts;
        var post;
        for (var i = 0; i < order.length; i++) {
            post = posts[order[i]];
            if (!postHasThreadChildren(post)) {
                var oldPostOrder = order[i];
                if (oldPostOrder) {
                    delete postInfo.posts[oldPostOrder];
                    return order.splice(i, 1);
                }
            }
        };
        return null;
    };

    function postHasThreadChildren(post) {
        var otherPost;
        var channel = service.findChannelById(post.channel_id);
        var posts = getChannelPostsAsArray(channel);
        if (posts) {
            for (var i = 0; i < posts.length; i++) {
                otherPost = posts[i];
                if (otherPost.root_id === post.id) {
                    return true;
                }
            }
        }
        return false;
    };

    function getChannelPostsAsArray(channel) {
        var posts = channel.postInfo.posts;
        if (posts) {
            return usefulTools.convertObjectToArray(channel.postInfo.posts);
        }
        return null;
    };

    service.handleNewPost = function(post, opts) {
        if (!opts) {
            opts = {};
        }
        var channel = service.findChannelById(post.channel_id);
        if (channel && channel.postInfo) {
            var order = post.id;
            var postInfo = channel.postInfo;
            if (!postInfo.posts || (postInfo.posts && !postInfo.posts[post.id])) {
                if (!postInfo.posts) postInfo.posts = {};
                postInfo.posts[post.id] = post;
                if (opts.placeholderId) {
                    var placeholderIndex = _.indexOf(postInfo.order, opts.placeholderId);
                    postInfo.order[placeholderIndex] = order;
                    postInfo.order.splice(placeholderIndex, 1, post.id);
                    delete postInfo.posts[opts.placeholderId];
                } else {
                    if (postInfo.order.length > 19) {
                        var oldPostOrder = postInfo.order.shift();
                        if (oldPostOrder) {
                            // TODO: Hang on to post if it has any thread-children
                            if (post.root_id !== oldPostOrder) {
                                delete postInfo.posts[oldPostOrder];
                            }
                        }

                        // removeLastPost(postInfo);
                    }
                    postInfo.order.push(order);
                    channel.total_msg_count += 1;

                    newmsgnotification(service.totalMentionCount());

                    if (channelIsCurrentChannel(channel) && $location.$$url ==
                        '/chatplus') {
                        channel.msg_count += 1;
                    } else {
                        var calledOut = service.postCallsOutCurrentUser(post);
                        var isDirectMessage = channel.type === 'D';
                        if (calledOut || isDirectMessage) {
                            channel.mention_count += 1;
                        }
                    }
                }
                var postProcessor = service.processPostConstructor(postInfo);
                postProcessor(post.id);
            }
            if (post.root_id) {
                handleThreadedPost(post, channel, opts);
            }
        }
        if (channel) {
            if (shouldDisplayNotification(post)) {
                post['userProfileId'] = service.userProfile.id;
                service.lastNotifiedChannel = post.channel_id;
                notificationService.chatNotification(post, notificationCallback);
            }
        }
        if (opts.isOwnPost) {
            service.ownPostsProcessing -= 1;
            if (service.ownPostsProcessing === 0) {
                _.forEach(service.postHandlingQueue, service.handleNewPost);
                service.postHandlingQueue = [];
            }
        }
    };

    function notificationCallback(channelId) {
        $location.path('/chatplus');
        var channel = service.findChannelById(channelId);
        if (channel) {
            service.setCurrentChannel(channel);
        }
    }

    function newmsgnotification(unreadCount) {

        if (document.hidden) {
            var original = "Bridge";

            var newtitle = original + " (" + (unreadCount + 1) + ")";

            document.title = newtitle;

            window.onfocus = function() {
                document.title = original;
            }

        } else {
            var original = "Bridge";
            document.title = original;
        }


    }

    service.processPostConstructor = function(postInfo, opts) {
        if (!opts) {
            opts = {};
        };
        return function(order) {
            var post = postInfo.posts[order];
            if (post.isConsecutive === null || post.isConsecutive === undefined) {
                if (!opts.search) post.isConsecutive = !!isConsecutivePost(post);
                if (opts.search) post.isConsecutive = !!isConsecutiveSearchPost(
                    post);
            }
            if (service.isQuoteLink(post.message)) {
                post.metaData = service.getMetaData(post.message);
                post.message = service.withoutMetaData(post.message);
            }
            if (opts.handleThreaded && post.root_id) {
                handleThreadedPost(post);
            }
            if (!postInfo.count) {
                postInfo.count = 0;
            }
            postInfo.count++;
            service.getPostFileInfo(post);
        };
    };

    service.postGiphy = function(post) {
        var searchText = service.getGiphySearchTextFromMessage(post.message);
        service.getGiphyUrlByText(searchText).then(function(response) {
            if (response) {
                var channel = service.findChannelById(post.channel_id);
                service.sendPost(channel, response);
            }
        });
    };

    service.isGiphyLink = function(text) {
        return !!text.match(/(https:\/\/).+(.giphy.com).+(.gif)/);
    };

    service.isQuoteLink = function(text) {
        if (_.isString(text) && hasMetaData(text)) {
            var metaData = getMetaData(text);
            return Boolean(metaData.quoteLink);
        }
        return null;
    };

    service.withoutMetaData = function(text) {
        return getTextWithoutMetaData(text);
    };

    function hasMetaData(text) {
        return text.indexOf('[BEGINMETADATA]') > -1 && text.indexOf('[ENDMETADATA]') > -1;
    };

    function getMetaDataIndices(text) {
        var beginMarker = '[BEGINMETADATA]';
        var endMarker = '[ENDMETADATA]';
        var startIndex = text.indexOf(beginMarker) + beginMarker.length;
        var endIndex = text.indexOf(endMarker);
        return [startIndex, endIndex];
    };

    function getTextWithoutMetaData(text) {
        var beginMarker = '[BEGINMETADATA]';
        var endMarker = '[ENDMETADATA]';
        var startIndex = text.indexOf(beginMarker);
        var endIndex = text.indexOf(endMarker) + endMarker.length;
        return text.slice(0, startIndex) + text.slice(endIndex, text.length);
    };

    function getMetaData(text) {
        var metaDataIndices = getMetaDataIndices(text);
        var startIndex = metaDataIndices[0];
        var endIndex = metaDataIndices[1];
        var jsonString = text.slice(startIndex, endIndex);
        return JSON.parse(jsonString);
    }

    function addMetaData(text, data) {
        return text + '[BEGINMETADATA]' + JSON.stringify(data) + '[ENDMETADATA]';
    }

    service.getMetaData = getMetaData;

    service.textIsGiphyInvocation = function(text) {
        var firstSegment = text.split(' ')[0];
        return firstSegment === 'gif:' || firstSegment === '/gif';
    };

    service.getGiphyUrlByText = function(text) {
        return dataFactory.getGiphyGifByText(text).then(function(response) {
            if (response.data.text !==
                'Missing necessary token in the post data') {
                var url = response.data.text.split('\n')[1].replace(/\s/g, '');
                return url;
            } else {
                return undefined;
            }
        });
    };

    service.getGiphySearchTextFromMessage = function(message) {
        var splits = message.split(' ');
        splits.shift();
        return splits.join(' ');
    };

    service.getPostFileInfo = function(post) {
        post.fileinfoposts = null;
        post.fileinfo = null;
        if (post.file_ids && post.file_ids.length > 0) {
            mmApi.getFileInfoPosts(post.id)
                .then(function(response) {
                    if (successResponse(response)) {
                        post.fileinfoposts = response.data;
                        angular.forEach(post.fileinfoposts, function(file) {
                            mmApi.getPublicLink(file.id)
                                .then(function(response2) {
                                    file.link = response2.data.link;
                                    file.obj = {
                                        obj: file.link
                                    };
                                });
                        });

                    }
                });
            post.fileinfo = [];
        }
    };

    service.showFilesDisplayForPost = function(post) {
        if (post) {
            return post.fileinfoposts && post.fileinfoposts.length > 0;
        }
        return false;
    };

    service.processDirectChannel = function(directChannel) {
        var getOtherUserFromDirect = function(directChannel) {
            var underscoreRgxp = new RegExp('_', 'g');
            var userIdRgxp = new RegExp(service.userProfile.id, 'g');
            var otherUserId = directChannel.name.replace(underscoreRgxp, '').replace(
                userIdRgxp, '');
            return service.teamMembers[otherUserId];
        };
        var otherUser = getOtherUserFromDirect(directChannel);
        if (otherUser) {
            directChannel.display_name = otherUser.first_name + ' ' + otherUser.last_name;
            directChannel.partner_id = otherUser.id;
        };
    };

    service.registerChatEventCallback = function(eventName, fn) {
        var event = service.serviceEvents[eventName];
        if (event.occurred > 0) {
            fn();
        } else {
            event.callbacks.push(fn);
        }
    };

    service.lastChannelId = function() {
        var isLastChannelPreference = function(pref) {
            return pref.category === 'last' && pref.name === 'channel';
        };
        var preference = _.find(service.userProfile.preferences,
            isLastChannelPreference);
        return preference ? preference.value : null;
    };

    service.isFavoriteChannel = function(channel) {
        if (channel) return !!usefulTools.find(service.favorites, 'channel_id', channel
            .id);
        return false;
    };

    service.goToCurrentChannel = function() {
        service.setCurrentChannel(service.publicData.currentChannel, true);
    };

    service.setCurrentChannel = function(channel, force) {
        channel.searchInfo = null;
        if (!force && channel === service.publicData.currentChannel) {
            return;
        }
        service.updateCurrentChannelWithDb(channel);
        var firstPostLoad = !channel.postInfo;
        var data = {};
        if (!firstPostLoad) {
            var posts = channel.postInfo.posts;
            var order = channel.postInfo.order;
            var lastPost = posts[order[order.length - 1]];
            var needsReload = channel.postInfo.order && channel.postInfo.order.length <
                20;
            if (needsReload) {
                channel.postInfo = {};
                data.needsReload = true;
            } else if (lastPost) {
                data.after = lastPost.id;
            }
        }
        data.firstPostLoad = firstPostLoad;
        service.publicData.currentChannel = channel;
        $cookies.put(service.userProfile.id + 'currentChannel', channel.id);
        service.getChannelPosts(channel, data);
    };

    service.isFirstDayPost = function(post) {
        var previousPost = getPreviousPost(post);
        if (previousPost) {
            var prevDate = moment(previousPost.create_at).startOf('day');
            var postDate = moment(post.create_at).startOf('day');
            return postDate.isAfter(prevDate);
        }
        return null;
    };

    service.hideDirectMessage = function(channelId) {
        var channel = service.findChannelById(channelId);
        if (channel) {
            service.updateUserPreference('direct_channel_show', channel.partner_id,
                'false');
            channel.showDirect = false;
            if (service.publicData.currentChannel.id === channel.id) {
                service.goToTownSquare('town-square');
            }
        }
    };

    service.updateUserPreference = function(category, name, value) {
        var array = [];
        var newpref = {
            "user_id": service.userProfile.id,
            "category": category,
            "name": name,
            "value": value
        };
        array.push(newpref);
        mmApi.setUserPreferences(array, service.userProfile.id)
            .then(function(response) {
                service.getUserPreferences();
            });
    };

    service.createChannel = function(channel) {
        var slug = Slug.slugify(channel.display_name);
        var channelSlug = slug;
        var go = true;
        var inc = 1;
        var newchannel = {};
        newchannel = {
            "team_id": service.userProfile.team.id,
            "name": channelSlug,
            "display_name": channel.display_name,
            "purpose": channel.purpose,
            "header": channel.header,
            "type": channel.channel_type,
            "channelmember": channel.channelmember
        };
        if (__env.enableDebug) console.log(newchannel);
        return service.doCreateChannel(newchannel, inc);
    };

    service.addNewChannelInfo = function(channelId) {
        return mmApi.getChannel(channelId)
            .then(function(response) {
                if (successResponse(response)) {
                    var channel = service.appendChannelToAvailable(response.data);
                    return service.processChannel(channel);
                }
                return null;
            });
    };

    service.changeMemberRole = function(memberId, channelId, role) {
        var channel = service.findChannelById(channelId);
        if (channel) {
            var data = {
                roles: role
            };
            return mmApi.updateChannelRoles(channelId, memberId, data)
                .then(function(response) {
                    if (successResponse(response)) {
                        var i = 0;
                        for (i; i < channel.members.length; i++) {
                            if (channel.members[i].user_id === memberId) {
                                channel.members[i].roles = role;
                                var data = {
                                    channelId: channelId,
                                    memberId: memberId,
                                    role: role,
                                    noticeType: 'new_role',
                                    members: channel.members
                                };
                                dataFactory.postSendChatNotice(data);
                                break;
                            }
                        }
                        return true;
                    }
                    return null;
                });
        }
        return false;
    };

    service.isChannelAdmin = function(channelId, memberId) {
        var channel = service.findChannelById(channelId);
        if (channel && service.joiningChannel !== channelId) {
            var i = 0;
            for (i; i < channel.members.length; i++) {
                if (channel.members[i].user_id === memberId &&
                    channel.members[i].roles.indexOf('channel_admin') !== -1) return true;
            }
        }
        return false;
    };

    service.doCreateChannel = function(newchannel, inc) {
        return mmApi.createNewChannel(newchannel)
            .then(function(result) {
                if (__env.enableDebug) console.log("NEWCHANNEL");
                if (__env.enableDebug) console.log(result.data);

                return mmApi.getChannel(result.data.id)
                    .then(function(response) {
                        var channel = result.data;
                        if (isPrivateChannel(channel)) service.privateChannels[
                            channel.id] = channel;
                        if (isPublicChannel(channel)) service.publicChannels[
                            channel.id] = channel;
                        return mmApi.getChannelMember(channel.id, service.userProfile
                                .id)
                            .then(function(member) {
                                channel.mention_count = member.data.mention_count;
                                channel.last_viewed_at = member.data.last_viewed_at;
                                channel.roles = member.data.roles;
                                channel.msg_count = member.data.msg_count;
                                channel.postInfo = {
                                    posts: {},
                                    order: []
                                };
                                var users = [];
                                if (channel.roles.indexOf('channel_admin') !==
                                    -1) channel.isAdmin = true;
                                //if (channel.type === 'P') {
                                angular.forEach(newchannel.channelmember,
                                    function(key, member_id) {
                                        if (key && member_id !==
                                            service.userProfile.id) {
                                            service.addChannelMember(
                                                channel.id,
                                                member_id);
                                        }
                                    });
                                //}
                                var data = {
                                    users: users ? users : null,
                                    channelId: channel.id,
                                    noticeType: 'new_channel_domain',
                                    type: channel.type,
                                    sender: service.userProfile.id
                                };
                                dataFactory.postSendChatNotice(data);
                                return mmApi.getChannelStats(result.data.id)
                                    .then(function(response3) {
                                        if (__env.enableDebug) console.log(
                                            response3.data);
                                        $rootScope.alerts.push({
                                            success: true,
                                            message: result.data
                                                .display_name +
                                                ' was created successfully.'
                                        });
                                        channel.member_count =
                                            response3.data.member_count;
                                        service.appendChannelToAvailable(
                                            channel);
                                        service.processChannel(channel)
                                            .then(function(response) {
                                                $timeout(function() {
                                                    runEventCallbacks
                                                        (
                                                            'channelAdded'
                                                        );
                                                    service
                                                        .setCurrentChannel(
                                                            channel
                                                        );
                                                    service
                                                        .restartWebsocket();
                                                });
                                            });
                                        return true;
                                    });
                            });
                    });
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                if (error.data.status_code >= 400 && (error.data.message ==
                        "A channel with that URL was previously created" || error.data
                        .message == 'A channel with that URL already exists')) {
                    var channelSlug = Slug.slugify(newchannel.display_name) + '-' +
                        inc.toString();
                    inc++;
                    newchannel.name = channelSlug;
                    service.doCreateChannel(newchannel, inc);
                } else {
                    return null;
                }
                return null;
            });
    };

    service.appendChannelToAvailable = function(channel) {
        var option;
        if (isPrivateChannel(channel)) option = service.privateChannels;
        if (isPublicChannel(channel)) option = service.publicChannels;
        if (isDirectChannel(channel)) option = service.directChannels;
        option[channel.id] = channel;
        service.processMemberData(option[channel.id]);
        return channel;
    };

    service.hasValidChatToken = function() {
        if ($cookies.get('accessToken')) {
            return true;
        }
        return false;
    };

    service.getPreviousPost = function(post) {
        return getPreviousPost(post);
    };

    service.getNextPost = function(post) {
        return getNextPost(post);
    };

    service.channelIsCurrentChannel = function(channel) {
        channelIsCurrentChannel(channel);
    };

    service.showMemberPhoto = function(contact, size) {
        var status = 'Offline';
        var statusClass = statusService.getStatusIcon(status);
        var statusBox = '<span class="status-box"><i class="' + statusClass +
            '" style="font-size: 18px;"></i></span>';
        if (contact) {
            status = contact.status;
            statusClass = statusService.getStatusIcon(status);
            statusBox = '<span class="status-box"><i class="' + statusClass +
                '" style="font-size: 18px;"></i></span>';
            if (contact.im && contact.im !== '') {
                return $sce.trustAsHtml('<img src="' + $rootScope.pathImgProfile + contact.im + '" class="chat-profile-image' + size + '">' + statusBox);
            }
            return $sce.trustAsHtml('<label class="chat-profile-image-null' + size +
                '" style="background-color: ' + (contact && contact.color ?
                    contact.color : "") + '">' + (contact.init ? contact.init : '<i class="fa fa-user"></i>') + '</label>' + statusBox);
        }
        return $sce.trustAsHtml('<label class="chat-profile-image-null' + size +
            '"><i class="fa fa-user"></i></label>' + statusBox);

    };

    /**  SEARCH METHODS  */
    service.doChatSearch = function(searchText) {
        var data = {
            terms: searchText,
            is_or_search: false
        };
        return mmApi.postChatSearch(data)
            .then(function(response) {
                if (successResponse(response)) {
                    var results = {};
                    angular.forEach(response.data.order, function(item) {
                        response.data.posts[item].channel = service.findChannelById(
                            response.data.posts[item].channel_id);
                        /*if (isDirectChannel(channel)) {
                            var members = $filter('splittoarray')(channel.name, '__');
                            angular.forEach(members, function(member){
                                if (!$rootScope.teamUsers[member]) {
                                    $rootScope.chatSearchResultsOrder.splice(index,1);
                                }
                            });
                        }
                        index++;*/
                    });
                    results.order = response.data.order;
                    results.posts = response.data.posts;
                    return results;
                }
                return {};
            });
    };


    service.getChannelPosts = function(channel, opts) {
        var data = {
            channelId: channel.id,
            page: opts.page ? opts.page : 0,
            limit: opts.limit ? opts.limit : 20
        };
        if (opts.after) {
            data.after = opts.after;
        };
        if (opts.before) {
            data.before = opts.before;
        };
        return mmApi.getChannelPosts(data).then(function(response) {
            if (successResponse(response)) {
                var chatInfo = response.data;
                chatInfo.order = chatInfo.order.reverse();
                if (opts.firstPostLoad || opts.needsReload) {
                    channel.postInfo = {};
                } else {
                    chatInfo.order = _.uniq(chatInfo.order.concat(channel.postInfo
                        .order));
                    chatInfo.posts = _.merge(chatInfo.posts, channel.postInfo.posts);
                }
                angular.copy(chatInfo, channel.postInfo);
                var processOpts = {
                    handleThreaded: true
                };
                _.forEach(channel.postInfo.order, service.processPostConstructor(
                    channel.postInfo,
                    processOpts));
                return channel;
            }
            return null;
        });
    };

    service.getSearchPosts = function(post, opts) {
        var data = {
            channelId: post.channel_id,
            page: 0,
            limit: 25
        };
        if (opts.after) {
            data.after = opts.after;
        };
        if (opts.before) {
            data.before = opts.before;
        };
        return mmApi.getChannelPosts(data).then(function(response) {
            if (successResponse(response)) {
                return response.data;
            }
            return null;
        });
    };

    service.getSearchResults = function(post) {
        //look if result is in post cache and render if so ...
        var channel = service.findChannelById(post.channel_id);
        channel.searchInfo = {};
        var temp;
        angular.copy(channel, temp);
        var opts = {
            limit: 25,
            before: post.id
        };
        return service.getSearchPosts(post, opts)
            .then(function(response) {
                response.order = response.order.reverse();
                response.order.push(post.id);
                response.posts[post.id] = post;
                opts.after = post.id;
                opts.before = null;
                return service.getSearchPosts(post, opts)
                    .then(function(response2) {
                        response2.order = response2.order.reverse();
                        channel.searchInfo = {};
                        channel.searchInfo.order = response.order.concat(
                            response2.order);
                        channel.searchInfo.posts = _.merge(response.posts,
                            response2.posts);
                        var processOpts = {
                            handleThreaded: false,
                            search: true
                        };
                        _.forEach(channel.searchInfo.order, service.processPostConstructor(
                            channel.searchInfo, processOpts
                        ));
                        return channel;
                    });

            });
    };

    service.goToSearchResult = function(post) {
        return service.getSearchResults(post)
            .then(function(response) {
                $cookies.put('currentChannel', response.id);
                service.publicData.currentChannel = response;
            });
    };

    service.saveCopiedPosts = function(selected) {
        var array = [];

        angular.forEach(selected, function(value, key) {
            console.log(key);
            var p = service.publicData.currentChannel.postInfo.posts[key];

            var member = service.teamMembers[p.user_id];
            if (member) p.name = member.first_name + ' ' + member.last_name;
            p.created = $filter('date')(new Date(p.create_at),
                'yyyy-MM-dd HH:mm:ss');
            
            var channel = service.publicData.currentChannel;
            p.channel_name = channel.display_name;
            if (isDirectChannel(channel)) {
                var members = channel.name.split('__');
                angular.forEach(members, function(member) {
                    if (member !== service.userProfile.id) {
                        var partner = service.teamMembers[member];
                        p.memberstring = partner.first_name + ' ' +
                            partner.last_name;
                    }
                    p.channel_name = 'Direct Message: ' + p.memberstring;
                });
            }
            array.push(p);
        });
        var data = {
            messages: array,
            channel_name: service.publicData.currentChannel.display_name,
            domain_uuid: $rootScope.user.domain_uuid,
            user_uuid: $rootScope.user.id,
            customerList: [],
            type: 'chat',
            title: 'Activity Action',
        };
        var partner = $rootScope.user.exportType.partner_code;
        if (partner === "ams360") {
            $rootScope.showModalFull('/modals/ams360ActivityModal.html', data, '');
        } else if (partner === "qqcatalyst") {
            $rootScope.showModalFull('/modals/qqTaskModal.html', data, '');
        } else {
            integrationService.copyEntityToPartner(data);
        }
    };

    service.getKeyReverseIndex = function(value, key) {
        var reversed = value.split('').reverse();
        var keyIndex = reversed.indexOf(key);
        return keyIndex;
    };

    service.selectCurrentSelection = function(scope, inputElement, index) {
        if (scope.showPeopleList) {
            if (!index) {
                index = scope.peopleListData.selectedIndex;
            };

            angular.forEach(scope.peopleListData.people, function(people) {
                if (people.first_name == 'Kotter' && people.last_name == 'Tech') {
                    var index2 = $filter('getIndexById')(scope.peopleListData.people,
                        people.id);
                    if (index2 !== null) {
                        scope.peopleListData.people.splice(index2, 1);
                    }
                }
            });

            var username = scope.peopleListData.people[index].username;
            var value = inputElement.value;
            var keyIndex = service.getKeyReverseIndex(value, '@');
            var reversed = value.split('').reverse();
            var newVal = reversed.slice(keyIndex, reversed.length).reverse().join('') +
                username + ' ';
            inputElement.value = newVal;
            scope.showPeopleList = false;
            scope.peopleListData.selectedIndex = 0;
        } else if (scope.showChannelList) {
            if (!index) {
                index = scope.channelListData.selectedIndex;
            };
            var displayName = scope.channelListData.channels[index].name;
            var value = inputElement.value;
            var keyIndex = service.getKeyReverseIndex(value, '#');
            var reversed = value.split('').reverse();
            var newVal = reversed.slice(keyIndex, reversed.length).reverse().join('') +
                displayName + ' ';
            inputElement.value = newVal;
            scope.showPeopleList = false;
            scope.showChannelList = false;
            scope.channelListData.selectedIndex = 0;
        }
    };

    service.findSearchTermFromElementByKey = function(element, key) {
        var value = element.value;
        var reversed = value.split('').reverse();
        var keyIndex = service.getKeyReverseIndex(value, key);
        var searchTerm = reversed.slice(0, keyIndex).reverse().join().replace(/,/g, '');
        return searchTerm;
    };

    service.getPeopleForList = function() {
        var extraOptions = [{
            'username': 'channel',
            'id': '@channel',
            'first_name': 'Notify everyone in this channel'
        }];
        var notCurrentUser = function(user) {
            return user.id !== service.userProfile.id;
        };
        var options = usefulTools.convertObjectToArray(service.teamMembers);
        options = options.filter(notCurrentUser);
        options = options.concat(extraOptions);
        return options;
    };

    service.handlePaste = function(e, uploader) {
        var item;
        var blob;
        var date;
        var ext;
        var file;
        if (e.clipboardData && e.clipboardData.items) {
            for (var i = 0; i < e.clipboardData.items.length; i++) {
                item = e.clipboardData.items[i];
                if (item.getAsFile()) {
                    blob = item.getAsFile();
                    date = moment().format('YYYY-M-D H-m');
                    ext = fileService.getFileTypeByMimeType(blob.type);
                    file = new File([blob], "Image Pasted at " + date + "." + ext, {
                        type: blob.type
                    });
                    uploader.addToQueue(file);
                }
            }
        }
    };

    service.handleSendPost = function(inputElement, channel, opts) {
        if (!opts) {
            opts = {};
        };
        if (opts.uploader && opts.uploader.queue.length > 0) {
            opts.uploader.uploadAll();
            return;
        }
        var value = inputElement.value.trim();
        if (!value && service.postFiles.length > 0) {
            value = inputElement.value = 'file: ';
        }
        if (value) {
            service.sendPost(channel, value, opts);
        }
        inputElement.value = '';
        var parentId = opts.root_id ? opts.root_id : channel.id;
        service.setInProgress(parentId, '');
    };

    // PRIVATE FUNCTIONS

    function handleThreadedPost(post, channel, opts) {
        if (!channel) {
            channel = service.findChannelById(post.channel_id);
        };
        if (!opts) {
            opts = {};
        };
        var order = post.id;
        if (!channel.postInfo) return;
        var rootPost = channel.postInfo.posts[post.root_id];
        if (!rootPost.postInfo) {
            rootPost.postInfo = {
                order: [],
                posts: {}
            };
        };
        if (!rootPost.postInfo.posts[post.id]) {
            rootPost.postInfo.posts[post.id] = post;
            if (opts.placeholderId) {
                var placeholderIndex = _.indexOf(rootPost.postInfo.order, opts.placeholderId);
                rootPost.postInfo.order[placeholderIndex] = order;
                rootPost.postInfo.order.splice(placeholderIndex, 1, post.id);
                delete rootPost.postInfo.posts[opts.placeholderId];
            } else {
                rootPost.postInfo.order.push(order);
            }
        }
        var consecutiveOpts = {
            postInfo: rootPost.postInfo,
            isThreaded: true
        };
        post.isThreadedConsecutive = isConsecutivePost(post, consecutiveOpts);
    };

    function getChannelListById(channelId) {
        var channel = service.findChannelById(channelId);
        var option;
        if (isPrivateChannel(channel)) option = service.privateChannels;
        if (isPublicChannel(channel)) option = service.publicChannels;
        if (isDirectChannel(channel)) option = service.directChannels;
        return option;
    }

    service.updateCurrentChannelWithDb = function(channel) {
        var data = {
            channel_id: channel.id,
            prev_channel_id: service.publicData.currentChannel.id
        };
        var prevMentionCount = channel.mention_count; // faster update than waiting for response
        var prevMsgCount = channel.msg_count;
        channel.mention_count = 0;
        channel.msg_count = channel.total_msg_count;
        mmApi.postChannelView(service.userProfile.id, data).then(function(response) {
            if (!successResponse(response)) {
                channel.mention_count = prevMentionCount;
                channel.msg_count = prevMsgCount;
            }
        });
    };

    function shouldDisplayNotification(post) {
        if (post.user_id !== service.userProfile.id) {
            var channel = service.findChannelById(post.channel_id);
            if (!metaService.tabIsActive() || !channelIsCurrentChannel(channel) ||
                $location.path().substring(0, 9) !== "/chatplus") {
                var calledOut = service.postCallsOutCurrentUser(post);
                var isDirectMessage = channel.type === 'D';
                if (calledOut || isDirectMessage) {
                    return true;
                }
            }
        }
        return false;
    };

    function channelIsCurrentChannel(channel) {
        return channel === service.publicData.currentChannel;
    };

    function getCurrentChannelFromCookies() {
        var channelId = $cookies.get(service.userProfile.id + 'currentChannel');
        var channel = service.findChannelById(channelId);
        if (!channel) {
            channel = service.publicChannels[Object.keys(service.publicChannels)[0]];
        }
        return channel;
    };

    function isTownSquare(channel) {
        return channel.name === 'town-square';
    }

    function defaultFailureHandler(error) {
        console.log(error);
        return null;
    };

    function isConsecutivePost(post, opts) {
        var prevPost = getPreviousPost(post, opts);
        return prevPost ? prevPost.user_id === post.user_id : null;
    };

    function isConsecutiveSearchPost(post, opts) {
        var prevPost = getPreviousSearchPost(post, opts);
        return prevPost ? prevPost.user_id === post.user_id : null;
    };

    function getPreviousSearchPost(post, opts) {
        if (!opts) {
            opts = {};
        };
        var searchInfo;
        var channel = service.findChannelById(post.channel_id);
        if (!opts.searchInfo) {
            searchInfo = channel.searchInfo;
        } else {
            searchInfo = opts.searchInfo;
        }
        var order = searchInfo.order;
        var posts = searchInfo.posts;
        var isMatchingOrder = function(order) {
            return order === post.id;
        };
        var postIndex = _.findIndex(order, isMatchingOrder);
        if (opts.isThreaded && postIndex === 0) {
            return channel.searchInfo.posts[post.root_id];
        } else if (postIndex > -1) {
            return posts[order[postIndex - 1]];
        }
        return null;
    };

    function getPreviousPost(post, opts) {
        if (!opts) {
            opts = {};
        };
        var channel = service.findChannelById(post.channel_id);
        var postInfo = opts.postInfo ? opts.postInfo : channel.postInfo;
        if (!postInfo) {
            return null;
        };
        var order = postInfo.order;
        var posts = postInfo.posts;
        var isMatchingOrder = function(order) {
            return order === post.id;
        };
        var postIndex = _.findIndex(order, isMatchingOrder);
        if (opts.isThreaded && postIndex === 0) {
            return channel.postInfo.posts[post.root_id];
        } else if (postIndex > -1) {
            return posts[order[postIndex - 1]];
        }
        return null;
    };

    function getNextPost(post, opts) {
        if (!opts) {
            opts = {};
        };
        var channel = service.findChannelById(post.channel_id);
        var postInfo = opts.postInfo ? opts.postInfo : channel.postInfo;
        var order = postInfo.order;
        var posts = postInfo.posts;
        var isMatchingOrder = function(order) {
            return order === post.id;
        };
        var postIndex = _.findIndex(order, isMatchingOrder);
        if (postIndex > -1) {
            return posts[order[postIndex + 1]];
        }
        return null;
    };

    function isPrivateChannel(channel) {
        return channel.type === 'P';
    }

    function isPublicChannel(channel) {
        return channel.type === 'O';
    }

    function isDirectChannel(channel) {
        return channel.type === 'D';
    }

    function successResponse(response) {
        var status = response.status;
        return response && (status === 200 || status === 201);
    };

    function runEventCallbacks(eventName) {
        var event = service.serviceEvents[eventName];
        event.occurred += 1;
        var callbacks = event.callbacks;
        metaService.performCallbackCollection(callbacks);
    };

    function getFavoriteByChannelId(channelId) {
        return usefulTools.find(service.favorites, 'channel_id', channelId);
    };

    service.clearInfo = function() {
        service.userProfile = {};
        service.teamMembers = {};
        service.availableChannels = {};
        service.privateChannels = {};
        service.publicChannels = {};
        service.directChannels = {};
        service.publicData = {
            currentChannel: {}
        };
        $cookies.remove('accessToken');
    };

    service.registerCallbacks = function() {
        // INTERNAL EVENT CALLBACKS
        service.registerChatEventCallback('chatInitialized', function() {
            service.getAvailableChannels();
            service.setCurrentChannel(getCurrentChannelFromCookies());
        });

        // WEBSOCKET EVENT CALLBACKS
        service.onPosted = function(post) {
            if (service.joiningChannel !== post.channel_id) {
                var channel = service.findChannelById(post.channel_id);
                if (channel) {
                    if (!channel.postInfo) {
                        channel.postInfo = {
                            order: [],
                            posts: {}
                        };
                    }
                    if (channel.type === 'D' && !channel.showDirect) {
                        service.updateUserPreference('direct_channel_show', channel
                            .partner_id, 'true');
                        channel.showDirect = true;
                    }

                    if (channel.postInfo && !channel.postInfo.posts[post.id]) {
                        if (post.user_id === service.userProfile.id && service.ownPostsProcessing) {
                            service.postHandlingQueue.push(post);
                        } else {
                            service.handleNewPost(post);
                        }
                    }
                }
            }
        };

        chatMessages.registerEventHandler('posted', function(broadcast, data) {
            var post = JSON.parse(data.post);
            service.onPosted(post);
        });

        chatMessages.registerEventHandler('user_added', function(broadcast, data) {
            var info;
            if (broadcast.user_id) //removing non owner
                info = {
                    userId: broadcast.user_id,
                    channelId: data.channel_id,
                    removerId: data.remover_id
                };
            if (broadcast.channel_id) //coming to owner
                info = {
                    userId: data.user_id,
                    channelId: data.channel_id,
                    removerId: data.remover_id
                };
            service.handleUserAdded(broadcast.channel_id);
        });

        chatMessages.registerEventHandler('user_removed', function(broadcast, data) {
            var info;
            if (broadcast.user_id) //removing non owner
                info = {
                    userId: broadcast.user_id,
                    channelId: data.channel_id,
                    removerId: data.remover_id
                };
            if (broadcast.channel_id) //coming to owner
                info = {
                    userId: data.user_id,
                    channelId: data.channel_id,
                    removerId: data.remover_id
                };
            if (data.remover_id !== service.userProfile.id) service.handleUserRemoved(
                info);
        });

        chatMessages.registerEventHandler('new_user', function(broadcast, data) {
            service.addUserToTeam(data.user_id);
        });

        chatMessages.registerEventHandler('user_updated', function(broadcast, data) {
            service.handleTeamMemberUpdate(data.user);
        });

        chatMessages.registerEventHandler('channel_deleted', function(broadcast, data) {
            service.handleChannelDeleted(data.channel_id);
        });

        chatMessages.registerEventHandler('channel_updated', function(broadcast, data) {
            var newchannel = JSON.parse(data.channel);
            service.handleChannelUpdated(newchannel);
        });

        chatMessages.registerEventHandler('channel_viewed', function(broadcast, data) {
            if (service.joiningChannel !== data.channel_id) service.handleChannelViewed(
                data.channel_id);
        });

        chatMessages.registerEventHandler('preferences_changed', function(broadcast,
            data) {
            //service.handleNewDirectChannelNotice(data.teammate_id, broadcast.channel_id);
        });

        chatMessages.registerEventHandler('direct_added', function(broadcast, data) {
            service.handleNewDirectChannelNotice(data.teammate_id, broadcast.channel_id);
        });

        chatMessages.registerEventHandler('post_deleted', function(broadcast, data) {
            var post = JSON.parse(data.post);
            service.handleDeletedPost(post, broadcast.channel_id);
        });

        chatMessages.registerEventHandler('post_edited', function(broadcast, data) {
            var post = JSON.parse(data.post);
            service.handleEditedPost(post, broadcast.channel_id);
        });
    };

    return service;
});
