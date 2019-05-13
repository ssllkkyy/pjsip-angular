'use strict';

proySymphony.factory('smsApi', ['$http', '__env', 'symphonyConfig', '$window', '$rootScope',
    '$location', '$q',
    function($http, __env, symphonyConfig, $window, $rootScope, $location, $q) {

        var urlBase = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl : symphonyConfig.onescreenUrl);

        function getConfig() {
            var config = '';
            if ($rootScope.userToken && $rootScope.userToken != '') {
                config = {
                    headers: {
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    }
                };
            } else if ($window.localStorage.getItem("userToken") && $window.localStorage.getItem(
                    "userToken") != '') {
                $rootScope.userToken = $window.localStorage.getItem("userToken");
                config = {
                    headers: {
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    }
                };
            }
            return config;
        }

        function getUploadConfig() {
            var config = '';
            if ($rootScope.userToken && $rootScope.userToken != '') {
                config = {
                    headers: {
                        'Content-Type': undefined,
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    },
                    transformRequest: angular.identity
                };
            } else if ($window.localStorage.getItem("userToken") && $window.localStorage.getItem(
                    "userToken") != '') {
                $rootScope.userToken = $window.localStorage.getItem("userToken");
                config = {
                    headers: {
                        'Content-Type': undefined,
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    },
                    transformRequest: angular.identity
                };
            }
            return config;
        }
        var smsApi = {
            //Retrieve Info functions
            getSmsThreads: function(uuid) {
                return $http.get(urlBase + '/sms/threads/' + uuid, getConfig());
            },
            getSmsUnreadMessageCount: function() {
                return $http.get(urlBase + '/sms/unreadcounts', getConfig());
            },
            postGetSmsThreads: function(data) {
                return $http.post(urlBase + '/sms/getthreads', data, getConfig());
            },
            postGetSmsMessagesByThread: function(data) {
                return $http.post(urlBase + '/sms/threads/getmessages', data, getConfig());
            },
            // getThreadsByLocation: function(location_group_uuid) {
            //     return $http.get(urlBase + '/sms/threadsbylocation/' +
            //         location_group_uuid, getConfig());
            // },
            postGetSmsThreadsByLocation: function(data){
                return $http.post(urlBase + '/sms/getlocationthreads', data, getConfig());
            },
            getHandleMessage: function(message_uuid) {
                return $http.get(urlBase + '/sms/handlemessage/' + message_uuid,
                    getConfig());
            },
            postAssignMessages: function(data) {
                return $http.post(urlBase + '/sms/assign', data, getUploadConfig());
            },
            getSmsTextsbyThread: function(thread_uuid, uuid, last) {
                return $http.get(urlBase + '/sms/thread/' + thread_uuid +
                    '/messages/' + uuid + '/asc?last=' + last, getConfig());
            },
            getSetThreadRead: function(thread_uuid, uuid) {
                return $http.get(urlBase + '/sms/thread/messages/markread/' +
                    thread_uuid + '/' + uuid, getConfig());
            },
            getSmsThreadInfo: function(thread_uuid, user_uuid) {
                return $http.get(urlBase + '/sms/thread/' + thread_uuid + '/' +
                    user_uuid, getConfig());
            },
            //Submit Info to api
            createNewSmsNumber: function(number) {
                return $http.post(urlBase + '/sms/createnumber', number, getConfig());
            },
            createRandomSmsNumber: function(data) {
                return $http.post(urlBase + '/sms/createrandomnumber', data,
                    getConfig());
            },
            sendSmsMessage: function(message) {
                return $http.post(urlBase + '/sms/send', message, getConfig());
            },
            getAvailNumbers: function(params) {
                return $http.post(urlBase + '/sms/getavailnumbers', params,
                    getConfig());
            },
            postUpdateThreadContact: function(data) {
                return $http.post(urlBase + '/sms/thread/contact/update', data,
                    getConfig());
            },
            postUpdateThread: function(thread) {
                return $http.post(urlBase + '/sms/thread/update', thread, getConfig());
            },
            postSearchMessages: function(data) {
                return $http.post(urlBase + '/sms/search', data, getConfig());
            },
            postGetSearchResult: function(data) {
                return $http.post(urlBase + '/sms/getsearchrange', data, getConfig());
            },
            postSearchMasterSmsMessages: function(data) {
                return $http.post(urlBase + '/sms/search/master', data, getConfig());
            },
            getRemoveSmsMessage: function(uuid) {
                return $http.get(urlBase + '/sms/removemessage/' + uuid, getConfig());
            },
            getSetMessageRead: function(uuid) {
                return $http.get(urlBase + '/sms/read/' + uuid + '/' + $rootScope.user
                    .id, getConfig());
            },
            updateThreadCount: function(thread_uuid) {
                return $http.get(urlBase + '/sms/read/thread/' + thread_uuid + '/' +
                    $rootScope.user.id, getConfig());
            },
            getRemoveSmsThread: function(uuid) {
                return $http.get(urlBase + '/sms/removethread/' + uuid, getConfig());
            },
            postRemoveMultipleThreads: function(data) {
                return $http.post(urlBase + '/sms/removemultiplethreads', data,
                    getConfig());
            },
            postManageBlacklist: function(data) {
                return $http.post(urlBase + '/sms/blacklist/add', data, getConfig());
            },
            getRemoveBlacklist: function(uuid) {
                return $http.get(urlBase + '/sms/blacklist/remove/' + uuid,
                    getConfig());
            },
            getBlacklistedNumbers: function(user_uuid) {
                return $http.get(urlBase + '/sms/blacklist/' + user_uuid, getConfig());
            },
            postUpdateSmsForwardDest: function(data) {
                return $http.post(urlBase + '/sms/updatesmsforwarddest', data,
                    getConfig());
            }

        }

        return smsApi;
    }
]);
