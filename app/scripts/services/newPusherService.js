'use strict';

proySymphony.factory('newPusherService', function($pusher, $rootScope, $location, conferenceService,
    billingService, userService, callService, contactService, contactGroupsService, $filter,
    callHistoryService, notificationService, symphonyConfig, newChatService, $timeout, integrationService,
    $window, dataFactory, statusService, smsService, metaService, usefulTools, tagService,
    greenboxService) {
    var service = {
        client: null,
        pusher: null,
        eventHandlers: {},
        subQueue: [],
        subbedChannels: []
    };

    service.init = function() {
        // var Pusher = Pusher || null;
        var client = service.client = new Pusher('fde20bef5caef3cbe4a2');
        service.pusher = $pusher(service.client);
        handleSubscriptions(service.subQueue);
        service.pusher.connection.bind_all(eventDispatcher);
    };

    var handleSubscriptions = function(subs) {
        while (subs.length > 0) {
            var channelName = subs.pop();
            if (service.subbedChannels.indexOf(channelName) === -1) {
                service.pusher.subscribe(channelName);
                service.subbedChannels.push(channelName);
            }
        }
    };

    metaService.registerOnRootScopeUserLoadCallback(function() {
        service.init();
    });

    service.registerHandler = function(registerData, unshift) {
        var eventName = registerData.eventName;
        var handler = registerData.handler;
        var channelNames = registerData.channelNames ?
            registerData.channelNames : [registerData.channelName];
        channelNames.forEach(function(channelName) {
            // console.log(channelName);
            handleSubscription(channelName);
            if (_.isArray(service.eventHandlers[channelName])) {
                if (unshift) {
                    service.eventHandlers[channelName].unshift({
                        eventName: eventName,
                        handler: handler
                    });
                } else {
                    service.eventHandlers[channelName].push({
                        eventName: eventName,
                        handler: handler
                    });
                }
            } else if (service.eventHandlers[channelName]) {
                var currentHandler = service.eventHandlers[channelName];
                service.eventHandlers[channelName] = [
                    currentHandler, {
                        eventName: eventName,
                        handler: handler
                    }
                ];
            } else {
                service.eventHandlers[channelName] = {
                    eventName: eventName,
                    handler: handler
                };
            }
        });
    };

    service.unregisterHandler = function(registerData) {
        var eventName = registerData.eventName;
        var handler = registerData.handler;
        var channelNames = registerData.channelNames ?
            registerData.channelNames : [registerData.channelName];

        function matchingEventHandler(eventHandler) {
            return eventHandler.eventName === eventName && eventHandler.handler ===
                handler;
        };
        channelNames.forEach(function(channelName) {
            unsubscribeChannel(channelName);
            if (_.isArray(service.eventHandlers[channelName])) {
                _.remove(service.eventHandlers[channelName],
                    matchingEventHandler);
            } else if (service.eventHandlers[channelName]) {
                var currentHandler = service.eventHandlers[channelName];
                if (matchingEventHandler(currentHandler)) {
                    delete service.eventHandlers[channelName];
                }
            }
        });
    };

    var unsubscribeChannel = function(channelName) {
        // service.pusher.unsubscribe(channelName);
        function matchingChannel(subbedChannel) {
            return subbedChannel === channelName;
        };
        if (service.subbedChannels.indexOf(channelName) > -1) {
            _.remove(service.subbedChannels, matchingChannel);
        } else if (service.subQueue.indexOf(channelName) > -1) {
            _.remove(service.subbedChannels, matchingChannel);
        }
    };

    var handleSubscription = function(channelName) {
        if (service.subbedChannels.indexOf(channelName) === -1) {
            if (service.pusher) {
                service.pusher.subscribe(channelName);
                service.subbedChannels.push(channelName);
            } else {
                service.subQueue.push(channelName);
            }
        }
    };

    var eventDispatcher = function(eventType, data) {
        if (!data) return;
        var channel = data.channel ? data.channel : null;
        var event = data.event;
        var handlerObjs = service.eventHandlers[channel];
        if (!_.isArray(handlerObjs)) {
            handlerObjs = [handlerObjs];
        }
        handlerObjs.forEach(function(handlerObj) {
            if (handlerObj) {
                var eventMatches = handlerObj.eventName ?
                    event.indexOf(handlerObj.eventName) > -1 : true;
                if (eventMatches) {
                    if (__env.enableDebug && data.event !==
                        'pusher_internal:subscription_succeeded') {
                        console.log(data);
                    }
                    handlerObj.handler(data.data, channel);
                }
            }
        });
    };

    metaService.registerOnRootScopeUserLoadCallback(function() {
        function vfaxToChannel(vfax) {
            return 'fax-notify-' + vfax.vfax_uuid;
        };
        service.registerHandler({
            channelNames: $rootScope.user.vfax.map(vfaxToChannel),
            eventName: 'FaxNotifyEvent',
            handler: function(data, channel) {
                var fax_uuid = channel.substring(11);
                console.log("fax uuid", fax_uuid);
                console.log("data event", data.event);
                $rootScope.$broadcast('update.fax.messages', data.event);
            }
        });

        function locationGroupToChannel(location) {
            return 'location_groups_updates-' + location.locations_group_uuid;
        };
        service.registerHandler({
            channelNames: $rootScope.user.locations.map(
                locationGroupToChannel),
            eventName: 'LocationGroupsUpdatesEvent',
            handler: function(data, channel) {
                var location_uuid = channel.substring(24);
                var event = data.event;
                console.log(location_uuid);
                console.log(event);
                if (event.type === 'delete-voicemail' || event.type ===
                    'read-voicemail' ||
                    event.type === 'new-voicemail') {
                    $rootScope.$broadcast('update.location.voicemail',
                        event);
                    dataFactory.getDomainUnreadVoicemailsCount().then(
                        function(response) {
                            if (response.status == 200) {
                                $rootScope.domainUnreadVoicemails =
                                    response.data;
                            }
                        });
                }
            }
        });

        service.registerHandler({
            channelName: 'general-domain-' + $rootScope.user.domain_uuid,
            eventName: 'GeneralDomainEvent',
            handler: function(data) {
                var event = data.event;
                if (__env.enableDebug) console.log(
                    'GeneralDomainEvent Event');
                console.log(event.eventtype.substring(0, 15));
                if (event.eventtype === 'update-tags') {
                    tagService.getTags();
                } else if (event.eventtype === 'domain-delete' ||
                    (event.eventtype === 'user-disable' && event.user_uuid &&
                        event.user_uuid === $rootScope.user.id)) {
                    $location.path('/login', {
                        action: 'logout'
                    });
                } else if (event.eventtype === 'user-admin' && event.user_uuid &&
                    event.user_uuid === $rootScope.user.id) {
                    $rootScope.user.accessgroup = event.group_name;
                    locationService.loadLocationGroups()
                        .then(function() {
                            $rootScope.$broadcast('location.update');
                        });
                } else if (event.eventtype.substring(0, 15) ===
                    'conference-room') {
                    conferenceService.handleConferenceEvent(event);
                } else if (event.eventtype === 'blacklist-update') {
                    $rootScope.$broadcast('callersBlacklistUpdate',
                        data);
                } else if (event.eventtype === 'packagechange') {
                    $rootScope.$broadcast('package.change', event.package_uuid);
                } else if (event.eventtype === 'addon-removed') {
                    console.log(event);
                    $rootScope.$broadcast('addon-removed', event);
                } else if (event.eventtype === 'addon-added') {
                    console.log(event);
                    $rootScope.$broadcast('addon-added', event);
                } else if (event.eventtype === 'new-chat-message') {
                    if (newChatService.onPosted) {
                        newChatService.onPosted(event.message);
                    }
                } else if (event.eventtype === 'user-integration') {
                    if (event.inbox_path !== null) $rootScope.$broadcast(
                        'inbox.path.change', event.inbox_path);
                    if (event.cms_path !== null) $rootScope.$broadcast(
                        'cms.path.change', event.cms_path);
                    $rootScope.$broadcast('update.integration.settings',
                        event);
                } else if (event.eventtype === 'agency-integration') {
                    $rootScope.$broadcast(
                        'update.agency.integration.settings', event
                    );
                } else if (event.eventtype === 'new-agency-sms') {
                    var sms = event.message;
                    if (smsService.smsMessageNotFound(sms)) {
                        smsService.handleNewMessage(sms);
                    }
                } else if (event.eventtype ===
                    'agency-sms-handled-assigned') {
                    var sms = event.message;
                    smsService.receiveNewMessageHandled(sms);
                } else if (event.eventtype === 'agency-sms-deleted') {
                    var sms = event.message;
                    smsService.handleAgencySmsDeleted(sms);
                } else if (event.eventtype === 'agency-thread-deleted') {
                    smsService.handleAgencyThreadDeleted(event.threadUuid);
                } else if (event.eventtype === 'ams-sync-status') {
                    if (event.syncing) {
                        $rootScope.user.domain.amsSync = "1";
                    } else {
                        $rootScope.user.domain.amsSync = "0";
                        var search = contactService.amsSearchString ||
                            "";
                        contactService.getSearchAmsContacts(search);
                    }
                } else if (event.eventtype === 'qq-sync-status') {
                    if (event.syncing) {
                        $rootScope.user.domain.qqSync = "1";
                    } else {
                        $rootScope.user.domain.qqSync = "0";
                        var search = contactService.qqSearchString ||
                            "";
                        contactService.getSearchQQContacts(search);
                    }
                } else if (event.eventtype === 'user-email-change') {
                    if (event.user_uuid === $rootScope.user.id) {
                        userService.getUserInfoByUuid()
                            .then(function(response) {
                                if (response) {
                                    $rootScope.user = response;
                                    metaService.performCallbackCollection(
                                        metaService.onRootScopeUserLoadCallbacks
                                    );
                                }
                            });
                    }
                } else if (event.eventtype === 'new-agency-call') {
                    var call = event.call;
                    if ($rootScope.agencyCallHistoryData) {
                        var callDate = new Date(call.start_stamp.replace(
                            /-/g, "/"));
                        debugLogs([callDate, $rootScope.agencyCallHistory]);
                        var index = $filter('getByUUID')(
                            $rootScope.agencyCallHistoryData,
                            call.call_history_fs_uuid,
                            'call_history_fs'
                        );
                        var fromDateAndNoToDate = !$rootScope.agencyCallHistory
                            .fromDate &&
                            !$rootScope.agencyCallHistory.toDate;
                        var fromDateLessToDate =
                            $rootScope.agencyCallHistory.fromDate <
                            callDate &&
                            $rootScope.agencyCallHistory.toDate >
                            callDate;
                        if (index !== null) {
                            $rootScope.agencyCallHistoryData[index] =
                                agencyCallHistoryService.processCall(
                                    call);
                        } else if ($rootScope.agencyCallHistory && (
                                fromDateAndNoToDate ||
                                fromDateLessToDate)) {
                            $rootScope.agencyCallHistoryData.push(
                                callHistoryService.processCall(call)
                            );
                            if (call.call_status == 'answered' ||
                                call.call_status == 'unanswered' ||
                                call.call_status == 'declined') {
                                call['callstat'] = call.call_direction +
                                    call.call_status;
                            } else {
                                call['callstat'] = call.call_status;
                            }
                            if (call.contact_name == undefined) {
                                call['from_to'] = call.contact_number;
                            } else {
                                call['from_to'] = call.contact_name;
                            }

                        }
                    }
                }
            }
        });

        service.registerHandler({
            channelName: 'general-user-' + $rootScope.user.id,
            eventName: 'GeneralUserEvent',
            handler: function(data) {
                var event = data.event;
                if (__env.enableDebug) console.log(
                    'GeneralUserEvent Event');
                if (event.eventtype === 'bulk-tag-assignment') {
                    $rootScope.showInfoAlert(event.message);
                } else if (event.eventtype === 'user-import-failed') {
                    $timeout(function() {
                        tagService.getTags();
                        $rootScope.showErrorAlert(event.reason);
                    }, 5000);
                } else if (event.eventtype === 'user-import-complete') {
                    $timeout(function() {
                        $rootScope.showInfoAlert(event.reason);
                        if (userService.userImports[event.user_import_uuid])
                            delete userService.userImports[
                                event.user_import_uuid];
                    }, 5000);
                } else if (event.eventtype === 'user-import-working') {
                    userService.userImportingStatus(event);
                } else if (event.eventtype === 'contacts-importing') {
                    if (event.group) contactGroupsService.setGroups();
                    contactService.contactsImportingStatus(event);
                } else if (event.eventtype === 'contacts-imported' ||
                    event.eventtype === 'gmail-contacts-imported') {
                    tagService.getTags();
                    if (event.group) contactGroupsService.setGroups();
                    contactService.contactsImportingComplete(event);
                    var message = '<p>';
                    var gmail = (event.eventtype ===
                        'gmail-contacts-imported' ? ' gmail' : '');
                    if (event.success !== null) {
                        if (event.success > 0) {
                            message += event.success + gmail +
                                ' contacts have been successfully' +
                                ' imported. ';
                        } else {
                            if (event.update === 0) message +=
                                'We were unable to import any of your submitted' +
                                gmail + ' contacts. ';
                        }
                    }
                    if (event.update > 0) message += event.update + ' contacts were successfully updated.';
                    if (event.failed > 0 || event.success === 0 ) {
                        if (event.failed > 0) message +=
                            'We were unable to import ' + event.failed + gmail + ' contacts. ';
                        if (event.contact_type == 'contact') {
                            message +=
                                'Bridge will not import contacts who were ' +
                                'previously imported into Bridge or who are missing one ' +
                                'or more of the three required contact fields: first ' +
                                'name, last name, phone number.';
                        } else {
                            message +=
                                'Bridge will not import contacts missing one ' +
                                'or more of the three required contact fields: first ' +
                                'name, last name, phone number.';
                        }
                    }
                    message += '</p>';
                    if ((event.failed > 0 || event.duplicate > 0) && event.import_contact_list_uuid) {
                        message += '<p>';
                        if (event.failed > 0) message += 'There were ' + event.failed + ' failed contacts in the list. ';
                        if (event.duplicate > 0) message += 'There were ' + event.duplicate + ' duplicate contacts in the list. ';
                        var link = $rootScope.onescreenBaseUrl + '/user/contact/getimportfailure/' + event.import_contact_list_uuid + '?token=' + $rootScope.userToken;
                        message += '<a target="_blank" href="' + link + '">Click Here to Download</a> a csv containing only the problem rows so you can update and upload changes.';
                        message += '</p>';
                    }
                    $rootScope.$broadcast('group.contacts.added');
                    if (message.length > 0) $rootScope.showInfoAlert(
                        message);
                } else if (event.eventtype ===
                    'gmail-contacts-import-failed') {
                    message =
                        'There was an error while importing your Gmail ' +
                        'contacts. Some of your contacts may have been imported. ' +
                        'Please retry or contact customer support for assistance.';
                    $rootScope.showErrorAlert(message);
                } else if (event.eventtype === 'sms-blacklist-update') {
                    smsService.handleBlacklistChangeEvent(event);
                } else if (event.eventtype ===
                    'robocall-contacts-imported') {
                    $rootScope.$broadcast('imported.robocall.contacts',
                        event);
                } else if (event.eventtype === 'ams-sync-success' ||
                    event.eventtype === 'ams-sync-succes') {
                    var message =
                        "Your AMS Contacts have finished syncing";
                    $rootScope.showInfoAlert(message);
                } else if (event.eventtype === 'qq-sync-success') {
                    var message =
                        "Your QQCatalyst Contacts have finished syncing";
                    $rootScope.showInfoAlert(message);
                } else if (event.eventtype === 'new-voicemail') {
                    dataFactory.getUnreadVoicemailsCount().then(
                        function(response) {
                            if (response.status == 200) {
                                $rootScope.unreadVoicemails =
                                    response.data;
                                if ($rootScope.user.textRingtoneVolume) {
                                    var volume = $rootScope.user.textRingtoneVolume /
                                        10;
                                } else if ($rootScope.user.domain.textRingtoneVolume) {
                                    volume = $rootScope.user.domain
                                        .textRingtoneVolume / 10;
                                }
                                var symphonyURL = __env.symphonyUrl &&
                                    __env.symphonyUrl !== '' ?
                                    __env.symphonyUrl :
                                    symphonyConfig.symphonyUrl;
                                var notice = {
                                    message: 'You have ' +
                                        response.data +
                                        ' unread voicemail' +
                                        (response.data > 1 ?
                                            's' : ''),
                                    title: 'New Voicemail',
                                    url: symphonyURL +
                                        '/visualvoicemail',
                                    showOnPageHidden: false,
                                    icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/s--aTUQBFPI--/v1513264564/voicemail_cpoivz.png',
                                    audioVolume: volume,
                                    duration: 5,
                                    actions: [{
                                        action: "go-to-voicemail",
                                        title: "View Voicemails"
                                    }]
                                };
                                notificationService.fullNotification(
                                    notice);
                                $rootScope.$broadcast(
                                    'reload.voicemail', 'user');

                            }
                        });
                } else if (event.eventtype === 'billing-report') {
                    billingService.handleReportUpdate(event);
                } else if (event.eventtype === 'payment-status-update') {
                    billingService.handlePaymentStatusUpdate(event);
                }
            }
        });

        service.registerHandler({
            channelName: 'user-did-change-' + $rootScope.user.domain_uuid,
            eventName: 'UserDidChangeEvent',
            handler: function(data) {
                var event = data.event;
                debugLogs(['UserDidChangeEvent Event', data, event]);
                if (event.user_uuid === $rootScope.user.id) {
                    debugLog('change sms');
                    $rootScope.user.symphony_user_settings.sms_phone_number =
                        '1' + event.did;
                    $rootScope.user.did = event.did;
                    $rootScope.$broadcast('changed.did', $rootScope.user);
                    if (__env.enableVerto) {
                        callService.restartVerto();
                    }
                } else {
                    event['id'] = event.user_uuid;
                    $rootScope.$broadcast('changed.did', event);
                }
            }
        });

        service.registerHandler({
            channelName: 'extensionchange-' + $rootScope.user.domain_uuid,
            eventName: 'UserExtensionChangeEvent',
            handler: function(data) {
                var event = data.event;
                debugLogs(['UserExtensionChangeEvent Event', data,
                    event
                ]);
                if (event.contact_uuid === $rootScope.user.contact_uuid) {
                    $rootScope.user.user_ext = event.newext;
                    if ($rootScope.user.extension.extension) {
                        $rootScope.user.extension.extension = event.newext;
                    }
                    if (__env.enableVerto) {
                        callService.restartVerto();
                    }
                }
            }
        });

        service.registerHandler({
            channelName: 'newcall-' + $rootScope.user.extension.extension_uuid,
            eventName: 'NewCallEvent',
            handler: function(data) {
                var call = data.call;
                debugLogs(['NewCallEvent Event', data, call]);
                if ($rootScope.callHistoryData) {
                    var callDate = new Date(call.start_stamp.replace(
                        /-/g, "/"));
                    debugLogs([callDate, $rootScope.callHistory]);
                    var index = $filter('getByUUID')(
                        $rootScope.callHistoryData,
                        call.call_history_fs_uuid,
                        'call_history_fs'
                    );
                    var fromDateAndNoToDate = !$rootScope.callHistory.fromDate &&
                        !$rootScope.callHistory.toDate;
                    var fromDateLessToDate =
                        $rootScope.callHistory.fromDate < callDate &&
                        $rootScope.callHistory.toDate > callDate;
                    if (index !== null) {
                        $rootScope.callHistoryData[index] =
                            callHistoryService.processCall(call);
                    } else if ($rootScope.callHistory && (
                            fromDateAndNoToDate || fromDateLessToDate)) {
                        $rootScope.callHistoryData.push(
                            callHistoryService.processCall(call));
                        if (call.call_status == 'answered' ||
                            call.call_status == 'unanswered' ||
                            call.call_status == 'declined') {
                            call['callstat'] = call.call_direction +
                                call.call_status;
                        } else {
                            call['callstat'] = call.call_status;
                        }
                        if (call.contact_name == undefined) {
                            call['from_to'] = call.contact_number;
                        } else {
                            call['from_to'] = call.contact_name;
                        }

                    }
                }
                if (call.missed_call === 'true') {
                    var volume;
                    $rootScope.missedCalls = parseInt($rootScope.missedCalls) +
                        1;
                    if ($rootScope.user.textRingtoneVolume) {
                        volume = $rootScope.user.textRingtoneVolume /
                            10;
                    } else if ($rootScope.user.domain.textRingtoneVolume) {
                        volume = $rootScope.user.domain.textRingtoneVolume /
                            10;
                    }
                    var symphonyURL = __env.symphonyUrl && __env.symphonyUrl !==
                        '' ? __env.symphonyUrl :
                        symphonyConfig.symphonyUrl;
                    var notice = {
                        message: 'You have ' + $rootScope.missedCalls +
                            ' missed call' +
                            ($rootScope.missedCalls > 1 ? 's' : ''),
                        title: 'New Missed Call',
                        url: symphonyURL +
                            "/callhistory?missed=true",
                        showOnPageHidden: false,
                        icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/s--WwXgs8_e--/v1513263733/missed_rrxsfm.png',
                        audioVolume: volume,
                        duration: 5,
                        actions: [{
                            action: "go-to-missed-calls",
                            title: "View Missed Calls"
                        }]
                    };
                    notificationService.fullNotification(notice);
                }
                if ($rootScope.user.automaticExports == 'true' && $rootScope.user.user_status.statusName != "Do Not Disturb") {
                    integrationService.handleAutomaticExport(call);
                }
            }
        });

        service.registerHandler({
            channelName: 'callresponse-' + $rootScope.user.id,
            eventName: 'CallRespondEvent',
            handler: function(data) {
                var event = data.event;
                debugLogs(['CallRespondEvent Event', data, event]);
                if (event.call_action === 'answer') {
                    debugLog('send to answer');
                    $rootScope.$broadcast('gb-answer-call', {
                        call_uuid: event.call_uuid
                    });
                } else if (event.call_action === 'decline') {
                    $rootScope.$broadcast('gb-decline-call', {
                        call_uuid: event.call_uuid
                    });
                }

            }
        });

        service.registerHandler({
            channelName: 'chatnotice-' + getChatId(),
            eventName: 'ChatNoticeEvent',
            handler: function(data) {
                debugLog('ChatNotice Event');
                if (data.notice.noticeType === 'new_role') {
                    newChatService.handleNewRole(data.notice);
                } else if (data.notice.noticeType ===
                    'new_channel_users') {
                    $timeout(function() {
                        newChatService.handleNewChannel(data.notice);
                    }, 5000);
                }
            }
        });

        service.registerHandler({
            channelName: 'chatnotice-' + $rootScope.user.domain_uuid,
            eventName: 'ChatNoticeEvent',
            handler: function(data) {
                debugLog('ChatNotice Domain Event');
                if (data.notice.noticeType === 'new_channel_domain') {
                    $timeout(function() {
                        newChatService.handleNewChannel(data.notice);
                    }, 5000);
                }
            }
        });

        service.registerHandler({
            channelName: 'greeboxstatus-' + $rootScope.user.id,
            eventName: 'SetGreenBoxStatusEvent',
            handler: function(data) {
                debugLogs(['GreenboxStatus Event', data]);
                /* On event ... run cloudservice to update root ...
                   then set $scope.root to same folder ... balance should then be updated
                */
                if (data.message.greenbox_active) {
                    $rootScope.user.greenbox_active = data.message.greenbox_active;
                }
                if (data.message.greenbox_status) {
                    $rootScope.user.greenbox_active = data.message.greenbox_status;
                }
                $rootScope.user.greenbox_installed = 'true';
                $window.localStorage.setItem("currentUser", JSON.stringify(
                    $rootScope.user));
            }
        });

        service.registerHandler({
            channelName: 'cloud-storage-' + $rootScope.user.id,
            eventName: 'CloudStorageEvent',
            handler: function(data) {
                debugLogs(['Cloud Event', data]);
                /* On event ... run cloudservice to update root ...
                   then set $scope.root to same folder ... balance should then be updated
                */
                //if (data.event.type == 'delete-folder') $rootScope.cloudDeletedFolders = data.event.folder.folders_deleted;
                $rootScope.$broadcast('updateCloudStorage', true);
            }
        });

        service.registerHandler({
            channelName: 'cloud-storage-usage-' + $rootScope.user.domain_uuid,
            eventName: 'StorageUsageEvent',
            handler: function(data) {
                debugLog(data);
                $rootScope.user.domainCloudStorageUsage = data.event.domainusage;
                $window.localStorage.setItem("currentUser", JSON.stringify(
                    $rootScope.user));
                $rootScope.$broadcast('updateCloudStorage', true);
            }
        });

        service.registerHandler({
            channelName: 'domain-update-' + $rootScope.user.domain_uuid,
            eventName: 'DomainUpdateEvent',
            handler: function(data) {
                debugLog(data);
                var event = data.event;
                if (event.limit_storage_user) {
                    $rootScope.user.symphony_domain_settings.limit_storage_user =
                        event.limit_storage_user;
                    $rootScope.user.billingSettings.group_code =
                        event.customer_group_code;
                }
                $window.localStorage.setItem("currentUser", JSON.stringify(
                    $rootScope.user));
            }
        });

        service.registerHandler({
            channelName: 'contact-updates-' + $rootScope.user.domain_uuid,
            eventName: 'UserContactUpdateEvent',
            handler: function(data) {
                var contact = data.contact;
                if (__env.enableDebug) console.log(contact);
                if (contact.action === 'new' || contact.action ===
                    'undelete') {
                    if (contact.user_uuid) {
                        contact = contactService.getContactByUuid(
                            contact.contact_uuid);
                        newChatService.addUserToTeam(contact.chat_id);
                    }
                    $rootScope.$broadcast('company.setup.user.added');
                } else if (contact.action === 'update') {
                    $rootScope.$broadcast('company.setup.user.updated',
                        contact);
                } else if (contact.action === 'delete') {
                    $rootScope.$broadcast('user-deleted', contact);
                    if (contact.user_uuid === $rootScope.user.id) {
                        if (callService.onCall()) {
                            callService.hangUpCall();
                            $rootScope.$broadcast('HangUpCallEvent');
                        }
                        $location.path('/login', {
                            action: 'logout'
                        });
                    }
                }
            }
        });

        service.registerHandler({
            channelName: 'contactgroup-member-' + $rootScope.user.domain_uuid,
            eventName: 'ContactGroupUpdateEvent',
            handler: function(data) {
                var newgroup = data.group;
                if (newgroup.action === 'groupupdate') {
                    if (newgroup.viewers.indexOf($rootScope.user.contact_uuid) !==
                        -1) {
                        contactGroupsService.addUpdateGroupToView(
                            newgroup);
                    } else {
                        contactGroupsService.removeGroupFromView(
                            newgroup);
                    }
                } else if (newgroup.action === 'delete') {
                    console.log("remove group member");
                    var group = contactGroupsService.getGroupByUuid(
                        newgroup.group_uuid);
                    if (group) {
                        var index = group.members.indexOf(newgroup.contact_uuid);
                        if (index !== -1) group.members.splice(index, 1);
                    }
                } else if (newgroup.action === 'newviewers') {
                    group = contactGroupsService.getGroupByUuid(
                        newgroup.group_uuid);
                    if (group != undefined) {
                        group.viewer_users = newgroup.viewer_users;
                    }
                } else if (newgroup.action === 'updateviewers') {
                    group = contactGroupsService.getGroupByUuid(
                        newgroup.group_uuid);
                    if (group) {
                        if (newgroup.viewer_users.indexOf($rootScope.user
                                .contact_uuid) === -1) {
                            contactGroupsService.removeGroupFromView(
                                newgroup);
                        } else {
                            group.viewer_users = newgroup.viewer_users;
                        }
                    } else {
                        if (newgroup.viewer_users.indexOf($rootScope.user
                                .contact_uuid) !== -1) {
                            contactGroupsService.addGroupToView(
                                newgroup);
                        }
                    }
                } else if (newgroup.action === 'groupdelete') {
                    group = contactGroupsService.getGroupByUuid(
                        newgroup.group_uuid);
                    if (group) {
                        contactGroupsService.removeGroupFromView(
                            newgroup);
                    }
                } else if (newgroup.action === 'viewgroupremoved') {
                    contactGroupsService.removeGroupFromView(newgroup);
                } else if (newgroup.action === 'viewgroupadded') {
                    contactGroupsService.addGroupToView(newgroup);
                }
            }
        });

        service.registerHandler({
            channelName: 'video-archive-' + $rootScope.user.id,
            eventName: 'VideoArchiveUpdateEvent',
            handler: function(data) {
                var newvideoarchive = data.videoarchive;
                console.log(newvideoarchive);
                // if (newvideoarchive.action === 'video' ||
                //     newvideoarchive.action === 'share') {
                    $rootScope.$broadcast('new.video.archive', newvideoarchive);
                // }
            }
        });

        service.registerHandler({
            channelName: 'tkgroups-updates-' + $rootScope.user.domain_uuid,
            eventName: 'TimeKeeperGroupsUpdateEvent',
            handler: function(data) {
                var tkgroup = data.group;
                if (tkgroup.action === 'update') {
                    $rootScope.$broadcast('update.tkgroup', tkgroup);
                } else if (tkgroup.action === 'new') {
                    $rootScope.$broadcast('new.tkgroup', tkgroup);
                } else if (tkgroup.action === 'delete') {
                    $rootScope.$broadcast('delete.tkgroup', tkgroup);
                }
            }
        });

        service.registerHandler({
            channelName: 'vminfo-' + $rootScope.user.extension.extension_uuid,
            eventName: 'UserCallVMStatusEvent',
            handler: function(data) {
                var vminfo = data.vminfo;
                if ($rootScope.unreadVoicemails < vminfo.log_value) {
                    if ($rootScope.user.textRingtoneVolume) {
                        var volume = $rootScope.user.textRingtoneVolume /
                            10;
                    } else if ($rootScope.user.domain.textRingtoneVolume) {
                        volume = $rootScope.user.domain.textRingtoneVolume /
                            10;
                    }
                    var symphonyURL = __env.symphonyUrl && __env.symphonyUrl !==
                        '' ?
                        __env.symphonyUrl : symphonyConfig.symphonyUrl;
                    var notice = {
                        message: 'You have ' + vminfo.log_value +
                            ' unread voicemail' +
                            (vminfo.log_value > 1 ? 's' : ''),
                        title: 'New Voicemail',
                        url: symphonyURL + '/visualvoicemail',
                        showOnPageHidden: false,
                        icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/s--aTUQBFPI--/v1513264564/voicemail_cpoivz.png',
                        audioVolume: volume,
                        duration: 5,
                        actions: [{
                            action: "go-to-voicemail",
                            title: "View Voicemails"
                        }]
                    };
                    notificationService.fullNotification(notice);
                }
                $rootScope.unreadVoicemails = vminfo.log_value;
                $rootScope.$broadcast('reload.voicemail', 'user');
                dataFactory.getUnreadVoicemailsCount().then(function(
                    response) {
                    if (response.status == 200) {
                        $rootScope.unreadVoicemails = response.data;
                    }
                });
            }
        });

        service.registerHandler({
            channelName: 'missedcall-' + $rootScope.user.extension.extension_uuid,
            eventName: 'UserMissedCallEvent',
            handler: function(data) {
                var logEntry = data.logEntry;
                if ($rootScope.missedCalls < logEntry.log_value) {
                    if ($rootScope.user.textRingtoneVolume) {
                        var volume = $rootScope.user.textRingtoneVolume /
                            10;
                    } else if ($rootScope.user.domain.textRingtoneVolume) {
                        volume = $rootScope.user.domain.textRingtoneVolume /
                            10;
                    }
                    var symphonyURL = __env.symphonyUrl && __env.symphonyUrl !==
                        '' ?
                        __env.symphonyUrl : symphonyConfig.symphonyUrl;
                    var notice = {
                        message: 'You have ' + logEntry.log_value +
                            ' missed call' +
                            (logEntry.log_value > 1 ? 's' : ''),
                        title: 'New Missed Call',
                        url: symphonyURL +
                            "/callhistory?missed=true",
                        showOnPageHidden: false,
                        icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/s--WwXgs8_e--/v1513263733/missed_rrxsfm.png',
                        audioVolume: volume,
                        duration: 5
                    };
                    notificationService.fullNotification(notice);
                }
                $rootScope.missedCalls = logEntry.log_value;

            }
        });

        service.registerHandler({
            channelName: 'screeninvite-' + $rootScope.user.domain_uuid,
            eventName: 'ScreenshareInviteEvent',
            handler: function(data) {
                var invite = data.invite[0];
                if (invite.user_uuid === $rootScope.user.user_uuid) {
                    dataFactory.getScreenshareInvite(invite.screenshare_uuid)
                        .then(function(response) {
                            if (response.data.success) {
                                var info = response.data.success.invite;
                                var modalPath =
                                    '/screensharing/incomingscreenshare.html';
                                $rootScope.showModalWithData(
                                    modalPath, info);
                            }
                        });

                }
            }
        });

        service.registerHandler({
            channelName: 'amcampaignupdate-' + $rootScope.user.domain_uuid,
            eventName: 'AmCampaignUpdateEvent',
            handler: function(data) {
                var campaign = data.update;
                if (campaign) {
                    if (__env.enableDebug) console.log(campaign);
                    $rootScope.$broadcast('am-campaign-update',
                        campaign);
                }
                //ACCOUNT FOR SOMEONE ELSE EDITING THE CAMPAIGN BEFORE UPDATING?
            }
        });

        service.registerHandler({
            channelName: 'ringtonechange-' + $rootScope.user.id,
            eventName: 'RingtoneChangeEvent',
            handler: function(data) {
                var event = data.event;
                if (event.callOutputSourceVolume || event.callOutputSourceVolume ===
                    0) {
                    $rootScope.user.callOutputSourceVolume = event.callOutputSourceVolume;
                    $rootScope.$broadcast('upd-call-output-src-volume',
                        event);
                }
                if (__env.enableDebug) console.log(event);
                if (event.action === 'defaultupdate') {
                    if (event.callRingtone) {
                        $rootScope.user.domain.callRingtone = event.callRingtone;
                    }
                    if (event.chatRingtone) {
                        $rootScope.user.domain.chatRingtone = event.chatRingtone;
                    }
                    if (event.textRingtone) {
                        $rootScope.user.domain.textRingtone = event.textRingtone;
                    }
                    if (event.videoInviteRingtone) {
                        $rootScope.user.domain.videoInviteRingtone =
                            event.videoInviteRingtone;
                    }
                    if (event.callRingtoneVolume) {
                        $rootScope.user.domain.callRingtoneVolume =
                            event.callRingtoneVolume;
                    }
                    if (event.textRingtoneVolume) {
                        $rootScope.user.domain.textRingtoneVolume =
                            event.textRingtoneVolume;
                    }
                    if (event.chatRingtoneVolume) {
                        $rootScope.user.domain.chatRingtoneVolume =
                            event.chatRingtoneVolume;
                    }
                    if (event.videoInviteRingtoneVolume) {
                        $rootScope.user.domain.videoInviteRingtoneVolume =
                            event.videoInviteRingtoneVolume;
                    }
                    if (!$rootScope.user.callRingtone) {
                        $rootScope.showInfoAlert(
                            "The default company ringtones have been updated by your administrator."
                        );
                    }
                    if (__env.enableDebug) console.log($rootScope.user.domain);
                } else if (event.action === 'delete') {
                    if ($rootScope.user.callRingtone === event.audio_library_uuid) {
                        $rootScope.user.callRingtone = null;
                        $rootScope.user.callRingtoneVolume = null;
                        $rootScope.user.callRingtonePath = null;
                        var message =
                            'Your company administrator has removed ' +
                            'the ringtone you were currently using so we have set ' +
                            'your ringtone to the company default. If you would like ' +
                            'to customize your ringtone please visit Settings -> ' +
                            'Profile -> Notifications.';
                        $rootScope.showInfoAlert(message, true);
                    } else if ($rootScope.user.domain.callRingtone &&
                        $rootScope.user.domain.callRingtone.audio_library_uuid ===
                        event.audio_library_uuid) {
                        $rootScope.user.domain.callRingtone = null;
                        $rootScope.user.domain.callRingtoneVolume =
                            null;
                        if (!$rootScope.user.callRingtone) {
                            message =
                                'Your company administrator has removed ' +
                                'the ringtone you were currently using so we have set ' +
                                'your ringtone to the company default. If you would ' +
                                'like to customize your ringtone please visit ' +
                                'Settings -> Profile -> Notifications.';
                            $rootScope.showInfoAlert(message);
                        }
                    }
                }
                $window.localStorage.setItem("currentUser", JSON.stringify(
                    $rootScope.user));
            }
        });

        service.registerHandler({
            channelName: 'hscopy-' + $rootScope.user.id,
            eventName: 'HawksoftCopyEvent',
            handler: function(data) {
                var event = data.event;
            }
        });

        service.registerHandler({
            channelName: 'vcinvite-' + $rootScope.user.id,
            eventName: 'VideoConferenceInviteEvent',
            handler: function(data) {
                var invite = data.inviteevent;
                if (invite.target_user_uuid === $rootScope.user.id) {
                    dataFactory.getVideoConferenceInvite(invite.video_conference_invite_uuid)
                        .then(function(response) {
                            if (response.data.success) {
                                var info = response.data.success;
                                var templateUrl =
                                    '/video/incomingvideochatmodal.html';
                                $rootScope.showModalWithData(
                                    templateUrl, info);
                                var notice = {
                                    message: response.data.success
                                        .message,
                                    title: 'Video Conference Invite: ',
                                    url: null,
                                    icon: 'https://res.cloudinary.com/freebizads/image/upload/v1482344729/sms-icon_eu8epj.png'
                                };
                                notificationService.fullNotification(
                                    notice);
                            }
                        });
                }

            }
        });

        service.registerHandler({
            channelName: 'contact_status_change-' + $rootScope.user.domain_uuid,
            eventName: 'UserStatusChangeEvent',
            handler: function(data) {
                if (data.message && $rootScope.user) {
                    if (data.message.user_uuid === $rootScope.user.id) {
                        var dataStatus = data.message.user_status;
                        var curStatus = $rootScope.user.user_status.statusName;
                        console.log(dataStatus);
                        console.log(curStatus);
                        if (dataStatus !== curStatus && !$rootScope.isScreenpop) {
                            if (dataStatus === "Offline") {
                                if (curStatus) {
                                    statusService.doHardStatusUpdate(curStatus);
                                    console.warn("PUSHER SETTING EXISTING STATUS AS " + curStatus);
                                    return;
                                } else {
                                    dataStatus = "Available";
                                }
                            }
                            console.warn("PUSHER SETTING STATUS AS " + dataStatus);
                            statusService.setStatus(dataStatus);
                        }
                    } else {
                        var contactUuid = data.message.contact_uuid;
                        var data = {
                            contactUuid: contactUuid,
                            status: data.message.user_status
                        };
                        $rootScope.$broadcast('contact.status.change', data);
                    }
                }

            }
        });

        service.registerHandler({
            channelName: 'newparking-' + $rootScope.user.domain.domain_name,
            eventName: 'NewParkingEvent',
            handler: function(data) {
                // console.debug("PUSHER: NewParkingEvent:data: " + JSON.stringify(data));
                if (data.domain_name && data.domain_name === $rootScope.user.domain.domain_name) {
                    if (data.lots.lot.extension) {
                        $rootScope.parkedExts = data.lots.lot.extension;
                        callService.processParkedExts($rootScope.parkedExts);
                    }
                    $rootScope.$broadcast('NewParkingEvent');
                    $rootScope.newParkingEventLastBroadcastTimestamp = Date
                        .now();
                }
            }
        });

        service.registerHandler({
            channelName: 'tok_box_video_invite-' + $rootScope.user.id,
            eventName: '',
            handler: function(data) {
                console.log(data);
                $rootScope.$broadcast('video.invite', data.sender_uuid, data.room_url);
            }
        });

        service.registerHandler({
            channelName: 'tok_box_video_cancel_invite-' + $rootScope.user.id,
            eventName: '',
            handler: function(data) {
                $rootScope.$broadcast('video.invite.cancel', data.sender_uuid);
            }
        });

        service.registerHandler({
            channelName: 'sms-' + $rootScope.user.id,
            eventName: 'SmsMessageReceivedEvent',
            handler: function(data) {
                var sms = data.message;
                if (__env.enableDebug) console.log(sms);
                if (smsService.smsMessageNotFound(sms)) {
                    smsService.handleNewMessage(sms);
                }
            }
        });

    });

    /* ------------------------------ PRIVATE HELPER FUNCTIONS ----------------------------- */

    var debugLogs = function(items) {
        _.forEach(items, function(item) {
            debugLog(item);
        });
    };

    var debugLog = function(msg) {
        if (__env.enableDebug) console.log(msg);
    };

    function getChatId() {
        var settings = $rootScope.user.symphony_user_settings;
        if (settings && settings.mattermost_user_id) {
            return settings.mattermost_user_id;
        }
        return null;
    };

    return service;
});
