'use strict';

proySymphony.directive('datepicker', function($window, $location) {
    return {
        restrict: 'E',
        templateUrl: 'views/datepicker/datepicker.html',
        scope: {
            model: '=',
            onChange: '&', // optional
            dateDisabled: '&',
            withoutIcon: '<?',
            withMemory: '<?'
        },
        link: function($scope, element, attributes) {
            function getLSDPKey() {
                var val = "datepicker-" + $location.path();
                if ($scope.withMemory && $scope.withMemory !== true) {
                    val += "-" + $scope.withMemory;
                }
                return val;
            }
            if ($scope.withMemory) {
                var date = $window.localStorage.getItem(getLSDPKey());
                if (date) {
                    date = new Date(date);
                    $scope.model = date;
                }
            }
            $scope.onChange = $scope.onChange();
            $scope.state = {
                dateOptions: {
                    formatYear: 'yy',
                    maxDate: tomorrowAtTwelveAm(),
                    minDate: new Date(2016, 5, 22),
                    startingDay: 1,
                    dateDisabled: $scope.dateDisabled()
                },
                picker: {
                    opened: false,
                    date: $scope.model ? $scope.model : tomorrowAtTwelveAm(),
                    open: function() {
                        this.opened = true;
                    }
                }
            };

            function tomorrowAtTwelveAm() {
                return moment().hours(24).minutes(0).seconds(0).toDate();
            }

            $scope.$watch('state.picker.date', function(newVal, oldVal) {
                $scope.model = newVal;
                if ($scope.withMemory) {
                    $window.localStorage.setItem(getLSDPKey(), newVal);
                }
                if ($scope.onChange) {
                    $scope.onChange(newVal);
                }
            });
        }
    };
});
