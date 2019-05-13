'use strict';

proySymphony.directive('twoAxisTable', function($window) {
    return {
        restrict: 'E',
        templateUrl: 'views/two-axis-table/two-axis-table.html',
        scope: {
            resourceData: "<"
        },
        transclude: {
            tdData: '?tdData'
        },
        link: function($scope, element, attributes) {
            var tableBodyContainer = element.find('.table-body-container')[0];

            $scope.init = function() {
                $scope.xAxisVals = Object.keys($scope.resourceData);
                $scope.yAxisVals = getYAxisVals($scope.resourceData);
                $scope.styleObj = {};
                $scope.hasScrollbar = $scope.tableBodyContainerHasScrollbar();
                applyColStyles({
                    width: (100 / ($scope.xAxisVals.length + 1)) + "%"
                });
            };

            $scope.$watch('resourceData', function(newVal, oldVal) {
                $scope.init();
            });

            $scope.tableBodyContainerHasScrollbar = function() {
                return tableBodyContainer.scrollHeight > tableBodyContainer.clientHeight;
            };

            function applyColStyles(styles) {
                function indexToThStyleObjName(index) {
                    return "columnNameTh" + index;
                };

                function indexToTdStyleObjName(index) {
                    return "td" + index;
                };
                var indices = _.range($scope.xAxisVals.length);
                var thObjNames = indices.map(indexToThStyleObjName).concat([
                    'spacerThStyle'
                ]);
                var tdObjNames = indices.map(indexToTdStyleObjName).concat([
                    'rowHeaderStyle'
                ]);

                function applyStyles(objNames) {
                    objNames.forEach(function(objName) {
                        $scope.styleObj[objName] = _.merge($scope.styleObj[
                            objName], styles);
                    });
                }
                applyStyles(thObjNames);
                applyStyles(tdObjNames);
            }

            function getYAxisVals(data) {
                function pullNames(obj) {
                    return Object.keys(obj);
                }
                return threadFns([_.flatten, _.uniq])(
                    Object.values(data).map(pullNames)
                );
            };

            function threadFns(fns) {
                return function(input) {
                    fns.forEach(function(fn) {
                        input = fn(input);
                    });
                    return input;
                };
            };
            $window.twoAxis = $scope;
        }
    };
});
