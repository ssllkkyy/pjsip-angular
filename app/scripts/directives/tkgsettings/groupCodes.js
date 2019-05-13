'use strict';

proySymphony
    .directive('adminGroupCodesTab', function($rootScope, $myModal, dataFactory, $filter, $window,
        $uibModalStack, userService, customerGroupCodeService, metaService) {

        return {
            restrict: 'E',
            templateUrl: 'views/tkgadmin/groupcodes.html',
            scope: {},
            link: function($scope, element, attrs) {
                //$scope.customerGroupCodes = $rootScope.customerGroupCodes;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.state = 'table';
                customerGroupCodeService.setCustomerGroupCodes();
                $scope.customerGroupCodes = customerGroupCodeService.codes;
                $scope.isSalesOrGreater = $rootScope.isSalesOrGreater;
                $scope.isBillingAdminOrGreater = $rootScope.isBillingAdminOrGreater;
                $scope.predicate = 'customer_group_code';
                $scope.reverse = false;
                $scope.sortBy = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.filterCodes = function(code) {
                    if (!$scope.codeSearch ||
                        (code.customer_group_code.indexOf($scope.codeSearch.toLowerCase()) !==
                            -1) ||
                        (code.description.indexOf($scope.codeSearch.toLowerCase()) !==
                            -1) ||
                        (code.partner.partner_name.indexOf($scope.codeSearch.toLowerCase()) !==
                            -1)) return true;
                    return false;
                };
                // VIEW METHODS

                $scope.title = function() {
                    if ($scope.state === 'table') {
                        return 'Group Codes';
                    } else if ($scope.state === 'spreadsheet') {
                        return 'Import Contacts From Spreadsheet';
                    }
                    return undefined;
                };
                $scope.isEnabled = function(enabled) {
                    if (enabled == 'true') return true;
                    return false;
                };

                $scope.showEditCode = function(code) {
                    if (!code) {
                        code = {
                            discount: 0,
                            dollar_discount: 0.0,
                            free_months: 0
                        };
                    }
                    $myModal.openTemplate('managecodes.html', code, '');
                };

                $scope.getToggleGroupCodeStatus = function(uuid) {
                    dataFactory.getToggleGroupCodeStatus(uuid)
                        .then(function(response) {
                            if (__env.enableDebug) console.log(response.data);
                            if (response.data.error) {
                                if (__env.enableDebug) console.log(response.data.error
                                    .message);
                            } else {
                                $rootScope.$broadcast('groupcode.changed', '');
                            }
                        });
                };

                metaService.rootScopeOn($scope, 'groupcode.changed', function() {
                    customerGroupCodeService.setCustomerGroupCodes();
                    $scope.customerGroupCodes = customerGroupCodeService.codes;
                });

                $scope.toggleState = function(state) {
                    $scope.state = state;
                };

                $scope.stateIsShowing = function(state) {
                    return state === $scope.state;
                };
            }
        };
    })
    .directive('editGroupCode', function($rootScope, $myModal, dataFactory, $filter, $window,
        $uibModalStack, customerGroupCodeService) {
        return {
            restrict: 'E',
            templateUrl: 'editgroupcode.html',
            scope: {
                code: '=?',
            },
            link: function($scope, element, attrs) {
                if (__env.enableDebug) console.log($scope);
                if (__env.enableDebug) console.log($scope.code);
                $scope.groupcode = $scope.code;

                function getManagementPartners() {
                    dataFactory.getManagementPartners()
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.partnerApps = response.data.success.data;
                            } else {
                                $scope.partnerApps = [];
                            }
                        });
                }
                getManagementPartners();

                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.saveGroupCode = function(code) {
                    if (code.customer_group_code === 'generic' && !code.customer_group_code_uuid) {
                        $rootScope.showErrorAlert(
                            "The keyword 'generic' is restricted and can not be used for a new group code."
                        );
                        return;
                    }
                    if (__env.enableDebug) console.log(code);
                    dataFactory.postSaveGroupCode(code)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $rootScope.$broadcast('groupcode.changed', response
                                    .data.success.data);
                            }
                            $uibModalStack.dismissAll();
                        });
                };
            }
        };
    });
