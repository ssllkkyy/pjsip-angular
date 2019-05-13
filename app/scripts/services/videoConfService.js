'use strict';

proySymphony.service('videoConfService', function(__env, $rootScope, $auth, $cookies, $window, _, dataFactory, symphonyConfig, metaService, $q) {

    var service = {
        audioLibraries: [],
        videoConference: makeRoomModel(),
        shareConference: makeRoomModel(),
        proposalConference: makeRoomModel(),
        videoBeingRetrieved: false,
        shareBeingRetrieved: false,
        inviteActions: {},
        callbackEvents: ["onAfterInit"],
    };

    var triggerEvent = metaService.withCallbacks(service);
    service.init = function() { // gets called at end of file
        var promises = [];
        promises.push(service.getCurrentRoom('share'));
        promises.push(service.getCurrentRoom('video'));
        promises.push(service.getCurrentRoom('proposal'));
        return $q.all(promises).then(function() {
            triggerEvent("onAfterInit");
        });
    };

    service.openConference = function(url) {
        $window.open(url);
    };

    service.getCurrentRoom = function(roomType) {
        service[roomType + 'BeingRetrieved'] = true;
        return dataFactory.getVidConfRoom(roomType)
            .then(function(response) {
                service[roomType + 'BeingRetrieved'] = false;
                if (response.data.success) {
                    var conferenceData = response.data.success.data;
                    var conference = service[roomType + 'Conference'];
                    angular.copy(conferenceData, conference);
                    return {
                        status: true,
                        data: conference
                    };
                } else {
                    return {
                        status: false,
                        message: response.data.error.message
                    };
                }
            });
    };

    service.isRoomAvailable = function(roomName, roomType) {
        return dataFactory.claimVidConfRoom(roomName, roomType).then(function(response) {
            if (response.data.success) {
                var conferenceData = response.data.success.data;
                var conference = service[roomType + 'Conference'];
                angular.copy(conferenceData, conference);
                return {
                    status: true,
                    data: conference
                };
            } else {
                return {
                    status: false,
                    message: response.data.error.message
                };
            }
        });
    };

    function makeRoomModel() {
        return Object.defineProperties({}, {
            room: {
                get: function() { return this.room_name; }
            }
        });
    };

    service.roomBeingRetrieved = function(roomType) {
        return !service[roomType + 'BeingRetrieved'];
    };

    service.currentVideoUrl = function() {
        var vcUrl = __env.vcUrl && __env.vcUrl !== '' ? __env.vcUrl : symphonyConfig.vcUrl;
        return vcUrl + '/' + service.videoConference.room;
    };

    service.sendVideoInvite = function(contact) {
        console.log(contact);
        var data = {
            invite: {
                recipient_uuid: contact.user_uuid,
                sender_uuid: $rootScope.user.id,
                room_url: service.currentVideoUrl()
            },
            user_uuid: $rootScope.user.id,
            domain_uuid: $rootScope.user.domain_uuid
        };
        if (testing()) {
            data.invite.recipient_uuid = $rootScope.user.id;
        }
        dataFactory.sendTokboxInvite(data);
        service.openConference(data.invite.room_url, data);
    };

    function testing() {
        return (__env.vcUrl && __env.vcUrl === 'http://localhost:9000') || __env.testingVideoInvite;
    };

    metaService.registerOnRootScopeUserLoadCallback(function() {
        service.init();
    });

    return service;
});
