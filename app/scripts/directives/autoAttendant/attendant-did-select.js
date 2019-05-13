"use strict";

proySymphony.component("attendantDidSelect", {
    templateUrl: "views/auto-attendant-reflow/attendant-did-select.html",
    bindings: {
        attendant: "<?",
        hideOrder: "<?",
        onDestChange: "&?"
    },
    controller: ["autoAttendantService", "usefulTools", "$rootScope", "$filter", function(autoAttendantService, usefulTools, $rootScope, $filter) {
        var ctrl = this;
        var aas = autoAttendantService;

        ctrl.$onInit = function() {
            ctrl.attendantEdits = {};
            ctrl.newAttendant = { additional_destinations: {} };
            aas.registerEventCallback("actionsAttached", onAttendantRefresh);
            aas.registerResourceDependencies([{
                scope: ctrl,
                targetName: "destinations",
                attachName: "destinations",
                onAfterRefresh: function() {
                    ctrl.destToUser = aas.getDestToUserColl();
                    onAttendantRefresh();
                }
            }, {
                scope: ctrl,
                targetName: "unassignedDestinations",
                attachName: "unassignedDestinations",
                onAfterRefresh: function() {
                    if (ctrl.newAttendant &&
                        ctrl.newAttendant.destination &&
                        ctrl.destinations.indexOf(ctrl.newAttendant.destination) === -1) {
                        ctrl.destinations.unshift(ctrl.newAttendant.destination);
                    }
                }
            }, {
                scope: ctrl,
                targetName: "attendants",
                attachName: "attendants ",
                onAfterRefresh: onAttendantRefresh
            }]);
        };

        ctrl.orderNewNumber = function() {
            ctrl.orderingNumber = true;
            aas.orderNewNumber().then(function() { ctrl.orderingNumber = false; });
        };

        ctrl.attendantCheckboxDestinations = function(attendant) {
            var dests = attendantDestinations(attendant).concat(ctrl.unassignedDestinations);
            var attendantEdit = ctrl.attendantEdits;
            var search;
            if (attendantEdit) { search = attendantEdit.search; }
            dests = dests.filter(function(dest) {
                if (search) {
                    var user = ctrl.destToUser[dest.destination_uuid];
                    var match = dest.destination_number.indexOf(search) > -1;
                    if (!match) {
                        match = $filter("tel")(dest.destination_number).indexOf(search) > -1;
                    }
                    if (!match && user) {
                        match = user.name.toLowerCase().indexOf(search) > -1 ||
                            user.name.indexOf(search) > -1;
                    }
                    return match;
                }
                return true;
            });
            function destHasContactNameFull(dest) {
                var user = ctrl.destToUser[dest.destination_uuid];
                return user && user.name;
            };
            return usefulTools.sortByBooleanFn(dests, destHasContactNameFull);
        };

        ctrl.changeAttendantDestination = function(attendant, dest) {
            var added = ctrl.attendantEdits.additional_destinations[dest.destination_uuid];
            if (ctrl.onDestChange) {
                var destUuid = dest.destination_uuid;
                ctrl.onDestChange({destUuid: destUuid, isSet: added});
            } else {
                var newAttendant = {
                    addlDests: function() {
                        var dests;
                        if (added) {
                            dests = aas.attendantDestinations(attendant);
                            dests = _.map(dests, "destination_uuid");
                            dests.push(dest.destination_uuid);
                            return dests;
                        } else {
                            dests = aas.attendantDestinations(attendant);
                            _.remove(dests, { destination_uuid: dest.destination_uuid });
                            dests = _.map(dests, "destination_uuid");
                            return dests;
                        }
                    }
                };
                saveAttendant(attendant, { newAttendant: newAttendant });
            }
        };

        ctrl.getDestDisplayName = function(destination) {
            if (destination.destination_description &&
                destination.destination_description.indexOf("tkgkottertechtestdid") > -1) {
                return "Test Number";
            } else if (ctrl.destToUser[destination.destination_uuid]) {
                return ctrl.destToUser[destination.destination_uuid].name;
            } else {
                return "External Number";
            }
        };

        function attendantDestinations(attendant) {
            return attendant ?
                [attendant.destination]
                .concat(attendant.additional_destinations)
                .filter(Boolean) :
                [];
        };

        function onAttendantRefresh() {
            if (ctrl.attendant) {
                var attendant = ctrl.attendant;
                var addlDests = {};
                attendantDestinations(attendant)
                    .forEach(function(dest) {
                        addlDests[dest.destination_uuid] = true;
                    });
                if (!ctrl.attendantEdits) { ctrl.attendantEdits = {}; }
                ctrl.attendantEdits.additional_destinations = addlDests;
                ctrl.attendantEdits.action = attendant.action;
            }
        };

        function saveAttendant(attendant, opts) {
            var data = getAttendantUpdateData(attendant, opts);
            return aas.updateAttendant(data).then(function(response) {
                if (response) {
                    $rootScope.showSuccessAlert("Attendant updated");
                } else {
                    var message =
                        "Something went wrong while updating your " +
                        "attendant. Please contact customer support to report " +
                        "this error.";
                    $rootScope.showErrorAlert(message);
                }
            });
            return null;
        };

        function getAttendantUpdateData(attendant, opts) {
            var newAttendant = opts.newAttendant || {
                addlDests: function() { return aas.attendantDestinationUuids(attendant); }
            };
            return {
                auto_attendant_uuid: attendant.auto_attendant_uuid,
                destinations: newAttendant.addlDests(),
                description: newAttendant.description,
                action_name: "time-condition"
            };
        };

    }]
});
