'use strict';

proySymphony.directive('quoteStatsReport', function(quoteSheetService, resourceFrameworkService,
    $window) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/quote-stats-report.html',
        scope: {
            showQuotes: '&'
        },
        link: function($scope, element, attributes) {
            $scope.showQuotes = $scope.showQuotes();
            var tableBodyContainer = element.find('.table-body-container')[0];
            var qss = quoteSheetService;
            var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                service: qss,
                scope: $scope
            });

            function init() {
                qss.registerOnAfterInitCallback(function() {
                    refreshRegisterFn({
                        resourceName: 'quotes',
                        serviceResourceName: 'quotesGroupedByStatus',
                        scopeResourceName: 'quotesGroupedByStatus',
                        onAfterRefresh: calcDerivedVals
                    });
                });
            }

            $scope.tableBodyContainerHasScrollbar = function() {
                return tableBodyContainer.scrollHeight > tableBodyContainer.clientHeight;
            };

            function calcDerivedVals() {
                $scope.statusNames = Object.keys($scope.quotesGroupedByStatus);
                $scope.hasScrollbar = $scope.tableBodyContainerHasScrollbar();
            };

            $window.quoteStats = $scope;
            init();
        }
    };
});
