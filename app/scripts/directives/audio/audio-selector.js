"use strict";

proySymphony.component("audioSelectorDos", {
    templateUrl: "views/audio/audio-selector.html",
    bindings: {
        settings: '=',
        user: '='
    },
    controller: ["dataFactory", "$timeout", "$rootScope", "ngAudio", "symphonyConfig", "$filter", function(dataFactory, $timeout, $rootScope, ngAudio, symphonyConfig, $filter) {
        var ctrl = this;

        ctrl.$onInit = function() {
            ctrl.selectTypeToTitle = {
                newrecord: "Record a New Message...",
                uploadfile: "Upload an Audio File...",
                audiolibrary: "Select from Audio Library...",
                messagetyped: "Type Your Message..."
            };
            // recording
            // recordingFile
            // robocallScheduleUuid
            // saveRecording()
            // selectFile()
            // settings: '=',
            // user: '='
            // audioLibraries
            // toggleEditGreeting()
            // onEditGreetingEnter()
            // updateEditGreeting()
            // getAudioLibraryByGreetingUuid()
            // uploadAudioFile()
            // closeLogout()
            // showPlayer
        };

        ctrl.setSelectType = function(type) {
            ctrl.selectType = type;
        };

        ctrl.getCurrentSelectType = function() {
            return ctrl.selectType;
        };

        ctrl.isCurrentSelectType = function(type) {
            return ctrl.getCurrentSelectType() === type;
        };

        ctrl.selectTypeChosen = function() {
            return Boolean(ctrl.getCurrentSelectType());
        };



        // -----------------------------------------------------------------
        // $timeout, $rootScope, dataFactory, ngAudio, symphonyConfig,
        // $filter, __env

        function loadAudioLibrary(ctrl) {
            dataFactory.getVoicemailGreetings(ctrl.user.id)
                .then(function(response) {
                    if (response.data.success) {
                        ctrl.audioLibraries = response.data.success.data;
                    }
                });
        }

        function saveScheduleEntry(data, index, ctrl) {
            data.user_uuid = ctrl.user.id;
            dataFactory.postUpdateRoboCallSchedule(data)
                .then(function(response) {
                    $rootScope.showalerts(response);
                }, function(error) {
                    $rootScope.alerts.push({
                        type: 'danger',
                        msg: 'Failure: ' + JSON.stringify(error)
                    });
                });
        }

        ctrl.audiopath = '/imported/freeswitch/storage/voicemail/default/';
        ctrl.init = function() {
            var audiopath = ctrl.audiopath;
            audiopath += ctrl.user.domain.domain_name + '/';
            if (ctrl.user.voicemail) {
                audiopath += ctrl.user.voicemail.voicemail_id + '/';
            }
            loadAudioLibrary(ctrl);
            ctrl.showPlayer = false;
            ctrl.audioFilePlaying = null;
        };

        if (ctrl.user) {
            ctrl.init();
        } else {
            ctrl.user = $rootScope.user;
            ctrl.init();
        };

        ctrl.selectFile = function(file) {
            ctrl.settings.voicemail_greeting = file.greeting_id;
            ctrl.isActive = true;
            var data = {
                greeting_id: file.greeting_id,
                voicemail_uuid: ctrl.user.voicemail.voicemail_uuid,
                user_uuid: ctrl.user.id
            };
            dataFactory.postSetGreetingId(data)
                .then(function(response) {
                    if (response.data.success) {
                        ctrl.settings.voicemail_greeting = file.greeting_id;
                        ctrl.user.voicemail.greeting_id = file.greeting_id;
                        ctrl.setSelectType(null);
                        $rootScope.showSuccessAlert(response.data.success.message);
                    }
                });
        };

        ctrl.getGreetingFilepath = function(filename) {
            return symphonyConfig.audioUrl + ctrl.audiopath + ctrl.user.domain.domain_name +
                '/' + ctrl.user.user_ext + '/' + filename;
        };

        ctrl.removeGreeting = function(file) {
            $rootScope.confirmDialog(
                "Are you sure you want to remove this greeting?")
                .then(function(response) {
                    if (response) {
                        ctrl.showingAlert = false;
                        dataFactory.getRemoveGreeting(file.voicemail_greeting_uuid)
                            .then(function(response) {
                                if (response.data.success) {
                                    ctrl.settings.voicemail_greeting =
                                        response.data.success.data;
                                    if (ctrl.user.voicemail) {
                                        ctrl.user.voicemail.greeting_id =
                                            response.data.success.data;
                                    }
                                    var index = $filter('getByUUID')(
                                        ctrl.audioLibraries, file.voicemail_greeting_uuid,
                                        'voicemail_greeting');
                                    if (index !== null) ctrl.audioLibraries
                                        .splice(index, 1);
                                }
                            });
                    } else {
                        ctrl.showingAlert = false;
                    }
                });
        };

        ctrl.uploadAudioFile = function(file) {
            var data = new FormData();
            data.append('recording', file);
            data.append('user_uuid', ctrl.user.id);
            data.append('voicemail_uuid', ctrl.user.voicemail.voicemail_uuid);
            dataFactory.postUploadGreeting(data)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.showSuccessAlert(response.data.success.message);
                        ctrl.settings.voicemail_greeting = response.data.success .data.greeting_id;
                        ctrl.user.voicemail.greeting_id = response.data.success.data.greeting_id + "";
                        ctrl.user.voicemailgreetings.push(response.data.success.data);
                        ctrl.setSelectType(null);
                        ctrl.showPlayer = true;
                        loadAudioLibrary(ctrl);
                        ctrl.errorMessage = "";
                    } else {
                        ctrl.errorMessage = response.data.error.message;
                    }
                });
        };

        ctrl.toggleEditGreeting = function(greeting, $event) {
            if (greeting.editing) {
                $timeout(function() {
                    greeting.editing = null;
                }, 100);
            } else {
                var input = angular.element($event.target).siblings().closest(
                    "input")[0];
                greeting.editing = true;
                var greetingName = greeting.greeting_name.split('.')[0];
                greeting.editing_greeting_name = greetingName;
                $timeout(function() {
                    input.focus();
                });
            }
        };

        ctrl.onEditGreetingEnter = function(greeting, $event) {
            $event.target.blur();
            ctrl.updateEditGreeting(greeting);
        };

        ctrl.updateEditGreeting = function(greeting) {
            var extension = "";
            if (greeting.greeting_name.indexOf(".") > -1) {
                var splits = greeting.greeting_name.split(".");
                extension = splits[splits.length - 1];
            }
            var greetingName = greeting.editing_greeting_name;
            if (extension.length > 0) {
                greetingName += "." + extension;
            }
            var greetingUuid = greeting.voicemail_greeting_uuid;
            var oldGreetingName = greeting.greeting_name;
            greeting.greeting_name = greetingName;
            dataFactory.updateVoicemailGreetingName(greetingUuid, greetingName)
                .then(function(response) {
                    if (response.data.success) {
                        var newGreeting = response.data.success.data;
                        greeting.greeting_name = newGreeting.greeting_name;
                    } else {
                        greeting.greeting_name = oldGreetingName;
                    }
                });
        };

    }]
});
