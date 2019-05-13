'use strict';

proySymphony.directive('quoteReports', function(quoteSheetService, resourceFrameworkService,
    $window) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/quote-reports.html',
        scope: {
            setEditingQuote: '&'
        },
        link: function($scope, element, attributes) {
            $scope.setEditingQuote = $scope.setEditingQuote();
            var qss = quoteSheetService;
            var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                service: qss,
                scope: $scope
            });

            $scope.init = function() {
                $scope.reportType = $scope.reportTypes[0];
            };

            $scope.reportTypes = [{
                    title: "Quotes Entered",
                    name: "entered"
                },
                {
                    title: "Current Quote Stats",
                    name: "quote-stats"
                },
                {
                    title: "Quote Details By Date",
                    name: "quote-details"
                }
            ];

            $scope.detailsData = {
                datePickerModel: null,
                onDateChange: null,
                dateDisabled: null
            };

            $scope.showQuotes = function(quotes) {
                $scope.historyQuotes = quotes;
            };

            $scope.closeQuotesHistory = function() {
                $scope.historyQuotes = null;
            };

            $scope.init();
            $window.reportScope = $scope;
        }
    };
});
