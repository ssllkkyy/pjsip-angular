'use strict';

proySymphony.controller('BasicCtrl', function($scope, $routeParams, $location, $interval, $auth,
    __env, dataFactory, symphonyConfig, $window, $rootScope) {

    $scope.template = '/views/sms.html';

    $scope.changeTemplate = function(template) {
        $scope.template = template;
    };

});
