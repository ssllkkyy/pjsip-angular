'use strict';

proySymphony.controller('BridgeAnalyticsCtrl', function($scope, $timeout, $rootScope, $location, _,
    userService, contactService, $filter, dataFactory, bridgeAnalyticsService, $window) {

    var bas = bridgeAnalyticsService;
    $scope.selectedUser = null;
    $scope.selectedLocation = null;
    $scope.selectedType = null;
    $scope.selectedData = {
        selectedUser: null,
        selectedLocation: null,
        selectedType: null,
        selectedAA: null,
        selectedRG: null,
        fromDate: null,
        toDate: null,
        day: null,
        calls: [],
        messages: [],
        outbound_msg: 0,
        inbound_msg: 0,
        totalcalls: 0,
        total_min: 0,
        outbound: 0,
        outbound_min: 0,
        inbound: 0,
        inbound_min: 0,
        missed: 0,
        answered: 0,
        voicemails: 0,
        declined: 0
    };

    $scope.loadingCallsData = false;
    $scope.loadingTextsData = false;
    $scope.loadingQuoteSheetsData = false;
    $scope.loadingData = false;
    $scope.loadingDailyData = false;
    $scope.hoursArray = [];
    $scope.types = ['DID', 'Auto Attendant', 'Ring Group'];
    $scope.colors = ['#666666', '#f8a632', '#0073a5', '#0c6c2c', '#e30400', '#f58987',
        '#66b1b2'
    ];
    //'#0c6c2c'(green),'#f8a632'(orange),'#e30400'(red),'#666666'(grey),'#0073a5'('blue'),'#f58987'(pink),'#66b1b2'(declined color)

    var today = new Date();

    function getMonday(d) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    $scope.displayFromDate = getMonday(new Date());
    $scope.displayToDate = new Date();
    $scope.dateFormat = 'MM-dd-yyyy';
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
        minDate: new Date(2016, 1, 1),
        maxDate: today
    };

    $scope.fromDatePopup = {
        opened: false
    };

    $scope.toDatePopup = {
        opened: false
    };

    $scope.dayDatePopup = {
        opened: false
    };

    $scope.processFromDate = function(fromDate) {
        if (fromDate != null) {
            var newFromDate = new Date(fromDate);
            if (!$scope.selectedData.toDate || $scope.selectedData.toDate < newFromDate) {
                var ToMinDate = newFromDate;
                $scope.toDateOptions.minDate = ToMinDate;
                $scope.selectedData.fromDate = ToMinDate;
            }
            $scope.loadData();
        }
    };
    $scope.processToDate = function(toDate) {
        if (toDate != null) {
            if (!$scope.selectedData.fromDate || $scope.selectedData.fromDate > toDate)
                $scope.selectedData.fromDate = new Date(toDate);
            $scope.selectedData.toDate = new Date(toDate);
            $scope.loadData();
        }
    };
    $scope.processDayDate = function(day) {
        if (day != null) {
            $scope.selectedData.day = new Date(day);
        } else {
            $scope.selectedData.day = new Date();
        }
        if ($scope.users && $scope.locations) {
            loadDailyActivity();
        }
    };

    $scope.processFromDate();
    $scope.processToDate();


    $scope.OpenfromDate = function() {
        $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
    };
    $scope.OpentoDate = function() {
        $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
    };

    $scope.OpenDay = function() {
        $scope.dayDatePopup.opened = !$scope.dayDatePopup.opened;
    };

    $scope.clearDateSearch = function() {
        $scope.displayFromDate = getMonday(new Date());
        $scope.displayToDate = new Date();
        $scope.selectedData.selectedUser = null;
        $scope.selectedData.selectedLocation = null;
        $scope.selectedData.fromDate = '';
        $scope.selectedData.toDate = '';
    };

    $scope.users = function() {
        var users = [];
        var list;
        if (userService.isAdminGroupOrGreater() && contactService.getUserContactsOnly()) {
            angular.forEach(contactService.getUserContactsOnly(), function(contact) {
                if (contact && !contactService.isKotterTechUser(contact)) users.push(contact);
            });
        } else {
            angular.forEach(bas.users, function(user) {
                var contact = contactService.getContactByUserUuid(user);
                if (contact) {
                    var found = _.find(users, {'user_uuid': contact.user_uuid});
                    if (!found) users.push(contact);
                }
                
            });
        }
        if ($scope.selectedData.selectedLocation) {
            function locMemberMatchesUser(user) {
                return function(allUsers) {
                    return allUsers.user_uuid === user.user_uuid;
                };
            }

            function isMemberOfLocGroup(user) {
                return _.find($scope.selectedData.selectedLocation.allUsers,
                    locMemberMatchesUser(user));
            };
            users = users.filter(isMemberOfLocGroup);
        }
        return users;
    };

    $scope.getRingGroups = function() {
        $scope.ringGroups = [];
        dataFactory.getRingGroups()
            .then(function(response) {
                if (response.data.success) {
                    $scope.ringGroups = response.data.success.data;
                } else if(response.data.length > 0) {
                    $scope.ringGroups = response.data;
                }
            });
    };

    $scope.getRingGroups();

    $scope.getIvrs = function() {
        $scope.autoAttendants = [];
        dataFactory.getIvrs()
            .then(function(response){
                if(response.data) {
                    $scope.autoAttendants = response.data;
                }
            });
    }

    $scope.getIvrs();

    $scope.downloadData = function() {
        $rootScope.$broadcast('download.detail.data', $scope.dataShowing);
    };

    function init() {
        $scope.selectedData.fromDate = getMonday(new Date());
        $scope.selectedData.toDate = new Date();
        $scope.loadingCallsData = true;
        $scope.selectedData.day = new Date();
        $scope.loadingTextsData = true;
        $scope.loadingQuoteSheetsData = true;
        $scope.loadingData = true;
        $scope.dataShowing = 'none';
        for (var i = 0; i < 24; i++) {
            $scope.hoursArray.push({
                "time": i,
                "value": 0
            });
        }
        bas.registerOnAfterDataShowingChangesCB(updateDataShowing);
        if (bas.initialized) {
            loadCollections();
        } else {
            bas.registerOnAfterInitCallback(loadCollections);
        }
    };

    function loadCollections() {
        // $scope.users = bas.users;
        $scope.locations = bas.locations;
        if (bas.selectedUser) {
            $scope.selectedData.selectedUser = bas.selectedUser;
        }
        var loc;
        var locUuid = $window.localStorage.getItem(getLSLocKey());
        if (locUuid) {
            loc = _.find($scope.locations, ['locations_group_uuid', locUuid]);
        }
        if (loc) {
            $window.localStorage.setItem(getLSLocKey(), loc.locations_group_uuid);
            $scope.selectedData.selectedLocation = loc;
        } else if (bas.selectedLocation) {
            $scope.selectedData.selectedLocation = bas.selectedLocation;
        }
        $scope.processDayDate();
        $scope.loadData();
    };

    function updateDataShowing() {
        $scope.dataShowing = bas.dataShowing;
    };

    function getLSLocKey() {
        return "loc-selector" + $location.path();
    };

    $scope.loadData = function() {
        var data = {
            domain_uuid: $rootScope.user.domain_uuid,
            date_from: $scope.selectedData.fromDate ? formatDate($scope.selectedData
                .fromDate) : formatDate(getMonday(new Date())),
            date_to: $scope.selectedData.toDate ? formatDate($scope.selectedData.toDate) : formatDate(new Date())
        };

        if ($scope.selectedData.selectedLocation) {
            var locationUuid = $scope.selectedData.selectedLocation.locations_group_uuid;
            $window.localStorage.setItem(getLSLocKey(), locationUuid);
        }

        if ($scope.selectedData.selectedType) {
            data.type = $scope.selectedData.selectedType;
            if (data.type != 'Auto Attendant' && data.type != 'Ring Group') {
                $scope.selectedData.selectedAA = null;
                $scope.selectedData.selectedRG = null;
            } else {
                if ($scope.selectedData.selectedUser) data.user_uuid = $scope.selectedData
                    .selectedUser.user_uuid;
            }
        }

        if (!$scope.locations || $scope.locations.length === 0) {
            data.user_uuid = $rootScope.user.id;
        } else if ($scope.selectedData.selectedUser && data.type != 'Auto Attendant' &&
            data.type != 'Ring Group') {
            data.user_uuid = $scope.selectedData.selectedUser.user_uuid;
        } else {
            data.location_groups = [];
            data['allUsers'] = [];
            console.log($scope.selectedData.selectedLocation);
            if ($scope.selectedData.selectedLocation) {
                var allusers = [];
                if ($scope.isManagerOrAdmin()) {
                    allusers = $scope.selectedData.selectedLocation.members;
                    angular.forEach($scope.selectedData.selectedLocation.managers,
                        function(manager) {
                            var index = $filter('getByUUID')(allusers, manager.user_uuid,
                                'user');
                            if (index == null) allusers.push(manager);
                        });

                    data.allUsers = bas.getAllUsersInLocation($scope.selectedData.selectedLocation);

                } else {
                    if ($scope.selectedData.selectedLocation.ismanager) {
                        allusers = $scope.selectedData.selectedLocation.members;
                        angular.forEach($scope.selectedData.selectedLocation.managers,
                            function(manager) {
                                var index = $filter('getByUUID')(allusers, manager.user_uuid,
                                    'user');
                                if (index == null) allusers.push(manager);
                            });
                    } else if ($scope.selectedData.selectedLocation.isuser) {
                        allusers.push($rootScope.user);
                    }

                    data.allUsers = bas.getAllUsersInLocation($scope.selectedData.selectedLocation);
                }

                $scope.selectedData.selectedLocation['allUsers'] = allusers;
                data.location_groups.push($scope.selectedData.selectedLocation.locations_group_uuid);
                //$scope.autoAttendants = $scope.selectedData.selectedLocation.ivrs;
            } else {
                $scope.locations.forEach(function(element) {
                    data.location_groups.push(element.locations_group_uuid);
                    element['allUsers'] = bas.getAllUsersInLocation(element);

                    angular.forEach(element.allUsers, function(user) {
                        if (!data.allUsers.includes(user)) {
                            data.allUsers.push(user);
                        }
                    });
                });
            }

            if ($scope.selectedData.selectedAA) {
                if ($scope.selectedData.selectedAA.ivr_menu_extension)  {
                    data.autoAttendant = $scope.selectedData.selectedAA.ivr_menu_extension;
                }
            }

            if ($scope.selectedData.selectedRG) {
                if ($scope.selectedData.selectedRG.queue_extension)  {
                    data.ringGroup = $scope.selectedData.selectedRG.queue_extension;
                } else if($scope.selectedData.selectedRG.ring_group_extension) {
                    data.ringGroup = $scope.selectedData.selectedRG.ring_group_extension;
                }
            }
        }

        $scope.loadingCallsData = true;
        $scope.loadingTextsData = true;
        $scope.loadingQuoteSheetsData = true;
        $scope.loadingData = true;
        // $scope.loadingDailyData = true;
        console.log(data);
        bas.loadCallHistoryInfo(data).then(function(response) {
            if (response) {
                $scope.selectedData.calls = response.calls;
                $scope.selectedData.totalcalls = response.totalcalls;
                $scope.selectedData.outbound = response.outbound;
                $scope.selectedData.inbound = response.inbound;
                $scope.selectedData.answered = response.answered;
                $scope.selectedData.missed = response.missed;
                $scope.selectedData.voicemails = response.voicemails;
                $scope.selectedData.outbound_min = response.outbound_min;
                $scope.selectedData.inbound_min = response.inbound_min;
                $scope.selectedData.declined = response.declined;
                $scope.selectedData.total_min = $scope.selectedData.outbound_min +
                    $scope.selectedData.inbound_min;
                $scope.calls_data[0].values[0].value = $scope.selectedData.outbound_min /
                    60;
                $scope.calls_data[0].values[1].value = $scope.selectedData.inbound_min /
                    60;
                if ($scope.selectedData.outbound > 0 && $scope.selectedData.outbound_min >
                    0) {
                    var minutes = $scope.selectedData.outbound_min / 60;
                    $scope.avg_call_length_data[0].values[0].value = minutes /
                        $scope.selectedData.outbound;
                } else {
                    $scope.avg_call_length_data[0].values[0].value = 0;
                }
                if ($scope.selectedData.answered > 0 && $scope.selectedData.inbound_min >
                    0) {
                    var minutes = $scope.selectedData.inbound_min / 60;
                    $scope.avg_call_length_data[0].values[1].value = minutes /
                        $scope.selectedData.answered;
                } else {
                    $scope.avg_call_length_data[0].values[1].value = 0;
                }
                if ($scope.api_calls) {
                    $scope.api_calls.update();
                    $scope.api_calls.refreshWithTimeout(100);
                }
                if ($scope.api_calls_avg) {
                    $scope.api_calls_avg.update();
                    $scope.api_calls_avg.refreshWithTimeout(100);
                }

            } else {
                $scope.selectedData.calls = [];
                $scope.selectedData.messages = [];
                $scope.selectedData.outbound_msg = 0;
                $scope.selectedData.inbound_msg = 0;
                $scope.selectedData.totalcalls = 0;
                $scope.selectedData.total_min = 0;
                $scope.selectedData.outbound = 0;
                $scope.selectedData.outbound_min = 0;
                $scope.selectedData.inbound = 0;
                $scope.selectedData.inbound_min = 0;
                $scope.selectedData.missed = 0;
                $scope.selectedData.answered = 0;
                $scope.selectedData.voicemails = 0;
                $scope.selectedData.declined = 0;
                $scope.calls_data[0].values[0].value = 0;
                $scope.calls_data[0].values[1].value = 0;
                $scope.avg_call_length_data[0].values[0].value = 0;
                $scope.avg_call_length_data[0].values[1].value = 0;

            }
            $scope.loadingCallsData = false;
            $scope.loadingQuoteSheetsData = false;
            $scope.loadingData = false;
            if ($scope.selectedData.selectedType != 'Auto Attendant' && $scope.selectedData
                .selectedType != 'Ring Group') {
                bas.loadTextMessagesHistoryInfo(data).then(function(response) {
                    if (response) {
                        console.log(response);
                        $scope.selectedData.messages = response.messages;
                        $scope.selectedData.outbound_msg = response.outbound;
                        $scope.selectedData.inbound_msg = response.inbound;
                        $scope.text_messages_data[0].values[0].value =
                            $scope.selectedData.outbound_msg;
                        $scope.text_messages_data[0].values[1].value =
                            $scope.selectedData.inbound_msg;
                        if ($scope.api_texts) {
                            $scope.api_texts.update();
                            $scope.api_texts.refreshWithTimeout(100);
                        }
                    }
                    $scope.loadingTextsData = false;
                    data.date = $scope.selectedData.day ? formatDate(
                        $scope.selectedData.day) : formatDate(new Date());
                    // bas.loadDailyDetailedInfo(data).then(function(response){
                    //     if(response){
                    //         updateChartsArrays(response);
                    //     }
                    // });
                });
            }
        });
    };

    $scope.gral_config = {
        visible: true, // default: true
        extended: false, // default: false
        disabled: false, // default: false
        refreshDataOnly: true, // default: true
        deepWatchOptions: true, // default: true
        deepWatchData: true, // default: true
        deepWatchDataDepth: 2, // default: 2
        debounce: 10 // default: 10
    };

    $scope.config = {
        visible: true, // default: true
        extended: false, // default: false
        disabled: false, // default: false
        refreshDataOnly: true, // default: true
        deepWatchOptions: true, // default: true
        deepWatchData: true, // default: true
        deepWatchDataDepth: 0, // default: 2
        debounce: 10 // default: 10
    };

    $scope.calls_opt = {
        chart: {
            type: 'discreteBarChart',
            height: 400,
            color: $scope.colors.slice(1, $scope.colors.length),
            margin: {
                top: 20,
                right: 20,
                bottom: 60,
                left: 100
            },
            x: function(d) {
                return d.label;
            },
            y: function(d) {
                return d.value;
            },
            showValues: true,
            valueFormat: function(d) {
                return $scope.formatMinutes(d);
            },
            transitionDuration: 300,
            xAxis: {
                // axisLabel: 'Calls'
            },
            yAxis: {
                axisLabel: 'Minutes (mm:ss)',
                axisLabelDistance: 3,
                tickFormat: function(d) {
                    return $scope.formatMinutes(d);
                },
            },
            callback: function(chart) {
                chart.discretebar.dispatch.on('elementDblClick', function(e) {
                    $scope.callType = e.data.label;
                    $scope.dataShowing = 'calls';
                    console.log('calls');
                    bas.setDataShowing('calls', $scope.selectedData.fromDate,
                        $scope.selectedData.toDate, $scope.selectedData
                        .selectedUser, $scope.selectedData.selectedLocation,
                        $scope.callType);
                });
                chart.discretebar.dispatch.on('elementClick', function(e) {
                    $scope.callType = e.data.label;
                    $scope.dataShowing = 'calls';
                    bas.setDataShowing('calls', $scope.selectedData.fromDate,
                        $scope.selectedData.toDate, $scope.selectedData
                        .selectedUser, $scope.selectedData.selectedLocation,
                        $scope.callType);
                });
                chart.discretebar.dispatch.on('chartClick', function(e) {
                    $scope.callType = e.data.label;
                    $scope.dataShowing = 'calls';
                    bas.setDataShowing('calls', $scope.selectedData.fromDate,
                        $scope.selectedData.toDate, $scope.selectedData
                        .selectedUser, $scope.selectedData.selectedLocation,
                        $scope.callType);
                });
                chart.forceY([0]);
            }
        },
        title: {
            enable: true,
            text: 'Calls Summary',
            css: {
                color: '#0073a5'
            }
        }
    };

    $scope.openShowDetails = function(callType) {
        if (callType == 'total') {
            bas.setDataShowing('calls', $scope.selectedData.fromDate, $scope.selectedData
                .toDate, $scope.selectedData.selectedUser, $scope.selectedData.selectedLocation,
                null);
        } else {
            bas.setDataShowing('calls', $scope.selectedData.fromDate, $scope.selectedData
                .toDate, $scope.selectedData.selectedUser, $scope.selectedData.selectedLocation,
                callType);
        }
    }

    $scope.goBackToCharts = function() {
        $scope.dataShowing = 'none';
        $scope.loadData();
    };
    $scope.text_messages_opt = {
        chart: {
            type: 'discreteBarChart',
            height: 400,
            color: $scope.colors.slice(1, $scope.colors.length),
            margin: {
                top: 20,
                right: 20,
                bottom: 60,
                left: 100
            },
            x: function(d) {
                return d.label;
            },
            y: function(d) {
                return d.value;
            },
            showValues: true,
            valueFormat: function(d) {
                return d3.format(',f')(d);
            },
            transitionDuration: 300,
            xAxis: {
                // axisLabel: 'Text Messages'
            },
            yAxis: {
                axisLabel: 'Number',
                axisLabelDistance: 3
            },
            callback: function(chart) {

                chart.discretebar.dispatch.on('elementDblClick', function(e) {
                    $scope.dataShowing = 'messages';
                    bas.setDataShowing('messages', $scope.selectedData.fromDate,
                        $scope.selectedData.toDate, $scope.selectedData
                        .selectedUser, $scope.selectedData.selectedLocation
                    );
                });
                chart.discretebar.dispatch.on('elementClick', function(e) {
                    $scope.dataShowing = 'messages';
                    bas.setDataShowing('messages', $scope.selectedData.fromDate,
                        $scope.selectedData.toDate, $scope.selectedData
                        .selectedUser, $scope.selectedData.selectedLocation
                    );
                });
                chart.discretebar.dispatch.on('chartClick', function(e) {
                    $scope.dataShowing = 'messages';
                    bas.setDataShowing('messages', $scope.selectedData.fromDate,
                        $scope.selectedData.toDate, $scope.selectedData
                        .selectedUser, $scope.selectedData.selectedLocation
                    );
                });

                chart.forceY([0]);

            }
        },
        title: {
            enable: true,
            text: 'Text Messages Summary',
            css: {
                color: '#0073a5'
            }
        }
    };

    $scope.avg_call_length_opt = {
        chart: {
            type: 'discreteBarChart',
            height: 400,
            color: $scope.colors.slice(1, $scope.colors.length),
            margin: {
                top: 20,
                right: 20,
                bottom: 60,
                left: 100
            },
            x: function(d) {
                return d.label;
            },
            y: function(d) {
                return d.value;
            },
            showValues: true,
            valueFormat: function(d) {
                return $scope.formatMinutes(d);
            },
            transitionDuration: 300,
            xAxis: {
                // axisLabel: 'Average Calls Length'
            },
            yAxis: {
                axisLabel: 'Average Minutes (mm:ss)',
                axisLabelDistance: 3,
                tickFormat: function(d) {
                    return $scope.formatMinutes(d);
                },
            }
        },
        title: {
            enable: true,
            text: 'Average Call Length',
            css: {
                color: '#0073a5'
            }
        }
    };

    $scope.avg_call_length_data = [{
        key: "Average Calls Length",
        values: [{
                "label": "Outbound",
                "value": 0
            },
            {
                "label": "Inbound",
                "value": 0
            }
        ]
    }];

    $scope.text_messages_data = [{
        key: "Texts Messages Summary",
        values: [{
                "label": "Sent",
                "value": 0
            },
            {
                "label": "Received",
                "value": 0
            }
        ]
    }];

    $scope.calls_data = [{
        key: "Calls Summary",
        values: [{
                "label": "Outbound",
                "value": 0
            },
            {
                "label": "Inbound",
                "value": 0
            }
        ]
    }];

    $scope.hourly_options = {
        chart: {
            type: 'lineChart',
            height: 350,
            margin: {
                top: 20,
                right: 20,
                bottom: 60,
                left: 65
            },
            x: function(d) {
                return d.time;
            },
            y: function(d) {
                return d.value;
            },
            //average: function(d) { return d.mean; },
            duration: 300,
            clipVoronoi: false,
            valueFormat: function(d) {
                return d3.format('.0f')(d);
            },
            xAxis: {
                axisLabel: 'Time of day',
                showMaxMin: false,
            },

            yAxis: {
                axisLabel: 'Number of calls',
                axisLabelDistance: 0
            },
            callback: function(chart) {
                chart.forceY([0]);
            }
        },
        title: {
            enable: true,
            text: 'Hourly Activity',
            css: {
                color: '#0073a5'
            }
        }
    };

    $scope.hourly_activity_data = [{
            key: "Inbound",
            color: '#0073a5',
            values: []
        },
        {
            key: "Outbound",
            color: '#f8a632',
            values: []
        }
    ];

    $scope.detailed_options = {
        chart: {
            type: 'lineChart',
            height: 350,
            margin: {
                top: 20,
                right: 20,
                bottom: 60,
                left: 65
            },
            x: function(d) {
                return d.time;
            },
            y: function(d) {
                return d.value;
            },
            //average: function(d) { return d.mean; },
            duration: 300,
            clipVoronoi: false,
            xAxis: {
                axisLabel: 'Time of day',
                showMaxMin: false,
            },

            yAxis: {
                axisLabel: 'Number of calls',
                axisLabelDistance: 0,
            },
            callback: function(chart) {
                chart.forceY([0]);
            }
        },
        title: {
            enable: true,
            text: 'Hourly Activity Detailed',
            css: {
                color: '#0073a5'
            }
        }
    };
    $scope.hourly_detailed_data = [{
            key: "Answered",
            color: '#0c6c2c',
            values: []
        },
        {
            key: "Missed",
            color: '#e30400',
            values: []
        },
        {
            key: "Voicemail",
            color: '#f58987',
            values: []
        },
        {
            key: "Declined",
            color: '#66b1b2',
            values: []
        }
    ];

    function formatDate(date) {
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        day = day > 9 ? day : "0" + day;
        month = month > 9 ? month : "0" + month;
        hours = hours > 9 ? hours : "0" + hours;
        minutes = minutes > 9 ? minutes : "0" + minutes;
        seconds = seconds > 9 ? seconds : "0" + seconds;
        var result = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" +
            seconds
        return result;
    };

    $scope.formatMinutes = function(value) {
        var minutes = parseInt(value);
        var seconds = parseInt((value % 1) * 60);
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        return minutes + ":" + seconds;
    };

    $scope.formatMinutesFromSec = function(value) {
        var gross = value / 60;
        return $scope.formatMinutes(gross);
    };

    //$scope.isKot

    $scope.isManagerOrAdmin = function() {
        if (userService.isAdminGroupOrGreater()) return true;
        if ($scope.currentLocation) {

        }
        return false;
    };

    $scope.onLocationChange = function(locationUuid) {
        var prevLocationUuid = $scope.currentLocationUuid;
        $scope.currentLocationUuid = locationUuid;
        if (locationUuid && locationUuid !== prevLocationUuid) {
            $scope.loadData();
        }
    };

    // service.setCurrentLocationUuid = function(locationUuid) {
    //     var prevLocationUuid = service.currentLocationUuid;
    //     service.currentLocationUuid = locationUuid;
    //     persistLocationToLS(locationUuid);
    //     if (locationUuid && locationUuid !== prevLocationUuid) {
    //         triggerEvent('onLocationGroupChange');
    //     }
    // };

    // qss.registerEventCallback('onAfterInit', function() {
    //     $scope.selectorLocUuid = qss.currentLocationUuid;
    // });

    function loadDailyActivity() {
        console.log("loading daily activity");
        $scope.loadingDailyData = true;
        var data = {
            date: $scope.selectedData.day ? formatDate($scope.selectedData.day) : formatDate(
                new Date()),
            domain_uuid: $rootScope.user.domain_uuid,
        };
        if ($scope.locations.length === 0) {
            data.user_uuid = $rootScope.user.id;
        } else if ($scope.selectedData.selectedUser) {
            data.user_uuid = $scope.selectedData.selectedUser.user_uuid;
        } else {
            data.location_groups = [];
            if ($scope.selectedData.selectedLocation) {
                data.location_groups.push($scope.selectedData.selectedLocation.locations_group_uuid);
            } else {
                $scope.locations.forEach(function(element) {
                    data.location_groups.push(element.locations_group_uuid);
                });
            }
        }

        bas.loadDailyDetailedInfo(data)
            .then(function(response) {
                if (response) {
                    updateChartsArrays(response);
                }
                $scope.loadingDailyData = false;
                console.log("finished loading");
            });
    };

    function updateChartsArrays(data) {
        $scope.hourly_activity_data[0].values = [];
        $scope.hourly_activity_data[1].values = [];
        $scope.hourly_detailed_data[0].values = [];
        $scope.hourly_detailed_data[1].values = [];
        $scope.hourly_detailed_data[2].values = [];
        $scope.hourly_detailed_data[3].values = [];
        $scope.hoursArray.forEach(function(elem) {
            var node = elem;
            if (data.inbound.hasOwnProperty(node.time)) {
                $scope.hourly_activity_data[0].values.push({
                    time: node.time,
                    value: data.inbound[node.time]
                });
            } else {
                $scope.hourly_activity_data[0].values.push(node);
            }
            if (data.outbound.hasOwnProperty(node.time)) {
                $scope.hourly_activity_data[1].values.push({
                    time: node.time,
                    value: data.outbound[node.time]
                });
            } else {
                $scope.hourly_activity_data[1].values.push(node);
            }
            if (data.answered.hasOwnProperty(node.time)) {
                $scope.hourly_detailed_data[0].values.push({
                    time: node.time,
                    value: data.answered[node.time]
                });
            } else {
                $scope.hourly_detailed_data[0].values.push(node);
            }
            if (data.missed.hasOwnProperty(node.time)) {
                $scope.hourly_detailed_data[1].values.push({
                    time: node.time,
                    value: data.missed[node.time]
                });
            } else {
                $scope.hourly_detailed_data[1].values.push(node);
            }
            if (data.voicemails.hasOwnProperty(node.time)) {
                $scope.hourly_detailed_data[2].values.push({
                    time: node.time,
                    value: data.voicemails[node.time]
                });
            } else {
                $scope.hourly_detailed_data[2].values.push(node);
            }
            if (data.declined.hasOwnProperty(node.time)) {
                $scope.hourly_detailed_data[3].values.push({
                    time: node.time,
                    value: data.declined[node.time]
                });
            } else {
                $scope.hourly_detailed_data[3].values.push(node);
            }
        });
        $timeout(function() {
            if ($scope.api_hourly) {
                $scope.api_hourly.update();
            }

            if ($scope.api_detailed) {
                $scope.api_detailed.update();
            }
        }, 500);

    };

    $scope.$on('show.user.chart', function(event, user) {
        bas.setDataShowing('none');
        $scope.selectedData.selectedUser = user;
        //$scope.selectedData.selectedType = 'Ring Group';
        $scope.loadData();
    });

    init();
});
