'use strict';

proySymphony.directive('locationSelector', function(locationService, resourceFrameworkService,
    $rootScope, $location, $cookies) {
    return {
        restrict: 'E',
        templateUrl: 'views/locations/location-selector.html',
        scope: {
            onLocationChange: '&',
            locationUuid: '=',
            viewable: '=',
            isManager: '<',
            bootLocChange: '<',
            isManagerOrMember: '<',
            typeFilter: '='
        },
        link: function($scope, element, attributes) {
            var RFS = resourceFrameworkService;

            function getLocKey() {
                return "loc-selector" + $location.path();
            }
            $scope.onLocChange = function() {
                if ($scope.location) {
                    var locationUuid = $scope.location.locations_group_uuid;
                    $scope.onLocationChange()(locationUuid);
                    $cookies.put(getLocKey(), locationUuid);
                }
            };

            function setLoc(loc) {
                if (loc) {
                    $scope.location = loc;
                    $scope.locationUuid = loc.locations_group_uuid;
                    $cookies.put(getLocKey(), loc.locations_group_uuid);
                }
            };
            locationService.registerOnAfterLoadGroupsCallback(function() {
                var refreshRegisterFn = RFS.getResourceRefreshRegister({
                    service: locationService,
                    scope: $scope
                });

                function isMemberOfLocation(loc) {
                    function isMatch(member) {
                        return member.user_uuid === $rootScope.user.id;
                    }
                    return _.some(loc.members, isMatch);
                };

                function isManagerOfLocation(loc) {
                    function isMatch(manager) {
                        return manager.user_uuid === $rootScope.user.id;
                    }
                    return _.some(loc.managers, isMatch) || locationService.isAdminGroupOrGreater();
                };

                function isManagerOrMember(loc) {
                    return isManagerOfLocation(loc) || isMemberOfLocation(loc);
                };

                function isType(loc) {
                    if (!$scope.typeFilter) return true;
                    var regex = new RegExp($scope.typeFilter, "g");
                    return loc.communications.match(regex);
                }
                var filterFn;
                if ($scope.isManagerOrMember) {
                    filterFn = isManagerOrMember;
                } else {
                    filterFn = $scope.isManager ? isManagerOfLocation :
                        isManagerOrMember;
                }

                function availLocKeyToVal(key) {
                    return locationService.locationGroups[key];
                }
                $scope.locationGroups = Object.keys(locationService.locationGroups)
                    .map(availLocKeyToVal).filter(filterFn).filter(isType);
                    console.log(locationService.locationGroups);
                    if ($scope.viewable) $scope.locationGroups = _.filter($scope.locationGroups,
                        function(loc) {
                            return loc.communications.indexOf($scope.viewable) !== -1;
                    });
                $scope.$watch('locationUuid', function(newVal, oldVal) {
                    if (newVal) {
                        function locMatchesLocKey(loc) {
                            return loc.locations_group_uuid === newVal;
                        }
                        var location = _.find($scope.locationGroups,
                            locMatchesLocKey);
                        if (location) {
                            setLoc(location);
                        }
                    }
                });
                if (!$scope.locationUuid) {
                    var loc;
                    var locUuid = $cookies.get(getLocKey());
                    if (locUuid) {
                        loc = _.find($scope.locationGroups, [
                            'locations_group_uuid', locUuid
                        ]);
                    }
                    if (loc) {
                        setLoc(loc);
                    } else {
                        setLoc(Object.values($scope.locationGroups)[0]);
                    }
                }
                if ($scope.bootLocChange) {
                    $scope.onLocChange();
                }
            });
        }
    };
});
