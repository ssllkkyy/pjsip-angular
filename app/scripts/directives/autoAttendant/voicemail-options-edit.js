'use strict';

proySymphony.component("voicemailOptionsEdit", {
    templateUrl: "views/auto-attendant/voicemail-options-edit.html",
    bindings: {
        voicemail: "<",
        voicemailEditInfo: "<"
    },
    controller: ["locationService", function(locationService) {
        var ctrl = this;
        var ls = locationService;

        var editFields = [
            "voicemail_description", "voicemail_password",
            "voicemail_mail_to", "location_group_uuid"
        ];

        ctrl.$onInit = function() {
            var editInfo = ctrl.voicemailEditInfo;
            _.merge(editInfo, _.pick(ctrl.voicemail, editFields));
            editInfo.fieldsAreValid = function() {
                return ctrl.voicemailFields.$valid;
            };
            editInfo.touchFields = touchRequiredFields;
            ls.registerResourceDependencies([{
                scope: ctrl,
                targetName: "locationGroups",
                attachName: "locationGroups"
            }]);
        };

        function touchRequiredFields() {
            editFields.forEach(function(field) {
                ctrl.voicemailFields[field].$touched = true;
                ctrl.voicemailFields[field].$untouched = false;
            });
        };

    }]
});
