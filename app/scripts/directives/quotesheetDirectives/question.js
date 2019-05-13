'use strict';

proySymphony.directive('question', function() {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/question.html',
        scope: {
            question: '<',
            answers: '='
        },
        link: function($scope, element, attributes) {}
    };
});
