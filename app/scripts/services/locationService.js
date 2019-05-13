'use strict';

proySymphony.service('locationService', function(emulationService, $rootScope, __env, dataFactory,
    $window, $uibModalStack, fileService, metaService, resourceFrameworkService) {

    var service = {
        currentLocation: null,
        callbackEvents: ['onAfterLoadGroups', 'onAfterGroupDelete'],
        locationGroupsForUser: null,
        locationGroups: {},
        derivable: ["locationGroups"],
        groupLoadCount: 0
    };

    //Pre-Initialization
    var triggerEvent = metaService.getCallbackEventTriggerFn(service);
    var rfs = resourceFrameworkService;
    var getResourceFn = rfs.getResourceFnForService({
        service: service,
        serviceName: 'locationService',
        docTarget: service.fnDocs
    });
    metaService.initializeServiceCallbackColls(service);
    metaService.attachServiceEventRegistrationFns(service);

    service.init = function() {
        rfs.addResourceDependencyRegister(service);
        metaService.registerOnRootScopeUserLoadCallback(function() {
            service.loadLocationGroups();
        });
    };

    rfs.registerResourceDerivableFns({
        service: service,
        derivable: service.derivable
    });

    rfs.registerDerivedValFns(service, [
        ['groupsManaged', 'locationGroups', {
            filter: {
                managers: currentUserIsManagerOfGroup
            }
        }],
        ['groupsMemberOf', 'locationGroups', {
            filter: {
                members: currentUserIsMemberOfGroup
            }
        }]
    ]);

    function currentUserIsManagerOfGroup(managers) {
        function isMatch(manager) {
            return manager.user_uuid === $rootScope.user.id;
        }
        return _.some(managers, isMatch);
    };

    function currentUserIsMemberOfGroup(members) {
        function isMatch(member) {
            return member.user_uuid === $rootScope.user.id;
        }
        return _.some(members, isMatch);
    };

    service.loadLocationGroups = getResourceFn({
        apiFn: dataFactory.getLocationGroupsForUser,
        handlerData: {
            target: service.locationGroups,
            handleType: 'array>object',
            propertyName: 'locations_group_uuid',
            resourceName: 'locationGroups',
            onSuccess: function(resource, handlerData) {
                var groups = Object.values(handlerData.target);
                triggerEvent("onAfterLoadGroups");
                service.groupLoadCount++;
                attachAccessLevelMethods(groups);
                try {
                    service.currentLocation = Object.values(groups)[0].locations_group_uuid;
                } catch (error) {
                    var message = "NULL value for service.currentLocation = " +
                        "Object.values(groups)[0].locations_group_uuid;";
                    console.log(message);
                }
            }
        }
    });

    service.getLocationGroups = function(locationType, domainUuid) {
        if (service.groupLoadCount) {
            return new Promise(function(resolve) {
                resolve(service.locationGroups);
                // var groups = service.locationGroups
                // console.log(groups);
                // if (locationType) groups = filterByType(service.locationGroups, locationType);
                // console.log(groups);
                // resolve(groups);
            });
        } else {
            return service.loadLocationGroups().then(function() {
                return service.locationGroups;
                // var groups = service.locationGroups
                // console.log(groups);
                // console.log(locationType);
                // if (locationType) groups = filterByType(service.locationGroups, locationType);
                // console.log(groups);
                // return groups;
            });
        }
    };

    service.getLocationByUuid = function(locationUuid) {
        if (service.groupLoadCount) {
            for (var group in service.locationGroups) {
                if (locationUuid === group) {
                    return service.locationGroups[group];
                };
            }
        } else {
            service.loadLocationGroups().then(function() {
                for (var group in service.locationGroups) {
                    if (locationUuid === group) {
                        return service.locationGroups[group];
                    }
                };
            })
        };
    };

    service.filterGroupsByType = function(groups, locationType) {
        var filtered = {};
        angular.forEach(groups, function(group) {
            var regex = new RegExp(locationType, "g");
            if (group.communications.match(regex)) {
                if (!filtered[group.locations_group_uuid]) filtered[group.locations_group_uuid] =
                    group;
            }
        });
        return filtered;
    }

    function attachAccessLevelMethods(locations) {
        locations.forEach(function(location) {
            location.ismanager = function(locationType, user) {
                if (!user) {
                    user = $rootScope.user;
                }
                if (!locationType) {
                    locationType = "";
                }
                var regex = new RegExp(locationType, "g");
                return location.communications.match(regex) &&
                    (_.find(location.managers, ['user_uuid', user.id]) ||
                        service.isAdminGroupOrGreater());
            };
            location.isuser = function(locationType, user) {
                if (!user) {
                    user = $rootScope.user;
                }
                var regex = new RegExp(locationType, "g");
                return location.communications.match(regex) &&
                    _.find(location.members, ['user_uuid', user.id]);
            };
        });
    };

    service.getLocationGroupsByDomain = function(domainUuid, locationType) {
        var groups = {};
        return dataFactory.getLocationGroups(domainUuid)
            .then(function(response) {
                if (response.data.success) {
                    angular.forEach(response.data.success.data, function(group) {
                        if (locationType) {
                            var regex = new RegExp(locationType, "g");
                            if (group.communications.match(regex)) {
                                if (!groups[group.locations_group_uuid])
                                    groups[group.locations_group_uuid] =
                                    group;
                            }
                        } else {
                            if (!groups[group.locations_group_uuid]) groups[
                                group.locations_group_uuid] = group;
                        }
                    });
                    if (__env.enableDebug) console.log("Domain GROUPS");
                    if (__env.enableDebug) console.log(groups);
                    return groups;
                } else {
                    console.log(response.data.error.message);
                    return groups;
                }
            });
    };

    service.isAdminGroupOrGreater = function() {
        var group = $rootScope.user.accessgroup;
        return (group === 'admin' || group === 'kottertech' || group === 'superadmin');
    };

    service.createNewLocationsGroup = function(group, opts) {
        var data = service.preparePermGroupData(group, null);
        if (data.errors.length === 0) {
            dataFactory.postCreateLocationGroup(data)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (opts.onResponse) {
                        opts.onResponse(response);
                    }
                    if (response.data.success) {
                        if (!$rootScope.locationsGroups) $rootScope.locationsGroups = [];
                        var group = response.data.success.data;
                        group.communications = JSON.stringify(group.communications);
                        service.locationGroups[group.locations_group_uuid] = group;
                        attachAccessLevelMethods([group]);
                        $rootScope.locationsGroups.push(group);
                        $window.localStorage.setItem("locationsGroups", JSON.stringify(
                            $rootScope.locationsGroups));
                        $uibModalStack.dismissAll();
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            var string = '';
            angular.forEach(data.errors, function(error) {
                string += (string.length !== 0 ? ', ' : '') + error;
            });
            $rootScope.alerts.push({
                error: true,
                message: 'Error: ' + string
            });
            if (opts.onError) {
                opts.onError();
            }
        }
    };

    service.preparePermGroupData = function(group, index) {
        if (__env.enableDebug) console.log(group);
        var errors = [];
        var list = [];
        angular.forEach(group.communication_options, function(key, value) {
            if (key === true) list.push(value);
        });
        var list2 = [];
        angular.forEach(group.member, function(key, value) {
            if (key === true) list2.push(value);
        });
        var list3 = [];
        angular.forEach(group.manager, function(key, value) {
            if (key === true) list3.push(value);
        });
        if (!group.group_name) errors.push('Please enter Group Name.');
        if (list.length === 0) errors.push(
            'At least one Communication Channel must be selected.');
        if (list2.length === 0) errors.push('At least one Member must be specified.');
        if (list3.length === 0) errors.push('At lease one Manager must be specified.');

        var data = {
            locations_group_uuid: (index !== null ? $rootScope.locationsGroups[
                index].locations_group_uuid : null),
            domain_uuid: emulationService.getCurrentDomainUuid(),
            group_name: group.group_name,
            group_communications: list,
            group_members: list2,
            group_managers: list3,
            errors: errors
        };
        return data;
    };

    service.clearInfo = function() {
        angular.copy({}, service.locationGroups);
        service.currentLocation = null;
    };

    service.isManagerOfLocationType = function(locationType) {
        function isManagerOfGroup(group) {
            return group.ismanager();
        };

        function isOfLocationType(group) {
            return group.communications.indexOf(locationType) > -1;
        }
        return Object.values(service.locationGroups)
            .filter(isOfLocationType)
            .map(isManagerOfGroup).length > 0;
    };

    service.getManagedGroupsByType = function(locationType) {
        function isManagerOfGroup(group) {
            return group.ismanager();
        };

        function isOfLocationType(group) {
            return group.communications.indexOf(locationType) > -1;
        }
        return Object.values(service.locationGroups)
            .filter(isOfLocationType)
            .filter(isManagerOfGroup);
    };

    service.deleteGroup = function(group) {
        if (service.locationGroups[group.locations_group_uuid]) {
            delete service.locationGroups[group.locations_group_uuid];
            metaService.performCallbackData(
                service.callbacks.onAfterGroupDelete
            );
        }
        if (service.locationGroups[group.locations_group_uuid]) {
            delete service.locationGroups[group.locations_group_uuid];
        }
    };

    service.isManager = function() {
        if (service.currentLocation && service.locationGroups) {
            var currentLoc = service.locationGroups[service.currentLocation];

            function isManagerOfLocation(loc) {
                function isMatch(manager) {
                    return manager.user_uuid === $rootScope.user.id;
                }
                return _.some(loc.managers, isMatch) || service.isAdminGroupOrGreater();
            };
            return isManagerOfLocation(currentLoc);
        }
        return false;
    };

    service.handleSuccessUpdateGroup = function(group) {
        if (service.locationGroups[group.locations_group_uuid]) {
            attachAccessLevelMethods([group]);
            angular.copy(group, service.locationGroups[group.locations_group_uuid]);
        }
    };

    service.handleSuccessRemoveUser = function(group, type, removed) {
        var locationGroup = service.locationGroups[group.locations_group_uuid];
        if (locationGroup) {
            function isMatch(user) {
                return user.user_uuid === removed.user_uuid;
            };
            _.remove(locationGroup[type], isMatch);
        }
    };

    service.init();

    return service;
});
