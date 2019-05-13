'use strict';

proySymphony.directive('scrollableTable', function($window, $timeout, $interval) {
    return {
        restrict: 'E',
        templateUrl: 'views/scrollable-table/scrollable-table.html',
        scope: {
            columnNames: '<', // required
            tableData: '<?',
            resourceLength: '<?', // required if tableData not supplied
            perPage: '<?', // for paginated table only
            currentPage: '=?', // for paginated table only
            sortingOpts: '=?', // only use if sorting is desired. sorting disabled if not present
            noTableHeader: "<?", // set true for no table header
            separateFooter: "<?"
            // TODO: Sorting is currently only available if transclusion option is used. Need to
            //       implement "default" sorting if transclusion is not being used
        },
        transclude: {
            tableBody: '?tableBody',
            // - expects a table w/o thead/th's (table/tbody/tr's/td's only)
            // - use $parent in template to access this directive's scope
            // - only use if you need control over individual td behavior
            tableBodyFooter: '?tableBodyFooter'
        },
        link: function($scope, element, attributes, compile, transclude) {
            // Matches table head width to table body width when scrollbar is present
            var tableBodyContainer = element.find('.table-body-container')[0];
            $scope.tableBodyContainerHasScrollbar = function() {
                return tableBodyContainer.scrollHeight > tableBodyContainer.clientHeight;
            };

            function init() {
                initFooter();
            };


            $scope.tableHasHeader = function() {
                return !$scope.noTableHeader;
            };

            // Handles table sorting by column
            // Expected Fields: sorted-column, sort-direction
            function sortableColumn(columnName) {
                return $scope.sortingOpts.sortableColumns.indexOf(columnName) > -1;
            };
            $scope.getHeaderStyleObj = function(columnName) {
                if (!$scope.sortingOpts || !sortableColumn(columnName)) {
                    return {
                        "cursor": "auto"
                    };
                }
                return null;
            };

            function initFooter() {
                var hasFooter = transclude.isSlotFilled("tableBodyFooter");
                if ($scope.separateFooter || hasFooter) {
                    return;
                }
                $scope.$watchGroup(['perPage', 'resourceLength'], function(newVal, oldVal) {
                    var intLength = 10;
                    var durationInSecs = 3;
                    var prevNewVal;
                    var intPromise = $interval(function() {
                        var curVal = $scope.hasScrollbar;
                        $scope.hasScrollbar = $scope.tableBodyContainerHasScrollbar();
                        $scope.separateFooter = $scope.hasScrollbar;
                        var newVal = $scope.hasScrollbar;
                        if (curVal !== newVal && prevNewVal !== undefined) {
                            $scope.hasScrollbar = !$scope.hasScrollbar;
                            $scope.separateFooter = true;
                            $interval.cancel(intPromise);
                        }
                        prevNewVal = newVal;
                    }, intLength, ((durationInSecs * 1000) / intLength));
                });
            };

            if ($scope.sortingOpts) {
                $scope.showSelectedChevron = function(columnName, direction) {
                    var currentDirection = $scope.sortingOpts.sortDirection ? 'up' :
                        'down';
                    return $scope.sortingOpts.selectedColumn === columnName &&
                        direction === currentDirection &&
                        sortableColumn(columnName);
                };
                $scope.showDefaultChevron = function(columnName) {
                    return $scope.sortingOpts.selectedColumn !== columnName &&
                        sortableColumn(columnName);
                };
                $scope.setSort = function(columnName) {
                    if ($scope.sortingOpts.selectedColumn === columnName) {
                        $scope.sortingOpts.sortDirection = !$scope.sortingOpts.sortDirection;
                    } else if (sortableColumn(columnName)) {
                        $scope.sortingOpts.selectedColumn = columnName;
                    }
                };
                if ($scope.sortingOpts.defaultSortingBehavior) {
                    function handleNewSelectedCol(newVal, oldVal) {
                        $scope.sortingOpts.orderByValue = newVal;
                    }
                    $scope.$watch('sortingOpts.selectedColumn', handleNewSelectedCol);
                } else if ($scope.sortingOpts.handleNewSelectedCol) {
                    function handleNewSelectedCol(newVal, oldVal) {
                        var _handleNewSelectedCol = $scope.sortingOpts.handleNewSelectedCol;
                        $scope.sortingOpts.orderByValue = _handleNewSelectedCol(newVal);
                    };
                    $scope.$watch('sortingOpts.selectedColumn', handleNewSelectedCol);
                }
            }
        }
    };
});
