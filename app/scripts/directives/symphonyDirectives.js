'use strict';

proySymphony
    .directive('bootstrapSwitch', function() {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function(scope, element, attrs, ngModel) {
                element.bootstrapSwitch();
                element.on('switchChange.bootstrapSwitch', function(event, state) {
                    if (ngModel) {
                        scope.$apply(function() {
                            ngModel.$setViewValue(state);
                        });
                    }
                });

                scope.$watch(attrs.ngModel, function(newValue, oldValue) {
                    if (newValue) {
                        element.bootstrapSwitch('state', true, true);
                    } else {
                        element.bootstrapSwitch('state', false, true);
                    }
                });
            }
        };
    })
    .directive('emulateUser', function(emulationService, $rootScope, fileService, smsService,
        dataFactory) {
        return {
            restrict: 'E',
            templateUrl: 'views/emulate-user.html',
            scope: {
                emulationType: '<'
            },
            link: function($scope, element, attrs) {

                $scope.user = $rootScope.user;
                $scope.emulationStatus = function() {
                    return emulationService.emulationStatus;
                };
                $scope.isKotterTechUserByUuid = $rootScope.isKotterTechUserByUuid;
                $scope.getNameByUUID = $rootScope.getNameByUUID;

                $scope.setEmulationUser = function(userUuid, communication) {
                    // console.log(communication + ' '+ userUuid);
                    $rootScope.showTable = false;

                    if (userUuid === $rootScope.user.id) {
                        emulationService.emulatedUserContacts = {};
                        emulationService.emulatedUser = null;
                        $scope.selectEmulateUser = null;
                        refreshServices(communication, userUuid);
                    } else {
                        emulationService.emulatedUser = userUuid;
                        $scope.selectEmulateUser = userUuid;
                        var data = {
                            domain_uuid: $rootScope.user.domain_uuid,
                            user_uuid: userUuid
                        }
                        refreshServices(communication, userUuid);
                        dataFactory.postGetContacts(data)
                            .then(function(response) {
                                $rootScope.emulatedUserContacts = [];
                                if (response.data.success) {
                                    if (__env.enableDebug) console.log(
                                        "GET CONTACTS - EMULATED USER");
                                    emulationService.emulatedUserContacts =
                                        response.data.success.data2;
                                    if (__env.enableDebug) console.log(response.data
                                        .success.data2);
                                } else {
                                    emulationService.emulatedUserContacts = {};
                                }

                            }, function(error) {
                                emulationService.emulatedUserContacts = {};
                                $rootScope.msgContacts +=
                                    'Error from contacts user: ' + JSON.stringify(
                                        error, null, 4) + "\n";
                            });
                    }
                };

                function refreshServices(communication, userUuid) {
                    switch (communication) {
                        case 'fileshare':
                            fileService.getShares(userUuid);
                            break;
                        case 'videoconference':
                            if (__env.enableDebug) console.log("MANAGING VIDEO CONFERENCE");
                            $rootScope.$broadcast('update.videoconference');
                            $rootScope.getVideoConference(userUuid);
                            break;
                        case 'voicemail':
                            $rootScope.$broadcast('update.voicemails.user', userUuid);
                            break;
                        case 'callhistory':
                            $rootScope.$broadcast('update.callhistory');
                            break;
                        case 'sms':
                            smsService.setEmulationUser(userUuid);
                            break;
                    };
                };
            }
        };
    })
    .directive('voicemailTable', function(usefulTools, $filter, $mdDialog, $rootScope, metaService,
        emulationService, contactService, $window, dataFactory, callService, greenboxService, integrationService,
        newChatService, fileService, uneditableArrayFactory) {
        return {
            restrict: 'E',
            templateUrl: 'views/voicemail/voicemail-table.html',
            scope: {
                userUuid: '<',
                locationUuid: '=',
                destUuid: '<',
                groups: '<',
                voicemail: '<'
            },
            link: function($scope, element, attrs) {
                $scope.vvmTableHeight = $window.innerHeight - 370;
                $scope.maxSize = 50;
                $scope.ppOptions = [10, 20, 50, 100];
                $scope.predicate = 'left_at';
                $scope.reverse = true;
                $scope.filtered = {};
                initializeVisualVoicemailCollection([]);
                $scope.showTable = true;
                $scope.playingVoicemail = null;
                $scope.user = $rootScope.user;
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.showAddContactForm = $rootScope.showAddContactForm;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.activityList = greenboxService.ams360ActivityList;
                $scope.tips = $rootScope.tips;
                $scope.pagination = {
                    perPage: 20,
                    currentPage: 1
                };

                $scope.callContact = function(call) {
                    return contactService.theContact(call);
                };

                $scope.emulationStatus = function() {
                    return emulationService.emulationStatus;
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

                var today = new Date();
                $scope.toDate = "";
                $scope.fromDate = "";
                $scope.displayFromDate = new Date(moment().subtract(30, 'days'));
                $scope.displayToDate = new Date();
                $scope.dateFormat = 'yyyy-MM-dd';
                $scope.dateSearched = true;
                $scope.fromDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: new Date(2016, 1, 1),
                    maxDate: today
                };
                $scope.toDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: $scope.fromDate,
                    maxDate: today
                };
                $scope.fromDatePopup = {
                    opened: false
                };
                $scope.toDatePopup = {
                    opened: false
                };
                $scope.ChangeToMinDate = function(fromDate) {
                    if (fromDate != null) {
                        if (!$scope.toDate) {
                            var ToMinDate = new Date(fromDate);
                            $scope.toDateOptions.minDate = ToMinDate;
                            $scope.toDate = ToMinDate;
                        }
                        getVisualVoicemail();
                    }
                };
                $scope.processToDate = function(toDate) {
                    if (toDate != null) {
                        if (!$scope.fromDate) $scope.fromDate = new Date(toDate);
                        $scope.toDate = new Date(toDate);
                    }
                    getVisualVoicemail();
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

                $scope.ChangeToMinDate();
                $scope.OpenfromDate = function() {
                    $scope.dateSearched = false;
                    $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
                };
                $scope.OpentoDate = function() {
                    $scope.dateSearched = false;
                    $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
                };

                $scope.setPage = function(pageNo) {
                    $scope.pagination.currentPage = pageNo;
                };

                $scope.currentLocation = function() {
                    return ($scope.groups && $scope.locationUuid) ? $scope.groups[
                        $scope.locationUuid] : null;
                };

                $scope.emulatedUser = function() {
                    return emulationService.emulatedUser;
                };

                $scope.handledIcon = function(call) {
                    if (call.handled_by) return 'fa-check-square-o';
                    return 'fa-square-o';
                };

                $scope.$watch('assignedTo', function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        $scope.newAssignedUser = true;
                    }
                });

                $scope.showUserName = function(uuid) {
                    var contact = contactService.getContactByUserUuid(uuid);
                    if (contact) return contact.name;
                    return null;
                };

                $scope.handleVoicemail = function(call) {
                    if (call.handled_by && call.handled_by !== $rootScope.user.id) {
                        var confirm = 'This was already marked as handled by ' + $scope
                            .showUserName(call.handled_by) +
                            '.  Do you want to continue?';
                        var confirmDelete = $mdDialog.confirm()
                            .title('Please Confirm')
                            .textContent(confirm)
                            .ariaLabel('Handle')
                            .ok('Yes')
                            .cancel('Never Mind');
                        $mdDialog.show(confirmDelete).then(function() {
                            doHandleVoicemail(call);
                        });
                    } else {
                        doHandleVoicemail(call);
                    }

                };

                $scope.openContactInManagementSystem = function(phone, contact) {
                    integrationService.openContactInManagementSystem(phone, contact);
                };

                function doHandleVoicemail(call) {
                    dataFactory.getHandleVoicemail(call.visual_voicemail_uuid)
                        .then(function(response) {
                            if (response.data.success) {
                                var info = response.data.success.data;
                                call.handled_by = info.handled_by;
                                call.handled_at = info.handled_at;
                                call.vm_status = info.handled_by ? 'read' : 'unread';
                            }
                        });
                };

                function initializeVisualVoicemailCollection(voicemails) {
                    $scope.visualVoicemail = new uneditableArrayFactory(voicemails);
                    $scope.visualVoicemail.setDerivedProp(
                        "filterVoicemails", mapVoicemailDataToFilterObj, true
                    );

                    function mapVoicemailDataToFilterObj(voicemails) {
                        return voicemails.map(function(voicemail) {
                            var filterObj = _.clone(voicemail);
                            filterObj.formatted_time = $scope.formatTime(voicemail.message_length);
                            contactService.registerOnContactLoadCallback(function() {
                                // filterObj.vm_contact = $scope.vmContact(
                                //     voicemail);
                                filterObj.handled_user_name =
                                    $scope.showUserName(voicemail.handled_by);
                                filterObj.assigned_user_name =
                                    $scope.showUserName(voicemail.handled_by);
                            });
                            filterObj.handled_icon = $scope.handledIcon(voicemail);
                            filterObj.date_time = getVmDateTime(voicemail);
                            return filterObj;
                        });
                    };
                };

                function getVmDateTime(voicemail) {
                    var dateFn = function(val) {
                        return $filter("amDateFormat")($filter("toLocalTime")(val),
                            "MMM D, YYYY");
                    };
                    var timeFn = function(val) {
                        return $filter("amDateFormat")($filter("toLocalTime")(val),
                            "h:mm a");
                    };
                    return dateFn(voicemail.left_at) + " " + timeFn(voicemail.left_at);
                };

                function getVisualVoicemail(userUuid) {

                    $scope.loadingVoicemail = true;
                    $scope.showTable = false;
                    $scope.showError = false;
                    var data = {
                        user_uuid: userUuid ? userUuid : ($scope.userUuid ? $scope.userUuid :
                            null),
                        location_group_uuid: (!userUuid && $scope.locationUuid) ?
                            $scope.locationUuid : null,
                        dest_uuid: $scope.destUuid ? $scope.destUuid : null
                    };

                    if (($rootScope.voicemail.activeTab === 0 && data.user_uuid) || (
                            $rootScope.voicemail.activeTab === 1 && data.location_group_uuid
                        )) {
                        dataFactory.postRetrieveVisualVoicemailList(data)
                            .then(function(response) {
                                if (response.data.success) {
                                    $scope.numbers = response.data.success.numbers;

                                    function doSetVoicemailData(numberLocationMapping) {
                                        var voicemails = response.data.success.voicemails;
                                        initializeVisualVoicemailCollection(voicemails);
                                        setVoicemailData(
                                            $scope.visualVoicemail.resources,
                                            $scope.numbers
                                        );
                                        $scope.loadingVoicemail = false;
                                        if (__env.enableDebug) console.log("VISUAL VOICEMAIL");
                                        if (__env.enableDebug) console.log($scope.visualVoicemail);
                                    };
                                    doSetVoicemailData();
                                    $scope.showTable = true;
                                    dataFactory.getUnreadVoicemailsCount().then(
                                        function(response) {
                                            if (response.status == 200) {
                                                $rootScope.unreadVoicemails =
                                                    response.data;
                                            }
                                        });

                                    dataFactory.getDomainUnreadVoicemailsCount().then(
                                        function(response) {
                                            if (response.status == 200) {
                                                $rootScope.domainUnreadVoicemails =
                                                    response.data;
                                            }
                                        });
                                } else {
                                    $scope.loadingVoicemail = false;
                                    $scope.showError = true;
                                }
                            }, function(error) {
                                if (__env.enableDebug) console.log("VV ERROR");
                                if (__env.enableDebug) console.log(error);
                            });
                    }
                }

                getVisualVoicemail();


                function setVoicemailData(voicemails, numbers) {
                    angular.forEach(voicemails, function(call) {
                        call.inbound_did = numbers ? numbers[call.extension_uuid] :
                            null;
                        call.message_length = parseInt(call.message_length);
                        if (call.caller_id_number.length >= 10) {
                            call.caller_id_number = call.caller_id_number.substring(
                                call.caller_id_number.length - 10);
                        }
                        call.caller_number = call.caller_id_number;
                        if (call.contact_name) {
                            call.caller_sort = call.contact_name;
                        } else {
                            call.caller_sort = call.caller_id_number;
                        }
                    });
                };

                $scope.removeVoicemail = function(filterVoicemail) {
                    var confirmation = 'Are you sure you want to delete this voicemail?';
                    var visual_voicemail_uuid = filterVoicemail.visual_voicemail_uuid;
                    $rootScope.confirmDialog(confirmation)
                        .then(function(response) {
                            if (response) {
                                var data = {
                                    visual_voicemail_uuid: visual_voicemail_uuid,
                                    user_uuid: $scope.userUuid ? $scope.userUuid : null,
                                    location_group_uuid: $scope.locationUuid ? $scope.locationUuid : null
                                };
                                dataFactory.postRemoveVisualVoicemail(data)
                                    .then(function(response) {
                                        if (response.data.success) {
                                            $scope.visualVoicemail.removeResourceByProp(
                                                "visual_voicemail_uuid",
                                                visual_voicemail_uuid
                                            );
                                            if (filterVoicemail.vm_status === "unread") {
                                                filterVoicemail.vm_status = "deleted";
                                                if ($scope.userUuid) {
                                                    $rootScope.unreadVoicemails--;
                                                }
                                            }
                                        }
                                    }, function(error) {
                                        if (__env.enableDebug) {
                                            console.log(error);
                                        }
                                    });
                            }
                        });
                };

                $scope.searchVoicemail = function(item) {
                    var found = false;
                    if (!$scope.vmSearch ||
                        (item.vm_transcript && item.vm_transcript.toLowerCase().indexOf(
                            $scope.vmSearch.toLowerCase()) != -1) ||
                        (item.noncontact && item.noncontact.name && item.noncontact.name
                            .toLowerCase().indexOf($scope.vmSearch.toLowerCase()) != -1
                        ) ||
                        (item.noncontact && item.noncontact.phone && item.noncontact.phone
                            .toLowerCase().indexOf($scope.vmSearch.toLowerCase()) != -1
                        ) ||
                        (item.contact && item.contact.extension && item.contact.extension
                            .toLowerCase().indexOf($scope.vmSearch.toLowerCase()) != -1
                        ) ||
                        (item.contact && item.contact.contact_name_given.toLowerCase().indexOf(
                            $scope.vmSearch.toLowerCase()) != -1) ||
                        (item.contact && item.contact.contact_name_family.toLowerCase()
                            .indexOf($scope.vmSearch.toLowerCase()) != -1)) {
                        found = true;
                    }
                    if (item.contact && item.contact.phones.length > 0) {
                        angular.forEach(item.contact.phones, function(phone) {
                            if (phone.phone_number && phone.phone_number.indexOf(
                                    $scope.vmSearch) != -1) {
                                found = true;
                            }
                        });
                    }
                    if ($scope.fromDate && $scope.toDate) {
                        if (moment(item.left_at).startOf('day') > moment($scope.toDate)
                            .startOf('day') || moment(item.left_at).startOf('day') <
                            moment($scope.fromDate).startOf('day')) found = false;
                    }
                    return found;
                };

                $scope.copyVmToHawksoft = function(call) {
                    var partner = $rootScope.user.exportType.partner_code;
                    call.uuid = call.visual_voicemail_uuid;
                    call.type = 'voicemail';
                    call.number = usefulTools.cleanPhoneNumber(call.caller_id_number);
                    if (partner == 'ams360') {
                        if ($scope.activityList.length != 0) {
                            angular.forEach($scope.activityList, function(activity) {
                                if (activity.Description.includes('phone')) {
                                    call['activity'] = activity.Description;
                                    return;
                                }
                            });
                        }
                        $rootScope.copyToAms360(call);
                    } else if (partner == 'qqcatalyst') {
                        $rootScope.copyToQQCatalyst(call);
                    } else {
                        integrationService.copyEntityToPartner(call);
                    }
                };

                $scope.copyVmInfoToHawksoft = function(call) {
                    var partner = $rootScope.user.exportType.partner_code;
                    call.uuid = call.visual_voicemail_uuid;
                    call.type = 'voicemail-info';
                    call.number = usefulTools.cleanPhoneNumber(call.caller_id_number);
                    if (partner == 'ams360') {
                        if ($scope.activityList.length != 0) {
                            angular.forEach($scope.activityList, function(activity) {
                                if (activity.Description.includes('phone')) {
                                    call['activity'] = activity.Description;
                                    return;
                                }
                            });
                        }
                        $rootScope.copyToAms360(call);
                    } else if (partner == 'qqcatalyst') {
                        $rootScope.copyToQQCatalyst(call);
                    } else {
                        integrationService.copyEntityToPartner(call);
                    }
                };

                $scope.playVoicemail = function(call) {
                    if (call.vm_status === 'unread') {
                        call.vm_status = 'saved';
                        if ($scope.userUuid) {
                            dataFactory.getSaveVisualVoicemail(call.visual_voicemail_uuid);
                            $rootScope.unreadVoicemails--;
                        } else {
                            dataFactory.getSaveVisualVoicemail(call.visual_voicemail_uuid,
                                $scope.locationUuid);
                        }
                    }
                    $rootScope.showAudioModal(call, 'voicemail', $scope.callContact(call));
                };

                $scope.assignVoicemal = function(call) {
                    function hasMatchingContactRecord(member) {
                        return Boolean(contactService.getContactbyMMId(member.id));
                    }

                    function hasOpenDirectChannel(member) {
                        return Boolean(newChatService.getDMChannelByUserId(member.id));
                    };

                    function isMemberOfCurrentLocation(contact) {
                        // var contact = contactService.getContactbyMMId(member.id);
                        var location = $scope.currentLocation();
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
                        if (!contact || contactService.isKotterTechUser(contact)) return false;
                        return true;
                    };

                    function isActive(contact) {
                        if (contact.user_uuid === $rootScope.user.id) return false;
                        if (!contact || !contact.name || contact.name === ' ' ||
                         !contact.en || contact.en !== 'true') return false;
                        return true;
                    };
                    
                    var peopleList = contactService.getUserContactsOnly().filter(
                        isActive).filter(isKotterTech).filter(
                        isMemberOfCurrentLocation);
                        
                    var array = [];
                    var uuids = [];
                    var from = call.inbound_did;
                    var to = call.caller_id_number;
                    var link = $scope.onescreenBaseUrl +
                        '/imported/freeswitch/storage/voicemail/default/' + call.vm_file;

                    var initial = 'You have been assigned this Voicemail by ' +
                        $rootScope.user.contact_name_given + ' ' + $rootScope.user.contact_name_family +
                        "\n\n";;
                    initial += '##### Voicemail from: ' + from + ' - to: ' + to +
                        "\n\n";
                    var initialHtml = '<p>You have been assigned this Voicemail by ' +
                        $rootScope.user.contact_name_given + ' ' + $rootScope.user.contact_name_family +
                        '.</p>' + "\n";
                    initialHtml += '<h4>Voicemail from: ' + from + ' - to: ' + to +
                        '</h4>' + "\n";
                    initial += "Link to Voicemail: " + link + "\n";
                    initialHtml += "Link to Voicemail: <a href='" + link +
                        "'>Click Here to Download</a><br />" + "\n";
                    if (call.vm_transcript) {
                        initial += "Transcription: " + call.vm_transcript + "\n\n";
                        initialHtml += '<span style="font-size: 13px">Transcription: ' +
                            call.vm_transcript + '</span><br />' + "\n";
                    }
                    initial += call.left_at + "\n\n";
                    initialHtml += '<span style="font-size: 13px">' + call.left_at +
                        '</span></p>' + "\n";
                    var data = {
                        type: 'Voicemail',
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
                                if ($scope.assignedTo.user_uuid !== $rootScope.user
                                    .id) {
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
                                            sendPost(inputElement, channel(),
                                                opts);
                                        }
                                        if (!channel()) {
                                            var chatId = $scope.assignedTo.chat_id;
                                            var member = newChatService.teamMembers[
                                                chatId];
                                            newChatService.createDirectChannel(
                                                    member)
                                                .then(function(response) {
                                                    doSendPost(files);
                                                });
                                        } else {
                                            doSendPost(files);
                                        }
                                    }
                                    var emailNote = angular.element(
                                        "#chatInput")[0].value;
                                    var data = {
                                        user_uuid: $scope.assignedTo.user_uuid,
                                        visual_voicemail_uuid: call.visual_voicemail_uuid
                                    };

                                    function submitAssignment(files) {
                                        chatSendPost();
                                        if (info.sendEmail) {
                                            data.sendEmail = 'true';
                                            data.email_subject = info.email_subject ?
                                                info.email_subject : null;
                                            data.content = info.initialHtml;
                                            data.files = files;
                                        }

                                        if (data.files && data.files.length > 0) {
                                            for (var i = 0; i < data.files.length; i++) {
                                                data["file" + i] = data.files[i];
                                            }
                                            data.file_count = data.files.length;
                                            delete data.files;
                                        }
                                        data = fileService.convertObjectToFormData(
                                            data);
                                        dataFactory.postAssignVoicemail(data)
                                            .then(function(response) {
                                                $rootScope.showalerts(
                                                    response);
                                                $rootScope.closeModal();
                                                if (response.data.success) {
                                                    var resp = response.data
                                                        .success.data;
                                                    call.assigned_to = resp
                                                        .assigned_to;
                                                    call.assigned_at = resp
                                                        .assigned_at;
                                                    call.vm_status = resp.assigned_to ?
                                                        'read' : 'unread';
                                                }
                                            });

                                    }
                                    submitAssignment(this.files);
                                }
                            } else {
                                var message =
                                    "Please select someone to assign the voicemail to in the dropdown.";
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

                    $rootScope.showModalWithData('/modals/assign-texts.html', data);
                };

                $scope.isEmulating = function() {
                    return $scope.emulatedUser();
                };

                $scope.sort_by = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.showChevron = function(predicate) {
                    return usefulTools.showChevron(predicate, $scope.predicate, $scope.reverse);
                };

                $scope.isAdminGroupOrGreater = function() {
                    var group = $rootScope.user.accessgroup;
                    return (group === 'admin' || group === 'superadmin');
                };

                $scope.formatTime = function(time) {
                    return usefulTools.formatTime(time);
                };

                metaService.rootScopeOn($scope, 'update.voicemails.user', function($event,
                    userUuid) {
                    getVisualVoicemail(userUuid);
                });

                metaService.rootScopeOn($scope, 'update.location.voicemail', function(
                    $event, event) {
                    if ($scope.locationUuid && $scope.locationUuid === event.location_group_uuid) {
                        var visualVoicemail = $scope.visualVoicemail.findResource(
                            "visual_voicemail_uuid",
                            event.visual_voicemail_uuid
                        );
                        if (visualVoicemail && event.type === 'delete-voicemail') {
                            $scope.visualVoicemail.removeResource(visualVoicemail);
                        } else if (visualVoicemail && event.type === 'read-voicemail') {
                            visualVoicemail.vm_status = "saved";
                        } else if (event.type === 'new-voicemail') {
                            getVisualVoicemail();
                        }
                        getDomainUnreadCount();
                    }
                });

                function getDomainUnreadCount() {
                    dataFactory.getDomainUnreadVoicemailsCount().then(function(response) {
                        if (response.status == 200) {
                            $rootScope.domainUnreadVoicemails = response.data;
                        }
                    });
                }

                $rootScope.$on('update.locations_voicemails', function(event) {
                    console.log(event);
                    dataFactory.getUnreadVoicemailsCount().then(function(response) {
                        if (response.status == 200) {
                            $rootScope.unreadVoicemails = response.data;
                        }
                    });

                    dataFactory.getDomainUnreadVoicemailsCount().then(function(
                        response) {
                        if (response.status == 200) {
                            $rootScope.domainUnreadVoicemails = response.data;
                        }
                    });
                });

                $rootScope.$on('reload.voicemail', function(event, type) {
                    getVisualVoicemail();
                });

                $scope.$watch('locationUuid', function(newVal, oldVal) {
                    var justInitialized = newVal && !oldVal || newVal === oldVal;
                    var justChanged = newVal && oldVal && (newVal !== oldVal);
                    if (justInitialized || justChanged) {
                        getVisualVoicemail();
                    }
                });

                metaService.rootScopeOn($scope, 'vm.location.changed', function(e,
                    locationUuid) {
                    console.log("reload")
                    console.log(locationUuid);
                    // $scope.locationUuid = locationUuid;
                    // getVisualVoicemail();
                });

                $scope.isManagerOrUser = function() {
                    return $scope.currentLocation().ismanager('dids') || $scope.currentLocation()
                        .isuser('dids') || $scope.isAdminGroupOrGreater()
                };

                $scope.selectedMessages = {};
                $scope.messages = {
                    selectAll: false,
                    selectedMessages: {}
                };
                $scope.selectMessage = function(messageUuid) {};
                $scope.selectAllMessages = function(messages) {
                    var i;
                    var start = ($scope.pagination.currentPage - 1) * $scope.pagination
                        .perPage;
                    var end = start + $scope.pagination.perPage;
                    for (i = start; i < end; i += 1) {
                        if (messages[i]) {
                            $scope.messages.selectedMessages[messages[i].visual_voicemail_uuid] =
                                $scope.messages.selectAll;
                        }
                    };
                };

                function getSelectedMessages(obj) {
                    var array = [];
                    if (Object.keys(obj).length > 0 && obj.constructor === Object) {
                        angular.forEach(obj, function(value, key) {
                            if (value) array.push(key);
                        });
                    }
                    return array;
                }
                $scope.messagesSelectedCount = function() {
                    var threads = getSelectedMessages($scope.messages.selectedMessages);
                    return threads.length;
                };

                $scope.deleteSelectedMessages = function() {
                    var count = $scope.messagesSelectedCount();
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Confirm Delete')
                        .htmlContent('Are you sure you want to delete the selected ' +
                            count + ' voicemail records?')
                        .ariaLabel('Delete')
                        .ok('Delete')
                        .cancel('Cancel');
                    $mdDialog.show(deleteConfirm).then(function() {
                        var data = {
                            messages: getSelectedMessages($scope.messages.selectedMessages),
                            user_uuid: $scope.userUuid ? $scope.userUuid : null,
                            location_group_uuid: $scope.locationUuid ?
                                $scope.locationUuid : null
                        };
                        dataFactory.postRemoveMultipleVoicemails(data)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    angular.forEach(data.messages, function(
                                        message) {
                                        var visualVoicemail =
                                            $scope.visualVoicemail.findResource(
                                                "visual_voicemail_uuid",
                                                message
                                            );
                                        if (visualVoicemail.vm_status ===
                                            "unread") {
                                            if ($scope.userUuid)
                                                $rootScope.unreadVoicemails--;
                                        }
                                        $scope.visualVoicemail.removeResource(
                                            visualVoicemail);
                                    });
                                    $scope.messages.selectedMessages = {};
                                    $scope.messages.selectAll = false;
                                }
                            });
                    });
                };

            }
        };
    })
    .directive('myCallhistoryTable', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/callhistory-table.html'
        };
    })
    .directive('agencyCallhistoryTable', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/agency-callhistory-table.html'
        };
    })
    .directive('companySetupNumberSetupTab', function(dataFactory, usefulTools, $mdDialog, $filter,
        $rootScope, metaService, chatMacroService, $timeout, e911Service, userService,
        $uibModalStack, $q, _) {
        function currentlyEmulating($scope) {
            if ($scope.domain) {
                return $scope.domain.domain_uuid !== $rootScope.user.domain_uuid;
            }
            return false;
        };
        return {
            restrict: 'E',
            templateUrl: 'views/company/company-setup-number-setup-tab.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {

                $scope.pagination = {
                    perPage: 10,
                    currentPage: 1,
                    perPage2: 10,
                    currentPage2: 1
                };
                $scope.init = function() {
                    $scope.loading = true;
                    $scope.isKotterTechUserByUuid = $rootScope.isKotterTechUserByUuid;
                    $scope.newE911Number = {};
                    $scope.outboundDIDChoices = {};
                    $scope.emergencyDidChoices = {};
                    $scope.e911Registrations = {};
                    $scope.userDIDChoices = {};
                    $scope.editingDid = null;
                    var promises = [];

                    getNumberSetupInfo($scope.domain.domain_uuid)
                        .then(function() {
                            $scope.initializeOutboundDIDChoices();
                            $scope.loading = false;
                        });
                };

                function getNumberSetupInfo(domainUuid) {
                    return dataFactory.getNumberSetupInfo(domainUuid)
                        .then(function(response) {
                            console.log(response.data);
                            if (response.data.success) {
                                $scope.billingStates = response.data.success.states;
                                $scope.e911Registrations = response.data.success.registrations;
                                $scope.users = response.data.success.users;
                                var dids = response.data.success.dids;
                                $scope.validDids = usefulTools.createObjectCollByItemProperty(
                                    dids, 'destination_number');
                            }
                            return true;
                        })
                }

                $scope.showImportUsers = function() {

                };

                metaService.rootScopeOn($scope, 'portingnumber.activated', function() {
                    console.log("INITIALIZE")
                    $scope.init();
                });

                $scope.loadUsers = function(domainUuid) {
                    return userService.findUsers(domainUuid, true).then(function(users) {
                        if (users) {
                            console.log(users);
                            $scope.users = users;
                            // $scope.$evalAsync(function() {
                            //     $scope.users = userService.mergeUserColWithContacts(users);
                            // });
                        }
                        return users;
                    });
                };

                $scope.initializeOutboundDIDChoices = function() {
                    angular.forEach($scope.users, function(user) {
                        if (user.extension) {
                            var callerIdNum = user.extension.outbound_caller_id_number;
                            if (callerIdNum) {
                                $scope.outboundDIDChoices[user.id] = $scope.validDids[
                                    callerIdNum];
                            }
                            var userDid = user.did;
                            if (userDid) {
                                $scope.userDIDChoices[user.id] = $scope.validDids[
                                    userDid];
                            }
                            var destinationUuid = user.e911DestinationUuid;
                            if (destinationUuid) {
                                var index = $filter('getByUUID')($scope.e911Registrations,
                                    destinationUuid, 'destination');
                                if (index !== null) $scope.emergencyDidChoices[
                                    user.id] = $scope.e911Registrations[
                                    index];
                            }
                        }
                    });
                };

                // $scope.initializeUserDIDChoices = function() {
                //     angular.forEach($scope.users, function(user) {

                //     });
                //     console.log($scope.userDIDChoices);
                //     console.log($scope.users);
                // };

                // $scope.initializeEmergencyDidChoices = function() {
                //     angular.forEach($scope.users, function(user) {

                //     });
                // };


                $scope.$on('changed.did', function($event, user) {
                    var userDid = user.did;
                    angular.forEach($scope.users, function(user1) {
                        if (user1.id == user.id) {
                            user1.did = user.did;
                        }
                    });
                    $scope.userDIDChoices[user.id] = $scope.validDids[userDid];
                    $scope.init();
                });

                $scope.editDid = function(user) {
                    $scope.editingDid = user.id;
                };

                $scope.cancelEditUserDid = function(user) {
                    $scope.editingDid = null;
                    $scope.userDIDChoices[user.id] = $scope.validDids[user.did];
                };

                $scope.isAvailDid = function(did, user) {
                    if (did.destination_description.indexOf('Fax Number') !== -1) return false;
                    if (did.port && did.port.port_status !== 'ported') return false;
                    if (did.info && (did.info.isConference || did.info.isIvr)) return false;
                    if (did.info && did.info.isUser && did.destination_number !== user.did)
                        return false;
                    return true;
                };

                $scope.doChangeUserDid = function(user) {
                    var did = $scope.userDIDChoices[user.id];
                    console.log(user.did);
                    console.log(did.destination_number)
                    if (user.did === did.destination_number) {
                        $scope.cancelEditUserDid(user);
                        return;
                    }
                    var saveConfirm = $mdDialog.confirm()
                        .title('Confirm')
                        .htmlContent(
                            "Please confirm that you want to change the DID for <strong>" +
                            user.contact_name_given + ' ' + user.contact_name_family +
                            "</strong> from <strong>" + $filter('tel')(user.did) +
                            "</strong> to <strong>" + $filter('tel')(did.destination_number) +
                            "</strong>?")
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Cancel');
                    var data = {
                        domain_uuid: user.domain_uuid,
                        user_uuid: user.id,
                        destination_uuid: did.destination_uuid,
                        extension_uuid: user.extension.extension_uuid
                    };
                    $mdDialog.show(saveConfirm).then(function() {
                        dataFactory.postChangeUserDid(data)
                            .then(function(response) {
                                console.log(response.data);
                                if (response.data.success) {
                                    user.did = did.destination_number;
                                    $scope.userDIDChoices[user.id] =
                                        response.data.success.new;
                                    $scope.editingDid = null;
                                } else {
                                    $rootScope.showErrorAlert(response.data
                                        .error.message);
                                }
                            });
                    }, function() {
                        $scope.cancelEditUserDid(user);
                    });
                };

                $scope.DIDIsUnregistered = function(did) {
                    return !$scope.e911Registrations[did.destination_uuid];
                };

                $scope.registerE911Phone = function() {
                    var addressInfo = $scope.newE911Number;
                    addressInfo.callername = $scope.domain.domain_name;
                    var destinationUuid = $scope.newE911Number.number.destination_uuid;
                    if (destinationUuid) {
                        return e911Service.registerE911Phone(destinationUuid,
                                addressInfo)
                            .then(function(registration) {
                                if (registration) {
                                    var index = $filter('getByUUID')($scope.e911Registrations,
                                        destinationUuid, 'destination');
                                    if (index !== null) $scope.e911Registrations[
                                        index] = registration;
                                    return true;
                                } else {
                                    return null;
                                }
                            });
                    } else {
                        return null;
                    }
                };

                $scope.orderE911Address = function(user) {
                    $scope.orderingAddress = true;
                    var addressInfo = $scope.newE911Number;
                    addressInfo.callername = $scope.domain.domain_name;
                    console.log(addressInfo);
                    return e911Service.orderE911Address($scope.domain.domain_uuid,
                            addressInfo)
                        .then(function(registration) {
                            $scope.orderingAddress = false;
                            if (registration) {
                                $scope.e911Registrations.push(registration);
                                if (user) {
                                    $scope.emergencyDidChoices[user.id] =
                                        registration;
                                    $scope.assignCallerIdNumber(user, true);
                                }
                                $uibModalStack.dismissAll();
                                return true;
                            } else {
                                return null;
                            }
                        });
                };
                $scope.saveEditE911 = function(destination) {
                    $scope.savingChanges = true;
                    var addressInfo = $scope.editE911Number;
                    addressInfo.callername = $scope.domain.domain_name;
                    var destinationUuid = destination.destination_uuid;
                    if (destinationUuid) {
                        return e911Service.registerE911Phone(destinationUuid,
                                addressInfo)
                            .then(function(registration) {
                                if (registration) {
                                    var index = $filter('getByUUID')($scope.e911Registrations,
                                        destinationUuid, 'destination');
                                    if (index !== null) $scope.e911Registrations[
                                        index] = registration;
                                    return true;
                                } else {
                                    return null;
                                }
                                $scope.savingChanges = false;
                            });
                    } else {
                        return null;
                    }
                };

                $scope.setCallerId = function(user) {
                    var did = $scope.outboundDIDChoices[user.id];
                    var data = {
                        extension_uuid: user.extension.extension_uuid,
                        did: did.destination_number,
                        user_uuid: user.user_uuid,
                        type: 'default'
                    };
                    dataFactory.postUpdateUserCallerId(data)
                        .then(function(response) {
                            console.log(response.data);
                            if (response.data.success) {
                                user.extension.outbound_caller_id_number = did.destination_number;
                                //user.extension.effective_caller_id_number = did.destination_number;
                            } else {
                                $scope.outboundDIDChoices[user.id] = $scope.validDids[
                                    user.extension.outbound_caller_id_number];
                            }
                        })
                };

                $scope.assignE911Registration = function(user, reg) {
                    if ($scope.emergencyDidChoices[user.id] === 'createnew') {
                        console.log("CREATE NEW");
                    } else {
                        var data = {
                            extension_uuid: user.extension.extension_uuid,
                            destination_uuid: reg.destination_uuid
                        };

                    }


                };

                function resetUserDIDChoice(user) {
                    var prevDestinationUuid = user.e911DestinationUuid;
                    var previousDestination = $scope.e911CandidateDIDs[prevDestinationUuid];
                    $scope.outboundDIDChoices[user.id] = previousDestination;
                };
                $scope.modalRegisterAndAssignCallerIdNumber = function(user) {
                    $uibModalStack.dismissAll();
                    $scope.registerE911Phone().then(function(registration) {
                        if (registration) {
                            $scope.assignCallerIdNumber(user).then(function(
                                extension) {
                                if (!extension) {
                                    resetUserDIDChoice(user);
                                }
                            });
                        } else {
                            resetUserDIDChoice(user);
                        }
                    });
                };
                $scope.$watch('domain', function(newVal, oldVal) {
                    var justInitialized = newVal && !oldVal || newVal === oldVal;
                    var justChanged = newVal && oldVal && (newVal !== oldVal);
                    if (justInitialized || justChanged) {
                        $scope.init();
                    }
                });

                $scope.setDefaultE911Address = function(reg) {
                    e911Service.setDefaultE911Address(reg)
                        .then(function(response) {
                            if (response.success) {
                                angular.forEach($scope.e911Registrations, function(
                                    address) {
                                    address.domain_default = null;
                                });
                                var index = $filter('getByUUID')($scope.e911Registrations,
                                    reg.destination_uuid, 'destination');
                                if (index !== null) $scope.e911Registrations[index]
                                    .domain_default = 'true';
                            } else {
                                $rootScope.showErrorAlert(
                                    'Unable to set the address as default');
                            }
                        })
                };

                $scope.addressNotSet = function(user) {
                    return !$scope.emergencyDidChoices[user.id];
                };

                $scope.assignCallerIdNumber = function(user, skip) {
                    var did = $scope.emergencyDidChoices[user.id];
                    console.log(did);
                    if (!did && !skip) {
                        $scope.showNewE911Modal(user);
                        return null;
                    } else {
                        return e911Service.assignCallerIdNumber(user.id, did.destination_uuid)
                            .then(function(extension) {
                                if (extension) {
                                    user.extension.emergency_caller_id_number =
                                        extension.emergency_caller_id_number;
                                    // user.extension.outbound_caller_id_number =
                                    //     extension.outbound_caller_id_number;
                                }
                                return extension;
                            });
                    }
                };

                $scope.showNewE911Modal = function(user) {
                    $scope.orderingAddress = false;
                    var data = {
                        billingStates: $scope.billingStates,
                        newE911Number: $scope.newE911Number,
                        modalRegister: $scope.orderE911Address,
                        orderingAddress: $scope.orderingAddress,
                        user: user
                    };
                    $rootScope.showModalWithData('/settings/order-e911-modal.html',
                        data);
                };

                $scope.addNewE911Number = function() {
                    $scope.showAddE911 = true;
                };
                $scope.cancelAddE911 = function(user) {
                    if (user) $scope.emergencyDidChoices[user.id] = null;
                    $scope.showAddE911 = false;
                };
                $scope.editE911Number = {};
                $scope.editE911 = function(registration) {
                    registration.editing = true;
                    $scope.editE911Number.address1 = registration.address;
                    $scope.editE911Number.community = registration.city;
                    $scope.editE911Number.state = registration.state;
                    $scope.editE911Number.postalcode = registration.zipcode;
                };
                $scope.cancelEditE911 = function(registration) {
                    registration.editing = false;
                };
            }
        };
    })
    .directive('tollFreeNumberSetup', function(dataFactory, $myModal, $mdDialog, $filter,
        $rootScope) {
        function currentlyEmulating($scope) {
            if ($scope.domain) {
                return $scope.domain.domain_uuid !== $rootScope.user.domain_uuid;
            }
            return false;
        };
        return {
            restrict: 'E',
            templateUrl: 'views/company/toll-free-number-setup.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.pagination = {
                    perPage: 10,
                    currentPage: 1
                };
                $scope.minutes = {};

                function init(loading) {
                    $scope.loading = loading;
                    if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                    dataFactory.getTollfreeNumberSetup($scope.domain.domain_uuid)
                        .then(function(response) {
                            $scope.agencyInfo = {
                                tfNumbers: []
                            };
                            if (response.data.success) {
                                $scope.agencyInfo = response.data.success.data;
                                if ($scope.agencyInfo.tfNumbers) {
                                    angular.forEach($scope.agencyInfo.tfNumbers,
                                        function(number) {
                                            var data = {
                                                numberUuid: number.bandwidth_number_uuid
                                            };
                                            dataFactory.postRetrieveTollfreeCallHistory(
                                                    data)
                                                .then(function(response) {
                                                    if (response.data.success)
                                                        $scope.minutes[number.bandwidth_number_uuid] =
                                                        response.data.success.data;
                                                });
                                        });
                                }
                            }
                            $scope.loading = false;
                        });
                }

                init(true);

                $scope.cancelTollFreeNumber = function(number) {
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent('Are you sure you want to remove ' + $filter('tel')
                            (number.didnumber) +
                            ' from this agency? <strong>Doing this will take the number offline immediately.</strong> A pro-rated credit for the balance of the month will appear on the next invoice.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Cancel');
                    $mdDialog.show(deleteConfirm).then(function() {
                        dataFactory.getDeleteTollFreeNumber(number.bandwidth_number_uuid)
                            .then(function(response) {
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope
                                        .agencyInfo.tfNumbers, number.bandwidth_number_uuid,
                                        'bandwidth_number');
                                    if (index !== null) $scope.agencyInfo.tfNumbers
                                        .splice(index, 1);
                                } else {
                                    $rootScope.showErrorAlert(response.data
                                        .error.message);
                                }
                            });
                    });
                };

                $scope.editTollfreeNumber = function(number) {
                    $rootScope.showInfoAlert(
                        'This function has not yet been implemented.');
                };

                $scope.showUserName = function(userUuid) {
                    var contact = contactService.getContactByUserUuid(userUuid);
                    if (contact) return contact.name;
                    return null;
                };

                $scope.showOrderTollFree = function() {
                    $myModal.openTemplate('new-toll-free-modal.html', $scope.domain,
                        'md', '', '');
                };

                $rootScope.$on('tollfree.numbers.created', function($event) {
                    init(false);
                });

            }
        };
    })
    .directive('newTollFree', function(dataFactory, usefulTools, $mdDialog, $filter, $rootScope,
        metaService, chatMacroService, $timeout, e911Service, userService, $uibModalStack, $q,
        _) {
        return {
            restrict: 'E',
            templateUrl: 'new-toll-free.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.pagination = {
                    perPage: 10,
                    currentPage: 1
                };
                $scope.availableDids = [];
                $scope.data = {
                    searchtype: 'wildcard',
                    wildcard: '8**'
                };
                $scope.wildcards = ['8**', '80*', '83*', '84*', '85*', '86*', '87*', '88*'];
                $scope.selectedDids = {};
                $scope.loadingDids = false;
                $scope.closeModal = $rootScope.closeModal;
                $scope.getAvailableDids = function() {
                    $scope.selectedDids = {};
                    $scope.loadingDids = true;
                    $scope.showNumbers = true;
                    var data = {
                        domainUuid: $scope.domain.domain_uuid,
                        refresh: $scope.availableDids.length === 0 ? false : true,
                        search_type: $scope.data.searchtype,
                        wildcard: $scope.data.searchtype == 'wildcard' ? $scope.data
                            .wildcard : null,
                        vanity: $scope.data.searchtype == 'vanity' ? $scope.data.vanity : null,
                        reservations: $scope.availableDids.length > 0 ? $scope.availableDids : []
                    };
                    console.log(data);
                    dataFactory.postGetAvailableTollfreeDids(data)
                        .then(function(response) {
                            if (__env.enableDebug) console.log("DIDS");
                            if (__env.enableDebug) console.log(response);
                            if (response.data.success) $scope.availableDids =
                                response.data.success.data;
                            $scope.loadingDids = false;
                        }, function(error) {
                            if (__env.enableDebug) console.log(error);
                        });
                };

                $scope.selectDid = function(did) {
                    if ($scope.selectedDids[did.number]) {
                        delete $scope.selectedDids[did.number];
                    } else {
                        $scope.selectedDids[did.number] = did;
                    }
                };
                $scope.isSelected = function(did) {
                    return $scope.selectedDids[did.number];
                };

                $scope.selectedNumArray = function() {
                    return usefulTools.convertObjectToArray($scope.selectedDids);
                };

                $scope.orderTollFreeNumbers = function() {


                    dataFactory.getDaysRemain($scope.domain.domain_uuid)
                        .then(function(response) {
                            var info = response.data.success.data;
                            var per_seat = parseFloat(info.per_seat);
                            var charge = (per_seat * parseFloat(info.remain) /
                                parseFloat(info.days)).toFixed(2);
                            var html = '';
                            if (info.freePeriod) {
                                html =
                                    'As your agency is currently in a free trial there is no charge today to add this user. You will be charged ' +
                                    $filter('currency')(per_seat) +
                                    '/month plus a monthly Compliance and Administrative Cost Recovery Fee (CRF) of ' +
                                    $filter('currency')(info.recovery) +
                                    ' for this user moving forward. ';
                            } else {
                                html = 'A pro-rated charge of ' + $filter(
                                        'currency')(charge) +
                                    '* will be added to your next monthly bill. You will be charged ' +
                                    $filter('currency')(per_seat) +
                                    '/month plus a monthly Compliance and Administrative Cost Recovery Fee (CRF) of ' +
                                    $filter('currency')(info.recovery) +
                                    ' for this user moving forward. <br><span style="font-size: 12px;">*($' +
                                    per_seat + '/user x ' + info.remain +
                                    ' days remaining in this month / ' + info.days +
                                    ' days this month)</span>'
                            }
                            var createConfirm = $mdDialog.confirm()
                                .title('Please Confirm')
                                .textContent(
                                    'Are you sure you want to order the selected ' +
                                    $scope.selectedNumArray().length +
                                    ' Toll Free Number' + ($scope.selectedNumArray()
                                        .length > 1 ? 's' : '') +
                                    '? There is a monthly charge of $10 per number plus a charge of $0.03/inbound minute.'
                                )
                                .ariaLabel('Confirm')
                                .ok('Yes')
                                .cancel('Cancel');
                            $mdDialog.show(createConfirm).then(function() {
                                $scope.processing = true;
                                var data = {
                                    domainUuid: $scope.domain.domain_uuid,
                                    dids: $scope.selectedNumArray(),
                                    reservations: $scope.availableDids
                                };

                                dataFactory.postOrderTollFreeNumbers(data)
                                    .then(function(response) {
                                        if (response.data.success) {
                                            if (__env.enableDebug)
                                                console.log(response.data
                                                    .success)
                                            $scope.selectedDids = {};

                                            $timeout(function() {
                                                $scope.processing =
                                                    false;
                                            });
                                            $rootScope.$broadcast(
                                                'tollfree.numbers.created'
                                            );
                                            // $scope.users.push(combo);
                                            $uibModalStack.dismissAll();
                                            $rootScope.showSuccessAlert(
                                                response.data.success
                                                .message);
                                        } else if (response.data.error) {
                                            $scope.processing = false;
                                            $rootScope.showErrorAlert(
                                                response.data.error
                                                .message);
                                        }
                                    });
                            }, function(cancel) {
                                //Cancel add user
                            });
                        });

                    var confirmOrder = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent('Are you sure you want to order the selected ' +
                            $scope.selectedNumArray().length + ' Toll Free Number' + (
                                $scope.selectedNumArray().length > 1 ? 's' : '') +
                            '? There is a monthly charge of $10 per number plus a charge of $0.03/inbound minute.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Cancel');
                    $mdDialog.show(confirmOrder).then(function() {

                    });
                }
            }
        };
    })

    .directive('keyPressChat', function(chatMessages, $timeout, newChatService, chatMacroService,
        $rootScope, usefulTools, $window, metaService) {
        return {
            restrict: 'A',
            scope: {
                sendPost: '&',
                rootPost: '<',
                isThreadedInput: '<',
                chatData: '=',
                chatView: '=',
                runInit: '=',
                isDelayed: '<',
                uploader: '<',
                keyPressEventFns: '<',
                peopleData: '=',
                channelData: '=',
                macroData: '='
            },
            link: function($scope, element, attrs) {
                var parent;
                $scope.doGetCaretPosition = usefulTools.doGetCaretPosition;

                $scope.init = function() { // called at end of directive
                    var inProgressMessage = $scope.getInProgress();
                    element[0].value = inProgressMessage ? inProgressMessage : '';
                    element.bind('keydown', onKeyDown);
                    element.bind('keyup', onKeyUp);
                    element[0].onpaste = function(e) {
                        $scope.keyPressEventFns.onPaste(e, $scope);
                    };
                };

                $scope.element = element[0];

                if ($scope.peopleData) {
                    $scope.peopleData.element = $scope.element;
                } else {
                    var peopleListener = $scope.$watch('peopleData', function(newVal,
                        oldVal) {
                        if (newVal) {
                            $scope.peopleData.element = $scope.element;
                            peopleListener();
                        }
                    });
                }

                if ($scope.channelData) {
                    $scope.channelData.element = $scope.element;
                } else {
                    var channelListener = $scope.$watch('channelData', function(newVal,
                        oldVal) {
                        if (newVal) {
                            $scope.channelData.element = $scope.element;
                            channelListener();
                        }
                    });
                }

                if ($scope.macroData) {
                    $scope.macroData.element = $scope.element;
                } else {
                    var macroListener = $scope.$watch('macroData', function(newVal, oldVal) {
                        if (newVal) {
                            $scope.macroData.element = $scope.element;
                            macroListener();
                        }
                    });
                }

                $scope.doSendPost = function() {
                    var channel;
                    if ($scope.isThreadedInput) {
                        channel = newChatService.findChannelById($scope.rootPost.channel_id);
                    } else {
                        channel = $scope.channel();
                    }
                    var opts = {
                        root_id: $scope.isThreadedInput ? $scope.rootPost.id : null,
                        uploader: $scope.uploader ? $scope.uploader : null
                    };
                    $scope.sendPost()(element[0], channel, opts);
                };

                $scope.$watch(function() {
                    return $scope.channel().id;
                }, function(newVal, oldVal) {
                    $scope.init();
                });

                $scope.channel = function() {
                    return newChatService.publicData.currentChannel;
                };

                $scope.setInProgress = function(message) {
                    if ($scope.isThreadedInput) {
                        newChatService.setInProgress($scope.rootPost.id, message);
                    } else {
                        newChatService.setInProgress($scope.channel().id, message);
                    }
                };

                $scope.getInProgress = function() {
                    if ($scope.rootPost && $scope.isThreadedInput) {
                        return newChatService.getInProgress($scope.rootPost.id);
                    } else {
                        return newChatService.getInProgress($scope.channel().id);
                    }
                };

                var eventFunctions = {
                    bareEnter: function(e) {
                        return e.which === 13 && !e.shiftKey;
                    },
                    shiftEnter: function(e) {
                        return e.which === 13 && e.shiftKey;
                    },
                    at: function(e) {
                        return e.which === 50 && e.shiftKey;
                    },
                    hash: function(e) {
                        return e.which === 51 && e.shiftKey;
                    },
                    tab: function(e) {
                        return e.which === 9;
                    },
                    esc: function(e) {
                        return e.which === 27;
                    },
                    spc: function(e) {
                        return e.which === 32;
                    },
                    up: function(e) {
                        return e.which === 38;
                    },
                    down: function(e) {
                        return e.which === 40;
                    },
                    backspace: function(e) {
                        return e.which === 8;
                    }
                };

                function getRelevantEvent(e) {
                    var eventFunction;
                    var key;
                    var eventKeys = Object.keys(eventFunctions);
                    for (var i = 0; i < eventKeys.length; i++) {
                        key = eventKeys[i];
                        eventFunction = eventFunctions[key];
                        if (eventFunction(e)) {
                            return key;
                        }
                    }
                    return null;
                };

                function onKeyDown(e) {
                    e.stopImmediatePropagation();
                    var relevantEvent = getRelevantEvent(e);
                    var keyPressFns = $scope.keyPressEventFns.onKeyDown;
                    var eventFn = keyPressFns[relevantEvent];
                    var alwaysFn = keyPressFns.always;
                    var noRelevantFn = keyPressFns.noRelevant;
                    if (eventFn) {
                        eventFn(e, $scope);
                    } else {
                        noRelevantFn(e, $scope);
                    }
                    alwaysFn(e, $scope);
                };

                function onKeyUp(e) {
                    e.stopImmediatePropagation();
                    var relevantEvent = getRelevantEvent(e);
                    var keyPressFns = $scope.keyPressEventFns.onKeyUp;
                    var eventFn = keyPressFns[relevantEvent];
                    var alwaysFn = keyPressFns.always;
                    var noRelevantFn = keyPressFns.noRelevant;
                    if (eventFn) {
                        eventFn(e, $scope);
                    } else {
                        noRelevantFn(e, $scope);
                    }
                    alwaysFn(e, $scope);
                };

                metaService.rootScopeOn($scope, 'emojis-initialized', function(e) {
                    var emojiToggle = element.siblings().filter('.wdt-emoji-picker');
                    emojiToggle.on('click', function(e) {
                        var isOpen = emojiToggle.hasClass(
                            'wdt-emoji-picker-open');
                        if (isOpen) {
                            $rootScope.$broadcast('emoji-opened', element[0]);
                        };
                    });
                });

                $scope.init();
            }
        };
    })
    .directive('emojiPopup', function(metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/emoji-popup.html',
            scope: {
                post: '<'
            },
            link: function($scope, element, attrs) {
                var getDimensions = function(inputElement) {
                    return inputElement.getBoundingClientRect();
                };
                var getActualElement = function() {
                    return element.find('.wdt-emoji-popup')[0];
                };
                $scope.getThisElementHeight = function() {
                    return getActualElement().getBoundingClientRect().height;
                };
                $scope.calculateStyle = function(dimensions) {
                    var actualElement = getActualElement();
                    var thisElementDimensions = actualElement.getBoundingClientRect();
                    var top = dimensions.top - thisElementDimensions.height;
                    var thisWidth = thisElementDimensions.width;
                    var left = dimensions.left + dimensions.width + -thisWidth;
                    actualElement.style.left = left + 'px';
                    actualElement.style.top = top + 'px';
                };
                metaService.rootScopeOn($scope, 'emoji-opened', function(e, inputElement) {
                    var dimensions = getDimensions(inputElement);
                    $scope.$evalAsync(function() {
                        $scope.calculateStyle(dimensions);
                    });
                });
            }
        };
    })
    .directive('giphyImg', function($timeout, $interval, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/giphy-img.html',
            scope: {
                post: '<'
            },
            link: function($scope, element, attrs) {
                var getActualElement = function() {
                    return element.find('.giphy-img')[0];
                };
                $scope.getHeight = function() {
                    return getActualElement().getBoundingClientRect().height;
                };
                $scope.scrollToBottom = function() {
                    var chatBox = angular.element('.posts-container')[0];
                    chatBox.scrollTop = chatBox.scrollHeight;
                };
                var maxIterations = 100;
                var totalIterations = 0;
                var interval = $interval(function() {
                    if ($scope.getHeight() > 0 && !$rootScope.showingMorePosts) {
                        $scope.scrollToBottom();
                        $interval.cancel(interval);
                    } else if (totalIterations === maxIterations) {
                        $interval.cancel(interval);
                    }
                    totalIterations += 1;
                }, 100);
            }
        };
    })
    .directive('chatSendButton', function(chatService, newChatService) {
        return {
            restrict: 'A',
            scope: {
                inputElement: '<',
                sendPost: '&',
                isThreadedButton: '<',
                rootPost: '<'
            },
            link: function($scope, element, attrs) {
                $scope.channel = function() {
                    return newChatService.publicData.currentChannel;
                };
                element.on('click', function(e) {
                    var opts = {
                        root_id: $scope.isThreadedButton ? $scope.rootPost.id : null
                    };
                    $scope.sendPost()($scope.inputElement, $scope.channel(), opts);
                });
            }
        };
    })
    .directive('chatAvatar', function(chatService, newChatService) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat-avatar.html',
            scope: {
                post: '<',
                contact: '<',
                chatUser: '<',
                isConsecutivePost: '<'
            },
            link: function($scope, element, attrs) {
                if ($scope.contact.contact_profile_color) {
                    $scope.contactColor = $scope.contact.contact_profile_color;
                } else {
                    $scope.contactColor = '';
                }
                $scope.showMemberPhoto = newChatService.showMemberPhoto;
            }
        };
    })
    .directive('chatPeopleSuggestionList', function(contactService) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/chat-people-suggestion-list.html',
            scope: {
                parentData: '<',
                inputElement: '<',
                isModal: '='
            },
            link: function($scope, element, attrs) {
                var getDimensions = function() {
                    return $scope.inputElement.getBoundingClientRect();
                };
                var getActualElement = function() {
                    return element.find('.suggestion-list')[0];
                };
                $scope.modal = $scope.isModal || false;

                $scope.getTop = function() {
                    return getDimensions().top;
                };
                $scope.getThisElementHeight = function() {
                    return getActualElement().getBoundingClientRect().height;
                };
                $scope.isKotterTechMember = function(member) {
                    var contact = contactService.getContactbyMMId(member.id);
                    if (contact) {
                        return contactService.isKotterTechUser(contact);
                    }
                };

                $scope.calculateStyle = function() {
                    var dimensions = getDimensions();
                    if (!$scope.modal) {
                        $scope.top = dimensions.top - $scope.getThisElementHeight();
                        $scope.styleObj = {
                            top: $scope.top,
                            width: dimensions.width,
                            left: dimensions.left
                        };
                    } else {
                        $scope.top = $scope.getTop() - ($scope.getThisElementHeight() +
                            2 * (dimensions.height));
                        $scope.styleObj = {
                            top: $scope.top,
                            width: dimensions.width,
                            left: $scope.left
                        };
                    }
                };
                $scope.$watch($scope.getTop, function(newVal, oldVal) {
                    $scope.$evalAsync(function() {
                        $scope.calculateStyle();
                    });
                });
                $scope.$watch($scope.getThisElementHeight, function(newVal, oldVal) {
                    $scope.$evalAsync(function() {
                        $scope.calculateStyle();
                    });
                });
                $scope.calculateStyle();
            }
        };
    })
    .directive('chatChannelsSuggestionList', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/chat-channels-suggestion-list.html',
            scope: {
                parentData: '<',
                inputElement: '<',
                isModal: '='
            },
            link: function($scope, element, attrs) {
                var getDimensions = function() {
                    return $scope.inputElement.getBoundingClientRect();
                };
                $scope.modal = $scope.isModal || false;

                $scope.getTop = function() {
                    return getDimensions().top;
                };
                $scope.calculateStyle = function() {
                    var dimensions = getDimensions();
                    if (!$scope.modal) {
                        $scope.top = dimensions.top - dimensions.height - 138;
                        $scope.styleObj = {
                            top: $scope.top,
                            width: dimensions.width,
                            left: dimensions.left
                        };
                    } else {
                        $scope.top = $scope.getTop() - dimensions.height - 138;
                        $scope.styleObj = {
                            top: $scope.top,
                            width: dimensions.width,
                            left: $scope.left
                        };
                    }
                };
                $scope.$watch($scope.getTop, function(newVal, oldVal) {
                    $scope.$evalAsync(function() {
                        $scope.calculateStyle();
                    });
                });
                $scope.calculateStyle();
            }
        };
    })
    .directive('chatMacroSuggestionList', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/chat-macro-suggestion-list.html',
            scope: {
                parentData: '<',
                inputElement: '<',
                isModal: '=',
                isSms: '<'
            },
            link: function($scope, element, attrs) {
                $scope.sugListEl = element.find(".suggestion-list")[0];
                var getDimensions = function() {
                    return $scope.inputElement.getBoundingClientRect();
                };
                $scope.modal = $scope.isModal || false;

                function getSugListHeight() {
                    return $scope.sugListEl.getBoundingClientRect().height;
                };
                $scope.getTop = function() {
                    return getDimensions().top - getSugListHeight();
                };
                $scope.calculateStyle = function() {
                    var dimensions = getDimensions();
                    if (!$scope.modal) {
                        if ($scope.isSms) {
                            $scope.top = 0 - getSugListHeight();
                            $scope.styleObj = {
                                top: $scope.top,
                                width: dimensions.width
                            };
                        } else {
                            $scope.top = dimensions.top - dimensions.height - 70;
                            $scope.styleObj = {
                                top: $scope.top,
                                width: dimensions.width,
                                left: dimensions.left
                            };
                        }
                    } else {
                        $scope.top = $scope.getTop() - dimensions.height - 155;
                        $scope.styleObj = {
                            top: $scope.top,
                            width: dimensions.width,
                            left: $scope.left
                        };
                    }
                };
                $scope.$watch($scope.getTop, function(newVal, oldVal) {
                    $scope.$evalAsync(function() {
                        $scope.calculateStyle();
                    });
                });
                $scope.calculateStyle();
            }
        };
    })
    .directive('threadedMessageDisplay', function($rootScope, $cookies, $timeout, FileUploader,
        newChatService, __env, symphonyConfig, usefulTools, chatMacroService) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/threaded-message-display.html',
            scope: {
                rootPost: '<',
                closeDisplay: '&',
                sendPost: '&',
                classObj: '=',
                getKeyPressFns: '&',
                selectCurrentSelection: '&',
                selectMacroSelection: '&'
            },
            link: function($scope, element, attrs) {
                $scope.keyPressFns = $scope.getKeyPressFns()($scope);
                newChatService.registerChatEventCallback('teamMembersLoaded', function() {
                    $scope.peopleListData = {
                        people: usefulTools.convertObjectToArray(newChatService
                            .teamMembers),
                        selectedIndex: 0,
                        element: null,
                        scope: $scope,
                        select: function(index) {
                            var scope = this.scope;
                            var element = this.element;
                            $scope.selectCurrentSelection()(scope, element,
                                index);
                        }
                    };
                });

                function getChannelsForList() {
                    var publicChannels = {};
                    var privateChannels = {};
                    angular.copy(newChatService.publicChannels, publicChannels);
                    angular.copy(newChatService.privateChannels, privateChannels);
                    var channels = _.merge(publicChannels, privateChannels);
                    return usefulTools.convertObjectToArray(channels);
                };

                newChatService.registerChatEventCallback('chatInitialized', function() {
                    var channels = getChannelsForList();
                    $scope.channelListData = {
                        channels: usefulTools.convertObjectToArray(channels),
                        selectedIndex: 0,
                        element: null,
                        scope: $scope,
                        select: function(index) {
                            var scope = this.scope;
                            var element = this.element;
                            $scope.selectCurrentSelection()(scope, element,
                                index);
                        }
                    };
                });

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
                                $scope.selectMacroSelection()(scope,
                                    element, {
                                        index: index,
                                        suggestion: suggestion
                                    });
                            }
                        };
                    }
                });

                $scope.$watch('rootPost', function(newVal, oldVal) {
                    if (newVal) {
                        $scope.init();
                    }
                });

                $scope.getOrderPost = function(order) {
                    return $scope.channel().postInfo.posts[order];
                };

                $scope.showUploadingFiles = false;
                $scope.$watch('showUploadingFiles', function(newVal, oldVal) {
                    if (newVal === true || newVal === false) {
                        $scope.classObj['with-file-upload'] = $scope.showUploadingFiles;
                    }
                });

                $scope.init = function() {
                    $scope.showUploadingFiles = false;
                    $scope.inputElement = element.find('textarea')[0];
                    $scope.sendPostOpts = {
                        root_id: $scope.rootPost.id,
                        uploader: $scope.uploader
                    };
                };

                $scope.jumpToPost = function(post) {
                    var searchString = 'chat-post[data-threaded-post-id="' + post.id +
                        '"]';
                    var postElement = angular.element(searchString)[0];
                    if (postElement && postElement.scrollIntoView) {
                        postElement.scrollIntoView();
                    }
                };

                $scope.$watch('rootPost.postInfo.order.length', function(newVal, oldVal) {
                    var delay = 0;
                    if (newVal && (!oldVal && oldVal !== 0)) {
                        delay = 100;
                    };
                    $timeout(function() {
                        if ($scope.rootPost && $scope.rootPost.postInfo) {
                            var post;
                            var order = $scope.rootPost.postInfo.order;
                            var postId = order[order.length - 1];
                            post = $scope.rootPost.postInfo.posts[postId];
                            if (post) {
                                $scope.jumpToPost(post);
                            }
                        }
                    }, delay);
                });

                $scope.channel = function() {
                    if ($scope.rootPost) {
                        return newChatService.findChannelById($scope.rootPost.channel_id);
                    }
                    return null;
                };

                var mmBaseUrl = (__env.mmUrl && __env.mmUrl != '' ? __env.mmUrl :
                    symphonyConfig.chatUrl);
                var uploader = $scope.uploader = new FileUploader({
                    url: mmBaseUrl + '/files',
                    alias: 'files',
                    removeAfterUpload: true,
                    headers: {
                        'Authorization': 'Bearer ' + $cookies.get('accessToken')
                    },
                    transformRequest: angular.identity
                });
                $scope.$watch('uploader.queue.length', function(newValue, oldValue) {
                    if (newValue > 0) {
                        $scope.showUploadingFiles = true;
                        // $scope.scrollToBottom();
                    }
                    if (newValue === 0) {
                        $scope.showUploadingFiles = false;
                        $scope.enableFileUploader = true;
                    }
                });
                uploader.onBeforeUploadItem = function(item) {
                    var channelId = $scope.channel().id;
                    item.formData.push({
                        channel_id: channelId
                    });
                };
                uploader.onCancelItem = function(fileItem, response, status, headers) {
                    uploader.clearQueue();
                };
                uploader.onCompleteAll = function(fileItem, response) {
                    $scope.sendPost()($scope.inputElement, $scope.channel(), $scope.sendPostOpts);
                };
                $timeout(function() {
                    var els = document.querySelector('.include-emojis');
                    wdtEmojiBundle.init('.include-emojis');
                    $timeout(function() {
                        $rootScope.emojisInitialized = true;
                        $rootScope.$broadcast('emojis-initialized');
                    }, 1000);
                });

            }
        };
    })
    .directive('searchMessageDisplay', function($rootScope, mmApi, $sce, $cookies, chatService,
        $timeout, FileUploader, usefulTools, fileService, $window, newChatService) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/search-message-display.html',
            scope: {
                search: '=',
                sendSearch: '&',
                closeDisplay: '&'
            },
            link: function($scope, element, attrs) {

                $scope.showPostInChannel = function(post) {
                    console.log(post);
                    $scope.search.highlightPost = post.id;
                    newChatService.goToSearchResult(post)
                        .then(function() {
                            $timeout(function() {
                                usefulTools.goToId('post-' + post.id);
                            }, 1000, false);
                            // $scope.search.jumpToPost(post);
                        });
                };
            }
        };
    })
    .directive('postActions', function($rootScope, $uibModalStack, $mdDialog, contactService,
        emailService, callService, videoConfService, newChatService) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/post-action.html',
            scope: {
                post: '<',
                chatUser: '<',
                openThread: '&',
                isThreaded: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.userProfile = newChatService.userProfile;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.isCurrentUsersPost = function() {
                    return newChatService.userOwnsPost($scope.post);
                };

                $scope.showActionsStyle = {
                    width: $scope.isThreaded ? '35px' : '70px'
                };
                $scope.isThreadPost = function(post) {
                    return newChatService.isThreadPost(post);
                };
                $scope.getContact = function() {
                    if (!$scope.contact) {
                        $scope.contact = $scope.getContactByPost($scope.post);
                    }
                    return $scope.contact;
                };
                $scope.getContactByPost = function(post) {
                    return contactService.getContactbyMMId($scope.post.user_id);
                };
                $scope.startEmailClient = function() {
                    var contact = $scope.getContact();
                    if (contact && contact.contact_email_address) {
                        emailService.startEmailClient(contact.contact_email_address);
                    }
                };

                $scope.showInviteOpt = $scope.getContact().type === 'user' &&
                    !$scope.isCurrentUsersPost();

                $scope.makeCall = function(number) {
                    callService.makeCall(number);
                };

                $scope.startSmsModal = function(contact) {
                    var data = {
                        smsnumber: contact,
                        message: ''
                    };

                    if (contact) {
                        $rootScope.showModalWithData('/sms/sendsmstop.html', data);
                    }
                };

                $scope.sendVideoInvite = function() {
                    var contact = $scope.getContact();
                    if (contact) {
                        videoConfService.sendVideoInvite(contact);
                    }
                };
                $scope.editMessage = function(post) {
                    var data = {
                        message: post.message,
                        post: post,
                        doEditPost: doEditPost,
                        closeModal: closeModal
                    };
                    $rootScope.showModalWithData('/chat/editpost.html', data);
                };

                function closeModal() {
                    $uibModalStack.dismissAll();
                };

                function doEditPost(post, message) {
                    $uibModalStack.dismissAll();
                    newChatService.editPost(post, message)
                        .then(function(response) {
                            if (!response) {
                                $rootScope.showErrorAlert(
                                    'There was an error updating the channel.');
                            }
                        });
                }

                $scope.deletePost = function(post) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Please confirm you want to delete this post')
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        $uibModalStack.dismissAll();
                        newChatService.deletePost(post)
                            .then(function(response) {
                                if (!response) $rootScope.showErrorAlert(
                                    'There was a problem deleting the post.'
                                );
                            });
                    });
                }

                var dropup = element.find('.dropup');
                dropup.on('show.bs.dropdown', function() {
                    angular.element('body').append(dropup.css({
                        position: 'absolute',
                        left: dropup.offset().left,
                        top: dropup.offset().top
                    }).detach());
                });

                dropup.on('hidden.bs.dropdown', function() {
                    element.append(dropup.css({
                        position: false,
                        left: false,
                        top: false
                    }).detach());
                });
            }
        };
    })
    .directive('manageChannel', function($rootScope, newChatService, $mdDialog, $uibModalStack,
        usefulTools) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/manage-channel.html',
            scope: {
                channel: '<'
            },
            link: function($scope, element, attrs) {
                $scope.chatData = newChatService.publicData;
                $scope.messages = [];
                $scope.editChannel = function() {
                    var data = {
                        memberId: newChatService.userProfile.id,
                        channel: newChatService.publicData.currentChannel,
                        teamMembers: usefulTools.convertObjectToArray(
                            newChatService.teamMembers),
                        doEditChannel: doEditChannel,
                        isMemberOf: isMemberOf,
                        closeModal: closeModal
                    };
                    if (data.channel.type === 'P') {
                        data.channel.channelmember = {};
                        angular.forEach(data.teamMembers, function(member) {
                            data.channel.channelmember[member.id] = isMemberOf(
                                member.id);
                        });
                    }
                    console.log(data);
                    $rootScope.showModalWithData('/chat/editchannel.html', data);
                };

                $scope.addMembers = function() {
                    var data = {
                        channel: newChatService.publicData.currentChannel,
                        teamMembers: usefulTools.convertObjectToArray(
                            newChatService.teamMembers),
                        doAddMember: doAddMember,
                        isMemberOf: isMemberOf,
                        closeModal: closeModal
                    };
                    $rootScope.showModalWithData('/chat/addtoprivatechannel.html', data);
                };

                $scope.hideDirectMessage = function(channel) {
                    closeModal();
                    newChatService.hideDirectMessage(channel.id);
                };

                $scope.leaveChannel = function() {
                    var data = {
                        channel: newChatService.publicData.currentChannel,
                        unsubscribeChannel: unsubscribeChannel,
                        hideDirectMessage: $scope.hideDirectMessage,
                        closeModal: closeModal
                    };
                    $rootScope.showModalWithData('/chat/unsubscribechannel.html', data);
                };

                $scope.manageMembers = function() {
                    newChatService.processMemberData(newChatService.publicData.currentChannel)
                        .then(function(response) {
                            console.log(response);
                            var data = {
                                user: newChatService.userProfile,
                                channel: newChatService.publicData.currentChannel,
                                teamMembers: usefulTools.convertObjectToArray(
                                    newChatService.teamMembers),
                                messages: getMessages(),
                                doAddMember: doAddMember,
                                doRemoveMember: doRemoveMember,
                                closeMessages: closeMessages,
                                doChangeRole: doChangeRole,
                                isAdminOf: isAdminOf,
                                isMemberOf: isMemberOf,
                                closeModal: closeModal
                            };
                            $rootScope.showModalWithData(
                                '/chat/managechannelmembers.html', data);
                        });
                };



                function closeModal() {
                    $uibModalStack.dismissAll();
                    $scope.messages = [];
                };

                function closeMessages(index) {
                    $scope.messages.splice(index, 1);
                }

                function isAdminOf(memberId) {
                    return newChatService.isChannelAdmin(newChatService.publicData.currentChannel
                        .id, memberId);
                }

                function isMemberOf(memberId) {
                    return newChatService.isChannelMember(newChatService.publicData.currentChannel,
                        memberId);
                }

                function getMessages() {
                    return $scope.messages;
                }

                function doAddMember(channelId, member) {
                    console.log(member);
                    newChatService.addChannelMember(channelId, member.id)
                        .then(function(response) {
                            if (response)
                                $scope.messages.push({
                                    type: 'success',
                                    note: member.first_name + ' ' + member.last_name +
                                        ' has been added.'
                                });
                            else
                                $scope.messages.push({
                                    type: 'danger',
                                    note: 'There was a problem adding ' + member.first_name +
                                        ' ' + member.last_name + '.'
                                });
                        });
                }

                function doRemoveMember(channelId, member) {
                    newChatService.removeChannelMember(channelId, member.id)
                        .then(function(response) {
                            if (response)
                                $scope.messages.push({
                                    type: 'success',
                                    note: member.first_name + ' ' + member.last_name +
                                        ' has been removed.'
                                });
                            else
                                $scope.messages.push({
                                    type: 'danger',
                                    note: 'There was a problem removing ' + member.first_name +
                                        ' ' + member.last_name + '.'
                                });
                        });
                }

                function doChangeRole(memberId, channelId, role) {
                    newChatService.changeMemberRole(memberId, channelId, role);
                }

                function doEditChannel(channel) {
                    newChatService.editChannel(channel)
                        .then(function(response) {
                            if (response)
                                $rootScope.showSuccessAlert(
                                    'Channel was updated successfully.');
                            else
                                $rootScope.showErrorAlert(
                                    'There was an error updating the channel.');
                            $uibModalStack.dismissAll();
                        });
                }
                $scope.deleteChannel = function(channel) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Delete ' + channel.display_name + '?')
                        .textContent(
                            'Are you sure you want to delete this Channel? All Posts will be lost!'
                        )
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        newChatService.deleteChannel(channel)
                            .then(function(response) {
                                if (response)
                                    $rootScope.showSuccessAlert(
                                        'Channel was Deleted successfully.'
                                    );
                                else
                                    $rootScope.showErrorAlert(
                                        'There was a problem deleting the channel.'
                                    );
                                $uibModalStack.dismissAll();
                            });
                    });
                };

                function unsubscribeChannel(channel) {
                    newChatService.leaveChannel(channel)
                        .then(function(response) {
                            $uibModalStack.dismissAll();
                        });
                }
            }
        };
    })
    .directive('chatSearchResult', function(newChatService, contactService) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/chat-search-result.html',
            scope: {
                results: '<',
                postId: '<',
                showPostInChannel: '&'
            },
            link: function($scope, element, attrs) {
                $scope.post = $scope.results.posts[$scope.postId];
                $scope.contact = contactService.getContactbyMMId($scope.post.user_id);
                $scope.user = newChatService.teamMembers[$scope.post.user_id];
                $scope.showChannelName = function(post) {
                    var channel = newChatService.findChannelById(post.channel_id);
                    var display = '';
                    if (channel) {
                        display = channel.display_name;
                        if (channel && channel.type === 'D') {
                            //var members = $filter('splittoarray')(channel.name, '__');
                            var members = channel.name.split('__');
                            angular.forEach(members, function(member) {
                                if (newChatService.teamMembers[member]) {
                                    if (member !== newChatService.userProfile.id) {
                                        display = 'Direct Message: ' +
                                            newChatService.teamMembers[member].first_name +
                                            ' ' + newChatService.teamMembers[
                                                member].last_name;
                                    }
                                }
                            });
                        }
                    }
                    return display;
                };

            }
        };
    })
    .directive('chatPost', function($uibModalStack, usefulTools, newChatService, contactService,
        emailService, callService, $rootScope, videoConfService, $filter, marked, $location) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat-post.html',
            scope: {
                post: '<',
                channel: '<',
                isSearch: '<',
                highlightPost: '<',
                openThread: '&',
                isThreaded: '<',
                isThreadedRootPost: '<',
                scrollToBottom: '&'
            },
            link: function($scope, element, attrs) {
                $scope.isKotterTechUser = $rootScope.isKotterTechUser;
                $scope.member = newChatService.userProfile;
                if (!$scope.post) {
                    // debugger;
                };
                $scope.isFirstDayPost = !$scope.isSearch ? newChatService.isFirstDayPost(
                    $scope.post) : false;
                $scope.chatData = newChatService.publicData;
                $scope.contact = function() {
                    return contactService.getContactbyMMId($scope.post.user_id);
                };
                $scope.user = function() {
                    return newChatService.teamMembers[$scope.post.user_id];
                };
                $scope.isCurrentUsersPost = function() {
                    return newChatService.userOwnsPost($scope.post);
                };
                $scope.getMarkedInput = function() {
                    var val = $filter('callouts')(
                        $filter('nl2br')(
                            $filter('linky')(
                                $scope.isEdited($scope.post), '_blank')));
                    return marked(val);
                };

                $scope.isFirstThreadPost = function() {
                    if ($scope.isSearch) return false;
                    if ($scope.isThreaded) {
                        return false;
                    };
                    var post = $scope.post;
                    var previousPost = newChatService.getPreviousPost(post);
                    if (previousPost) {
                        $scope.prevId = previousPost.id;
                    }
                    if (previousPost && $scope.isThreadPost(post)) {
                        if (!$scope.isThreadPost(previousPost)) {
                            return true;
                        } else if (previousPost.user_id !== post.user_id) {
                            return true;
                        } else if ($scope.isThreadPost(previousPost) && previousPost.root_id !==
                            post.root_id) {
                            return true;
                        }
                    }
                    return false;
                };
                $scope.setChannel = function(channelId) {
                    var channel = newChatService.findChannelById(channelId);
                    newChatService.setCurrentChannel(channel);
                };

                $scope.showMemberPhoto = function() {
                    return newChatService.showMemberPhoto($scope.contact, '-xl');
                };

                $scope.showMember = function(event, userId) {
                    var user = newChatService.teamMembers[userId];
                    var contact = contactService.getContactbyMMId(userId);
                    var data = {
                        contact: contact,
                        user: user,
                        makeCall: $scope.makeCall,
                        startSmsModal: $scope.startSmsModal,
                        createDirectChannel: createDirectMessage,
                        sendVideoInvite: $scope.sendVideoInvite,
                        startEmailClient: $scope.startEmailClient
                    };
                    $rootScope.showModalFull('/chat/viewmember.html', data, 'sm');
                };

                $scope.sendEmail = function(contact) {
                    console.log(contact);
                    if (contact && contact.contact_email_address) {
                        emailService.startEmailClient(contact.contact_email_address);
                    }
                };

                $scope.isConsecutive = function() {
                    if ($scope.isThreadedRootPost) {
                        return false;
                    } else if ($scope.isFirstThreadPost()) {
                        return false;
                    } else if ($scope.isThreaded) {
                        return $scope.post.isThreadedConsecutive;
                    } else {
                        return $scope.post.isConsecutive;
                    }
                };
                $scope.getContact = function() {
                    if (!$scope.contact) {
                        $scope.contact = $scope.getContactByPost($scope.post);
                    }
                    return $scope.contact;
                };
                $scope.getContactByPost = function(post) {
                    return contactService.getContactbyMMId($scope.post.user_id);
                };
                $scope.startEmailClient = function() {
                    var contact = $scope.getContact();
                    if (contact && contact.contact_email_address) {
                        emailService.startEmailClient(contact.contact_email_address);
                    }
                };

                $scope.isEdited = function(post) {
                    if (post.edit_at) return post.message + ' (edited)';
                    return post.message;
                };

                $scope.getCommentedMessage = function(rootPost) {
                    var rootPostUser = $scope.rootPostUser();
                    return "Commented on " + rootPostUser.first_name + " " +
                        rootPostUser.last_name + "'s" + " message: " + $scope.isEdited(
                            rootPost);
                };

                $scope.makeCall = function(number) {
                    callService.makeCall(number);
                };

                $scope.startSmsModal = function(contact) {
                    var data = {
                        smsnumber: contact.smsnumber,
                        message: ''
                    };
                    if (contact) {
                        $rootScope.showModalWithData('/sms/sendsmstop.html', data);
                    }
                };

                $scope.sendVideoInvite = function() {
                    var contact = $scope.getContact();
                    if (contact) {
                        videoConfService.sendVideoInvite(contact);
                    }
                };

                $scope.isGiphyLink = newChatService.isGiphyLink;
                $scope.isQuoteLink = newChatService.isQuoteLink;
                $scope.getQuoteLinkText = newChatService.getQuoteLinkText;
                $scope.getQuoteLinkText = function(text) {
                    var metaData = newChatService.getMetaData(text);
                    return metaData.quoteLink.display;
                };

                $scope.openQuoteSheet = function(metaData) {
                    var quoteUuid = metaData.quoteLink.quoteUuid;
                    $location.search('quoteUuid', quoteUuid);
                    $location.path('/quotesheets');
                };

                $scope.showFilesDisplayForPost = function(post) {
                    return newChatService.showFilesDisplayForPost(post);
                };

                $scope.isThreadPost = function(post) {
                    return newChatService.isThreadPost(post);
                };

                if ($scope.isThreadPost($scope.post)) {
                    function getRootPost() {
                        var posts = newChatService.publicData.currentChannel.postInfo.posts;
                        return posts[$scope.post.root_id];
                    };
                    $scope.rootPost = getRootPost();
                    $scope.rootPostUser = function() {
                        var rootPost = $scope.rootPost;
                        if (!rootPost) {
                            return null;
                        } else {
                            return newChatService.teamMembers[rootPost.user_id];
                        }
                    };
                }

                function isKotterTechByMember(member) {
                    var contact = contactService.getContactbyMMId(member.id);
                    if (contact) return $scope.isKotterTechUser(contact);
                    return false;
                };

                $scope.addDirectMessage = function() {
                    var data = {
                        chatUserProfile: $scope.member,
                        teamMembers: usefulTools.convertObjectToArray(
                            newChatService.teamMembers),
                        createDirectMessage: createDirectMessage,
                        isKotterTechByMember: isKotterTechByMember,
                        dmExists: dmExists,
                        closeModal: closeModal
                    };
                    $rootScope.showModalWithData(
                        '/chat/createdirectmessagechannel.html', data);
                };

                function closeModal() {
                    $uibModalStack.dismissAll();
                };

                function createDirectMessage(member) {
                    var channel = newChatService.getDMChannelByUserId(member.id);
                    if (channel) {
                        newChatService.activateDirectChannel(channel, member.id);
                        $rootScope.showSuccessAlert(
                            'Your direct message channel has been created.');
                        $uibModalStack.dismissAll();
                    } else {
                        newChatService.createDirectChannel(member)
                            .then(function(response) {
                                console.log(response);
                                if (response) {
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
                }

                function dmExists(user) {
                    var found = false;
                    newChatService.userProfile.preferences.forEach(function(pref) {
                        if (pref.category === 'direct_channel_show' && pref.value ===
                            'true' && user.id === pref.name) found = true;
                    });
                    return !found;
                };

            }
        };
    })
    .directive('chatChannelsList', function($rootScope, contactService, $uibModalStack, usefulTools,
        $cookies, newChatService) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat-channels-list.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.isKotterTechUser = $rootScope.isKotterTechUser;
                $scope.init = function() {
                    $scope.chatUserProfile = newChatService.userProfile;
                    $scope.showModal = $rootScope.showModal;
                };
                newChatService.registerChatEventCallback('chatInitialized', $scope.init);
                $scope.favoritesExist = function() {
                    return newChatService.favorites.length > 0;
                };
                $scope.toggleFavorites = function() {
                    $scope.toggleChannelListStatus('Favorites');
                };
                $scope.toggleTopicChannels = function() {
                    $scope.toggleChannelListStatus('TopicChannels');
                };
                $scope.toggleDMChannels = function() {
                    $scope.toggleChannelListStatus('DMChannels');
                };
                $scope.toggleChannelListStatus = function(listName) {
                    listName = 'show' + listName;
                    $scope[listName] = !$scope[listName];
                    if ($scope[listName]) {
                        $cookies.put(listName, 'true');
                    } else {
                        $cookies.remove(listName);
                    }
                };
                $scope.isFavoriteChannel = function(channel, isPreference) {
                    if (isPreference) {
                        channel = $scope.prefToChannel(channel);
                    };
                    return newChatService.isFavoriteChannel(channel);
                };
                $scope.toggleFavoriteChannel = function(channel, isPreference) {
                    if (isPreference) {
                        channel = $scope.prefToChannel(channel);
                    }
                    if ($scope.isFavoriteChannel(channel)) {
                        newChatService.removeChannelFromFavorites(channel);
                    } else {
                        newChatService.addChannelToFavorites(channel);
                    }
                };
                $scope.initChannelListStatus = function(listName) {
                    listName = 'show' + listName;
                    var lsValue = $cookies.get(listName);
                    if (lsValue === 'true') {
                        $scope[listName] = true;
                    } else {
                        $scope[listName] = false;
                    }
                };
                $scope.initChannelListStatus('Favorites');
                $scope.initChannelListStatus('TopicChannels');
                $scope.initChannelListStatus('DMChannels');
                $scope.setChannel = function(channel) {
                    newChatService.setCurrentChannel(channel);
                    // $rootScope.setChannel(channelId);
                };

                $scope.isKotterTechUser = function(contact) {
                    return contactService.isKotterTechUser(contact);
                };

                function isKotterTechByMember(member) {
                    var contact = contactService.getContactbyMMId(member.id);
                    if (contact) return $scope.isKotterTechUser(contact);
                    return false;
                };

                $scope.addChannel = function() {
                    var data = {
                        chatUserProfile: $scope.chatUserProfile,
                        teamMembers: usefulTools.convertObjectToArray(
                            newChatService.teamMembers),
                        createChannel: createChannel,
                        isKotterTechByMember: isKotterTechByMember,
                        closeModal: closeModal
                    };
                    $rootScope.showModalWithData('/chat/addchannel.html', data);
                };

                $scope.addDirectMessage = function() {
                    var data = {
                        chatUserProfile: $scope.chatUserProfile,
                        teamMembers: usefulTools.convertObjectToArray(
                            newChatService.teamMembers),
                        createDirectMessage: createDirectMessage,
                        isKotterTechByMember: isKotterTechByMember,
                        dmExists: dmExists,
                        closeModal: closeModal
                    };
                    $rootScope.showModalWithData(
                        '/chat/createdirectmessagechannel.html', data);
                };

                $scope.editChatUserSettings = function() {
                    var data = {
                        chatUserProfile: $scope.chatUserProfile,
                        teamMembers: usefulTools.convertObjectToArray(
                            newChatService.teamMembers),
                        createDirectMessage: createDirectMessage,
                        isKotterTechByMember: isKotterTechByMember,
                        dmExists: dmExists,
                        closeModal: closeModal
                    };
                    $rootScope.showModalWithData(
                        '/chat/createdirectmessagechannel.html', data);
                };

                function closeModal() {
                    $uibModalStack.dismissAll();
                };

                function createChannel(channel) {
                    console.log(channel);
                    newChatService.createChannel(channel)
                        .then(function(response) {
                            console.log(response);
                            if (response) {
                                $rootScope.$broadcast('websocket.restart.needed');
                                // chatMessages.closeSocket();
                                // $rootScope.chatMessages = chatMessages;
                                $uibModalStack.dismissAll();
                            }
                        });
                }

                function createDirectMessage(member) {
                    console.log(member);
                    var channel = newChatService.getDMChannelByUserId(member.id);
                    if (channel) {
                        newChatService.activateDirectChannel(channel, member.id);
                        $rootScope.showSuccessAlert(
                            'Your direct message channel has been created.');
                        $uibModalStack.dismissAll();
                    } else {
                        newChatService.createDirectChannel(member)
                            .then(function(response) {
                                console.log(response);
                                if (response) {
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
                }

                function dmExists(user) {
                    var found = false;
                    newChatService.userProfile.preferences.forEach(function(pref) {
                        if (pref.category === 'direct_channel_show' && pref.value ===
                            'true' && user.id === pref.name) found = true;
                    });
                    return !found;
                };
            }
        };
    })
    .directive('dmChannelsList', function(usefulTools, contactService, newChatService) {
        function initializeParentScopeFunction($scope, functionName) {
            $scope[functionName] = $scope[functionName]();
        };
        return {
            restrict: 'E',
            templateUrl: 'views/dm-channels-list.html',
            scope: {
                toggleFavoriteChannel: '&',
                isFavoriteChannel: '&',
                favoritesOnly: '<',
            },
            link: function($scope, element, attrs) {
                $scope.init = function() {
                    var parentFunction;
                    var parentFunctions = ['toggleFavoriteChannel', 'isFavoriteChannel'];
                    for (var i = 0; i < parentFunctions.length; i++) {
                        parentFunction = parentFunctions[i];
                        initializeParentScopeFunction($scope, parentFunction);
                    }
                };
                $scope.init();
                $scope.teamMembers = newChatService.teamMembers;
                $scope.channels = function() {
                    // return newChatService.directChannels;
                    // console.log(newChatService.directChannels);
                    return usefulTools.convertObjectToArray(newChatService.directChannels);
                };

                $scope.setChannel = function(channel) {
                    newChatService.setCurrentChannel(channel);
                };

                $scope.$on('company.setup.user.updated', function($event, data) {
                    newChatService.getUserChannels();
                });

                $scope.showPartnerName = function(id) {
                    var contact = contactService.getContactbyMMId(id);
                    if (contact) return contact.name;
                    return null;
                };

                $scope.hideDirectMessage = function(channel) {
                    newChatService.hideDirectMessage(channel.id);
                };

                $scope.showChatStatus = function(user) {
                    var status = 'Offline';
                    if (user) {
                        var contact = contactService.getContactbyMMId(user.id);
                        if (contact) status = contact.status;
                    }
                    return usefulTools.funcPutIcon(status, '');
                };
            }
        };
    })
    .directive('topicChannelsList', function($rootScope, contactService, $uibModalStack,
        newChatService, usefulTools) {
        function initializeParentScopeFunction($scope, functionName) {
            $scope[functionName] = $scope[functionName]();
        };
        return {
            restrict: 'E',
            templateUrl: 'views/topic-channels-list.html',
            scope: {
                toggleFavoriteChannel: '&',
                isFavoriteChannel: '&',
                favoritesOnly: '<'
            },
            link: function($scope, element, attrs) {
                $scope.isKotterTechUser = $rootScope.isKotterTechUser;
                $scope.init = function() {
                    var parentFunction;
                    var parentFunctions = ['toggleFavoriteChannel', 'isFavoriteChannel'];
                    for (var i = 0; i < parentFunctions.length; i++) {
                        parentFunction = parentFunctions[i];
                        initializeParentScopeFunction($scope, parentFunction);
                    }
                };
                $scope.init();
                $scope.setChannel = function(channel) {
                    newChatService.setCurrentChannel(channel);
                    // $rootScope.setChannel(channelId);
                };
                $scope.channels = function() {
                    // console.log(newChatService.publicChannels);
                    // console.log(newChatService.privateChannels);
                    var publicChannels = usefulTools.convertObjectToArray(
                        newChatService.publicChannels);
                    var privateChannels = usefulTools.convertObjectToArray(
                        newChatService.privateChannels);
                    return publicChannels.concat(privateChannels);
                };

                $scope.manageSubscriptions = function() {

                    newChatService.getAvailableChannels()
                        .then(function(response) {
                            var data = {
                                channels: usefulTools.convertObjectToArray(
                                    response),
                                leaveChannel: leaveChannel,
                                joinChannel: joinChannel,
                                isChannelAdmin: isChannelAdmin,
                                isSubscribed: isSubscribed,
                                addChannel: addChannel,
                                closeModal: closeModal
                            };
                            console.log(data.channels);
                            $rootScope.showModalWithData(
                                '/chat/managesubscriptions.html', data);
                        });

                };

                function isKotterTechByMember(member) {
                    var contact = contactService.getContactbyMMId(member.id);
                    if (contact) return $scope.isKotterTechUser(contact);
                    return false;
                };

                function addChannel() {
                    closeModal();
                    var data = {
                        teamMembers: usefulTools.convertObjectToArray(newChatService.teamMembers),
                        createChannel: createChannel,
                        isKotterTechByMember: isKotterTechByMember,
                        closeModal: closeModal
                    };
                    $rootScope.showModalWithData('/chat/addchannel.html', data);
                };

                function createChannel(channel) {
                    newChatService.createChannel(channel)
                        .then(function(response) {
                            if (response) {
                                $rootScope.$broadcast('websocket.restart.needed');
                                // chatMessages.closeSocket();
                                // $rootScope.chatMessages = chatMessages;
                                $uibModalStack.dismissAll();
                            }
                        });
                }

                function leaveChannel(channel) {
                    newChatService.leaveChannel(channel);
                }

                function joinChannel(channel) {
                    newChatService.joinChannel(channel.id, newChatService.userProfile.id)
                        .then(function(response) {
                            $uibModalStack.dismissAll();
                        });
                }

                function isChannelAdmin(channel) {
                    return newChatService.isChannelAdmin(channel.id, newChatService.userProfile
                        .id);
                }

                function isSubscribed(channel) {
                    if (newChatService.publicChannels[channel.id]) return true;
                    return false;
                }

                function closeModal() {
                    $uibModalStack.dismissAll();
                };


            }
        };
    })
    .directive('favoriteChannelsList', function(newChatService) {
        function initializeParentScopeFunction($scope, functionName) {
            $scope[functionName] = $scope[functionName]();
        };
        return {
            restrict: 'E',
            templateUrl: 'views/favorite-channels-list.html',
            scope: {
                toggleFavoriteChannel: '&',
                isFavoriteChannel: '&',
                getAllPreferences: '&'
            },
            link: function($scope, element, attrs) {
                $scope.init = function() {
                    var parentFunction;
                    var parentFunctions = ['toggleFavoriteChannel', 'isFavoriteChannel',
                        'getAllPreferences'
                    ];
                    for (var i = 0; i < parentFunctions.length; i++) {
                        parentFunction = parentFunctions[i];
                        initializeParentScopeFunction($scope, parentFunction);
                    }
                };
                $scope.init();
                $scope.favoritePreferences = function() {
                    return $scope.getAllPreferences().filter(function(preference) {
                        return $scope.isFavoriteChannel(preference, true);
                    });
                };
                $scope.favoriteTopicChannels = function() {
                    return newChatService.publicChannels;
                };
                $scope.favoriteDirectChannels = function() {
                    return newChatService.directChannels;
                };
            }
        };
    })
    .directive('compileTemplate', function($compile, $parse) {
        return {
            link: function(scope, element, attr) {
                var parsed = $parse(attr.ngBindHtml);

                function getStringValue() {
                    return (parsed(scope) || '').toString();
                }

                //Recompile if the template changes
                scope.$watch(getStringValue, function() {
                    $compile(element, null, -9999)(scope); //The -9999 makes it skip directives so that we do not recompile ourselves
                });
            }
        };
    })
    .directive('dynamicElement', ['$compile', function($compile) {
        return {
            restrict: 'E',
            scope: {
                message: "="
            },
            replace: true,
            link: function(scope, element, attrs) {
                var template = $compile(scope.message)(scope);
                element.replaceWith(template);
            }
        };
    }])
    .directive('fileModel', ['$parse', function($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var model = $parse(attrs.fileModel);
                var modelSetter = model.assign;
                var onFileChange;
                if (attrs.onFileChange) {
                    onFileChange = function(newFileModel) {
                        var expression = $parse(attrs.onFileChange);
                        expression(scope, {
                            newFileModel: newFileModel
                        });
                    };
                };
                element.bind('change', function() {
                    scope.$apply(function() {
                        var file = element[0].files[0];
                        modelSetter(scope, file);
                        if (onFileChange) {
                            onFileChange(file);
                        }
                    });
                });
            }
        };
    }])
    .service('fileUpload', ['$http', function($http) {
        this.uploadFileToUrl = function(file, uploadUrl, name) {
            var fd = new FormData();
            fd.append('file', file);
            fd.append('name', name);
            $http.post(uploadUrl, fd, {
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined,
                        'Process-Data': false
                    }
                })
                .success(function() {
                    if (__env.enableDebug) console.log("Success");
                })
                .error(function() {
                    if (__env.enableDebug) console.log("Success");
                });
        };
    }])
    .directive('file', function() {
        return {
            scope: {
                file: '='
            },
            link: function(scope, el, attrs) {
                el.bind('change', function(event) {
                    var file = event.target.files[0];
                    scope.file = file ? file : undefined;
                    scope.$apply();
                });
            }
        };
    })
    .directive('addPhoneFields', function($rootScope) {
        return {
            restrict: 'E',
            scope: {
                label: '=label',
                number: '=number',
                extension: '=extension',
                typefax: '=typefax',
                typevideo: '=typevideo',
                typevoice: '=typevoice',
                typetext: '=typetext',
                phonedata: '=phonedata'
            },
            templateUrl: 'views/company/addcontactnumber.html'
        };
    })
    .directive('master', function($window) {
        // used for resizing chat window in response to growing chat box
        function link(scope, element, attrs) {
            scope.$watch(function() {
                scope.style = {
                    height: $window.innerHeight - 125 - element[0].offsetHeight +
                        'px'
                    //width:element[0].offsetWidth+'px' //same with width
                };
            });
        }
        return {
            restrict: 'AE', //describes how we can assign an element to our directive in this case like <div master></div
            link: link // the function to link to our element
        };
    })
    .directive('cloudEnter', function() {
        return {
            restrict: 'A',
            scope: true,
            link: function(scope, element, attrs) {
                element.on("keydown", function(e) {
                    if (e.which === 13) {
                        if (__env.enableDebug) console.log("ENTER PRESSED");

                        scope.$apply(function() {
                            var target = e.target;
                            target.blur();
                        });
                        e.preventDefault();
                    }
                });
            }
        };
    })
    .directive('contactSelector', function($timeout, $rootScope, contactService, userService,
        tooltipsService, $filter, __env, usefulTools, dataFactory, contactGroupsService, metaService) {

        return {
            restrict: 'E',
            templateUrl: 'views/contact-selector2.html',
            scope: {
                number: '=',
                type: '=',
                seed: '=',
                placement: '='
            },
            link: function(scope, element, attrs) {
                scope.isKotterTechUser = $rootScope.isKotterTechUser;
                scope.userUuid = $rootScope.user.user_uuid;
                scope.showContactPhoto = $rootScope.showContactPhoto;
                scope.tips = tooltipsService.tips;
                if(!$rootScope.contactsSelected2) $rootScope.contactsSelected2 = [];
                if(!$rootScope.contactsSelected) $rootScope.contactsSelected = [];
                
                if (scope.seed && scope.seed.length > 0) {
                    $rootScope.contactsSelected = _.map(scope.seed, function(uuid){
                        var contact = contactService.getContactByUuid(uuid);
                        if (contact) {
                            var data = {
                                contact_name_full: contact.name,
                                contact_uuid: contact.cuuid,
                                type: contact.type
                            };
                            return data;
                        }
                    }).filter(function(contact){
                        return contact && contact.type !== 'user';
                    });
                    
                    $rootScope.contactsSelected2 = _.map($rootScope.contactsSelected, 'contact_uuid');
                    console.log($rootScope.contactsSelected2);
                }
                if (scope.number) {
                    var data = {
                        contact_mobile_number: scope.number.length == 11 ? scope.number.substr(
                            1) : scope.number,
                        contact_uuid: null,
                        contact_name_full: null
                    };
                    $rootScope.contactsSelected2.push(scope.number);
                    $rootScope.contactsSelected.push(data);
                }
                scope.contactsSelected = $rootScope.contactsSelected;
                // scope.type = scope.$parent.contactSelectionType;
                // console.log("TYPE", scope.type);
                scope.inputTooltip = tooltipsService.tips.sms.recipient_confirmation;
                if (scope.type === 'sms') {
                    scope.inputPlaceholder = 'Type contact name or mobile number';
                } else if (scope.type === 'file' || scope.type === 'cloudlink') {
                    scope.inputPlaceholder = 'Type contact name or email address';
                } else if (scope.type === 'conference' || scope.type === 'contactgroup') {
                    scope.inputPlaceholder = 'Type contact name, ext or number';
                }
                scope.box = {
                    recipients: null,
                    results: [],
                    searching: false,
                    short: false
                };
                scope.selectedIndex = 0;
                
                scope.doIndexSearch = function() {
                    scope.box.searching = true;
                    scope.box.short = false;
                    if (!scope.box.recipients || (scope.box.recipients && scope.box.recipients.length < 3)) {
                        scope.box.searching = false;
                        if (scope.box.recipients && scope.box.recipients.length < 3) scope.box.short = true;
                        return false;
                    }
                    var data = {
                        search: scope.box.recipients,
                        private: contactGroupsService.privateContacts()
                    };
                    dataFactory.postSearchContactIndex(data)
                    .then(function(response){
                        scope.box.searching = false;
                        var results = [];
                        angular.forEach(response.data.success.data, function(uuid){
                            var contact = contactService.getContactByUuid(uuid);
                            if (contact) results.push(contact);
                            
                        })
                        scope.box.results = results;
                    });
                };

                scope.filterResults = function(contact) {
                    if (scope.isKotterTechUser(contact)) return false;
                    if (scope.type !== 'contactgroup' || (scope.type === 'contactgroup' && contact.type !== 'user')) return true;
                    return false;
                };
    
                scope.isKotterTechUser = function(contact) {
                    return contactService.isKotterTechUser(contact);
                };

                scope.filterContacts = function(contactUuid) {
                    if (!usefulTools.isUuid(contactUuid)) return false;
                    var item = contactService.getContactByUuid(contactUuid);
                    if (!item) return false;
                    if (scope.isKotterTechUser(item)) return false;

                    if (scope.type === 'file' || scope.type === 'cloudlink') {
                        if (!scope.box.recipients ||
                            (item.contact_email_address && item.contact_email_address.toLowerCase()
                                .indexOf(scope.box.recipients.toLowerCase()) !== -1)) {
                            return true;
                        }
                    }

                    if (!scope.box.recipients ||
                        (item.name && item.name.toLowerCase()
                            .indexOf(scope.box.recipients.toLowerCase()) !== -1) ||
                        (item.ext && String(item.ext).indexOf(scope.box.recipients) !==
                            -1)) {
                        return true;
                    }
                    if (item.nums && item.nums.length > 0) {
                        var found = false;
                        angular.forEach(item.nums, function(phone) {
                            if (phone.num && phone.num.indexOf(scope.box.recipients) !== -1) {
                                found = true;
                            }
                        });
                        return found;
                    }
                    return false;
                };

                scope.clearRecipients = function() {
                    scope.box.recipients = null;
                    scope.showContactSelection = false;
                };

                scope.clearSearch = function() {
                    scope.box.recipients = null;
                    scope.box.results = [];
                    $timeout(function() {
                        angular.element('#smsInput').focus();
                    }, 600);
                };

                scope.removeSelectedContact = function(index) {
                    if ($rootScope.contactsSelected2.length > 0) $rootScope.contactsSelected2
                        .splice(index, 1);
                    if ($rootScope.contactsSelected.length > 0) $rootScope.contactsSelected
                        .splice(index, 1);
                };

                scope.hasValue = function() {
                    return scope.box.recipients !== null;
                };

                function isRootUser(value) {
                    return value === $rootScope.user.user_ext || value === $rootScope.user.symphony_user_settings
                        .sms_phone_number.substr(1);
                }

                function isDuplicateContact(contact) {
                    return $rootScope.contactsSelected2.indexOf(contact.cuuid) !== -1;
                }

                function isDuplicateNumber(value, contact) {
                    if (value && contact) {
                        if (contact.user_ext && contact.user_ext === value) {
                            if ($rootScope.contactsSelected2.indexOf(contact.did) !== -1)
                                return contact.did;
                        }
                        if (contact.did && contact.did === value) {
                            if ($rootScope.contactsSelected2.indexOf(contact.user_ext) !==
                                -1) return contact.user_ext;
                        }
                    }
                    return null;
                }

                scope.addContact = function(contact, value) {
                    if (isRootUser(value)) {
                        $rootScope.showInfoAlert('You are trying to add yourself.');
                        return;
                    }
                    if (!contact) {
                        if (scope.type === 'contactgroup') {
                            $rootScope.showErrorAlert('You must select one of the contacts from your search.');
                            return;
                        }
                        if (scope.type === 'sms') {
                            scope.box.recipients = usefulTools.cleanPhoneNumber(scope.box
                                .recipients);
                            if (!usefulTools.isPhoneNumber(scope.box.recipients)) {
                                $rootScope.showErrorAlert(
                                    'Target must be a valid phone number.')
                                return;
                            }
                        }
                        if (scope.type === 'conference') {
                            scope.box.recipients = usefulTools.cleanPhoneNumber(scope.box
                                .recipients);
                            if (!usefulTools.isPhoneNumberOrExtension(scope.box.recipients)) {
                                $rootScope.showErrorAlert(
                                    'Target must be a valid phone number or Extension.'
                                )
                                return;
                            }
                        }
                        if (scope.type === 'file' || scope.type === 'cloudlink') {
                            if (!usefulTools.isValidEmail(scope.box.recipients)) {
                                $rootScope.showErrorAlert(
                                    'Target must be a valid email address.')
                                return;
                            }
                        }
                        value = scope.box.recipients;
                    }
                    if (contact) {
                        var dup = isDuplicateNumber(value, contact);
                        if (dup) {
                            $rootScope.showInfoAlert(
                                'This contact is already selected with ' + (dup.length ===
                                    3 ? 'Ext: ' : '') + $filter('tel')(dup) + '.');
                            return;
                        }
                        if (scope.type == 'contactgroup') {
                            dup = isDuplicateContact(contact);
                            if (dup) {
                                $rootScope.showInfoAlert('This contact is already selected.');
                                return;
                            }
                        }

                        if ($rootScope.contactsSelected2.indexOf(value) === -1) {
                            var data = {
                                contact_name_full: contact.name,
                                contact_uuid: contact.cuuid
                            };
                            if (scope.type === 'sms' || scope.type === 'conference') {
                                data.contact_mobile_number = value;
                            } else {
                                data.contact_email_address = value;
                            }
                            $rootScope.contactsSelected2.push(value);
                            $rootScope.contactsSelected.push(data);
                        } else {
                            $rootScope.showInfoAlert(
                                'This entry has already been selected.');
                        }
                        scope.clearRecipients();
                    }
                    if (scope.type === 'file' || scope.type === 'cloudlink') {
                        if (!contact) scope.useEmailAddress(value);
                        userService.addPhoneOrEmailToHistory(value, 'email');
                    } else if (scope.type === 'sms' || scope.type === 'conference') {
                        if (!contact) scope.useSmsNumber(value);
                        userService.addPhoneOrEmailToHistory(value, 'phone');
                    }
                    console.log($rootScope.contactsSelected);
                    scope.clearSearch();
                };

                scope.useSmsNumber = function(number) {
                    if ($rootScope.contactsSelected2.indexOf(number) === -1) {
                        var data = {
                            contact_mobile_number: number.length == 11 ? number.substr(
                                1) : number,
                            contact_uuid: null,
                            contact_name_full: null
                        };
                        $rootScope.contactsSelected2.push(number);
                        $rootScope.contactsSelected.push(data);
                    } else {
                        $rootScope.showInfoAlert(
                            'This entry has already been selected.');
                    }
                    scope.showContactSelection = false;
                    scope.clearRecipients();
                };

                scope.useEmailAddress = function(email) {
                    if ($rootScope.contactsSelected2.indexOf(email) === -1) {
                        var data = {
                            contact_email_address: email,
                            contact_uuid: null,
                            contact_name_full: null
                        };
                        $rootScope.contactsSelected2.push(email);
                        $rootScope.contactsSelected.push(data);
                    } else {
                        $rootScope.showInfoAlert(
                            'This entry has already been selected.');
                    }
                    scope.showContactSelection = false;
                    scope.clearRecipients();
                };

                scope.$on('clear.contactSelector', function () {
                    scope.contactsSelected = $rootScope.contactsSelected;
                });
            }
        };
    })
    .directive('contactSelect', function($rootScope, $timeout, emailService) {
        return {
            restrict: 'A',
            scope: true,
            link: function(scope, element, attrs) {
                scope.type = scope.$parent.contactSelectionType || scope.$parent.type;
                element.on("focus", function(e) {
                    scope.$apply(function() {
                        scope.$parent.showContactSelection = true;
                    });
                });
                element.on("blur", function(e) {
                    $timeout(function() {
                        scope.$parent.showContactSelection = false;
                    }, 500);
                });
                element.on("keydown", function(e) {
                    scope.$apply(function() {
                        if (e.which === 13 || e.which === 9) {
                            if (scope.$parent.hasValue()) {
                                e.preventDefault();
                                scope.$parent.addContact();
                                scope.$parent.showContactSelection = false;
                            } else {
                                e.preventDefault();
                                scope.$parent.showContactSelection = false;
                            }
                            if (scope.type === 'sms') {
                                // angular.element('#smsInput').focus();
                            } else {
                                angular.element('#enterText').focus();
                            }
                        } else if ( scope.type !== 'sms' && (e.which === 32 || e.which === 27) ) {
                            // e.preventDefault();
                            // scope.$parent.showContactSelection = false;
                        }
                    });
                });
            }
        };
    })
    
.directive('validateDob', function(){
    return {
        restrict: "A",
        require: "ngModel",
        link: function(scope, element, attributes, ngModel){
            ngModel.$validators.validateDob = function(modelValue) {
                console.log(modelValue);
                var valid = true;
                if (modelValue && modelValue.length !== 10) valid = false;
                if (modelValue && modelValue.length === 10 ) {
                    var year = modelValue.substring(0, 4);
                    var month = modelValue.substring(5,7);
                    var day = modelValue.substring(8,10);
                    if (isNaN(year) || isNaN(month) || isNaN(day)) valid = false;
                }
                console.log(valid);
                return valid;
            };
        }
    };
})
// .directive('callboxSelector', function($timeout, callService, $sce, $rootScope, contactService,
//     $filter, __env, userService, usefulTools) {
//     return {
//         restrict: 'E',
//         templateUrl: 'views/callbox-selector.html',
//         scope: true,
//         link: function($scope, element, attrs) {
//             $scope.userUuid = $rootScope.user.id;
//             $scope.contactSelectionType = 'number';
//             $scope.inputPlaceholder = 'Type contact name or number';
//             $scope.filteredNumbers = [];
//             $scope.showContactPhoto = $rootScope.showContactPhoto;
//             $scope.box = {
//                 callnumber: null
//             };
//             $scope.selectedIndex = 0;
//             $scope.inputNumber = $scope.$parent.inputNumber;

//             // console.log(callService.currentCalls());

//             $scope.userContacts = function() {
//                 return contactService.userContactsArray();
//             };

//             $scope.contacts = function() {
//                 return contactService.contactsArray();
//             };

//             $scope.theContact = function(contactUuid) {
//                 return contactService.getContactByUuid(contactUuid);
//             };

//             $scope.availNumbers = function() {
//                 return userService.usedNumbers;
//             };

//             $scope.$on('redial.number', function($event, number) {
//                 $scope.box.callnumber = number;
//             });

//             $scope.$on('cancel.transfer.add', function($event) {
//                 $scope.box.callnumber = null;
//             });

//             $scope.$on('clear.input.number', function($event) {
//                 $scope.$parent.inputNumber = null;
//                 $scope.box.callnumber = null;
//             });

//             $scope.hasParent = function() {
//                 return $scope.$parent.inputNumber !== null;
//             };

//             $scope.$on('add.number', function($event, number) {
//                 $scope.box.callnumber = number;
//             });

//             $scope.$on('select.call.number', function($event, number) {
//                 $scope.$parent.inputNumber = number;
//             });

//             $scope.$watch('contact.callnumber', function(newVal, oldVal) {
//                 if (!newVal) $rootScope.$broadcast('clear.input.number');
//                 if (usefulTools.isNumeric($scope.box.callnumber)) $scope.$parent
//                     .inputNumber = usefulTools.cleanPhoneNumber($scope.box.callnumber);
//             });

//             $scope.editContact = function(contactUuid) {
//                 contactService.editContact(contactUuid);
//             };

//             function inContacts(number) {
//                 var i = 0;
//                 var input = $scope.foundContacts;
//                 var len = input.length;
//                 for (i; i < len; i++) {
//                     if (input[i].user_ext && number === input[i].user_ext) return true;
//                     if (input[i].phones) {
//                         angular.forEach(input[i].phones, function(phone) {
//                             if (phone.phone_number === number) return true;
//                         });
//                     }
//                 };
//                 return false;
//             }

//             $scope.filterContacts = function(contactUuid) {
//                 if ($scope.box.callnumber && $scope.box.callnumber.length < 3) return false;
//                 var item = contactService.getContactByUuid(contactUuid);
//                 if (!item) return false;
//                 if ($scope.isKotterTechUser(item)) return false;

//                 if (!$scope.box.callnumber ||
//                     (item.name && item.name.toLowerCase()
//                         .indexOf($scope.box.callnumber.toLowerCase()) !== -1) ||
//                     (item.org && item.org.toLowerCase()
//                         .indexOf($scope.box.callnumber.toLowerCase()) !== -1) ||
//                     (item.ext && String(item.ext).indexOf($scope.box.callnumber) !==
//                         -1)) {
//                     return true;
//                 }
//                 if (item.nums && item.nums.length > 0) {
//                     var found = false;
//                     angular.forEach(item.nums, function(phone) {
//                         if (phone.num && phone.num.indexOf(
//                                 $scope.box.callnumber) !== -1) {
//                             found = true;
//                         }
//                     });
//                     return found;
//                 }
//                 return false;
//             };

//             $scope.isKotterTechUser = function(contact) {
//                 return contactService.isKotterTechUser(contact);
//             };

//             $scope.getCallType = function() {
//                 return $scope.$parent.callboxType;
//             };

//             $scope.transferCall = function(source) {
//                 return $scope.$parent.callboxType === 'transfer' ? $scope.$parent.transferCall(
//                     source) : null;
//             };
//             $scope.addCall = function() {
//                 return $scope.$parent.callboxType === 'addcall' ? $scope.$parent.addCall() :
//                     null;
//             };

//             $scope.$on('call.submitted', function($event, number) {
//                 $scope.$parent.inputNumber = null;
//                 $scope.box.callnumber = null;
//             });

//             $scope.chooseNumber = function(phone, item) {
//                 phone = usefulTools.cleanPhoneNumber(phone);
//                 if (!usefulTools.isNumeric(phone) || phone.length < 3 || phone.length >
//                     11) {
//                     $rootScope.showErrorAlert(
//                         'Target must be a valid phone number.')
//                     return;
//                 }
//                 $scope.box.callnumber = $filter('tel')(phone);
//                 $scope.$parent.inputNumber = phone;
//                 $scope.showContactSelection = false;
//             };

//             $scope.sendToVm = function(phone, item) {
//                 phone = usefulTools.cleanPhoneNumber(phone);
//                 if (!usefulTools.isNumeric(phone) || phone.length < 3 || phone.length >
//                     11) {
//                     $rootScope.showErrorAlert(
//                         'Target must be a valid phone number.')
//                     return;
//                 }

//                 phone = "*99" + phone;
//                 callService.blindTransfer(phone);
//                 $scope.showContactSelection = false;
//             };

//             callService.registerOnCallDialedCallback(function() {
//                 $scope.box.callnumber = '';
//             });


//         }
//     };
// })
.directive('callboxSelector2', function(dataFactory, callService, $sce, $rootScope, contactService,
    $filter, __env, userService, usefulTools, contactGroupsService) {
    return {
        restrict: 'E',
        templateUrl: 'views/callbox-selector2.html',
        scope: {
            placement: '='
        },
        link: function($scope, element, attrs) {
            $scope.userUuid = $rootScope.user.id;
            $scope.contactSelectionType = 'number';
            $scope.inputPlaceholder = 'Type contact name or number';
            $scope.filteredNumbers = [];
            $scope.showContactPhoto = $rootScope.showContactPhoto;
            $scope.box = {
                callnumber: null,
                results: [],
                searching: false,
                short: false
            };
            $scope.selectedIndex = 0;
            $scope.inputNumber = $scope.$parent.inputNumber;

            $scope.doIndexSearch = function() {
                $scope.box.searching = true;
                $scope.box.short = false;
                if (!$scope.box.callnumber || ($scope.box.callnumber && $scope.box.callnumber.length < 3)) {
                    $scope.box.searching = false;
                    if ($scope.box.callnumber && $scope.box.callnumber.length < 3) $scope.box.short = true;
                    return false;
                }
                var data = {
                    search: $scope.box.callnumber,
                    private: contactGroupsService.privateContacts()
                };
                dataFactory.postSearchContactIndex(data)
                .then(function(response){
                    $scope.box.searching = false;
                    var results = [];
                    angular.forEach(response.data.success.data, function(uuid){
                        var contact = contactService.getContactByUuid(uuid);
                        if (contact) results.push(contact);
                        
                    })
                    $scope.box.results = results;
                    console.log(results);
                });
            };

            $scope.userContacts = function() {
                return contactService.getUserContactsOnly();
            };

            $scope.contacts = function() {
                return contactService.fullContactsArray();
            };

            $scope.theContact = function(contactUuid) {
                return contactService.getContactByUuid(contactUuid);
            };

            $scope.availNumbers = function() {
                return userService.usedNumbers;
            };

            $scope.$on('redial.number', function($event, number) {
                $scope.box.callnumber = number;
            });

            $scope.$on('cancel.transfer.add', function($event) {
                $scope.box.callnumber = null;
            });

            $scope.$on('clear.input.number', function($event) {
                $scope.$parent.inputNumber = null;
                $scope.box.callnumber = null;
            });

            $scope.hasParent = function() {
                return $scope.$parent.inputNumber !== null;
            };

            $scope.$on('add.number', function($event, number) {
                $scope.box.callnumber = number;
            });

            $scope.$on('select.call.number', function($event, number) {
                $scope.$parent.inputNumber = number;
            });

            $scope.$watch('contact.callnumber', function(newVal, oldVal) {
                if (!newVal) $rootScope.$broadcast('clear.input.number');
                if (usefulTools.isNumeric($scope.box.callnumber)) $scope.$parent
                    .inputNumber = usefulTools.cleanPhoneNumber($scope.box.callnumber);
            });

            $scope.editContact = function(contactUuid) {
                contactService.editContact(contactUuid);
            };

            $scope.filterResults = function(contact) {
                if ($scope.isKotterTechUser(contact)) return false;
                return true;
            };

            $scope.isKotterTechUser = function(contact) {
                return contactService.isKotterTechUser(contact);
            };

            $scope.getCallType = function() {
                return $scope.$parent.callboxType;
            };

            $scope.transferCall = function(source) {
                return $scope.$parent.callboxType === 'transfer' ? $scope.$parent.transferCall(
                    source) : null;
            };
            $scope.addCall = function() {
                return $scope.$parent.callboxType === 'addcall' ? $scope.$parent.addCall() :
                    null;
            };

            $scope.$on('call.submitted', function($event, number) {
                $scope.$parent.inputNumber = null;
                $scope.box.callnumber = null;
            });

            $scope.chooseNumber = function(phone, item) {
                phone = usefulTools.cleanPhoneNumber(phone);
                if (!usefulTools.isNumeric(phone) || phone.length < 3 || phone.length >
                    11) {
                    $rootScope.showErrorAlert(
                        'Target must be a valid phone number.')
                    return;
                }
                $scope.box.callnumber = $filter('tel')(phone);
                $scope.$parent.inputNumber = phone;
                $scope.showContactSelection = false;
            };

            $scope.sendToVm = function(phone, item) {
                phone = usefulTools.cleanPhoneNumber(phone);
                if (!usefulTools.isNumeric(phone) || phone.length < 3 || phone.length >
                    11) {
                    $rootScope.showErrorAlert(
                        'Target must be a valid phone number.')
                    return;
                }

                phone = "*99" + phone;
                callService.blindTransfer(phone);
                $scope.showContactSelection = false;
            };

            callService.registerOnCallDialedCallback(function() {
                $scope.box.callnumber = '';
            });


        }
    };
})
    .directive('numberSelect', function($rootScope, $timeout, usefulTools, callService) {
        return {
            restrict: 'A',
            scope: true,
            link: function(scope, element, attrs) {
                scope.type = scope.$parent.contactSelectionType;

                element.on("focus", function(e) {
                    scope.$evalAsync(function() {
                        scope.$parent.showContactSelection = true;
                    });
                });
                element.on("blur", function(e) {
                    if (e.currentTarget.value) {
                        $rootScope.$broadcast('select.call.number', e.currentTarget
                            .value);
                    }
                    $timeout(function() {
                        scope.$parent.showContactSelection = false;
                    }, 500);
                });
                element.on("keydown", function(e) {
                    scope.$apply(function() {
                        if (e.which === 13) {
                            if (e.currentTarget.value && usefulTools.isNumeric(
                                    e.currentTarget.value)) {
                                scope.$parent.showContactSelection = false;
                                $rootScope.$broadcast('select.call.number',
                                    e.currentTarget.value);
                                var type = scope.$parent.getCallType();
                                if (type === 'transfer') {
                                    scope.$parent.transferCall(
                                        'keydown-enter');
                                } else if (type === 'addcall') {
                                    scope.$parent.addCall();
                                } else if (type === 'smsforwarding') {} else {
                                    callService.makeCall(e.currentTarget.value);
                                }
                            } else {
                                $rootScope.showErrorAlert(
                                    'Must be a valid Number to dial.');
                            }
                        } else if (e.which === 9) {
                            if (e.currentTarget.value && usefulTools.isNumeric(
                                    e.currentTarget.value)) {
                                scope.$parent.showContactSelection = false;
                                $rootScope.$broadcast('select.call.number',
                                    e.currentTarget.value);
                            }
                        } else if (e.which === 32) {
                            // e.preventDefault();
                            // scope.$parent.showContactSelection = false;
                        } else if (e.which === 27) {
                            e.preventDefault();
                            scope.$parent.showContactSelection = false;
                        }
                    });
                });
            }
        };
    })
    .directive('keyDownChat', function() {
        //catch the enter key when typing a chat message
        return {
            restrict: 'A',
            scope: true,
            link: function(scope, element, attrs) {
                if (scope.$parent.showPeopleSuggestionList || scope.$parent.showChannelSuggestionList) {
                    element.on("keydown", function(e) {
                        var cursorPos = scope.$parent.doGetCaretPosition(e.target);

                        if (__env.enableDebug) console.log(scope);
                        if (__env.enableDebug) console.log(e.which);
                        if (e.which === 13) {
                            scope.$apply(function() {
                                scope.$eval(attrs.ngEnter, {
                                    'e': e
                                });
                            });
                            e.preventDefault();
                        } else if (e.which === 9) {
                            if (__env.enableDebug) console.log("TAB PRESSED");
                            e.preventDefault();
                        } else if (e.which === 32 || e.which === 27) {
                            if (__env.enableDebug) console.log(
                                "ESC or SPACE PRESSED");
                            //scope.$apply(function(){
                            scope.$parent.showPeopleSuggestionList = false;
                            scope.$parent.showChannelSuggestionList = false;

                            //scope.$eval(attrs.ngEnter, {'e': e});
                            //});
                        } else if (e.which === 38) {
                            e.preventDefault();
                            if (scope.$parent.selectedIndex > 0) scope.$parent.selectedIndex +=
                                -1;
                        } else if (e.which === 40) {
                            e.preventDefault();
                            scope.$parent.selectedIndex += 1;
                        }
                    });
                }
            }
        };
    })
    .directive('keyDownAmSms', function(usefulTools) {
        //catch the enter key when typing a chat message
        return {
            restrict: 'A',
            scope: true,
            link: function(scope, element, attrs) {
                element.on("keydown", function(e) {
                    if (__env.enableDebug) console.log(scope);
                    scope.$parent.cursorPos = usefulTools.doGetCaretPosition(e.target);
                    if (__env.enableDebug) console.log(scope.$parent.cursorPos);
                    if (__env.enableDebug) console.log(e.which);
                    if (e.which === 219) {
                        scope.$parent.showShortcodeList = true;
                    } else if (e.which === 13) {
                        scope.$apply(function() {
                            scope.$eval(attrs.ngEnter, {
                                'e': e
                            });
                        });
                        e.preventDefault();
                    } else if (e.which === 9) {
                        if (__env.enableDebug) console.log("TAB PRESSED");
                        e.preventDefault();
                    } else if (e.which === 32 || e.which === 27) {
                        if (__env.enableDebug) console.log("ESC or SPACE PRESSED");
                        scope.$apply(function() {
                            scope.$parent.showShortcodeList = false;

                            //scope.$eval(attrs.ngEnter, {'e': e});
                        });
                    } else if (e.which === 38) {
                        e.preventDefault();
                        if (scope.$parent.selectedIndex > 0) scope.$parent.selectedIndex +=
                            -1;
                    } else if (e.which === 40) {
                        e.preventDefault();
                        scope.$parent.selectedIndex += 1;
                    }
                });


            }
        };
    })
    .directive('onFinishRender', function($timeout) {
        return {
            restrict: 'A',
            link: function(scope, element, attr) {
                if (scope.$last === true) {
                    $timeout(function() {
                        scope.$emit(attr.onFinishRender);
                    });
                }
            }
        };
    })
    .directive('showonhoverparent',
        function() {
            return {
                link: function(scope, element, attrs) {
                    element.parent().bind('mouseenter', function() {
                        element.show();
                    });
                    element.parent().bind('mouseleave', function() {
                        element.hide();
                    });
                }
            };
        })
    .directive('modaldraggable', function($document) {
        "use strict";
        return function(scope, element) {
            var startX = 0,
                startY = 0,
                x = 0,
                y = 0;
            element = angular.element(document.getElementsByClassName("modal-dialog"));
            element.css({
                position: 'fixed',
                cursor: 'move'
                //left: '50%',
                //top: '50%',
                //transform: 'translate(-50%, -50%)'
            });

            element.on('mousedown', function(event) {
                // Prevent default dragging of selected content
                event.preventDefault();
                startX = event.screenX - x;
                startY = event.screenY - y;
                $document.on('mousemove', mousemove);
                $document.on('mouseup', mouseup);
            });

            function mousemove(event) {
                y = event.screenY - startY;
                x = event.screenX - startX;
                element.css({
                    top: y + 'px',
                    left: x + 'px'
                });
            }

            function mouseup() {
                $document.unbind('mousemove', mousemove);
                $document.unbind('mouseup', mouseup);
            }
        };
    })
    .directive('draggable', function() {
        return {
            // A = attribute, E = Element, C = Class and M = HTML Comment
            restrict: 'A',
            //The link function is responsible for registering DOM listeners as well as updating the DOM.
            link: function(scope, element, attrs) {
                element.draggable({
                    //        revert:true
                });
            }
        };
    })
    .directive('phoneInput', function($filter, $browser, $timeout) {
        return {
            require: 'ngModel',
            link: function($scope, $element, $attrs, ngModelCtrl) {
                var listener = function() {
                    var value = $element.val().replace(/[^0-9]/g, '');
                    if (value.length > 10) {
                        if (value.charAt(0) == '1') {
                            value = value.substring(1);
                        }
                        value = value.substring(value.length - 10, value.length);
                    }
                    $element.val($filter('tel2')(value, false));
                };
                $scope.listener = listener;
                $scope.model = ngModelCtrl.$modelValue;

                // This runs when we update the text field
                ngModelCtrl.$parsers.push(function(viewValue) {
                    return viewValue.replace(/[^0-9]/g, '').slice(0, 10);
                });

                // This runs when the model gets updated on the scope directly and keeps our view in sync
                ngModelCtrl.$render = function() {
                    $element.val($filter('tel2')(ngModelCtrl.$viewValue, false));
                };

                $element.bind('change', listener);
                $element.bind('keydown', function(event) {

                    var key = event.keyCode;
                    // If the keys include the CTRL, SHIFT, ALT, or META keys, or the arrow keys, do nothing.
                    // This lets us support copy and paste too
                    if (key === 91 || key === 8 || (15 < key && key < 19) || (37 <=
                            key && key <= 40)) {
                        return;
                    }
                    $browser.defer(listener); // Have to do this or changes don't get picked up properly
                });

                $element.bind('paste cut', function() {
                    $browser.defer(listener);
                });
                $timeout(function() { // runs listener on initialize in case of pre-populated value
                    listener();
                });
            }

        };
    })
    .directive('condCallPhoneInput', function($filter, $rootScope, $browser, $timeout, callService) {
        var formatPhoneNumber = function(value) {
            value = value.replace(/[^0-9\#\*]/g, '');
            if (value.length > 10) {
                if (value.charAt(0) == '1') {
                    value = value.substring(1);
                }
                value = value.slice(0, 10);
            }
            return $filter('tel2')(value, false);
        };

        function isNumberChar(char) {
            return char.replace(/[^0-9]/g, '').length > 0;
        };

        function notFormatChar(char) {
            return char !== '-' && char !== '(' && char !== ')';
        };
        return {
            restrict: 'A',
            scope: {
                ngModel: '='
            },
            link: function($scope, $element, $attrs) {
                $scope.$watch('ngModel', function(newVal, oldVal) {
                    if (newVal && newVal !== oldVal) {
                        var char = newVal[newVal.length - 1];
                        if (notFormatChar(char) && !$scope.backspacePressed) {
                            $scope.ngModel = formatPhoneNumber(newVal);
                        };
                    }
                });
                $element.on('keydown', function(e) {
                    var key = e.keyCode;
                    $scope.backspacePressed = key === 8 ? true : false;
                    if (key === 13) {
                        if (__env.enableDebug) console.log("ENTER PRESSED");
                        $scope.$apply(function() {
                            callService.makeCall($scope.ngModel);
                        });
                        e.preventDefault();
                    }
                });
            }

        };
    })
    .directive('callPhoneInput', function($filter, $rootScope, $browser, $timeout, callService) {
        var formatPhoneNumber = function(value) {
            value = value.replace(/[^0-9\#\*]/g, '');
            if (value.length > 10) {
                if (value.charAt(0) == '1') {
                    value = value.substring(1);
                }
                value = value.slice(0, 10);
            }
            return $filter('tel2')(value, false);
        };

        function isNumberChar(char) {
            return char.replace(/[^0-9]/g, '').length > 0;
        };

        function notFormatChar(char) {
            return char !== '-' && char !== '(' && char !== ')';
        };
        return {
            restrict: 'A',
            scope: {
                ngModel: '='
            },
            link: function($scope, $element, $attrs) {
                $scope.$watch('ngModel', function(newVal, oldVal) {
                    if (newVal && newVal !== oldVal) {
                        var char = newVal[newVal.length - 1];
                        if (notFormatChar(char) && !$scope.backspacePressed) {
                            $scope.ngModel = formatPhoneNumber(newVal);
                        };
                    }
                });
                $element.on('keydown', function(e) {
                    var key = e.keyCode;

                    $scope.backspacePressed = key === 8 ? true : false;
                    if (key === 13) {
                        if (__env.enableDebug) console.log("ENTER PRESSED");
                        $scope.$apply(function() {
                            callService.makeCall($scope.ngModel);
                        });
                        e.preventDefault();
                    }
                });
            }

        };
    })
    .directive('addCallPhoneInput', function($filter, $rootScope, $browser, $timeout, callService) {
        var formatPhoneNumber = function(value) {
            value = value.replace(/[^0-9]/g, '');
            if (value.length > 10) {
                if (value.charAt(0) == '1') {
                    value = value.substring(1);
                }
                value = value.slice(0, 10);
            }
            return $filter('tel2')(value, false);
        };

        function isNumberChar(char) {
            return char.replace(/[^0-9]/g, '').length > 0;
        };

        function notFormatChar(char) {
            return char !== '-' && char !== '(' && char !== ')';
        };
        return {
            restrict: 'A',
            scope: {
                ngModel: '='
            },
            link: function($scope, $element, $attrs) {
                $scope.$watch('ngModel', function(newVal, oldVal) {
                    if (newVal && newVal !== oldVal) {
                        var char = newVal[newVal.length - 1];
                        if (notFormatChar(char) && !$scope.backspacePressed) {
                            $scope.ngModel = formatPhoneNumber(newVal);
                        };
                    }
                });
                $element.on('keydown', function(e) {
                    var key = e.keyCode;
                    $scope.backspacePressed = key === 8 ? true : false;
                    if (key === 13) {
                        if (__env.enableDebug) console.log("ENTER PRESSED");
                        $scope.$apply(function() {
                            // callService.makeCall($scope.ngModel);
                            callService.addCall($scope.ngModel);
                        });
                        e.preventDefault();
                    }
                });
            }

        };
    })
    .directive('chatMessage', ['$rootScope', 'metaService', function($rootScope, metaService) {
        return {
            link: function(scope, element, attrs) {
                metaService.rootScopeOn(scope, 'add', function(e, val) {
                    var domElement = element[0];

                    if (document.selection) {
                        domElement.focus();
                        var sel = document.selection.createRange();
                        sel.text = val;
                        domElement.focus();
                    } else if ($rootScope.insertPosition !== null) {


                    } else if (domElement.selectionStart || domElement.selectionStart ===
                        0) {
                        var startPos = domElement.selectionStart;
                        var endPos = domElement.selectionEnd;
                        var scrollTop = domElement.scrollTop;
                        domElement.value = domElement.value.substring(0,
                            startPos) + val + domElement.value.substring(
                            endPos, domElement.value.length);
                        domElement.focus();
                        domElement.selectionStart = startPos + val.length;
                        domElement.selectionEnd = startPos + val.length;
                        domElement.scrollTop = scrollTop;
                    } else {
                        domElement.value += val;
                        domElement.focus();
                    }

                });
            }
        };
    }])
    .directive('ngThumb', ['$window', function($window) {
        var helper = {
            support: !!($window.FileReader && $window.CanvasRenderingContext2D),
            isFile: function(item) {
                return angular.isObject(item) && item instanceof $window.File;
            },
            isImage: function(file) {
                var type = '|' + file.type.slice(file.type.lastIndexOf('/') + 1) +
                    '|';
                return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
            }
        };

        return {
            restrict: 'A',
            template: '<canvas/>',
            link: function(scope, element, attributes) {
                if (!helper.support) return;

                var params = scope.$eval(attributes.ngThumb);

                if (!helper.isFile(params.file)) return;
                if (!helper.isImage(params.file)) return;

                var canvas = element.find('canvas');
                var reader = new FileReader();

                reader.onload = onLoadFile;
                reader.readAsDataURL(params.file);

                function onLoadFile(event) {
                    var img = new Image();
                    img.onload = onLoadImage;
                    img.src = event.target.result;
                }

                function onLoadImage() {
                    var width = params.width || this.width / this.height * params.height;
                    var height = params.height || this.height / this.width * params.width;
                    canvas.attr({
                        width: width,
                        height: height
                    });
                    canvas[0].getContext('2d').drawImage(this, 0, 0, width, height);
                }
            }
        };
    }])
    .directive('statsTable', ['callStatisticsApi', '$filter', '$rootScope', function(
        callStatisticsApi, $filter, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/stats_table.html',
            scope: {
                searchField: '<',
                toDate: '<',
                fromDate: '<'
            },
            link: function($scope, element, attrs) {
                $scope.callStats = [];
                $scope.showingStat = {};

                var dateFilter = function(date) {
                    return $filter('date')(date, 'yyyy-MM-dd');
                };

                var round = function(num) {
                    return $filter('number')(num, 2);
                };

                var getRequestData = function() {
                    return {
                        domain: $rootScope.user.domain.domain_name,
                        start: dateFilter($scope.fromDate),
                        end: dateFilter($scope.toDate)
                    };
                };

                var totalCallsTitle = function() {
                    var name = $scope.showingStat.name;
                    if (name == 'Average') {
                        return 'Total Calls Average';
                    } else {
                        return 'Total Calls for ' + name;
                    }
                };

                var getTotalCallsArray = function() {
                    return [
                        ['Number of Received Calls: ',
                            round($scope.showingStat.receivedCalls)
                        ],
                        ['Number of Answered Calls: ',
                            round($scope.showingStat.answered)
                        ],
                        ['Number of Unanswered Calls: ',
                            round($scope.showingStat.unanswered)
                        ],
                        ['Number of Abandoned Calls: ',
                            round($scope.showingStat.abandoned)
                        ],
                        ['Number of Transferred Calls: ',
                            round($scope.showingStat.transferred)
                        ],
                        ['Abandon Rate: ',
                            round($scope.showingStat.abandonRate)
                        ],
                        ['Number of Agent Logins: ',
                            round($scope.showingStat.agentLogins)
                        ],
                        ['Number of Agent Logoffs: ',
                            round($scope.showingStat.agentLogouts)
                        ],
                        ['Avg Talk: ',
                            round($scope.showingStat.avgTalk)
                        ],
                        ['Percent Answered: ',
                            round($scope.showingStat.pctAnswered)
                        ],
                        ['Percent Unsanswered: ',
                            round($scope.showingStat.pctUnanswered)
                        ],
                        ['Answered Talk Time: ',
                            round($scope.showingStat.talkTime)
                        ]
                    ];
                };

                var getOutboundCallsArray = function() {
                    return [
                        ['Number of Outbound Calls: ',
                            round($scope.showingStat.outboundCalls, 3)
                        ],
                        ['Number of Answered Calls: ',
                            round($scope.showingStat.outboundAnswered, 3)
                        ],
                        ['Number of Unanswered Calls: ',
                            round($scope.showingStat.outboundUnanswered, 3)
                        ]
                    ];
                };

                var unzipArray = function(arr) {
                    var arrOne = [];
                    var arrTwo = [];
                    angular.forEach(arr, function(entry) {
                        arrOne.push(entry[0]);
                        arrTwo.push(entry[1]);
                    });
                    return [arrOne, arrTwo];
                };

                $scope.getDataArray = function() {
                    return unzipArray([
                        unzipArray(getTotalCallsArray()),
                        unzipArray(getOutboundCallsArray())
                    ]);
                };

                $scope.generate = function() {
                    var docDefinition = {
                        content: [{
                                text: 'Call Statistics Report',
                                style: 'header'
                            },
                            {
                                text: totalCallsTitle(),
                                style: 'subheader'
                            },
                            {
                                style: 'tableExample',
                                table: {
                                    body: getTotalCallsArray()
                                }
                            },
                            {
                                text: 'Outbound Calls',
                                style: 'subheader'
                            },
                            {
                                style: 'tableExample',
                                table: {
                                    body: getOutboundCallsArray()
                                }
                            }
                        ],
                        styles: {
                            header: {
                                fontSize: 18,
                                bold: true,
                                margin: [0, 0, 0, 10]
                            },
                            subheader: {
                                fontSize: 16,
                                bold: true,
                                margin: [0, 10, 0, 5]
                            },
                            tableExample: {
                                margin: [0, 5, 0, 15]
                            },
                            tableHeader: {
                                bold: true,
                                fontSize: 13,
                                color: 'black'
                            }
                        }
                    };
                    //pdfMake.createPdf(docDefinition).download("statistics.pdf");
                };

                var updateData = function() {
                    var data = getRequestData();
                    callStatisticsApi.getCallStats(data).then(function(responseData) {
                        if (__env.enableDebug) console.log(responseData);
                        angular.copy(responseData, $scope.callStats);
                        angular.copy(responseData[0], $scope.showingStat);
                    });
                };

                updateData();

                $scope.$watchGroup(['toDate', 'fromDate'], function(newVal, oldVal) {
                    if ($scope.toDate && $scope.fromDate) {
                        updateData();
                    }
                });

                $scope.$watch('searchField', function(newValue, oldValue) {
                    var filtered = $filter('filter')($scope.callStats, {
                        name: $scope.searchField
                    });
                    if (_.any(filtered)) {
                        angular.copy(filtered[0], $scope.showingStat);
                        if (__env.enableDebug) console.log($scope.showingStat);
                    } else {
                        // angular.copy($scope.allCallStats[0], $scope.callStats);
                    }
                });
            }
        };
    }])
    .directive('convertToNumber', function() {
        return {
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                ngModel.$parsers.push(function(val) {
                    return parseInt(val, 10);
                });
                ngModel.$formatters.push(function(val) {
                    return '' + val;
                });
            }
        };
    })
    .directive('datepickerPopup', function() {
        return {
            restrict: 'EAC',
            require: 'ngModel',
            link: function(scope, element, attr, controller) {
                //remove the default formatter from the input directive to prevent conflict
                controller.$formatters.shift();
            }
        }
    })
    .directive('eventFocus', function(focus) {
        return function(scope, elem, attr) {
            elem.on(attr.eventFocus, function() {
                focus(attr.eventFocusId);
            });

            // Removes bound events in the element itself
            // when the scope is destroyed
            scope.$on('$destroy', function() {
                elem.off(attr.eventFocus);
            });
        };
    })
    // .directive('ngEnter', function() {
    //     //catch the enter key when typing a chat message
    //     return function(scope, element, attrs) {
    //         element.bind("keydown", function(e) {
    //             if (e.which === 13) {
    //                 e.stopPropagation();
    //                 scope.$apply(function() {
    //                     scope.$eval(attrs.ngEnter, {
    //                         'e': e
    //                     });
    //                 });
    //             }
    //         });
    //     };
    // })
    .directive('ngEnter', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function(event) {
                if (event.which === 13) {
                    scope.$apply(function() {
                        scope.$event = event;
                        scope.$eval(attrs.ngEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    })
    .directive('faxLog', function(dataFactory, usefulTools, userService, newChatService, $filter,
        contactService, symphonyConfig, __env, fileService, $rootScope, $mdDialog, integrationService,
        locationService, contactGroupsService, metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/fax/fax-log.html',
            scope: {
                fax: '<',
                location: '<',
                userTab: '<',
                isManager: '&',
                message: '<'
            },
            link: function($scope) {
                $scope.faxMessages = [];
                $scope.predicate = 'sent_at';
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.user = $rootScope.user;
                $scope.location_group_uuid = $scope.location;
                $scope.reverse = true;
                $scope.maxSize = 50;
                $scope.messageControls = false;
                $scope.copySelected = [];
                $scope.ppOptions = [10, 20, 50, 100];
                $scope.pagination = {
                    perPage: 20,
                    currentPage: 1
                };

                //console.log($scope.fax);
                //console.log($scope.isManager);

                metaService.rootScopeOn($scope, 'update.fax.messages', function(event, data) {
                    var vfax_uuid = data.vfax_uuid;
                    if (vfax_uuid && $scope.fax && $scope.fax.vfax_uuid === vfax_uuid) {
                        $scope.getFaxMessages();
                    }
                });


                $scope.$watch('location', function(newVal, oldVal) {
                    // console.log("NEW VALUE", newVal);
                    // console.log("OLD VALUE", oldVal);
                    if (newVal) {
                        $scope.location_group_uuid = $scope.location;
                        $scope.getFaxMessages();
                    }
                });

                $scope.$watch('userTab', function(newTab, oldTab) {
                    if ((newTab)) {
                        // console.log("running");
                        $scope.faxMessages = [];
                        $scope.getFaxMessages();
                    }
                });

                $scope.$watch('message', function(newMsg, oldMsg) {
                    if (newMsg != oldMsg) {
                        $scope.faxMessages.push(newMsg);
                    }
                });

                $scope.showUserName = function(userUuid) {
                    var contact = contactService.getContactByUserUuid(userUuid);
                    if (contact) return contact.name;
                    return null;
                };

                $scope.getFaxMessages = function() {

                    if ($scope.location) {
                        $scope.location_group_uuid = $scope.location;
                    } else {
                        $scope.location_group_uuid = null;
                    }

                    var faxDid = $rootScope.user.did;

                    $scope.totalItems = 0;
                    $scope.faxMessages = [];

                    if ($scope.fax) {
                        $scope.setMessageControls();
                        $scope.loadingFaxes = true;
                        dataFactory.getFaxMessages($rootScope.user.domain_uuid, $scope.location_group_uuid,
                                faxDid)
                            .then(function(response) {
                                // console.log(response.data);
                                if (response.data && response.data.success &&
                                    response.data.success.data &&
                                    ((!response.data.success.data.location_group_uuid &&
                                            !$scope.location_group_uuid) ||
                                        response.data.success.data.location_group_uuid ===
                                        $scope.location_group_uuid)) {
                                    angular.copy(response.data.success.data.message,
                                        $scope.faxMessages);
                                    $scope.totalItems = $scope.faxMessages.length;
                                    angular.forEach($scope.faxMessages, function(
                                        message) {
                                        if (!message.sent_at) message.sent_at =
                                            message.created_at;

                                    });
                                    if (__env.enableDebug) console.log(
                                        "FAX MESSAGES");
                                    if (__env.enableDebug) console.log($scope.faxMessages);
                                    $scope.loadingFaxes = false;
                                } else {
                                    $scope.loadingFaxes = false;
                                }
                            })
                            .catch(function(err) {
                                $scope.loadingFaxes = false;
                                console.log("Error", err);
                            });
                    }
                };

                $scope.sort_by = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.isUfaxManagerAdminOrGreater = function() {
                    if (locationService.isAdminGroupOrGreater()) {
                        return true;
                    } else if ($scope.location) {
                        locationService.getLocationGroups("faxing", $rootScope.user.domain_uuid)
                            .then(function(response) {
                                var groups = response;
                                $scope.messageControls = false;
                                for (var group in groups) {
                                    if ($scope.location === group) {
                                        var locationGroup = groups[group];
                                        for (var each in locationGroup.managers) {
                                            if (locationGroup.managers[each].user_uuid ===
                                                $rootScope.user.user_uuid) {
                                                $scope.messageControls = true;
                                                return true;
                                            }
                                        }
                                    }
                                }
                            })
                            .catch(function(err) {
                                console.log("Error retrieving User Fax Status", err);
                                $rootScope.showalerts(err);
                            });
                    }
                    //return false;
                };

                $scope.setMessageControls = function() {
                    $scope.messageControls = $scope.isUfaxManagerAdminOrGreater();
                };

                $scope.handledIcon = function(fax) {
                    if (fax.handled_by_uuid) return 'fa-check-square-o';
                    return 'fa-square-o';
                };

                $scope.handleFax = function(fax) {
                    var permission = $scope.messageControls;
                    if (!permission) {
                        $rootScope.showAlert(
                            "You do not have sufficient permission to reassign the handler of this fax."
                        );
                        return;
                    }
                    var user = $rootScope.user.user_uuid;
                    var data = {
                        fax: fax,
                        user: user,
                        permission: permission
                    };
                    dataFactory.postHandleFax(data)
                        .then(function(response) {
                            if (response.data.success) {
                                var message = response.data.success.data;
                                fax.handled_by_uuid = message.handled_by_uuid;
                                fax.handled_at = message.handled_at;
                            }
                        })
                        .catch(function(error) {
                            console.log("ERROR", error);
                            $rootScope.showAlert(
                                "There was a problem assigning the fax handler."
                            );
                        });
                }

                $scope.showChevron = function(predicate) {
                    return usefulTools.showChevron(predicate, $scope.predicate, $scope.reverse);
                };

                $scope.getPdfUrl = function(fax) {
                    
                    var apiUrl = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                        symphonyConfig.onescreenUrl);
                    var url = apiUrl + '/vfax/viewpdf/' + fax.vfax_message_uuid +
                        '?token=' + $rootScope.userToken;
                    return url;
                };

                $scope.showUploadFilename = function(name) {
                    var fileName = name;
                    if (fileName.length > 30) fileName = fileName.substring(0, 14) +
                        ' ... ' + fileName.substring(fileName.length - 14);
                    return fileName;
                };

                $scope.showFileName = function(fax) {
                    var display = '';
                    var fileName = '';
                    if (fax.original_filename) {
                        fileName = fax.original_filename;
                        if (fileName.length > 36) fileName = fileName.substring(0, 17) +
                            ' ... ' + fileName.substring(fileName.length - 17);
                    }
                    return fileName;
                };

                $scope.showMessageStatus = function(fax) {
                    if (fax.status === 'sent' || fax.status === 'received' || fax.status ===
                        'sending') {
                        return $filter('capitalize')(fax.status);
                    }
                    return 'Failed';
                };

                $scope.copyFaxToManagementSystem = function(fax) {
                    var partner = $rootScope.user.exportType.partner_code;
                    fax.user_uuid = $rootScope.user.id;

                    var data = {
                        type: 'fax',
                        fax: fax,
                        customerList: [],
                        title: 'Activity Action',
                    };
                    if (partner == 'ams360') {
                        $rootScope.showModalFull('/modals/ams360ActivityModal.html', data, '');
                    } else if (partner == 'qqcatalyst') {
                        $rootScope.showModalFull('/modals/qqTaskModal.html', data, '');
                    } else {
                        integrationService.copyEntityToPartner(data);
                    }

                };

                $scope.showCopyTooltip = function() {
                    var user = $rootScope.user;
                    if (user.exportType && user.exportType.partner_code && user.exportType
                        .partner_code !== 'generic') {
                        return user.exportType.partner_name;
                    } else {
                        return 'Management System';
                    }
                };

                $scope.selectedMessages = {};
                $scope.messages = {
                    selectAll: false,
                    selectedMessages: {}
                };
                $scope.selectMessage = function(messageUuid) {
                    console.log(messageUuid);
                };
                $scope.selectAllMessages = function(messages) {
                    console.log(messages);
                    var i;
                    var start = ($scope.pagination.currentPage - 1) * $scope.pagination
                        .perPage;
                    var end = start + $scope.pagination.perPage;
                    for (i = start; i < end; i += 1) {
                        if (messages[i]) {
                            $scope.messages.selectedMessages[messages[i].vfax_message_uuid] =
                                $scope.messages.selectAll;
                        }
                    };
                };

                function getSelectedMessages(obj) {
                    var array = [];
                    if (Object.keys(obj).length > 0 && obj.constructor === Object) {
                        angular.forEach(obj, function(value, key) {
                            if (value) array.push(key);
                        });
                    }
                    return array;
                }
                $scope.messagesSelectedCount = function() {
                    var threads = getSelectedMessages($scope.messages.selectedMessages);
                    return threads.length;
                };

                $scope.deleteSelectedMessages = function() {
                    console.log(getSelectedMessages($scope.messages.selectedMessages));
                    var count = $scope.messagesSelectedCount();
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Confirm Delete')
                        .htmlContent('Are you sure you want to delete the selected ' +
                            count + ' messages?')
                        .ariaLabel('Delete')
                        .ok('Delete')
                        .cancel('Cancel');
                    $mdDialog.show(deleteConfirm).then(function() {
                        var data = {
                            messages: getSelectedMessages($scope.messages.selectedMessages)
                        };
                        console.log(data);
                        dataFactory.postRemoveMultipleFaxes(data)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    angular.forEach(data.messages, function(
                                        message) {
                                        var index = $filter(
                                            'getByUUID')($scope
                                            .faxMessages,
                                            message,
                                            'vfax_message');
                                        if (index !== null) $scope.faxMessages
                                            .splice(index, 1);
                                    });
                                    $scope.messages.selectedMessages = {};
                                    $scope.messages.selectAll = false;
                                }
                            });
                    });
                };

                $scope.deleteFaxMessage = function(message) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Are you sure you want to delete this Fax Message?')
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Nevermind');
                    $mdDialog.show(confirmDelete).then(function() {
                        dataFactory.getDeleteFaxMessage(message.vfax_message_uuid)
                            .then(function(response) {
                                if (response.data.success) {
                                    $rootScope.alerts.push({
                                        success: true,
                                        message: response.data.success
                                            .message
                                    });
                                    $scope.faxMessages.splice(($scope.faxMessages
                                        .indexOf(message)), 1);
                                    $scope.totalItems = $scope.faxMessages.length;
                                } else if (response.data.error) {
                                    $rootScope.alerts.push({
                                        error: true,
                                        message: response.data.error
                                            .message
                                    });
                                }
                            });
                    });
                };

                $scope.getUserContact = function(faxMessage) {
                    var userUuid = faxMessage.send_user_uuid;
                    var domainUuid = faxMessage.domain_uuid;
                    return contactService.getContactByUserUuid(userUuid, domainUuid);
                };

                $scope.getContact = function(message) {
                    var number = (message.direction === 'inbound' ? message.source_number :
                        message.destination_number);
                    var contact = contactService.getContactByPhoneNumber(usefulTools.cleanPhoneNumber(
                        number));
                    return contact;
                };

                $scope.getFaxesByUuid = function(arr) {
                    if (!arr) {
                        $rootScope.showAlert('No messages requested');
                        return false;
                    }
                    var messageObject = {
                        "messages": arr
                    };
                    return dataFactory.postGetFaxesByUuid(messageObject)
                        .then(function(response) {
                            if (response.data.success) {
                                return response;
                            } else {
                                $rootScope.showAlert("Error retrieving Faxes");
                            }
                        })
                        .catch(function(err) {
                            console.log("Error retrieving Faxes", err);
                            $rootScope.showAlert(
                                "There was an error retrieving the Faxes");
                        });
                };

                $scope.getPdfLink = function(fax) {
                    var apiUrl = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                        symphonyConfig.onescreenUrl);
                    var url = apiUrl + '/vfax/view/assigned/' + fax.vfax_message_uuid;
                    return url;
                };


                $scope.buildAssignmentNotice = function(faxArray) {
                    var noticeData = [];
                    var initial = "";
                    var initialHtml = "";
                    // console.log("FAX ARRAY", faxArray);
                    if (!faxArray.length) {
                        $rootScope.showAlert(
                            "There was a problem building the assignment notification."
                        );
                        return false;
                    } else if (faxArray.length == 1) {
                        initial += 'You have been assigned this Fax by ' + $rootScope.user
                            .contact_name_given + ' ' + $rootScope.user.contact_name_family +
                            "\n";
                        initialHtml += '<p>You have been assigned this Fax by ' +
                            $rootScope.user.contact_name_given + ' ' + $rootScope.user.contact_name_family +
                            '</p>' + "\n";
                    } else if (faxArray.length > 1) {
                        initial += 'You have been assigned these Faxes by ' +
                            $rootScope.user.contact_name_given + ' ' + $rootScope.user.contact_name_family +
                            "\n";
                        initialHtml += '<p>You have been assigned these Faxes by ' +
                            $rootScope.user.contact_name_given + ' ' + $rootScope.user.contact_name_family +
                            '</p>' + "\n";
                    } else {
                        return;
                    }

                    for (var each in faxArray) {
                        var fax = faxArray[each];
                        var link = $scope.getPdfLink(fax);
                        if (fax.direction === "outbound") {
                            var target = $filter('tel')(fax.destination_number);
                            var when = $filter('amDateFormat')(fax.sent_at,
                                'MM/D/YYYY, h:mm a');
                            initial += "Sent To: " + target + "\n";
                            initial += "Sent At: " + when + "\n"
                            initialHtml += "<p>Sent To: " + target + "</p>\n";
                            initialHtml += "<p>Sent At: " + when + "</p>\n"
                        } else if (fax.direction === "inbound") {
                            var source = $filter('tel')(fax.source_number);
                            var when = $filter('amDateFormat')(fax.sent_at,
                                'MM/D/YYYY, h:mm a');
                            initial += "Received From: " + source + "\n";
                            initial += "Received At: " + when + "\n"
                            initialHtml += "<p>Received From: " + source + "</p>\n";
                            initialHtml += "<p>Received At: " + when + "</p>\n"
                        }
                        initial += "Link to Fax: " + link + "\n\n";
                        initialHtml += "<h4>Link to Fax: <a href='" + link +
                            "'>Click here to View/Download</a>" + "\n\n</h4>";
                    }

                    noticeData.push(initial);
                    noticeData.push(initialHtml);
                    // console.log(noticeData);

                    return noticeData;
                };

                $scope.resendMessage = function(message_uuid) {
                    console.log("RESENDING");
                    if (userService.limitReached('fax')) {
                        $rootScope.showErrorAlert('You have reached the limit of ' +
                            $rootScope.user.usageLimits.fax +
                            ' fax messages allowed while using a Bridge Demo account.'
                        );
                        return;
                    }
                    $scope.resending = message_uuid;
                    dataFactory.getResendFaxMessage(message_uuid).then(function(response) {
                        //console.log("RESPONSE", response.data.success.data);
                        if (__env.enableDebug) console.log(response);
                        $rootScope.showalerts(response);
                        if (response.data.success.data) {
                            $scope.faxMessages.push(response.data.success.data);
                            $scope.resending = null;
                            if (userService.isDemoAgency()) userService.updateDemoUsage();
                        }
                    });
                };

                $scope.getFaxImage = function(message_uuid) {
                    dataFactory.getFaxImage(message_uuid).then(function(response) {
                        if (__env.enableDebug) console.log(response);
                    });
                };

                $scope.showIcon = function(filename) {
                    var parts = filename.split('.');
                    var ext = parts[parts.length - 1].toLowerCase();
                    return fileService.getFileTypeByMimeType(file.file_mime_type);
                }

                $scope.getFileType = function(file) {
                    return fileService.getFileTypeByMimeType(file.type);
                };

                /********************************  
                Fax Assignment functions
                *********************************/
                $scope.assignFax = function() {
                    function hasMatchingContactRecord(member) {
                        return Boolean(contactService.getContactbyMMId(member.id));
                    }

                    function hasOpenDirectChannel(member) {
                        return Boolean(newChatService.getDMChannelByUserId(member.id));
                    };

                    function isMemberOfCurrentLocation(contact) {
                        // var contact = contactService.getContactbyMMId(member.id);
                        $scope.groups = contactGroupsService.groups;
                        var location = locationService.getLocationByUuid($scope.location);
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
                        if (!contact || contactService.isKotterTechUser(contact)) return false;
                        return true;
                    };

                    function isActive(contact) {
                        if (!contact || !contact.name || contact.name ===
                            '' || !contact.en || contact.en !== 'true') return false;
                        return true;
                    };
                    
                    var peopleList = contactService.getUserContactsOnly().filter(
                        isActive).filter(isKotterTech).filter(
                        isMemberOfCurrentLocation);

                    var uuids = [];
                    var faxes = [];
                    var noticeData = [];
                    var initial = "";
                    var initialHtml = "";
                    if ($scope.messagesSelectedCount() >= 1) {
                        console.log(peopleList);
                        var messages = getSelectedMessages($scope.messages.selectedMessages);
                        $scope.getFaxesByUuid(messages)
                            .then(function(response) {
                                faxes = (response.data.success.data);
                                noticeData = $scope.buildAssignmentNotice(faxes);
                                initial = noticeData[0];
                                initialHtml = noticeData[1];
                                var data = {
                                    type: 'Fax',
                                    uuids: uuids,
                                    assignedTo: {},
                                    sendEmail: true,
                                    peopleListData: peopleList,
                                    initialValue: initial,
                                    initialHtml: initialHtml,
                                    setAsignee: function(member) {
                                        // var userM = contactService.getContactbyMMId(member.id);
                                        $scope.assignedTo = member;
                                        $scope.newAssignedUser = member;
                                        console.log("MEMBER", member);
                                        console.log("RSID", $rootScope.user.id);
                                    },
                                    assign: function(info) {
                                        if ($scope.newAssignedUser) {
                                            // if ($scope.assignedTo.user_uuid !== $rootScope.user.id) {
                                            if ($scope.assignedTo.user_uuid) {
                                                var sendPost = this.chatFns
                                                    .sendPost;
                                                var inputElement = this.chatFns
                                                    .mainChatInput;

                                                function chatSendPost(files) {
                                                    function channel() {
                                                        console.log($scope.assignedTo);
                                                        var chatId = $scope.assignedTo.chat_id;
                                                        return newChatService.getDMChannelByUserId(chatId);
                                                    };

                                                    function doSendPost(files) {
                                                        var opts = {
                                                            root_id: null,
                                                            files: files
                                                        };
                                                        sendPost(inputElement, channel(), opts);
                                                    };

                                                    if (!channel()) {
                                                        var chatId = $scope.assignedTo.chat_id;
                                                        var member = newChatService.teamMembers[chatId];
                                                        newChatService.createDirectChannel(member)
                                                            .then(function(response) {
                                                                doSendPost(files);
                                                            });
                                                    } else {
                                                        doSendPost(files);
                                                    }
                                                };
                                                
                                                var emailNote = angular.element("#chatInput")[0].value;
                                                var data = {
                                                    user_uuid: $scope.assignedTo.user_uuid,
                                                    faxes: faxes,
                                                };

                                                function submitAssignment(files) {
                                                    chatSendPost();
                                                    if (info.sendEmail) {
                                                        data.sendEmail = 'true';
                                                        data.email_subject = info.email_subject ? info.email_subject : null;
                                                        data.note = emailNote;
                                                        data.content = info.initialHtml;
                                                        data.files = files;
                                                    }

                                                    if (data.files && data.files.length > 0) {
                                                        for (var i = 0; i < data.files.length; i++) {
                                                            data["file" + i] = data.files[i];
                                                        }
                                                        data.file_count = data.files.length;
                                                        delete data.files;
                                                        data = fileService.convertObjectToFormData(data);
                                                    }

                                                    dataFactory.postAssignFaxesToUser(data)
                                                        .then(function(response) {
                                                            if (response.data.success) {
                                                                console.log("ASSIGNMENT RESPONSE", response);
                                                                $rootScope.closeModal();
                                                                $rootScope.showalerts(response);
                                                                var faxes = response.data.success.data;
                                                                for (var index in faxes) {
                                                                    var fax = faxes[index];
                                                                    for (var each in $scope.faxMessages) {
                                                                        var message = $scope.faxMessages[each];
                                                                        if (fax.vfax_message_uuid === message.vfax_message_uuid) {
                                                                            message.assigned_to_uuid = fax.assigned_to_uuid;
                                                                            break;
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        })
                                                        .catch(function(error) {
                                                            $rootScope.showalerts(error);
                                                        })
                                                }

                                                $scope.messages.selectedMessages = {};
                                                $scope.messages.selectAll = false;
                                                submitAssignment(this.files);
                                            }
                                        } else {
                                            var message =
                                                "Please select someone to assign the fax to in the dropdown.";
                                            $rootScope.showInfoAlert(
                                                message);
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
                                            data.uploader.addToQueue(
                                                file);
                                            data.uploader.queue[id].file
                                                .id = id;
                                            id++;
                                        });
                                    }
                                };
                                data.chatFns.updateFiles = function(remainingIds) {
                                    _.remove(data.files, function(file) {
                                        return remainingIds.indexOf(
                                            file.id) <= -1;
                                    });
                                };

                                // function getMediaUrls(texts) {
                                //     var urls = [];
                                //     function getMediaUrl(media) { return $scope.mediaUrl + media.url; };
                                //     texts.forEach(function(text) {
                                //         if (text.media) {
                                //             urls = urls.concat(text.media.map(getMediaUrl));
                                //         }
                                //     });
                                //     return urls;
                                // };
                                // function isUnwantedUrl(url) {
                                //     return url.indexOf(".txt") === -1 &&
                                //         url.indexOf(".smil") === -1 &&
                                //         url.indexOf(".xml") === -1;
                                // };

                                $rootScope.showModalWithData(
                                    '/modals/assign-texts.html', data);
                            })
                            .catch(function(err) {
                                $rootScope.showAlert(
                                    "Encountered a problem assigning the Fax(es)."
                                );
                            });
                    }

                };

                // ***** The route for this method is commented out in onescreenapi.js & routes.php
                // $scope.viewMessageImage = function(message_uuid) {
                //     dataFactory.getFaxImage(message_uuid).then(function(response) {
                //         if(__env.enableDebug) console.log('FAX IMAGE');
                //         if(__env.enableDebug) console.log(response.data.success.data.original_filename);
                //         var splits = response.data.success.data.original_filename.split('.');
                //         var filetype = splits[splits.length - 1];
                //         var src = 'data:' + getMimetypeByFiletype(filetype)  + ';base64, ' + response.data.success.data.file;
                //         if (filetype === 'jpg') {
                //             $rootScope.showModalWithData('/fax/viewfaximage.html', {obj: src});
                //         } else if (filetype === 'pdf') {
                //             $window.open(src);
                //         } else {
                //             angular.element('#download_link').attr('href', src);
                //             angular.element('#download_link').attr('download', response.data.success.data.original_filename);
                //             angular.element('#download_link')[0].click();
                //         }
                //     });
                // };


                /************************************************ */
                // Date Functions
                /************************************************ */
                var today = new Date();
                $scope.fromDate = '';
                $scope.toDate = '';
                $scope.dateFormat = 'yyyy-MM-dd';
                $scope.fromDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 1,
                    minDate: new Date(2016, 1, 1),
                    maxDate: today
                };
                $scope.toDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 1,
                    //minDate: $scope.fromDate,
                    maxDate: today
                };
                $scope.fromDatePopup = {
                    opened: false
                };
                $scope.toDatePopup = {
                    opened: false
                };
                $scope.ChangeToMinDate = function(fromDate) {
                    if (fromDate != null) {
                        var ToMinDate = new Date(fromDate);
                        $scope.toDateOptions.minDate = ToMinDate;
                        $scope.toDate = ToMinDate;
                    }
                };
                $scope.ChangeToMinDate();
                $scope.OpenfromDate = function() {
                    $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
                };
                $scope.OpentoDate = function() {
                    $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
                };
                $scope.dateFilter = function(message, index, array) {
                    var messageDate = new Date(message.updated_at.split(' ')[0] +
                        " 00:00:00");
                    if ($scope.fromDate && $scope.fromDate > messageDate) {
                        return false;
                    } else if ($scope.toDate && $scope.toDate < messageDate) {
                        return false;
                    } else {
                        return true;
                    }
                };

            }
        }
    })
    .directive('faxOrder', function(dataFactory, $rootScope, usefulTools) {
        return {
            restrict: 'A',
            templateUrl: 'views/fax/fax-order.html',
            scope: {
                uuid: '<'
            },
            link: function($scope, element) {
                $scope.orderType = 'new';
                $scope.availableStates = [];
                $scope.availableRatecenters = [];
                $scope.availableDids = [];
                $scope.tips = $rootScope.tips;
                $scope.senderName = $rootScope.user.domain.domain_description;
                $scope.email = $rootScope.user.email_address;
                $scope.emailAddress = $scope.email;
                $scope.dids = [];
                $scope.selectedDid = null;
                $scope.existingSelected = false;

                function existingDids() {
                    dataFactory.getAvailableFaxDids()
                    .then(function(response){
                        console.log(response);
                        $scope.dids = response.data.success.data;
                    });
                }

                existingDids();

                $scope.isAvailDid = function(did) {
                    if (did.info && (did.info.isConference || did.info.isIvr || did.info.isUser)) return false;
                    return true;
                };

                $scope.changeOrderType = function(type) {
                    $scope.orderType = type;
                };
                $scope.data = {
                    useDid: $rootScope.user.symphony_user_settings.sms_phone_number.substr(
                        1),
                    useZip: $rootScope.user.symphony_user_settings.zipcode
                };
                $scope.close = function() {
                    $rootScope.closeModal();
                };
                $scope.loadingDids = false;
                $scope.getAvailableDids = function() {
                    $scope.loadingDids = true;
                    $scope.showNumbers = true;
                    var data = {
                        domainUuid: $scope.domainUuid,
                        refresh: $scope.availableDids.length === 0 ? false : true,
                        zip: $scope.data.useZip,
                        did: $scope.data.useDid,
                        reservations: $scope.availableDids ? $scope.availableDids : []
                    };
                    console.log(data);
                    dataFactory.postGetAvailableDids(data)
                        .then(function(response) {
                            if (__env.enableDebug) console.log("DIDS");
                            if (__env.enableDebug) console.log(response);
                            if (response.data.success) $scope.availableDids =
                                response.data.success.data;
                            $scope.loadingDids = false;
                        }, function(error) {
                            if (__env.enableDebug) console.log(error);
                        });
                };

                $scope.selectDid = function(did) {
                    // $scope.selectedDid = usefulTools.cleanPhoneNumber(did);
                    $scope.selectedDid = did;
                    $scope.existingSelected = false;
                };

                $scope.selectExistingDid = function(did) {
                    $scope.existingSelected = true;
                    $scope.selectedDid = usefulTools.cleanPhoneNumber(did);
                };

                $scope.startOrder = function() {
                    $scope.ordering = true;
                };

                $scope.goBack = function() {
                    $scope.selectedDid = null;
                    $scope.ordering = false;
                };

                $scope.postOrderDid = function() {
                    $scope.processing = true;
                    var data = {
                        did: $scope.selectedDid,
                        email_address: $scope.emailAddress,
                        sender_name: $scope.senderName,
                        location_group_uuid: $scope.uuid.location_group_uuid,
                        reservations: $scope.availableDids,
                        existing: $scope.existingSelected
                    };
                    dataFactory.postOrderFaxDid(data).then(function(response) {
                        if (!$rootScope.user.domain.vfax) {
                            $rootScope.user.domain.vfax = {};
                        }
                        if (response.status == 200) {
                            angular.copy(response.data.success.data, $rootScope
                                .user.domain.vfax);
                            $rootScope.user.vfax.push(response.data.success.data);
                            $rootScope.$broadcast('did.ordered', response.data.success
                                .data);
                            $rootScope.showSuccessAlert(response.data.success.message);
                        } else if (response.data.error) {
                            $rootScope.showErrorAlert(response.data.error.message);
                        }
                        $scope.processing = false;
                        $rootScope.closeModal();
                    });
                };
            }
        };
    })
    .directive('userCreation', function(dataFactory, $mdDialog, $timeout, $filter, $uibModalStack,
        symphonyConfig, emulationService, usefulTools, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'new-user-creation.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element) {
                $scope.availableDids = [];
                $scope.tips = $rootScope.tips;
                $scope.newUser = {};
                $scope.data = {
                    useDid: $scope.domain.defaultnumber,
                    useZip: $scope.domain.zipcode
                };
                $scope.close = function() {
                    $rootScope.closeModal();
                };
                $scope.loadingDids = false;
                $scope.getAvailableDids = function() {
                    $scope.loadingError = null;
                    $scope.loadingDids = true;
                    $scope.showNumbers = true;
                    var data = {
                        domainUuid: $scope.domainUuid,
                        refresh: $scope.availableDids.length === 0 ? false : true,
                        zip: $scope.data.useZip,
                        did: $scope.data.useDid,
                        reservations: $scope.availableDids ? $scope.availableDids : []
                    };
                    dataFactory.postGetAvailableDids(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.availableDids = response.data.success.data;
                            } else {
                                $scope.loadingError = response.data.error.message;
                            }
                            $scope.loadingDids = false;
                        }, function(error) {
                            if (__env.enableDebug) console.log(error);
                        });
                };

                $scope.selectDid = function(did) {
                    $scope.selectedDid = did;
                };

                $scope.startOrder = function() {
                    $scope.ordering = true;
                };

                $scope.goBack = function() {
                    $scope.selectedDid = null;
                    $scope.ordering = false;
                };

                $scope.addUser = function() {
                    console.log($scope.newUser);
                    if (!$scope.newUser || !$scope.newUser.txtExtension || !$scope.newUser
                        .txtNameGiven || !$scope.newUser.txtNameFamily || !$scope.newUser
                        .txtEmail) {
                        $rootScope.showErrorAlert('All fields are required.');
                        return;
                    }
                    if (!usefulTools.isValidEmail($scope.newUser.txtEmail)) {
                        $rootScope.showErrorAlert('You must use a valid email address.');
                        return;
                    }
                    if ($scope.newUser.txtExtension === '998') {
                        $rootScope.showErrorAlert('998 is a reserved system extension');
                        return;
                    }
                    if (!usefulTools.isValidExtension($scope.newUser.txtExtension)) {
                        $rootScope.showErrorAlert(
                            'You must enter an extension that is 3 or 4 numbers long.'
                        );
                        return;
                    }
                    dataFactory.getDaysRemain($scope.domain.domain_uuid)
                        .then(function(response) {
                            var info = response.data.success.data;
                            // var discount = ($scope.domain.code && $scope.domain.code.discount) ? parseFloat(1.0-parseFloat($scope.domain.code.discount)/100.0) : 1.0;
                            // var per_seat = (parseFloat($scope.domain.package.package_price)*discount).toFixed(2);
                            var per_seat = parseFloat(info.per_seat);
                            var charge = (per_seat * parseFloat(info.remain) /
                                parseFloat(info.days)).toFixed(2);
                            var html = '';
                            if (info.freePeriod) {
                                html =
                                    'As your agency is currently in a free trial there is no charge today to add this user. You will be charged ' +
                                    $filter('currency')(per_seat) +
                                    '/month plus a monthly Compliance and Administrative Cost Recovery Fee (CRF) of ' +
                                    $filter('currency')(info.recovery) +
                                    ' for this user moving forward. ';
                            } else {
                                html = 'A pro-rated charge of ' + $filter(
                                        'currency')(charge) +
                                    '* will be added to your next monthly bill. You will be charged ' +
                                    $filter('currency')(per_seat) +
                                    '/month plus a monthly Compliance and Administrative Cost Recovery Fee (CRF) of ' +
                                    $filter('currency')(info.recovery) +
                                    ' for this user moving forward. <br><span style="font-size: 12px;">*($' +
                                    per_seat + '/user x ' + info.remain +
                                    ' days remaining in this month / ' + info.days +
                                    ' days this month)</span>'
                            }
                            var createConfirm = $mdDialog.confirm()
                                .title('Please Confirm')
                                .htmlContent(html)
                                .ariaLabel('Confirm')
                                .ok('I Agree')
                                .cancel('Cancel');
                            $mdDialog.show(createConfirm).then(function() {
                                $scope.processing = true;
                                $scope.newUser.txtnewdid = $rootScope.user.did;
                                if (!$scope.newUser.url_client) {
                                    $scope.newUser.url_client = (__env.symphonyUrl &&
                                        __env.symphonyUrl !== '' ?
                                        __env.symphonyUrl + '/login' :
                                        symphonyConfig.symphonyUrl +
                                        '/login');
                                }
                                var d = new Date();
                                var n = d.getTimezoneOffset();

                                $scope.newUser.tzoffset = n / 60;
                                var domainUuid;
                                // if (emulationService.emulatedCompany) {
                                //     domainUuid = emulationService.emulatedCompany.domain_uuid;
                                // } else {
                                //     domainUuid = $rootScope.user.domain.domain_uuid;
                                // }
                                domainUuid = $scope.domain.domain_uuid;
                                $scope.newUser.domainUuid = domainUuid;
                                $scope.newUser.useDid = $scope.selectedDid;
                                $scope.newUser.reservations = $scope.availableDids;
                                if ($scope.domain.isBluewave) $scope.newUser
                                    .isBluewave = true;
                                console.log($scope.newUser);

                                dataFactory.doUserCreation($scope.newUser)
                                    .then(function(response) {
                                        if (response.data.success) {
                                            if (__env.enableDebug)
                                                console.log(response.data
                                                    .success)
                                            $scope.newUser = {};
                                            $timeout(function() {
                                                $scope.processing =
                                                    false;
                                            });
                                            if ($scope.domain.isBluewave) {
                                                $rootScope.$broadcast(
                                                    'new.user.created',
                                                    response.data.success
                                                    .data);
                                            } else {
                                                var combo = _.merge(
                                                    response.data.success
                                                    .data, response
                                                    .data.success.user
                                                );
                                                $rootScope.$broadcast(
                                                    'new.user.created',
                                                    combo);
                                            }
                                            // $scope.users.push(combo);
                                            $uibModalStack.dismissAll();
                                            $rootScope.showSuccessAlert(
                                                response.data.success
                                                .message);
                                        } else if (response.data.error) {
                                            $scope.processing = false;
                                            $rootScope.showErrorAlert(
                                                response.data.error
                                                .message);
                                        }
                                    });
                            }, function(cancel) {
                                //Cancel add user
                            });
                        });

                };
            }
        };
    })
    .directive('focusOn', function($timeout) {
        return {
            restrict: 'A',
            scope: {
                dids: '<'
            },
            link: function($scope, element, attrs) {
                $scope.$on(attrs.focusOn, function(e, name) {
                    $timeout(function() {
                        element[0].focus();
                    });
                });
            }
        };
    })
    .directive('commaTel', function($filter) {
        var keyCodes = [8, 9, 37, 39, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 96, 97,
            98, 99, 100, 101, 102, 103, 104, 105, 188
        ];
        var formatInput = function(input) {
            input = input.replace(/[^0-9]/g, '');
            return $filter('tel2')(input, false);
        };
        var lastChar = function(input) {
            return input[input.length - 1];
        };
        var isCommaKeyCode = function(keyCode) {
            return keyCode === 44;
        };
        var indexOfLastComma = function(input) {
            var length = input.length;
            var reversedInput = input.split('').reverse().join('');
            if (reversedInput.indexOf(',') > -1) {
                return length - (reversedInput.indexOf(',') + 1);
            } else {
                return -1;
            }
        };
        var allowedKey = function(keyCode) {
            return !($.inArray(keyCode, keyCodes) === -1);
        };
        var shouldAddComma = function(value, keyCode) {
            var telLength = value.replace(/[^0-9]/g, '').length;
            return keyCode !== 8 &&
                telLength > 0 &&
                (value.length - indexOfLastComma(value)) === 15 &&
                lastChar(value) !== ',' &&
                keyCode !== 188;
        };
        var commaTelFormat = function(value, keyCode) {
            var returnValue;
            var telNums = value.replace(/\)\ /g, '').split(/[,\ ]/).map(function(val) {
                return val.replace(/[^0-9]/g, '');
            });

            telNums = $.map(telNums, function(telNum) {
                if (keyCode !== 8) { // backspace
                    return formatInput(telNum);
                } else {
                    return telNum;
                }
            });
            value = telNums.join(',');
            if (shouldAddComma(value, keyCode)) {
                value += ',';
            }
            return value;
        };
        return function($scope, element, attrs) {
            element.bind('keypress', function(event) {
                var keyCode = event.keyCode;
                if (!allowedKey(keyCode)) {
                    event.preventDefault();
                }
                var inputValue = commaTelFormat(element.val(), keyCode);
                if (isCommaKeyCode(keyCode)) {
                    inputValue += ',';
                }
                element.val(inputValue);
            });
        };
    })
    .directive('fileShareTable', function($rootScope, $sce, fileService, contactService, emulationService,
        $uibModalStack, FileUploader, $filter, userService, dataFactory, usefulTools,
        $window, __env, symphonyConfig, emailService) {
        return {
            restrict: 'E',
            templateUrl: 'views/cloudstorage/file-share-table.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                if (__env.enableDebug) console.log($scope.domain);
                if (__env.enableDebug) console.log($scope);
                $scope.showAddContactForm = $rootScope.showAddContactForm;
                $scope.tips = $rootScope.tips;
                $scope.user = $rootScope.user;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                fileService.getShares($rootScope.user.id, new Date(moment().subtract(30,
                        'days')), new Date())
                    .then(function(response) {
                        if (__env.enableDebug) console.log("Shared Files");
                        if (__env.enableDebug) console.log(response.shareList);
                        $scope.sharedFiles = response.shareList;
                        $scope.showTable = true;
                    });

                $scope.fsTableHeight = $window.innerHeight - 300;
                $scope.perPage = 20;
                $scope.maxSize = 50;
                $scope.predicate = 'created_at';
                $scope.reverse = true;
                $scope.currentPage = 1;
                $scope.ppOptions = [10, 20, 50, 100];
                //$rootScope.exportType = $window.localStorage.getItem("exportType");
                //$scope.simulateQuery = false;
                $scope.isDisabled = false;

                $scope.querySearch = querySearch;
                $scope.selectedItemChange = selectedItemChange;
                $rootScope.contactsSelected = [];

                $scope.contact = function(share) {
                    if (share.contact_uuid) return contactService.getContactByUuid(share.contact_uuid);
                    return contactService.getContactByEmail(share.recipient_email);
                };

                function querySearch(query) {
                    return query ? $rootScope.displayContacts.filter(filterContacts(query)) :
                        $rootScope.displayContacts;
                }

                function validateEmail(email) {
                    var re =
                        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    return re.test(email);
                }

                $scope.isEmailAddress = function(text) {
                    return validateEmail(text);
                };

                $scope.showEmail = function(email) {
                    if (email.length > 26) return email.substring(0, 13) + ' ... ' +
                        email.substring(email.length - 13);
                    return email;
                };

                $scope.useEmailAddress = function(email) {
                    var contact = {
                        contact_name_full: '',
                        contact_email_address: email,
                        contact_uuid: null
                    }
                    $rootScope.contactsSelected.push(contact);
                    $scope.selectedItem = null;
                };

                function selectedItemChange(item) {
                    if (item && item !== 'undefined') {
                        $rootScope.contactsSelected.push(item);
                        var index = $filter('getIndexbyUUID')($rootScope.displayContacts,
                            item.contact_uuid);
                        $rootScope.displayContacts.splice(index, 1);
                    }
                    $scope.selectedItem = null;
                }

                function filterContacts(query) {
                    var lowercaseQuery = angular.lowercase(query);
                    return function filterFn(contact) {
                        if (contact.name && angular.lowercase(contact.name)
                            .indexOf(lowercaseQuery) >= 0) return true;
                        if (contact.em && contact.em.indexOf(lowercaseQuery) >= 0) return true;
                        return false;
                    };
                }

                $scope.copyShareToHawksoft = function(share) {
                    share["file_size"] = share.file.file_size;
                    share.domain_uuid = $rootScope.user.domain_uuid;
                    share.user_uuid = $rootScope.user.id;
                    share.type='fileshare';
                    share.customerList = [];
                    share.title = 'Activity Action';
                    var partner = $rootScope.user.exportType.partner_code;

                    if (partner == 'ams360') {
                        $rootScope.showModalFull('/modals/ams360ActivityModal.html', share, '');
                    } else if (partner == 'qqcatalyst') {
                        $rootScope.showModalFull('/modals/qqTaskModal.html', share, '');
                    } else {
                        integrationService.copyEntityToPartner(share)
                    }
                };

                $scope.showChevron = function(predicate) {
                    return usefulTools.showChevron(predicate, $scope.predicate, $scope.reverse);
                };

                var today = new Date();
                $scope.dateFormat = 'yyyy-MM-dd';
                $scope.fromDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: new Date(2016, 1, 1),
                    maxDate: today
                };
                $scope.toDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: $scope.fromDate,
                    maxDate: today
                };
                $scope.fromDatePopup = {
                    opened: false
                };
                $scope.toDatePopup = {
                    opened: false
                };
                $scope.emulatedUser = function() {
                    return emulationService.emulatedUser;
                };

                $scope.ChangeToMinDate = function(fromDate) {
                    if (fromDate != null) {
                        if (!$scope.toDate) {
                            var ToMinDate = new Date(fromDate);
                            $scope.toDateOptions.minDate = ToMinDate;
                            $scope.toDate = ToMinDate;
                        }
                        var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() :
                            $rootScope.user.id);
                        fileService.getShares(user_uuid, $scope.fromDate, $scope.toDate)
                            .then(function(response) {
                                if (__env.enableDebug) console.log("Shared Files");
                                if (__env.enableDebug) console.log(response.shareList);
                                $scope.sharedFiles = response.shareList;
                                $scope.showTable = true;
                            });
                    }
                };
                $scope.processToDate = function(toDate) {
                    if (toDate != null) {
                        if (!$scope.fromDate) $scope.fromDate = new Date(toDate);
                        $scope.toDate = new Date(toDate);
                    }
                    var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() :
                        $rootScope.user.id);
                    fileService.getShares(user_uuid, $scope.fromDate, $scope.toDate).then(
                        function(response) {
                            if (__env.enableDebug) console.log("Shared Files");
                            if (__env.enableDebug) console.log(response.shareList);
                            $scope.sharedFiles = response.shareList;
                            $scope.showTable = true;
                        });
                };
                $scope.ChangeToMinDate();
                $scope.OpenfromDate = function() {
                    //$scope.dateSearched = false;
                    $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
                };
                $scope.OpentoDate = function() {
                    //$scope.dateSearched = false;
                    $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
                };

                $scope.searchRecipients = function(item) {
                    if (!$scope.shareSearch ||
                        (item.original_filename.toLowerCase().indexOf($scope.shareSearch
                            .toLowerCase()) != -1) ||
                        (item.noncontact && item.noncontact.name && item.noncontact.name
                            .toLowerCase().indexOf($scope.shareSearch.toLowerCase()) !=
                            -1) ||
                        (item.noncontact && item.noncontact.phone && item.noncontact.phone
                            .toLowerCase().indexOf($scope.shareSearch.toLowerCase()) !=
                            -1) ||
                        (item.noncontact && item.noncontact.email && item.noncontact.email
                            .toLowerCase().indexOf($scope.shareSearch.toLowerCase()) !=
                            -1) ||
                        (item.recipient_email.toLowerCase().indexOf($scope.shareSearch.toLowerCase()) !=
                            -1) ||
                        (item.contact && item.contact.contact_name_given.toLowerCase().indexOf(
                            $scope.shareSearch.toLowerCase()) != -1) ||
                        (item.contact && item.contact.contact_name_family.toLowerCase()
                            .indexOf($scope.shareSearch.toLowerCase()) != -1)) {
                        return true;
                    }
                    if (item.contact && item.contact.phones.length > 0) {
                        var found = false;
                        angular.forEach(item.contact.phones, function(phone) {
                            if (phone.phone_number && phone.phone_number.indexOf(
                                    $scope.shareSearch) != -1) {
                                found = true;
                            }
                        });
                        return found;
                    }
                    return false;
                };

                $scope.sortBy = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.showFileName = function(fileshare) {
                    var display = '';
                    var fileName = fileshare.uploadfile.original_filename;
                    if (fileshare.uploadfile.original_filename.length > 40) fileName =
                        fileshare.uploadfile.original_filename.substring(0, 19) +
                        ' ... ' + fileshare.uploadfile.original_filename.substring(
                            fileshare.uploadfile.original_filename.length - 19);
                    display = '<a href="' + (__env.apiUrl && __env.apiUrl !== '' ?
                            __env.apiUrl : symphonyConfig.onescreenUrl) +
                        '/media/me-download-file/' + fileshare.download_hash +
                        '?token=' + $rootScope.userToken + '" target="_blank" title="' +
                        fileshare.uploadfile.original_filename + '" >' + fileName +
                        '</a><br />Size: ' + fileshare.uploadfile.file_size;
                    return $sce.trustAsHtml(display);
                };

                $scope.filterByMonth = function(item) {
                    if ($scope.monthStart !== null && $scope.monthEnd !== null) {
                        if (item.created_at < $scope.monthStart || item.created_at >
                            $scope.monthEnd) return false;
                    }
                    return true;
                };
                $scope.monthStart = null;
                $scope.monthEnd = null;
                $scope.limitDisplay = function() {
                    $scope.monthStart = moment([0, 0, 1]).month($scope.selectMonth.display)
                        .year($scope.selectYear).format("YYYY-MM-DD");
                    $scope.monthEnd = moment([0, 0, 31]).month($scope.selectMonth.display)
                        .year($scope.selectYear).format("YYYY-MM-DD");
                };

                $scope.clearLimitDisplay = function() {
                    $scope.monthStart = null;
                    $scope.monthEnd = null;
                    $scope.selectMonth = null;
                    $scope.selectYear = null;
                };

                $scope.shareExpired = function(share) {
                    var a = moment(share.expires_at);
                    var b = moment();
                    var c = a.diff(b, 'minutes');
                    if (c < 0) return true;
                    return false;
                };

                $scope.resendFileShareNotice = function(shared_file_uuid, file_uuid) {
                    if (userService.limitReached('file')) {
                        $rootScope.showErrorAlert('You have reached the limit of ' +
                            $rootScope.user.usageLimits.file +
                            ' file shares allowed while using a Bridge Demo account.'
                        );
                        return;
                    }
                    var data = {
                        shared_file_uuid: shared_file_uuid,
                        file_uuid: file_uuid,
                        sender_name: $rootScope.user.contact_name_given + ' ' +
                            $rootScope.user.contact_name_family,
                        sender_email: $rootScope.user.email_address,
                        sender_company: $rootScope.user.contact_organization,
                        body: $scope.bodyMail
                    };
                    dataFactory.postResendFileNotice(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                        }, function(error) {
                            if (__env.enableDebug) console.log(error);
                        });
                }

                /**********  FILE UPLOAD **********/

                $scope.emailUsrs = [];
                $scope.bodyMail = '';
                $scope.mailTo = [];
                $scope.chargerVal = function(usrSel, contEml) {
                    if (__env.enableDebug) console.log("INPUT");
                    if (__env.enableDebug) console.log(usrSel);
                    if (__env.enableDebug) console.log(contEml);
                    $scope.emailUsrs = false;
                    $scope.emailUsrs = [];
                    $scope.usrSel = usrSel;
                    $scope.bodyMail = contEml;

                    usrSel.forEach(function(entry) {
                        if (entry.contact_name_full) {
                            $scope.emailUsrs.push({
                                mail: entry
                            });
                        } else if (entry.emails.email_address) {
                            $scope.emailUsrs.push({
                                mail: entry.emails.email_address
                            });
                        }
                    });
                    $scope.emailUsrs.forEach(function(entry) {
                        if (entry.mail.emails) {
                            $scope.mailTo.push(entry.mail.emails[0].email_address);
                        } else if (entry.mail.contact_name_full) {
                            $scope.mailTo.push(entry.mail.contact_name_full);
                        }
                    });
                };

                $scope.contactSelectionType = 'file';

                $rootScope.closeFilterAlert = function() {
                    $rootScope.alertError = '';
                };

                $scope.sendCloudShareFile = function(file) {
                    if (userService.limitReached('file')) {
                        $rootScope.showErrorAlert('You have reached the limit of ' +
                            $rootScope.user.usageLimits.file +
                            ' file shares allowed while using a Bridge Demo account.'
                        );
                        return;
                    }
                    var data = {
                        file_uuid: file.file_uuid,
                        upload_type: 'cloud',
                        sender_name: $rootScope.user.contact_name_given + ' ' +
                            $rootScope.user.contact_name_family,
                        sender_email: $rootScope.user.email_address,
                        sender_company: $rootScope.user.contact_organization,
                        recipients: JSON.stringify($rootScope.contactsSelected),
                        body: $scope.contentEmail
                    };
                    dataFactory.fileUpload(data)
                        .then(function(response) {
                            if (__env.enableDebug) console.log(
                                "RESPONSE FROM SENDING FILE");
                            if (__env.enableDebug) console.log(response);
                            if (response.data.success) {
                                $rootScope.contactsSelected = [];
                                $scope.msgEmailSent = true;
                            } else {
                                $rootScope.alertError = response.error.message;
                            }
                        });
                };

                $rootScope.focusonme = true;

                $rootScope.sendingFile = false;

                var uploader = $scope.uploader = new FileUploader({
                    url: (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                        symphonyConfig.onescreenUrl) + '/media/upload',
                    queueLimit: 1,
                    headers: {
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    }
                });

                uploader.filters.push({
                    'name': 'enforceMaxFileSize',
                    'fn': function(item) {
                        return item.size <= 262144000; // 250 MiB to bytes
                    }
                });
                uploader.filters.push({
                    name: 'enforceFileType',
                    fn: function(item /*{File|FileLikeObject}*/ , options) {
                        var parts = item.name.split('.');
                        var ext = parts[parts.length - 1].toLowerCase();
                        var type = '|' + item.type.slice(item.type.lastIndexOf(
                            '/') + 1) + '|';
                        console.log(type + ' ' + ext);
                        if (type === '||' && ext === 'rar') return true;
                        if (type === '||') return false;
                        return '|exe|javascript|x-msdownload|php|'.indexOf(type) ===
                            -1;
                    }
                });

                uploader.filters.push({
                    'name': 'enformDemoLimits',
                    'fn': function(item) {
                        if (userService.limitReached('file')) {
                            $rootScope.showErrorAlert(
                                'You have reached the limit of ' +
                                $rootScope.user.usageLimits.file +
                                ' file shares allowed while using a Bridge Demo account.'
                            );
                            return false;
                        }
                        return true;
                    }
                });

                // CALLBACKS
                uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ ,
                    filter, options) {
                    if (__env.enableDebug) console.info('onWhenAddingFileFailed', item,
                        filter, options);
                    $rootScope.alertError = '';
                    if (filter.name === 'enforceMaxFileSize') $rootScope.alertError +=
                        'Problem Adding File: Max file size is 250MB.';
                    if (filter.name === 'enforceFileType') $rootScope.alertError += (
                            $rootScope.alertError !== '' ? ', ' : '') +
                        'Problem Adding File: File Type Not allowed. (The following are allowable file types: pdf, odt, doc, docx, ppt, pptx, xls, xlsx, csv, txt, rtf, html, zip, mp3, mpg, jpg, jpeg, png, gif, mp4, pub, m4a, mov, vts, vob, m4v, m2ts, dvr, 264, mp4, flv, bup, mts, psd, png, MOV, mpeg-4, tar.gz, gz, rar, targz, 7z, aak, bd)';
                };
                uploader.onAfterAddingFile = function(fileItem) {
                    fileItem.file.name = fileItem.file.name.toLowerCase();
                    if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
                };
                uploader.onAfterAddingAll = function(addedFileItems) {
                    if (__env.enableDebug) console.info('onAfterAddingAll',
                        addedFileItems);
                };
                uploader.onBeforeUploadItem = function(item) {
                    if (__env.enableDebug) console.info('onBeforeUploadItem', item);
                    if (__env.enableDebug) console.log($rootScope.contactsSelected);
                    var data = {
                        sender_name: $rootScope.user.contact_name_given + ' ' +
                            $rootScope.user.contact_name_family,
                        sender_email: $rootScope.user.email_address,
                        sender_company: $rootScope.user.contact_organization,
                        recipients: JSON.stringify($rootScope.contactsSelected),
                        body: $scope.contentEmail
                    };
                    if (__env.enableDebug) console.log(data);
                    item.formData.push(data);
                };
                uploader.onProgressItem = function(fileItem, progress) {
                    if (__env.enableDebug) console.info('onProgressItem', fileItem,
                        progress);
                };
                uploader.onProgressAll = function(progress) {
                    if (__env.enableDebug) console.info('onProgressAll', progress);
                };
                uploader.onSuccessItem = function(fileItem, response, status, headers) {
                    if (__env.enableDebug) console.info('onSuccessItem', fileItem,
                        response, status, headers);
                    if (__env.enableDebug) console.log("RESPONSE FROM SENDING FILE");
                    if (__env.enableDebug) console.log(response);
                    if (response.success) {
                        $rootScope.contactsSelected = [];
                        response.success.shares.forEach(function(share) {
                            share.created_at = moment.tz(share.created_at,
                                "America/New_York");
                            if ($rootScope.user.settings.timezone) share.created_at =
                                share.created_at.clone().tz($rootScope.user.settings
                                    .timezone);
                            var noncontacts = $rootScope.nonContacts;
                            var contact = contactService.getContactByUuid(share
                                .contact_uuid);
                            if (contact) {
                                share.contact = contact;
                            } else {
                                var info = {
                                    email: share.recipient_email,
                                    phone: null,
                                    name: share.recipient_name,
                                    color: randomColor({
                                        luminosity: 'light'
                                    })
                                }
                                var noncontact = $filter('getNonContact')(
                                    noncontacts, info);
                                if (!noncontact) {
                                    $rootScope.storeNonContact(info);
                                    noncontact = info;
                                }
                                share.noncontact = noncontact;
                            }
                            share.original_filename = share.uploadfile.original_filename;
                            $rootScope.fileSharingList.push(share);
                        });
                        $scope.msgEmailSent = true;
                    } else {
                        $rootScope.alertError = response.error.message;
                    }

                    //$scope.sendEmail();
                };
                uploader.onErrorItem = function(fileItem, response, status, headers) {
                    if (__env.enableDebug) console.info('onErrorItem', fileItem,
                        response, status, headers);
                    //alert('Error...'+JSON.stringify(response));
                };
                uploader.onCancelItem = function(fileItem, response, status, headers) {
                    if (__env.enableDebug) console.info('onCancelItem', fileItem,
                        response, status, headers);
                };
                uploader.onCompleteItem = function(fileItem, response, status, headers) {
                    if (__env.enableDebug) console.info('onCompleteItem', fileItem,
                        response, status, headers);
                };
                uploader.onCompleteAll = function() {
                    if (__env.enableDebug) console.info('onCompleteAll');
                    uploader.queue.length = 0;
                };

                $scope.confCallsPartic = [];
                $scope.participant = {};
                $scope.closeFileShareModal = function() {
                    $rootScope.contactsSelected = [];
                    $rootScope.selectedContacts = {};
                    $uibModalStack.dismissAll();
                };
                $rootScope.userCts = [];
                $rootScope.chgRst = false;

                $scope.startEmailClient = function(address) {
                    emailService.startEmailClient(address);
                };

                // $scope.$on('new.contact.added', function(event, contact) {
                //     angular.forEach($scope.sharedFiles, function(share) {
                //         fileService.populateContact($rootScope.user.id, share);
                //     });
                // });
            }
        };
    })
    .directive('fileDisplayTable', function($rootScope, userService, $window, contactService,
        cloudStorageService, $timeout, $interval, __env, $uibModalStack, symphonyConfig,
        fileService, metaService) {
        var getMimetypeByFiletype = function(filetype) {
            return {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'pdf': 'application/pdf'
            } [filetype];
        };

        return {
            restrict: 'A',
            templateUrl: 'views/cloudstorage/file-display-table.html',
            scope: {
                root: '<',
                search: '=',
                uploader: '='
            },
            link: function($scope, element, attrs) {
                $scope.user = $rootScope.user;
                cloudStorageService.getAddonStorage();
                cloudStorageService.getUserRootFolder($scope.user.id).then(function(data) {
                    if (data) {
                        $scope.root = data;
                    }
                });
                $scope.cloudErrors = [];
                $scope.cloudSuccess = [];
                $scope.tips = $rootScope.tips;
                $scope.sortDown = false;
                $scope.sortFile = 'original_filename';
                $scope.sortFolder = 'folder_name';
                $scope.display = {
                    showingShares: false
                };
                $scope.isKotterTechUserByUuid = $rootScope.isKotterTechUserByUuid;
                $scope.addFolder = function() {
                    $scope.display.showingShares = false;
                    if ($scope.root.is_protected === 'true' && $scope.root.is_mobile_upload !==
                        'true' && $scope.root.folder_name !== 'Public Cloud') {
                        $rootScope.showErrorAlert(
                            'This folder is protected and you can not create new folders within it.'
                        );
                        return;
                    }
                    if (!$scope.root.dummyFolders) {
                        $scope.root.dummyFolders = [];
                    }
                    var dummyId = Math.random().toString(36);
                    var date = new Date;
                    date = date.toString();
                    $scope.root.dummyFolders.push({
                        dummyId: dummyId,
                        parent: $scope.root,
                        updated_at: date
                    });
                };
                $scope.showUploadingSpinner = function() {
                    return cloudStorageService.getNumFoldersUpdatingPerms() > 0;
                };
                $scope.getTotalSpaceUsed = function() {
                    var spaceUsed = cloudStorageService.getTotalSpaceUsed();
                    return cloudStorageService.getAppropriateFileSizeFromB(spaceUsed, 1);
                };
                $scope.userLimit = function() {
                    var limit = parseFloat($rootScope.user.symphony_domain_settings.limit_storage_user) *
                        Math.pow(1024, 2);
                    return cloudStorageService.getAppropriateFileSizeFromB(limit, 0);
                };
                $scope.domainUsage = function() {
                    return cloudStorageService.getAppropriateFileSizeFromB(parseFloat(
                        $rootScope.user.domainCloudStorageUsage), 1);
                };
                $scope.domainLimit = function() {
                    var limit = parseFloat($rootScope.user.symphony_domain_settings.limit_storage_user) *
                        Math.pow(1024, 2) * contactService.countUsers();
                    return cloudStorageService.getAppropriateFileSizeFromB(limit, 1);
                };
                var rootScopeHandlers = [];
                rootScopeHandlers.push({
                    name: 'cloud.show.error',
                    fn: function() {
                        //$scope.showErrorMsg = true;
                    }
                });
                rootScopeHandlers.push({
                    name: 'cloud.hide.error',
                    fn: function() {
                        $scope.showErrorMsg = false;
                    }
                });
                rootScopeHandlers.push({
                    name: 'cloud.show.success',
                    fn: function() {
                        $scope.showSuccessMsg = true;
                    }
                });
                rootScopeHandlers.push({
                    name: 'cloud.hide.success',
                    fn: function() {
                        $scope.showSuccessMsg = false;
                    }
                });
                metaService.multiRootScopeOn($scope, rootScopeHandlers);
                $scope.sortBy = function(filePredicate, folderPredicate) {
                    $scope.sortDown = !$scope.sortDown;
                    $scope.sortFile = filePredicate;
                    $scope.sortFolder = folderPredicate;
                };
                $scope.parentTop = function() {
                    return element.parent().position().top;
                };
                $scope.parentBottom = function() {
                    return element.parent().position().top + element.parent().height();
                };

                $rootScope.$on('addon-removed', function(event, addon) {
                    if (addon.addontype === 'cloud_storage') {
                        cloudStorageService.getAddonStorage();
                    }
                });

                $rootScope.$on('addon-added', function(event, addon) {
                    if (addon.addontype === 'cloud_storage') {
                        cloudStorageService.getAddonStorage();
                    }
                });

                $scope.showRequestFiles = function(thefolder) {
                    $rootScope.showModalFull('/modals/request-files-modal.html', {
                        onClose: $scope.onCloseModal,
                        thefolder: thefolder
                    }, 'lg');
                };
                $scope.onCloseModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.rootParent = function() {
                    var userRoot = cloudStorageService.userRootFolder;
                    return cloudStorageService.getFolderByUuid(userRoot, $scope.root.parent_folder_uuid);
                };
                $scope.onDrop = function(file, folder, $event) {
                    var root = cloudStorageService.userRootFolder;
                    var destinationFolder;
                    var currentFolder = cloudStorageService.getFolderByUuid(root, file.parent_folder_uuid);
                    cloudStorageService.moveFile(file.file_uuid, folder.folder_uuid)
                        .then(function(response) {
                            if (response) {
                                destinationFolder = cloudStorageService.getFolderByUuid(
                                    root, response.parent_folder_uuid);
                                cloudStorageService.moveFileFromFolderToFolder(
                                    response, currentFolder, destinationFolder);
                            } else {
                                file.hide = false;
                            }
                        });
                    $timeout(function() {
                        $scope.dragging = false;
                    }, 1000);
                };
                $scope.stopDrag = function($event) {
                    $event.element.css('position', 'static');
                    $timeout(function() {
                        $scope.dragging = false;
                    }, 1000);
                };
                $scope.dragStart = function($event) {
                    $scope.dragging = true;
                };
                $scope.$watch('dragging', function(newVal, oldVal) {
                    if (newVal && newVal !== oldVal) {
                        $scope.interval = $interval(function() {
                            if ($scope.dragEvent.event.pageY < $scope.parentTop()) {
                                element.parent()[0].scrollTop -= 10;
                            } else if ($scope.dragEvent.event.pageY >
                                $scope.parentBottom()) {
                                element.parent()[0].scrollTop += 10;
                            }
                        }, 10);
                    } else if (!newVal && newVal !== oldVal) {
                        $interval.cancel($scope.interval);
                    }
                });
                $scope.dragMove = function($event) {
                    $scope.dragEvent = $event;
                };
                $scope.getFileType = function(file) {
                    return fileService.getFileTypeByMimeType(file.file_mime_type);
                };
                $scope.sharedFolderOpen = 'false';
                $scope.rootPermission = null;
                $scope.openFolder = function(folder) {
                    $scope.root = folder;
                    $rootScope.currentCSRoot = $scope.root.folder_uuid;

                    if (folder.shared_folder && folder.shared_folder == 'true') {
                        $scope.sharedFolderOpen = 'true';
                        if (folder.permission) {
                            $scope.sharedPermission = folder.permission;
                        }
                    }
                };
                $scope.hasPermission = function(folder) {
                    //console.log(folder);
                    if ((folder.is_protected === 'true' && folder.is_mobile_upload !==
                            'true') ||
                        folder.user_uuid === $rootScope.user.id ||
                        (folder.permission && (folder.permission == 'viewer' || folder.permission ==
                            'manager'))) return true;
                    if (folder.permissions && folder.is_mobile_upload === 'true') {
                        var allowed = false;
                        angular.forEach(folder.permissions, function(perm) {
                            if (perm.user_uuid === $rootScope.user.id) allowed =
                                true;
                        });
                        return allowed;
                    }
                    if ($scope.sharedFolderOpen == 'true') return true;
                    return false;
                };
                $scope.getFolderType = function(folder) {
                    if (folder.shared_folder == 'true' || folder.is_protected == 'true' ||
                        $scope.sharedFolderOpen == 'true') {
                        if (folder.is_protected === 'true' && folder.is_mobile_upload !==
                            'true') return 'protected';
                        if (folder.user_uuid === $rootScope.user.id) return 'shared';
                        if (folder.user_uuid !== $rootScope.user.id) return 'owned';
                    } else {
                        return 'folder';
                    }
                    return null;
                };
                $scope.ascend = function() {
                    if ($scope.root.shared_folder && $scope.root.shared_folder ==
                        'true') {
                        $scope.sharedPermission = null;
                        $scope.sharedFolderOpen = 'false';
                    }
                    $scope.root = $scope.root.parent;
                    $rootScope.currentCSRoot = $scope.root.folder_uuid;
                };
                $scope.renameFolder = function(folder) {
                    folder.renaming = false;
                    $timeout(function() {
                        cloudStorageService.renameFolder(folder.folder_uuid,
                                folder.folder_name)
                            .then(function(response) {
                                if (response.data.error) {
                                    folder.folder_uuid = response.data.error
                                        .folder.folder_uuid;
                                }
                            });
                    });
                };
                $scope.removeFileExtensionFromFilename = function(filename) {
                    return fileService.removeFileExtensionFromFilename(filename);
                };
                $scope.getFileExtensionFromFilename = function(filename) {
                    return fileService.getFileExtensionFromFilename(filename);
                };
                $scope.renameFile = function(file, newVal) {
                    file.renaming = false;
                    newVal = newVal + '.' + $scope.getFileExtensionFromFilename(file.original_filename);
                    file.original_filename = newVal;
                    $timeout(function() {
                        cloudStorageService.renameFile(file.file_uuid, newVal)
                            .then(function(response) {
                                if (response.data.error) {
                                    file.original_filename = response.data.error
                                        .file.original_filename;
                                }
                            });
                    });
                };
                metaService.rootScopeOn($scope, 'folders.refreshed',
                    function(event, folder, currentFolderUuid) {
                        $scope.root = cloudStorageService.getFolderByUuid(folder,
                            currentFolderUuid);
                        $rootScope.currentCSRoot = $scope.root.folder_uuid;
                    });
                $scope.getFolderSize = function(file) {
                    return cloudStorageService.getFolderSize(file);
                };
                $scope.copyFile = function(file, folder) {
                    cloudStorageService.copyFile(file.file_uuid, folder.folder_uuid)
                        .then(function(response) {
                            if (response) {
                                cloudStorageService.handleDuplicateFileRename(
                                    response, $scope.root);
                            }
                        });
                };

                $scope.moveFile = function(file, folder) {
                    cloudStorageService.moveFile(file.file_uuid, folder.folder_uuid)
                        .then(function(response) {
                            if (response) {
                                cloudStorageService.handleDuplicateFileRename(
                                    response, $scope.root);
                            }
                        });
                };
                $scope.tableMenuOptions = function() {
                    return [
                        ['Paste', function($itemScope) {
                            if ($scope.copyingFile) {
                                $scope.copyFile($scope.copiedFile, $scope.root);
                            } else {
                                $scope.moveFile($scope.copiedFile, $scope.root);
                            };
                        }, function() {
                            if (__env.enableDebug) console.log($scope.copiedFile);
                            return ($scope.copiedFile && (($scope.sharedFolder &&
                                    $scope.sharedPermission ==
                                    'manager') || $scope.root.user_uuid ==
                                $rootScope.user.id));
                        }]
                    ];
                };
                $scope.isFolderManager = function(folder) {
                    if (folder.user_uuid == $rootScope.user.id) return true;
                    $go = true;
                    do {

                    } while ($go)
                    return false;
                };
                $scope.isFileManager = function(file) {
                    if (file.user_uuid == $rootScope.user.id) return true;

                    return false;
                };
                $scope.folderMenuOptions = function(thefolder) {
                    return [
                        ['Delete...', function($itemScope) {
                            var folder = $itemScope.folder;
                            var confirmation = '';
                            if (folder.files.length > 0 || folder.folders.length >
                                0) {
                                confirmation =
                                    'Are you sure you want to delete this folder and all of its contents?';
                            } else {
                                confirmation =
                                    'Are you sure you want to delete this folder?';
                            }
                            $rootScope.confirmDialog(confirmation)
                                .then(function(response) {
                                    if (response) {
                                        if (cloudStorageService.deleteFolder(
                                                folder.folder_uuid)) {
                                            cloudStorageService.removeFolderFromParentByUuid(
                                                folder.parent, folder.folder_uuid
                                            );
                                        };
                                    };
                                });

                        }, function() {
                            return (thefolder.is_protected !== 'true' && ((
                                    $scope.sharedFolderOpen && $scope.sharedPermission ==
                                    'manager') || thefolder.user_uuid ==
                                $rootScope.user.id));
                        }],
                        ['Rename', function($itemScope) {
                            $itemScope.folder.renaming = true;
                            var folderRow = angular.element("[folder-id='" +
                                thefolder.folder_uuid + "']");
                            var input = folderRow.find('input');
                            $timeout(function() {
                                input.focus();
                            });
                        }, function() {
                            return (thefolder.is_protected !== 'true' && ((
                                    $scope.sharedFolderOpen && $scope.sharedPermission ==
                                    'manager') || thefolder.user_uuid ==
                                $rootScope.user.id));
                        }],
                        ['Edit Permissions', function($itemScope) {
                            var data = {};
                            $rootScope.permissions = {};
                            $rootScope.showModalWithData(
                                '/cloudstorage/cloudpermissions-modal.html',
                                $itemScope.folder);
                        }, function() {
                            return ((thefolder.is_protected !== 'true' || (
                                thefolder.is_protected === 'true' &&
                                thefolder.is_mobile_upload ===
                                'true')) && (($scope.sharedFolder &&
                                    $scope.sharedPermission ==
                                    'manager') || thefolder.permission ==
                                'manager' || thefolder.permission ==
                                'admin' || thefolder.permission ==
                                'owner' || thefolder.user_uuid ==
                                $rootScope.user.id));
                        }],
                        isPublicCloudFolder(thefolder) ? ['Make a Sharable Link',
                            function($itemScope) {
                                var data = {};
                                console.log(thefolder);
                                $scope.showRequestFiles(thefolder);
                            },
                            function() {
                                return (isPublicCloudFolder(thefolder) && (($scope.sharedFolder &&
                                        $scope.sharedPermission ==
                                        'manager') || thefolder.permission ==
                                    'manager' || thefolder.permission ==
                                    'admin' || thefolder.permission ==
                                    'owner' || thefolder.user_uuid ==
                                    $rootScope.user.id));
                            }
                        ] : null
                    ];
                };

                function isPublicCloudFolder(folder) {
                    if (folder.is_protected === 'true' && folder.folder_name ===
                        'Public Cloud') return true;
                    if (folder.parent) return isPublicCloudFolder(folder.parent);
                    return false;
                }

                metaService.rootScopeOn($scope, 'open.search.folder', function($event,
                    value) {
                    $scope.openFolder(value);
                });

                metaService.rootScopeOn($scope, 'clear.hightlight.file', function() {
                    $scope.highlightFile = null;
                });

                metaService.rootScopeOn($scope, 'search.submitted', function() {
                    $scope.display.showingShares = false;
                });

                metaService.rootScopeOn($scope, 'show.search.file', function($event, value) {
                    $scope.highlightFile = value.file;
                    $scope.openFolder(value.parent);
                });

                $scope.showFileShareModal = function() {
                    if (userService.limitReached('file')) {
                        $rootScope.showErrorAlert('You have reached the limit of ' +
                            $rootScope.user.usageLimits.file +
                            ' files shared allowed while using a Bridge Demo account.'
                        );
                        return;
                    }
                    $scope.msgEmailSent = false;
                    $rootScope.contactsSelected = [];
                    $rootScope.showModalWithData('/modals/filesharingmodal.html', {
                        onClose: $scope.closeFileShareModal
                    });
                };

                $scope.dummyFolderMenuOptions = function() {
                    return [
                        ['Delete...', function($itemScope) {
                            var folder = $itemScope.folder;
                            cloudStorageService.removeDummyFolderFromParentByUuid(
                                folder.parent, folder.dummyId);
                        }]
                    ];
                };
                $scope.getItemCount = function() {
                    var total = 0;
                    if ($scope.root) {
                        if ($scope.root.files) {
                            total += $scope.root.files.length;
                        }
                        if ($scope.root.folders) {
                            total += $scope.root.folders.length;
                        }
                        return total;
                    } else {
                        return undefined;
                    }
                };
                $scope.apiUrl = __env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                    symphonyConfig.onescreenUrl;
                $scope.token = $rootScope.userToken;
                $scope.downloadFile = function(file) {
                    var apiUrl = __env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                        symphonyConfig.onescreenUrl;
                    var url = apiUrl + '/cloud/downloadfile/' + file.file_uuid + '/' +
                        false;
                    fileService.downloadFileByUrl(url);
                };
                metaService.rootScopeOn($scope, 'cloud.progress.bar.percentage',
                    function($event, value) {
                        $scope.progressBarPercentage = value;
                    });
                $scope.closeFileShareModal = function() {
                    $rootScope.contactsSelected = [];
                    $rootScope.selectedContacts = {};
                    $uibModalStack.dismissAll();
                };

                function fileEditAllowed(parent, thefile) {
                    return parent &&
                        (parent.permission === 'admin' || parent.permission === 'manager' ||
                            parent.permission === 'owner') ||
                        ($scope.sharedFolderOpen && $scope.sharedPermission == 'manager') ||
                        thefile.user_uuid == $rootScope.user.id;
                }

                $scope.fileMenuOptions = function(thefile) {
                    if (__env.enableDebug) console.log(thefile);
                    var userRoot = cloudStorageService.userRootFolder;
                    var parentfolder = cloudStorageService.getFolderByUuid(userRoot,
                        thefile.parent_folder_uuid);
                    if (__env.enableDebug) console.log(parentfolder);
                    return [
                        ['Download', function($itemScope) {
                            var file = $itemScope.file;
                            $scope.downloadFile(file);
                        }],
                        ['Share File', function($itemScope) {
                            var file = $itemScope.file;
                            if (__env.enableDebug) console.log("FILE");
                            if (__env.enableDebug) console.log(file);
                            file.onClose = $scope.closeFileShareModal;
                            var data = {};
                            $rootScope.showModalWithData(
                                '/cloudstorage/fileshare-modal.html', file);
                        }],
                        ['Delete...', function($itemScope) {
                            var file = $itemScope.file;
                            $rootScope.confirmDialog(
                                    'Are you sure you want to delete this file?'
                                )
                                .then(function(response) {
                                    if (response) {
                                        if (cloudStorageService.deleteFile(
                                                file.file_uuid)) {
                                            var userRoot =
                                                cloudStorageService.userRootFolder;
                                            var parent =
                                                cloudStorageService.getFolderByUuid(
                                                    userRoot, file.parent_folder_uuid
                                                );
                                            cloudStorageService.removeFileFromParentByUuid(
                                                parent, file.file_uuid);
                                        };
                                    };
                                });
                        }, function() {
                            return (fileEditAllowed(parentfolder, thefile));
                        }],
                        ['Rename', function($itemScope) {
                            $itemScope.file.renaming = true;
                        }, function() {
                            return (fileEditAllowed(parentfolder, thefile));
                        }],
                        ['Cut', function($itemScope) {
                            var file = $itemScope.file;
                            var userRoot = cloudStorageService.userRootFolder;
                            var parent = cloudStorageService.getFolderByUuid(
                                userRoot, file.parent_folder_uuid);
                            $scope.copiedFile = file;
                            cloudStorageService.removeFileFromParentByUuid(
                                parent, file.file_uuid);
                        }, function() {
                            return (fileEditAllowed(parentfolder, thefile));
                        }],
                        ['Copy', function($itemScope) {
                            var file = $itemScope.file;
                            //var userRoot = cloudStorageService.userRootFolder;
                            //var parent = cloudStorageService.getFolderByUuid(userRoot, file.parent_folder_uuid);
                            $scope.copiedFile = file;
                            $scope.copyingFile = true;
                            //cloudStorageService.removeFileFromParentByUuid(parent, file.file_uuid);
                        }, function() {
                            return (fileEditAllowed(parentfolder, thefile));
                        }],
                        ['Paste', function($itemScope) {
                            if ($scope.copyingFile) {
                                cloudStorageService.copyFile($scope.copiedFile.file_uuid,
                                    $scope.root.folder_uuid).then(function(
                                    response) {
                                    if (response) {
                                        $scope.root.files.push(response);
                                    }
                                });
                            } else {
                                cloudStorageService.moveFile($scope.copiedFile.file_uuid,
                                    $scope.root.folder_uuid).then(function(
                                    response) {
                                    if (response) {
                                        $scope.root.files.push(response);
                                    }
                                });
                            }
                        }, function() {
                            return ($scope.copiedFile && (fileEditAllowed(
                                parentfolder, thefile)));
                        }]
                    ];
                };
                $scope.viewFile = function(file) {
                    if (!$scope.dragging) {
                        if (file.file_type === 'image') {
                            var base64 = true;
                            cloudStorageService.downloadFile(file.file_uuid, base64).then(
                                function(response) {
                                    if (!$scope.dragging) {
                                        var src = 'data:' + file.file_mime_type +
                                            ';base64, ' + response.file;
                                        var imageTypes = ['jpg', 'gif', 'png',
                                            'jpeg'
                                        ];
                                        if (file.file_type === 'image') {
                                            $rootScope.showModalWithData(
                                                '/fax/viewfaximage.html', {
                                                    obj: src
                                                });
                                        } else if (file.file_type === 'pdf') {
                                            $window.open(src);
                                        } else {
                                            angular.element('#download_link').attr(
                                                'href', src);
                                            angular.element('#download_link').attr(
                                                'download', file.original_filename
                                            );
                                            angular.element('#download_link')[0].click();
                                        }
                                    }
                                });
                        } else {
                            $scope.downloadFile(file);
                        }
                    }
                };

                angular.element('html').on('dragover', function() {
                    angular.element('.cloud-scroll-body').addClass('nv-file-over');
                });

                angular.element('html').on('mouseleave', function() {
                    // if (!angular.element('.cloud-scroll-body').is(":hover")) {
                    if (!angular.element('.cloud-scroll-body:hover')) {
                        angular.element('.nv-file-over').removeClass('nv-file-over');
                    }
                });

                angular.element('.cloud-scroll-body').on('dragover', false).on('drop',
                    function($event) {
                        if ($event.target.hasAttribute('cloud-folder')) {
                            var folder = angular.element($event.target).scope().folder;
                            $scope.dropFolder = folder;
                        }
                    });

                metaService.rootScopeOn($scope, 'updateCloudStorage', function(event,
                    status) {
                    if (status) {
                        if (__env.enableDebug) console.log($scope.root);
                        cloudStorageService.getUserRootFolder($rootScope.user.id).then(
                            function(data) {
                                if (data) {
                                    cloudStorageService.userRootFolder = data;
                                    $scope.root = cloudStorageService.getFolderByUuid(
                                        cloudStorageService.userRootFolder,
                                        $scope.root.folder_uuid);
                                    if (__env.enableDebug) console.log(data);
                                    if (__env.enableDebug) console.log($scope.root);
                                    $rootScope.updateCloudStorage = false;

                                }
                            });
                    }
                });

                /************************************************ */
                // Uploader Configuration
                /************************************************ */

                $scope.uploader.filters.push({
                    'name': 'enforceMaxFileSize',
                    'fn': function(item) {
                        return item.size <= 262144000; // 250 MiB to bytes
                    }
                });

                $scope.uploader.filters.push({
                    name: 'cloudFilter',
                    fn: function(item /*{File|FileLikeObject}*/ , options) {
                        var type = item.type;
                        if (__env.enableDebug) console.log("type = " + type);
                        if (!item.type) {
                            return true;
                        }
                        var result = fileService.allowedCloudStorageMimeTypes.indexOf(
                            type) > -1;
                        return result;
                    }
                });

                $scope.uploader.filters.push({
                    name: 'usageFilter',
                    fn: function(item, options) {
                        if (__env.enableDebug) console.log(item);
                        var newsize = parseFloat($rootScope.user.domainCloudStorageUsage) +
                            item.size;
                        if (__env.enableDebug) console.log(newsize);
                        return newsize < parseFloat($rootScope.user.symphony_domain_settings
                                .limit_storage_user) * Math.pow(1024, 2) *
                            contactService.countUsers();
                    }
                });

                var getMimetypeByFiletype = function(filetype) {
                    return {
                        'jpg': 'image/jpeg',
                        'jpeg': 'image/jpeg',
                        'pdf': 'application/pdf'
                    } [filetype];
                };

                $scope.triggerUpload = function() {
                    $scope.display.showingShares = false;
                    if ($scope.root.is_protected === 'true' && $scope.root.is_mobile_upload !==
                        'true' && $scope.root.folder_name !== 'Public Cloud') {
                        $rootScope.showErrorAlert(
                            'This folder is protected and you can not add new files to it.'
                        );
                        return;
                    }
                    $scope.uploader.clearQueue();
                    angular.element('#cloud-upload').trigger('click');
                };

                $scope.closeError = function() {
                    // $scope.errorMsg = null;
                    $scope.cloudErrors = [];
                    // $scope.showErrorMsg = false;
                };
                $scope.closeSuccess = function(index) {
                    $scope.cloudSuccess.splice(index, 1);
                    // $scope.successMsg = null;
                    // $scope.showSuccessMsg = false;
                };

                // CALLBACKS
                $scope.uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ ,
                    filter, options) {
                    console.info('onWhenAddingFileFailed', item, filter, options);
                    $scope.showErrorMsg = true;
                    if (__env.enableDebug) console.log(item);
                    if (__env.enableDebug) console.log(filter);
                    if (filter.name === 'cloudFilter') $scope.errorMsg = item.name +
                        ': This file type is not permitted';
                    if (filter.name === 'usageFilter') $scope.errorMsg = item.name +
                        ': Uploading would exceed the domain storage limit. Contact The Kotter Group to arrange for an increase in your storage limits.';
                    if (filter.name === 'enforceMaxFileSize') $scope.errorMsg = item.name +
                        ': Problem Adding File: Max file size is 250MB.';
                    // console.log($scope.errorMsg);
                    $scope.cloudErrors.push({
                        message: $scope.errorMsg
                    });
                    // $rootScope.$broadcast('cloud.show.error');
                };
                $scope.uploader.onAfterAddingFile = function(fileItem) {
                    console.info('onAfterAddingFile', fileItem);
                    $scope.queueFileName = fileItem['_file'].name;
                };
                $scope.uploader.onAfterAddingAll = function(addedFileItems) {
                    console.info('onAfterAddingAll', addedFileItems);
                    if (__env.enableDebug) console.log('sending');
                    $timeout(function() {
                        $scope.uploader.uploadAll();
                    });
                };
                $scope.fileNameExistsInFolder = function(fileName, folder) {
                    return cloudStorageService.fileNameExistsInFolder(fileName, folder);
                };
                $scope.incrementFileName = function(fileName) {
                    return cloudStorageService.incrementFileName(fileName);
                };
                $scope.uploader.onBeforeUploadItem = function(item) {
                    var incrementedFileName;
                    var parent = $scope.dropFolder ? $scope.dropFolder : $scope.root;
                    var data = {
                        parent_folder_uuid: parent.folder_uuid
                    };
                    var fileName = $scope.removeFileExtensionFromFilename(item._file.name);
                    var extension = $scope.getFileExtensionFromFilename(item._file.name);
                    while ($scope.fileNameExistsInFolder(fileName + '.' + extension,
                            parent)) {
                        fileName = $scope.incrementFileName(fileName);
                    }
                    data.file_name = fileName + '.' + extension;
                    item.formData.push(data);
                };
                $scope.uploader.onProgressItem = function(fileItem, progress) {
                    console.info('onProgressItem', fileItem, progress);
                    $scope.currentItem = fileItem;
                };
                $scope.deleteCurrent = function() {
                    $scope.currentItem.remove();
                    $scope.progressBarPercentage = 0;
                };
                $scope.uploader.onProgressAll = function(progress) {
                    console.info('onProgressAll', progress);
                };
                $scope.uploader.onSuccessItem = function(fileItem, response, status,
                    headers) {
                    console.info('onSuccessItem', fileItem, response, status, headers);
                    if (__env.enableDebug) console.log("RESPONSE FROM SENDING FILE");
                    if (__env.enableDebug) console.log(response);
                    $scope.progressBarPercentage = 0;
                    $scope.$apply();
                    if (response.success) {
                        cloudStorageService.handleSuccessfulUserFileUpload(response.success
                            .data);
                        $scope.showErrorMsg = false;
                        $rootScope.$broadcast('cloud.hide.error');
                        // $scope.showSuccessMsg = true;
                        // $rootScope.$broadcast('cloud.show.success');
                        $scope.successMsg = fileItem.file.name +
                            ' was uploaded successfully';
                        $scope.cloudSuccess.push({
                            message: fileItem.file.name +
                                ' was uploaded successfully'
                        });
                        // $timeout(function() {
                        //     $scope.showSuccessMsg = false;
                        //     $scope.successMsg = null;
                        //     $rootScope.$broadcast('cloud.hide.success');
                        // }, 5000);
                    } else {
                        $scope.showErrorMsg = true;
                        $scope.errorMsg = fileItem.file.name + ': ' + response.error.message;
                        $scope.cloudErrors.push({
                            message: $scope.errorMsg
                        });
                        $rootScope.$broadcast('cloud.show.error');
                    }
                };
                $scope.progressBarPercentage = 0;
                $scope.$watch('uploader.progress', function(newVal, oldVal) {
                    if (newVal !== oldVal && newVal > 1) {
                        $scope.progressBarPercentage = newVal;
                    } else if (newVal === 0) {}
                });
                $scope.uploader.onErrorItem = function(fileItem, response, status, headers) {
                    console.info('onErrorItem', fileItem, response, status, headers);
                    alert('Error...' + JSON.stringify(response));
                };
                $scope.uploader.onCancelItem = function(fileItem, response, status, headers) {
                    console.info('onCancelItem', fileItem, response, status, headers);
                };
                $scope.uploader.onCompleteItem = function(fileItem, response, status,
                    headers) {
                    console.info('onCompleteItem', fileItem, response, status, headers);
                };
                $scope.uploader.onCompleteAll = function() {
                    console.info('onCompleteAll');
                    $scope.dropFolder = undefined;
                    $scope.uploader.clearQueue();
                };
                $scope.showShareLogs = function() {
                    $scope.display.showingShares = true;
                };
                $scope.showFolders = function() {
                    $scope.display.showingShares = false;
                };
            }
        };
    })
    .directive('dummyFolderInput', function(cloudStorageService, $timeout, $rootScope) {
        return {
            restrict: 'A',
            scope: {
                folder: '<'
            },
            link: function($scope, element, attrs) {

                element.focus();
                $scope.createFolder = function() {
                    $scope.$apply(function() {
                        var currentFolderUuid = $scope.folder.folder_uuid;
                        cloudStorageService.createFolder($scope.folder.parent.folder_uuid,
                            $scope.folder.folder_name);
                    });
                };
                element.on("keydown", function(e) {
                    if (e.which === 13) {
                        $scope.$apply(function() {
                            var target = e.target;
                            target.blur();
                        });
                        e.preventDefault();
                    }
                });
                element.on('focusout', function(event) {
                    $timeout(function() {
                        if ($scope.folder.folder_name) {
                            element.attr('style', 'display: none;');
                            $scope.createFolder();
                        } else {
                            $scope.folder.parent.dummyFolders.pop();

                        }
                    });
                });
                $scope.$watch('folder.folder_name', function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        if (__env.enableDebug) console.log(newVal);
                    };
                });
            }
        };
    })
    .directive('ngFocusOn', function($timeout, $rootScope) {
        return {
            restrict: 'A',
            link: function($scope, element, attrs) {
                $scope.$watch(attrs.focusEvent, function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        $timeout(function() {
                            element.focus();
                        });
                    }
                });
            }
        };
    })
    .directive("fileread", function($rootScope) {
        return {
            scope: {
                opts: '='
            },
            link: function($scope, $elm, $attrs) {
                $elm.on('change', function(changeEvent) {
                    var reader = new FileReader();
                    $scope.$apply(function() {
                        // console.log($scope.$parent.ctrl.loadingFile);
                        // $scope.$parent.ctrl.loadingFile = true;
                        // console.log($scope.$parent.ctrl.loadingFile);

                        $scope.loadingFile = true;
                    });
                    reader.onload = function(evt) {
                        
                        $scope.$apply(function() {
                            var data = evt.target.result;

                            var workbook = XLSX.read(data, {
                                type: 'binary'
                            });
                            if (__env.enableDebug) console.log(workbook);
                            var headerNames = XLSX.utils.sheet_to_json(
                                workbook.Sheets[workbook.SheetNames[
                                    0]], {
                                    header: 1
                                })[0];
                            if (__env.enableDebug) console.log(
                                headerNames);
                            var data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                            if (__env.enableDebug) console.log(data);
                            $scope.opts.columnDefs = [];
                            headerNames.forEach(function(h) {
                                $scope.opts.columnDefs.push({
                                    field: h
                                });
                            });

                            $scope.opts.data = data;
                            if (__env.enableDebug) console.log(
                                $scope.opts);
                            $elm.val(null);
                            $rootScope.$broadcast('finished.loading.spreadsheet.file');
                            
                        });
                    };
                    //$scope.$parent.ctrl.loadingFile = false;
                    $scope.loadingFile = false;
                    reader.readAsBinaryString(changeEvent.target.files[0]);
                });
            }
        }
    })
    .directive('ngCsvImport', function($rootScope, metaService) {
        return {
            restrict: 'E',
            transclude: true,
            replace: true,
            scope: {
                content: '=?',
                header: '=?',
                headerVisible: '=?',
                separator: '=?',
                separatorVisible: '=?',
                result: '=?',
                encoding: '=?',
                encodingVisible: '=?',
                accept: '=?',
                acceptSize: '=?',
                acceptSizeExceedCallback: '=?',
                callback: '=?',
                mdButtonClass: '@?',
                mdInputClass: '@?',
                mdButtonTitle: '@?',
                mdSvgIcon: '@?',
                uploadButtonLabel: '='
            },
            template: function(element, attrs) {
                var material = angular.isDefined(attrs.material);
                var multiple = angular.isDefined(attrs.multiple);
                return '<label class="btn btn-default btn-file btn-block" style="border-top-left-radius: 5; border-bottom-left-radius: 5;">' +
                    '<span class="cls-color-blue-tkg"><i class=" fa fa-file-text-o cls-color-blue-tkg" style="margin-right: 10px;"></i> Import a csv file</span>' +
                    '<input ng-model="filename" type="file" accept="{{accept}}" multiple="{{multiple}}" style="display: none;" />' +
                    '</label></div>';
            },
            link: function(scope, element, attrs) {
                if (__env.enableDebug) console.log(element);
                scope.acceptSize = scope.acceptSize || Number.POSITIVE_INFINITY;
                scope.material = angular.isDefined(attrs.material);
                scope.multiple = angular.isDefined(attrs.multiple);
                if (scope.multiple) {
                    throw new Error("Multiple attribute is not supported yet.");
                }
                var input = angular.element(element[0].querySelector('input[type="file"]'));
                var inputContainer = angular.element(element[0].querySelector(
                    'md-input-container'));

                if (scope.material && input) {
                    input.removeClass("ng-show");
                    input.addClass("ng-hide");
                    if (inputContainer) {
                        var errorSpacer = angular.element(inputContainer[0].querySelector(
                            'div.md-errors-spacer'));
                        if (errorSpacer) {
                            errorSpacer.remove();
                        }
                    }
                    scope.onClick = function() {
                        console.log("CLICKED");
                        input.click();
                    };
                }

                angular.element(element[0].querySelector('.separator-input')).on('keyup',
                    function(e) {
                        if (scope.content != null) {
                            var content = {
                                csv: scope.content,
                                header: scope.header,
                                separator: e.target.value,
                                encoding: scope.encoding
                            };
                            scope.result = csvToJSON(content);
                            scope.$apply();
                            if (typeof scope.callback === 'function') {
                                scope.callback(e);
                            }
                        }
                    });

                metaService.rootScopeOn(scope, 'clear.csv.filename', function() {
                    input = angular.element(element[0].querySelector(
                        'input[type="file"]'));
                    angular.element(input).val(null);
                });

                element.on('change', function(onChangeEvent) {
                    if (__env.enableDebug) console.log("Changing");
                    if (__env.enableDebug) console.log(onChangeEvent);
                    scope.$apply(function() {
                        console.log(scope.$parent.ctrl.loadingCsvFile);
                        scope.$parent.ctrl.loadingCsvFile = true;
                    });
                    if (!onChangeEvent.target.files.length) {
                        return;
                    }

                    if (onChangeEvent.target.files[0].size > scope.acceptSize) {
                        if (typeof scope.acceptSizeExceedCallback === 'function') {
                            scope.acceptSizeExceedCallback(onChangeEvent.target.files[
                                0]);
                        }
                        return;
                    }

                    scope.filename = onChangeEvent.target.files[0].name;
                    var reader = new FileReader();
                    reader.onload = function(onLoadEvent) {
                        scope.$apply(function() {
                            var content = {
                                csv: onLoadEvent.target.result.replace(
                                    /\r\n|\r/g, '\n'),
                                header: scope.header,
                                separator: scope.separator
                            };
                            scope.content = content.csv;
                            scope.result = csvToJSON(content);
                            scope.result.filename = scope.filename;
                            scope.$$postDigest(function() {
                                if (typeof scope.callback ===
                                    'function') {
                                    scope.callback(
                                        onChangeEvent);
                                }
                                scope.$parent.ctrl.loadingCsvFile = false;
                            });
                        });
                    };

                    if ((onChangeEvent.target.type === "file") && (onChangeEvent.target
                            .files != null || onChangeEvent.srcElement.files !=
                            null)) {
                        reader.readAsText((onChangeEvent.srcElement ||
                            onChangeEvent.target).files[0], scope.encoding);
                    } else {
                        if (scope.content != null) {
                            var content = {
                                csv: scope.content,
                                header: !scope.header,
                                separator: scope.separator
                            };
                            scope.result = csvToJSON(content);
                            scope.$$postDigest(function() {
                                if (typeof scope.callback === 'function') {
                                    scope.callback(onChangeEvent);
                                }
                            });
                        }
                    }
                });

                var csvToJSON = function(content) {
                    var lines = content.csv.split(new RegExp(
                        '\n(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)'));
                    var result = [];
                    var start = 0;
                    var columnCount = lines[0].split(content.separator).length;

                    var headers = [];
                    if (content.header) {
                        headers = lines[0].split(content.separator);
                        start = 1;
                    }

                    for (var i = start; i < lines.length; i++) {
                        var obj = {};
                        var currentline = lines[i].split(new RegExp(content.separator +
                            '(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)'));
                        if (currentline.length === columnCount) {
                            if (content.header) {
                                for (var j = 0; j < headers.length; j++) {
                                    obj[headers[j]] = cleanCsvValue(currentline[j]);
                                }
                            } else {
                                for (var k = 0; k < currentline.length; k++) {
                                    obj[k] = cleanCsvValue(currentline[k]);
                                }
                            }
                            result.push(obj);
                        }
                    }
                    scope.$parent.ctrl.loadingCsvFile = false;
                    return result;
                };

                var cleanCsvValue = function(value) {
                    return value
                        .replace(/^\s*|\s*$/g, "") // remove leading & trailing space
                        .replace(/^"|"$/g, "") // remove " on the beginning and end
                        .replace(/""/g, '"'); // replace "" with "
                };
            }
        };
    })
    .directive('ngMaterialCollapse', function($timeout, $rootScope, $interval, metaService) {
        return {
            restrict: 'A',
            link: function($scope, element, attrs) {
                // console.log(attrs);
                // console.log(attrs.open);
                var toolbar = element.find('md-toolbar');
                var content = element.find('.collapsible-content');
                toolbar.css('cursor', 'pointer');
                toolbar.addClass('settings-toolbar-collapsed');
                $scope.isCollapsedVertical = true;
                $scope.debug = function() {
                    var s = $scope;
                };
                $timeout(function() {
                    if (attrs.open) {
                        $scope.open();
                    }
                }, 2000);
                metaService.rootScopeOn($scope, 'settings.accordion', function() {
                    $scope.close();
                });
                metaService.rootScopeOn($scope, 'set.attendant.tab', function(e, value) {
                    console.log(value);
                    // if (value === $scope.tabType) {
                    //     $scope.open();
                    // } else if (value) {
                    //     $scope.close();
                    // }
                });
                $scope.close = function() {
                    $scope.isCollapsedVertical = true;
                    toolbar.removeClass('settings-toolbar-open');
                    toolbar.addClass('settings-toolbar-collapsed');
                };
                $scope.open = function() {
                    $rootScope.$broadcast('settings.accordion');
                    $scope.isCollapsedVertical = false;
                    toolbar.removeClass('settings-toolbar-collapsed');
                    toolbar.addClass('settings-toolbar-open');
                    $timeout(function() {
                        var input = content.find('input')[0];
                        if (input) {
                            input.focus();
                        }
                    });
                };
                toolbar.click(function() {
                    $timeout(function() {
                        if ($scope.isCollapsedVertical) {
                            $scope.open();
                        } else {
                            $scope.close();
                        }
                    });
                });
            }
        };
    })
    .directive('blurToCurrency', function($filter) {
        return {
            scope: {
                amount: '='
            },
            link: function(scope, el, attrs) {

                el.val($filter('currency')(scope.amount));

                el.bind('focus', function() {
                    el.val(scope.amount);
                });

                el.bind('input', function() {
                    scope.amount = el.val();
                    scope.$apply();
                });
                //    ng-pattern="/^[0-9]*\.[0-9]*$/"

                el.bind('blur', function() {
                    el.val($filter('currency')(scope.amount));
                });
            }
        }
    })
    .directive('currencyFormatter', ['$filter', function($filter) {
        var formatter = function(num) {

            return $filter('currency')(num);
        };
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attr, ngModel) {
                ngModel.$parsers.push(function(str) {
                    if (str && str.substring(0, 1) === '$') str = str.substring(
                        1);
                    return str ? Number(str) : '';
                });
                ngModel.$formatters.push(formatter);

                element.bind('blur', function() {
                    element.val(formatter(ngModel.$modelValue))
                });
                element.bind('focus', function() {
                    element.val();
                });
            }
        };
    }])
    .directive('currencyFormatterNoDollar', ['$filter', function($filter) {
        var formatter = function(num) {
            return $filter('currency')(num).substring(1);
        };
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attr, ngModel) {
                ngModel.$parsers.push(function(str) {
                    if (str && str.substring(0, 1) === '$') str = str.substring(
                        1);
                    return str ? Number(str) : '';
                });
                ngModel.$formatters.push(formatter);

                element.bind('blur', function() {
                    element.val(formatter(ngModel.$modelValue));
                });
                element.bind('focus', function() {
                    element.val(ngModel.$modelValue);
                });
            }
        };
    }])
    .directive('companySetupIntegrationsTab', function($rootScope, dataFactory, emulationService,
        greenboxService, $timeout, contactService) {
        return {
            restrict: 'E',
            templateUrl: 'views/settings/company-setup-integration-settings.html',
            scope: {},
            link: function($scope, element, attrs) {

                $scope.user = $rootScope.user;
                $scope.partner = $rootScope.user.exportType.partner_code;
                //$scope.data = $rootScope.user.domain.integration_settings;
                function loadAgencySettings() {
                    greenboxService.agencyIntegrationSettings(getCurrentDomainUuid())
                        .then(function(response) {
                            if (response != null) {
                                $scope.data = response;
                                $scope.showInputBox = false;
                                $scope.isHawksoft = $scope.data.partner_code ==
                                    'hawksoft' ? true : false;
                                $scope.isAms360 = $scope.data.partner_code == 'ams360' ?
                                    true : false;
                                $scope.isAgencyMatrix = $scope.data.partner_code ==
                                    'agencymatrix' ? true : false;
                                $scope.isEZLynx = $scope.data.partner_code == 'ezlynx' ?
                                    true : false;
                                $scope.isEAgent = $scope.data.partner_code == 'e-agent' ?
                                    true : false;
                                $scope.isQQCatalyst = $scope.data.partner_code ==
                                    'qqcatalyst' ? true : false;
                                $scope.isEpic = $scope.data.partner_code == 'epic' ?
                                    true : false;

                                if ($scope.isAgencyMatrix || $scope.isEZLynx || $scope.isEAgent ||
                                    $scope.isEpic) {
                                    $scope.showInputBox = true;
                                }
                                if ($scope.data.api_url) {
                                    if ($scope.isAms360 && !$scope.data.api_url.includes(
                                            'ams360')) {
                                        $scope.data.api_url = null;
                                    } else if ($scope.isAgencyMatrix && !$scope.data.api_url
                                        .includes('agencymatrix')) {
                                        $scope.data.api_url = null;
                                    } else if ($scope.isEZLynx && !$scope.data.api_url.includes(
                                            'ezlynx')) {
                                        $scope.data.api_url = null;
                                    } else if ($scope.isEAgent && !$scope.data.api_url.includes(
                                            'eagent')) {
                                        $scope.data.api_url = null;
                                    } else if ($scope.isQQCatalyst && !$scope.data.api_url
                                        .includes('qqcatalyst')) {
                                        $scope.data.api_url = null;
                                    }
                                }
                            }
                        });
                }

                loadAgencySettings();

                $rootScope.$on('load.integration.settings', function($event) {
                    loadAgencySettings();
                });

                $scope.loadManagementSystems = function() {
                    dataFactory.getManagementSystems()
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.managementSystems = response.data.success.data;
                            }
                        });
                }

                $scope.loadManagementSystems();

                $scope.saveIntegration = function(data) {
                    dataFactory.updateAgencyIntegration(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {

                            }
                        });
                }

                function getCurrentDomainUuid() {
                    return emulationService.getCurrentDomainUuid();
                };

                $scope.changeMngSys = function(selectedData) {
                    var data = {
                        domain_uuid: getCurrentDomainUuid(),
                        management_uuid: selectedData
                    }
                    dataFactory.updateManagementSystem(data)
                        .then(function(response) {
                            if (response.data.success) {
                                loadAgencySettings();
                                if (getCurrentDomainUuid() === $rootScope.user.domain_uuid) {
                                    $rootScope.user.exportType = response.data.success.data;
                                    contactService.changeParterType();
                                }
                            }
                        });
                }

                var filepath = '';
                var hsfilepath = '';
                if ($rootScope.user.greenbox_inboxFP) {
                    filepath = $rootScope.user.greenbox_inboxFP;
                }
                if ($rootScope.user.greenbox_hsFP) {
                    hsfilepath = $rootScope.user.greenbox_hsFP;
                }

                $scope.loginLogout = function(token) {
                    if (token != '') {
                        token = $rootScope.userToken;
                    }

                    var data = {
                        token: token,
                        user_ext: $scope.user.user_ext,
                        domain_uuid: $scope.user.domain_uuid,
                        domain_name: $scope.user.domain.domain_name,
                        user_uuid: $scope.user.user_uuid,
                        screenshot_frequency: $scope.user.tk_screenshot_freq,
                        esl_password: '',
                        inbox_file_path: {
                            path: filepath,
                            status: ''
                        },
                        hs_file_path: {
                            path: hsfilepath,
                            status: ''
                        },
                        popupAfterAnswer: ($scope.user.popupAfterAnswer && $scope.user.popupAfterAnswer == 'true') ? 'true' : null,
                    openScreenPop: ($scope.user.openScreenPop && $scope.user.openScreenPop == 'true') ? 'true' : null,
                    screenPopPartner: ($scope.user.screenPopPartner && $scope.user.screenPopPartner == 'true') ? 'true' : null,
                        partner_code: $scope.user.exportType.partner_code
                    }

                    $scope.json = angular.toJson(data);

                    greenboxService.refreshOnDemand($scope.json);
                }

                $scope.refresh = function() {
                    $scope.loginLogout('');

                    $timeout(function() {
                        logingreenbox('token');
                    }, 1000);
                }

                function logingreenbox(param) {
                    $scope.loginLogout(param);
                }

                $scope.$on('update.integration.settings', function($event, data) {
                    if (data.domain_uuid == getCurrentDomainUuid()) {
                        $scope.data = data;
                        if ($scope.partner == 'hawksoft' || $scope.partner == 'generic') $scope.refresh();
                    }
                });


                $scope.$on('update.agency.integration.settings', function($event, data) {
                    if (data.domain_uuid == getCurrentDomainUuid()) {
                        greenboxService.agencyIntegrationSettings(data.domain_uuid)
                            .then(function(response) {
                                if (response != null) {
                                    $rootScope.user.domain.integration_settings =
                                        response;
                                    $scope.data = $rootScope.user.domain.integration_settings;
                                    loadAgencySettings();
                                }
                            });

                        $rootScope.user.exportType.partner_code = data.partner_code;
                        $rootScope.user.exportType.partner_name = data.partner_name;
                        $rootScope.user.exportType.partner_icon = data.partner_icon;

                        if ($scope.partner == 'hawksoft' || $scope.partner == 'generic') $scope.refresh();
                    }
                });
            }
        };
    })
    .directive('avatarUpload', function($timeout, $rootScope, FileUploader) {
        return {
            restrict: 'E',
            templateUrl: 'views/settings/avatar-upload.html',
            scope: {
                uploader: '='
            },
            link: function($scope, element, attrs) {

                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.user = $rootScope.user;


                $scope.triggerUpload = function() {
                    $scope.uploader.url = $rootScope.onescreenBaseUrl +
                        '/user/change-picture';
                    $rootScope.uploaderOption = '/user/change-picture';
                    //$scope.uploader.clearQueue();
                    angular.element('#cloud-upload').trigger('click');
                };
                $scope.uploader.onAfterAddingFile = function(fileItem) {
                    console.info('onAfterAddingFile', fileItem);
                    if ($rootScope.uploaderOption === '/user/change-picture') {
                        $scope.uploader.uploadAll();
                    }
                };

            }
        };
    })
    .directive('userInfoSettings', function($timeout, $filter, $rootScope, dataFactory, userService,
        e911Service, Idle) {
        function setSettings($scope) {
            $scope.settings = {
                firstName: $scope.user.contact_name_given,
                lastName: $scope.user.contact_name_family,
                phoneExtension: $scope.user.user_ext,
                email: $scope.user.email_address,
                phoneNumber: $scope.user.phone_number,
                timeZone: $scope.user.settings.timezone_display,
                user_uuid: $scope.user.id,
                idleTimeout: parseInt($scope.user.settings.idleTimeout)
            };
            if (__env.enableDebug) console.log($scope.settings);
        };
        return {
            restrict: 'E',
            templateUrl: 'views/settings/user-info-settings.html',
            scope: {
                user: '='
            },
            link: function($scope, element, attrs) {
                $scope.init = function() {
                    setSettings($scope);
                };
                $scope.init();
                $scope.timeZones = $rootScope.timeZones;

                $scope.triggerUpdate = function() {
                    var confirm = '';
                    if ($rootScope.user.email_address !== $scope.settings.email) confirm =
                        ' NOTE: Updating the email address for your profile will also update your login email address.';
                    $rootScope.confirmDialog(
                            "Are you sure you want to update with this information? " +
                            confirm)
                        .then(function(response) {
                            if (response) {
                                $scope.updateInfo();
                            };
                        });
                };

                function loadValidDids(domain_uuid) {
                    dataFactory.getValidDIDs(domain_uuid)
                        .then(function(response) {
                            console.log(response.data);
                            if (response.data.success) {
                                $scope.validDids = response.data.success.data;
                                $scope.initializeOutboundDID();
                            } else {
                                console.log(response.data.error.message);
                                $scope.validDids = [];
                            }
                        });
                }

                loadValidDids($rootScope.user.domain.domain_uuid);

                $scope.initializeOutboundDID = function() {
                    var user = $rootScope.user;
                    if (user.extension) {
                        var callerIdNum = user.extension.outbound_caller_id_number;
                        angular.forEach($scope.validDids, function(did) {
                            if (did.destination_number == callerIdNum) {
                                $scope.outboundDID = did;
                            }

                            if (user.default_outbound_did) {
                                if (did.destination_number == user.default_outbound_did) {
                                    did['type'] = "Default";
                                }
                            }
                        });
                    }
                };

                $scope.setCallerId = function(user, did) {
                    var data = {
                        extension_uuid: user.extension.extension_uuid,
                        did: did.destination_number,
                        type: "temporary",
                        user_uuid: user.user_uuid
                    };
                    dataFactory.postUpdateUserCallerId(data)
                        .then(function(response) {
                            console.log(response.data);
                            if (response.data.success) {
                                user.extension.outbound_caller_id_number = did.destination_number;
                                //user.extension.effective_caller_id_number = did.destination_number;
                            }
                        });
                };

                $scope.updateEDTSetting = function() {

                    var data = {
                        user_uuid : $rootScope.user.id,
                        domain_uuid : $rootScope.user.domain.domain_uuid,
                        value : $scope.user.external_device_transfer
                    }

                    dataFactory.postUpdateEDTSetting(data)
                        .then(function(response){
                            if(response.data.success){
                                //$rootScope.showSuccessAlert('Your information was updated.');
                            }
                        });
                }

                $scope.updateInfo = function() {
                    if($scope.settings.idleTimeout < 1) {
                        return $rootScope.showErrorAlert('Timeout cannot be less than 1 hour.');
                    }

                    if (__env.enableDebug) console.log($scope.settings);
                    dataFactory.postUpdateUser($scope.settings).then(function(response) {
                        if (__env.enableDebug) console.log(response.data);
                        if (response.data.success) {
                            $scope.user.contact_name_given = $scope.settings.firstName;
                            $scope.user.contact_name_family = $scope.settings.lastName;
                            var admins = ['superadmin', 'admin', 'KotterTech',
                                'salesadmin'
                            ];
                            if ($scope.settings.userGroup) {
                                $scope.user.accessgroup = $scope.settings.userGroup;
                                $scope.user.companyAdmin = (admins.indexOf(
                                        $scope.settings.userGroup) !== -1) ?
                                    'true' : 'false';
                            }
                            $scope.user.email = $scope.settings.email;
                            $scope.user.phone_number = $scope.settings.phoneNumber;
                            $scope.user.settings.timezone_display = $scope.settings
                                .timeZone;
                            var tz = $filter('getTimezone')($scope.settings.timeZone);
                            $scope.user.settings.timezone = tz;
                            $scope.user.user_ext = $scope.settings.phoneExtension;
     
                            var idleTimeout = $scope.settings.idleTimeout * 3600;
                            if ($scope.settings.idleTimeout) {
                                Idle.setIdle(idleTimeout);
                            }
                            $scope.user.settings.idleTimeout = $scope.settings.idleTimeout;
                            
                            $rootScope.showSuccessAlert(
                                'Your information was updated.');
                            $rootScope.$broadcast('emulated.user.updated',
                                $scope.user);
                        } else if (response.data.error) {
                            $rootScope.showErrorAlert(response.data.error.message);
                        }
                    });
                };
            }
        };
    })
    .directive('changePasswordSettings', function($timeout, $rootScope, dataFactory, $mdDialog, $q) {
        var getPassToken = function(userUuid) {
            var deferred = $q.defer();
            dataFactory.getResetToken(userUuid)
                .then(function(response) {
                    if (response.data.error) {
                        deferred.reject('');
                    } else {
                        deferred.resolve(response.data.success.data);
                    }
                }, function(error) {
                    deferred.reject('');
                });
            return deferred.promise;
        };
        return {
            restrict: 'E',
            templateUrl: 'views/settings/change-password-settings.html',
            scope: {
                user: '<'
            },
            link: function($scope, element, attrs) {
                $scope.fields = {};
                $scope.triggerUpdate = function() {
                    $rootScope.confirmDialog(
                            "Are you sure you want to change your password?")
                        .then(function(response) {
                            response ? $scope.updatePassword() : $scope.fields = {};
                        });
                };

                $scope.updatePassword = function() {
                    getPassToken($scope.user.id).then(function(token) {
                        $scope.fields.token = token;
                        dataFactory.resetPassword($scope.fields)
                            .then(function(response) {
                                if (response.data.success) {
                                    if (__env.enableDebug) console.log(
                                        response.data.success.message);
                                    $rootScope.showSuccessAlert(
                                        'Your password has been updated.'
                                    );
                                    $scope.fields = {};
                                } else if (response.data.error) {
                                    var message = response.data.error.message;
                                    if (__env.enableDebug) console.log(
                                        message);
                                    $rootScope.showErrorAlert(message[0]);
                                    $scope.fields = {};
                                }
                            });
                    });
                };

            }
        };
    })

    .directive('eventCalendar', function($rootScope, dataFactory, $uibModalStack, conferenceService,
        contactService, $mdDialog, $filter) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/event-calendar.html',
            scope: {
                user: "="
            },
            link: function($scope, element, attrs) {
                $scope.events = [];
                $scope.conferences = [];
                $scope.locations = {};
                $scope.dids = [];

                function init() {
                    getEvents();
                    getConferenceInfo();
                }

                init();

                function getConferenceInfo() {
                    conferenceService.getConferenceSetup(false)
                        .then(function(response) {
                            if (response) {
                                $scope.conferences = conferenceService.availConferenceRooms;
                                $scope.locations = conferenceService.availLocations;
                                $scope.dids = conferenceService.availDids;
                            }
                        });
                }

                $scope.didContacts = function() {
                    var contacts = contactService.getUserContactsOnly();
                    var dids = [];
                    angular.forEach(contacts, function(contact) {
                        if (contact.did) {
                            var index = $filter('getByNumber')($scope.didContacts,
                                contact.did);
                            if (index === null) dids.push(contact.did);
                        }
                    });
                    return dids;
                };

                $scope.createClicked = function(date) {
                    console.log('createClicked');
                    $rootScope.contactsSelected = [];
                    $rootScope.contactsSelected2 = [];
                    var eventDate = date.setHours(0, 0, 0, 0);
                    var CurrentDate = new Date().setHours(0, 0, 0, 0);
                    if (eventDate < CurrentDate) {
                        return $rootScope.showAlert('Event Date cannot be past date');
                    };
                    $rootScope.eventDate = date;
                    $scope.today = date;
                    $scope.time = {
                        start_stamp: $scope.today,
                        end_stamp: $scope.today
                    };
                    $scope.ismeridian = true;
                    $scope.hstep = 1;
                    $scope.mstep = 15;
                    var data = {
                        conferences: $scope.conferences,
                        locations: $scope.locations,
                        conference_room_uuid: conferenceService.currentConference.conference_room_uuid,
                        addConferenceEvent: $scope.addConferenceEvent,
                        closeCreateEvent: $scope.closeCreateEvent,
                        didContacts: $scope.dids,
                        eventClicked: $scope.eventClicked,
                        today: $scope.today,
                        time: $scope.time,
                        ismeridian: $scope.ismeridian,
                        hstep: $scope.hstep,
                        mstep: $scope.mstep
                    };
                    $rootScope.showEditorModal('/calls/eventcreatemodal.html', data,
                        'md', '', 'static', 'false');
                };

                $scope.eventClicked = function(selectedEvent) {
                    console.log(selectedEvent);
                    $scope.selectedEvent = selectedEvent;
                    $rootScope.contactsSelected = selectedEvent.contactsSelected;
                    // $scope.contactsSelected = selectedEvent.contactsSelected;
                    $rootScope.contactsSelected2 = selectedEvent.contactsSelected;
                    var edited = true;
                    $rootScope.eventDate = new Date($scope.selectedEvent.start_at);
                    $scope.time = {
                        start_stamp: $rootScope.eventDate,
                        end_stamp: new Date($scope.selectedEvent.end_at)
                    };
                    $scope.ismeridian = true;
                    $scope.hstep = 1;
                    $scope.mstep = 15;
                    var data = {
                        edited: edited,
                        updateConferenceEvent: $scope.updateConferenceEvent,
                        conferences: $scope.conferences,
                        locations: $scope.locations,
                        conference_room_uuid: selectedEvent.conference_room_uuid,
                        events_schedule_uuid: $scope.selectedEvent.events_schedule_uuid,
                        deleteConferenceEvent: $scope.deleteConferenceEvent,
                        closeCreateEvent: $scope.closeCreateEvent,
                        didContacts: $scope.dids,
                        didNumber: $scope.selectedEvent.call_from_did,
                        event_title: $scope.selectedEvent.event_title,
                        event_memo: $scope.selectedEvent.event_memo,
                        participants: $scope.selectedEvent.participants,
                        time: $scope.time,
                        ismeridian: $scope.ismeridian,
                        hstep: $scope.hstep,
                        mstep: $scope.mstep,
                        reminder_time: parseInt($scope.selectedEvent.reminder_time),
                        reminder_from_did: $scope.selectedEvent.reminder_from_did
                    };
                    $rootScope.showEditorModal('/calls/eventcreatemodal.html', data,
                        'md', '', 'static', 'false');
                };

                $scope.closeCreateEvent = function() {
                    $rootScope.contactsSelected = [];
                    $rootScope.contactsSelected2 = [];
                    $uibModalStack.dismissAll();
                };

                $scope.addConferenceEvent = function(eventDate, closeModal, events) {
                    if (!events.event_title ||
                        !events.conference_room_uuid ||
                        !events.time ||
                        !events.didNumber ||
                        $rootScope.contactsSelected.length === 0) {
                        $rootScope.showErrorAlert(
                            'You have data missing from the form. The following must be completed before you can submit: Event Title, Start and End Time, Participants, and the Caller ID.'
                        );
                        return;
                    }
                    $scope.participants = "";
                    $scope.e = events;
                    $scope.e['eventDate'] = eventDate;
                    $scope.e['user_uuid'] = $rootScope.user.id;
                    $scope.e['start_at'] = events.time.start_stamp.toString().replace(
                        /GMT.+/, "");
                    $scope.e['end_at'] = events.time.end_stamp.toString().replace(
                        /GMT.+/, "");

                    angular.forEach($rootScope.contactsSelected, function(contact) {
                        if ($scope.participants !== "") {
                            $scope.participants = $scope.participants + ', ' +
                                contact.contact_mobile_number;
                        } else {
                            $scope.participants = contact.contact_mobile_number;
                        }
                    });

                    $scope.e['participants'] = $scope.participants;

                    if (events.time.start_stamp > events.time.end_stamp) {
                        return $rootScope.showAlert(
                            'End time cannot be less that Start time.');
                    };
                    $scope.addFlag = false;
                    angular.forEach($scope.events, function(data) {
                        $scope.get = {};
                        $scope.get.start = new Date(data.start_at);
                        $scope.get.end = new Date(data.end_at);
                        data.start_at = moment.tz(data.start_at, $rootScope.user.settings.timezone).format();
                        data.end_at = moment.tz(data.end_at, $rootScope.user.settings.timezone).format();
                        if ($scope.e['start_at'] >= new Date(data.start_at).toString()
                            .replace(/GMT.+/, "") && $scope.e['start_at'] <=
                            new Date(data.end_at).toString().replace(/GMT.+/,
                                "")) {
                            $scope.addFlag = true;
                            $rootScope.showErrorAlert(
                                "Conference room already booked for this time"
                            );
                        }
                    });
                    if (!$scope.addFlag) {
                        dataFactory.postAddConferenceEvent($scope.e)
                            .then(function(response) {
                                if (response.data.success) {
                                    getEvents();
                                    $rootScope.showSuccessAlert('Event Created.');
                                    if (closeModal) {
                                        closeModal();
                                    }
                                } else if (response.data.error) {
                                    $rootScope.showErrorAlert(response.data.error.message[
                                        0]);
                                }

                                $rootScope.contactsSelected = [];
                                $rootScope.contactsSelected2 = [];
                            });
                    }
                };

                $scope.updateConferenceEvent = function(eventDate, closeModal, events) {
                    $scope.participants = "";
                    $scope.e = events;
                    $scope.e['eventDate'] = eventDate;
                    $scope.e['user_uuid'] = $rootScope.user.id;
                    $scope.e['start_at'] = events.time.start_stamp.toString().replace(
                        /GMT.+/, "");
                    $scope.e['end_at'] = events.time.end_stamp.toString().replace(
                        /GMT.+/, "");

                    angular.forEach($rootScope.contactsSelected, function(contact) {
                        if ($scope.participants !== "") {
                            $scope.participants = $scope.participants + ', ' +
                                contact.contact_mobile_number;
                        } else {
                            $scope.participants = contact.contact_mobile_number;
                        }
                    });

                    $scope.e['participants'] = $scope.participants;
                    if (events.time.start_stamp > events.time.end_stamp) {
                        return $rootScope.showAlert('Please choose correct timing');
                    }
                    dataFactory.postupdateConferenceEvent($scope.e).then(function(
                        response) {
                        if (response.data.success) {
                            getEvents();
                            $rootScope.showSuccessAlert('Event Updated.');
                            if (closeModal) {
                                closeModal();
                            }
                        } else if (response.data.error) {
                            $rootScope.showErrorAlert(response.data.error.message[
                                0]);
                        }

                        $rootScope.contactsSelected = [];
                        $rootScope.contactsSelected2 = [];
                    });
                };

                $scope.deleteConferenceEvent = function(event_uuid, closeModal) {
                    $rootScope.contactsSelected = [];
                    $rootScope.contactsSelected2 = [];
                    var confirmDelete = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Are you sure you want to delete this event? A text notification of the cancellation will be sent to your participants.'
                        )
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        dataFactory.deleteConferenceEvent(event_uuid).then(
                            function(response) {
                                if (response.data.success) {
                                    getEvents();
                                    $rootScope.alerts.push({
                                        success: true,
                                        message: response.data.success
                                            .message
                                    });
                                    if (closeModal) {
                                        closeModal();
                                    }
                                } else if (response.data.error) {
                                    $rootScope.alerts.push({
                                        error: true,
                                        message: response.data.error
                                            .message
                                    });
                                }
                            });
                    });
                };

                $scope.getParticipants = function(participant) {
                    $scope.data = {
                        contact_name_full: null,
                        contact_mobile_number: participant
                    };
                    var contact = contactService.getContactByPhoneNumber(participant);
                    if (contact) $scope.data.contact_name_full = contact.name;
                    return $scope.data;
                };

                function getEvents() {
                    $scope.events = [];
                    dataFactory.getConferenceEvents()
                        .then(function(response) {
                            if (response.data.success) {
                                var events = response.data.success.data;
                                angular.forEach(events, function(event) {
                                    $scope.participants = [];
                                    $scope.contactsSelected = [];
                                    $scope.get = event;
                                    $scope.get.start = new Date(event.start_at);
                                    $scope.get.end = new Date(event.end_at);
                                    if (event.participants) {
                                        $scope.participants = event.participants
                                            .split(",");
                                        angular.forEach($scope.participants,
                                            function(participant) {
                                                var participant =
                                                    participant.replace(
                                                        /[^0-9]/g, '');
                                                participant = $scope.getParticipants(
                                                    participant);
                                                $scope.contactsSelected.push(
                                                    participant);
                                            });
                                    }
                                    $scope.get.contactsSelected = $scope.contactsSelected;
                                    $scope.events.push($scope.get);
                                    $scope.start_time = new Date(event.start_at)
                                        .setHours(0, 0, 0, 0);

                                });
                            } else if (response.data.error) {
                                $rootScope.showErrorAlert(response.data.error.message[0]);
                            }
                        });
                };

            }
        }
    })

    .directive('callForwardingSettings', function($filter, $rootScope, $mdDialog, contactService,
        dataFactory, $uibModalStack) {

        return {
            restrict: 'E',
            templateUrl: 'views/settings/call-forwarding.html',
            scope: {
                user: "<"
            },
            link: function($scope, element, attrs) {
                console.log($scope.user);
                if (!$scope.user) {
                    $scope.user = $rootScope.user;
                }
                $scope.tips = $rootScope.tips;
                $scope.editingDest = null;
                $scope.destOptions = [];
                $scope.destOptions.push({
                    type: 'User Extension'
                });
                $scope.destOptions.push({
                    type: 'Phone Number'
                });

                $scope.userContacts = function() {
                    return contactService.getUserContactsOnly();
                };

                $scope.settings = {};
                $scope.followMe = {
                    'follow_me_enabled': false
                };
                $scope.followMe.followMeDest = [];
                $scope.extension = {};
                $scope.addDest = false;
                $scope.initializeForwarding = function() {
                    dataFactory.getInitializeForwardingRingGroup($scope.user.id)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.user.forwarding = response.data.success.data;
                            } else {
                                $rootScope.showErrorAlert(response.data.error.message);
                            }
                        });
                };

                $scope.updateForwarding = function(type, message) {
                    console.log($scope.user.forwarding.ring_group_enabled);
                    if ($scope.user.forwarding.ring_group_enabled === 'true' && $scope.user
                        .forwarding.destinations.length === 0) {
                        $scope.user.forwarding.ring_group_enabled = 'false';
                        $rootScope.showErrorAlert(
                            'You can not enable forwarding without having at least one destination.'
                        );
                        return;
                    }
                    var data = {
                        user_uuid: $scope.user.id,
                        ring_group_uuid: $scope.user.forwarding.ring_group_uuid,
                    };
                    if (type === 'forwarding') data.ring_group_enabled = $scope.user.forwarding
                        .ring_group_enabled;
                    if (type === 'strategy') data.ring_group_strategy = $scope.user.forwarding
                        .ring_group_strategy;
                    dataFactory.postUpdateForwarding(data)
                        .then(function(response) {
                            if (response.data.error) {
                                if (type === 'forwarding') {
                                    if ($scope.user.forwarding.ring_group_enabled ===
                                        'true') $scope.user.forwarding.ring_group_enabled =
                                        'false';
                                    if ($scope.user.forwarding.ring_group_enabled ===
                                        'false') $scope.user.forwarding.ring_group_enabled =
                                        'true';
                                } else if (type === 'strategy') {
                                    if ($scope.user.forwarding.ring_group_strategy ===
                                        'simultaneous') $scope.user.forwarding.ring_group_strategy =
                                        'sequence';
                                    if ($scope.user.forwarding.ring_group_strategy ===
                                        'sequence') $scope.user.forwarding.ring_group_strategy =
                                        'simultaneous';
                                }
                                $rootScope.showErrorAlert(response.data.error.message);
                            } else {
                                $rootScope.showSuccessAlert(response.data.success.message +
                                    message);
                            }
                        });
                };

                $scope.toggleAdd = function() {
                    if ($scope.editingDest) {
                        $rootScope.showErrorAlert(
                            'You are currently editing a destination. Please cancel or save that before adding a new destination.'
                        );
                        return;
                    }
                    $scope.newDest = {
                        destination_timeout: 20,
                        destination_delay: 0
                    };

                    $scope.addDest = true;
                };

                $scope.cancelDestAdd = function() {
                    $scope.newDest = {};
                    $scope.addDest = false;
                    $scope.editingDest = null;
                };

                $scope.editDest = function(dest) {
                    console.log($scope.editingDest);
                    if ($scope.addDest === true) {
                        $rootScope.showErrorAlert(
                            'You are currently adding a destination. Please cancel or save that before editing an existing destination.'
                        );
                        return;
                    }
                    if ($scope.editingDest) {
                        $rootScope.showErrorAlert(
                            'You are currently editing another destination. Please cancel or save that before editing a new destination.'
                        );
                        return;
                    }
                    $scope.newDest = angular.copy(dest);
                    $scope.newDest.destination_delay = parseInt($scope.newDest.destination_delay);
                    $scope.newDest.destination_timeout = parseInt($scope.newDest.destination_timeout);
                    console.log($scope.newDest);
                    $scope.editingDest = dest.ring_group_destination_uuid;
                    console.log($scope.editingDest);
                };

                $scope.isEditing = function(dest) {
                    return $scope.editingDest === dest.ring_group_destination_uuid;
                };

                $scope.saveDest = function() {
                    if ($scope.newDest.destination_timeout % 5 !== 0 || $scope.newDest.destination_timeout ==
                        0) {
                        $rootScope.showErrorAlert("Timeout should be a multiple of 5.");
                        return;
                    }
                    if ($scope.newDest.destination_delay % 5 !== 0) {
                        $rootScope.showErrorAlert("Delay should be a multiple of 5.");
                        return;
                    }
                    $scope.newDest.user_uuid = $scope.user.id;
                    if ($scope.newDest.ring_group_destination_uuid) {
                        dataFactory.postUpdateRinggroupDestination($scope.newDest)
                            .then(function(response) {
                                console.log(response.data.success.data);
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope.user.forwarding
                                        .destinations, $scope.newDest.ring_group_destination_uuid,
                                        'ring_group_destination');
                                    if (index !== null) $scope.user.forwarding.destinations[
                                        index] = response.data.success.data;
                                } else {
                                    console.log(response.data.error.message);
                                    $rootScope.showErrorAlert(response.data.error.message);
                                }
                                $scope.cancelDestAdd();
                            });
                    } else {
                        $scope.newDest.domain_uuid = $scope.user.domain.domain_uuid;
                        $scope.newDest.ring_group_uuid = $scope.user.forwarding.ring_group_uuid;
                        dataFactory.postAddRinggroupDestination($scope.newDest)
                            .then(function(response) {
                                console.log(response.data.success.data);
                                if (response.data.success) {
                                    $scope.user.forwarding.destinations.push(
                                        response.data.success.data);
                                } else {
                                    console.log(response.data.error.message);
                                    $rootScope.showErrorAlert(response.data.error.message);
                                }
                                $scope.cancelDestAdd();
                            });
                    }
                };

                $scope.deleteDest = function(dest) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Are you sure you want to remove this destination?')
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        dataFactory.getDeleteRinggroupDestination(dest.ring_group_destination_uuid,
                                $scope.user.id)
                            .then(function(response) {
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope
                                        .user.forwarding.destinations,
                                        dest.ring_group_destination_uuid,
                                        'ring_group_destination');
                                    if (index !== null) $scope.user.forwarding
                                        .destinations.splice(index, 1);
                                    if ($scope.user.forwarding.destinations
                                        .length === 0 &&
                                        $scope.user.forwarding.ring_group_enabled ===
                                        'true') {
                                        $scope.user.forwarding.ring_group_enabled =
                                            'false';
                                        $scope.updateForwarding(
                                            'forwarding',
                                            '  Forwarding must have at least one destination.'
                                        );
                                    }
                                } else {
                                    console.log(response.data.error.message);
                                    $rootScope.showErrorAlert(response.data
                                        .error.message);
                                }
                            });
                    });
                };

                angular.copy($scope.user.extension, $scope.extension);
                $scope.extension.forward_no_answer_enabled = $scope.user.extension.forward_no_answer_enabled ==
                    "true" ? true : false;
                $scope.extension.forward_user_not_registered_enabled = $scope.user.extension
                    .forward_user_not_registered_enabled == "true" ? true : false;

                if ($scope.user.followMe) {
                    angular.copy($scope.user.followMe, $scope.followMe);
                    $scope.followMe.follow_me_enabled = $scope.user.followMe.follow_me_enabled ==
                        "true" ? true : false;
                }

                $scope.dest = [];



                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.forwardingHelp = function() {
                    var help = angular.element(document.querySelector(
                        '#forwarding-help'));
                    $mdDialog.show(
                        $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title('Forwarding Strategy')
                        .htmlContent(help[0].innerHTML)
                        .ariaLabel('Forwarding Strategy')
                        .ok('Close')
                    );
                }

                $scope.addToList = function(followMe) {
                    if (followMe === undefined ||
                        followMe.follow_me_destination === undefined ||
                        followMe.follow_me_delay === undefined ||
                        followMe.follow_me_timeout === undefined) {
                        return $rootScope.showAlert('Values Cannot be empty');
                    }
                    if (!$scope.followMe.followMeDest) $scope.followMe.followMeDest = [];
                    if ($scope.followMe.followMeDest.length < 5) {
                        if (followMe.follow_me_prompt === undefined) {
                            followMe.follow_me_prompt = false;
                        }
                        $scope.followMe.followMeDest.push(followMe);
                        console.log($scope.followMe.followMeDest);
                        $scope.f = {};
                        $scope.toggleAdd();
                        console.log($scope.dest);
                    } else {
                        return $rootScope.showErrorAlert(
                            'Cannot Add More than 5 Numbers');
                    }
                };

                $scope.isKotterTechUser = function(contact) {
                    return contactService.isKotterTechUser(contact);
                };

                $scope.delRecord = function(record) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Are you sure you want to remove this destination?')
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        $scope.followMe.followMeDest.splice(($scope.followMe.followMeDest
                            .indexOf(record)), 1);
                    });
                };
                $scope.settings['extension'] = $scope.extension;
                $scope.settings['followMe'] = $scope.followMe;

                $scope.updateSettings = function() {
                    if (__env.enableDebug) console.log($scope.settings);
                    if ($scope.followMe.follow_me_enabled && $scope.followMe.followMeDest
                        .length === 0) {
                        $rootScope.showErrorAlert(
                            'You must have at least one Follow Me destination.');
                        return;
                    }
                    if ($scope.extension.forward_no_answer_enabled && !$scope.extension
                        .forward_no_answer_destination) {
                        $rootScope.showErrorAlert(
                            'If No Answer Forwarding is enabled, you must have the destination entered.'
                        );
                        return;
                    }
                    if ($scope.extension.forward_user_not_registered_enabled && !$scope
                        .extension.forward_user_not_registered_destination) {
                        $rootScope.showErrorAlert(
                            'If User Log off Forwarding is enabled, you must have the destination entered.'
                        );
                        return;
                    }
                    var confirmUpdate = $mdDialog.confirm()
                        .title(
                            'Are you sure you want to update your Find Me Follow Me settings?'
                        )
                        .ariaLabel('Update')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmUpdate).then(function() {
                        $scope.settings.user_uuid = $scope.user.id;
                        console.log($scope.settings);
                        // return;
                        dataFactory.postFindMeFollow($scope.settings).then(
                            function(response) {
                                if (response.data.success) {

                                    angular.copy($scope.extension, $scope.user
                                        .extension);

                                    $scope.user.extension.forward_no_answer_enabled =
                                        $scope.extension.forward_no_answer_enabled ==
                                        true ? 'true' : 'false';
                                    $scope.user.extension.forward_user_not_registered_enabled =
                                        $scope.extension.forward_user_not_registered_enabled ==
                                        true ? 'true' : 'false';

                                    angular.copy($scope.followMe, $scope.user
                                        .followMe);
                                    if (!$scope.user.followMe) $scope.user.followMe = {};
                                    $scope.user.followMe.follow_me_enabled =
                                        $scope.followMe.follow_me_enabled ==
                                        true ? 'true' : 'false';
                                    //$window.localStorage.setItem("currentUser", JSON.stringify($rootScope.user));
                                    $rootScope.showSuccessAlert(
                                        'Your information has been updated.'
                                    );
                                } else if (response.data.error) {
                                    $rootScope.showErrorAlert(response.data
                                        .error.message[0]);
                                }
                            });
                    });
                };

            }
        };
    })
    .directive('voicemailSettings', function($timeout, $rootScope, dataFactory) {
        var scrubVoicemailEnabled = function() {
            if ($rootScope.user.voicemail) {
                var enabled = $rootScope.user.voicemail.voicemail_enabled;
            }
            if (enabled) {
                if (enabled === 'true' || enabled === '1') {
                    $rootScope.user.voicemail.voicemail_enabled = true;
                } else if ($rootScope.user.voicemail &&
                    ($rootScope.user.voicemail.voicemail_enabled === 'false') ||
                    ($rootScope.user.voicemail.voicemail_enabled === '0')) {
                    $rootScope.user.voicemail.voicemail_enabled = false;
                }
            }
        };
        return {
            restrict: 'E',
            templateUrl: 'views/settings/voicemail-settings.html',
            scope: {
                user: '='
            },
            link: function($scope, element, attrs) {
                // commenting until voicemail setup is complete
                scrubVoicemailEnabled();
                if (!$scope.user) {
                    $scope.user = $rootScope.user;
                }
                $scope.showAudioModal = $rootScope.showAudioModal;
                $scope.settings = {
                    firstName: $scope.user.contact_name_given,
                    lastName: $scope.user.contact_name_family,
                    user_uuid: $scope.user.id
                };
                $scope.getCurrentGreeting = function(greeting_id) {
                    if (__env.enableDebug) console.log(greeting_id);
                    var found = null;
                    angular.forEach($scope.user.voicemailgreetings, function(greeting) {
                        if (__env.enableDebug) console.log(greeting);
                        if (greeting.greeting_id == greeting_id) found =
                            greeting;
                    });
                    return found;
                };
                dataFactory.getVoicemailStatus().then(function(response) {
                    if (__env.enableDebug) console.log(response);
                    if (response.data.success) {
                        $scope.isActive = false;
                        if (response.data.success.voicemail_enabled === 'true')
                            $scope.isActive = true;
                    }
                });
                $scope.setVoicemailStatus = function() {
                    $timeout(function() {
                        var status = $scope.isActive ? 'true' : 'false';
                        dataFactory.getSetVoicemailStatus($scope.user.id,
                                status)
                            .then(function(response) {
                                // var enabled = response.data.success.voicemail_enabled;
                                // $rootScope.user.voicemail.voicemail_enabled = enabled;
                                // $scope.isActive = enabled;
                            });
                    });
                };
                $scope.triggerUpdate = function() {
                    $rootScope.confirmDialog(
                            'Are you sure you want to update your voicemail settings?')
                        .then(function(response) {
                            if (response) {
                                $scope.updateSettings();
                            };
                        });
                };

                $scope.updateSettings = function() {
                    if (__env.enableDebug) console.log($scope.settings);
                    dataFactory.postUpdateVoicemail($scope.settings).then(function(response) {
                        if (response.data.success) {
                            $rootScope.user.voicemail = response.data.success.voicemail;
                            $scope.settings.voicemail_password = null;
                            $rootScope.showSuccessAlert(
                                'Your information has been updated.');
                        } else if (response.data.error) {
                            $rootScope.showErrorAlert(response.data.error.message[0]);
                        }
                    });
                };
            }
        };
    })
    .directive('requestFilesTable', function($timeout, $rootScope, $uibModalStack, $filter,
        clipboard, cloudStorageService, dataFactory, $mdDialog) {
        return {
            restrict: 'E',
            templateUrl: 'views/cloudstorage/request-files-table.html',
            scope: {
                input: '<'
            },
            link: function($scope, element, attrs) {
                $scope.thefolder = $scope.input.thefolder ? $scope.input.thefolder : null;
                console.log($scope.thefolder);
                $scope.showBlTable = false;
                $scope.tips = $rootScope.tips;
                $scope.requestLinks = [];
                $scope.availFolders = [];
                $scope.symphonyUrl = $rootScope.symphonyUrl;

                $scope.showAddForm = false;
                $scope.showSendEmail = false;
                $scope.showTable = false;
                $scope.showOptions = false;
                $scope.preselectedNode = null;
                $scope.defaultOptions = {
                    sendEmail: true,
                    requireEmail: false,
                    expireAt: '6month'
                };

                $scope.addNewLink = function() {
                    $scope.newLink = {};
                    $scope.newLink.options = $scope.defaultOptions;
                    $scope.newLink.folder_uuid = $scope.public_cloud.folder_uuid;
                    $scope.showAddForm = true;
                };

                $scope.editLink = function(link) {
                    $scope.newLink = link;
                    $scope.newLink.options = {};
                    $scope.newLink.options.sendEmail = link.send_email === 'true' ?
                        true : false;
                    $scope.newLink.options.requireEmail = link.require_contact_info ===
                        'true' ? true : false;
                    $scope.newLink.options.expireAt = link.expires;

                    $scope.preselectedNode = link.folder_uuid;
                    $scope.showAddForm = true;
                };

                $scope.showSendLink = function(link) {

                    $rootScope.showModalWithData('/cloudstorage/sharelink-modal.html', {
                        onClose: $scope.onCloseModal,
                        link: link
                    });
                };

                $scope.addFolder = function() {
                    $scope.new = {
                        folder_name: null
                    };
                    $scope.showNewFolder = true;
                };
                $scope.showFolderSpinner = false;
                $scope.saveNewFolder = function(folder_name) {
                    $scope.showFolderSpinner = true;
                    var parent_folder_uuid = $scope.public_cloud.folder_uuid;
                    cloudStorageService.createFolder(parent_folder_uuid, folder_name)
                        .then(function(response) {

                            $scope.structure.folders[0].folders.push(response);
                            $timeout(function() {
                                $scope.new = {
                                    folder_name: null
                                };
                                $scope.showNewFolder = false;
                                $scope.showFolderSpinner = false;
                            });
                        });
                };

                $scope.expireOptions = [{
                        value: 'never',
                        display: 'never'
                    },
                    {
                        value: '1year',
                        display: 'after a year'
                    },
                    {
                        value: '6month',
                        display: 'after 6 months'
                    },
                    {
                        value: '3month',
                        display: 'after 3 months'
                    },
                    {
                        value: '1month',
                        display: 'after 1 month'
                    },
                    {
                        value: '1week',
                        display: 'after 1 week'
                    },
                    {
                        value: '1day',
                        display: 'after 1 day'
                    }
                ];

                function buildFolderSelect(parent, folder) {
                    var parentstring = parent;
                    angular.forEach(folder.folders, function(item) {
                        $scope.ulList.push({
                            string: parentstring + '->' + item.folder_name,
                            folder_uuid: item.folder_uuid
                        });
                        if (item.folders.length > 0) {
                            buildFolderSelect(parentstring + '->' + item.folder_name, item);
                        }
                    });
                }

                $scope.ulList = [];

                dataFactory.getPublicLinks()
                    .then(function(response) {
                        if (response.data.success) {
                            console.log(response.data.success);
                            $scope.showTable = true;
                            $scope.requestLinks = response.data.success.data;
                            $scope.public_cloud = response.data.success.public_cloud;
                            var parent = $scope.public_cloud.folder_name;
                            $scope.ulList.push({
                                string: parent,
                                folder_uuid: $scope.public_cloud.folder_uuid
                            });
                            buildFolderSelect(parent, $scope.public_cloud);
                            //$scope.structure = $scope.public_cloud;
                            $scope.structure = {
                                folders: [{
                                    folder_name: $scope.public_cloud.folder_name,
                                    folder_uuid: $scope.public_cloud.folder_uuid,
                                    files: $scope.public_cloud.files,
                                    folders: $scope.public_cloud.folders
                                }]
                            };
                            console.log($scope.structure);
                            console.log($scope.ulList);
                            $scope.availFolders.push($scope.public_cloud);
                            if ($scope.input.thefolder) {
                                var index = $filter('getByUUID')($scope.requestLinks,
                                    $scope.input.thefolder.folder_uuid, 'folder');
                                if (index !== null) {
                                    $scope.editLink($scope.requestLinks[index]);
                                } else {
                                    $scope.preselectedNode = $scope.input.thefolder.folder_uuid;
                                    $scope.addNewLink();
                                }
                            }

                        } else {
                            console.log(response.data.error.message);
                            return [];
                        }
                    });

                $rootScope.$on('request.folder.selected', function($event, folder) {
                    console.log("SELECTED FOLDER");
                    console.log(folder);
                    $scope.selectedFolder = folder.folder_uuid ? folder.folder_uuid :
                        folder;
                });

                $scope.cancelEditLink = function() {
                    $scope.newLink = {};
                    $scope.showAddForm = false;
                };

                $scope.removeLink = function(index) {
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Are you sure you want to delete this link?')
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(deleteConfirm).then(function() {
                        dataFactory.getDeletePublicLink($scope.requestLinks[
                                index].public_cloud_link_uuid)
                            .then(function(response) {
                                if (response.data.success) {
                                    $scope.requestLinks.splice(index, 1);
                                } else if (response.data.error) {
                                    console.log(response.data.error.message);
                                }
                            });
                    });
                };

                $scope.saveLink = function(link) {
                    console.log(link);
                    if (!$scope.selectedFolder) {
                        $rootScope.showErrorAlert(
                            'You must first select a target folder for uploaded files.'
                        );
                        return;
                    }
                    link.folder_uuid = $scope.selectedFolder;
                    console.log(link);
                    dataFactory.postSavePublicLink(link)
                        .then(function(response) {
                            if (response.data.success) {
                                console.log(response.data.success.data);
                                var index = $filter('getByUUID')($scope.requestLinks,
                                    response.data.success.data.public_cloud_link_uuid,
                                    'public_cloud_link');
                                if (index !== null) {
                                    $scope.requestLinks[index] = response.data.success
                                        .data;
                                } else {
                                    $scope.requestLinks.push(response.data.success.data);
                                }
                                $scope.showAddForm = false;
                            } else {
                                console.log(response.data.error.message);
                                $rootScope.showErrorAlert(response.data.error.message);
                            }
                        });
                };

                $scope.breadcrums = [''];



                $scope.options = {
                    onNodeSelect: function(node, breadcrums) {
                        $scope.breadcrums = breadcrums;
                    }
                };

                $scope.treeViewOptions = {
                    collapsible: false,
                    showFiles: false
                };

                var iconClassMap = {
                        txt: 'icon-file-text',
                        jpg: 'icon-picture blue',
                        png: 'icon-picture orange',
                        gif: 'icon-picture'
                    },
                    defaultIconClass = 'icon-file';

                $scope.options3 = {
                    mapIcon: function(file) {
                        var pattern = /\.(\w+)$/,
                            match = pattern.exec(file.name),
                            ext = match && match[1];

                        return iconClassMap[ext] || defaultIconClass;
                    }
                };

                $scope.onCloseModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.copyLink = function(link) {
                    $scope.clipboardCopy = $rootScope.symphonyUrl + '/cloud/' + link.hash;
                    clipboard.copyText($scope.clipboardCopy);
                    $rootScope.alerts.push({
                        success: true,
                        message: 'The link has been copied to your clipboard.'
                    });
                };

            }
        };
    })
    .directive('treeView', ['$q', 'treeViewDefaults', '$rootScope', function($q, treeViewDefaults,
        $rootScope) {
        return {
            restrict: 'A',
            scope: {
                treeView: '=treeView',
                treeViewOptions: '=treeViewOptions',
                preselectedNode: '=preselectedNode'
            },
            replace: true,
            template: '<div class="tree">' +
                '<div tree-view-node="treeView">' +
                '</div>' +
                '</div>',
            controller: ['$scope', function($scope) {
                var self = this,
                    selectedNode,
                    selectedFile;

                var options = angular.extend({}, treeViewDefaults, $scope.treeViewOptions);

                if ($scope.preselectedNode) {
                    console.log($scope.preselectedNode);
                    $rootScope.$broadcast('request.folder.selected', $scope.preselectedNode);
                }
                self.selectNode = function(node, breadcrumbs) {
                    console.log(node);
                    $rootScope.$broadcast('request.folder.selected', node);
                    if (selectedFile) {
                        selectedFile = undefined;
                    }
                    selectedNode = node;
                    $scope.preselectedNode = null;

                    if (typeof options.onNodeSelect === "function") {
                        options.onNodeSelect(node, breadcrumbs);
                    }
                };

                self.selectFile = function(file, breadcrumbs) {
                    if (selectedNode) {
                        selectedNode = undefined;
                    }
                    selectedFile = file;

                    if (typeof options.onNodeSelect === "function") {
                        options.onNodeSelect(file, breadcrumbs);
                    }
                };

                self.isSelected = function(node) {
                    return node === selectedNode || node === selectedFile;
                };

                self.isUuid = function(node) {
                    //console.log(node);
                    //console.log($scope.preselectedNode);
                    return node.folder_uuid && node.folder_uuid === $scope.preselectedNode;
                };

                /*
                self.addNode = function (event, name, parent) {
                  if (typeof options.onAddNode === "function") {
                    options.onAddNode(event, name, parent);
                  }
                };
                self.removeNode = function (node, index, parent) {
                  if (typeof options.onRemoveNode === "function") {
                    options.onRemoveNode(node, index, parent);
                  }
                };

                self.renameNode = function (event, node, name) {
                  if (typeof options.onRenameNode === "function") {
                    return options.onRenameNode(event, node, name);
                  }
                  return true;
                };
                */
                self.getOptions = function() {
                    console.log("OPTIONS");
                    return options;
                };
            }]
        };
    }])
    .directive('treeViewNode', ['$q', '$compile', function($q, $compile) {
        return {
            restrict: 'A',
            require: '^treeView',
            link: function(scope, element, attrs, controller) {

                var options = controller.getOptions(),
                    foldersProperty = options.foldersProperty,
                    filesProperty = options.filesProperty,
                    displayProperty = options.displayProperty,
                    collapsible = options.collapsible,
                    showFiles = options.showFiles;
                //var isEditing = false;

                scope.expanded = collapsible == false;
                //scope.newNodeName = '';
                //scope.addErrorMessage = '';
                //scope.editName = '';
                //scope.editErrorMessage = '';

                scope.getFolderIconClass = function() {
                    return 'fa fa-folder' + (scope.expanded && scope.hasChildren() ?
                        '-open' : '');
                };

                scope.getFileIconClass = typeof options.mapIcon === 'function' ?
                    options.mapIcon :
                    function(file) {
                        return 'file';
                    };

                scope.hasChildren = function() {
                    var node = scope.node;
                    return Boolean(node && (node[foldersProperty] && node[
                        foldersProperty].length) || (node[filesProperty] &&
                        node[filesProperty].length));
                };

                scope.selectNode = function(event) {
                    event.preventDefault();
                    //if (isEditing) return;

                    if (collapsible) {
                        toggleExpanded();
                    }

                    var breadcrumbs = [];
                    var nodeScope = scope;
                    while (nodeScope.node) {
                        breadcrumbs.push(nodeScope.node[displayProperty]);
                        nodeScope = nodeScope.$parent;
                    }
                    controller.selectNode(scope.node, breadcrumbs.reverse());
                };

                scope.selectFile = function(file, event) {
                    event.preventDefault();
                    //if (isEditing) return;

                    var breadcrumbs = [file[displayProperty]];
                    var nodeScope = scope;
                    while (nodeScope.node) {
                        breadcrumbs.push(nodeScope.node[displayProperty]);
                        nodeScope = nodeScope.$parent;
                    }
                    controller.selectFile(file, breadcrumbs.reverse());
                };

                scope.isUuid = function(node) {
                    return controller.isUuid(node);
                };

                scope.isSelected = function(node) {
                    return controller.isSelected(node);
                };

                /*
                scope.addNode = function () {
                  var addEvent = {
                    commit: function (error) {
                      if (error) {
                        scope.addErrorMessage = error;
                      }
                      else {
                        scope.newNodeName = '';
                        scope.addErrorMessage = '';
                      }
                    }
                  };

                  controller.addNode(addEvent, scope.newNodeName, scope.node);
                };

                scope.isEditing = function () {
                  return isEditing;
                };

                scope.canRemove = function () {
                  return !(scope.hasChildren());
                };

                scope.remove = function (event, index) {
                  event.stopPropagation();
                  controller.removeNode(scope.node, index, scope.$parent.node);
                };

                scope.edit = function (event) {
                    isEditing = true;
                    controller.editingScope = scope;
                  //expanded = false;
                  scope.editName = scope.node[displayProperty];
                  event.stopPropagation();
                };

                scope.canEdit = function () {
                    return !controller.editingScope || scope == controller.editingScope;
                };

                scope.canAdd = function () {
                    return !isEditing && scope.canEdit();
                };

                scope.rename = function (event) {
                  event.stopPropagation();

                  var renameEvent = {
                    commit: function (error) {
                      if (error) {
                        scope.editErrorMessage = error;
                      }
                      else {
                        scope.cancelEdit();
                      }
                    }
                  };

                  controller.renameNode(renameEvent, scope.node, scope.editName);
                };

                scope.cancelEdit = function (event) {
                  if (event) {
                    event.stopPropagation();
                  }

                  isEditing = false;
                  scope.editName = '';
                  scope.editErrorMessage = '';
                  controller.editingScope = undefined;
                };
                */

                function toggleExpanded() {
                    //if (!scope.hasChildren()) return;
                    scope.expanded = !scope.expanded;
                }

                function render() {
                    var template =
                        '<div class="tree-folder" ng-repeat="node in ' + attrs.treeViewNode +
                        '.' + foldersProperty + '">' +
                        '<a href="#" class="tree-folder-header inline" ng-click="selectNode($event)" ng-class="{ selected: isSelected(node) || isUuid(node) }">' +
                        '<i class="icon-folder-close" ng-class="getFolderIconClass()"></i> ' +
                        '<span class="tree-folder-name">{{ node.' + displayProperty +
                        ' }}</span> ' +
                        '</a>' +
                        '<div class="tree-folder-content"' + (collapsible ?
                            ' ng-show="expanded"' : '') + '>' +
                        '<div tree-view-node="node">' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        (showFiles ?
                            '<a href="#" class="tree-item" ng-repeat="file in ' + attrs
                            .treeViewNode + '.' + filesProperty +
                            '" ng-click="selectFile(file, $event)" ng-class="{ selected: isSelected(file) }">' +
                            '<span class="tree-item-name"><i ng-class="getFileIconClass(file)"></i> {{ file.' +
                            displayProperty + ' }}</span>' +
                            '</a>' : '');

                    //Rendering template.
                    element.html('').append($compile(template)(scope));
                }

                render();
            }
        };
    }])
    .directive('defaultRingtones', function($timeout, $rootScope, $uibModalStack, dataFactory,
        ngAudio, symphonyConfig, audioLibraryService, metaService, $window) {
        function loadRingtones($scope) {
            audioLibraryService.loadAudioLibraries($scope.domain.domain_uuid, false)
                .then(function(response) {
                    if (response) {
                        console.log(response);
                        $scope.audioLibraries = response;
                        syncWithUserSettings($scope);
                        $scope.$broadcast('rzSliderForceRender');
                    } else {
                        if (__env.enableDebug) console.log('FAILED LOADING AUDIO LIBRARIES');
                    };
                });
        };

        function getRingtoneByUuid($scope, uuid) {
            return audioLibraryService.getAudioLibraryFromCollectionByUuid(uuid, $scope.ringtones());
        };

        function syncWithUserSettings($scope) {
            console.log($scope.user.domain);
            var callRingtone = $scope.user.domain.callRingtone;
            var chatRingtone = $scope.user.domain.chatRingtone;
            var textRingtone = $scope.user.domain.textRingtone;
            var videoInviteRingtone = $scope.user.domain.videoInviteRingtone;
            var callRingtoneVolume = $scope.user.domain.callRingtoneVolume;
            var chatRingtoneVolume = $scope.user.domain.chatRingtoneVolume;
            var textRingtoneVolume = $scope.user.domain.textRingtoneVolume;
            var videoInviteRingtoneVolume = $scope.user.domain.videoInviteRingtoneVolume;
            if (callRingtone) {
                $scope.callRingtone = getRingtoneByUuid($scope, callRingtone.audio_library_uuid);
            }
            if (chatRingtone) {
                $scope.chatRingtone = getRingtoneByUuid($scope, chatRingtone.audio_library_uuid);
            }
            if (textRingtone) {
                $scope.textRingtone = getRingtoneByUuid($scope, textRingtone.audio_library_uuid);
            }
            if (videoInviteRingtone) {
                $scope.videoInviteRingtone = getRingtoneByUuid($scope, videoInviteRingtone.audio_library_uuid);
            }
            if (callRingtoneVolume) {
                $scope.callRingtoneVolume = callRingtoneVolume;
            } else {
                if (callRingtoneVolume === 0) {
                    $scope.callRingtoneVolume = callRingtoneVolume;
                } else {
                    $scope.callRingtoneVolume = 5;
                }
            }
            if ($scope.user.textRingtoneVolume) {
                $scope.textRingtoneVolume = textRingtoneVolume;
            } else {
                $scope.textRingtoneVolume = 5;
            }
            if ($scope.user.chatRingtoneVolume) {
                $scope.chatRingtoneVolume = chatRingtoneVolume;
            } else {
                $scope.chatRingtoneVolume = 5;
            }
            if (videoInviteRingtoneVolume) {
                $scope.videoInviteRingtoneVolume = videoInviteRingtoneVolume;
            } else {
                if (videoInviteRingtoneVolume === 0) {
                    $scope.videoInviteRingtoneVolume = videoInviteRingtoneVolume;
                } else {
                    $scope.videoInviteRingtoneVolume = 5;
                }
            }
            return undefined;
        };

        return {
            restrict: 'E',
            templateUrl: 'views/settings/default-ringtones.html',
            scope: {
                restricted: '<',
                domain: '<',
                user: '<'
            },
            link: function($scope, element, attrs) {
                $scope.ringtones = function() {
                    var libraries = audioLibraryService
                        .filterAudioLibrariesByCategories($scope.audioLibraries, [
                            'ringtones'
                        ]);
                    if (libraries) {
                        libraries = libraries.filter(function(library) {
                            return library.access_level === 'company';
                        });
                    }
                    return libraries;
                };

                loadRingtones($scope);
                $scope.updateRingtones = function() {
                    var data = {
                        domain_uuid: $scope.domain.domain_uuid,
                        user_uuid: $scope.user.id,
                        callRingtoneVolume: $scope.callRingtoneVolume,
                        textRingtoneVolume: $scope.textRingtoneVolume,
                        chatRingtoneVolume: $scope.chatRingtoneVolume,
                        videoInviteRingtoneVolume: $scope.videoInviteRingtoneVolume
                    };
                    if (__env.enableDebug) console.log('RINGTONE DATA');
                    if (__env.enableDebug) console.log(data);
                    if ($scope.callRingtone) {
                        data.callRingtone = $scope.callRingtone.audio_library_uuid;
                    };
                    if ($scope.textRingtone) {
                        data.textRingtone = $scope.textRingtone.audio_library_uuid;
                    };
                    if ($scope.chatRingtone) {
                        data.chatRingtone = $scope.chatRingtone.audio_library_uuid;
                    };
                    if ($scope.videoInviteRingtone) {
                        data.videoInviteRingtone = $scope.videoInviteRingtone.audio_library_uuid;
                    };
                    dataFactory.postUpdateDefaultRingtones(data).then(function(response) {
                        if (response.data.success) {
                            if (__env.enableDebug) console.log(
                                'RINGTONE RESPONSE');
                            if (__env.enableDebug) console.log(response.data.success);
                            var settings = response.data.success.settings;
                            if (settings.callRingtone) {
                                $scope.user.domain.callRingtone = settings.callRingtone;
                                $scope.user.domain.callRingtoneVolume = data.callRingtoneVolume;
                                $rootScope.user.domain.callRingtone = settings.callRingtone;
                                $rootScope.user.domain.callRingtoneVolume =
                                    data.callRingtoneVolume;
                            }
                            if (settings.textRingtone) {
                                $scope.user.domain.textRingtone = settings.textRingtone;
                                $scope.user.domain.textRingtoneVolume = data.textRingtoneVolume;
                                $rootScope.user.domain.textRingtone = settings.textRingtone;
                                $rootScope.user.domain.textRingtoneVolume =
                                    data.textRingtoneVolume;
                            }
                            if (settings.chatRingtone) {
                                $scope.user.domain.chatRingtone = settings.chatRingtone;
                                $scope.user.domain.chatRingtoneVolume = data.chatRingtoneVolume;
                                $rootScope.user.domain.chatRingtone = settings.chatRingtone;
                                $rootScope.user.domain.chatRingtoneVolume =
                                    data.chatRingtoneVolume;
                            }
                            if (settings.videoInviteRingtone) {
                                $scope.user.domain.videoInviteRingtone =
                                    settings.videoInviteRingtone;
                                $scope.user.domain.videoInviteRingtoneVolume =
                                    data.videoInviteRingtoneVolume;
                                $rootScope.user.domain.videoInviteRingtone =
                                    settings.videoInviteRingtone;
                                $rootScope.user.domain.videoInviteRingtoneVolume =
                                    data.videoInviteRingtoneVolume;
                            }
                            //$rootScope.showSuccessAlert("Ringtones have been updated!");
                            $rootScope.$broadcast('reset.audio.libraries');
                            $uibModalStack.dismissAll();
                        } else if (response.data.error) {
                            if (__env.enableDebug) console.log(response.data.error
                                .message);
                            $rootScope.showErrorAlert(
                                "There was an error updating your ringtones :("
                            );
                        }
                    });
                };

                $scope.onCloseModal = function() {
                    $uibModalStack.dismissAll();
                    $rootScope.$broadcast('ringtones.modal.closed');
                };

                metaService.rootScopeOn($scope, 'ringtones.modal.closed', function() {
                    $scope.stopPlayingLibrary();
                });

                $scope.stopPlayingLibrary = function() {
                    if ($scope.audio) {
                        $scope.audio.pause();
                        $scope.audio = undefined;
                        $scope.libraryPlaying = undefined;
                    }
                };

                $scope.filteredLibraries = function() {
                    var libraries = audioLibraryService
                        .filterAudioLibrariesByCategories($scope.audioLibraries,
                            $scope.categories);
                    libraries = audioLibraryService
                        .filterAudioLibrariesByField(libraries,
                            'access_level',
                            $scope.accessLevels);
                    return libraries;
                };

                $scope.playRingtone = function(ringtone, type) {
                    if ($scope.audio) {
                        $scope.audio.pause();
                    };
                    $scope.audio = new Audio(symphonyConfig.audioUrl + ringtone.filepath);
                    var reassignVolume = function(newVal, oldVal) {
                        if (newVal !== oldVal) {
                            $scope.audio.volume = newVal / 10;
                        }
                    };
                    if (type === 'call') {
                        $scope.audio.volume = $scope.callRingtoneVolume / 10;
                        $scope.clearVolumeWatch = $scope.$watch('callRingtoneVolume',
                            reassignVolume);
                    } else if (type === 'chat') {
                        $scope.audio.volume = $scope.chatRingtoneVolume / 10;
                        $scope.clearVolumeWatch = $scope.$watch('chatRingtoneVolume',
                            reassignVolume);
                    } else if (type === 'text') {
                        $scope.audio.volume = $scope.textRingtoneVolume / 10;
                        $scope.clearVolumeWatch = $scope.$watch('textRingtoneVolume',
                            reassignVolume);
                    } else if (type === 'videoInvite') {
                        $scope.audio.volume = $scope.videoInviteRingtoneVolume / 10;
                        $scope.clearVolumeWatch = $scope.$watch(
                            'videoInviteRingtoneVolume',
                            reassignVolume);
                    }
                    if (!$scope.audio.error) {
                        $scope.ringtonePlaying = type;
                        $scope.progress = $scope.audio.progress;
                        $scope.audio.play();
                        $scope.clearWatch = $scope.$watch('audio.progress', function(
                            newVal) {
                            if (newVal === 1) {
                                $scope.audio = undefined;
                                $scope.ringtonePlaying = false;
                                $scope.clearWatch();
                                $scope.clearVolumeWatch();
                            }
                        });
                    }
                };

                $scope.$watchGroup(['callRingtone', 'textRingtone',
                        'chatRingtone', 'videoInviteRingtone'
                    ],
                    function(newVals, oldVals) {
                        $scope.stopRingtone();
                    });

                $scope.stopRingtone = function() {
                    if ($scope.audio) {
                        $scope.audio.pause();
                        $scope.audio = undefined;
                        $scope.ringtonePlaying = false;
                        $scope.clearWatch();
                    }
                };

                dataFactory.getNotificationsStatus().then(function(response) {
                    if (response.data.success) {
                        $scope.show_notifications = response.data.success.data;
                        $scope.user.show_notifications = response.data.success.data;

                    }
                });

                $scope.setNotificationsStatus = function() {
                    $timeout(function() {
                        var value = $scope.show_notifications;
                        dataFactory.getSetNotificationsStatus(value)
                            .then(function(response) {
                                if (response.data.success) {
                                    // $scope.show_notifications = response.data.success.data;
                                    if (__env.enableDebug) console.log(
                                        'got back');
                                    if (__env.enableDebug) console.log(
                                        response.data.success.data);
                                    response.data.success.data === "true" ?
                                        response.data.success.data = true :
                                        response.data.success.data = false;
                                    $scope.user.show_notifications =
                                        response.data.success.data;
                                }
                            });
                    }, 50);
                };
            }
        };
    })
    .directive('ringtoneSettings', function($timeout, $rootScope, dataFactory, ngAudio,
        symphonyConfig, audioLibraryService, metaService, callService) {
        function loadRingtones($scope) {
            audioLibraryService.loadAudioLibraries($scope.user.domain_uuid, false)
                .then(function(response) {
                    if (response) {
                        $scope.audioLibraries = response;
                        if (__env.enableDebug) console.log('LOADED AUDIO LIBRARIES');
                        syncWithUserSettings($scope);
                    } else {
                        if (__env.enableDebug) console.log('FAILED LOADING AUDIO LIBRARIES');
                    };
                });
        };

        function getRingtoneByUuid($scope, uuid) {
            var result = audioLibraryService.getAudioLibraryFromCollectionByUuid(uuid, $scope.ringtones());
            var r = $rootScope;
            if (!result) {
                if (__env.enableDebug) console.log("COULDNT FIND");
                if (__env.enableDebug) console.log(uuid);
            }
            return result;
        };

        function findUserSettingByField($scope, field, subfield) {
            if (!subfield) {
                subfield = field;
            }
            return $scope.user[field] ? $scope.user[field] : ($scope.user.domain[field] ?
                $scope.user.domain[field][subfield] : null);
        };

        function assignRingtone($scope, field, subfield) {
            var value = findUserSettingByField($scope, field, subfield);
            if (value) {
                $scope[field] = getRingtoneByUuid($scope, value);
            }
        };

        function assignRingtoneVolume($scope, field) {
            var value = findUserSettingByField($scope, field);
            if (value) {
                $scope[field] = value;
            } else {
                if ($scope.user[field] === undefined) {
                    $scope[field] = 5;
                } else {
                    $scope[field] = $scope.user[field];
                }
            }
        };

        function syncWithUserSettings($scope) {
            if (__env.enableDebug) console.log('SYNCING RINGTONES');
            if (__env.enableDebug) console.log($rootScope.user);
            assignRingtone($scope, 'callRingtone', 'audio_library_uuid');
            assignRingtone($scope, 'chatRingtone', 'audio_library_uuid');
            assignRingtone($scope, 'textRingtone', 'audio_library_uuid');
            assignRingtone($scope, 'videoInviteRingtone', 'audio_library_uuid');
            assignRingtoneVolume($scope, 'callRingtoneVolume');
            assignRingtoneVolume($scope, 'chatRingtoneVolume');
            assignRingtoneVolume($scope, 'textRingtoneVolume');
            assignRingtoneVolume($scope, 'videoInviteRingtoneVolume');
            assignRingtoneVolume($scope, 'callOutputSourceVolume');

            return undefined;
        };

        return {
            restrict: 'E',
            templateUrl: 'views/settings/ringtone-settings.html',
            scope: {
                user: '='
            },
            link: function($scope, element, attrs) {

                $scope.assignMediaDevices = function() {

                    if ($scope.mediaDevices) {
                        angular.forEach($scope.mediaDevices, function(device) {
                            if (device.deviceId == "default" && device.kind ==
                                "audiooutput") {
                                $scope.callRingtoneMedia = device;
                                $scope.chatRingtoneMedia = device;
                                $scope.textRingtoneMedia = device;
                                $scope.videoInviteRingtoneMedia = device;
                                $scope.callOutputSource = device;
                            }
                            if (device.deviceId == "default" && device.kind ==
                                "audioinput") {
                                $scope.microphoneMedia = device;
                            }
                            if ($scope.user.callRingtoneMedia && device.kind ==
                                "audiooutput") {
                                if (device.deviceId == $scope.user.callRingtoneMedia
                                    .device_id) {
                                    $scope.callRingtoneMedia = device;
                                }
                            }
                            if ($scope.user.chatRingtoneMedia && device.kind ==
                                "audiooutput") {
                                if (device.deviceId == $scope.user.chatRingtoneMedia
                                    .device_id) {
                                    $scope.chatRingtoneMedia = device;
                                }
                            }
                            if ($scope.user.textRingtoneMedia && device.kind ==
                                "audiooutput") {
                                if (device.deviceId == $scope.user.textRingtoneMedia
                                    .device_id) {
                                    $scope.textRingtoneMedia = device;
                                }
                            }
                            if ($scope.user.videoInviteRingtoneMedia && device.kind ==
                                "audiooutput") {
                                if (device.deviceId == $scope.user.videoInviteRingtoneMedia
                                    .device_id) {
                                    $scope.videoInviteRingtoneMedia = device;
                                }
                            }
                            if ($scope.user.microphoneMedia && device.kind ==
                                "audioinput") {
                                if (device.deviceId == $scope.user.microphoneMedia
                                    .device_id) {
                                    $scope.microphoneMedia = device;
                                }
                            }
                            if ($scope.user.callOutputSource && device.kind ==
                                "audiooutput") {
                                if (device.deviceId == $scope.user.callOutputSource
                                    .device_id) {
                                    $scope.callOutputSource = device;
                                }
                            }
                        });
                    }
                }

                metaService.registerOnRootScopeUserLoadCallback(function() {
                    $scope.mediaDevices = [];
                    navigator.mediaDevices.enumerateDevices()
                        .then(function(response) {
                            angular.forEach(response, function(device) {
                                if (device.label != 'Communications') {
                                    $scope.mediaDevices.push(device);
                                }
                            });

                            $scope.assignMediaDevices();
                        });
                });

                $rootScope.libraryDeleted = null;
                $scope.ringtones = function() {
                    var libraries = audioLibraryService
                        .filterAudioLibrariesByCategories($scope.audioLibraries, [
                            'ringtones'
                        ]);
                    if (libraries) {
                        libraries = libraries.filter(function(library) {
                            return library.user_uuid === $scope.user.id ||
                                library.access_level === 'company';
                        });
                    }
                    return libraries;
                };
                $scope.$on('profile.emulation.ended', function($event, user) {
                    if (user.id === $scope.user.id) {
                        loadRingtones($scope);
                    }
                });
                if ($rootScope.userLoaded) {
                    loadRingtones($scope);
                } else {
                    metaService.rootScopeOn($scope, 'user.loaded', function() {
                        loadRingtones($scope);
                    });
                }
                $scope.updateRingtones = function() {
                    var data = {
                        user_uuid: $scope.user.id,
                    };
                    if ($scope.callRingtone) {
                        data.callRingtone = $scope.callRingtone.audio_library_uuid;
                    };
                    if ($scope.textRingtone) {
                        data.textRingtone = $scope.textRingtone.audio_library_uuid;
                    };
                    if ($scope.chatRingtone) {
                        data.chatRingtone = $scope.chatRingtone.audio_library_uuid;
                    };
                    if ($scope.videoInviteRingtone) {
                        data.videoInviteRingtone = $scope.videoInviteRingtone.audio_library_uuid;
                    };

                    dataFactory.postUpdateRingtones(data).then(function(response) {
                        if (response.data.success) {
                            var settings = response.data.success.settings;
                            if (settings.callRingtone) {
                                $scope.user.callRingtone = settings.callRingtone
                                    .audio_library_uuid;
                                $scope.user.callRingtonePath = settings.callRingtone
                                    .filepath;

                            }
                            if (settings.textRingtone) {
                                $scope.user.textRingtone = settings.textRingtone
                                    .audio_library_uuid;
                                $scope.user.textRingtonePath = settings.textRingtone
                                    .filepath;
                            }
                            if (settings.chatRingtone) {
                                $scope.user.chatRingtone = settings.chatRingtone
                                    .audio_library_uuid;
                                $scope.user.chatRingtonePath = settings.chatRingtone
                                    .filepath;
                            }
                            if (settings.videoInviteRingtone) {
                                $scope.user.videoInviteRingtone = settings.videoInviteRingtone
                                    .audio_library_uuid;
                                $scope.user.videoInviteRingtonePath = settings.videoInviteRingtone
                                    .filepath;
                            }
                            $rootScope.showSuccessAlert(
                                "Ringtones have been updated!");
                        } else if (response.data.error) {
                            if (__env.enableDebug) console.log(response.data.error
                                .message);
                            $rootScope.showErrorAlert(
                                "There was an error updating your ringtones :("
                            );
                        }
                    });
                };

                $scope.updateRingtonesVolume = function() {
                    var data = {
                        user_uuid: $scope.user.id,
                        callRingtoneVolume: $scope.callRingtoneVolume,
                        textRingtoneVolume: $scope.textRingtoneVolume,
                        chatRingtoneVolume: $scope.chatRingtoneVolume,
                        videoInviteRingtoneVolume: $scope.videoInviteRingtoneVolume,
                        callOutputSourceVolume: $scope.callOutputSourceVolume
                    };

                    dataFactory.postUpdateRingtonesVolume(data).then(function(response) {
                        if (response.data.success) {
                            var settings = response.data.success.settings;
                            if (settings.callRingtoneVolume || settings.callRingtoneVolume ===
                                0) {
                                $scope.user.callRingtoneVolume = settings.callRingtoneVolume;
                                $scope.user.domain.callRingtoneVolume =
                                    settings.callRingtoneVolume;
                                $rootScope.user.callRingtoneVolume = settings.callRingtoneVolume;
                                $rootScope.user.domain.callRingtoneVolume =
                                    settings.callRingtoneVolume;
                            }
                            if (settings.textRingtoneVolume || settings.textRingtoneVolume ===
                                0) {
                                $scope.user.textRingtoneVolume = settings.textRingtoneVolume;
                                $scope.user.domain.textRingtoneVolume =
                                    settings.textRingtoneVolume;
                                $rootScope.user.textRingtoneVolume = settings.textRingtoneVolume;
                                $rootScope.user.domain.textRingtoneVolume =
                                    settings.textRingtoneVolume;
                            }
                            if (settings.chatRingtoneVolume || settings.chatRingtoneVolume ===
                                0) {
                                $scope.user.chatRingtoneVolume = settings.chatRingtoneVolume;
                                $scope.user.domain.chatRingtoneVolume =
                                    settings.chatRingtoneVolume;
                                $rootScope.user.chatRingtoneVolume = settings.chatRingtoneVolume;
                                $rootScope.user.domain.chatRingtoneVolume =
                                    settings.chatRingtoneVolume;
                            }
                            if (settings.videoInviteRingtoneVolume || settings.videoInviteRingtoneVolume ===
                                0) {
                                $scope.user.videoInviteRingtoneVolume =
                                    settings.videoInviteRingtoneVolume;
                                $scope.user.domain.videoInviteRingtoneVolume =
                                    settings.videoInviteRingtoneVolume;
                                $rootScope.user.videoInviteRingtoneVolume =
                                    settings.videoInviteRingtoneVolume;
                                $rootScope.user.domain.videoInviteRingtoneVolume =
                                    settings.videoInviteRingtoneVolume;
                            }

                            if (settings.callOutputSourceVolume || settings.callOutputSourceVolume ===
                                0) {
                                $scope.user.callOutputSourceVolume = settings.callOutputSourceVolume;
                                $rootScope.user.callOutputSourceVolume =
                                    settings.callOutputSourceVolume;
                            }
                            $rootScope.showSuccessAlert(
                                "Volume controls have been updated!");
                        } else if (response.data.error) {
                            if (__env.enableDebug) console.log(response.data.error
                                .message);
                            $rootScope.showErrorAlert(
                                "There was an error updating your Volume controls :("
                            );
                        }
                    });
                };

                $scope.updateRingtonesMediaSource = function() {
                    var data = {
                        user_uuid: $scope.user.id,
                    };
                    if ($scope.callRingtoneMedia) {
                        data.callRingtoneMedia = $scope.callRingtoneMedia;
                    };
                    if ($scope.textRingtoneMedia) {
                        data.textRingtoneMedia = $scope.textRingtoneMedia;
                    };
                    if ($scope.chatRingtoneMedia) {
                        data.chatRingtoneMedia = $scope.chatRingtoneMedia;
                    };
                    if ($scope.videoInviteRingtoneMedia) {
                        data.videoInviteRingtoneMedia = $scope.videoInviteRingtoneMedia;
                    };
                    if ($scope.microphoneMedia) {
                        data.microphoneMedia = $scope.microphoneMedia;
                    };
                    if ($scope.callOutputSource) {
                        data.callOutputSource = $scope.callOutputSource;
                    };

                    dataFactory.postUpdateRingtonesSource(data).then(function(response) {
                        if (response.data.success) {
                            var settings = response.data.success.settings;
                            if (settings.callRingtoneMedia) {
                                $scope.user.callRingtoneMedia = settings.callRingtoneMedia;
                                $rootScope.user.callRingtoneMedia = settings.callRingtoneMedia;
                            }
                            if (settings.textRingtoneMedia) {
                                $scope.user.textRingtoneMedia = settings.textRingtoneMedia;
                                $rootScope.user.textRingtoneMedia = settings.textRingtoneMedia;
                            }
                            if (settings.chatRingtoneMedia) {
                                $scope.user.chatRingtoneMedia = settings.chatRingtoneMedia;
                                $rootScope.user.chatRingtoneMedia = settings.chatRingtoneMedia;
                            }
                            if (settings.videoInviteRingtoneMedia) {
                                $scope.user.videoInviteRingtoneMedia =
                                    settings.videoInviteRingtoneMedia;
                                $rootScope.user.videoInviteRingtoneMedia =
                                    settings.videoInviteRingtoneMedia;
                            }
                            if (settings.callOutputSource) {
                                $scope.user.callOutputSource =
                                    settings.callOutputSource;
                                $rootScope.user.callOutputSource = settings.callOutputSource;
                            }
                            if (settings.microphoneMedia) {
                                $scope.user.microphoneMedia = settings.microphoneMedia;
                                $rootScope.user.microphoneMedia = settings.microphoneMedia;
                                callService.initialize();
                            }
                            $rootScope.showSuccessAlert(
                                "Media Source has been updated!");
                        } else if (response.data.error) {
                            if (__env.enableDebug) console.log(response.data.error
                                .message);
                            $rootScope.showErrorAlert(
                                "There was an error updating your Media Source :("
                            );
                        }
                    });

                };


                metaService.rootScopeOn($scope, 'reset.audio.libraries', function() {
                    loadRingtones($scope);
                });

                $scope.showRingtonesModal = function() {
                    $rootScope.showModalFull('/modals/ringtone-manager-modal.html', {
                        restricted: true,
                        onClose: $scope.onCloseModal,
                        libraries: $scope.audioLibraries,
                        domain: $scope.user.domain,
                        user: $scope.user
                    }, 'lg');
                };

                $scope.onCloseModal = function() {
                    $rootScope.$broadcast('ringtones.modal.closed');
                };

                $scope.isDomainDefault = function(ringtone, type) {
                    if (type === 'call' && $rootScope.user.domain.callRingtone &&
                        $rootScope.user.domain.callRingtone.audio_library_uuid ===
                        ringtone.audio_library_uuid) return true;
                    if (type === 'chat' && $rootScope.user.domain.chatRingtone &&
                        $rootScope.user.domain.chatRingtone.audio_library_uuid ===
                        ringtone.audio_library_uuid) return true;
                    if (type === 'text' && $rootScope.user.domain.textRingtone &&
                        $rootScope.user.domain.textRingtone.audio_library_uuid ===
                        ringtone.audio_library_uuid) return true;
                    if (type === 'videoInvite' && $rootScope.user.domain.videoInviteRingtone &&
                        $rootScope.user.domain.videoInviteRingtone.audio_library_uuid ===
                        ringtone.audio_library_uuid) return true;
                    return false;
                };

                $scope.uploadRingtone = function(file) {
                    var opts = {file: file, category: "ringtones", accessLevel: "personal"};
                    audioLibraryService.createLibrary(opts).then(
                        function(response) {
                            if (response.data.success) {
                                $scope.successMessage = response.data.success.message;
                                $rootScope.showSuccessAlert(response.data.success.message);
                                $scope.opcBroadcast = null;
                                $scope.showPlayer = true;
                                loadRingtones($scope);
                            } else {
                                $scope.errorMessage = response.data.error.message;
                                if (__env.enableDebug) console.log(response.data.error
                                    .message);
                            }
                        });
                };

                $scope.playRingtone = function(ringtone, type, media) {
                    if ($scope.audio) {
                        $scope.audio.pause();
                    };
                    if (__env.enableDebug) console.log(symphonyConfig.audioUrl +
                        ringtone.filepath);
                    $scope.audio = new Audio(symphonyConfig.audioUrl + ringtone.filepath);
                    if (media) {
                        $scope.audio.setSinkId(media.deviceId);
                    }
                    /*var reassignVolume = function(newVal, oldVal) {
                      if (newVal !== oldVal) {
                      $scope.audio.volume = newVal / 10;
                      }
                      };*/
                    if (type === 'call') {
                        $scope.audio.volume = $scope.callRingtoneVolume / 10;
                        /*$scope.clearVolumeWatch = $scope.$watch('callRingtoneVolume',
                          reassignVolume);*/
                    } else if (type === 'chat') {
                        $scope.audio.volume = $scope.chatRingtoneVolume / 10;
                        /*$scope.clearVolumeWatch = $scope.$watch('chatRingtoneVolume',
                          reassignVolume);*/
                    } else if (type === 'text') {
                        $scope.audio.volume = $scope.textRingtoneVolume / 10;
                        /* $scope.clearVolumeWatch = $scope.$watch('textRingtoneVolume',
                           reassignVolume);*/
                    } else if (type === 'videoInvite') {
                        $scope.audio.volume = $scope.videoInviteRingtoneVolume / 10;
                        /*$scope.clearVolumeWatch = $scope.$watch('videoInviteRingtoneVolume',
                          reassignVolume);*/
                    } else if (type === 'callOutputSrc') {
                        $scope.audio.volume = $scope.callOutputSourceVolume / 10;
                        /*$scope.clearVolumeWatch = $scope.$watch('videoInviteRingtoneVolume',
                          reassignVolume);*/
                    }
                    if (!$scope.audio.error) {
                        $scope.ringtonePlaying = type;
                        $scope.progress = $scope.audio.progress;
                        $scope.audio.play();
                        $scope.clearWatch = $scope.$watch('audio.progress', function(
                            newVal) {
                            if (newVal === 1) {
                                $scope.audio = undefined;
                                $scope.ringtonePlaying = false;
                                $scope.clearWatch();
                                $scope.clearVolumeWatch();
                            }
                        });
                    }
                };

                $scope.$watchGroup(['callRingtone', 'textRingtone', 'chatRingtone',
                        'videoInvite', 'callOutputSrc'
                    ],
                    function(newVals, oldVals) {
                        $scope.stopRingtone();
                    });

                $rootScope.$watch('libraryDeleted', function(newVal, oldVal) {
                    if (newVal) {
                        if (__env.enableDebug) console.log($rootScope.libraryDeleted);
                        $timeout(function() {
                            dataFactory.getUserRingtoneSettings($scope.user
                                    .id)
                                .then(function(response) {
                                    if (__env.enableDebug) console.log(
                                        response.data);
                                    if (response.data.success) {
                                        var info = response.data.success
                                            .data;
                                        if (info["callRingtone"]) $scope
                                            .user.callRingtone = info[
                                                "callRingtone"].audio_library_uuid;
                                        if (info["chatRingtone"]) $scope
                                            .user.chatRingtone = info[
                                                "chatRingtone"].audio_library_uuid;
                                        if (info["textRingtone"]) $scope
                                            .user.textRingtone = info[
                                                "textRingtone"].audio_library_uuid;
                                        if (info["videoInviteRingtone"]) {
                                            $scope.user.videoInviteRingtone =
                                                info[
                                                    "videoInviteRingtone"
                                                ].audio_library_uuid;
                                        }
                                        loadRingtones($scope);
                                        $rootScope.libraryDeleted =
                                            null;

                                        if (__env.enableDebug) console.log(
                                            $rootScope.libraryDeleted
                                        );
                                        if (__env.enableDebug) console.log(
                                            $scope);
                                    }
                                });
                        }, 2000);
                    }
                });

                $scope.stopRingtone = function() {
                    if ($scope.audio) {
                        $scope.audio.pause();
                        $scope.audio = undefined;
                        $scope.ringtonePlaying = false;
                        $scope.clearWatch();
                    }
                };

                $scope.triggerUpload = function() {
                    $scope.triggerUploader = true;
                };

                dataFactory.getNotificationsStatus($scope.user.id).then(function(response) {
                    if (response.data.success) {
                        $scope.show_notifications = response.data.success.data;
                        $rootScope.user.show_notifications = response.data.success.data;

                    }
                });

                $scope.show_waiting = $rootScope.user.show_waiting;

                $scope.setNotificationsStatus = function() {
                    $timeout(function() {
                        var value = $scope.show_notifications;
                        dataFactory.getSetNotificationsStatus(value, $scope.user
                                .id)
                            .then(function(response) {
                                if (response.data.success) {
                                    var result = response.data.success.data;
                                    result === "true" ? result = true :
                                        result = false;
                                    $rootScope.user.show_notifications =
                                        result;
                                }
                            });
                    }, 50);
                };

                $scope.setCallWaitingStatus = function() {
                    $timeout(function() {
                        var value = $scope.show_waiting;
                        dataFactory.getSetCallWaitingStatus(value, $scope.user.id)
                            .then(function(response) {
                                if (response.data.success) {
                                    var result = response.data.success.data;
                                    $rootScope.user.show_waiting = result;
                                }
                            });
                    }, 50);
                };
            }
        };
    })
    .directive('audioSelector', function($timeout, $rootScope, dataFactory, ngAudio, symphonyConfig,
        $filter, __env) {
        function loadAudioLibrary($scope) {
            dataFactory.getVoicemailGreetings($scope.user.id)
                .then(function(response) {
                    if (response.data.success) {
                        if (__env.enableDebug) console.log("AUDIO LIBRARY");
                        if (__env.enableDebug) console.log(response.data.success.data);
                        $scope.audioLibrary = response.data.success.data;
                    } else {
                        if (__env.enableDebug) console.log(response.data.error.message);
                    }
                });
        }

        function saveScheduleEntry(data, index, $scope) {
            if (__env.enableDebug) console.log(data);
            data.user_uuid = $scope.user.id;
            dataFactory.postUpdateRoboCallSchedule(data)
                .then(function(response) {
                    if (__env.enableDebug) console.log("RESPONSE TO SAVE SCHEDULE");
                    if (__env.enableDebug) console.log(response);
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        if (__env.enableDebug) console.log($rootScope.broadcast.schedules[
                            index]);
                        if (__env.enableDebug) console.log(response.data.success.data);
                        //$rootScope.broadcast.schedules[index] = response.data.success.data;
                        //$scope.editMessage[index] = false;
                    }
                }, function(error) {
                    $rootScope.alerts.push({
                        type: 'danger',
                        msg: 'Failure: ' + JSON.stringify(error)
                    });
                });
        }
        return {
            restrict: 'E',
            templateUrl: 'views/settings/audio-selector.html',
            scope: {
                settings: '=',
                user: '='
            },
            link: function($scope, element, attrs) {
                if (__env.enableDebug) console.log($scope.settings);
                $scope.audiopath = '/imported/freeswitch/storage/voicemail/default/';
                $scope.init = function() {
                    var audiopath = $scope.audiopath;
                    audiopath += $scope.user.domain.domain_name + '/';
                    if ($scope.user.voicemail) {
                        audiopath += $scope.user.voicemail.voicemail_id + '/';
                    }
                    loadAudioLibrary($scope);
                    $scope.showPlayer = false;
                    $scope.audioFilePlaying = null;
                };
                if ($scope.user) {
                    $scope.init();
                } else {
                    $scope.user = $rootScope.user;
                    $scope.init();
                };
                $scope.selectFile = function(file) {
                    $scope.settings.voicemail_greeting = file.greeting_id;
                    $scope.isActive = true;
                    var data = {
                        greeting_id: file.greeting_id,
                        voicemail_uuid: $scope.user.voicemail.voicemail_uuid,
                        user_uuid: $scope.user.id
                    };
                    dataFactory.postSetGreetingId(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.settings.voicemail_greeting = file.greeting_id;
                                $scope.user.voicemail.greeting_id = file.greeting_id;
                                $scope.opcBroadcast = null;
                                $rootScope.showSuccessAlert(response.data.success.message);
                            }
                        });
                    if (__env.enableDebug) console.log($scope.settings);
                };
                $scope.getGreetingFilepath = function(filename) {
                    return $scope.audiopath + $scope.user.domain.domain_name + '/' +
                        $scope.user.user_ext + '/' + filename;
                    //return filepath;
                };
                $scope.setOpcMessageBroadcast = function(opc) {
                    if (opc === 1) {
                        $scope.opcBroadcast = 'newrecord';
                        $scope.opcBroadcastTitle = 'Record a New Message...';
                    } else if (opc === 2) {
                        $scope.opcBroadcast = 'uploadfile';
                        $scope.opcBroadcastTitle = 'Upload an Audio File...';
                    } else if (opc === 3) {
                        $scope.opcBroadcast = 'audiolibrary';
                        $scope.opcBroadcastTitle = 'Select from Audio Library...';
                    } else {
                        $scope.opcBroadcast = 'messagetyped';
                        $scope.opcBroadcastTitle = 'Type Your Message...';
                    }
                };
                $scope.playAudioFile = function(file, uuid) {
                    if ($scope.audio) {
                        $scope.audio.pause();
                    };
                    $scope.audioFilePlaying = uuid;
                    $scope.audio = new Audio(symphonyConfig.audioUrl + file);
                    $scope.recordingPlaying = true;
                    $scope.audio.play();
                };
                $scope.stopPlaying = function() {
                    $scope.audio.pause();
                    $scope.audioFilePlaying = false;
                    $scope.recordingPlaying = false;
                };
                $scope.removeGreeting = function(file) {
                    $rootScope.confirmDialog(
                            "Are you sure you want to remove this greeting?")
                        .then(function(response) {
                            if (response) {
                                $scope.showingAlert = false;
                                dataFactory.getRemoveGreeting(file.voicemail_greeting_uuid)
                                    .then(function(response) {
                                        if (response.data.success) {
                                            $scope.settings.voicemail_greeting =
                                                response.data.success.data;
                                            if ($scope.user.voicemail) {
                                                $scope.user.voicemail.greeting_id =
                                                    response.data.success.data;
                                            }
                                            var index = $filter('getByUUID')(
                                                $scope.audioLibrary, file.voicemail_greeting_uuid,
                                                'voicemail_greeting');
                                            if (index !== null) $scope.audioLibrary
                                                .splice(index, 1);
                                        }
                                    });
                            } else {
                                $scope.showingAlert = false;
                            }
                        });
                };
                $scope.uploadAudioFile = function(file) {
                    var data = new FormData();
                    data.append('recording', file);
                    data.append('user_uuid', $scope.user.id);
                    data.append('voicemail_uuid', $scope.user.voicemail.voicemail_uuid);
                    // dataFactory.postUploadAudioFile(data)
                    dataFactory.postUploadGreeting(data)
                        .then(function(response) {
                            if (__env.enableDebug) console.log(response.data);
                            if (response.data.success) {
                                //$scope.successMessage = response.data.success.message;
                                $rootScope.showSuccessAlert(response.data.success.message);
                                $scope.settings.voicemail_greeting = response.data.success
                                    .data.greeting_id;
                                $scope.user.voicemail.greeting_id = response.data.success
                                    .data.greeting_id;
                                $scope.user.voicemailgreetings.push(response.data.success
                                    .data);
                                $scope.opcBroadcast = null;
                                $scope.showPlayer = true;
                                loadAudioLibrary($scope);
                                $scope.errorMessage = "";
                                //$scope.isActive = true;
                            } else {
                                $scope.errorMessage = response.data.error.message;
                                if (__env.enableDebug) console.log(response.data.error
                                    .message);
                            }
                        }, function(error) {
                            if (__env.enableDebug) console.log(error);
                        });
                };
                $rootScope.saveToServer = function(file) {
                    if (!file) {
                        file = $rootScope.getaudioModel;
                    };
                    $scope.uploadAudioFile(file);
                };
                $scope.playRecording = function(file) {
                    $scope.audio = new Audio(symphonyConfig.audioUrl + file);
                    $scope.recordingPlaying = true;
                    $scope.audio.play();
                };
                $scope.toggleEditGreeting = function(greeting, $event) {
                    if (greeting.editing) {
                        $timeout(function() {
                            greeting.editing = null;
                        }, 100);
                    } else {
                        var input = angular.element($event.target).siblings().closest(
                            "input")[0];
                        greeting.editing = true;
                        var greetingName = greeting.greeting_name.split('.')[0];
                        greeting.editing_greeting_name = greetingName;
                        $timeout(function() {
                            input.focus();
                        });
                    }
                };
                $scope.onEditGreetingEnter = function(greeting, $event) {
                    $event.target.blur();
                    $scope.updateEditGreeting(greeting);
                };
                $scope.updateEditGreeting = function(greeting) {
                    var extension = "";
                    if (greeting.greeting_name.indexOf(".") > -1) {
                        var splits = greeting.greeting_name.split(".");
                        extension = splits[splits.length - 1];
                    }
                    var greetingName = greeting.editing_greeting_name;
                    if (extension.length > 0) {
                        greetingName += "." + extension;
                    }
                    var greetingUuid = greeting.voicemail_greeting_uuid;
                    var oldGreetingName = greeting.greeting_name;
                    greeting.greeting_name = greetingName;
                    dataFactory.updateVoicemailGreetingName(greetingUuid, greetingName)
                        .then(function(response) {
                            if (response.data.success) {
                                var newGreeting = response.data.success.data;
                                greeting.greeting_name = newGreeting.greeting_name;
                            } else {
                                greeting.greeting_name = oldGreetingName;
                            }
                        });
                };
            }
        };
    })
    .directive('companySetupUserTab', function($rootScope, emulationService, metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/company/users.html',
            scope: {
                domain: '<',
                uploader: '<',
                triggerUpload: '&'
            },
            link: function($scope, element, attrs) {
                metaService.rootScopeOn($scope, 'emulate.profile.edit', function($event,
                    user) {
                    $scope.user = user;
                    emulationService.emulatedUser = user;
                    $scope.emulateProfileEditing = emulationService.emulatedUser;
                });
                $scope.back = function() {
                    $rootScope.$broadcast('profile.emulation.ended', emulationService.emulatedUser);
                    emulationService.emulatedUser = null;
                    $scope.emulateProfileEditing = emulationService.emulatedUser;
                };
            }
        };
    })
    .directive('companySetupAutoAttendant', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/company/attendant.html'
        };
    })
    .directive('companySetupAudioTab', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/company/company-setup-audio-tab.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.state = 'ringtones';
            }
        };
    })
    .directive('musicOnHoldManageTable', function(musicOnHoldService, symphonyConfig, __env,
        fileService, $timeout, $rootScope, dataFactory) {

        return {
            restrict: 'E',
            templateUrl: 'views/company/music-on-hold-manage-table.html',
            scope: {
                domain: '='
            },
            link: function($scope, element, attrs) {
                function loadMusicOnHoldRecords() {
                    musicOnHoldService.loadMusicOnHoldRecords()
                        .then(function(response) {
                            console.log(response);
                            if (response && response[0]) {
                                $scope.record = response[0];
                            }
                        });
                };

                function loadCurrentParkingMoh() {
                    dataFactory.getCurrentParkingMoh()
                        .then(function(response) {
                            console.log(response);
                            if (response.data.success) {
                                var fileName = response.data.success.data;
                                $scope.parkingMoh[fileName] = true;
                            }
                        });
                };
                loadMusicOnHoldRecords();
                loadCurrentParkingMoh();
                $scope.triggerUpload = function() {
                    $scope.triggerUploader = true;
                };
                $scope.parkingMoh = {};
                $scope.onParkingMohChange = function(record, fileName) {
                    var keys = Object.keys($scope.parkingMoh).filter(function(key) {
                        return key !== fileName;
                    });
                    keys.forEach(function(key) {
                        delete $scope.parkingMoh[key];
                    });
                    dataFactory.updateParkingMoh(record.music_on_hold_uuid, fileName)
                        .then(function(response) {
                            var message;
                            if (response.data.success) {
                                message =
                                    "Parking Music On Hold successfully updated";
                                $rootScope.showInfoAlert(message);
                            }
                        });
                };

                $scope.createMusicOnHoldRecord = function(file) {
                    $scope.uploadingRecord = true;
                    var result = musicOnHoldService.allowedMusicOnHoldTypes.indexOf(
                        file.type) > -1;
                    if (result) {
                        if ($scope.record) {
                            musicOnHoldService.addMusicToMusicOnHold($scope.domain.domain_uuid,
                                    $scope.record, file)
                                .then(function(response) {
                                    $scope.uploadingRecord = false;
                                    console.log($scope.record);
                                    if (response.data.error) {
                                        $rootScope.showErrorAlert(
                                            'Could not upload your file. Only mp3 and wav files are allowed.'
                                        );
                                    } else if ($scope.record.isDefault) {
                                        loadMusicOnHoldRecords();
                                        loadCurrentParkingMoh();
                                    } else if (response.data.success) {
                                        var filename = response.data.success.data;
                                        $scope.record.files.push(filename);
                                    }
                                });
                        } else {
                            // musicOnHoldService.createMusicOnHold(file, 'domainMusic')
                            //     .then(function(response) {
                            //         $scope.uploadingRecord = false;
                            //         if (response.data.success) {
                            //             $scope.record = response;
                            //         } else {
                            //             $rootScope.showErrorAlert('Could not upload your file. Only mp3 and wav files are allowed.');
                            //         }
                            //     });
                        }
                    } else {
                        $scope.uploadingRecord = false;
                        $rootScope.showErrorAlert(
                            'Invalid file format, please upload an audio file.');
                    }
                };


                $scope.isDefaultMOHFile = function(fileName) {
                    return fileName === musicOnHoldService.data.defaultMOHName;
                };

                $scope.deleteMusicFile = function(musicUuid, fileName) {
                    var message = 'Are you sure you want to delete this ringtone? ';
                    musicOnHoldService.deleteMusicFile(musicUuid, fileName, message)
                        .then(function(response) {
                            console.log(response);
                            console.log($scope.record.files);
                            if (response && response.message && $scope.record.files
                                .length === 0) {
                                loadMusicOnHoldRecords();
                                loadCurrentParkingMoh();
                                $rootScope.showAlert(response.message);
                            }
                        });

                };

                $scope.convertFreeswitchPathToFilePath = function(freeswitchPath) {
                    // var parts = freeswitchPath.split('/');
                    // var domainName = parts[6];
                    // var musicName = parts[7];
                    // var filePath = '/imported/freeswitch/music/' + domainName + '/' + musicName + '/48000/';
                    var pattern = "/usr/local/freeswitch/sounds/music/",
                        re = new RegExp(pattern, "g");
                    var filePath = freeswitchPath.replace(re,
                        "/imported/freeswitch/music/");
                    return filePath + '/';
                };

                $scope.playMusicFile = function(record, fileName) {
                    if (__env.enableDebug) console.log(record);
                    if (__env.enableDebug) console.log(fileName);
                    if ($scope.audio) {
                        $scope.audio.pause();
                    };
                    var freeswitchPath = record.music_on_hold_path;
                    var filepath = symphonyConfig.audioUrl + $scope.convertFreeswitchPathToFilePath(
                        freeswitchPath) + fileName;
                    if (__env.enableDebug) console.log(filepath);
                    $scope.audio = new Audio(filepath);
                    if (!$scope.audio.error) {
                        $scope.progress = $scope.audio.progress;
                        $scope.filePlaying = fileName;
                        $scope.audio.play();
                    }
                };

                $scope.stopPlayingFile = function() {
                    if ($scope.audio) {
                        $scope.audio.pause();
                        $scope.audio = undefined;
                        $scope.filePlaying = undefined;
                    }
                };

                $scope.downloadMusicFile = function(record, file) {
                    var apiUrl = __env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                        symphonyConfig.onescreenUrl;
                    var url = apiUrl + '/audio/musiconhold/download';
                    url += '/' + record.music_on_hold_uuid;
                    url += '/' + file;
                    url += '/' + false;
                    fileService.downloadFileByUrl(url);
                };

                $scope.removeFileExtensionFromFilename = function(filename) {
                    return fileService.removeFileExtensionFromFilename(filename);
                };

                $scope.renameFile = function(newFilename, record) {
                    if (!record) {
                        record = $scope.currentRecordEditing;
                    }
                    var currentFile = $scope.currentFileEditing ? $scope.currentFileEditing :
                        $scope.lastFileEdited;
                    var ext = fileService.getFileExtensionFromFilename(currentFile);
                    newFilename += '.' + ext;
                    musicOnHoldService.renameMusicFile(currentFile, newFilename, record);
                };

                $scope.stopEditing = function() {
                    $timeout(function() {
                        $scope.lastFileEdited = $scope.currentFileEditing;
                        $scope.currentFileEditing = null;
                        if ($scope.fileEdited) {
                            var newFilename = $scope.currentEditInput[0].value;
                            $scope.renameFile(newFilename, $scope.currentRecordEditing);
                        }
                        $scope.currentEditinput = null;
                        $scope.currentRecordEditing = null;
                        $scope.currentFileEditing = null;
                    });
                };

                $scope.editFile = function(fileName, neighborInput, record) {
                    if (!$scope.isDefaultMOHFile(fileName)) {
                        neighborInput = angular.element(neighborInput);
                        $scope.currentFileEditing = fileName;
                        $scope.currentRecordEditing = record;
                        $scope.currentEditInput = neighborInput;
                        $timeout(function() {
                            neighborInput.focus();
                        });
                    }
                };

                $scope.setFileToEdited = function() {
                    $scope.$apply(function() {
                        $scope.fileEdited = true;
                    });
                };

                $scope.getNeighboringInputValueByEvent = function($event) {
                    return $scope.getNeighboringInputByEvent($event).value;
                };

                $scope.getNeighboringInputByEvent = function($event) {
                    var element = angular.element($event.currentTarget);
                    var input = element.siblings('input');
                    return input[0];
                };

            }
        };
    })
    .directive('audioManageTable', function(audioLibraryService, symphonyConfig, ngAudio,
        fileService, $timeout, $mdDialog, usefulTools, $rootScope, metaService) {
        function filterAudioLibrariesByCategories(collection, categories) {
            return audioLibraryService.filterAudioLibrariesByCategories(collection, categories);
        };

        function loadAudioLibraries($scope) {
            audioLibraryService.loadAudioLibraries($scope.domain.domain_uuid, true)
                .then(function(response) {
                    if (response) {
                        $scope.audioLibraries = response;
                    } else {
                        if (__env.enableDebug) console.log('FAILED LOADING AUDIO LIBRARIES');
                    };
                });
        };
        return {
            restrict: 'E',
            templateUrl: 'views/company/audio-manage-table.html',
            scope: {
                restricted: '<',
                categories: '<',
                accessLevels: '<',
                domain: '<',
                option: '<',
                audioLibraries: '<',
                user: '<'
            },
            link: function($scope, element, attrs) {
                $scope.uploadingLibrary = false;
                var profileedit = true;
                if (!$scope.user) {
                    profileedit = false;
                    $scope.user = $rootScope.user;
                }
                $scope.calldefault = $scope.user.domain.callRingtone;
                $scope.textdefault = $scope.user.domain.textRingtone;
                $scope.chatdefault = $scope.user.domain.chatRingtone;
                $scope.videoinvitedefault = $scope.user.domain.videoInviteRingtone;
                if (!$scope.categories) {
                    $scope.categories = ['ringtones', 'ivrgreetings'];
                }

                if (!$scope.accessLevels) {
                    $scope.accessLevels = ['personal', 'company'];
                };

                if ($scope.domain && !$scope.audioLibraries) {
                    loadAudioLibraries($scope);
                }

                $scope.isAdminGroupOrGreater = function() {
                    var group = $rootScope.user.accessgroup;
                    return (group === 'admin' || group === 'KotterTech' || group ===
                        'superadmin');
                };

                $scope.$watch('domain', function(newVal, oldVal) {
                    if (newVal && newVal !== oldVal) {
                        loadAudioLibraries($scope);
                    }
                });
                $rootScope.$watch('user.domain.callRingtone', function(newVal, oldVal) {
                    if (newVal) {
                        $scope.calldefault = $rootScope.user.domain.callRingtone;
                    }
                });
                $rootScope.$watch('user.domain.textRingtone', function(newVal, oldVal) {
                    if (newVal) {
                        $scope.textdefault = $rootScope.user.domain.textRingtone;
                    }
                });
                $rootScope.$watch('user.domain.chatRingtone', function(newVal, oldVal) {
                    if (newVal) {
                        $scope.chatdefault = $rootScope.user.domain.chatRingtone;
                    }
                });
                $rootScope.$watch('user.domain.videoInviteRingtone', function(newVal,
                    oldVal) {
                    if (newVal) {
                        $scope.videoinvitedefault = $rootScope.user.domain.videoInviteRingtone;
                    }
                });

                if ($scope.restricted) {
                    metaService.rootScopeOn($scope, 'ringtones.modal.closed', function() {
                        $scope.stopPlayingLibrary();
                    });
                };

                $scope.filteredLibraries = function() {
                    var libraries = audioLibraryService
                        .filterAudioLibrariesByCategories($scope.audioLibraries,
                            $scope.categories);
                    libraries = audioLibraryService
                        .filterAudioLibrariesByField(libraries,
                            'access_level',
                            $scope.accessLevels);
                    return libraries;
                };

                $scope.libraryAllowed = function(library) {
                    if (!library.access_level) {
                        library.access_level = 'personal';
                    }
                    if ($scope.restricted && library.access_level === 'company') {
                        return false;
                    } else if ($scope.restricted && library.user_uuid !== $scope.user.id) {
                        return false;
                    } else {
                        return true;
                    }
                };

                $scope.showDefaultRingtonesModal = function() {
                    $rootScope.showModalFull('/modals/default-ringtones-modal.html', {
                        restricted: false,
                        domain: $scope.domain,
                        onClose: $scope.onCloseModal,
                        user: $scope.user
                    });
                };

                $scope.showNoRingtones = function() {
                    $rootScope.showInfoAlert(
                        "You must upload ringtones before you can set the default ringtones."
                    );
                };

                $scope.deleteAudioLibrary = function(library) {
                    var userUuid = null;
                    if (profileedit) {
                        userUuid = $scope.user.id;
                    }
                    $rootScope.confirmDialog(
                        'Are you sure you want to delete this ringtone? ', library.file_title
                    ).then(function(response) {
                        if (response) {
                            audioLibraryService.deleteAudioLibraryByUuid(
                                    library.audio_library_uuid, userUuid)
                                .then(function() {
                                    loadAudioLibraries($scope);
                                    var uuid = library.audio_library_uuid;
                                    var fields = ['text', 'call', 'chat',
                                        'videoInvite'
                                    ];
                                    angular.forEach(fields, function(field) {
                                        if ($scope.user[field +
                                                'Ringtone'] ===
                                            uuid) {
                                            $scope.user[field +
                                                    'Ringtone'] =
                                                null;
                                            $scope.user[field +
                                                'Ringtone' +
                                                'Path'] = null;
                                        }
                                    });
                                    $rootScope.$broadcast(
                                        'reset.audio.libraries');
                                });
                        }
                    });
                };

                $scope.triggerUpload = function() {
                    $scope.triggerUploader = true;
                };

                $scope.uploading = function() {
                    return $scope.uploadingLibrary;
                };

                $scope.sortDirection = false;
                $scope.sortCol = 'file_title';
                $scope.sortBy = function(col) {
                    if (col === $scope.sortCol) {
                        $scope.sortDirection = !$scope.sortDirection;
                    } else {
                        $scope.sortDirection = !$scope.sortDirection;
                        $scope.sortCol = col;
                    }
                };

                $scope.uploadAudioLibrary = function(libraryFile) {
                    var accessLevel = $scope.restricted ? "personal" : "company";
                    $scope.uploadingLibrary = true;
                    var opts = {
                        file: libraryFile, category: $scope.categories[0],
                        accessLevel: accessLevel, domainUuid: $scope.domain.domain_uuid,
                        collection: $scope.audioLibraries
                    };
                    audioLibraryService.createLibrary(opts)
                        .then(function(response) {
                            if (__env.enableDebug) console.log(response);
                            $scope.uploadingLibrary = false;
                            if (response.data.success) {
                                usefulTools.showSuccessAlert(response.data.success.message);
                            } else {
                                usefulTools.showErrorAlert(response.data.error.message);
                            }
                        });
                };

                $scope.playAudioLibrary = function(library) {
                    if ($scope.audio) {
                        $scope.audio.pause();
                    };
                    $scope.audio = new Audio(symphonyConfig.audioUrl + library.filepath);
                    if (!$scope.audio.error) {
                        $scope.progress = $scope.audio.progress;
                        $scope.libraryPlaying = library;
                        $scope.audio.play();
                    }
                };

                $scope.stopPlayingLibrary = function() {
                    if ($scope.audio) {
                        $scope.audio.pause();
                        $scope.audio = undefined;
                        $scope.libraryPlaying = undefined;
                    }
                };

                $scope.downloadAudioFile = function(library) {
                    var apiUrl = __env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                        symphonyConfig.onescreenUrl;
                    var url = apiUrl + '/audio/getfile/' + library.audio_library_uuid +
                        '/' + false;
                    fileService.downloadFileByUrl(url);
                };

                $scope.removeFileExtensionFromFilename = function(filename) {
                    return fileService.removeFileExtensionFromFilename(filename);
                };

                $scope.renameLibrary = function(library) {
                    var filename = library.input[0].value;
                    $scope.renameHappened = true;
                    var extension = fileService.getFileExtensionFromFilename(library.file_title);
                    filename += '.' + extension;
                    audioLibraryService
                        .renameAudioLibraryByUuid(library.audio_library_uuid, filename)
                        .then(function(response) {
                            if (response) {
                                library.file_title = response;
                            }
                            $scope.renameHappened = false;
                            $scope.stopEditingLibrary(library);
                        });
                };

                $scope.stopEditingLibrary = function(library, inputElement) {
                    $timeout(function() {
                        if (!$scope.renameHappened) {
                            library.editing = false;
                            library.edited = false;
                            library.input = false;
                            if (inputElement) {
                                inputElement.value = $scope.removeFileExtensionFromFilename(
                                    library.file_title);
                            }
                        }
                    }, 100);
                };

                $scope.editLibrary = function(library, neighborInput) {
                    if ($scope.libraryAllowed(library)) {
                        neighborInput = angular.element(neighborInput);
                        library.editing = true;
                        library.input = neighborInput;
                        $timeout(function() {
                            neighborInput.focus();
                        });
                    }
                };

                $scope.setLibraryToEdited = function(library) {
                    $scope.$apply(function() {
                        library.edited = true;
                    });
                };

                $scope.getNeighboringInputValueByEvent = function($event) {
                    return $scope.getNeighboringInputByEvent($event).value;
                };

                $scope.getNeighboringInputByEvent = function($event) {
                    var element = angular.element($event.currentTarget);
                    var input = element.siblings('input');
                    return input[0];
                };
            }
        };
    })
    .directive('companySetupPermissions', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/company/permissions.html'
        };
    })
    .directive('companySetupLocations', function() {
        return {
            restrict: 'E',

            templateUrl: 'views/company/locations.html'
        };

    })
    .directive('companySetupPermissions1', function($timeout, $rootScope, dataFactory,
        symphonyConfig, permissionGroupService) {
        function loadRingtones($scope) {
            audioLibraryService.loadAudioLibraries($scope.user.domain_uuid, false)
                .then(function(response) {
                    if (response) {
                        $scope.audioLibraries = response;
                        syncWithUserSettings($scope);
                    } else {
                        if (__env.enableDebug) console.log('FAILED LOADING AUDIO LIBRARIES');
                    };
                });
        };
        return {
            restrict: 'E',
            templateUrl: 'views/company/permissions.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.ringtones = function() {
                    var libraries = audioLibraryService
                        .filterAudioLibrariesByCategories($scope.audioLibraries, [
                            'ringtones'
                        ]);
                    if (libraries) {
                        libraries = libraries.filter(function(library) {
                            return library.user_uuid === $rootScope.user.id ||
                                library.access_level === 'company';
                        });
                    }
                    return libraries;
                };
                $scope.$on('profile.emulation.ended', function($event, user) {
                    if (user.id === $scope.user.id) {
                        loadRingtones($scope);
                    }
                });
                loadRingtones($scope);
                $scope.updateRingtones = function() {
                    var data = {
                        user_uuid: $scope.user.id,
                        callRingtoneVolume: $scope.callRingtoneVolume,
                        textRingtoneVolume: $scope.textRingtoneVolume,
                        chatRingtoneVolume: $scope.chatRingtoneVolume
                    };
                    if (__env.enableDebug) console.log('RINGTONE DATA');
                    if (__env.enableDebug) console.log(data);
                    if ($scope.callRingtone) {
                        data.callRingtone = $scope.callRingtone.audio_library_uuid;
                    };
                    if ($scope.textRingtone) {
                        data.textRingtone = $scope.textRingtone.audio_library_uuid;
                    };
                    if ($scope.chatRingtone) {
                        data.chatRingtone = $scope.chatRingtone.audio_library_uuid;
                    };
                    dataFactory.postUpdateRingtones(data).then(function(response) {
                        if (response.data.success) {
                            if (__env.enableDebug) console.log(
                                'RINGTONE RESPONSE');
                            if (__env.enableDebug) console.log(response.data.success);
                            var settings = response.data.success.settings;
                            if (settings.callRingtone) {
                                $scope.user.callRingtone = settings.callRingtone
                                    .audio_library_uuid;
                                $scope.user.callRingtonePath = settings.callRingtone
                                    .filepath;
                                $scope.user.callRingtoneVolume = data.callRingtoneVolume;
                            }
                            if (settings.textRingtone) {
                                $scope.user.textRingtone = settings.textRingtone
                                    .audio_library_uuid;
                                $scope.user.textRingtonePath = settings.textRingtone
                                    .filepath;
                                $scope.user.textRingtoneVolume = data.textRingtoneVolume;
                            }
                            if (settings.chatRingtone) {
                                $scope.user.chatRingtone = settings.chatRingtone
                                    .audio_library_uuid;
                                $scope.user.chatRingtonePath = settings.chatRingtone
                                    .filepath;
                                $scope.user.chatRingtoneVolume = data.chatRingtoneVolume;
                            }
                            $rootScope.showSuccessAlert(
                                "Ringtones have been updated!");
                        } else if (response.data.error) {
                            if (__env.enableDebug) console.log(response.data.error
                                .message);
                            $rootScope.showErrorAlert(
                                "There was an error updating your ringtones :("
                            );
                        }
                    });
                };

                $scope.showRingtonesModal = function() {
                    $rootScope.showModalFull('/modals/ringtone-manager-modal.html', {
                        restricted: true,
                        onClose: $scope.onCloseModal,
                        libraries: $scope.audioLibraries,
                        domain: $scope.user.domain,
                        user: $scope.user
                    }, 'lg');
                };

                $scope.onCloseModal = function() {
                    $rootScope.$broadcast('ringtones.modal.closed');
                };

                $scope.isDomainDefault = function(ringtone, type) {
                    if (type === 'call' && $rootScope.user.domain.callRingtone &&
                        $rootScope.user.domain.callRingtone.audio_library_uuid ===
                        ringtone.audio_library_uuid) return true;
                    if (type === 'text' && $rootScope.user.domain.textRingtone &&
                        $rootScope.user.domain.textRingtone.audio_library_uuid ===
                        ringtone.audio_library_uuid) return true;
                    if (type === 'chat' && $rootScope.user.domain.chatRingtone &&
                        $rootScope.user.domain.chatRingtone.audio_library_uuid ===
                        ringtone.audio_library_uuid) return true;
                    return false;
                };

                $scope.uploadRingtone = function(file) {
                    var opts = {file: file, category: "ringtones", accessLevel: "personal"};
                    audioLibraryService.createLibrary(opts).then(
                        function(response) {
                            if (response.data.success) {
                                $scope.successMessage = response.data.success.message;
                                $rootScope.showSuccessAlert(response.data.success.message);
                                $scope.opcBroadcast = null;
                                $scope.showPlayer = true;
                                loadRingtones($scope);
                            } else {
                                $scope.errorMessage = response.data.error.message;
                                if (__env.enableDebug) console.log(response.data.error
                                    .message);
                            }
                        });
                };

                $scope.playRingtone = function(ringtone, type) {
                    if ($scope.audio) {
                        $scope.audio.pause();
                    };
                    $scope.audio = new Audio(symphonyConfig.audioUrl + ringtone.filepath);
                    var reassignVolume = function(newVal, oldVal) {
                        if (newVal !== oldVal) {
                            $scope.audio.volume = newVal / 10;
                        }
                    };
                    if (type === 'call') {
                        $scope.audio.volume = $scope.callRingtoneVolume / 10;
                        $scope.clearVolumeWatch = $scope.$watch('callRingtoneVolume',
                            reassignVolume);
                    } else if (type === 'chat') {
                        $scope.audio.volume = $scope.chatRingtoneVolume / 10;
                        $scope.clearVolumeWatch = $scope.$watch('chatRingtoneVolume',
                            reassignVolume);
                    } else if (type === 'text') {
                        $scope.audio.volume = $scope.textRingtoneVolume / 10;
                        $scope.clearVolumeWatch = $scope.$watch('textRingtoneVolume',
                            reassignVolume);
                    }
                    if (!$scope.audio.error) {
                        $scope.ringtonePlaying = type;
                        $scope.progress = $scope.audio.progress;
                        $scope.audio.play();
                        $scope.clearWatch = $scope.$watch('audio.progress', function(
                            newVal) {
                            if (newVal === 1) {
                                $scope.audio = undefined;
                                $scope.ringtonePlaying = false;
                                $scope.clearWatch();
                                $scope.clearVolumeWatch();
                            }
                        });
                    }
                };

                $scope.$watchGroup(['callRingtone', 'textRingtone', 'chatRingtone'],
                    function(newVals, oldVals) {
                        $scope.stopRingtone();
                    });

                $rootScope.$watch('libraryDeleted', function(newVal, oldVal) {
                    if (newVal) {
                        if (__env.enableDebug) console.log($rootScope.libraryDeleted);
                        $timeout(function() {
                            dataFactory.getUserRingtoneSettings($scope.user
                                    .id)
                                .then(function(response) {
                                    if (__env.enableDebug) console.log(
                                        response.data);
                                    if (response.data.success) {
                                        var info = response.data.success
                                            .data;
                                        if (info["callRingtone"]) $scope
                                            .user.callRingtone = info[
                                                "callRingtone"].audio_library_uuid;
                                        if (info["chatRingtone"]) $scope
                                            .user.chatRingtone = info[
                                                "chatRingtone"].audio_library_uuid;
                                        if (info["textRingtone"]) $scope
                                            .user.textRingtone = info[
                                                "textRingtone"].audio_library_uuid;
                                        loadRingtones($scope);
                                        $rootScope.libraryDeleted =
                                            null;

                                        if (__env.enableDebug) console.log(
                                            $rootScope.libraryDeleted
                                        );
                                        if (__env.enableDebug) console.log(
                                            $scope);
                                    }
                                });
                        }, 2000);
                    }
                });

                $scope.stopRingtone = function() {
                    if ($scope.audio) {
                        $scope.audio.pause();
                        $scope.audio = undefined;
                        $scope.ringtonePlaying = false;
                        $scope.clearWatch();
                    }
                };

                $scope.triggerUpload = function() {
                    $scope.triggerUploader = true;
                };

                dataFactory.getNotificationsStatus($scope.user.id).then(function(response) {
                    if (response.data.success) {
                        $scope.show_notifications = response.data.success.data;
                        $rootScope.user.show_notifications = response.data.success.data;

                    }
                });

                $scope.setNotificationsStatus = function() {
                    $timeout(function() {
                        var value = $scope.show_notifications;
                        dataFactory.getSetNotificationsStatus(value, $scope.user
                                .id)
                            .then(function(response) {
                                if (response.data.success) {
                                    var result = response.data.success.data;
                                    result === "true" ? result = true :
                                        result = false;
                                    $rootScope.user.show_notifications =
                                        result;
                                }
                            });
                    }, 50);
                };
            }
        };
    })
    .directive('companySetupChatMacros', function(dataFactory, $rootScope, chatMacroService,
        $timeout) {
        function currentlyEmulating($scope) {
            if ($scope.domain) {
                return $scope.domain.domain_uuid !== $rootScope.user.domain_uuid;
            }
            return false;
        };
        return {
            restrict: 'E',
            templateUrl: 'views/company/chat-macros.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {

                $scope.newTextChoiceBranch = '';

                $scope.init = function() {
                    if (!currentlyEmulating($scope)) {
                        chatMacroService.getChatMacros().then(function(response) {
                            if (response) {
                                $scope.chatMacros = response;
                            }
                        });
                    } else {
                        chatMacroService.loadChatMacros($scope.domain.domain_uuid,
                                false)
                            .then(function(response) {
                                if (response) {
                                    var macros = {};
                                    angular.forEach(response, function(macro) {
                                        chatMacroService.addMacroToCollection(
                                            macro, macros);
                                    });
                                    $scope.chatMacros = macros;
                                }
                            });
                    }
                };
                $scope.init();

                $scope.$watch('domain', function(newVal, oldVal) {
                    if (oldVal && newVal && newVal !== oldVal) {
                        $scope.init();
                    };
                });

                $scope.updateMacro = function(macro) {
                    if (macro.editing) {
                        chatMacroService.updateMacro(macro).then(function(response) {
                            if (!response.data.success) {
                                macro.text_choice_text = macro.editing;
                            }
                            macro.editing = false;
                        });
                    }
                };

                $scope.editingHotKeys = {};

                $scope.setHotKeyToEditing = function(hotKeyText, $event) {
                    var oldVal = hotKeyText;
                    var newVal = $event.target.value;
                    $scope.$evalAsync(function() {
                        var value = oldVal !== newVal ? newVal : undefined;
                        $scope.editingHotKeys[hotKeyText] = value;
                    });
                };

                $scope.updateHotKeyText = function(hotKeyText) {
                    var newVal = $scope.editingHotKeys[hotKeyText];
                    chatMacroService.updateHotKeyText(hotKeyText, newVal)
                        .then(function(response) {
                            if (response) {
                                delete $scope.editingHotKeys[hotKeyText];
                            }
                        });
                };

                $scope.setMacroToEditing = function(macro) {
                    if (!macro.editing) {
                        macro.editing = macro.text_choice_text;
                    }
                };

                $scope.createFullMacro = function() {
                    if (currentlyEmulating($scope)) {
                        var collection = $scope.chatMacros;
                    }

                    if ($scope.hotKeyText.length <= 8) {
                        chatMacroService.createMacro($scope.hotKeyText, $scope.textChoiceText,
                            collection, $scope.domain.domain_uuid);
                    } else {
                        return $rootScope.showAlert(
                            'The Hot Key text cannot be more than 8 characters.');
                    }
                    $scope.hotKeyText = null;
                    $scope.textChoiceText = null;
                };

                $scope.createTextChoiceMacro = function(hotKeyText, innerScope) {
                    if (currentlyEmulating($scope)) {
                        var collection = $scope.chatMacros;
                    }
                    chatMacroService.createMacro(hotKeyText, innerScope.newTextChoiceBranch,
                        collection, $scope.domain.domain_uuid);
                    innerScope.newTextChoiceBranch = null;
                };

                $scope.removeMacro = function(macro) {
                    if (currentlyEmulating($scope)) {
                        var collection = $scope.chatMacros;
                    }
                    chatMacroService.deleteMacro(macro, collection);
                };
            }
        };
    })
    .directive('userImportStatus', function($rootScope, usefulTools, userService) {
        return {
            restrict: 'E',
            templateUrl: 'user-import-status.html',
            scope: {

            },
            link: function($scope, element, attrs) {
                $scope.user = $rootScope.user;
                $scope.tips = $rootScope.tips;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.setProfileColor = $rootScope.setProfileColor;

                $scope.importingUsers = function() {
                    return usefulTools.convertObjectToArray(userService.userImports);
                };

                $scope.closeBox = function(uuid) {
                    if (userService.userImports[uuid]) delete userService.userImports[
                        uuid];
                }
            }
        };
    })
    .directive('importUsers', function(dataFactory, $rootScope, $uibModalStack, symphonyConfig, __env) {
        return {
            restrict: 'E',
            templateUrl: 'import-users.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.gridOptions = {};
                $scope.onescreenUrl = __env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                    symphonyConfig.onescreenUrl;
                $scope.data = {
                    defaultnumber: $scope.domain.defaultnumber,
                    zipcode: $scope.domain.zipcode,
                    notify: true
                };

                $scope.closeImport = function() {
                    $uibModalStack.dismissAll();
                    $scope.gridOptions = {};
                };

                $scope.completeImportUsers = function() {
                    var data = {
                        domainUuid: $scope.domain.domain_uuid,
                        zipcode: $scope.data.zipcode,
                        defaultnumber: $scope.data.defaultnumber,
                        notify: $scope.data.notify,
                        userdata: prepareImportData($scope.gridOptions.data, $scope
                            .gridOptions.columnDefs)
                    };
                    dataFactory.postInitiateUserImport(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.closeImport();
                                $rootScope.showalerts(response);
                            } else {
                                var error = response.data.error.message;
                                $rootScope.showErrorAlert(error);
                            }
                        });
                };

                function prepareImportData(data, cols) {
                    var users = [];
                    angular.forEach(data, function(user) {
                        var row = [];
                        angular.forEach(cols, function(col) {
                            row.push(user[col.field]);
                        });
                        users.push(row);
                    });
                    return users;
                }
            }
        };
    })
    .directive('xlsxUserImportProcessor', function($rootScope, contactGroupsService) {
        return {
            restrict: 'E',
            templateUrl: 'xlsx-user-import-processor.html',
            scope: {
                xlsx: '=',
                columnDefs: '=',
                closeMessage: '&'
            },
            link: function($scope, element, attrs) {
                $scope.user = $rootScope.user;

                $scope.colSelect = [];
                $scope.groups = contactGroupsService.groups;
                $scope.import = {
                    destination: null
                };
            }
        };
    })
    .directive('companySetupUsersTable', function($mdDialog, $myModal, $rootScope, dataFactory,
        symphonyConfig, __env, contactService, userService, _, metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/company/company-setup-users-table.html',
            scope: {
                editingUser: '=',
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.isKotterTechUserByUuid = $rootScope.isKotterTechUserByUuid;
                $scope.onescreenUrl = __env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                    symphonyConfig.onescreenUrl;
                if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                $scope.predicate = 'user_ext';
                $scope.reverse = false;
                $scope.activeUserFax = null;
                $scope.loadingUsers = false;
                $scope.newUser = {};
                $scope.users = [];
                $scope.pagination = {
                    perPage: 15,
                    currentPage: 1
                };

                $scope.isKotterTechOrGreater = userService.isKotterTechOrGreater;

                $scope.sortBy = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.init = function() {
                    $scope.loadingUsers = true;
                    $scope.getUsers($scope.domain.domain_uuid, true);
                };

                $scope.isDemoAgencyEmulated = function() {
                    return $scope.domain.demoDomain;
                };

                $scope.showImportUsers = function() {
                    $myModal.openTemplate('import-users-modal.html', $scope.domain,
                        'lg', '', '');
                };

                $scope.deleteDemoUser = function(user) {
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent('Are you sure you want to delete this demo user? ')
                        .ariaLabel('Delete')
                        .ok('Yes, Delete')
                        .cancel('Never Mind');
                    $mdDialog.show(deleteConfirm).then(function() {
                        dataFactory.getDeleteDemoUser(user.id)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    $rootScope.$broadcast(
                                        'company.setup.delete.user',
                                        user);
                                }
                            });
                    });

                };

                $scope.isKotterTechUser = function(user) {
                    if ($rootScope.user.accessgroup === 'superadmin' || $rootScope.user
                        .accessgroup === 'salesadmin') return false;
                    return contactService.isKotterTechUser(user);
                };

                $scope.$watch('domain', function(newVal, oldVal) {
                    var justInitialized = newVal && !oldVal;
                    var justChanged = newVal && oldVal && (newVal !== oldVal);
                    var reOpenedTab = (newVal && oldVal) && (newVal === oldVal);
                    if (newVal.domain_uuid !== oldVal.domain_uuid || reOpenedTab) {
                        var userUuid = $scope.editingUser ? $scope.editingUser.id :
                            $rootScope.user.id;
                        $scope.init();
                    }
                });

                $scope.displayUser = function(item) {
                    return !$scope.isKotterTechUserByUuid(item.id) || ($scope.isKotterTechUserByUuid(
                        item.id) && userService.isKotterTechOrGreater());
                };

                $rootScope.$on('refresh-user-list', function(event) {
                    $scope.getUsers($scope.domain.domain_uuid, false);
                });

                $scope.getUsers = function(domainUuid, working) {
                    userService.findRawUsers(domainUuid, working).then(function(users) {
                        if (users) {
                            var newusers = [];
                            for (var user in users) {
                                if (!($scope.isKotterTechUser(users[user]))) {
                                    newusers.push(users[user]);
                                }
                            }
                            $scope.users = newusers;
                            $scope.loadingUsers = false;
                        }
                    });
                };

                $scope.reload = function(domainUuid, userUuid) {
                    $scope.init();
                };

                function getUserInfo(userUuid) {
                    return dataFactory.getActiveUser(userUuid)
                        .then(function(response) {
                            console.log(response.data);
                            if (response.data.data) {
                                return response.data.data;
                            }
                            return {};
                        });
                }

                $scope.showUserProfileInfo = function(rawUser) {
                    getUserInfo(rawUser.user_uuid)
                        .then(function(user) {
                            $rootScope.$broadcast('emulate.profile.edit', user);
                        });
                };

                $scope.editUser = function(rawUser) {
                    getUserInfo(rawUser.user_uuid)
                        .then(function(user) {
                            console.log(user);
                            $scope.editingUser = user;
                        });
                };

                $scope.toggleAddUserRow = function() {
                    if ($scope.isDemoAgencyEmulated()) {
                        $rootScope.showInfoAlert(
                            'A demo user can not be added through this form. Please go to <a href="' +
                            symphonyConfig.symphonyUrl +
                            '/demosignup" target="_blank">' + symphonyConfig.symphonyUrl +
                            '/demosignup</a> to add a demo user.');
                        return;
                    }
                    $scope.showAddUserRow = !$scope.showAddUserRow;
                };
                $scope.addUser = function() {
                    // $rootScope.showModalWithData('/fax/faxordermodal.html', { domain_uuid: $scope.domain.domain_uuid });
                    $rootScope.showModalWithData('/company/new-user-modal.html', $scope
                        .domain);
                };

                $rootScope.$on('new.user.created', function(event, combo) {
                    console.log(combo);
                    $scope.users.push(combo);
                });

                $scope.$on('company.setup.delete.user', function($event, remove) {
                    angular.forEach($scope.users, function(user, index) {
                        if (user.user_uuid == remove.user_uuid) {
                            $scope.users.splice(index, 1);
                        }
                    });
                });
                metaService.rootScopeOn($scope, 'company.setup.reload.users', function() {
                    $scope.init();
                });

                metaService.rootScopeOn($scope, 'contact.user.image.changed', function(
                    $event, user) {
                    var contact = contactService.getContactByUserUuid(user.user_uuid);
                    if (contact) contact.contact_profile_image = user.contact_profile_image;
                });

                metaService.rootScopeOn($scope, 'emulated.user.updated', function($event,
                    user) {
                    var contact = contactService.getContactByUuid(user.contact_uuid);
                    contact.contact_name_given = user.contact_name_given;
                    contact.contact_name_family = user.contact_name_family;
                    contact.contact_email_address = user.email;
                    if(contact.emails) contact.emails[0].email_address = user.email;
                    contact.phones[0].phone_number = user.phone_number;
                    contact.user_ext = user.phone_extension;
                });

                $scope.isAdmin = function(user) {
                    return user && user.companyAdmin === 'true';
                };

                $scope.isKotterTechOrGreater = function() {
                    return userService.isKotterTechOrGreater();
                };

                $scope.searchUser = function(item) {
                    if (item.deleted) return false;
                    if (!$scope.userSearch ||
                        (item.contact_name && item.contact_name.toLowerCase().indexOf(
                            $scope.userSearch.toLowerCase()) != -1) ||
                        (item.user_ext && item.user_ext.toLowerCase().indexOf($scope.userSearch
                            .toLowerCase()) != -1) ||
                        (item.contact_name_given && item.contact_name_given.toLowerCase()
                            .indexOf($scope.userSearch.toLowerCase()) != -1) ||
                        (item.contact_name_family && item.contact_name_family.toLowerCase()
                            .indexOf($scope.userSearch.toLowerCase()) != -1)) {
                        return true;
                    }
                    if (item.user_ext) {
                        var found = false;
                        if (item.user_ext != $scope.userSearch)
                            return found;
                    }
                    return false;
                };
                $scope.showPhoneOptions = function() {
                    var data = {
                        brands: $scope.brand, 
                        closeModal: $rootScope.closeModal
                    }
                    $myModal.openTemplate('phone-options.html', data);
                };
                $scope.brand = [{
                    name: 'Yealink',
                    models: [{
                        name: 'T21P-E2',
                        line: 2
                    }, {
                        name: 'T23P/G',
                        line: 3
                    }, {
                        name: 'T27P/G',
                        line: 21
                    }, {
                        name: 'T28P/G',
                        line: 6
                    }, {
                        name: 'T29G',
                        line: 27
                    }, {
                        name: 'T40P/G',
                        line: 3
                    }, {
                        name: 'T41P/S',
                        line: 15
                    }, {
                        name: 'T42G/S',
                        line: 15
                    }, {
                        name: 'T46G/S',
                        line: 27
                    }, {
                        name: 'T48G/S',
                        line: 29
                    }, {
                        name: 'W52P'
                    }, {
                        name: 'T52S',
                        line: 21
                    }, {
                        name: 'T54S',
                        line: 27
                    }, {
                        name: 'T58A/V',
                        line: 27
                    }, {
                        name: 'W56P'
                    }, {
                        name: 'W60P'
                    }, {
                        name: 'CP290'
                    }, {
                        name: 'CP960'
                    }]
                },
                {
                    name: 'Polycom',
                    models: [{
                        name: 'Vvx300',
                        line: 6
                    }, {
                        name: 'Vvx400',
                        line: 12
                    }, {
                        name: 'Sound Point 550',
                        line: 4
                    }]
                }];
            }
        };
    })
    .directive('companySetupUserEdit', function($rootScope, contactService, dataFactory,
        usefulTools, $mdDialog, packageService, ngAudio, symphonyConfig, $filter, __env) {
        function setSettings($scope) {
            $scope.settings = {
                firstName: $scope.user.contact_name_given,
                lastName: $scope.user.contact_name_family,
                phoneNumber: $scope.user.phone_number,
                user_uuid: $scope.user.id,
                email: $scope.user.email_address,
                recordAll: $scope.user.extension ? !!$scope.user.extension.user_record : false,
                userProfileStatus: $scope.user.user_enabled,
                userIsAdmin: $scope.user.companyAdmin,
                userGroup: $scope.user.accessgroup,
                userInfoChanged: false
            };
            $scope.fields = {};
        };
        var getPassToken = function() {
            var deferred = $q.defer();
            dataFactory.getResetToken()
                .then(function(response) {
                    if (response.data.error) {
                        deferred.reject('');
                    } else {
                        deferred.resolve(response.data.success.data);
                    }
                }, function(error) {
                    deferred.reject('');
                });
            return deferred.promise;
        };
        return {
            restrict: 'E',
            templateUrl: 'views/company/company-setup-user-edit.html',
            scope: {
                user: '='
            },
            link: function($scope, element, attrs) {
                var alert;
                $scope.infoalerts = [];
                $scope.userGroups = [];
                $scope.activeUserFax = null;

                function init() {
                    dataFactory.getUserGroups()
                        .then(function(response) {
                            $scope.userGroups = response.data;
                        });
                }
                init();
                $scope.isBillingAdminOrGreater = $rootScope.isBillingAdminOrGreater;

                $scope.showAlerts = function() {
                    if ($scope.infoalerts.length > 0) {
                        var body = '';
                        angular.forEach($scope.infoalerts, function(alert) {
                            if (alert.success) body += '<p>' + alert.message +
                                '</p>';
                            if (alert.error) body += '<p><strong>' + alert.message +
                                '</strong></p>';
                        });
                        $scope.infoalerts = [];
                        $rootScope.showInfoAlert(body);
                    }
                };
                $scope.$watch('alerts.length', function(newVal, oldVal) {
                    if (newVal > oldVal && !$scope.showingAlert) {
                        // $scope.showAlerts();
                    }
                });
                $scope.back = function() {
                    $scope.user = undefined;
                };

                $scope.packageHasAccess = function(feature) {
                    return packageService.packageHasAccess(feature);
                };

                $scope.$watch('user', function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        if (angular.element('#phone-input').scope())
                            angular.element('#phone-input').scope().listener();
                        if (newVal) {
                            setSettings($scope);
                        };
                    }
                });



                $scope.setUserFax = function(userUuid, did) {
                    //    This is the one used in Agency Setup > Users > edit
                    dataFactory.getToggleUserFax(userUuid, did)
                        .then(function(response) {
                            $rootScope.showalerts(response);

                            if (response.data.success) {
                                console.log(response.data);
                                return;
                            } else {
                                console.log(response.data);
                                return $rootScope.showErrorAlert(
                                    "There was a problem setting User Fax status, please contact Support."
                                );
                            }

                        });
                };

                $scope.toggleRecordAll = function() {

                    var setting = $scope.settings.recordAll ? 'all' : 'Disabled';
                    var data = {
                        setting: setting,
                        user_uuid: $scope.user.user_uuid
                    };
                    dataFactory.postToggleRecordAll(data).then(function(response) {
                        if (response.data.error) {
                            $scope.settings.recordAll = !$scope.settings.recordAll;
                        } else {
                            $scope.user.extension.user_record = $scope.settings
                                .recordAll ? 'all' : null;
                            $scope.user.user_record = $scope.settings.recordAll ?
                                'all' : null;
                            if ($scope.user.domain_uuid === $rootScope.user.domain_uuid) {
                                // var contact = contactService.getContactByUserUuid($scope.user.user_uuid, $scope.user.domain_uuid);
                                // if (contact && contact.extension) contact.extension.user_record = $scope.settings.recordAll ? 'all' : null;
                            }
                        }
                        $rootScope.showalerts(response);
                    });
                }
                $scope.toggleAdminStatus = function() {
                    if ($scope.user.id === $rootScope.user.id) {
                        $rootScope.showErrorAlert(
                            'You can not edit your own admin access status. If you need to change this have another admin make the change.'
                        );
                        if ($scope.settings.userIsAdmin === 'true') $scope.settings.userIsAdmin =
                            'false';
                        if ($scope.settings.userIsAdmin === 'false') $scope.settings.userIsAdmin =
                            'true';
                        return;
                    }
                    var data = {
                        user_uuid: $scope.user.id,
                        userIsAdmin: $scope.settings.userIsAdmin
                    };
                    dataFactory.postToggleAdminStatus(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.error) {
                                if ($scope.settings.userIsAdmin === 'true') $scope.settings
                                    .userIsAdmin = 'false';
                                if ($scope.settings.userIsAdmin === 'false') $scope
                                    .settings.userIsAdmin = 'true';
                            } else {
                                $scope.user.companyAdmin = $scope.settings.userIsAdmin;
                            }
                        });
                };
                $scope.isActiveUser = function() {
                    return $scope.user.id === $rootScope.user.id;
                };
                $scope.toggleEnableUser = function() {
                    if ($scope.user.id === $rootScope.user.id) {
                        $rootScope.showErrorAlert(
                            'You can not enable/disable yourself. This will need to be changed by another admin user.'
                        );
                        if ($scope.settings.userProfileStatus === 'true') $scope.settings.userProfileStatus = 'false';
                        if ($scope.settings.userProfileStatus === 'false') $scope.settings.userProfileStatus = 'true';
                        return;
                    }
                    var data = {
                        user_uuid: $scope.user.user_uuid,
                        setting: $scope.settings.userProfileStatus
                    };
                    dataFactory.postUserProfileDisable(data).then(function(response) {
                        $rootScope.showalerts(response);
                        console.log(response);
                        console.log($scope.user);
                        if (response.data.success) {
                            $scope.user.user_enabled = data.setting;
                            var contact = contactService.getContactByUuid($scope.user.contact_uuid);
                            if (contact) contact.profile_status = $scope.settings.userProfileStatus;
                            $rootScope.$broadcast('company.setup.reload.users');
                        } else if (response.data.error) {
                            if ($scope.settings.userProfileStatus === 'true')
                                $scope.settings.userProfileStatus = 'false';
                            if ($scope.settings.userProfileStatus === 'false')
                                $scope.settings.userProfileStatus = 'true';
                        }
                    });
                };
                $scope.deleteUserProfile = function() {
                    var data = {
                        user_uuid: $scope.user.user_uuid,
                        setting: 'true'
                    };
                    dataFactory.getDaysRemain($scope.user.domain_uuid)
                        .then(function(response) {
                            var info = response.data.success.data;
                            // var discount = ($rootScope.user.groupcode && $rootScope.user.groupcode.discount) ? parseFloat(1.0-parseFloat($rootScope.user.groupcode.discount)/100.0) : 1.0;
                            // var per_seat = (parseFloat($rootScope.user.package.package_price)*discount).toFixed(2);
                            // var charge = (per_seat * parseFloat(info.remain)/parseFloat(info.days)).toFixed(2);
                            var per_seat = parseFloat(info.per_seat);
                            var charge = (per_seat * parseFloat(info.remain) /
                                parseFloat(info.days)).toFixed(2);
                            var html = '';
                            if (info.freePeriod) {
                                html =
                                    'Your agency is still in a free trial period so there are no charges or credits to be applied.';
                            } else {
                                html = 'A pro-rated credit of ' + $filter(
                                        'currency')(charge) +
                                    '* for deleting this user will be applied to your next monthly bill.'
                            }

                            var deleteConfirm = $mdDialog.confirm()
                                .title('Please Confirm')
                                .htmlContent(
                                    'Are you sure you want to delete this user? ' +
                                    html)
                                .ariaLabel('Delete')
                                .ok('Yes, Delete')
                                .cancel('Never Mind');
                            $mdDialog.show(deleteConfirm).then(function() {
                                dataFactory.postUserProfileDelete(data).then(
                                    function(response) {
                                        if (response.data.success) {
                                            $rootScope.$broadcast(
                                                'company.setup.delete.user',
                                                $scope.user);
                                            $scope.user = undefined;
                                        } else if (response.data.error) {
                                            if (__env.enableDebug)
                                                console.log(response.data
                                                    .error.message);
                                        }
                                    });
                            });
                        });
                };
                $scope.changeUserExtension = function(newExt) {
                    
                    var strExt = newExt.toString();
                    if (strExt === '998') {
                        $rootScope.showErrorAlert('998 is a reserved system extension');
                        return;
                    }
                    if (!usefulTools.isValidExtension(newExt)) {
                        $rootScope.showErrorAlert(
                            'You must enter an extension that is 3 or 4 numbers long.'
                        );
                        return;
                    }
                    if (__env.enableDebug) console.log($scope.user);
                    var data = {
                        user_uuid: $scope.user.user_uuid,
                        newExt: strExt
                    };
                    var changeConfirm = $mdDialog.confirm()
                        .title(
                            'Are you sure you want to change this user\'s extension from ' +
                            $scope.user.user_ext + ' to ' + newExt + '?')
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(changeConfirm).then(function() {
                        dataFactory.postChangeUserExtension(data).then(function(
                            response) {
                            if (__env.enableDebug) console.log(response);
                            if (response.data.success) {
                                if (__env.enableDebug) console.log(
                                    response.data.success);
                                $rootScope.$broadcast(
                                    'company.setup.reload.users');
                                $rootScope.showSuccessAlert(
                                    "The user's extension has been successfully changed to " +
                                    newExt);
                            } else if (response.data.error) {
                                if (__env.enableDebug) console.log(
                                    response.data.error.message);
                                $rootScope.showSuccessAlert(response.data
                                    .error.message);
                            }
                        });
                    });
                };
                $scope.triggerUpdate = function() {
                    $scope.showingAlert = true;
                    console.log($scope.settings.userInfoChanged);
                    if ($scope.settings.userInfoChanged) {
                        var dialog =
                            'Are you sure you want to update with this information';
                        if ($scope.fields.password) dialog +=
                            ' and update their password';
                        dialog += '?';
                        $rootScope.confirmDialog(dialog)
                            .then(function(response) {
                                if (response) {
                                    $scope.updateInfo()
                                        .then(function() {
                                            if ($scope.fields.password) {
                                                // $scope.triggerPasswordUpdate()
                                                $scope.updatePassword()
                                                    .then(function() {
                                                        $scope.showingAlert =
                                                            false;
                                                        $scope.showAlerts();
                                                    });
                                            } else {
                                                $scope.showingAlert = false;
                                                $scope.showAlerts();
                                            }
                                        });
                                } else {
                                    $scope.showingAlert = false;
                                }
                            });
                    } else if ($scope.fields.password) {
                        var dialog =
                            "Are you sure you want to update this user's password?";
                        $rootScope.confirmDialog(dialog)
                            .then(function(response) {
                                $scope.updatePassword()
                                    .then(function() {
                                        $scope.showingAlert = false;
                                        $scope.showAlerts();
                                    });
                            });
                    } else {
                        $rootScope.showInfoAlert('The information is now up to date.');
                        $scope.showingAlert = false;
                    }
                };
                $scope.$watch('settings.recordAll', function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        $scope.toggleRecordAllCalls();
                    };
                });
                $scope.toggleRecordAllCalls = function() {

                };
                $scope.triggerPasswordUpdate = function() {
                    if ($scope.fields.password) {
                        $scope.showingAlert = true;
                        $rootScope.confirmDialog(
                                "Are you sure you want to change this user's password?"
                            )
                            .then(function(response) {
                                if (response) {
                                    $scope.updatePassword();
                                };
                                $scope.showingAlert = false;
                            });
                    }
                };
                $scope.updateInfo = function() {
                    return dataFactory.postUpdateUser($scope.settings).then(function(
                        response) {
                        if (response.data.success) {
                            var firstName = $scope.settings.firstName;
                            var lastName = $scope.settings.lastName;
                            $scope.user.contact_name_given = firstName;
                            $scope.user.contact_name_family = lastName;
                            $scope.user.contact_name_full = firstName + ' ' +
                                lastName;
                            if ($scope.user.phones) $scope.user.phones[0].phone_number =
                                $scope.settings.phoneNumber;
                            if ($scope.user.user_uuid === $rootScope.user.id) {
                                $rootScope.user.contact_name_given = firstName;
                                $rootScope.user.contact_name_family = lastName;
                                $rootScope.user.contact_name_full = firstName +
                                    ' ' + lastName;
                                $rootScope.user.phone_number = $scope.settings.phoneNumber;
                            }
                            $scope.infoalerts.push({
                                success: true,
                                message: "The user's information has been updated."
                            });
                            return;
                        } else {
                            var message = response.data.error.message;
                            if (__env.enableDebug) console.log(message);
                            $scope.infoalerts.push({
                                error: true,
                                message: message[0]
                            });
                            setSettings($scope);
                        }
                    });
                };
                $scope.updatePassword = function() {
                    $scope.fields.user_uuid = $scope.user.user_uuid;
                    console.log($scope.fields);
                    return dataFactory.postAdminResetPassword($scope.fields)
                        .then(function(response) {
                            if (response.data.success) {
                                if (__env.enableDebug) console.log(response.data.success
                                    .message);
                                $scope.infoalerts.push({
                                    success: true,
                                    message: 'The password has been updated.'
                                });
                                $scope.fields = {};
                            } else if (response.data.error) {
                                var message = response.data.error.message;
                                if (__env.enableDebug) console.log(message);
                                $scope.infoalerts.push({
                                    error: true,
                                    message: message[0]
                                });
                                $scope.fields = {};
                            }
                            $rootScope.$broadcast('company.setup.reload.users');
                        });
                };
            }
        };
    })
    .directive('companySetupProvisionsTab', function($rootScope, dataFactory, $filter, __env,
        contactService, usefulTools, userService, _, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/settings/provisioning-settings.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.isKotterTechUserByUuid = $rootScope.isKotterTechUserByUuid;
                if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                $scope.predicate = 'user_ext';
                $scope.reverse = false;
                $scope.loadingUsers = false;
                $scope.newUser = {};

                $scope.brand = [{
                        name: 'Yealink',
                        models: [{
                            name: 'T21P-E2',
                            line: 2
                        }, {
                            name: 'T23P/G',
                            line: 3
                        }, {
                            name: 'T27P/G',
                            line: 21
                        }, {
                            name: 'T28P/G',
                            line: 6
                        }, {
                            name: 'T29G',
                            line: 27
                        }, {
                            name: 'T40P/G',
                            line: 3
                        }, {
                            name: 'T41P/S',
                            line: 15
                        }, {
                            name: 'T42G/S',
                            line: 15
                        }, {
                            name: 'T46G/S',
                            line: 27
                        }, {
                            name: 'T48G/S',
                            line: 29
                        }, {
                            name: 'W52P'
                        }, {
                            name: 'T52S',
                            line: 21
                        }, {
                            name: 'T54S',
                            line: 27
                        }, {
                            name: 'T58A/V',
                            line: 27
                        }, {
                            name: 'W56P'
                        }, {
                            name: 'W60P'
                        }, {
                            name: 'CP290'
                        }, {
                            name: 'CP960'
                        }]
                    },
                    {
                        name: 'Polycom',
                        models: [{
                            name: 'Vvx300',
                            line: 6
                        }, {
                            name: 'Vvx400',
                            line: 12
                        }, {
                            name: 'Sound Point 550',
                            line: 4
                        }]
                    },
                    {
                        name: 'Cisco',
                        models: [{
                            name: 'Any',
                            line: 8
                        }]
                    }
                ];

                $scope.sortBy = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.init = function() {
                    $scope.loadingUsers = true;
                    $scope.getUsers($scope.domain.domain_uuid);
                };

                $scope.isKotterTechUser = function(user) {
                    if ($rootScope.user.accessgroup === 'superadmin' || $rootScope.user
                        .accessgroup === 'salesadmin') return false;
                    return contactService.isKotterTechUser(user);
                };

                $scope.$watch('domain', function(newVal, oldVal) {
                    var justInitialized = newVal && !oldVal;
                    var justChanged = newVal && oldVal && (newVal !== oldVal);
                    var reOpenedTab = (newVal && oldVal) && (newVal === oldVal);
                    if (newVal.domain_uuid !== oldVal.domain_uuid || reOpenedTab) {
                        var userUuid = $scope.editingUser ? $scope.editingUser.id :
                            $rootScope.user.id;
                        $scope.init();
                    }
                });

                $scope.getUsers = function(domainUuid) {
                    userService.findUsers(domainUuid, true).then(function(users) {
                        if (users) {
                            $scope.users = users;
                            $scope.loadingUsers = false;

                            $scope.getProvSettings($scope.domain.domain_uuid);
                        }
                    });
                };

                $scope.advSettingsfunc = function(user) {
                    if (user.provSettings.prov_uuid) {
                        var model = usefulTools.find(user.provSettings.brand.models,
                            'name', user.provSettings.model);
                        $scope.linesArray = [];

                        for (var i = 2; i <= model.line; i++) {
                            var data = {
                                key: i,
                            }
                            $scope.linesArray.push(data);
                        }

                        $scope.settingTypeYealink = [{
                            name: 'Line',
                            type: '15'
                        }, {
                            name: 'Speed Dial',
                            type: '16'
                        }, {
                            name: 'Park',
                            type: '3'
                        }];
                        $scope.settingTypePolycom = [{
                            name: 'Speed Dial',
                            type: '16'
                        }];
                        $scope.settingTypeCisco = [{
                            name: 'Line',
                            type: '15'
                        }, {
                            name: 'Speed Dial',
                            type: '16'
                        }];

                        if(user.provSettings.brand.name == 'Yealink')
                            $scope.settingType = $scope.settingTypeYealink;
                        else if(user.provSettings.brand.name == 'Polycom')
                            $scope.settingType = $scope.settingTypePolycom;
                        else if(user.provSettings.brand.name == 'Cisco')
                            $scope.settingType = $scope.settingTypeCisco;

                        dataFactory.getAdvProvSettings(user.provSettings.prov_uuid)
                            .then(function(response) {
                                if (response.data.success) {
                                    var result = response.data.success.data;

                                    angular.forEach(result, function(line) {
                                        angular.forEach($scope.linesArray,
                                            function(arr) {
                                                if (arr.key == line.setting_key) {
                                                    arr[
                                                        'settings_value'
                                                    ] = line.setting_value;
                                                    arr[
                                                        'settings_label'
                                                    ] = line.setting_label;

                                                    var type =
                                                        usefulTools.find(
                                                            $scope.settingType,
                                                            'type',
                                                            line.setting_type
                                                        );

                                                    arr['settings_type'] =
                                                        type;
                                                }
                                            });
                                    });
                                }
                            });

                        var data = {
                            model: user.provSettings.model,
                            lines: $scope.linesArray,
                            settingType: $scope.settingType,
                            provisioning_uuid: user.provSettings.prov_uuid,
                            saveAdvSettings: $scope.saveAdvSettings,
                            user_ext: user.user_ext,
                            brand: user.provSettings.brand.name
                        }

                        $rootScope.showModalWithData(
                            "/modals/provisioningAdvSettings.html", data);
                    } else {
                        $scope.saveAdvSettings(user);
                    }
                };

                $scope.exportFile = function(prov_uuid) {

                    dataFactory.getExportCfgFile(prov_uuid)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                        });
                };

                $scope.saveAdvSettings = function(advSettings) {
                    angular.forEach(advSettings.lines, function(line) {
                        if (line.settings_type) {
                            if (line.settings_type.name == 'Line') {
                                if (advSettings.brand == 'Cisco') {
                                    line['settings_label'] = line['settings_value'] = '';
                                } else {
                                    line['settings_label'] = line['settings_value'] =
                                    advSettings.user_ext;
                                }
                            }
                            if (line.settings_type.name == 'Park') {
                                line['settings_label'] = 'Park';
                                line['settings_value'] = '5000';
                            }
                            if (line.settings_type.name == 'Speed Dial') {
                                if (!line.settings_label || !line.settings_value) {
                                    return $rootScope.showErrorAlert(
                                        'Please check if the name and destination are set.'
                                    );
                                }
                            }
                        }
                    });

                    var data = {
                        line_data: advSettings.lines,
                        provisioning_uuid: advSettings.provisioning_uuid
                    }

                    dataFactory.updateAdvProvSettings(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $uibModalStack.dismissAll();
                            }
                        });
                };

                $scope.getProvSettings = function(domain_uuid) {
                    $scope.usersList = [];
                    dataFactory.getProvSettings(domain_uuid)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.result = response.data.success.data;

                                angular.forEach($scope.users, function(user) {
                                    angular.forEach($scope.result, function(
                                        provSettings) {
                                        if (user.user_uuid ==
                                            provSettings.user_uuid) {
                                            $scope.branding =
                                                usefulTools.find(
                                                    $scope.brand,
                                                    'name',
                                                    provSettings.prov_brand
                                                );

                                            $scope.settings = {
                                                brand: $scope.branding,
                                                model: provSettings
                                                    .prov_model,
                                                macAddress: provSettings
                                                    .mac_address,
                                                prov_uuid: provSettings
                                                    .provisioning_uuid
                                            }
                                            user['provSettings'] =
                                                $scope.settings;

                                            var model = usefulTools
                                                .find($scope.branding
                                                    .models, 'name',
                                                    provSettings.prov_model
                                                );

                                            if (model && model.line >= 1)
                                                user[
                                                    'showAdvSettings'
                                                ] = true;

                                        }
                                    });
                                    $scope.usersList.push(user);
                                });
                            }
                        });
                };

                $scope.reboot = function(user) {
                    var user_ext = user.user_ext;
                    var domain = user.domain.domain_name;

                    dataFactory.rebootProvisioning(user_ext, domain)
                        .then(function(response) {
                            $rootScope.showAlert("Rebooting Signal sent.");
                        });
                };

                $scope.saveSettings = function(user) {
                    if (user.provSettings && user.provSettings.macAddress) {
                        if (user.provSettings.brand && user.provSettings.model) {
                            if (user.provSettings.macAddress) {
                                var mystring = user.provSettings.macAddress;

                                var regex =
                                    /^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$/;

                                if (!regex.test(mystring))
                                    return $rootScope.showErrorAlert(
                                        "Please enter a valid Mac Address.");
                            }
                            var details = {
                                brand: user.provSettings.brand.name,
                                model: user.provSettings.model,
                                mac_address: user.provSettings.macAddress.toLowerCase(),
                                user_uuid: user.user_uuid,
                                domain_uuid: user.domain_uuid
                            };

                            dataFactory.updateProvSettings(details)
                                .then(function(response) {
                                    $rootScope.showalerts(response);

                                    if (response.data.success) {
                                        var result = response.data.success.data;

                                        var index = $filter('getByUUID')($scope.usersList,
                                            user.user_uuid, 'user');

                                        if (index !== null) {

                                            var brands = usefulTools.find($scope.brand,
                                                'name', result.prov_brand);

                                            $scope.settings = {
                                                brand: brands,
                                                model: result.prov_model,
                                                macAddress: result.mac_address,
                                                prov_uuid: result.provisioning_uuid
                                            }
                                            $scope.usersList[index]['provSettings'] =
                                                $scope.settings;

                                            var model = usefulTools.find(brands.models,
                                                'name', result.prov_model);

                                            if (model && model.line >= 1)
                                                $scope.usersList[index][
                                                    'showAdvSettings'
                                                ] = true;
                                        }
                                    } else {
                                        user.provSettings = {};
                                    }
                                });
                        } else {
                            $rootScope.showErrorAlert(
                                "Please complete all the fields before saving.");
                        }
                    }
                };
            }
        };
    })
    .directive('chooseGroupGoogleImport', function($rootScope, $window, $uibModalStack,
        contactGroupsService, contactService) {

        return {
            restrict: 'E',
            templateUrl: 'group-dialog-template.html',
            scope: true,
            link: function($scope, element, attrs) {
                
                $scope.contactTarget = undefined;

                $scope.groups = contactGroupsService.groups;
                $scope.submit = function(group) {
                    $window.localStorage.setItem("importGmailContactsTo", group);
                    $uibModalStack.dismissAll();
                    contactGroupsService.authGoogle();
                };
                
                // *********** Methods for creating Contact Groups on Google Import************
                $scope.userContacts = function() {
                    return contactService.userContactsArray();
                };
                $scope.contacts = function() {
                    return contactService.allContactsArray();
                };
                $scope.contactGroups = function() {
                    return contactGroupsService.groups;
                };
                $scope.newGroup = {};

                $rootScope.$on('contact.group.updated', function(event, data) {
                    contactGroupsService.setGroups()
                        .then(function(groups){
                            $scope.groups = groups;
                            $scope.contactTarget = data.group_uuid;
                        })
                        .catch(function(error){
                            $rootScope.showErrorAlert(error);
                        });
                });

                $scope.processImportDestinationChange = function(){
                    // in google imports
                    if ($scope.contactTarget === true){
                        $scope.showEditGroupGoogle(null);
                        console.log("Creating New Destination");
                    } else {
                        console.log(['Destination', $scope.contactTarget]);
                    }
                };

                $scope.contactSelectionType = 'contactgroup';

                $scope.showEditGroupGoogle = function(group) {
                    // from inside Google Import
                    $rootScope.uploaderOption = '/contacts/groups/create';
                    $rootScope.showNewGroup = true;

                    var data = {
                        updateGroup: angular.copy(group),
                        userContacts: $scope.userContacts(),
                        contacts: $scope.userContacts(),
                        theContact: contactService.getContactByUuid,
                        fromImportDirective: true,
                    };
                    $rootScope.showModalFull('/company/docontactgroup.html', data, 'lg');
                };
                // *********** END Methods for creating Contact Groups on Google Import************
                
                $scope.cancel = function() {
                    $scope.contactTarget = undefined;
                    $uibModalStack.dismissAll();
                };

                var alert;
                $scope.alerts = [];
                $scope.showAlerts = function() {
                    if ($scope.alerts.length > 0) {
                        alert = $scope.alerts.shift();
                        if (alert.success) {
                            $rootScope.showSuccessAlert(alert.message).then(function() {
                                $scope.showAlerts();
                            });
                        } else if (alert.error) {
                            $rootScope.showErrorAlert(alert.message).then(function() {
                                $scope.showAlerts();
                            });
                        }
                    }
                };
            }
        };
    })
    .directive('contactGroupsManager', function($rootScope, dataFactory, $myModal, $window, emulationService,
        permissionService, $uibModalStack, contactGroupsService, contactService, userService) {

        function makeString(input) {
            var string = JSON.stringify(input);
            return string;
        };

        function updateGroupInContactGroups(group, index) {
            var array = [];
            $scope.contactGroups[index].group_name = group.group_name;
            $scope.contactGroups[index].group_color = group.group_color;
            $scope.contactGroups[index].group_image = group.group_image;
            $scope.contactGroups[index].group_type = group.group_type;
            $scope.contactGroups[index].members = group.members;
            $scope.contactGroups[index].members.forEach(function(member) {
                var contact = contactService.getContactByUuid(member);
                if (contact !== null) array.push(contact);
            });
            $scope.contactGroups[index].contacts = array;
            $window.localStorage.setItem("contactGroups", JSON.stringify($scope.contactGroups));
            $uibModalStack.dismissAll();
        };

        function prepareContactGroupData(group, index) {
            var errors = [];
            var list = [];
            angular.forEach(group.member_list, function(key, value) {
                if (key === true) list.push(value);
            });
            if (list.length === 0) errors.push('At least one Member must be selected.');

            var data = {
                group_uuid: (index !== null ? $scope.contactGroups[index].group_uuid : null),
                group_name: group.group_name,
                group_type: group.group_type,
                group_color: (group.group_color ? group.group_color : null),
                group_members: list,
                errors: errors
            };
            return data;
        }

        function addGroupToContactGroups(group) {
            var array = [];
            group.members.forEach(function(member) {
                var contact = contactService.getContactByUuid(member);
                if (contact !== null) array.push(contact);
            });
            group.contacts = array;
            $scope.contactGroups.push(group);
            $window.localStorage.setItem("contactGroups", JSON.stringify($scope.contactGroups));
            $uibModalStack.dismissAll();
        }
        return {
            restrict: 'E',
            templateUrl: 'views/company/groupmanager.html',
            scope: {
                updateGroupViewers: '&'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.isKotterTechUser = $rootScope.isKotterTechUser;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.state = 'table';
                $scope.emulationStatus = function() {
                    return emulationService.emulationStatus;
                };

                function init() {
                    permissionService.getUsersWithContactGroupPermissions();
                }
                init();
                
                $scope.contactGroups = function() {
                    return contactGroupsService.groups;
                };
                $scope.groupLimit = function() {
                    return contactGroupsService.groupLimit;
                };

                $scope.groupFilter = function(item) {
                    var userUuid = $rootScope.user.id;
                    var search = ($scope.search && $scope.search.filter) ? $scope.search.filter : null;
                    if (!userService.isAdminGroupOrGreater() && 
                        !contactGroupsService.userIsManagerOfGroup(userUuid, item) 
                        && !contactGroupsService.userIsViewerOfGroup(userUuid, item)) return false;
                    if (!search || (item.group_name && item.group_name.toLowerCase()
                            .indexOf(search.toLowerCase()) != -1)) return true;
                    return false;
                };

                $scope.userContacts = function() {
                    return contactService.userContactsArray();
                };

                $scope.contacts = function() {
                    return contactService.allContactsArray();
                };

                $scope.theContact = function(contactUuid) {
                    return contactService.getContactByUuid(contactUuid);
                };

                $scope.emulationStatus = function() {
                    return emulationService.emulationStatus;
                };

                $scope.$on('contact.group.updated', function($event) {
                    // loadBasicContactInfo();
                });
                $scope.$on('group.contacts.added', function($event) {
                    // loadBasicContactInfo();
                });

                $scope.stateIsShowing = function(state) {
                    return state === $scope.state;
                };

                $scope.authGoogle = function() {
                    contactGroupsService.authGoogle();
                };

                $scope.closeCreateGroup = function() {
                    $scope.newgroup = {};
                    $uibModalStack.dismissAll();
                };

                $scope.toggleShowGroupManagers = function(group) {
                    group.showManagers = !group.showManagers;
                };

                $scope.toggleShowViewAccessMembers = function(group) {
                    group.showViewAccessMembers = !group.showViewAccessMembers;
                };

                $scope.userHasGroup = function(group_uuid) {
                    return contactGroupsService.groupExists(group_uuid);
                };

                $scope.toggleShowGroupMembers = function(group) {
                    group.showGroupMembers = !group.showGroupMembers;
                };

                $scope.groupMemberFilter = function(uuid) {
                    var item = contactService.getContactByUuid(uuid);
                    if (!item) return false;
                    if (contactService.isKotterTechUser(item) || item.cuuid ===
                        $rootScope.user.contact_uuid) return false;
                    if (!$scope.groupMemberSearch ||
                        (item.name && item.name.toLowerCase()
                            .indexOf($scope.groupMemberSearch.toLowerCase()) !== -1))
                        return true;
                    return false;
                };

                $scope.showEditGroup = function(group) {
                    $rootScope.uploaderOption = '/contacts/groups/create';
                    $rootScope.showNewGroup = true;

                    if (group) {
                        var edit = angular.copy(group);
                        $rootScope.uploaderOption = '/contacts/groups/update';
                        $rootScope.showNewGroup = false;
                        // var group = $scope.contactGroups()[index];

                        edit.member_list = contactGroupsService.getMemberListForGroup(
                            group);
                        var data = {
                            updateGroup: edit,
                            userContacts: $scope.userContacts(),
                            contacts: $scope.userContacts(),
                            theContact: contactService.getContactByUuid,
                        };
                        $rootScope.showModalFull('/company/docontactgroup.html', data,
                            'lg');
                    } else {
                        var data = {
                            updateGroup: {},
                            userContacts: $scope.userContacts(),
                            contacts: $scope.userContacts(),
                            theContact: contactService.getContactByUuid
                        };
                        $rootScope.showModalFull('/company/docontactgroup.html', data,
                            'lg');
                    }

                };

                $scope.showSpreadsheetImport = function() {
                    var data = {
                        closeThisModal : $rootScope.closeThisModal,
                    };
                    $rootScope.showModalFull(
                        '/company/contact-spreadsheet-importer-modal.html', data, 'lg');
                };

                $scope.initializeGoogle = function() {
                    if (__env.enableDebug) console.log("Initializing");
                    contactGroupsService.handleClientLoad();
                };

                $scope.authGoogleNew = function() {
                    $scope.initializeGoogle();
                    $timeout(function() {
                        contactGroupsService.handleAuthClick();
                    }, 2000);
                };

                $scope.userContactTotalMaxedOut = contactService.userContactTotalMaxedOut;

                function getContactsImportData() {
                    return {
                        userContactTotalMaxedOut: $scope.userContactTotalMaxedOut
                    };
                };

                $scope.obtainTargetGroup = function() {
                    $rootScope.showModalWithData('/company/googlecontacts.html',
                        getContactsImportData());
                };
                $scope.specifyContactGroup = function(element) {
                    var parentEl = angular.element(document.body);
                    $scope.groups = contactGroupsService.groups;
                    $scope.contactTarget = undefined;

                    $rootScope.showModalWithData('/company/googlecontacts.html',
                        getContactsImportData());
                };

                $scope.$on('user-deleted', function($event, contact) {
                    angular.forEach($scope.contactGroups(), function(group) {
                        var index = group.managers.indexOf(contact.user_uuid);
                        if (index !== -1) group.managers.splice(index, 1);
                        var index = group.members.indexOf(contact.contact_uuid);
                        if (index !== -1) group.members.splice(index, 1);
                        var index = group.viewer_users.indexOf(contact.contact_uuid);
                        if (index !== -1) group.viewer_users.splice(index,
                            1);
                    });
                });

                $scope.userIsManagerOfGroup = function(group) {
                    return contactGroupsService.userIsManagerOfGroup($rootScope.user.id,
                            group) || userService.isAdminGroupOrGreater();
                };

                $scope.isGroupMember = function(index, uuid) {
                    if (index !== null) {
                        var members = $scope.contactGroups()[index].contacts;
                        var result = false;
                        angular.forEach(members, function(member) {
                            if (member.contact_uuid === uuid) result = true;
                        });
                        return result;
                    }
                    return false;
                };

                $scope.getMemberName = function(uuid) {
                    var contact = contactService.getContactByUuid(uuid);
                    if (contact) return contact.name + (contact.type ===
                        'user' ? ' (User)' : '');
                    return null;
                };

                $scope.getUserName = function(uuid) {
                    var contact = contactService.getContactByUserUuid(uuid);
                    if (contact) return contact.name;
                    return '';
                };

                $scope.isHidden = function(group) {
                    return group.hidden.indexOf($rootScope.user.id) > -1;
                };

                $scope.getGroupName = function(group_uuid) {
                    var findgroup = contactGroupsService.getGroupByUuid(group_uuid);
                    if (findgroup !== null) return findgroup.group_name;
                    return '';
                };

                $scope.hideGroup = function(group) {
                    contactGroupsService.hideGroup(group);
                };

                $scope.openGroupManagerModal = function(group, index) {
                    var setmanagers = {};
                    angular.forEach(group.managers, function(manager) {
                        setmanagers[manager] = true;
                    });
                    var data = {
                        group: group,
                        setmanagers: setmanagers
                    };
                    $myModal.openTemplate('setcontactgroupmanagers.html', data, 'md',
                        '', 'static');
                };

                $scope.openGroupViewerModal = function(group) {
                    var data = {
                        group: group
                    };
                    $myModal.openTemplate('setcontactgroupviewers.html', data, 'md',
                        '', 'static');
                };

                $scope.updateGroupManagers = function(group, managerUuidsBoolMap,
                    closeModal) {
                    var managerUuids = retrieveManagerUuidsFromBoolMap(
                        managerUuidsBoolMap);
                    if (managerUuids.length === 0) {
                        $rootScope.showErrorAlert(
                            'There must be at least one manager on a contact group. Please select at least one manager.'
                        );
                        return;
                    }
                    contactGroupsService.setManagersList(group, managerUuids,
                        updateGroupViewers);
                    if (closeModal) closeModal();
                };

                $scope.removeManager = function(contact, group) {
                    if (group.managers.length === 1) {
                        $rootScope.showErrorAlert(
                            'There must be at least one manager on a contact group. Please add another user as manager before removing yourself.'
                        );
                        return;
                    }
                    contactGroupsService.revokeManagerStatus(contact, group,
                        updateGroupViewers);
                };

                $scope.dissolveContactGroup = function(group) {
                    $rootScope.confirmDialog(group.group_name,
                            "Are you sure you want to dissolve this group?")
                        .then(function(response) {
                            if (response) {
                                contactGroupsService.deleteGroup(group);
                            };
                        });
                };

                $scope.removeGroupFromViewGroup = function(groupUuid, view_group_uuid) {
                    contactGroupsService.removeGroupFromViewGroup(groupUuid,
                            view_group_uuid)
                        .then(function(response) {
                            if (response.data.success) {
                                $rootScope.showalerts(response);
                            }
                        });
                };

                $scope.removeUserFromViewGroup = function(group, view_contact_uuid) {
                    if (view_contact_uuid === $rootScope.user.contact_uuid) {
                        $rootScope.showErrorAlert(
                            'You can not remove yourself from your own group.');
                        return;
                    }
                    contactGroupsService.removeUserFromViewGroup(group.group_uuid,
                            view_contact_uuid)
                        .then(function(response) {
                            if (response.data.success) {
                                $rootScope.showalerts(response);
                            }
                        });
                };

                $scope.removeGroupContact = function(group, contact_uuid) {
                    if (contact_uuid === $rootScope.user.contact_uuid) {
                        $rootScope.showErrorAlert(
                            'You can not remove yourself from your own group.');
                        return;
                    }
                    var data = {
                        group_uuid: group.group_uuid,
                        contact_uuid: contact_uuid
                    };
                    dataFactory.deleteGroupContact(data)
                        .then(function(response) {

                            if (response.data.error) {
                                if (__env.enableDebug) console.log(response.data.error
                                    .message);
                            } else {
                                var index = group.members.indexOf(contact_uuid);
                                if (index !== -1) group.members.splice(index, 1);
                                group.contacts = contactGroupsService.getContactRetrievalFuncForGroup(
                                    group);
                            }
                        });
                };

            }
        };
    })
    .directive('manageGroupManagers', function($rootScope, dataFactory, $window, usefulTools,
        $uibModalStack, contactGroupsService, contactService, permissionService) {
        function retrieveManagerUuidsFromBoolMap(managerUuids) {
            console.log(managerUuids);
            var uuids = [];
            angular.forEach(managerUuids, function(isManager, uuid) {
                if (isManager) {
                    uuids.push(uuid);
                }
            });
            return uuids;
        };
        return {
            restrict: 'E',
            templateUrl: 'manage-group-managers.html',
            scope: {
                group: '=',
                managers: '='
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.isKotterTechUser = $rootScope.isKotterTechUser;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.search = {
                    name: null
                };

                $scope.availGroupManagers = function() {
                    return permissionService.availContactGroupManagers;
                };
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.closeModal = $rootScope.closeModal;

                $scope.userContacts = function() {
                    return contactService.userContactsArray();
                };
                
                $scope.contacts = function() {
                    return contactService.contactsArray();
                };

                $scope.theContact = function(contactUuid) {
                    return contactService.getContactByUuid(contactUuid);
                };

                $scope.contactGroups = function() {
                    return contactGroupsService.groups;
                };

                $scope.managerFilter = function(item) {
                    if (!$scope.search.name ||
                        (item.name && item.name.toLowerCase()
                            .indexOf($scope.search.name.toLowerCase()) !=
                            -1)) return true;
                    return false;
                };

                function updateGroupViewers(group_uuid, groups, members) {
                    contactGroupsService.updateGroupViewers(group_uuid, groups, members)
                        .then(function(response) {
                            if (response) {
                                $rootScope.showalerts(response);
                            }
                            $uibModalStack.dismissAll();
                        });

                };

                $scope.updateGroupManagers = function(group, managerUuidsBoolMap) {
                    var managerUuids = retrieveManagerUuidsFromBoolMap(
                        managerUuidsBoolMap);
                    if (managerUuids.length === 0) {
                        $rootScope.showErrorAlert(
                            'There must be at least one manager on a contact group. Please select at least one manager.'
                        );
                        return;
                    }
                    contactGroupsService.setManagersList(group, managerUuids,
                        updateGroupViewers);
                    $uibModalStack.dismissAll();
                };

            }
        };
    })
    .directive('manageGroupViewers', function($rootScope, dataFactory, $window, usefulTools,
        $uibModalStack, contactGroupsService, contactService) {
        return {
            restrict: 'E',
            templateUrl: 'manage-group-viewers.html',
            scope: {
                group: '='
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.isKotterTechUser = $rootScope.isKotterTechUser;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.search = {
                    name: null
                };
                $scope.updateviewgroup = {};
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.closeModal = $rootScope.closeModal;

                $scope.userContacts = function() {
                    return contactService.userContactsArray();
                };

                $scope.theContact = function(contactUuid) {
                    return contactService.getContactByUuid(contactUuid);
                };

                $scope.contactGroups = function() {
                    return contactGroupsService.groups;
                };

                $scope.viewerFilter = function(item) {
                    if (!item) return false;
                    if ($scope.isKotterTechUser(item)) return false;
                    if (!$scope.search.name ||
                        (item.name && item.name.toLowerCase()
                            .indexOf($scope.search.name.toLowerCase()) !=
                            -1)) return true;
                    return false;
                };

                $scope.isGroupViewGroup = function(viewers, group_uuid) {
                    var result = false;
                    if (viewers) {
                        viewers.forEach(function(viewer) {
                            if (viewer.view_group_uuid === group_uuid) result =
                                true;
                        });
                    }
                    return result;
                };

                $scope.isGroupViewMember = function(viewers, contact_uuid) {
                    var result = false;
                    $scope.group.viewer_users.forEach(function(viewer) {
                        if (viewer === contact_uuid)
                            result = true;
                    });
                    return result;
                };

                $scope.updateGroupViewers = function(group_uuid, groups, members) {
                    contactGroupsService.updateGroupViewers(group_uuid, groups, members)
                        .then(function(response) {
                            if (response) {
                                $rootScope.showalerts(response);
                            }
                            $uibModalStack.dismissAll();
                        });

                }

            }
        };
    })
    .directive('contactSpreadsheetImporter', function($rootScope, userService, contactService,
        metaService) {
        function isValidEmail(email) {
            var re =
                /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (!email) return false;
            return re.test(email);
        }

        function isValidPhone(p) {
            if (!p) return false;
            var PHONE_REGEXP = /^[(]{0,1}[0-9]{3}[)\.\- ]{0,1}[0-9]{3}[\.\- ]{0,1}[0-9]{4}$/;
            return PHONE_REGEXP.test(p);
        }

        function packageContactsForContactCreation(contacts) {
            var contactParams;
            var phoneParams;
            var packagedContact;
            var contactFields;
            var matchingContactField;
            var packagedContacts = [];
            if (__env.enableDebug) console.log(contacts);
            angular.forEach(contacts, function(contact) {
                phoneParams = [];
                contactParams = {
                    contact_profile_color: randomColor({
                        luminosity: 'dark'
                    }),
                    contact_type: contact.contact_type ? contact.contact_type : 'contact'
                };
                contactFields = Object.keys(contact);
                angular.forEach(contactFields, function(field) {
                    matchingContactField =
                        mapContactFieldToPackagedContactField(field);
                    if (matchingContactField && contact[field]) {
                        // if(__env.enableDebug) console.log(matchingContactField);
                        if (matchingContactField === 'contact_phone1') {
                            phoneParams.push(contactService.buildDefaultPhoneObject(
                                contact[field], 'Mobile'));
                        } else if (matchingContactField === 'contact_phone2') {
                            phoneParams.push(contactService.buildDefaultPhoneObject(
                                contact[field], 'Work'));
                        } else if (matchingContactField === 'contact_phone3') {
                            phoneParams.push(contactService.buildDefaultPhoneObject(
                                contact[field], 'Home'));
                        } else if (matchingContactField === 'contact_phone4') {
                            phoneParams.push(contactService.buildDefaultPhoneObject(
                                contact[field], 'Fax'));
                        } else {
                            contactParams[matchingContactField] = contact[field];
                        }
                    };
                });
                packagedContact = {};
                packagedContact.input = contactParams;
                packagedContact.phones = phoneParams;
                packagedContacts.push(packagedContact);
            });
            if (__env.enableDebug) console.log(packagedContacts);
            return packagedContacts;
        }

        function mapContactFieldToPackagedContactField(contactField) {
            return {
                'firstname': 'contact_name_given',
                'lastname': 'contact_name_family',
                'company': 'contact_organization',
                'contact_phone1': 'contact_phone1',
                'contact_phone2': 'contact_phone2',
                'contact_phone3': 'contact_phone3',
                'contact_phone4': 'contact_phone4',
                'email_address': 'contact_email_address',
                'date_of_birth': 'contact_dob',
                'address': 'contact_address',
                'city': 'contact_city',
                'state': 'contact_state',
                'zip_code': 'contact_zip_code',
                'notes': 'contact_note',
                'type': 'contact_type',
                'customer_id': 'contact_customer_id',
                'policy_csr_info': 'policy_csr_info',
                'policy_number': 'policy_number',
                'policy_type': 'policy_type',
                'policy_effective_date': 'policy_effective_date',
                'policy_expiry_date': 'policy_expiry_date',
                'tags': 'tags'

            } [contactField];
        };

        function packageContactForHashCheck(contact) {
            return {
                contact_name_family: contact.input.contact_name_family,
                contact_name_given: contact.input.contact_name_given,
                phone_number: removeNonNumbersFromString(contact.phones[0].phone_number)
            };
        };

        function removeNonNumbersFromString(string) {
            return string.replace(/[^0-9]/g, '');
        };
        return {
            restrict: 'E',
            templateUrl: 'views/company/contact-spreadsheet-importer.html',
            scope: {
                target: "="
            },
            link: function($scope, element, attrs) {
                $scope.displayLineErrors;
                $scope.gridOptions = {};
                $scope.ctrl = {
                    loadingFile: false,
                    loadingCsvFile: false
                };

                // $scope.startLoading = function() {
                //     $scope.ctrl.loadingFile = true;
                // };
                // $scope.$watch('gridOptions.data' ,function(newVal, oldVal){
                //     if (newVal.length > 0) $scope.ctrl.loadingFile = false;
                // });

                // $scope.$watch('ctrl.loadingFile' ,function(newVal, oldVal){
                //     console.log(newVal);
                // });

                // $scope.$on('loading.spreadsheet.file', function(){
                //     console.log("LOADING");
                //     $scope.ctrl.loadingFile = true;
                //     $scope.ctrl.keith = "loading";

                //     console.log($scope);
                // });
                // $scope.$on('finished.loading.spreadsheet.file', function(){
                //     $scope.ctrl.loadingFile = false;
                //     console.log("FINISHED");
                //     $scope.ctrl.keith = 'testing';
                // });
                $scope.getNewCsvObj = function() {
                    return {
                        content: null,
                        separator: ',',
                        accept: '.csv',
                        result: null,
                        encoding: 'ISO-8859-1',
                        uploadButtonLabel: ''
                    };
                };
                $scope.isDemoAgency = function() {
                    return userService.isDemoAgency();
                };
                $scope.limitReached = function() {
                    return userService.isDemoAgency() && userService.limitReached(
                        'contact');
                };
                $scope.csv = $scope.getNewCsvObj();
                $scope.resetCsvInput = function() {
                    angular.element('.csv-import').find('input')[0].value = '';
                };
                metaService.rootScopeOn($scope, 'close.csv', function() {
                    $scope.resetCsvInput();
                    $rootScope.$broadcast('clear.csv.filename');
                    angular.copy($scope.getNewCsvObj(), $scope.csv);
                });
                metaService.rootScopeOn($scope, 'close.xlsx', function() {
                    angular.copy({}, $scope.gridOptions);
                });
                $scope.closeMessage = function() {
                    $rootScope.successMessage = '';
                    $rootScope.failureMessage = '';
                    $scope.displayLineErrors = '';
                };
                $scope.commonContactFunctions = {
                    isValidEmail: isValidEmail,
                    isValidPhone: isValidPhone,
                    packageContactsForContactCreation: packageContactsForContactCreation,
                    mapContactFieldToPackagedContactField: mapContactFieldToPackagedContactField,
                    packageContactForHashCheck: packageContactForHashCheck
                };
            }
        };
    })
    .directive('xlsxImportProcessor', function($rootScope, userService, $mdDialog, $uibModalStack, usefulTools,
        contactService, contactGroupsService) {

        function maxOfArray(arr) {
            return Math.max.apply(null, arr);
        };

        return {
            restrict: 'E',
            templateUrl: 'views/company/xlsx-import-processor.html',
            scope: {
                xlsx: '=',
                target: '=',
                columnDefs: '=',
                closeMessage: '&',
                commonContactFunctions: '='
            },
            link: function($scope, element, attrs) {
                $scope.user = $rootScope.user;
                var isValidEmail = $scope.commonContactFunctions.isValidEmail;
                var isValidPhone = $scope.commonContactFunctions.isValidPhone;
                var packageContactsForContactCreation =
                    $scope.commonContactFunctions.packageContactsForContactCreation;
                var mapContactFieldToPackagedContactField =
                    $scope.commonContactFunctions.mapContactFieldToPackagedContactField;
                var packageContactForHashCheck =
                    $scope.commonContactFunctions.packageContactForHashCheck;

                $scope.colSelect = [];
                $scope.data = {
                    integrationContacts: false,
                    partner_name: $scope.user.exportType ? $scope.user.exportType.partner_name : null
                };
                $scope.groups = function() {
                    return contactGroupsService.groups;
                };
                $scope.import = {
                    exceedsGroupLimit: false,
                    destination: ($scope.target ? $scope.target : null),
                    selectedGroup: null
                };
                $scope.selectedSettings = {};

                $scope.groupLimit = function() {
                    return contactGroupsService.groupLimit;
                };

                $scope.getSettingsByType = function(type){

                    contactGroupsService.getImportSettingsByType(type)
                    .then(function(response){
                        $scope.importSettings = response;
                        console.log(['Settings by type',  response]);
                        return response;
                    })
                    .catch(function(error){
                        $rootScope.showErrorAlert("Saved Settings Failed to Import");
                        console.log(["Error", error]);
                        return [];
                    });
                };

                $scope.requiredFields = ['firstname', 'lastname'];
                $scope.phoneOptions = ['contact_phone1', 'contact_phone2', 'contact_phone3'];
                $scope.shapeXlsx = function() {
                    var field;
                    var newRow;
                    var newXlsx = [];
                    if (__env.enableDebug) console.log($scope.xlsx);
                };
                $scope.shapeXlsx();

                $scope.isDemoAgency = function() {
                    return userService.isDemoAgency();
                };
                $scope.limitReached = function() {
                    return userService.isDemoAgency() && userService.limitReached(
                        'contact');
                };
                $scope.exceedsLimits = function(rows) {
                    if (!userService.isDemoAgency()) return false;
                    var remain = $rootScope.user.usageLimits.contact - $rootScope.user.demoUsage
                        .contact;
                    return remain < rows.length;
                };

                function prepareContacts(rows) {
                    if ($scope.limitReached() || $scope.exceedsLimits(rows)) {
                        return;
                    }
                    
                    if (__env.enableDebug) console.log(rows);
                    angular.forEach(rows, function(row) {
                        row = usefulTools.convertObjectToArray(row);
                    });
                    $scope.contactRows = rows;
                    $scope.colHeaders = usefulTools.convertObjectToArray(rows[0]);
                    if (__env.enableDebug) console.log(rows);
                    if (__env.enableDebug) console.log($scope.colHeaders);
                    if ($scope.import.destination && $scope.import.destination !== true && $scope.import.destination !== 'null') {
                        console.log($scope.import.destination);
                        checkGroupLimit(rows);
                    }
                };

                function checkGroupLimit(rows) {
                    var group = contactGroupsService.getGroupByUuid($scope.import.destination);
                    if (group) {
                        if ($scope.import.destination) {
                            $scope.import.selectedGroup = contactGroupsService.getGroupByUuid($scope.import.destination);
                        } else {
                            $scope.import.selectedGroup = null;
                        }
                        
                        if (rows.length > $scope.groupLimit()) {
                            $rootScope.showErrorAlert('Contact groups are limited to ' + $scope.groupLimit() + ' contacts. You are importing ' + rows.length + ' contacts.');
                            $scope.import.exceedsGroupLimit = true;
                        } else {
                            // var contacts = $scope.importContactsXlsx();
                            //console.log(contacts);
                            $scope.import.exceedsGroupLimit = false;
                        }
                    } else {
                        $scope.import.exceedsGroupLimit = false;
                    }
                }

                prepareContacts($scope.xlsx);

                $scope.colOptions = [
                    {
                        key: 'ignore',
                        value: 'Ignore'
                    },
                    {
                        key: 'contact_name_given',
                        value: 'First Name'
                    },
                    {
                        key: 'contact_name_family',
                        value: 'Last Name'
                    },
                    {
                        key: 'contact_organization',
                        value: 'Company Name'
                    },
                    {
                        key: 'contact_email_address',
                        value: 'Email Address'
                    },
                    {
                        key: 'customer_id',
                        value: 'Customer Id'
                    },
                    {
                        key: 'contact_dob',
                        value: 'Date of Birth'
                    },
                    {
                        key: 'contact_address',
                        value: 'Address'
                    },
                    {
                        key: 'contact_city',
                        value: 'City'
                    },
                    {
                        key: 'contact_state',
                        value: 'State'
                    },
                    {
                        key: 'contact_zip_code',
                        value: 'Zip Code'
                    },
                    {
                        key: 'contact_phone1',
                        value: 'Mobile Phone Number'
                    },
                    {
                        key: 'contact_phone2',
                        value: 'Work Phone Number'
                    },
                    {
                        key: 'contact_phone3',
                        value: 'Home Phone Number'
                    },
                    {
                        key: 'contact_phone4',
                        value: 'Fax Number'
                    },
                    {
                        key: 'contact_note',
                        value: 'Notes'
                    },
                    {
                        key: 'policy_csr_info',
                        value: 'Policy CSR'
                    },
                    {
                        key: 'policy_number',
                        value: 'Policy Number'
                    },
                    {
                        key: 'policy_type',
                        value: 'Policy Type'
                    },
                    {
                        key: 'policy_effective_date',
                        value: 'Policy Effective Date'
                    },
                    {
                        key: 'policy_expiry_date',
                        value: 'Policy Expiry Date'
                    },
                    {
                        key: 'tags',
                        value: 'Tags'
                    }
                ];

                $scope.endImport = function() {
                    $uibModalStack.dismissAll();
                    $rootScope.$broadcast('close.xlsx');
                };

                $scope.packageContactByRowAndColSelect = function(row) {
                    var field;
                    var value;
                    var contact = {};
                    for (var i = 0; i < row.length; i++) {
                        field = $scope.colSelect[i];
                        value = row[i];
                        if (field) {
                            contact[field] = value;
                        }
                    }
                    return contact;
                };

                $scope.cleanPhoneNumber = function(phoneNumber) {
                    return usefulTools.cleanPhoneNumber(phoneNumber);
                };

            // ***************'Create New Group' in XLSX Import****************
                $scope.userContacts = function() {
                    return contactService.userContactsArray();
                };
                $scope.contacts = function() {
                    return contactService.allContactsArray();
                };
                $scope.contactGroups = function() {
                    return contactGroupsService.groups;
                };

                $scope.newGroup = {};

                $rootScope.$on('contact.group.updated', function(event, data) {

                    $scope.import.destination = data.group_uuid;
                    if ($scope.selectedSettings) {
                        $scope.selectedSettings.import_destination = data.group_uuid;
                        $scope.allowSettingsCompare();
                    }
                    $scope.importReady = true;
                });

                $scope.$watch('import.destination', function(newVal, oldVal) {
                    if(newVal && newVal != oldVal && newVal !== true) {
                        $scope.import.selectedGroup = contactGroupsService.getGroupByUuid($scope.import.destination);
                    }
                });

                $scope.processImportDestinationChange = function(){
                    if ($scope.import.destination === true){
                        $scope.showEditGroupXlsx(null)
                        console.log("Creating New Destination");
                        $scope.import.selectedGroup = null;
                    } else {
                        console.log(['Destination', $scope.import.destination]);
                        if ($scope.import.destination) {
                            $scope.import.selectedGroup = contactGroupsService.getGroupByUuid($scope.import.destination);
                        } else {
                            $scope.import.selectedGroup = null;
                        }
                    }
                    if ($scope.selectedSettings){
                        $scope.selectedSettings.import_destination = $scope.import.destination;
                        $scope.import.selectedGroup = contactGroupsService.getGroupByUuid($scope.import.destination);
                    }
                    $scope.allowSettingsCompare();
                };

                $scope.exceedsTotalLimit = function() {
                    var contacts = $scope.xlsx.data;;
                    return contacts.length > (contactGroupsService.groupLimit + 1);
                };

                $scope.exceedsGroupLimit = function() {
                    var contacts = $scope.xlsx.data;
                    if (!$scope.import.selectedGroup) return false;
                    return (contacts.length + $scope.import.selectedGroup.members.length) > (contactGroupsService.groupLimit + 1);
                };

                $scope.showEditGroupXlsx = function(group) {
                    $rootScope.uploaderOption = '/contacts/groups/create';
                    $rootScope.showNewGroup = true;

                    var data = {
                        updateGroup: angular.copy(group),
                        userContacts: $scope.userContacts(),
                        contacts: $scope.userContacts(),
                        theContact: contactService.getContactByUuid,
                        fromImportDirective: true,
                    };
                    $rootScope.showModalFull('/company/docontactgroup.html', data,
                        'lg');
                };

            //*****************'Save Import Settings' in XLSX Imports***************
                
                $scope.showNameEntry = false;
                $scope.importSettingsName = "";
                $scope.saveImportSettings = contactGroupsService.saveImportSettings;
                $scope.importSettings = $scope.getSettingsByType('xlsx');

                $scope.enterImportSettingsName = function(){
                    $scope.importSettingsName = "";
                    $scope.showNameEntry = !$scope.showNameEntry
                };
                
                $scope.cancelShowNameEntry = function(){
                    $scope.showNameEntry = false;
                    $scope.importSettingsName = "";
                };

                $scope.processImportSettings = function(nameData){
                    if (!nameData){
                        $rootScope.showErrorAlert("Please provide a name under which to save the Import Settings.");
                        return;
                    } else {
                        $scope.showNameEntry = false;
                        $scope.importSettingsName = nameData;
                        var data = $scope.collectSettingsData();
                        if (!data){
                            return;
                        } else {
                            $scope.saveImportSettings(data)
                            .then(function(response){
                                var newSetting = response.data.success.data;
                                var columnsObj = JSON.parse(newSetting.import_column_settings);
                                var colSettings = $scope.columnsObjToColSettings(columnsObj);
                                newSetting.import_column_settings = colSettings;

                                $scope.importSettings.push(newSetting);
                                $scope.selectedSettings = newSetting;
                                $scope.setLoadedSettings(newSetting);
                                $scope.showUpdate = false;
                            });
                        }
                    }
                };

                $scope.collectSettingsData = function(showAlerts){
                    // gather and package import settings data for XLSX Imports
                    (showAlerts === undefined || showAlerts === true) ? true : false;

                    var columnsSelected = $scope.colSelect;
                    var columnSettings = {};
                    var colSettingsString = "";
                    var validSettings = {
                        firstName : false,
                        lastName : false,
                        aPhone : false,
                    };
                    if (columnsSelected && columnsSelected.length > 0){
                        for ( var i = 0; i < columnsSelected.length; i++){
                            columnSettings[i] = columnsSelected[i] ? columnsSelected[i] : null;
                            
                            //check that required fields are selected
                            switch (columnSettings[i]) {
                                case 'contact_name_given':
                                    validSettings.firstName = true;
                                    console.log('First name included');
                                    break;
                                case 'contact_name_family':
                                    validSettings.lastName = true;
                                    console.log('Last name included');
                                    break;
                                case 'contact_phone1':
                                case 'contact_phone2':
                                case 'contact_phone3':
                                    validSettings.aPhone = true;
                                    console.log('A phone # was included');
                                    break;
                                default:
                                  console.log( columnSettings[i] + " was included");
                            }
                        }
                        if (validSettings.firstName && validSettings.lastName && validSettings.aPhone){
                            console.log("Valid Column Selections");
                            colSettingsString = JSON.stringify(columnSettings);                        
                            var settings = {
                                'domain_uuid': $scope.user.domain.domain_uuid,
                                'import_destination': $scope.import.destination == true ? '00000000-0000-0000-0000-000000000000' : $scope.import.destination,
                                'include_first_row': $scope.data.includeFirstRow,
                                'as_partner_contacts': $scope.data.integrationContacts,
                                'contact_import_type': 'xlsx',
                                'contact_import_behavior': "undefined",
                                'import_column_settings': colSettingsString,
                                'import_settings_name': $scope.importSettingsName,
                                'saved_by_user_uuid': $scope.user.user_uuid,
                            };
                            return settings;
                        } else {
                            console.log("Invalid Column Selections");
                            if (showAlerts){
                                $rootScope.showErrorAlert("First name, last name, and a phone number are required.");
                            }
                            return false;
                        }
                    } else {
                        console.log("Column settings were not selected.");
                        if (showAlerts){
                            $rootScope.showErrorAlert("Column headers must be set before Import Settings may be saved.");
                        }
                        return false;
                    }
                };

            // **************************Update Settings XLSX***************************
                $scope.loadedSettings = null;

                $scope.setLoadedSettings = function(selectedSettings){
                    selectedSettings ? selectedSettings : $scope.selectedSettings;
                    if (selectedSettings != null && selectedSettings.contact_import_setting_uuid) {

                        return contactGroupsService.getImportSettingsBySettingUuid(selectedSettings.contact_import_setting_uuid)
                        .then(function(response){
                            if (response ){
                                var loadedSettings = response;
                                var columnsObj = JSON.parse(loadedSettings.import_column_settings);
                                var colSettings = $scope.columnsObjToColSettings(columnsObj);
                                loadedSettings.import_column_settings = colSettings;
                                loadedSettings.import_destination = (loadedSettings.import_destination === "00000000-0000-0000-0000-000000000000") ?
                                true : loadedSettings.import_destination;

                                $scope.loadedSettings = loadedSettings;
                                $scope.showUpdate = false;
                                console.log(["Loaded Settings Set", $scope.loadedSettings]);
                                return $scope.loadedSettings;
                            }
                        })
                        .catch(function(error){
                            console.log(error);
                            return false;
                        });

                    } else {
                        console.log("No settings selected");
                        return undefined;
                    }
                };
                
                $scope.allowSettingsCompare = function(){
                    $scope.compareControl = 0;
                }

                $scope.updateSelectedSettingsAndCompare = function(key, value){
                    if ($scope.selectedSettings && $scope.loadedSettings){
                        $scope.selectedSettings[key] = value;
                        $scope.allowSettingsCompare();
                    } else {
                        console.log("selected and loaded settings are not set");
                        return;
                    }
                    
                };
                
                $scope.compareControl = 0;
                $scope.showUpdate = false;
                $scope.compareSettings = function(){
                    //returns false if loadedSettings and selectedSettings do not match
                    if ($scope.compareControl < 1){
                        $scope.compareControl++;

                        var selectedSettings = $scope.selectedSettings;
                        var loadedSettings = $scope.loadedSettings;

                        console.log(['CHECK COMPARISON', $scope.selectedSettings, $scope.loadedSettings]);

                        if (selectedSettings != null && loadedSettings != null){
                
                            var matchedSettings = {
                                import_column_settings: false,
                                import_destination: false,
                                include_first_row: false,
                                as_partner_contacts: false,
                                contact_import_behavior: false,
                            };

                            //step through relevant settings & compare
                            for (var key in matchedSettings){

                                switch (key) {
                                    case 'import_column_settings':
                                        
                                        if (selectedSettings[key].length != loadedSettings[key].length){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            for (var each in selectedSettings[key]){
                                                if (selectedSettings[key][each] !== loadedSettings[key][each]){
                                                    $scope.showUpdate = true;
                                                    return false;
                                                }
                                            }
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    case 'import_destination':
                                        if (selectedSettings[key] !== loadedSettings[key]){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    case 'include_first_row':
                                        if (selectedSettings[key] !== loadedSettings[key]){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    case 'as_partner_contacts':
                                        if (selectedSettings[key] !== loadedSettings[key]){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    case 'contact_import_behavior':
                                        if (selectedSettings[key] !== loadedSettings[key]){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    default:
                                        console.log("default reached");
                                        $scope.showUpdate = true;
                                        return false;
                                }
                                console.log('CHECK', key, matchedSettings[key] );
                            }
                            console.log('compared TRUE');
                            $scope.showUpdate = false;
                            return true;
                        }
                    } else { 
                        return undefined; 
                    }
                };
                                
                $scope.updateSettings = function(){
                    if ( $scope.loadedSettings ){
                        var loadedSettings = $scope.loadedSettings;
                        var settings = $scope.collectSettingsData(true);
    
                        settings.contact_import_setting_uuid = loadedSettings.contact_import_setting_uuid;
                        
                        contactGroupsService.updateImportSettings(settings)
                        .then(function(response){
                            var updatedSettings = response.data.success.data;
                            
                            $scope.setLoadedSettings(updatedSettings)
                            .then(function(response){
                                $scope.compareControl = 0;
                            })
                            
                        })
                    } else {
                        console.log("No Loaded Settings to Update");
                        $rootScope.showErrorAlert("There are no Loaded Settings to update.");
                    }
                };
                
            //***************'Load Import Settings in XLSX Imports'*****************
                $scope.selectedSettings = null;

                $scope.processImportSettingsChange = function(selectedSettings){
                    $scope.selectedSettings = selectedSettings;
                    if ($scope.selectedSettings == null) {
                        $scope.import.destination = null;
                        $scope.data.includeFirstRow = null;
                        $scope.data.integrationContacts = false;
                        $scope.import.behavior = undefined;
                        $scope.colSelect = [];
                    } else {
                        
                        if ( Array.isArray($scope.selectedSettings.import_column_settings) ){
                            console.log(['import column settings are already array', Array.isArray($scope.selectedSettings.import_column_settings), $scope.selectedSettings.import_column_settings ]);
                        } else {
                            var columnsObj = JSON.parse($scope.selectedSettings.import_column_settings);
                            $scope.selectedSettings.import_column_settings = $scope.columnsObjToColSettings(columnsObj);
                        }
                        if ($scope.selectedSettings.import_destination == "00000000-0000-0000-0000-000000000000" ){
                            $scope.import.destination = true;
                            $scope.data.includeFirstRow = null;
                            $scope.data.integrationContacts = $scope.selectedSettings.as_partner_contacts;
                            $scope.import.behavior = $scope.selectedSettings.contact_import_behavior;
                            $scope.colSelect = $scope.selectedSettings.import_column_settings;
                        } else if ($scope.selectedSettings.import_destination == null){
                            $scope.import.destination = $scope.selectedSettings.import_destination;
                            $scope.data.includeFirstRow = null;
                            $scope.data.integrationContacts = $scope.selectedSettings.as_partner_contacts;
                            $scope.import.behavior = $scope.selectedSettings.contact_import_behavior;
                            $scope.colSelect = $scope.selectedSettings.import_column_settings;
                        } else if ($scope.validTarget($scope.selectedSettings.import_destination)){
                            $scope.import.destination = $scope.selectedSettings.import_destination;
                            $scope.data.includeFirstRow = null;
                            $scope.data.integrationContacts = $scope.selectedSettings.as_partner_contacts;
                            $scope.import.behavior = $scope.selectedSettings.contact_import_behavior;
                            $scope.colSelect = $scope.selectedSettings.import_column_settings;
                        } else {
                            $scope.selectDestination();
                            $scope.data.includeFirstRow = null;
                            $scope.data.integrationContacts = $scope.selectedSettings.as_partner_contacts;
                            $scope.import.behavior = $scope.selectedSettings.contact_import_behavior;
                            $scope.colSelect = $scope.selectedSettings.import_column_settings;
                        }
                        $scope.setLoadedSettings(selectedSettings);
                    }
                };
                
                $scope.columnsObjToColSettings = function(columnsObj){
                    var colSettings = [];
                    for (var setting in columnsObj){
                        colSettings[setting] = columnsObj[setting];
                    }
                    return colSettings;
                };

                $scope.validTarget = function(destination){
                    var targets = $scope.groups();
                    for (var target in targets){
                        if (targets[target].group_uuid == destination){
                            console.log('Valid Target Destination');
                            return true;
                        }
                    }
                    console.log('No Target', destination);
                    return false;
                };

                $scope.selectDestination = function() {
                    var issue = 'The Contact Group saved as the destination in these settings has been deleted.';
                    var choice = 'Would you like to import to a New group or to the Conact List?'
                    $scope.destinationSelectDialog(issue, choice)
                        .then(function(response) {
                            if (response) {
                                $scope.import.destination = true;
                                $scope.selectedSettings.import_destination = "00000000-0000-0000-0000-000000000000";
                                console.log(['dest selectedSettings', $scope.selectedSettings]);
                            } else {
                                $scope.import.destination = null;
                                $scope.selectedSettings.import_destination = null;
                                $scope.allowSettingsCompare();
                                console.log(['dest selectedSettings', $scope.selectedSettings]);
                            };
                        });
                };

                $scope.destinationSelectDialog = function(message, submessage, multiple) {
                    var confirm = $mdDialog.confirm()
                        .title(message)
                        .textContent(submessage)
                        .ok('New Group')
                        .cancel('Contact List')
                        .multiple(multiple);
                    return $mdDialog.show(confirm).then(function() {
                        return true;
                    }, function() {
                        return false;
                    });
                };

                $scope.deleteSingleImportSetting = function(uuid){
                    contactGroupsService.deleteSingleImportSetting(uuid)
                    .then(function(response){
                        $scope.processImportSettingsChange(null);
                        $scope.showUpdate = false;
                        $scope.controlCounter = 0;
                        $scope.getSettingsByType('csv');
                    })
                    .catch(function(error){
                        console.log(['Error', error]);
                    });
                };

                $scope.checkSelectedSettings = function(){
                    return $scope.selectedSettings;
                }

        // *********************Import XLSX Contacts*************************

                $scope.doImportContactsXlsx = function() {
                    var partner = $rootScope.user.exportType.partner_code;
                    var contacts = $scope.xlsx.data;
                    $scope.processingImport = true;
                    $scope.sendingImport = true;
                    var data = {
                        partner: partner,
                        import_type: 'xlsx',
                        is_partner: $scope.data.integrationContacts,
                        contacts: contacts, 
                        columnDefs: $scope.xlsx.columnDefs,
                        cols: $scope.colSelect,
                        destination: $scope.import.destination
                    };
                    console.log(data);
                    $rootScope.showSuccessAlert('Your import has been received and is being processed. We will notify you in Bridge and by email once the contacts have been imported. It may take a some time depending on the size of the list.');
                    contactService.sendContactImport(data)
                    .then(function(response) {
                        if (response.data.success) {
                            // $rootScope.showSuccessAlert(response.data.success.message);
                            $scope.sendingImport = false;
                            $scope.processingImport = false;
                        }
                    });
                    $scope.endImport();
                };
                
                $scope.handleXlsxImport = function() {
                    if ($scope.importReady == true){
                        $scope.importReady = false;
                        $scope.doImportContactsXlsx();
                    } else if ($scope.import.destination === true){
                        $scope.showEditGroupXlsx(null);
                    } else {
                        $scope.doImportContactsXlsx();
                    }
                };

                $scope.importContactsXlsx = function() {
                    var partner = $rootScope.user.exportType.partner_code;
                    // if ($scope.data.integrationContacts && 
                    //     (partner === 'ams360' || partner === 'qqcatalyst') &&
                    //      !$scope.colSelect.includes('customer_id')) {
                    //     return $rootScope.showErrorAlert("No contacts were imported. Please select the Customer Id field to import the " + $scope.data.partner_name + " contacts.");
                    // }
                    var contact;
                    var s = $scope;
                    var validContacts = [];
                    var invalidContacts = [];
                    var contacts = $scope.xlsx.data;
                    console.log($scope.xlsx);
                    if (__env.enableDebug) console.log(contacts);
                    angular.forEach(contacts, function(row) {
                        var contact = {};
                        angular.forEach($scope.colSelect, function(key, index) {
                            var field = row[$scope.xlsx.columnDefs[
                                index].field];
                            if (key && key !== 'ignore') {
                                if (key === 'contact_phone1' || key ===
                                    'contact_phone2' ||
                                    key === 'contact_phone3' || key ===
                                    'contact_phone4') {
                                    if (field) {
                                        field = $scope.cleanPhoneNumber(
                                            field);
                                    }
                                }
                                contact[key] = field;
                            }
                        });
                        if ($scope.data.integrationContacts) {
                            console.log(partner);
                            if (partner == 'ams360') {
                                contact['contact_type'] = 'amscontact';
                            } else if (partner == 'qqcatalyst') {
                                contact['contact_type'] = 'qqcontact';
                            } else if (partner == 'epic') {
                                contact['contact_type'] = 'epiccontact';
                            } else if (partner == 'ezlynx') {
                                contact['contact_type'] = 'ezlynxcontact';
                            } else if (partner == 'agencymatrix') {
                                contact['contact_type'] = 'agencymatrixcontact';
                            } else if (partner == 'e-agent') {
                                contact['contact_type'] = 'eagentcontact';
                            } else if (partner == 'hawksoft') {
                                contact['contact_type'] = 'hawksoftcontact';
                            }
                        } else {
                            contact['contact_type'] = 'contact';
                        }
                        if (__env.enableDebug) console.log(contact);
                        if ($scope.validRow(contact)) {
                            validContacts.push(contact);
                        } else {
                            invalidContacts.push(contact);
                        }
                    });
                    if (invalidContacts.length > 0) {
                        var name;
                        var missingString = '';
                        angular.forEach(invalidContacts, function(contact) {
                            name = (contact.firstname ? contact.firstname + ' ' :
                                    '') +
                                (contact.lastname ? contact.lastname : '');
                            if (name) {
                                contactService.addToInvalidContactData(name);
                            }
                        });
                        if (__env.enableDebug) console.log(missingString);
                    }
                    var packagedContacts = packageContactsForContactCreation(validContacts);

                    if (packagedContacts.length > 0) {
                        contactService.createContactImport(packagedContacts, $scope.import.destination)
                            .then(function(response) {
                                if (response.success) {
                                    $rootScope.showSuccessAlert(response.success.message);
                                    $scope.sendingImport = false;
                                    $scope.processingImport = false;
                                }
                            });
                        $scope.endImport();
                        // $rootScope.showInfoAlert('Your contacts are importing. Feel free to continue using Bridge while we process them in the background. You will be sent a notice once complete.');
                    } else {
                        contactService.importUserContacts(packagedContacts, $scope.import
                                .destination)
                            .then(function(response) {
                                var contacts = [];
                                if (response.data.success) {
                                    contacts = response.data.success.data;
                                    if ($scope.import.destination) {
                                        contactGroupsService.setGroups();
                                        $rootScope.$broadcast(
                                            'group.contacts.added');
                                    }
                                }
                                if (contacts.length > 0) {
                                    var message = 'You imported ' + contacts.length +
                                        ' of your contacts! Please be aware that some contacts might not have been imported. Bridge will not import contacts who were previously imported into Bridge or who are missing one or more of the three required contact fields: first name, last name, phone number.';
                                    $rootScope.showSuccessAlert(message);
                                } else {
                                    $rootScope.showErrorAlert(
                                        "No contacts were imported. Either your contacts were previously imported into Bridge, they are missing one or more of the three required contact fields: first name, last name, phone number, or you have reached your maximum number of allowed contacts. "
                                    );
                                }
                                $scope.endImport();
                                $scope.sendingImport = false;
                                $scope.processingImport = false;
                            });
                    }
                };

                $scope.addContactsToGroup = function(contactUuids) {
                    angular.forEach(contactUuids, function(contactUuid) {

                        contactGroupsService.addContactToGroup(contactUuid,
                            $scope.import.destination);
                    });
                    contactGroupsService.setGroups();
                };

                $scope.validRow = function(row) {
                    var indexOfFieldInColSelect;
                    var result = true;
                    angular.forEach($scope.requiredFields, function(requiredField) {
                        if (!row[requiredField]) result = false;
                    });
                    var hasPhone = false;
                    angular.forEach($scope.phoneOptions, function(phoneOption) {
                        if (!hasPhone) {
                            if (row[phoneOption] && isValidPhone(row[
                                    phoneOption])) hasPhone = true;
                        }
                    });
                    if (!hasPhone) result = false;
                    return result;
                };
            }
        };
    })
    .directive('csvImportProcessor', function($rootScope, userService, $mdDialog, $uibModalStack, usefulTools,
        contactService, contactGroupsService) {

        function maxOfArray(arr) {
            return Math.max.apply(null, arr);
        };

        return {
            restrict: 'E',
            templateUrl: 'views/company/csv-import-processor.html',
            scope: {
                csv: '=',
                closeMessage: '&',
                commonContactFunctions: '=',
                target: '='
            },
            link: function($scope, element, attrs) {
                $scope.user = $rootScope.user;
                var isValidEmail = $scope.commonContactFunctions.isValidEmail;
                var isValidPhone = $scope.commonContactFunctions.isValidPhone;
                var packageContactsForContactCreation =
                    $scope.commonContactFunctions.packageContactsForContactCreation;
                var mapContactFieldToPackagedContactField =
                    $scope.commonContactFunctions.mapContactFieldToPackagedContactField;
                var partner = $rootScope.user.exportType.partner_code;
                $scope.data = {
                    integrationContacts: false,
                    includeFirstRow: true,
                    partner_name: $scope.user.exportType ? $scope.user.exportType.partner_name : null
                };
                $scope.selectedSettings = {};
                $scope.groups = function() {
                    return contactGroupsService.groups;
                };
                $scope.import = {
                    exceedsGroupLimit: false,
                    destination: ($scope.target ? $scope.target : null),
                    selectedGroup: null
                };
                $scope.groupLimit = function() {
                    return contactGroupsService.groupLimit;
                };
                
                $scope.getSettingsByType = function(type){

                    contactGroupsService.getImportSettingsByType(type)
                    .then(function(response){
                        $scope.importSettings = response;
                        console.log(['Settings by type',  response]);
                        return response;
                    })
                    .catch(function(error){
                        $rootScope.showErrorAlert("Saved Settings Failed to Import");
                        console.log(["Error", error]);
                        return [];
                    });
                };

                $scope.colSelect = [];

                $scope.isDemoAgency = function() {
                    return userService.isDemoAgency();
                };
                $scope.limitReached = function() {
                    return userService.isDemoAgency() && userService.limitReached(
                        'contact');
                };
                $scope.exceedsLimits = function(rows) {
                    if (!userService.isDemoAgency()) return false;
                    var remain = $rootScope.user.usageLimits.contact - $rootScope.user.demoUsage
                        .contact;
                    return remain < rows.length;
                };

                $scope.requiredFields = ['firstname', 'lastname'];
                $scope.phoneOptions = ['contact_phone1', 'contact_phone2', 'contact_phone3'];

                function prepareContacts(rows) {
                    if ($scope.limitReached() || $scope.exceedsLimits(rows)) {
                        return;
                    }
                    
                    if (__env.enableDebug) console.log(rows);
                    angular.forEach(rows, function(row) {
                        row = usefulTools.convertObjectToArray(row);
                    });
                    $scope.contactRows = rows;
                    $scope.colHeaders = usefulTools.convertObjectToArray(rows[0]);
                    if (__env.enableDebug) console.log(rows);
                    if (__env.enableDebug) console.log($scope.colHeaders);
                    if ($scope.import.destination && $scope.import.destination !== true && $scope.import.destination !== 'null') {
                        console.log($scope.import.destination);
                        checkGroupLimit(rows);
                    }
                };

                function checkGroupLimit(rows) {
                    var group = contactGroupsService.getGroupByUuid($scope.import.destination);
                    if (group) {
                        if ($scope.import.destination) {
                            $scope.import.selectedGroup = contactGroupsService.getGroupByUuid($scope.import.destination);
                        } else {
                            $scope.import.selectedGroup = null;
                        }
                        
                        if (rows.length > $scope.groupLimit()) {
                            $rootScope.showErrorAlert('Contact groups are limited to ' + $scope.groupLimit() + ' contacts. You are importing ' + rows.length + ' contacts.');
                            $scope.import.exceedsGroupLimit = true;
                        } else {
                            var contacts = prepareImportData();
                            console.log(contacts);
                            $scope.import.exceedsGroupLimit = false;
                        }
                    } else {
                        $scope.import.exceedsGroupLimit = false;
                    }
                }

                prepareContacts($scope.csv);

                $scope.colOptions = [{
                        key: 'ignore',
                        value: 'Ignore'
                    },
                    {
                        key: 'contact_name_given',
                        value: 'First Name'
                    },
                    {
                        key: 'contact_name_family',
                        value: 'Last Name'
                    },
                    {
                        key: 'contact_organization',
                        value: 'Company Name'
                    },
                    {
                        key: 'contact_email_address',
                        value: 'Email Address'
                    },
                    {
                        key: 'customer_id',
                        value: 'Customer Id'
                    },
                    {
                        key: 'contact_dob',
                        value: 'Date of Birth'
                    },
                    {
                        key: 'contact_address',
                        value: 'Address'
                    },
                    {
                        key: 'contact_city',
                        value: 'City'
                    },
                    {
                        key: 'contact_state',
                        value: 'State'
                    },
                    {
                        key: 'contact_zip_code',
                        value: 'Zip Code'
                    },
                    {
                        key: 'contact_phone1',
                        value: 'Mobile Phone Number'
                    },
                    {
                        key: 'contact_phone2',
                        value: 'Work Phone Number'
                    },
                    {
                        key: 'contact_phone3',
                        value: 'Home Phone Number'
                    },
                    {
                        key: 'fax_number',
                        value: 'Fax Number'
                    },
                    {
                        key: 'contact_note',
                        value: 'Notes'
                    },
                    {
                        key: 'policy_csr_info',
                        value: 'Policy CSR'
                    },
                    {
                        key: 'policy_number',
                        value: 'Policy Number'
                    },
                    {
                        key: 'policy_type',
                        value: 'Policy Type'
                    },
                    {
                        key: 'policy_effective_date',
                        value: 'Policy Effective Date'
                    },
                    {
                        key: 'policy_expiry_date',
                        value: 'Policy Expiry Date'
                    },
                    {
                        key: 'tags',
                        value: 'Tags'
                    }
                ];

                $scope.endImport = function() {
                    $uibModalStack.dismissAll();
                    $rootScope.$broadcast('close.csv');
                };

                $scope.packageContactByRowAndColSelect = function(row) {
                    var field;
                    var value;
                    var contact = {};
                    for (var i = 0; i < row.length; i++) {
                        field = $scope.colSelect[i];
                        value = row[i];
                        if (field) {
                            contact[field] = value;
                        }
                    }
                    return contact;
                };

                // ****************'Create New Group' in CSV Imports****************
                $scope.userContacts = function() {
                    return contactService.userContactsArray();
                };

                $scope.contacts = function() {
                    return contactService.allContactsArray();
                };

                $scope.contactGroups = function() {
                    return contactGroupsService.groups;
                };

                $scope.newGroup = {};

                $rootScope.$on('contact.group.updated', function(event, data) {
                    $scope.import.destination = data.group_uuid;
                    if ($scope.selectedSettings) {
                        $scope.selectedSettings.import_destination = data.group_uuid;
                        $scope.allowSettingsCompare();
                    }
                    $scope.importReady = true;
                });

                $scope.$watch('import.destination', function(newVal, oldVal) {
                    if(newVal && newVal != oldVal && newVal !== true) {
                        $scope.import.selectedGroup = contactGroupsService.getGroupByUuid($scope.import.destination);
                    }
                });

                $scope.processImportDestinationChange = function(){
                    if ($scope.import.destination === true){
                        $scope.showEditGroupCsv(null)
                        console.log("Creating New Destination");
                        $scope.import.selectedGroup = null;
                    } else {
                        console.log(['Destination', $scope.import.destination]);
                        if ($scope.import.destination) {
                            $scope.import.selectedGroup = contactGroupsService.getGroupByUuid($scope.import.destination);
                        } else {
                            $scope.import.selectedGroup = null;
                        }
                    }
                    if ($scope.selectedSettings){
                        $scope.selectedSettings.import_destination = $scope.import.destination;
                        $scope.import.selectedGroup = contactGroupsService.getGroupByUuid($scope.import.destination);
                    }
                    $scope.allowSettingsCompare();
                };

                $scope.exceedsTotalLimit = function() {
                    var contacts = $scope.data.includeFirstRow ? $scope.csv : $scope.csv.slice(1, $scope.csv.length);
                    return contacts.length > (contactGroupsService.groupLimit + 1);
                };

                $scope.exceedsGroupLimit = function() {
                    var contacts = $scope.data.includeFirstRow ? $scope.csv : $scope.csv.slice(1, $scope.csv.length);
                    if (!$scope.import.selectedGroup) return false;
                    return (contacts.length + $scope.import.selectedGroup.members.length) > (contactGroupsService.groupLimit + 1);
                };

                $scope.showEditGroupCsv = function(group) {
                    $rootScope.uploaderOption = '/contacts/groups/create';
                    $rootScope.showNewGroup = true;

                        var data = {
                            updateGroup: angular.copy(group),
                            userContacts: $scope.userContacts(),
                            contacts: $scope.userContacts(),
                            theContact: contactService.getContactByUuid,
                            fromImportDirective: true,
                        };
                        $rootScope.showModalFull('/company/docontactgroup.html', data, 'lg');
                };

                
                //*****************'Save Import Settings' in CSV Imports***************
                $scope.showNameEntry = false;
                $scope.importSettingsName = "";
                $scope.saveImportSettings = contactGroupsService.saveImportSettings;
                $scope.importSettings = $scope.getSettingsByType('csv');

                $scope.enterImportSettingsName = function(){
                    $scope.importSettingsName = "";
                    $scope.showNameEntry = !$scope.showNameEntry
                };
                
                $scope.cancelShowNameEntry = function(){
                    $scope.showNameEntry = false;
                    $scope.importSettingsName = "";
                };
                
                $scope.processImportSettings = function(nameData){
                    if (!nameData){
                        $rootScope.showErrorAlert("Please provide a name under which to save the Import Settings.");
                        return;
                    } else {
                        $scope.showNameEntry = false;
                        $scope.importSettingsName = nameData;
                        var data = $scope.collectSettingsData();
                        if (!data){
                            return;
                        } else {
                            $scope.saveImportSettings(data)
                            .then(function(response){
                                var newSetting = response.data.success.data;
                                var columnsObj = JSON.parse(newSetting.import_column_settings);
                                var colSettings = $scope.columnsObjToColSettings(columnsObj);
                                newSetting.import_column_settings = colSettings;

                                $scope.importSettings.push(newSetting);
                                $scope.selectedSettings = newSetting;
                                $scope.setLoadedSettings(newSetting);
                                $scope.showUpdate = false;
                            });
                        }
                    }
                };

                $scope.collectSettingsData = function(showAlerts){
                    // gather and package import settings data for CSV Imports
                    (showAlerts === undefined || showAlerts === true) ? true : false;

                    var columnsSelected = $scope.colSelect;
                    var columnSettings = {};
                    var colSettingsString = "";
                    var validSettings = {
                        firstName : false,
                        lastName : false,
                        aPhone : false,
                    };
                    if (columnsSelected && columnsSelected.length > 0){
                        for ( var i = 0; i < columnsSelected.length; i++){
                            columnSettings[i] = columnsSelected[i] ? columnsSelected[i] : null;
                            
                            //check that required fields are selected
                            switch (columnSettings[i]) {
                                case 'contact_name_given':
                                    validSettings.firstName = true;
                                    console.log('First name included');
                                    break;
                                case 'contact_name_family':
                                    validSettings.lastName = true;
                                    console.log('Last name included');
                                    break;
                                case 'contact_phone1':
                                case 'contact_phone2':
                                case 'contact_phone3':
                                    validSettings.aPhone = true;
                                    console.log('A phone # was included');
                                    break;
                                default:
                                  console.log( columnSettings[i] + " was included");
                            }
                        }
                        if (validSettings.firstName && validSettings.lastName && validSettings.aPhone){
                            console.log("Valid Column Selections");
                            colSettingsString = JSON.stringify(columnSettings);                        
                            var settings = {
                                'domain_uuid': $scope.user.domain.domain_uuid,
                                'import_destination': $scope.import.destination == true ? '00000000-0000-0000-0000-000000000000' : $scope.import.destination,
                                'include_first_row': $scope.data.includeFirstRow,
                                'as_partner_contacts': $scope.data.integrationContacts,
                                'contact_import_type': 'csv',
                                'contact_import_behavior': "undefined",
                                'import_column_settings': colSettingsString,
                                'import_settings_name': $scope.importSettingsName,
                                'saved_by_user_uuid': $scope.user.user_uuid,
                            };
                            return settings;
                        } else {
                            console.log("Invalid Column Selections");
                            if (showAlerts){
                                $rootScope.showErrorAlert("First name, last name, and a phone number are required.");
                            }
                            return false;
                        }
                    } else {
                        console.log("Column settings were not selected.");
                        if (showAlerts){
                            $rootScope.showErrorAlert("Column headers must be set before Import Settings may be saved.");
                        }
                        return false;
                    }
                };

            // **************************Update Settings CSV***************************
                $scope.loadedSettings = null;
                
                $scope.setLoadedSettings = function(selectedSettings){
                    selectedSettings ? selectedSettings : $scope.selectedSettings;
                    if (selectedSettings != null && selectedSettings.contact_import_setting_uuid) {

                        return contactGroupsService.getImportSettingsBySettingUuid(selectedSettings.contact_import_setting_uuid)
                        .then(function(response){
                            if (response ){
                                var loadedSettings = response;
                                var columnsObj = JSON.parse(loadedSettings.import_column_settings);
                                var colSettings = $scope.columnsObjToColSettings(columnsObj);
                                loadedSettings.import_column_settings = colSettings;
                                loadedSettings.import_destination = (loadedSettings.import_destination === "00000000-0000-0000-0000-000000000000") ?
                                true : loadedSettings.import_destination;
                                
                                $scope.loadedSettings = loadedSettings;
                                $scope.showUpdate = false;
                                console.log(["Loaded Settings Set", $scope.loadedSettings]);
                                return $scope.loadedSettings;
                            }
                        })
                        .catch(function(error){
                            console.log(error);
                            return false;
                        });

                    } else {
                        console.log("No settings selected");
                        return undefined;
                    }
                };

                $scope.allowSettingsCompare = function(){
                    $scope.compareControl = 0;
                }

                $scope.updateSelectedSettingsAndCompare = function(key, value){
                    if ($scope.selectedSettings && $scope.loadedSettings){
                        $scope.selectedSettings[key] = value;
                        $scope.allowSettingsCompare();
                    } else {
                        console.log("selected and loaded settings are not set");
                        return;
                    }
                    
                };

                $scope.compareControl = 0;
                $scope.showUpdate = false;
                $scope.compareSettings = function(){
                    //returns false if loadedSettings and selectedSettings do not match
                    if ($scope.compareControl < 1){
                        $scope.compareControl++;

                        var selectedSettings = $scope.selectedSettings;
                        var loadedSettings = $scope.loadedSettings;

                        console.log(['CHECK COMPARISON', $scope.selectedSettings, $scope.loadedSettings]);

                        if (selectedSettings != null && loadedSettings != null){
                
                            var matchedSettings = {
                                import_column_settings: false,
                                import_destination: false,
                                include_first_row: false,
                                as_partner_contacts: false,
                                contact_import_behavior: false,
                            };

                            //step through relevant settings & compare
                            for (var key in matchedSettings){

                                switch (key) {
                                    case 'import_column_settings':
                                        
                                        if (selectedSettings[key].length != loadedSettings[key].length){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            for (var each in selectedSettings[key]){
                                                if (selectedSettings[key][each] !== loadedSettings[key][each]){
                                                    $scope.showUpdate = true;
                                                    return false;
                                                }
                                            }
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    case 'import_destination':
                                        if (selectedSettings[key] !== loadedSettings[key]){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    case 'include_first_row':
                                        if (selectedSettings[key] !== loadedSettings[key]){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    case 'as_partner_contacts':
                                        if (selectedSettings[key] !== loadedSettings[key]){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    case 'contact_import_behavior':
                                        if (selectedSettings[key] !== loadedSettings[key]){
                                            $scope.showUpdate = true;
                                            return false;
                                        } else {
                                            matchedSettings[key] = true;
                                        }
                                        break;
                                    default:
                                        console.log( "default reached");
                                        $scope.showUpdate = true;
                                        return false;
                                }
                                console.log(['CHECK', key, matchedSettings[key] ]);
                            }
                            console.log(['compared TRUE' ]);
                            $scope.showUpdate = false;
                            return true;
                        }
                    } else { 
                        return undefined; 
                    }
                };
                
                $scope.updateSettings = function(){
                    if ( $scope.loadedSettings ){
                        var loadedSettings = $scope.loadedSettings;
                        
                        var settings = $scope.collectSettingsData(true);
                        settings.contact_import_setting_uuid = loadedSettings.contact_import_setting_uuid;

                        console.log(['loaded', loadedSettings ]);
                        console.log(['collected', settings ]);
                        console.log(['selected', $scope.selectedSettings]);
                        
                        contactGroupsService.updateImportSettings(settings)
                        .then(function(response){
                            var updatedSettings = response.data.success.data;
                            
                            $scope.setLoadedSettings(updatedSettings)
                            .then(function(response){
                                $scope.compareControl = 0;
                            })
                            
                        })
                    } else {
                        console.log("No Loaded Settings to Update");
                        $rootScope.showErrorAlert("There are no Loaded Settings to update.");
                    }
                };

            //***************'Load Import Settings in CSV Imports' *****************
                $scope.selectedSettings = null;

                $scope.processImportSettingsChange = function(selectedSettings){
                    $scope.selectedSettings = selectedSettings;
                    if ($scope.selectedSettings == null) {
                        $scope.import.destination = null;
                        $scope.data.includeFirstRow = true;
                        $scope.data.integrationContacts = false;
                        $scope.import.behavior = undefined;
                        $scope.colSelect = [];
                    } else {
                        
                        if ( Array.isArray($scope.selectedSettings.import_column_settings) ){
                            console.log(['import column settings are already array', Array.isArray($scope.selectedSettings.import_column_settings), $scope.selectedSettings.import_column_settings ]);
                        } else {
                            var columnsObj = JSON.parse($scope.selectedSettings.import_column_settings);
                            $scope.selectedSettings.import_column_settings = $scope.columnsObjToColSettings(columnsObj);
                        }
                        if ($scope.selectedSettings.import_destination == "00000000-0000-0000-0000-000000000000" ){
                            $scope.import.destination = true;
                            $scope.selectedSettings.import_destination = true;
                            $scope.data.includeFirstRow = $scope.selectedSettings.include_first_row;
                            $scope.data.integrationContacts = $scope.selectedSettings.as_partner_contacts;
                            $scope.import.behavior = $scope.selectedSettings.contact_import_behavior;
                            $scope.colSelect = $scope.selectedSettings.import_column_settings;
                        } else if ($scope.selectedSettings.import_destination == null){
                            $scope.import.destination = $scope.selectedSettings.import_destination;
                            $scope.data.includeFirstRow = $scope.selectedSettings.include_first_row;
                            $scope.data.integrationContacts = $scope.selectedSettings.as_partner_contacts;
                            $scope.import.behavior = $scope.selectedSettings.contact_import_behavior;
                            $scope.colSelect = $scope.selectedSettings.import_column_settings;
                        } else if ($scope.validTarget($scope.selectedSettings.import_destination)){
                            $scope.import.destination = $scope.selectedSettings.import_destination;
                            $scope.data.includeFirstRow = $scope.selectedSettings.include_first_row;
                            $scope.data.integrationContacts = $scope.selectedSettings.as_partner_contacts;
                            $scope.import.behavior = $scope.selectedSettings.contact_import_behavior;
                            $scope.colSelect = $scope.selectedSettings.import_column_settings;
                        } else {
                            $scope.selectDestination();
                            $scope.data.includeFirstRow = $scope.selectedSettings.include_first_row;
                            $scope.data.integrationContacts = $scope.selectedSettings.as_partner_contacts;
                            $scope.import.behavior = $scope.selectedSettings.contact_import_behavior;
                            $scope.colSelect = $scope.selectedSettings.import_column_settings;
                        }
                        $scope.setLoadedSettings(selectedSettings);
                    }
                    $scope.allowSettingsCompare();
                };

                $scope.columnsObjToColSettings = function(columnsObj){
                    var colSettings = [];
                    for (var setting in columnsObj){
                        colSettings[setting] = columnsObj[setting];
                    }
                    return colSettings;
                };

                $scope.validTarget = function(destination){
                    var targets = $scope.groups();
                    for (var target in targets){
                        if (targets[target].group_uuid == destination){
                            console.log('Valid Target Destination');
                            return true;
                        }
                    }
                    console.log('No Target', destination);
                    return false;
                };

                $scope.selectDestination = function() {
                    var issue = 'The Contact Group saved as the destination in these settings has been deleted.';
                    var choice = 'Would you like to import to a New group or to the Conact List?'
                    $scope.destinationSelectDialog(issue, choice)
                        .then(function(response) {
                            if (response) {
                                $scope.import.destination = true;
                                $scope.selectedSettings.import_destination = "00000000-0000-0000-0000-000000000000";
                                console.log(['dest selectedSettings', $scope.selectedSettings]);
                            } else {
                                $scope.import.destination = null;
                                $scope.selectedSettings.import_destination = null;
                                console.log(['dest selectedSettings', $scope.selectedSettings]);
                            };
                            $scope.allowSettingsCompare();
                        });
                };

                $scope.destinationSelectDialog = function(message, submessage, multiple) {
                    var confirm = $mdDialog.confirm()
                        .title(message)
                        .textContent(submessage)
                        .ok('New Group')
                        .cancel('Contact List')
                        .multiple(multiple);
                    return $mdDialog.show(confirm).then(function() {
                        return true;
                    }, function() {
                        return false;
                    });
                };
                
                $scope.deleteSingleImportSetting = function(uuid){
                    contactGroupsService.deleteSingleImportSetting(uuid)
                    .then(function(response){
                        $scope.processImportSettingsChange(null);
                        $scope.showUpdate = false;
                        $scope.controlCounter = 0;
                        $scope.getSettingsByType('csv');
                    })
                    .catch(function(error){
                        console.log(['Error', error]);
                    });
                };

                $scope.checkSelectedSettings = function(){
                    return $scope.selectedSettings;
                };

                // *************************Import CSV Contacts*************************

                $scope.handleCsvImport = function() {
                    if ($scope.importReady == true){
                        $scope.importReady = false;
                        $scope.doImportContactsCsv();
                    } else if ($scope.import.destination === true){
                        $scope.showEditGroupCsv(null);
                    } else {
                        $scope.doImportContactsCsv();
                    }
                };

                function prepareImportData() {
                    var contact;
                    var s = $scope;
                    var validContacts = [];
                    var invalidContacts = [];
                    var contacts = $scope.data.includeFirstRow ? $scope.csv : $scope.csv.slice(1, $scope.csv.length);
                    var log = false;
                    var partner = $rootScope.user.exportType.partner_code;
                    angular.forEach(contacts, function(row, index) {
                        var contact_param = usefulTools.convertObjectToArray(
                            row);
                        if (__env.enableDebug && log) console.log(row);
                        var contact = {};
                        angular.forEach($scope.colSelect, function(key, index) {
                            var field = contact_param[index];
                            if (__env.enableDebug && log) console.log(
                                field);
                            if (key && key !== 'ignore') {
                                contact[key] = field;
                            }
                        });

                        if ($scope.data.integrationContacts) {
                            if (partner == 'ams360') {
                                contact['contact_type'] = 'amscontact';
                            } else if (partner == 'qqcatalyst') {
                                contact['contact_type'] = 'qqcontact';
                            } else if (partner == 'epic') {
                                contact['contact_type'] = 'epiccontact';
                            } else if (partner == 'ezlynx') {
                                contact['contact_type'] = 'ezlynxcontact';
                            } else if (partner == 'agencymatrix') {
                                contact['contact_type'] = 'agencymatrixcontact';
                            } else if (partner == 'e-agent') {
                                contact['contact_type'] = 'eagentcontact';
                            } else if (partner == 'hawksoft') {
                                contact['contact_type'] = 'hawksoftcontact';
                            }
                        } else {
                            contact['contact_type'] = 'contact';
                        }

                        if ($scope.validRow(contact)) {
                            validContacts.push(contact);
                        } else {
                            invalidContacts.push(contact);
                        }
                    });

                    if (invalidContacts.length > 0) {
                        var name;
                        var missingString = '';
                        angular.forEach(invalidContacts, function(contact) {
                            name = (contact.firstname ? contact.firstname + ' ' :
                                    '') +
                                (contact.lastname ? contact.lastname : '');
                            if (name) {
                                contactService.addToInvalidContactData(name);
                            }
                        });
                    }

                    var packagedContacts = packageContactsForContactCreation(validContacts);
                    return packagedContacts;
                }

                $scope.doImportContactsCsv = function() {
                    var partner = $rootScope.user.exportType.partner_code;
                    var contacts = $scope.data.includeFirstRow ? $scope.csv : $scope.csv.slice(1, $scope.csv.length);
                    $scope.processingImport = true;
                    $scope.sendingImport = true;
                    var data = {
                        partner: partner,
                        import_type: 'csv',
                        is_partner: $scope.data.integrationContacts,
                        contacts: contacts, 
                        cols: $scope.colSelect,
                        destination: $scope.import.destination
                    };
                    $rootScope.showSuccessAlert('Your import has been received and is being processed. We will notify you in Bridge and by email once the contacts have been imported. It may take a some time depending on the size of the list.');
                    contactService.sendContactImport(data)
                    .then(function(response) {
                        if (response.data.success) {
                            // $rootScope.showSuccessAlert(response.data.success.message);
                            $scope.sendingImport = false;
                            $scope.processingImport = false;
                        }
                    });
                    $scope.endImport();
                };
            
                $scope.importContactsCsv = function() {
                    var partner = $rootScope.user.exportType.partner_code;
                    var contacts = $scope.data.includeFirstRow ? $scope.csv : $scope.csv.slice(1, $scope.csv.length);
                    // if ($scope.data.integrationContacts &&
                    //     (partner === 'qqcatalyst') &&
                    //     !$scope.colSelect.includes('customer_id')) {
                    //     return $rootScope.showErrorAlert("No contacts were imported. Please select the Customer Id field to import the " + $scope.data.partner_name + " contacts.");
                    // }
                    $scope.preparingImport = true;
                    $scope.processingImport = true;
                    $scope.sendingImport = false;

                    var packagedContacts = prepareImportData();
                    
                    $scope.preparingImport = false;
                    $scope.sendingImport = true;
                    console.log(["PACKAGED CONTACTS", packagedContacts]);
                    if (packagedContacts.length > 0) {
                        var data = {
                            partner: partner,
                            import_type: 'csv', 
                            data: contacts, 
                            cols: $scope.colSelect
                        };
                        contactService.createContactImport(packagedContacts, $scope.import
                                .destination)
                            .then(function(response) {
                                if (response.success) {
                                    $rootScope.showSuccessAlert(response.success.message);
                                    $scope.sendingImport = false;
                                    $scope.processingImport = false;
                                }
                            });
                        $scope.endImport();
                    } else {
                        contactService.importUserContacts(packagedContacts, $scope.import
                                .destination)
                            .then(function(response) {
                                var contacts = [];
                                if (response.data.success) {
                                    contacts = response.data.success.data;
                                    if ($scope.import.destination) {
                                        contactGroupsService.setGroups();
                                        $rootScope.$broadcast(
                                            'group.contacts.added');
                                    }
                                }
                                if (contacts.length > 0) {
                                    var message = 'You imported ' + contacts.length +
                                        ' of your contacts! Please be aware that some contacts might not have been imported. Bridge will not import contacts who were previously imported into Bridge or who are missing one or more of the three required contact fields: first name, last name, phone number.';
                                    $rootScope.showSuccessAlert(message);
                                } else {
                                    $rootScope.showErrorAlert(
                                        "No contacts were imported. Either your contacts were previously imported into Bridge, they are missing one or more of the three required contact fields: first name, last name, phone number, or you have reached your maximum number of allowed contacts. "
                                    );
                                }
                                $scope.endImport();
                                $scope.sendingImport = false;
                                $scope.processingImport = false;
                            });
                    }
                };

                $scope.addContactsToGroup = function(contactUuids) {
                    angular.forEach(contactUuids, function(contactUuid) {

                        contactGroupsService.addContactToGroup(contactUuid,
                            $scope.import.destination);
                    });
                    contactGroupsService.setGroups();
                };

                $scope.validRow = function(row) {
                    var result = true;
                    angular.forEach($scope.requiredFields, function(requiredField) {
                        if (!row[requiredField]) result = false;
                    });
                    var hasPhone = false;
                    angular.forEach($scope.phoneOptions, function(phoneOption) {
                        if (!hasPhone && row[phoneOption]) {
                            row[phoneOption] = usefulTools.cleanPhoneNumber(row[
                                phoneOption]);
                            if (isValidPhone(row[phoneOption])) hasPhone = true;
                        }
                    });
                    if (!hasPhone) result = false;
                    return result;
                };
            }
        };
    })
    .directive('mdInputContainer', function($timeout) {
        return function($scope, element) {
            var ua = navigator.userAgent;
            if (ua.match(/chrome/i) && !ua.match(/edge/i)) {
                $timeout(function() {
                    if (element[0].querySelector(
                            'input[type=password]:-webkit-autofill')) {
                        element.addClass('md-input-has-value');
                    }
                }, 1000);
                $timeout(function() {
                    if (element[0].querySelector(
                            'input[type=text]:-webkit-autofill')) {
                        element.addClass('md-input-has-value');
                    }
                }, 1000);
            }
        };
    })
    .directive('chatPostFilesDisplay', function($rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/chat-post-files-display.html',
            scope: {
                post: '<',
                show: '<'
            },
            link: function($scope, element, attrs) {
                $scope.thumbDimensions = $rootScope.thumbDimensions;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.showModalFull = $rootScope.showModalFull;

            }
        };
    })
    .directive('chatPostUploadPreview', function($rootScope, newChatService, fileService) {
        return {
            restrict: 'E',
            templateUrl: 'views/chat/chat-post-upload-preview.html',
            scope: {
                show: '<',
                uploader: '<',
                sendMessage: '&',
                filesLimitExceeded: '<'
            },
            link: function($scope, element, attrs) {
                $scope.uploadIsImage = function(file) {
                    return fileService.uploadIsImage(file);
                };

                $scope.max = 100;

                $scope.exceededFiles = $scope.filesLimitExceeded;

                $scope.$watch('uploader.progress', function(newVal, oldVal) {
                    if (newVal !== oldVal && newVal > 1) {
                        $scope.progressBarPercentage = newVal;
                    }
                });

                $scope.sendMessage = function() {
                    $scope.uploader.uploadAll();
                };

                $scope.uploader.onSuccessItem = function(fileItem, response, status,
                    headers) {
                    if (__env.enableDebug) console.info('onSuccessItem', fileItem,
                        response, status, headers);
                    if (__env.enableDebug) console.log(
                        "RESPONSE FROM UPLOADING EACH FILE");
                    if (__env.enableDebug) console.log(response);
                    $scope.progressBarPercentage = 0;
                    if (!newChatService.postFiles) newChatService.postFiles = [];
                    newChatService.postFiles.push(response.file_infos[0]);
                };
            }
        };
    })
    .directive('onValueChange', function() {
        return {
            restrict: 'A',
            scope: {
                onValueChange: '&'
            },
            link: function($scope, element, attrs) {
                element.on("input", function(event) {
                    $scope.onValueChange({
                        $event: event
                    });
                });
            }
        };
    })
    .directive('myNgChange', function($rootScope, fileService, $timeout) {
        // ngChange was breaking material design for some reason
        return {
            restrict: 'A',
            scope: {
                ngModel: '<',
                myNgChange: '&'
            },
            link: function($scope, element, attrs) {
                $scope.$watch('ngModel', function(newVal, oldVal) {
                    if (newVal && newVal !== oldVal) {
                        $scope.myNgChange();
                    }
                });
            }
        };
    })
    .directive('onEnter', function() {
        return {
            restrict: 'A',
            scope: {
                onEnter: '&'
            },
            link: function($scope, element, attrs) {
                element.bind("keydown", function(e) {
                    if (e.which === 13) {
                        e.stopPropagation();
                        $scope.onEnter(e);
                    }
                });
            }
        };
    })
    .directive('simpleUploader', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/simple-uploader.html',
            scope: {
                uploadFn: '&',
                trigger: '=',
                accept: '<'
            },
            link: function($scope, element, attrs) {
                $scope.$watch('trigger', function(newVal, oldVal) {
                    if (newVal && newVal !== oldVal) {
                        element.find('input')[0].click();
                        $scope.trigger = false;
                    };
                });

                $scope.$watch('fileModel', function(newVal, oldVal) {
                    if (newVal && newVal !== oldVal) {
                        $scope.uploadFn()(newVal);
                        $scope.fileModel = null;
                    };
                });
            }
        };
    })
    .directive('callBox', function(callService, $timeout, $rootScope, userService, metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/call-box.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.startTime;
                $scope.dialPadShowing = false;
                $scope.inputNumber = '';
                $scope.outgoingCall = callService.outgoingCall;

                $scope.getCurrentCall = function() {
                    if ($scope.currentCall) {
                        return $scope.currentCall;
                    } else {
                        var currentCall = callService.currentCalls()[0];
                        if (currentCall) {
                            $scope.currentCall = currentCall;
                            return $scope.currentCall;
                        }
                    }
                    return null;
                };

                $scope.$watch('currentCall', function(newVal, oldValue) {
                    if (newVal === null || newVal === undefined) {
                        $rootScope.muteNotificationsVolume = false;
                    } else {
                        $rootScope.muteNotificationsVolume = true;
                        if ($rootScope.user.callOutputSourceVolume || $rootScope.user
                            .callOutputSourceVolume === 0) {
                            $scope.currentCall.audioStream.volume = $rootScope.user
                                .callOutputSourceVolume / 10;
                        } else {
                            $scope.currentCall.audioStream.volume = 0.5;
                        }
                    }
                });

                $rootScope.$on('upd-call-output-src-volume', function(event, data) {
                    if (callService.onCall()) {
                        if ($scope.currentCall) $scope.currentCall.audioStream.volume =
                            $rootScope.user.callOutputSourceVolume / 10;
                    }
                });

                $scope.showCallInputBox = function() {
                    return (!callService.onCall() && !callService.calling &&
                        !$scope.dialPadShowing && !$scope.showIncomingCallBox() &&
                        !$scope.showVideoInvite() && !callService.mergeStatus());
                };

                $scope.showOnCallBox = function() {
                    var result = callService.onCall() && $scope.getCurrentCall() && 
                        !$scope.showCallParkingDisplay();
                    return result;
                };

                $scope.showIncomingCallBox = function() {
                    return callService.totalIncomingCalls > 0 && !callService.onCall();
                };

                $scope.showIncomingCallThreeWay = function() {
                    return callService.totalIncomingCalls == 1 && callService.onCall();
                };

                $scope.showCallParkingDisplay = function() {
                    return callService.parking;
                };

                $scope.showIncomingCallsQueue = function() {
                    return false;
                    // return callService.totalIncomingCalls > 1;
                };

                $scope.showDialPad = function() {
                    return $scope.dialPadShowing && !callService.calling &&
                        !callService.onCall() && !$scope.showIncomingCallBox();
                };

                $scope.toggleDialPad = function() {
                    $scope.dialPadShowing = !$scope.dialPadShowing;
                };

                $scope.showOnCallDialPad = function() {
                    if ($scope.onCallDialPadShowing) {
                        angular.element('#onCallContainer').css('display', 'none');
                    } else {
                        angular.element('#onCallContainer').css('display', 'flex');
                    }
                    return $scope.onCallDialPadShowing && callService.onCall();
                };

                $scope.toggleOnCallDialPad = function() {
                    if (!$scope.onCallDialPadShowing) {
                        $rootScope.$broadcast('clear.input');
                    }
                    $scope.onCallDialPadShowing = !$scope.onCallDialPadShowing;
                };

                $scope.toggleCallTransfer = function() {
                    var call = _.find(callService.currentCalls(), function(item) {
                        return !item.onHold;
                    });
                    if(call) $rootScope.transferingCallID = call.callID;
                    $scope.onCallDialPadShowing = false;
                    $scope.transferCall = !$scope.transferCall;
                    callService.data.transferringCall = false;
                    callService.outgoingCallObject = null;
                    angular.element('.mdi').blur();
                    $rootScope.$broadcast('add.number', $rootScope.num);
                };

                $scope.showNormalOnCallDisplay = function() {
                    return !$scope.showTransferCallDisplay() && !$scope.showAddCallDisplay() &&
                        !callService.outgoingThreeWayCall() && !$scope.showThreeWayCallDisplay();
                };

                $scope.showTransferCallDisplay = function() {
                    return $scope.transferCall;
                };

                $scope.showAddCallDisplay = function() {
                    return $scope.addCall && !$scope.showThreeWayCallDisplay();
                };

                $scope.loadingData = function() {
                    return callService.mergeStatus() && !$scope.showThreeWayCallDisplay();
                }

                $scope.showOutgoingCallBox = function() {
                    return $scope.outgoingCall() && !callService.outgoingThreeWayCall();
                };

                $scope.toggleAddCallDisplay = function() {
                    $scope.onCallDialPadShowing = false;
                    $scope.addCall = !$scope.addCall;
                    angular.element('.mdi').blur();
                    $rootScope.$broadcast('cancel.transfer.add');
                    $rootScope.$broadcast('add.number', $rootScope.num);
                };

                $scope.showThreeWayCallDisplay = function() {
                    return (callService.outgoingThreeWayCall() || callService.onThreeWayCall()) &&
                        !$scope.showIncomingCallBox() && !$scope.showIncomingCallThreeWay() &&
                        !callService.data.transferringCall;
                };

                $scope.onCallEndCallback = function() {
                    $scope.addCall = false;
                    if (callService.currentCalls().length === 1) {
                        var currentCall = callService.currentCalls()[0];
                        if (currentCall) {
                            $scope.currentCall = currentCall;
                        }
                    }
                    if (callService.currentCalls().length === 0) {
                        $scope.transferCall = false;
                        $scope.currentCall = null;
                        $scope.onCallDialPadShowing = false;
                        $rootScope.$broadcast('add.number', null);
                    }
                };

                callService.registerOnCallEndCallback($scope.onCallEndCallback);

                $scope.showVideoInvite = function() {
                    return $scope.videoInviteSender && !$scope.showThreeWayCallDisplay() &&
                        !$scope.showOutgoingCallBox() && !$scope.showAddCallDisplay() &&
                        !$scope.showTransferCallDisplay() && $scope.showNormalOnCallDisplay() &&
                        !$scope.showOnCallDialPad() && !$scope.showDialPad() &&
                        !$scope.showIncomingCallsQueue() && !$scope.showIncomingCallThreeWay() &&
                        !$scope.showIncomingCallBox() && !$scope.showOnCallBox();
                };

                $scope.endVideoInvite = function() {
                    $scope.videoInviteSender = null;
                    if ($rootScope.notification) {
                        $rootScope.notification.pause();
                    }
                };

                function userIsAvailable() {
                    return userService.userCanReceiveCalls();
                }

                metaService.rootScopeOn($scope, 'video.invite',
                    function($event, senderUuid, roomUrl) {
                        if (senderUuid && roomUrl) {
                            if (userIsAvailable()) {
                                var data = {
                                    senderUuid: senderUuid,
                                    roomUrl: roomUrl
                                };
                                $scope.videoInviteSender = data;
                            } else {
                                console.log("TELL SENDER NOT AVAILABLE");
                            }
                        }
                    });

                metaService.rootScopeOn($scope, 'video.invite.cancel',
                    function($event, senderUuid) {
                        if (senderUuid) {
                            $scope.endVideoInvite();
                        }
                    });
            }
        };
    })
    .directive('callParkingDisplay', function($interval) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/call-parking-display.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.parkingText = "Parking";
                var interval = $interval(function() {
                    if ($scope.parkingText === "Parking") {
                        $scope.parkingText = "Parking.";
                    } else if ($scope.parkingText === "Parking.") {
                        $scope.parkingText = "Parking..";
                    } else if ($scope.parkingText === "Parking..") {
                        $scope.parkingText = "Parking...";
                    } else if ($scope.parkingText === "Parking...") {
                        $scope.parkingText = "Parking";
                    }
                }, 500);
                $scope.$on('$destroy', function() {
                    $interval.cancel(interval);
                });
            }
        };
    })
    .directive('videoInvite', function($rootScope, __env, contactService, notificationService,
        videoConfService, callService) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/video-invite.html',
            scope: {
                senderData: '=',
                endInvite: '&'
            },
            link: function($scope, element, attrs) {
                $scope.contact = contactService.getContactByUserUuid($scope.senderData.senderUuid);
                if ($scope.contact) {
                    $scope.avatarPath =
                        $rootScope.pathImgProfile + $scope.contact.im;
                    var data = {
                        name: $scope.contact.name,
                        phone_number: $scope.senderData.roomUrl,
                        actions: [{
                                action: "answer-video",
                                title: "Answer"
                            },
                            {
                                action: "decline-video",
                                title: "Decline"
                            }
                        ]
                    };
                    notificationService.handleIncomingVideoCallNotification(callService.onCall(),
                        data);
                }
                $scope.acceptInvite = function() {
                    videoConfService.openConference($scope.senderData.roomUrl);
                    $scope.endInvite();
                };
                $scope.declineInvite = function() {
                    $scope.endInvite();
                };
                videoConfService.inviteActions["answer-video"] = $scope.acceptInvite;
                videoConfService.inviteActions["decline-video"] = $scope.declineInvite;
            }
        };
    })
    .directive('callInputBox', function(callService, $rootScope, $window) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/call-input-box.html',
            scope: {
                toggleDialPad: '&',
                inputNumber: '='
            },
            link: function($scope, element, attrs) {
                // ng-show="!calls.outGoingCall && !onCallWith && !calls.incomingCall && !calls.incomingCall3Way && !calls.showDialPad && !calls.showQueueIncomingCalls && !calls.showDialPadOnCall">
                $scope.makeCall = function() {
                    callService.makeCall($scope.inputNumber);
                    if ($scope.inputNumber != '10100') $window.localStorage.setItem(
                        "number", $scope.inputNumber);
                };

                //console.log(callService.currentCalls());

                $scope.redialNumber = function() {
                    if ($window.localStorage.getItem("number")) {
                        $scope.inputNumber = $window.localStorage.getItem("number");
                        $rootScope.$broadcast('redial.number', $scope.inputNumber);
                    }
                };

                $scope.hasRedialNumber = function() {
                    return $window.localStorage.getItem("number");
                };

                $scope.showSmsModal = function() {
                    $rootScope.showModalWithData('/sms/sendsmstop.html', {
                        smsnumber: $scope.inputNumber,
                        message: ''
                    });
                };

                callService.registerOnCallDialedCallback(function() {
                    $scope.inputNumber = '';
                });
            }
        };
    })
    .directive('dialPadBox', function(callService, DialerSvc, $window) {
        // look into efficacy of inputted numbers while in ivrs
        return {
            restrict: 'E',
            templateUrl: 'views/calls/dial-pad-box.html',
            scope: {
                toggleDialPad: '&',
                inputNumber: '=',
                dialPadActive: '<'
            },
            link: function($scope, element, attrs) {
                $scope.makeCall = function() {
                    callService.makeCall($scope.inputNumber);
                };
                $scope.pad = DialerSvc.pad;
                element[0].setAttribute("tabindex", 0);
                $scope.rowFrequencies = DialerSvc.rows;
                $scope.colFrequencies = DialerSvc.cols;
                $scope.press = DialerSvc.press.bind(DialerSvc);
                $scope.release = DialerSvc.release.bind(DialerSvc);
                $scope.addNumber = function(num) {
                    $scope.inputNumber = $scope.inputNumber == null ? "" : $scope.inputNumber;
                    if ($scope.inputNumber.length <= 13) {
                        $scope.inputNumber += num;
                    }
                    document.activeElement.blur();
                    element.focus();
                };
                $scope.removeNumber = function() {
                    $scope.inputNumber = $scope.inputNumber.replace(/\D/g, '').slice(0,
                        -1);
                };

                element.on('keydown', function(e) {
                    var key = e.keyCode;
                    var pressedEnter = key === 13;
                    $scope.backspacePressed = key === 8 || key === 64 ? true :
                        false;
                    if ($scope.backspacePressed && $scope.dialPadActive) {
                        $scope.inputNumber = $scope.inputNumber.replace(/\s/g, '').slice(
                            0, -1);
                    }
                    if ($scope.dialPadActive && pressedEnter) {
                        if ($scope.inputNumber) {
                            if ($scope.inputNumber.length > 13) {
                                $scope.makeCall();
                            }
                        }
                    }
                });

                $scope.redialNumber = function() {
                    if ($window.localStorage.getItem("number")) {
                        $scope.inputNumber = $window.localStorage.getItem("number");
                    }
                }
                $scope.lttBtn = [{
                        id: '1',
                        val: ''
                    },
                    {
                        id: '2',
                        val: 'ABC'
                    },
                    {
                        id: '3',
                        val: 'DEF'
                    },
                    {
                        id: '4',
                        val: 'GHI'
                    },
                    {
                        id: '5',
                        val: 'JKL'
                    },
                    {
                        id: '6',
                        val: 'MNO'
                    },
                    {
                        id: '7',
                        val: 'PQRS'
                    },
                    {
                        id: '8',
                        val: 'TUV'
                    },
                    {
                        id: '9',
                        val: 'WXYZ'
                    },
                    {
                        id: '*',
                        val: ''
                    },
                    {
                        id: '0',
                        val: '+'
                    },
                    {
                        id: '#',
                        val: ''
                    }
                ];
            }
        };
    })
    .directive('onCallDialPadBox', function(callService, DialerSvc, $rootScope, $timeout) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/on-call-dial-pad-box.html',
            scope: {
                toggleOnCallDialPad: '&'
            },
            link: function($scope, element, attrs) {
                // ng-if="calls.showDialPadOnCall">
                $scope.pad = DialerSvc.pad;
                $scope.rowFrequencies = DialerSvc.rows;
                $scope.colFrequencies = DialerSvc.cols;
                $scope.press = DialerSvc.press.bind(DialerSvc);
                $scope.release = DialerSvc.release.bind(DialerSvc);
                element[0].setAttribute("tabindex", 0);

                $rootScope.$on('clear.input', function($event) {
                    $scope.inputNumber = "";
                    $rootScope.num = "";
                });

                element.on('keydown', function(e) {
                    var key = e.keyCode;
                    $scope.backspacePressed = key === 8 || key === 64 ? true :
                        false;
                    if ($scope.backspacePressed && $scope.inputNumber) {
                        $scope.inputNumber = $scope.inputNumber.replace(/\s/g, '').slice(
                            0, -1);
                    }
                });

                $scope.checkChar = function() {
                    $scope.inputNumber = $scope.inputNumber.replace(/[^0-9]/g, '');
                };

                $scope.keyDown = function(value) {
                    $scope.inputNumber = $scope.inputNumber == null ? "" : $scope.inputNumber
                        .replace(/[^0-9]/g, '');
                    $rootScope.num = $scope.inputNumber;
                    if (value.keyCode >= 48 && value.keyCode <= 57 || value.keyCode >=
                        96 && value.keyCode <= 105) {
                        var call = callService.getFirstAddedCallNotOnHold();
                        call.dtmf(value.key);

                        $scope.press(value.key);
                        $timeout(function() {
                            $scope.release(value.key);
                        }, 100);
                    }
                }

                $scope.pressKey = function(key) {
                    $scope.inputNumber = $scope.inputNumber == null ? "" : $scope.inputNumber;
                    if ($scope.inputNumber.length <= 13) {
                        $scope.inputNumber += key;
                    }
                    document.activeElement.blur();
                    element.focus();
                    var call = callService.getFirstAddedCallNotOnHold();
                    call.dtmf(key);

                    $rootScope.num = $scope.inputNumber;
                };

                $scope.$watch('inputNumber', function(newVal, oldVal) {
                    if (newVal) {
                        $rootScope.$broadcast('add.number', newVal);
                    }
                });

                $scope.removeNumber = function() {
                    $scope.inputNumber = $scope.inputNumber.replace(/\D/g, '').slice(0,
                        -1);
                };

                $scope.lttBtn = [{
                        id: '1',
                        val: ''
                    },
                    {
                        id: '2',
                        val: 'ABC'
                    },
                    {
                        id: '3',
                        val: 'DEF'
                    },
                    {
                        id: '4',
                        val: 'GHI'
                    },
                    {
                        id: '5',
                        val: 'JKL'
                    },
                    {
                        id: '6',
                        val: 'MNO'
                    },
                    {
                        id: '7',
                        val: 'PQRS'
                    },
                    {
                        id: '8',
                        val: 'TUV'
                    },
                    {
                        id: '9',
                        val: 'WXYZ'
                    },
                    {
                        id: '*',
                        val: ''
                    },
                    {
                        id: '0',
                        val: '+'
                    },
                    {
                        id: '#',
                        val: ''
                    }
                ];
            }
        };
    })
    .directive('outgoingCallBox', function(callService, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/outgoing-call-box.html',
            scope: {
                call: '='
            },
            link: function($scope, element, attrs) {
                // ng-show="calls.outGoingCall"
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.hangUp = callService.hangUpCall;
                $scope.showCallerPhoto = function(call, direction, size) {
                    return callService.showCallerPhoto(call, direction, size);
                };
            }
        };
    })
    .directive('onCallButtons', function(callService, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/on-call-buttons.html',
            scope: {
                toggleOnCallDialPad: '&',
                toggleCallTransfer: '&',
                showTransferCallDisplay: '&',
                toggleAddCallDisplay: '&',
                showAddCallDisplay: '&',
                showThreeWayCallDisplay: '&',
                showIncomingCallThreeWay: '&'
            },
            link: function($scope, element, attrs) {
                // ng-if="!calls.showDialPadOnCall && onCallWith && !onConferenceCall">
                $scope.muteActive = callService.muteActive;
                $scope.hangUp = callService.hangUpCall;
                $scope.muteAllCalls = callService.muteAllCalls;
                $scope.unMuteAllCalls = callService.unMuteAllCalls;
                $scope.recordCall = callService.recordCall;
                $scope.recordingActive = callService.recordingActive;
                $scope.stopRecording = callService.stopRecording;
                $scope.onHold = callService.onHold;
                $scope.activeCallOnHold = callService.activeCallOnHold;
                $scope.holdCall = callService.holdCall;
                $scope.unHoldCall = callService.unHoldCall;
                $scope.isConferenceCall = function() {
                    if (callService.currentCalls().length > 0) {
                        return callService.currentCalls()[0].isConferenceCall;
                    }
                    return null;
                };

                $scope.showIncomingCallThreeWay = function() {
                    return callService.totalIncomingCalls == 1 && callService.onCall();
                };

                $scope.mergeCalls = function() {
                    var calls = callService.currentCalls();
                    var callId1 = calls[0].callID;
                    var callId2 = calls[1].callID;
                    callService.mergeThreeWayCall(callId1, callId2);
                };
            }
        };
    })
    .directive('incomingCallBox', function(callService, contactService, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/incoming-call-box.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.pathImgProfile = $rootScope.pathImgProfile;

                $scope.getCurrentIncomingCall = function() {
                    var calls = callService.incomingCalls();
                    return calls[0];
                };

                $scope.call = $scope.getCurrentIncomingCall();
                if($scope.call) var params = $scope.call.params;

                if (params && params.callee_id_name && params.callee_id_name.length === 7) {
                    $scope.isAttendantCall = true;
                }

                $scope.showCallerPhoto = function(call, direction, size) {
                    return callService.showCallerPhoto(call, direction, size);
                };

                $scope.answerCall = function(call) {
                    callService.answerCall(call.callID);
                };

                $scope.sendToVoicemail = function(call) {
                    callService.sendToVoicemail(call.callID);
                };

                $scope.declineCall = function(call) {
                    if ($scope.isAttendantCall) {
                        callService.ignoreCall(call);
                    } else {
                        callService.declineCall(call.callID);
                    }
                };

                function totalIncomingCalls() {
                    return callService.totalIncomingCalls;
                }
                $scope.$watch(totalIncomingCalls, function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        $scope.call = $scope.getCurrentIncomingCall();
                    }
                });

            }
        };
    })
    .directive('incomingCallThreeWay', function(callService, $timeout) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/incoming-call-three-way.html',
            scope: {
                call: '='
            },
            link: function($scope, element, attrs) {
                $scope.getCurrentIncomingCall = function() {
                    var calls = callService.incomingCalls();
                    return calls[0];
                };
                $scope.incomingCall = $scope.getCurrentIncomingCall();

                if($scope.incomingCall) var params = $scope.incomingCall.params;

                if (params && params.callee_id_name && params.callee_id_name.length === 7) {
                    $scope.isAttendantCall = true;
                }
                
                $scope.answerCall = function(call) {
                    callService.answerCall(call.callID);
                };
                
                $scope.showIncomingCallThreeWay = function() {
                    return callService.totalIncomingCalls == 1 && callService.onCall();
                };

                $scope.sendToVoicemail = function(call) {
                    callService.sendToVoicemail(call.callID);
                };

                $scope.declineCall = function(call) {
                    if (__env.enableDebug) console.log(call);
                        callService.ignoreCall(call);
                };
                $scope.showCallerPhoto = function(call, direction, size) {
                    return callService.showCallerPhoto(call, direction, size);
                };
            }
        };
    })
    .directive('normalOnCallDisplay', function(callService, contactService, usefulTools, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/normal-on-call-display.html',
            scope: {
                call: '='
            },
            link: function($scope, element, attrs) {
                $scope.pathImgProfile = $rootScope.pathImgProfile;

                $scope.showCallerPhoto = function(call, direction, size) {
                    return callService.showCallerPhoto(call, direction, size);
                };

                $rootScope.$broadcast('clear.input');

                $scope.cleanNumber = function(number) {
                    return usefulTools.cleanPhoneNumber(number);
                };

                $scope.isUserCaller = function(contact) {
                    return contact && contact.contact_type === 'user';
                };

                $scope.callIsConference = function(call) {
                    var num = parseInt(call.params.remote_caller_id_number);
                    return (num >= 10000 && num < 11000) || (num >= 30000 && num <
                        31000);
                };

                if ($scope.callIsConference($scope.call)) {
                    $scope.call.number = $scope.call.params.remote_caller_id_number;
                } else {
                    if (!$scope.call.reconstituted) {
                        if ($scope.call.direction.name === "inbound") {
                            $scope.call.number = $scope.cleanNumber($scope.call.params.caller_id_number);
                        } else {
                            $scope.call.number = $scope.cleanNumber($scope.call.params.destination_number);
                        }
                    } else {
                        if ($scope.call.direction.name === "outbound") {
                            $scope.call.number = $scope.cleanNumber($scope.call.params.caller_id_number);
                        } else {
                            $scope.call.number = $scope.cleanNumber($scope.call.params.remote_caller_id_number);
                        }
                    }
                }

                $rootScope.$on('refresh.call.display', function($event) {
                    $scope.calls = callService.currentCalls();
                    if ($scope.calls.length == 1) {
                        $scope.call = $scope.calls[0];
                        if (!$scope.call.reconstituted) {
                            if ($scope.call.direction.name === "inbound") {
                                $scope.call.number = $scope.cleanNumber($scope.call
                                    .params.caller_id_number);
                            } else {
                                $scope.call.number = $scope.cleanNumber($scope.call
                                    .params.destination_number);
                            }
                        } else {
                            if ($scope.call.direction.name === "outbound") {
                                $scope.call.number = $scope.cleanNumber($scope.call
                                    .params.caller_id_number);
                            } else {
                                $scope.call.number = $scope.cleanNumber($scope.call
                                    .params.remote_caller_id_number);
                            }
                        }
                    }

                });
            }
        };
    })
    .directive('addCallDisplay', function(callService, usefulTools) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/add-call-display.html',
            scope: {
                call: '=',
                toggleAddCallDisplay: '&'
            },
            link: function($scope, element, attrs) {
                $scope.callboxType = 'addcall';
                $scope.addCall = function() {
                    callService.addCall(usefulTools.cleanPhoneNumber($scope.inputNumber));
                };
            }
        };
    })
    .directive('transferCallDisplay', function(callService, $timeout, $rootScope, usefulTools) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/transfer-call-display.html',
            scope: {
                call: '=',
                toggleCallTransfer: '&'
            },
            link: function($scope, element, attrs) {
                $scope.type = 'supervised';
                $scope.callServiceData = function() {
                    return callService.data;
                };
                $scope.callboxType = 'transfer';
                $scope.hangUpCall = function() {
                    callService.hangUpCall();
                    $scope.inputNumber = '';
                };
                $scope.transferCall = function() {
                    $scope.inputNumber = usefulTools.cleanPhoneNumber($scope.inputNumber);
                    console.log($scope.inputNumber);
                    if ($scope.type === 'supervised') {
                        callService.initiateSupervisedTransfer($scope.inputNumber);
                        $rootScope.$broadcast('clear.input.number');
                    } else if ($scope.type === 'blind') {
                        callService.setCustomVariable($scope.call, 'blind', $scope.inputNumber);
                        $timeout(function() {
                            callService.blindTransfer($scope.inputNumber);
                            $rootScope.$broadcast('clear.input.number');
                            $scope.toggleCallTransfer()();
                        }, 500);

                    }

                };

                $scope.$watch(function () {
                    return callService.totalIncomingCalls;
                    }, function (newVal, oldVal) {
                        if (newVal != oldVal) {
                            if(callService.totalIncomingCalls == 1 && callService.onCall()) {
                                $scope.type = 'blind';
                            } else {
                                $scope.type = 'supervised';
                            }
                        }
                    }
                );

                $scope.showIncomingCallThreeWay = function() {
                    // if(callService.totalIncomingCalls == 1 && callService.onCall()) {
                    //     $scope.type = 'blind';
                    // } 
                    return callService.totalIncomingCalls == 1 && callService.onCall();
                };

                $scope.currentCalls = function() {
                    return callService.sortedCurrentCalls();
                };

                $scope.isCalling = function() {
                    if (callService.outgoingCallObject) {
                        var call = callService.getCallByCallID(callService.outgoingCallObject
                            .callID);
                        return call && (call.state.name === 'early' || call.state.name ===
                            'trying');
                    }
                    return false;
                };

                $scope.transferringTo = function() {
                    // console.log($scope.currentCalls());
                    // console.log(callService.outgoingCallObject);
                    if (callService.outgoingCallObject) {
                        /*console.log(callService.outgoingCallObject.params);
                        console.log(callService.outgoingCallObject.params.remote_caller_id_number);*/
                        if ($scope.callConnected) {
                            return callService.outgoingCallObject.params.destination_number;
                        }
                        return callService.outgoingCallObject.params.remote_caller_id_number;
                    }
                };

                $scope.callConnected = function() {
                    if (callService.outgoingCallObject) {
                        var call = callService.getCallByCallID(callService.outgoingCallObject
                            .callID);
                        return call;
                    }
                    return false;
                };

                $scope.confirmTransfer = function() {
                    callService.setCustomVariable($scope.call, 'supervised');

                    $timeout(function() {
                        callService.confirmSupervisedTransfer($rootScope.transferingCallID);
                        $rootScope.transferingCallID = "";
                        $scope.toggleCallTransfer()();
                    }, 500);
                    $scope.inputNumber = '';

                    $rootScope.$broadcast('refresh.call.display');
                };
                $scope.cancelTransfer = function() {
                    if (callService.outgoingCallObject) {
                        callService.swap();
                        // var call = callService.getSupervisedTransferRecipientCallId();
                        var call = callService.outgoingCallObject;
                        if (call) {
                            callService.hangUpCallById(call.callID);
                        }
                        $scope.toggleCallTransfer()();

                    } else {
                        $scope.toggleCallTransfer()();
                    }
                    $rootScope.$broadcast('clear.input.number');
                    $rootScope.$broadcast('cancel.transfer.add');
                };
                $scope.$on('box.callnumber.empty', function($event) {
                    $scope.inputNumber = null;
                });
            }
        };
    })
    .directive('threeWayCallDisplay', function(callService, usefulTools, $window, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/three-way-call-display.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.calls = function() {
                    var calls = callService.currentCalls();
                    if (callService.outgoingThreeWayCall()) {
                        var outgoingCall = callService.outgoingThreeWayCall();
                        calls = calls.filter(function(call) {
                            return !!call.startTime;
                        });
                        return usefulTools.spreadArrayAndArg(calls, outgoingCall);
                    } else {
                        return calls;
                    }
                };
                $scope.hangUpCallById = function(id) {
                    callService.hangUpCallById(id);
                    if (callService.onHold()) {
                        callService.unHoldCall();
                    }
                    $rootScope.$broadcast('refresh.call.display');
                };
                $scope.toggleCallHold = function(call) {
                    if (call.onHold) {
                        callService.unHoldCallById(call.callID);
                    } else {
                        callService.holdCallById(call.callID);
                    }
                };
                $scope.mergeCalls = function() {
                    var calls = $scope.calls();
                    var callId1 = calls[0].callID;
                    var callId2 = calls[1].callID;
                    callService.mergeThreeWayCall(callId1, callId2);
                };
                $scope.hangUpCallBeforeAnswer = function(earlyCall) {
                    angular.forEach(callService.currentCalls(), function(call) {
                        if (call.params.remote_caller_id_number === earlyCall.number) {
                            callService.hangUpCallById(call.callID);
                            $scope.calls();
                        }
                    });
                };
                $scope.swap = callService.swap;
                $scope.onConferenceCall = callService.onConferenceCall;
                $scope.swapButtonStyle = function() {
                    if ($scope.onConferenceCall()) {
                        return {
                            width: '100%'
                        };
                    } else {
                        return {};
                    }
                };
            }
        };
    })
    .directive('queueIncomingCallsDisplay', function(callService) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/queue-incoming-calls-display.html',
            scope: {
                call: '='
            },
            link: function($scope, element, attrs) {

            }
        };
    })

    .directive('searchCommunications', function($timeout, $rootScope, dataFactory, ngAudio,
        symphonyConfig, audioLibraryService) {
        return {
            restrict: 'E',
            templateUrl: 'views/communications.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                if (!$scope.search) {
                    $scope.search = {};
                    if (!$scope.search.channel) {
                        $scope.search.channel = {};
                        $scope.search.channel.text = true;
                        $scope.search.channel.calls = true;
                    }
                }
                $scope.onCloseModal = function() {
                    $rootScope.$broadcast('ringtones.modal.closed');
                };



                $scope.$watchGroup(['callRingtone', 'textRingtone', 'chatRingtone'],
                    function(newVals, oldVals) {
                        $scope.stopRingtone();
                    });

            }
        };
    })

    .directive('emulateProfileEdit', function(callService) {
        return {
            restrict: 'E',
            templateUrl: 'views/company/emulate-profile-edit.html',
            scope: {
                user: '='
            },
            link: function($scope, element, attrs) {}
        };
    })
    .directive('userProfileEdit', function($rootScope, dataFactory, $mdDialog, packageService,
        contactService) {
        return {
            restrict: 'E',
            templateUrl: 'views/settings/user-profile-edit.html',
            scope: {
                user: '=',
                uploader: '<',
                triggerUpload: '&',
                uploaderOption: '<'
            },
            link: function($scope, element, attrs) {
                $scope.init = function() {
                    $scope.avatarPath = (($scope.user && $scope.user.profile_image) ?
                        $rootScope.pathImgProfile + $scope.user.profile_image :
                        null);
                    contactService.registerOnProfileImageChange(function(service,
                        contact) {
                        if (contact.contact_uuid === $scope.user.contact_uuid ||
                            contact.user_uuid === $scope.user.id) {
                            $scope.avatarPath = (contact.contact_profile_image ?
                                $rootScope.pathImgProfile + contact.contact_profile_image :
                                null);
                            $rootScope.$broadcast('contact.user.image.changed',
                                contact);
                        }
                    });
                };

                contactService.registerOnContactLoadCallback(function() {
                    $scope.init();
                });

                $scope.triggerContactUpload = function() {
                    $rootScope.uploadUser = $scope.user;
                    $scope.triggerUpload();
                };

                $scope.packageHasAccess = function(feature) {
                    return packageService.packageHasAccess(feature);
                };

                $scope.isMainUser = function() {
                    return $scope.user.user_uuid === $rootScope.user.id;
                };

                $scope.removeAvatar = function() {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent('Please confirm you want to delete your avatar?')
                        .ariaLabel('Remove Avatar')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        dataFactory.getDeleteUserAvatar($rootScope.user.user_uuid)
                            .then(function(response) {
                                if (response.data.success) {
                                    $rootScope.user.profile_image = null;
                                    $scope.avatarPath = null;
                                }
                            })
                    });
                };
                $scope.deleteAvatar = function() {
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Confirm Delete')
                        .htmlContent('Are you sure you want to delete the Avatar?')
                        .ariaLabel('Delete')
                        .ok('Delete')
                        .cancel('Cancel');
                    $mdDialog.show(deleteConfirm).then(function() {

                        dataFactory.deleteAvatar($scope.user.id).
                        then(function(response) {
                            if (response.data.success) {
                                $scope.user.profile_image = null;
                                $scope.avatarPath = null;
                                $rootScope.showalerts(response);
                            }
                        });
                    });
                };
            }
        };
    })
    .directive('adminView', function(dataFactory, $rootScope, contactService) {
        return {
            restrict: 'E',
            templateUrl: 'views/timeclockpro/adminview.html',
            scope: {
                contacts: '<'

            },
            link: function($scope, element, attrs) {

                $scope.init = function() {
                    $scope.contacts = contactService.getUserContactsOnly();
                };
                $scope.selectedContact = null;

                contactService.registerOnUserContactLoadCallback(function() {
                    $scope.init();
                });

                $rootScope.$on('load.tkusers', function($event, tkusers) {
                    $scope.tkusers = tkusers;
                });

                $scope.clearFilter = function() {
                    $scope.search.contact_name_full = '';
                };

                $scope.predicate = 'name';
                $scope.reverse = false;

                $scope.sort_by = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.setActiveTab = function(contact) {
                    $scope.selectedContact = contact;
                    $scope.setpay = true;
                    $scope.setfrequency = true;
                    angular.forEach($scope.tkusers, function(user) {
                        if (user.user_uuid == contact.user_uuid) {
                            if (user.user_rate != 0) {
                                $scope.setpay = false;
                                $scope.changepay = true;
                                $scope.setpayinput = false;

                            } else {
                                $scope.setpay = true;
                            }
                            if (user.screenshot_frequency != 0 && user.screenshot_frequency !=
                                null) {
                                $scope.setfrequency = false;
                                $scope.changefrequency = true;
                                $scope.setfrequencyinput = false;
                                $scope.enabled = true;

                            } else {
                                $scope.setfrequency = true;
                                $scope.enabled = false;
                            }
                            $scope.selectedContact = user;
                        }

                    });
                };
                $scope.setpay = true;
                $scope.setfrequency = true;
                $scope.setPayRateInput = function() {
                    $scope.setpay = false;
                    $scope.setpayinput = true;
                };

                $scope.setPayRate = function() {
                    $scope.setpay = true;
                    $scope.setpayinput = false;
                }

                $scope.changePayRate = function(contact) {
                    if (contact.user_rate < 0) {
                        $rootScope.showErrorAlert(
                            'The Pay Rate cannot be less than 0 $/hr.');
                        return;
                    }
                    if (contact.user_rate > 999) {
                        $rootScope.showErrorAlert(
                            'The Pay Rate cannot be more than 999 $/hr.');
                        return;
                    }

                    $scope.setpay = false;
                    $scope.setpayinput = false;

                    var data = {
                        user_uuid: contact.user_uuid,
                        payrate: contact.user_rate
                    }

                    dataFactory.setPayRate(data)
                        .then(function(response) {
                            if (response.data.success) {

                            }

                        }, function(error) {
                            console.log(error);
                        });
                }

                $scope.changePayInput = function() {
                    $scope.setpayinput = true;
                    $scope.changepay = false;
                }

                $scope.setFrequencyInput = function() {
                    $scope.setfrequencyinput = true;
                    $scope.setfrequency = false;

                };

                $scope.setFrequency = function() {
                    $scope.setfrequency = true;
                    $scope.setfrequencyinput = false;
                };


                $scope.changeFrequency = function(contact) {
                    if (contact.screenshot_frequency < 30) {
                        $rootScope.showErrorAlert(
                            'The screenshot frequency cannot be less than 30 seconds.'
                        );
                        return;
                    }
                    if (contact.screenshot_frequency > 3600) {
                        $rootScope.showErrorAlert(
                            'The screenshot frequency cannot be more than 3600 seconds.'
                        );
                        return;
                    }

                    $scope.setfrequency = false;
                    $scope.setfrequencyinput = false;

                    var data = {
                        user_uuid: contact.user_uuid,
                        screenshot_frequency: contact.screenshot_frequency
                    }

                    dataFactory.setFrequency(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $rootScope.user.tk_screenshot_freq = response.data.success
                                    .data.screenshot_frequency;
                            }
                        });
                };

                $scope.disableScreenshot = function(contact) {

                    $scope.enabled = !$scope.enabled;

                    if (!$scope.enabled) {
                        var data = {
                            user_uuid: contact.user_uuid,
                            screenshot_frequency: 0
                        }

                        dataFactory.setFrequency(data)
                            .then(function(response) {
                                if (response.data.success) {
                                    $rootScope.user.tk_screenshot_freq = response.data
                                        .success.data.screenshot_frequency;
                                }
                            });
                    } else {
                        if (contact.screenshot_frequency == 0 || contact.screenshot_frequency ==
                            null) {
                            contact.screenshot_frequency = 300;

                            $scope.setfrequency = false;
                            $scope.setfrequencyinput = false;
                        }

                        var data = {
                            user_uuid: contact.user_uuid,
                            screenshot_frequency: contact.screenshot_frequency
                        };

                        dataFactory.setFrequency(data)
                            .then(function(response) {
                                if (response.data.success) {
                                    $rootScope.user.tk_screenshot_freq = response.data
                                        .success.data.screenshot_frequency;
                                }
                            });
                    }
                };

                $scope.changeFrequencyInput = function() {
                    $scope.setfrequencyinput = true;
                    $scope.changefrequency = false;
                };

                $scope.createUpdateGroup = function(selectedContact) {
                    $rootScope.showModalFull('/timeclockpro/createupdategroup.html', {
                        manager: selectedContact
                    }, 'lg');
                };
            }
        };
    })
    .directive('myTeam', function($rootScope, dataFactory, $mdDialog) {
        return {
            restrict: 'E',
            templateUrl: 'views/timeclockpro/myteam.html',
            scope: {
                user: '<'
            },
            link: function($scope, element, attrs) {

                // function loadTkUsers() {
                //     $scope.loadingData = true;
                //     dataFactory.getTimeKeeperUsers()
                //         .then(function(response) {
                //             if (response.data.success) {
                //                 $scope.tkusers = response.data.success.data;
                //                 if ($scope.tkusers.length > 0)
                //                     $scope.loadOtherData($scope.tkusers);
                //             }
                //             $scope.loadingData = false;
                //         });
                // }

                // loadTkUsers();

                $scope.loadingData = true;

                $rootScope.$on('load.tkusers', function($event, tkusers) {
                    $scope.tkusers = tkusers;
                });

                $scope.$watch('tkusers.length', function(newVal, oldVal) {
                    if(newVal != oldVal) {
                        if ($scope.tkusers.length > 0)
                            $scope.loadOtherData($scope.tkusers);

                        $scope.loadingData = false;
                    }
                });

                $scope.loadOtherData = function(users) {
                    $scope.showSpinner = true;
                    var data = {
                        users: users
                    }
                    dataFactory.getRemainingData(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.tkusers = response.data.success.data;
                            }
                            $scope.showSpinner = false;
                        });
                };

                $scope.clearFilter = function() {
                    $scope.search.contact_name_full = '';
                };

                $scope.predicate = 'name';
                $scope.reverse = false;

                $scope.sort_by = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.thumbnailUrl = function(screenshot) {
                    return $rootScope.onescreenBaseUrl +
                        '/timeclockpro/screenshot/thumb/' +
                        screenshot.time_keeper_screenshot_uuid +
                        '/' + screenshot.domain_uuid + '?token=' + $rootScope.userToken;
                };

                $scope.showTimeLine = function(user) {
                    $scope.user = user;
                    $rootScope.$broadcast('set.timeline.tab', {
                        user: $scope.user
                    });
                };

                $scope.overtimeHelp = function() {
                    var help = angular.element(document.querySelector('#overtime-help'));
                    $mdDialog.show(
                        $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title('How is overtime calculated?')
                        .htmlContent(help[0].innerHTML)
                        .ariaLabel('OverTime Calculation')
                        .ok('Close')
                    );
                }

            }
        };
    })
    .directive('timelineView', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/timeclockpro/timeline-view.html'
        };
    })
    .directive('teamSettings', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/timeclockpro/team-settings.html'
        };
    })
    .directive('timeCards', function($rootScope, $filter, dataFactory, fileService, $mdDialog, $sce) {
        return {
            restrict: 'E',
            templateUrl: 'views/timeclockpro/timecards.html',
            scope: {
                user: '<'
            },
            link: function($scope, element, attrs) {

                $rootScope.$on('load.tkusers', function($event, tkusers) {
                    $scope.tkusers = tkusers;
                });

                $scope.predicate = 'name';
                $scope.reverse = false;

                $scope.sort_by = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.selectedTaba = {
                    color: 'green',
                    'font-weight': 'bold'
                };

                $scope.showTotalHours = true;
                $scope.showGrossPay = false;
                $scope.showSummary = true;
                $scope.showPdfSpinner = false;

                $rootScope.$on('load.tkgroups', function($event, tkgroups) {
                    $scope.tkGroups = tkgroups;
                });

                $scope.$watch('tkusers', function(newVal, oldVal) {
                    if(newVal) {
                        if($scope.tkGroups){
                            $scope.selectedTeam = $scope.tkGroups[0];
                        }
                    }
                });

                $scope.$watch('selectedTeam.time_keeper_group_uuid', function(newVal, oldVal) {
                    if (newVal !== oldVal) {
                        $scope.updateTeamList();
                    }
                });

                var weekday = new Array(7);
                weekday[0] = "Sun";
                weekday[1] = "Mon";
                weekday[2] = "Tue";
                weekday[3] = "Wed";
                weekday[4] = "Thu";
                weekday[5] = "Fri";
                weekday[6] = "Sat";

                function build_calendar(from, to) {
                    var from = from;
                    var date = new Date(from);
                    $scope.days = [];
                    var toDate = to.setHours(0, 0, 0, 0);
                    var newDate = from.setHours(0, 0, 0, 0);
                    $scope.fulldate = "";

                    while (newDate <= toDate) {
                        $scope.fulldate = weekday[date.getDay()] + "  " +
                            ('0' + (date.getMonth() + 1)).slice(-2) + "/" +
                            ('0' + date.getDate()).slice(-2) + "/" +
                            date.getFullYear();
                        $scope.days.push($scope.fulldate);

                        date.setDate(date.getDate() + 1);
                        newDate = date.setHours(0, 0, 0, 0);
                    }
                }

                var today = new Date();
                var diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 :
                    1);
                var fromdate = new Date();
                fromdate.setDate(diff);

                $scope.fromDate = fromdate;
                $scope.toDate = new Date();

                $scope.updateTeamList = function() {
                    if ($scope.selectedTeam) {
                        $scope.selectedTeam['teamusers'] = [];
                        angular.forEach($scope.selectedTeam.users, function(teamuser) {
                            angular.forEach($scope.tkusers, function(user) {
                                if (teamuser.user_uuid == user.user_uuid) {
                                    var index = $filter(
                                        'getIndexbyUUID')($scope.selectedTeam
                                        .teamusers, teamuser.user_uuid
                                    );
                                    if (index == null) $scope.selectedTeam
                                        .teamusers.push(user);
                                }
                            });
                        });

                        updateTeamDetails($scope.fromDate, $scope.toDate);
                    }
                }

                $scope.displayFromDate = new Date(moment().subtract(30, 'days'));
                $scope.displayToDate = new Date();
                $scope.dateFormat = 'yyyy-MM-dd';
                $scope.fromDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: new Date(2016, 1, 1),
                    maxDate: today
                };
                $scope.toDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: $scope.fromDate,
                    maxDate: today
                };
                $scope.fromDatePopup = {
                    opened: false
                };
                $scope.toDatePopup = {
                    opened: false
                };
                $scope.processFromDate = function(fromDate) {
                    if (fromDate != null) {
                        var newFromDate = new Date(fromDate);
                        if (!$scope.toDate || $scope.toDate < newFromDate) {
                            var ToMinDate = newFromDate;
                            $scope.toDateOptions.minDate = ToMinDate;
                            $scope.toDate = ToMinDate;
                        }
                        build_calendar($scope.fromDate, $scope.toDate);

                        updateTeamDetails(newFromDate, $scope.toDate);

                        if ($scope.selectedUser) {
                            $scope.showUserDetails($scope.selectedUser);
                        }

                    }
                };
                $scope.processToDate = function(toDate) {
                    if (toDate != null) {
                        if (!$scope.fromDate || $scope.fromDate > toDate) $scope.fromDate =
                            new Date(toDate);
                        $scope.toDate = new Date(toDate);

                        build_calendar($scope.fromDate, $scope.toDate);

                        updateTeamDetails($scope.fromDate, $scope.toDate);

                        if ($scope.selectedUser) {
                            $scope.showUserDetails($scope.selectedUser);
                        }
                    }

                };
                $scope.processFromDate();
                $scope.OpenfromDate = function() {
                    //$scope.dateSearched = false;
                    $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
                };
                $scope.OpentoDate = function() {
                    //$scope.dateSearched = false;
                    $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
                };

                $scope.clearDateSearch = function() {
                    $scope.displayFromDate = new Date(moment().subtract(7, 'days'));
                    $scope.displayToDate = new Date();
                    $scope.fromDate = '';
                    $scope.toDate = '';
                };

                $scope.submitDateSearch = function() {};

                function updateTeamDetails(fromDate, toDate) {
                    $scope.showSpinner = true;
                    var fromDate = fromDate.getFullYear() + "-" + (fromDate.getMonth() + 1) +
                        "-" + fromDate.getDate();
                    var toDate = toDate.getFullYear() + "-" + (toDate.getMonth() + 1) + "-" +
                        toDate.getDate();
                    build_calendar($scope.fromDate, $scope.toDate);
                    var data = {
                        from_date: fromDate,
                        to_date: toDate,
                        days: $scope.days,
                        tkGroupUsers: $scope.selectedTeam.teamusers
                    }
                    dataFactory.getPostTeamDetails(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.selectedTeam.teamusers = response.data.success.data[
                                    0];
                                $scope.selectedTeam['totalData'] = response.data.success
                                    .data[1];
                                $scope.showSpinner = false;
                            }
                        });
                }

                $scope.goBack = function() {
                    $scope.showSummary = true;
                    $scope.selectedUser = null;
                }

                $scope.setActiveTab = function(text) {
                    if (text == 'totalhours') {
                        $scope.selectedTaba = {
                            color: 'green',
                            'font-weight': 'bold'
                        }
                        $scope.selectedTabb = {}

                        $scope.showTotalHours = true;
                    } else if (text == 'grosspay') {
                        $scope.selectedTaba = {}
                        $scope.selectedTabb = {
                            color: 'green',
                            'font-weight': 'bold'
                        }

                        $scope.showTotalHours = false;
                    }

                };

                $scope.showUserDetails = function(user) {
                    $scope.showSpinner = true;
                    $scope.showSummary = false;
                    $scope.selectedUser = user;
                    build_calendar($scope.fromDate, $scope.toDate);

                    var data = {
                        days: $scope.days,
                        tkUser: user
                    }

                    dataFactory.getUserDetails(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.selectedUser['records'] = response.data.success
                                    .data[0];
                                $scope.selectedUser['totalRecords'] = response.data
                                    .success.data[1];
                                $scope.showSpinner = false;
                            }
                        });
                }

                $scope.printPdf = function(selectedTeam) {

                    $scope.showPdfSpinner = true;

                    var fromDate = $scope.fromDate.getFullYear() + "-" + ($scope.fromDate
                        .getMonth() + 1) + "-" + $scope.fromDate.getDate();
                    var toDate = $scope.toDate.getFullYear() + "-" + ($scope.toDate.getMonth() +
                        1) + "-" + $scope.toDate.getDate();
                    build_calendar($scope.fromDate, $scope.toDate);
                    var data = {
                        from_date: fromDate,
                        to_date: toDate,
                        days: $scope.days,
                        tkGroupUsers: $scope.selectedTeam.teamusers,
                        team_name: $scope.selectedTeam.group_name,
                        print: true,
                        showhours: $scope.showTotalHours
                    }

                    dataFactory.getPostTeamDetails(data)
                        .then(function(response) {
                            if (response.status === 200) {
                                var data = response.data;

                                function onBlock(e) {
                                    var templateUrl =
                                        "views/timeclockpro/enablePopUp.html";
                                    $scope.popupImgSrc = $rootScope.onescreenBaseUrl +
                                        "/popup.png";
                                    var promise = $rootScope.customPrompt(
                                        templateUrl, $scope);
                                    $scope.hidePrompt = function() {
                                        $mdDialog.hide(promise);
                                    };
                                }
                                fileService.openByteArray(data, onBlock);
                                $scope.showPdfSpinner = false;
                            } else {
                                showFileViewErrorAlert();
                            }
                        });
                }

                $scope.printUserPdf = function(user) {
                    $scope.showPdfSpinner = true;
                    $scope.selectedUser = user;
                    var data = {
                        days: $scope.days,
                        tkUser: user,
                        print: true
                    }

                    dataFactory.getUserDetails(data)
                        .then(function(response) {
                            if (response.status === 200) {
                                var data = response.data;

                                function onBlock(e) {
                                    var templateUrl =
                                        "views/quotesheets/enable-popups.html";
                                    $scope.popupImgSrc = $rootScope.onescreenBaseUrl +
                                        "/popup.png";
                                    var promise = $rootScope.customPrompt(
                                        templateUrl, $scope);
                                    $scope.hidePrompt = function() {
                                        $mdDialog.hide(promise);
                                    };
                                }
                                fileService.openByteArray(data, onBlock);
                                $scope.showPdfSpinner = false;
                            } else {
                                showFileViewErrorAlert();
                            }
                        });
                }

                $scope.exportExcelTeamDetails = function(team) {
                    if ($scope.selectedTeam && $scope.fromDate && $scope.toDate) {
                        var team = team ? team : $scope.selectedTeam;
                        var showHours = $scope.showTotalHours;
                        var fromDate = $scope.fromDate.getFullYear() + "-" + ($scope.fromDate
                            .getMonth() + 1) + "-" + $scope.fromDate.getDate();
                        var toDate = $scope.toDate.getFullYear() + "-" + ($scope.toDate
                            .getMonth() + 1) + "-" + $scope.toDate.getDate();
                        var display = "";
                        display = '<i class="fa fa-print"> </i><a href="' + (__env.apiUrl &&
                                __env.apiUrl !== '' ? __env.apiUrl : symphonyConfig.onescreenUrl
                            ) + '/timeclockpro/exportexcelteam/' + team.time_keeper_group_uuid +
                            '/' + fromDate + '/' + toDate + '/' + showHours + '?token=' +
                            $rootScope.userToken +
                            '" target="_blank" style="color:hsl(181,33%,30%)"> Export to Excel</a>';
                        return $sce.trustAsHtml(display);
                    }
                }

                $scope.exportExcelUserDetails = function(user) {
                    if ($scope.fromDate && $scope.toDate) {
                        var user = user ? user : $rootScope.user;
                        var fromDate = $scope.fromDate.getFullYear() + "-" + ($scope.fromDate
                            .getMonth() + 1) + "-" + $scope.fromDate.getDate();
                        var toDate = $scope.toDate.getFullYear() + "-" + ($scope.toDate
                            .getMonth() + 1) + "-" + $scope.toDate.getDate();
                        var display = "";
                        display = '<i class="fa fa-print"> </i><a href="' + (__env.apiUrl &&
                                __env.apiUrl !== '' ? __env.apiUrl : symphonyConfig.onescreenUrl
                            ) + '/timeclockpro/exportexceluser/' + user.user_uuid + '/' +
                            fromDate + '/' + toDate + '?token=' + $rootScope.userToken +
                            '" target="_blank" style="color:hsl(181,33%,30%)"> Export to Excel</a>';
                        return $sce.trustAsHtml(display);
                    }
                }

                $scope.overtimeHelp = function() {
                    var help = angular.element(document.querySelector('#overtime-help2'));
                    $mdDialog.show(
                        $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title('How is overtime calculated?')
                        .htmlContent(help[0].innerHTML)
                        .ariaLabel('OverTime Calculation')
                        .ok('Close')
                    );
                }
            }
        };
    })
    .directive('myTimeCard', function($rootScope, dataFactory, $mdDialog) {
        return {
            restrict: 'E',
            templateUrl: 'views/timeclockpro/mytimecard.html',
            scope: {
                user: '<'
            },
            link: function($scope, element, attrs) {

                $rootScope.$on('load.tkusers', function($event, tkusers) {
                    $scope.tkusers = tkusers;
                    $scope.showUserDetails();
                });

                var weekday = new Array(7);
                weekday[0] = "Sun";
                weekday[1] = "Mon";
                weekday[2] = "Tue";
                weekday[3] = "Wed";
                weekday[4] = "Thu";
                weekday[5] = "Fri";
                weekday[6] = "Sat";

                function build_calendar(from, to) {
                    var from = from;
                    var date = new Date(from);
                    $scope.days = [];
                    var toDate = to.setHours(0, 0, 0, 0);
                    var newDate = from.setHours(0, 0, 0, 0);
                    $scope.fulldate = "";

                    while (newDate <= toDate) {
                        $scope.fulldate = weekday[date.getDay()] + "  " +
                            ('0' + (date.getMonth() + 1)).slice(-2) + "/" +
                            ('0' + date.getDate()).slice(-2) + "/" +
                            date.getFullYear();
                        $scope.days.push($scope.fulldate);

                        date.setDate(date.getDate() + 1);
                        newDate = date.setHours(0, 0, 0, 0);
                    }
                }

                var today = new Date();
                var diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 :
                    1);
                var fromdate = new Date();
                fromdate.setDate(diff);

                $scope.fromDate = fromdate;
                $scope.toDate = new Date();

                $scope.displayFromDate = new Date(moment().subtract(30, 'days'));
                $scope.displayToDate = new Date();
                $scope.dateFormat = 'yyyy-MM-dd';
                $scope.fromDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: new Date(2016, 1, 1),
                    maxDate: today
                };
                $scope.toDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: $scope.fromDate,
                    maxDate: today
                };
                $scope.fromDatePopup = {
                    opened: false
                };
                $scope.toDatePopup = {
                    opened: false
                };
                $scope.processFromDate = function(fromDate) {
                    if (fromDate != null) {
                        var newFromDate = new Date(fromDate);
                        if (!$scope.toDate || $scope.toDate < newFromDate) {
                            var ToMinDate = newFromDate;
                            $scope.toDateOptions.minDate = ToMinDate;
                            $scope.toDate = ToMinDate;
                        }
                        build_calendar($scope.fromDate, $scope.toDate);

                        $scope.showUserDetails();
                    }
                };
                $scope.processToDate = function(toDate) {
                    if (toDate != null) {
                        if (!$scope.fromDate || $scope.fromDate > toDate) $scope.fromDate =
                            new Date(toDate);
                        $scope.toDate = new Date(toDate);

                        build_calendar($scope.fromDate, $scope.toDate);

                        $scope.showUserDetails();
                    }

                };
                $scope.processFromDate();
                $scope.OpenfromDate = function() {
                    //$scope.dateSearched = false;
                    $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
                };
                $scope.OpentoDate = function() {
                    //$scope.dateSearched = false;
                    $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
                };

                $scope.clearDateSearch = function() {
                    $scope.displayFromDate = new Date(moment().subtract(7, 'days'));
                    $scope.displayToDate = new Date();
                    $scope.fromDate = '';
                    $scope.toDate = '';
                };

                $scope.showUserDetails = function() {
                    $scope.showSummary = false;
                    build_calendar($scope.fromDate, $scope.toDate);
                    $scope.user = $scope.tkusers[0];
                    var data = {
                        days: $scope.days,
                        tkUser: $scope.user
                    }

                    dataFactory.getUserDetails(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.user['records'] = response.data.success.data[
                                    0];
                                $scope.user['totalRecords'] = response.data.success
                                    .data[1];

                            }
                        });
                }

                $scope.overtimeHelp = function() {
                    var help = angular.element(document.querySelector('#overtime-help3'));
                    $mdDialog.show(
                        $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title('How is overtime calculated?')
                        .htmlContent(help[0].innerHTML)
                        .ariaLabel('OverTime Calculation')
                        .ok('Close')
                    );
                }
            }
        };
    })
    .directive('outOfOfficeSettings', function($rootScope, dataFactory, metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/settings/out-of-office-settings.html',
            scope: {
                user: '<'
            },
            link: function($scope, element, attrs) {
                if (!$scope.user) {
                    $scope.user = $rootScope.user;
                }

                $scope.init = function() {
                    // $scope.currentStatus = $scope.user.outOfOfficeStatus === 'true' ? true : false;
                    $scope.currentStatus = $scope.user.outOfOfficeStatus ? $scope.user.outOfOfficeStatus :
                        'false';
                    $scope.response = $scope.user.outOfOfficeResponse;
                };
                $scope.init();
                metaService.registerOnRootScopeUserLoadCallback(function() {
                    $scope.init();
                });

                $scope.$watch('currentStatus', function(newVal, oldVal) {
                    console.log(newVal + ' ' + oldVal);
                    if (newVal !== oldVal) {
                        if ($scope.preventloop === true) {
                            $scope.preventloop = false;
                        } else {
                            $scope.setOutOfOfficeStatus(newVal, $scope.response);
                        }
                    }
                });

                $scope.setOutOfOfficeStatus = function(status, response) {

                    if (!response && status === 'true') {
                        $scope.preventloop = true;
                        $scope.currentStatus = 'false'
                        $rootScope.showErrorAlert(
                            'You can not enable the Out of Office Response if the response is blank.'
                        );
                        return;
                    }
                    var data = {
                        user_uuid: $scope.user.id,
                        status: status,
                        response: response
                    };

                    dataFactory.postSetOutOfOfficeStatus(data)
                        .then(function(response) {
                            if (response.data.success) {
                                var statusString = response.data.success.data;
                                // $scope.currentStatus = statusString;
                                if ($scope.user.id === $rootScope.user.id) {
                                    $rootScope.user.outOfOfficeStatus =
                                        statusString;
                                }
                                $scope.user.outOfOfficeStatus = statusString;
                                $rootScope.showSuccessAlert(response.data.success.message);
                                $scope.preventloop = false;
                            } else {
                                $scope.preventloop = true;
                                $scope.currentStatus = (status === 'true' ? 'false' :
                                    'true');
                                $scope.user.outOfOfficeStatus = (status === 'true' ?
                                    'false' : 'true');
                                $rootScope.showErrorAlert(response.data.error.message);
                            }
                        }, function(error) {
                            $scope.user.outOfOfficeStatus = (status === 'true' ?
                                'false' : 'true');
                            $rootScope.showErrorAlert(error.data.message);
                        });
                };
                $scope.updateResponse = function() {
                    var data = {
                        user_uuid: $scope.user.id,
                        status: $scope.currentStatus,
                        response: $scope.response
                    };
                    dataFactory.postSetOutOfOfficeResponse(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.user.outOfOfficeResponse = $scope.response;
                                if ($scope.user.id === $rootScope.user.id) {
                                    $rootScope.user.outOfOfficeResponse = $scope.response;
                                }
                                $rootScope.showSuccessAlert(
                                    'You have successfully updated your response'
                                );
                            } else {
                                $rootScope.showErrorAlert(response.data.error.message);
                            }
                        }, function(error) {
                            $rootScope.showErrorAlert(error.data.message);
                        });
                };
            }
        };
    })
    .directive('textSignatureSettings', function($rootScope, dataFactory, metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/settings/text-signature-settings.html',
            scope: {
                user: '<'
            },
            link: function($scope, element, attrs) {
                if (!$scope.user) {
                    $scope.user = $rootScope.user;
                }

                $scope.init = function() {
                    $scope.textSignatureStatus = $scope.user.textSignatureStatus ?
                        $scope.user.textSignatureStatus : 'false';
                    $scope.textSignatureResponse = $scope.user.textSignatureResponse;
                };
                $scope.init();
                metaService.registerOnRootScopeUserLoadCallback(function() {
                    $scope.init();
                });

                $scope.$watch('textSignatureStatus', function(newVal, oldVal) {
                    console.log(newVal + ' ' + oldVal);
                    if (newVal !== oldVal) {
                        if ($scope.preventloop === true) {
                            $scope.preventloop = false;
                        } else {
                            $scope.setTextSignatureStatus(newVal, $scope.textSignatureResponse);
                        }
                    }
                });

                $scope.setTextSignatureStatus = function(status, response) {

                    if (!response && status === 'true') {
                        $scope.preventloop = true;
                        $scope.textSignatureStatus = 'false'
                        $rootScope.showErrorAlert(
                            'You can not enable the Text Signature if the response is blank.'
                        );
                        return;
                    }
                    var data = {
                        user_uuid: $scope.user.id,
                        status: status,
                        response: response
                    };

                    dataFactory.postSetTextSignatureStatus(data)
                        .then(function(response) {
                            if (response.data.success) {
                                var statusString = response.data.success.data;
                                if ($scope.user.id === $rootScope.user.id) {
                                    $rootScope.user.textSignatureStatus =
                                        statusString;
                                }
                                $scope.user.textSignatureStatus = statusString;
                                $rootScope.showSuccessAlert(response.data.success.message);
                                $scope.preventloop = false;
                            } else {
                                $scope.preventloop = true;
                                $scope.textSignatureStatus = (status === 'true' ?
                                    'false' : 'true');
                                $scope.user.textSignatureStatus = (status ===
                                    'true' ? 'false' : 'true');
                                $rootScope.showErrorAlert(response.data.error.message);
                            }
                        }, function(error) {
                            $scope.user.textSignatureStatus = (status === 'true' ?
                                'false' : 'true');
                            $rootScope.showErrorAlert(error.data.message);
                        });
                };
                $scope.updateResponse = function() {
                    var data = {
                        user_uuid: $scope.user.id,
                        status: $scope.textSignatureStatus,
                        response: $scope.textSignatureResponse
                    };
                    dataFactory.postSetTextSignatureResponse(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.user.textSignatureResponse = $scope.textSignatureResponse;
                                if ($scope.user.id === $rootScope.user.id) {
                                    $rootScope.user.textSignatureResponse = $scope.textSignatureResponse;
                                }
                                $rootScope.showSuccessAlert(
                                    'You have successfully updated your response'
                                );
                            } else {
                                $rootScope.showErrorAlert(response.data.error.message);
                            }
                        }, function(error) {
                            $rootScope.showErrorAlert(error.data.message);
                        });
                };
            }
        };
    })
    .directive('mobileSettings', function($rootScope, dataFactory, metaService, $websocket,
        newChatService, $interval, $timeout) {
        return {
            restrict: 'E',
            templateUrl: 'views/settings/mobile-settings.html',
            scope: {
                user: '<'
            },
            link: function($scope, element, attrs) {

                if (!$scope.user) $scope.user = $rootScope.user;

                $scope.updatePush = function(ptype) {
                    var data = {
                        ptype: ptype,
                        setting: $scope.user.push[ptype],
                        userUuid: $scope.user.id
                    };
                    dataFactory.postUpdatePushNotification(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.error) {
                                $scope.user.push[ptype] = !$scope.user.push[ptype];
                            }
                        });
                };

                $scope.updatePushFrequency = function() {
                    var data = {
                        freq: $scope.user.push.frequency,
                        userUuid: $scope.user.id
                    };
                    dataFactory.postUpdatePushFrequency(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.error) {
                                $scope.user.push.frequency = response.data.error.data;
                            }
                        });
                };

            }
        };
    })
    .directive('infiniteScroll', function($window, $interval, $timeout) {
        return {
            restrict: 'A',
            scope: {
                nearEndCallback: '&',
                contactListInfo: '='
            },
            link: function($scope, element, attrs) {
                var currentHeightPercentage = function() {
                    var el = element[0];
                    var val = el.scrollHeight - el.scrollTop;
                    val = val / el.scrollHeight;
                    val = val * 100;
                    val = val.toFixed(0);
                    val = parseInt(val);
                    val = (val * -1) + 100;
                    return val;
                };
                var pixelsFromBottom = function() {
                    var el = element[0];
                    var val = el.scrollHeight - el.scrollTop;
                    val = val.toFixed(0);
                    val = parseInt(val);
                    return val;
                };
                var lastHeight;
                var height;
            }
        };
    })
    .directive('contactItemHeading', function($rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'contact-item-heading.html',
            scope: {
                contact: '<'
            },
            link: function($scope, element, attrs) {
                $scope.setProfileColor = $rootScope.setProfileColor;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.showicon = $rootScope.showicon;
            }
        };
    })
    .directive('contactItemContent', function($window, $interval, $timeout, $filter, $rootScope,
        contactService, videoConfService, contactGroupsService, emailService, usefulTools,
        callService, metaService, newChatService, $location, $uibModalStack, dataFactory) {
        return {
            restrict: 'E',
            templateUrl: 'contact-item-content.html',
            scope: {
                contact: '<'
            },
            link: function($scope, element, attrs) {
                $scope.setProfileColor = $rootScope.setProfileColor;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.showEditContactForm = contactService.editContact;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.showicon = $rootScope.showicon;
                $scope.sendVideoInvite = videoConfService.sendVideoInvite;
                
                $scope.getSmsNumber = function(contact) {
                    return contactService.getSmsNumber(contact);
                };

                $scope.isFavorite = function(contactUuid) {
                    return contactService.isFavorite(contactUuid);
                };

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

                $scope.toggleFavorite = function(contactUuid) {
                    contactService.toggleContactAsFavorite(contactUuid)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                        });
                };

                $scope.openContactInManagementSystem = function(phone, contact) {
                    if (!phone && contact) phone = contact.contact_mobile_number ? contact.contact_mobile_number : contactService.getPrimaryPhone(contact);
                    integrationService.openContactInManagementSystem(phone, contact);
                };

                function getNumber(contact) {
                    if (!contact.phones) return null;
                    
                }

                $scope.openClient = function(contact) {
                    contactService.getContactDetails(contact.contact_uuid)
                        .then(function(result) {
                            if (result) {
                                angular.forEach(result, function(contact) {
                                    if (contact.contact_setting_category ==
                                        "integration_setting") {
                                        if (contact.contact_setting_name ==
                                            'qq_entity_id' && $rootScope.user
                                            .exportType.partner_code ==
                                            'qqcatalyst') {
                                            var qqUrl =
                                                "https://app.qqcatalyst.com/Contacts/Customer/Details/" +
                                                contact.contact_setting_value;
                                            $window.open(qqUrl, '_blank');
                                        } else if (contact.contact_setting_name ==
                                            'ams_customer_id' && $rootScope
                                            .user.exportType.partner_code ==
                                            'ams360') {
                                            var version = $rootScope.user.domain
                                                .integration_settings.version ?
                                                $rootScope.user.domain.integration_settings
                                                .version : 'v1712522';
                                            var amsUrl =
                                                "https://www.ams360.com/" +
                                                version +
                                                "/NextGen/Customer/Detail/" +
                                                contact.contact_setting_value;
                                            $window.open(amsUrl, '_blank');
                                        }
                                    }
                                });
                            }
                        });
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

                $scope.startEmailClient = function(address) {
                    emailService.startEmailClient(address);
                };

                $scope.openChannel = function(channel) {
                    $location.path('/chatplus');
                    newChatService.setCurrentChannel(channel);
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
            }
        };
    })
    .directive('contactList', function($window, $interval, $timeout, $filter, $rootScope,
        contactService, videoConfService, contactGroupsService, emailService, usefulTools,
        callService, metaService, newChatService, $location, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/contact-list.html',
            scope: {
                contactType: '<',
                searchText: '<',
                contactListInfo: '=',
            },
            link: function($scope, element, attrs) {
                $scope.currentPage = 1;
                $scope.perPage = 25;
                $scope.perGroupPage = 25;
                $scope.activeContact = null;

                $scope.setProfileColor = $rootScope.setProfileColor;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.showEditContactForm = contactService.editContact;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.showicon = $rootScope.showicon;
                $scope.contactHeadingClicked = $rootScope.contactHeadingClicked;
                $scope.sendVideoInvite = videoConfService.sendVideoInvite;

                $scope.headerClicked = function(uuid) {
                    $scope.activeContact = uuid;
                };

                $scope.favorites = function() {
                    return contactService.favoriteContacts();
                };

                $scope.groupHeaderClicked = function(uuid) {
                    $scope.activeGroup = uuid;
                };

                $scope.$on('contact.group.updated', function($event) {
                    contactGroupsService.setGroups();
                });

                metaService.registerOnRootScopeUserLoadCallback(function() {
                    var partnerCode = $rootScope.user.domain.integration_settings.partner_code;
                    $scope.isAms = partnerCode === "ams360";
                });
                $scope.contactGroups = function() {
                    return contactGroupsService.groups;
                };

                $scope.groupFilter = function(item) {
                    var userUuid = $rootScope.user.id;
                    if (!contactGroupsService.userIsManagerOfGroup(userUuid, item) 
                        && !contactGroupsService.userIsViewerOfGroup(userUuid, item)) return false;
                    return true;
                };

                $scope.contactsLoaded = function() {
                    return contactService.contactsLoaded;
                };

                $scope.orderByFunction = function(uuid) {
                    var item = contactService.getContactByUuid(uuid);
                    if (!item) return null;
                    return (item.name && item.name.length > 3) ?
                        item.name : ((item.org && item.org
                            .length > 3) ? item.org : null);
                };

                $scope.orderByContactType = function(item) {
                    if (!item) return null;
                    if (item.type === 'user') return 'a';
                    return 'b';
                };

                $scope.showContact = function(contact) {
                    return !contact || (contact && (contact.name.substring(0, 1) === ' '));
                };

                $scope.searchContacts = function(item) {
                    if (!$scope.searchText ||
                        (item.name.toLowerCase().indexOf($scope.searchText.toLowerCase()) != -1) ||
                        (item.org && item.org.toLowerCase().indexOf($scope.searchText.toLowerCase()) != -1)) {
                        return true;
                    }
                    if (item.nums.length > 0) {
                        var found = false;
                        angular.forEach(item.nums, function(phone) {
                            if (phone.num && phone.num.indexOf($scope.searchText) != -1) {
                                found = true;
                            }
                        });
                        if (found === true) return true;
                    }
                    return false;
                };
                $scope.limit = 20;
                if ($scope.contactType !== 'group') {
                    metaService.rootScopeOn($scope, 'contact.list.update', function() {
                        $timeout(function() {
                            $scope.filteredContacts();
                        });
                    });
                }
                $scope.beginIndex = 0;
                $scope.searchBeginIndex = 0;
                $scope.closeOthers = true;
                $scope.isOpen = {};

                $scope.tSearchText = function() {
                    return contactService.sideContactSearch;
                };

                $scope.addMoreContacts = function() {
                    if ($scope.searchText) {
                        $scope.searchBeginIndex += $scope.limit;
                    } else {
                        $scope.beginIndex += $scope.limit;
                    }
                };
                $scope.showPreviousContacts = function() {
                    $scope.beginIndex -= $scope.limit;
                };

                function isNotCurrentUserContact(contact) {
                    return contact.user_uuid !== $rootScope.user.id;
                };

                $scope.theContact = function(contactUuid) {
                    return contactService.getContactByUuid(contactUuid);
                };

                $scope.showPageStart = function(curPage) {
                    return (curPage - 1) * $scope.perPage + 1;
                };

                $scope.showPageEnd = function(curPage, data) {
                    return curPage * $scope.perPage < data.length ? (curPage) * $scope.perPage :
                        data.length
                };

                $scope.contactsFilter = function(item) {
                    if (!item.cuuid && usefulTools.isUuid(item)) item = contactService.getContactByUuid(item);
                    if (!item || item.cuuid === $rootScope.user.contact_uuid) return false;
                    if (item.name.length < 2) return false;
                    if (item.en && item.en == 'false') return false;
                    if (item.cuuid === $rootScope.user.contact_uuid || $scope.isKotterTechUser(item)) return false;
                    var found = false;
                    // if (contactService.favoritesFilter && item.favorite !== true) return false;
                    var search = contactService.sideContactSearch;
                    if (!search ||
                        (item.name && item.name.toLowerCase().indexOf(search.toLowerCase()) != -1) ||
                        (item.org && item.org.toLowerCase().indexOf(search.toLowerCase()) != -1)) found = true;

                    if (!found && search && item.nums && item.nums.length > 0) {
                        angular.forEach(item.nums, function(phone) {
                            if (phone.num && phone.num.indexOf(search) != -1) found = true;
                        });
                    }
                    return found;
                };

                $scope.isFavorite = function(contactUuid) {
                    console.log(contactUuid);
                    return contactService.isFavorite(contactUuid);
                };

                $scope.isKotterTechUser = function(contact) {
                    return contactService.isKotterTechUser(contact);
                };

                $scope.showContactCountInfo = function(data) {
                    return 'Showing ' + $scope.showPageStart($scope.currentPage) +
                        ' to ' + $scope.showPageEnd($scope.currentPage, data) + ' of ' +
                        data.length + ((contactService.favoritesFilter ||
                                contactService.sideContactSearch) ? ' filtered ' :
                            ' loaded ') + 'contacts.';
                };

                $scope.showTotalContactCount = function() {
                    var users = contactService.getUserContactsOnly();
                    var hasKotterTech = false;
                    angular.forEach(users, function(user) {
                        if (contactService.isKotterTechUser(user)) hasKotterTech =
                            user.user_uuid;
                    });
                    var total = contactService.contactsArray().length + contactService.userContactsArray()
                        .length - 1;
                    if (hasKotterTech !== $rootScope.user.id) total = total - 1;
                    if (total < 0) {
                        total = 0;
                    }
                    return total;
                };

                if ($scope.contactType !== 'group') {
                    $scope.filteredContacts = function() {
                        var contacts = contactService.userContactsArray();
                        return contacts;
                    };
                } else {
                    $scope.filteredGroupContacts = function(group) {

                        var contacts = group.members;
                        return contacts;
                    };

                    $scope.showGroupSize = function(group) {
                        if (group.members.indexOf($rootScope.user.contact_uuid) !== -1)
                            return group.members.length - 1;
                        return group.members.length;
                    };
                }
            }
        };
    })
    .directive('amsContactList', function(contactService, $rootScope, metaService, callService,
        emailService, dataFactory) {
        return {
            restrict: 'E',
            templateUrl: 'views/ams-contact-list.html',
            scope: {
                searchText: '<'
            },
            link: function($scope, element, attrs) {
                $scope.showEditContactForm = contactService.editContact;
                $scope.setProfileColor = $rootScope.setProfileColor;
                $scope.showAddContactForm = function(contact) {
                    $rootScope.showAddContactForm('ams', contact);
                };
                $scope.currentPage = 1;
                $scope.perPage = 50;
                $scope.perGroupPage = 25;

                contactService.getSearchAmsContacts("");

                $scope.loadingContacts = function() {
                    return contactService.loadingAmsContacts;
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

                $scope.startEmailClient = emailService.startEmailClient;
                $scope.hasPhone = function(contact) {
                    return contact.mobile_phone || contact.residence_phone ||
                        contact.business_phone;
                };

                $scope.showTotalContactCount = function() {
                    var users = contactService.getUserContactsOnly();
                    var hasKotterTech = false;
                    var total = contactService.getTotalContacts();
                    angular.forEach(users, function(user) {
                        if (contactService.isKotterTechUser(user)) hasKotterTech =
                            user.user_uuid;
                    });

                    total = total - 1;
                    if (hasKotterTech !== $rootScope.user.id) {
                        total = total - 1;
                    }
                    if (total < 0) {
                        total = 0;
                    }
                    return total;
                };
                $scope.randomColor = function() {
                    return randomColor({
                        luminosity: 'light'
                    });
                };

                $scope.closeOthers = true;

                $scope.contacts = function() {
                    return contactService.amsSearchContacts;
                };

                $scope.displayContactName = function(contact) {
                    if (contact.FirstName || contact.LastName) {
                        return contact.FirstName + ' ' + contact.LastName;
                    } else {
                        return contact.FirmName;
                    }
                };
            }
        };
    })
    .directive('amsContactList2', function(contactService, $rootScope, metaService, usefulTools,
        $uibModalStack, dataFactory, greenboxService) {
        return {
            restrict: 'E',
            templateUrl: 'views/ams-contact-list2.html',
            scope: {
                searchText: '<',
                data: '<'
            },
            link: function($scope, element, attrs) {
                $scope.setProfileColor = $rootScope.setProfileColor;

                $scope.showAddContactForm = function(contact) {
                    $rootScope.showAddContactForm('ams', contact);
                };
                $scope.currentPage = 1;
                $scope.perPage = 50;
                $scope.perGroupPage = 25;

                contactService.getSearchAmsContacts("");

                $scope.loadingContacts = function() {
                    return contactService.loadingAmsContacts;
                };

                $scope.randomColor = function() {
                    return randomColor({
                        luminosity: 'light'
                    });
                };

                $scope.hasPhone = function(contact) {
                    return contact.mobile_phone || contact.residence_phone ||
                        contact.business_phone;
                };

                $scope.closeOthers = true;

                $scope.contacts = function() {
                    return contactService.amsContactsOnly();
                };

                $scope.theContact = function(contact_uuid) {
                    return contactService.getContactByUuid(contact_uuid);
                }

                $scope.activityList = function() {
                    return greenboxService.ams360ActivityList;
                }

                $scope.selectContact = function(selectedContact) {
                    $scope.number = null;
                    if (selectedContact.phones && selectedContact.phones.length > 0) {
                        $scope.number = selectedContact.phones[0].phone_number;
                    }

                    if ($scope.data.activity) {
                        contactService.getContactDetails(selectedContact.contact_uuid)
                            .then(function(result) {
                                if (result) {
                                    angular.forEach(result, function(contact) {
                                        if (contact.contact_setting_category ==
                                            "integration_setting") {
                                            $scope.data[
                                                    'customer_contact_id'] =
                                                contact.contact_setting_value;
                                            $scope.data['number'] = $scope.number;
                                            $rootScope.exportDataToAms360(
                                                $scope.data);
                                        }
                                        $scope.closeModal();
                                    });
                                }
                                $scope.closeModal();
                            });
                    } else {
                        return $rootScope.showErrorAlert(
                            'Please select activity action.');
                    }
                }

                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                    contactService.getSearchAmsContacts("");
                };

                $scope.searchTextFilter = function(uuid) {
                    var item = contactService.getContactByUuid(uuid);
                    if (!item) return false;
                    if (!$scope.searchText ||
                        (item.name && item.name.toLowerCase()
                            .indexOf($scope.searchText.toLowerCase()) !== -1)) return true;
                    return false;
                };

                $scope.displayContactName = function(contact) {
                    if (contact.FirstName || contact.LastName) {
                        return contact.FirstName + ' ' + contact.LastName;
                    } else {
                        return contact.FirmName;
                    }
                };
            }
        };
    })
    .directive('qqContactList2', function(contactService, $rootScope, metaService, callService,
        emailService, dataFactory, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/qq-contact-list2.html',
            scope: {
                searchText: '<',
                data: '<'
            },
            link: function($scope, element, attrs) {
                $scope.setProfileColor = $rootScope.setProfileColor;
                $scope.currentPage = 1;
                $scope.perPage = 50;
                $scope.perGroupPage = 25;

                contactService.getSearchQQContacts("");

                $scope.loadingContacts = function() {
                    return contactService.loadingQQContacts;
                };

                $scope.showTotalContactCount = function() {
                    var users = contactService.getUserContactsOnly();
                    var hasKotterTech = false;
                    var total = contactService.getTotalContacts();
                    var qqContacts = contactService.qqSearchContacts;
                    angular.forEach(users, function(user) {
                        if (contactService.isKotterTechUser(user)) hasKotterTech =
                            user.user_uuid;
                    });
                    total = total - 1;
                    if (hasKotterTech !== $rootScope.user.id) {
                        total = total - 1;
                    }
                    // total += qqContacts.length;
                    if (total < 0) {
                        total = 0;
                    }
                    return total;
                };
                $scope.randomColor = function() {
                    return randomColor({
                        luminosity: 'light'
                    });
                };

                $scope.closeOthers = true;

                $scope.contacts = function() {
                    return contactService.qqContactsOnly();
                };

                $scope.theContact = function(contact_uuid) {
                    return contactService.getContactByUuid(contact_uuid);
                }

                $scope.selectContact = function(contact) {
                    contactService.getContactDetails(contact.contact_uuid)
                        .then(function(result) {
                            if (result) {
                                angular.forEach(result, function(contact) {
                                    if (contact.contact_setting_category ==
                                        "integration_setting") {
                                        $scope.data['entity_id'] = contact.contact_setting_value;
                                        $rootScope.exportToQQCatalyst(
                                            $scope.data);
                                    }
                                    $scope.closeModal();
                                });
                            }
                            $scope.closeModal();
                        });
                }

                $scope.closeModal = function() {
                    $rootScope.closeThisModal();
                    contactService.getSearchQQContacts("");
                };

                $scope.searchTextFilter = function(uuid) {
                    var item = contactService.getContactByUuid(uuid);
                    if (!item) return false;
                    if (!$scope.searchText ||
                        (item.name && item.name.toLowerCase()
                            .indexOf($scope.searchText.toLowerCase()) !== -1)) return true;
                    return false;
                };
            }
        };
    })
    .directive('callersBlacklist', function($timeout, $rootScope, symphonyConfig, contactService,
        recordingService, $uibModalStack, $filter, audioLibraryService, dataFactory, _,
        usefulTools) {
        return {
            restrict: 'E',
            templateUrl: 'views/calls/callers-blacklist.html',
            scope: {
                input: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tabs = {
                    activeTab: $scope.input.activeTab
                };

                function loadAudioFiles() {
                    audioLibraryService.loadAudioLibraries($scope.input.domain_uuid, false)
                        .then(function(response) {
                            if (response) {
                                console.log(response);
                                $scope.audioLibraries = response;
                                if (__env.enableDebug) console.log(
                                    'LOADED AUDIO LIBRARIES');
                            } else {
                                if (__env.enableDebug) console.log(
                                    'FAILED LOADING AUDIO LIBRARIES');
                            };
                        });
                };

                loadAudioFiles();

                $scope.recordingService = recordingService;
                $scope.isKotterTechUser = $rootScope.isKotterTechUser;
                $scope.info = {};
                $scope.playing = null;
                /*$scope.closeModal = $scope.input.closeModal;*/
                $scope.userUuid = $scope.input.user_uuid;
                $scope.extension_uuid = $scope.input.extension_uuid;
                $scope.info.number_to_filter = $scope.input.number_to_filter;
                $scope.info.reach = $scope.input.reach;
                $scope.blacklist = $scope.input.blacklist;
                $scope.default_voicemail_uuid = $rootScope.user.voicemail.voicemail_uuid;
                $scope.default_voicemail_id = $rootScope.user.voicemail.voicemail_id;

                $scope.actions = [{
                        value: 'block',
                        description: 'Block'
                    },
                    {
                        value: 'play_audio',
                        description: 'Play Audio'
                    },
                    {
                        value: 'voicemail',
                        description: 'Send to Voicemail'
                    }
                ];

                $scope.closeModal = function() {
                    $scope.stopPlayAudio();
                    $uibModalStack.dismissAll();
                };

                $scope.validateBlacklist = function() {
                    // var alreadyInBL=_.findIndex($scope.blacklist, function(item){ return $scope.number_to_filter===item.filtered_number;}) !== -1;
                    if ($scope.info.number_to_filter && $scope.info.selectedAction &&
                        $scope.info.reach) {
                        if ($scope.info.selectedAction === 'play_audio' && !$scope.info
                            .selectedFile) {
                            return false;
                        } else {
                            return true;
                        }
                    }
                    return false;
                };

                $scope.playAudio = function(uuid) {
                    var row = uuid;
                    if (uuid.caller_blacklist_uuid) {
                        row = uuid.caller_blacklist_uuid;
                        uuid = uuid.audio_library_uuid;
                    }
                    if ($scope.audio) $scope.stopPlayAudio();
                    var file, index;
                    index = $filter('getByUUID')($scope.audioLibraries, uuid,
                        'audio_library');
                    if (index !== null) {
                        file = $scope.audioLibraries[index].filepath;
                        if (file) {
                            $scope.audio = new Audio(symphonyConfig.audioUrl + file);
                            $scope.audio.play();
                            $scope.playing = row;
                        }
                    }
                };

                $scope.showReachUser = function(userUuid) {
                    var contact = contactService.getContactByUserUuid(userUuid, $scope.input
                        .domain_uuid);
                    if (contact) {
                        return '(' + contact.name + ')';
                    }
                    return null;
                };

                $scope.stopPlayAudio = function() {
                    if ($scope.audio) {
                        $scope.audio.pause();
                        $scope.audio = undefined;
                        $scope.playing = null;
                    }
                };

                $rootScope.$on('stop.audio', function($event) {
                    $scope.stopPlayAudio();
                });

                $scope.audioFiles = function() {
                    var libraries = audioLibraryService.filterAudioLibrariesByCategories(
                        $scope.audioLibraries, ['ringtones', 'blacklist']);
                    if (libraries) {
                        libraries = libraries.filter(function(library) {
                            return library.user_uuid === $rootScope.user.id ||
                                library.access_level === 'company';
                        });
                    }
                    return libraries;
                };

                $scope.showAction = function(action) {
                    if (action === 'voicemail') {
                        return 'Send to Voicemail';
                    } else if (action === 'play_audio') {
                        return 'Play Audio';
                    } else if (action === 'block') {
                        return 'Block Call';
                    }
                };

                $scope.isValidAction = function(reach, action) {
                    if (reach === 'domain' && action === 'voicemail') {
                        return false;
                    } else {
                        return true;
                    }
                };

                $scope.searchNumbers = function(item) {
                    if (!$scope.blacklistSearch || (item.filtered_number.indexOf($scope
                            .blacklistSearch.toLowerCase()) !== -1)) return true;
                    return false;
                };

                function numberExists(number) {
                    var found = null;
                    angular.forEach($scope.blacklist, function(item) {
                        if (item.filtered_number === number) {
                            found = item.caller_blacklist_uuid;
                        }
                    });
                    return found;
                }

                $scope.confirmCallerBlacklist = function() {
                    if (numberExists($scope.info.number_to_filter)) {
                        $rootScope.showErrorAlert($filter('tel')($scope.info.number_to_filter) +
                            ' already exists in the Caller Blacklist.');
                        return;
                    }
                    var cleanNumber = usefulTools.cleanPhoneNumber($scope.inputNumber);
                    var data = {
                        user_uuid: $scope.info.reach === 'user' ? ($scope.input.access ===
                            'admin' ? $scope.info.selectedUser : $scope.userUuid
                        ) : null,
                        domain_uuid: $scope.input.domain_uuid,
                        filtered_number: $scope.info.number_to_filter,
                        reach: $scope.info.reach,
                        action: $scope.info.selectedAction
                    };
                    if ($scope.info.selectedFile) data.audio_library_uuid = $scope.info
                        .selectedFile;
                    var confirmation =
                        'Are you sure you want to add this number to the Caller Blacklist?';
                    $rootScope.confirmDialog(confirmation)
                        .then(function(response) {
                            if (response) {
                                dataFactory.postUpdateCallerBlacklist(data).then(
                                    function(response) {
                                        $rootScope.showalerts(response);
                                        if (response.data.success) {
                                            var caller = response.data.success.data;
                                            $scope.blacklist.push(caller);
                                        }
                                        $scope.info = {};
                                        $scope.tabs.activeTab = 1;
                                    });
                            }
                        });
                };

                $scope.saveBlacklistChanges = function() {
                    var exists = numberExists($scope.info.number_to_filter);
                    if (exists && exists !== $scope.editingCaller) {
                        $rootScope.showErrorAlert($filter('tel')($scope.info.number_to_filter) +
                            ' already exists in the Caller Blacklist.');
                        return;
                    }
                    var data = {
                        domain_uuid: $scope.input.domain_uuid,
                        caller_blacklist_uuid: $scope.editingCaller,
                        user_uuid: $scope.info.reach === 'user' ? $scope.info.selectedUser : null,
                        filtered_number: $scope.info.number_to_filter,
                        reach: $scope.info.reach,
                        action: $scope.info.selectedAction
                    };
                    if ($scope.info.selectedFile) data.audio_library_uuid = $scope.info
                        .selectedFile;
                    dataFactory.postUpdateCallerBlacklist(data).then(function(response) {
                        $rootScope.showalerts(response);
                        if (response.data.success) {
                            var caller = response.data.success.data;
                            var index = $filter('getByUUID')($scope.blacklist,
                                caller.caller_blacklist_uuid,
                                'caller_blacklist');
                            if (index !== null) $scope.blacklist[index] =
                                caller;
                            $scope.tabs.activeTab = 1;
                        }
                        $scope.info = {};
                    });

                    $scope.stopPlayAudio();
                };

                $rootScope.$on('callersBlacklistUpdate', function(event, data) {
                    dataFactory.getCallersBlacklist(data.event.domain_uuid).then(
                        function(response) {
                            if (response.data.success) {
                                $scope.blacklist = response.data.success.data;
                            }
                        });
                });

                $scope.users = function() {
                    if ($rootScope.user.domain_uuid === $scope.input.domain_uuid) {
                        return contactService.getUserContactsOnly();
                    } else {
                        return usefulTools.convertObjectToArray(contactService.getContactDomainCollection(
                            $scope.input.domain_uuid));
                    }
                };

                $scope.removeFromBlacklist = function(caller) {
                    var confirmation = 'Are you sure you want to remove ' + $filter(
                        'tel')(caller.filtered_number) + ' from your Blacklist?';
                    $rootScope.confirmDialog(confirmation)
                        .then(function(response) {
                            if (response) {
                                dataFactory.deleteCallerBlacklist(caller.caller_blacklist_uuid)
                                    .then(function(response) {
                                        $rootScope.showalerts(response);
                                        if (response.data.success) {
                                            var ret_caller = response.data.success
                                                .data;
                                            var index = _.findIndex($scope.blacklist,
                                                function(item) {
                                                    return item.caller_blacklist_uuid ===
                                                        ret_caller.caller_blacklist_uuid;
                                                });
                                            $scope.blacklist.splice(index, 1);
                                        }
                                    });
                            }
                        });
                };

                $scope.isEditableAction = false;
                $scope.toogleEditor = function() {
                    $scope.isEditableAction = !$scope.isEditableAction;
                };

                $scope.cancelCallerEdit = function() {
                    var confirmation = 'Are you sure you want to cancel ' + ($scope.editingCaller ?
                        'editing this Blacklist number?' :
                        ' adding this number to the Caller Blacklist?');
                    $rootScope.confirmDialog(confirmation)
                        .then(function(response) {
                            if (response) {
                                $scope.info = {};
                                $scope.editingCaller = null;
                                $scope.tabs.activeTab = 1;
                            }
                        });
                    $scope.stopPlayAudio();
                };

                $scope.editCallerBlacklist = function(caller) {
                    if (caller.audio_library_uuid) {
                        var file = $scope.audioLibraries.find(function(item) {
                            return caller.audio_library_uuid === item.audio_library_uuid;
                        });
                    }
                    $scope.editingCaller = caller.caller_blacklist_uuid;
                    $scope.info.number_to_filter = caller.filtered_number;
                    $scope.info.reach = caller.reach;
                    $scope.info.selectedUser = caller.user_uuid;
                    $scope.info.selectedAction = caller.action;
                    $scope.info.selectedFile = caller.audio_library_uuid ? caller.audio_library_uuid :
                        null;
                    $scope.tabs.activeTab = 0;
                };

                $scope.domainValid = function() {
                    var alreadyInBL = _.findIndex($scope.blacklist, function(item) {
                        return $scope.number_to_filter === item.filtered_number;
                    }) !== -1;
                    var cleanNumber = usefulTools.cleanPhoneNumber($scope.inputNumber);
                    var validNumber = usefulTools.isPhoneNumber(cleanNumber);

                    if ($scope.selectedDomainAction && !alreadyInBL && validNumber) {
                        if ($scope.selectedDomainAction.value === 'play_audio' && !
                            $scope.selectedDomainFile) {
                            return false;
                        } else {
                            return true;
                        }
                    } else {
                        return false;
                    }
                };

                $scope.setOpcMessageBroadcast = function(opc) {
                    if (opc === 1) {
                        $scope.opcBroadcast = 'newrecord';
                        $scope.opcBroadcastTitle = 'Record a New Message...';
                    } else if (opc === 2) {
                        $scope.opcBroadcast = 'uploadfile';
                        $scope.opcBroadcastTitle = 'Upload an Audio File...';
                    } else if (opc === 3) {
                        $scope.opcBroadcast = 'audiolibrary';
                        $scope.opcBroadcastTitle = 'Select from Audio Library...';
                    } else {
                        $scope.opcBroadcast = 'messagetyped';
                        $scope.opcBroadcastTitle = 'Type Your Message...';
                    }
                };

                $scope.cancelAddAudio = function() {
                    $scope.opcBroadcast = null;
                };

                $rootScope.saveToServer = function(index, title) {
                    var file_title = (title ? title : null);
                    var fd = new FormData();
                    var recording = recordingService.blob;
                    recording = new File([recording], "recording", {
                        type: recording.type
                    });
                    fd.append("recording", recording);
                    fd.append("domain_uuid", $rootScope.user.domain_uuid);
                    fd.append('category', 'blacklist');
                    fd.append('uploadType', 'recording');
                    fd.append('access_level', 'company');
                    fd.append('title', file_title);
                    console.log(fd);
                    dataFactory.postUploadAudioFile(fd)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                var file = response.data.success.data;
                                $scope.opcBroadcast = null;
                                $scope.audioLibraries.push(file);
                                $scope.info.selectedFile = file.audio_library_uuid;
                            }
                        });
                };

                $scope.uploadAudioFile = function(file, title) {
                    var file_title = (title ? title : null);
                    $scope.uploadingLibrary = true;
                    var fd = new FormData();
                    console.log($scope.domain_uuid);
                    console.log(file);
                    fd.append("recording", file);
                    fd.append("domain_uuid", $scope.domain_uuid);
                    fd.append('category', 'blacklist');
                    fd.append('access_level', 'company');
                    fd.append('title', file_title);
                    console.log(fd);
                    dataFactory.postUploadAudioFile(fd)
                        .then(function(response) {
                            console.log(response.data);
                            if (response.data.success) {
                                var file = response.data.success.data;
                                $scope.opcBroadcast = null;
                                $scope.audioLibraries.push(file);
                                $scope.info.selectedFile = file.audio_library_uuid;
                            } else {
                                console.log(response.data.error.message);
                            }
                        });
                };

                $scope.audioBeingEdited = function(file) {
                    return $scope.editingAudio && ($scope.editingAudio.audio_library_uuid ===
                        file.audio_library_uuid);
                };

                $scope.setEditAudio = function(file) {
                    $scope.editingAudio = angular.copy(file);
                };

                $scope.cancelEditAudio = function() {
                    var index = $filter('getByUUID')($scope.audioLibraries, $scope.editingAudio
                        .audio_library_uuid, 'audio_library');
                    if (index !== null) $scope.audioLibraries[index] = angular.copy(
                        $scope.editingAudio);
                    $scope.editingAudio = null;
                };

                $scope.saveEditAudio = function(file) {
                    dataFactory.updateGreetingTitle(file)
                        .then(function(response) {
                            if (response.data.success) {
                                var index = $filter('getByUUID')($scope.audioLibraries,
                                    file.audio_library_uuid, 'audio_library');
                                if (index !== null) $scope.audioLibraries[index] =
                                    file;
                                $scope.editingAudio = null;
                            } else {
                                $rootScope.showErrorAlert(response.data.error.message);
                            }
                        });
                };

                $scope.selectAudioLibraryFile = function(file) {
                    $scope.info.selectedFile = file.audio_library_uuid;
                    $scope.newAudioFile = false;
                };

                $scope.newAudioFile = false;

                $scope.$watch('info.selectedFile', function(newVal, oldVal) {
                    if ((!oldVal || newVal !== oldVal) && newVal ===
                        'CreateNewAudio') {
                        $scope.newAudioFile = true;
                    }
                })
            }
        };
    })
    .directive('dynamicController', function($compile) {
        return {
            transclude: 'element',
            scope: {
                'dynamicController': '='
            },
            link: function(scope, element, attr, ctrl, transclude) {
                var el = null;
                scope.$watch('dynamicController', function() {
                    if (el) {
                        el.remove();
                        el = null;
                    }
                    transclude(function(clone) {
                        clone.attr('ng-controller', scope.dynamicController);
                        clone.removeAttr('dynamic-controller');
                        el = $compile(clone[0])(scope.$parent)
                        element.after(el);
                    });
                });
            }
        }
    });
