'use strict';

proySymphony.service('conferenceService', function($filter, $rootScope, __env, dataFactory) {

    var service = {
        availConferenceRooms: [],
        availDids: [],
        availLocations: {},
        currentLocation: null,
        currentConference: null,
        callbackEvents: ['onAfterLoadGroups', 'onAfterGroupDelete'],
        locationGroupsForUser: null,
        conferenceLocked: false,
        muteall: false,
        recordingActive: false
    };

    service.getConferenceSetup = function(refresh) {
        return dataFactory.getConferenceInfoForUser()
            .then(function(response) {
                console.log("Conference Info");
                console.log(response.data);
                if (response.data.success) {
                    service.availConferenceRooms = response.data.success.conferences;
                    service.availLocations = response.data.success.locations;
                    service.availDids = response.data.success.dids;
                    if (!refresh) return true;
                    if (refresh && service.availConferenceRooms.length > 0) {
                        var conference = service.getActiveConference();
                        if (conference === null) conference = service.availConferenceRooms[
                            0];
                        service.currentConference = conference;
                        service.currentLocation = conference.location_group_uuid;
                        if (service.currentConference.members) {
                            $rootScope.$broadcast('conference.call.started');
                        }
                        $rootScope.$broadcast('conference.info.change', conference);
                        return service.currentConference;
                    }
                    return true;
                } else {
                    return false;
                }
            });
    };

    service.setCurrentLocation = function(location_group_uuid) {
        service.currentLocation = location_group_uuid;
        var conferences = $filter('filter')(service.availConferenceRooms, {
            location_group_uuid: location_group_uuid
        });
        if (conferences.length > 0) {
            var conference = conferences[0]
            service.setCurrentConference(conference.conference_room_uuid);
        } else {
            service.currentConference = null;
        }
    };

    service.setCurrentConference = function(conference_room_uuid) {
        var conference;
        var index = $filter('getByUUID')(service.availConferenceRooms,
            conference_room_uuid, 'conference_room');
        if (index !== null) conference = service.availConferenceRooms[index];
        // var conference = $filter('filter')(service.availConferenceRooms, {conference_room_uuid: conference_room_uuid});
        if (conference) {
            service.getMemberList(conference.conference_room_uuid)
                .then(function(response) {
                    conference.members = response;
                    service.currentConference = conference;
                    conferenceInit(service, $rootScope.user);
                    $rootScope.$broadcast('conference.info.change', conference);
                });
        }
    };

    service.getMemberList = function(conference_room_uuid) {
        return dataFactory.getConferenceRoomMemberList(conference_room_uuid)
            .then(function(response) {
                // ***III
                if (response.data.success) {
                    var members = response.data.success.data;
                    if (members.userList || members.userList === null) members = members.userList;
                    if ( (members || members === null) && service.currentConference &&
                        conference_room_uuid === service.currentConference.conference_room_uuid
                    ) {
                        service.currentConference.members = members;
                        return members;
                    }
                }
                return null;
            });
    };

    service.getActiveConference = function() {
        var i, input = service.availConferenceRooms;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].members && input[i].members.length > 0) {
                var j, members = input[i].members;
                for (j = 0; j < members.length; j += 1) {
                    if (members[j].cidNumber === $rootScope.user.user_ext) {
                        return input[i];
                    }
                }
            }
        }
        return service.getDefaultConference();
    };

    service.startConference = function() {
        var conference = service.currentConference;
        service.currentConference.available = false;
        dataFactory.getFlagConferenceStarted(conference.conference_room_uuid);
        $rootScope.$broadcast('conference.call.started');
    };

    service.endConference = function(conferenceUuid) {
        if (!conferenceUuid) conferenceUuid = service.currentConference.conference_room_uuid;
        dataFactory.getEndConference(conferenceUuid)
            .then(function(response) {
                service.currentConference.members = null;
                $rootScope.$broadcast('conference.call.ended');
            });
    };

    service.getConferenceByExtension = function(extension) {
        var i, input = service.availConferenceRooms;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].mod_extension === extension) return input[i];
        }
        return null;
    };

    service.endConferenceByExtension = function(ext) {
        var conference = service.getConferenceByExtension(ext);
        if (conference) {
            dataFactory.getEndConference(conference.conference_room_uuid)
                .then(function(response) {
                    service.currentConference.members = null;
                    $rootScope.$broadcast('conference.call.ended');
                });
        }
    };

    service.getEnd3wayConference = function(confName) {
        dataFactory.getEndConferenceByName(confName)
            .then(function(response) {
                console.log(response);
            });
    };

    service.handleConferenceEvent = function(event) {
        switch (event.eventtype) {
            case 'conference-room-inuse':
                updateConferenceDetails(event.conference_room_uuid, 'available', false);
                break;
            case 'conference-room-available':
                updateConferenceDetails(event.conference_room_uuid, 'available', true);
                break;
            case 'conference-room-event':
                console.log('conference-room-event');
                service.getConferenceSetup(false)
                    .then(function(response) {
                        service.setCurrentConference(service.currentConference.conference_room_uuid);
                    });
                break;
            case 'conference-room-new':
                if (!service.currentConference || service.currentConference.conference_room_uuid !==
                    event.conference_room_uuid) {
                    service.getConferenceSetup(false);
                }
                break;
            default:
                break;
        }
    };

    service.getConferenceByUuid = function(conferenceUuid) {
        var index = $filter('getByUUID')(service.availConferenceRooms, conferenceUuid,
            'conference_room');
        if (index !== null) return service.availConferenceRooms[index];
        return null;
    };

    function updateConferenceDetails(conferenceUuid, property, value) {
        console.log(property);
        console.log(value);
        var conference = service.getConferenceByUuid(conferenceUuid);
        if (conference) {
            conference[property] = value;
            console.log(conference);
            if (service.currentConference.conference_room_uuid === conferenceUuid) service.currentConference[
                property] = value;
        }
    };

    service.createNewConferenceRoom = function(data) {
        return dataFactory.postCreateNewConferenceRoom(data)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    var conference = response.data.success.data;
                    service.availDids.push(conference.conference_did);
                    service.availConferenceRooms.push(conference);
                    service.setCurrentConference(conference.conference_room_uuid);

                }
                return response;
            });
    };

    service.removeCurrentConferenceRoom = function() {
        return dataFactory.getDeleteConferenceRoom(service.currentConference.conference_room_uuid)
            .then(function(response) {
                if (response.data.success) {
                    var uuid = service.currentConference.conference_room_uuid;
                    var index = $filter('getByUUID')(service.availConferenceRooms,
                        uuid, 'conference_room');
                    if (index !== null) service.availConferenceRooms.splice(index,
                        1);
                    var conference = service.getDefaultConference();
                    if (conference === null) {
                        if (service.availConferenceRooms.length > 0) conference =
                            service.availConferenceRooms[0];
                    }
                    service.setCurrentConference(conference.conference_room_uuid);
                }
                return response;
            });
    };

    service.getDefaultConference = function() {
        return service.getConferenceByExtension('10000');
    };

    service.addParticipantsToConference = function(participants, callFrom) {
        var data = {
            participants: participants,
            conference_room_uuid: service.currentConference.conference_room_uuid,
            callFrom: callFrom
        };
        return dataFactory.postAddParticipantsToConference(data)
            .then(function(response) {
                if (response.data.success) {
                    return true;
                } else {
                    return response.data.error.message;
                }
            });
    };

    service.toggleParticipantMute = function(action, userNumber) {
        var data = {
            action: action,
            userNumber: userNumber,
            confName: service.currentConference.conference_name + '@' + $rootScope.user
                .domain.domain_name
        };
        return dataFactory.postToggleParticipantMute(data)
            .then(function(response) {
                console.log(response);
                return response;
            });
    };

    service.hangupParticipant = function(userNumber) {
        var data = {
            userNumber: userNumber,
            confName: service.currentConference.conference_name + '@' + $rootScope.user
                .domain.domain_name
        };
        return dataFactory.postHangupParticipant(data)
            .then(function(response) {
                console.log(response);
                return response;
            });
    };

    service.lockConference = function() {
        var confName = service.currentConference.conference_name + '@' + $rootScope.user
            .domain.domain_name;
        dataFactory.getLockConference(confName)
            .then(function(response) {
                service.conferenceLocked = true;
            });
    };

    service.unlockConference = function() {
        var confName = service.currentConference.conference_name + '@' + $rootScope.user
            .domain.domain_name;
        dataFactory.getUnlockConference(confName)
            .then(function(response) {
                service.conferenceLocked = false;
            });
    };

    service.muteAllConference = function() {
        var confName = service.currentConference.conference_name + '@' + $rootScope.user
            .domain.domain_name;

        dataFactory.getMuteAllConference(confName)
            .then(function(response) {
                service.muteall = true;
            });
    };

    service.unmuteAllConference = function() {
        var confName = service.currentConference.conference_name + '@' + $rootScope.user
            .domain.domain_name;
        dataFactory.getUnmuteAllConference(confName)
            .then(function(response) {
                service.muteall = false;
            });
    };

    service.isAdminGroupOrGreater = function() {
        var group = $rootScope.user.accessgroup;
        return (group === 'admin' || group === 'superadmin');
    };

    service.clearInfo = function() {
        service.availLocations = [];
        service.currentLocation = null;
        service.availConferenceRooms = [];
        service.availDids = [];
        service.availLocations = {};
        service.currentLocation = null;
        service.currentConference = null;
    };

    return service;
});
