'use strict';

proySymphony.controller('CallCenterCtrl', function($window, $scope, dataFactory, $rootScope,
    contactService, $filter, $timeout, $interval, $location, newPusherService, newChatService, metaService,
    callService, statusService, $uibModalStack, locationService, userService, videoConfService, emailService, symphonyConfig) {

    $scope.loading = true;
    $scope.showEditContactForm = contactService.editContact;
    
    function preInit() { // called at bottom
        // register non function scope vars
        $scope.centerInfo = {};
        $scope.oldCenterInfo = [];
        $scope.dataEventHandlers = {};
        $scope.eventHistory = [];
        $scope.tableControls = tableControls;
        $scope.searchControls = searchControls;
        metaService.registerOnRootScopeUserLoadCallback(init);
    };

    function init() {
        // register freeswitch event handlers
        registerInfoDataEventHandlers();
        // register to load users on relevant events
        $rootScope.$on('user.contacts.set', $scope.loadUsers);
        $rootScope.$on('contacts.updated', $scope.loadUsers);
        // watches
        $scope.$watchCollection('searchControls', function() {
            refreshFilteredUsers('init-watch-searchControls');
        });
        $scope.$watchCollection('tableControls.sortingOpts', function() {
            refreshFilteredUsers('init-watch-sortingOpts');
        });
        // initial userContactsOnly load takes a little while
        $timeout(function() {
            $scope.loading = false;
        }, 5000);
        var centerInfoChannelName = "call-center-status-" + $rootScope.user.domain_uuid;
        var centerInfoRegistrationData = {
            channelName: "call-center-status-" + $rootScope.user.domain_uuid,
            eventName: 'CallCenterStatusEvent',
            handler: centerInfoDataHandler
        };
        $scope.refreshCenterInfo().then(function() {
            registerCallCenterStateHandler(centerInfoRegistrationData);
            newPusherService.registerHandler(contactStatusChangeRegistrationData,
                true);
        });
        $scope.$on('$destroy', function() {
            newPusherService.unregisterHandler(centerInfoRegistrationData);
            newPusherService.unregisterHandler(centerInfoRegistrationData);
        });
    };

    // scope declarations
    $scope.transitionState = transitionState;
    $scope.getActionStyle = getActionStyle;
    $scope.refreshCenterInfo = refreshCenterInfo;
    $scope.loadUsers = loadUsers;
    $scope.refreshFilteredUsers = refreshFilteredUsers;
    $scope.filteredUsersLength = filteredUsersLength;
    $scope.inboundOutboundSource = inboundOutboundSource;
    $scope.onLocationChange = onLocationChange;
    $scope.userIsOnCall = userIsOnCall;
    $scope.currentUserIsOnCall = currentUserIsOnCall;
    $scope.getActionTooltip = getActionTooltip;

    // user-contact control fns
    $scope.sendVideoInvite = videoConfService.sendVideoInvite;
    $scope.startEmailClient = emailService.startEmailClient;

    $scope.getStyleObj = function(colName, user) {
        var callLegInfo = $scope.centerInfo[user.ext];
        return {
            "dual-col": true
        };
    };



    $scope.getInOutStyleObj = function(user) {
        var callLegInfo = $scope.centerInfo[user.ext];
        if (callLegInfo && callLegInfo.length > 1) {
            return {
                "padding": 0
            };
        } else {
            return {};
        }
    };

    // core fns

    function registerCallCenterStateHandler(registrationData) {
        newPusherService.registerHandler(registrationData);
    };

    // callCenterStatusEvent Handler
    function centerInfoDataHandler(data, channel) {
        var event = data.statusevent;
        var eventHandler = getCenterInfoDataEventHandler(event);
        trimEvent(event);
        $scope.eventHistory.push(event);
        if (eventHandler) {
            eventHandler(event);
        }
    };

    $scope.operatorTransfer = function(user) {
        var ownExt = $rootScope.user.user_ext;
        var ownActiveCall = $scope.getActiveCall(ownExt);
        var ownHeldCall = $scope.getHeldCall(ownExt);

        if ( ownActiveCall && $scope.isConferenceCall(ownActiveCall)){
            $rootScope.showErrorAlert("Merged / Conference Calls cannot be transferred.");
        } else if (ownActiveCall && !$scope.isConferenceCall(ownActiveCall)){
            $scope.transferCall(ownActiveCall, user.ext);
        } else if (!ownActiveCall && ownHeldCall && $scope.isConferenceCall(ownHeldCall)){
            $rootScope.showErrorAlert("Merged / Conference Calls cannot be transferred.");
        } else if ( !ownActiveCall && ownHeldCall && !$scope.isConferenceCall(ownHeldCall)){
            $scope.transferCall(ownHeldCall, user.ext);
        } else if ( !ownActiveCall && !ownHeldCall){
            $rootScope.showErrorAlert("You do not have a call to transfer.");
        } else {
            $rootScope.showErrorAlert("Something went wrong with your transfer.");
        }
    };

    $scope.transferCall = function(call, extension) {
        callService.setCustomVariable(call, 'blind', extension);
        $timeout(function() {
            callService.blindTransfer(extension);
        }, 500);
    };

    $scope.isConferenceCall = function(call) {
        if ( (call.calleeNum.length === 5) && (call.buuid == [] || "00000000-0000-0000-0000-000000000000") ) {
            return true;
        }
        return false;
    };

    $scope.makeCall = function(number) {
        if (callService.currentCalls().length === 2) {
            var message =
                "You may only participate in two calls at a time. " +
                "Please hang up one of your calls if you would like to make " +
                "another.";
            $rootScope.showInfoAlert(message);
        } else {
            callService.makeCall(number);
        }
    };

    $scope.getCenterInfo = function() {
        return $scope.centerInfo;
    }

    $scope.getActiveCall = function(extension){
        var callArray = $scope.getCallArrayByExt(extension);
        if( callArray && callArray.length > 0){
            var activeCall = callArray.filter(checkForActiveCall)[0];
            if (activeCall && activeCall.calleeNum){
                return activeCall;
            } else {
                return false;
            }
        } else {
            return false;
        }
    };

    $scope.getHeldCall = function(extension) {
        var callArray = $scope.getCallArrayByExt(extension);
        if( callArray && callArray.length > 0){
            var heldCall = callArray.filter(checkForHeldCall)[0];
            if (heldCall && heldCall.calleeNum){
                return heldCall;
            } else {
                return false;
            }
        } else {
            return false;
        }
    };

    $scope.getCallArrayByExt = function(extension) {
        if ($scope.centerInfo && $scope.centerInfo[extension]){
            var callArray = $scope.centerInfo[extension];
            if( callArray && callArray.length > 0){
                return callArray;
            } else {
                return false;
            }
        } else {
            return false;
        }
    };

    $scope.ownCallIsPresent = function(){
        var ownExt = $rootScope.user.user_ext;
        return ($scope.getCallArrayByExt(ownExt) !== false);
    };

    $scope.showCorrectCallTile = function(user) {
        
        var activeCall = $scope.getActiveCall(user.ext);
        var heldCall = $scope.getHeldCall(user.ext);
        var calls = $scope.getCallArrayByExt(user.ext);
        if ( (!activeCall && !heldCall) || calls.length === 0) {
            return "none";
        } else if ( activeCall ) {
            if (activeCall.isTransferred == true && user.status == "Available"){
                if (calls){
                    for (var call in calls){
                        if (calls[call].hasOwnProperty('bUuid') && calls[call].buuid == activeCall.buuid) {
                            $scope.centerInfo[user.ext].splice(call, 1);
                        }
                    }
                }
            } else {
                return "active";
            }
        } else if (!activeCall && heldCall) {
            return "held";
        }
    };

    $scope.getDid = function(contact) {
        return contactService.getSmsNumber(contact);
    };

    function checkForActiveCall(call){
        return (call.hasOwnProperty("status") && call.status == "ACTIVE");
    };
    function checkForHeldCall(call){
        return (call.hasOwnProperty("status") && call.status == "HELD");
    }

    $scope.getStatusIcon = statusService.getStatusIcon;

    $scope.startDirectMessageFromContact = function(contact) {
        var channel = newChatService.getDMChannelByUserId(contact.chat_id);
        var member = newChatService.teamMembers[contact.chat_id];
        if (channel) {
            $scope.openChannel(channel);
            $scope.createDirectMessage(member);
        } else {
            $scope.createDirectMessage(member);
        }
    };

    $scope.createDirectMessage = function(member) {
        var channel = newChatService.getDMChannelByUserId(member.id);
        if (channel && !channel.showDirect) {
            $location.path('/chatplus');
            newChatService.activateDirectChannel(channel, member.id);
            $rootScope.showSuccessAlert(
                'Your direct message channel has been created.');
            $uibModalStack.dismissAll();
        } else if (!channel) {
            newChatService.createDirectChannel(member)
                .then(function(response) {
                    if (response) {
                        $scope.openChannel(response);
                        $rootScope.showSuccessAlert(
                            'Your direct message channel has been created.'
                        );
                    } else {
                        $rootScope.showErrorAlert(
                            'There was a problem creating the direct message channel.'
                        );
                    }
                    $uibModalStack.dismissAll();
                });
        }
    };

    $scope.openChannel = function(channel) {
        $location.path('/chatplus');
        newChatService.setCurrentChannel(channel);
    };

    $scope.filterEventHistory = function(vals) {
        return $scope.eventHistory.filter(function(event) {
            return _.every(vals, function(val) {
                var isMatch;
                Object.values(event).forEach(function(eventVal) {
                    if (eventVal.indexOf(val) > -1) {
                        isMatch = true;
                    }
                });
                return isMatch;
            });
        });
    };

    function trimEvent(event) {
        
        var allowedFields = [
            "caller_caller_id_number",
            "caller_destination_number",
            "channel_call_state",
            "channel_state",
            "date_local", 
            "event_name", 
            "other_leg", 
            "unique_uuid",
        ];
        Object.keys(event).forEach(function(key) {
            if (allowedFields.indexOf(key) === -1) {
                delete event[key];
            }
        });
        
    };

    function getCenterInfoDataEventHandler(event) {
        var registrationSite = $scope.dataEventHandlers[event.event_name];
        if (registrationSite) {
            registrationSite = registrationSite[event.channel_state];
            if (registrationSite) {
                var handler = registrationSite[event.channel_call_state];
                if (handler) {
                    return handler;
                }
            }
        }
        return null;
    };

    function registerCenterInfoDataEventHandler(opts, callback) {
        var registrationSite;
        if (!$scope.dataEventHandlers[opts.eventName]) {
            $scope.dataEventHandlers[opts.eventName] = {};
        }
        registrationSite = $scope.dataEventHandlers[opts.eventName];
        if (!registrationSite[opts.channelState]) {
            registrationSite[opts.channelState] = {};
        }
        registrationSite = registrationSite[opts.channelState];
        if (!registrationSite[opts.channelCallState]) {
            registrationSite[opts.channelCallState] = callback;
        }
    };

    function registerInfoDataEventHandlers() {
        registerCenterInfoDataEventHandler({
                eventName: "CHANNEL_CALLSTATE",
                channelState: "CS_HANGUP",
                channelCallState: "HANGUP"
            },
            function(event) {
                var centerInfo = centerStateToInfo(event);
                // var bothBridgeUsers = centerInfo.calleeNum.length === 3;
                removeCenterInfo(centerInfo.ext, "uuid", centerInfo.uuid);
            }
        );
        registerCenterInfoDataEventHandler({
                eventName: "CHANNEL_CALLSTATE",
                channelState: "CS_EXECUTE",
                channelCallState: "ACTIVE"
            },
            function(event) {
                var dest = event.caller_destination_number;
                var destLength = dest.length;
                if ((destLength === 4 && isParkingExt(dest)) || destLength === 5) {
                    if (isParkingExt(dest)) {
                        refreshCenterInfo();
                    } else {
                        addConferenceCenterInfo(event);
                    }
                } else {
                    addConferenceCenterInfo(event);
                }
            }
        );
        registerCenterInfoDataEventHandler({
                eventName: "CHANNEL_STATE",
                channelState: "CS_EXECUTE",
                channelCallState: "ACTIVE"
            },
            function(event) {
                var centerInfo = centerStateToInfo(event);
                if (event.caller_destination_number.indexOf("u:") > -1) {
                    $scope.refreshCenterInfo();
                }
            }
        );
        registerCenterInfoDataEventHandler({
                eventName: "CHANNEL_STATE",
                channelState: "CS_HANGUP",
                channelCallState: "ACTIVE"
            },
            function(event) {
                var centerInfo = centerStateToInfo(event);
                // var bothBridgeUsers = centerInfo.calleeNum.length === 3;
                removeCenterInfo(centerInfo.ext, "uuid", centerInfo.uuid, true);
            }
        );
        registerCenterInfoDataEventHandler({
                eventName: "CHANNEL_BRIDGE",
                channelState: "CS_EXECUTE",
                channelCallState: "ACTIVE"
            },
            function(event) {
                var centerInfo = centerStateToInfo(event);
                // var bothBridgeUsers = centerInfo.calleeNum.length === 3;
                var transferredInfo = _.find($scope.centerInfo[centerInfo.ext], ["uuid",
                    centerInfo.uuid
                ]);
                if (transferredInfo) {
                    transferredInfo.isTransferred = true;
                }
                var infos = _.flatten(Object.values($scope.centerInfo));
                infos.forEach(function(info) {
                    if (info.calleeNum === centerInfo.calleeNum && info.isTransferred &&
                        info.ext !== centerInfo.ext)
                        removeCenterInfo(
                            info.ext,
                            "uuid",
                            info.uuid
                        );
                });
            }
        );
        registerCenterInfoDataEventHandler({
                eventName: "CHANNEL_STATE",
                channelState: "CS_EXCHANGE_MEDIA",
                channelCallState: "ACTIVE"
            },
            function(event) {
                $scope.refreshCenterInfo();
            }
        );
        registerCenterInfoDataEventHandler({
                eventName: "CHANNEL_CALLSTATE",
                channelState: "CS_EXCHANGE_MEDIA",
                channelCallState: "ACTIVE"
            },
            function(event) {
                $scope.refreshCenterInfo();
            }
        );

        registerCenterInfoDataEventHandler({
            eventName: "CHANNEL_CALLSTATE",
            channelState: "CS_EXECUTE",
            channelCallState: "HELD"
            },
            function(event) {
                $scope.refreshCenterInfo();
            }
        );

        registerCenterInfoDataEventHandler({
            eventName: "CHANNEL_CALLSTATE",
            channelState: "CS_EXCHANGE_MEDIA",
            channelCallState: "HELD"
            },
            function(event) {
                $scope.refreshCenterInfo();
            }
        );
    }
        

    function addConferenceCenterInfo(event) {
        var ext = event.caller_caller_id_number;
        // var user = _.find($scope.users, ["extension", ext]);
        var contact = contactService.getContactByPhoneNumber(ext);
        if (contact) {
            var did = contact.did;
        }

        var infos = _.flatten(Object.values($scope.centerInfo));
        console.log(infos);
        
        infos.forEach(function(info) {
            if (info.calleeNum.indexOf(did) > -1 || info.calleeNum.indexOf(ext) > -
                1) {
                removeCenterInfo(info.ext, "calleeNum", info.calleeNum);
                var altEvent = angular.copy(event, {});
                altEvent.caller_caller_id_number = info.ext;
                addCenterInfo(altEvent);
            }
        });
        infos = $scope.centerInfo[ext];
        if (infos) {
            infos.forEach(function(info) {
                removeCenterInfo(info.ext, "uuid", info.uuid);
            });
        }
        addCenterInfo(event);
    };

    function addCenterInfo(event) {
        console.log("CENTER INFO ADDED");
        var centerInfo = centerStateToInfo(event);
        var bothBridgeUsers = (centerInfo.calleeNum.length === 3 || (centerInfo.calleeNum.length ===
            4 && !isParkingExt(centerInfo.calleeNum)));
        if (!$scope.centerInfo[centerInfo.ext]) {
            $scope.centerInfo[centerInfo.ext] = [];
        }
        if (!_.find($scope.centerInfo[centerInfo.ext], ["uuid", centerInfo.uuid]) &&
            !_.find($scope.centerInfo[centerInfo.ext], ["calleeNum", centerInfo.calleeNum])
        ) {
            $scope.centerInfo[centerInfo.ext].push(centerInfo);
            if (bothBridgeUsers) {
                var otherCenterInfo = angular.copy(centerInfo, {});
                otherCenterInfo.ext = centerInfo.calleeNum;
                otherCenterInfo.calleeNum = centerInfo.ext;
                if (!$scope.centerInfo[centerInfo.calleeNum]) {
                    $scope.centerInfo[centerInfo.calleeNum] = [];
                }
                $scope.centerInfo[centerInfo.calleeNum].push(otherCenterInfo);
            }
        }
    };

    function removeCenterInfo(ext, key, val, keep) {
        var info = _.remove($scope.centerInfo[ext], [key, val])[0];
        if (keep) {
            if (info) {
                $scope.oldCenterInfo.push(info);
            }
            if ($scope.oldCenterInfo.length > $scope.totalUsers) {
                $scope.oldCenterInfo.shift();
            }
        }
        if ($scope.centerInfo[ext] && !$scope.centerInfo[ext].length) {
            delete $scope.centerInfo[ext];
        }
        if (info) {
            if ((info.calleeNum.length === 4 && isParkingExt(info.calleeNum)) || info.calleeNum
                .length === 5) {
                _.flatten(Object.values($scope.centerInfo)).forEach(function(otherInfo) {
                    if (otherInfo[key] === info[key]) {
                        removeCenterInfo(otherInfo.ext, key, val, keep);
                    }
                });
            }
        }
        return info;
    };
    
    function centerStateToInfo(event) {

        var ext = (event.caller_caller_id_number.length === 3 || 
            (event.caller_caller_id_number.length === 4 && !isParkingExt(event.caller_caller_id_number))) ?
            event.caller_caller_id_number : event.caller_destination_number;
        
        var calleeNum = (event.caller_caller_id_number.length === 3 || (event.caller_caller_id_number
                .length === 4 && !isParkingExt(event.caller_caller_id_number))) ?
            event.caller_destination_number : event.caller_caller_id_number;
        calleeNum = trimToTen(digitsOnly(calleeNum));
        
        var inOut = ext === event.caller_destination_number ? "Inbound" : "Outbound";
        // var lwbState = (calleeNum.length === 5 || calleeNum.length === 4) ?
        
        var lwbState = (calleeNum.length === 5) ? "disabled" : "default";
        
        if (callService.onCall()) {
            lwbState = "disabled";
        }
        
        var sendBack = {
            bUuid: event.other_leg,
            callCreated: new Date(event.date_local),
            calleeNum: calleeNum,
            ext: ext,
            inOut: inOut,
            isTransferred: false,
            status: event.channel_call_state,
            lwbState: lwbState,
            uuid: event.unique_uuid
        };

        return sendBack;
    };

    function unsubscribeCenterStateChannel() {
        newPusherService.registerHandler({
            channelName: "call-center-state-" + $rootScope.user.id,
            eventName: "CallCenterStateEvent",
            handler: function(data) {
                handleNewCenterInfo(data.call_center_info);
            }
        });
    };

    function refreshCenterInfo() {
        // ***III
        // subscribeToCallEvents(); 
        return dataFactory.getCurrentCalls()
            .then(function(response) {
                var data = response.data.success.data;
                handleNewCenterInfo(data);
            });
    };

    function handleNewCenterInfo(data) {
        data = data.map(shapeCenterInfo).filter(Boolean);
        // console.log(data);
        matchExtCalls(data);
        // console.log(data);
        data = centerInfoArrToCallLegObj(data);
        // console.log(data);
        cullDuplicates(data);
        attachLwbStatesToCenterInfo(data);
        // console.log(data);
        angular.copy(data, $scope.centerInfo);
    };

    function cullDuplicates(centerInfo) {
        Object.keys(centerInfo).forEach(function(key) {
            var legs = centerInfo[key];
            centerInfo[key] = _.uniqBy(legs, function(leg) {
                return leg.ext + leg.calleeNum;
            });
        });
    };

    function matchExtCalls(centerInfo) {
        var seen = [];

        function isExtNum(num) {
            return (num.length === 3 || (num.length === 4 && !isParkingExt(num)));
        }
        centerInfo.forEach(function(info) {
            if (isExtNum(info.calleeNum)) {
                seen.push(info.calleeNum);
            }
        });
        centerInfo.forEach(function(info) {
            if (seen.indexOf(info.ext) > -1) {
                seen.splice(seen.indexOf(info.ext), 1);
            }
        });
        if (seen.length > 0) {
            seen.forEach(function(seenVal) {
                var info = _.find(centerInfo, function(info) {
                    return info.calleeNum === seenVal;
                });
                info = angular.copy(info, {});
                var ext = info.ext;
                info.ext = info.calleeNum;
                info.calleeNum = ext;
                info.inOut = info.inOut === "Outbound" ? "Inbound" : "Outbound";
                centerInfo.push(info);
            });
        }
    };

    function attachLwbInfo(user) {
        user.lwbInfo = angular.copy(defaultLwbInfo);
    }

    function locMemberMatchesUser(user) {
        console.log(user);
        return function(member) {
            console.log(member);
            return member.user_uuid === user.user_uuid;
        };
    }

    function filterNonUsers(user) {
        return user && user.user_uuid && user.name.length > 2;
    }

    function isMemberOfLocGroup(user) {
        console.log($scope.location);
        console.log(user);
        return _.find($scope.location.members, locMemberMatchesUser(user));
    };

    function isNotThisUser(user) {
        return user.user_uuid !== $rootScope.user.id;
    }

    function isNotKotterTech(user) {
        return !contactService.isKotterTechUser(user);
    }

    $scope.userContacts = function() {
        if (!$scope.location || !$rootScope.user) {
            return [];
        }
        var allUsers = contactService.getUserContactsOnly();
        allUsers = allUsers.filter(isMemberOfLocGroup).filter(isNotThisUser).filter(
            isNotKotterTech);
        allUsers.forEach(attachLwbInfo);
        return allUsers;
    };

    function loadUsers() {
        if (!$scope.location) {
            return;
        }
        contactService.registerOnUserContactLoadCallback(function() {
            var allUsers = contactService.getUserContactsOnly();

            if (!$scope.totalUsers) {
                $scope.totalUsers = allUsers.length;
            }
            console.log(allUsers);
            $scope.users = allUsers.filter(filterNonUsers).filter(isMemberOfLocGroup);
            $scope.users = $scope.users.filter(isNotThisUser).filter(isNotKotterTech);
            $scope.users.forEach(attachLwbInfo);
            console.log($scope.users);
            $scope.refreshFilteredUsers('loadUsers');
        });

    };

    $scope.hasLwbAccess = function reloadEmulationStatus() {
        var isLocationManager = ($scope.location.ismanager()).member_type == 'manager';
        var isAdminOrGreater = userService.isAdminGroupOrGreater();
        if (isLocationManager || isAdminOrGreater){
            return true;
        } else {
            return false;
        }
    };

    
    function shapeCenterInfo(info) {
        var inOut = getCallInfoDirection(info);
        var ext = getLegExt(info, inOut);
        var calleeNum = getCalleeNum(info, ext);
        var onCallWithName = info.direction === "outbound" ? info.b_callee_name : info.cid_name;
        var onCallWithNum = info.direction === "outbound" ? info.b_callee_num : info.cid_num;
        var talkTime = parseInt(info.talkTime);
        var isTransferred = (info.state === "CS_SOFT_EXECUTE" && !isParkingExt(info.b_callee_num));
        var callCreated;
        if (_.isString(info.call_created_epoch)) {
            callCreated = moment.unix(parseInt(info.call_created_epoch)).toDate();
        } else {
            callCreated = moment().subtract(talkTime, 'seconds').toDate();
        }
        var data = {
            bUuid: info.b_uuid,
            callCreated: callCreated,
            calleeNum: trimToTen(digitsOnly(calleeNum)),
            callID: info.call_uuid,
            ext: ext,
            inOut: inOut,
            status: info.callstate,
            uuid: info.uuid,
            isTransferred: isTransferred
        };
        if (data.ext === data.calleeNum) {
            if ($scope.centerInfo[ext]) {
                return $scope.centerInfo[ext][0];
            } else {
                return null;
            }
        }
        return data;
    };

    function getLegExt(info, inOut) {
        if (info.state === "CS_SOFT_EXECUTE") {
            if (info.b_state === "CS_EXCHANGE_MEDIA") {
                if (!_.isArray(info.sent_callee_num)) {
                    return info.sent_callee_num;
                } else if (!_.isArray(info.b_callee_num) && (info.b_callee_num.length ===
                        3 || (info.b_callee_num.length === 4 && !isParkingExt(info.b_callee_num))
                    )) {
                    // return info.b_sent_callee_num;
                    return info.b_callee_num; // for inbound, supervised transfer by ext
                } else if (!_.isArray(info.b_sent_callee_num) && (info.b_sent_callee_num.length ===
                        3 || (info.b_sent_callee_num.length === 4 && !isParkingExt(info.b_sent_callee_num))
                    )) {
                    return info.b_sent_callee_num;
                } else {
                    return info.b_cid_num;
                }
            } else {
                return (info.cid_num.length > 5 || isParkingExt(info.b_dest)) ?
                    info.b_cid_num : info.cid_num;
            }
        } else if (inOut === "Inbound") {
            if (info.dest.indexOf("5001") > -1) {
                return info.cid_num;
            } else if (info.dest.indexOf("u:") > -1) {
                return info.cid_num;
            } else if (info.dest.length === 7) {
                return info.sent_callee_num;
            } else {
                return _.isString(info.dest) ? info.dest : info.cid_num;
            }
        } else {
            if (info.presence_id.split) {
                var extSplits = info.presence_id.split("@");
                var id = extSplits[0];
                return extSplits[0];
            } else {
                return info.cid_num;
            }
        }
    };

    function getCalleeNum(info, ext) {
        var calleeNum = _.isString(info.dest) ? info.dest : info.b_callee_num;
        if (info.state === "CS_SOFT_EXECUTE") {
            calleeNum = info.b_callee_num;
            if (isParkingExt(calleeNum)) {
                calleeNum = info.cid_num;
            } else if (!_.isString(calleeNum)) {
                return info.callee_num;
            } else if (info.b_state === "CS_EXCHANGE_MEDIA") {
                if (info.b_sent_callee_num === ext) {
                    return info.b_callee_num;
                } else {
                    return info.cid_num === ext ? info.b_dest : info.cid_num;
                }
            }
            return calleeNum;
        } else if (calleeNum === ext) {
            if (info.dest.indexOf("5001") > -1) {
                return isParkingExt(info.callee_num) ? info.cid_num : info.callee_num;
            } else {
                return trimToTen(digitsOnly(info.cid_num));
            }
        } else {
            if (info.dest.indexOf("5001") > -1) {
                return isParkingExt(info.callee_num) ? info.cid_num : info.callee_num;
            } else if (info.dest.indexOf("u:") > -1) {
                return info.callee_num;
            } else if (info.dest.length === 7) {
                return info.cid_num;
            } else {
                return calleeNum;
            }
        }
    };

    function getCallInfoDirection(info) {
        if (info.direction === "inbound") {
            if (info.callee_name === "Outbound Call" && info.b_callee_direction == "SEND") {
                return "Outbound";
            } else {
                return "Inbound";
            }
        } else {
            return "Inbound";
        }
        return null;
    };

    function centerInfoArrToObj(centerInfo) {
        var ext;
        var obj = {};
        centerInfo.forEach(function(info) {
            // ext = info.ext.split('@')[0];
            ext = info.ext;
            obj[ext] = info;
        });
        return obj;
    };

    function centerInfoArrToCallLegObj(centerInfo) {
        var ext;
        var obj = {};
        centerInfo.forEach(function(info) {
            // ext = info.ext.split('@')[0];
            ext = info.ext;
            if (obj[ext]) {
                obj[ext].push(info);
            } else {
                obj[ext] = [info];
            }
        });
        return obj;
    };

    function digitsOnly(input) {
        return input.replace ? input.replace(/[^0-9]/g, '') : input;
    };

    function trimToTen(input) {
        if (!input) {
            return input;
        }
        return input.length > 10 ? input.slice(1, 11) : input;
    };

    function handleNewSelectedCol(colName) {
        return colName;
    };

    //lwb handling
    var defaultLwbInfo = {
        disabled: {"color": 'grey', "padding": '3px', "font-size": '20px'},
        default: {"padding": '3px', "font-size": '20px'},
        active: { "padding" : '0px', "font-size": '30px'},
        actions: {
            listen: {
                icon: "fa fa-headphones",
                color: "green",
                state: "disabled",
                tooltip: "Listen to call",
                name: "listen"
            },
            whisper: {
                icon: "fa fa-assistive-listening-systems",
                color: "blue",
                state: "disabled",
                tooltip: "Whisper to call",
                name: "whisper"
            },
            barge: {
                icon: "fa fa-bullhorn",
                color: "orange",
                state: "disabled",
                tooltip: "Barge into call",
                name: "barge"
            }
        }
    };

    var lwbStateMachine = {
        default: {
            possibleStates: ['listen', 'whisper', 'barge'],
            transitions: {},
            transitionsTo: []
        },
        listen: {
            possibleStates: ['default', 'whisper', 'barge'],
            transitions: {},
            transitionsTo: []
        },
        whisper: {
            possibleStates: ['default', 'listen', 'barge'],
            transitions: {},
            transitionsTo: []
        },
        barge: {
            possibleStates: ['default', 'listen', 'whisper'],
            transitions: {},
            transitionsTo: []
        }
    };

    function registerLwbStateTransition(fromState, targetState, fn) {
        if (lwbStateMachine[fromState].transitions[targetState]) {
            lwbStateMachine[fromState].transitions[targetState].push(fn);
        } else {
            lwbStateMachine[fromState].transitions[targetState] = [fn];
        }
    };

    function registerLwbStateDualTransition(stateOne, stateTwo, fn) {
        registerLwbStateTransition(stateOne, stateTwo, fn);
        registerLwbStateTransition(stateTwo, stateOne, fn);
    };

    function registerLwbStateTransitionTo(state, fn) {
        lwbStateMachine[state].transitionsTo.push(fn);
    };

    function registerOnAllDefaultStates(fn) {
        lwbStateMachine.default.possibleStates.forEach(function(targetState) {
            registerLwbStateTransition("default", targetState, fn);
        });
    };

    function transitionState(centerInfo, actionName) {
        if (!centerInfo || !actionName) {
            return;
        }
        var currentState = centerInfo.lwbState;
        var targetState = getTargetState(currentState, actionName);
        if (isValidTransition(currentState, targetState)) {
            var transitions = lwbStateMachine[currentState].transitions[targetState] || [];
            var toTransitions = lwbStateMachine[targetState].transitionsTo || [];
            var allTransitions = transitions.concat(toTransitions);

            function rollbackTransition() {
                centerInfo.lwbState = currentState;
            }
            allTransitions.forEach(function(transitionFn) {
                transitionFn(centerInfo, currentState, targetState,
                    rollbackTransition);
            });
            centerInfo.lwbState = targetState;
            console.log("transitioned to " + targetState);
        }
    };

    function getTargetState(currentState, actionName) {
        if (currentState === actionName) {
            return "default";
        } else {
            return actionName;
        }
    };

    function isValidTransition(currentState, targetState) {
        return lwbStateMachine[currentState] &&
            lwbStateMachine[currentState].possibleStates.indexOf(targetState) > -1;
    };

    function attachLwbStatesToCenterInfo(centerInfo) {
        var lwbCalls = callService.currentLwbCalls();
        Object.keys(centerInfo).forEach(function(ext) {
            var extCallLegInfo = centerInfo[ext];

            function findMatchingLegInfo(info) {
                return function(otherInfo) {
                    return info.uuid === otherInfo.uuid;
                };
            }

            function findMatchingLwbCall(info) {
                return function(lwbCall) {
                    var uuid;
                    if (lwbCall.lwbType === "whisper") {
                        uuid = getWhisperUuid(info);
                    } else if (lwbCall.lwbType === "listen") {
                        uuid = getListenUuid(info);
                    } else if (lwbCall.lwbType === "barge") {
                        uuid = getBargeUuid(info);
                    }
                    return uuid === lwbCall.lwbUuid && info.ext === lwbCall.lwbExt;
                };
            };
            if (extCallLegInfo) {
                extCallLegInfo.forEach(function(legInfo) {
                    var match = _.find($scope.centerInfo[ext],
                        findMatchingLegInfo(legInfo));
                    var matchingCall = _.find(lwbCalls, findMatchingLwbCall(
                        legInfo));
                    if (matchingCall) {
                        matchingCall.matched = true;
                    }
                    if (matchingCall) {
                        legInfo.lwbState = matchingCall.lwbType;
                    } else if (match) {
                        legInfo.lwbState = match.lwbState;
                    } else if ((legInfo.calleeNum.length === 4 &&
                            isParkingExt(legInfo.calleeNum)) ||
                        legInfo.calleeNum.length === 5) {
                        legInfo.lwbState = "disabled";
                    } else {
                        legInfo.lwbState = "default";
                    }
                });
            }
        });
        lwbCalls.forEach(function(call) {
            if (!call.matched) {
                call.hangup();
            } else {
                call.matched = null;
            }
        });
    };

    function getActionStyle(state, action) {
        // console.log(state);
        // console.log(action);
        var styles;
        if (actionIsActive(state, action.name)) {
            styles = defaultLwbInfo.active;
            styles.color = action.color;
        } else if (state && state !== "disabled") {
            styles = defaultLwbInfo.default;
            styles.color = action.color;
            // return "color: " + action.color + "; " + defaultLwbInfo.default;
        } else {
            styles = defaultLwbInfo.disabled;
            // return defaultLwbInfo.disabled;
        }
        return styles;
    };

    function getActionTooltip(action) {
        return currentUserIsOnCall() ?
            'You must end your current call before you can ' + action.name + '.' :
            action.tooltip;
    };

    function actionIsActive(state, action) {
        if (!state || !action) {
            return false;
        }
        return action === state ||
            state.toLowerCase().indexOf(action) > -1;
    };

    function disableAllCenterInfos() {
        if ($scope.centerInfo) {
            var allInfos = _.flatten(Object.values($scope.centerInfo));

            function disableInfo(info) {
                info.lwbState = "disabled";
            }
            allInfos.forEach(disableInfo);
        }
    };

    function disableAllOtherCenterInfos(centerInfo) {
        function notThisInfo(info) {
            return info !== centerInfo;
        }
        var otherInfos = _.flatten(Object.values($scope.centerInfo)).filter(notThisInfo);

        function disableInfo(info) {
            info.lwbState = "disabled";
        }
        otherInfos.forEach(disableInfo);
    };
    registerOnAllDefaultStates(disableAllOtherCenterInfos);

    function enableAllCenterInfos() {
        if ($scope.centerInfo) {
            var centerInfos = _.flatten(Object.values($scope.centerInfo));

            function enableInfo(info) {
                info.lwbState = "default";
            }
            centerInfos.forEach(enableInfo);
        }
    };
    registerLwbStateTransitionTo("default", enableAllCenterInfos);

    function triggerListen(centerInfo, curState, targState, rollback) {
        var uuid = getListenUuid(centerInfo);
        callService.triggerLwb("listen", uuid, centerInfo.ext);
    };

    function getListenUuid(centerInfo) {
        var uuid = centerInfo.uuid;

        function isExtToExtInfo(info) {
            return (info.ext.length === 3 || (info.ext.length === 4 && !isParkingExt(info.ext))) &&
                (info.calleeNum.length === 3 || (info.calleeNum.length === 4 && !
                    isParkingExt(info.calleeNum)));
        };
        if (centerInfo.bUuid) {
            if (centerInfo.status === "HELD" || centerInfo.inOut === "Outbound" ||
                isExtToExtInfo(centerInfo)) {
                uuid = centerInfo.bUuid;
            }
        }
        return uuid;
    };

    function triggerEndListen(centerInfo) {
        callService.endLwb("listen");
    };

    function triggerWhisper(centerInfo) {
        var uuid = getWhisperUuid(centerInfo);
        callService.triggerLwb("whisper", uuid, centerInfo.ext);
    };

    function getWhisperUuid(centerInfo) {
        var uuid;
        if (centerInfo.isTransferred) {
            uuid = centerInfo.bUuid;
            if (centerInfo.inOut === "Inbound") {
                uuid = centerInfo.uuid;
            }
        } else {
            uuid = centerInfo.uuid;
            if (centerInfo.inOut === "Inbound") {
                uuid = centerInfo.bUuid;
            }
        }
        return uuid;
    };

    function triggerEndWhisper(centerInfo) {
        callService.endLwb("whisper");
    };

    function triggerBarge(centerInfo) {
        var uuid = getBargeUuid(centerInfo);
        callService.triggerLwb("barge", uuid, centerInfo.ext);
    };

    function getBargeUuid(centerInfo) {
        return centerInfo.uuid;
    };

    function triggerEndBarge(centerInfo) {
        callService.endLwb("barge");
    };
    registerLwbStateTransition("listen", "default", triggerEndListen);
    registerLwbStateTransition("default", "listen", triggerListen);
    registerLwbStateTransition("listen", "barge", triggerEndListen);
    registerLwbStateTransition("listen", "whisper", triggerEndListen);
    registerLwbStateTransition("listen", "whisper", triggerWhisper);
    registerLwbStateTransition("whisper", "listen", triggerEndWhisper);
    registerLwbStateTransition("whisper", "listen", triggerListen);
    registerLwbStateTransition("whisper", "default", triggerEndWhisper);
    registerLwbStateTransition("default", "whisper", triggerWhisper);
    registerLwbStateTransition("whisper", "barge", triggerEndWhisper);
    registerLwbStateTransition("barge", "whisper", triggerWhisper);
    registerLwbStateTransition("default", "barge", triggerBarge);
    registerLwbStateTransition("barge", "default", triggerEndBarge);
    registerLwbStateTransition("listen", "barge", triggerBarge);
    registerLwbStateTransition("barge", "listen", triggerEndBarge);
    registerLwbStateTransition("barge", "listen", triggerListen);
    registerLwbStateTransition("whisper", "barge", triggerBarge);
    registerLwbStateTransition("barge", "whisper", triggerEndBarge);


    // registerLwbStateTransition

    // table controls
    // *************** sorting fns ********************
    var tableControls = {
        columnNames: [{
                name: 'ext',
                text: 'Ext.',
                className: 'ext'
            },
            {
                name: 'name',
                text: 'Name',
                className: 'name'
            },
            {
                name: 'status',
                text: 'Status',
                className: 'status'
            },
            {
                name: 'onCall',
                text: 'On Call',
                className: 'on-call-with'
            },
            {
                name: 'inOut',
                text: 'In/Out',
                className: 'in-out'
            },
            {
                name: 'duration',
                text: 'Duration',
                className: 'duration'
            },
        ],
        users: [],
        filteredUsers: []
    };
    $scope.sortingOpts = {
        selectedColumn: 'name',
        sortDirection: false,
        sortableColumns: ['ext', 'name', 'status', 'onCall',
            'inOut', 'duration'
        ],
        orderByValue: null,
        handleNewSelectedCol: handleNewSelectedCol
    };

    $scope.contactsFilter = function(item) {
        return true;
    };

    $scope.userContactOrder = function(item) {
        return item.name;
    };

    $scope.reverse = false;

    $rootScope.$on('contact.status.change', function(event, data) {
        // console.log(data);
        updateUserStatus(data);
    });

    function updateUserStatus(data) {
        var user = _.find($scope.users, ["cuuid", data.contactUuid]);
        if (user) {

        }
    }

    function attachCallDataToUser(user, index, userList) {
        var ext = user.ext;
        var activeCall = $scope.getActiveCall(ext);

        user.activeCall = activeCall ? true : false;
        user.inOut = user.activeCall ? activeCall.inOut : null;
        user.duration = user.activeCall ? activeCall.callCreated : null;
        
    }

    function refreshFilteredUsers(source) {
        console.log(source);
        
        var sortingOpts = $scope.sortingOpts;
        var orderBy = sortingOpts.orderByValue;
        var sortDirection = sortingOpts.sortDirection;

        console.log($scope.users);
        if ($scope.users && $scope.users.length > 0) {
            var userList = $scope.users;
            var result = [];
            
            userList.forEach(attachCallDataToUser);

            if (orderBy == "ext" || orderBy == 'name' || orderBy == 'status') {
                result = $filter('orderBy')(userList, orderBy, sortDirection);
            }
            else if ( orderBy == "onCall" || orderBy == "inOut" || orderBy == "duration") {
                
                if ( orderBy == "onCall") {
                    orderBy = "activeCall";
                    result = $filter('orderBy')(userList, orderBy, sortDirection);
                } else if ( orderBy == "inOut") {
                    result = $filter('orderBy')(userList, orderBy, sortDirection);
                    result = $filter('orderBy')(result, "activeCall", true);
                } else if ( orderBy == 'duration') {
                    result = $filter('orderBy')(userList, orderBy, sortDirection);
                    result = $filter('orderBy')(result, "activeCall", true);
                }
            } else {
                result = $filter('orderBy')(userList, orderBy, sortDirection);
            }
            console.log(result);
            tableControls.filteredUsers = result;
            return result;
        } else { return; }
    };

    
    $scope.tableHasHeader = function() {
        return !$scope.noTableHeader;
    };

    // Handles table sorting by column
    // Expected Fields: sorted-column, sort-direction
    function sortableColumn(columnName) {
        return $scope.sortingOpts.sortableColumns.indexOf(columnName) > -1;
    };
    $scope.getHeaderStyleObj = function(columnName) {
        if (!$scope.sortingOpts || !sortableColumn(columnName)) {
            return {
                "cursor": "auto"
            };
        }
        return null;
    };

    $scope.showSelectedChevron = function(columnName, direction) {
        var currentDirection = $scope.sortingOpts.sortDirection ? 'up' :
            'down';
        return $scope.sortingOpts.selectedColumn === columnName &&
            direction === currentDirection &&
            sortableColumn(columnName);
    };
    $scope.showDefaultChevron = function(columnName) {
        return $scope.sortingOpts.selectedColumn !== columnName &&
            sortableColumn(columnName);
    };
    $scope.setSort = function(columnName) {
        
        if ($scope.sortingOpts.selectedColumn === columnName) {
            $scope.sortingOpts.sortDirection = !$scope.sortingOpts.sortDirection;
        } else if (sortableColumn(columnName)) {
            $scope.sortingOpts.selectedColumn = columnName;
        }
        
        if ($scope.sortingOpts.defaultSortingBehavior) {
            function handleNewSelectedCol(newVal, oldVal) {
                $scope.sortingOpts.orderByValue = newVal;
            }
            $scope.$watch('sortingOpts.selectedColumn', handleNewSelectedCol);
        } else if ($scope.sortingOpts.handleNewSelectedCol) {
            $scope.sortingOpts.orderByValue = columnName;
            refreshFilteredUsers('setSort');
        }
    };


    // ***********************************


    function filteredUsersLength() {
        if (tableControls.filteredUsers) {
            return tableControls.filteredUsers.length;
        }
        return null;
    };

    // search controls
    var searchControls = {
        pageOptions: [{
            val: 9
        }, {
            val: 20
        }, {
            val: 50
        }, {
            val: 100
        }],
        searchFilterText: ''
    };
    searchControls.perPage = searchControls.pageOptions[0];

    // misc
    function inboundOutboundSource(info, user) {
        var direction = info.inOut;
        if (direction) {
            direction = direction.toLowerCase();
            var val = direction === "outbound" ? "outgoing" : "incoming";
            return getOnescreenBaseUrl() + "/images/" + val + "-icon.png";
        }
        return "";
    }

    function onLocationChange(locationUuid) {
        locationService.registerOnAfterLoadGroupsCallback(function() {
            $scope.location = locationService.locationGroups[locationUuid];
            if ($scope.location) {
                $scope.loadUsers();
            }
        });
    };

    // $scope.test = function(){
    //     // ***III test
    //     console.log("TESTED");
    //     var domainUuid = $rootScope.user.user_uuid;
    //     dataFactory.getCurrentCalls()
    //         .then(function(response) {
    //             if (response) {
    //                 console.log("TARGETED", response);
    //             }
    //         }).catch(function(err){
    //             console.log("ERRORED", err);
    //         });
    // };

    function getOnescreenBaseUrl() {
        return __env.apiUrl ? __env.apiUrl : symphonyConfig.onescreenUrl;
    };

    function onCallServiceCallAdded() {
        disableAllCenterInfos();
    };

    function onCallServiceCallDismissed() {
        enableAllCenterInfos();
    };

    function userIsOnCall(user) {
        return user.status && statusTextIsBOC(user.status);
    };

    function currentUserIsOnCall() {
        if ($rootScope.user) {
            var userContact = contactService.getContactByUuid($rootScope.user.contact_uuid);
            if (userContact) {
                return userIsOnCall(userContact);
            }
        }
        return null;
    };

    function statusTextIsBOC(statusText) {
        return statusText && statusText.toLowerCase().indexOf("busy on call") > -1;
    };

    function removeUPrefix(uuid) {
        return uuid.slice(2, uuid.length);
    };

    function isParkingExt(extStr) {
        return parseInt(extStr) > 5000 && parseInt(extStr) < 5031;
    };

    callService.registerOnCallAddedCallback(onCallServiceCallAdded);
    callService.registerOnCallEndCallback(onCallServiceCallDismissed);
    var contactStatusChangeRegistrationData = {
        channelName: 'contact_status_change-' + $rootScope.user.domain_uuid,
        eventName: 'UserStatusChangeEvent',
        handler: function(data) {
            console.log(data);
            var message = data.message;
            console.log($scope.users);
            var user = _.find($scope.users, ["user_uuid", message.user_uuid]);
            console.log(user);
            console.log($scope.centerInfo);
            if (message && user &&
                message.user_status) {
                if (!statusTextIsBOC(message.user_status) && $scope.centerInfo[user
                        .extension]) {
                    $timeout(function() {
                        refreshCenterInfo();
                    }, 3000);
                }
                console.log("change user status");
                console.log(user);
                user.status = message.user_status;
            }
        }
    };

    preInit();

    $window.centerScope = $scope;
});
