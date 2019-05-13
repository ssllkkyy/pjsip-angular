'use strict';

proySymphony
    .directive('dashboardList', function($parse) {
        return {
            restrict: 'E',
            templateUrl: 'views/dashboard/dashboard-list.html',
            scope: {
                tiles: '=',
                helperFns: '='
            },
            link: function($scope, element, attrs) {

            }
        };
    });
