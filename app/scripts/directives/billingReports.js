'use strict';

proySymphony
    .directive('billingReportsTab', function($rootScope, __env, symphonyConfig, $window, $myModal,
        usefulTools, contactService, $mdDialog, billingService, dataFactory, $filter,
        $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/billing-reports.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.userToken = $rootScope.userToken;
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.paginate = {
                    perPage: 30,
                    currentPage: 1
                };
                $scope.tips = $rootScope.tips;
                $scope.reverse = false;

                $scope.agency = null;
                $scope.reportsLoaded = [];
                $scope.loadingReports = false;

                function init() {
                    $scope.loadingReports = true;
                    billingService.loadBillingReports()
                        .then(function(response) {
                            $scope.loadingReports = false;
                        });
                }

                init();

                $scope.reportsLoaded = function() {
                    return billingService.reportsLoaded;
                };

                $scope.showUserName = function(userUuid) {
                    var contact = contactService.getContactByUserUuid(userUuid);
                    if (contact) return contact.name;
                    return null;
                };

                $scope.generateNewReport = function() {
                    $myModal.openTemplate('new-report-modal.html', null, 'md');
                };

                $scope.cancelBillingReport = function(report) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Are you sure you want to cancel / remove this report?')
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        billingService.cancelBillingReport(report)
                            .then(function(response) {
                                if (response.data.error) $rootScope.showErrorAlert(
                                    response.data.error.message);
                            });
                    });
                };

                $scope.viewReport = function(report) {
                    if (report.report_data) {
                        var data = JSON.parse(report.report_data);
                        $scope.dataHeaders = data.shift();
                        $scope.viewData = data;
                        $scope.showReport = report;
                    } else {
                        $rootScope.showErrorAlert(
                            'This report does not have complete data.');
                    }
                };

                $scope.sortIndex = 0;

                $scope.dataSort = function(line) {
                    return line[$scope.sortIndex];
                };

                $scope.showReportType = function(report) {
                    var options = '';
                    if (report.report_type === 'invoice-summary') options = ' (Date: ' +
                        report.options.invoiceDate + ')';
                    if (report.report_type === 'declined-payment') options = ' (Date: ' +
                        report.options.paymentDate + ')';
                    if (report.report_type === 'billing-summary') options = ' (Group: ' +
                        report.options.custBlock + ')';
                    return report.report_type.replace(/-/g, ' ') + options;
                };

                $scope.closeReport = function() {
                    $scope.viewData = null;
                    $scope.showReport = null;
                    $scope.dataHeaders = null;
                };

                $scope.isKeithUser = function() {
                    var users = ['aatestatkeithgallantcom', 'stagingatkeithgallantcom',
                        'keithatkeithgallantcom'
                    ];
                    return users.indexOf($rootScope.user.username) !== -1;
                };

                $scope.sort_by = function(sortIndex) {
                    $scope.sortIndex = sortIndex;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.showChevron = function(sortIndex) {
                    return usefulTools.showChevron(sortIndex, $scope.sortIndex, $scope.reverse);
                };

                $scope.goToDomain = function(domainUuid) {
                    $rootScope.showInfoAlert(
                        'This function is not yet implemented. You will need to load the agency on the Agencies tab to see their data.'
                    );
                    return;
                    var confirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'This will open the agency\'s billing profile in a new tab. Please confirm you would like to do this? '
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirm).then(function() {
                        var bridgeUrl = (__env.symphonyUrl && __env.symphonyUrl !==
                            '' ? __env.symphonyUrl : symphonyConfig.symphonyUrl
                        );
                        $window.location.href = bridgeUrl +
                            '/settings/billing/' + domainUuid;
                    });
                };
            }
        };
    })
    .directive('newBillingReport', function($rootScope, billingService, dataFactory) {
        return {
            restrict: 'E',
            templateUrl: 'new-billing-report.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.closeModal = $rootScope.closeModal;
                $scope.billingDates = [];

                $scope.data = {
                    reportType: 'billing-summary',
                    custBlock: 'all'
                };

                dataFactory.getRecentBillingDates()
                    .then(function(response) {
                        if (response.data.success) {
                            $scope.billingDates = response.data.success.data;
                        }
                    });

                $scope.generateReport = function() {
                    billingService.createBillingReport($scope.data)
                        .then(function(response) {
                            $scope.closeModal();
                            if (response.data.error) $rootScope.showErrorAlert(
                                response.data.error.message);
                        });
                };

            }
        };
    });
