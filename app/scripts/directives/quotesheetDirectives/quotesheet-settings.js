'use strict';

proySymphony.directive('companySetupQuotesheetSettings', function($rootScope, quoteSheetService,
    dataFactory, userService, newChatService, metaService, _, symphonyConfig) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/company-setup-quotesheet-settings.html',
        scope: {
            domain: '<'
        },
        link: function($scope, element, attributes) {
            $scope.selectedAPIs = [];
            $scope.channelOptions = [];
            $scope.statusOptions = [];
            $scope.loading = false;
            $scope.editable = false;
            $scope.rowToEdit = "";
            $scope.newStatus = {};

            $scope.onescreenBaseUrl = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                symphonyConfig.onescreenUrl);


            function onAfterQSInit() {
                $scope.APIs = [];
                if ($rootScope.user.exportType.partner_code === 'hawksoft') {
                    $scope.APIs.push({
                        rater_name: "Hawksoft",
                        checked: false
                    });
                }
                $scope.statusOptions = quoteSheetService.activeNonGlobalStatuses;
                $scope.selectedAPIs = quoteSheetService.setAPIs;
                $scope.channelOptions = newChatService.publicChannels;
                if (quoteSheetService.defaultChatChannel) {
                    $scope.defaultChatChannel = _.find($scope.channelOptions, function(
                        item) {
                        return item.id == quoteSheetService.defaultChatChannel;
                    });
                }
                init();
            };

            quoteSheetService.registerEventCallback('onAfterInit', onAfterQSInit);

            function init() {
                $scope.statusName = "";
                $scope.statusDescription = "";
                $scope.APIs.forEach(function(item) {
                    _.find($scope.selectedAPIs, function(api) {
                        if (api.rater_name == item.rater_name) {
                            item.rater_id = api.rater_id;
                            item.logo_url = api.logo_url;
                            item.checked = true;
                        }
                    });
                });
            };

            $scope.addStatus = function() {
                var request = {
                    "quote_sheet_status": {
                        "quote_sheet_status_name": $scope.statusName,
                        "description": $scope.statusDescription
                    }
                };
                quoteSheetService.createStatus(request).then(function(response) {
                    $scope.statusOptions = quoteSheetService.activeNonGlobalStatuses;
                    $rootScope.showSuccessAlert(
                        'Status successfully created.');
                });
                $scope.statusForm.$setUntouched();
                $scope.statusForm.$setPristine();
                $scope.statusName = '';
                $scope.statusDescription = '';
            };


            $scope.addSelected = function(selected) {
                if (selected.checked) {
                    var index = _.findIndex($scope.selectedAPIs, function(item) {
                        return item.rater_name == selected.rater_name;
                    });
                    $scope.selectedAPIs.splice(index, 1);
                    selected.checked = false;
                } else {
                    selected.checked = true;
                    $scope.selectedAPIs.push(selected);
                }
            };

            $scope.setDefaultChannel = function(selected) {
                $scope.defaultChatChannel = selected;
            };



            $scope.updateSettings = function() {
                var api_request = {
                    "quote_sheet_apis": []
                };
                $scope.selectedAPIs.forEach(function(element) {
                    var obj = {
                        "name": element.rater_name
                    };
                    api_request['quote_sheet_apis'].push(obj);
                });
                var channel_request = {
                    "domain_setting_name": "default_chat_channel",
                    "domain_setting_value": $scope.defaultChatChannel.id
                };
                quoteSheetService.postQuoteSheetApis(api_request).then(function(
                    response) {
                    if (response.error) {
                        var message = response.error.message;
                        if (__env.enableDebug) console.log(message);
                        $rootScope.showErrorAlert(message[0]);
                    } else {
                        quoteSheetService.postUpdateDefaultChannel(
                            channel_request).then(function(response) {
                            if (response.error) {
                                var message = response.error.message;
                                if (__env.enableDebug) console.log(
                                    message);
                                $rootScope.showErrorAlert(message[0]);
                            } else {
                                $rootScope.showSuccessAlert(
                                    'Settings successfully updated.'
                                );
                            }
                        });
                    }
                });
            };

            $scope.toggle = function(status) {
                if ($scope.editable) {
                    $scope.editable = false;
                    $scope.rowToEdit = status.quote_sheet_status_uuid;
                } else {
                    $scope.editable = true;
                    $scope.rowToEdit = status.quote_sheet_status_uuid;
                }
                $scope.editableStatus = {
                    uuid: status.quote_sheet_status_uuid,
                    name: status.quote_sheet_status_name,
                    description: status.description
                };
            };

            $scope.updateStatus = function() {
                var status = {
                    "quote_sheet_status": {
                        "quote_sheet_status_uuid": $scope.editableStatus.uuid,
                        "quote_sheet_status_name": $scope.editableStatus.name,
                        "description": $scope.editableStatus.description
                    }
                };
                quoteSheetService.updateStatus(status).then(function(response) {
                    if (response.error) {
                        var message = response.error.message;
                        if (__env.enableDebug) console.log(message);
                        $rootScope.showErrorAlert(message[0]);
                    } else {
                        $rootScope.showSuccessAlert(
                            'Status successfully updated.');
                    }
                    $scope.editable = false;
                    $scope.rowToEdit = "";
                });
                $scope.editable = false;
                $scope.rowToEdit = '';
                $scope.editableStatus = {
                    uuid: '',
                    name: '',
                    description: ''
                };
            };

            $scope.deleteStatus = function(status) {
                $rootScope.confirmDialog('Delete Quote Status',
                    'Are you sure you want to delete this status?').then(
                    function(result) {
                        if (result) {
                            quoteSheetService.deleteQuoteSheetStatus(status).then(
                                function(response) {
                                    if (response.error) {
                                        var message = response.error.message;
                                        if (__env.enableDebug) console.log(
                                            message);
                                        $rootScope.showErrorAlert(message[0]);
                                    } else {
                                        $scope.statusOptions =
                                            quoteSheetService.activeNonGlobalStatuses;
                                        $rootScope.showSuccessAlert(
                                            'Status successfully removed.'
                                        );
                                    }
                                });
                        }
                    });
            };

        }
    };
});
