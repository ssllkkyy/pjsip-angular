'use strict';
var proySymphony = proySymphony;

proySymphony
    .directive('statusDropdown', function($rootScope, contactService, statusService, metaService, $window,
        callService) {
        return {
            restrict: 'E',
            templateUrl: 'views/status/status-dropdown.html',
            scope: {},
            link: function($scope, element, attrs) {
                metaService.registerOnRootScopeUserLoadCallback(function() {
                    console.log($rootScope.user);
                    $scope.user = $rootScope.user;
                    $scope.userStatusIconClass = $rootScope.userStatusIconClass;
                    $scope.domainsStatus = statusService.customStatuses;
                    $scope.setStatus = function(statusName) {
                        console.log(statusName);
                        if (!callService.onCall()) {
                            statusService.setStatusAndPersist(statusName);
                        }
                    };
                });
                $scope.showicon = $rootScope.showicon;
                $scope.contact = function() {
                    return $scope.user ? contactService.getContactByUuid($scope.user.contact_uuid) : null;
                };
            }
        };
    });
