'use strict';

proySymphony
    .directive('smsresize', function($window) {
        // used for resizing chat window in response to growing chat box
        function link(scope, element, attrs) {
            scope.$watch(function() {
                scope.smsstyle = {
                    height: $window.innerHeight - 165 - element[0].offsetHeight +
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
    .directive('smsEnter', function($rootScope) {
        return function(scope, element, attrs) {
            element.bind("keydown", function(e) {
                if (e.which === 13) {
                    e.stopPropagation();
                    e.preventDefault();
                    scope.$apply(function() {
                        scope.$eval(attrs.smsEnter, {
                            'e': e
                        });
                    });
                }
            });
        };
    })
    .directive('smsMessage', function(__env, symphonyConfig, usefulTools, $mdDialog, clipboard,
        contactService, userService, smsService, emulationService, $rootScope, $filter) {
        return {
            restrict: 'E',
            templateUrl: 'views/sms/sms-message.html',
            scope: {
                message: '<',
                copyText: '<',
                scrollToBottom: '&'
            },
            link: function($scope, element, attrs) {
                if (!$scope.user) {
                    $scope.user = $rootScope.user;
                }
                $scope.tips = $rootScope.tips;
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.thumbDimensions = $rootScope.thumbDimensions;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.currentThread = smsService.smsData.currentThread;
                $scope.currentUser = smsService.currentUser;
                $scope.imageBaseUrl = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                        symphonyConfig.onescreenUrl) +
                    '/imported/freeswitch/storage/avatars/';
                $scope.mediaUrl = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                    symphonyConfig.onescreenUrl);
                $scope.isEmulatedUser = function() {
                    return emulationService.emulatedUser;
                };
                $scope.getFileName = function(media) {
                    var parts = media.url.split('/');
                    var name = parts.pop();
                    if (name.length > 30) name = name.substr(0, 15) + '...' + name.substr(
                        name.length - 15);
                    return name;
                };
                $scope.showMediaType = function(media) {
                    var name = media.url.split('/').pop();
                    var ext = name.split('.').pop();
                    if (ext) return $filter('uppercase')(ext);
                    return $filter('uppercase')(media.mime_type);
                };

                $scope.iconTimeClass = function(message) {
                    if (message.message_direction === 'out') return 'pull-right';
                    return 'pull-left';
                };
                $scope.handledClass = function(message) {
                    if (message.message_direction === 'out') return 'right-text';
                    return 'left-text';
                };
                $scope.handledIcon = function(message) {
                    if (message.handled_by) return 'fa-check-square-o';
                    return 'fa-square-o';
                };
                $scope.unreadClass = function(message) {
                    if (message.message_status === 'unread') return 'bolded';
                    return '';
                };

                $scope.threadContact = function(entity) {
                    return contactService.theContact(entity);
                };

                $scope.isDomainOrLocationManager = function() {
                    return userService.isAdminGroupOrGreater() || (smsService.currentLocationUuid &&
                        smsService.isLocationManager());
                };

                $scope.removeMessage = function(message) {
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Confirm Delete')
                        .htmlContent('Are you sure you want to delete this message?')
                        .ariaLabel('Delete')
                        .ok('Delete')
                        .cancel('Cancel');
                    $mdDialog.show(deleteConfirm).then(function() {
                        smsService.deleteMessage(message)
                            .then(function(response) {
                                if (response.data.error) $rootScope.showErrorAlert(
                                    response.data.error.message);
                            });
                    });
                };

                $scope.handleMessage = function(message) {

                    if (message.handled_by && message.handled_by !== $rootScope.user.id) {
                        var confirm = 'This was already marked as handled by ' + $scope
                            .showUserName(message.handled_by) +
                            '.  Do you want to continue?';
                        var confirmDelete = $mdDialog.confirm()
                            .title('Please Confirm')
                            .textContent(confirm)
                            .ariaLabel('Handle')
                            .ok('Yes')
                            .cancel('Never Mind');
                        $mdDialog.show(confirmDelete).then(function() {
                            doHandleMessage(message);
                        });
                    } else {
                        doHandleMessage(message);
                    }

                };

                function doHandleMessage(message) {
                    smsService.handleMessage(message)
                        .then(function(response) {
                            if (response.data.success) {
                                var info = response.data.success.data;
                                message.handled_by = info.handled_by;
                                message.handled_at = info.handled_at;
                                message.message_status = info.handled_by ? 'read' :
                                    'unread';
                            }
                        });
                }

                $scope.copyMessage = function(message) {
                    clipboard.copyText(message.message);
                    $rootScope.showSuccessAlert(
                        'Message body was copied to your clipboard.');
                };

                $scope.showUserName = function(uuid) {
                    var contact = contactService.getContactByUserUuid(uuid);
                    if (contact) return contact.name;
                    return null;
                };

                $scope.forwardMessage = function(message) {
                    $rootScope.showModalWithData('/sms/sendsmstop.html', {
                        message: message.message
                    });
                };

                $scope.sentBy = function(message) {
                    return contactService.getContactByUuid(message.from_contact_uuid);
                };
            }
        };
    })
    .directive('smsSearchMessageDisplay', function($rootScope, smsService, $timeout) {
        return {
            restrict: 'E',
            templateUrl: 'views/sms/sms-search-message-display.html',
            scope: {
                search: '=',
                sendSearch: '&',
                closeDisplay: '&'
            },
            link: function($scope, element, attrs) {
                $scope.showMessageInThread = function(message) {
                    $scope.search.highlightMessage = message.message_uuid;
                    smsService.goToSearchResult(message)
                        .then(function() {
                            //$scope.search.jumpToMessage(message);
                        });
                };
            }
        };
    })
    .directive('smsSearchResult', function() {
        return {
            restrict: 'E',
            templateUrl: 'views/sms/sms-search-result.html',
            scope: {
                message: '<',
                showMessageInThread: '&'
            },
            link: function($scope, element, attrs) {
                $scope.setTextClass = function(text) {
                    if (text.message_direction == "in") return 'textmessage round border bubble-left incoming';
                    return 'textmessage round border bubble-right outgoing';
                };
                $scope.textAlign = function(text) {
                    if (text.message_direction == "in") return 'left-text';
                    return 'right-text';
                };


            }
        };
    })
    .directive('smsForwardingTable', function($timeout, $rootScope, $uibModalStack, $filter,
        smsService, smsApi, contactService, userService, usefulTools, $mdDialog) {
        return {
            restrict: 'E',
            templateUrl: 'views/sms/sms-forwarding-table.html',
            scope: {
                input: '<'
            },
            link: function($scope, element, attrs) {
                $scope.inputPlaceholder = 'Type contact name or number';
                $scope.showContactPhoto = $rootScope.showContactPhoto;
                $scope.filteredNumbers = [];

                $scope.contact = {};
                $scope.contact.callnumber = null;
                $scope.selectedIndex = 0;
                $scope.newDest = {};

                if (!$scope.user) {
                    $scope.user = $rootScope.user;
                }

                $scope.forward_sms_to_enabled = false;

                if ($scope.user.symphony_user_settings.forward_sms_to.length > 0) {
                    $scope.forward_sms_to_enabled = true;

                    $rootScope.$broadcast('forward.smsto.enabled', true);
                }

                $scope.editingDest = null;

                $scope.toggleAdd = function() {
                    if ($scope.editingDest) {
                        $rootScope.showErrorAlert(
                            'You are currently editing a destination. Please cancel or save that before adding a new destination.'
                        );
                        return;
                    }
                    $scope.newDest = {};

                    $scope.addDest = true;
                };

                $scope.cancelDestAdd = function() {
                    $scope.newDest = {};
                    $scope.contact = {};
                    $scope.contact.callnumber = null;
                    $scope.addDest = false;
                    $scope.editingDest = null;
                };

                function prepareDestList(forward_sms_to) {
                    var newList = "";

                    angular.forEach(forward_sms_to, function(destination) {
                        var number = usefulTools.cleanPhoneNumber(destination);

                        if (newList == "") {
                            newList = number;
                        } else {
                            newList = newList + ',' + number;
                        }
                    });

                    return newList;
                }

                $scope.updateForwarding = function() {
                    $scope.newDest.user_uuid = $scope.user.id;

                    if (!$scope.forward_sms_to_enabled && $scope.user.symphony_user_settings
                        .forward_sms_to.length > 0) {
                        $scope.forward_sms_to_enabled = true;
                        var confirmDelete = $mdDialog.confirm()
                            .title(
                                'Turning off Sms Forwarding will clear the destinations list. Are you sure you want to continue?'
                            )
                            .ariaLabel('Delete')
                            .ok('Yes')
                            .cancel('Never Mind');
                        $mdDialog.show(confirmDelete).then(function() {

                            $scope.newDest.destList = "";

                            smsApi.postUpdateSmsForwardDest($scope.newDest)
                                .then(function(response) {
                                    $scope.forward_sms_to_enabled = false;
                                    $scope.user.symphony_user_settings.forward_sms_to = [];
                                    $rootScope.$broadcast(
                                        'forward.smsto.enabled', false);
                                });
                        });

                    }
                };

                $scope.editDest = function(dest) {
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

                    $scope.contact.callnumber = angular.copy(dest);
                    $scope.editingDest = dest;
                };

                $scope.isEditing = function(dest) {
                    return $scope.editingDest === dest;
                };

                $scope.saveDest = function() {

                    $scope.newDest.user_uuid = $scope.user.id;

                    $scope.destinations = angular.copy($scope.user.symphony_user_settings
                        .forward_sms_to);
                    var flag = false;
                    var contact = contactService.getContactByUuid($scope.user.contact_uuid);
                    if (contact) {
                        if (contact.did == usefulTools.cleanPhoneNumber($scope.editingDest) ||
                            contact.did == usefulTools.cleanPhoneNumber($scope.contact.callnumber)
                        ) {
                            $rootScope.showErrorAlert(
                                'Can not use your own DID as the forwarding destination.'
                            );
                            flag = true;
                            return;
                        }
                    }

                    if (!flag) {
                        if ($scope.editingDest && usefulTools.isPhoneNumber($scope.editingDest) &&
                            $scope.editingDest != "") {
                            var editNum = usefulTools.cleanPhoneNumber($scope.editingDest);
                            var number = usefulTools.cleanPhoneNumber($scope.contact.callnumber);
                            var index2 = $filter('getByNumber')($scope.destinations,
                                editNum);
                            $scope.destinations[index2] = number;
                        } else if ($scope.contact.callnumber && usefulTools.isPhoneNumber(
                                $scope.contact.callnumber) && $scope.contact.callnumber !=
                            "") {
                            var number = usefulTools.cleanPhoneNumber($scope.contact.callnumber);
                            var index = $filter('getByNumber')($scope.destinations,
                                number);
                            if (index == null) $scope.destinations.push(number);
                        } else {
                            $rootScope.showErrorAlert(
                                'Destination must be a valid phone number.');
                            return;
                        }


                        $scope.newDest.destList = prepareDestList($scope.destinations);

                        smsApi.postUpdateSmsForwardDest($scope.newDest)
                            .then(function(response) {
                                if (response.data.success) {
                                    $scope.user.symphony_user_settings.forward_sms_to =
                                        angular.copy($scope.destinations);
                                    $rootScope.showSuccessAlert(response.data.success
                                        .message);
                                    $rootScope.$broadcast('forward.smsto.enabled',
                                        true);
                                } else {
                                    console.log(response.data.error.message);
                                    $rootScope.showErrorAlert(response.data.error.message);
                                }
                            });

                        $scope.cancelDestAdd();
                    }

                }

                $scope.deleteDest = function(dest) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Are you sure you want to remove this destination?')
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {

                        $scope.destinations = angular.copy($scope.user.symphony_user_settings
                            .forward_sms_to);

                        var index = $filter('getByNumber')($scope.destinations,
                            dest);
                        if (index != null) $scope.destinations.splice(index, 1);

                        $scope.newDest.user_uuid = $scope.user.id;

                        $scope.newDest.destList = prepareDestList($scope.destinations);

                        smsApi.postUpdateSmsForwardDest($scope.newDest)
                            .then(function(response) {
                                if (response.data.success) {
                                    $scope.user.symphony_user_settings.forward_sms_to =
                                        angular.copy($scope.destinations);
                                    $rootScope.showSuccessAlert(
                                        "Destination number Deleted Succesfully."
                                    );

                                } else {
                                    console.log(response.data.error.message);
                                    $rootScope.showErrorAlert(response.data
                                        .error.message);
                                }

                                if ($scope.user.symphony_user_settings.forward_sms_to
                                    .length == 0) {
                                    $scope.forward_sms_to_enabled = false;

                                    $rootScope.$broadcast(
                                        'forward.smsto.enabled', false);
                                }
                            });
                    });
                };

                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.getCallType = function() {
                    return "smsforwarding";
                };

                $scope.availContacts = function() {
                    var numbers = [];
                    var temp = [];
                    angular.forEach(contactService.getUserContactsOnly(), function(contact) {
                        numbers.push(contact);
                        if (contact.ext) temp.push(contact.ext);
                        angular.forEach(contact.nums, function(phone) {
                            if (phone.num) temp.push(phone.num);
                        });
                    });
                    angular.forEach(userService.usedNumbers, function(number) {
                        if (temp.indexOf(number.phone_number) === -1) numbers.push(
                            number);
                    });
                    temp = null;
                    return numbers;
                };

                $scope.availNumbers = function() {
                    return userService.usedNumbers;
                };

                $scope.searchRecipients = function(item) {
                    if (item.contact_uuid) {
                        if (!$scope.contact.callnumber ||
                            (item.ext && item.ext.indexOf($scope.contact.callnumber.toLowerCase()) != -1) ||
                            (item.name.toLowerCase().indexOf($scope.contact.callnumber.toLowerCase()) != -1)) {
                            return true;
                        }
                        if (item.nums.length > 0) {
                            var found = false;
                            angular.forEach(item.nums, function(phone) {
                                if (phone.num.indexOf($scope.contact.callnumber) != -1) {
                                    found = true;
                                }
                            });
                            return found;
                        }
                    } else {
                        if (item.phone_number.indexOf($scope.contact.callnumber) != -1)
                            return true;
                    }
                    return false;
                };

                $scope.chooseNumber = function(phone) {
                    phone = usefulTools.cleanPhoneNumber(phone);
                    if (!usefulTools.isNumeric(phone) || phone.length < 3 || phone.length >
                        11) {
                        $rootScope.showErrorAlert(
                            'Target must be a valid phone number.')
                        return;
                    }
                    $scope.contact.callnumber = $filter('tel')(phone);
                    $scope.$parent.inputNumber = phone;
                    $scope.showContactSelection = false;
                };
            }
        };
    })
    .directive('blacklistTable', function($timeout, $rootScope, usefulTools, userService,
        contactService, $uibModalStack, $filter, emulationService, smsService, smsApi) {
        return {
            restrict: 'E',
            templateUrl: 'views/sms/blacklist-table.html',
            scope: {
                input: '<'
            },
            link: function($scope, element, attrs) {
                $scope.showBlTable = false;
                $scope.closeModal = $scope.input.closeModal;
                $scope.tips = $rootScope.tips;
                $scope.editing = false;
                $scope.pagination = {
                    perPage: 10,
                    currentPage: 1
                };
                $scope.blacklist = {
                    reach: 'domain',
                    numberToAdd: null
                };
                $scope.userUuid = emulationService.emulatedUser ? emulationService.emulatedUser :
                    $rootScope.user.id;
                smsApi.getBlacklistedNumbers($scope.userUuid)
                    .then(function(response) {
                        if (response.data.success) {
                            $scope.showBlTable = true;
                            $scope.blacklistedNumbers = response.data.success.data;
                        } else {
                            if (__env.enableDebug) console.log(response.data.error.message);
                            return [];
                        }
                    });

                $scope.cancelAdd = function() {
                    $scope.blacklist = {
                        reach: 'domain',
                        numberToAdd: null
                    };
                    $scope.editing = false;
                    $scope.showAddForm = !$scope.showAddForm;
                }
                $scope.removeBlacklist = function(number) {
                    smsApi.getRemoveBlacklist(number.sms_blacklist_uuid)
                        .then(function(response) {
                            if (__env.enableDebug) console.log(response.data);
                            if (response.data.success) {
                                var index = $filter('getByUUID')($scope.blacklistedNumbers,
                                    number.sms_blacklist_uuid, 'sms_blacklist');
                                if (index !== null) $scope.blacklistedNumbers.splice(
                                    index, 1);
                                smsService.getSmsThreads($scope.userUuid);
                            } else {
                                if (__env.enableDebug) console.log(response.data.error
                                    .message);
                                $rootScope.showErrorAlert(response.data.error.message);
                            }
                        });
                };
                $scope.editBlacklist = function(blacklist) {
                    $scope.blacklist = {
                        sms_blacklist_uuid: blacklist.sms_blacklist_uuid,
                        reach: blacklist.reach,
                        numberToAdd: usefulTools.cleanPhoneNumber(blacklist.number)
                    };
                    $scope.editing = true;
                    $scope.showAddForm = true;
                };

                $scope.isDomainAdmin = function() {
                    return userService.isAdminGroupOrGreater();
                };

                $scope.searchBlNumbers = function(item) {
                    if (!$scope.blacklistSearch || (item.number.indexOf($scope.blacklistSearch
                            .toLowerCase()) !== -1)) return true;
                    return false;
                };

                $scope.showContact = function(blacklist) {
                    return contactService.theContact(blacklist);
                };

                function duplicateNumber(blacklist) {
                    var i, input = $scope.blacklistedNumbers;
                    for (i = 0; i < input.length; i += 1) {
                        if (blacklist.numberToAdd === input[i].number.substr(1) &&
                            blacklist.reach === input[i].reach &&
                            (!blacklist.sms_blacklist_uuid || (blacklist.sms_blacklist_uuid &&
                                blacklist.sms_blacklist_uuid !== input[i].sms_blacklist_uuid
                            )))
                            return true;
                    }
                    return false;
                }

                function duplicateNumber2(blacklist) {
                    var i, input = $scope.blacklistedNumbers;
                    for (i = 0; i < input.length; i += 1) {
                        if (blacklist.numberToAdd === input[i].number.substr(1) &&
                            (!blacklist.sms_blacklist_uuid || (blacklist.sms_blacklist_uuid &&
                                blacklist.sms_blacklist_uuid !== input[i].sms_blacklist_uuid
                            )))
                            return true;
                    }
                    return false;
                }

                $scope.blacklistNumber = function(blacklist) {
                    if (!blacklist.numberToAdd || !blacklist.reach || blacklist.numberToAdd
                        .length < 10) {
                        $rootScope.showErrorAlert(
                            'You must enter a full 10 digit phone number and choose a reach before submitting.'
                        );
                        return;
                    }
                    if (duplicateNumber(blacklist)) {
                        $rootScope.showErrorAlert('There is already a ' + blacklist.reach +
                            ' blacklist in place for ' + $filter('tel')(blacklist.numberToAdd) +
                            '.');
                        return;
                    }

                    if (duplicateNumber2(blacklist)) {
                        $rootScope.showErrorAlert(
                            'There is already a blacklist in place for ' + $filter(
                                'tel')(blacklist.numberToAdd) +
                            '. You can edit the entry from the blacklist table.');
                        return;
                    }
                    smsService.blacklistNumber(blacklist)
                        .then(function(response) {
                            if (blacklist.sms_blacklist_uuid) {
                                var index = $filter('getByUUID')($scope.blacklistedNumbers,
                                    blacklist.sms_blacklist_uuid,
                                    'sms_blacklist');
                                if (index !== null) $scope.blacklistedNumbers[index] =
                                    response.blacklist;
                            } else {
                                $scope.blacklistedNumbers.push(response.blacklist);
                            }
                            $scope.showAddForm = !$scope.showAddForm;
                        });
                    $scope.editing = false;
                    $scope.blacklist = {
                        numberToAdd: "",
                        reach: 'domain'
                    };

                };
            }
        };
    });
