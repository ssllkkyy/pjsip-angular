'use strict';

proySymphony.directive("audioRecorder", function(fileService) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/audio-recorder.html",
        scope: {
            title: "<",
            saveRecording: "&"
        },
        link: function($scope, element, attributes) {

            var touchFields;
            $scope.selectAudioFile = function(options) {
                if (options.registerTouchFn) {
                    touchFields = options.registerTouchFn;
                } else {
                    var description = options.description;
                    var recording = options.recording;
                    if (!recording) {
                        return;
                    }
                    if (!description) {
                        touchFields();
                        return;
                    }
                    recording = fileService.blobToFile(
                        recording,
                        description, {
                            type: recording.type
                        }
                    );
                    $scope.saveRecording({
                        recording: recording
                    });
                }
            };

        }
    };
});
