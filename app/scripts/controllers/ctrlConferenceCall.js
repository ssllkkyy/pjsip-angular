'use strict';

proySymphony.controller('ConferenceCallCtrl', function($scope, userService, conferenceService,
    usefulTools, $uibModalStack, $rootScope, __env, symphonyConfig, dataFactory, $filter,
    $interval, callService, contactService, $mdDialog, $timeout) {

    var cs = conferenceService;
    $scope.eventTimer = {};
    $scope.didNumber = null;
    $rootScope.didnumber = null;
    $scope.participants = "";
    $scope.confName = $rootScope.user.username;
    $rootScope.contactSelectionType = 'conference';
    $scope.showScreenShare = false;
    $scope.showCounter = false;
    $scope.eventTargetRange = 'day';

    /****** New Confernce Calling Methods  */

    $scope.vars = {
        conferenceUuid: null,
        locationUuid: null,
        callerIdNum: null
    };

    function init() {
        $scope.infoLoading = true;
        cs.getConferenceSetup(true)
            .then(function(response) {
                if (response) {
                    $scope.vars = {
                        conferenceUuid: response.conference_room_uuid,
                        locationUuid: response.location_group_uuid,
                        callerIdNum: response.conference_did
                    };
                    $scope.infoLoading = false;
                }
            });
    };

    init();

    $scope.locations = function() {
        return usefulTools.convertObjectToArray(cs.availLocations);
    };

    $scope.conferences = function() {
        return cs.availConferenceRooms;
    };

    $scope.availDids = function() {
        return cs.availDids;
    };

    $scope.currentConference = function() {
        return cs.currentConference;
    };

    $scope.currentLocation = function() {
        return cs.currentLocation;
    };

    $scope.changeLocation = function(location_group_uuid) {
        cs.setCurrentLocation(location_group_uuid);
    };

    $scope.changeConference = function(conferenceUuid) {
        cs.setCurrentConference(conferenceUuid);
    };

    $scope.showConferenceName = function() {
        if (cs.currentConference) {
            var conference = cs.currentConference;
            return conference.conference_title + ' - Ext: ' + conference.mod_extension;
        }
        return null;
    };

    $scope.conferenceAvailable = function() {
        if (cs.currentConference){
            return cs.currentConference.available;
        }
    };

    $scope.isUserConferenceMod = function() {
        
        // if (!cs.currentConference || !cs.currentConference.members) return false;
        var userExt = $rootScope.user.user_ext;
        var i, input = cs.currentConference.members;
        if (cs.currentConference.members === null){
            return true;
        } else if (cs.currentConference.members) {
            
            for (i = 0; i < input.length; i += 1) {
                if (input[i].cidNumber === userExt && input[i].flags.indexOf(
                        'moderator') >= 0) return true;
            }
        }
        return false;
    }

    $rootScope.$on('conference.info.change', function($event, conference) {
        $scope.vars = {
            conferenceUuid: conference.conference_room_uuid,
            locationUuid: conference.location_group_uuid,
            callerIdNum: conference.conference_did
        };
    });

    $rootScope.$on('end.conference.call', function($event) {
        endConferenceCall();
    });

    $rootScope.$on('conference.call.started', function($event) {
        
    //     $scope.loadMembers = $interval(function() {
    //         console.log("CONF CALL STARTED REFRESH CALLED");
    //         // refreshConferenceUsers();
    //     }, 5000);
    });

    $rootScope.$on('conference.call.ended', function($event) {
        if ($scope.loadMembers) $interval.cancel($scope.loadMembers);
        $scope.showCounter = false;
    });

    $rootScope.$on('start.recording', function($event, action) {
        cs.recordingConference = action;
    });

    $scope.$on('$destroy', function() {
        if ($scope.loadMembers) $interval.cancel($scope.loadMembers);
    });

    $scope.onActiveConferenceCall = function() {
        return callService.onConferenceCall();
    };

    function refreshConferenceUsers() {
        console.log("REFRESH CONFERENCE USERS", cs.currentConference);
        cs.getMemberList(cs.currentConference.conference_room_uuid);
    };

    $scope.disableActionButtons = function(count) {
        if (!count) count = 2;
        return !$scope.conferenceCallActive() ||
            (cs.currentConference &&
                cs.currentConference.members &&
                cs.currentConference.members.length < count);
    };

    $scope.toggleConference = function() {
        if ($scope.conferenceCallActive()) {
            endConferenceCall();
        } else {
            startConferenceCall();
        }
    };

    function endConferenceCall() {
        $scope.showCounter = false;
        cs.currentConference.available = true;
        $scope.onConferenceCall = false;
        cs.endConference();
    };

    function startConferenceCall() {
        $scope.onConferenceCall = true;
        cs.currentConference.available = false;
        $scope.showCounter = true;
        $scope.eventTimer.startConf = new Date();
        callService.makeCall($scope.currentConference().mod_extension);
        cs.startConference();
    };

    $scope.addParticipants = function() {
        var participants = '';
        var contacts = $rootScope.contactsSelected;
        if (contacts.length > 0) {
            angular.forEach(contacts, function(participant) {
                participants += usefulTools.cleanPhoneNumber(participant.contact_mobile_number) +
                    ',';
            });
            participants = participants.substring(0, participants.length - 1);
        }
        $scope.callingParticipants = true;
        cs.addParticipantsToConference(participants, $scope.vars.callerIdNum)
            .then(function(response) {
                $rootScope.contactsSelected = [];
                $rootScope.contactsSelected2 = [];
                $rootScope.$broadcast('clear.contactSelector');
                $scope.callingParticipants = false;
                if (response !== true) {
                    $rootScope.showErrorAlert(response);
                }
            });
    };

    function processNewConference(info) {
        if (!info.conf_name)
            cs.doProcessNewConference(info)
            .then(function(response) {
                if (response) {

                }
            })
    }

    $scope.isAdminGroupOrGreater = function() {
        return userService.isAdminGroupOrGreater();
    };

    $scope.setupNewConference = function() {
        // dataFactory.getDaysRemain($rootScope.user.domain_uuid) 
        // .then(function(response){
        //     console.log(response.data);
        //     var info = response.data.success.data;
        // var per_conference = parseFloat($rootScope.user.package.per_conference).toFixed(2);
        // var charge = (per_conference * parseFloat(info.remain)/parseFloat(info.days)).toFixed(2);
        var html = '';
        // if (info.freePeriod) {
        //     html = 'As your agency is currently in a free trial there is no charge today to add this conference. You will be charged '+$filter('currency')(per_conference)+'/month for this room moving forward. ';
        // } else {
        //     html = 'A pro-rated charge of '+$filter('currency')(charge)+'* will be added to your next monthly bill for an additional conference room. You will be charged '+$filter('currency')(per_conference)+'/month for this room moving forward. '
        // }
        // var confirm = '<p>Please confirm you would like to create this conference room. '+html+'</p>';
        // confirm += '<p>If you would like to proceed, please enter a name for the new conference room below and click "I agree".</p>';
        // confirm += '<p style="font-size: 12px;">* $'+per_conference+'/line x ' + info.remain + ' days remaining in this month / ' + info.days + ' days this month</p>';
        // confirm += '<h4>Conference Name</h4>';
        var message =
            '<p>You are creating a new conference room within this Location. Please enter a name for the new conference room below and click "I agree" to proceed.</p>';
        var confirm = $mdDialog.prompt()
            .title('Creating Conference Room')
            .htmlContent(message)
            .ok('Yes')
            .cancel('Nevermind');
        $mdDialog.show(confirm)
            .then(function(name) {
                if (name) {
                    var spin = {
                        title: 'Creating Conference Room'
                    };
                    $rootScope.showModalFull('/modals/workingspinner.html', spin,
                        'xs');
                    var data = {
                        confName: name,
                        locationUuid: cs.currentLocation
                    };
                    cs.createNewConferenceRoom(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            $uibModalStack.dismissAll();
                            spin = null;
                        });
                } else {
                    $rootScope.showErrorAlert(
                        'You did not specify a conference room name so we could not create the new room.'
                    );
                    $uibModalStack.dismissAll();
                    spin = null;
                }

            });
        // });
    };

    $scope.removeConference = function() {
        // dataFactory.getDaysRemain($rootScope.user.domain_uuid) 
        // .then(function(response){
        //     var info = response.data.success.data;

        // var per_conference = parseFloat($rootScope.user.package.per_conference).toFixed(2);
        // var charge = (per_conference * parseFloat(info.remain)/parseFloat(info.days)).toFixed(2);
        // var html = '';
        // if (info.freePeriod) {
        //     html = 'As your agency is currently in a free trial there is no credit or charge today to remove this conference.';
        // } else {
        //     html = 'A pro-rated credit of '+$filter('currency')(charge)+'* included on your next monthly bill.'
        // }
        // var confirm = '<p>Please confirm you would like to delete the ' + cs.currentConference.conference_title + ' room.'+html+'</p>';
        // if (!info.freePeriod) confirm += '<p style="font-size: 12px;">* $'+per_conference+'/line x ' + info.remain + ' days remaining in this month / ' + info.days + ' days this month</p>';
        var message = 'Please confirm you would like to remove this conference room.';
        var confirm = $mdDialog.confirm()
            .title('Deleting Conference Room')
            .htmlContent(message)
            .ok('Yes')
            .cancel('Nevermind');
        $mdDialog.show(confirm)
            .then(function() {
                var spin = {
                    title: 'Deleting Conference Room'
                };
                $rootScope.showModalFull('/modals/workingspinner.html', spin, 'xs');
                cs.removeCurrentConferenceRoom()
                    .then(function(response) {
                        $rootScope.showalerts(response);
                        $uibModalStack.dismissAll();
                        spin = null;
                    });
            });
        // });
    };

    $scope.toggleParticipantMute = function(participant) {
        var action = $scope.participantIsMuted(participant) ? 'unmute' : 'mute';
        cs.toggleParticipantMute(action, participant.userNumber)
            .then(function(response) {
                // console.log("TOGGLE PARTICIPANT MUTE REFRESH CALLED");
                // ***III
                refreshConferenceUsers();
            });
    };

    $scope.participantIsMuted = function(participant) {
        if (participant)
            return participant && participant.flags && participant.flags.indexOf(
                'speak') < 0;
    };

    $scope.hangupParticipant = function(userNumber) {
        cs.hangupParticipant(userNumber)
            .then(function(response) {
                // console.log("HUNG PARTICIPANT REFRESH");
                // ***III
                // refreshConferenceUsers();
            });
    };

    $scope.toggleLockStatus = function() {
        if (cs.conferenceLocked) {
            cs.unlockConference();
        } else {
            cs.lockConference();
        }
    };

    $scope.conferenceLocked = function() {
        return cs.conferenceLocked;
    };

    $scope.toggleMuteAll = function() {
        if (cs.muteall) {
            cs.unmuteAllConference();
        } else {
            cs.muteAllConference();
        }
        // console.log("MUTE ALL TOGGLE REFRESH CALLED");
        // ***III
        refreshConferenceUsers();
    };

    $scope.muteAll = function() {
        return cs.muteall;
    };

    $scope.toggleRecording = function() {
        if (cs.recordingConference) {
            callService.stopRecording();
            cs.recordingConference = false;
        } else {
            
            callService.recordCall();
            cs.recordingConference = true;
        }
    };

    $scope.recordingConference = function() {
        return cs.recordingConference;
    };

    $scope.toggleScreenShare = function() {
        $scope.showScreenShare = !$scope.showScreenShare;
    };

    $scope.eventFilter = function(event) {
        var range = $scope.eventTargetRange;
        var date = moment(event.start_at);
        if (date.isBefore(new Date(), 'day')) return false;
        if (range !== 'all') {
            return date.isSame(new Date(), range);
        } else {
            return true;
        }
        return false;
    };

    $scope.filterConferences = function() {
        var array = [];
        angular.forEach(cs.availConferenceRooms, function(conference) {
            if (conference.location_group_uuid === $scope.vars.locationUuid)
                array.push(conference);
        });
        return array;
    };

    $scope.showEventFilterQualifier = function() {
        if ($scope.eventTargetRange === 'day') return ' for Today';
        if ($scope.eventTargetRange === 'week') return ' for This Week';
        if ($scope.eventTargetRange === 'month') return ' for This Month';
        return null;
    };

    $scope.changeEventFilter = function(range) {
        $scope.eventTargetRange = range;
    };

    $scope.deleteEvent = function(event) {
        var confirmDelete = $mdDialog.confirm()
            .title('Are you sure you want to delete this event?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');
        $mdDialog.show(confirmDelete).then(function() {
            dataFactory.deleteConferenceEvent(event.events_schedule_uuid)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        cs.currentConference.events.splice((cs.currentConference
                            .events.indexOf(event)), 1);
                    }
                });
        });
    };

    $scope.showCalendarModal = function() {
        $rootScope.showModalFull('/calls/conferencecalendarmodal.html');
    };

    $scope.startEvent = function(event) {
        startConferenceCall();
        $timeout(function() {
            dataFactory.getMarkEventStarted(event.events_schedule_uuid);
            cs.addParticipantsToConference(event.participants, event.call_from_did)
                .then(function(response) {
                    console.log(response);
                });
        }, 5000);
    };

    $scope.showUserName = function(event) {
        var user = contactService.getContactByUserUuid(event.user_uuid);
        if (user) {
            return 'Creator: ' + user.name;
        }
        return null;
    };

    $scope.conferenceCallActive = function() {
        // console.log(callService.onFullConferenceCall());
        return callService.onFullConferenceCall();
    };

    $scope.hasContacts = function() {
        return $rootScope.contactsSelected && $rootScope.contactsSelected.length > 0;
    };

    $scope.startButtonTooltip = function() {
        if (callService.onFullConferenceCall()) {
            return 'Disconnect all calls';
        } else {
            return 'Start conference before entering phone numbers';
        }
    };

    $scope.showParticipants = function(event) {
        var array = event.participants.split(',');
        var string = '';
        angular.forEach(array, function(item) {
            string += $filter('tel')(item) + ', ';
        });
        return string.substring(0, string.length - 2);
    };

    $scope.theContact = function(member) {
        var number = $scope.cleanFormat(member);
        return contactService.getContactByPhoneNumber(number);
    };

    $scope.searchContactInfo = function(phoneNumber) {
        var phoneNumber = $scope.cleanFormat(phoneNumber);
        var varImage = null,
            varName = null,
            phsNumb = phoneNumber;
        var symphonyURL = __env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl :
            symphonyConfig.symphonyUrl;
        var contact = contactService.getContactByPhoneNumber(phoneNumber);
        if (contact) {
            varName = contact.name;
            varImage = contact.im;
        }
        varName = (varName !== null ? varName : 'Contact unregistered');
        var varContactInfo = {
            name: varName,
            avatar: varImage
        };

        return varContactInfo;

    };

    $scope.cleanFormat = function(member) {
        if (member && member.cidNumber) {
            var number = member.cidNumber;
            var varArray = number.split('@');
            return varArray[0];
        }
        return null;
    };

    $scope.iconStartConf = function() {
        if ($scope.conferenceCallActive()) {
            return "faa-spin animated";
        } else {
            return "fa-gear";
        };
    };

    /***** End New Conference Calling Methods */



    // $rootScope.textDisplay = "Today";
    // $rootScope.showdate = false;

    // $scope.getTodaysSchedule = function() {
    //     $rootScope.textDisplay = "for Today";
    //     $rootScope.showdate = false;
    //     $rootScope.todaysSchedule = [];
    //     dataFactory.getTodaysSchedule()
    //         .then(function(response) {
    //             if(response.data.success)
    //             {
    //                 angular.copy(response.data.success.data, $rootScope.todaysSchedule);
    //             }
    //         });
    // };

    // $scope.getWeeksSchedule = function() {
    //     $rootScope.textDisplay = "for This Week";
    //     $rootScope.showdate = true;
    //     $rootScope.todaysSchedule = [];
    //     dataFactory.getWeeksSchedule()
    //         .then(function(response) {
    //             if(response.data.success)
    //             {
    //                 angular.copy(response.data.success.data, $rootScope.todaysSchedule);
    //             }
    //         });
    // };

    // $scope.getMonthsSchedule = function() {
    //     $rootScope.textDisplay = "for This Month";
    //     $rootScope.showdate = true;
    //     $rootScope.todaysSchedule = [];
    //     dataFactory.getMonthsSchedule()
    //         .then(function(response) {
    //             if(response.data.success)
    //             {
    //                 angular.copy(response.data.success.data, $rootScope.todaysSchedule);
    //             }
    //         });
    // };

    // $scope.getAllEvents = function() {
    //     $rootScope.textDisplay = "";
    //     $rootScope.showdate = true;
    //     $rootScope.todaysSchedule = [];
    //     dataFactory.getConferenceEvents()
    //         .then(function(response) {
    //             if(response.data.success)
    //             {
    //                 angular.copy(response.data.success.data, $rootScope.todaysSchedule);
    //             }
    //         });
    // };

    // callService.registerOnCallEndCallback(function() {
    //     $scope.startConferenceInAction = false;
    // });

    // callService.registerOnCallAddedCallback(function() {
    //     $scope.startConferenceInAction = false;
    // });

    // callService.registerOnMakeCallFailedCallbacks(function() {
    //     $scope.startConferenceInAction = false;
    // });

    // $scope.startConference = function() {
    //     if (!$scope.startConferenceInAction) {
    //         $scope.startConferenceInAction = true;
    //         if($scope.didNumber == null)
    //         {
    //             $rootScope.alerts.push({error: true, message: 'Please Select Conference DID.'});
    //         }
    //         else{
    //             $rootScope.didnumber = $scope.didNumber;
    //             dataFactory.listConferenceUsers($scope.domainName)
    //                 .then(function(response) {
    //                     console.log(response.data);
    //                     if(!callService.outgoingCall() && (!response.data.userList || response.data.userList.length === 0)){
    //                         $rootScope.onConferenceCall = true;

    //                         // TODO: Make Call To Moderator Extension
    //                         callService.makeCall($scope.confExtension);

    //                         $scope.startStopConfToolTip = 'Disconnect all calls';
    //                         $scope.startStopConfBtn = 'Stop conference';
    //                         $scope.showCounterTime = true;
    //                         $scope.eventTimer.startConf = new Date();
    //                     } else {
    //                         $rootScope.onCallWith = false;
    //                         $rootScope.confcalloptions = 'start';
    //                         var varModera, varNumb, varIsMyConf = false;

    //                         $rootScope.didnumber = null;

    //                         response.data.userList.forEach(function(entry){
    //                             if (entry.cidNumber=== $rootScope.user.user_ext){
    //                                 varModera=entry.cidName;
    //                                 varNumb=entry.cidNumber;
    //                                 varIsMyConf = true;
    //                                 return true;
    //                             }
    //                         });

    //                         if (varIsMyConf) {

    //                             setUiToOffConference();
    //                             $scope.endConference();

    //                             $scope.startConferenceInAction = false;
    //                         } else {
    //                             var varModera, varNumb;

    //                             response.data.userList.forEach(function(entry){
    //                                 console.log(entry);
    //                                 if (entry.flags.substring(entry.flags.length - 9, entry.flags.length)==='moderator'){
    //                                     varModera=entry.cidName;
    //                                     varNumb=entry.cidNumber;
    //                                     return true;
    //                                 }
    //                             });
    //                             $rootScope.alerts.push({type: 'danger', msg: 'Sorry the conference room is being used by:  ' + varModera + '  Ext: ( ' + varNumb + ' ) '});
    //                             $scope.startConferenceInAction = false;
    //                         }
    //                     }
    //                 });

    //         }
    //     }
    // };

    // function setUiToOffConference() {
    //     $rootScope.onConferenceCall = false;
    //     $scope.startStopConfToolTip = 'Start conference before entering phone numbers';
    //     $scope.startStopConfBtn = 'Start conference';

    //     if($rootScope.clickBtn3) {
    //         $scope.recordingStopConference();
    //         $rootScope.clickBtn3 = false;
    //         $rootScope.toolRecording = 'Start recording';
    //     }
    //     if($scope.clickBtn4) {
    //         $scope.unMuteAllConference();
    //         $rootScope.clickBtn4 = false;
    //         $rootScope.toolMute = 'Unmute everyone';
    //         $rootScope.iconMuteCC = 'mdi-headset ';
    //     }
    //     if($scope.clickBtn5) {
    //         $scope.unLockConference();
    //         $rootScope.clickBtn5 = false;
    //         $rootScope.toolLock = 'Lock conference';
    //         $rootScope.iconLock = 'mdi-lock-open mdi-24px';
    //     }

    //     $scope.showCounterTime = false;
    //     $rootScope.clickBtn1 = false;
    //     $rootScope.clickBtn2 = false;
    //     $rootScope.clickBtn3 = false;
    //     $rootScope.clickBtn4 = false;
    //     $rootScope.clickBtn5 = false;
    //     $rootScope.participants = '';
    // }



    // var formatParticipants = function(participantsStr) {
    //     console.log(participantsStr);
    //     var participants = participantsStr.split(',');
    //     participants = $.map(participants, function(participant) {
    //         return participant.replace(/[^0-9]/g, '');
    //     });
    //     return participants.join(',');
    // };







    // $scope.buttonsAction = function(btn) {
    //     angular.element('#participants').focus();

    //     if (btn===0) {

    //         if(!$rootScope.onConferenceCall){

    //             $rootScope.startStopConfToolTip = ;
    //             $rootScope.startStopConfBtn = 'Stop conference';
    //             $rootScope.showCounterTime = true;
    //             $scope.eventTimer.startConf = new Date();

    //             $scope.startConference();

    //         } else {

    //             $rootScope.onConferenceCall = false;
    //             $rootScope.startStopConfToolTip = 'Start conference before entering phone numbers';
    //             $rootScope.startStopConfBtn = 'Start conference';

    //             $rootScope.showCounterTime = false;
    //             $rootScope.clickBtn1 = false;
    //             $rootScope.clickBtn2 = false;
    //             $rootScope.clickBtn3 = false;
    //             $rootScope.clickBtn4 = false;
    //             $rootScope.clickBtn5 = false;
    //             $rootScope.participants = '';
    //             $scope.endConference();
    //         }

    //     } else if(btn===1){
    //         $scope.addParticipantsToConference();
    //         $rootScope.clickBtn1 = true;
    //     } else if(btn===2){
    //         $rootScope.showScreenShare = !$rootScope.showScreenShare;
    //         if (!$rootScope.showScreenShare) {
    //             $rootScope.clickBtn2 = false;
    //             $rootScope.toolTipScreenS = 'Show ';
    //         } else {
    //             $rootScope.clickBtn2 = true;
    //             $rootScope.toolTipScreenS = 'Hide screen share options';
    //         }
    //     } else if(btn===3){

    //         if($rootScope.clickBtn3) {
    //             $scope.recordingStopConference();
    //             $rootScope.clickBtn3 = false;
    //             $rootScope.toolRecording = 'Start recording';
    //         } else {
    //             $scope.recordingStartConference();
    //             $rootScope.clickBtn3 = true;
    //             $rootScope.toolRecording = 'Stop recording';
    //         }

    //     } else if(btn===4){
    //         if($scope.clickBtn4) {
    //             $scope.unMuteAllConference();
    //             $rootScope.clickBtn4 = false;
    //             $rootScope.toolMute = 'Unmute everyone';
    //             $rootScope.iconMuteCC = 'mdi-headset mdi-24px';
    //         } else {
    //             $scope.muteAllConference();
    //             $rootScope.clickBtn4 = true;
    //             $rootScope.toolMute = 'Mute everyone';
    //             $rootScope.iconMuteCC = 'mdi-headset-off mdi-24px';
    //         }
    //     } else if(btn===5){

    //         if($scope.clickBtn5) {
    //             $scope.unLockConference();
    //             $rootScope.clickBtn5 = false;
    //             $rootScope.toolLock = 'Lock conference';
    //             $rootScope.iconLock = 'mdi-lock-open ';
    //         } else {
    //             $scope.lockConference();
    //             $rootScope.clickBtn5 = true;
    //             $rootScope.toolLock = 'Unlock conference';
    //             $rootScope.iconLock = 'mdi-lock mdi-24px';
    //         }
    //     }
    // };



});
