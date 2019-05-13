'use strict';

proySymphony.factory('mmApi', function($http, __env, symphonyConfig, $cookies, $rootScope) {

    var mmBaseUrl = (__env.mmUrl && __env.mmUrl != '' ? __env.mmUrl : symphonyConfig.chatUrl);
    var mmApi = {};

    function getConfig() {
        return {
            headers: {
                'Authorization': 'Bearer ' + $cookies.get('accessToken')
            }
        };
    };

    function getUploadConfig() {
        return {
            headers: {
                'Content-Type': undefined,
                'Authorization': 'Bearer ' + $cookies.get('accessToken')
            },
            transformRequest: angular.identity
        };
    }

    mmApi.doLogin = function(data) {
        return $http.post(mmBaseUrl + '/users/login', data);
    };
    mmApi.getMe = function(UserId) {
        return $http.get(mmBaseUrl + '/users/' + UserId, getConfig());
    };
    mmApi.updateUserStatus = function(UserId, data) {
        return $http.put(mmBaseUrl + '/users/' + UserId + '/status', data, getConfig());
    };
    mmApi.getUserSessions = function(userId) { //done
        return $http.get(mmBaseUrl + '/users/' + userId + '/sessions', getConfig());
    };
    mmApi.getUserAudits = function(userId) { //done
        return $http.get(mmBaseUrl + '/users/' + userId + '/audits', getConfig());
    };
    mmApi.createToken = function(userId, data) {
        return $http.post(mmBaseUrl + '/users/' + userId + '/tokens', data, getConfig());
    };
    mmApi.revokeSession = function(userId, data) {
        return $http.post(mmBaseUrl + '/users/' + userId + '/sessions/revoke', data,
            getConfig());
    };
    mmApi.getUsersChannels = function(userId, teamId) { //done
        if (!userId) {
            userId = $rootScope.mmProfile.id;
        };
        if (!teamId) {
            teamId = $rootScope.teamId;
        };
        return $http.get(mmBaseUrl + '/users/' + userId + '/teams/' + teamId +
            '/channels', getConfig());
    };
    mmApi.getUsersByIds = function(data) { //done
        return $http.post(mmBaseUrl + '/users/ids', data, getConfig());
    };
    mmApi.getTeamMembers = function(teamId) { //done
        return $http.get(mmBaseUrl + '/teams/' + teamId + '/members', getConfig());
    };
    mmApi.getTeamInfo = function(teamId) { //done
        return $http.get(mmBaseUrl + '/teams/' + teamId, getConfig());
    };

    //Channel Routes
    mmApi.getPublicChannels = function(teamId, page, limit) {
        if (!page) page = 0;
        if (!limit) limit = 100;
        return $http.get(mmBaseUrl + '/teams/' + teamId + '/channels?page=' + page +
            'per_page=' + limit, getConfig());
    };
    mmApi.getChannelExtraInfo = function(channelId, limit) {
        return $http.get(mmBaseUrl + '/teams/' + $rootScope.teamId + '/channels/' +
            channelId + '/users/0/200', getConfig());
    };
    mmApi.getUsersInChannel = function(channelId, page, limit) { //done
        if (!page) page = 0;
        if (!limit) limit = 100;
        return $http.get(mmBaseUrl + '/channels/' + channelId + '/members?page=' + page +
            'per_page=' + limit, getConfig());
    };
    //mmApi.getUsersNotInChannel = function(channelId, limit) {
    //    return $http.get(mmBaseUrl + '/teams/'+$rootScope.teamId+'/channels/'+channelId+'/users/not_in_channel/0/200', getConfig());
    //}
    mmApi.getChannelMembers = function() { //done
        return $http.get(mmBaseUrl + '/users/' + $rootScope.mmProfile.id + '/teams/' +
            $rootScope.teamId + '/channels/members', getConfig());
    };
    mmApi.getChannelMember = function(channelId, memberId) { //done
        return $http.get(mmBaseUrl + '/channels/' + channelId + '/members/' + memberId,
            getConfig());
    };
    mmApi.postChannelView = function(profileId, data) { //done
        return $http.post(mmBaseUrl + '/channels/members/' + profileId + '/view', data,
            getConfig());
    };
    mmApi.updateChannelRoles = function(channelId, memberId, data) { //done
        return $http.put(mmBaseUrl + '/channels/' + channelId + '/members/' + memberId +
            '/roles', data, getConfig());
    };
    mmApi.addMembertoChannel = function(channelId, data) { //done
        return $http.post(mmBaseUrl + '/channels/' + channelId + '/members', data,
            getConfig());
    };
    mmApi.deleteMemberFromChannel = function(channelId, userId) { //done
        return $http.delete(mmBaseUrl + '/channels/' + channelId + '/members/' + userId,
            getConfig());
    };
    mmApi.deleteChannel = function(channelId) { //done
        return $http.delete(mmBaseUrl + '/channels/' + channelId, getConfig());
    };
    mmApi.getChannelPosts = function(data) { //done
        console.log(data);
        var extra = '';
        if (data.before) extra = '&before=' + data.before;
        if (data.after) extra = '&after=' + data.after;
        if (data.since) extra = '&since=' + data.since;
        return $http.get(mmBaseUrl + '/channels/' + data.channelId + '/posts?page=' +
            data.page + '&per_page=' + data.limit + extra, getConfig());
    };
    mmApi.getChannel = function(channelId) { //done
        return $http.get(mmBaseUrl + '/channels/' + channelId, getConfig());
    };
    mmApi.getChannelStats = function(channelId) { //done
        return $http.get(mmBaseUrl + '/channels/' + channelId + '/stats', getConfig());
    };
    mmApi.getMoreTeamChannels = function(teamId, offset, limit) { //REVISIT
        if (!offset) offset = 0;
        if (!limit) limit = 50;
        return $http.get(mmBaseUrl + '/teams/' + teamId + '/channels/more/' + offset +
            '/' + limit, getConfig());
    };
    mmApi.createNewChannel = function(data) { //done
        return $http.post(mmBaseUrl + '/channels', data, getConfig());
    };
    mmApi.updateChannel = function(channel) { //done
        return $http.put(mmBaseUrl + '/channels/' + channel.id, channel, getConfig());
    };
    mmApi.patchChannel = function(data, channelId) { //done
        return $http.put(mmBaseUrl + '/channels/' + channelId + '/patch', data,
            getConfig());
    };
    mmApi.postCreateDirectChannel = function(userId, memberId) { //done
        var array = [userId, memberId];
        return $http.post(mmBaseUrl + '/channels/direct', JSON.stringify(array),
            getConfig());
    };
    mmApi.postJoinChannel = function(channelId) { //done
        var data = {
            user_id: $rootScope.mmProfile.id,
            channel_id: channelId
        };
        return $http.post(mmBaseUrl + '/channels/' + channelId + '/members', data,
            getConfig());
    };
    mmApi.postLeaveChannel = function(channelId) { //done
        return $http.delete(mmBaseUrl + '/channels/' + channelId + '/members/' +
            $rootScope.mmProfile.id, getConfig());
    };

    //Member Routes
    mmApi.updateStatus = function(status, userId) { //done
        var data = {
            active: status
        }
        return $http.put(mmBaseUrl + '/users/' + userId + '/active', data, getConfig());
    };
    mmApi.getAllUserPreferences = function(memberId) { //done
        return $http.get(mmBaseUrl + '/users/' + memberId + '/preferences', getConfig());
    };
    mmApi.getUserPreference = function(cat, name) { //done
        return $http.get(mmBaseUrl + '/users/' + $rootScope.mmProfile.id +
            '/preferences/' + cat + '/name/' + name, getConfig());
    };
    mmApi.getUserPreferencesCategory = function(category) { //done
        return $http.get(mmBaseUrl + '/users/' + $rootScope.mmProfile.id +
            '/preferences/' + category, getConfig());
    };
    mmApi.setUserPreferences = function(preferences, memberId) { //done
        return $http.put(mmBaseUrl + '/users/' + memberId + '/preferences', preferences,
            getConfig());
    };

    //Posts Endpoints
    mmApi.sendNewPost = function(post) { //done
        return $http.post(mmBaseUrl + '/posts', post, getConfig());
    };
    mmApi.postDeleteChatPost = function(postId) { //done
        return $http.delete(mmBaseUrl + '/posts/' + postId, getConfig());
    };
    mmApi.updateChatPost = function(post) { //done
        return $http.put(mmBaseUrl + '/posts/' + post.id, post, getConfig());
    };
    mmApi.getSinglePost = function(postId) { //done
        return $http.get(mmBaseUrl + '/posts/' + postId, getConfig());
    };
    mmApi.getFileInfoPosts = function(postsId) {
        return $http.get(mmBaseUrl + '/posts/' + postsId + '/files/info', getConfig());
    };
    mmApi.patchPost = function(data, postId) { //done
        return $http.put(mmBaseUrl + '/posts/' + postId + '/patch', data, getConfig());
    };


    //Files Routes
    mmApi.sendFile = function(data) { //done
        return $http.post(mmBaseUrl + '/files', data, getUploadConfig());
    };
    mmApi.getPublicLink = function(fileId) { //done
        return $http.get(mmBaseUrl + '/files/' + fileId + '/link', getConfig());
    };
    mmApi.getFile = function(fileId) { //done
        return $http.get(mmBaseUrl + '/files/' + fileId, getConfig());
    };
    mmApi.getFileMetaData = function(fileId) { //done
        return $http.get(mmBaseUrl + '/files/' + fileId + '/info', getConfig());
    };
    mmApi.getFileThumbnail = function(fileId) { //done
        return $http.get(mmBaseUrl + '/files/' + fileId + '/thumbnail', getConfig());
    };
    mmApi.getFilePreview = function(fileId) { //done
        return $http.get(mmBaseUrl + '/files/' + fileId + '/preview', getConfig());
    };

    //search Routes
    mmApi.postChatSearch = function(data) { //done
        return $http.post(mmBaseUrl + '/teams/' + $rootScope.teamId + '/posts/search',
            data, getConfig());
    };

    //Admin Routes
    mmApi.getAllTeams = function(page, perPage) { //done
        if (!page) page = 0;
        if (!perPage) perPage = 60;
        return $http.get(mmBaseUrl + '/teams?page=' + page + '&per_page=' + perPage,
            getConfig());
    };

    mmApi.getUserByUsername = function(username) {
        return $http.get(mmBaseUrl + '/users/email/' + username, getConfig());
    };

    mmApi.getUsersTeams = function(userId) {
        return $http.get(mmBaseUrl + '/users/' + userId + '/teams', getConfig());
    };

    return mmApi;
});
