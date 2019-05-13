'use strict';

proySymphony.service('callService', function($rootScope, packageService, $window, $sce, $uibModal,
    metaService, $filter, $interval, $timeout, conferenceService, integrationService, dataFactory, usefulTools,
    contactService, notificationService, symphonyConfig, ngAudio, userService, $mdDialog,
    statusService, $location) {

    var service = {
        calling: false,
        onCallEndCallbacks: [],
        onCallAddedCallbacks: [],
        onCallDialedCallbacks: [],
        onBridgeEntryCallbacks: [],
        onMakeCallFailedCallbacks: [],
        data: {},
        outgoingCallObject: null,
        queuedNotificationData: [],
        queuedLwbCallIds: {},
        queuedLwbReqs: [],
        queuedLwbHangups: {},
        callbackEvents: ['onAfterInit', 'callAdded', 'callDismissed'],
        showCallParkingIconLoading: true,
        callParkInitiated: true,
        showLoaderLine: true,
        muteOn: false,
        callParkInitiatedCallsParkedCount: 0,
        callsParkedCount: 0,
        reLoadParkedCalls: false
    };

    var triggerEvent = metaService.withCallbacks(service);

    service.initialize = function(hbRate) {
        if (__env.enableVerto && $location.$$url !== "/screenpop") {
            if (__env.enableDebug) console.log("Verto init in app.js");
            var ln = 1;
            try {
                ln = 2;
                loginExtensionBase = $rootScope.user.user_ext;
                //if(__env.enableDebug) console.log("loginExtensionBase = " + loginExtensionBase);
                ln = 3;
                pwBase = $rootScope.user.extension.password;
                //if(__env.enableDebug) console.log("pwBase = " + pwBase);
                ln = 4;
                fsDomainBase = $rootScope.user.extension.dial_domain;
                wssServerBase = $rootScope.user.extension.dial_domain;
                //if(__env.enableDebug) console.log("fsDomainBase = " + fsDomainBase);
                ln = 6;
            } catch (ex) {
                if (__env.enableDebug) console.log("ctrlLogin exception: " + ln);
                if (__env.enableDebug) console.log("ctrlLogin exception: " + ex);
            }

            function init() {
                vertoInit(service, $rootScope.user);
                if (hbRate) {
                    service.setPreCallStatus();
                }
                if (__env.enableDebug) console.log("Verto init complete.");
                triggerEvent('onAfterInit');
            }
            if (!$rootScope.onLoginPage) {
                init();
            } else {
                service.onBridgeEntryCallbacks.push(init);
            }
        }
    };

    service.startHeartbeat = function(heartbeatRateInSeconds) { // once a minute heartbeat
        var heartbeatTimeout;
        var timeoutLengthInSeconds = 10;
        heartbeatRateInSeconds = heartbeatRateInSeconds || 60;

        function onHeartbeatTimeout() {
            console.log("HEARTBEAT NOT RESPONDING");
            if (vertoHandleBase.rpcClient.socketReady()) {
                service.stopHeartbeat();
                service.initialize(heartbeatRateInSeconds * 1.2);
            } else {
                service.stopHeartbeat();

                function shouldRestartHb() {
                    if (vertoHandleBase.rpcClient.socketReady()) {
                        $interval.cancel(service.shouldRestartHBInterval);
                        service.startHeartbeat();
                    }
                };
                service.shouldRestartHBInterval = $interval(shouldRestartHb, (
                    heartbeatRateInSeconds * 1000));
            }
        };

        function sendHeartbeatRequest() {
            if (vertoHandleBase) {
                vertoHandleBase.message({
                    to: "heartbeat",
                    body: "test-message "
                });
                service.heartbeatTimeout = $timeout(
                    onHeartbeatTimeout,
                    (timeoutLengthInSeconds * 1000)
                );
            }
        }

        function startHeartbeat() {
            sendHeartbeatRequest();
            return $interval(sendHeartbeatRequest, (heartbeatRateInSeconds * 1000));
        }
        var heartbeat = startHeartbeat();
        service.stopHeartbeat = function() {
            service.removeHeartbeatTimeout();
            $interval.cancel(heartbeat);
        };
        service.removeHeartbeatTimeout = function() {
            if (service.heartbeatTimeout) {
                $timeout.cancel(service.heartbeatTimeout);
            }
        };
    };

    service.successCallPlacedTimeout = function() {
        var timeoutLengthInSecs = 10;

        function onTimeout() {
            // /Can you put a Chat With Support link here?/
            service.initialize();
            var message = "We're sorry, an error occurred while placing your " +
                "call. Please refresh this page and try again. If the problem " +
                "persists, please contact The Kotter Group by email at " +
                "support@kotter.net, <a>Chatting with support</a>, or " +
                "by calling 770-717-1777.";
            var templateUrl = "views/quotesheets/bad-call-info.html";
            var promise = $rootScope.customPrompt(templateUrl, $rootScope);
            $rootScope.hideBadCallPrompt = function() {
                $mdDialog.hide(promise);
            };
        };
        var timeout = $timeout(onTimeout, (timeoutLengthInSecs * 1000));
        service.cancelCallPlacedTimeout = function() {
            $timeout.cancel(timeout);
        };
    };

    service.handleHeartbeatResponse = function(response) {
        if (service.removeHeartbeatTimeout) {
            service.removeHeartbeatTimeout();
        }
        console.log("HEARTBEAT RESPONDED");
    };

    service.setOutgoingCallInfo = function(number) {
        if (!number) return;
        var contact = contactService.getContactByPhoneNumber(usefulTools.cleanPhoneNumber(
            number));
        if (contact) {
            service.updateCalling(number, contact);
        } else {
            service.updateCalling(number, null);
        }
    };

    service.updateCalling = function(number, contact) {
        if (contact) {
            service.calling = {
                number: number,
                contact: contact,
                params: {
                    remote_caller_id_name: number
                }
            };
        } else {
            service.calling = {
                number: number,
                params: {
                    remote_caller_id_name: number
                }
            };
        }
        if (isConferenceNumber(number)) {
            service.calling = {
                number: number,
                isConferenceCall: true,
                params: {
                    remote_caller_id_name: number
                }
            };
        }
    };

    service.makeCall = function(number) {
        if (service.muteOn == true){
            service.unMuteAllCalls();
        }
        if($rootScope.user.external_device_transfer == 'true')
        {
            number = usefulTools.cleanPhoneNumber(number);
            dataFactory.transferCallToExternal($rootScope.user.user_ext, $rootScope.user.domain.domain_name, number)
                .then(function(response){

                });

                return;
        }

        // detect an "unparking" of a call 
        if (number && number.length < 7) {
            // $rootScope.user.domain.domain_name.parked_call_
            console.log("UNPARKING EXTENSION: service.makeCall:number:" + number);
        }

        service.registerOnAfterInitCallback(function() {
            if (service.onConferenceCall()) {
                return;
            }
            if (nonLwbNotAllowed()) {
                displayOnLwbError();
                return;
            }
            if (service.currentCalls().length === 2) {
                return;
            }
            if (service.currentCalls().length === 1) {
                service.addCall(number);
            } else {
                number = usefulTools.cleanPhoneNumber(number);
                if (!isConferenceNumber(number)) {
                    $window.localStorage.setItem('number', number);
                }
                if (userService.limitReached('call')) {
                    $rootScope.showErrorAlert('You have reached the limit of ' +
                        $rootScope.user.usageLimits.call +
                        ' calls allowed while using a Bridge Demo account. For questions about Bridge, please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a>.'
                    );
                }
                userService.performMediaCheck()
                    .then(function(response) {
                        $timeout(function() {
                            if (response) {
                                startCall(number);
                                if (userService.isDemoAgency() &&
                                    number != 411) {
                                    incrementDemoCallCount();
                                    var cancel = (parseInt(
                                        $rootScope.user.usageLimits
                                        .calllength) * 60) + 10;
                                    service.demoCounter = 0;
                                    service.demoCallTimer =
                                        $interval(function() {
                                            if (service.demoCounter ===
                                                cancel &&
                                                service.onCall()
                                            ) {
                                                service.hangUpCall();
                                            }
                                            service.demoCounter +=
                                                1;
                                        }, 1000);
                                }
                            } else {
                                service.handleBadMediaRequest();
                                processCallbackCollection(service.onMakeCallFailedCallbacks);
                            }
                            userService.addPhoneOrEmailToHistory(
                                usefulTools.cleanPhoneNumber(
                                    number), 'phone');
                        });
                    }, function(err) {
                        service.handleBadMediaRequest();
                        processCallbackCollection(service.onMakeCallFailedCallbacks);
                    });
            }
        });
    };

    service.handleBadMediaRequest = function() {
        var title = 'We could not start your call';
        var message =
            'This is probably because you have not allowed access to your microphone or you do not have one plugged in. You can allow access by selecting the camera icon in the top right corner of your browser, in the address bar and choosing "always allow".';
        $rootScope.showAlert(title, message);
    };

    service.addCall = function(number) {
        $timeout(function() {
            // console.log(number);
            // number = service.formatPhoneNumber(number);
            
            if (service.muteOn){service.unMuteAllCalls()};

            number = usefulTools.cleanPhoneNumber(number);
            service.setOutgoingCallInfo(number);
            var calls = service.currentCalls();
            var firstCall = getFirstAddedCall(calls);
            service.holdCallById(firstCall.callID);
            userService.addPhoneOrEmailToHistory(number, 'phone');
            service.outgoingCallObject = makeCallBase(number);
            service.reLoadParkedCalls = true;
        });
    };

    service.outgoingThreeWayCall = function() {
        if (service.calling && service.onCall()) {
            return service.calling;
        }
        return null;
    };

    service.outgoingCall = function() {
        return service.calling;
    };

    service.hangUpCall = function() {
        $timeout(function() {
            var wasHungUp = false;
            if (service.demoCallTimer) {
                $interval.cancel(service.demoCallTimer);
                var cancel = (parseInt($rootScope.user.usageLimits.calllength) *
                    60) + 10;
                cancel = 30;
                if (service.demoCounter >= cancel) {
                    $uibModal.open({
                        templateUrl: 'views/modals/demolimit.html',
                        size: 'md'
                    });
                }
            }

            if(service.totalIncomingCalls == 1 && service.onCall())
            {
                angular.forEach(service.currentCalls(), function(call) {
                    if(call.startTime && call.state.name == 'active') {
                        call.hangup();
                    }
                });
                
            } else {
                angular.forEach(service.currentCalls(), function(call) {

                    wasHungUp = true;
                    // call.hangup();
                    if (call.isConferenceCall) {
                        $rootScope.$broadcast('end.conference.call');
                        service.endThreeWayConferenceCall(call);
                    } else {
                        call.hangup();
                        if ($rootScope.newwindow) $rootScope.newwindow.close();
                    }
                });
            }
            if (wasHungUp) {
                service.calling = false;
                service.reLoadParkedCalls = true;
            }
        });
    };

    service.endThreeWayConferenceCall = function(call) {
        var domain = $rootScope.user.domain.domain_name;
        var username = $rootScope.user.username;
        var conf;
        var num = (call.params.destination_number ? call.params.destination_number :
            call.params.remote_caller_id_number);
        if ((parseInt(num) >= 20000 && parseInt(num) < 20100) || (parseInt(num) >=
                30000 && parseInt(num) < 30100)) {
            conferenceService.endConferenceByExtension(num);
        } else {
            conf = username + '-' + domain;
            conferenceService.getEnd3wayConference(conf);
        }
    };

    service.hangUpCallById = function(id) {
        var call = callListBase[id];
        if (call) {
            call.hangup();
        }
    };

    service.onCall = function() {
        var calls = service.currentCalls().filter(function(call) {
            return !!call.startTime;
        });
        return calls.length > 0;
    };

    service.onThreeWayCall = function() {
        return service.currentCalls().length > 1;
    };

    service.incomingCalls = function() {
        return service.currentCalls().filter(function(call) {
            return call.incoming;
        });
    };

    service.updateIncomingCallTotal = function() {
        $timeout(function() {
            service.totalIncomingCalls = service.incomingCalls().length;
        });
    };

    service.tryToMakeCall = function(number) {
        if (number == $rootScope.user.did || number == $rootScope.user.user_ext) {
            return;
        }
        var message;
        if (service.onConferenceCall()) {
            message = "You may not place another call while on a conference call. " +
                "Please hang up the conference call if you would like to make " +
                "another.";
            $rootScope.showInfoAlert(message);
        } else if (service.currentCalls().length === 2) {
            message = "You may only participate in two calls at a time. " +
                "Please hang up one of your calls if you would like to make " +
                "another.";
            $rootScope.showInfoAlert(message);
        } else {
            service.makeCall(number);
        }
    };

    service.handleIncomingCall = function(data) {
        if($rootScope.user.external_device_transfer == 'true')
        {
            if (packageService.packageHasAccess('integration') &&
                        (($rootScope.user.openScreenPop && $rootScope.user.openScreenPop == "true")
                        || ($rootScope.user.openClient && $rootScope.user.openClient == 'true')))
                        integrationService.screenpop(data.phone_number, call);
                        
            return;
        }

        if (service.currentCalls().length >= 3) {
            service.sendToVoicemail(data.id);
            return;
        }

        var call = callListBase[data.id];
        if (isLwbCall(call)) {
            call.answer({
                useVideo: true,
                useStereo: true
            });
        } else {
            if (unavailable()) {
                service.sendToVoicemail(data.id);
            } else {
                call.incoming = true;
                if (packageService.packageHasAccess('integration')) {
                    if ($rootScope.user.exportType.partner_code == 'ams360')
                        attachAmsContactToCall(call);
                    if ($rootScope.user.exportType.partner_code == 'qqcatalyst')
                        attachQQContactToCall(call);
                }

                service.updateIncomingCallTotal();
                if (service.incomingCalls().length > 1) {
                    service.queuedNotificationData.push(data);
                } else {
                    if (packageService.packageHasAccess('integration') &&
                        (($rootScope.user.openScreenPop && $rootScope.user.openScreenPop == "true")
                        || ($rootScope.user.openClient && $rootScope.user.openClient == 'true')))
                        integrationService.screenpop(data.phone_number, call);
                    data.actions = [{
                            action: "answer",
                            title: "Answer"
                        },
                        {
                            action: "voicemail",
                            title: "Send to Voicemail"
                        }
                    ];
                    notificationService.handleIncomingCallNotification(service.onCall(), data);
                }
            }
        }
    };

    service.setPreCallStatus = function() {
        if (service.currentCalls().length == 0 && !service.merging) {
            var preCallStatus = $window.localStorage.getItem('preCallStatus');
            if (preCallStatus) {
                //console.warn("!!!!!PERSISTING PRE CALL STATUS AS: " + preCallStatus + " TO ONESCREEN!!!!!");
                //statusService.setStatusAndPersist(preCallStatus);
                $window.localStorage.removeItem('preCallStatus');
            }
        }
    };

    service.savePreCallStatus = function() {
        var currentStatus = statusService.getCurrentStatusName();
        if (_.lowerCase(currentStatus) !== 'busy on call') {
            //console.warn("!!!!!SAVING PRE CALL STATUS AS: " + currentStatus + " TO LOCAL STORAGE!!!!!");
            //$window.localStorage.setItem('preCallStatus', currentStatus);
            //console.warn("!!!!!SAVING PRE CALL STATUS AS: Busy on Call TO ONESCREEN!!!!!");
            //statusService.setStatusAndPersist('Busy on Call');
        }
    };

    service.declineCall = function(id) {
        $timeout(function() {
            service.declined = true;
            callListBase[id].declined = true;
            // service.declineNextCall = false;
            endNotification();
            service.updateIncomingCallTotal();
            var call = callListBase[id];
            call.answer({
                useVideo: true,
                useStereo: true
            });
            if ($rootScope.newwindow) $rootScope.newwindow.close();
            // call gets hungup when added
            service.reLoadParkedCalls = true;
        });
    };

    service.ignoreCall = function(call) {
        $timeout(function() {
            endNotification();
            call.incoming = false;
            call.ignored = true;
            service.updateIncomingCallTotal();
            if ($rootScope.newwindow) $rootScope.newwindow.close();
        });
    };

    service.sendToVoicemail = function(id) {
        $timeout(function() {
            sendtovoicemail();
            if ($rootScope.newwindow) $rootScope.newwindow.close();
        });
    };

    service.answerCall = function(id) {
        
        $timeout(function() {
            var calls = service.currentCalls();
            
            if (service.muteOn == true && calls.length <= 1){
                service.muteOn = false;
            } else if (service.muteOn == true && calls.length >= 2){
                angular.forEach(calls, function(call){
                    if (call.rtc.localStream){
                        call.setMute('on');
                    }
                });
                service.muteOn = false;
            }

            endNotification();
            addStartTimeToCalls(calls);
            service.updateIncomingCallTotal();
            if (userService.isDemoAgency()) {
                incrementDemoCallCount();
                // var cancel = (parseInt($rootScope.user.usageLimits.calllength) * 1000 * 60) + 10;
                // console.log("cancel call after " + cancel);
                // $timeout(function() {
                //     console.log("DO END CALL");
                //     endDemoCall();
                // }, cancel);
                var cancel = (parseInt($rootScope.user.usageLimits.calllength) *
                    60) + 10;
                service.demoCounter = 0;
                service.demoCallTimer = $interval(function() {
                    if (service.demoCounter === cancel && service.onCall()) {
                        service.hangUpCall();
                    }
                    service.demoCounter += 1;
                }, 1000);
            }
            if (calls.length > 0) service.holdOtherCalls(id);
            var call = callListBase[id];
            call.answer({
                useVideo: true,
                useStereo: true
            });
            if (packageService.packageHasAccess('integration') && 
                ($rootScope.user.popupAfterAnswer &&
                $rootScope.user.popupAfterAnswer == "true") || 
                ($rootScope.user.openClientOnAnswer && 
                $rootScope.user.openClientOnAnswer == 'true'))
                integrationService.screenpop(call.params.caller_id_number, call);
        });
    };

    service.onCallAdded = function() {
        $timeout(function() {
            service.calling = false;
            if (_.isInteger(service.callingCancelled)) {
                service.callingCancelled += 1;
            }
            service.merging = false;
            endNotification();
            var calls = service.currentCalls();
            addStartTimeToCalls(calls);
            var newCall = getNewlyAnsweredCallFromCollection(calls);
            if (isCachedLwbCall(newCall)) {
                newCall.hangup();
                removeCallIdFromCachedLwbCalls(newCall.callID);
                return;
            }
            if (service.data.waitingForTransferTarget) {
                service.data.transferTarget = newCall;
                service.data.waitingForTransferTarget = false;
            }
            if (service.declined) {
                hangUpDeclinedCall(usefulTools.convertObjectToArray(
                    callListBase));
                service.declined = false;
                service.updateIncomingCallTotal();
            }
            service.updateIncomingCallTotal();
            if (newCall) {
                newCall.incoming = false;
            }
            // if ($rootScope.user.exportType.partner_code == 'ams360')
            //     attachAmsContactToCall(newCall);

            // if ($rootScope.user.exportType.partner_code == 'qqcatalyst')
            //     attachQQContactToCall(call);

            if (newCall && !isLwbCall(newCall)) {
                triggerEvent('callAdded');
                service.savePreCallStatus();
                service.stopRecording([newCall]);
                storeCallInfo(newCall);
                if (newCall.params.remote_caller_id_name === 'Outbound Call') {
                    newCall.params.remote_caller_id_name = newCall.params.remote_caller_id_number;
                }
                if (isConferenceNumber(newCall.params.remote_caller_id_number)) {
                    newCall.isConferenceCall = true;
                    $rootScope.conferenceCallID = newCall.callID;
                }
                processCallbackCollection(service.onCallAddedCallbacks);
            } else if (isLwbCall(newCall)) {
                if (service.queuedLwbCallIds[newCall.callID]) {
                    newCall.lwbType = service.queuedLwbCallIds[newCall.callID].type;
                    newCall.lwbUuid = service.queuedLwbCallIds[newCall.callID].uuid;
                    newCall.lwbExt = service.queuedLwbCallIds[newCall.callID].userExt;
                    delete service.queuedLwbCallIds[newCall.callID];
                    addCallIdToCachedLwbCalls(newCall.callID);
                }
                if (service.queuedLwbHangups[newCall.lwbType]) {
                    newCall.hangup();
                    service.queuedLwbHangups[newCall.lwbType] -= 1;
                }
                requestNextQueuedLwb();
            };
        });
    };

    service.triggerLwb = function(type, uuid, userExt) {
        function request() {
            var apiFn = dataFactory["get" + _.capitalize(type) + "Call"];
            
            service.lwbReqInFlight = true;
            apiFn(uuid).then(function(response) {
                service.lwbReqInFlight = false;
                if (response.data.indexOf("+OK") > -1) {
                    var callId = extractUuidFromLwbResponse(response.data);
                    if (callListBase[callId]) {
                        callListBase[callId].lwbType = type;
                        callListBase[callId].lwbUuid = uuid;
                        callListBase[callId].lwbExt = userExt;
                        addCallIdToCachedLwbCalls(callId);
                        if (service.queuedLwbHangups[type]) {
                            callListBase[callId].hangup();
                            service.queuedLwbHangups[type] -= 1;
                        }
                    } else {
                        service.queuedLwbCallIds[callId] = {
                            type: type,
                            id: callId,
                            uuid: uuid,
                            userExt: userExt
                        };
                    }
                    requestNextQueuedLwb();
                }
            });
        };
        if (Object.keys(service.queuedLwbCallIds).length === 0 && !service.lwbReqInFlight) {
            request();
        } else {
            service.queuedLwbReqs.push(request);
        }
    };

    service.endLwb = function(type) {
        var call = service.onLwbCall(type);
        if (call) {
            call.hangup();
            dataFactory.removeCall(call.callID);
        } else {
            var typeHangups = service.queuedLwbHangups[type];
            service.queuedLwbHangups[type] = typeHangups ? typeHangups + 1 : 1;
        }
    };

    service.callDismissed = function(call) {
        $timeout(function() {
            if (call.cause !== "LOSE_RACE" && !call.lwbType) {
                triggerEvent('callDismissed');
            } else if(call.cause == "LOSE_RACE" && (call.state.name != 'destroy' || !call.incoming)){
                if (packageService.packageHasAccess('integration') && 
                ($rootScope.user.popupAfterAnswer &&
                $rootScope.user.popupAfterAnswer == "true") || 
                ($rootScope.user.openClientOnAnswer && 
                $rootScope.user.openClientOnAnswer == 'true'))
                integrationService.screenpop(call.params.caller_id_number, call);
            }
            service.calling = false;
            endNotification();
            if (service.queuedNotificationData.length > 0) {
                var data = service.queuedNotificationData.shift();
                data.actions = [{
                        action: "answer",
                        title: "Answer"
                    },
                    {
                        action: "voicemail",
                        title: "Send to Voicemail"
                    }
                ];
                notificationService.handleIncomingCallNotification(service.onCall(),
                    data);
            }
            removeCallInfo(call);
            service.updateIncomingCallTotal();
            console.warn("CALL DISMISSED CALLBACK SETTING PRECALL STATUS");
            service.setPreCallStatus();
            if (!call.lwbType) {
                processCallbackCollection(service.onCallEndCallbacks);
            } else {
                removeCallIdFromCachedLwbCalls(call.callID);
            }
        });
    };

    service.currentCalls = function() {
        if (callListBase) {
            var calls = usefulTools.convertObjectToArray(callListBase);
            addInfoToCalls(calls);
            calls = calls.filter(function(call) {
                return !call.declined && !call.ignored;
            }).filter(function(call) {
                return !isLwbCall(call);
            });
            //a fix could be applied here for the bug that causes two active calls when refreshed during a 3-way call
            return calls;
        } else {
            return [];
        }
    };

    service.currentCall = function() {
        return service.callsNotOnHold()[0];
    };

    service.currentLwbCalls = function() {
        if (callListBase) {
            var calls = usefulTools.convertObjectToArray(callListBase);
            addInfoToCalls(calls);
            calls = calls.filter(function(call) {
                return call.lwbType;
            });
            return calls;
        } else {
            return [];
        }
    };

    service.onLwbCall = function(type) {
        return service.currentLwbCalls().filter(function(call) {
            return call.lwbType === type;
        })[0];
    };

    service.listening = function() {
        return service.onLwbCall("listen");
    };

    service.whispering = function() {
        return service.onLwbCall("whisper");
    };

    service.barging = function() {
        return service.onLwbCall("barge");
    };

    service.muteAllCalls = function() {
        if(service.totalIncomingCalls == 1 && service.onCall())
        {
            angular.forEach(service.currentCalls(), function(call) {
                if(call.startTime && call.state.name == 'active') {
                    call.setMute('off');
                }
            });
            service.muteOn = true;
        } else {
            angular.forEach(service.currentCalls(), function(call) {
                call.setMute('off');
            });
            service.muteOn = true;
        }
    };

    service.unMuteAllCalls = function() {
        if(service.totalIncomingCalls == 1 && service.onCall())
        {
            angular.forEach(service.currentCalls(), function(call) {
                if(call.startTime && call.state.name == 'active') {
                    call.setMute('on');
                }
            });
            service.muteOn = false;
        } else {
            angular.forEach(service.currentCalls(), function(call) {
                call.setMute('on');
            });
            service.muteOn = false;
        }
    };

    service.muteActive = function() {
        return service.muteOn;
    };

    service.recordCall = function() {
        var calls = service.callsNotOnHold();
        if(service.totalIncomingCalls == 1 && service.onCall())
        {
            angular.forEach(calls, function(call) {
                if(call.startTime && call.state.name == 'active') {
                    dataFactory.getStartRecordCall(call.callID)
                        .then(function(response) {
                            if (isCallSuccessMessage(response.data)) {
                                call.recording = true;
                                $rootScope.$broadcast('start.recording', true);
                                return true;
                            }
                            return null;
                        });
                }
            });
        } else {
            angular.forEach(calls, function(call) {
                dataFactory.getStartRecordCall(call.callID)
                    .then(function(response) {
                        if (isCallSuccessMessage(response.data)) {
                            call.recording = true;
                            $rootScope.$broadcast('start.recording', true);
                            return true;
                        }
                        return null;
                    });
            });
        }
    };

    service.stopRecording = function(calls) {
        if (!calls) {
            calls = service.callsBeingRecorded();
        };
        angular.forEach(calls, function(call) {
            dataFactory.getStopRecordCall(call.callID)
                .then(function(response) {
                    if (isCallSuccessMessage(response.data)) {
                        call.recording = false;
                        $rootScope.$broadcast('start.recording', false);
                        return true;
                    }
                    return null;
                });
        });
    };

    service.callsBeingRecorded = function() {
        var calls = service.currentCalls();
        return calls.filter(function(call) {
            return call.recording;
        });
    };

    service.recordingActive = function() {
        return service.callsBeingRecorded().length > 0;
    };

    service.holdCall = function() {
        // holdCallBase();
        if(service.totalIncomingCalls == 1 && service.onCall())
        {
            angular.forEach(service.currentCalls(), function(call) {
                if(call.startTime && call.state.name == 'active') {
                    service.holdCallById(call.callID);
                }
            });
        } else {
            angular.forEach(service.currentCalls(), function(call) {
                service.holdCallById(call.callID);
            });
        }
    };
    service.holdOtherCalls = function(id) {
        angular.forEach(service.currentCalls(), function(call) {
            if (call.callID !== id) service.holdCallById(call.callID);
        });
    };

    service.unHoldCall = function() {
        // holdCallBase();
        if(service.totalIncomingCalls == 1 && service.onCall())
        {
            angular.forEach(service.currentCalls(), function(call) {
                if(call.startTime && call.state.name == 'active') {
                    service.unHoldCallById(call.callID);
                }
            });
        } else {
            angular.forEach(service.currentCalls(), function(call) {
                service.unHoldCallById(call.callID);
            });
        }
    };

    service.holdCallById = function(id) {
        var call = callListBase[id];
        
        if (call.recording) {
            service.stopRecording([call]);
        }
        call.onHold = true;
        call.hold();
    };

    service.unHoldCallById = function(id) {
        var call = callListBase[id];

        call.onHold = false;
        call.unhold();
    };

    service.callsOnHold = function() {
        var calls = service.currentCalls();
        return calls.filter(function(call) {
            return call.onHold;
        });
    };

    service.callsNotOnHold = function() {
        var calls = service.currentCalls();
        return calls.filter(function(call) {
            return !call.onHold;
        });
    };

    service.onHold = function() {
        var calls = service.currentCalls();
        return service.callsOnHold().length == calls.length;
    };

    service.swap = function() {
        angular.forEach(service.currentCalls(), function(call) {
            if (call.onHold) {
                service.unHoldCallById(call.callID);
            } else {
                service.holdCallById(call.callID);
            }
        });
    };

    service.mergeThreeWayCall = function(firstCallId, secondCallId) {
        var data = {
            uuid1: firstCallId,
            uuid2: secondCallId
        };
        if (callIsAdded(firstCallId) && callIsAdded(secondCallId)) {
            service.merging = true;
            dataFactory.merge3WayCall(data).then(function(response) {
                // console.log("3 way call data");
                // console.log(response);
                if (response.data) {
                    service.makeCall(response.data[0].modExtension);
                    // HACK: manually set calling to false. sometimes it doesn't
                    // get set to false on conference connect for some reason
                    $timeout(function() {
                        service.calling = false;
                    }, 10000);

                    $timeout(function() {
                        dataFactory.removeCall(data.uuid1).then(
                            function(response) {
                                dataFactory.removeCall(data.uuid2);
                            });
                    });
                } else {
                    service.merging = false;
                }
            });
        }
    };

    service.mergeStatus = function() {
        if (service.merging)
            return service.merging;
        return null;
    }

    service.formatPhoneNumber = function(number) {
        return number.replace(/\(/g, "").replace(/\)/g, "").replace(/ /g, "").replace(
            /-/g, "");
    };

    service.registerOnCallEndCallback = function(fn) {
        service.onCallEndCallbacks.push(fn);
    };

    service.registerOnCallAddedCallback = function(fn) {
        service.onCallAddedCallbacks.push(fn);
    };

    service.registerOnCallDialedCallback = function(fn) {
        service.onCallDialedCallbacks.push(fn);
    };

    service.registerOnMakeCallFailedCallbacks = function(fn) {
        service.onMakeCallFailedCallbacks.push(fn);
    };

    service.initiateSupervisedTransfer = function(targetNumber) {
        service.data.transferringCall = true;
        service.data.waitingForTransferTarget = true;
        service.addCall(targetNumber);
    };

    service.sortedCurrentCalls = function() {
        return service.currentCalls().sort(sortByStartTime);
    };

    service.confirmSupervisedTransfer = function(call_id) {
        var calls = service.currentCalls().sort(sortByStartTime);
        console.log(calls);
        // var userCall = calls[0];
        var userCall = service.data.transferTarget;
        var index = _.findIndex(calls, function(item) {
            return item.callID === call_id;
        });
        var otherUserCall = calls[index];
        var otherUserCallUuid = otherUserCall.callID;
        var vertoParams = {
            action: "replace",
            replaceCallID: otherUserCallUuid
        };
        userCall.sendMethod('verto.modify', vertoParams);
        if (otherUserCall.direction.name === "outbound") {
            dataFactory.removeCall(otherUserCallUuid);
        }
        // userCall.sendMethod('verto.bye');
        // userCall.hangup();
        // service.hangUpCall();
        userCall.hangup();
        otherUserCall.hangup();
        service.outgoingCallObject = null;
        service.data.transferringCall = false;

        if (service.callsOnHold().length == 1) {
            var call = service.callsOnHold()[0];
            service.unHoldCallById(call.callID);
        }
    };

    service.getSupervisedTransferRecipientCallId = function() {
        var calls = service.currentCalls().sort(sortByStartTime);
        return calls[1];
    };

    service.blindTransfer = function(number) {
        transferCallBase(number);
    };

    service.setCustomVariable = function(call, type, inputNumber) {
        
        var data = {
            call_id: call.callID,
            domain: $rootScope.user.domain.domain_name,
            type: type,
            number: inputNumber
        };
        dataFactory.setCustomVariable(data)

    };

    service.onConferenceCall = function() {
        return service.currentCalls().some(function(call) {
            return !!call.isConferenceCall;
        });
    };

    service.onFullConferenceCall = function() {
        var conf = function(element) {
            return (parseInt(element.params.remote_caller_id_number) >= 10000 &&
                    parseInt(element.params.remote_caller_id_number) < 10100) ||
                (parseInt(element.params.remote_caller_id_number) >= 30000 &&
                    parseInt(element.params.remote_caller_id_number) < 30100);
        };
        return service.currentCalls().some(conf);
    };

    service.getFirstAddedCallNotOnHold = function() {
        var call;
        var calls = service.currentCalls();
        for (var i = 0; i < calls.length; i++) {
            call = calls[i];
            if (!callIsOnHold(call.callID) && callIsAdded(call.callID)) {
                return call;
            }
        };
        return null;
    };

    service.getCallByCallID = function(callID) {
        var call;
        var calls = service.currentCalls();
        for (var i = 0; i < calls.length; i++) {
            call = calls[i];
            if (call.callID === callID) return call;
        };
        return null;
    };

    service.restartVerto = function() {
        // var maxTries = 100;
        // var currentTry = 0;
        var int = $interval(function() {
            // currentTry += 1;
            // if (currentTry > maxTries) { $interval.cancel(int); };
            if (!service.calling && !service.onCall()) {
                $interval.cancel(int);
                forceRestartVerto();
            }
        }, 1000);
    };

    function forceRestartVerto(noReset) {
        vertoHandleBase.logout();
        service.initialize();
    };

    function getCallContactNumber(call) {
        if (!call) {
            return null;
        }
        var number;
        var direction = (call.direction && call.direction.name) ? call.direction.name :
            null;
        if (direction === 'inbound') {
            number = call.params.remote_caller_id_number;
        } else if (direction === 'outbound') {
            number = call.params.destination_number ? call.params.destination_number : (
                call.params.remote_caller_id_number ? call.params.remote_caller_id_number :
                null);
        }
        return number.indexOf("+") > -1 ? number.slice(2, number.length) : number;
    };

    function attachAmsContactToCall(call) {
        var number = getCallContactNumber(call);
        number = usefulTools.cleanPhoneNumber(number);
        var contact = contactService.getAmsContactByNumber(number);
        if (call && contact) {
            call.contact = contact;
        }
    };

    function attachQQContactToCall(call) {
        var number = getCallContactNumber(call);
        number = usefulTools.cleanPhoneNumber(number);
        var contact = contactService.getQQContactByNumber(number);
        if (call && contact) {
            call.contact = contact;
        }
    };

    service.showCallerPhoto = function(call, direction, size) {
        var html, number, fontsize, style;
        if (call) {
            if (!size) size = 'lg';
            if (!direction) {
                direction = (call.direction && call.direction.name) ? call.direction.name :
                    null;
            }
            if (call.number) {
                number = call.number;
            } else if (direction === 'inbound') {
                number = call.params.remote_caller_id_number;
            } else if (direction === 'outbound') {
                number = call.params.destination_number ? call.params.destination_number :
                    (call.params.remote_caller_id_number ? call.params.remote_caller_id_number :
                        null);
            }
            if (direction && !call.contact && !call.noContact && !call.lookingForContact) {
                call.lookingForContact = true;
                var contact = contactService.getContactByPhoneNumber(usefulTools.cleanPhoneNumber(
                    number));
                if (contact) {
                    call.contact = contact;
                    html = getImageHtmlContact(contact, size);
                } else {
                    call.noContact = true;
                    html = '<div class="anon-user-container-' + size +
                        '"><i class="fa fa-user-circle-o"></i></div>';
                    call.lookingForContact = false;
                }
            } else if (direction && call.contact) {
                html = getImageHtmlContact(call.contact, size);
            } else {
                html = '<div class="anon-user-container-' + size +
                    '"><i class="fa fa-user-circle-o"></i></div>';
            }
            return $sce.trustAsHtml(html);
        }
        return null;
    };

    service.parkCurrentCall = function() {
        if(service.totalIncomingCalls == 1 && service.onCall())
        {
            var currentCall = {};
            angular.forEach(service.currentCalls(), function(call) {
                if(call.state.name == 'ringing') {
                    service.answerCall(call.callID);
                } else {
                    currentCall = call;
                }
            }); 
            $timeout(function() {
                if (currentCall) {
                    service.showCallParkingIconLoading = true;
                    service.callParkInitiated = true;
                    service.showLoaderLine = true;
                    service.callParkInitiatedCallsParkedCount = service.callsParkedCount;
        
                    service.parking = true;
                    service.initiateSupervisedTransfer("5000");
                    $timeout(function() {
                        service.holdCall();
                        $timeout(function() {
                            service.confirmSupervisedTransfer(currentCall.callID);
                            $timeout(function() {
                                service.parking = false;
                            });
                        }, 1000);
                    }, 2000);
                }
            }, 1500);
        } else {
            var currentCall = service.currentCall();
            if (currentCall) {

                service.showCallParkingIconLoading = true;
                service.callParkInitiated = true;
                service.showLoaderLine = true;
                service.callParkInitiatedCallsParkedCount = service.callsParkedCount;

                service.parking = true;
                service.initiateSupervisedTransfer("5000");
                $timeout(function() {
                    service.holdCall();
                    $timeout(function() {
                        service.confirmSupervisedTransfer(currentCall.callID);
                        $timeout(function() {
                            service.parking = false;
                        });
                    }, 3000);
                }, 2000);
            }
        }
        
        
    };

    service.unparkSpot = function(ext) {
        makeCallBase(ext);
        service.reLoadParkedCalls = true;
    };

    service.loadLots = function() {
        console.debug("park:service.loadlots");

        metaService.registerOnRootScopeUserLoadCallback(function() {
            console.debug(
                "calling: dataFactory.getParkingInfo(domain) where domain = " +
                $rootScope.user.domain.domain_name);
            dataFactory.getParkingInfo($rootScope.user.domain.domain_name)
                .then(function(response) {
                    if (response.data.success) {
                        console.debug(
                            "calling onescreenapi::getParkingInfo::response.data.success: " +
                            JSON.stringify(response.data.success));
                        var parkedExts = response.data.success.data.lots.lot
                            .extension;
                        service.processParkedExts(parkedExts);
                    }
                });
        });
    };

    service.processParkedExts = function(parkedExts) {
        if (parkedExts) {
            if (!_.isArray(parkedExts)) {
                parkedExts = [parkedExts];
            }

            function removeStarFromExt(ext) {
                return ext.slice(1, ext.length);
            }
            parkedExts = parkedExts.map(removeStarFromExt);

            function markLotOccupied(lot) {
                lot.occupied = parkedExts.indexOf(lot.ext) > -1;
            }
            if (service.lots) {
                service.lots.forEach(markLotOccupied);
            }
        }
    };

    service.startSelfTransfer = function() {
        service.blindTransfer($rootScope.user.extension.extension);
    };

    function promise(resolveVal) {
        return new Promise(function(resolve) {
            resolve(resolveVal);
        });
    };

    function getImageHtmlContact(contact, size) {
        var html;
        if (contact.im) {
            html = '<div class="cls-circle-arround-1"><img src="' + $rootScope.pathImgProfile +
                contact.im +
                '" class="cls-img-incomingcall" alt="" /></div>';
        } else {
            html = '<div class="anon-user-container-' + size +
                '"><i class="fa fa-user-circle-o" style="color: ' + contact.color +
                ';"></i></div>';
        }
        return html;
    }

    function addInfoToCalls(calls) {
        angular.forEach(calls, function(call) {
            // console.log(call);
            var number = call.params.remote_caller_id_number;
            if (number.length === 12) {
                call.params.remote_caller_id_number = number.slice(2, number.length);
            }
        });
    };

    function addStartTimeToCalls(calls) {
        angular.forEach(calls, function(call) {
            if (call.direction.name === "outbound" || call.answered) {
                if (!call.startTime) {
                    call.startTime = new Date();
                }
            }
        });
    };

    function isCallSuccessMessage(message) {
        if (message && typeof(message) == 'string') {
            if (message.indexOf('Success') > -1) {
                return true;
            }
        }
        return null;
    };

    function processCallbackCollection(collection) {
        angular.forEach(collection, function(fn) {
            fn();
        });
    }

    service.processOnBridgeEntryCallbacks = function() {
        processCallbackCollection(service.onBridgeEntryCallbacks);
        service.onBridgeEntryCallbacks = [];
    };

    function isConferenceNumber(number) {
        return number.length == 5;
    };

    function callIsAnswered(callId) {
        return !!callListBase[callId].answered;
    };

    function callIsAdded(callId) {
        return !!callListBase[callId].startTime;
    };

    function callIsOnHold(callId) {
        return !!callListBase[callId].onHold;
    };

    function sortByStartTime(a, b) {
        return b.startTime - a.startTime;
    };

    function getNewlyAnsweredCallFromCollection(calls) {
        var call;
        calls = calls.sort(sortByStartTime);
        return calls[0];
    };

    function getFirstAddedCall(calls) {
        var call;
        calls = calls.sort(sortByStartTime).reverse();
        return calls[0];
    };

    function hangUpDeclinedCall(calls) {
        var call;
        for (var i = 0; i < calls.length; i++) {
            call = calls[i];
            if (call.declined) {
                call.hangup();
                return true;
            }
        }
        return null;
    };

    function endNotification() {
        if ($rootScope.notification) {
            $rootScope.notification.pause();
        }
    };

    function unavailable() {
        return statusService.unavailable();
    };

    function isLwbCall(call) {
        if (call) {
            return call.params.caller_id_number === "0000000000";
        }
        return false;
    }

    function requestNextQueuedLwb() {
        if (service.queuedLwbReqs.length > 0) {
            if (Object.keys(service.queuedLwbCallIds).length === 0 && !service.lwbReqInFlight) {
                var lwbReq = service.queuedLwbReqs.shift();
                lwbReq();
            }
        }
    };

    function findCallUuidByExt(callInfo, ext, direction) {
        var info;
        var field = direction === 'Outbound' ? 'uuid' : 'b_uuid';
        for (var i = 0; i < callInfo.length; i++) {
            info = callInfo[i];
            if (info.inOut === direction && (info.ext[0].slice(0, ext.length) === ext)) {
                return info[field][0];
            }
        };
        return null;
    };

    function storeCallInfo(newCall) {
        var currentCalls = $window.localStorage.getItem("currentCalls");
        currentCalls = currentCalls ? JSON.parse(currentCalls) : {};
        if (_.some(Object.keys(currentCalls), function(callID) {
                return callID === newCall.callID;
            })) {
            newCall.reconstituted = true;
            newCall.params = currentCalls[newCall.callID];
        } else {
            currentCalls[newCall.callID] = newCall.params;
        };
        $window.localStorage.setItem("currentCalls", JSON.stringify(currentCalls));
    };

    function removeCallInfo(call) {
        var currentCalls = $window.localStorage.getItem("currentCalls");
        currentCalls = currentCalls ? JSON.parse(currentCalls) : {};
        delete currentCalls[call.callID];
        $window.localStorage.setItem("currentCalls", JSON.stringify(currentCalls));
    };

    function extractUuidFromLwbResponse(responseStr) {
        var allSpecialChars = /[^a-zA-Z\r\n\d:-]/g;
        var allNewlineChars = /(\r\n|\n|\r)/gm;
        return responseStr.split(" ")[1]
            .replace(allSpecialChars, "")
            .replace(allNewlineChars, "");
    };

    function endDemoCall() {
        $uibModal.open({
            templateUrl: 'views/modals/demolimit.html',
            size: 'md'
        });
        service.hangUpCall();
    };

    function incrementDemoCallCount() {
        dataFactory.getUpdateDemoUsage($rootScope.user.id, 'call');
    };

    function startCall(number) {
        number = service.formatPhoneNumber(number);
        service.savePreCallStatus();
        service.setOutgoingCallInfo(number);
        makeCallBase(number);
        service.successCallPlacedTimeout();
        processCallbackCollection(service.onCallDialedCallbacks);
    };

    function nonLwbNotAllowed() {
        return service.currentLwbCalls().length > 0 ||
            Object.keys(service.queuedLwbCallIds).length > 0 ||
            service.lwbReqInFlight;
    };

    function displayOnLwbError() {
        var message = "You may not place a call while using listen, whisper, " +
            "or barge features. Please end the l/w/b session if you would like to  " +
            "make a call.";
        $rootScope.showInfoAlert(message);
    };

    function addCallIdToCachedLwbCalls(callID) {
        var lwbCallIds = $window.localStorage.getItem("lwbCalls");
        if (!lwbCallIds) {
            lwbCallIds = [];
        } else {
            lwbCallIds = JSON.parse(lwbCallIds);
        }
        lwbCallIds.push(callID);
        $window.localStorage.setItem("lwbCalls", JSON.stringify(lwbCallIds));
    };

    function removeCallIdFromCachedLwbCalls(callID) {
        var lwbCallIds = $window.localStorage.getItem("lwbCalls");
        if (!lwbCallIds) {
            lwbCallIds = [];
        } else {
            lwbCallIds = JSON.parse(lwbCallIds);
        }
        lwbCallIds.push(callID);
        _.remove(lwbCallIds, function(id) {
            return id === callID;
        });
        $window.localStorage.setItem("lwbCalls", JSON.stringify(lwbCallIds));
    };

    function isCachedLwbCall(call) {
        if (!call) {
            return null;
        }
        var lwbCallIds = $window.localStorage.getItem("lwbCalls");
        if (!lwbCallIds) {
            lwbCallIds = [];
        } else {
            lwbCallIds = JSON.parse(lwbCallIds);
        }
        return lwbCallIds.indexOf(call.callID) > -1;
    };

    function resetCachedLwbCalls() {
        $window.localStorage.setItem("lwbCalls", JSON.stringify([]));
    };


    $rootScope.tempObjectForApplied = [{
            'FirstName': 'Alicia',
            'LastName': 'Casias',
            'Email': 'lvaldes@affbcpa.com',
            'CompanyName': 'Fernandez Bergnes & Associates',
            'Phone': '6783867422',
            'PolicyInfo': [{
                'CSR': 'James Ray',
                'PolicyNumber': '234534',
                'PolicyType': 'Life & Health'
            }]
        },
        {
            'FirstName': 'Jed',
            'LastName': 'Angell',
            'Email': 'auffard@nationwide.com',
            'CompanyName': 'Auffarth & Assoc',
            'Phone': '4106670080',
            'PolicyInfo': [{
                'CSR': 'Callie',
                'PolicyNumber': '787846',
                'PolicyType': 'Personal'
            }]
        },
        {
            'FirstName': 'Ann',
            'LastName': 'Swift',
            'Email': 'Aschutt@thecampbellgrp.com',
            'CompanyName': 'Campbell Group',
            'Phone': '6165411500',
            'PolicyInfo': [{
                'CSR': 'Bill',
                'PolicyNumber': '997733',
                'PolicyType': 'Auto'
            }]
        },
        {
            'FirstName': 'Claudia',
            'LastName': 'Rathbun',
            'Email': 'doug@axfordsmi.com',
            'CompanyName': 'Axford Agency',
            'Phone': '3083842580',
            'PolicyInfo': [{
                'CSR': 'Jese',
                'PolicyNumber': '509933',
                'PolicyType': 'Life & Health'
            }]
        },
        {
            'FirstName': 'Bruce',
            'LastName': 'Bahnson',
            'Email': 'rschunk@capspecialty.com',
            'CompanyName': 'Capitol Indemnity Corporation',
            'Phone': '7707171777',
            'PolicyInfo': [{
                'CSR': 'Debbie',
                'PolicyNumber': '342222',
                'PolicyType': 'Business'
            }]
        },
        {
            'FirstName': 'David',
            'LastName': 'Brantley',
            'Email': 'carl@metroplex-realty.com',
            'CompanyName': 'Carl Azbell Metroplex Realty, LLC',
            'Phone': '4695489758',
            'PolicyInfo': [{
                'CSR': 'Diane',
                'PolicyNumber': '356643',
                'PolicyType': 'Personal'
            }]
        },
        {
            'FirstName': 'Arpy',
            'LastName': 'Seferian',
            'Email': 'ed@candsins.com',
            'CompanyName': 'Cavallo & Signoriello',
            'Phone': '5088241386',
            'PolicyInfo': [{
                'CSR': 'Brian',
                'PolicyNumber': '767644',
                'PolicyType': 'Business'
            }]
        },
        {
            'FirstName': 'Bruce',
            'LastName': 'Bulman',
            'Email': 'crobinson@carolinabank.net',
            'CompanyName': 'Cb & T Financial Services',
            'Phone': '8433988415',
            'PolicyInfo': [{
                'CSR': 'Meg',
                'PolicyNumber': '221144',
                'PolicyType': 'Dental'
            }]
        },
        {
            'FirstName': 'Neil',
            'LastName': 'Vaughn',
            'Email': 'ellen@whittchiro.com',
            'CompanyName': 'Whitt Chiropractic Clinic',
            'Phone': '2058711888',
            'PolicyInfo': [{
                'CSR': 'Janelle',
                'PolicyNumber': '788666',
                'PolicyType': 'Life & Health'
            }]
        },
        {
            'FirstName': 'Neha',
            'LastName': 'Vibhute',
            'Email': 'neha@kotter.net',
            'CompanyName': 'The Kotter Group',
            'Phone': '7624992403',
            'PolicyInfo': [{
                'CSR': 'Charlie',
                'PolicyNumber': '543455',
                'PolicyType': 'Dental'
            }, {
                'CSR': 'Janelle',
                'PolicyNumber': '788666',
                'PolicyType': 'Life & Health'
            }]
        }
    ];

    return service;
});
