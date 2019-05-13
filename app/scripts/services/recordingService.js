'use strict';

proySymphony.service('recordingService', function($window) {
    var service = {
        audioChunks: [],
        recorder: null
    };

    service.initializeRecorder = function(mediaResponse) {
        service.recorder = new MediaRecorder(mediaResponse, {
            mimeType: 'audio/webm'
        });
        service.recorder.ondataavailable = function(e) {
            angular.copy([], service.audioChunks);
            service.audioChunks.push(e.data);
            if (service.recorder.state === "inactive") {
                var blob = new Blob(service.audioChunks, {
                    type: 'audio/webm'
                });
                var url = URL.createObjectURL(blob);
            }
            service.blob = blob;
            service.url = url;
        };
    };

    service.start = function() {
        service.recorder.start();
    };

    service.stop = function() {
        service.recorder.stop();
    };

    service.download = function(fileType, fileName) {
        if (!fileName) fileName = 'recording';
        if (!fileType) fileType = 'mp3';
        var a = document.createElement('a');
        a.href = service.url;
        a.download = fileName + '.' + fileType;
        a.click();
    };

    return service;
});
