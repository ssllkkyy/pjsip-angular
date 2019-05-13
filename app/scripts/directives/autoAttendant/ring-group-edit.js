'use strict';

proySymphony.directive("ringGroupEdit", function(autoAttendantService, contactService, $rootScope,
    $filter, $timeout, $mdDialog, symphonyConfig, audioLibraryService, dataFactory, usefulTools, $window) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/ring-group-edit.html",
        scope: {
            ringGroup: "<",
            registerResourceRetrieve: "&"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;

            $scope.init = function() {
                $scope.registerResourceRetrieve({retrievalFn: saveRingGroup});
                $scope.editing = Boolean($scope.ringGroup);
                $scope.ringGroupModel = getRingGroupModel();
                console.log($scope.ringGroupModel);
                registerResourceDependencies();
                if ($scope.ringGroup) {
                    var ringGroupUuid = $scope.ringGroup.ring_group_uuid;
                    var dests = $scope.ringGroup.destinations;
                    var firstDest = dests && dests[0];
                    if (firstDest) {
                        var strategy = $scope.ringGroup.ring_group_strategy == 'simultaneous' ? 'enterprise' : $scope.ringGroup.ring_group_strategy;
                        var timeout = parseInt(firstDest.destination_timeout);
                        if (strategy === "sequence") { timeout *= dests.length; }
                        $scope.ringGroupModel.timeout = timeout;
                    }
                    var ringGroup = $scope.ringGroup;
                    var app = ringGroup.ring_group_timeout_app;
                    var data = ringGroup.ring_group_timeout_data;
                    $scope.ringGroupModel.name = $scope.ringGroup.ring_group_name;
                    var ringBackPath = $scope.ringGroup.ring_group_ringback == '${us-ring}' ? 'US-Ring' : $scope.ringGroup.ring_group_ringback;
                    var ringBack = _.find($scope.audioList, {filepath: ringBackPath}) ||
                        _.find($scope.audioList, {file_title: ringBackPath});
                    $scope.ringGroupModel.ringBack = ringBack;
                    $scope.ringGroupModel.containers.push({
                        label: $scope.ringGroup.ring_group_strategy == 'simultaneous' ? 'enterprise' : $scope.ringGroup.ring_group_strategy,
                        items: $scope.ringGroup.destinations.map(function(destination) {
                            return _.find($scope.ringGroupModel.users.items, {
                                ext: destination.destination_number
                            });
                        }).filter(Boolean)
                    });
                    
                } else {
                    $scope.ringGroupModel.ringBack =
                        _.find($scope.audioList, {file_title: "US-Ring"});
                }
            };

            $scope.timeoutTypeDataFn = function(option) {
                var domainName = $rootScope.user.domain.domain_name;
                var type = option.type;
                var data = option.data;
                function asExtensionTypeData(ext) {
                    return {
                        type: "transfer",
                        data: ext + " XML " + domainName
                    };
                };
                var typeDataMap = {
                    "hang-up": {type: "hangup"},
                    "external-did": {type: "transfer"},
                    dialbyname: {type: "transfer", data: "*411 XML " + domainName},
                    announcement: {
                        type: "lua",
                        data: "streamfile.lua " + aas.getAudioLibraryFileName(option.resource)
                    },
                    voicemail: {
                        type: "transfer",
                        data: "*99" + option.resource.voicemail_id + "XML " + domainName
                    },
                    ivr: asExtensionTypeData(option.resource.ivr_menu_extension),
                    "ring-group": asExtensionTypeData(option.resource.ivr_menu_extension),
                    extension: asExtensionTypeData(option.resource.extension),
                };
                var mapping = typeDataMap[type];
                return {type: mapping.type, data: mapping.data};
            };

            $scope.getRingTimeMessage = function() {
                var containerInfo = $scope.ringGroupModel.containers[0];
                if (containerInfo && containerInfo.label === "enterprise") {
                    return "Max ring time for Caller";
                } else {
                    return "Max ring time for Caller per call";
                }
            };

            function saveRingGroup() {
                
                if ($scope.saving) { return null; }
                var ringGroupModel = $scope.ringGroupModel;

                function containerItemToRGDest(item) {
                    var itemsLength = containerInfo.items.length;
                    var strategy = containerInfo.label;
                    var timeout;
                    if (strategy === "sequence") {
                        timeout = _.toInteger(ringGroupModel.timeout / itemsLength);
                    } else {
                        timeout = _.toInteger(ringGroupModel.timeout);
                    }
                    var number = item.ext.toString();
                    return {
                        number: number,
                        delay: "0",
                        timeout: timeout || "0"
                    };
                };

                var containerInfo = ringGroupModel.containers[0];
                var message;
                if (!ringGroupModel.name) {
                    message = "Please give your Ring Group a name before saving it.";
                } else if (!containerInfo) {
                    message = "You must choose a ring pattern strategy for your " +
                        "Ring Group before saving it.";
                } else if (!containerInfo.items || !containerInfo.items.length) {
                    message = "Please add some contacts to your strategy sequence before saving.";
                } else if (!ringGroupModel.noAnswer) {
                    message = "Please select a timeout option before continuing.";
                }
                if (message) {
                    $rootScope.showErrorAlert(message, true);
                    return false;
                }

                var data = {
                    domain_uuid: $rootScope.user.domain_uuid,
                    name: ringGroupModel.name,
                    destinations: containerInfo.items.map(containerItemToRGDest),
                    strategy: containerInfo.label,
                    ring_group_ringback: ringGroupModel.ringBack.filepath ||
                        ringGroupModel.ringBack.file_title,
                    ring_group_timeout_app: ringGroupModel.noAnswer.type,
                    ring_group_timeout_data: ringGroupModel.noAnswer.data
                };
                
                if (ringGroupModel.noAnswer.did) {
                    var did = ringGroupModel.noAnswer.did;
                    var domainName = $rootScope.user.domain.domain_name;
                    data.ring_group_timeout_data = "2343" + did + " XML " + domainName;
                }
                $scope.saving = true;
                if ($scope.editing) {
                    data.ring_group_uuid = $scope.ringGroup.ring_group_uuid;
                    return aas.updateRingGroup(data).then(function(ringGroup) {
                        $scope.saving = false;
                        if (ringGroup) {
                            var desc = ringGroup.ring_group_name;
                            var message = desc + " successfully updated";
                            return function() {
                                $rootScope.showSuccessAlert(message, true);
                            };
                        }
                        return null;
                    });
                } else {
                    return aas.createRingGroup(data).then(function(ringGroup) {
                        $scope.saving = false;
                        if (ringGroup) {
                            var desc = ringGroup.ring_group_name;
                            var message = desc + " successfully updated";
                            return function() {
                                $rootScope.showSuccessAlert(message, true);
                            };
                        }
                        return null;
                    });
                }
                return null;
            };

            function getNoAnswerValFromOpt(opt) {
                if (opt === "hangup") {
                    return "hangup";
                } else {
                    return opt.indexOf("lua") > -1 ? "lua" : "transfer";
                }
                return null;
            };

            function stripLuaCommandFromAnnouncementOpt(option) {
                var splits = option.split(" ");
                splits.shift();
                return splits.join(" ");
            };

            function getNoAnswerValForOpt(app, data) {
                if (app === "hangup") {
                    return "hangup";
                } else if (app === "lua") {
                    return data;
                } else if (app === "tra nsfer") {
                    return data && data.split(" ")[0];
                }
                return null;
            };

            function getUserItems() {
                var array = [];
                // function isAllowedContact(contact) {
                //     return !$rootScope.isKotterTechUser(contact) ||
                //         contact.cuuid === $rootScope.user.contact_uuid;
                // };
                function isAllowedContact(contact) {
                    return contact && !$rootScope.isKotterTechUser(contact);
                };
                var contacts = contactService.getUserContactsOnly().filter(isAllowedContact);
                console.log(contacts);
                contacts.forEach(function(contact) {
                    if (contact.type === "user" && contact.nums) {
                        contact.nums.forEach(function(phone) {
                            if (phone.lab === "DID" && contact.name) {
                                array.push({
                                    ext: contact.ext,
                                    name: contact.name,
                                    phone: phone.num,
                                    user_uuid: contact.user_uuid
                                });
                            }
                        });
                    }
                });
                console.log(array);
                return $filter('orderBy')(array, 'ext', false);
            };

            $scope.dropContainCallback = function(index, item, external, type) {
                $scope.dropped = true;
                var temp = $scope.ringGroupModel.containers.length > 0 ? angular.copy(
                    $scope.ringGroupModel.containers[0]) : {};
                if ($scope.ringGroupModel.containers.length === 0) {
                    return item;
                } else {
                    if (item.items.length === 0) {
                        temp.label = item.label;
                        $scope.ringGroupModel.containers.splice(0);
                        $scope.ringGroupModel.containers.push(temp);
                        console.log($scope.ringGroupModel.containers);
                    }
                }
                return false;
            };

            $scope.dropRingCallback = function(index, item, external, type) {
                var userindex = $filter('getByUUID')($scope.ringGroupModel.users.items,
                    item.user_uuid, 'user');
                var count = 0;
                angular.forEach($scope.ringGroupModel.containers[0].items,
                    function(user) {
                        if (user.user_uuid === item.user_uuid) {
                            count += 1;
                        }
                    });
                if (userindex !== null) { $scope.ringGroupModel.users.items.splice(userindex, 1); }
                return item;
            };

            $scope.removeContainer = function(event, index, item) {
                var content = "Are you sure you want to remove the current ring" +
                    "pattern? This will remove any contacts that have already been" +
                    "added into the pattern.";
                var deleteConfirm = $mdDialog.confirm()
                    .title('Would you like to remove the Ring Pattern?')
                    .textContent(content)
                    .ariaLabel('remove')
                    .ok('Yes')
                    .cancel('Nevermind');
                var temp = angular.copy($scope.ringGroupModel.containers[0]);
                $timeout(function() {
                    if (item.items.length === temp.items.length && item.label === temp.label &&
                        !$scope.dropped) {
                        $mdDialog.show(deleteConfirm).then(function() {
                            angular.forEach(item.items, function(user) {
                                $scope.ringGroupModel.users.items.push(user);
                            });
                            $scope.ringGroupModel.containers.splice(0, 1);
                        });
                    }
                    $scope.dropped = false;
                });
            };

            $scope.removeFromContainer = function(event, index) {
                var temp = $scope.ringGroupModel.containers[0].items[index];
                $scope.ringGroupModel.containers[0].items.splice(index, 1);
                $timeout(function() {
                    var count = 0;
                    angular.forEach($scope.ringGroupModel.containers[0].items,
                        function(item) {
                            if (item.user_uuid === temp.user_uuid) count +=
                                1;
                        });
                    if (count === 0) {
                        $scope.ringGroupModel.users.items.push(temp);
                    }
                });
            };

            $scope.dropIndCallback = function(selected, index, item, external, type) {
                $rootScope.ringGroupModel.items.splice(0);
                $rootScope.ringGroupModel.items.push(item);
                return item;
            };

            $scope.dragoverCallback = function(index, external, type) { return true; };
            $scope.startStrategyDrag = function() { $scope.showStratDropMsg = true; };
            $scope.endStrategyDrag = function() { $scope.showStratDropMsg = false; };
            $scope.stratDropMsgShowing = function() { return $scope.showStratDropMsg; };
            $scope.startContactDrag = function() { $scope.showContactDropMsg = true; };
            $scope.endContactDrag = function() { $scope.showContactDropMsg = false; };
            $scope.contactDropMsgShowing = function() { return $scope.showContactDropMsg; };

            $scope.isNotSelectedUser = function(user) {
                var ringGroupModel = $scope.ringGroupModel;
                var container = ringGroupModel.containers[0];
                if (!container) { return true; }
                var selectedUsers = container.items;
                return !_.find(selectedUsers, function(selectedUser) {
                    return selectedUser.ext + "" === user.ext + "";
                });
            };

            function getRingGroupModel() {
                return {
                    selected: null,
                    users: { items: getUserItems() },
                    services: {
                        items: [{
                            title: "Ring All",
                            label: "enterprise",
                            tip: "Rings all group members at the same time",
                            items: []
                        }, {
                            title: "Sequence",
                            label: "sequence",
                            tip: "Rings group members in order",
                            items: []
                        }, {
                            label: "random",
                            tip: "Rings group members randomly",
                            items: []
                        }]
                    },
                    containers: [],
                    timeout: 30,
                    timeoutOptions: [{
                        value: "hangup",
                        display: "Hangup"
                    }]
                };
            };

            $scope.patterns = {enterprise: "Ring All", sequence: "Sequence", random: "Random"};

            function registerResourceDependencies() {
                aas.registerResourceDependencies([{
                    scope: $scope,
                    targetName: "actions",
                    attachName: "actions"
                }, {
                    scope: $scope,
                    targetName: "audioLibraries",
                    attachName: "audioList",
                    onAfterRefresh: function() {
                        if (!_.find($scope.audioList, {file_title: "US-Ring"})) {
                            $scope.audioList = [{file_title: "US-Ring"}].concat($scope.audioList);
                        }
                    }
                }]);
            };

            var listeners = [];

            $scope.init();
        }
    };
});
