"use strict";

proySymphony.directive("autoAttendant", function(__env, $rootScope, symphonyConfig, dataFactory, metaService, usefulTools, billingService, $mdDialog, userService, $location, autoAttendantService, routeService) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/auto-attendant.html",
        scope: {
            registerTemplateChangeCallback: "&"
        },
        link: function($scope, element, attributes) {
            autoAttendantService.init();
            $scope.domain = $rootScope.user.domain;

            var stateMachine = new metaService.stateMachine();
            stateMachine.createStates([{
                stateName: "manage-table",
                possibleStates: ["attendant-edit"]
            }, {
                stateName: "attendant-edit",
                possibleStates: ["manage-table"]
            }]);
            stateMachine.setActiveState("manage-table");

            $scope.currentStateIs = stateMachine.currentStateIs;

            $scope.goToManageTable = attendantTransition("manage-table");

            $scope.createAutoAttendant = function() {
                attendantTransition("attendant-edit")();
            };

            $scope.editAutoAttendant = function(attendant) {
                attendantTransition("attendant-edit")(attendant);
            };

            $scope.toggleVoicemail = function() {
                billingService.toggleVoicemail($scope.domain.domain_uuid)
                .then(function(response){
                    $rootScope.showalerts(response);
                });
            };

            $scope.registerCallbacks = function(save, shouldPromptOnCancel) {
                $scope.saveAndQuit = function() {
                    if (save) {
                        var result = save();
                        if (result && result.then) {
                            result.then(function(response) {
                                if (response !== false) {
                                    $scope.quitWithoutSaving(null, true);
                                }
                            });
                        } else if (result !== false) {
                            $scope.quitWithoutSaving(null, true);
                        }
                    } else {
                        $scope.quitWithoutSaving(null, true);
                    }
                };
                $scope.quitWithoutSaving = function(attendant, skipPrompt) {
                    (shouldPromptOnCancel && shouldPromptOnCancel() && !
                        skipPrompt) ?
                    promptForCallFlowLeave($scope.goToManageTable):
                        $scope.goToManageTable();
                };
            };

            function attendantTransition(stateName) {
                return function(attendant) {
                    $scope.editingAttendant = attendant;
                    stateMachine.transitionState(stateName);
                };
            };

            function promptForCallFlowLeave(onConfirm) {
                var attendant = $scope.editingAttendant;
                var title = attendant ? " " + attendant.description : "";
                var content = "Are you sure you want to cancel " +
                    "editing" + title + "? You will lose any unsaved changes if you " +
                    "do.";
                var confirmDelete = $mdDialog.confirm()
                    .title(title)
                    .textContent(content)
                    .ariaLabel("Cancel")
                    .ok("Yes")
                    .cancel("Never Mind");
                return $mdDialog.show(confirmDelete).then(onConfirm);
            };

            routeService.registerRouteChangeCallback(
                "routeChangeStart",
                "before",
                handleLocationChangeStartEvent
            );

            $scope.deregisterTemplateChangeCallback =
                $scope.registerTemplateChangeCallback({
                    type: "away",
                    callback: onTemplateChange
                });

            $scope.$on("$destroy", function() {
                routeService.deregisterRouteChangeCallback(
                    "routeChangeStart",
                    "before",
                    handleLocationChangeStartEvent
                );
                $scope.deregisterTemplateChangeCallback();
            });

            $scope.isKotterTechOrGreater = function() {
                return userService.isKotterTechOrGreater();
            };

            $scope.isBluewaveAgency = function() {
                return $rootScope.user.isBluewave;
            };

            $scope.showNoGreetings = function() {
                var message = 'This agency has no greetings stored in bicom.';
                $rootScope.showAlert(message);
            };

            $scope.previewCallFlowImportFromBluewave = function() {
                $scope.loadingPreview = true;
                dataFactory.getBlueImportPreview($rootScope.user.domain_uuid)
                    .then(function(response) {
                        console.log(response);
                        if (response.data.success) {
                            $scope.data = {
                                num_recordings: response.data.success.data.num_recordings,
                                callerid: response.data.success.data.callerid,
                                exts: response.data.success.data.exts,
                                rgs: response.data.success.data.rgOpts,
                                ivrs: response.data.success.data.ivrOpts,
                                timeCond: response.data.success.data.timeCond
                            };
                        } else {
                            $rootScope.showalerts(response);
                        }
                        $scope.loadingPreview = false;
                    })
            };
            $scope.getDownloadUrl = function() {
                var onescreen = __env.apiUrl ? __env.apiUrl : symphonyConfig.onescreenUrl;
                return onescreen + '/bluewave/greetings/' + $scope.domain.domain_uuid + '?token=' + $rootScope.userToken;
            };

            $scope.showExts = function() {
                return usefulTools.convertObjectToArray($scope.data.exts);
            };

            $scope.completeImportCallFlow = function() {
                var content = 'Please confirm you would like to initiate the import process. To confirm, this process will permanently purge any existing IVRs and Ring Groups and their associated settings from the Fusion database. It will then import the IVRs and Ring Groups as outlined in this preview. The DIDs listed in this preview will then be mapped to the appropriate extensions. ';
                var confirmImport = $mdDialog.confirm()
                    .title('Confirm Import')
                    .textContent(content)
                    .ariaLabel("Cancel")
                    .ok("Yes")
                    .cancel("Never Mind");
                $mdDialog.show(confirmImport)
                    .then(function() {
                        $scope.importWorking = true;
                        $scope.data.domain_uuid = $rootScope.user.domain_uuid;
                        dataFactory.postProcessBlueImportPreview($scope.data)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                console.log(response);
                                $scope.importWorking = false;
                                $scope.data = null;
                            });
                    });
            };

            $scope.printDiv = function(divName) {
                var printContents = document.getElementById(divName).innerHTML;
                var myWindow = window.open("", "myWindow", "toolbar=yes,scrollbars=yes,resizable=yes,top=10,left=10,width=800,height=600");
                myWindow.document.write('<html><head>');
                myWindow.document.write('<style>');
                myWindow.document.write('table { border: 1px solid #ddd; padding: 0px; width: 100%; font-size: 13px; border-bottom: none; }');
                myWindow.document.write('table thead tr th { text-align: left; font-weight: bold; border-bottom: 1px solid #ddd; }');
                myWindow.document.write('table tbody tr td { vertical-align: top; border-bottom: 1px solid #ddd; padding: 4px; }');
                myWindow.document.write('table.internal-table { font-size: 12px; padding: 3px; }');
                myWindow.document.write('</style>');
                myWindow.document.write('</head><body><div id="printme">');
                myWindow.document.write(printContents);
                myWindow.document.write('</div></body></html>');
                myWindow.print();
            };

            $scope.closeImport = function() {
                $scope.data = null;
            };

            function handleLocationChangeStartEvent(event, onConfirm) {
                if (stateMachine.currentStateIs("attendant-edit") && event.preventDefault) {
                    event.preventDefault();
                    var targetPath = $location.path();
                    var targetSearch = $location.search();
                    var targetHash = $location.hash();
                    return promptForCallFlowLeave(onConfirm);
                }
                return null;
            };

            function onTemplateChange(newTemplate, onConfirm) {
                if (stateMachine.currentStateIs("attendant-edit")) {
                    return promptForCallFlowLeave(onConfirm);
                }
                return null;
            };

        }
    };
});
