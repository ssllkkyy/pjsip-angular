'use strict';

proySymphony.service('chatService', function($filter, $rootScope, __env, mmApi, usefulTools,
    contactService, $window, $sce, dataFactory, fileService) {

    var service = {
        threadPosts: {},
        inProgressMessages: {},
        favorites: []
    };


    service.init = function() { // called at EOF
        service.loadChatFavorites($rootScope.user.id);
    };

    service.handleNewBatchOfPosts = function(posts, order) {
        posts = usefulTools.convertObjectToArray(posts);
        service.addThreadPostsFromPool(posts);
        posts = service.convertPostsArrayToObjectByPostId(posts);
        var sortorder = service.filterOrderArrByAvailablePosts(order, posts);
        return {
            posts: posts,
            sortorder: sortorder
        };
    };

    service.addThreadPostsFromPool = function(posts) {
        service.initRootPostArraysByPool(posts);
        posts = posts.filter(function(post) {
            return service.isThreadPost(post);
        });
        angular.forEach(posts, function(post) {
            service.addThreadPost(post);
        });
    };

    service.initRootPostArraysByPool = function(posts) {
        angular.forEach(posts, function(post) {
            if (!service.isThreadPost(post) && !service.threadPosts[post.id]) {
                service.threadPosts[post.id] = [];
            }
        });
        return true;
    };

    service.filterThreadPosts = function(posts) {
        return posts.filter(function(post) {
            return !service.isThreadPost(post);
        });
    };

    service.convertPostsArrayToObjectByPostId = function(postsArr) {
        var postsObj = {};
        angular.forEach(postsArr, function(post) {
            postsObj[post.id] = post;
        });
        return postsObj;
    };

    service.filterOrderArrByAvailablePosts = function(orderArr, availablePosts) {
        return orderArr.filter(function(postId) {
            return !!availablePosts[postId];
        });
    };

    service.handleNewThreadPost = function(post) {
        service.addThreadPost(post);
    };

    service.addNewRootPostId = function(post) {
        service.threadPosts[post.id] = [];
    };

    service.addThreadPost = function(post) {
        if (service.threadPosts[post.root_id]) {
            if (!service.threadPostExists(post)) {
                service.threadPosts[post.root_id].push(post);
            }
        } else {
            service.threadPosts[post.root_id] = [post];
        }
    };

    service.threadPostExists = function(threadPost) {
        var post;
        var posts = service.threadPosts[threadPost.root_id];
        if (posts) {
            for (var i = 0; i < posts.length; i++) {
                post = posts[i];
                if (post.id === threadPost.id) {
                    return true;
                }
            }
        }
        return false;
    };

    service.getThreadPostsByRootId = function(rootId) {
        return service.threadPosts[rootId];
    };

    service.isGiphyLink = function(text) {
        return !!text.match(/(https:\/\/).+(.giphy.com).+(.gif)/);
    };

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

    service.getUnsubscribedChannels = function() {
        return mmApi.getMoreTeamChannels($rootScope.teamId, 0, 50)
            .then(function(result) {
                $rootScope.unsubscribedChannels = result.data;
                if (__env.enableDebug) console.log("SUBSCRIBE TO CHANNELS");
                if (__env.enableDebug) console.log($rootScope.unsubscribedChannels);
                return result.data;
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                $rootScope.unsubscribedChannels = [];
                return [];
            });
    };

    service.updateChannelMembers = function() {
        return mmApi.getChannelMembers()
            .then(function(response) {
                $rootScope.channelMembers = response.data;
                return mmApi.getUsersChannels($rootScope.teamId)
                    .then(function(result) {
                        $rootScope.availableChannels = result.data;
                        var sum = 0;
                        angular.forEach($rootScope.availableChannels, function(
                            channel) {
                            channel.isAdmin = false;
                            var check = $filter('getByChannelId')(
                                $rootScope.channelMembers, channel.id
                            );
                            if (check !== null) {
                                channel.hasUnread = false;
                                if (check.last_viewed_at < channel.last_post_at)
                                    channel.hasUnread = true;
                                channel.mention_count = check.mention_count;
                                sum += channel.mention_count;
                                if (check.roles.indexOf('channel_admin') !==
                                    -1) channel.isAdmin = 'true';
                            }
                        });
                        console.log(result.data);
                        $rootScope.numNewChatMessages = sum;
                        $window.localStorage.setItem("channelMembers", JSON.stringify(
                            $rootScope.channelMembers));
                        $window.localStorage.setItem("availableChannels", JSON.stringify(
                            $rootScope.availableChannels));
                        return result.data;
                    }, function(error) {
                        if (__env.enableDebug) console.log(error);
                        return [];
                    });
            });
    };

    service.updateTeamUsers = function() {
        //$rootScope.teamId = ($rootScope.user.symphony_domain_settings ? $rootScope.user.symphony_domain_settings.mattermost_team_id : '');
        return mmApi.getTeamMembers($rootScope.teamId)
            .then(function(response) {
                var users = [];
                angular.forEach(response.data, function(item) {
                    users.push(item.user_id);
                });
                return mmApi.getUsersByIds(users)
                    .then(function(response) {
                        var users = [];
                        angular.copy(response.data, users);
                        $rootScope.teamUserKeys = [];
                        angular.forEach(users, function(element) {
                            $rootScope.teamUsers[element.id] = element;
                            $rootScope.teamUserKeys.push(element.id);
                        });

                        angular.forEach($rootScope.teamUsers, function(user) {
                            var contact = contactService.getContactbyMMId(
                                user.id);
                            if (contact !== null) user.contact =
                                contact;
                            //array.unshift(element);
                        });

                        return $rootScope.teamUsers;
                    }, function(error) {
                        if (__env.enableDebug) console.log(error);
                        return $rootScope.teamUsers;
                    });
            });
    };

    service.showMemberPhoto = function(user, size) {
        var status = 'Offline';
        var statusClass = usefulTools.funcPutIcon(status);
        var statusBox = '<span class="status-box"><i class="' + statusClass +
            '" style="font-size: 18px;"></i></span>';
        if (user) {
            var contact = contactService.getContactbyMMId(user.id);
            if (contact !== null) {
                status = contact.status;
                statusClass = usefulTools.funcPutIcon(status);
                statusBox = '<span class="status-box"><i class="' + statusClass +
                    '" style="font-size: 18px;"></i></span>';
                if (contact.contact_profile_image && contact.contact_profile_image !==
                    '') {
                    return $sce.trustAsHtml(
                        '<img src="' + $rootScope.pathImgProfile + contact.contact_profile_image +
                        '" class="chat-profile-image' + size + '">' + statusBox);
                }
                return $sce.trustAsHtml('<label class="chat-profile-image-null' + size +
                    '" style="background-color: ' + (contact && contact.contact_profile_color ?
                        contact.contact_profile_color : "") + '">' + contact.contact_name_given
                    .substring(0, 1) + contact.contact_name_family.substring(0, 1) +
                    '</label>' + statusBox);
            }
            //return $sce.trustAsHtml('<label class="chat-profile-image-null'+size+'" style="background-color: '+(contact && contact.contact_profile_color ? contact.contact_profile_color : "")+'">'+contact.contact_name_given.substring(0,1) + contact.contact_name_family.substring(0,1) +'</label>'+statusBox);
        } else if (user && !user.roles) {
            return $sce.trustAsHtml(
                '<span class="suggest-icon"><i class="fa fa-users md-icon"></i></span>' +
                statusBox);
        }
        return $sce.trustAsHtml('<label class="chat-profile-image-null' + size +
            '"><i class="fa fa-user"></i></label>' + statusBox);

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

    service.showFilesDisplayForPost = function(post) {
        if (post) {
            return post.fileinfoposts && post.fileinfoposts.length > 0;
        }
        return false;
    };

    service.favoriteTopicChannels = function() {
        if ($rootScope.availableChannels) {
            return $rootScope.availableChannels.filter(function(channel) {
                return service.isFavoriteChannel(channel) && channel.display_name;
            });
        }
        return null;
    };



    function collectionContainsChannel(channel, coll) {
        var otherChannel;
        for (var i = 0; i < coll.length; i++) {
            otherChannel = coll[i];
            if (otherChannel.id === channel.id) {
                return true;
            }
        };
        return false;
    };

    service.initialize = function(order) {
        $rootScope.uid = [];
        $rootScope.puid = [];
        $rootScope.u = [];
        $rootScope.created = [];
        $rootScope.pcreated = [];
        $rootScope.showProfileInfo = [];
        $rootScope.showDateSeparator = [];
        var index = 0;
        console.log($rootScope.teamUsers);
        angular.forEach(order, function(item) {
            service.updatePostInfo(item, index);
            index++;
        });

        console.log("POST USERS");
        console.log($rootScope.u);
    };

    service.updatePostInfo = function(item, index) {
        var newObj = {};

        $rootScope.u[item] = $rootScope.teamUsers[$rootScope.posts[item].user_id];
        var previouspost = (index == 0 ? null : $rootScope.posts[$rootScope.order[index -
            1]]);
        var newpost = $rootScope.posts[item];

        $rootScope.uid[item] = newpost.user_id;
        $rootScope.puid[item] = (previouspost == null ? '' : previouspost.user_id);

        $rootScope.created[item] = newpost.create_at;
        $rootScope.pcreated[item] = (previouspost == null ? '' : previouspost.create_at);

        var newDay = usefulTools.isNewDay(newpost.create_at, (previouspost == null ? '' :
            previouspost.create_at));
        var timeSinceLastPost = usefulTools.timeDifference(newpost.create_at, (index ==
            0 ? '' : previouspost.create_at), 'minutes');

        var lessThanFifteen = (timeSinceLastPost < 15 ? true : false);
        var differentUser = true;
        if (index != 0 && (newpost.user_id == previouspost.user_id)) differentUser =
            false;
        var show = false;

        if (newDay || differentUser || (!lessThanFifteen && !differentUser)) show =
            true;
        $rootScope.showProfileInfo[item] = show;
        $rootScope.showDateSeparator[item] = newDay;

    };

    service.refreshChatInfo = function() {
        //alert("REFRESHING");
        return mmApi.getMe()
            .then(function(response) {
                $rootScope.mmProfile = response.data;
                if (__env.enableDebug) console.log("CHAT USER PROFILE");
                if (__env.enableDebug) console.log($rootScope.mmProfile);
                //mmApi.updateStatus(true);
                //mmApi.getInitialLoad()
                return mmApi.getAllUserPreferences()
                    .then(function(result) {
                        if (__env.enableDebug) console.log("USER PREFERENCES");
                        if (__env.enableDebug) console.log(result.data);
                        $rootScope.allPreferences = result.data;
                        if ($rootScope.allPreferences) {
                            var lastChannel = $filter(
                                'getPrefValueByCategoryandName')($rootScope
                                .allPreferences, 'last', 'channel');
                            if (lastChannel !== null) {
                                $rootScope.mmProfile.lastChannel = lastChannel;
                            }
                        }
                        $window.localStorage.setItem("allPreferences", JSON.stringify(
                            $rootScope.allPreferences));
                        $window.localStorage.setItem("mmProfile", JSON.stringify(
                            $rootScope.mmProfile));
                        return mmApi.getChannelMembers()
                            .then(function(response) {
                                $rootScope.channelMembers = response.data;
                                // debugger;
                                return mmApi.getUsersChannels($rootScope.teamId)
                                    .then(function(result) {
                                        //if(__env.enableDebug) console.log("CHANNELS");
                                        //if(__env.enableDebug) console.log(result.data);
                                        $rootScope.availableChannels =
                                            result.data;
                                        var sum = 0;
                                        angular.forEach($rootScope.availableChannels,
                                            function(channel) {
                                                channel.isAdmin =
                                                    false;
                                                var check = $filter(
                                                    'getByChannelId'
                                                )($rootScope.channelMembers,
                                                    channel.id);
                                                if (check !== null) {
                                                    channel.hasUnread =
                                                        false;
                                                    if (check.last_viewed_at <
                                                        channel.last_post_at
                                                    ) channel.hasUnread =
                                                        true;
                                                    channel.mention_count =
                                                        check.mention_count;
                                                    sum += channel.mention_count;
                                                    if (check.roles
                                                        .indexOf(
                                                            'channel_admin'
                                                        ) !== -1)
                                                        channel.isAdmin =
                                                        'true';
                                                }
                                            });
                                        $rootScope.numNewChatMessages =
                                            sum;
                                        $window.localStorage.setItem(
                                            "channelMembers", JSON.stringify(
                                                $rootScope.channelMembers
                                            ));
                                        $window.localStorage.setItem(
                                            "availableChannels",
                                            JSON.stringify(
                                                $rootScope.availableChannels
                                            ));

                                        return mmApi.getTeamMembers(
                                                $rootScope.teamId)
                                            .then(function(response) {
                                                var users = [];
                                                angular.forEach(
                                                    response.data,
                                                    function(
                                                        item) {
                                                        users.push(
                                                            item
                                                            .user_id
                                                        );
                                                    });
                                                return mmApi.getUsersByIds(
                                                        users)
                                                    .then(function(
                                                        response
                                                    ) {
                                                        var
                                                            users = [];
                                                        console
                                                            .log(
                                                                response
                                                                .data
                                                            );
                                                        angular
                                                            .copy(
                                                                response
                                                                .data,
                                                                users
                                                            );
                                                        console
                                                            .log(
                                                                users
                                                            );
                                                        //$rootScope.teamUsers = [];
                                                        $rootScope
                                                            .teamUserKeys = [];
                                                        angular
                                                            .forEach(
                                                                users,
                                                                function(
                                                                    user
                                                                ) {
                                                                    $rootScope
                                                                        .teamUserKeys
                                                                        .push(
                                                                            user
                                                                            .id
                                                                        );
                                                                    var
                                                                        contact =
                                                                        contactService
                                                                        .getContactbyMMId(
                                                                            user
                                                                            .id
                                                                        );
                                                                    if (
                                                                        contact !==
                                                                        null
                                                                    )
                                                                        user
                                                                        .contact =
                                                                        contact;
                                                                    //$rootScope.teamUsers[element.id] = element;
                                                                }
                                                            );
                                                        //console.log($rootScope.teamUsers);

                                                        var data = {
                                                            username: 'everyone',
                                                            first_name: 'Notify everyone on your team',
                                                            id: 997
                                                        }
                                                        users.push(
                                                            data
                                                        )
                                                        var data = {
                                                            username: 'channel',
                                                            first_name: 'Notify everyone in this channel',
                                                            id: 998
                                                        }
                                                        users.push(
                                                            data
                                                        );
                                                        var data = {
                                                            username: 'here',
                                                            first_name: 'Notify every online member in this channel',
                                                            id: 999
                                                        }
                                                        users.push(
                                                            data
                                                        );
                                                        $rootScope
                                                            .teamUsersArray =
                                                            users;
                                                        $rootScope
                                                            .teamUsers =
                                                            service
                                                            .convertArrayToObject(
                                                                users
                                                            );
                                                        return $rootScope
                                                            .mmProfile;
                                                    }, function(
                                                        error) {
                                                        return '';
                                                    });
                                            });
                                    }, function(error) {
                                        if (__env.enableDebug) console.log(
                                            error);
                                        $rootScope.availableChannels = {};
                                        return '';
                                    });
                            });
                    }, function(error) {
                        if (__env.enableDebug) console.log(error);
                        return '';
                    });
            }, function(error) {
                $rootScope.mmProfile = {};
                return '';
            });
    };

    service.convertArrayToObject = function(array) {
        var object = {};
        angular.forEach(array, function(item) {
            if (item.id !== '997' || item.id !== '998' || item.id !== '999')
                object[item.id] = item;
        });
        console.log(object);
        return object;
    };

    //service.init();

    return service;
});
