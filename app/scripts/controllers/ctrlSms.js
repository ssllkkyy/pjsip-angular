'use strict';

proySymphony.controller('SmsCtrl', function($scope, $rootScope, $filter, $auth, $window, __env,
    symphonyConfig, Slug, $routeParams, $cookies, emulationService, userService, integrationService,
    callService, locationService, $location, FileUploader, $modal, $timeout, $q, $log, $interval,
    $mdDialog, $uibModal, fileService, newChatService, contactService, smsService, smsApi,
    dataFactory, usefulTools, $sce, $uibModalStack, chatMacroService, greenboxService) {

    if (__env.enableDebug) console.log("Executing SMSCtrl");
    $scope.imageBaseUrl = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
        symphonyConfig.onescreenUrl) + '/imported/freeswitch/storage/avatars/';
    $scope.mediaUrl = (__env.apiUrl ? __env.apiUrl : symphonyConfig.onescreenUrl);
    $scope.showEditContactForm = contactService.editContact;
    var self = this;
    $scope.var = null;
    $scope.date = new Date();
    $scope.copySelected = {};
    $scope.copyMode = false;
    $scope.assignMode = false;
    $rootScope.selectedContacts = {};
    $rootScope.contactsSelected = [];
    $scope.textTab = {
        activeTab: 0
    };
    $scope.showCompose = false;
    $scope.smsData = smsService.smsData;
    $scope.activityList = greenboxService.ams360ActivityList;
    $scope.currentThread = function() {
        return smsService.smsData.currentThread;
    };
    $scope.pagination = {
        perPage: 20,
        currentPage: 1
    };

    $scope.contactSelectionType = 'sms';

    $scope.threadList = [];

    $scope.emulationStatus = function() {
        return emulationService.emulationStatus;
    };

    function test() {
        var fbUid = $rootScope.user.fbinfo.auth_id;
        var rootPath = __env.environment + "/domains/" + fbUid;
        var contactUuid = '51ef6f1b-ccde-3364-acc1-d6d3cdb37ff1';
        firebase.database().ref().child(rootPath + '/domaincontacts/' + contactUuid + '/').on('value', function (snapshot) {
            var value = snapshot.val();
            console.log(value);
            if (value) {
                var contact = angular.copy(value);
                
                return contact;
            }
        });
        // contactService.getFullContactDetails('51ef6f1b-ccde-3364-acc1-d6d3cdb37ff1')
        // .then(function(response){
        //     console.log(response);
        // });
    }
    test();
    $scope.$watch('textTab.activeTab', function(newVal, oldVal) {
        if (oldVal == undefined || oldVal === null || oldVal !== newVal) {
            if (newVal === 1) {
                smsService.isCompanySms = true;
            } else if (newVal === 0) {
                smsService.isCompanySms = false;
                $scope.closeSearchDisplay();
                // $scope.loadingThreads = true;
                console.log("LOAD SMS THREADS - textTab.activeTab");
                smsService.getSmsThreads($rootScope.user.id)
                    .then(function(response) {
                        // $scope.loadingThreads = false;
                    });
            }
        }
    });

    $scope.loadingThreads = function() {
        return smsService.loadingThreads;
    };
    

    if ($routeParams.thId) {
        var threadUuid = $routeParams.thId;
        $location.search({});
        if (threadUuid) {
            $timeout(function() {
                $cookies.put('goToThread', threadUuid);
            });
        }
    }

    $rootScope.$on('agency.thread.deleted', function($event, thread) {
        $scope.toggleCompanyThreads();
        $timeout(function() {
            $rootScope.showInfoAlert(
                'Your location administrator has removed the Conversation with ' +
                $filter('tel')(thread.contact_phone_number) +
                ' and you have been redirected to the main Texting page.'
            );
        });
    });

    $scope.isDemoAgency = function() {
        return userService.isDemoAgency();
    };

    $scope.isDomainOrLocationManager = function() {
        return $rootScope.isAdminGroupOrGreater() || (smsService.currentLocationUuid &&
            smsService.isLocationManager());
    };

    $scope.selectedThreads = {};
    $scope.threads = {
        selectAll: false,
        selectedThreads: {}
    };
    $scope.selectThread = function(threadUuid) {

    };
    $scope.selectAllThreads = function(threads) {
        var i;
        var start = ($scope.pagination.currentPage - 1) * $scope.pagination.perPage;
        var end = start + $scope.pagination.perPage;
        for (i = start; i < end; i += 1) {
            if (threads[i]) {
                $scope.threads.selectedThreads[threads[i].thread_uuid] = $scope.threads
                    .selectAll;
            }
        };
    };

    function getSelectedThreads(obj) {
        var array = [];
        if (Object.keys(obj).length > 0 && obj.constructor === Object) {
            angular.forEach(obj, function(value, key) {
                if (value) array.push(key);
            });
        }
        return array;
    }
    $scope.threadsSelectedCount = function() {
        var threads = getSelectedThreads($scope.threads.selectedThreads);
        return threads.length;
    };
    $scope.deleteSelectedThreads = function() {
        var count = $scope.threadsSelectedCount();
        var deleteConfirm = $mdDialog.confirm()
            .title('Confirm Delete')
            .htmlContent('Are you sure you want to delete the selected ' + count +
                ' conversations?')
            .ariaLabel('Delete')
            .ok('Delete')
            .cancel('Cancel');
        $mdDialog.show(deleteConfirm).then(function() {
            var data = {
                threads: getSelectedThreads($scope.threads.selectedThreads)
            };
            smsService.removeMultipleThreads(data)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        $scope.threads.selectedThreads = {};
                    }
                });
        });
    };

    $scope.showThreadContactName = function(thread) {
        var name = '';
        var contact = $scope.threadContact(thread, 'sms');
        if (contact) {
            name += '<span class="contact-name">' + usefulTools.showContactName(contact,
                thread.contact_phone_number) + '</span>';
            if (contact.org) {
                name += ' <span class="contact-organization">(' + contact.org + ')</span>';
            }
            name += '<br />';
        }
        return $sce.trustAsHtml(name);;
    };

    $scope.openClient = function(contact) {
        if (!contact.contact_uuid) {
            var contact = $scope.threadContact(contact);
        }
        contactService.getContactDetails(contact.contact_uuid)
            .then(function(result) {
                if (result) {
                    angular.forEach(result, function(contact) {
                        if (contact.contact_setting_category ==
                            "integration_setting" && $rootScope.user.exportType
                            .partner_code == 'qqcatalyst') {
                            if (contact.contact_setting_name ==
                                'qq_entity_id') {
                                var qqUrl =
                                    "https://app.qqcatalyst.com/Contacts/Customer/Details/" +
                                    contact.contact_setting_value;
                                $window.open(qqUrl, '_blank');
                            } else if (contact.contact_setting_name ==
                                'ams_customer_id' && $rootScope.user.exportType
                                .partner_code == 'ams360') {
                                var version = $rootScope.user.domain.integration_settings
                                    .version ? $rootScope.user.domain.integration_settings
                                    .version : 'v1712522';
                                var amsUrl = "https://www.ams360.com/" +
                                    version + "/NextGen/Customer/Detail/" +
                                    contact.contact_setting_value;
                                $window.open(amsUrl, '_blank');
                            }
                        }
                    });
                }
            });
    };

    $rootScope.$watch('current-thread-updated', function(newVal, oldVal) {
        $scope.smsData = smsService.smsData;
    });

    $rootScope.$on('contacts.updated', function($event) {
        smsService.updateThreadContacts();
    });

    $scope.availThreads = function() {
        var threads = smsService.availThreads;
        $scope.threadList = ( usefulTools.convertObjectToArray(threads) );
        return $scope.threadList;
    };

    smsService.registerOnAfterInitCallback(function() {
        $scope;
        $scope.loadThreads = loadThreads;
    });

    function loadThreads() {
        if ($scope.threadList.length === 0){ $scope.availThreads(); }
        var threads = $scope.threadList;
        
        console.log("THREADS", threads);
    };

    $scope.availLocations = function() {
        return usefulTools.convertObjectToArray(smsService.smsLocations);
    };

    $scope.setCurrentThread = function(thread_uuid) {
        smsService.setCurrentThread(thread_uuid);
    };

    $scope.currentLocation = function() {
        return smsService.currentLocation;
    };

    $scope.$watch($scope.currentThread, function(newVal, oldVal) {
        if (newVal) {
            attachKeyDownListener();
        }
    });

    $scope.messages = function() {
        return smsService.smsData.currentThread.messages;
    };

    $scope.isDisabled = function() {
        return emulationService.isEmulatedUser();
    };

    $scope.isEmulatedUser = function() {
        return emulationService.isEmulatedUser();
    };

    $scope.showAllConversations = function() {
        smsService.smsData.currentThread = null;
        $scope.showCompose = false;
        $rootScope.contactsSelected = [];
        $rootScope.selectedContacts = {};
        $scope.delivery.message = '';
    };

    $scope.makeCall = function(number) {
        if (number == $rootScope.user.did || number == $rootScope.user.user_ext) return;
        
        var message;
        if (callService.onConferenceCall()) {
            message = "You may not place another call while on a conference call. " +
                "Please hang up the conference call if you would like to make " +
                "another.";
            $rootScope.showInfoAlert(message);
        } else if (callService.currentCalls().length === 2) {
            message = "You may only participate in two calls at a time. " +
                "Please hang up one of your calls if you would like to make " +
                "another.";
            $rootScope.showInfoAlert(message);
        } else {
            callService.makeCall(number);
        }
    };

    $scope.openContactInManagementSystem = function(phone, contact) {
        integrationService.openContactInManagementSystem(phone, contact);
    };

    $scope.toggleComposeMode = function() {
        $scope.showCompose = !$scope.showCompose;
        $rootScope.contactsSelected2 = [];
        $rootScope.contactsSelected = [];
        attachKeyDownListener();
    };

    $scope.threadContact = function(entity) {
        return contactService.theContact(entity);
    };

    function loadams360ActivityList() {
        greenboxService.getAms360ActivityList($rootScope.user.domain_uuid)
            .then(function(response) {
                $scope.activityList = response;
            });
    }
    if ($scope.activityList.length == undefined && $rootScope.user.exportType.partner_code ==
        'ams360') {
        loadams360ActivityList();
    }

    /*****************SEARCH BOX FUNCTIONS *******************/

    $scope.hasSearchResults = function() {
        if (smsService.smsData.currentThread && smsService.smsData.currentThread.searchInfo)
            return true;
        return false;
    };

    $scope.goToRecentMessages = function() {
        smsService.showCurrentMessages();
    };

    $scope.emulatedUser = function() {
        return emulationService.emulatedUser;
    };

    $scope.isCompanySms = function() {
        return smsService.isCompanySms;
    };

    $scope.sendSearch = function() {
        var data = {
            search: $scope.search.searchText,
            user_uuid: (emulationService.emulatedUser && emulationService.emulatedUser !==
                $rootScope.user.id ? emulationService.emulatedUser : $rootScope
                .user.id),
            thread_uuids: smsService.getCurrentThreadUuids()
        };
        console.log(data);
        if (smsService.isCompanySms && !$scope.currentThread()) {
            data.location_group_uuid = smsService.currentLocationUuid;
        };
        if ($scope.currentThread()) {
            data.thread_uuid = $scope.currentThread().thread_uuid;
        }
        $scope.search.showSearch = true;
        $scope.search.searchingComplete = false;
        smsService.searchSmsMessages(data)
            .then(function(response) {
                $scope.search.searchingComplete = true;
                $scope.search.results = response;
            });
    };

    $scope.scrollToBottom = function() {
        $timeout(function() {
            var messageBox = angular.element('.sms-message-list')[0];
            messageBox.scrollTop = messageBox.scrollHeight;
        });
    };

    function searchInit() {
        $scope.search = {};
        $scope.search = {
            showSearch: false,
            searchText: null,
            highlightMessage: null,
            sendSearch: $scope.sendSearch,
            results: {}
        };
    }
    searchInit();
    $scope.closeSearchDisplay = function() {
        $scope.search.showSearch = false;
    };

    $scope.loadPreviousMessages = function() {
        $scope.loadingPrevious = true;
        smsService.loadPreviousMessages()
            .then(function(response) {
                $scope.loadingPrevious = false;
                $scope.loadLimit += 50;
            });
    };

    /*********** END Search Box Functions ****************/
    /*********** Blacklist functions **************/
    $scope.addThreadToBlackList = function() {
        var data = {
            thread: $scope.smsData.currentThread,
            blacklistNumber: blacklistNumber,
            isDomainAdmin: userService.isAdminGroupOrGreater,
            closeModal: closeModal
        };
        $rootScope.showModalWithData('/sms/blacklist-sms-number.html', data);
    };
    // $scope.isDomainAdmin = function() {
    //     return $rootScope.user.accessgroup==='superadmin' || $rootScope.user.accessgroup==='admin';
    // };
    $scope.blacklist = {
        reach: 'domain'
    };

    function blacklistNumber(reach) {
        var data = {
            reach: reach,
            numberToAdd: $scope.smsData.currentThread.contact_phone_number
        };
        smsService.blacklistNumber(data)
            .then(function(response) {
                $uibModalStack.dismissAll();
            });
    }

    $scope.showBlacklistModal = function(thread) {
        $rootScope.showModalFull('/modals/blacklist-sms-number-modal.html', {
            thread: thread,
            onClose: closeModal
        });
    };
    $scope.showBlacklistTableModal = function(thread) {
        $rootScope.showModalFull('/modals/blacklist-table-modal.html', {
            user_uuid: emulationService.emulatedUser ? emulationService.emulatedUser : $rootScope.user.id,
            closeModal: closeModal
        });
    };

    $scope.isCompanySms = function() {
        return smsService.isCompanySms;
    };

    $scope.toggleCompanyThreads = function() {
        $scope.closeSearchDisplay();
        // $scope.loadingThreads = true;
        smsService.isCompanySms = !smsService.isCompanySms;
        if (smsService.isCompanySms) {
            console.log("LOAD SMS THREADS - toggleCompanyThreads");
            smsService.getSmsThreads($rootScope.user.id)
                .then(function(response) {
                    // $scope.loadingThreads = false;
                });
        } else {
            
        }
    };
    
    $scope.showLocationNumber = function() {
        if ($scope.currentLocation() && $scope.currentLocation().primary_sms) {
            return $filter('tel')($scope.currentLocation().primary_sms);
        } else {
            return 'No Number assigned yet';
        }
    };

    $scope.isTollFree = function(number) {
        var number = usefulTools.cleanPhoneNumber($rootScope.user.symphony_user_settings.sms_phone_number);
        if ($scope.currentLocation() && $scope.currentLocation().primary_sms) {
            number = usefulTools.cleanPhoneNumber($scope.currentLocation().primary_sms);
        }
        return usefulTools.isTollFree(number);
    };

    $scope.changeLocation = function(location_group_uuid) {
        console.log(location_group_uuid);
        // $scope.loadingThreads = true;
        
        smsService.getLocationThreads(location_group_uuid)
            .then(function(response){
                console.log(['Location Change Response', response ]);
            });
    };

    /*************** END Blacklist functions ***********/

    /*************** SMS Forwarding *************/

    $scope.showForwardTableModal = function(thread) {
        $rootScope.showModalFull('/modals/sms-forwarding.html', {
            user_uuid: emulationService.emulatedUser ? emulationService.emulatedUser : $rootScope.user.id,
            closeModal: closeModal
        });
    };

    $scope.forward_sms_to_enabled = false;
    if ($rootScope.user.symphony_user_settings.forward_sms_to.length > 0) {
        $scope.forward_sms_to_enabled = true;
    }

    $rootScope.$on('forward.smsto.enabled', function($event, action) {
        $scope.forward_sms_to_enabled = action;
    });


    /*************** End of SMS Forwarding *************/

    function closeModal() {
        $uibModalStack.dismissAll();
    };

    $scope.handleScroll = function(delay) {
        var maxTries = 100;
        var currentTry = 0;
        var int = $interval(function() {
            currentTry += 1;
            if (currentTry > maxTries) {
                $interval.cancel(int);
            };
            if ($scope.smsData.currentThread && $scope.smsData.currentThread.messages) {
                $interval.cancel(int);
                $scope.scrollToBottom();
                $timeout(function() {
                    $scope.scrollToBottom();
                }, (delay * 2));
                // }
            }
        }, 100);
    };

    $scope.$watch('smsData.currentThread', function(newVal, oldVal) {
        $scope.$evalAsync(function() {
            $scope.handleScroll(100);
        });

    });
    $scope.$watch('smsData.currentThread.messages.length', function(newVal, oldVal) {
        var delay = 0;
        if (newVal && (!oldVal && oldVal !== 0)) {
            delay = 100;
        };
        if (delay > 0) {
            $timeout(function() {
                $scope.handleScroll(delay);
            }, delay);
        } else {
            $scope.$evalAsync(function() {
                $scope.handleScroll(delay);
            });
        }
    });

    $scope.threadpredicate = 'mostrecent';
    $scope.threadreverse = true;

    $scope.showUnreadAgencyCount = function() {
        return smsService.unreadLocationMessageCount();
    };

    $scope.showUnreadUserCount = function() {
        return smsService.unreadCounts[$rootScope.user.id];
    };


    $scope.threadSortFunction = function(thread) {
        if ($scope.threadpredicate === 'mostrecent') {
            return thread.most_recent ? thread.most_recent.created_at : null;
        } else if ($scope.threadpredicate === 'contact') {
            return thread.contact ? thread.contact.name : thread.contact_phone_number;
        } else if ($scope.threadpredicate === 'unread') {
            return thread.unread_count;
        }
        return null;
    };

    $scope.sortThreadBy = function(predicate) {
        $scope.threadpredicate = predicate;
        $scope.threadreverse = !$scope.threadreverse;
    };

    $scope.showChevron = function(predicate) {
        return usefulTools.showChevron(predicate, $scope.threadpredicate, $scope.threadreverse);
    };

    $scope.unreadThreadClass = function(thread) {
        if (thread.unread_count > 0) return 'bolded';
        return '';
    };

    /*********** SMS Assign Functions **************** */

    $scope.enableAssignMode = function() {
        $scope.assignMode = true;
    };

    $scope.assignCopiedTexts = function() {
        if (_.isEmpty($scope.copySelected)) {
            $rootScope.showErrorAlert(
                'You have not selected any messages to be copied.');
            return;
        }

        function hasMatchingContactRecord(member) {
            return Boolean(contactService.getContactbyMMId(member.id));
        }

        function hasOpenDirectChannel(member) {
            return Boolean(newChatService.getDMChannelByUserId(member.id));
        };

        function isMemberOfCurrentLocation(contact) {
            // var contact = contactService.getContactbyMMId(member.id);
            var location = smsService.currentLocation;
            for (var i = 0; i < location.managers.length; i++) {
                if (location.managers[i].user_uuid === contact.user_uuid) {
                    return true;
                }
            }
            for (var j = 0; j < location.members.length; j++) {
                if (location.members[j].user_uuid === contact.user_uuid) {
                    return true;
                }
            }
            return false;
        };

        function isKotterTech(contact) {
            return !contactService.isKotterTechUser(contact);
        };

        function isActive(contact) {
            if (contact.user_uuid === $rootScope.user.id) return false;
            if (!contact || !contact.name || contact.name ===
                ' ' || !contact.en || contact.en !== 'true') return false;
            return true;
        };
        var peopleList = contactService.getUserContactsOnly().filter(isActive).filter(
            isKotterTech).filter(isMemberOfCurrentLocation);

        var array = [];
        var uuids = [];
        var onwith;
        if ($scope.threadContact($scope.currentThread())) {
            onwith = $scope.threadContact($scope.currentThread()).name;
        } else {
            onwith = $filter('tel')(smsService.smsData.currentThread.contact_phone_number);
        }
        var initial = 'You have been assigned these text mesages by ' + $rootScope.user
            .contact_name_given + ' ' + $rootScope.user.contact_name_family + "\n\n";;
        initial += '##### Conversation with: ' + onwith + "\n\n";
        var initialHtml = '<p>You have been assigned these text mesages by ' +
            $rootScope.user.contact_name_given + ' ' + $rootScope.user.contact_name_family +
            '.</p>' + "\n";
        initialHtml += '<h4>Conversation with: ' + onwith + '</h4>' + "\n";
        angular.forEach($scope.copySelected, function(value, key) {
            var index = $filter('getByUUID')(smsService.smsData.currentThread.messages,
                key, 'message');
            if (index !== null) {
                var mess = smsService.smsData.currentThread.messages[index];
                var sentat;
                sentat = $filter('toLocalTime')(mess.sent_at);
                sentat = $filter('amDateFormat')(sentat, 'MM/D/YYYY, h:mm a');
                array.push(mess);
                uuids.push(key);
                if (mess.message_direction === 'in') {
                    initial += '**' + onwith + ':** ';
                    initialHtml += '<p><strong>' + onwith + ':</strong> ';
                } else {
                    var useron = contactService.getContactByUuid(mess.from_contact_uuid);
                    initial += '**' + (useron ? useron.name :
                            $rootScope.user.domnain.domain_description) +
                        ':** ';
                    initialHtml += '<p><strong>' + (useron ? useron.name :
                            $rootScope.user.domnain.domain_description) +
                        ':</strong> ';
                }
                initial += mess.message + "\n";
                initialHtml += mess.message + '<br />' + "\n";
                initial += sentat + "\n\n";
                initialHtml += '<span style="font-size: 13px">' + sentat +
                    '</span></p>' + "\n";
            }
        });
        var data = {
            texts: array,
            uuids: uuids,
            assignedTo: {},
            sendEmail: true,
            peopleListData: peopleList,
            initialValue: initial,
            initialHtml: initialHtml,
            setAsignee: function(member) {
                // var userM=contactService.getContactbyMMId(member.id);
                $scope.assignedTo = member;
            },
            assign: function(info) {
                if ($scope.newAssignedUser) {
                    if ($scope.assignedTo.user_uuid !== $rootScope.user.id) {
                        var sendPost = this.chatFns.sendPost;
                        var inputElement = this.chatFns.mainChatInput;

                        function chatSendPost(files) {
                            function channel() {
                                var chatId = $scope.assignedTo.chat_id;
                                return newChatService.getDMChannelByUserId(
                                    chatId);
                            }

                            function doSendPost(files) {
                                var opts = {
                                    root_id: null,
                                    files: files
                                };
                                sendPost(inputElement, channel(), opts);
                            }
                            if (!channel()) {
                                console.log($scope.assignedTo);
                                var chatId = $scope.assignedTo.chat_id;
                                var member = newChatService.teamMembers[chatId];
                                newChatService.createDirectChannel(member)
                                    .then(function(response) {
                                        doSendPost(files);
                                    });
                            } else {
                                doSendPost(files);
                            }
                        }
                        var emailNote = angular.element("#chatInput")[0].value;
                        var data = {
                            user_uuid: $scope.assignedTo.user_uuid,
                            message_uuids: info.uuids,
                            texts: info.texts,
                            thread_uuid: smsService.smsData.currentThread.thread_uuid,
                        };

                        function submitAssignment(files) {
                            chatSendPost();
                            if (info.sendEmail) {
                                data.sendEmail = 'true';
                                data.email_subject = info.email_subject;
                                data.note = emailNote;
                                data.content = info.initialHtml;
                                data.files = files;
                            }
                            smsService.assignCopiedTexts(data)
                                .then(function(response) {
                                    $rootScope.showalerts(response);
                                    $scope.cancelCopyMode();
                                    $rootScope.closeModal();
                                });
                        }
                        submitAssignment(this.files);
                    }
                } else {
                    var message =
                        "Please select someone to assign the message(s) to in the dropdown.";
                    $rootScope.showInfoAlert(message);
                }
            },
            chatFns: {}
        };
        data.chatFns.registerUploader = function(uploader) {
            data.uploader = uploader;
            var id = 0;
            if (data.files) {
                data.files.forEach(function(file) {
                    file.id = id;
                    data.uploader.addToQueue(file);
                    data.uploader.queue[id].file.id = id;
                    id++;
                });
            }
        };

        data.chatFns.updateFiles = function(remainingIds) {
            _.remove(data.files, function(file) {
                return remainingIds.indexOf(file.id) <= -1;
            });
        };

        function getMediaUrls(texts) {
            var urls = [];

            function getMediaUrl(media) {
                return $scope.mediaUrl + media.url;
            };
            texts.forEach(function(text) {
                if (text.media) {
                    urls = urls.concat(text.media.map(getMediaUrl));
                }
            });
            return urls;
        };

        function isUnwantedUrl(url) {
            return url.indexOf(".txt") === -1 &&
                url.indexOf(".smil") === -1 &&
                url.indexOf(".xml") === -1;
        };
        var urls = getMediaUrls(data.texts).filter(isUnwantedUrl);
        if (urls.length === 0) {
            $rootScope.showModalWithData('/modals/assign-texts.html', data);
        } else {
            var filePromises = urls.map(function(fileUrl) {
                return fetch(fileUrl).then(function(response) {
                    return response.blob().then(function(blob) {
                        var file = fileService.blobToFile(blob,
                            "attached.jpg", {
                                type: "image/jpeg"
                            });
                        return file;
                    });
                });
            });
            $q.all(filePromises).then(function(files) {
                data.files = files;
                $rootScope.showModalWithData('/modals/assign-texts.html', data);
            });
        }
    };

    /*********** SMS Copy Functions ****************** */

    $scope.enableCopyMode = function() {
        $scope.copyMode = true;
    };

    $scope.cancelCopyMode = function() {
        $scope.assignMode = false;
        $scope.copyMode = false;
        $scope.copySelected = {};
    };

    $scope.copyText = function(uuid) {
        if ($scope.copySelected[uuid]) {
            delete $scope.copySelected[uuid];
        } else {
            $scope.copySelected[uuid] = true;
        }
    };

    $scope.showSaveCopyToolTip = function() {
        if ($rootScope.user.exportType.partner_code == 'hawksoft') return $rootScope.tips
            .sms.copy_to_hawksoft;
        if ($rootScope.user.exportType.partner_code != 'hawksoft') return $rootScope.tips
            .sms.copy_to_management;
    };

    $scope.showExportTarget = function() {
        if ($rootScope.user.exportType.partner_code == 'hawksoft') return 'Hawksoft Inbox';
        if ($rootScope.user.exportType.partner_code != 'hawksoft') return 'Management System Inbox';
    };

    $scope.$watch('assignedTo', function(newVal, oldVal) {
        if (newVal !== oldVal) {
            $scope.newAssignedUser = true;
        }
    });

    $scope.saveCopiedTexts = function() {
        if (_.isEmpty($scope.copySelected)) {
            $rootScope.showErrorAlert(
                'You have not selected any messages to be copied.');
            return;
        }
        var array = [];
        angular.forEach($scope.copySelected, function(value, key) {
            var index = $filter('getByUUID')(smsService.smsData.currentThread.messages,
                key, 'message');
            if (index !== null) array.push(smsService.smsData.currentThread.messages[
                index]);
        });
        var partner = $rootScope.user.exportType.partner_code;
        var data = {
            texts: array,
            domain_uuid: $rootScope.user.domain_uuid,
            user_uuid: $rootScope.user.id,
            type: 'sms',
            partner: partner,
            number: usefulTools.cleanPhoneNumber(smsService.smsData.currentThread
                .contact_phone_number)
        };
        
        if (partner == 'ams360') {
            if ($scope.activityList.length != 0) {
                angular.forEach($scope.activityList, function(activity) {
                    if (activity.Description.includes('phone')) {
                        data['activity'] = activity.Description;
                        return;
                    }
                });
            }
            $rootScope.copyToAms360(data);
            $scope.copySelected = {};
            $scope.cancelCopyMode();
        } else if (partner == 'qqcatalyst') {
            $rootScope.copyToQQCatalyst(data);
            $scope.copySelected = {};
            $scope.cancelCopyMode();
        } else {
            var toFile = $rootScope.user.copyExportToFile;
            var copyType = (toFile && toFile == 'true') ? 'file' : 'text';
            if (copyType === 'file' ) {
                doGreenboxSmsCopy(data, array);
            } else {
                integrationService.copyEntityToPartner(data)
                .then(function(response){
                    $scope.copySelected = {};
                    $scope.cancelCopyMode();
                });
            }
        }
    };

    function doGreenboxSmsCopy(data, array) {
        dataFactory.postHSCopySmsTexts(data)
        .then(function(response) {
            if (response.data.success) {
                $rootScope.showSuccessAlert(array.length +
                    " Text Messages were copied.");
                $scope.copiedTexts = response.data.success.data;
                angular.forEach($scope.copiedTexts.messages, function(text) {
                    angular.forEach($scope.currentThread().messages,
                        function(message) {
                            if (message.message_uuid == text.exported_data.data_identifier_uuid) {
                                message['exported_data'] = text.exported_data;
                            }
                        });
                });

                $scope.copySelected = {};
                $scope.cancelCopyMode();
            } else {
                $rootScope.showErrorAlert(response.data.error.message);
            }
        }, function(error) {
            console.log(error);
        });
    }

    /************ End SMS Copy Functions *************** */

    $scope.isPhoneNumber = function(text) {
        return usefulTools.isPhoneNumber(text);
    };

    $scope.deliverSmsMessage = function(source) {
        if (userService.limitReached('sms')) {
            $rootScope.showErrorAlert('You have reached the limit of ' + $rootScope.user
                .usageLimits.sms +
                ' sms text messages allowed while using a Bridge Demo account.');
            return;
        }
        $scope.source = source;
        $scope.mainSmsInput = angular.element('#smsInput')[0];
        var originalMessage = $scope.delivery.message;
        if ($scope.uploader.queue.length == 0) {
            if (!$scope.mainSmsInput.value) {
                $rootScope.showErrorAlert('You can not send an empty message.');
                return;
            }

            smsService.sendSmsMessage($scope.mainSmsInput.value, null, null, smsService.isCompanySms)
                .then(function(response) {
                    if (response === true) {
                        $scope.mainSmsInput.value = '';
                        $scope.delivery.message = '';
                        $scope.postFiles = [];
                        if (source && source === 'compose') $scope.showAllConversations();
                    } else {
                        $rootScope.showErrorAlert(response);
                        $scope.mainSmsInput.value = originalMessage;
                    }
                    if (userService.isDemoAgency()) userService.updateDemoUsage();
                });


        } else {
            $scope.uploader.uploadAll();
            //if (source && source==='compose') $scope.showAllConversations();
        }
    };

    $scope.removeThread = function() {
        var number = $filter('tel')($scope.smsData.currentThread.contact_phone_number);
        var deleteConfirm = $mdDialog.confirm()
            .title('Confirm Delete')
            .htmlContent('Are you sure you want to delete this thread with <strong>' +
                number + '</strong>?')
            .ariaLabel('Delete')
            .ok('Delete')
            .cancel('Cancel');
        $mdDialog.show(deleteConfirm).then(function() {
            var thread_uuid = smsService.smsData.currentThread.thread_uuid;
            smsService.removeThread(thread_uuid)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        $scope.showAllConversations();
                        $uibModalStack.dismissAll();
                    }
                });
        });
    };

    $scope.getThreadContact = function(thread) {
        console.log(thread);
        if (thread.contact_uuid) {
            return contactService.getContactByUuid(thread.contact_uuid);
        } else {
            return contactService.getContactByPhoneNumber(thread.contact_phone_number.substr(
                1));
        }
    };

    $scope.toArray = function(threads) {
        return usefulTools.convertObjectToArray(threads);
    };

    $scope.playVideo = function(media) {
        var playvideo = media;
        var publicurl = $scope.mediaUrl + media.url;
        playvideo.publicurl = publicurl;
        playvideo.smsVideo = true;
        $rootScope.showModalFull('/video/playrecording.html', playvideo, '');
    };

    // $scope.uploadIsImage = function(file) {
    //     var type =  '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';
    //     return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
    // };

    $scope.uploadIsImage = function(file) {
        return fileService.uploadIsImage(file);
    };

    $scope.max = 100;

    $scope.$watch('uploader.progress', function(newVal, oldVal) {
        if (newVal !== oldVal && newVal > 1) {
            $scope.progressBarPercentage = newVal;
        }
    });

    $scope.uploadIsVideo = function(file) {
        var type = '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';
        return '|mp4|mpg|'.indexOf(type) !== -1;
    };


    var uploader = $scope.uploader = new FileUploader({
        url: $rootScope.onescreenBaseUrl + '/sms/uploadmedia',
        alias: 'file',
        removeAfterUpload: true,
        headers: {
            'Authorization': 'Bearer ' + $rootScope.userToken
        },
        transformRequest: angular.identity
    });

    uploader.filters.push({
        name: 'checkFileSize',
        fn: function(item /*{File|FileLikeObject}*/ , options) {
            console.log(item);
            var parts = item.name.split('.');
            var ext = parts[parts.length - 1].toLowerCase();
            if (ext === 'jpg' || ext === 'png' || ext === 'jpeg') return true;
            if (item.size > 1000000) return false;
            return true;
        }
    });

    uploader.filters.push({
        name: 'checkFileType',
        fn: function(item /*{File|FileLikeObject}*/ , options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) +
                '|';
            var result =
                '|rar|pdf|doc|docx|xls|xlsx|csv|rtf|html|zip|mp3|wma|mpg|flv|avi|jpg|jpeg|png|gif|mp4|mp3|ppt|pub|m4a|mov|vts|vob|m4v|m2ts|dvr|264|bup|mts|psd|MOV|mpeg-4|x-vcard|vcf|'
                .indexOf(type) !== -1;
            return result;
        }
    });

    $scope.getClassObj = function() {
        return {
            'well': true,
            'my-drop-zone': true,
            'with-file-upload': $scope.showUploadingFiles
        };
    };


    $scope.showUploadingFiles = false;
    $scope.showUploadingOverlay = false;
    $scope.showUploadingFiles2 = false;

    $scope.$watch('uploader.queue.length', function(newValue, oldValue) {
        if (newValue > 0) $scope.showUploadingFiles = true;
        if (newValue === 0) $scope.showUploadingFiles = false;
        if (typeof(newValue) === 'number' && typeof(oldValue) === 'number' &&
            oldValue > newValue) {
            totalUploadSize(uploader.queue);
        };
    });

    function totalUploadSize(queue) {
        var size = 0;
        angular.forEach(queue, function(file) {
            size += file.file.size;
        });
        $scope.totalSize = +((size / 1000).toFixed(2));
        return $scope.totalSize;
    }
    // CALLBACKS
    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
        options) {
        if (__env.enableDebug) console.info('onWhenAddingFileFailed', item, filter,
            options);
        if (filter.name === 'checkFileSize') $rootScope.showErrorAlert(
            'The maximum size for an MMS message is 1MB. The file you have tried uploading is ' +
            (item.size / 1000000).toFixed(2) + 'MB');
        if(filter.name === 'checkFileType')  $rootScope.showErrorAlert(
            'We were unable to add this file. The following file types are supported: '
            + 'rar,pdf, doc, docx, xls, xlsx, csv, rtf, html, zip, mp3, wma, mpg, flv, avi, jpg, jpeg, png, vcf'
            + 'gif, mp4, mp3, ppt, pub, m4a, mov, vts, vob, m4v, m2ts, dvr, 264, bup, mts, psd, MOV, mpeg-4, x-vcard');
    };
    uploader.onAfterAddingFile = function(fileItem) {
        if ($scope.isTollFree()) {
            $rootScope.showErrorAlert('Your SMS number is a toll free number and you can not send MMS (media) messages using a toll free number.');
            uploader.clearQueue();
        } else {
            if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
            if (__env.enableDebug) console.log(totalUploadSize(uploader.queue) + ' KB');
        }
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        $scope.postFiles = [];
        if (__env.enableDebug) console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function(item) {
        if (__env.enableDebug) console.info('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function(fileItem, progress) {
        if (__env.enableDebug) console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function(progress) {
        if (__env.enableDebug) console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onSuccessItem', fileItem, response, status,
            headers);
        if (__env.enableDebug && response.success) {
            console.log(response.success.data);
            $scope.postFiles.push(response.success.data);
        } else {
            fileItem.isUploaded = false;
            if (__env.enableDebug) console.info('onErrorItem', fileItem, response, status,
            headers);
        }
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.log("ERROR RESPONSE FROM UPLOADING AVATAR");
        if (__env.enableDebug) console.log(response);
        fileitem.isUploaded = false;
        if (__env.enableDebug) console.info('onErrorItem', fileItem, response, status,
            headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onCancelItem', fileItem, response, status,
            headers);
        uploader.clearQueue();
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onCompleteItem', fileItem, response,
            status, headers);
    };
    uploader.onCompleteAll = function() {
        if (__env.enableDebug) console.info('onCompleteAll');
        if (__env.enableDebug) console.log("FILE IDS");
        if (__env.enableDebug) console.log($scope.postFiles);

        smsService.sendSmsMessage($scope.mainSmsInput.value, $scope.postFiles, null,
                smsService.isCompanySms)
            .then(function(response) {
                if (response === true) {
                    $scope.mainSmsInput.value = '';
                    $scope.delivery.message = '';
                    $scope.postFiles = [];
                    if ($scope.source && $scope.source === 'compose') $scope.showAllConversations();
                } else {
                    $rootScope.showErrorAlert(response);
                }
            });
        //$scope.showAllConversations();

    };
    // smsService.smsData.currentThread = false;

    function onKeyDown(e) {
        // user is typing in all cases
        if (e.key === "Enter" || e.key === "Tab") {
            if ($scope.showMacroList) {
                var listData = $scope.macrosListData;
                var opts = {
                    suggestion: listData.suggestions[listData.selectedIndex],
                    index: listData.selectedIndex
                };
                $scope.$evalAsync(function() {
                    $scope.showMacroList = false;
                });
                chatMacroService.selectMacroSelection($scope, $scope.mainSmsInput, opts);
                return false;
            } else {
                var type = $scope.currentThread() ? "thread" : "compose";
                $scope.deliverSmsMessage(type);
                return false;
            }
        } else if ((e.which === 38 || e.which === 40) && $scope.showMacroList) {
            var direction = e.which === 38 ? "up" : "down";
            var currentTotal = $scope.macrosListData.macros.length;
            var selectedIndex = $scope.macrosListData.selectedIndex;
            $scope.$evalAsync(function() {
                if (direction === "up") {
                    if (!(selectedIndex - 1 < 0)) {
                        $scope.macrosListData.selectedIndex -= 1;
                    }
                } else {
                    if (!(selectedIndex > (currentTotal - 1))) {
                        $scope.macrosListData.selectedIndex += 1;
                    }
                }
            });
            return false;
        } else {
            var value = $scope.mainSmsInput.value;
            var splits = value.split(' ');
            var macros = $scope.macrosListData.macros;
            var hotKeys = chatMacroService.getChatMacroHotKeys($scope);
            var searchTerm = splits[splits.length - 1];
            if (e.key.length === 1) {
                searchTerm += e.key;
            } else if (e.key === "Backspace") {
                $scope.$evalAsync(function() {
                    $scope.showMacroList = false;
                });
                searchTerm = searchTerm.slice(0, searchTerm.length - 1);
            }
            if (e.which === 27) {
                $scope.$evalAsync(function() {
                    $scope.showMacroList = false;
                });
                return false;
            }
            var hotKey;
            var macro;
            var suggestions;
            for (var i = 0; i < hotKeys.length; i++) {
                hotKey = hotKeys[i];
                if (searchTerm.indexOf(hotKey) > -1) {
                    macro = macros[i];

                    function notHashKey(key) {
                        return key !== "$$hashKey";
                    }
                    var key = Object.keys(macro).filter(notHashKey)[0];
                    suggestions = macro[key];
                    $scope.macrosListData.suggestions = suggestions;
                }
            }
            if (suggestions && suggestions.length > 0) {
                $scope.$evalAsync(function() {
                    $scope.showMacroList = true;
                });
            } else {
                $scope.$evalAsync(function() {
                    $scope.showMacroList = false;
                });
            }
        }
        return true;
    }

    chatMacroService.getChatMacros().then(function(response) {
        if (response) {
            $scope.macrosListData = {
                macros: response,
                selectedIndex: 0,
                element: null,
                scope: $scope,
                select: function(index, suggestion) {
                    var scope = this.scope;
                    var element = this.element;
                    chatMacroService.selectMacroSelection(
                        scope, element, {
                            index: index,
                            suggestion: suggestion
                        }
                    );
                }
            };
        }
    });

    function attachKeyDownListener() {
        $timeout(function() {
            var input = angular.element("#smsInput");
            if (input[0]) {
                $scope.mainSmsInput = input[0];
                $scope.mainSmsInput.onkeydown = onKeyDown;
                $scope.macrosListData.element = $scope.mainSmsInput;
            }
        });
    };

    
    // .thread-content in smsstyles.scss, line 366 is min-height: 40rem;
    // md-virtual-repeat-container in smsstyles.scss, line 368 is min-height: 30rem;

});
