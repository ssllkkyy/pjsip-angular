'use strict';

proySymphony.directive("attendantActionPanel", function(autoAttendantService, $mdDialog, $rootScope) {
    var ctrl;
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant-reflow/attendant-action-panel.html",
        scope: {
            callFlowScheduleModel: "<"
        },
        controller: function() {
            ctrl = this;

            var aas = autoAttendantService;

            ctrl.$postLink = function() {
                ctrl.actionTableInfo = getDefaultManageTableInfo(ctrl.allActions);
            };

            ctrl.chooseCallFlowTimeout = function(option) {
                ctrl.callFlowScheduleModel.defaultAction = option;
            };

            ctrl.onDefaultActionChange = function(newDefault) {
                delete ctrl.callFlowScheduleModel.defaultAction.isDefault;
                ctrl.callFlowScheduleModel.defaultAction = newDefault;
            };

            ctrl.defaultTableActionMessage = function(resource) {
                if (resource.conditionGroups) {
                    return "Edit time conditions for this action";
                } else {
                    return "Set time conditions for this action";
                }
            };

            ctrl.scheduleAction = function(action) {
                ctrl.openActionScheduler(getScheduleCtrl(action));
            };

            function removeGroup(scheduleCtrl, group) {
                _.remove(scheduleCtrl.groups, function(otherGroup) {
                    return otherGroup === group;
                });
            };

            function addGroup(scheduleCtrl) {
                var priority = getNextUnusedPriority(scheduleCtrl);
                var group = getNewGroup(priority);
                scheduleCtrl.groups.push(group);
            };

            function getNextUnusedPriority(scheduleCtrl) {
                var allGroups = getAllGroups(scheduleCtrl.schedulingAction, scheduleCtrl.groups);
                var usedPriorities = allGroups.map(function(group) {
                    return parseInt(group.priority);
                });
                var maxPossiblePriority = ((allGroups.length + 1) * 5) + 1 + 500;
                var possiblePriorities = _.range(505, maxPossiblePriority + 1, 5);
                function isUnusedPriority(priority) {
                    return usedPriorities.indexOf(priority) === -1;
                };
                var p = _.find(possiblePriorities, isUnusedPriority);
                return _.find(possiblePriorities, isUnusedPriority);
            };

            function getScheduleCtrl(action) {
                var conditionTypes = action.conditionTypes;
                var conditionGroups = action.conditionGroups ? action.conditionGroups : [];
                conditionGroups = conditionGroups.map(cloneConditionGroup);
                var scheduleCtrl = {
                    conditionTypes: conditionTypes,
                    groups: conditionGroups,
                    schedulingAction: action,
                    closeActionScheduler: closeActionScheduler,
                    saveActionConditions: saveActionConditions,
                    addGroup: addGroup,
                    removeGroup: removeGroup,
                    getGroupPriorityInt: getGroupPriorityInt
                };
                if (!conditionGroups.length) { addGroup(scheduleCtrl); }
                return scheduleCtrl;
            };

            function getGroupPriorityInt(group) { return parseInt(group.priority); };

            function getAllGroups(schedulingAction, schedulingGroups) {
                var actions = ctrl.allActions.filter(function(action) {
                    return action !== schedulingAction;
                });
                return _.flatten(actions.map(function(action) {
                    return action.conditionGroups ? action.conditionGroups : [];
                })).concat(schedulingGroups);
            };

            function getNewGroup(priority) {
                priority = priority ? priority + "" : "505";
                return {
                    priority: priority,
                    conditions: []
                };
            };

            ctrl.defaultTableActionMessage = function(resource) {
                if (resource.conditionGroups) {
                    return "Edit time conditions for this action";
                } else {
                    return "Set time conditions for this action";
                }
            };

            function saveActionConditions(scheduleCtrl) {
                function groupHasConditions(group) {
                    return group.conditions.length;
                }
                var groups = scheduleCtrl.groups.filter(groupHasConditions);
                var firstGroup = groups[0];
                if (!firstGroup || !firstGroup.conditions.length) {
                    showNoConditionsError();
                } else if (groupsHaveUnfinishedCondition(groups)) {
                    unfinishedConditionsPrompt().then(function(response) {
                        if (response) {
                            removeUnfinishedConditionsFromGroups(groups);
                            saveActionConditions();
                        }
                    });
                } else {
                    scheduleCtrl.schedulingAction.conditionGroups = groups;
                    closeActionScheduler();
                }
            };

            function showNoConditionsError() {
                var message =
                    "Please add at least one condition to your group before saving.";
                $rootScope.showErrorAlert(message, true);
            };

            function closeActionScheduler() {
                $mdDialog.hide({});
            };

            function unfinishedConditionsPrompt() {
                var message = "Your schedule contains some unfinished conditions.";
                var submessage = "Choose yes to discard them and save your IVR, " +
                    "or to continue editing your conditions, choose nevermind.";
                return $rootScope.confirmDialog(message, submessage, true);
            };

            function removeUnfinishedConditionsFromGroups(groups) {
                groups.forEach(function(group) {
                    _.remove(group.conditions, isUnfinishedCondition);
                });
            };

            function isUnfinishedCondition(condition) {
                return !condition.conditionType || !condition.startOpt || !condition.endOpt;
            };

            function groupsHaveUnfinishedCondition(groups) {
                return _.some(groups, function(group) {
                    return _.some(group.conditions, function(condition) {
                        return isUnfinishedCondition(condition);
                    });
                });
            }

            function getDefaultManageTableColumnData(scheduleAction, column) {
                if (column === "actions") { return null; }
                if (scheduleAction.resource && !scheduleAction.display) {
                    // scheduleAction.display = aas.displayTransferOption(
                    //     scheduleAction.resource, scheduleAction.action.name
                    // ).display;
                    return aas.displayTransferOption(
                        scheduleAction.resource, scheduleAction.action.name
                    ).display;
                }
                return scheduleAction.resource ? scheduleAction.display :
                    scheduleAction.label;
            };

            function getDefaultManageTableInfo(resources) {
                var resourceInfo = {
                    resourceName: "Available Call Flow Action",
                    prefix: "act-",
                    columns: [{
                        name: "title",
                        text: "Title",
                        className: "title"
                    }, ],
                    tableOpts: {
                        tableClass: "resource-overview-table"
                    },
                    sortingOpts: {
                        sortableColumns: [],
                        orderBy: "voicemail_id"
                    },
                    getColumnData: getDefaultManageTableColumnData,
                    customActionHandlerClass: function(resource) {
                        var defaultClass = "fa fa-calendar add-action-btn";
                        if (resource.conditionGroups && resource.conditionGroups
                            .length) {
                            return defaultClass + " scheduled-action";
                        }
                        return defaultClass + " mainopt";
                    }
                };
                var actionFns = [{
                    fn: function(action, scopeFns) {
                        ctrl.callFlowScheduleModel.removeAction(action);
                    },
                    class: "fa fa-trash-o redfont mainopt",
                    tooltip: "Remove from schedule"
                }, ];
                return {
                    resourceInfo: resourceInfo,
                    resources: resources,
                    actionFns: actionFns
                };
            };

            function cloneConditionGroup(group) {
                return {
                    conditions: [].concat(group.conditions || []),
                    priority: group.priority
                };
            };
        },
        link: function($scope, element, attributes) {
            $scope.$ctrl = ctrl;
            ctrl.openActionScheduler = function(scheduleCtrl) {
                $scope.scheduleCtrl = scheduleCtrl;
                return $mdDialog.show({
                    preserveScope: true,
                    templateUrl: "views/auto-attendant-reflow/attendant-schedule-modal.html",
                    clickOutsideToClose: false,
                    autoWrap: false,
                    scope: $scope
                });
            };
            ctrl.allActions = $scope.callFlowScheduleModel.allActions;
            ctrl.callFlowScheduleModel = $scope.callFlowScheduleModel;
        }
    };
});
