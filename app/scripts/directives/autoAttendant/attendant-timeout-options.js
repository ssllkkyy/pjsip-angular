"use strict";

proySymphony.component("attendantTimeoutOptions", {
    templateUrl: "views/auto-attendant/attendant-timeout-options.html",
    bindings: {
        chosenOpt: "=",
        labelText: "<?",
        addlTimeoutOpts: "<?",
        valuePath: "<?",
        chooseInitialOpt: "&?"
    },
    controller: ["autoAttendantService", function(autoAttendantService) {
        var ctrl = this;
        var aas = autoAttendantService;

        ctrl.$onInit = function() {
            if (ctrl.valuePath === undefined) { ctrl.valuePath = "value"; }
            ctrl.options = ctrl.addlTimeoutOpts || [];
            registerTimeoutOpts();
            ctrl.options = [{
                actionName: "external-did",
                display: "External DID",
                value: "external-did"
            }].concat(ctrl.options);
            if (!ctrl.labelText) { ctrl.labelText = "Choose a timeout option"; }
            if (ctrl.chooseInitialOpt) {
                ctrl.selectedOpt = ctrl.chooseInitialOpt({options: ctrl.options});
                if (ctrl.selectedOpt) {
                    ctrl.chooseOpt(ctrl.selectedOpt);
                    if (ctrl.selectedOpt.did) {
                        ctrl.externalDid = ctrl.selectedOpt.did;
                        ctrl.updateExternalOpt(ctrl.selectedOpt, ctrl.externalDid);
                    }
                }
            } else if (ctrl.chosenOpt && ctrl.chosenOpt.indexOf && ctrl.chosenOpt.indexOf("4343")) {
                ctrl.selectedOpt = ctrl.options[0];
                var did = ctrl.chosenOpt.split("2343")[1];
                ctrl.externalDid = did;
                ctrl.updateExternalOpt(ctrl.selectedOpt, did);
            } else if (ctrl.chosenOpt) {
                if (ctrl.options.indexOf(ctrl.chosenOpt) > -1) {
                    ctrl.selectedOpt = ctrl.chosenOpt;
                } else {
                    ctrl.selectedOpt = _.find(ctrl.options, function(opt) {
                        return ctrl.getOptValue(opt) === ctrl.chosenOpt;
                    });
                }
                ctrl.chooseOpt(ctrl.selectedOpt);
            }
        };

        ctrl.chooseOpt = function(opt) {
            if (ctrl.externalDid) { ctrl.externalDid = null; }
            if (opt.actionName !== "external-did") { chooseOpt(opt); }
        };

        ctrl.updateExternalOpt = function(opt, did) {
            did = "2343" + did;
            opt.did = did;
            if (ctrl.valuePath) { opt = did; }
            chooseOpt(opt, Boolean(ctrl.valuePath));
        };

        ctrl.getOptValue = function(opt) { return getOptValueByPath(opt, ctrl.valuePath); };

        function chooseOpt(opt, skipOptValue) {
            ctrl.chosenOpt = skipOptValue ? opt : ctrl.getOptValue(opt);
        };

        function getOptValueByPath(opt, valuePath) {
            return valuePath ? _.get(opt, valuePath) : opt;
        };

        function registerTimeoutOpts() {
            aas.registerResourceDependencies(aas.transferOpts.map(mapTransferOptToTimeoutOpt));
        };

        function mapTransferOptToTimeoutOpt(transferOpt) {
            var transferOptName =
                transferOpt.transferOptResourceName ||
                transferOpt.resourceCollName;
            return {
                scope: ctrl,
                targetName: transferOptName,
                attachName: transferOptName,
                onAfterRefresh: function() {
                    _.remove(ctrl.options, function(option) {
                        return option &&
                            option.display.indexOf(
                                transferOpt.transferOptDisplayRoot
                            ) > -1;
                    });
                    var displayOpts = ctrl[transferOptName].map(function(opt) {
                        var displayOpt = aas.displayTransferOption(opt, null);
                        if (opt && displayOpt) {
                            displayOpt.resource_uuid = aas.getResourceUuid(opt);
                        }
                        return displayOpt;
                    }).filter(Boolean).forEach(function(opt) {
                        if (opt && ctrl.options.indexOf(opt) === -1) { ctrl.options.push(opt); }
                    });
                }
            };
        };

    }]
});
