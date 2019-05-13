'use strict';

proySymphony.directive("attendantAudioSelector", function(autoAttendantService, $rootScope,
    fileService, locationService, symphonyConfig, audioLibraryService, $timeout) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/attendant-audio-selector.html",
        scope: {
            selectedAudio: "<",
            chooseAudio: "&",
            audioType: "<",
            alterResources: "&"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;
            var ls = locationService;

            var resourceTrigger;
            $scope.showAudioModal = $rootScope.showAudioModal;
            if (!$scope.audioType) { $scope.audioType = "voicemail"; }
            $scope.audioRecordingData = { recording: {} };

            $scope.init = function() {
                $scope.registerNewResourceTrigger = function(trigger) {
                    $scope.triggerNewResource = trigger;
                };
                $scope.showSelector = true;
                if ($scope.audioType === "voicemail") {
                    $scope.audioAction = _.find(aas.actions, {
                        name: "voicemail"
                    });
                    $scope.announcementAction = _.find(aas.actions, {
                        name: "announcement"
                    });
                    $scope.resourceName = "Voicemail Greeting";
                    $scope.addlOptsResourceName = "Voicemail";
                    $scope.voicemailSettings = {};
                } else if ($scope.audioType === "announcement" || "ivr-greeting") {
                    $scope.audioAction = _.find(aas.actions, {
                        name: "announcement"
                    });
                    $scope.resourceName = "Message Announcement";
                }
                if ($scope.audioAction) {
                    $scope.audioActionName = $scope.audioAction.name;
                    $scope.audioDatashare = {
                        addActionMessage: "Use this " + $scope.audioActionName
                    };
                }
                initializeAudioType();
                registerResourceDependencies();
            };

            $scope.setSelectedOpc = function(selectedOpc) {
                $scope.$evalAsync(function() {
                    var curOpc = $scope.selectedOpc;
                    if (curOpc && curOpc.onUnSelect) {
                        curOpc.onUnSelect(selectedOpc);
                    }
                    $scope.selectedOpc = selectedOpc;
                    $timeout(function() {
                        if ($scope.selectedOpc.onSelect) {
                            $scope.selectedOpc.onSelect(curOpc);
                        }
                    });
                });
            };

            $scope.showAddAudio = function() {
                $scope.requiresAddlOpts = false;
                $scope.showSelector = true;
            };

            $scope.cancelAddAudio = function() {
                $scope.requiresAddlOpts = requiresAddlOpts();
                //$scope.showSelector = false;
                $scope.selectedOpc = null;
            };

            $scope.selectAudioFile = function(recording) {
                if (!recording) { return; }
                $scope.uploading = true;
                $scope.selectedAudio = recording;
                $scope.cancelAddAudio();
                chooseSelected();
            };

            $scope.chooseSelected = function(selectedAudio, voicemailSettings, selectedResource) {
                if (!$scope.requiresAddlOpts || $scope.voicemailSettings.fieldsAreValid()) {
                    var audioData = {
                        file: selectedAudio,
                        resource: selectedResource
                    };
                    if ($scope.audioType === "voicemail") {
                        handleVoicemailAudio(audioData, voicemailSettings);
                    } else if ($scope.audioType === "announcement") {
                        handleAnnouncementAudio(audioData);
                    } else if ($scope.audioType === "ivr-greeting") {
                        handleIvrGreetingAudio(audioData);
                    }
                } else {
                    touchVoicemailFields();
                }
            };

            function handleIvrGreetingAudio(audioData) {
                // always recording/upload
                if (audioData.resource) {
                    audioData.file = getAudioLibraryFilePath(audioData.resource);
                    $scope.chooseAudio(audioData);
                } else {
                    aas.createAudioLibrary(audioData.file).then(function(library) {
                        if (library) {
                            audioData.resource = library;
                            $scope.chooseAudio(audioData);
                        }
                    });
                }
            };

            function handleAnnouncementAudio(audioData) {
                if (audioData.resource) { // existing audio file
                    audioData.file = getAudioLibraryFilePath(audioData.resource);
                    $scope.chooseAudio(audioData);
                } else if (!audioData.resource && audioData.file) {
                    // record/upload/synthesize audio file
                    aas.createAudioLibrary(audioData.file).then(function(library) {
                        if (library) {
                            audioData.resource = library;
                            handleAnnouncementAudio(audioData);
                        }
                    });
                }
            };

            function handleVoicemailAudio(audioData, voicemailSettings) {
                var fromLibrary = _.isString(audioData.file);
                var fromRecording = !fromLibrary && !audioData.resource;
                var fromVoicemail = audioData.resource && audioData.resource.voicemail_id;
                if (fromLibrary) {
                    var library = getLibraryFromFileUrl(audioData.file);
                    aas.createVoicemailFromLibraryAndVmSettings(library,
                            voicemailSettings)
                        .then(function(voicemail) {
                            if (voicemail) {
                                var display = aas.displayTransferOption(voicemail).display;
                                var message = "Voicemail " + display +
                                    " successfully created.";
                                $rootScope.showSuccessAlert(message, true);
                                audioData.resource = voicemail;
                                $scope.chooseAudio(audioData);
                            }
                        });
                } else if (fromRecording) {
                    aas.createAudioLibrary(audioData.file).then(function(library) {
                        if (library) {
                            $scope.chooseSelected(
                                getAudioLibraryFilePath(library),
                                voicemailSettings,
                                library
                            );
                        }
                    });
                } else if (fromVoicemail) {
                    var voicemail = audioData.resource;
                    var vmLibrary = aas.getVoicemailAudioLibrary(voicemail);
                    if (vmLibrary) { // voicemail has audio library
                        $scope.chooseAudio(audioData);
                    } else { // voicemail doesn't have audio library
                        aas.createAudioLibraryFromGreeting(voicemail.greetingData)
                            .then(function(library) {
                                if (library) {
                                    audioData.file = getAudioLibraryFilePath(
                                        library);
                                    $scope.chooseAudio(audioData);
                                }
                            });
                    }
                } else {
                    $scope.chooseAudio(audioData);
                }
            };

            $scope.saveRecording = function(recording) {
                if (!recording.name) { return; }
                if (requiresAddlOpts() && !$scope.voicemailSettings.fieldsAreValid()) {
                    touchVoicemailFields();
                    return;
                }
                $scope.selectedAudio = recording;
                $scope.uploading = true;
                $scope.cancelAddAudio();
                chooseSelected();
            };

            $scope.handleSelectedResource = function(resource) {
                $scope.selectedAudio = resource.greeting || getAudioLibraryFilePath(resource);
                $scope.selectedResource = resource;
                $scope.uploading = true;
                $scope.cancelAddAudio();
                chooseSelected();
            };

            function chooseSelected() {
                $scope.chooseSelected(
                    $scope.selectedAudio,
                    $scope.voicemailSettings,
                    $scope.selectedResource
                );
            };

            $scope.showVoicemailOpts = function() {
                return $scope.requiresAddlOpts ||
                    ($scope.selectedOpc && $scope.selectedOpc.name !== 'existing' &&
                        $scope.audioType === 'voicemail');
            };

            $scope.saveSynth = function(transcript, file, title) {
                audioLibraryService.createSynthesizedAudio({
                    transcript: transcript,
                    file: file,
                    file_title: title
                }) .then(function(library) {
                    if (library) {
                        $scope.handleSelectedResource(library);
                    }
                });
            };

            function initializeAudioType() {
                if ($scope.audioType === "voicemail") {
                    $scope.hasEmail = true;
                    $scope.hasPassword = true;
                    $scope.hasLocation = true;
                    var greetingVoicemailResources;
                    var resourceTableInfo = $scope.audioAction.resourceInfoFn();
                    var announceAct = $scope.announcementAction;
                    $scope.opcOpts = [{
                        name: "existing",
                        class: "fa fa-book",
                        cta: "Select existing Voicemail",
                        onSelect: function(lastOpc) {
                            $scope.$evalAsync(function() {
                                $scope.handleActionMessage =
                                    getExistingVoicemailActionMessage();
                                $scope.resourceTableInfo =
                                    resourceTableInfo;
                                $scope.triggerNewResource(null,
                                                          $scope.resourceTableInfo,
                                                          true);
                            });
                        },
                        onUnSelect: function() {
                            $scope.handleActionMessage = null;
                            $scope.resourceTableInfo = null;
                        }
                    }, {
                        name: "existing",
                        class: "fa fa-book",
                        requiresAddlOpts: true,
                        cta: "Choose From Your Audio Library and Create a New Voicemail",
                        onSelect: function(lastOpc) {
                            $scope.handleActionMessage =
                                getCreateVMFromLibraryActionMessage();
                            $scope.triggerNewResource(announceAct, null,
                                                      true);
                        },
                        onUnSelect: function() {
                            $scope.handleActionMessage = null;
                            $scope.resourceTableInfo = null;
                        }
                    }, {
                        name: "newrecord",
                        class: "fa fa-microphone",
                        requiresAddlOpts: true,
                        title: "Greeting",
                        cta: "Record and Create a New Voicemail"
                    }, {
                        name: "uploadfile",
                        requiresAddlOpts: true,
                        class: "fa fa-upload",
                        cta: "Upload an Audio File and Create a New Voicemail"
                    }, {
                        name: "synthesize",
                        class: "fa fa-microphone",
                        requiresAddlOpts: true,
                        cta: "Synthesize a voicemail greeting using text to speech."
                    }];
                } else if ($scope.audioType === "announcement") {
                    $scope.opcOpts = [{
                        name: "existing",
                        class: "fa fa-book",
                        cta: "Select an existing audio file"
                    }, {
                        name: "newrecord",
                        class: "fa fa-microphone",
                        cta: "Record a new audio file",
                        title: "Announcement"
                    }, {
                        name: "uploadfile",
                        class: "fa fa-upload",
                        cta: "Upload a new audio file"
                    }, {
                        name: "synthesize",
                        class: "fa fa-microphone",
                        cta: "Synthesize an audio file using text to speech."
                    }];
                } else if ($scope.audioType === "ivr-greeting") {
                    $scope.opcOpts = [{
                        name: "newrecord",
                        class: "fa fa-microphone",
                        cta: "Record a New Greeting",
                        title: "Greeting"
                    }, {
                        name: "uploadfile",
                        class: "fa fa-upload",
                        cta: "Upload an Audio File"
                    }, {
                        name: "synthesize",
                        class: "fa fa-microphone",
                        cta: "Synthesize a greeting using text to speech."
                    }];
                };
            };

            function registerResourceDependencies() {
                aas.registerResourceDependencies([{
                    scope: $scope,
                    targetName: "audioLibraries",
                    attachName: "audioLibraries"
                }]);
                ls.registerResourceDependencies([{
                    scope: $scope,
                    targetName: "locationGroups",
                    attachName: "locationGroups"
                }]);
            };

            function requiresAddlOpts() {
                return $scope.selectedOpc &&
                    $scope.selectedOpc.requiresAddlOpts && $scope.audioType === 'voicemail';
            };

            function voicemailFieldsAreValid() {
                return $scope.voicemailSettings && $scope.voicemailSettings.fieldsAreValid();
            };

            function getAudioLibraryFilePath(audioLibrary) {
                return symphonyConfig.audioUrl + audioLibrary.filepath;
            };

            function getLibraryFromFileUrl(fileUrl) {
                var filepath = fileUrl.split(symphonyConfig.audioUrl)[1];
                var library = _.find(aas.audioLibraries, {
                    filepath: filepath
                });
                return library;
            };

            function touchVoicemailFields() {
                if (!$scope.saveAttempted) {
                    $scope.saveAttempted = true;
                    $scope.voicemailSettings.touchFields();
                }
            };

            function getExistingVoicemailActionMessage() {
                return "Add this voicemail to the IVR.";
            };

            function getCreateVMFromLibraryActionMessage() {
                return "Create a voicemail with this audio file as the greeting.";
            };

            $scope.init();
        }
    };
});
