'use strict';

proySymphony.directive('quotesheetModalChat', function($window, $rootScope, quoteSheetService,
    usefulTools, chatMessages, $timeout, newChatService, metaService, _, chatMacroService,
    FileUploader, symphonyConfig, $cookies, fileService, $q) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/quotesheet-modal-chat.html',
        scope: {
            assignedTo: '=',
            peopleList: '=',
            fns: '<',
            initialValue: '='
        },
        link: function($scope, element, attributes) {
            $scope.memberAssigned = $scope.assignedTo || {};
            $scope.peopleListData = $scope.peopleList || {};
            $scope.fns.mainChatInput = angular.element('#chatInput')[0];
            if ($scope.initialValue) {
                $timeout(function() {
                    angular.element("#chatInput")[0].value = $scope.initialValue;
                    angular.element("#chatInput")[0].rows = 8;
                }, 500);

            }

            function init() {
                if (quoteSheetService.defaultChatChannel) {
                    function isDefaultChannel(item) {
                        return item.id == quoteSheetService.defaultChatChannel;
                    }
                    $scope.defaultChatChannel = _.find(newChatService.publicChannels,
                        isDefaultChannel);
                }
                $scope.chatData = newChatService.publicData;
                $scope.keyPressChatFns = $scope.getKeyPressChatFns($scope);
            };

            function sendMessageRead() {
                newChatService.sendPostWithFiles()
                    .then(function(response) {
                        if (__env.enableDebug) console.log(response);
                    });
            }

            $scope.getKeyPressChatFns = function(scope) {
                return {
                    onKeyDown: { // use when you want to access the element value before it is changed
                        bareEnter: function(e, childScope) {
                            // send post and prevent default
                            e.stopImmediatePropagation();
                            e.preventDefault();
                            scope.$evalAsync(function() {
                                if (scope.showPeopleList || scope.showChannelList) {
                                    newChatService.selectCurrentSelection(
                                        scope, childScope.element);
                                } else if (scope.showMacrosList) {
                                    var listData = scope.macrosListData;
                                    var opts = {
                                        suggestion: listData.suggestions[
                                            listData.selectedIndex
                                        ],
                                        index: listData.selectedIndex
                                    };
                                    newChatService.selectMacroSelection(
                                        scope, childScope.element,
                                        opts);
                                } else {
                                    if (!$scope.initialValue) childScope
                                        .doSendPost();
                                }
                            });
                        },
                        shiftEnter: function(e, childScope) {
                            // do nothing (allow enter to take place)
                        },
                        at: function(e, childScope) {
                            // if people-list is closed, open it. if it's open, this is part of search string
                            var charPosition = usefulTools.doGetCaretPosition(e
                                .target);
                            if (charPosition === 0 || (e.target.value.length >
                                    0 && e.target.value.substr(e.target.value.length -
                                        1, 1) === ' ')) {
                                e.stopImmediatePropagation();
                                scope.$evalAsync(function() {
                                    scope.showPeopleList = true;
                                });
                            }
                        },
                        hash: function(e, childScope) {
                            // if channel-list is closed, open it. if it's closed, this is part of search string
                            var charPosition = usefulTools.doGetCaretPosition(e
                                .target);
                            if (charPosition === 0 || (e.target.value.length >
                                    0 && e.target.value.substr(e.target.value.length -
                                        1, 1) === ' ')) {
                                e.stopImmediatePropagation();
                                scope.$evalAsync(function() {
                                    scope.showChannelList = true;
                                });
                            }
                        },
                        tab: function(e, childScope) {
                            // if either list is open, choose the current suggestion. otherwise, do nothing
                            e.stopImmediatePropagation();
                            e.preventDefault();
                            if (scope.showPeopleList || scope.showChannelList) {
                                newChatService.selectCurrentSelection(scope,
                                    childScope.element);
                            } else if (scope.showMacrosList) {
                                var listData = scope.macrosListData;
                                var opts = {
                                    suggestion: listData.suggestions[
                                        listData.selectedIndex],
                                    index: listData.selectedIndex
                                };
                                newChatService.selectMacroSelection(scope,
                                    childScope.element, opts);
                            }
                        },
                        esc: function(e, childScope) {
                            // if either list is open, close it. otherwise, do default
                            scope.$evalAsync(function() {
                                scope.showChannelList = false;
                                scope.showPeopleList = false;
                                scope.showMacrosList = false;
                            });
                        },
                        spc: function(e, childScope) {
                            // if either list is open, close it. in either case, do default too
                            scope.$evalAsync(function() {
                                scope.showChannelList = false;
                                scope.showPeopleList = false;
                                scope.showMacrosList = false;
                            });
                        },
                        up: function(e, childScope) {
                            // if a list is open, decrement the position of the highlight. otherwise do nothing
                            e.stopImmediatePropagation();
                            scope.$evalAsync(function() {
                                if (scope.showPeopleList) {
                                    var currentTotal = scope.peopleListData
                                        .people.length;
                                    var selectedIndex = scope.peopleListData
                                        .selectedIndex;
                                    if (!(selectedIndex - 1 < 0)) {
                                        scope.peopleListData.selectedIndex -=
                                            1;
                                    }
                                } else if (scope.showChannelList) {
                                    var currentTotal = scope.channelListData
                                        .channels.length;
                                    var selectedIndex = scope.channelListData
                                        .selectedIndex;
                                    if (!(selectedIndex - 1 < 0)) {
                                        scope.channelListData.selectedIndex -=
                                            1;
                                    }
                                } else if (scope.showMacrosList) {
                                    var currentTotal = scope.macrosListData
                                        .macros.length;
                                    var selectedIndex = scope.macrosListData
                                        .selectedIndex;
                                    if (!(selectedIndex - 1 < 0)) {
                                        scope.macrosListData.selectedIndex -=
                                            1;
                                    }
                                }
                            });
                        },
                        down: function(e, childScope) {
                            // if a list is open, increment the position of the highlight. otherwise do nothing
                            e.stopImmediatePropagation();
                            scope.$evalAsync(function() {
                                if (scope.showPeopleList) {
                                    var currentTotal = scope.peopleListData
                                        .people.length;
                                    var selectedIndex = scope.peopleListData
                                        .selectedIndex;
                                    if (!(selectedIndex + 1 > (
                                            currentTotal - 1))) {
                                        scope.peopleListData.selectedIndex +=
                                            1;
                                    }
                                } else if (scope.showChannelList) {
                                    var currentTotal = scope.channelListData
                                        .channels.length;
                                    var selectedIndex = scope.channelListData
                                        .selectedIndex;
                                    if (!(selectedIndex + 1 > (
                                            currentTotal - 1))) {
                                        scope.channelListData.selectedIndex +=
                                            1;
                                    }
                                } else if (scope.showMacrosList) {
                                    var currentTotal = scope.macrosListData
                                        .suggestions.length;
                                    var selectedIndex = scope.macrosListData
                                        .selectedIndex;
                                    if (!(selectedIndex + 1 > (
                                            currentTotal - 1))) {
                                        scope.macrosListData.selectedIndex +=
                                            1;
                                    }
                                }
                            });
                        },
                        backspace: function(e, childScope) {
                            var lastTypedChar = childScope.element.value.split(
                                '').pop();
                            scope.$evalAsync(function() {
                                if (scope.showPeopleList) {
                                    if (lastTypedChar === '@') {
                                        scope.showPeopleList = false;
                                    }
                                } else if (scope.showChannelList) {
                                    if (lastTypedChar === '#') {
                                        scope.showChannelList = false;
                                    }
                                } else if (scope.showMacrosList) {

                                }
                            });
                        },
                        always: function(e, childScope) {
                            // user is typing in all cases
                            // $scope.onUserIsTyping(childScope.channel());
                            var value = childScope.element.value;
                            var splits = value.split(' ');
                            var macros = scope.macrosListData.macros;
                            var hotKeys = chatMacroService.getChatMacroHotKeys(
                                scope);
                            var searchTerm = splits[splits.length - 1];
                            var hotKey;
                            for (var i = 0; i < hotKeys.length; i++) {
                                hotKey = hotKeys[i];
                                if (searchTerm.indexOf(hotKey) > -1) {
                                    scope.showMacrosList = true;
                                    var macro = macros[i];
                                    var suggestions = macro[Object.keys(macro)[
                                        0]];
                                    scope.macrosListData.suggestions =
                                        suggestions;
                                }
                            }
                        },
                        noRelevant: function(e, childScope) {

                        }
                    },
                    onKeyUp: { // use when you want to access the element value after it is changed
                        always: function(e, childScope) {
                            scope.$evalAsync(function() {
                                childScope.setInProgress(childScope.element
                                    .value);
                                if (scope.showPeopleList &&
                                    newChatService) {
                                    function isValidPerson(person) {
                                        var searchTerm =
                                            newChatService.findSearchTermFromElementByKey(
                                                childScope.element, '@'
                                            );
                                        return person.username.indexOf(
                                            searchTerm) > -1;
                                    }
                                    var people = newChatService.getPeopleForList()
                                        .filter(isValidPerson);
                                    scope.peopleListData.people =
                                        people;
                                    if (scope.peopleListData.selectedIndex >
                                        (people.length - 1)) {
                                        scope.peopleListData.selectedIndex =
                                            0;
                                    }
                                }
                            });
                        },
                        noRelevant: function(e) {}
                    },
                    onPaste: function(e, childScope) {
                        // newChatService.handlePaste(e, uploader);
                    }
                };
            };

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
                            newChatService.selectMacroSelection(scope,
                                element, {
                                    index: index,
                                    suggestion: suggestion
                                });
                        }
                    };
                }
            });

            newChatService.registerChatEventCallback('teamMembersLoaded', function() {
                $scope.peopleListData = {
                    people: newChatService.getPeopleForList(),
                    selectedIndex: 0,
                    element: null,
                    scope: $scope,
                    select: function(index) {
                        var scope = this.scope;
                        var element = this.element;
                        newChatService.selectCurrentSelection(scope,
                            element, index);
                    }
                };
            });

            $scope.fns.sendPost = function(inputElement, channel, opts) {
                if (!opts.uploader && inputElement === $scope.fns.mainChatInput) {
                    opts.uploader = uploader;
                };
                if ($scope.metaData) {
                    opts.metaData = $scope.metaData;
                };
                $scope.metaData = opts.metaData;
                $scope.uploadChannel = channel;
                if(inputElement.value == "") {
                    inputElement.value = "Thank you.";
                }
                return newChatService.handleSendPost(inputElement, channel, opts);
            };

            var mmBaseUrl = (__env.mmUrl && __env.mmUrl != '' ? __env.mmUrl :
                symphonyConfig.chatUrl);
            var uploader = new FileUploader({
                url: mmBaseUrl + '/files',
                alias: 'files',
                removeAfterUpload: true,
                headers: {
                    'Authorization': 'Bearer ' + $cookies.get('accessToken')
                },
                transformRequest: angular.identity
            });

            $scope.fns.registerUploader = function(uploader) {
                data.uploader = uploader;
                var id = 0;
                if (data.files) {
                    data.files.forEach(function(file) {
                        file.id = id;
                        data.uploader.addToQueue(file);
                        data.uploader.queue[id].file.id = id;
                        id++;
                    });
                }
            };

            $scope.uploader = uploader;

            $scope.$watch('uploader.queue.length', function(newValue, oldValue) {
                var remainingFileIds = $scope.uploader.queue.map(function(
                    fileItem) {
                    return fileItem.file.id;
                });
                //$scope.fns.updateFiles(remainingFileIds);
                if (newValue > 0) {
                    $scope.showUploadingFiles = true;
                    if (newValue === 5) {
                        $scope.enableFileUploader = false;
                    }
                }
                if (newValue === 0) {
                    $scope.showUploadingFiles = false;
                    $scope.enableFileUploader = true;
                    $scope.maxFilesLimit = false;
                }
            });

            uploader.filters.push({
                'name': 'enforceMaxAmountFiles',
                'fn': function() {
                    if (uploader.queue.length == 5) {
                        return false;
                    } else {
                        return true;
                    }
                }
            });

            uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ ,
                filter, options) {
                if (__env.enableDebug) console.info('onWhenAddingFileFailed', item,
                    filter, options);
                if (filter.name === 'enforceMaxAmountFiles') $scope.maxFilesLimit =
                    true;
            };
            uploader.onAfterAddingFile = function(fileItem) {
                if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
            };
            uploader.onAfterAddingAll = function(addedFileItems) {
                if (__env.enableDebug) console.info('onAfterAddingAll',
                    addedFileItems);
            };
            uploader.onBeforeUploadItem = function(item) {
                var channelId = $scope.uploadChannel.id;
                item.formData.push({
                    channel_id: channelId
                });
                if (__env.enableDebug) console.info('onBeforeUploadItem', item);
            };
            uploader.onProgressItem = function(fileItem, progress) {
                if (__env.enableDebug) console.info('onProgressItem', fileItem,
                    progress);
            };
            uploader.onProgressAll = function(progress) {
                if (__env.enableDebug) console.info('onProgressAll', progress);
            };
            uploader.onErrorItem = function(fileItem, response, status, headers) {
                if (__env.enableDebug) console.log(
                    "ERROR RESPONSE FROM UPLOADING AVATAR");
                if (__env.enableDebug) console.log(response);
                fileItem.isUploaded = false;
                if (__env.enableDebug) console.info('onErrorItem', fileItem,
                    response, status, headers);
            };
            uploader.onCancelItem = function(fileItem, response, status, headers) {
                if (__env.enableDebug) console.info('onCancelItem', fileItem,
                    response, status, headers);
                uploader.clearQueue();
            };
            uploader.onCompleteItem = function(fileItem, response, status, headers) {
                if (__env.enableDebug) console.info('onCompleteItem', fileItem,
                    response, status, headers);

            };
            uploader.onCompleteAll = function() {
                if (__env.enableDebug) console.info('onCompleteAll');
                if (__env.enableDebug) console.log("FILE IDS");
                if (__env.enableDebug) console.log(newChatService.postFiles);
                $scope.doSendMessage();
            };

            $scope.doSendMessage = function() {
                $scope.fns.sendPost($scope.fns.mainChatInput, $scope.uploadChannel, {});
            };

            init();
        }
    };
});
