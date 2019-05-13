'use strict';

proySymphony.directive('templateManager', function(quoteSheetService, resourceFrameworkService, emailService,
    userService, $rootScope, $window, locationService) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/template-manager.html',
        scope: {
            setEditingTemplate: '&'
        },
        link: function($scope, element, attributes) {
            var qss = quoteSheetService;
            $scope.init = function() {
                qss.registerEventCallback('onAfterInit', function() {
                    $scope.isKotterTech = userService.isKotterTechOrGreater();
                    var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                        service: qss,
                        scope: $scope
                    });
                    var serviceResourceName = $scope.isKotterTech ?
                        'activeTemplatesAtCurrentLocation' :
                        'activeNonGlobalTemplates';
                    refreshRegisterFn({
                        resourceName: 'templates',
                        serviceResourceName: serviceResourceName
                    });
                    $scope.types = [{
                            name: "Personal Line",
                            value: "personal"
                        },
                        {
                            name: "Commercial Line",
                            value: "commercial"
                        }
                    ];

                    if (!$scope.isKotterTech) {
                        refreshRegisterFn({
                            resourceName: 'templates',
                            scopeResourceName: 'globalTemplates',
                            serviceResourceName: 'activeGlobalTemplates'
                        });
                    }
                });
            };

            $scope.toggleGlobalTemplateHide = qss.domainHideTemplateToggle;

            $scope.tableControls = {
                columnNames: {
                    description: {
                        name: 'description',
                        text: 'Template Name',
                        className: 'template-name'
                    },
                    action: {
                        name: 'action',
                        text: 'Action',
                        className: 'action',
                        nonResourceCol: true
                    }
                },
                templates: [],
                filteredTemplates: []
            };

            $scope.filteredTemplatesLength = function() {
                return $scope.tableControls.filteredTemplates.length;
            };

            $scope.deleteTemplate = function(template) {
                var message = 'Are you sure you want to delete the ' +
                    template.description + ' template?';
                var subMessage = 'Any quotes created using it will be preserved.';
                $rootScope.confirmDialog(message, subMessage).then(function(
                    response) {
                    if (response) {
                        qss.deleteTemplate(template);
                    }
                });
            };

            $scope.openCloneModal = function(template) {
                // if ($scope.types.length === 0) {
                //     var message = "You do not have any types and therefore can " +
                //     "not clone this template. Please create some types in the " +
                //     "Type Manager and then try again";
                //     $rootScope.showInfoAlert(message);
                //     return;
                // }
                var templateUrl = 'views/quotesheets/clone-template-prompt.html';
                $scope.templateToClone = template;
                $scope.templateCloneInfo = {};
                $scope.availableLocations = locationService.locationGroups;
                $scope.selectedLocations = {};
                var promptPromise = $rootScope.customPrompt(templateUrl, $scope);
                $scope.resolvePrompt = function() {
                    if (promptPromise) {
                        promptPromise();
                    }
                };
            };

            $scope.showHidden = false;
            $scope.showHiddenTemplates = function (){
                $scope.showHidden = !$scope.showHidden;
            };

            $scope.emailQuoteSheetToTKG = function(){
                var domainName = userService.domainNameForCurrentUser();
                var address = "support@kotter.net";
                var subject = "Quote Sheet Build Request from " + domainName;
                var body = "Please include your agency's Quote Sheet as an attachment to this message." + 
                    " Enter any notes you may wish to include in this space, and where you want the fields to link inside your management system."+
                    " There is a $15 per form charge for this service."+
                    " You can also build your own Template for free using the Template Builder tab.";
                emailService.startEmailClient(address, subject, body);                
            };

            $scope.cloneAllowed = function() {
                function boolKey(key) {
                    return Boolean($scope.selectedLocations[key]);
                }
                return $scope.templateCloneInfo.title && $scope.templateCloneInfo.type &&
                    Object.keys($scope.selectedLocations).filter(boolKey).length >
                    0;
            };

            $scope.cloneTemplate = function(template) {
                function selectedKey(key) {
                    return Boolean($scope.selectedLocations[key]);
                }
                var locationUuids = Object.keys($scope.selectedLocations).filter(
                    selectedKey);

                function requestClone() {
                    var data = {
                        locations_group_uuid: qss.currentLocationUuid,
                        location_uuids: locationUuids,
                        description: $scope.templateCloneInfo.title,
                        questions: template.questions,
                        global: false,
                        type: $scope.templateCloneInfo.type.value,
                        rater_type : template.rater_type,
                    };
                    qss.createTemplate(data).then(function(response) {
                        if (response) {
                            $rootScope.showSuccessAlert('Template cloned');
                        }
                    });
                };
                if (!template.questions) {
                    qss.loadQuestions(template)
                        .then(function(response) {
                            if (response) {
                                requestClone();
                            }
                        });
                } else {
                    requestClone();
                }
            };

            $scope.manageTemplateLocations = function(template) {
                var templateUrl =
                    'views/quotesheets/template-location-manager.html';
                var promptPromise = $rootScope.customPrompt(templateUrl, $scope);
                $scope.availableLocations = locationService.locationGroups;
                $scope.selectedLocations = {};
                if (template.locations) {
                    function setSelectedLocUuid(location) {
                        $scope.selectedLocations[location.locations_group_uuid] =
                            true;
                    }
                    template.locations.forEach(setSelectedLocUuid);
                }
                $scope.saveTemplateLocations = function() {
                    function selectedKey(key) {
                        return Boolean($scope.selectedLocations[key]);
                    }
                    var locationUuids = Object.keys($scope.selectedLocations).filter(
                        selectedKey);
                    qss.postUpdateTemplateLocations({
                        template: template,
                        location_uuids: locationUuids
                    }).then(function(response) {
                        var message =
                            "Template locations successfully updated";
                        $rootScope.showSuccessAlert(message);
                    });
                };
                $scope.resolvePrompt = function() {
                    if (promptPromise) {
                        promptPromise();
                    }
                };
            }

            function assignInitialValsToTemplates(templates) {
                var column = $scope.tableControls.columnNames['description'];
                templates.forEach(function(type) {
                    $scope.assignInitialTypeFieldValue(type, column);
                });
            };

            $window.tempManager = $scope;

            $scope.init();
        }
    };
});
