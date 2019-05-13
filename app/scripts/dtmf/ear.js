'use strict';
var Ear = (function() {
    // Enum
    var Ear = function(options) {
        this.ctx = new AudioContext();
        this.threshold = options.threshold || -50;
        this.decay = options.decay || 10;
        this.last = '';

        var Nt, Fs = this.ctx.sampleRate;

        if (options.samples) {
            // Nearest power of 2
            Nt = 1 << Math.ceil(Math.log(options.samples) / Math.log(2));
        } else {
            Nt = 2048;
        }

        navigator.getUserMedia({
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            }
        }, (function(stream) {
            this.mediaStreamSource = this.ctx.createMediaStreamSource(
                stream);

            // Connect the stream to the analyser.
            this.analyser = this.ctx.createAnalyser();

            this.analyser.fftSize = Nt;

            this.bufSize = this.analyser.frequencyBinCount;
            this.buffer = new Float32Array(this.bufSize);

            this.mediaStreamSource.connect(this.analyser);

            // Find bands more suited to FFT sample size and audio sampling rate
            // Computes the indices of the FFT to "listen" on
            this.indices = _.chain(options.bands)
                // Convert bands to indices
                .map(function(band) {

                    var k = Math.round(band.freq / Fs * Nt);
                    var new_freq = Math.round(k * Fs / Nt);
                    // i = (2 f n)/F_s and F_s !=0 and n!=0
                    return Math.round((2 * new_freq * this.bufSize) /
                        this.ctx.sampleRate);
                }, this)
                // Remove duplicate indices
                .uniq()
                // Map the indices to their target frequencies
                .zip(_.pluck(options.bands, 'freq'))
                // Convert paired arrays to object
                .object()
                .value();

            // Assertion
            if (_.keys(this.indices).length !== options.bands.length) {
                throw new Error('Not enough samples');
            }


            this.analyse();
        }).bind(this), function(error) {
            // Error handler
            switch (error.name) {
                case 'PermissionDeniedError':
                    console.error('User denied permssion');
                    break;
                default:
                    console.error(error);
                    break;
            }
        });
    };

    Ear.prototype.getPeaks = function(buffer, context) {
        var max = -1000; // Sufficiently negative number
        var peaks = {}; // Sparse array

        for (var i = 0; i < buffer.length; ++i) {
            // Find max in the same loop
            if (buffer[i] > max) max = buffer[i];

            if (buffer[i] > this.threshold) {
                // Large enough peak
                peaks[i] = buffer[i];
            }
        }

        // Filter out peaks that aren't near the maximum
        peaks = _.pick(peaks, function(amplitude) {
            // Less than error
            return (max - amplitude) < 1.0;
        });

        return peaks;
    };

    Ear.prototype.getPeak = function(buffer, context) {
        var max = -1000,
            index = -1;

        // Find the maximum of the signal
        for (var i = 0; i < buffer.length; ++i) {
            if (buffer[i] > max) {
                max = buffer[i];
                index = i;
            }
        }

        // If a large enough peak was found
        if (max > this.threshold) {
            return (context.sampleRate / 2) / buffer.length * index;
        }
        return null;
    };

    var bewteen = function(value, a, b) {
        return (value <= b) && (value >= a);
    };

    Ear.prototype.getBand = function(frequency) {
        var start = 10000,
            width = 500,
            i;

        if (frequency) {
            // Find band that this frequency belongs to
            for (var band in this.bands) {
                if (this.bands.hasOwnProperty(band) && this.bands[band].contains(
                        frequency)) {
                    var key = String.prototype.toUpperCase.call(band);
                    if (key in Band) return Band[key];
                }
            }
        }

        // NO BAND
        return 0;
    };

    Ear.prototype.start = function(handler) {
        this.onstart = handler;
    };

    Ear.prototype.end = function(handler) {
        this.onend = handler;
    };

    // TODO: Make members
    var bit = false,
        idle = true,
        data = '';
    Ear.prototype.handler = function(buffer, analyser, context) {
        var freq = this.getPeak(buffer, context);
        var band = this.getBand(freq);

        //console.log(band);
    };

    Ear.prototype.analyse = function() {
        // Get current waveform for analysis
        this.analyser.getFloatFrequencyData(this.buffer);
        var threshold = this.threshold;

        //console.log(this.getPeaks(this.buffer, this.ctx));

        // Check for noise
        // Set new threshold to greater than noise baseline
        // TODO: Do this for more bands
        if (this.buffer[0] > threshold) {
            threshold = this.buffer[0] + 10;
        }

        // Only get the indices specified
        var extract = _.filter(this.buffer, function(amp, index) {
            return index in this.indices;
        }, this);

        var keyed = _.object(_.zip(_.keys(this.indices), extract));

        var max = _.max(extract);


        var peaks = _.omit(keyed, function(amplitude) {
            return amplitude < threshold;
        });

        // Remove peaks that aren't near the max
        peaks = _.pick(peaks, function(amplitude) {
            // Less than error
            return (max - amplitude) < 5.0;
        });

        var result = _.map(peaks, function(amplitude, index) {
            return [this.indices[index], this.buffer[index]];
        }, this);

        // We must read exactly TWO frequencies to map the button
        if (result.length >= 2) {
            // Delegate to consumer defined callback
            if (this.callback) {
                if (max < threshold + this.decay) {
                    // If the peak is decaying, fire the callback with no arguments to indicate silence
                    // This fixes the debouncing issue
                    this.callback(null)
                } else {
                    // Otherwise, just fire the callback

                    this.callback(_.object(result));
                }
            }
        } else if (result.length == 0) {
            // "Silence"
            if (this.callback) this.callback(null);
        }

        // Register callback for next "animation" frame
        // Save the callback ID so we can cancel this if need be
        // Bind the function to preserve 'this'
        this.animationFrameCallback = requestAnimationFrame(this.analyse.bind(this));
    };

    Ear.prototype.teardown = function() {
        if (this.animationFrameCallback) {
            cancelAnimationFrame(this.animationFrameCallback);
        }
    };

    return Ear;
})();
