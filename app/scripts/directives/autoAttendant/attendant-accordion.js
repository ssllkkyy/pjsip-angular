'use strict';

proySymphony.directive("attendantAccordion", function(autoAttendantService, $window,
    resourceFrameworkService, callFlowScheduleFactory) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant-reflow/attendant-accordion.html",
        scope: {
            newAttendant: "<",
            attendant: "<"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;
            var rfs = resourceFrameworkService;
            $scope.editing = Boolean($scope.attendant);

            $scope.init = function() {
                var callFlowScheduleModel = $scope.newAttendant.callFlowScheduleModel;
                $scope.callFlowScheduleModel = callFlowScheduleModel;
                $scope.addScheduleAction = callFlowScheduleModel.addAction;
                if ($scope.attendant && $scope.attendant.override_tc_dialplan_uuid) {
                    $scope.overrideEnabled = $scope.attendant.override_enabled;
                }
                rfs.registerFunctionCollOnScope($scope, aas.getResourceActionFns);
                $scope.allScheduleActions = callFlowScheduleModel.allActions;
                $scope.scheduledActionsOnly = callFlowScheduleModel.scheduledActions;

                aas.registerResourceDependencies([{
                        scope: $scope,
                        targetName: "actionableActions",
                        attachName: "actions"
                    },
                    {
                        scope: $scope,
                        targetName: "destinations",
                        attachName: "destinations",
                        onAfterRefresh: function() {
                            $scope.destToUser = aas.getDestToUserColl();
                        }
                    },
                    {
                        scope: $scope,
                        targetName: "unassignedDestinations",
                        attachName: "unassignedDestinations"
                    }
                ]);
            };

            $scope.init();
        }
    };
});
