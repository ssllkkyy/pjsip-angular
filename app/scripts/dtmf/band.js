'use strict';
var Band = (function() {
    var Band = function(frequency, width) {
        this.min = frequency - (width / 2);
        this.max = frequency + (width * 2);
        this.freq = frequency;
        this.width = width;
    };

    Band.prototype.contains = function(frequency) {
        return (frequency >= this.min) && (frequency <= this.max);
    };

    return Band;
})();
