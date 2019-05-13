'use strict';

proySymphony.directive('showDetail', function($rootScope, _, $filter, bridgeAnalyticsService,
    contactService) {
    return {
        restrict: 'E',
        templateUrl: 'views/analytics/show-detail.html',
        scope: {
            showing: '<'
        },
        link: function($scope, element, attributes) {
            console.log($scope.showing);
            $scope.pathImgProfile = $rootScope.pathImgProfile;
            $scope.showAudioModal = $rootScope.showAudioModal;
            $scope.showMultipleAudioModal = $rootScope.showMultipleAudioModal;
            $scope.tips = $rootScope.tips;
            var bas = bridgeAnalyticsService;
            $scope.tableCallControls = {
                columnNames: [{
                        name: 'user_field',
                        text: 'User',
                        className: 'user-field'
                    },
                    {
                        name: 'contact_field',
                        text: 'Contact',
                        className: 'contact-field'
                    },
                    {
                        name: 'direction_field',
                        text: 'Direction',
                        className: 'direction-field'
                    },
                    {
                        name: 'start_date',
                        text: 'Date / Time',
                        className: 'start-date'
                    },
                    {
                        name: 'duration_field',
                        text: 'Duration (mm:ss)',
                        className: 'duration-field'
                    },
                    {
                        name: 'recordings',
                        text: 'Recordings',
                        className: 'recordings-field'
                    }
                ],

                calls: [],
                filteredCalls: null,
                currentPage: {
                    page: 1
                },
                sortingOpts: {
                    selectedColumn: 'start_date',
                    sortDirection: false,
                    sortableColumns: ['start_date', 'direction_field',
                        'duration_field', 'user_field', 'contact_field'
                    ],
                    orderByValue: null,
                    handleNewSelectedCol: handleNewCallSelectedCol
                }

            };
            $scope.tableMessageControls = {
                columnNames: [{
                        name: 'user_field',
                        text: 'User',
                        className: 'user-field'
                    },
                    {
                        name: 'contact_field',
                        text: 'Contact',
                        className: 'contact-field'
                    },
                    {
                        name: 'count_in',
                        text: 'Received',
                        className: 'count-in'
                    },
                    {
                        name: 'count_out',
                        text: 'Sent',
                        className: 'count-out'
                    },
                    {
                        name: 'message',
                        text: 'Most Recent Message',
                        className: 'message-field'
                    },
                    {
                        name: 'sent_date',
                        text: 'Most Recent Message Date',
                        className: 'sent-date'
                    }
                ],
                messages: [],
                filteredMessages: null,
                sortingOpts: {
                    selectedColumn: 'sent_date',
                    sortDirection: false,
                    sortableColumns: ['sent_date', 'user_field', 'contact_field'],
                    orderByValue: null,
                    handleNewSelectedCol: handleNewMsgSelectedCol
                }
            };

            $scope.searchControls = {
                pageOptions: [{
                    val: 10
                }, {
                    val: 20
                }, {
                    val: 50
                }, {
                    val: 100
                }]
            };
            $scope.searchControls.perPage = $scope.searchControls.pageOptions[0];

            $scope.refreshFilteredMessages = function() {
                var result = $scope.tableMessageControls.messages;
                var sortingOpts = $scope.tableMessageControls.sortingOpts;
                var orderBy = sortingOpts.orderByValue;
                var sortDirection = sortingOpts.sortDirection;
                result = $filter('orderBy')(result, orderBy, sortDirection);
                $scope.tableMessageControls.filteredMessages = result;
                return result;
            };

            $scope.refreshFilteredCalls = function() {
                var result = $scope.tableCallControls.calls;
                var sortingOpts = $scope.tableCallControls.sortingOpts;
                var orderBy = sortingOpts.orderByValue;
                var sortDirection = sortingOpts.sortDirection;
                result = $filter('orderBy')(result, orderBy, sortDirection);

                if (bas.callType == 'outbound' || bas.callType == 'inbound') {
                    $scope.tableCallControls.filteredCalls = [];
                    angular.forEach(result, function(item) {
                        var callType = bas.callType.toLowerCase();
                        if (item.call_direction == callType) {
                            $scope.tableCallControls.filteredCalls.push(
                                item);
                        }
                    });
                } else if (bas.callType == 'answered' || bas.callType == 'missed' ||
                    bas.callType == 'declined' || bas.callType ==
                    'sent_to_voicemail') {
                    $scope.tableCallControls.filteredCalls = [];
                    angular.forEach(result, function(item) {
                        var callType = bas.callType.toLowerCase();
                        if (item.call_direction == 'inbound' && item.call_status ==
                            callType) {
                            $scope.tableCallControls.filteredCalls.push(
                                item);
                        }
                    });
                } else {
                    $scope.tableCallControls.filteredCalls = result;
                }


                return result;
            };

            $scope.searchCalls = function(item) {
                if (!item.contact) {
                    var contact = $scope.callContact(item);
                    if (contact && !contact.then && !item.contact) {
                        item.contact = contact;
                    }
                }
                if (!$scope.callsSearch ||
                    (item.contact_name && item.contact_name.toLowerCase().indexOf(
                        $scope.callsSearch.toLowerCase()) != -1) ||
                    (item.contact_number && item.contact_number.toLowerCase().indexOf(
                        $scope.callsSearch.toLowerCase()) != -1) ||
                    ($scope.getUser(item) && $scope.getUser(item).extension &&
                        $scope.getUser(item).extension.toLowerCase().indexOf($scope
                            .callsSearch.toLowerCase()) != -1) ||
                    ($scope.getUser(item) && $scope.getUser(item).name &&
                        $scope.getUser(item).name.toLowerCase().indexOf(
                            $scope.callsSearch.toLowerCase()) != -1) ||
                    (item.noncontact && item.noncontact.name && item.noncontact.name
                        .toLowerCase().indexOf($scope.callsSearch.toLowerCase()) !=
                        -1) ||
                    (item.noncontact && item.noncontact.phone && item.noncontact.phone
                        .toLowerCase().indexOf($scope.callsSearch.toLowerCase()) !=
                        -1) ||
                    (item.contact && item.contact.ext && item.contact.ext
                        .toLowerCase().indexOf($scope.callsSearch.toLowerCase()) !=
                        -1) ||
                    (item.contact && item.contact.name.toLowerCase().indexOf(
                        $scope.callsSearch.toLowerCase()) != -1)) {
                    return true;
                }
                if (item.contact && item.contact.nums.length > 0) {
                    var found = false;
                    angular.forEach(item.contact.nums, function(phone) {
                        if (phone.num.indexOf($scope.callsSearch) != -1) {
                            found = true;
                        }
                    });
                    return found;
                }
                return false;
            };

            $scope.sendSearch = function(item) {
                
                if (!$scope.callsSearch ||
                    (item.contact && item.contact.name && item.contact.name.toLowerCase().indexOf(
                        $scope.callsSearch.toLowerCase()) != -1) ||
                    (item.contact_phone && item.contact_phone.toLowerCase().indexOf(
                        $scope.callsSearch.toLowerCase()) != -1) ||
                    (item.number_from && item.number_from.toLowerCase().indexOf(
                        $scope.callsSearch.toLowerCase()) != -1) ||
                    (item.contact && item.contact.ext && item.contact.ext
                        .toLowerCase().indexOf($scope.callsSearch.toLowerCase()) !=
                        -1) ||
                    (item.user && item.user.name && item.user.name.toLowerCase().indexOf(
                        $scope.callsSearch.toLowerCase()) != -1) ||
                    (item.user && item.user.ext && item.user.ext
                        .toLowerCase().indexOf($scope.callsSearch.toLowerCase()) !=
                        -1)) {
                        return true;
                }
                return false;
            };

            $scope.callContact = function(entity) {
                if (!entity.contact) {
                    var contact = contactService.theContact(entity);
                    if (contact) entity.contact = contact;
                }
                return entity.contact;
            };

            $scope.getUser = function(entity) {
                if (!entity.user) {
                    var contact = contactService.getContactByExtUuid(entity.extension_uuid,
                        $rootScope.user.domain_uuid);
                    if (contact) entity.user = contact;
                }
                return entity.user;

                var user = null;
                getContactByExtUuid
                if ($scope.users()) {
                    user = _.find($scope.users(), function(elem) {
                        if (elem.extension) {
                            return elem.extension_uuid === extUuid;
                        } else {
                            return false;
                        }
                    });
                }
                return user;
            };

            $scope.smsContact = function(thread) {
                var type = 'smsanalytics';
                // console.log(thread.contact_phone);
                // console.log(thread);
                if (!thread.contact) {
                    var contact = contactService.theContact(thread, type);
                    if (contact) thread.contact = contact;
                }
                return thread.contact;
            };

            $scope.getSmsUser = function(thread) {
                if (!thread.user) {
                    var contact = contactService.getContactByUserUuid(thread.user_uuid);
                    if (contact) thread.user = contact;
                }
                return thread.user;
            };

            $scope.showMessages = function(threadUuid) {
                if ($scope.displayMessages === threadUuid) {
                    $scope.displayMessages = null;
                } else {
                    $scope.displayMessages = threadUuid;
                }
            };

            $scope.hideMessages = function() {
                $scope.displayMessages = null;
            };

            $scope.filteredMessagesLength = function() {
                if ($scope.tableMessageControls.filteredMessages) {
                    return $scope.tableMessageControls.filteredMessages.length;
                }
                return null;
            };

            $scope.filteredCallsLength = function() {
                if ($scope.tableCallControls.filteredCalls) {
                    return $scope.tableCallControls.filteredCalls.length;
                }
                return null;
            };

            function handleNewCallSelectedCol(colName) {
                if (colName === 'start_date') {
                    return 'start_stamp';
                } else if (colName === 'direction_field') {
                    return 'call_direction';
                } else if (colName === 'duration_field') {
                    return 'duration';
                } else if (colName === 'user_field') {
                    return 'user.extension.directory_full_name';
                } else if (colName === 'contact_field') {
                    return 'contact';
                } else {
                    return colName;
                }
            };

            function handleNewMsgSelectedCol(colName) {
                if (colName === 'sent_date') {
                    return 'messages[0].sent_at';
                } else if (colName === 'user_field') {
                    return 'user.extension.directory_full_name';
                } else if (colName === 'contact_field') {
                    return 'contact';
                } else {
                    return colName;
                }
            };

            function init() {
                // if ($scope.showing === 'calls') {
                //     loadCalls();
                // } else if ($scope.showing === 'messages') {
                //     loadMessages();
                // }
                bas.registerOnAfterInitCallsCallback(loadCalls);
                bas.registerOnAfterInitMessagesCallback(loadMessages);
                bas.registerOnAfterDataShowingChangesCB(loadCollections);
            };

            $scope.getCallsArray = function() {
                var array = [];
                angular.forEach($scope.tableCallControls.calls, function(call) {
                    var item = {
                        user_extension: (call.call_direction ===
                            'outbound' ? call.caller_id_number :
                            call.destination_number),
                        user_name: call.user ? call.user.name : '',
                        contact_number: call.contact_number,
                        contact_name: call.contact ? call.contact.name : '',
                        contact_organization: ((call.contact && call.contact.org) ? call.contact.org : ''),
                        call_direction: call.call_direction,
                        call_duration: call.duration,
                        start_time: call.start_stamp
                    };
                    array.push(item);
                });
                return array;
            };
            $scope.getMessagesArray = function() {
                var array = [];
                console.log($scope.tableMessageControls.filteredMessages);
                angular.forEach($scope.tableMessageControls.filteredMessages,
                    function(thread) {
                        console.log(thread);
                        angular.forEach(thread.messages, function(message) {
                            var item = {
                                user_phone: thread.number_from,
                                user_name: thread.user ? thread.user.name : '',
                                contact_phone: thread.contact_phone,
                                contact_name: thread.contact ?
                                    thread.contact.name : '',
                                contact_organization: ((thread.contact &&
                                        thread.contact.org
                                    ) ? thread.contact.org :
                                    ''),
                                message_direction: message.message_direction,
                                sent_at: message.sent_at,
                                message: message.message
                            };
                            array.push(item);
                        });
                    });
                console.log(array);
                return $filter('orderBy')(array, 'sent_at');
            };



            $scope.users = function() {
                var users = [];
                angular.forEach(bas.users, function(user) {
                    var contact = contactService.getContactByUserUuid(user);
                    if (contact) users.push(contact);
                });
                return users;
            };

            function loadCalls() {
                $scope.locations = bas.locations;
                $scope.tableType = 'calls';

                $scope.tableCallControls.calls = bas.calls;
                var checked = false;
                angular.forEach($scope.tableCallControls.calls, function(item) {
                    if (item.call_direction === 'outbound') {
                        item.contact_number = item.destination_number;
                    } else {
                        item.contact_number = item.caller_id_number;
                    }
                });
                $scope.refreshFilteredCalls();
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

            function loadMessages() {
                $scope.tableMessageControls.messages = bas.messages;
                var checked = false;
                $scope.tableType = 'messages';
                angular.forEach($scope.tableMessageControls.messages, function(item) {
                    var user = _.find($scope.users, function(elem) {
                        return elem.user_uuid === item.user_uuid;
                    });
                    item['user'] = user;
                    if (item.contact_uuid && !checked) {
                        var contact = contactService.getContactByUuid(item.contact_uuid);
                        checked = true;
                        if (contact) {
                            item['contact'] = contact;
                        }
                    }
                });
                $scope.refreshFilteredMessages();
            };

            $rootScope.$on('download.detail.data', function(event, data) {
                console.log(data);
                console.log($scope.tableType);
                if (data === $scope.tableType) {
                    if (data === 'calls') {
                        console.log("DOWNLOD calls");
                        console.log($scope.tableCallControls.calls);
                    } else {
                        console.log("DOWNLOD messages");
                        console.log($scope.tableMessageControls.messages);
                    }
                }
            });

            function loadCollections() {
                $scope.$evalAsync(function() {
                    $scope.dataShowing = bas.dataShowing;
                    $scope.dateFrom = bas.dateFrom;
                    $scope.dateTo = bas.dateTo;
                    if (bas.selectedUserUuid) {
                        $scope.selectedUser = _.find($scope.users, function(
                            item) {
                            return item.user_uuid === bas.selectedUserUuid;
                        });
                    } else {
                        if (bas.selectedLocationUuid) {
                            $scope.selectedLocation = _.find($scope.locations,
                                function(item) {
                                    return item.locations_group_uuid ===
                                        bas.selectedLocationUuid;
                                });
                        } else {
                            $scope.selectedUser = null;
                            $scope.selectedLocation = null;
                        }
                    }
                    if ($scope.dataShowing === 'calls') {
                        $scope.refreshFilteredCalls();
                    } else {
                        $scope.refreshFilteredMessages();
                    }
                });

            };
            $scope.$watchCollection('tableCallControls.sortingOpts', function() {
                $scope.refreshFilteredCalls();
            });

            $scope.$watchCollection('tableMessageControls.sortingOpts', function() {
                $scope.refreshFilteredMessages();
            });

            $scope.goBackToCharts = function() {
                bas.setDataShowing('none');
            };

            $scope.showUserChart = function(user) {
                $rootScope.$broadcast('show.user.chart', user);
            };



            init();
        }
    };
});
