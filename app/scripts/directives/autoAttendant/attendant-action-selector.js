'use strict';

proySymphony.directive("attendantActionSelector", function(autoAttendantService, $rootScope,
    $window, resourceFrameworkService, $mdDialog) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant-reflow/attendant-action-selector.html",
        scope: {
            callFlowScheduleModel: "<"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;
            var rfs = resourceFrameworkService;
            $scope.actionSelector = true;
            var retrieveResource;

            $scope.init = function() {
                rfs.registerFunctionCollOnScope($scope, aas.getResourceActionFns);
                $scope.selectedActionItem = {};
                $scope.isSelectorEditor = true;
                var trigger = resourceTriggerPipe();
                $scope.registerNewResourceTrigger = trigger;
                $scope.triggerNewResource = trigger;

                aas.registerResourceDependencies([{
                    scope: $scope,
                    targetName: "actionableActions",
                    attachName: "actions"
                }]);
            };

            $scope.addAction = function(resource) {
                var result = attemptActionAddition(resource);
                if (result.error) {
                    $rootScope.showErrorAlert(result.error);
                } else {
                    $scope.onSelectedActionChange($scope.selectedAction);
                }
            };

            $scope.showAddScheduleForResource = function(resource) {
                return $scope.selectedAction && resource &&
                    canAddAction($scope.selectedAction, resource);
            };

            $scope.cancelActionEdit = function() {
                closeActionEditor();
                $scope.editingResource = null;
                $scope.triggerNewResource();
            };

            $scope.cancelActionSelect = function() {
                $scope.editingResource = null;
                $scope.selectedAction = null;
                $scope.triggerNewResource();
            };

            $scope.onSelectedActionChange = function(newAction) {
                $scope.selectedAction = newAction;
                $scope.editingResource = null;
                $scope.selectedActionItem = {
                    action: newAction
                };
                if (newAction) {
                    $scope.triggerNewResource(newAction);
                }
            };

            $scope.registerResourceRetrieve = getRegisterResourceRetrieve();

            $scope.saveResourceAndQuit = function() {
                saveResourceAndQuit(retrieveResource, cancelResourceEdit);
            };

            $scope.editResource = function(resource) {
                $scope.editingResource = resource;
                openActionEditor();
            };

            $scope.createNewResource = function() {
                openActionEditor();
            };

            function cancelResourceEdit(callback) {
                closeActionEditor();
                $scope.editingResource = null;
                if (callback) { callback(); }
            };

            function attemptActionAddition(resource) {
                var action = $scope.selectedAction;
                var result = action.manageableResource && resource ? {
                        resource: resource
                    } :
                    getSimpleActionResource(action, resource);
                var error = result.error;
                if (!error) {
                    resource = result.resource;
                    result = $scope.callFlowScheduleModel.addAction(action, resource);
                    error = result.error;
                }
                return {
                    resource: resource,
                    error: error
                };
            };

            function getSimpleActionResource(action, resource) {
                var error;
                if (!action.isSimpleAction && resource === false) {
                    error = action.noResourceErrorMessage;
                }
                return { error: error, resource: resource };
            };

            function openActionEditor() {
                var pScope = $scope;
                return $mdDialog.show({
                    templateUrl: "views/auto-attendant-reflow/attendant-modal.html",
                    clickOutsideToClose: false,
                    autoWrap: false,
                    controller: ["$scope", function($scope) {
                        var ctrl = {isTopAction: true};
                        var sharedFields = [
                            "selectedAction", "editingResource",
                            "cancelActionEdit"
                        ];

                        function RetrievalFns(state) {
                            var main = this;
                            var fns = [];
                            main.length = fns.length;
                            main.pop = asUpdateFn(function() { return fns.pop(); });
                            main.push = asUpdateFn(function(val) { return fns.push(val); });
                            main.at = function(index) { return fns[index]; };
                            main.logging = false;
                            function asUpdateFn(fn) {
                                return function() {
                                    var result = fn.apply(null, [].slice.call(arguments));
                                    onUpdate();
                                    return result;
                                };
                            };
                            function onUpdate() {
                                state.isTopAction = fns.length === 1;
                                main.length = fns.length;
                                if (main.logging) {
                                    console.log("RETIEVAL FNS LENGTH: ", fns.length);
                                }
                            };
                        };

                        var regResourceRetrieve = getRegisterResourceRetrieve(onResourceRetrieve);
                        var retrievalFns = new RetrievalFns(ctrl);
                        function registerGoBackFn(fn) { ctrl.editorGoBack = fn; };
                        function registerChooseSubActionFn(fn) { ctrl.editorChooseSub = fn; };
                        function onChosenAction() { ctrl.isChoosing = false; };
                        function goBack(cb) {
                            if (!ctrl.isChoosing) {
                                retrievalFns.pop();
                            } else {
                                ctrl.isTopAction = retrievalFns.length === 1;
                            }
                            ctrl.isChoosing = false;
                            ctrl.editorGoBack();
                            if (cb) { cb(); }
                        };

                        function chooseSubAction() {
                            ctrl.editorChooseSub();
                            ctrl.isChoosing = true;
                            ctrl.isTopAction = false;
                        };

                        function onResourceRetrieve(retrievalFn) { retrievalFns.push(retrievalFn); };

                        function saveResource() {
                            var retrievalFn = retrievalFns.at(retrievalFns.length - 1);
                            var cancel = retrievalFns.length === 1 ? cancelResourceEdit : goBack;
                            saveResourceAndQuit(retrievalFn, cancel);
                        };

                        _.merge(ctrl, {
                            regGoBack: registerGoBackFn,
                            regChooseSubAction: registerChooseSubActionFn,
                            goBack: goBack,
                            chooseSubAction: chooseSubAction,
                            onChosenAction: onChosenAction,
                            regResourceRetrieve: regResourceRetrieve,
                            saveResource: saveResource
                        });

                        _.merge(ctrl, _.pick(pScope, sharedFields));
                        $scope.$ctrl = ctrl;
                    }]
                });
            };

            function closeActionEditor() { $mdDialog.hide({}); };

            function resourceTriggerPipe() {
                return (function() {
                    var resourceTrigger;
                    return function() {
                        return resourceTrigger ?
                            resourceTrigger.apply(null, arguments) :
                            (arguments[0] && (resourceTrigger = arguments[0]));
                    };
                })();
            };

            function canAddAction(action, resource) {
                return $scope.callFlowScheduleModel.canAddAction($scope.selectedAction, resource) ===
                    true;
            };

            function saveResourceAndQuit(resourceRetrieve, cancel) {
                if (resourceRetrieve) {
                    $scope.saving = true;
                    var result = resourceRetrieve();
                    if (result && result.then) {
                        result.then(function(response) {
                            if (response !== false) {
                                $scope.saving = false;
                                cancel(response);
                            }
                        });
                    } else if (result !== false) {
                        cancel(result);
                    }
                } else {
                    cancel();
                }
            };

            function getRegisterResourceRetrieve(onRetrieve) {
                return function(fn) { onRetrieve(fn); };
            };
            function onResourceRetrieve(fn) { retrieveResource = fn; };

            $scope.init();
        }
    };
});
