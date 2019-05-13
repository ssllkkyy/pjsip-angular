'use strict';

proySymphony.directive('quotesHistory', function($window, $rootScope, quoteSheetService,
    usefulTools, newChatService, metaService, _, $filter, contactService,
    resourceFrameworkService, locationService, emailService, symphonyConfig, fileService, $uibModalStack,
    $mdDialog, $location) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/quotes-history.html',
        scope: {
            setEditingQuote: '&',
            quotes: '=?'
        },
        link: function($scope, element, attributes) {
            var qss = quoteSheetService;

            function getOnescreenBaseUrl() {
                return __env.apiUrl ? __env.apiUrl : symphonyConfig.onescreenUrl;
            };
            $scope.onescreenBaseUrl = getOnescreenBaseUrl();

            metaService.registerOnRootScopeUserLoadCallback(function() {
                $scope.hawkSoftImgSrc = $scope.onescreenBaseUrl +
                    $rootScope.user.exportType.partner_icon;
            });

            var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                service: qss,
                scope: $scope
            });

            function init() {
                $scope.printLoading = {};
                if (!$scope.quotes) {
                    refreshRegisterFn({
                        resourceName: 'quotes',
                        serviceResourceName: 'quotes',
                        onAfterRefresh: $scope.refreshFilteredQuotes
                    });
                    $window.qhScope = $scope;
                } else {
                    $window.historyScope = $scope;
                    var sortedQuotes = _.sortBy($scope.quotes, "updated_at");
                    var firstCreatedAt = sortedQuotes[0].updated_at;
                    var lowDate = moment(firstCreatedAt)
                        .floor(24, "hours").toDate();
                    $scope.searchControls.fromPickerModel = lowDate;

                    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                    // THIS IS A HACK. I'M GONNA COME BACK LATER
                    $scope.$watch('searchControls.fromPickerModel', function(newVal,
                        oldVal) {
                        if (newVal !== lowDate) {
                            $scope.searchControls.fromPickerModel = lowDate;
                        }
                    });
                    // THIS IS A HACK. I'M GONNA COME BACK LATER
                    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

                    $scope.$watch('quotes', function(newVal, oldVal) {
                        if (newVal) {
                            $scope.refreshFilteredQuotes();
                        }
                    });
                }
            }

            $scope.searchControls = {
                pageOptions: [{
                    val: 10
                }, {
                    val: 20
                }, {
                    val: 50
                }, {
                    val: 100
                }],
                fromPickerModel: moment().subtract(7, 'days').toDate(),
                toPickerModel: null,
                fromDateDisabled: function(data) {
                    var date = data.date;
                    var toDate = $scope.searchControls.toPickerModel;
                    return date > toDate;
                },
                toDateDisabled: function(data) {
                    var date = data.date;
                    var fromDate = $scope.searchControls.fromPickerModel;
                    return date < fromDate;
                },
                searchFilterText: ''
            };
            $scope.$watch("searchControls.perPage", function(newVal, oldVal) {
                $window.localStorage.setItem(getLSPerPageKey(), JSON.stringify(
                    newVal));
            });

            function getLSPerPageKey() {
                return "qh-perpage-" + $location.path();
            };

            function getPerPageStartVal() {
                return $window.localStorage.getItem(getLSPerPageKey());
            }
            var perPageStartVal = getPerPageStartVal();
            if (perPageStartVal && perPageStartVal !== "undefined") {
                perPageStartVal = JSON.parse(perPageStartVal);
                var matchingPageOption = _.find(
                    $scope.searchControls.pageOptions,
                    ["val", perPageStartVal.val]
                );
                if (matchingPageOption) {
                    $scope.searchControls.perPage = matchingPageOption;
                }
            } else {
                $scope.searchControls.perPage = $scope.searchControls.pageOptions[0];
            }
            $scope.tableControls = {
                columnNames: [{
                        name: 'created_by',
                        text: 'Entered By',
                        className: 'entered-by'
                    },
                    {
                        name: 'quote_for',
                        text: 'Quote For',
                        className: 'quote-for'
                    },
                    {
                        name: 'updated_at',
                        text: 'Last Updated',
                        className: 'updated'
                    },
                    {
                        name: 'type',
                        text: 'Type',
                        className: 'type'
                    },
                    {
                        name: 'status',
                        text: 'Status',
                        className: 'status'
                    },
                    {
                        name: 'assigned_to',
                        text: 'Assigned To',
                        className: 'assigned-to'
                    },
                    {
                        name: 'export',
                        text: 'Export',
                        className: 'export'
                    }
                ],
                quotes: [],
                currentPage: {
                    page: 1
                },
                sortingOpts: {
                    selectedColumn: 'entered_by',
                    sortDirection: false,
                    sortableColumns: ['created_by', 'quote_for', 'updated_at',
                        'type', 'status', 'assigned_to'
                    ],
                    orderByValue: null,
                    handleNewSelectedCol: handleNewSelectedCol
                },
                filteredQuotes: null
            };
            $scope.loading = true;

            $scope.assignedTo = {};
            $scope.newAssignedUser = false;

            function onAfterQSInit() {
                var location = locationService.locationGroups[qss.currentLocationUuid];
                if (location) {
                    $scope.isManager = location.ismanager('quotesheet');
                }
                $scope.raters = Object.values(qss.raters);
                $scope.displayRaters = _.uniqBy($scope.raters, function(rater) {
                    if (rater.rater_name.indexOf("Hawksoft") > -1) {
                        return "Hawksoft";
                    } else {
                        return rater.rater_name;
                    }
                });
                $scope.loading = false;
                $scope.refreshFilteredQuotes();
            };

            $scope.refreshFilteredQuotes = function() {
                var result = $scope.quotes;
                var sortingOpts = $scope.tableControls.sortingOpts;
                var orderBy = sortingOpts.orderByValue;
                var sortDirection = sortingOpts.sortDirection;
                result = $filter('orderBy')(result, orderBy, sortDirection);
                var searchControls = $scope.searchControls;
                var fromPickerModel = searchControls.fromPickerModel;
                var toPickerModel = searchControls.toPickerModel;
                result = $filter('fromToDates')(result, 'updated_at',
                    fromPickerModel, toPickerModel);
                var searchFilterText = searchControls.searchFilterText;
                if (searchFilterText) {
                    result = $filter('filter')(result, {
                        $: searchFilterText
                    });
                }
                
                $scope.tableControls.filteredQuotes = result;
                return result;
            };

            $scope.$watchCollection('searchControls', function() {
                $scope.refreshFilteredQuotes();
            });

            $scope.$watchCollection('tableControls.sortingOpts', function() {
                $scope.refreshFilteredQuotes();
            });

            qss.registerEventCallback('onAfterInit', onAfterQSInit);

            $scope.filteredQuotesLength = function() {
                if ($scope.tableControls.filteredQuotes) {
                    return $scope.tableControls.filteredQuotes.length;
                }
                return null;
            };

            function handleNewSelectedCol(colName) {
                if (colName === 'quote_for') {
                    return 'customer_name';
                } else if (colName === 'status') {
                    return colName + '.quote_sheet_status_name';
                } else if (colName === 'assigned_to') {
                    return colName + '.user_name_given';
                } else {
                    return colName;
                }
            };

            $scope.isHawksoft = function(rater) {
                return rater.rater_name == "Hawksoft";
            };

            $scope.deleteQuoteSheet = function(quote) {
                var title = 'Delete Quote Sheet';
                var message = 'Are you sure you want to delete this Quote Sheet? ';
                $rootScope.confirmDialog(title, message)
                    .then(function(result) {
                        if (result) {
                            qss.deleteQuoteSheet(quote).then(function(response) {
                                if (response.error) {
                                    var message = response.error.message;
                                    if (__env.enableDebug) console.log(
                                        message);
                                    $rootScope.showErrorAlert(message[0]);
                                } else {
                                    $rootScope.showSuccessAlert(
                                        'Quote Sheet successfully deleted.'
                                    );
                                }
                            });
                        }
                    });
            };

            $scope.$watch('assignedTo', function(newVal, oldVal) {
                if (newVal !== oldVal) {
                    $scope.newAssignedUser = true;
                }
            });

            $scope.openAssignModal = function(quotesheet) {
                $scope.assignedTo = {};
                function hasMatchingContactRecord(member) {
                    return Boolean(contactService.getContactbyMMId(member.id));
                }

                function hasOpenDirectChannel(member) {
                    return Boolean(newChatService.getDMChannelByUserId(member.id));
                };

                function isMemberOfCurrentLocation(contact) {
                    // var contact = contactService.getContactbyMMId(member.id);
                    var location = locationService.locationGroups[qss.currentLocationUuid];
                    for (var i = 0; i < location.managers.length; i++) {
                        if (location.managers[i].user_uuid === contact.user_uuid) {
                            return true;
                        }
                    }
                    for (var j = 0; j < location.members.length; j++) {
                        if (location.members[j].user_uuid === contact.user_uuid) {
                            return true;
                        }
                    }
                    return false;
                };

                function isKotterTech(contact) {
                    return !contactService.isKotterTechUser(contact);
                };
        
                function isActive(contact) {
                    // if (contact.user_uuid === $rootScope.user.id) return false;
                    if (!contact || !contact.name || contact.name ===
                        ' ' || !contact.en || contact.en !== 'true') return false;
                    return true;
                };
                var peopleList = contactService.getUserContactsOnly().filter(isActive).filter(
                        isKotterTech).filter(isMemberOfCurrentLocation);
                        
                function isThisUser(member) {
                    return member.id === newChatService.userProfile.id;
                };
                
                var data = {
                    assignedTo: $scope.assignedTo,
                    peopleListData: peopleList,
                    setAsignee: function(member) {
                        // var userM=contactService.getContactbyMMId(member.id);
                        $scope.assignedTo = member;
                    },
                    assign: function() {
                        if ($scope.newAssignedUser) {
                            if ($scope.assignedTo.user_uuid !== $rootScope.user
                                .id) {
                                var sendPost = this.chatFns.sendPost;
                                var inputElement = this.chatFns.mainChatInput;

                                function chatSendPost() {
                                    function channel() {
                                        var chatId = $scope.assignedTo.chat_id;
                                        return newChatService.getDMChannelByUserId(
                                            chatId);
                                    }

                                    function doSendPost() {
                                        var opts = {
                                            root_id: null,
                                            metaData: {
                                                quoteLink: {
                                                    display: quotesheet
                                                        .customer_name,
                                                    quoteUuid: quotesheet
                                                        .quote_sheet_uuid
                                                }
                                            }
                                        };
                                        sendPost(inputElement, channel(),
                                            opts);
                                    }
                                    if (!channel()) {
                                        var chatId = $scope.assignedTo.chat_id;
                                        var member = newChatService.teamMembers[
                                            chatId];
                                        newChatService.createDirectChannel(
                                                member)
                                            .then(function(response) {
                                                doSendPost();
                                            });
                                    } else {
                                        doSendPost();
                                    }
                                }
                                chatSendPost();
                            }
                            if (!quotesheet.assigned_to) {
                                quotesheet.assigned_to = {};
                            };
                            quotesheet.assigned_to.user_uuid = $scope.assignedTo
                                .user_uuid;
                            quotesheet.assigned_to.user_name_given = $scope
                                .assignedTo.contact_name_given;
                            quotesheet.assigned_to.user_name_family =
                                $scope.assignedTo.contact_name_family;
                            var request = {
                                "quote_sheet_uuid": quotesheet.quote_sheet_uuid,
                                "assigned_to": quotesheet.assigned_to.user_uuid,
                                "quote": quotesheet
                            };
                            qss.postUpdateQuote(request).then(function(
                                response) {
                                if (response) {
                                    $scope.newAssignedUser = false;
                                    $rootScope.showSuccessAlert(
                                        'Quote Sheet successfully updated.'
                                    );
                                }
                                $rootScope.closeModal();
                            });
                        } else {
                            var message =
                                "Please select someone to assign the quote to in the dropdown.";
                            $rootScope.showInfoAlert(message);
                        }
                    },
                    chatFns: {}
                };

                $rootScope.showModalWithData('/modals/assign-quotesheet.html', data);
            };
            $scope.emailQuoteSheet = function(quote) {
                qss.getQuoteSheetFileInfo(quote).then(function(hash) {
                    if (hash) {
                        var __env = __env || null;
                        var symphonyConfig = symphonyConfig || null;
                        var quoteUuid = quote.quote_sheet_uuid;
                        var symphonyUrl = $rootScope.symphonyUrl;
                        var url = symphonyUrl + "/quote-view/" + hash;
                        var subject = "Quote for " + quote.customer_name;
                        var encode = window.encodeURIComponent;
                        var message = encode(
                                "The quote sheet is located at: \n ") +
                            "\n" +
                            url + "\n ";
                        var mailtoUrl = "mailto:?subject=" + subject +
                            "&body=" + message;
                        $window.open(mailtoUrl, "_self");
                    }
                });
            };

            function closeModal() {
                $uibModalStack.dismissAll();
            };

            $scope.openQuotePdf = function(quote) {
                $scope.printLoading[quote.quote_sheet_uuid] = true;
                qss.getQuoteSheetFileInfo(quote).then(function(hash) {
                    if (hash) {
                        var data = {
                            file_view_hash: hash
                        };
                        qss.getQuoteSheetPdf(data).then(function(response) {
                            if (response.status === 200) {
                                var data = response.data;

                                function onBlock(e) {
                                    var templateUrl =
                                        "views/quotesheets/enable-popups.html";
                                    $scope.popupImgSrc = $rootScope
                                        .onescreenBaseUrl +
                                        "/popup.png";
                                    var promise = $rootScope.customPrompt(
                                        templateUrl, $scope);
                                    $scope.hidePrompt = function() {
                                        $mdDialog.hide(promise);
                                    };
                                }
                                fileService.openByteArray(data,
                                    onBlock);
                                $scope.printLoading[quote.quote_sheet_uuid] =
                                    false;
                            } else {
                                $scope.printLoading[quote.quote_sheet_uuid] =
                                    false;
                                showFileViewErrorAlert();
                            }
                        }, function(response) {
                            $scope.printLoading[quote.quote_sheet_uuid] =
                                false;
                        });
                    } else {
                        $scope.printLoading[quote.quote_sheet_uuid] = false;
                        showFileViewErrorAlert();
                    }
                });
            };

            function showFileViewErrorAlert() {
                var message =
                    "If you are seeing this error, we were unable to generate a pdf " +
                    " for this quote. Please report this bug to us via our support channels" +
                    " that can be found in the top-right corner of your screen.";
                $rootScope.showErrorAlert(message);
            }

            $scope.isQSManager = function() {
                return $scope.isManager;
            };

            metaService.registerOnRootScopeUserLoadCallback(function() {
                $scope.showHSBtn = $rootScope.user.exportType.partner_code ===
                    'hawksoft';
            });

            $scope.exportToHS = function(quotesheet, rater) {
                // console.log("quotesheet", quotesheet, "rater", rater);
                qss.loadQuoteAnswers(quotesheet)
                .then(function(response){
                    var answers = response.answers;
                    var addedFields = answers.added_fields;
                    var fields = {};
                    for (var element in addedFields ){
                        var inputs = answers.added_fields[element];
                        var repeat = answers.added_fields[element].repeat;
                        
                        answers.added_fields[element]["elementName"] = element;
                        if (repeat === -1 || repeat === undefined){

                            // include key / vals for non-repeatable inputs in fields object
                            angular.forEach(inputs, function(value, key){
                                if ( key !== "repeat" && key !== "elementName"){
                                    this[key] = {};
                                    this[key]["fieldName"] = value.field;
                                    this[key]["fieldValue"] = value.model;
                                }
                            }, fields);
                        } else {
                            // include key / vals for repeatable elements in fields object
                            angular.forEach(inputs, function(value, key){
                                if ( key !== "repeat" && key !== "elementName"){
                                    if (!this[key] ){
                                        this[key] = {};
                                        this[key]["fieldName"] = value.field;
                                    }
                                    if (this[key]){
                                        if(!this[key]["fieldValue"]){
                                            this[key]["fieldValue"] = {};
                                            this[key]["fieldValue"]["value"] = {
                                                0 : "placeholder"
                                            };
                                        }
                                        this[key]["fieldValue"]["value"][repeat] = value.model;
                                    }
                                }
                            }, fields);
                        }
                    }
                    // bundle data to be sent for export
                    fields = JSON.stringify(fields);
                    var data = {
                        locations_group_uuid: quotesheet.locations_group_uuid,
                        customer_name: quotesheet.customer_name,
                        fields: fields
                    };

                    qss.exportQuoteSheet(data)
                        .then(function(response) {
                            var message;
                            if (response.error) {
                                message = response.error.message;
                                if (__env.enableDebug)console.log(message);
                                $rootScope.showErrorAlert(message);
                            } else {
                                message = 'Quote Sheet successfully exported.';
                                $rootScope.showSuccessAlert(message);
                            }
                            return message;                    
                        });
                }).catch(function(err){
                    console.log(err);
                    return(err);
                });
            };

            $scope.genericExportQuote = function(quote, rater){
                console.log("quote", quote);
                console.log("rater", rater);
                var message = "No rater is available for your integration type at this time.";
                var submessage = "Send us a message about connecting with your preferred rater?";
                $rootScope.confirmDialog(message, submessage).then(function(response){
                    if(response){
                        triggerRaterEmail();
                    }
                });
            };

            function triggerRaterEmail() {
                var address = 'bridge@kotter.net';
                var subject = 'Bridge Quote Sheet Rater Question';
                var body = 'Ask / Tell us about what\'s on your mind!';
                emailService.startEmailClient(address, subject, body);
            };

            function convertAnswerMapToQuestionAnswerMap(answerMap, components) {
                var flattenedAnswers = usefulTools.flattenObj(answerMap);
                var answer;
                var questionMapping = {};
                Object.keys(flattenedAnswers).forEach(function(key) {
                    answer = flattenedAnswers[key];
                    var questionKey = getQuestionKey(key, components);
                    if (questionKey) {
                        var info = {
                            answerKey: key,
                            value: answer
                        };
                        if (!questionMapping[questionKey]) {
                            questionMapping[questionKey] = info;
                        } else {
                            if (_.isArray(questionMapping[questionKey])) {
                                questionMapping[questionKey].push(info);
                            } else {
                                questionMapping[questionKey] = [
                                    questionMapping[questionKey],
                                    info
                                ];
                            }
                        }
                        flattenedAnswers[key] = {
                            questionKey: questionKey,
                            value: answer
                        };
                    }
                });
                return questionMapping;
            };

            function getQuestionKey(answerKey, components) {
                var question = getQuestion(answerKey, components);
                if (question) {
                    return question.key;
                }
                return null;
            };

            function getQuestion(field, components) {
                function deepFind(aField) {
                    return usefulTools.deepFind(components, 'key', aField);
                };
                var result = deepFind(field);
                if (result) {
                    if (result['question/answer']) {
                        return result;
                    } else if (result['answer']) {
                        return deepFind(result['answer_select']);
                    }
                }
                return null;
            };

            $scope.showAssignedTo = function(quote) {
                if (!quote || !quote.assigned_to) {
                    return false;
                }
                return Object.keys(quote.assigned_to).map(function(key) {
                    return Boolean(quote.assigned_to[key]);
                }).filter(Boolean).length > 0;
            };

            $scope.editQuote = function(quote) {
                $scope.setEditingQuote()(quote);
            };

            $scope.capitalize = _.capitalize;
            init();
        }
    };
});
