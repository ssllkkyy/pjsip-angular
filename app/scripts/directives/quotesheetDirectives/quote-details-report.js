'use strict';

proySymphony.directive('quoteDetailsReport', function(quoteSheetService, resourceFrameworkService,
    $window, usefulTools) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/quote-details-report.html',
        scope: {
            showQuotes: '&',
            detailsData: '='
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
                $scope.detailsData.dateDisabled = function(data) {
                    var date = data.date;
                    return date > moment().toDate();
                };
                $scope.detailsData.onDateChange = $scope.onDateChange;
                $scope.detailsData.datePickerModel = moment().toDate();
                qss.registerOnAfterInitCallback(function() {
                    refreshRegisterFn({
                        resourceName: 'quotes',
                        serviceResourceName: 'quotesGroupedByAssignedToAndStatusName',
                        scopeResourceName: 'quotesByAssignedAndStatus',
                        onAfterRefresh: calcDerivedVals
                    });
                });
            }

            $scope.onDateChange = (function() {
                var datesSeen = 0;
                return function(newVal) {
                    datesSeen++;
                    if (datesSeen > 1) {
                        var timestamp = moment(newVal).round(24, "hours").format(
                            "X");
                        var now = moment().round(24, "hours").format("X");
                        if (now === timestamp) {
                            $scope.historyGroupedQuotes = null;
                        } else {
                            qss.loadQuotesSnapshot({
                                locations_group_uuid: qss.currentLocationUuid,
                                snapshot_timestamp_in_secs: timestamp
                            }).then(function(response) {
                                if (response) {
                                    var groupSpec = [
                                        "history.status.quote_sheet_status_name",
                                        "history.assigned_to.user_name_given"
                                    ];
                                    var multiGroupBy = usefulTools.multiGroupBy;
                                    $scope.historyGroupedQuotes =
                                        multiGroupBy(response,
                                            groupSpec);
                                }
                            });
                        }
                    }
                };
            })();

            function calcDerivedVals() {
                // var quoteObj = $scope.quotesByAssignedAndTemplate;
                // $scope.quotes = pullQuotesFromQuoteObj(quoteObj);
                // $scope.quotesLength = $scope.quotes.length;
                // $scope.assignedToNames = Object.keys(quoteObj);
                // $scope.hasScrollbar = $scope.tableBodyContainerHasScrollbar();
                // $scope.templateNames = pullTemplateNamesFromQuoteObj(quoteObj);
            };

            $window.detailsScope = $scope;

            init();
        }
    };
});
