'use strict';

proySymphony.service('smsService', function($window, $rootScope, $uibModalStack, userService,
    locationService, emulationService, $location, symphonyConfig, __env, $filter, $cookies,
    $timeout, smsApi, usefulTools, dataFactory, focusService, contactService,
    notificationService, metaService, fileService) {

    var service = {
        waitingForNewThread: false,
        availThreads: {},
        smsData: {},
        messageInc: 1000,
        threadInc: 1000,
        maxThreadCount: 500,
        callbackEvents: ["onAfterInit"],
        smsLocations: [],
        currentLocationUuid: null,
        currentLocation: null,
        lastNotifiedThread: null,
        unreadCounts: 0,
        isCompanySms: false
    };

    var triggerEvent = metaService.withCallbacks(service);
    service.init = function(userUuid) {
        if (!userUuid){
            userUuid = $rootScope.user.id;
        }
        if (userUuid === $rootScope.user.id) {
            service.currentUser = $rootScope.user;
        }
        service.registerOnAfterInitCallback(function() { 
            service.hasInitialized = true; 
        });
        service.updateUnreadCounts();
        console.log("LOAD SMS THREADS - init");
        service.getSmsThreads(userUuid)
            .then(function(response) {
                service.setLocationsForUser();
                if ($cookies.get('goToThread')) {
                    var thread_uuid = $cookies.get('goToThread');
                    $cookies.remove('goToThread');
                    service.setCurrentThread(thread_uuid);
                }
                triggerEvent("onAfterInit");
            });
    };

    service.getSmsThreads = function(user_uuid) {
        var page = 1;
        var perPage = 30;
        service.availThreads = {};
        service.loadingThreads = true;
        return retrieveThreads(user_uuid, page, perPage)
            .then(function(response) {
                if (response) {
                    return response;
                }
                return [];
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                return [];
            });
    };

    function retrieveThreads(user_uuid, page, perPage) {
        var data = {
            user_uuid: user_uuid, 
            page: page,
            perPage: perPage
        };
        return smsApi.postGetSmsThreads(data)
        .then(function(response) {
            console.log(response.data);
            if (response.data.success) {
                var data = response.data.success.data;
                if (page == 1) service.loadingThreads = false;
                if (data.threads) {
                    service.availThreads = _.extend(service.availThreads, data.threads);
                    if (__env.enableDebug) console.log("AVAIL THREADS");
                    if (__env.enableDebug) console.log(service.availThreads);
                }
                if ((page * perPage) < data.totalThreads && (page * perPage) < service.maxThreadCount) {
                    page += 1;
                    retrieveThreads(user_uuid, page, perPage);
                } else {
                    return true;
                }
            } else {
                return null;
            }
        });
    }

    // service.getSmsThreadsOld = function(user_uuid) {
    //     return smsApi.getSmsThreads(user_uuid)
    //         .then(function(response) {
    //             if (response.data.error) {
    //                 if (__env.enableDebug) console.log(response.data.error.message);
    //                 return {};
    //             } else {
    //                 if (__env.enableDebug) console.log("AVAIL THREADS");
    //                 if (__env.enableDebug) console.log(response.data.success.data);
    //                 service.availThreads = response.data.success.data;
    //                 return response.data;
    //             }
    //         }, function(error) {
    //             if (__env.enableDebug) console.log(error);
    //             return [];
    //         });
    // };

    service.setCurrentLocation = function(location_group_uuid) {
        service.currentLocationUuid = location_group_uuid;
        var loc;
        console.log(location_group_uuid);
        angular.forEach(service.smsLocations, function(location) {
            console.log(location);
            if (location.locations_group_uuid === location_group_uuid) loc =
                location;
        });
        service.currentLocation = loc;
    };

    service.getThreadsByLocation = function(location_group_uuid) {
        service.setCurrentLocation(location_group_uuid);
        service.updateUnreadCounts();
        service.loadingThreads = true;
        return smsApi.getThreadsByLocation(location_group_uuid)
            .then(function(response) {
                service.loadingThreads = false;
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                    return {};
                } else {
                    if (__env.enableDebug) console.log("AVAIL THREADS");
                    if (__env.enableDebug) console.log(response.data.success.data);
                    service.availThreads = response.data.success.data;
                    service.updateThreadContacts();
                    return response.data;
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                return [];
            });
    };

    service.getLocationThreads = function(location_group_uuid){
        service.availThreads = {};
        service.loadingThreads = true;
        var page = 1;
        return postGetSmsThreadsByLocation(location_group_uuid, page)
            .then(function(response){
                if (response){
                    return response;
                }
                return [];
            }, function(error){
                if (__env.enableDebug) console.log(error);
            });
    };

    function postGetSmsThreadsByLocation(location_group_uuid, page){
        page ? page : 1;
        var perPage = 30;
        service.setCurrentLocation(location_group_uuid);
        service.updateUnreadCounts();
        
        var data = {
            location_group_uuid: location_group_uuid,
            page: page,
            perPage: perPage,
        }
        
        return smsApi.postGetSmsThreadsByLocation(data)
        .then(function(response){
            if (response.data.success){
                var data = response.data.success.data;
                if (page == 1) service.loadingThreads = false;
                if (data.threads){
                    service.availThreads = _.extend(service.availThreads, data.threads);
                    if (__env.enableDebug) console.log("AVAIL LOC THREADS");
                    if (__env.enableDebug) console.log(service.availThreads);
                }
                if ((page * perPage) < data.totalThreads && (page * perPage) < service.maxThreadCount ) {
                    page += 1;
                    postGetSmsThreadsByLocation(location_group_uuid, page);
                } else {
                    return true;
                }
            } else {
                return null;
            }
        })
        .catch(function(error){
            $rootScope.showErrorAlert(error);
        });
    };

    service.setLocationsForUser = function() {
        locationService.getLocationGroups('texting', $rootScope.user.domain_uuid)
            .then(function(response) {
                service.smsLocations = response;
                console.log("SMS LOCATIONS");
                console.log(response);
            });
    };

    function isUser(contact) {
        return contact.contact_type === 'user';
    }

    service.setEmulationUser = function(userUuid) {
        service.init(userUuid)
            .then(function() {
                service.smsData = {};
            });
    };

    service.isLocationManager = function() {
        return service.currentLocation.ismanager('texting');
    };

    service.setCurrentThread = function(thread_uuid) {
        var thread = service.availThreads[thread_uuid];
        var last_message = null;
        var userUuid = service.currentUser.user_uuid;
        if (emulationService.isEmulatedUser()) userUuid = emulationService.isEmulatedUser();
        if (thread.messages && thread.messages.length > 0) last_message = thread.messages[
            thread.messages.length - 1].message_uuid;
        return service.getMessagesbyThread(thread, userUuid, last_message, null)
            .then(function(response) {
                var messages = response;
                service.processMessageData(messages);

                if (last_message) {
                    thread.messages = _.concat(thread.messages, messages);
                } else {
                    thread.messages = messages;
                }
                if (!emulationService.isEmulatedUser() && !thread.location_group_uuid &&
                    service.currentUser.id === $rootScope.user.id) {
                    thread.unread_count = 0;
                    service.updateThreadCount(thread_uuid);
                    service.updateUnreadCounts();
                }
                service.smsData.currentThread = thread;
                $timeout(function() {
                    usefulTools.goToId('sms-bottom');
                }, 0, false);
                return;
            });
    };

    service.unreadMessages = function() {
        return _.sum(usefulTools.convertObjectToArray(service.unreadCounts));
    };

    service.unreadLocationMessageCount = function() {
        var count = 0;
        angular.forEach(service.unreadCounts, function(value, key) {
            if (key !== $rootScope.user.id) count += value;
        });
        return count;
    };

    service.removeThread = function(thread_uuid) {
        return smsApi.getRemoveSmsThread(thread_uuid)
            .then(function(response) {
                if (response.data.success) {
                    service.availThreads[thread_uuid].deleted = 'true';
                }
                return response;
            });
    };

    service.removeMultipleThreads = function(data) {
        return smsApi.postRemoveMultipleThreads(data)
            .then(function(response) {
                if (response.data.success) {
                    angular.forEach(data.threads, function(uuid) {
                        service.availThreads[uuid].deleted = 'true';
                        delete service.availThreads[uuid];
                        service.updateUnreadCounts();
                    });
                }
                return response;
            });
    };

    service.deleteMessage = function(message) {
        return smsApi.getRemoveSmsMessage(message.message_uuid)
            .then(function(response) {
                if (response.data.success) {
                    var index = $filter('getByUUID')(service.smsData.currentThread.messages,
                        message.message_uuid, 'message');
                    if (index !== null) {
                        if (index === service.smsData.currentThread.messages.length -
                            1)
                            service.smsData.currentThread.most_recent = service.smsData
                            .currentThread.messages[index - 1];
                        service.smsData.currentThread.messages.splice(index, 1);
                    }
                }
                return response;
            });
    };

    service.loadNewThread = function(thread_uuid) {
        if (service.availThreads.length === 0) {
            return service.getSmsThreads(service.currentUser.id)
                .then(function() {
                    return true;
                });
        } else {
            return smsApi.getSmsThreadInfo(thread_uuid, service.currentUser.id)
                .then(function(response) {
                    if (response.data.success) {
                        var thread = response.data.success.data;
                        service.availThreads[thread_uuid] = thread;
                        return true;
                    }
                });
        }
    };

    service.markThreadRead = function(thread_uuid, user_uuid) {
        if (user_uuid === $rootScope.user.id) {
            smsApi.getSetThreadRead(thread_uuid, user_uuid)
                .then(function(response) {
                    if (response.data.success) {
                        service.availThreads[thread_uuid].unread_count = 0;
                    }
                });
        }
    };

    service.updateUnreadCounts = function() {
        smsApi.getSmsUnreadMessageCount()
            .then(function(response) {
                service.unreadCounts = response.data.success.data;
            });
    };

    service.incrementUnreadCount = function(sms) {
        if (sms.location_group_uuid) {
            if (!service.unreadCounts[sms.location_group_uuid]) {
                service.unreadCounts[sms.location_group_uuid] = 1;
            } else {
                service.unreadCounts[sms.location_group_uuid] += 1;
            }
        } else {
            if (!service.unreadCounts[$rootScope.user.id]) {
                service.unreadCounts[$rootScope.user.id] = 1;
            } else {
                service.unreadCounts[$rootScope.user.id] += 1;
            }
        }
    };

    service.receiveNewMessageHandled = function(sms) {
        var thread = service.availThreads[sms.thread_uuid];
        if (thread && thread.messages) {
            var index = $filter('getByUUID')(thread.messages, sms.message_uuid,
                'message');
            sms.media = thread.messages[index].media;
            if (index !== null) thread.messages[index] = sms;
        }
    };

    service.handleAgencySmsDeleted = function(sms) {
        var thread = service.availThreads[sms.thread_uuid];
        if (thread && thread.messages) {
            var index = $filter('getByUUID')(thread.messages, sms.message_uuid,
                'message');
            if (index !== null) thread.messages.splice(index, 1);
        }
    };

    service.handleAgencyThreadDeleted = function(threadUuid) {
        if (service.availThreads[threadUuid]) {
            var thread = service.availThreads[threadUuid];
            if (service.smsData.currentThread.thread_uuid === threadUuid) {
                $rootScope.$broadcast('agency.thread.deleted', thread);
            }
            delete service.availThreads[threadUuid];
        }
    };

    service.handleNewMessage = function(sms) {
        var selfMessage = false;
        if (sms.from_number === sms.user_sms) selfMessage = true;
        if (sms.tempUuid && sms.from_number === service.currentUser.symphony_user_settings
            .sms_phone_number) return;
            
        if (sms.new_thread === 'true') {
            console.log(sms.location_group_uuid);
            console.log(service.currentLocationUuid);
            console.log(service.isCompanySms);
            if ((sms.location_group_uuid && service.isCompanySms) ||
                (!sms.location_group_uuid && !service.isCompanySms)) {
            // if (!sms.location_group_uuid ||
            //     (sms.location_group_uuid && sms.location_group_uuid === service.currentLocationUuid)
            // ) {
                service.loadNewThread(sms.thread_uuid)
                    .then(function(response) {
                        console.log(response);
                        if (!selfMessage) {
                            service.lastNotifiedThread = sms.thread_uuid;
                            notificationService.showSmsNotification(sms, service.smsData
                                .currentThread);
                            service.incrementUnreadCount(sms);
                        }
                    });
            } else {
                service.incrementUnreadCount(sms);
            }
        } else {
            service.restoreThreadIfDeleted(sms);
            if (service.smsData.currentThread && service.smsData.currentThread.thread_uuid ===
                sms.thread_uuid) {
                var messages = service.smsData.currentThread.messages;
                var last = messages[messages.length - 1];
                var newDay = usefulTools.isNewDay(sms.created_at, (last ? last.created_at :
                    ''));
                sms.newDay = newDay;
                messages.push(sms);
                if (service.smsInFocus && !sms.location_group_uuid) {
                    smsApi.getSetMessageRead(sms.message_uuid);
                } else {
                    if (!selfMessage) {
                        if (service.availThreads[sms.thread_uuid]) service.availThreads[
                            sms.thread_uuid].unread_count += 1;
                        service.incrementUnreadCount(sms);
                    }
                }
                $timeout(function() {
                    usefulTools.goToId("sms-" + sms.message_uuid);
                }, 0, false);
            } else {
                if (!selfMessage) {
                    if (service.availThreads[sms.thread_uuid]) service.availThreads[sms
                        .thread_uuid].unread_count += 1;
                    service.incrementUnreadCount(sms);
                }
            }
            if (service.availThreads[sms.thread_uuid]) service.availThreads[sms.thread_uuid]
                .most_recent = sms;
            if (!selfMessage) {
                service.lastNotifiedThread = sms.thread_uuid;
                notificationService.showSmsNotification(sms, service.smsData.currentThread);
            }
        }
    };

    service.restoreThreadIfDeleted = function(sms) {
        if (service.availThreads[sms.thread_uuid] &&
            (service.availThreads[sms.thread_uuid].deleted !== null ||
                service.availThreads[sms.thread_uuid].deleted_at !== null)) {
            service.availThreads[sms.thread_uuid].deleted = null;
            service.availThreads[sms.thread_uuid].deleted_at = null;
        }
    };

    service.getCurrentThreadUuids = function() {
        return _.keys(service.availThreads);
    };

    service.searchSmsMessages = function(data) {
        return smsApi.postSearchMessages(data)
            .then(function(response) {
                var results = response.data.success.data;
                var array = [];
                angular.forEach(results, function(result) {
                    var thread = service.availThreads[result.thread_uuid];
                    result.thread = thread;
                    array.push(result);
                });
                return array;
            });
    };

    service.getSearchResults = function(message) {
        //look if result is in post cache and render if so ...
        var thread = service.availThreads[message.thread_uuid];
        thread.searchInfo = {};
        return smsApi.postGetSearchResult(message)
            .then(function(response) {
                if (response.data.success) {
                    var results = response.data.success.data;
                    service.processMessageData(results);
                    thread.searchInfo.messages = results;
                    return thread;
                }

            });
    };

    service.goToSearchResult = function(message) {
        return service.getSearchResults(message)
            .then(function(response) {
                $cookies.put('currentThread', response.thread_uuid);
                service.smsData.currentThread = response;
                $timeout(function() {
                    usefulTools.goToId('sms-' + message.message_uuid);
                }, 500, false);
            });
    };

    service.showCurrentMessages = function() {
        if (service.smsData.currentThread.messages) {
            delete service.smsData.currentThread.searchInfo;
            service.scrollToBottom();
        } else {
            delete service.smsData.currentThread.searchInfo;
            service.setCurrentThread(service.smsData.currentThread.thread_uuid);
        }
    };

    service.scrollToBottom = function() {
        $timeout(function() {
            usefulTools.goToId('sms-bottom');
        }, 1000, false);
    };

    service.updateThreadCount = function(thread_uuid) {
        smsApi.updateThreadCount(thread_uuid);
    };

    service.processMessageData = function(messages) {
        var index = 0;
        angular.forEach(messages, function(message) {
            var newDay = usefulTools.isNewDay(message.created_at, (index == 0 ?
                '' : messages[index - 1].created_at));
            message.newDay = newDay;
            index++;
        });
    };

    service.loadPreviousMessages = function() {
        var thread = service.smsData.currentThread;
        var userUuid = service.currentUser.user_uuid;
        if (emulationService.isEmulatedUser()) userUuid = emulationService.isEmulatedUser();
        var data = {
            thread_uuid: thread.thread_uuid,
            before: thread.messages[0].message_uuid,
            user_uuid: userUuid
        };
        if (thread.location_group_uuid) data.location_group_uuid = thread.location_group_uuid;
        return smsApi.postGetSmsMessagesByThread(data)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    var messages = response.data.success.data;
                    service.processMessageData(messages);
                    var newmessages = _.concat(messages, thread.messages);
                    thread.messages = newmessages;
                    $timeout(function() {
                        usefulTools.goToId('sms-' + data.before);
                    }, 500);
                }
                return true;
            }, function(error) {
                console.log(error);
                return true;
            });
    };

    service.getMessagesbyThread = function(thread, user_uuid, last_message, before_message) {
        var data = {
            thread_uuid: thread.thread_uuid,
            last: last_message,
            user_uuid: user_uuid
        };
        if (thread.location_group_uuid) data.location_group_uuid = thread.location_group_uuid;
        console.log(data);
        return smsApi.postGetSmsMessagesByThread(data)
            .then(function(response) {
                if (response.data.error) {
                    console.log(response.data.error.message);
                    return [];
                } else {
                    console.log(response.data.success.data);
                    return response.data.success.data;
                }
            }, function(error) {
                return [];
            });
    };

    service.getMessagesbyThread_OLD = function(thread_uuid, user_uuid, last_message) {
        return smsApi.getSmsTextsbyThread(thread_uuid, user_uuid, last_message)
            .then(function(response) {
                if (response.data.error) {
                    console.log(response.data.error.message);
                    return [];
                } else {
                    return response.data.success.data;
                }
            }, function(error) {
                return [];
            });
    };

    service.showTheads = function() {
        service.smsData.currentThread = null;
        $rootScope.contactsSelected = [];
        $rootScope.selectedContacts = {};
    };

    service.handleBlacklistChangeEvent = function(event) {
        if (!emulationService.emulatedUser || (emulationService.emulatedUser &&
                emulationService.emulatedUser === $rootScope.user.id)) {
            if (event.update_type === 'blacklistdelete') {
                service.init(service.currentUser.id);
            } else if (event.update_type === 'blacklistadd') {
                if (service.availThreads[event.thread_uuid]) delete service.availThreads[
                    event.thread_uuid];
                if (service.sms && service.sms.currentThread && service.sms.currentThread
                    .thread_uuid === event.thread_uuid) service.showTheads();
            }
        }
    };

    service.blacklistNumber = function(blacklist) {
        var data = {
            sms_blacklist_uuid: blacklist.sms_blacklist_uuid ? blacklist.sms_blacklist_uuid : null,
            number: blacklist.numberToAdd.length === 10 ? '1' + blacklist.numberToAdd : blacklist.numberToAdd,
            reach: blacklist.reach,
            userUuid: service.currentUser.id,
            added_by: $rootScope.user.id
        };
        return smsApi.postManageBlacklist(data)
            .then(function(response) {
                if (response.data.success) {
                    // var threads = response.data.success.threads;
                    // angular.forEach(threads, function(thread) {
                    //     delete service.availThreads[thread.thread_uuid];
                    // });
                    service.init(service.currentUser.id);
                    service.showTheads();
                    return {
                        blacklist: response.data.success.blacklist
                    };
                } else {
                    console.log(response.data.error.message);
                    $rootScope.showErrorAlert(response.data.error.message);
                    return [];
                }
            });
    };

    service.getContactRetrievalFunction = function(thread) {
        return function() {
            if (thread.contact_uuid) {
                return contactService.getContactByUuid(thread.contact_uuid);
            } else {
                return contactService.getContactByPhoneNumber(thread.contact_phone_number
                    .substr(1));
            }
        };
    };

    service.updateThreadContacts = function() {
        angular.forEach(service.availThreads, function(thread) {
            if (thread.contact_uuid) {
                thread.contact = contactService.getContactByUuid(thread.contact_uuid);
            } else {
                thread.contact = contactService.getContactByPhoneNumber(thread.contact_phone_number
                    .substr(1));
            }
        });
    };

    service.handleMessage = function(message) {
        return smsApi.getHandleMessage(message.message_uuid)
            .then(function(response) {
                if (response.data.success) {
                    var info = response.data.success.data;
                    var thread = service.availThreads[message.thread_uuid];
                    if (info.handled_by && !message.handled_by) {
                        thread.unread_count += -1;
                        service.unreadCounts[thread.location_group_uuid] += -1;
                    } else if (!info.handled_by && message.handled_by) {
                        thread.unread_count += 1;
                        service.unreadCounts[thread.location_group_uuid] += 1;
                    }
                }
                return response;
            });
    };

    service.assignCopiedTexts = function(data) {
        var thread = service.availThreads[data.thread_uuid];
        console.log(data);
        if (data.files && data.files.length > 0) {
            for (var i = 0; i < data.files.length; i++) {
                data["file" + i] = data.files[i];
            }
            data.file_count = data.files.length;
            delete data.files;
        }
        data = fileService.convertObjectToFormData(data);
        return smsApi.postAssignMessages(data)
            .then(function(response) {
                if (response.data.success) {
                    console.log(response.data.success.data);
                    var messages = response.data.success.data;
                    _.forEach(messages, function(message) {
                        var index = $filter('getByUUID')(service.smsData.currentThread
                            .messages, message.message_uuid, 'message');
                        if (index !== null) {
                            message.media = service.smsData.currentThread.messages[
                                index].media;
                            service.smsData.currentThread.messages[index] =
                                message;
                        }
                    });
                    angular.forEach(data.texts, function(message) {
                        if (message.message_status === 'unread') {
                            service.unreadCounts[thread.location_group_uuid] +=
                                -1;
                            thread.unread_count += -1;
                        }
                    });
                }
                return response;
            });
    };

    service.prepareSmsRecipients = function(recipient) {
        var dest = '';
        var uuid = '';
        var data = {};
        if (recipient) {
            dest = (recipient.length < 11 ? '1' + recipient : recipient);
            data = {
                destination: dest,
                contact_uuid: null
            };
        } else if ($rootScope.contactsSelected.length !== 0) {
            $rootScope.contactsSelected.forEach(function(contact) {
                if (contact.contact_mobile_number && contact.contact_mobile_number !==
                    '') {
                    var num = contact.contact_mobile_number.replace(/[^\/\d]/g,
                        '');
                    dest += (dest !== '' ? '<' : '') + (num.length < 11 ? '1' +
                        num : num);
                    uuid += (uuid !== '' ? '<' : '') + (contact.contact_uuid ?
                        contact.contact_uuid : null);
                } else if (!contact.contact_uuid && contact.contact_name_full !==
                    '') {
                    var num = contact.contact_name_full.replace(/[^\/\d]/g, '');
                    dest += (dest !== '' ? '<' : '') + (num.length < 11 ? '1' +
                        num : num);
                    uuid += (uuid !== '' ? '<' : '') + (contact.contact_uuid ?
                        contact.contact_uuid : null);
                }
            });
            data = {
                destination: dest,
                contact_uuid: uuid
            };
        } else if (service.smsData.currentThread) {
            dest = service.smsData.currentThread.contact_phone_number;
            data = {
                destination: dest,
                contact_uuid: null
            };
        }
        if (data) return data;
    };

    service.sendSmsMessage = function(message, media, recipient, isCompanySms) {
        var data1 = service.prepareSmsRecipients(recipient);
        var src = isCompanySms ? service.currentLocation.primary_sms : $rootScope.user.symphony_user_settings
            .sms_phone_number;
        var data = {
            src: src,
            dst: data1.destination,
            contact_uuid: data1.contact_uuid,
            message: message ? message : (media && !message ? '' : null),
            media: media,
            sent_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            location_group_uuid: isCompanySms ? service.currentLocation.locations_group_uuid : null
        };
        if (service.smsData.currentThread && data.dst.indexOf(service.smsData.currentThread
                .contact_phone_number) !== -1) {
            var tempMessage = service.createDummyText(data);
            service.smsData.currentThread.messages.push(tempMessage);
            data.tempUuid = tempMessage.message_uuid;
            data.thread_uuid = service.smsData.currentThread.thread_uuid;
            $timeout(function() {
                usefulTools.goToId('sms-bottom');
            }, 0, false);
        }

        return smsApi.sendSmsMessage(data)
            .then(function(response) {
                if (response.data.success) {
                    var messages = response.data.success.data;
                    var i = 0;
                    angular.forEach(messages, function(message) {
                        if (message.tempUuid && i === 0) {
                            var index = $filter('getByUUID')(service.smsData
                                .currentThread.messages, message.tempUuid,
                                'message');
                            if (index !== null) service.smsData.currentThread
                                .messages[index] = message;
                        }
                        if (i > 0) service.smsData.currentThread.messages.push(
                            message);
                        i += 1;
                    });
                    if (userService.isDemoAgency()) $rootScope.user.demoUsage['sms'] +=
                        1;
                    $rootScope.contactsSelected = [];
                    $rootScope.contactsSelected2 = [];
                    return true;
                } else {
                    return response.data.error.message;
                }
            }, function(error) {
                return 'We were unable to deliver your message.';
            });
    };

    service.createDummyText = function(message) {
        var temp = {
            thread_uuid: service.smsData.currentThread.thread_uuid ? service.smsData
                .currentThread.thread_uuid : 'tempThread-' + service.threadInc,
            message_uuid: 'tempMessage-' + service.messageInc,
            message_type: 'sms',
            message_direction: 'out',
            from_number: message.src,
            to_number: message.dst,
            sent_at: moment().format("YYYY-MM-DD HH:mm:ss"),
            message: message.message ? message.message : ' '
        };
        service.threadInc += 1;
        service.messageInc += 1;
        return temp;
    };

    service.smsMessageNotFound = function(sms) {
        var thread = service.availThreads[sms.thread_uuid];
        if (thread && thread.messages) {
            var index = $filter('getByUUID')(thread.messages, sms.message_uuid,
                'message');
            if (index !== null) return false;
        }
        return true;
    };

    service.clearInfo = function() {
        service.smsLocations = [];
        service.availThreads = {};
        service.smsData = {};
    };

    return service;
});
