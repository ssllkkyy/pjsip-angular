'use strict';

proySymphony.factory('bridgeAnalyticsService', function(dataFactory, $rootScope, _, __env, contactService, userService) {
    var service = {
        domainUuid: null,
        selectedLocationUuid: null,
        filterByUser: false,
        selectedUserUuid: null,
        dateFrom: null,
        dateTo: null,
        calls: [],
        serviceCalls: {},
        messages: [],
        selectedDay: null,
        dayHourlyActivity: [],
        dayHourlyActivityDetail: [],
        users: [],
        locations: [],
        onAfterInitCallbacks: [],
        onAfterDataShowingChanges: [],
        onAfterInitCalls: [],
        onAfterInitMessages: [],
        dataShowing: null,
        initialized: false,
        callType: null
    };

    service.init = function() {
        service.domainUuid = $rootScope.user.domain_uuid;
        service.today();
        return dataFactory.getLocationGroupsForUser(service.domainUuid).then(function(
            response) {
            if (response.data.success) {
                if (userService.isAdminGroupOrGreater()) {
                    service.locations = response.data.success.data;
                } else {
                    function isManagerOfLocation(loc) {
                        return (loc.ismanager || loc.isuser);
                    };
                    service.locations = response.data.success.data.filter(
                        isManagerOfLocation);
                }
                service.getUsersInLocations();
                if (__env.enableDebug) console.log("ANALYTICS LOCATIONS");
                if (__env.enableDebug) console.log(service.locations);
                executeCallBacks();
                service.initialized = true;
            }
            return true;
        });
    };

    service.getUsersInLocations = function() {
        var userArr = [];
        service.users = [];
        angular.forEach(service.locations, function(location) {
            if (location.ismanager) {
                angular.forEach(location.members, function(member) {
                    if (userArr.indexOf(member.user_uuid) === -1) {
                        userArr.push(member.user_uuid);
                        var contact = contactService.getContactByUserUuid(
                            member.user_uuid);
                        service.users.push(contact);
                    }
                });
                angular.forEach(location.managers, function(member) {
                    if (userArr.indexOf(member.user_uuid) === -1) {
                        userArr.push(member.user_uuid);
                        var contact = contactService.getContactByUserUuid(
                            member.user_uuid);
                        if (contact) service.users.push(contact);
                    }
                });
            } else if (location.isuser) {
                userArr.push($rootScope.user.user_uuid);
            }
        });
        service.users = userArr;
    };

    service.getAllUsersInLocation = function(location) {
        var userArr = [];
        if (location.ismanager) {
            angular.forEach(location.members, function(member) {
                if (userArr.indexOf(member.user_uuid) === -1) {
                    userArr.push(member.user_uuid);
                }
            });
            angular.forEach(location.managers, function(member) {
                if (userArr.indexOf(member.user_uuid) === -1) {
                    userArr.push(member.user_uuid);
                }
            });
        } else if (location.isuser) {
            userArr.push($rootScope.user.user_uuid);
        }
        return userArr;
    };

    // service.init2 = function() {
    //     service.domainUuid = $rootScope.user.domain_uuid;
    //     service.today();
    //     dataFactory.getUserInfos(service.domainUuid).then(function(response){
    //         if(response.data.success){
    //             service.users = response.data.success.data;
    //             dataFactory.getLocationGroupsForUser(service.domainUuid).then(function(response){
    //                 if(response.data.success){
    //                     function isManagerOfLocation(loc) { return loc.ismanager; };
    //                     service.locations = response.data.success.data.filter(isManagerOfLocation);
    //                     executeCallBacks();
    //                 }
    //             });
    //         }
    //     });
    // };

    service.setDataShowing = function(filter, dateFrom, dateTo, user, location, calltype) {
        service.dataShowing = filter;
        service.dateFrom = dateFrom;
        service.dateTo = dateTo;
        service.callType = calltype;
        if (user) {
            service.selectedUserUuid = user.user_uuid;
        }
        if (location) {
            service.selectedLocationUuid = location.locations_group_uuid;
        }
        executeDataShowingUpdates();
    };

    service.loadCallHistoryInfo = function(data) {
        return dataFactory.getCallHistoryInfo(data).then(function(response) {
            if (__env.enableDebug) console.log(response);
            if (response.data.success) {
                service.calls = response.data.success.data.calls;
                executeCallsCallbacks();
                return response.data.success.data;
            } else {
                service.calls = [];
                return null;
            }
        }).catch(function(error) {
            console.log(error);
        });
    };

    service.loadTextMessagesHistoryInfo = function(data) {
        return dataFactory.getTextMessagesHistoryInfo(data).then(function(response) {
            console.log(response.data);
            if (response.data.success) {
                service.messages = response.data.success.data.messages;
                executeMessagesCallbacks();
                return response.data.success.data;
            } else {
                return null;
            }
        }).catch(function(error) {
            console.log(error);
        });
    };

    service.loadDailyDetailedInfo = function(data) {
        return dataFactory.getDailyDetailedCallsInfo(data).then(function(response) {
            console.log(response.data);
            if (response.data.success) {
                return response.data.success.data;
            } else {
                return null;
            }
        }).catch(function(error) {
            console.log(error);
        });
    };


    service.getMissedCallsCountForExt = function(extension_uuid) {
        return dataFactory.getMissedCallCount(extension_uuid).then(function(response) {
            if (response.status === 200) {
                return response.data;
            } else {
                return null;
            }
        });
    };

    function executeCallBacks() {
        service.onAfterInitCallbacks.forEach(function(element) {
            element();
        });
    };

    function executeCallsCallbacks() {
        service.onAfterInitCalls.forEach(function(element) {
            element();
        });
    };

    function executeMessagesCallbacks() {
        service.onAfterInitMessages.forEach(function(element) {
            element();
        });
    };

    function executeDataShowingUpdates() {
        service.onAfterDataShowingChanges.forEach(function(element) {
            element();
        });
    };

    service.today = function() {
        service.selectedDay = new Date();
    };

    service.registerOnAfterInitCallback = function(callback) {
        service.onAfterInitCallbacks.push(callback);
    };

    service.registerOnAfterInitCallsCallback = function(callback) {
        service.onAfterInitCalls.push(callback);
    };

    service.registerOnAfterInitMessagesCallback = function(callback) {
        service.onAfterInitMessages.push(callback);
    };

    service.registerOnAfterDataShowingChangesCB = function(callback) {
        service.onAfterDataShowingChanges.push(callback);
    };

    service.init();
    return service;
});
