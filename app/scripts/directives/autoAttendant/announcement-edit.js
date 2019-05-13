'use strict';

proySymphony.directive("announcementEdit", function(autoAttendantService, $rootScope,
    symphonyConfig, audioLibraryService) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/announcement-edit.html",
        scope: {
            announcement: "<",
            registerResourceRetrieve: "&"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;
            var als = audioLibraryService;

            $scope.init = function() {
                $scope.registerResourceRetrieve({retrievalFn: saveAnnouncement});
                $scope.editing = Boolean($scope.announcement);
                $scope.announcementEditInfo = {};
                var editFields = ["file_title", "audio_library_uuid"];
                _.merge($scope.announcementEditInfo, _.pick($scope.announcement, editFields));
                $scope.timeoutOptions = [
                    {value: "hang-up", display: "Hangup"}
                ];
                registerResourceDependencies();
                if (!$scope.editing) {
                    $scope.selectedOpc = _.find($scope.opcOpts, {
                        name: "newrecord"
                    });
                    setNoAnswerOptToHangUp();
                } else {
                    $scope.audioPath = getAudioLibraryFilePath($scope.announcement);
                    var uuid = $scope.announcement.audio_library_uuid;
                    $scope.transcript = aas.transcriptsByLibraryUuid[uuid];
                    var timeoutResourceUuid = $scope.announcement.timeout_resource_uuid;
                    var timeoutActionName = $scope.announcement.timeout_action;
                    $scope.findTimeoutOpt = getFindTimeoutOpt(timeoutActionName, timeoutResourceUuid);
                    if (timeoutActionName && timeoutResourceUuid) {
                        // $scope.announcementEditInfo.noAnswerOpt = _.find($scope.noAnswerOptions, {
                        //     resource_uuid: timeoutResourceUuid
                        // });
                    } else if (timeoutActionName === "hang-up") {
                        setNoAnswerOptToHangUp();
                    }
                }
            };

            $scope.setSelectedOpc = function(selectedOpc) { $scope.selectedOpc = selectedOpc; };
            $scope.cancelNewMessage = function() { $scope.selectedOpc = true; };
            $scope.setSelectedOpc = function(selectedOpc) { $scope.selectedOpc = selectedOpc; };

            $scope.saveRecording = function(recording, announcementSettings) {
                $scope.announcementEditInfo.selectedRecording = recording;
                $scope.selectedOpc = true;
            };

            $scope.opcOpts = [
                {
                    name: "newrecord",
                    title: "Record a New Message..."
                }, {
                    name: "uploadfile",
                    title: "Upload an Audio File..."
                }, {
                    name: "synthesize",
                    title: "Synthesize an audio file using text to speech..."
                }
            ];

            $scope.changeAnnouncement = function() {
                $scope.transcript = null;
                $scope.setSelectedOpc(_.find($scope.opcOpts, {
                    name: "newrecord"
                }));
            };

            $scope.saveSynth = function(transcript, file, title) {
                $scope.transcript = transcript;
                $scope.saveRecording(file);
            };

            $scope.updateTranscript = function(text, file) {
                var data = {
                    file: file,
                    transcript: text,
                    audio_library_uuid: $scope.announcement.audio_library_uuid
                };
                als.updateSynthesizedAudio(data).then(function(library) {
                    if (library) {
                        $scope.audioPath = getAudioLibraryFilePath(library);
                        var message =
                            "Synthesized audio successfully updated";
                        $rootScope.showSuccessAlert(message, true);
                    }
                });
            };

            function getFindTimeoutOpt(actionName, resourceUuid) {
                return function(options) {
                    if (actionName === "external-did") {
                        var opt = _.find(options, {actionName: "external-did"});
                        opt.did = resourceUuid;
                        return opt;
                    } else if (actionName && resourceUuid) {
                        return _.find(options, {resource_uuid: resourceUuid});
                    } else {
                        return _.find(options, {value: "hang-up"});
                    }
                };
            };

            function saveAnnouncement() {
                var data = getPackagedAnnouncementData();
                if (!data) { return false; }
                if ($scope.editing) { // update announcement
                    return aas.updateAudioLibrary(data).then(function(announcement) {
                        if (announcement) {
                            var desc = announcement.file_title;
                            var message = desc + " successfully updated";
                            return function() {
                                $rootScope.showSuccessAlert(message, true);
                            };
                        }
                        return null;
                    });
                } else {
                    if ($scope.transcript) {
                        data.transcript = $scope.transcript;
                        return audioLibraryService.createSynthesizedAudio(data)
                            .then(function(library) {
                                if (library) {
                                    var desc = library.file_title;
                                    var message = desc + " successfully created";
                                    return function() {
                                        $rootScope.showSuccessAlert(message, true);
                                    };
                                }
                                return null;
                            });
                    } else {
                        return aas.createAudioLibrary(data).then(function(announcement) {
                            if (announcement) {
                                var desc = announcement.file_title;
                                var message = desc + " successfully created";
                                return function() {
                                    $rootScope.showSuccessAlert(message, true);
                                };
                            }
                            return null;
                        });
                    }
                }
                return null;
            };

            function getPackagedAnnouncementData() {
                var editingAnnouncement = $scope.announcement;
                var data = _.cloneDeep($scope.announcementEditInfo);
                data.file = data.selectedRecording;
                delete data.selectedRecording;
                if (data.noAnswerOpt) {
                    var noAnswerOpt = data.noAnswerOpt;
                    data.timeout_action = noAnswerOpt.type;
                    data.timeout_resource_uuid = noAnswerOpt.did || noAnswerOpt.resource_uuid ||
                        noAnswerOpt.value;
                    delete data.noAnswerOpt;
                }
                return data;
            };

            function getAudioLibraryFilePath(audioLibrary) {
                return symphonyConfig.audioUrl + audioLibrary.filepath;
            };

            function registerResourceDependencies() {
                // var noAnswerDeps = aas.getNoAnswerDeps($scope.noAnswerOptions, $scope);
                aas.registerResourceDependencies([{
                    scope: $scope,
                    targetName: "audioLibraries",
                    attachName: "audioLibraries"
                }]);
            };

            function setNoAnswerOptToHangUp() {
                // $scope.announcementEditInfo.noAnswerOpt = _.find($scope.noAnswerOptions, {
                //     value: "hang-up"
                // });
            };

            $scope.init();
        }
    };
});
