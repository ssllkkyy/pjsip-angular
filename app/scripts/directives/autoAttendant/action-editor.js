"use strict";

proySymphony.component("actionEditor", {
    templateUrl: "views/auto-attendant-reflow/action-editor.html",
    bindings: {
        editingResource: "<",
        regChooseSubAction: "&",
        regGoBack: "&",
        regResourceRetrieve: "&",
        onChosenAction: "&",
        chosenAction: "<?",
        isTopEditor: "<?"
    },
    controller: ["autoAttendantService", function(autoAttendantService) {
        var aas = autoAttendantService;
        var ctrl = this;

        ctrl.$onInit = function() {
            var wantedActions = ["ivr", "ring-group", "voicemail", "announcement"];
            function isWantedAction(action) { return wantedActions.indexOf(action.name) > -1; }
            ctrl.actions = aas.actions.filter(isWantedAction);
            // ctrl.actions = ["ivr", "ring-group", "voicemail", "announcement"];
            ctrl.canHaveNoAction = Boolean(ctrl.chosenAction);
            ctrl.regChooseSubAction({fn: chooseSubAction});
            ctrl.regGoBack({fn: goBack});
        };
        ctrl.subRegGoBack = function(fn) { ctrl.subEditorGoBack = fn; };
        ctrl.subRegChooseSubAction = function(fn) { ctrl.subEditorChooseSub = fn; };

        function goBack() {
            if (ctrl.subEditorGoBack) {
                var shouldDeregister = ctrl.subEditorGoBack();
                if (shouldDeregister) {
                    ctrl.subEditorGoBack = null;
                    ctrl.subEditorChooseSub = null;
                    ctrl.choosingSubAction = false;
                }
            } else if (ctrl.choosingSubAction) {
                ctrl.choosingSubAction = false;
                return true;
            } else {
                if (ctrl.canHaveNoAction) { ctrl.chosenAction = null; }
                return true;
            }
            return null;
        };

        function chooseSubAction() {
            if (ctrl.subEditorChooseSub) {
                var shouldDeregister = ctrl.subEditorChooseSub();
                if (shouldDeregister) { ctrl.subEditorChooseSub = null; }
            } else if (!ctrl.choosingSubAction) {
                ctrl.choosingSubAction = true;
            }
            return null;
        };

    }]
});
