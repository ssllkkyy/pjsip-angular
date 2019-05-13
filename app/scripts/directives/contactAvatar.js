'use strict';

proySymphony.directive('contactAvatar', function($rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'views/contact-avatar.html',
        scope: {
            contact: '<'
        },
        link: function($scope, element, attributes) {
            $scope.pathImgProfile = $rootScope.pathImgProfile;
        }
    };
});
