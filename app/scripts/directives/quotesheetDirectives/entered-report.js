'use strict';

proySymphony.directive('enteredReport', function(quoteSheetService, resourceFrameworkService,
    $window) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/entered-report.html',
        scope: {
            showQuotes: '&'
        },
        link: function($scope, element, attributes) {
            $scope.showQuotes = $scope.showQuotes();
            var qss = quoteSheetService;
            var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                service: qss,
                scope: $scope
            });

            qss.registerOnAfterInitCallback(function() {
                refreshRegisterFn({
                    resourceName: 'quotes',
                    serviceResourceName: 'quotesGroupedByAssignedToAndTemplateName',
                    scopeResourceName: 'quotesByAssignedAndTemplate',
                    onAfterRefresh: calcDerivedVals
                });
            }); // need a two-axis table

            function calcDerivedVals() {
                var quoteObj = $scope.quotesByAssignedAndTemplate;
                $scope.quotes = pullQuotesFromQuoteObj(quoteObj);
                $scope.quotesLength = $scope.quotes.length;
                $scope.assignedToNames = Object.keys(quoteObj);
                // $scope.templateNames = pullTemplateNamesFromQuoteObj(quoteObj);
            };

            function pullQuotesFromQuoteObj(quoteObj) {
                function getVals(obj) {
                    return Object.values(obj);
                }
                return _.flattenDeep(getVals(quoteObj).map(getVals));
            };

            $window.enteredScope = $scope;
        }
    };
});
