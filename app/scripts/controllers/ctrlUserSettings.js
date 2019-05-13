'use strict';

var app = angular.module('myApp', ['ngMaterial']);
proySymphony.controller('ctrlUserSettings', function($mdSidenav, $scope) {

    $scope.openUserMenu = function() {
        $mdSidenav('user-info').toggle();
    };
    $scope.openPwMenu = function() {
        $mdSidenav('pw-info').toggle();
    };
    $scope.openVmMenu = function() {
        $mdSidenav('vm-info').toggle();
    };
    $scope.openRingMenu = function() {
        $mdSidenav('ring-info').toggle();
    };

    // $scope.closeNav = function(close){}

});
