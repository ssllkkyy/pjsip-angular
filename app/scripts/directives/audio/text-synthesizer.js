"use strict";

proySymphony.component("textSynthesizer", {
    templateUrl: "views/audio/text-synthesizer.html",
    bindings: {
        saveSynth: "&",
        transcript: "<?"
    },
    controller: ["audioLibraryService", function(audioLibraryService) {
        var ctrl = this;

        ctrl.$onInit = function() {
            ctrl.synthesize = synthesize;
            ctrl.save = save;
            if (ctrl.transcript) {
                ctrl.updating = true;
                ctrl.text = ctrl.transcript.transcript;
            }
            ctrl.lastText = ctrl.text;
        };

        function synthesize(text) {
            if (!text) {
                return;
            }
            ctrl.synthesizing = true;
            audioLibraryService.synthesizeTextToSpeech(text).then(function(synthFile) {
                ctrl.lastText = text;
                ctrl.file = synthFile;
                ctrl.synthesizing = false;
            });
        };

        function save(text, file) {
            ctrl.saveSynth({
                text: text,
                file: file
            });
            ctrl.file = null;
        };
    }]
});
