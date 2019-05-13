'use strict';

proySymphony.controller('CallRecordingCtrl', function($scope, $rootScope, $window, dataFactory,
    usefulTools, $filter, symphonyConfig, contactService, callService, emulationService, integrationService,
    greenboxService) {


    $scope.vvmTableHeight = $window.innerHeight - 350;
    $scope.perPage = 20;
    $scope.maxSize = 50;
    $scope.predicate = 'start_stamp';
    $scope.reverse = true;
    $scope.currentPage = 1;
    $scope.filtered = {};
    $rootScope.callRecordings = [];
    //$rootScope.exportType = $window.localStorage.getItem("exportType");
    $scope.ppOptions = [10, 20, 50, 100];
    $scope.activityList = greenboxService.ams360ActivityList;
    if (!$rootScope.nonContacts) $rootScope.nonContacts = JSON.parse($window.localStorage.getItem(
        "nonContacts"));

    /******** Preload Call Recording ************** */

    $rootScope.showTable = false;

    $scope.showChevron = function(predicate) {
        return usefulTools.showChevron(predicate, $scope.predicate, $scope.reverse);
    };

    $rootScope.getRecordedCalls = function(user_uuid) {

        var data = {
            user_uuid: user_uuid,
            from_date: ($scope.fromDate ? $scope.fromDate : new Date(moment().subtract(
                30, 'days'))),
            to_date: ($scope.toDate ? $scope.toDate : new Date())
        };

        dataFactory.getRetrieveRecordingslList(data)
            .then(function(response) {
                if (response.data.success) {
                    if (__env.enableDebug) console.log("RECORDED CALLS");
                    if (__env.enableDebug) console.log(response.data.success.data);
                    $rootScope.callRecordings = response.data.success.data;
                    angular.forEach($rootScope.callRecordings, function(call) {
                        if (call.call_direction === 'outbound') call.contact_number =
                            call.destination_number;
                        if (call.call_direction === 'inbound') call.contact_number =
                            call.caller_id_number;
                        call.message_length = parseInt(call.duration);
                        call.description = '';
                        if (call.destination_number == 10000 || call.destination_number ===
                            '1' + call.caller_id_number) call.description =
                            '(Conference Call)';
                        if (call.destination_number === '10' + call.caller_id_number)
                            call.description = '(Three-way Call)';

                    });
                    if (__env.enableDebug) console.log("CALL RECORDINGS");
                    if (__env.enableDebug) console.log($rootScope.callRecordings);
                    $rootScope.showTable = true;
                    if (user_uuid === $rootScope.user.id) $window.localStorage.setItem(
                        "callRecordings", JSON.stringify($rootScope.callRecordings)
                    );
                }
            }, function(error) {
                if (__env.enableDebug) console.log("RECORDINGS ERROR");
                if (__env.enableDebug) console.log(error);
            });
    };

    $scope.openContactInManagementSystem = function(phone, contact) {
        integrationService.openContactInManagementSystem(phone, contact);
    };

    $scope.showContactName = function(call) {
        var contact = $scope.callContact(call);
        return usefulTools.showContactName(contact, call.contact_number);
    };

    $scope.callContact = function(entity) {
        return contactService.theContact(entity);
    };

    contactService.registerOnContactLoadCallback(function() {
        $rootScope.getRecordedCalls($rootScope.user.id);
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

    $scope.playingRecording = null;

    $scope.audioUrl = function(call) {
        // return symphonyConfig.audioUrl + filepath;
        var baseUrl = __env.apiUrl ? __env.apiUrl : symphonyConfig.onescreenUrl;
        var downloadUrl = baseUrl + '/call/recordings/downloadauto/' + call.extension_uuid +
            '/' + call.call_history_fs_uuid + '?token=' + $rootScope.userToken;
        return downloadUrl;
    };
    $scope.downloadRecordingUrl = function(call) {
        var baseUrl = __env.apiUrl ? __env.apiUrl : symphonyConfig.onescreenUrl;
        var downloadUrl = baseUrl + '/call/recordings/downloadmultiple/' + call.extension_uuid +
            '/' + call.call_uuid + '?token=' + $rootScope.userToken;
        return downloadUrl;
    };

    $scope.makeCall = function(number) {

        if (callService.currentCalls().length === 2) {
            var message = "You may only participate in two calls at a time. " +
                "Please hang up one of your calls if you would like to make " +
                "another.";
            $rootScope.showInfoAlert(message);
        } else {
            callService.makeCall(number);
        }
    };

    $scope.searchRecording = function(item) {
        if (!item.contact) {
            var contact = $scope.callContact(item);
            if (contact) item.contact = contact;
        }
        if (!$scope.filterSearch ||
            (item.contact_number && item.contact_number.toLowerCase().indexOf($scope.filterSearch
                .toLowerCase()) != -1) ||
            (item.noncontact && item.noncontact.name && item.noncontact.name.toLowerCase()
                .indexOf($scope.filterSearch.toLowerCase()) != -1) ||
            (item.noncontact && item.noncontact.phone && item.noncontact.phone.toLowerCase()
                .indexOf($scope.filterSearch.toLowerCase()) != -1) ||
            (item.contact && item.contact.ext && item.contact.ext
                .indexOf($scope.filterSearch.toLowerCase()) != -1) ||
            (item.contact && item.contact.name.toLowerCase().indexOf(
                $scope.filterSearch.toLowerCase()) != -1)) return true;
        if (item.contact && item.contact.nums.length > 0) {
            var found = false;
            angular.forEach(item.contact.nums, function(phone) {
                if (phone.num.indexOf($scope.filterSearch) != -1) {
                    found = true;
                }
            });
            return found;
        }
        return false;
    };

    $scope.emulatedUser = function() {
        return emulationService.emulatedUser;
    };

    $scope.copyRecordingToHawksoft = function(call) {
        var partner = $rootScope.user.exportType.partner_code;
        call.type = "callRecordings";
        call.number = usefulTools.cleanPhoneNumber(call.call_direction ==
            'inbound' ? call.caller_id_number : call.destination_number);
        if ($rootScope.user.exportType.partner_code == 'ams360') {
            if ($scope.activityList.length != 0) {
                angular.forEach($scope.activityList, function(activity) {
                    if (activity.Description.includes('phone')) {
                        call['activity'] = activity.Description;
                        return;
                    }
                });
            }
            $rootScope.copyToAms360(call);
        } else if ($rootScope.user.exportType.partner_code == 'qqcatalyst') {
            $rootScope.copyToQQCatalyst(call);
        } else {
            integrationService.copyEntityToPartner(call);
        }
    };

    $rootScope.playRecording = function(index) {
        if ($rootScope.callRecordings[index].vm_status === 'unread') {
            $rootScope.callRecordings[index].vm_status = 'saved';
            dataFactory.getSaveRecording($rootScope.callRecordings[index].visual_voicemail_uuid);
            $rootScope.unreadRecordings--;
        }
        var vm = $rootScope.callRecordings[index];
        if ($scope.audio) $scope.audio.pause();
        $scope.audio = new Audio(symphonyConfig.audioUrl +
            '/imported/freeswitch/storage/voicemail/default/' + vm.vm_file);
        $scope.playingRecording = index;
        $scope.audio.play();
    };
    $rootScope.stopRecording = function() {
        $scope.audio.pause();
        $scope.playingRecording = null;
        $scope.audioPlaying = false;
    };

    $scope.removeRecording = function(uuid) {
        dataFactory.removeRecording(uuid)
            .then(function(response) {
                $rootScope.showalerts(response);
                var index = $filter('getByUUID')($rootScope.callRecordings, uuid,
                    'call_history_fs');
                if (response.data.success && index !== null) $rootScope.callRecordings
                    .splice(index, 1);
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };

    $scope.setPage = function(pageNo) {
        $scope.currentPageVVM = pageNo;
    };
    $scope.sort_by = function(predicate) {
        if (predicate === $scope.predicate) {
            $scope.reverse = !$scope.reverse;
        } else {
            $scope.predicate = predicate;
        }
    };

    $scope.getIcon = function(column) {
        if (column === $scope.predicate) {
            if ($scope.reverse) {
                return 'glyphicon-chevron-down';
            } else {
                return 'glyphicon-chevron-up';
            }
        } else {
            return 'glyphicon-chevron-down';
        }
    };

    /************************************************ */
    // Date Functions
    /************************************************ */
    var today = new Date();
    $scope.fromDate = new Date(moment().subtract(30, 'days'));
    $scope.toDate = new Date();
    $scope.displayFromDate = new Date(moment().subtract(30, 'days'));
    $scope.displayToDate = new Date();
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

    $scope.processFromDate = function(fromDate) {
        if (fromDate != null) {
            var newFromDate = new Date(fromDate);
            if (!$scope.toDate || $scope.toDate < newFromDate) {
                var ToMinDate = newFromDate;
                $scope.toDateOptions.minDate = ToMinDate;
                $scope.toDate = ToMinDate;
            }
            var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() : $rootScope
                .user.id);
            //$rootScope.functGetCallHistory(user_uuid);
            $scope.getRecordedCalls(user_uuid);
        }
    };
    $scope.processToDate = function(toDate) {
        if (toDate != null) {
            if (!$scope.fromDate || $scope.fromDate > toDate) $scope.fromDate = new Date(
                toDate);
            $scope.toDate = new Date(toDate);
        }
        var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() : $rootScope.user
            .id);
        $scope.getRecordedCalls(user_uuid);
    };
    $scope.processFromDate();

    $scope.OpenfromDate = function() {
        $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
    };
    $scope.OpentoDate = function() {
        $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
    };

    $scope.clearDateSearch = function() {
        $scope.displayFromDate = new Date(moment().subtract(30, 'days'));
        $scope.displayToDate = new Date();
        $scope.fromDate = '';
        $scope.toDate = '';
        $scope.currentPage = 1;
        var user_uuid = ($scope.emulatedUser() ? $scope.emulatedUser() : $rootScope.user
            .id);

        $scope.getRecordedCalls(user_uuid);
    };

    $scope.dateFilter = function(message, index, array) {

        //var messageDate = new Date(message.start_stamp.split(' ')[0] + " 00:00:00");
        var fromDate = $scope.fromDate ? moment($scope.fromDate) : null;
        var toDate = $scope.toDate ? moment($scope.toDate) : null;
        if (fromDate && fromDate > message.start_stamp) {
            return false;
        } else if ($scope.toDate && $scope.toDate < message.start_stamp) {
            return false;
        } else {
            return true;
        }
    };

    // Bilal Trying to get the Total Recorded Time attempt
    $scope.convertTime = function(timeStr) {
        var hh = Math.floor((parseInt(timeStr.slice(0, 2)) * 3600));
        var mm = Math.floor(((parseInt(timeStr.slice(3, 5)) * 3600) / 60));
        var ss = parseInt(timeStr.slice(6, 8));

        console.log('hh: ', hh, ' mm: ', mm, ' ss: ', ss);
        var combined = hh + mm + ss;
        // debugger;
        return combined;
    }

    $scope.durationFormat = function(callTime, startTime, createdAt) {
        // debugger;
        // callTime = "0" + callTime;
        callTime = parseInt(callTime);
        startTime = startTime.slice(11);
        createdAt = createdAt.slice(11);
        // callTime = $scope.convertTime(callTime);
        startTime = $scope.convertTime(startTime);
        createdAt = $scope.convertTime(createdAt);

        // debugger;
        // var intCallTime = $rootScope.formatTime(callTime);
        // var intStartTime = $rootScope.formatTime(startTime);
        // var intCreatedAt = $rootScope.formatTime(createdAt);

        var combined = callTime + startTime;
        // var combined = createdAt - startTime;
        // var combined = (createdAt + callTime);
        // var total = combined - startTime;
        var total = createdAt - combined;

        // startTime = parseInt((new Date(startTime).getTime() / 1000).toFixed(0))
        // createdAt = parseInt((new Date(createdAt).getTime() / 1000).toFixed(0))
        // console.log('CallTime: ' + intCallTime);
        // console.log('StartTime: ' + intStartTime);
        // console.log('CreatedAt: ' + intCreatedAt);

        console.log('CallTIme: ' + callTime);
        console.log('StartTime: ' + startTime);
        console.log('CreatedAt: ' + createdAt);

        return total;
    }
});
