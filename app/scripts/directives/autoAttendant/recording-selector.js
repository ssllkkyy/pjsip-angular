'use strict';

proySymphony.directive("recordingSelector", function(autoAttendantService, $rootScope, fileService) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/recording-selector.html",
        scope: {
            recordingInfo: "<"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;
            $scope.showAudioModal = $rootScope.showAudioModal;
            $scope.audioRecordingData = {};

            $scope.init = function() {
                aas.loadRecordingsWithFiles().then(function(recordings) {
                    if (recordings) {
                        var currentRecordingUuid;
                        if ($scope.recordingInfo.recording) {
                            currentRecordingUuid = $scope.recordingInfo.recording
                                .recording_uuid;
                        }
                        aas.registerResourceDependency({
                            scope: $scope,
                            targetName: "recordings",
                            attachName: "recordings"
                        });
                        if (currentRecordingUuid) {
                            var recording = _.find($scope.recordings, {
                                recording_uuid: currentRecordingUuid
                            });
                            if (recording) {
                                $scope.recordingInfo.recording = recording;
                                $scope.recordingInfo.selectedRecordingFile =
                                    recording.file;
                            }
                        }
                    }
                });
            };

            $scope.toggleCurrentRecording = function() {
                if ($scope.recordingInfo && $scope.recordingInfo.selectedRecording &&
                    !$scope.recordingInfo.selectedRecording.loading) {
                    if (!$scope.audioPlayer) {
                        $scope.playAudio($scope.recordingInfo.selectedRecording);
                    } else {
                        $scope.stopPlaying();
                    }
                }
            };

            $scope.stopPlaying = function() {
                if ($scope.audioPlayer) {
                    $scope.audioPlayer.pause();
                    delete $scope.audioPlayer;
                }
            };

            $scope.playAudio = function(audioFile) {
                var url = URL.createObjectURL(audioFile);
                if ($scope.audioPlayer) {
                    $scope.stopPlaying();
                }
                $scope.audioPlayer = new Audio();
                $scope.audioPlayer.src = url;
                $scope.audioPlayer.play();
                $scope.audioPlayer.onended = function() {
                    $scope.$evalAsync(function() {
                        $scope.stopPlaying();
                    });
                };
            };

            $scope.opcOpts = [{
                    name: "newrecord",
                    class: "fa fa-microphone",
                    title: "Record a New Announcement..."
                },
                {
                    name: "uploadfile",
                    class: "fa fa-upload",
                    title: "Upload an Audio File..."
                },
                {
                    name: "existing",
                    class: "fa fa-book",
                    title: "Select existing Message Announcement..."
                }
                // {name: "audiolibrary", class: "fa fa-book", title: "Select from Audio Library..."}
            ];

            $scope.selectAudioFile = function(recording, description) {
                if (!description) {
                    description = recording.name;
                }
                recording = fileService.blobToFile(recording, description, {
                    type: recording.type
                });
                $scope.recordingInfo.selectedRecordingFile = recording;
                $scope.cancelAddAudio();
            };

            $scope.cancelAddAudio = function() {
                $scope.opcBroadcast = null;
            };

            var recordingSettingsListener;
            var selectedRecordingFileListener;

            // function stopListenersAndTriggerChange() {
            //     recordingSettingsListener();
            //     selectedRecordingFileListener();
            //     // $scope.triggerChange();
            // };

            // recordingSettingsListener = $scope.$watch(
            //     "recordingInfo.recordingSettings",
            //     function(newVal, oldVal) {
            //         if (newVal && oldVal && newVal !== oldVal) {
            //             stopListenersAndTriggerChange();
            //         }
            //     }, true);

            // selectedRecordingFileListener = $scope.$watch(
            //     "recordingInfo.selectedRecordingFile",
            //     function(newVal, oldVal) {
            //         if (newVal && oldVal) {
            //             stopListenersAndTriggerChange();
            //         }
            //     });

            $scope.init();
        }
    };
});
