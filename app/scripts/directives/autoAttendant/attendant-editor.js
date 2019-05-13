'use strict';

proySymphony.directive("attendantEditor", function(autoAttendantService, locationService,
    $rootScope, callFlowScheduleFactory) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant-reflow/attendant-editor.html",
        scope: {
            registerCallbacks: "&",
            attendant: "<"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;

            function init() {
                var editing = Boolean($scope.attendant);
                var attendant = $scope.attendant;

                $scope.registerCallbacks({
                    save: function() {
                        var saveFn = editing ? updateAttendant :
                            createAttendant;
                        return checkAttendantForErrors() && saveFn();
                    },
                    shouldPromptOnCancel: function() {
                        var newAttendant = $scope.newAttendant;
                        var newDests = Object.values(newAttendant);
                        if (editing) {
                            return newAttendant.description !== attendant.description ||
                                equivalentArrs(newDests, attendant.additional_destinations);
                        } else {
                            return newAttendant.description.length || newDests.length;
                        }
                        var fields = ["description", "additional_destinations"];
                    }
                });
                $scope.newAttendant = getNewAttendant(attendant);
            };

            function equivalentArrs(arr1, arr2) {
                return arr1.length === arr2 && _.difference(arr1, arr2).length === 0;
            };

            function getNewAttendant(attendant) {
                var newAttendant = {
                    description: "",
                    additional_destinations: {},
                    addlDests: function() {
                        return Object.keys(
                            newAttendant.additional_destinations
                        ).filter(function(destUuid) {
                            return newAttendant.additional_destinations[destUuid];
                        });
                    },
                    callFlowScheduleModel: getCallFlowSchedule(attendant)
                };
                if (attendant) {
                    var attendantDests = getAttendantDestinations($scope.attendant);
                    attendantDests.forEach(function(dest) {
                        newAttendant.additional_destinations[
                            dest.destination_uuid
                        ] = true;
                    });
                    newAttendant.description = attendant.description;
                    _.merge(newAttendant, {
                        description: attendant.description,
                        timezone: attendant.timezone
                    });
                }
                return newAttendant;
            };

            function getCallFlowSchedule(attendant) {
                return attendant ?
                    initCallFlowScheduleFromAttendant(attendant) :
                    new callFlowScheduleFactory();
            };

            function initCallFlowScheduleFromAttendant(attendant) {
                var attendantSchedModel = attendant.actionResource.callFlowScheduleModel;
                var actions = attendantSchedModel.allActions;
                var defaultAction = attendantSchedModel.defaultAction;
                return new callFlowScheduleFactory(actions, defaultAction);
            };

            function updateAttendant() {
                var data = getCallFlowData();
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

            function createAttendant() {
                var data = getCallFlowData();
                return aas.createAttendant(data).then(function(response) {
                    if (response) {
                        $rootScope.showSuccessAlert("Attendant created");
                    } else {
                        var message =
                            "Something went wrong while creating your " +
                            "attendant. Please contact customer support to report " +
                            "this error.";
                        $rootScope.showErrorAlert(message);
                    }
                });
                return null;
            };

            function getCallFlowData(forErrorCheck) {
                var newAttendant = $scope.newAttendant;
                var callFlowScheduleModel = newAttendant.callFlowScheduleModel;
                var callFlowActions = callFlowScheduleModel.allActions;
                var defaultScheduleAction = callFlowScheduleModel.defaultAction;
                var timezone = newAttendant.timezone;
                if (!callFlowActions.length) {
                    displayErrorMessage("noActions");
                    return null;
                } else if (!defaultScheduleAction) {
                    displayErrorMessage("noDefaultAction");
                    return null;
                } else {
                    var attendantUuid = $scope.attendant && $scope.attendant.auto_attendant_uuid;
                    var resetDests = $scope.attendant && !$scope.attendant.timezone;
                    defaultScheduleAction.isDefault = true;
                    var scheduleActions = callFlowActions.concat([defaultScheduleAction]);
                    var conditions = aas.convertScheduleActionsToFSConditions(scheduleActions);
                    var destinations = newAttendant.addlDests();
                    var description = newAttendant.description;
                    var data = {
                        auto_attendant_uuid: attendantUuid,
                        destinations: destinations,
                        conditions: conditions,
                        description: description,
                        action_name: "time-condition",
                        timezone: timezone,
                        reset_all_destinations: resetDests
                    };
                    if (forErrorCheck) { data.defaultScheduleAction = defaultScheduleAction; }
                    return data;
                };
            };

            function checkAttendantForErrors() {
                var data = getCallFlowData(true);
                if (!data) {
                    return false;
                }
                var options = [
                    [function() {
                        return !Boolean(data.description);
                    }, "noName"],
                    [function() {
                        return !Boolean(data.timezone);
                    }, "noTimezone"],
                    [function() {
                        return !data.conditions || data.conditions.length ===
                            0;
                    }, "noActions"],
                    [function() {
                        return !getBoundsFromConditions(data.conditions).length;
                    }, "noSchedules"],
                    [function() {
                        return !Boolean(data.defaultScheduleAction);
                    }, "noDefaultAction"],
                    [function() {
                        return false;
                    }, "noErrors"]
                ];
                for (var i = 0; i < options.length; i++) {
                    var option = options[i];
                    if (option[0]()) {
                        return displayErrorMessage(option[1]);
                    } else if (option[1] === "noErrors") {
                        return true;
                    }
                }
                return null;
            };

            function displayErrorMessage(cause) {
                var causes = {
                    noDestinations: 'Please select at least one phone number in ' +
                        'the "Select phone numbers for AA" section above before ' +
                        'saving your Call Flow.',
                    noActions: 'You must select at least one action for your ' +
                        'Call Flow before saving it.',
                    noName: 'Please name your Call Flow before saving it',
                    noTimezone: 'Please select a timezone before saving your Call Flow',
                    noSchedules: "Please be sure that each action has at least " +
                        "one time interval specified in its schedule",
                    noDefaultAction: "Please select a default schedule to handle any calls " +
                        "received during a time you have not specified."
                };
                var message = causes[cause];
                $rootScope.showInfoAlert(message);
                return false;
            };

            function getAttendantDestinations(attendant) {
                if (attendant.destination) {
                    return [attendant.destination].concat(attendant.additional_destinations);
                }
                return attendant.additional_destinations;
            };

            function getBoundsFromConditions(conditions) {
                var bounds = [];
                conditions.forEach(function(condition) {
                    condition.groups.forEach(function(group) {
                        if (group.bounds) {
                            bounds = bounds.concat(group.bounds);
                        }
                    });
                });
                return bounds;
            };
            init();
        }
    };
});
