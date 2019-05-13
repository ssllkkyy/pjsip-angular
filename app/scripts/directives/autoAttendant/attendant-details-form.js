'use strict';

proySymphony.directive("attendantDetailsForm", function(autoAttendantService, $rootScope, $window, usefulTools) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant-reflow/attendant-details-form.html",
        scope: {
            attendant: "<",
            newAttendant: "<"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;
            $scope.editing = Boolean($scope.attendant);
            $scope.status = { open: false };

            $scope.init = function() {
                if (!$scope.editing) { $scope.status.open = true; }
                $scope.timezones = $scope.newAttendant.callFlowScheduleModel.getPossibleTimezones();
                if (!$scope.newAttendant.description && $scope.attendant) {
                    $scope.newAttendant.description = $scope.attendant.description;
                }
            };

            $scope.orderNewNumber = function() {
                $scope.orderingNumber = true;
                aas.orderNewNumber().then(function() { $scope.orderingNumber = false; });
            };

            $scope.orderTestNumber = function() {
                $scope.orderingNumber = true;
                aas.orderNewNumber(true).then(function() { $scope.orderingNumber = false; });
            };

            $scope.onDestChange = function(destUuid, isSet) {
                $scope.newAttendant.additional_destinations[destUuid] = isSet;
            };

            $scope.init();
        }};
});
