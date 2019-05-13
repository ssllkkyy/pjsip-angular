'use strict';

proySymphony.factory('DialerSvc', function($rootScope) {
    var value = '';

    var pad = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['*', '0', '#']
    ];

    //        var pad = [
    //            ['1', '2', '3', 'A'],
    //            ['4', '5', '6', 'B'],
    //            ['7', '8', '9', 'C'],
    //            ['*', '0', '#', 'D']
    //        ];

    // Generate lookup table
    var lut = {};
    for (var row = 0; row < pad.length; ++row) {
        for (var col = 0; col < pad[row].length; ++col) {
            lut[pad[row][col]] = {
                row: row,
                col: col
            }
        }
    }

    var tone = new Tone();
    var tones = {};

    var rowDelta = [73, 82, 89],
        colDelta = [127, 141, 156];

    var computeFromDelta = function(start, deltas) {
        start = Math.round(start);

        var out = [start];
        for (var i = 0; i < deltas.length; ++i) {
            out[i + 1] = out[i] + deltas[i];
        }
        return out;
    };

    return {
        pad: pad,
        rows: computeFromDelta(697, rowDelta), // 697
        cols: computeFromDelta(1209, colDelta), // 1209

        stop: function(key) {
            if (key in tones) {
                tones[key].forEach(function(osc) {
                    osc.stop();
                });
                delete tones[key];
            }
        },

        play: function(key, duration, when) {
            when = when || 0;
            duration = duration || undefined;

            // Save the oscillators so that they can be stopped
            tones[key] = [
                tone.start(this.resolve(key)[0], duration, when),
                tone.start(this.resolve(key)[1], duration, when)
            ];
        },

        press: function(key) {
            value += key;
            $rootScope.$broadcast('dial');
            this.stop(key);
            this.play(key);
        },

        release: function(key) {
            this.stop(key);
        },

        dial: function() {
            // ITU minimum duration
            var when = 0,
                gap = 100 / 1000,
                duration = 40 / 1000;
            for (var i = 0; i < value.length; ++i) {
                this.play(value[i], duration, when);
                when += gap + duration;
            }
        },

        reset: function() {
            value = '';
            $rootScope.$broadcast('dial');
        },

        getNumber: function() {
            return value;
        },

        resolve: function(key) {
            var row = lut[key].row,
                col = lut[key].col;
            return [this.rows[row], this.cols[col]];
        },

        getFrequencies: function() {
            var out = [];
            for (var i = 0; i < value.length; ++i) {
                out.push(this.resolve(value.charAt(i)));
            }
            return out;
        }
    };
});
