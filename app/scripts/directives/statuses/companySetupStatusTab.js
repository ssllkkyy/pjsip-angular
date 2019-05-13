'use strict';
var proySymphony = proySymphony;

proySymphony
    .directive('companySetupStatusTab', function($location, dataFactory, $rootScope,
        emulationService, $window, statusService, resourceFrameworkService) {
        return {
            restrict: 'E',
            templateUrl: 'views/company/company-status.html',
            scope: {

            },
            link: function($scope, element, attrs) {

                $scope.RSTstatus = {};
                $scope.NEWstatus = {};

                var rfs = resourceFrameworkService;
                $scope.init = function() {
                    var refreshRegisterFn = rfs.getResourceRefreshRegister({
                        service: statusService,
                        scope: $scope
                    });
                    refreshRegisterFn({
                        resourceName: 'domainsStatus',
                        serviceResourceName: 'customStatuses'
                    });
                    $scope.$watch('domainsStatus', function(newVal, oldVal) {
                        if (newVal && newVal.length > 0) {
                            $scope.getAvailStatusIcons();
                        }
                    });
                };

                $scope.statusSuggestedIcons = [{
                        code: 4,
                        description: 'fa-pause-circle-o',
                        color: '#99cc00',
                        available: true
                    },
                    {
                        code: 5,
                        description: 'fa-minus',
                        color: '#cc3300',
                        available: true
                    },
                    {
                        code: 6,
                        description: 'fa-user-o',
                        color: '#009900',
                        available: true
                    },
                    {
                        code: 7,
                        description: 'fa-handshake-o',
                        color: '#ff9933',
                        available: true
                    },
                    {
                        code: 8,
                        description: 'fa-bank',
                        color: '#6699ff',
                        available: true
                    },
                    {
                        code: 9,
                        description: 'fa-calendar-o',
                        color: '#00b3b3',
                        available: true
                    },
                    {
                        code: 10,
                        description: 'fa-coffee',
                        color: '#734d26',
                        available: true
                    },
                    {
                        code: 11,
                        description: 'fa-group',
                        color: '#0066cc',
                        available: true
                    },
                    {
                        code: 12,
                        description: 'fa-car',
                        color: '#4d9900',
                        available: true
                    },
                    {
                        code: 13,
                        description: 'fa-cutlery',
                        color: '#d1e0e0',
                        available: true
                    },
                    {
                        code: 14,
                        description: 'fa-file-text',
                        color: '#ffc433',
                        available: true
                    }
                ];

                $scope.statusAfterChange = function() {
                    for (var y = 0; y < $scope.statusSuggestedIcons.length; y++) {
                        $scope.statusSuggestedIcons[y].available = true;
                    }
                    $scope.getAvailStatusIcons();
                };

                $scope.getAvailStatusIcons = function() {
                    for (var i = 0; i < $rootScope.domainsStatus.length; i++) {
                        for (var y = 0; y < $scope.statusSuggestedIcons.length; y++) {
                            if ($scope.statusSuggestedIcons[y].available) {
                                if ($rootScope.domainsStatus[i].status_icon == $scope.statusSuggestedIcons[
                                        y].description) {
                                    $scope.statusSuggestedIcons[y].available = false;
                                }
                            }
                        }
                    }
                };

                $scope.updDomainsStatus = function(param) {
                    param['statusIcon'] = param.icon;
                    param = statusService.mapCustomStatusToDBForm(param);
                    if (nullOrUndefined(param.receive_calls)) {
                        param.receive_calls = false;
                    };
                    if (nullOrUndefined(param.start_timer)) {
                        param.start_timer = false;
                    };
                    dataFactory.updDomainsStatus(param)
                        .then(function(response) {
                            console.log(response);
                            if (response.data.success) {} else {
                                $rootScope.alerts.push({
                                    error: true,
                                    message: "Please setup all the fields."
                                });
                            }
                        }, function(error) {
                            $rootScope.alerts.push({
                                error: true,
                                message: error.data.error.message
                            });
                        });
                    $scope.statusAfterChange();
                };

                $scope.addStatus = function() {
                    if ($rootScope.domainsStatus.length < 8) {
                        $scope.showAddStatus = !$scope.showAddStatus;
                    } else {
                        $rootScope.alerts.push({
                            error: true,
                            message: 'You can add only 8 statuses!'
                        });
                    }
                };

                $scope.insDomainsStatus = function(param) {
                    param = statusService.mapCustomStatusToDBForm(param);
                    if (nullOrUndefined(param.receive_calls)) {
                        param.receive_calls = false;
                    };
                    if (nullOrUndefined(param.start_timer)) {
                        param.start_timer = false;
                    };
                    if (nullOrUndefined(param.status_active)) {
                        param.status_active = false;
                    };
                    var domainUuid = emulationService.getCurrentDomainUuid();
                    var data = {
                        domain_uuid: domainUuid,
                        receive_calls: param.receive_calls,
                        status_active: param.status_active,
                        start_timer: param.start_timer,
                        status_name: param.status_name,
                        status_description: param.status_description,
                        status_icon: param.status_icon
                    };
                    console.log(data);
                    dataFactory.insDomainsStatus(data)
                        .then(function(response) {
                            console.log(response);
                            if (response.data.success) {
                                $rootScope.alerts.push({
                                    success: true,
                                    message: 'Success: ' + response.data.success
                                        .message
                                });
                                $rootScope.domainsStatus.push(response.data.success
                                    .data);
                                statusService.loadCustomStatuses();
                                $scope.NEWstatus = {};
                                $scope.showAddStatus = false;

                            } else {
                                $rootScope.alerts.push({
                                    error: true,
                                    message: "Please setup all the fields before saving."
                                });

                            }
                        }, function(error) {
                            $rootScope.alerts.push({
                                error: true,
                                message: error.data.error.message
                            });
                        });
                };

                $scope.cancelInsertStatus = function() {
                    $scope.NEWstatus = {};
                    $scope.showAddStatus = !$scope.showAddStatus;
                };

                function nullOrUndefined(val) {
                    return val === null || val === "undefined" || val === undefined;
                };

                $scope.init();

                $window.statusScope = $scope;
            }
        };
    });
