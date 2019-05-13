"use strict";

proySymphony.directive("maxlengthPhoneInput", function($filter, $browser, $timeout) {
    return {
        require: 'ngModel',
        link: function(scope, element, attr, ngModelCtrl) {

            // runs listener on initialize in case of pre-populated value
            $timeout(function() {
                listener();
            });

            element.bind('keydown', onKeyDown);
            element.bind('paste cut', onPasteOrCut);

            ngModelCtrl.$parsers.push(function(inputValue) {
                var viewValue = inputValue;
                viewValue = transformInput(viewValue);
                ngModelCtrl.$setViewValue(viewValue);
                ngModelCtrl.$render();
                return viewValue;
            });

            ngModelCtrl.$render = function() {
                element.val($filter('tel2')(ngModelCtrl.$viewValue, false));
            };

            function onKeyDown(event) {
                var key = event.keyCode;
                // Do nothing if CTRL, SHIFT, ALT, META or arrow keys.
                // Also allows for copy and paste
                if (key === 91 || key === 8 || (15 < key && key < 19) ||
                    (37 <= key && key <= 40)) {
                    return;
                }
                // Have to do this or changes don't get picked up properly
                $browser.defer(listener);
            };

            function onPasteOrCut() {
                $browser.defer(listener);
            };

            function transformInput(input) {
                var newInput = input;
                newInput = newInput.replace(/[^0-9]/g, '').slice(0, 10);
                if (newInput.length > 10) {
                    if (newInput.charAt(0) == '1') {
                        newInput = newInput.substring(1);
                    }
                    newInput = newInput.slice(0, 10);
                }
                return newInput;
            };

            function listener() {
                element.val($filter('tel2')(transformInput(element.val()), false));
            };
        }

    };
});
