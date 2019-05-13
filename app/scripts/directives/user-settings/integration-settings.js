'use strict';

proySymphony.directive('integrationSettings', function($rootScope, dataFactory, metaService, $websocket,
    greenboxService, $interval, $mdDialog, $timeout) {
    return {
        restrict: 'E',
        templateUrl: 'views/settings/integration-settings.html',
        scope: {
            user: '<'
        },
        link: function($scope, element, attrs) {

            //$scope.user = $rootScope.user;

            if (!$scope.user) {
                $scope.user = $rootScope.user;
            }

            $scope.$on('update.agency.integration.settings', function($event, data) {
                $scope.user = $rootScope.user;
                $scope.partner = $scope.user.exportType.partner_code;
                $scope.partner_name = $scope.user.exportType.partner_name;
            });

            $scope.filepath = '';
            $scope.hsfilepath = '';
            $scope.enableGreenbox = $scope.user.greenbox_enabledStatus;
            $scope.partner = $scope.user.exportType.partner_code;
            $scope.partner_name = $scope.user.exportType.partner_name;

            if (!$scope.user.greenbox_inboxFP && $scope.user.domain.integration_settings
                .inbox_path) {
                $scope.filepath = $scope.user.domain.integration_settings.inbox_path;
                $rootScope.user.greenbox_inboxFP = $scope.user.domain.integration_settings
                    .inbox_path;
            } else {
                $scope.filepath = $scope.user.greenbox_inboxFP;
            }

            if (!$scope.user.greenbox_hsFP && $scope.user.domain.integration_settings.cms_path) {
                $scope.hsfilepath = $scope.user.domain.integration_settings.cms_path;
                $rootScope.user.greenbox_hsFP = $scope.user.domain.integration_settings
                    .cms_path;
            } else {
                $scope.hsfilepath = $scope.user.greenbox_hsFP;
            }

            $rootScope.$on('inbox.path.change', function($event, data) {
                if (!$rootScope.user.greenbox_inboxFP) {
                    $rootScope.user.greenbox_inboxFP = data;
                    $scope.filepath = data;
                }
            });

            $rootScope.$on('cms.path.change', function($event, data) {
                if (!$rootScope.user.greenbox_hsFP) {
                    $rootScope.user.greenbox_hsFP = data;
                    $scope.hsfilepath = data;
                }
            });

            $scope.loginLogout = function(token) {
                if (token != '') {
                    token = $rootScope.userToken;
                }

                var data = {
                    token: token,
                    user_ext: $scope.user.user_ext,
                    domain_uuid: $scope.user.domain_uuid,
                    domain_name: $scope.user.domain.domain_name,
                    user_uuid: $scope.user.user_uuid,
                    screenshot_frequency: $scope.user.tk_screenshot_freq,
                    esl_password: '',
                    inbox_file_path: {
                        path: $scope.filepath,
                        status: ''
                    },
                    hs_file_path: {
                        path: $scope.hsfilepath,
                        status: ''
                    },
                    popupAfterAnswer: ($scope.user.popupAfterAnswer && $scope.user.popupAfterAnswer == 'true') ? 'true' : null,
                    openScreenPop: ($scope.user.openScreenPop && $scope.user.openScreenPop == 'true') ? 'true' : null,
                    screenPopPartner: ($scope.user.screenPopPartner && $scope.user.screenPopPartner == 'true') ? 'true' : null,
                    partner_code: $scope.user.exportType.partner_code
                }

                $scope.json = angular.toJson(data);

                greenboxService.loginLogoutGB($scope.json);
            }

            $scope.refresh = function() {
                $scope.loginLogout('');

                $timeout(function() {
                    logingreenbox('token');
                }, 1000);
            }

            function logingreenbox(param) {
                $scope.loginLogout(param);
            }

            function logingreenboxFP(param) {
                greenboxService.saveFP(param);
            }

            $scope.submitFilePath = function(filepath, name) {
                if (name == 'InboxFilePath') {
                    $scope.filepath = filepath;
                } else {
                    $scope.hsfilepath = filepath;
                }
                var data = {
                    token: '',
                    user_ext: $scope.user.user_ext,
                    domain_uuid: $scope.user.domain_uuid,
                    domain_name: $scope.user.domain.domain_name,
                    user_uuid: $scope.user.user_uuid,
                    screenshot_frequency: $scope.user.tk_screenshot_freq,
                    esl_password: '',
                    inbox_file_path: {
                        path: $scope.filepath,
                        status: ''
                    },
                    hs_file_path: {
                        path: $scope.hsfilepath,
                        status: ''
                    },
                    popupAfterAnswer: ($scope.user.popupAfterAnswer && $scope.user.popupAfterAnswer == 'true') ? 'true' : null,
                    openScreenPop: ($scope.user.openScreenPop && $scope.user.openScreenPop == 'true') ? 'true' : null,
                    screenPopPartner: ($scope.user.screenPopPartner && $scope.user.screenPopPartner == 'true') ? 'true' : null,
                    partner_code: $scope.user.exportType.partner_code
                }

                $scope.json = angular.toJson(data);

                greenboxService.saveFP($scope.json);

                data.token = $rootScope.userToken;

                $scope.json = angular.toJson(data);

                $timeout(function() {
                    logingreenboxFP($scope.json);
                }, 1000);

                var data2 = {
                    integration_name: name,
                    integration_value: filepath,
                    user_uuid: $scope.user.user_uuid,
                    domain_uuid: $scope.user.domain_uuid
                };

                dataFactory.updateFilePath(data2)
                    .then(function(response) {
                        if (response.data.success) {
                            if (response.data.success.data.integration_name ==
                                'InboxFilePath') {
                                $scope.user.greenbox_inboxFP = response.data
                                    .success.data.integration_value;
                            } else {
                                $scope.user.greenbox_hsFP = response.data.success
                                    .data.integration_value;
                            }

                        }
                    });
            }

            $rootScope.$on('error.from.server', function($event) {
                $scope.enableGreenbox = 'false';
                $scope.disableGreenbox();
            });

            $scope.disableGreenbox = function() {
                var data = {
                    integration_name: 'IntegrationStatus',
                    integration_value: 'false',
                    user_uuid: $scope.user.user_uuid,
                    domain_uuid: $scope.user.domain_uuid
                }
                dataFactory.updateGreenboxStatus(data)
                    .then(function(response) {
                        $rootScope.user.greenbox_enabledStatus = response.data.success
                            .data.integration_value;
                    });
            }

            $scope.updateUserNamePass = function(username, pass) {
                if (!username || !pass) {
                    return $rootScope.showAlert(
                        'Username or Password cannot be empty.');
                }

                if (username) {
                    $scope.updateGreenbox('UserName', username);
                }
                if (pass) {
                    $scope.updateGreenbox('Password', pass);
                }
            };

            function processIntegrationUpdate(name, value) {
                var data = {
                    integration_name: name,
                    integration_value: value,
                    user_uuid: $scope.user.user_uuid,
                    domain_uuid: $scope.user.domain_uuid
                };
                dataFactory.updateGreenboxStatus(data)
                    .then(function(response) {
                        if (name == 'CopyExportToClipboard') {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.user.copyExportToClipboard = response.data.success.data.integration_value;
                                if ($scope.user.copyExportToFile) delete $scope.user.copyExportToFile;
                            }
                        } else if (name == 'CopyExportToFile') {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.user.copyExportToFile = response.data.success.data.integration_value;
                                if ($scope.user.copyExportToClipboard) delete $scope.user.copyExportToClipboard;
                            }
                        } else if (name == 'automaticExports') {
                            $rootScope.showalerts(response);
                            $scope.user.automaticExports = response.data.success.data.integration_value;
                            if (response.data.success && $scope.user.automaticExports == 'true' &&
                                (!$scope.user.copyExportToClipboard || $scope.user.copyExportToClipboard === 'false') && 
                                (!$scope.user.copyExportToFile || $scope.user.copyExportToFile === 'false')) {
                                    $scope.user.copyExportToClipboard = 'true';
                                }
                        }
                        if (response.data.success) {
                            if (response.data.success.data.integration_name ==
                                'IntegrationStatus') {
                                $scope.user.greenbox_enabledStatus =
                                    response.data.success.data.integration_value;

                                if ($scope.user.greenbox_enabledStatus ==
                                    'true') {
                                    $scope.loginLogout('token');
                                } else {
                                    $scope.loginLogout('');
                                }
                            } else if (response.data.success.data.integration_name == 'OpenClient') {
                                $scope.user.openClient = response.data.success.data.integration_value;
                                if ($scope.user.openClient == 'true') $scope.user.openClientOnAnswer = 'false';
                            } else if (response.data.success.data.integration_name == 'OpenClientOnAnswer') {
                                $scope.user.openClientOnAnswer = response.data.success.data.integration_value;
                                if ($scope.user.openClientOnAnswer == 'true') $scope.user.openClient = 'false';
                            } else if (response.data.success.data.integration_name ==
                                'EmpCode') {
                                $scope.user.shortName = null;
                                $scope.user.empCode = response.data.success
                                    .data.integration_value;
                                $rootScope.showalerts(response);
                            } else if (response.data.success.data.integration_name ==
                                'ShortName') {
                                $scope.user.empCode = null;
                                $scope.user.shortName = response.data.success
                                    .data.integration_value;
                                $rootScope.showalerts(response);
                            } else if (response.data.success.data.integration_name ==
                                'UserName') {
                                $scope.user.integrations.userName =
                                    response.data.success.data.integration_value;
                                $rootScope.showalerts(response);
                            } else if (response.data.success.data.integration_name ==
                                'Password') {
                                $scope.user.integrations.password =
                                    response.data.success.data.integration_value;
                            }
                        }
                    });
            }

            $scope.updateGreenbox = function(name, value) {
                if ((name === 'OpenClient' || name === 'OpenClientOnAnswer') && value === 'true' && ($scope.user.openScreenPop == 'true' || $scope.user.popupAfterAnswer == 'true')) {
                    var message = 'Screenpops are already enabled in your screenpop settings. Enabling Open Client at the same time will fire two windows. If you wish to disable Screenpop and use Open Client instead then click Confirm below.';
                    var confirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(message)
                        .ariaLabel('Confirm')
                        .ok('Confirm')
                        .cancel('Never Mind');
                    $mdDialog.show(confirm).then(function() {
                        processIntegrationUpdate(name, value);
                        $scope.user.openScreenPop = 'false';
                        $scope.user.popupAfterAnswer = 'false';
                    }, function(){
                        $scope.user.openClient = 'false';
                    });
                } else if ((name === 'OpenScreenPop' || name === 'popupAfterAnswer') && value === 'true' && ($scope.user.openClient == 'true' || $scope.user.openClientOnAnswer == 'true')) {
                    var message = 'Open Client is already enabled in your integration settings. Enabling Screenpops at the same time will fire two windows. If you wish to disable Open Client and use Screenpops instead please click Confirm below.';
                    var confirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(message)
                        .ariaLabel('Confirm')
                        .ok('Confirm')
                        .cancel('Never Mind');
                    $mdDialog.show(confirm).then(function() {
                        processIntegrationUpdate(name, value);
                    }, function(){
                        $scope.user.openClient = 'false';
                        $scope.user.openScreenPop = 'false';
                        $scope.user.popupAfterAnswer = 'false';
                    });
                } else {
                    processIntegrationUpdate(name, value);
                }
            };

            $scope.toggleShortName = function() {
                $scope.showShortName = !$scope.showShortName;
            };

        }
    };
});