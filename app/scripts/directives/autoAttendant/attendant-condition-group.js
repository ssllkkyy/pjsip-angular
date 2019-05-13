"use strict";

proySymphony.component("attendantConditionGroup", {
    templateUrl: "views/auto-attendant-reflow/attendant-condition-group.html",
    bindings: {
        isLastGroup: "<",
        conditionTypes: "<",
        group: "<",
        removeGroup: "&",
        addNewGroup: "&"
    },
    controller: function() {
        var ctrl = this;

        ctrl.$onInit = function() {};

        ctrl.addCondition = function(condition) {
            ctrl.group.conditions.push(condition);
        };

        ctrl.removeCondition = function(condition) {
            _.remove(ctrl.group.conditions, function(cond) {
                return cond === condition;
            });
        };

    }
});
