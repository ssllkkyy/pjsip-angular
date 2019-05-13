"use strict";

proySymphony.directive("ngVisible", function($animate) {
    return {
        restrict: "A",
        multiElement: true,
        link: function(scope, element, attr) {
            scope.$watch(attr.ngVisible, function(value) {
                $animate[value ? "removeClass" : "addClass"](element,
                    "ng-invisible", {
                        tempClasses: "ng-invisible-animate"
                    });
            });
        }
    };
});
