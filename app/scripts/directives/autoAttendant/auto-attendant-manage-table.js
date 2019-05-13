
'use strict';

proySymphony.directive("autoAttendantManageTable", function(autoAttendantService, $rootScope, $filter, $q, usefulTools, $mdDialog, symphonyConfig) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/auto-attendant-manage-table.html",
        scope: {
            editTimeCondition: "&",
            editRingGroup: "&",
            editIvr: "&",
            editVoicemail: "&",
            editExtension: "&",
            createAutoAttendant: "&",
            editAutoAttendant: "&"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;
            $scope.queueManagerExist = $rootScope.user.domain.queue_manager ? $rootScope.user.domain.queue_manager : null;
            $scope.init = function() {
                aas.registerResourceDependencies([{
                    scope: $scope,
                    targetName: "attendants",
                    attachName: "attendants"
                }]);
                $scope.tableControls = tableControls;
            };

            $scope.createAttendant = function() { $scope.createAutoAttendant()(); };

            $scope.editAttendant = function(attendant) {
                if (attendant.action && !attendant.loadingResources) {
                    $scope.editAutoAttendant()(attendant);
                }
            };

            $scope.deleteAttendant = function(attendant) {
                var message = "Deleting Attendant: " + attendant.description;
                var subMessage =
                    "Are you sure you want to delete this auto attendant?";
                $rootScope.confirmDialog(message, subMessage).then(function(
                    response) {
                    if (response) {
                        aas.deleteAttendant(attendant.auto_attendant_uuid);
                    }
                });
            };

            $scope.triggerAttendantClone = function(attendant) {
                var pScope = $scope;
                return $mdDialog.show({
                    templateUrl: "views/auto-attendant-reflow/attendant-clone-modal.html",
                    clickOutsideToClose: false,
                    autoWrap: false,
                    controller: ["$scope", function($scope) {
                        var dests = {};
                        function onDestChange(destUuid, isSet) {
                            dests[destUuid] = isSet;
                            $scope.$ctrl.cloneable = Object.values(dests).filter(Boolean).length;
                        };
                        function cloneAttendant() {
                            function isSelectedKey(key) { return dests[key]; };
                            var data = {
                                destinations: Object.keys(dests).filter(isSelectedKey),
                                original_attendant_uuid: attendant.auto_attendant_uuid
                            };
                            aas.cloneAttendant(data).then($scope.$ctrl.cancel);
                        };
                        $scope.$ctrl = {
                            modalTitle: "Cloning " + attendant.description,
                            onDestChange: onDestChange,
                            cancel: closeCloneModal,
                            cloneAttendant: cloneAttendant
                        };
                    }]
                });
            };

            $scope.createQueueManager = function() {
                $scope.creatingQM = true;
                aas.createQueueManager()
                    .then(function(response) {
                        if(response) {
                            $rootScope.user.domain.queue_manager = {};
                            $rootScope.user.domain.queue_manager.username = response.username;
                            $rootScope.user.domain.queue_manager.password = response.password;
                            $scope.queueManagerExist = response;
                            $scope.creatingQM = false;
                            $rootScope.showSuccessAlert("Queue Manager Created", true);
                        } else {
                            $scope.creatingQM = false;
                            $rootScope.showErrorAlert("Cannot create Queue Manager");
                        }
                });
            };

            $scope.openFusionForQM = function(targetPage) {
                
                if(typeof targetPage === 'undefined') {
                    targetPage = "/app/call_centers/call_center_queues.php";
                }

                var username = $rootScope.user.domain.queue_manager.username + '@' + $rootScope.user.domain.domain_name;
                var password = $rootScope.user.domain.queue_manager.username.substring(0,4) + 'QM!' + $rootScope.user.domain_uuid.substring(0,4);
                var data = "username=" + username + "&password=" + password;
                data = encodeURI(data);

                var xhr = new XMLHttpRequest();
                xhr.withCredentials = true;

                var fusion_url = "https://" + $rootScope.user.domain.domain_name + targetPage;

                xhr.addEventListener("readystatechange", function () {
                if (this.readyState === 4) {
                window.open(fusion_url);
                }
                });

                xhr.open("POST", fusion_url);
                xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                xhr.send(data);
            };

            $scope.showAudioSettings = false;

            // $scope.manageAudio = function() {
            //     $scope.showAudioSettings = !$scope.showAudioSettings;
            //     $scope.audioSelectorType = 'ivr-greeting';
            // }
            //------------------------------------Audio Selector-----------------------------------------
            $scope.ivrGreetingInfo = {};

            $scope.recordNewGreeting = function() {
                $scope.ivrGreetingInfo.ivrGreeting = null;
            };

            function getAudioLibraryFilePath(audioLibrary) {
                return symphonyConfig.audioUrl + audioLibrary.filepath;
            };

            $scope.onNewIvrGreetingInfo = function(greeting) {
                $scope.ivrGreetingInfo.ivrGreeting = greeting;
                $scope.ivrGreetingInfo.audioFile = getAudioLibraryFilePath(greeting);
                $rootScope.showSuccessAlert("Audio file saved successfully!", true);
            };

            $scope.chooseAudio = function(data) {
                var item = data.resource ? data.resource : data.file;
                var type = data.resource ? "resource" : "file";
                if ($scope.audioSelectorType === "ivr-greeting" &&
                    $scope.ivrGreetingInfo.ivrGreeting !== item) {
                    if (item) { $scope.onNewIvrGreetingInfo(item); }
                } else {
                    $scope.ivrModel.editingOpt.updateResource(data.resource, data.file);
                }
                $scope.closeAudioSelector();
                $scope.showAudioSettings = false;
            };

            $scope.closeAudioSelector = function() {
                $scope.selectedRecording = null;
                $scope.audioSelectorType = null;
            };

            $scope.openAudioSelector = function(optionModel) {
                $scope.showAudioSettings = !$scope.showAudioSettings;
                var type = _.isString(optionModel) ? optionModel : optionModel.actionName;
                $scope.audioSelectorType = type;
                if (optionModel.resourceFileValue &&
                    (type === "announcement" || type === "voicemail")) {
                    $scope.selectedAudio = optionModel.resourceFileValue;
                } else if (type === "ivr-greeting") {
                    $scope.ivrGreetingInfo.ivrGreeting = null;
                    usefulTools.goToId('audio-selector');
                }
                return $scope.closeAudioSelector;
            };

            $scope.disableGreetingSelector = function() {
                return !$scope.audioLibraries || !$scope.audioLibraries.length ||
                    $scope.audioSelectorType === 'ivr-greeting';
            };

            $scope.onOptionActionChange = function(newAction) {
                $scope.closeAudioSelector();
                $scope.audioInfo = {};
            };

            //---------------------------------End of Audio selector-----------------------

            function closeCloneModal() { $mdDialog.hide({}); };

            var columnNames = [{
                name: "description",
                text: "Call Flow Name",
                className: "description"
            }, {
                name: "additional_numbers",
                text: "Change Call Flow DIDs",
                className: "additional-numbers"
            }, {
                name: "edit",
                text: "Edit",
                className: "edit"
            }, {
                name: "clone",
                text: "Clone",
                className: "clone"
            }, {
                name: "delete",
                text: "Delete",
                className: "delete"
            }];

            var sortingOpts = {
                selectedColumn: "external_did",
                sortDirection: false,
                sortableColumns: [],
                orderByValue: null,
                handleNewSelectedCol: function() {}
            };

            var tableControls = {
                columnNames: columnNames,
                attendants: [{}],
                currentPage: {
                    page: 1
                },
                sortingOpts: sortingOpts,
                filteredQuotes: null
            };

            $scope.init();
        }
    };
});
