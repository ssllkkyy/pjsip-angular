'use strict';

proySymphony.controller('VisualVoiceMailCtrl', function($scope, $timeout, contactService,
    usefulTools, $filter, $rootScope, userService, emulationService, locationService,
    symphonyConfig, ngAudio, $location, $window, dataFactory) {

    if ($rootScope.packageHasAccess('visualvoicemail')) {
        $scope.vvmTableHeight = $window.innerHeight - 300;
        $rootScope.voicemail = {
            activeTab: 0,
            ismanager: false,
            isuser: false
        };

        $rootScope.$on('set.domain.voicemail.tab', function() {
            $rootScope.voicemail.activeTab = 1;
        });
        $rootScope.$on('set.user.voicemail.tab', function() {
            $rootScope.voicemail.activeTab = 0;
        });

        $scope.showDomain = function(item) {
            if ($routeParams.domain === 'true') {
                return item.call_status === 'missed' || item.call_status ===
                    'sent_to_voicemail';
            }
            return true;
        };

        $scope.emulatedUser = function() {
            return emulationService.emulatedUser;
        };

        $scope.getUserNameByUUID = function(userUuid) {
            var contact = contactService.getContactByUserUuid(userUuid);
            if (contact) {
                return contact.name;
            }
            return null;
        };

        $scope.getUserUuid = function() {
            return $scope.emulatedUser() ? $scope.emulatedUser() : $rootScope.user.id;
        };

        $scope.hasGroups = function() {
            return $scope.myGroups && $scope.showMyGroups().length > 0;
        };

        if (!$rootScope.nonContacts) $rootScope.nonContacts = JSON.parse($window.localStorage
            .getItem("nonContacts"));

        loadLocations();

        function loadLocations() {
            var domainUuid = $rootScope.user.domain_uuid;
            locationService.getLocationGroups('dids', domainUuid)
                .then(function(response) {
                    $scope.myGroups = response;
                    $scope.locationUuid = locationService.currentLocation;

                    if (__env.enableDebug) console.log("DID Location GROUPS");
                    if (__env.enableDebug) console.log($scope.myGroups);
                });
        }

        $rootScope.$on('location.update', function() {
            loadLocations();
        });


        $scope.showMyGroups = function() {
            return usefulTools.convertObjectToArray($scope.myGroups);
        };

        $scope.$watch('voicemail.activeTab', function(newVal, oldVal) {
            console.log(newVal);
            console.log(oldVal);
            if (newVal === 1) {
                $scope.message = "LOAD DOMAIN VMS";
                emulationService.clearEmulation();
                $rootScope.emulatedUserContacts = [];
                $rootScope.$broadcast('reload.voicemail', 'domain');
            } else if (newVal === 0) {
                $scope.message = "LOAD USER VMS";
                $rootScope.$broadcast('reload.voicemail', 'user');
            }
            if (newVal !== oldVal) {
                if (newVal === 1) {


                    // $rootScope.selectEmulateUser = null;
                } else if (newVal === 0) {

                }
            }
        });

        $scope.changeLocation = function(location) {
            $scope.locationUuid = location;
        };

        $scope.getIcon = function(column) {
            return 'glyphicon-chevron-down';
        };
    }
});
