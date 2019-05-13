'use strict';

proySymphony.service('chatMacroService', function(dataFactory, $rootScope) {

    var service = {
        chatMacros: [],
        showMainChannelSuggestionList: false,
        currentMessage: ''
    };
    $rootScope.chatMacroobj = {};
    service.addMacroToCollection = function(macro, collection) {
        var obj = {};
        var flag = false;
        if (collection.length == 0) {
            if (!obj[macro.hot_key_text]) {
                obj[macro.hot_key_text] = [];
            }
            obj[macro.hot_key_text].push(macro);
        } else {
            angular.forEach(collection, function(collect) {
                if (Object.keys(collect)[0] == macro.hot_key_text) {
                    collect[macro.hot_key_text].push(macro);
                    flag = true;
                }
            });
            if (!flag) {
                obj[macro.hot_key_text] = [];
                obj[macro.hot_key_text].push(macro);
            }
        }
        if (Object.keys(obj).length != 0) {
            collection.unshift(obj);
        }
    };

    service.getChatMacros = function() {
        if (service.getMacroHotKeys().length > 0) {
            return new Promise(function(resolve) {
                resolve(service.chatMacros);
            });
        } else {
            return service.loadChatMacros();
        }
    };

    service.loadChatMacros = function(domainUuid, persistData) {
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain_uuid;
        }
        if (persistData === undefined) {
            persistData = true;
        }
        return dataFactory.getChatMacrosByDomain(domainUuid).then(function(response) {
            if (response.data.success) {
                var macros = response.data.success.data;
                if (persistData) {
                    service.chatMacros = [];
                    angular.forEach(macros, function(macro) {
                        service.addMacroToCollection(macro, service.chatMacros);
                    });

                    angular.forEach(service.chatMacros, function(macros) {
                        $rootScope.chatMacroobj[Object.keys(macros)[0]] =
                            Object.values(macros)[0];
                    });
                    return service.chatMacros;
                } else {
                    return macros;
                }
            }
            return undefined;
        });
    };

    service.updateMacro = function(macro) {
        return dataFactory.postUpdateMacro(macro).then(function(response) {
            return response;
        });
    };

    service.createMacro = function(hotKeyText, textChoiceText, macroCollection, domainUuid) {
        if (macroCollection === undefined) {
            macroCollection = service.chatMacros;
        }
        if (domainUuid === undefined) {
            domainUuid = $rootScope.user.domain_uuid;
        }
        var data = {
            domain_uuid: domainUuid,
            hot_key_text: hotKeyText,
            text_choice_text: textChoiceText
        };
        dataFactory.postCreateChatMacro(data).then(function(response) {
            if (response.data.success) {
                var macro = response.data.success.data;
                service.addMacroToCollection(macro, macroCollection);
            }
        });
    };

    service.removeMacroFromCollectionByUuid = function(macroUuid, macroCollection) {
        var obj = {};

        angular.forEach(macroCollection, function(macroC) {
            obj[Object.keys(macroC)[0]] = Object.values(macroC)[0];
        });

        angular.forEach(obj, function(macroHotKey, hotKeyVal) {
            var macros = macroHotKey.filter(function(macro) {
                return !(macro.chat_macro_uuid === macroUuid);
            });

            if (macros.length === 0) {
                angular.forEach(service.chatMacros, function(chatmacro) {
                    if (Object.keys(chatmacro)[0] == hotKeyVal) {
                        $rootScope.index = service.chatMacros.indexOf(
                            chatmacro);
                    }
                });
                if ($rootScope.index > -1) {
                    service.chatMacros.splice($rootScope.index, 1);
                }
            } else {
                angular.copy(macros, macroHotKey);
            }
        });
        return true;
    };

    service.deleteMacro = function(macro, macroCollection) {
        if (macroCollection === undefined) {
            macroCollection = service.chatMacros;
        }
        dataFactory.getDeleteMacroByUuid(macro.chat_macro_uuid)
            .then(function(response) {
                if (response.data.success) {
                    service.removeMacroFromCollectionByUuid(macro.chat_macro_uuid,
                        macroCollection);
                }
            });
    };

    service.getMacroHotKeys = function() {
        angular.forEach(service.chatMacros, function(macros) {
            $rootScope.chatMacroobj[Object.keys(macros)[0]] = Object.values(
                macros)[0];
        });
        return Object.keys($rootScope.chatMacroobj);
    };

    service.getSuggestionsByHotKey = function(hotKey) {
        return $rootScope.chatMacroobj[hotKey].map(function(macro) {
            return macro.text_choice_text;
        });
    };

    service.textContainsMacroHotKey = function(text) {
        var word = text.split(' ').pop();
        var hotKeys = service.getMacroHotKeys();
        var result = false;
        angular.forEach(words, function(word) {
            if (hotKeys.includes(word)) {
                result = word;
            }
        });
        return result;
    };

    service.getSearchTextFromMessageByHotKey = function(hotKey, message) {
        var splits = message.split(' ').reverse();
        var hotKeyIndex = splits.indexOf(hotKey);
        return splits.slice(0, hotKeyIndex).reverse().join(' ');
    };

    service.findMatchingSuggestions = function(hotKey, curMessage) {
        var suggestions = service.getSuggestionsByHotKey(hotKey);
        var results = [];
        var searchText = service.getSearchTextFromMessageByHotKey(hotKey, curMessage);
        angular.forEach(suggestions, function(suggestion) {
            if (suggestion.indexOf(searchText) >= 0) {
                results.push(suggestion);
            }
        });
        return results.length > 0 ? results : null;
    };

    service.getMainChatCurMessageValue = function() {
        var textarea = angular.element('.chat-post-create-body').find('textarea');
        return textarea[0].value;
    };

    service.containsMatchingSuggestions = function(hotKey, curMessage) {
        return !!service.findMatchingSuggestions(hotKey, curMessage);
    };

    service.chatMacroTyped = function(curWord) {
        var hotKeys = service.getMacroHotKeys();
        if (hotKeys.includes(curWord)) {
            return true;
        }
        return false;
    };

    service.insertTextIntoMessage = function(hotKey, message, insertText) {
        var splits = message.split(' ').reverse();
        var hotKeyIndex = splits.indexOf(hotKey);
        message = splits.slice(hotKeyIndex + 1, splits.length).reverse().join(' ');
        if (message.trim().length > 0) {
            message += ' ' + insertText;
        } else {
            message += insertText;
        }
        return message;
    };

    service.getChatMacroHotKeys = function(scope) {
        if (scope.macrosListData) {
            return _.map(scope.macrosListData.macros, function(macro) {
                function notHashKey(key) {
                    return key !== "$$hashKey";
                }
                return Object.keys(macro).filter(notHashKey)[0];
            });
        }
        return null;
    };

    service.selectMacroSelection = function(scope, inputElement, opts) {
        if (!opts) {
            opts = {};
        };
        if (!inputElement) {
            inputElement = scope.mainSmsInput ? scope.mainSmsInput : null;
        };
        var suggestion = opts.suggestion;
        var index = opts.index ? opts.index : scope.macrosListData.selectedIndex;
        var text = suggestion.text_choice_text;
        var value = inputElement.value;
        var keyIndex = value.split(' ').reverse().indexOf(suggestion.hot_key_text);
        var reversed = value.split(' ').reverse();
        var newVal = reversed.slice((keyIndex + 1), reversed.length).reverse().join(' ') +
            ' ' + text + ' ';
        inputElement.value = newVal;
        scope.showMacrosList = false;
    };

    service.updateHotKeyText = function(hotKeyText, newHotKeyText) {
        function matchingMacro(macro) {
            return Boolean(macro[hotKeyText]);
        }
        var macro = _.find(service.chatMacros, matchingMacro)[hotKeyText][0];
        var data = {
            chat_macro_uuid: macro.chat_macro_uuid,
            hot_key_text: newHotKeyText
        };
        if (macro) {
            return dataFactory.postUpdateHotKeyText(data).then(function(response) {
                if (response.data.success) {
                    service.updateMacroGroupHotKeyText(hotKeyText,
                        newHotKeyText, service.chatMacros);
                    return true;
                }
                return false;
            });
        }
    };

    service.updateMacroGroupHotKeyText = function(oldHotKey, newHotKey, macroCollection) {
        function matchingMacro(macro) {
            return Boolean(macro[oldHotKey]);
        }
        var macroGroup = _.find(macroCollection, matchingMacro);
        var macros = macroGroup[oldHotKey];

        function updateMacroHotKey(macro) {
            macro.hot_key_text = newHotKey;
        }
        macros.forEach(updateMacroHotKey);
        macroGroup[newHotKey] = macroGroup[oldHotKey];
        delete macroGroup[oldHotKey];
    };

    return service;
});
