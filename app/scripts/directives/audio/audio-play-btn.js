'use strict';

proySymphony.component("audioPlayBtn", {
    templateUrl: "views/audio/audio-play-btn.html",
    transclude: {
        btnBody: "?btnBody",
        btnText: "?btnText"
    },
    bindings: {
        audioFile: "<",
        iconsOnly: "<?",
        contentsOnly: "<?",
        link: "<?"
    },
    controller: ["$transclude", "symphonyConfig", function($transclude, symphonyConfig) {
        var ctrl = this;

        ctrl.$onInit = function() {
            var btnBodyPresent = $transclude.isSlotFilled("btnBody") && !ctrl.iconsOnly;
            var btnTextPresent = $transclude.isSlotFilled("btnText") && !ctrl.iconsOnly;
            if (ctrl.contentsOnly) {
                ctrl.state = "contentsOnly";
            } else if (ctrl.iconsOnly) {
                ctrl.state = "iconsOnly";
            } else if (btnBodyPresent) {
                ctrl.state = "bodyOnly";
            } else {
                ctrl.state = "default";
            }
        };

        ctrl.registerEvalAsync = function($evalAsync) { ctrl.$evalAsync = $evalAsync; };

        ctrl.$onChanges = function(changes) {
            if (changes.link && changes.link.currentValue && !changes.link.previousValue) {
                ctrl.link.toggle = ctrl.toggle;
                ctrl.link.isPlaying = function() { return ctrl.playing; };
                ctrl.link.toggle = ctrl.toggle;
                ctrl.$onChanges = null;
            }
        };

        ctrl.toggle = function() { ctrl.playing ? ctrl.stopPlaying() : ctrl.play(); };

        ctrl.play = function() {
            if (typeof(ctrl.audioFile) === "string") {
                if (ctrl.audioFile.indexOf(symphonyConfig.audioUrl) > -1) {
                    ctrl.playing = new Audio(ctrl.audioFile);
                } else {
                    ctrl.playing = new Audio(symphonyConfig.audioUrl + ctrl.audioFile);
                }
            } else {
                var url = URL.createObjectURL(ctrl.audioFile);
                ctrl.playing = new Audio();
                ctrl.playing.src = url;
            }
            ctrl.playing.play();
            ctrl.playing.onended = function() {
                ctrl.stopPlaying();
            };
        };

        ctrl.stopPlaying = function() {
            ctrl.$evalAsync(function() {
                if (ctrl.playing) {
                    ctrl.playing.pause();
                    delete ctrl.playing;
                }
            });
        };

        ctrl.stateIs = function(state) { return state === ctrl.state; };

        ctrl.$onDestroy = function() { ctrl.stopPlaying(); };
    }]
});
