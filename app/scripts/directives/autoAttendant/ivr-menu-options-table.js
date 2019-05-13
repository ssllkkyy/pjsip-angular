"use strict";

proySymphony.component("ivrMenuOptionsTable", {
    templateUrl: "views/auto-attendant-reflow/ivr-menu-options-table.html",
    bindings: {
        ivrModel: "<",
        openAudioSelector: "&"
    },
    controller: [
        "autoAttendantService", "ivrMenuOptionFactory", "$rootScope", "$timeout",
        function(autoAttendantService, ivrMenuOptionFactory, $rootScope, $timeout) {
            var ctrl = this;
            var aas = autoAttendantService;

            ctrl.$onInit = function() {
                ctrl.sendToOpts = getSendToOpts();
                ctrl.ivrModel.updateDigitOpts();
                registerResourceDependencies();
                attachIvrOptionStateChangeFns(ctrl.ivrModel);
            };

            ctrl.displayResource = function(resource) {
                if (resource.ivrDisplay) {
                    return resource.ivrDisplay;
                }
                if (!resource.ivrDisplay && !resource.noIvrDisplay) {
                    var result = aas.displayTransferOption(resource);
                    if (result && result.display) {
                        resource.ivrDisplay = result.display;
                        return resource.ivrDisplay;
                    } else {
                        resource.noIvrDisplay = true;
                    }
                }
                return null;
            };

            ctrl.updateDigitOpts = function() {
                $timeout(ctrl.ivrModel.updateDigitOpts);
            };

            ctrl.getDigitOptOrder = function(digitOpt) {
                return parseInt(digitOpt.order);
            };

            ctrl.updateAction = function(newOptionAction) {
                if (ctrl.closeSelector) { ctrl.closeSelector(); }
                ctrl.ivrModel.newOptionModel.updateAction(newOptionAction);
            };

            ctrl.openSelector = function(optionModel) {
                ctrl.closeSelector = ctrl.openAudioSelector({
                    optionModel: optionModel
                });
            };

            function getSendToOpts() {
                return _.filter(aas.actions, {
                    isIvrOpt: true
                }).concat([{
                    name: "menu-top-app",
                    title: "Replay Menu"
                }]);
            };

            function registerResourceDependencies() {
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
                }, {
                    scope: ctrl,
                    targetName: "ringGroups",
                    attachName: "ringGroups"
                }, {
                    scope: ctrl,
                    targetName: "ivrs",
                    attachName: "ivrs",
                    onAfterRefresh: function() {
                        ctrl.ivrs = ctrl.ivrs.filter(function(ivr) {
                            return ivr.ivr_menu_uuid !== ctrl.ivrModel.ivr_menu_uuid;
                        });
                    }
                }]);
            };

            function attachIvrOptionStateChangeFns(ivrModel) {
                ivrModel.registerOptionStateChangeIntercept(function(optionModel) {
                    return [
                        [optionModel.saveChanges,
                            function() {
                                var canSave = optionModel.canSaveChanges();
                                return canSave === true ? false : canSave;
                            },
                            function(message) {
                                if (message === "no-digit") {
                                    message =
                                        "Please select a phone digit option before saving.";
                                } else if (message === "no-description") {
                                    message =
                                        "Please provide a description before saving";
                                } else if (message === "no-action") {
                                    message =
                                        "Please select an action to send callers to.";
                                }
                                return infoIntercept(message);
                            }
                        ],
                        [optionModel.cancelEditing,
                            function() {
                                return false;
                            },
                            wrappedInfoIntercept("")
                        ]
                    ];
                });
            };

            function wrappedInfoIntercept(message) {
                return _.partial(infoIntercept, message);
            };

            function infoIntercept(message) {
                return $rootScope.showInfoAlert(message, true).then(function(response) {
                    return false;
                });
            };
        }
    ]
});
