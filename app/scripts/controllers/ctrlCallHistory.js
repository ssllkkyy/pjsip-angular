'use strict';

proySymphony.controller('CallHistoryCtrl', function($scope, $window, $filter, $mdDialog,
    metaService, emulationService, ngAudio, $rootScope, $routeParams, $location, integrationService,
    dataFactory, __env, symphonyConfig, $timeout, emailService, callHistoryService, clipboard,
    callService, usefulTools, contactService, _, newChatService, greenboxService) {

    if ($routeParams.videoroom) {}

    $scope.historyTableHeight = $window.innerHeight - 400;
    $scope.maxSize = 50;
    $scope.predicate = 'start_stamp';
    $scope.reverse = true;
    $scope.ppOptions = [10, 20, 50, 100];
    $scope.activityList = greenboxService.ams360ActivityList;
    $scope.showEditContactForm = contactService.editContact;
    
    $scope.startEmailClient = function(address) {
        emailService.startEmailClient(address);
    };

    $scope.getSmsNumber = function(contact) {
        return contactService.getSmsNumber(contact);
    };

    $scope.$watch('callHistory.activeTab', function(){
        $scope.historySearch = null;
    });

    $scope.currentPageCallHist = 0;
    $scope.displayCallHistoryRST = [];

    $scope.showChevron = function(predicate) {
        return usefulTools.showChevron(predicate, $scope.predicate, $scope.reverse);
    };

    $scope.emulatedUser = function() {
        return emulationService.emulatedUser;
    };

    $scope.getUserNameByUUID = function(userUuid) {
        var contact = contactService.getContactByUserUuid(userUuid);
        if (contact) {
            return contact.name;
        }
    };

    $scope.openContactInManagementSystem = function(phone, contact) {
        integrationService.openContactInManagementSystem(phone, contact);
    };
    
    var today = new Date();
    $rootScope.callHistory = {
        user_uuid: $rootScope.user.id,
        page: 1,
        perPage: 20,
        maxPages: 50,
        currentPage: 1,
        fromDate: '',
        toDate: ''
    };

    $rootScope.agencyCallHistory = {
        page: 1,
        perPage: 20,
        maxPages: 50,
        currentPage: 1,
        fromDate: '',
        toDate: ''
    };

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
        minDate: $rootScope.callHistory.fromDate,
        maxDate: today
    };
    $scope.fromDatePopup = {
        opened: false
    };
    $scope.toDatePopup = {
        opened: false
    };
    $scope.processFromDate = function(fromDate, type) {
        if (type == 'myCallHistory') {
            if (fromDate != null) {
                var newFromDate = new Date(fromDate);
                if (!$rootScope.callHistory.toDate || $rootScope.callHistory.toDate <
                    newFromDate) {
                    var ToMinDate = newFromDate;
                    $scope.toDateOptions.minDate = ToMinDate;
                    $rootScope.callHistory.toDate = ToMinDate;
                }
                var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() :
                    $rootScope.user.id);
                $rootScope.functGetCallHistory(user_uuid);
            }
        } else {
            if (fromDate != null) {
                var newFromDate = new Date(fromDate);
                if (!$rootScope.agencyCallHistory.toDate || $rootScope.agencyCallHistory
                    .toDate < newFromDate) {
                    var ToMinDate = newFromDate;
                    $scope.toDateOptions.minDate = ToMinDate;
                    $rootScope.agencyCallHistory.toDate = ToMinDate;
                }
                $rootScope.functGetAgencyCallHistory();
            }
        }
    };
    $scope.processToDate = function(toDate, type) {
        if (type == 'myCallHistory') {
            if (toDate != null) {
                if (!$rootScope.callHistory.fromDate || $rootScope.callHistory.fromDate >
                    toDate) $rootScope.callHistory.fromDate = new Date(toDate);
                $rootScope.callHistory.toDate = new Date(toDate);
            }
            var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() : $rootScope
                .user.id);
            $rootScope.functGetCallHistory(user_uuid);
        } else {
            if (toDate != null) {
                if (!$rootScope.agencyCallHistory.fromDate || $rootScope.agencyCallHistory
                    .fromDate > toDate) $rootScope.agencyCallHistory.fromDate = new Date(
                    toDate);
                $rootScope.agencyCallHistory.toDate = new Date(toDate);
            }
            $rootScope.functGetAgencyCallHistory();
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

    $rootScope.callHistoryRST = [];
    $scope.clearDateSearch = function() {
        $scope.displayFromDate = new Date(moment().subtract(30, 'days'));
        $scope.displayToDate = new Date();
        $rootScope.callHistory.fromDate = '';
        $rootScope.callHistory.toDate = '';
        $rootScope.callHistory.currentPage = 1;
        var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() : $rootScope.user
            .id);

        $rootScope.functGetCallHistory(user_uuid);
    };

    $scope.submitDateSearch = function() {
        var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() : $rootScope.user
            .id);
        //$scope.dateSearched = true;
        $rootScope.callHistory.currentPage = 1;
        $rootScope.functGetCallHistory(user_uuid);
    };
    $rootScope.showTable = false;


    $scope.voicemailFilenames = [];
    $rootScope.callHistoryRST = [];
    $scope.stopScroll = true;
    $scope.historyLength = 0;
    $scope.dateSearched = true;

    $scope.changePerPage = function() {
        var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() : $rootScope.user
            .id);
        $rootScope.functGetCallHistory(user_uuid);
    };

    $scope.changePage = function(nextPage) {
        $rootScope.callHistory.currentPage = nextPage;
        var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() : $rootScope.user
            .id);
        $rootScope.functGetCallHistory(user_uuid);
    };

    $scope.showMissed = function(item) {
        if ($routeParams.missed === 'true') {
            return item.call_status === 'missed' || item.call_status ===
                'sent_to_voicemail';
        }
        return true;
    };

    $scope.emulationStatus = function() {
        return emulationService.emulationStatus;
    };

    $scope.showMissedField = function() {
        return $routeParams.missed === 'true';
    };

    $scope.clearMissedFilter = function() {
        $location.path('/callhistory').search({
            missed: false
        });
        $rootScope.showMissedCalls = false;
    };

    $scope.showContactName = function(call) {
        // console.log(call);
        var contact = $scope.callContact(call);
        return usefulTools.showContactName(contact, call.contact_number);
    };

    $scope.isCurrentUser = function(call) {
        return $scope.callContact(call) && $scope.callContact(call).cuuid ===
            $rootScope.user.contact_uuid;
    };

    $scope.callContact = function(entity) {
        return contactService.theContact(entity);
    };

    $scope.callContactNumber = function(call, type, number) {
        var contact = contactService.getContactByPhoneNumber(number)
        if (contact) {
            call.contact_uuid = contact.cuuid;
            if (type == 'caller')
                call.caller_name = contact.name;
            else
                call.destination_name = contact.name;
            return contact;
        } else {
            return null;
        }
    };

    $scope.playVoicemailFile = function(call) {
        var data = {
            user_uuid: $rootScope.user.id,
            location_group_uuid: null,
            dest_uuid: null
        };
        var selected_vmf = call.voicemail_filepath.split("default/");
        if (selected_vmf[1]) {
            dataFactory.postRetrieveVisualVoicemailList(data)
                .then(function(response) {
                    if (response.data.success) {
                        var voicemails = response.data.success.voicemails;
                        var exists = _.find(voicemails, function(item) {
                            return selected_vmf[1] === item.vm_file;
                        });
                        if (exists) {
                            if (exists.vm_status === "unread") {
                                dataFactory.getSaveVisualVoicemail(exists.visual_voicemail_uuid);
                                $rootScope.unreadVoicemails--;
                            }
                        }
                        $rootScope.showAudioModal(call, 'history-voicemail', $scope
                            .callContact(call));
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log("VV ERROR");
                    if (__env.enableDebug) console.log(error);
                });
        }
    };

    $scope.searchCallHistory = function(item) {
        if (!item.contact) {
            var contact = $scope.callContact(item);
            if (contact && !contact.then && !item.contact) {
                item.contact = contact;
            }
        }
        if (!$scope.historySearch ||
            (item.contact_name && item.contact_name.toLowerCase().indexOf($scope.historySearch
                .toLowerCase()) != -1) ||
            (item.contact_number && item.contact_number.toLowerCase().indexOf($scope.historySearch
                .toLowerCase()) != -1) ||
            (item.noncontact && item.noncontact.name && item.noncontact.name.toLowerCase()
                .indexOf($scope.historySearch.toLowerCase()) != -1) ||
            (item.noncontact && item.noncontact.phone && item.noncontact.phone.toLowerCase()
                .indexOf($scope.historySearch.toLowerCase()) != -1) ||
            (item.contact && item.contact.ext && item.contact.ext
                .indexOf($scope.historySearch.toLowerCase()) != -1) ||
            (item.contact && item.contact.name.toLowerCase().indexOf(
                $scope.historySearch.toLowerCase()) != -1)) {
            return true;
        }
        if (item.contact && item.contact.nums.length > 0) {
            var found = false;
            angular.forEach(item.contact.nums, function(phone) {
                if (phone.num.indexOf($scope.historySearch) != -1) {
                    found = true;
                }
            });
            return found;
        }
        return false;
    };

    $scope.searchbox = function(search) {
        $scope.historySearch = search;
    };

    $scope.loadedAll = false;

    function assignToRoot(history) {
        $rootScope.callHistoryRST = history.data;
        return history.totalcount;
    }

    $scope.copyCallToHawksoft = function(call) {
        var partner = $rootScope.user.exportType.partner_code;
        call.user_uuid = $rootScope.user.id;
        call.extension_uuid = $rootScope.user.extension.extension_uuid;
        call.type = "callHistory";
        call.number = usefulTools.cleanPhoneNumber(call.call_direction ==
            'inbound' ? call.caller_id_number : call.destination_number);
        if (partner === 'ams360') {
            if ($scope.activityList.length != 0) {
                angular.forEach($scope.activityList, function(activity) {
                    if (activity.Description.includes('phone')) {
                        call.activity = activity.Description;
                        return;
                    }
                });
            }
            $rootScope.copyToAms360(call);
        } else if (partner === 'qqcatalyst') {
            $rootScope.copyToQQCatalyst(call);
        } else {
            integrationService.copyEntityToPartner(call);
        }
    };

    metaService.rootScopeOn($scope, 'update.callhistory', function() {
        console.log("INITIALIZE");
        var user_uuid = emulationService.emulatedUser ? emulationService.emulatedUser :
            $rootScope.user.id;
        $rootScope.functGetCallHistory(user_uuid);
        //$rootScope.functGetAgencyCallHistory();
    });

    $rootScope.functGetCallHistory = function(uuid) {
        $rootScope.callHistory.user_uuid = uuid;
        $rootScope.callHistory.page = 1;
        callHistoryService.getCallHistory()
            .then(function(history) {
                removeLwbCalls(history);
                $rootScope.callHistoryData = history;
            });
    };

    $rootScope.functGetAgencyCallHistory = function(uuid) {
        $rootScope.agencyCallHistory.page = 1;
        callHistoryService.getAgencyCallHistory()
            .then(function(history) {
                removeLwbCalls(history);
                $rootScope.agencyCallHistoryData = history;
            });
    };

    $scope.$on('new.contact.added', function(event, contact) {
        var phoneNumber;
        angular.forEach($rootScope.callHistoryData, function(historyData) {
            phoneNumber = historyData.contact_number;
            var match = contactService.phoneNumberBelongsToContact(contact,
                phoneNumber);
            if (match) {
                historyData.noncontact = null;
                historyData.contact_uuid = contact.cuuid;
                historyData.contact_name = contact.name;
                historyData.from_to = contact.name;
                historyData.isContact = true;
                historyData.isUser = (contact.type === 'user');
            }
        });
    });

    $scope.$on('contact.deleted', function(event, contactUuid) {
        angular.forEach($rootScope.callHistoryData, function(historyData) {
            if (historyData.contact && historyData.contact.contact_uuid ===
                contactUuid) {
                historyData.noncontact = true;
                historyData.contact_uuid = undefined;
                historyData.contact_name = undefined;
                historyData.from_to = undefined;
                historyData.isContact = false;
                historyData.isUser = undefined;
            }
        });
    });

    function loadCallHistory() {
        callHistoryService.getCallHistory()
            .then(function(history) {
                removeLwbCalls(history);
                $rootScope.callHistoryData = history;
                //reset missed call count
                dataFactory.getResetMissedCalls($rootScope.user.extension.extension_uuid);
                $rootScope.missedCalls = 0;
            });

        callHistoryService.getAgencyCallHistory()
            .then(function(history) {
                removeLwbCalls(history);
                $rootScope.agencyCallHistoryData = history;
            });
    }

    function removeLwbCalls(history) {
        _.remove(history, function(callItem) {
            return callItem.caller_id_number === "0000000000";
        });
    };

    contactService.registerOnContactLoadCallback(function() {
        loadCallHistory();
    });

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
    /*callHistoryService.retrieveCallHistory()
        .then(function(history) {
            $rootScope.callHistoryRST = history;
            //reset missed call count
            dataFactory.getResetMissedCalls($rootScope.user.extension.extension_uuid);
            $rootScope.missedCalls = 0;
        });

    $timeout(function() {
        if ($rootScope.callHistory.totalResults > $rootScope.callHistory.perPage) {
            $rootScope.callHistory.page = 2;
            callHistoryService.retrieveCallHistory()
                .then(function(history) {
                    $rootScope.callHistoryRST.push.apply($rootScope.callHistoryRST, history);
                    if (__env.enableDebug) console.log("COMPLETE CALL HISTORY");
                    if (__env.enableDebug) console.log($rootScope.callHistoryRST);
                });
        }
    }, 4000);*/

    $scope.pageChanged = function() {
        var startPos = ($scope.currentPageCallHist - 1) * $scope.entryLimitCallHist;
        if (__env.enableDebug) console.log($scope.currentPageCallHist);
    };

    /************ CALL FUNCTION TO GET CALL HISTORY **************/
    /************/ //$rootScope.functGetCallHistory($rootScope.user.id);  /*****************/
    /**********************************************************/


    $scope.audioPlaying = null;
    $rootScope.playRecording = function(audiofile) {
        $scope.audio = new Audio(symphonyConfig.audioUrl + audiofile);
        $scope.audioPlaying = audiofile;
        $scope.audio.play();
    };
    $rootScope.playVoicemail = function(voicemail) {
        var pos = voicemail.indexOf('voicemails');
        if (__env.enableDebug) console.log(voicemail.substring(pos));
        $scope.audio = new Audio(symphonyConfig.audioUrl + voicemail.substring(pos));
        $scope.audioPlaying = voicemail;
        $scope.audio.play();
    };
    $rootScope.stopPlaying = function() {
        $scope.audio.pause();
        $scope.audioPlaying = null;
    };

    $scope.formatDate = function(date) {
        var dateOut = new Date(date);
        return dateOut;
    };

    $scope.formatTime = function(time) {
        var hours = Math.floor(time / 3600);
        var minutes = Math.floor((time % 3600) / 60);
        var seconds = time % 60;

        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        return (hours + ":" + minutes + ":" + seconds);
    };


    //******** FILTER Y PAGINATION  **************//  
    $scope.filter = function() {
        $timeout(function() {
            $scope.filteredItemsCallHist = $scope.filtered.length;
        }, 100);
    };
    $scope.sort_by = function(predicate) {
        $scope.predicate = predicate;
        $scope.reverse = !$scope.reverse;
        //colResal = predicate;  
    };

    $scope.getIcon = function(column) {
        return 'glyphicon-chevron-down';
    };

    $scope.showBtnDelCalls = false;
    $scope.callsSelected = [];
    $scope.showCallSelected = {};

    $scope.callSelected = function(callUuid) {
        if ($scope.showCallSelected[callUuid]) {
            delete $scope.showCallSelected[callUuid];
        } else {
            $scope.showCallSelected[callUuid] = true;
        }
    };

    $scope.hasSelections = function() {
        var array = usefulTools.convertObjectToArray($scope.showCallSelected);
        return array.length > 0;
    };

    $scope.deleteCallSelected = function() {
        var array = [];
        angular.forEach($scope.showCallSelected, function(value, key) {
            if (value === true) array.push(key);
        });
        var deleteConfirm = $mdDialog.confirm()
            .title('Are you sure you want to delete the ' + array.length +
                ' select calls?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Cancel');
        $mdDialog.show(deleteConfirm).then(function() {
            var data = {
                calls: array
            };
            dataFactory.postSoftDeleteCallHistory(data)
                .then(function(response) {
                    $scope.showalerts(response);
                    angular.forEach(array, function(call) {
                        var index = $filter('getByUUID')($scope.callHistoryData,
                            call, 'call_history_fs');
                        if (index !== null) $scope.callHistoryData.splice(
                            index, 1);
                    });
                    $scope.showCallSelected = {};
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        }, function() {
            $scope.showCallSelected = {};
        });

    };

    $scope.makeCall = function(number) {
        callService.tryToMakeCall(number);
    };

    $scope.openSmsModal = function(call, contact) {
        var number = '';
        if(contact && $scope.getSmsNumber(contact)){
            number = $scope.getSmsNumber(contact);
        } else if(call.call_direction == 'outbound'){
            number = call.destination_number;
        } else if(call.call_direction == 'inbound'){
            number = call.caller_id_number;
        }
        var data = {
            smsnumber: number,
            message: ''
        };
        $rootScope.showModalWithData('/sms/sendsmstop.html', data);
    };

    function closeModal() {
        $rootScope.closeModal();
        $rootScope.$broadcast('stop.audio');
    }

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

    $scope.openChannel = function(channel) {
        $location.path('/chatplus');
        newChatService.setCurrentChannel(channel);
    };

    $scope.createDirectMessage = function(member) {
        console.log(member);
        var channel = newChatService.getDMChannelByUserId(member.id);
        if (channel && !channel.showDirect) {
            $location.path('/chatplus');
            newChatService.activateDirectChannel(channel, member.id);
            $rootScope.showSuccessAlert('Your direct message channel has been created.');
            $uibModalStack.dismissAll();
        } else if (!channel) {
            newChatService.createDirectChannel(member)
                .then(function(response) {
                    console.log(response);
                    if (response) {
                        $scope.openChannel(response);
                        $rootScope.showSuccessAlert(
                            'Your direct message channel has been created.');
                    } else {
                        $rootScope.showErrorAlert(
                            'There was a problem creating the direct message channel.'
                        );
                    }
                    $uibModalStack.dismissAll();
                });
        }
    };

    $scope.showBlackListModal = function(activeTab, call) {
        var data = {
            number_to_filter: call ? usefulTools.cleanPhoneNumber(call.contact_number) : null,
            extension_uuid: $rootScope.user.extension.extension_uuid,
            reach: 'user',
            domain_uuid: $rootScope.user.domain_uuid,
            access: null,
            user_uuid: $scope.emulatedUser() ? $scope.emulatedUser() : $rootScope.user
                .id,
            closeModal: closeModal,
            activeTab: activeTab
        };
        dataFactory.getCallersBlacklist($rootScope.user.domain_uuid).then(function(
            response) {
            if (response.data.success) {
                // var blacklist = response.data.success.data.filter(function(item){
                //     return (item.user_uuid===null && item.extension_uuid===null) || item.user_uuid===$rootScope.user.user_uuid;
                // });
                var blacklist = response.data.success.data
                data.blacklist = blacklist;
                $rootScope.showModalFull('/modals/callers-blacklist-modal.html',
                    data, 'lg');
            }
        });
    };
});
