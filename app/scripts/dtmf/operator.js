proySymphony.factory('OperatorSvc', function($rootScope, DialerSvc) {
        var freqs = [].concat(DialerSvc.rows, DialerSvc.cols);

        var bands = _.map(freqs, function(freq) {
            return new Band(freq, 50);
        });

        var ear = new Ear({
            bands: bands,
            samples: 2048,
            threshold: -60,
            decay: 5
        });

        var lastPressed = '',
            currentPressed = '',
            listening = false;

        ear.callback = function(freqs) {
            //console.log(freq1, freq2);


            if (freqs === null) {
                // This allows two of the same number to be dialed consecutively
                lastPressed = '';
                return;
            } else {
                // Split into row and column frequencies
                var rows = {},
                    cols = {};
                _.forEach(freqs, function(amp, freq) {
                    freq = parseInt(freq);
                    var rowIndex = DialerSvc.rows.indexOf(freq),
                        colIndex = DialerSvc.cols.indexOf(freq);

                    if (rowIndex !== -1) {
                        rows[rowIndex] = amp;
                    } else if (colIndex !== -1) {
                        cols[colIndex] = amp;
                    }
                });

                // Sort by amplitude and key and array of rows and column indices (from frequencies above)
                var sorter = function(amp) {
                    return amp;
                };
                var wrapper = _(rows).pairs().sortBy(sorter).pluck(0);
                cols = wrapper.plant(cols).value();
                rows = wrapper.value();

                // Get the loudest of the frequencies
                // Object keys are strings, convert to int
                var row = parseInt(rows[0]),
                    col = parseInt(cols[0]);

                currentPressed = DialerSvc.pad[row][col];
            }

            //console.log(currentPressed, currentPressed)

            if (lastPressed !== currentPressed) {
                // New button pressed
                if (listening && currentPressed) {
                    $rootScope.$broadcast('received', currentPressed);
                }
                lastPressed = currentPressed;

            }
        };

        return {
            setListening: function(newValue) {
                listening = newValue;
            },
            getListening: function() {
                return listening;
            }

        };
    })
    .controller('OperatorCtrl', function($rootScope, $scope, OperatorSvc) {
        $scope.received = '';

        OperatorSvc.setListening(true);

        $rootScope.$on('received', function(e, key) {
            $scope.$apply(function() {
                $scope.received += key;
            });
        });

        $rootScope.$on('reset', function(e, key) {
            $scope.received = '';
        });
    });
