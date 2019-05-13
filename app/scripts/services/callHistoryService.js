'use strict';

proySymphony.service('callHistoryService', function($window, usefulTools, dataFactory,
    contactService, $rootScope) {

    var service = {};

    service.processCall = function(call) {
        if ($rootScope.callHistory.user_uuid !== $rootScope.user.id) {
            // contacts = $rootScope.emulatedUserContacts;
            // noncontacts = $rootScope.emulatedNonContacts;
            var emulatedContact = contactService.getContactByUserUuid($rootScope.callHistory
                .user_uuid);
            // userExtension = emulatedContact.extension;
        }
        // call.isContact = false;
        call.contact_name = null;
        call.isUser = false;
        call.contact = null;
        if (call.call_direction === 'outbound') call.contact_number = call.destination_number;
        if (call.call_direction === 'inbound') call.contact_number = call.caller_id_number;
        if (call.contact_uuid === undefined || call.contact_uuid === 'undefined') call.contact_uuid =
            null;

        if (call.description == null || call.description == "") {
            call.description = '';
            if ((parseInt(call.destination_number) >= 10000 && parseInt(call.destination_number) <
                    10100) || call.destination_number === '1' + call.caller_id_number)
                call.description = '(Conference Call)';
            if (call.destination_number === '10' + call.caller_id_number) call.description =
                '(Three-way Call)';
        }

        if (call.isContact && call.contact && call.contact.contact_uuid == $rootScope.user
            .contact_uuid) call.isUser = true;
        return call;
    };

    service.isPhoneNumber = function(text) {
        return usefulTools.isPhoneNumber(text);
    };

    service.getCallHistory = function() {
        $rootScope.showTable = false;
        $rootScope.loading = true;
        var callHistory = $rootScope.callHistory;
        if (!$rootScope.user) $rootScope.user = JSON.parse($window.localStorage.getItem(
            "currentUser"));
        if (!callHistory.user_uuid) callHistory.user_uuid = $rootScope.user.id;
        var data = {
            user_uuid: callHistory.user_uuid,
            from_date: (callHistory.fromDate ? callHistory.fromDate : new Date(
                moment().subtract(30, 'days'))),
            to_date: (callHistory.toDate ? callHistory.toDate : new Date())
        };
        $rootScope.loading = true;
        return dataFactory.postGetCallHistory(data)
            .then(function(response) {
                var calls = [];
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                } else {
                    if (__env.enableDebug) console.log("HISTORY");
                    if (__env.enableDebug) console.log(response.data.success.calls);

                    calls = response.data.success.calls;
                    angular.forEach(calls, function(test) {
                        if (test.call_status == 'answered' || test.call_status ==
                            'unanswered' || test.call_status == 'declined') {
                            test['callstat'] = test.call_direction + test.call_status;
                        } else {
                            test['callstat'] = test.call_status;
                        }
                    });
                    if (calls) {
                        angular.forEach(calls, function(call) {

                            //console.log("SGJ TEST: CALL OBJECT DATA: " + JSON.stringify(call));

                            call = service.processCall(call);
                            if (call.contact_name == undefined) {
                                call['from_to'] = call.contact_number;
                            } else {
                                call['from_to'] = call.contact_name;
                            }
                        });
                    }
                }
                $rootScope.showTable = true;
                $rootScope.loading = false;
                return calls;
            });
    };

    service.getAgencyCallHistory = function() {
        $rootScope.showTable = false;
        $rootScope.loading = true;
        var agencyCallHistory = $rootScope.agencyCallHistory;
        var data = {
            from_date: (agencyCallHistory.fromDate ? agencyCallHistory.fromDate :
                new Date(moment().subtract(30, 'days'))),
            to_date: (agencyCallHistory.toDate ? agencyCallHistory.toDate : new Date())
        };
        console.log(data);
        $rootScope.loading = true;
        return dataFactory.postGetAgencyCallHistory(data)
            .then(function(response) {
                var calls = [];
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                } else {
                    if (__env.enableDebug) console.log("HISTORY");
                    if (__env.enableDebug) console.log(response.data.success.calls);
                    // return;
                    calls = response.data.success.calls;
                    angular.forEach(calls, function(test) {
                        if (test.call_status == 'answered' || test.call_status ==
                            'unanswered' || test.call_status == 'declined') {
                            test['callstat'] = test.call_direction + test.call_status;
                        } else {
                            test['callstat'] = test.call_status;
                        }
                    });
                    if (calls) {
                        angular.forEach(calls, function(call) {

                            //console.log("SGJ TEST: CALL OBJECT DATA: " + JSON.stringify(call));

                            call = service.processCall(call);
                            if (call.contact_name == undefined) {
                                call['from_to'] = call.contact_number;
                            } else {
                                call['from_to'] = call.contact_name;
                            }
                        });
                    }
                }
                $rootScope.showTable = true;
                $rootScope.loading = false;
                return calls;
            });
    };

    return service;
});
