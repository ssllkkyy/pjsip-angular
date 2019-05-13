'use strict';

proySymphony.controller('ctrlNavBar', function($scope, $auth, $location, $rootScope, $uibModal,
    $document, __env, $uibModalStack, $http, dataFactory) {
    $scope.menuOpen = false;

    $scope.openNav = function() {
        $scope.menuOpen = !$scope.menuOpen;
        // alert("Trying To open");
        // if ($scope.menuOpen) {
        //     $scope.menuOpen = false;
        // } else
        //     $scope.menuOpen = true;
    };
});
