'use strict';

proySymphony.component("extensionEdit", {
    templateUrl: "views/auto-attendant/extension-edit.html",
    bindings: {
        addAction: "&"
    },
    controller: ["autoAttendantService", function(autoAttendantService) {
        var aas = autoAttendantService;
        var ctrl = this;

        ctrl.$onInit = function() {
            ctrl.contactNamesByExtension = aas.getContactNamesByExtension();

            aas.registerResourceDependencies([{
                scope: ctrl,
                targetName: "nonVoicemailExtensions",
                attachName: "extensions",
                onAfterRefresh: function() {
                    ctrl.extensions = aas.sortExtensionsByHasContact(
                        ctrl.extensions,
                        ctrl.contactNamesByExtension
                    );
                }
            }]);
        };

        ctrl.displayExtensionOption = function(ext) {
            var contactInfo = ctrl.contactNamesByExtension[ext.extension];
            if (contactInfo) {
                return ext.extension + " - " + contactInfo.contact_name_full;
            } else {
                return ext.extension;
            }
        };

        ctrl.getExtension = function() {
            var ext = ctrl.selectedExtension;
            ctrl.selectedExtension = null;
            return ext || false;
        };

    }]
});
