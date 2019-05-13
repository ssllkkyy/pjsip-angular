'use strict';

proySymphony.controller('ctrlAutoAttendant', function($scope, $window, $mdToast, ngAudio, $auth,
    $mdDialog, $filter, __env, Idle, $interval, $uibModal, Keepalive, $rootScope,
    $routeParams, tooltipsService, userService, usefulTools, dataFactory, $timeout,
    $uibModalStack, recordingService, contactService, symphonyConfig) {

    //Initialization
    $scope.sendToOpts = [{
            name: "Dial By Name",
            tip: ""
        },
        {
            name: "Transfer to an Extension",
            tip: "Select only one person"
        },
        {
            name: "Transfer to External Number",
            tip: "Send to a specific number"
        },
        {
            name: "Ring Group",
            tip: "Group"
        },
        {
            name: "Send to Voicemail",
            tip: "Send to specified voicemail extension"
        }
    ];
    $scope.tips = tooltipsService.tips;
    $scope.showExtras = true;
    $scope.uploadingLibrary = false;
    $scope.showAddOptions = false;
    $scope.selectedAttendant = {};
    $rootScope.jsonObject = {};
    $scope.myOptions = {
        ivr_menu_uuid: ""
    };
    $rootScope.myAttendants = [];
    $rootScope.optionsList = [];
    $rootScope.currentIndex = 0;
    $scope.weeklyHours = [];
    $scope.holidayHours = [];
    $rootScope.usedDid = [];
    $scope.ivrMenuVoicemails = [];
    $scope.aaWorking = {};
    $rootScope.usedDid1 = [];
    $rootScope.openTab = '';
    $rootScope.currentTab = null;
    $scope.loadingAttendants = false;
    $scope.loadingRinggroups = true;
    $scope.selectingGreeting = null;
    $scope.userList = {
        selected: null,
        items: []
    };

    $scope.oneAtATime = true;
    initTabs();

    $scope.setOpenTab = function(block) {
        console.log(block);
        $scope.openTab = block;
    };

    $scope.editPrimaryDid = function(attendant) {
        $scope.editingDid = attendant.ivr_menu_uuid;
        $scope.newPrimaryDid = attendant.ivr_phone;
    };

    $scope.cancelEditPrimaryDid = function() {
        $scope.editingDid = null;
        $scope.newPrimaryDid = null;
    };

    $scope.editLocationGroup = function(attendant) {
        $scope.editingLocation = attendant.ivr_menu_uuid;
        $scope.newLocation = attendant.location_group_uuid;
    };

    $scope.cancelEditLocation = function() {
        $scope.editingLocation = null;
        $scope.newLocation = null;
    };

    $scope.deleteBasicAttendant = function(attendant) {
        var deleteConfirm = $mdDialog.confirm()
            .title('Are you sure you want to Delete this Auto Attendant?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(deleteConfirm).then(function() {
            dataFactory.getDeleteBasicAttendant(attendant.ivr_menu_uuid)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        var index = $filter('getByUUID')($rootScope.myAttendants,
                            attendant.ivr_menu_uuid, 'ivr_menu');
                        if (index !== null) $rootScope.myAttendants.splice(
                            index, 1);
                    } else {
                        if (__env.enableDebug) console.log(response.data.error
                            .message);
                    }
                });
        });
    };

    $scope.savePrimaryDid = function(attendant, newdid) {
        var data = {
            ivr_menu_uuid: attendant.ivr_menu_uuid,
            did: newdid,
            domain_uuid: attendant.domain_uuid
        };
        dataFactory.postUpdateAttendantDid(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    attendant.ivr_phone = newdid;
                } else {
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
                $scope.cancelEditPrimaryDid();
            });
    };

    $scope.saveLocationGroup = function(attendant, newLocation) {
        var data = {
            ivr_menu_uuid: attendant.ivr_menu_uuid,
            location_group_uuid: newLocation,
            domain_uuid: attendant.domain_uuid
        };
        dataFactory.postUpdateAttendantLocation(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    attendant.location_group_uuid = newLocation;
                } else {
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
                $scope.cancelEditLocation();
            });
    };

    $scope.showLocation = function(location_group_uuid) {
        var index = $filter('getByUUID')($scope.locationGroups, location_group_uuid,
            'locations_group');
        if (index !== null) return $scope.locationGroups[index].group_name;
        return null;
    };

    $scope.userList2 = {
        selected: null,
        items: []
    };
    $rootScope.availableContacts = [];
    $rootScope.newIvr = {};
    $scope.menu = {
        main: true,
        create: false
    };
    $scope.domain = $rootScope.user.domain;
    $scope.domain_uuid = $rootScope.user.domain_uuid;

    dataFactory.getTimezones()
        .then(function(result) {
            $rootScope.timeZones = result.data;
            $window.localStorage.setItem("timeZones", JSON.stringify($rootScope.timeZones));
        });

    //Recording
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

    $scope.isKotterTechUser = function(contact) {
        return contactService.isKotterTechUser(contact);
    };


    $scope.aaEnabled = true;

    if ($rootScope.user.symphony_domain_settings.auto_attendant_visibility == 'false' && !
        $scope.isKotterTechUser($rootScope.user)) {
        $scope.aaEnabled = false;
    }

    $scope.recordingService = recordingService;

    $scope.checkIfExisting = function() {
        var exists = false;
        console.log($scope.myAttendants);
        console.log($rootScope.newIvr.did);
        angular.forEach($scope.myAttendants, function(attendant) {
            console.log(attendant.did.phone);
            if (!exists && $rootScope.newIvr.did.phone === attendant.did.phone) {
                console.log($rootScope.newIvr.did);
                $rootScope.newIvr.did = {};
                exists = true;
                $rootScope.showErrorAlert(
                    'Selecting this number will create a new Auto Attendant on top of an existing Attendant. If you wish to do this please use the Clone Option from the main table instead.'
                );
            }
        });
    };

    function checkIfUsed(number) {
        var exists = false;
        angular.forEach($scope.myAttendants, function(attendant) {
            angular.forEach(attendant.dids, function(did) {
                if (!exists && did && did.did_number === number.destination_number) {
                    exists = true;
                }
            });
        });
        return exists;
    };

    function checkCurrentSecondary(number) {
        var exists = false;
        angular.forEach($rootScope.newIvr.secondaryNumbers, function(did) {
            if (!exists && did && did.did_number === number.destination_number) {
                exists = true;
            }
        });
        return exists;
    }

    $scope.usableAaDid = function(did) {
        return (did.destination_number !== $rootScope.newIvr.did.phone) &&
            !checkIfUsed(did) &&
            !checkCurrentSecondary(did) &&
            (did.info.ext && did.info.ext.length < 7)
    };

    $scope.audioFilePlaying = null;
    $scope.recordingPlaying = false;
    $scope.playRecording = function(file) {
        console.log(file);
        $rootScope.showAudioModal(file, 'ivr-greeting');
    };
    $scope.playAudioFile = function(file, uuid) {
        $scope.audioFilePlaying = uuid;
        var url = __env.apiUrl ? __env.apiUrl : symphonyConfig.audioUrl;
        $scope.audio = new Audio(url + file);
        $scope.recordingPlaying = true;
        $scope.audio.play();
    };
    $scope.stopPlaying = function() {
        $scope.audio.pause();
        $scope.audioFilePlaying = false;
        $scope.recordingPlaying = false;
    };
    $scope.currentVoicemailGreeting = function(greeting) {
        return $rootScope.newIvr.vmgreeting && greeting.voicemail_greeting_uuid ===
            $rootScope.newIvr.vmgreeting.voicemail_greeting_uuid;
    };
    $scope.cancelAddAudio = function() {
        $scope.opcBroadcast = null;
    };

    function loadAudioLibrary() {
        dataFactory.getAudioLibrary('ivrgreeting').then(function(response) {
            if (response.data.success) {
                console.log('Greetings LOADED');
                console.log(response.data.success);
                $scope.audioLibrary = response.data.success.data;
            } else if (response.data.error) {
                console.log(response.data.error.message);
            }
        });
    }

    loadAudioLibrary();

    function loadVoicemailGreetings() {
        console.log($rootScope.newIvr);
        dataFactory.getVoicemailGreetingsById($scope.domain_uuid, $rootScope.newIvr.did.ext)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    console.log("AUDIO LIBRARY");
                    console.log(response.data.success);
                    $scope.voicemailGreetings = response.data.success.data;

                    console.log($scope.voicemailGreetings);
                } else {
                    console.log(response.data.error.message);
                }
            });
    }

    $scope.uploadAudioFile = function(file, title) {
        $scope.uploadingLibrary = true;
        var fd = new FormData();
        //Take the first selected file
        console.log($scope.domain_uuid);
        console.log(file);
        // debugger;
        fd.append("recording", file);
        fd.append("domain_uuid", $scope.domain_uuid);
        fd.append('category', 'ivrgreeting');
        if ($scope.aaEnabled) fd.append('ivr_menu_uuid', $rootScope.newIvr.ivr_menu_uuid);
        fd.append('title', title);
        console.log(fd);
        dataFactory.postUploadAttendantGreeting(fd)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    $scope.uploadingLibrary = false;
                    $rootScope.showSuccessAlert(response.data.success.message);
                    $scope.audioLibrary.push(response.data.success.data);
                    if ($scope.aaEnabled) $rootScope.newIvr.ivr_menu_greet_long =
                        response.data.success.data.original_filename;
                    $scope.opcBroadcast = null;
                    loadAudioLibrary();
                } else {
                    $scope.errorMessage = response.data.error.message;
                    console.log(response.data.error.message);
                }
            }, function(error) {
                console.log(error);
            });
    };

    $scope.uploadVoicemailAudio = function(file, title) {
        var file_title = (title ? title : null);
        var data = new FormData();
        data.append('recording', file);
        data.append('domain_uuid', $scope.domain_uuid);
        data.append('voicemail_id', $rootScope.newIvr.did.ext);
        data.append('title', file_title);
        dataFactory.postUploadAttendantVoicemailGreeting(data)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    $rootScope.showSuccessAlert(response.data.success.message);
                    $rootScope.newIvr.vmgreeting = response.data.success.data;
                    $scope.showVoicemailSelector = false;
                    $scope.opcBroadcast = null;
                    loadVoicemailGreetings();
                } else {
                    $scope.errorMessage = response.data.error.message;
                    console.log(response.data.error.message);
                }
            }, function(error) {
                console.log(error);
            });
    };

    $scope.selectVoicemailGreeting = function(greeting) {
        var data = {
            greeting_id: greeting.greeting_id,
            voicemail_id: $rootScope.newIvr.did.ext,
            domain_uuid: $rootScope.user.domain_uuid
        };
        dataFactory.postSetVoicemailGreetingId(data)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.newIvr.vmgreeting = greeting;
                    $scope.opcBroadcast = null;
                    $rootScope.showSuccessAlert(response.data.success.message);
                }
            });
    };

    $rootScope.saveToServer = function(index, title) {
        console.log(title);
        var file_title = (title ? title : null);
        if (index == 0) {
            var fd = new FormData();
            var recording = recordingService.blob;
            recording = new File([recording], "recording", {
                type: recording.type
            });
            // var recording = $rootScope.getaudioModel;
            fd.append("recording", recording);
            fd.append("domain_uuid", $scope.domain_uuid);
            fd.append('category', 'ivrgreeting');
            if ($scope.aaEnabled) fd.append('ivr_menu_uuid', $rootScope.newIvr.ivr_menu_uuid);
            fd.append('title', file_title);
            console.log(fd);
            dataFactory.postUploadAttendantGreeting(fd)
                .then(function(response) {
                    // debugger;
                    if (response.data.success) {
                        $rootScope.showSuccessAlert(response.data.success.message);
                        $scope.opcBroadcast = null;
                        if ($scope.aaEnabled) $rootScope.newIvr.ivr_menu_greet_long =
                            response.data.success.data.original_filename;
                        loadAudioLibrary();
                    } else {
                        $scope.errorMessage = response.data.error.message;
                    }
                }, function(error) {
                    $rootScope.alerts.push({
                        type: 'danger',
                        msg: 'Failure: ' + JSON.stringify(error)
                    });
                });
        } else {
            var data = new FormData();
            data.append('recording', $rootScope.getaudioModel);
            data.append('domain_uuid', $scope.domain_uuid);
            data.append('voicemail_id', $rootScope.newIvr.did.ext);
            data.append('title', file_title);
            // dataFactory.postUploadAudioFile(data)
            dataFactory.postUploadAttendantVoicemailGreeting(data)
                .then(function(response) {
                    console.log(response.data);
                    if (response.data.success) {
                        //$scope.successMessage = response.data.success.message;
                        $rootScope.showSuccessAlert(response.data.success.message);
                        $rootScope.newIvr.vmgreeting = response.data.success.data;
                        $scope.showVoicemailSelector = false;
                        $scope.opcBroadcast = null;
                        loadVoicemailGreetings();
                        //$scope.isActive = true;
                    } else {
                        $scope.errorMessage = response.data.error.message;
                        console.log(response.data.error.message);
                    }
                }, function(error) {
                    console.log(error);
                });
        }
    };

    var presetHolidays = {
        new_years_day: {
            preset: 'new_years_day',
            title: "New Year's Day",
            mon: '1',
            mday: '1',
            wday: null,
            group: 100,
            status: false
        },
        martin_luther_king_jr_day: {
            preset: "martin_luther_king_jr_day",
            title: "Martin Luther King Jr. Day",
            mon: '1',
            mday: '15-21',
            wday: '2',
            group: 105,
            status: false
        },
        presidents_day: {
            preset: "presidents_day",
            title: "Presidents Day",
            mon: '2',
            mday: '15-21',
            wday: '2',
            group: 110,
            status: false
        },
        memorial_day: {
            preset: "memorial_day",
            title: "Memorial Day",
            mon: '5',
            mday: '25-31',
            wday: '2',
            group: 115,
            status: false
        },
        independence_day: {
            preset: "independence_day",
            title: "Independence Day",
            mon: '7',
            mday: '4',
            wday: null,
            group: 120,
            status: false
        },
        labor_day: {
            preset: "labor_day",
            title: "Labor Day",
            mon: '9',
            mday: '1-7',
            wday: '2',
            group: 125,
            status: false
        },
        columbus_day: {
            preset: "columbus_day",
            title: "Columbus Day",
            mon: '10',
            mday: '8-14',
            wday: '2',
            group: 130,
            status: false
        },
        veterans_day: {
            preset: "veterans_day",
            title: "Veteran's Day",
            mon: '11',
            mday: '11',
            wday: null,
            group: 135,
            status: false
        },
        thanksgiving_day: {
            preset: "thanksgiving_day",
            title: "Thanksgiving Day",
            mon: '11',
            mday: '22-28',
            wday: '5-6',
            group: 140,
            status: false
        },
        christmas_day: {
            preset: "christmas_day",
            title: "Christmas Day",
            mon: '12',
            mday: '25',
            wday: null,
            group: 145,
            status: false
        }
    };

    $scope.hasPresets = function(ivr) {
        var hasPreset = false;
        angular.forEach(ivr.presetHolidays, function(holiday) {
            if (holiday.status) hasPreset = true;
        });
        return hasPreset;
    };

    $scope.hasWeekly = function() {
        var hasSchedule = false;
        angular.forEach($rootScope.scheduleType.weekly, function(day) {
            if (!day.disabled) hasSchedule = true;
        });
        return hasSchedule;
    };

    $scope.togglePresetStatus = function(holiday) {
        var count = 0;
        angular.forEach($rootScope.newIvr.presetHolidays, function(preset) {
            if (preset.status && preset.preset !== holiday.preset) count += 1;
        });
        console.log(count);
        if (!$scope.hasWeekly() && count === 0 && $rootScope.scheduleType.holiday.length ===
            0) {
            $rootScope.showErrorAlert(
                'You can not delete this holiday entry at this time because an auto attendant must have at least one day of the week with set hours, have one custom holiday created or one preset holiday enabled.'
            );
            $rootScope.newIvr.presetHolidays[holiday.preset].status = !holiday.status;
            return;
        }
        var data = {
            preset: holiday,
            attendant: $rootScope.newIvr,
        };
        console.log(data);
        //return;
        dataFactory.postTogglePresetHoliday(data)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.newIvr.presetHolidays[holiday.preset].status =
                        response.data.success.data;
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                    $rootScope.newIvr.presetHolidays[holiday.preset].status = !
                        holiday.status;
                }
            });
    };

    $rootScope.cancelCreateGroup = function() {
        var cancelConfirm = $mdDialog.confirm()
            .title(
                'Are you sure you want to cancel editing? Any unsaved changes will be lost.'
            )
            .ariaLabel('Cancel')
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(cancelConfirm).then(function() {
            $uibModalStack.dismissAll();
            $scope.cancelEditing();
        });
    };

    function doSelectLibraryItem(file) {
        var data = {
            ivr_menu_uuid: $rootScope.newIvr.ivr_menu_uuid,
            greeting: file
        };
        dataFactory.postChangeAaGreeting(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $scope.opcBroadcast = null;
                    var oldgreeting = $rootScope.newIvr.ivr_menu_greet_long;
                    if (response.data.success.data.used === 'false') {
                        var index = $filter('getByUUID')($scope.audioLibrary, response.data
                            .success.data.audio_library_uuid, 'audio_library');
                        if (index !== null) $scope.audioLibrary[index].used = 'false';
                    }
                    if (file.original_filename === 'ivrgreeting_default.mp3' &&
                        $rootScope.newIvr.ivr_menu_enabled === 'true') {
                        $rootScope.newIvr.ivr_menu_enabled = 'false';
                    }
                    $rootScope.newIvr.greeting = file;
                    $rootScope.newIvr.ivr_menu_greet_long = file.original_filename;

                    var index = $filter('getByUUID')($scope.audioLibrary, file.audio_library_uuid,
                        'audio_library');
                    if (index !== null) $scope.audioLibrary[index].used = 'true';
                }
                $scope.selectingGreeting = null;
            });
    }

    $scope.selectAudioLibraryFile = function(file) {
        if (file) {
            $scope.selectingGreeting = file.audio_library_uuid;
            console.log(file);
            console.log($rootScope.newIvr);
            if (file.original_filename === 'ivrgreeting_default.mp3' && $rootScope.newIvr
                .ivr_menu_enabled === 'true') {
                var confirmChange = $mdDialog.confirm()
                    .title('Please confirm')
                    .textContent(
                        'You are changing the greeting to be the default greeting. Doing this will disable your Attendant until you choose a new custom greeting. Please confirm you are ok with this.'
                    )
                    .ariaLabel('Confirm')
                    .ok('Yes')
                    .cancel('Never Mind');

                $mdDialog.show(confirmChange).then(function() {
                    doSelectLibraryItem(file);
                }, function() {
                    $timeout(function() {
                        $scope.selectingGreeting = null;
                    });
                });
            } else {
                doSelectLibraryItem(file);
            }
        }
    };

    $scope.getGreetingFilepath = function(filename) {
        var audiopath = '/imported/freeswitch/storage/voicemail/default/' + $rootScope.user
            .domain.domain_name + '/' + $rootScope.newIvr.did.ext + '/';
        return audiopath + filename;
    };

    $scope.getCurrentGreeting = function(greeting) {
        console.log(greeting_id);
        var found = null;
        angular.forEach($scope.voicemailGreetings, function(greeting) {
            console.log(greeting);
            if (greeting.greeting_id == greeting_id) found = $scope.getGreetingFilepath(
                greeting.greeting_filename);
        });
        return found;
    };

    $scope.initDirectory = function() {
        $scope.directoryOpts = [{
                digit: "1",
                available: true
            },
            {
                digit: "2",
                available: true
            },
            {
                digit: "3",
                available: true
            },
            {
                digit: "4",
                available: true
            },
            {
                digit: "5",
                available: true
            },
            {
                digit: "6",
                available: true
            },
            {
                digit: "7",
                available: true
            },
            {
                digit: "8",
                available: true
            },
            {
                digit: "9",
                available: true
            },
            {
                digit: "0",
                available: true
            },
            {
                digit: "#",
                available: true
            },
            {
                digit: "*",
                available: true
            }
        ];
    };

    $scope.initDirectory();


    $scope.initSchedule = function() {
        $rootScope.hstep = 1;
        $rootScope.mstep = 1;
        $rootScope.ismeridian = true;
        $rootScope.scheduleType = {
            weekly: [{
                    day: 'sunday',
                    daynum: '1',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'monday',
                    daynum: '2',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'tuesday',
                    daynum: '3',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'wednesday',
                    daynum: '4',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'thursday',
                    daynum: '5',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'friday',
                    daynum: '6',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'saturday',
                    daynum: '7',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                }
            ],
            holiday: [{
                timeStart: "",
                timeEnd: ""
            }]
        };
    };

    $scope.initSchedule();

    $scope.formats = ['dd-MMMM-yyyy', 'yyyy MMMM dd', 'dd.MM.yyyy', 'shortDate', 'MMMM dd', ];
    $scope.format = $scope.formats[4];
    $scope.altInputFormats = ['M!/d!/yyyy'];

    $scope.today = function() {
        $scope.dt = new Date();
    }
    $scope.today();

    $scope.clear = function() {
        $scope.dt = null;
    };


    $scope.inlineOptions = {
        customClass: getDayClass,
        minDate: new Date(),
        showWeeks: true
    };

    $scope.startDateOptions = {
        formatYear: 'yyyy',
        showWeeks: false,
        startingDay: 1
    };

    $scope.endDateOptions = {
        formatYear: 'yyyy',
        showWeeks: false,
        startingDay: 1
    };



    $scope.dateFormat = 'MM-dd-yyyy';

    $scope.popup1 = {
        opened: false
    };

    $scope.open1 = function() {
        $scope.popup1.opened = true;
    };

    $scope.popup2 = {
        opened: false
    };

    $scope.open2 = function() {
        $scope.popup2.opened = true;
    };

    $scope.setDate = function(year, month, day) {
        $scope.dt = new Date(year, month, day);
    };

    function getDayClass(data) {
        var date = data.date,
            mode = data.mode;
        if (mode === 'day') {
            var dayToCheck = new Date(date).setHours(0, 0, 0, 0);
            for (var i = 0; i < $scope.events.length; i++) {
                var currentDay = new Date($scope.events[i].date).setHours(0, 0, 0, 0);
                if (dayToCheck === currentDay) {
                    return $scope.events[i].status;
                }
            }
        }
        return '';
    }

    //----------Voicemail settings----------

    $scope.settings = {
        voicemail_password: "12345",
        voicemail_mail_to: "",
        voicemail_id: "",
        voicemail_greeting: ""
    };

    $scope.updateVoicemail = function() {
        var data = {
            domain_uuid: $scope.domain_uuid,
            voicemail_password: $rootScope.newIvr.voicemail.voicemail_password,
            voicemail_mail_to: $rootScope.newIvr.voicemail.voicemail_mail_to,
            voicemail_id: $rootScope.newIvr.did.ext,
            voicemail_greeting: $rootScope.newIvr.vmgreeting ? $rootScope.newIvr.vmgreeting
                .greeting_id : null
        }
        console.log(data);
        dataFactory.postUpdateAttendantVoicemail(data).then(function(response) {
            if (response.data.success) {
                $rootScope.showSuccessAlert(
                    'Your information has been updated.');
            } else if (response.data.error) {
                $rootScope.showErrorAlert(response.data.error.message[0]);
            }
        });
    }

    // ----------UserList
    function generateUserList() {
        var array = [];
        var contacts = contactService.getUserContactsOnly();
        contacts.forEach(function(contact) {
            if (!$rootScope.isKotterTechUser(contact)) {
                if (contact.type == 'user' && contact.nums) {
                    contact.nums.forEach(function(phone) {
                        if (phone.lab == 'DID' && contact.name) {
                            array.push({
                                ext: contact.ext,
                                name: contact.name,
                                phone: phone.num,
                                user_uuid: contact.user_uuid
                            });
                        }
                    });
                }
            }
        });
        $scope.userList2.items = $filter('orderBy')(array, 'ext', false);
    }
    generateUserList();

    $scope.getWeeklySchedule = function() {
        $scope.weeklyHours = [];
        var weekly = angular.copy($rootScope.scheduleType.weekly);
        weekly.forEach(function(entry) {
            console.log(entry);
            if (entry.times.start && entry.times.end) {
                if (moment.isMoment(entry.times.start) && moment.isMoment(entry
                        .times.end)) {
                    console.log("is moment");
                    $scope.weeklyHours.push({
                        daynum: entry.daynum,
                        shours: entry.times.start.hour(),
                        smin: entry.times.start.minute(),
                        ehours: entry.times.end.hour(),
                        emin: entry.times.end.minute(),
                        minuteofday_uuid: entry.minuteofday_uuid ?
                            entry.minuteofday_uuid : "",
                        wday_uuid: entry.wday_uuid ? entry.wday_uuid : "",
                        group_number: entry.group_number ? entry.group_number : "",
                        order: entry.order ? entry.order : "",
                        disabled: entry.disabled
                    });
                } else {
                    var momentStart = moment(entry.times.start);
                    var momentEnd = moment(entry.times.end);
                    $scope.weeklyHours.push({
                        daynum: entry.daynum,
                        shours: momentStart.hour(),
                        smin: momentStart.minute(),
                        ehours: momentEnd.hour(),
                        emin: momentEnd.minute(),
                        minuteofday_uuid: entry.minuteofday_uuid ?
                            entry.minuteofday_uuid : "",
                        wday_uuid: entry.wday_uuid ? entry.wday_uuid : "",
                        group_number: entry.group_number ? entry.group_number : "",
                        order: entry.order ? entry.order : "",
                        disabled: entry.disabled
                    });
                }
            } else {
                entry.disabled = true;
                entry.times.start = "";
                entry.times.end = "";
            }
        });
    };


    $scope.showGreetingFileTitle = function(ivr_menu_greet_long) {
        var title = null;
        $scope.audioLibrary.forEach(function(item) {
            if (item.original_filename === ivr_menu_greet_long) title = item.file_title;
        });
        return title;
    };

    $scope.getHolidaySchedule = function() {
        $scope.holidayHours = [];
        $rootScope.scheduleType.holiday.forEach(function(entry) {
            if (entry.timeStart && entry.timeEnd) {
                if (entry.timeEnd < entry.timeStart) {
                    entry.timeEnd = entry.timeStart;
                }
                if (moment.isMoment(entry.timeStart) && moment.isMoment(entry.timeEnd)) {
                    console.log('Its moment');
                    $scope.holidayHours.push({
                        times: entry.timeStart.format('YYYY-MM-DD') +
                            ' 00:00~' + entry.timeEnd.format(
                                'YYYY-MM-DD') + ' 23:59',
                        datetime_uuid: entry.datetime_uuid ? entry.datetime_uuid : "",
                        group_number: entry.group_number ? entry.group_number : "",
                        order: entry.order ? entry.order : ""
                    });
                } else {
                    var momentStart = moment(entry.timeStart);
                    var momentEnd = moment(entry.timeEnd);

                    $scope.holidayHours.push({
                        times: momentStart.format('YYYY-MM-DD') +
                            ' 00:00~' + momentEnd.format('YYYY-MM-DD') +
                            ' 23:59',
                        datetime_uuid: entry.datetime_uuid ? entry.datetime_uuid : "",
                        group_number: entry.group_number ? entry.group_number : "",
                        order: entry.order ? entry.order : ""
                    });
                }
            } else {
                $rootScope.scheduleType.holiday.splice((entry), 1);
            }
        });
        console.log($rootScope.scheduleType.holiday);
    };

    $scope.getAttendants = function() {
        $scope.loadingAttendants = true;
        $scope.ordered = false;
        if ($scope.aaEnabled) {
            return dataFactory.getAutoAttendants($scope.domain_uuid)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.myAttendants = response.data.success.data;
                        $rootScope.myAttendants.forEach(function(attendant) {

                            if (attendant.ivr_menu_enabled === "true") {
                                attendant.ivr_menu_enabled = true;
                            } else if (attendant.ivr_menu_enabled ===
                                "false") {
                                attendant.ivr_menu_enabled = false;
                            }

                        });
                        $scope.loadingAttendants = false;
                        if (__env.enableDebug) console.log("AUTO ATTENDANTS LOADED");
                        if (__env.enableDebug) console.log($rootScope.myAttendants);
                        return 'done';
                    } else if (response.data.error) {
                        $rootScope.showErrorAlert(response.data.error.message);
                        return 'error';
                    }
                });
        } else {
            return dataFactory.getBasicAutoAttendantInfo($scope.domain_uuid)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.myAttendants = response.data.success.data;
                        $scope.loadingAttendants = false;
                        if (__env.enableDebug) console.log("AUTO ATTENDANTS LOADED");
                        if (__env.enableDebug) console.log($rootScope.myAttendants);
                        return 'done';
                    } else {
                        $rootScope.showErrorAlert(response.data.error.message);
                        return 'error';
                    }
                });
        }
    };
    $scope.getAttendants();

    $scope.loadAvailableDid = function() {
        $scope.userList.items = [];
        $rootScope.availableContacts = [];
        dataFactory.getUnavailableDid()
            .then(function(response) {
                if (response.data) {
                    $rootScope.usedDid = response.data;
                    $rootScope.usedDid1 = response.data;
                }
                var contacts = contactService.getUserContactsOnly();
                contacts.forEach(function(contact) {
                    if (!$rootScope.isKotterTechUser(contact)) {
                        contact.nums.forEach(function(phone) {
                            if (phone.lab == 'DID' && contact.name) {
                                $scope.userList.items.push({
                                    ext: contact.ext,
                                    name: contact.name,
                                    phone: phone.num
                                })
                            }
                        });
                    }
                });

                if ($rootScope.usedDid.length > 0) {
                    for (var i = 0; i < $scope.userList.items.length; i++) {
                        for (var j = 0; j < $rootScope.usedDid.length; j++) {
                            if ($rootScope.usedDid[j].phone == $scope.userList.items[
                                    i].phone) {
                                var index = i;
                                $rootScope.usedDid.splice(j, 1);
                            }
                        }
                    }

                    $rootScope.usedDid.forEach(function(contact) {
                        $scope.userList.items.push({
                            ext: contact.ext,
                            name: 'External number',
                            phone: contact.phone
                        })
                    })
                }

                console.log($scope.userList.items);
            });

    };

    $scope.checkForChars = function(date) {
        // console.log(date);
        // if (date && ) $rootScope.showErrorAlert('It seems you have entered an invalid character. Time fields can only be numbers.');
    };

    $scope.setCurrentTab = function(tab) {
        $scope.currentTab = tab;
    };

    $scope.changeAaNumber = function() {
        $scope.showChangeNumber = true;
        $scope.oldDid = angular.copy($rootScope.newIvr.did);
    };

    $scope.cancelChangeAaNumber = function() {
        $scope.showChangeNumber = false;
        $rootScope.newIvr.did = angular.copy($scope.oldDid);
        $scope.oldDid = null;
    };

    $scope.saveChangeAaNumber = function() {
        if ($scope.oldDid.ext == $rootScope.newIvr.newdid.ext &&
            $scope.oldIvr.location_group_uuid === $rootScope.newIvr.location_group_uuid
        ) {
            $scope.menu.main = true;
            $scope.oldIvr = null;
            $scope.initDirectory();
            $scope.getAttendants();
            getRingGroups();
            $scope.weeklyHours = [];
            $scope.holidayHours = [];
            $rootScope.newIvr = {};
            $scope.menu.clone = false;
            $scope.menu.edit = false;
            $scope.menu.respondsto = false;
            $scope.aaWorking = {};
            $rootScope.editingAttendant = {};
        } else {
            $scope.menu.respondsto = false;
            $scope.aaWorking = {
                status: true,
                message: 'Saving Changes'
            };
            $rootScope.newIvr.did = $rootScope.newIvr.newdid;
            var data = {
                attendant: $rootScope.newIvr,
                oldDid: $scope.oldDid
            };
            console.log(data);
            dataFactory.postChangeAaNumber(data)
                .then(function(response) {
                    if (response.data.success) {
                        var check = response.data.success.data;
                        // if (check.status === 'building' && $rootScope.newIvr.ivr_menu_enabled === true) {
                        //     $rootScope.newIvr.ivr_menu_enabled === false;
                        //     $scope.toggleEnable($rootScope.newIvr);
                        // }
                        $scope.oldDid = null;
                        $scope.oldIvr = null;
                        $scope.menu.main = true;
                        $scope.initDirectory();
                        $scope.getAttendants();
                        getRingGroups();
                        $scope.weeklyHours = [];
                        $scope.holidayHours = [];
                        $rootScope.newIvr = {};
                        $scope.menu.clone = false;
                        $scope.menu.edit = false;
                        $scope.menu.respondsto = false;
                        $rootScope.editingAttendant = {};
                        $scope.aaWorking = {};
                        $rootScope.showSuccessAlert(response.data.success.message);
                    } else {
                        $rootScope.showErrorAlert(response.data.error.message);
                    }
                });
        }
    };
    $scope.addSecondary = false;
    $scope.addSecondaryNumber = function() {
        if ($scope.addSecondary) {
            $rootScope.showErrorAlert(
                'You must save the "In Progress" number before adding another');
            return;
        }
        $scope.addSecondary = true;
    };

    $scope.saveNewSecondaryNumber = function(dest) {
        $scope.savingSecondaryNumber = true;
        var data = {
            ivr_menu_uuid: $rootScope.newIvr.ivr_menu_uuid,
            ext: $rootScope.newIvr.did.ext,
            dest_uuid: dest.destination_uuid,
            domain_uuid: $scope.domain_uuid
        }
        console.log(data);
        // return;
        dataFactory.postSaveNewSecondaryNumber(data)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    $rootScope.newIvr.secondaryNumbers.push(response.data.success.data);
                    $scope.addSecondary = false;
                    $scope.savingSecondaryNumber = false;
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            });
    };

    $scope.deleteSecondaryNumber = function(number) {
        dataFactory.getDeleteSecondaryNumber(number.auto_attendant_did_uuid)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    console.log($rootScope.newIvr.secondaryNumbers);
                    var index = $filter('getByUUID')($rootScope.newIvr.secondaryNumbers,
                        number.auto_attendant_did_uuid, 'auto_attendant_did');
                    if (index !== null) $rootScope.newIvr.secondaryNumbers.splice(
                        index, 1);
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            });
    };

    $scope.newSecondary = {};
    $scope.orderNewSecondaryNumber = function() {
        $scope.orderingSecondaryNumber = true;
        var number = $rootScope.user.symphony_user_settings.sms_phone_number;
        dataFactory.getNewSecondaryNumber($scope.domain_uuid, number)
            .then(function(response) {
                if (response.data.success) {
                    $scope.orderingSecondaryNumber = false;
                    $scope.availDids.push(response.data.success.data);
                    $scope.newSecondary = response.data.success.data;
                    console.log($scope.newSecondary);
                }
            });
    };

    $scope.cancelNewSecondaryNumber = function() {
        $scope.addSecondary = false;
    };

    function loadValidDids(domain_uuid) {
        return dataFactory.getValidDIDs(domain_uuid)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    $scope.availDids = response.data.success.data;
                } else {
                    console.log(response.data.error.message);
                    $scope.availDids = [];
                }
            });
    }

    $scope.createNewAttendant = function() {
        console.log("DO NEW ATTENDANT");
        $rootScope.newIvr = {};
        $rootScope.newIvr.did = {};
        $scope.menu.create = true;
        $scope.menu.edit = false;
        $scope.menu.main = false;
        $scope.newdid = false;
        $scope.editing = false;
        $scope.newAttendant = true;
        $scope.loadAvailableDid();
        loadReusableDids();
        loadValidDids($rootScope.user.domain_uuid);
    };

    function loadReusableDids() {
        return dataFactory.getAvailableDidsForAa($scope.domain_uuid)
            .then(function(response) {
                if (response.data.success) {
                    $scope.reusableDids = response.data.success.data;
                    console.log($scope.reusableDids);
                    return $scope.reusableDids;
                } else {
                    console.log(response.data.error.message);
                    return [];
                }
            })
    }

    loadLocations();

    function loadLocations() {
        var domainUuid = $rootScope.user.domain_uuid;
        dataFactory.getLocationGroups(domainUuid)
            .then(function(response) {
                console.log(response.data);
                $scope.locationGroups = [];
                if (response.data.success) {
                    angular.forEach(response.data.success.data, function(group) {
                        if (group.communications.match(/dids/g)) {
                            $scope.locationGroups.push(group);
                        }
                    });
                }
            });
    }

    function setDefaultSchedule() {
        var start = new Date();
        var end = new Date();
        start.setHours(9);
        start.setMinutes(0);
        start.setSeconds(0);
        end.setHours(17);
        end.setMinutes(0);
        end.setSeconds(0);
        var defaultSchedule = {
            weekly: [{
                    day: 'sunday',
                    daynum: '1',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'monday',
                    daynum: '2',
                    times: {
                        start: start,
                        end: end
                    },
                    disabled: false
                },
                {
                    day: 'tuesday',
                    daynum: '3',
                    times: {
                        start: start,
                        end: end
                    },
                    disabled: false
                },
                {
                    day: 'wednesday',
                    daynum: '4',
                    times: {
                        start: start,
                        end: end
                    },
                    disabled: false
                },
                {
                    day: 'thursday',
                    daynum: '5',
                    times: {
                        start: start,
                        end: end
                    },
                    disabled: false
                },
                {
                    day: 'friday',
                    daynum: '6',
                    times: {
                        start: start,
                        end: end
                    },
                    disabled: false
                },
                {
                    day: 'saturday',
                    daynum: '7',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                }
            ],
            holiday: [],
        };
        return defaultSchedule;
    }

    $scope.sendNewAutoAttendant = function() {

        if (!$rootScope.newIvr.did.phone || !$rootScope.newIvr.ivr_menu_name || !
            $rootScope.newIvr.timezone) {
            $rootScope.showErrorAlert(
                'You are missing either the Auto Attendant Name, Number or Time Zone selection. Please correct and resubmit'
            );
            return;
        }
        $scope.aaWorking = {
            status: true,
            message: 'Creating Attendant'
        };
        $scope.menu.create = false;

        $rootScope.scheduleType = setDefaultSchedule();
        $scope.getHolidaySchedule();
        $scope.getWeeklySchedule();
        var data = {
            newIvr: $rootScope.newIvr,
            weekly: $scope.weeklyHours,
            holiday: $scope.holidayHours,
            domain_uuid: $scope.domain_uuid
        };
        console.log(data);
        dataFactory.postCreateEmptyIvr(data)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    $scope.newAttendant = false;
                    $scope.getAttendants()
                        .then(function() {
                            $scope.aaWorking = {};
                            if ($scope.aaEnabled) {
                                var index = $filter('getByUUID')($rootScope.myAttendants,
                                    response.data.success.data.ivr_menu_uuid,
                                    'ivr_menu');
                                $scope.editAttendant($rootScope.myAttendants[
                                    index]);
                            }
                            console.log($rootScope.myAttendants[index]);
                        });

                    //$rootScope.showSuccessAlert(response.data.success.message);
                } else {
                    console.log(response.data.error.message);
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            });
    };

    $scope.createAttendant = function() {
        $rootScope.editingAttendant = {};
        $rootScope.newIvr = {};
        $rootScope.newIvr.did = {};
        $rootScope.optionsList = [];
        $scope.menu.main = false;
        $scope.menu.create = false;
        $scope.menu.edit = true;
        $scope.editing = false;
        $scope.newdid = false;
        $scope.optionsitems = false;
        $scope.loadAvailableDid();
        $scope.initDirectory();
        $scope.initSchedule();
    };
    $rootScope.usedDid = [];


    $scope.loadSchedule = function(data) {
        // $rootScope.newIvr.did = {};
        $rootScope.newIvr.alternate_destination = [];
        $rootScope.scheduleType = {
            weekly: [{
                    day: 'sunday',
                    daynum: '1',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'monday',
                    daynum: '2',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'tuesday',
                    daynum: '3',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'wednesday',
                    daynum: '4',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'thursday',
                    daynum: '5',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'friday',
                    daynum: '6',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                },
                {
                    day: 'saturday',
                    daynum: '7',
                    times: {
                        start: "",
                        end: ""
                    },
                    disabled: true
                }
            ],

            holiday: [],
        };

        return dataFactory.getSchedule(data)
            .then(function(response) {
                var today = new Date();
                var today = moment(today).format("YYYY-MM-DD");

                if (response.data.success) {
                    //$rootScope.newIvr.did = {};
                    $scope.retrivedSchedule = response.data.success.data;
                    console.log($scope.retrivedSchedule);

                    response.data.success.data.forEach(function(entry) {
                        if (entry.type == "weekly") {
                            $rootScope.scheduleType.weekly.forEach(function(
                                record) {
                                if (entry.daynum === record.daynum) {
                                    console.log("CHANGING " +
                                        record.day);
                                    record.daynum = entry.daynum;
                                    record.times.start = today +
                                        ' ' + entry.stime;
                                    record.times.end = today + ' ' +
                                        entry.etime;
                                    record["minuteofday_uuid"] =
                                        entry.minuteofday_uuid;
                                    record["wday_uuid"] = entry.wday_uuid;
                                    $rootScope.scheduleType.type =
                                        "weekly";
                                    record.disabled = false;
                                    record['group_number'] = entry.group_number;
                                    record['order'] = entry.order;

                                }
                                //console.log(record);
                            });
                        } else if (entry.type == "holiday") {
                            if (entry.stime) {
                                var s = new Date(entry.stime);
                                $rootScope.scheduleType.type = "holiday";
                                $rootScope.scheduleType.holiday.push({
                                    timeStart: new Date(entry.stime),
                                    timeEnd: new Date(entry.etime),
                                    datetime_uuid: entry.datetime_uuid,
                                    group_number: entry.group_number,
                                    order: entry.order,
                                });
                            }
                        }

                    });
                    if ($scope.loadPostData) {
                        $scope.getHolidaySchedule();
                        $scope.getWeeklySchedule();
                        $scope.loadPostData = false;
                    }
                    console.log($rootScope.newIvr.did);
                    return true;
                } else {
                    console.log(response.data.error.message);
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            });
    };


    $scope.toggleEdit = function() {
        $scope.editing = false;
        $scope.loadAvailableDid();
    };

    $scope.editAttendant = function(attendant) {
        console.log(attendant);
        $rootScope.editingAttendant = attendant;

        $rootScope.ivr_menu_uuid = $rootScope.editingAttendant.ivr_menu_uuid;
        $scope.loadOptions($rootScope.ivr_menu_uuid);
        $rootScope.newIvr = attendant;
        retrievePresetHolidays(attendant.ivr_menu_uuid);
        $rootScope.newIvr['ivr_menu_enabled'] = $rootScope.newIvr['ivr_menu_enabled'] ?
            'true' : 'false';
        //$rootScope.newIvr.ivr_menu_enabled === true || '1' ? $rootScope.newIvr['ivr_menu_enabled'] = "true" : $rootScope.newIvr['ivr_menu_enabled'] = "false";
        $scope.loadSchedule($rootScope.ivr_menu_uuid)
            .then(function() {
                loadVoicemailGreetings();
            });
        $scope.loadAvailableDid();
        loadReusableDids();
        loadValidDids($rootScope.user.domain_uuid);

        $scope.optionsitems = true;
        $scope.editing = true;
        $scope.newdid = false;
        $scope.menu.main = false;
        $scope.menu.edit = true;
        $scope.menu.create = false;
        console.log($rootScope.newIvr);
    };

    function retrievePresetHolidays(ivr_menu_uuid) {
        console.log(ivr_menu_uuid);
        dataFactory.getPresetHolidays(ivr_menu_uuid)
            .then(function(response) {
                console.log(response.data);
                $rootScope.newIvr.presetHolidays = angular.copy(presetHolidays);
                angular.forEach($rootScope.newIvr.presetHolidays, function(preset) {
                    if (response.data.success.data.indexOf(preset.preset) !==
                        -1) preset.status = true;
                    //$rootScope.newIvr.presetHolidays[preset.preset] = preset;
                });
                console.log($rootScope.newIvr);
            });
    }
    $scope.newNumberForClone = function() {
        $scope.orderingNumber = true;
        var number = $rootScope.user.symphony_user_settings.sms_phone_number;
        dataFactory.getNewNumber($scope.domain_uuid, number)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.newIvr.newdid = response.data.success.data;
                    console.log($rootScope.newIvr.newdid);
                    $scope.reusableDids.push(response.data.success.data);
                    $scope.orderingNumber = false;
                    $scope.ordered = true;
                }
            });
    };
    $scope.newNumberForRespondsTo = function() {
        $scope.orderingNumber = true;
        var data = $rootScope.user.symphony_user_settings.sms_phone_number;
        dataFactory.getNewNumber($scope.domain_uuid, data)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.newIvr.newdid = response.data.success.data;
                    console.log($rootScope.newIvr.newdid);
                    $scope.orderingNumber = false;
                    $scope.reusableDids.push(response.data.success.data);
                    $scope.ordered = true;
                }
            });
    };

    $scope.newNumber = function() {
        $scope.orderingNumber = true;
        var data = $rootScope.user.symphony_user_settings.sms_phone_number;
        dataFactory.getNewNumber($scope.domain_uuid, data)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.newIvr.did = response.data.success.data;
                    console.log($rootScope.newIvr.did);
                    loadVoicemailGreetings();
                    $scope.orderingNumber = false;
                    $scope.reusableDids.push(response.data.success.data);
                    $scope.editing = true;
                    $scope.newdid = true;
                }
            });
    };

    $scope.saveAttendant = function(step) {
        console.log($rootScope.scheduleType.weekly);
        var invalidDate = false;
        angular.forEach($rootScope.scheduleType.weekly, function(day) {
            if (!day.disabled) {
                if (!day.times.start || !day.times.end) invalidDate = true;
            }
        });

        if ($rootScope.newIvr.auto_attendant.target_type === 'ring_group' && !
            $rootScope.newIvr.auto_attendant.target_ringgroup) {
            $rootScope.showErrorAlert(
                'You have specified Ring Group as the option for this Auto Attendant, however, you did not select a Ring Group. Please go back to Customize Your Options and choose a Ring Group or select IVR Menu as the Option.'
            );
            return;
        }
        if (invalidDate) {
            $rootScope.showErrorAlert(
                'There are currently invalid times selected in the Weekly Schedule section. Please return and correct those before saving the attendant.'
            );
            return;
        }
        if ($scope.editingOption || $scope.editingHoliday || $scope.showAddOptions) {
            var string = ($scope.editingOption || $scope.showAddOptions ?
                'a Menu Option' : '');
            string += (($scope.editingHoliday && string.length > 0) ? ' and ' : '') + (
                $scope.editingHoliday ? 'a Holiday Entry' : '');
            $rootScope.showErrorAlert('You are currently editing/adding ' + string +
                '. Please complete and save that entry before submitting the overall attendant.'
            );
            return;
        }
        if (!$scope.hasWeekly() && !$scope.hasPresets($rootScope.newIvr) && $rootScope.scheduleType
            .holiday.length === 0) {
            $rootScope.showErrorAlert(
                'You must have at least one day of the week with set hours or have one holiday created or enabled in order to save the attendant.'
            );
            return;
        }
        $scope.aaWorking = {
            status: true,
            message: 'Saving Attendant'
        };
        var tempschedule = angular.copy($rootScope.scheduleType);
        console.log(step);
        if ($rootScope.editingAttendant.ivr_menu_uuid) {
            if ($rootScope.scheduleType.type == "none") {
                $rootScope.jsonObject = {
                    editAttendant: $rootScope.newIvr
                };
            } else {
                console.log($rootScope.scheduleType);
                $scope.getHolidaySchedule();
                $scope.getWeeklySchedule();

                $rootScope.jsonObject = {
                    editAttendant: $rootScope.newIvr,
                    options: $scope.optionsList,
                    weekly: $scope.weeklyHours,
                    holiday: $scope.holidayHours
                };
            }
            console.log($rootScope.jsonObject);
            // return;
            dataFactory.updateAutoAttendant($rootScope.jsonObject)
                .then(function(response) {
                    if (response.data.success) {
                        if (step === 'continue') {
                            if ($rootScope.newIvr.ivr_menu_enabled === 'true')
                                restartAttendant($rootScope.newIvr);
                            $rootScope.showSuccessAlert(
                                'Your changes have been saved.');
                            $scope.aaWorking = {};
                        } else {
                            loadAudioLibrary();
                            if ($rootScope.newIvr.ivr_menu_enabled === 'true') {
                                restartAttendant($rootScope.newIvr)
                                    .then(function() {
                                        initTabs();
                                        $scope.menu.create = false;
                                        $scope.menu.edit = false;
                                        $scope.menu.clone = false;
                                        $scope.menu.respondsto = false;
                                        $scope.initDirectory();
                                        $scope.getAttendants();
                                        getRingGroups();
                                        $scope.weeklyHours = [];
                                        $scope.holidayHours = [];
                                        $scope.menu.main = true;
                                        $scope.aaWorking = {};
                                    });
                            } else {
                                $scope.menu.create = false;
                                $scope.menu.edit = false;
                                $scope.menu.clone = false;
                                $scope.menu.respondsto = false;
                                $scope.initDirectory();
                                $scope.getAttendants();
                                getRingGroups();
                                $scope.weeklyHours = [];
                                $scope.holidayHours = [];
                                $scope.menu.main = true;
                                $scope.aaWorking = {};
                            }

                        }
                    } else if (response.data.error) {
                        /*$scope.weeklyHours = [];
                        $scope.holidayHours = [];*/
                        $rootScope.showErrorAlert(response.data.error.message);
                        $scope.aaWorking = {};
                    }
                });
        }
    };

    $scope.toggleEnable = function(attendant) {
        var check = attendant.auto_attendant;
        var submitChange = false;
        if (attendant.ivr_menu_enabled === true) {
            if (check.greeting === 'true' && (check.voicemail === 'true' || check.voicemail ===
                    'userext') && check.customize_menu === 'true' && (check.holiday ===
                    'true' || check.weekly_schedule === 'true')) {
                submitChange = true;
            } else {
                var message = '';
                if ((check.holiday !== 'true' && check.weekly_schedule !== 'true'))
                    message += (message.length > 0 ? ', ' : '') +
                    'Weekly Schedule and/or Holiday Schedule';
                if (check.customize_menu !== 'true') message += (message.length > 0 ?
                    ', ' : '') + 'Customize Your Menu';
                if (check.greeting !== 'true') message += (message.length > 0 ? ', ' :
                    '') + 'Record Greeting';
                if (check.voicemail !== 'true') {
                    if (attendant.did.name) {
                        message += (message.length > 0 ? ', ' : '') +
                            'Setup Voicemail for User Ext: ' + attendant.did.ext;
                    } else {
                        message += (message.length > 0 ? ', ' : '') + 'Setup Voicemail';
                    }
                }
                $rootScope.showErrorAlert(
                    'You have not fully completed preparing the attendant. Please complete the following section: ' +
                    message);
                var index = $filter('getByUUID')($rootScope.myAttendants, attendant.ivr_menu_uuid,
                    'ivr_menu');
                if (index !== null) $rootScope.myAttendants[index].ivr_menu_enabled =
                    false;
            }
        } else {
            submitChange = true;
        }

        if (submitChange) {
            var data = {
                ivr_menu_uuid: attendant.ivr_menu_uuid,
                ivr_menu_enabled: (attendant.ivr_menu_enabled ? 'true' : 'false'),
                did: attendant.did
            };
            return dataFactory.postToggleAttendant(data)
                .then(function(response) {
                    if (response.data.success) {
                        return true;
                    } else {
                        console.log(response.data.error.message);
                        return false;
                    }
                })
        } else {
            return false;
        }
    };

    $scope.postCloneAttendant = function() {
        $scope.aaWorking = {
            status: true,
            message: 'Cloning Attendant'
        };
        $scope.menu.clone = false;
        var attendant = $scope.ivrClone;
        $scope.optionsitems = false;
        $scope.editing = false;
        $scope.newdid = false;
        $scope.menu.main = false;
        $scope.menu.edit = false;
        $scope.menu.create = false;

        $scope.loadPostData = true;

        $rootScope.newIvr.ivr_menu_enabled = "false";
        $scope.loadSchedule($rootScope.newIvr.ivr_menu_uuid)
            .then(function() {
                if (!$rootScope.newIvr.newdid && $rootScope.newIvr.ext) {
                    angular.forEach($scope.userList.items, function(user) {
                        if (user.ext == $rootScope.newIvr.ext) {
                            $rootScope.newIvr.newdid = user;
                        }
                    });
                }
                var data = {
                    attendant: $rootScope.newIvr,
                    options: $scope.optionsList,
                    weekly: $scope.weeklyHours,
                    holiday: $scope.holidayHours
                };

                console.log(data);
                dataFactory.postCloneAutoAttendant(data)
                    .then(function(response) {
                        console.log(response.data);
                        if (response.data.success) {
                            $scope.initDirectory();
                            $scope.getAttendants()
                                .then(function() {
                                    $scope.aaWorking = {};
                                    $rootScope.showSuccessAlert(response.data
                                        .success.message);
                                    $scope.menu.main = true;
                                    $scope.weeklyHours = [];
                                    $scope.holidayHours = [];
                                    $rootScope.newIvr = {};

                                    $scope.menu.respondsto = false;
                                    $rootScope.editingAttendant = {};
                                });

                        } else if (response.data.error) {
                            $rootScope.showErrorAlert(response.data.error.message);
                        }
                    });
            });
    };

    $scope.cloneAttendant = function(attendant) {
        $rootScope.editingAttendant = {};
        attendant.ivr_menu_name = attendant.ivr_menu_name + ' (Clone)';
        $rootScope.newIvr = attendant;
        $rootScope.newIvr.newdid = angular.copy($rootScope.newIvr.did);
        //$rootScope.newIvr.ivr_menu_uuid = "";
        $scope.loadAvailableDid();
        loadReusableDids();
        loadValidDids($rootScope.user.domain_uuid);
        $scope.loadOptions($rootScope.newIvr.ivr_menu_uuid);
        retrievePresetHolidays($rootScope.newIvr.ivr_menu_uuid);
        console.log($scope.userList.items);
        $scope.editing = false;
        //$rootScope.newIvr.did = {};
        $rootScope.newIvr.ext = $rootScope.newIvr.did.ext;
        $scope.menu.clone = true;
        $scope.menu.respondsto = false;
        $scope.menu.create = false;
        $scope.menu.edit = false;
        $scope.menu.main = false;
        $scope.newdid = false;
        $scope.editing = false;
        $scope.newAttendant = false;
        console.log($rootScope.newIvr);
    };

    $scope.changeRespondsTo = function(attendant) {

        $rootScope.editingAttendant = {};
        $rootScope.newIvr = attendant;
        $rootScope.newIvr.newdid = angular.copy($rootScope.newIvr.did);
        $scope.oldIvr = angular.copy($rootScope.newIvr);
        //$rootScope.newIvr.ivr_menu_uuid = "";
        $scope.loadAvailableDid();
        loadReusableDids();
        loadValidDids($rootScope.user.domain_uuid);
        $scope.editing = false;
        //$rootScope.newIvr.did = {};
        $rootScope.newIvr.ext = $rootScope.newIvr.did.ext;
        $scope.oldDid = angular.copy($rootScope.newIvr.did);
        $scope.menu.clone = false;
        $scope.menu.respondsto = true;
        $scope.menu.create = false;
        $scope.menu.edit = false;
        $scope.menu.main = false;
        $scope.newdid = false;
        $scope.editing = false;
        $scope.newAttendant = false;
    };

    $scope.deleteAttendant = function(data) {
        var deleteConfirm = $mdDialog.confirm()
            .title('Are you sure you want to Delete Auto Attendant?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(deleteConfirm).then(function() {
            if (data.ivr_menu_uuid != "") {
                dataFactory.postDeleteAttendant(data)
                    .then(function(response) {
                        if (response.data.success) {
                            $rootScope.showSuccessAlert(response.data.success
                                .message);
                            $scope.getAttendants();
                            getRingGroups();
                            if (response.data.success.data === 'false') {
                                var i = 0,
                                    len = $scope.audioLibrary.length;
                                for (i; i < len; i++) {
                                    if ($scope.audioLibrary[i].original_filename ===
                                        data.ivr_menu_greet_long) {
                                        $scope.audioLibrary[i].used =
                                            'false';
                                        break;
                                    }
                                };
                            }
                        }
                    });
            }
        });
    }

    function initTabs() {
        $scope.tabStatus = {
            isWeeklyOpen: false,
            isHolidayOpen: false,
            isOptionsOpen: false,
            isVGreetingsOpen: false,
            isVoicemailOpen: false
        };
    }

    $scope.cancelEditAttendant = function(ev) {
        var cancelConfirm = $mdDialog.confirm()
            .title('Are you sure you want to cancel?')
            .ariaLabel('Cancel')
            .targetEvent(ev)
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(cancelConfirm).then(function() {
            initTabs();
            $scope.menu.create = false;
            $scope.oldDid = null;
            $scope.menu.edit = false;
            $scope.ivrClone = null;
            $rootScope.newIvr = {};
            $scope.menu.clone = false;
            $scope.menu.respondsto = false;
            $scope.getAttendants();
            $scope.menu.main = true;
            $scope.holidayHours = [];
            $scope.weeklyHours = [];
            $scope.initDirectory();
        }, function() {

        });

    };

    $scope.getAvailableNumbers = function() {
        $scope.initDirectory();
        for (var i = 0; i < $rootScope.optionsList.length; i++) {
            for (var y = 0; y < $scope.directoryOpts.length; y++) {
                if ($scope.directoryOpts[y].available) {
                    if ($rootScope.optionsList[i].ivr_menu_option_digits == $scope.directoryOpts[
                            y].digit) {
                        $scope.directoryOpts[y].available = false;
                    }
                }
            }
        }
    };

    $scope.directoryAfterChange = function() {
        console.log("Checking Available Digits");
        for (var y = 0; y < $scope.directoryOpts.length; y++) {
            $scope.directoryOpts[y].available = true;
        }
        $scope.getAvailableNumbers();
    }


    $scope.loadOptions = function(data) {
        return dataFactory.getOptionsList(data)
            .then(function(response) {

                console.log("RESPONSE TO GET OPTIONS");
                console.log(response);
                if (response.data.success) {
                    $rootScope.optionsList = response.data.success.data;
                    console.log($rootScope.optionsList);
                    $scope.getAvailableNumbers();
                    //getRingGroups();
                    return true;
                } else {
                    console.log(response.data.error.message);
                    $rootScope.showErrorAlert(response.data.error.message);
                    $rootScope.optionsList = {};
                }
            });
    };

    $scope.checkBuildStatus = function(attendant, option) {
        if (option == 'weekly_schedule') {
            if (attendant.auto_attendant.weekly_schedule === 'true' || attendant.auto_attendant
                .holiday === 'true') return true;
        } else {
            if (attendant.auto_attendant[option] === 'true') return true;
        }
        return false;
    };

    $scope.addOptions = function() {
        $scope.myOptions.ivr_menu_uuid = $rootScope.editingAttendant.ivr_menu_uuid;
        console.log($scope.myOptions);

        if ($scope.myOptions.ivr_menu_option_digits == undefined || $scope.myOptions.ivr_menu_option_description ==
            undefined || $scope.myOptions.action == undefined) {
            $rootScope.showErrorAlert("Please fill all the fields");
        } else {
            $scope.myOptions.ivr_menu_option_uuid = "";
            if ($scope.myOptions.action == "Ring Group") {
                $scope.myOptions.ringgroup = $rootScope.ringGroupOption;
            } else if ($scope.myOptions.action == "Transfer to External Number") {
                $scope.myOptions.ivr_menu_option_param = usefulTools.cleanPhoneNumber(
                    $scope.myOptions.ivr_menu_option_param);
            } else {
                $scope.myOptions.ringgroup = "";
            }
            $scope.optionsList.push($scope.myOptions);
            $scope.myOptions = {};
            $scope.showAddOptions = false;

            $rootScope.jsonObject = {
                options: $scope.optionsList
            };
        }
        $scope.directoryAfterChange();
    };

    $scope.addNewOption = function() {
        if ($rootScope.editingOption || $scope.showAddOptions) {
            $rootScope.showErrorAlert(
                'You are already editing a Menu Option. Please complete and save that before opening another.'
            );
        } else {
            $scope.optionsitems = true;
            $scope.addedOption = {};
            $scope.showAddOptions = !$scope.showAddOptions;
            $scope.myOptions = {
                ivr_menu_uuid: ""
            };
        }
    };

    $scope.cancelInsertOption = function() {

        if ($rootScope.optionsList.length == 0) {
            $scope.optionsitems = false;
        }
        $scope.showAddOptions = !$scope.showAddOptions;
        $scope.myOptions = {};
    };

    $scope.editOptions = function(data) {
        console.log(data);
    };
    $scope.deleteOption = function(data) {
        console.log(data);
        var deleteConfirm = $mdDialog.confirm()
            .title('Are you sure you want to Delete this menu option?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(deleteConfirm).then(function() {
            if (data.ivr_menu_option_uuid != "") {
                dataFactory.postDeleteMenuOption(data)
                    .then(function(response) {
                        if (response.data.success) {
                            $rootScope.showSuccessAlert(response.data.success
                                .message);
                            $scope.initDirectory();
                            $scope.directoryAfterChange();
                            $scope.loadOptions(data.ivr_menu_uuid);

                        }
                    });
            } else {
                $scope.optionsList.splice(($scope.optionsList.indexOf(data)), 1);
                $scope.initDirectory();
                $scope.directoryAfterChange();
            }
        });
    }


    $scope.sendClass = "send-options";
    $rootScope.currentIndex = $rootScope.optionsList.length - 1;

    $scope.selectSendCallTo = function(index, sendTo, option) {
        //$rootScope.groupOption = option;
        console.log("Sending to ", sendTo);
        //if (sendTo == 'Ring Group') {
        //$rootScope.selectedOption = "RingGroup";
        //$scope.resetDrag(index, sendTo);
        //$scope.sendClass = "full-width";
        //} else
        //$scope.sendClass = "send-options";
    };

    $scope.show = function(index) {
        for (var i = 0; i < $rootScope.optionsList.length; i++)
            $rootScope.optionsList[i].show = false;
        $rootScope.optionsList[index].show = true;
        $scope.currentIndex = index;
    };

    function buildVoicemailLists(type) {
        var voicemailOptions = [];
        console.log($scope.userList.items);
        $scope.userList.items.forEach(function(user) {
            if (user.ext.length === 3) {
                if (type === 'noanswer') $rootScope.options.noAnswer.push({
                    value: 'Voicemail-' + user.ext,
                    display: 'Voicemail - ' + user.name + ' - Ext: ' + user
                        .ext
                });
                if (type === 'ivrmenu') voicemailOptions.push({
                    value: user.ext,
                    display: user.name + ' - Ext: ' + user.ext
                });
            } else {
                if (type === 'noanswer') $rootScope.options.noAnswer.push({
                    value: 'Voicemail-' + user.ext,
                    display: "Voicemail - " + $filter('tel')(user.phone) +
                        " - Ext: " + user.ext
                });
                if (type === 'ivrmenu') voicemailOptions.push({
                    value: user.ext,
                    display: user.name + ' - Ext: ' + user.ext
                });
            }
        });
        $scope.reusableDids.forEach(function(did) {
            if (type === 'noanswer') $rootScope.options.noAnswer.push({
                value: 'Voicemail-' + did.ext,
                display: "Voicemail - " + $filter('tel')(did.phone) +
                    " - Ext: " + did.ext
            });
            if (type === 'ivrmenu') voicemailOptions.push({
                value: did.ext,
                display: $filter('tel')(did.phone) + ' - Ext: ' + did.ext
            });
        });
        if (type === 'noanswer') {
            $scope.availRinggroups.forEach(function(option) {
                $rootScope.options.noAnswer.push({
                    value: 'Ringgroup-' + option.queue_extension,
                    display: "RingGroup - " + option.title + " - " + option
                        .queue_extension
                });
            });
        }
    }

    $scope.editRinggroup = function(ringgroup) {
        $scope.editingRingGroup = angular.copy(ringgroup);
        var userlist = angular.copy($scope.userList2.items);
        $rootScope.options = {
            selected: null,
            users: {
                items: userlist
            },
            services: {
                items: [{
                        label: "enterprise", // changed from "simultaneous" to enterprise temporarily.
                        tip: "Rings all group members at the same time",
                        items: []
                    },
                    {
                        label: "sequence",
                        tip: "Rings group members in order",
                        items: []
                    },
                    {
                        label: "random",
                        tip: "Rings group members randomly",
                        items: []
                    }
                ]
            },
            noAnswer: [{
                value: "Hangup",
                display: "Hangup"
            }]
        };
        console.log($scope.userList);

        buildVoicemailLists('noanswer');

        $rootScope.ringGroupOption = ringgroup.ringgroup;
        if ($rootScope.ringGroupOption.containers && $rootScope.ringGroupOption.containers
            .length > 0) {
            if ($rootScope.ringGroupOption.containers[0].items.length > 0) {
                $rootScope.ringGroupOption.containers[0].items.forEach(function(item) {
                    var index = $filter('getByUUID')($rootScope.options.users.items,
                        item.user_uuid, 'user');
                    if (index !== null) $rootScope.options.users.items.splice(
                        index, 1);
                });
            }
        }
        console.log($rootScope.ringGroupOption);
        $rootScope.ringModal("/company/ringGroup.html");
    };

    $rootScope.editingOption = null;
    $scope.editingHoliday = null;

    $scope.changeEnd = function(fromDate) {
        if (fromDate != null) {
            var index = $filter('getByUUID')($rootScope.scheduleType.holiday, $scope.editingHoliday
                .datetime_uuid, 'datetime');
            if (!$rootScope.scheduleType.holiday[index].timeEnd) $rootScope.scheduleType
                .holiday[index].timeEnd = new Date(fromDate);
            $rootScope.scheduleType.holiday[index].timeStart = new Date(fromDate);
        }
    };
    $scope.changeStart = function(toDate) {
        if (toDate != null) {
            var index = $filter('getByUUID')($rootScope.scheduleType.holiday, $scope.editingHoliday
                .datetime_uuid, 'datetime');
            if (!$rootScope.scheduleType.holiday[index].timeStart) $rootScope.scheduleType
                .holiday[index].timeStart = new Date(toDate);
            $rootScope.scheduleType.holiday[index].timeEnd = new Date(toDate);
        }
    };

    $scope.holidayEdited = function(date) {
        if ($scope.editingHoliday) return $scope.editingHoliday.datetime_uuid === date.datetime_uuid;
        return false;
    };

    $scope.addHoliday = function() {
        if ($scope.editingHoliday !== null) {
            $rootScope.showErrorAlert(
                'You are currently editing another Holiday. Please save or cancel that first.'
            );
            return;
        }
        $rootScope.scheduleType.holiday.push({
            datetime_uuid: 'add',
            timeStart: "",
            timeEnd: "",
        });
        $rootScope.scheduleType.type = 'holiday';
        var index = $filter('getByUUID')($rootScope.scheduleType.holiday, 'add',
            'datetime');
        $scope.editingHoliday = angular.copy($rootScope.scheduleType.holiday[index]);
    };

    $scope.saveHoliday = function(date) {
        if (!date.timeEnd || !date.timeStart) {
            $rootScope.showErrorAlert(
                'Both the start and end date are required to save the Holiday.');
            return;
        }
        if (date.datetime_uuid === 'add') date.datetime_uuid = null;
        var holiday = {
            datetime_uuid: date.datetime_uuid ? date.datetime_uuid : "",
            group_number: date.group_number ? date.group_number : "",
            order: date.order ? date.order : ""
        };
        if (date.timeStart && date.timeEnd) {
            if (date.timeEnd < date.timeStart) {
                date.timeEnd = date.timeStart;
            }
            if (moment.isMoment(date.timeStart) && moment.isMoment(date.timeEnd)) {
                holiday.times = date.timeStart.format('YYYY-MM-DD') + ' 00:00~' + date.timeEnd
                    .format('YYYY-MM-DD') + ' 23:59';
            } else {
                var momentStart = moment(date.timeStart);
                var momentEnd = moment(date.timeEnd);
                holiday.times = momentStart.format('YYYY-MM-DD') + ' 00:00~' +
                    momentEnd.format('YYYY-MM-DD') + ' 23:59';
            }
        }
        var data = {
            attendant: angular.copy($rootScope.newIvr),
            holiday: holiday
        };
        console.log(data);

        dataFactory.postSaveHoliday(data)
            .then(function(response) {
                if (response.data.success) {
                    if (data.attendant.ivr_menu_enabled === 'true') restartAttendant(
                        data.attendant);
                    var index = $filter('getByUUID')($rootScope.scheduleType.holiday,
                        'add', 'datetime');
                    if (index !== null) $rootScope.scheduleType.holiday.splice(
                        index, 1);
                    $scope.editingHoliday = null;
                    $scope.loadSchedule($rootScope.newIvr.ivr_menu_uuid);
                } else {
                    console.log(response.data.error.message);

                }
            })
    };

    function restartAttendant(attendant) {
        console.log(attendant);

        attendant.ivr_menu_enabled = false;
        return $scope.toggleEnable(attendant)
            .then(function() {
                attendant.ivr_menu_enabled = true;
                return $scope.toggleEnable(attendant);
            });
    }

    $scope.removeHoliday = function(date) {
        if (!$scope.hasWeekly() && !$scope.hasPresets($rootScope.newIvr) && $rootScope.scheduleType
            .holiday.length === 1) {
            $rootScope.showErrorAlert(
                'You can not delete this holiday entry at this time because an auto attendant must have at least one day of the week with set hours, have one custom holiday created or one preset holiday enabled.'
            );
            return;
        }
        dataFactory.getDeleteHoliday(date.datetime_uuid, $rootScope.newIvr.ivr_menu_uuid)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.scheduleType.holiday.splice(($rootScope.scheduleType
                        .holiday.indexOf(date)), 1);
                    $scope.loadSchedule($rootScope.newIvr.ivr_menu_uuid);
                } else {
                    console.log(response.data.error.message);

                }
            });
    };

    $scope.removeDate = function(date) {
        $rootScope.scheduleType.holiday.splice(($rootScope.scheduleType.holiday.indexOf(
            date)), 1);
    };


    $scope.greetingBeingEdited = function(greeting) {
        return $scope.editingGreeting && ($scope.editingGreeting.audio_library_uuid ===
            greeting.audio_library_uuid);
    };

    $scope.setEditGreeting = function(greeting) {
        console.log(greeting);
        $scope.editingGreeting = angular.copy(greeting);
    };

    $scope.cancelEditGreeting = function() {
        var index = $filter('getByUUID')($scope.audioLibrary, $scope.editingGreeting.audio_library_uuid,
            'audio_library');
        if (index !== null) $scope.audioLibrary[index] = angular.copy($scope.editingGreeting);
        $scope.editingGreeting = null;
    };

    $scope.saveEditGreeting = function(greeting) {
        dataFactory.updateGreetingTitle(greeting)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    var index = $filter('getByUUID')($scope.audioLibrary, greeting.audio_library_uuid,
                        'audio_library');
                    if (index !== null) $scope.audioLibrary[index] = greeting;
                    $scope.editingGreeting = null;
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            });
    };

    $scope.deleteGreeting = function(greeting) {
        var deleteConfirm = $mdDialog.confirm()
            .title('Are you sure you want to Delete the Auto Attendant Greeting?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(deleteConfirm).then(function() {
            if ($scope.aaEnabled) {
                dataFactory.deleteAaGreeting(greeting.audio_library_uuid,
                        $rootScope.newIvr.ivr_menu_uuid)
                    .then(function(response) {
                        console.log(response.data);
                        if (response.data.success) {
                            console.log(greeting.audio_library_uuid);
                            var index = $filter('getByUUID')($scope.audioLibrary,
                                greeting.audio_library_uuid,
                                'audio_library');
                            console.log(index);
                            if (index !== null) $scope.audioLibrary.splice(
                                index, 1);
                            $rootScope.newIvr.ivr_menu_greet_long =
                                response.data.success.data;
                        } else {
                            $rootScope.showErrorAlert(response.data.error.message);
                        }
                    });
            } else {
                dataFactory.deleteGreeting(greeting.audio_library_uuid)
                    .then(function(response) {
                        console.log(response.data);
                        if (response.data.success) {
                            var index = $filter('getByUUID')($scope.audioLibrary,
                                greeting.audio_library_uuid,
                                'audio_library');
                            if (index !== null) $scope.audioLibrary.splice(
                                index, 1);
                        } else {
                            $rootScope.showErrorAlert(response.data.error.message);
                        }
                    });
            }
        });
    };

    /******  Manage Voicemail Greetings ******/

    $scope.vmGreetingBeingEdited = function(greeting) {
        return $scope.editingVmGreeting && ($scope.editingVmGreeting.voicemail_greeting_uuid ===
            greeting.voicemail_greeting_uuid);
    };

    $scope.setEditVmGreeting = function(greeting) {
        console.log(greeting);
        $scope.editingVmGreeting = angular.copy(greeting);
    };

    $scope.cancelEditVmGreeting = function() {
        var index = $filter('getByUUID')($scope.voicemailGreetings, $scope.editingVmGreeting
            .voicemail_greeting_uuid, 'voicemail_greeting');
        if (index !== null) $scope.voicemailGreetings[index] = angular.copy($scope.editingVmGreeting);
        $scope.editingVmGreeting = null;
    };

    $scope.saveEditVmGreeting = function(greeting) {
        dataFactory.postUpdateAaVoicemailGreetingRecord(greeting)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    var index = $filter('getByUUID')($scope.voicemailGreetings,
                        greeting.voicemail_greeting_uuid, 'voicemail_greeting');
                    if (index !== null) $scope.voicemailGreetings[index] = greeting;
                    $scope.editingVmGreeting = null;
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            });
    };

    $scope.deleteVmGreeting = function(greeting) {
        var deleteConfirm = $mdDialog.confirm()
            .title('Are you sure you want to Delete this Voicemail Greeting?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(deleteConfirm).then(function() {
            console.log(greeting);
            console.log($scope.voicemailGreetings);
            dataFactory.deleteAaVoicemailGreeting(greeting.voicemail_greeting_uuid)
                .then(function(response) {
                    console.log(response.data);
                    if (response.data.success) {
                        console.log(greeting.voicemail_greeting_uuid);
                        var index = $filter('getByUUID')($scope.voicemailGreetings,
                            greeting.voicemail_greeting_uuid,
                            'voicemail_greeting');
                        console.log(index);
                        if (index !== null) $scope.voicemailGreetings.splice(
                            index, 1);
                        $rootScope.newIvr.ivr_menu_greet_long = response.data
                            .success.data;
                    } else {
                        $rootScope.showErrorAlert(response.data.error.message);
                    }
                });
        });
    };


    $scope.beingEdited = function(option) {
        return $rootScope.editingOption === option.ivr_menu_option_uuid;
    };

    $scope.editHoliday = function(date) {
        $scope.editingHoliday = angular.copy(date);
    };
    $scope.cancelEditingHoliday = function() {
        console.log($rootScope.scheduleType.holiday);
        var index = $filter('getByUUID')($rootScope.scheduleType.holiday, $scope.editingHoliday
            .datetime_uuid, 'datetime');
        console.log(index);
        if (index !== null) {
            if ($scope.editingHoliday.datetime_uuid === 'add') {
                $rootScope.scheduleType.holiday.splice(index, 1);
            } else {
                $rootScope.scheduleType.holiday[index] = angular.copy($scope.editingHoliday);
            }
        }
        $scope.editingHoliday = null;
    };

    $scope.setEditing = function(option) {
        if ($rootScope.editingOption || $scope.showAddOptions) {
            $rootScope.showErrorAlert(
                'You are already editing a Menu Option. Please complete and save that before opening another.'
            );
        } else {
            console.log("SET EDIT");
            $scope.editedOption = angular.copy(option);
            console.log("Edited option");
            console.log($scope.editedOption);
            $rootScope.editingOption = option.ivr_menu_option_uuid;
            if ($scope.editedOption.action === 'Transfer to External Number') {
                $scope.editedOption.external_number = $scope.editedOption.ivr_menu_option_param;
                if ($scope.editedOption.external_number.length > 10) $scope.editedOption
                    .external_number = $scope.editedOption.external_number.substring(4);
            } else if (option.action === 'Ring Group' && !$scope.fromModal) {
                //$scope.editRinggroup(option);
            }
        }

    };

    /** Manage Ring Groups  */

    $scope.deleteRinggroup = function(ringgroup) {
        var deleteConfirm = $mdDialog.confirm()
            .title(
                'Are you sure you want to delete this Ring Group? This action is permanent.'
            )
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(deleteConfirm).then(function() {
            dataFactory.getDeleteRingGroup(ringgroup.call_center_queue_uuid)
                .then(function(response) {
                    if (response.data.success) {
                        var index = $filter('getByUUID')($scope.availRinggroups,
                            ringgroup.call_center_queue_uuid,
                            'call_center_queue');
                        if (index !== null) $scope.availRinggroups.splice(
                            index, 1);
                        $scope.initDirectory();
                        $scope.getAttendants();
                    } else if (response.data.error) {
                        $rootScope.showErrorAlert(response.data.error.message);
                    }
                });
        });
    };

    $scope.manageRingGroups = function() {
        $scope.menu = {};
        $scope.menu.ringgroups = true;
        $scope.loadAvailableDid();
        loadReusableDids();
        loadValidDids($rootScope.user.domain_uuid);
    };

    $scope.manageAttendants = function() {
        $scope.menu = {};
        $scope.menu.main = true;
    };

    $scope.restartRinggroup = function(ringgroup) {
        $scope.aaWorking = {
            status: true,
            message: 'Restarting Ring Group'
        };
        dataFactory.getRestartRinggroup(ringgroup.call_center_queue_uuid)
            .then(function(response) {
                $scope.aaWorking = {};
                $rootScope.showalerts(response);
                console.log(response.data);

            });
    };

    function getRingGroups() {
        console.log($scope.domain_uuid);
        $scope.loadingRinggroups = true;
        dataFactory.getRingGroups($scope.domain_uuid)
            .then(function(response) {
                if (response.data.success) {
                    $scope.availRinggroups = response.data.success.data;
                    console.log($scope.availRinggroups);
                } else {
                    console.log(response.data.error.message);
                    $rootScope.showErrorAlert(response.data.error.message);
                }
                $scope.loadingRinggroups = false;
            });
    }
    getRingGroups();

    $scope.showAutoAttendants = function() {
        $scope.getAttendants();
        $scope.menu = {};
        $scope.menu.main = true;
    };

    $scope.showStrategy = function(ringgroup) {
        if (ringgroup.queue_strategy === "sequentially-by-agent-order") return 'Sequence';
        //if (ringgroup.queue_strategy === "ring-all") return 'Simultaneous';
        if (ringgroup.queue_strategy === "ring-all") return 'Enterprise';
        if (ringgroup.queue_strategy === "random") return 'Random';

    }

    $scope.createRingGroup = function() {
        $scope.menu = {};
        $scope.menu.ringgroups = true;
    };

    $rootScope.saveRinggroup = function() {
        console.log($rootScope.ringGroupOption);
        var option = $scope.editingRingGroup;
        option.ringgroup = $rootScope.ringGroupOption;
        if (!option.ringgroup.name) {
            $rootScope.showErrorAlert(
                'You must enter a name describing the Ring Group.');
            return;
        }
        if (option.ringgroup.containers.length === 0 || (option.ringgroup.containers &&
                option.ringgroup.containers[0].items.length === 0)) {
            $rootScope.showErrorAlert(
                'You must setup the ring pattern and add users to it before saving.'
            );
            return;
        }
        $uibModalStack.dismissAll();
        $scope.aaWorking = {
            status: true,
            message: 'Saving Ring Group'
        };
        var data = {
            domain_uuid: $scope.domain_uuid,
            queue: option
        };
        console.log(data);
        // return;
        dataFactory.postSaveRingGroup(data)
            .then(function(response) {
                if (response.data.success) {
                    var rg = response.data.success.data;
                    dataFactory.getRestartRinggroup(rg)
                        .then(function(result) {
                            if (option.call_center_queue_uuid) {
                                if (option.attendants && option.attendants.length >
                                    0) {
                                    angular.forEach(option.attendants, function(
                                        ivr) {
                                        var index = $filter('getByUUID')
                                            ($rootScope.myAttendants,
                                                ivr, 'ivr_menu');
                                        if (index !== null &&
                                            $rootScope.myAttendants[
                                                index] &&
                                            $rootScope.myAttendants[
                                                index].ivr_menu_enabled ===
                                            true) {
                                            var att = $rootScope.myAttendants[
                                                index];
                                            restartAttendant(att);
                                        }
                                    });
                                }
                            }
                            $rootScope.showalerts(response);
                            getRingGroups();
                            $scope.menu = {};
                            $scope.menu.ringgroups = true;
                            $scope.aaWorking = {};
                        });
                }
            });

    };

    /** End Manage Ring Groups */

    $scope.cancelEditing = function() {
        var index = $filter('getByUUID')($rootScope.optionsList, $rootScope.editingOption,
            'ivr_menu_option');
        if (index !== null) $rootScope.optionsList[index] = angular.copy($scope.editedOption);
        $rootScope.editingOption = null;
        //need to update the existing option to use original before editing started
    };

    $scope.showOptionsParams = function(option) {
        var display = '';
        if (option.action === 'Transfer to External Number') {
            if (option.ivr_menu_option_param.length > 10) {
                display = $filter('tel')(option.ivr_menu_option_param.substring(4));
            } else {
                display = $filter('tel')(option.ivr_menu_option_param);
            }
        } else if (option.action === 'Transfer to an Extension') {
            display = 'Ext: ' + option.ivr_menu_option_param;
        } else if (option.action === 'Ring Group') {
            display = option.ringgroup.name + ' (' + option.ivr_menu_option_param + ')';
        }
        return display;
    };

    $scope.saveOptionEditVoicemail = function(option, edited) {
        $scope.saveOption(option, edited)
            .then(function(response) {
                $scope.tabStatus.isVoicemailOpen = true;
                $scope.tabStatus.isOptionsOpen = false;
            });
    };

    $scope.showVoicemailTab = function() {
        $scope.tabStatus.isVoicemailOpen = true;
    };

    $scope.isOpen = function(type) {
        return $scope.currentTab = type;
    };

    $scope.showTargetType = function(ivr) {
        if (ivr.auto_attendant.target_type === 'ring_group') return 'Ring Group';
        if (ivr.auto_attendant.target_type === 'voicemail') return 'Send to Voicemail';
        if (ivr.auto_attendant.target_type === 'ivr_menu') return 'Ivr Menu';
    };

    $scope.saveOption = function(option, edited) {
        if (option.action == "Ring Group") {
            // $scope.aaWorking = {
            //     status: true,
            //     message: 'Saving Ring Group'
            // };
        } else if (option.action == "Transfer to External Number") {
            var number = usefulTools.cleanPhoneNumber(edited.external_number);
            option.ivr_menu_option_param = number;
        } else if (option.action === 'Send to Voicemail') {
            option.ivr_menu_option_param = $rootScope.newIvr.did.ext
        }
        var data = {
            attendant: $rootScope.newIvr,
            option: option
        };

        return dataFactory.postSaveMenuOption(data)
            .then(function(response) {
                if (response.data.success) {
                    console.log(response.data.success.data);
                    console.log(option);
                    $scope.loadOptions($rootScope.newIvr.ivr_menu_uuid)
                        .then(function(response) {
                            // if (option.action == "Ring Group") {
                            //     $scope.aaWorking = {};
                            //     $timeout(function(){
                            //         scrollTo();
                            //     });
                            // }
                            $rootScope.editingOption = null;
                            $scope.showAddOptions = false;
                            $scope.myOptions = {
                                ivr_menu_uuid: ""
                            };
                            if ($rootScope.newIvr.ivr_menu_enabled === 'true')
                                restartAttendant($rootScope.newIvr);
                        });
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            });
    };

    function scrollTo() {
        var topPos = document.getElementById('menu-options').offsetTop;
        document.getElementById('edit-auto-attendant').scrollTop = topPos - 10;
    }
    //Ring Group

    $scope.showPlaceHolder = function() {
        return "dndPlaceholder";
    };

    $scope.createNewRinggroup = function() {
        var userlist = angular.copy($scope.userList2.items);
        $rootScope.options = {
            selected: null,
            users: {
                items: userlist
            },
            services: {
                items: [{
                        label: "enterprise", // changed from "simultaneous" to "enterprise" temporarily.
                        tip: "Rings all group members at the same time",
                        items: []
                    },
                    {
                        label: "sequence",
                        tip: "Rings group members in order",
                        items: []
                    },
                    {
                        label: "random",
                        tip: "Rings group members randomly",
                        items: []
                    }
                ]
            },
            noAnswer: [{
                value: "Hangup",
                display: "Hangup"
            }]
        };
        buildVoicemailLists('noanswer');

        $scope.editingRingGroup = {};

        $rootScope.ringGroupOption = {
            containers: [],
            timeout: 120,
            noAnswer: "Hangup"
        };

        $rootScope.ringModal("/company/ringGroup.html");
        console.log($rootScope.ringGroupOption);
    };


    // Initialize model
    $scope.model = [
        [],
        []
    ];

});
