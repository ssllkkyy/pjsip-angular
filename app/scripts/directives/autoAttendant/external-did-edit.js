'use strict';

proySymphony.component("externalDidEdit", {
    templateUrl: "views/auto-attendant/external-did-edit.html",
    bindings: {
        addAction: "&"
    },
    controller: function() {
        var ctrl = this;

        ctrl.$onInit = function() {};
        ctrl.getExternalDid = function() {
            var did = ctrl.externalDid;
            ctrl.externalDid = null;
            return did || false;
        };

    }
});
