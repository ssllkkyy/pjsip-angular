'use strict';

proySymphony.directive("callParkingButtons", function(callService, $rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'views/calls/call-parking-buttons.html',
        scope: {},
        link: function($scope, element, attributes) {
            $scope.triggerParkingSpot = function(spot) {
                callService.parkCurrentCall(spot);
                console.debug(
                    "park: should see a pusher parking notice come soon for domain $rootScope.user.domain.domain_name: " +
                    $rootScope.user.domain.domain_name);
            };
            $scope.startSelfTransfer = callService.startSelfTransfer;

            $scope.showIncomingCallThreeWay = function() {
                return callService.totalIncomingCalls == 1 && callService.onCall();
            };
        }
    };
});
