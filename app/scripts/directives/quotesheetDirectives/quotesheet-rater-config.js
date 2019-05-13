'use strict';

proySymphony.directive('quotesheetRaterConfig', function($window, $rootScope, quoteSheetService,
    $timeout, resourceFrameworkService, userService) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/quotesheet-rater-config.html',
        scope: {
            setEditingQuote: '&'
        },
        link: function($scope, element, attributes) {

            $scope.tableControls = {
                columnNames: [{
                        name: 'template_field',
                        text: 'Template Field',
                        className: 'template-field-col'
                    },
                    {
                        name: 'rater_field',
                        text: 'Rater Field',
                        className: 'rater-field-col'
                    }
                ],
                raterFields: {}
            };
            $scope.loading = false;
            $scope.selectedRater = {};
            $scope.selectedTemplate = {};
            $scope.fieldsToUpdate = {};
            $scope.raters = {};
            $scope.templateTypes = ["Auto", "Commercial", "Home"];
            $scope.searchField = "";

            function onAfterQSInit() {
                var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                    service: quoteSheetService,
                    scope: $scope
                });
                angular.copy(quoteSheetService.raters, $scope.raters);
                refreshRegisterFn({
                    resourceName: 'templates',
                    scopeResourceName: 'templateOptions',
                    serviceResourceName: 'activeTemplates'
                });
            };

            quoteSheetService.registerEventCallback('onAfterInit', onAfterQSInit);

            $scope.thereIsRater = function() {
                if ($scope.selectedRater.rater_id) {
                    return true;
                } else {
                    return false;
                }
            };

            $scope.getTemplateQuestions = function(template) {
                if ($scope.selectedRater) {
                    $scope.collapseIsLoading = true;
                }
                quoteSheetService.getTemplateFields(template.quote_sheet_template_uuid)
                    .then(function(response) {
                        if (response.error) {
                            var message = response.error.message;
                            if (__env.enableDebug) console.log(message);
                            $rootScope.showErrorAlert(message[0]);
                        } else {
                            $scope.templateQuestions = response.success.data;
                        }
                        $timeout(function() {
                            $scope.collapseIsLoading = false;
                        });
                    });
            };

            $scope.getQuestionItemText = function(question) {
                if (question.label) {
                    return question.label;
                } else if (question.placeholder) {
                    return question.placeholder;
                }
                return null;
            };

            $scope.loadRaterFields = function(type) {
                $scope.collapseIsLoading = true;
                $scope.loading = true;
                var templateUuid = $scope.selectedTemplate.quote_sheet_template_uuid;
                var raterId = $scope.selectedRater.id;
                var raterName = $scope.selectedRater.rater_name;
                quoteSheetService.getQuoteSheetRaterFields(templateUuid, raterId)
                    .then(function(response) {
                        if (response.error) {
                            quoteSheetService.getQuoteSheetRaterEmptyFields(
                                    raterName)
                                .then(function(response) {
                                    if (response.error) {
                                        var message = response.error.message;
                                        if (__env.enableDebug) console.log(
                                            message);
                                        $rootScope.showErrorAlert(message[0]);
                                    } else {
                                        $scope.$evalAsync(function() {
                                            $scope.tableControls.raterFields =
                                                response.success.data;
                                        });
                                        $scope.loading = false;
                                    }
                                    $timeout(function() {
                                        $scope.collapseIsLoading =
                                            false;
                                    });
                                });
                        } else {
                            $scope.$evalAsync(function() {
                                $scope.tableControls.raterFields =
                                    response.success.data;
                            });
                            $scope.loading = false;
                            $timeout(function() {
                                $scope.collapseIsLoading = false;
                            });
                        }
                    });
            };

            $scope.canSave = function() {
                return $scope.tableControls.raterFields &&
                    $scope.tableControls.raterFields.fields &&
                    $scope.selectedTemplate &&
                    $scope.selectedTemplate.quote_sheet_template_uuid;
            };

            $scope.saveExportSettings = function() {
                var title = 'Save Settings';
                var message = 'Are you sure you want to save these fields? ';
                $rootScope.confirmDialog(title, message).then(function(result) {
                    if (result) {
                        var data = $scope.tableControls.raterFields;
                        var templateUuid = $scope.selectedTemplate.quote_sheet_template_uuid;
                        data.quote_sheet_template_uuid = templateUuid;
                        data.global = data.global || false;
                        data.type = "noType";
                        data.rater_id = $scope.selectedRater.id;
                        $scope.isKotterTech = userService.isKotterTechOrGreater();
                        if (!$scope.isKotterTech && data.global) {
                            delete data.quote_sheet_rater_uuid;
                            data.global = false;
                        }
                        quoteSheetService.postQuoteSheetRater(data).then(
                            function(response) {
                                if (response.error) {
                                    var message = response.error.message;
                                    if (__env.enableDebug) console.log(
                                        message);
                                    $rootScope.showErrorAlert(message[0]);
                                } else {
                                    $rootScope.showSuccessAlert(
                                        'Quote Sheet Rater successfully saved.'
                                    );
                                    clearSelectedFilters();
                                }
                            });
                    }
                });
            };

            $scope.raterFieldsLength = function() {
                return Object.keys($scope.tableControls.raterFields).length;
            };

            function clearSelectedFilters() {
                $scope.selectedTemplate = {};
                $scope.selectedRater = {};
                $scope.tableControls.raterFields = {};
            };

            $window.raterScope = $scope;
        }
    };
});
