'use strict';

proySymphony.directive("voicemailEdit", function(autoAttendantService, locationService, $rootScope,
    $timeout, audioLibraryService) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/voicemail-edit.html",
        scope: {
            voicemail: "<",
            registerResourceRetrieve: "&"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;

            $scope.init = function() {
                $scope.registerResourceRetrieve({
                    retrievalFn: saveVoicemail
                });
                $scope.editing = Boolean($scope.voicemail);
                $scope.voicemailEditInfo = {};
                if ($scope.editing && $scope.voicemail.greeting_id) {
                    aas.loadVoicemailGreeting($scope.voicemail.voicemail_uuid);
                } else {
                    $scope.selectedOpc = _.find($scope.opcOpts, {
                        name: "newrecord"
                    });
                }
            };

            $scope.cancelNewMessage = function() {
                $scope.selectedOpc = true;
            };

            $scope.setSelectedOpc = function(selectedOpc) {
                $scope.selectedOpc = selectedOpc;
            };

            $scope.saveRecording = function(recording, voicemailSettings) {
                $scope.voicemailEditInfo.selectedRecording = recording;
                $scope.selectedOpc = true;
            };

            $scope.opcOpts = [{
                    name: "newrecord",
                    title: "Record a New Message..."
                },
                {
                    name: "uploadfile",
                    title: "Upload an Audio File..."
                },
                {
                    name: "synthesize",
                    title: "Synthesize an audio file using text to speech.."
                }
            ];

            $scope.changeVoicemailGreeting = function() {
                $scope.transcript = null;
                $scope.selectedOpc = null;
            };

            $scope.saveSynth = function(transcript, file) {
                $scope.transcript = transcript;
                $scope.saveRecording(file);
            };

            function saveVoicemail() {
                var data = getPackagedVoicemailData($scope.editing);
                if (!data) { return false; }
                if ($scope.editing) { // update voicemail
                    return aas.updateVoicemail(data).then(function(voicemail) {
                        if (voicemail) {
                            var desc = voicemail.voicemail_description;
                            var message = desc + " successfully updated";
                            return function() {
                                $rootScope.showSuccessAlert(message, true);
                            };
                        }
                        return null;
                    });
                } else {
                    if ($scope.transcript) {
                        var file = data.selectedRecording;
                        data = {
                            transcript: $scope.transcript,
                            file: file
                        };
                        return audioLibraryService.createSynthesizedAudio(data)
                            .then(function(library) {
                                if (library) {
                                    var data = getPackagedVoicemailData($scope.editing);
                                    data.audio_library_uuid = library.audio_library_uuid;
                                    return createVoicemail(data);
                                }
                                return null;
                            });
                    } else {
                        return createVoicemail(data);
                    }
                }
                return null;
            };

            function createVoicemail(data) {
                return aas.createVoicemail(data).then(function(voicemail) {
                    if (voicemail) {
                        var display = aas.displayTransferOption(voicemail).display;
                        var message = "Voicemail " + display +
                            " successfully created.";
                        $rootScope.showSuccessAlert(message, true);
                    }
                    return null;
                });
            };

            function getPackagedVoicemailData() {
                var editingVoicemail = $scope.voicemail;
                var data = _.cloneDeep($scope.voicemailEditInfo);
                var validData = $scope.voicemailEditInfo.fieldsAreValid();
                if (!validData) {
                    if (!$scope.saveAttempted) {
                        $scope.saveAttempted = true;
                        $scope.voicemailEditInfo.touchFields();
                    }
                    return false;
                }
                if (!editingVoicemail) {
                    var recording = $scope.voicemailEditInfo.selectedRecording;
                    if (!recording) {
                        return false;
                    }
                    data.recording = recording;
                    if (recording.title) {
                        data.title = recording.title;
                    }
                } else {
                    data.voicemail_uuid = editingVoicemail.voicemail_uuid;
                }
                return data;
            };

            $scope.init();
        }
    };
});
