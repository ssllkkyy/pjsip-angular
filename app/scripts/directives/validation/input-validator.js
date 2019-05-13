'use strict';

var dirName = "inputValidator";
proySymphony.directive(dirName, function() {
    return {
        require: "ngModel",
        compile: function(element, attrs) {
            if (element[0].nodeName === "INPUT") {
                return function link($scope, element, attrs, ngModelCtrl) {
                    var regexInfo = attrs[dirName];
                    if (regexInfo && typeof(regexInfo === "string")) {
                        var regex = new RegExp(regexInfo);

                        function getValidInput(input) {
                            var allChars = input.slice("");
                            if (!Array.isArray(allChars)) {
                                allChars = [allChars];
                            }
                            for (var i = 0; i < allChars.length; i++) {
                                var char = allChars[i];
                                if (!regex.test(char)) {
                                    input = allChars.slice(0, i).join("");
                                    break;
                                }
                            };
                            return input;
                        };
                        ngModelCtrl.$parsers.push(function(inputValue) {
                            try {
                                var curVal = ngModelCtrl.$$rawModelValue;
                                if (!curVal && !getValidInput(inputValue)) {
                                    inputValue = curVal;
                                } else if (curVal && inputValue.length >
                                    curVal.length) {
                                    var input = inputValue.slice(curVal.length,
                                        inputValue.length);
                                    var validInput = getValidInput(input);
                                    inputValue = curVal + validInput;
                                }
                                var viewValue = inputValue || "";
                                ngModelCtrl.$setViewValue(viewValue);
                                ngModelCtrl.$render();
                                return inputValue;
                            } catch (exception) {
                                console.error(exception);
                                return inputValue;
                            }
                        });
                    }
                };
            };
            return null;
        }
    };
});
