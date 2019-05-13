'use strict';

window.cancelAnimationFrame = window.cancelAnimationFrame ||
    window.webkitCancelAnimationFrame ||
    window.mozCancelAnimationFrame;

window.requestAnimationFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame;

angular.module('kotterAudioRecorder', [
    'kotterAudioRecorder.config',
    'kotterAudioRecorder.services',
    'kotterAudioRecorder.controllers',
    'kotterAudioRecorder.directives'
]);
