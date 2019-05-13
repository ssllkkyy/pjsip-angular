'use strict';

proySymphony.controller('ctrlSupport', function($scope, $routeParams, $location, $interval, $auth,
    __env, dataFactory, symphonyConfig, $window, $rootScope) {
    $scope.callSupport = function() {
        alert("Calling Support");
    }

    $scope.toggleChat = function() {
        alert("Toggling Chat");
    }
});
