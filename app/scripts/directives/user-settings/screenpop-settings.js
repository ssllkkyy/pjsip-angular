'use strict';

proySymphony.directive('screenpopSettings', function($rootScope, dataFactory, metaService, $websocket,
    greenboxService, $interval, $timeout, $mdDialog) {
    return {
        restrict: 'E',
        templateUrl: 'views/settings/screenpop-settings.html',
        scope: {
            user: '<'
        },
        link: function($scope, element, attrs) {

            if (!$scope.user) {
                $scope.user = $rootScope.user;
            }
            console.log($scope.user);

            $scope.screenpop = {
                selectedOptions: {}
            };

            if ($scope.user.customScreenpopFields && $scope.user.customScreenpopFields.length > 0) {
                angular.forEach($scope.user.customScreenpopFields, function(option){
                    $scope.screenpop.selectedOptions[option] = 'true';
                });
            }

            $scope.selectedOptions = {};
            $scope.availableFields = {
                info: [
                    { name: 'contact_name_full', title: 'Full Name' },
                    { name: 'contact_email_address', title: 'Email Address' },
                    { name: 'contact_profile_image', title: 'Image / Avatar' },
                    { name: 'contact_address', title: 'Address' },
                    { name: 'contact_city', title: 'City' },
                    { name: 'contact_state', title: 'State' },
                    { name: 'contact_zip_code', title: 'Zip' },
                    { name: 'contact_dob', title: 'Birthday' },
                    { name: 'customer_id', title: 'Customer ID' },
                    { name: 'contact_note', title: 'Notes' },
                    { name: 'contact_mobile_phone', title: 'Mobile Phone' },
                    { name: 'contact_work_phone', title: 'Work Phone' },
                    { name: 'contact_home_phone', title: 'Home Phone' },
                    { name: 'contact_fax_number', title: 'Fax Number' }
                    ],
                policy: [
                    { name: 'policy_csr_info', title: 'Policy CSR' },
                    { name: 'policy_number', title: 'Policy Number' },
                    { name: 'policy_type', title: 'Policy Type' },
                    { name: 'policy_effective_date', title: 'Policy Effective Date' },
                    { name: 'policy_expiry_date', title: 'Policy Expiry Date' }
                ]
            };

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

            function processIntegrationUpdate(name, value) {
                var data = {
                    integration_name: name,
                    integration_value: value,
                    user_uuid: $scope.user.user_uuid,
                    domain_uuid: $scope.user.domain_uuid
                };
                dataFactory.updateGreenboxStatus(data)
                    .then(function(response) {
                        if (name == 'OpenScreenPop') {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.user.openScreenPop = response.data.success.data.integration_value;
                                if ($scope.user.popupAfterAnswer) delete $scope.user.popupAfterAnswer;
                                
                                // if ($scope.user.screenpopSource !== 'contacts' || $scope.user.screenpopSource !== $scope.partner) {
                                //     $scope.updateGreenbox('ScreenpopSource', 'contacts');
                                // }
                            }
                        } else if (name == 'popupAfterAnswer') {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.user.popupAfterAnswer = response.data.success.data.integration_value;
                                if ($scope.user.openScreenPop) delete $scope.user.openScreenPop;
                                // if ($scope.user.screenpopSource !== 'contacts' || $scope.user.screenpopSource !== $scope.partner) {
                                //     $scope.updateGreenbox('ScreenpopSource', 'contacts');
                                // }
                            }
                        } else if (name == 'screenPopBridge' || name == 'screenPopPartner') {
                            $rootScope.showalerts(response);
                        } else if (name == 'UseCustomScreenpopFields' && response.data.success) {
                            $scope.user.useCustomScreenpopFields = value;
                        }
                        if (name === 'OpenScreenPop' || name == 'popupAfterAnswer') {
                            $scope.user[name] = response.data.success.data.integration_value;
                            
                            if (value === 'true' && !$scope.user.screenPopBridge && !$scope.user.screenPopPartner) {
                                $scope.user.screenPopBridge = 'true';
                            }
                        }
                        if ($scope.partner === 'hawksoft') {
                            $scope.refresh();
                        }
                    });
            }

            $scope.updateGreenbox = function(name, value) {
                if ((name === 'OpenScreenPop' || name === 'popupAfterAnswer') && value === 'true' && $scope.user.openClient == 'true') {
                    var message = 'Open Client is already enabled in your integration settings. Enabling Screenpops at the same time will fire two windows. If you wish to disable Open Client and use Screenpops instead please click Confirm below.';
                    var confirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(message)
                        .ariaLabel('Confirm')
                        .ok('Confirm')
                        .cancel('Never Mind');
                    $mdDialog.show(confirm).then(function() {
                        processIntegrationUpdate(name, value);
                        $scope.user.openClient = 'false';
                    }, function(){
                        $scope.user.openScreenPop = 'false';
                        $scope.user.popupAfterAnswer = 'false';
                    });
                } else {
                    processIntegrationUpdate(name, value);
                }
            };

            $scope.optionSelected = function(option) {
                if (!$scope.user.customScreenpopFields) $scope.user.customScreenpopFields = [];
                return $scope.user.customScreenpopFields.indexOf(option) > -1;
            };

            $scope.toggleOption = function(option) {
                if (!$scope.user.customScreenpopFields) $scope.user.customScreenpopFields = [];
                var index = $scope.user.customScreenpopFields.indexOf(option);
                if (index === -1) {
                    $scope.user.customScreenpopFields.push(option);
                } else {
                    $scope.user.customScreenpopFields.splice(index, 1);
                }
            };

            $scope.updateCustomOptions = function() {
                var fields = [];
                angular.forEach($scope.screenpop.selectedOptions, function(value, option){
                    if (value === 'true') fields.push(option);
                });
                var data = {
                    user_uuid: $scope.user.user_uuid,
                    fields: fields
                };
                dataFactory.postUpdateScreenpopFields(data)
                .then(function(response){
                    $rootScope.showalerts(response);
                    if (response.data.success) $scope.user.customScreenpopFields = fields;
                });
            };

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

        }
    };
});