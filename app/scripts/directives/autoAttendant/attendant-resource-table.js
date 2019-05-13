'use strict';

proySymphony.directive("attendantResourceTable", function(autoAttendantService, locationService) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant-reflow/attendant-resource-table.html",
        transclude: {
            "tableBodyFooter": "?tableBodyFooter"
        },
        scope: {
            selectedAction: "<",
            handleAction: "&",
            showHandleAction: "&?",
            createNewResource: "&?",
            editResource: "&?",
            removeAction: "&?",
            resourceTableInfo: "<",
            asResourceEdit: "<",
            tableOnly: "<",
            alterResources: "&?",
            handleActionMessage: "&?",
            actionTable: "<?",
            registerNewResourceTrigger: "&?",
            cancelTable: "&?"
        },
        link: function($scope, element, attributes) {

            $scope.registerNewResourceTrigger &&
                $scope.$evalAsync(function() {
                    $scope.registerNewResourceTrigger({
                        trigger: newResourceTrigger
                    });
                });

            var aas = autoAttendantService;
            var resourceTableInfo, resourceInfo, columns, sortingOpts, tableControls,
                customActionHandlerClass;

            $scope.init = function() {
                $scope.loadingResources = false;
                $scope.isOverviewTable = !$scope.selectedAction && $scope.resourceTableInfo;
                if (!$scope.selectedAction && $scope.resourceTableInfo) {
                    resourceTableInfo = $scope.resourceTableInfo;
                } else if ($scope.selectedAction && $scope.selectedAction.resourceInfoFn) {
                    resourceTableInfo = $scope.selectedAction.resourceInfoFn();
                }
                $scope.hasTableInfo = Boolean(resourceTableInfo);
                if ($scope.hasTableInfo) {
                    resourceInfo = resourceTableInfo.resourceInfo;
                    columns = resourceInfo.columns;
                    sortingOpts = resourceInfo.sortingOpts;
                    customActionHandlerClass = resourceInfo.customActionHandlerClass;
                    $scope.tableOpts = resourceInfo.tableOpts;
                    var resourceName = resourceInfo.resourceName;
                    $scope.resourceName = resourceInfo.resourceName;

                    var handleActionFnInfo = {
                        fn: function(resource) {
                            $scope.handleAction({
                                resource: resource
                            });
                        },
                        class: customActionHandlerClass ||
                            "fa fa-calendar-plus-o add-action-btn mainopt",
                        tooltip: function(resource) {
                            if ($scope.handleActionMessage) {
                                if (typeof($scope.handleActionMessage) === "function") {
                                    return $scope.handleActionMessage({
                                        resource: resource
                                    });
                                } else {
                                    return $scope.handleActionMessage;
                                }
                            }
                            return getActionAddMessage(resourceName);
                        },
                        isActionHandler: true,
                        show: $scope.showHandleAction && function(resource, scopeFns, actionFnInfo) {
                            return $scope.showHandleAction({
                                resource: resource
                            });
                        }
                    };
                    $scope.handleActionClass = handleActionFnInfo.class;
                    handleActionFnInfo = [handleActionFnInfo];

                    if ($scope.selectedAction) {
                        $scope.actionFns = handleActionFnInfo.concat(
                            resourceTableInfo.actionFns);
                    } else {
                        $scope.actionFns = handleActionFnInfo.concat(
                            resourceTableInfo.actionFns);
                    }

                    $scope.getColumnData = resourceInfo.getColumnData;
                    if (resourceTableInfo.resourceTargetName) {
                        registerResources(resourceTableInfo.resourceTargetName);
                    } else {
                        assignResources(resourceTableInfo.resources);
                    }
                    var headerColumns = columns.concat([{
                        name: "actions",
                        text: "",
                        className: "actions"
                    }]).map(alterColumnProp("className", function(className) {
                        return resourceInfo.prefix + className;
                    }));
                    $scope.columns = headerColumns.map(
                        alterColumnProp("className", function(className) {
                            return className + "-col";
                        })
                    );
                    tableControls = {
                        columnNames: headerColumns,
                        attendants: [{}],
                        currentPage: {
                            page: 1
                        },
                        sortingOpts: sortingOpts
                    };
                    $scope.tableControls = tableControls;
                }
                $scope.scopeFns = {
                    createNewResource: $scope.createNewResource && function(
                        resource) {
                        $scope.createNewResource({
                            resource: resource
                        });
                    },
                    editResource: $scope.editResource &&
                        function(resource) {
                            $scope.editResource({
                                resource: resource
                            });
                        },
                    removeAction: $scope.removeResource && function(resource) {
                        $scope.removeAction({
                            resource: resource
                        });
                    },
                };
            };

            $scope.displayTooltip = function(tooltip, resource) {
                if (typeof(tooltip) === "function") {
                    return tooltip(resource);
                } else {
                    return tooltip;
                }
            };

            $scope.displayClass = function(classVal, resource) {
                if (typeof(classVal) === "function") {
                    return classVal(resource);
                } else {
                    return classVal;
                }
            };

            $scope.noResourceMessage = function() {
                if ($scope.isOverviewTable) {
                    return "Try adding actions to the schedule to see them listed here.";
                } else {
                    return "You have not created any " + $scope.resourceName +
                        "s yet.";
                }
            };

            function newResourceTrigger(newAction, tableInfo, override) {
                if (!$scope.resourceTableInfo || override) {
                    $scope.resourceTableInfo = tableInfo;
                    $scope.selectedAction = newAction;
                    $scope.init();
                }
            };

            function alterColumnProp(prop, alterFn) {
                return function(column) {
                    var colClone = {};
                    angular.copy(column, colClone);
                    colClone[prop] = alterFn(column[prop]);
                    return colClone;
                };
            };

            function getActionAddMessage(resourceName) {
                var name = resourceName.toLowerCase() === "ivr" ?
                    resourceName.toUpperCase() : resourceName.toLowerCase();
                if ($scope.asResourceEdit) {
                    return "Replace the " + name + " with this one.";
                } else {
                    if (name === 'action') {
                        return "Update the Call Flow schedule for this action.";
                    } else {
                        return "Add this " + name + " to Call Flow schedule.";
                    }
                }
            };

            function registerResources(resourceTargetName) {
                var resourceDepSpec = {
                    scope: $scope,
                    targetName: resourceTargetName,
                    attachName: "resources"
                };
                if ($scope.alterResources) {
                    resourceDepSpec.onAfterRefresh = function() {
                        $scope.resources = $scope.alterResources({
                            resources: $scope.resources
                        });
                    };
                }
                aas.registerResourceDependencies([resourceDepSpec]);
            };

            function assignResources(resources) {
                $scope.resources = $scope.alterResources ?
                    $scope.alterResources({
                        resources: resources
                    }) :
                    resources;
            }

            $scope.init();
        }
    };
});
