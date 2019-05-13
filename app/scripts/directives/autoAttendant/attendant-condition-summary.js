'use strict';

proySymphony.component("attendantConditionSummary", {
    templateUrl: "views/auto-attendant-reflow/attendant-condition-summary.html",
    bindings: {
        scheduledActions: "<"
    },
    controller: ["autoAttendantService", function(autoAttendantService) {
        var ctrl = this;
        var aas = autoAttendantService;
        ctrl.$onInit = function() {};

        ctrl.displayAction = function(action) {
            if (action.display) {
                return action.display;
            } else {
                var displayOpt = aas.displayTransferOption(action.resource, action.action.name);
                if (displayOpt) {
                    action.display = displayOpt.display;
                    return action.display;
                }
            }
            return null;
        };
    }]
});

// scheduleAction.display = aas.displayTransferOption(
//     scheduleAction.resource, scheduleAction.action.name
// ).display;
