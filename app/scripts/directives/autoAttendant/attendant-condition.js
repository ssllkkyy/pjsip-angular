'use strict';

proySymphony.component("attendantCondition", {
    templateUrl: "views/auto-attendant-reflow/attendant-condition.html",
    bindings: {
        conditionTypes: "<",
        condition: "<?",
        removeCondition: "&?",
        addCondition: "&?"
    },
    controller: function() {
        var ctrl = this;

        ctrl.$onInit = function() {
            if (!ctrl.condition) {
                ctrl.showAddBtn = true;
                ctrl.condition = {};
            }
        };

        ctrl.add = function(condition) {
            if (condition.conditionType && condition.startOpt && condition.endOpt) {
                ctrl.addCondition({
                    condition: condition
                });
                ctrl.condition = {};
            }
        };

        ctrl.onCondTypeChange = function(condType) {
            ctrl.condition.startOpt = null;
            ctrl.condition.endOpt = null;
        };

        ctrl.setMinuteOfDayStart = function(condition, value) {
            var momentVal = moment(value);
            var hour = momentVal.hour();
            var minute = momentVal.minute();
            var optVal = (hour * 60) + minute;
            condition.startOpt = {
                value: optVal
            };
        };

        ctrl.setMinuteOfDayEnd = function(condition, value) {
            var momentVal = moment(value);
            var hour = momentVal.hour();
            var minute = momentVal.minute();
            var optVal = (hour * 60) + minute;
            condition.endOpt = {
                value: optVal
            };
        };

    }
});
