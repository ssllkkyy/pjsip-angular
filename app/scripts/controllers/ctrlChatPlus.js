'use strict';

proySymphony.controller('ChatPlusCtrl', function(
    $scope, $location, $rootScope, $http, $timeout, $interval, $window, $filter, $cookies,
    $q, __env, symphonyConfig, $uibModal, $uibModalStack,
    $myModal, FileUploader, $routeParams, Slug, $anchorScroll, usefulTools, dataFactory,
    mmApi, $sce, chatWebsocket, fileService, chatMacroService, contactService,
    newChatService, chatMessages) {

    $scope.chatData = newChatService.publicData;
    if ($scope.chatData.currentChannel.id) newChatService.updateCurrentChannelWithDb($scope
        .chatData.currentChannel);
    $scope.currentChannel = function() {
        return $scope.chatData.currentChannel;
    };
    $scope.currentTypingUsers = {};
    $scope.typingTimeoutTime = 4000;

    $scope.mainChatInput = angular.element('#chatInput')[0];

    $scope.publicChannels = function() {
        return usefulTools.convertObjectToArray(newChatService.publicChannels);
    };
    $scope.privateChannels = function() {
        return usefulTools.convertObjectToArray(newChatService.privateChannels);
    };
    $scope.directChannels = function() {
        return usefulTools.convertObjectToArray(newChatService.directChannels);
    };
    $scope.teamMembers = newChatService.teamMembers;
    $scope.showChatStatus = function(user) {
        var status = 'Offline';
        if (user) {
            var contact = contactService.getContactbyMMId(user.id);
            if (contact) status = contact.status;
        }
        return usefulTools.funcPutIcon(status, '');
    };
    $scope.getOrderPost = function(order) {
        return $scope.currentChannel().postInfo.posts[order];
    };
    $scope.isKotterTechByMember = function(member) {
        var contact = contactService.getContactbyMMId(member.id);
        if (contact) return $scope.isKotterTechUser(contact);
        return false;
    };
    $scope.isKotterTechPost = function(order) {
        var contact, post;
        if ($scope.currentChannel().postInfo) {
            post = $scope.currentChannel().postInfo.posts[order];
            if (post) contact = contactService.getContactbyMMId(post.user_id);
        }
        if (contact) return $scope.isKotterTechUser(contact);
        return false;
    };
    $scope.isKotterTechUser = function(contact) {
        if ($rootScope.user.accessgroup === 'superadmin') return false;
        return contactService.isKotterTechUser(contact);
    };
    $scope.getSearchOrderPost = function(order) {
        return $scope.currentChannel().searchInfo.posts[order];
    };

    $scope.isKotterTechMember = function(member) {
        console.log(member);
    };

    $scope.$watch('websocket.restart.needed', function(newVal, oldVal) {
        console.log("RESTART SOCKET");
        chatMessages.closeSocket();
        $scope.chatMessages = chatMessages;
    });

    if ($routeParams.chId) {
        var channelId = $routeParams.chId;
        var postId = $routeParams.poId;
        var userProfileId = $routeParams.userProId;
        $location.search({});
        $cookies.put(userProfileId + 'currentChannel', channelId);
        var data = {
            channel_id: channelId
        }
        mmApi.postChannelView(userProfileId, data).then(function(response) {});
        /*if (postId) {
            var post = newChatService.publicData.currentChannel.postInfo.posts[postId];
            if (post) {
                $timeout(function(){
                    $scope.jumpToPost(post);
                }, 500);
            }
        } else {
            $scope.scrollToBottom();
        }*/
    }
    if ($routeParams) $window.localStorage.setItem("lastChannel", JSON.stringify($rootScope
        .lastChannel));

    $scope.handleScroll = function(delay) {
        var maxTries = 100;
        var currentTry = 0;
        var int = $interval(function() {
            currentTry += 1;
            if (currentTry > maxTries) {
                $interval.cancel(int);
            };
            if ($scope.currentChannel().postInfo) {
                $interval.cancel(int);
                var post;
                if ($rootScope.showingMorePosts) {
                    post = newChatService.getNextPost($rootScope.showingMorePosts);
                    if (post) {
                        $scope.jumpToPost(post);
                        $timeout(function() {
                            $scope.jumpToPost(post);
                        }, (delay * 2));
                    }
                    $rootScope.showingMorePosts = false;
                } else {
                    $scope.scrollToBottom();
                    $timeout(function() {
                        $scope.scrollToBottom();
                    }, (delay * 2));
                }
            }
        }, 100);
    };

    $scope.$watch('chatData.currentChannel', function(newVal, oldVal) {
        $scope.$evalAsync(function() {
            $scope.handleScroll(100);
        });

    });
    $scope.$watch('chatData.currentChannel.postInfo.count', function(newVal, oldVal) {
        var delay = 0;
        if (newVal && (!oldVal && oldVal !== 0)) {
            delay = 100;
        };
        if (delay > 0) {
            $timeout(function() {
                $scope.handleScroll(delay);
            }, delay);
        } else {
            $scope.$evalAsync(function() {
                $scope.handleScroll(delay);
            });
        }
    });

    $scope.setChannel = function(channel) {
        newChatService.setCurrentChannel(channel);
    };

    $scope.jumpToPost = function(post) {
        var searchString = 'chat-post[data-post-id="' + post.id + '"]';
        var postElement = angular.element(searchString)[0];
        if (postElement && postElement.scrollIntoView) {
            postElement.scrollIntoView(false);
        }
    };

    $scope.scrollToBottom = function() {
        $timeout(function() {
            var chatBox = angular.element('.posts-container')[0];
            if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        });
    };


    $scope.sendPost = function(inputElement, channel, opts) {
        if (!opts) {
            opts = {};
        };
        if (!opts.uploader && inputElement === $scope.mainChatInput) {
            opts.uploader = uploader;
        };
        return newChatService.handleSendPost(inputElement, channel, opts);
    };

    function makenonsense() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 35; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    $timeout(function() {
        $interval(function() {
            if ($window.autoType) {
                $scope.mainChatInput.value = makenonsense();
                $scope.onUserIsTyping($scope.currentChannel());
                $scope.sendPost($scope.mainChatInput, $scope.currentChannel());
            }
        }, 2000);
    }, 5000);

    $scope.showMemberCount = function() {
        var count = $filter('numKeys')($scope.currentChannel().members);
        return count + ' Member' + (count > 1 ? 's' : '');
        //|numKeys}} Member{{chatData.currentChannel.members|numKeys>1 ? 's' : ''}}
    };

    $scope.showMorePosts = function() {
        var channel = $scope.currentChannel();
        var data = {};
        var posts = channel.postInfo.posts;
        var order = channel.postInfo.order;
        var firstPost = posts[order[0]];
        if (firstPost) {
            data.before = firstPost.id;
        }
        $rootScope.showingMorePosts = firstPost;
        newChatService.getChannelPosts($scope.currentChannel(), data);
    };

    // CURRENTLY TYPING LOGIC
    $scope.getCurrentlyTypingUsersByChannelId = function(channelId, namesOnly) {
        if (!channelId) {
            channelId = $scope.currentChannel().id;
        }
        var channelTypists = $scope.currentTypingUsers[channelId];
        if (!channelTypists) {
            channelTypists = {};
        }
        var getMMUserFromArr = function(key) {
            return channelTypists[key].mmUser;
        };
        var users = Object.keys(channelTypists).map(getMMUserFromArr);
        var getMMUserNameFromObj = function(user) {
            return user.first_name;
        };
        return namesOnly ? users.map(getMMUserNameFromObj) : users;
    };

    $scope.currentTypingMessage = function() {
        var users = $scope.getCurrentlyTypingUsersByChannelId(null, true);
        if (users.length === 0) {
            return undefined;
        } else if (users.length === 1) {
            return users[0] + " is typing";
        } else if (users.length === 2) {
            return users[0] + " and " + users[1] + " are typing";
        } else {
            return users[0] + " and " + (users.length - 1) + " others are typing";
        }
    };

    $scope.addTypingUser = function(channelId, mmUser) {
        if (!$scope.currentTypingUsers[channelId]) {
            $scope.currentTypingUsers[channelId] = {};
        } else if ($scope.currentTypingUsers[channelId][mmUser.id]) {
            $timeout.cancel($scope.currentTypingUsers[channelId][mmUser.id].typingTimeout);
        }
        var typingTimeout = $timeout(function() {
            delete $scope.currentTypingUsers[channelId][mmUser.id];
            $timeout.cancel(typingTimeout);
        }, $scope.typingTimeoutTime + 1000);
        $scope.currentTypingUsers[channelId][mmUser.id] = {
            typingTimeout: typingTimeout,
            mmUser: mmUser
        };
    };

    $scope.showLoadEarlierButton = function() {
        var channel = $scope.currentChannel();
        var totalPostCount = channel.total_msg_count;
        if (channel.searchInfo) return false;
        if (channel.postInfo && channel.postInfo.order) {
            var currentPostCount = channel.postInfo.order.length;
            return totalPostCount > currentPostCount;
        }
        return false;
    };

    // WEBSOCKET EVENT HANDLERS
    chatMessages.registerEventHandler('typing', function(broadcast, data) {
        var mmUser = newChatService.teamMembers[data.user_id];
        if (mmUser) {
            $scope.addTypingUser(broadcast.channel_id, mmUser);
        }
    });

    // THREADED MESSAGE LOGIC
    $scope.openThread = function(post) {
        $scope.closeSearchDisplay();
        if ($scope.isThreadPost(post)) {
            var rootPost = $scope.currentChannel().postInfo.posts[post.parent_id];
            $scope.threadPost = rootPost;
        } else {
            $scope.threadPost = post;
        }
    };

    $scope.$watch('threadPost', function(newVal, oldVal) {
        if (newVal) {
            $scope.showThreadPanel = newVal;
        } else {
            $timeout(function() {
                $scope.showThreadPanel = newVal;
            });
        }
    });

    $scope.closeThreadedDisplay = function() {
        $timeout(function() {
            $scope.threadPost = null;
        });
    };

    $scope.isThreadPost = function(post) {
        return newChatService.isThreadPost(post);
    };

    $scope.threadPostRootUserName = function(post) {
        var rootUser;
        if (post.root_id) {
            var rootPost = $scope.threadPostRootPost(post);
            rootUser = $rootScope.teamUsers[rootPost.user_id];
        } else {
            rootUser = $rootScope.teamUsers[post.user_id];
        }
        if (rootUser) {
            return rootUser.first_name + ' ' + rootUser.last_name;
        }
        return undefined;
    };

    $scope.threadPostRootPost = function(post) {
        return $scope.currentChannel().postInfo.posts[post.root_id];
    };



    function getUploadConfig() {
        var config = {
            headers: {
                'Content-Type': undefined,
                'Authorization': undefined
            },
            transformRequest: angular.identity
        };
        return config;
    }

    var mmBaseUrl = (__env.mmUrl && __env.mmUrl != '' ? __env.mmUrl : symphonyConfig.chatUrl);
    var uploader = new FileUploader({
        url: mmBaseUrl + '/files',
        alias: 'files',
        removeAfterUpload: true,
        headers: {
            'Authorization': 'Bearer ' + $cookies.get('accessToken')
        },
        transformRequest: angular.identity
    });

    $scope.uploader = uploader;

    $scope.showUploadingFiles = false;
    $scope.showUploadingOverlay = false;
    $scope.showUploadingFiles2 = false;

    $scope.$watch('uploader.queue.length', function(newValue, oldValue) {
        if (newValue > 0) {
            var file = $scope.uploader.queue[newValue - 1]._file;

            function doContinueValidation() {
                if (file.size > 51380224) {
                    $scope.uploader.queue.pop();
                    var message =
                        "This file is too large, chat can share files up " +
                        "to 49MB in size. Please try sending this file via " +
                        "the cloud storage module instead.";
                    $rootScope.showErrorAlert(message);
                } else {
                    $scope.showUploadingFiles = true;
                    if (newValue === 5) {
                        $scope.enableFileUploader = false;
                    }
                }
            };
            if (fileService.uploadIsImage(file)) {
                var url = URL.createObjectURL($scope.uploader.queue[0]._file);
                var img = new Image();
                var body = angular.element("body")[0];
                body.append(img);
                img.onload = function() {
                    var height = img.height;
                    var width = img.width;
                    var validDimensions = (height * width) <= (6048 * 4032);
                    if (!validDimensions) {
                        $scope.uploader.queue.pop();
                        var message =
                            "This image's dimensions are too large. Chat can share " +
                            "images up to 24385536 pixels in size. Please try sending this file " +
                            "via the cloud storage module instead.";
                        $rootScope.showErrorAlert(message);
                    }
                    img.remove();
                    doContinueValidation();
                };
                img.src = url;
            } else {
                doContinueValidation();
            }
        } else if (newValue === 0) {
            $scope.showUploadingFiles = false;
            $scope.enableFileUploader = true;
            $scope.maxFilesLimit = false;
        }
    });

    $scope.threadedClassObj = {};
    $scope.getClassObj = function() {
        return {
            'well': true,
            'my-drop-zone': true,
            'with-side-panel': $scope.showThreadPanel || ($scope.search && $scope.search
                .showSearch),
            'with-file-upload': $scope.showUploadingFiles
        };
    };

    uploader.filters.push({
        'name': 'enforceMaxAmountFiles',
        'fn': function() {
            if (uploader.queue.length == 5) {
                return false;
            } else {
                return true;
            }
        }
    });

    //CALLBACKS
    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
        options) {
        if (__env.enableDebug) console.info('onWhenAddingFileFailed', item, filter,
            options);
        if (filter.name === 'enforceMaxAmountFiles') $scope.maxFilesLimit = true;
    };
    uploader.onAfterAddingFile = function(fileItem) {
        if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        if (__env.enableDebug) console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function(item) {
        $scope.uploadChannel = newChatService.currentChannel();
        var channelId = $scope.uploadChannel.id;
        item.formData.push({
            channel_id: channelId
        });
        if (__env.enableDebug) console.info('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function(fileItem, progress) {
        if (__env.enableDebug) console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function(progress) {
        if (__env.enableDebug) console.info('onProgressAll', progress);
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.log("ERROR RESPONSE FROM UPLOADING AVATAR");
        if (__env.enableDebug) console.log(response);
        fileItem.isUploaded = false;
        var message =
            "We were unable to upload your file. Please contact our support team via" +
            " the buttons in the upper-right corner of your screen to report this issue.";
        $rootScope.showErrorAlert(message);
        if (__env.enableDebug) console.info('onErrorItem', fileItem, response, status,
            headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onCancelItem', fileItem, response, status,
            headers);
        uploader.clearQueue();
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onCompleteItem', fileItem, response,
            status, headers);

    };
    uploader.onCompleteAll = function() {
        if (__env.enableDebug) console.info('onCompleteAll');
        if (__env.enableDebug) console.log("FILE IDS");
        if (__env.enableDebug) console.log(newChatService.postFiles);
        $scope.doSendMessage($scope.uploadChannel);
    };

    function sendMessageRead() {
        newChatService.sendPostWithFiles()
            .then(function(response) {
                if (__env.enableDebug) console.log(response);
            });
    }

    $scope.sendMessage = function() {
        if (!newChatService.getCurrentMessage() && $scope.uploader.queue.length == 0) {
            $rootScope.showErrorAlert('You have just tried to send an empty message.');
        } else {
            if ($scope.uploader.queue.length == 0) {
                $scope.doSendMessage();
            } else {
                $scope.uploader.uploadAll();
            }
        }
    };

    $scope.doSendMessage = function(channel) {
        if (!channel) {
            channel = newChatService.currentChannel();
        };
        $scope.sendPost($scope.mainChatInput, channel);
    };

    $scope.$watch(newChatService.getCurrentMessage, function(newVal, oldVal) {
        newChatService.inProgressMessages[newChatService.publicData.currentChannel.id] =
            newVal;
    });

    $scope.chatView = {
        getCurrentMessage: newChatService.getCurrentMessage,
        setCurrentMessage: newChatService.setCurrentMessage,
        showPeopleSuggestionList: false,
        showChannelSuggestionList: false,
        checkCallout: '',
        selectedIndex: null
    };


    /*****************SEARCH BOX FUNCTIONS *******************/

    $scope.hasSearchResults = function() {
        if ($scope.chatData.currentChannel.searchInfo) return true;
        return false;
    };

    $scope.goToRecentMessages = function() {
        newChatService.goToCurrentChannel();
    };

    $scope.sendSearch = function() {
        $scope.search.searchingComplete = false;
        $scope.search.showSearch = true;
        $scope.closeThreadedDisplay();
        newChatService.doChatSearch($scope.search.searchText)
            .then(function(response) {
                $scope.search.results = response;
                $scope.search.searchingComplete = true;
            });
    };

    function searchInit() {
        $scope.search = {};
        $scope.search = {
            showSearch: false,
            searchText: null,
            highlightPost: null,
            jumpToPost: $scope.jumpToPost,
            sendSearch: $scope.sendSearch,
            results: {}
        };
    }
    searchInit();
    $scope.closeSearchDisplay = function() {
        $scope.search.showSearch = false;
    };

    $scope.sendUserTypingEvent = function(channel) {
        var data = {
            channel_id: channel.id,
            parent_id: ''
        };
        chatMessages.sendMessage('user_typing', data);
    };



    $scope.onUserIsTyping = function(channel) {
        if (!$scope.lastTypingTimeout) {
            $scope.lastTypingTimeout = $timeout(function() {
                $timeout.cancel($scope.lastTypingTimeout);
                delete $scope.lastTypingTimeout;
            }, $scope.typingTimeoutTime);
            $scope.sendUserTypingEvent(channel);
        }
    };

    $scope.getPeopleForList = function() {
        return newChatService.getPeopleForList();
    };

    newChatService.registerChatEventCallback('teamMembersLoaded', function() {
        $scope.peopleListData = {
            people: $scope.getPeopleForList(),
            selectedIndex: 0,
            element: null,
            scope: $scope,
            select: function(index) {
                var scope = this.scope;
                var element = this.element;
                $scope.selectCurrentSelection(scope, element, index);
            }
        };
    });


    newChatService.registerChatEventCallback('memberAdded', function() {
        if ($scope.peopleListData) {
            $scope.peopleListData.people = $scope.getPeopleForList();
        }
    });

    chatMacroService.getChatMacros().then(function(response) {
        if (response) {
            $scope.macrosListData = {
                macros: response,
                selectedIndex: 0,
                element: null,
                scope: $scope,
                select: function(index, suggestion) {
                    var scope = this.scope;
                    var element = this.element;
                    $scope.selectMacroSelection(scope, element, {
                        index: index,
                        suggestion: suggestion
                    });
                }
            };
        }
    });

    $scope.getChatMacroHotKeys = function(scope) {
        return chatMacroService.getChatMacroHotKeys(scope);
    };

    function getChannelsForList() {
        var publicChannels = {};
        var privateChannels = {};
        angular.copy(newChatService.publicChannels, publicChannels);
        angular.copy(newChatService.privateChannels, privateChannels);
        var channels = _.merge(publicChannels, privateChannels);
        return usefulTools.convertObjectToArray(channels);
    };

    newChatService.registerChatEventCallback('chatInitialized', function() {
        $scope.channelListData = {
            channels: getChannelsForList(),
            selectedIndex: 0,
            element: null,
            scope: $scope,
            select: function(index) {
                var scope = this.scope;
                var element = this.element;
                $scope.selectCurrentSelection(scope, element, index);
            }
        };
    });


    newChatService.registerChatEventCallback('channelRemoved', function() {
        if ($scope.channelListData) {
            $scope.channelListData.channels = getChannelsForList();
        }
    });

    newChatService.registerChatEventCallback('channelAdded', function() {
        if ($scope.channelListData) {
            $scope.channelListData.channels = getChannelsForList();
        }
    });


    $scope.selectCurrentSelection = function(scope, inputElement, index) {
        return newChatService.selectCurrentSelection(scope, inputElement, index);
    };

    $scope.selectMacroSelection = function(scope, inputElement, opts) {
        return chatMacroService.selectMacroSelection(scope, inputElement, opts);
    };


    $scope.getKeyPressChatFns = function(scope) {
        return {
            onKeyDown: { // use when you want to access the element value before it is changed
                bareEnter: function(e, childScope) {
                    // send post and prevent default
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    if (scope.showPeopleList || scope.showChannelList) {
                        $scope.selectCurrentSelection(scope, childScope.element);
                    } else if (scope.showMacrosList) {
                        var listData = scope.macrosListData;
                        var opts = {
                            suggestion: listData.suggestions[listData.selectedIndex],
                            index: listData.selectedIndex
                        };
                        $scope.selectMacroSelection(scope, childScope.element, opts);
                    } else {
                        childScope.doSendPost();
                    }
                },
                shiftEnter: function(e, childScope) {
                    // do nothing (allow enter to take place)
                },
                at: function(e, childScope) {
                    // if people-list is closed, open it. if it's open, this is part of search string
                    var charPosition = usefulTools.doGetCaretPosition(e.target);
                    if (charPosition === 0 || (e.target.value.length > 0 && e.target
                            .value.substr(e.target.value.length - 1, 1) === ' ')) {
                        e.stopImmediatePropagation();
                        scope.$evalAsync(function() {
                            scope.showPeopleList = true;
                        });
                    }
                },
                hash: function(e, childScope) {
                    // if channel-list is closed, open it. if it's closed, this is part of search string
                    var charPosition = usefulTools.doGetCaretPosition(e.target);
                    if (charPosition === 0 || (e.target.value.length > 0 && e.target
                            .value.substr(e.target.value.length - 1, 1) === ' ')) {
                        e.stopImmediatePropagation();
                        scope.$evalAsync(function() {
                            scope.showChannelList = true;
                        });
                    }
                },
                tab: function(e, childScope) {
                    // if either list is open, choose the current suggestion. otherwise, do nothing
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    if (scope.showPeopleList || scope.showChannelList) {
                        $scope.selectCurrentSelection(scope, childScope.element);
                    } else if (scope.showMacrosList) {
                        var listData = scope.macrosListData;
                        var opts = {
                            suggestion: listData.suggestions[listData.selectedIndex],
                            index: listData.selectedIndex
                        };
                        $scope.selectMacroSelection(scope, childScope.element, opts);
                    }
                },
                esc: function(e, childScope) {
                    // if either list is open, close it. otherwise, do default
                    scope.$evalAsync(function() {
                        scope.showChannelList = false;
                        scope.showPeopleList = false;
                        scope.showMacrosList = false;
                    });
                },
                spc: function(e, childScope) {
                    // if either list is open, close it. in either case, do default too
                    scope.$evalAsync(function() {
                        scope.showChannelList = false;
                        scope.showPeopleList = false;
                        scope.showMacrosList = false;
                    });
                },
                up: function(e, childScope) {
                    // if a list is open, decrement the position of the highlight. otherwise do nothing
                    e.stopImmediatePropagation();
                    scope.$evalAsync(function() {
                        if (scope.showPeopleList) {
                            var currentTotal = scope.peopleListData.people.length;
                            var selectedIndex = scope.peopleListData.selectedIndex;
                            if (!(selectedIndex - 1 < 0)) {
                                scope.peopleListData.selectedIndex -= 1;
                            }
                        } else if (scope.showChannelList) {
                            var currentTotal = scope.channelListData.channels
                                .length;
                            var selectedIndex = scope.channelListData.selectedIndex;
                            if (!(selectedIndex - 1 < 0)) {
                                scope.channelListData.selectedIndex -= 1;
                            }
                        } else if (scope.showMacrosList) {
                            var currentTotal = scope.macrosListData.macros.length;
                            var selectedIndex = scope.macrosListData.selectedIndex;
                            if (!(selectedIndex - 1 < 0)) {
                                scope.macrosListData.selectedIndex -= 1;
                            }
                        }
                    });
                    return false;
                },
                down: function(e, childScope) {
                    // if a list is open, increment the position of the highlight. otherwise do nothing
                    e.stopImmediatePropagation();
                    scope.$evalAsync(function() {
                        if (scope.showPeopleList) {
                            var currentTotal = scope.peopleListData.people.length;
                            var selectedIndex = scope.peopleListData.selectedIndex;
                            if (!(selectedIndex + 1 > (currentTotal - 1))) {
                                scope.peopleListData.selectedIndex += 1;
                            }
                        } else if (scope.showChannelList) {
                            var currentTotal = scope.channelListData.channels
                                .length;
                            var selectedIndex = scope.channelListData.selectedIndex;
                            if (!(selectedIndex + 1 > (currentTotal - 1))) {
                                scope.channelListData.selectedIndex += 1;
                            }
                        } else if (scope.showMacrosList) {
                            var currentTotal = scope.macrosListData.suggestions
                                .length;
                            var selectedIndex = scope.macrosListData.selectedIndex;
                            if (!(selectedIndex + 1 > (currentTotal - 1))) {
                                scope.macrosListData.selectedIndex += 1;
                            }
                        }
                    });
                    return false;
                },
                backspace: function(e, childScope) {
                    var lastTypedChar = childScope.element.value.split('').pop();
                    scope.$evalAsync(function() {
                        if (scope.showPeopleList) {
                            if (lastTypedChar === '@') {
                                scope.showPeopleList = false;
                            }
                        } else if (scope.showChannelList) {
                            if (lastTypedChar === '#') {
                                scope.showChannelList = false;
                            }
                        } else if (scope.showMacrosList) {
                            if (childScope.element.value === '') scope.showMacrosList =
                                false;
                        }
                    });
                },
                always: function(e, childScope) {
                    // user is typing in all cases
                    $scope.onUserIsTyping(childScope.channel());
                    var value = childScope.element.value;
                    var splits = value.split(' ');
                    var macros = scope.macrosListData.macros;
                    var hotKeys = $scope.getChatMacroHotKeys(scope);
                    var searchTerm = splits[splits.length - 1];
                    if (e.key.length === 1) {
                        searchTerm += e.key;
                    } else if (e.key === "Backspace") {
                        scope.$evalAsync(function() {
                            scope.showMacrosList = false;
                        });
                        searchTerm = searchTerm.slice(0, searchTerm.length - 1);
                    }
                    if (e.which === 27) {
                        scope.$evalAsync(function() {
                            scope.showMacrosList = false;
                        });
                        return false;
                    }
                    var hotKey;
                    var macro;
                    var suggestions;
                    for (var i = 0; i < hotKeys.length; i++) {
                        hotKey = hotKeys[i];
                        if (searchTerm.indexOf(hotKey) > -1) {
                            macro = macros[i];

                            function notHashKey(key) {
                                return key !== "$$hashKey";
                            }
                            var key = Object.keys(macro).filter(notHashKey)[0];
                            suggestions = macro[key];
                            scope.macrosListData.suggestions = suggestions;
                        }
                    }
                    if (suggestions && suggestions.length > 0) {
                        scope.$evalAsync(function() {
                            scope.showMacrosList = true;
                        });
                    } else {
                        scope.$evalAsync(function() {
                            scope.showMacrosList = false;
                        });
                    }
                    return true;
                },
                noRelevant: function(e, childScope) {

                }
            },
            onKeyUp: { // use when you want to access the element value after it is changed
                bareEnter: function(e, childScope) {},
                shiftEnter: function(e, childScope) {},
                at: function(e, childScope) {},
                hash: function(e, childScope) {},
                tab: function(e, childScope) {},
                esc: function(e, childScope) {},
                spc: function(e, childScope) {},
                up: function(e, childScope) {},
                down: function(e, childScope) {},
                always: function(e, childScope) {
                    scope.$evalAsync(function() {
                        childScope.setInProgress(childScope.element.value);
                        if (scope.showPeopleList && newChatService) {
                            function isValidPerson(person) {
                                var searchTerm =
                                    $scope.findSearchTermFromElementByKey(
                                        childScope.element, '@');
                                return person.username.indexOf(searchTerm) >
                                    -1;
                            }
                            var people = $scope.getPeopleForList().filter(
                                isValidPerson);
                            scope.peopleListData.people = people;
                            if (scope.peopleListData.selectedIndex > (
                                    people.length - 1)) {
                                scope.peopleListData.selectedIndex = 0;
                            }
                        }
                    });
                },
                noRelevant: function(e) {}
            },
            onPaste: function(e, childScope) {
                $scope.handlePaste(e, childScope.uploader);
            }
        };
    };

    $scope.handlePaste = function(e, uploader) {
        return newChatService.handlePaste(e, uploader);
    };

    $scope.keyPressChatFns = $scope.getKeyPressChatFns($scope);

    $scope.findSearchTermFromElementByKey = function(element, key) {
        return newChatService.findSearchTermFromElementByKey(element, key);
    };

    $scope.getKeyReverseIndex = function(value, key) {
        return newChatService.getKeyReverseIndex(value, key);
    };

    $scope.copySelected = {};
    $scope.enableCopyMode = false;
    $scope.toggleCopyMode = function() {
        $scope.enableCopyMode = !$scope.enableCopyMode;
        if (!$scope.enableCopyMode) $scope.copySelected = {};
    };

    $scope.copyMessage = function(id) {
        if ($scope.copySelected[id]) {
            delete $scope.copySelected[id];
        } else {
            $scope.copySelected[id] = true;
        }
    };
    $scope.saveCopiedMessages = function() {
        newChatService.saveCopiedPosts($scope.copySelected);
        $scope.toggleCopyMode();
    };

    $scope.cancelCopyMessages = function() {
        $scope.toggleCopyMode();
    };

    $scope.$on('main.chat.insert.macro.text', function(event, hotKey, insertText) {
        $rootScope.$broadcast('close.main.channel.chat.macro.suggestion');
        var message = chatMacroService.getMainChatCurMessageValue();
        message = chatMacroService.insertTextIntoMessage(hotKey, message,
            insertText);
        newChatService.setCurrentMessage(message);
    });

    $scope.emojiLocation = $window.innerHeight - 430;

    wdtEmojiBundle.defaults.emojiSheets.apple =
        'https://res.cloudinary.com/freebizads/image/upload/v1492270732/wdt/sheet_apple_64_indexed_128.png'; // default /sheets/sheet_apple_64.png
    wdtEmojiBundle.defaults.emojiSheets.google =
        'https://res.cloudinary.com/freebizads/image/upload/v1492270732/wdt/sheet_google_64_indexed_128.png'; // default /sheets/sheet_google_64.png
    wdtEmojiBundle.defaults.emojiSheets.twitter =
        'https://res.cloudinary.com/freebizads/image/upload/v1492270732/wdt/sheet_twitter_64_indexed_128.png'; // default /sheets/sheet_twitter_64.png
    wdtEmojiBundle.defaults.emojiSheets.emojione =
        'https://res.cloudinary.com/freebizads/image/upload/v1492270732/wdt/sheet_emojione_64_indexed_128.png'; // default /sheets/sheet_emojione_64.png
    wdtEmojiBundle.defaults.emojiSheets.facebook =
        'https://res.cloudinary.com/freebizads/image/upload/v1492270732/wdt/sheet_facebook_64_indexed_128.png'; // default /sheets/sheet_facebook_64.png
    wdtEmojiBundle.defaults.emojiSheets.messenger =
        'https://res.cloudinary.com/freebizads/image/upload/v1492270732/wdt/sheet_messenger_64_indexed_128.png'; // default /sheets/sheet_messenger_64.png

    wdtEmojiBundle.defaults.sectionOrders = {
        'Recent': 10,
        'Custom': 9,
        'People': 8,
        'Nature': 7,
        'Foods': 6,
        'Activity': 5,
        'Places': 4,
        'Objects': 3,
        'Symbols': 2,
        'Flags': 1
    };
    wdtEmojiBundle.defaults.type = 'twitter';
});
