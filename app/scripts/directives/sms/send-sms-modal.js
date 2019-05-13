'use strict';

proySymphony.directive('sendSmsModal', function($rootScope, chatMacroService) {
    return {
        restrict: 'E',
    templateUrl: 'views/sms/send-sms-modal.html',
        scope: {
            data: '=',
            closeModal: '&'
        },
        link: function($scope, element, attributes) {
            $scope.closeModal = $scope.closeModal();
            $scope.contactSelectionType = "sms";
            $scope.sendSmsTop = function(data) {
                var numbers = [];
                var contactNumbersSelected = $rootScope.contactsSelected.map(
                    function(selected) {
                        return selected.contact_mobile_number;
                    });
                numbers = numbers.concat(contactNumbersSelected).filter(Boolean);
                if (numbers.length) {
                    numbers.forEach(function(number) {
                        $rootScope.sendSmsTop({
                            message: data.message,
                            smsnumber: number
                        });
                    });
                } else {
                    $scope.toggleNoRecipientError();
                }
            };
            $scope.toggleNoRecipientError = function() {
                var searchContainer = angular.element(".contact-search-container")[
                    0];
                if ($scope.showNoRecipientError) {
                    searchContainer.style.border = "";
                    $scope.showNoRecipientError = false;
                } else {
                    searchContainer.style.border = "1px solid red";
                    $scope.showNoRecipientError = true;
                }
            };
            $scope.mainSmsInput = angular.element("#smsInput")[0];
            $scope.mainSmsInput.onkeydown = onKeyDown;
            angular.element("#smsInput").text($scope.data.message);
            $scope.$watch(function() {
                    return $rootScope.contactsSelected.length;
                },
                function(newVal, oldVal) {
                    if ($scope.showNoRecipientError && newVal) {
                        $scope.toggleNoRecipientError();
                    }
                });
            chatMacroService.getChatMacros().then(function(response) {
                if (response) {
                    $scope.macrosListData = {
                        macros: response,
                        selectedIndex: 0,
                        element: null,
                        scope: $scope,
                        select: function(index, suggestion) {
                            var scope = this.scope;
                            var element = this.element;
                            chatMacroService.selectMacroSelection(
                                scope, element, {
                                    index: index,
                                    suggestion: suggestion
                                }
                            );
                        }
                    };
                }
            });

            function onKeyDown(e) {
                // user is typing in all cases
                if (e.key === "Enter") {
                    if ($scope.showMacroList) {
                        var listData = $scope.macrosListData;
                        var opts = {
                            suggestion: listData.suggestions[listData.selectedIndex],
                            index: listData.selectedIndex
                        };
                        $scope.$evalAsync(function() {
                            $scope.showMacroList = false;
                        });
                        chatMacroService.selectMacroSelection($scope, $scope.mainSmsInput,
                            opts);
                        return false;
                    } else {
                        $scope.data.message = $scope.mainSmsInput.value;
                        $scope.sendSmsTop($scope.data);
                        return false;
                    }
                } else if ((e.which === 38 || e.which === 40) && $scope.showMacroList) {
                    var direction = e.which === 38 ? "up" : "down";
                    var currentTotal = $scope.macrosListData.macros.length;
                    var selectedIndex = $scope.macrosListData.selectedIndex;
                    $scope.$evalAsync(function() {
                        if (direction === "up") {
                            if (!(selectedIndex - 1 < 0)) {
                                $scope.macrosListData.selectedIndex -= 1;
                            }
                        } else {
                            if (!(selectedIndex > (currentTotal - 1))) {
                                $scope.macrosListData.selectedIndex += 1;
                            }
                        }
                    });
                    return false;
                } else {
                    var value = $scope.mainSmsInput.value;
                    var splits = value.split(' ');
                    var macros = $scope.macrosListData.macros;
                    var hotKeys = chatMacroService.getChatMacroHotKeys($scope);
                    var searchTerm = splits[splits.length - 1];
                    if (e.key.length === 1) {
                        searchTerm += e.key;
                    } else if (e.key === "Backspace") {
                        $scope.$evalAsync(function() {
                            $scope.showMacroList = false;
                        });
                        searchTerm = searchTerm.slice(0, searchTerm.length - 1);
                    }
                    if (e.which === 27) {
                        $scope.$evalAsync(function() {
                            $scope.showMacroList = false;
                        });
                        return false;
                    }
                    var hotKey;
                    var macro;
                    var suggestions;
                    for (var i = 0; i < hotKeys.length; i++) {
                        hotKey = hotKeys[i];
                        if (searchTerm.indexOf(hotKey) > -1) {
                            macro = macros[i];
                            suggestions = macro[Object.keys(macro)[0]];
                            $scope.macrosListData.suggestions = suggestions;
                        }
                    }
                    if (suggestions && suggestions.length > 0) {
                        $scope.$evalAsync(function() {
                            $scope.showMacroList = true;
                        });
                    } else {
                        $scope.$evalAsync(function() {
                            $scope.showMacroList = false;
                        });
                    }
                }
                return true;
            }
        }
    };
});
