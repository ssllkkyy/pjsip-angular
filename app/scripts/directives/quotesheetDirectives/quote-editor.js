'use strict';

proySymphony.directive('quoteEditor', function($window, quoteSheetService, metaService, $rootScope,
    $timeout, $mdDialog, $sce, usefulTools, resourceFrameworkService, $interval, FileUploader, dataFactory) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/quote-editor.html',
        scope: {
            quote: '=?', // only if editing quote
            transitionFns: '<'
        },
        link: function($scope, element, attributes) {

            $scope.basic_questions = {};
            $scope.statesUS = {};
            $scope.statesUS = $rootScope.usStates;

            $scope.init = function() {
                $scope.setFocusWatch($scope.personalAutocompleteHasFocus,
                    onPersonalFocussed,
                    onPersonalNotFocussed);
                $scope.setFocusWatch($scope.commercialAutocompleteHasFocus,
                    onCommercialFocussed,
                    onCommercialNotFocussed);

                $scope.personalFloatingLabel = $sce.trustAsHtml(
                    "Choose Personal Quote Template \u25BC"
                );

                $scope.commercialFloatingLabel = $sce.trustAsHtml(
                    "Choose Commercial Quote Template \u25BC"
                );

                $scope.startAnswerData = {};

                $scope.templateType = 'personal';
                $scope.formioStyle = {};
            };

            $scope.transitionFns.registerAwayFromFn('newQuote', onAwayFromState(
                'newQuote'));
            $scope.transitionFns.registerAwayFromFn('editingQuote', onAwayFromState(
                'editingQuote'));

            $scope.editing = function() {
                return Boolean($scope.quote);
            };

            quoteSheetService.registerOnAfterInitCallback(function() {
                var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                    service: quoteSheetService,
                    scope: $scope
                });
                refreshRegisterFn({
                    resourceName: 'templates',
                    serviceResourceName: 'activeTemplates',
                    onAfterRefresh: function() {
                        function isNotHidden(template) {
                            return !template.hidden;
                        };
                        $scope.templates = $scope.templates.filter(
                            isNotHidden);
                    }
                });
                refreshRegisterFn({
                    resourceName: 'statuses',
                    serviceResourceName: 'activeStatuses'
                });
                quoteSheetService.registerQuoteEditorScope($scope);
            });

            $scope.filterInputFields = function(addedFields) {
                angular.forEach(addedFields['Client'], function(value, key) {
                    if(key == 'repeat') {
                        delete addedFields['Client'][key];
                    }
                    if(value.hide) {
                        delete addedFields['Client'][key];
                    }
                });

                if(addedFields['Client'] && Object.keys(addedFields['Client']).length == 0) {
                    delete addedFields['Client'];
                }
            }; 

            $scope.$watch('quote', function(newVal, oldVal) {
                if (newVal) {
                    $scope.templateType = $scope.quote.template.type.type;
                    $timeout(function() {
                        var previousTemplate = $scope.selectedTemplate;
                        $scope.selectedTemplate = $scope.quote.template;
                        if (previousTemplate === $scope.quote.template) {
                            $scope.handleNewSelectedTemplate(newVal);
                        }
                        $scope.selectedStatus = $scope.quote.statuses;
                        if ($scope.quote.statuses && !$scope.quote.statuses
                            .active) {
                            $scope.statuses.push($scope.quote.statuses);
                        }
                        getBasicQandA('editing');
                        $scope.filterInputFields(newVal.answers.added_fields);
                        $scope.addedInputs = newVal.answers.added_fields.length == 0 ? {} : newVal.answers.added_fields;
                        $scope.headerInput = newVal.answers.header_fields;
                        if($scope.headerInput && $scope.headerInput.Logo)
                        {
                            $scope.selectedPosition = $scope.headerInput.Logo.position ? $scope.headerInput.Logo.position : 'Left';
                            if($scope.headerInput.Logo.model) $scope.logoPath = $rootScope.onescreenBaseUrl + $scope.headerInput.Logo.model;
                        }            
                    });
                } else {
                    $scope.statuses = quoteSheetService.activeStatuses;
                }
            });

            $scope.$watch('statesUS', function(newVal, oldVal) {
                if(newVal == undefined && newVal == oldVal) {
                    dataFactory.getStates()
                        .then(function(response) {
                            $scope.statesUS = response.data;
                        });
                }
            });

            $scope.$watch('templateType', function(newVal, oldVal) {
                if (newVal) {
                    $scope.selectedTemplate = null;
                }
            });

            $scope.$watch('answerData', function(newVal, oldVal) {
                if (newVal) {
                    $scope.handleNewAnswerData(newVal);
                }
            }, true);

            $scope.$watch('selectedTemplate', function(newVal, oldVal) {
                if (newVal) {
                    $scope.handleNewSelectedTemplate(newVal);
                } else {
                    $scope.quote = null;
                    $scope.logoPath = "";
                    $scope.basic_questions = {};
                    if ($scope.templateType === 'personal') { // tis a hack, but a necessary one
                        $scope.templateType = "";
                        element.find(".personal-autocomplete").find("input");
                        $timeout(function() {
                            $scope.templateType = "personal";
                        });
                    }
                }
            });

            $scope.queryTemplateSearch = function(searchText, type) {
                return $scope.templates.filter(createFilterFor(searchText, type));
            };

            $scope.getAnswers = function() {
                var components = $scope.selectedTemplate.questions.components;
                var answers = usefulTools
                    .deepFilter(components, 'answer', true);
                return answers || [];
            };

            $scope.answerData = {};
            $scope.handleNewAnswerData = function(data) {
                if ($scope.answerData !== data) {
                    $scope.answerData = data;
                };
                if ($scope.quoteChanged) {
                    $scope.quoteChanged = false;
                    $scope.startAnswerData = {};
                    var answerData = $scope.quote ? $scope.quote.answers : data;
                    if ($scope.quote && $scope.quote.answers) {
                        function isValidISO8601Date(dateVal) {
                            return moment(dateVal, moment.ISO_8601).isValid();
                        };

                        function leafMapFn(val) {
                            if (isValidISO8601Date(val)) {
                                return moment(val).toDate();
                            }
                            return val;
                        };
                        answerData = usefulTools.leafMap(answerData, leafMapFn);
                        angular.copy(answerData, data);
                    }
                    angular.copy(answerData, $scope.startAnswerData);
                }
            };

            $scope.answerDataHasChanged = function() {
                // debugger;
                // if ($scope.quote && $scope.selectedStatus !== $scope.quote.status) {
                //     return true;
                // }
                // return !usefulTools.isEqual($scope.answerData, $scope.startAnswerData);
            };

            $scope.saveAllowed = function() {
                return Boolean($scope.selectedTemplate);
                // return $scope.answerDataHasChanged() && quoteIsValid();
            };

            $scope.handleNewSelectedTemplate = function(template) {
                quoteSheetService.loadQuestions(template).then(function(response) {
                    $scope.filterInputFields(response.questions.added_fields);
                    $scope.selectedTemplate = response;
                    if($scope.selectedTemplate.questions.header_fields && $scope.selectedTemplate.questions.header_fields.Logo)
                    {
                        if($scope.selectedTemplate.questions.header_fields.Logo.model) $scope.logoPath = $rootScope.onescreenBaseUrl + $scope.selectedTemplate.questions.header_fields.Logo.model;
                    }  
                    $timeout(function() {
                        $scope.quoteChanged = true;
                        $scope.triggerFormRegistration();
                    });
                });
            };

            $scope.triggerFormRegistration = function(tryCount) {
                if (!tryCount) {
                    tryCount = 1;
                };
                if (tryCount < 10) {
                    var quoteSubmitBtn = $('.quote-submit-btn');
                    if (quoteSubmitBtn[0]) {
                        quoteSubmitBtn.find('.btn')[0].click();
                    } else {
                        tryCount++;
                        $timeout(function() {
                            $scope.triggerFormRegistration(tryCount);
                        });
                    }
                }
            };

            function highlightInvalid() {
                function shouldKeep(el) {
                    if (el.classList.value.indexOf("formio-form") > -1) {
                        return false;
                    }
                    return true;
                };
                var elements = $(element).find('.ng-invalid').toArray().filter(
                    shouldKeep);

                function highlightInRed(el) {
                    el.style.border = "1px solid red";
                };
                elements.forEach(highlightInRed);
            };

            function showErrors() {
                $scope.formioStyle = {
                    "with-errors": true
                };
            };

            function preProcessAnswerData(answerData) {
                var copy = {};
                angular.copy(answerData, copy);
                Object.keys(copy).forEach(function(key) {
                    var val = copy[key];
                    if (_.isDate(val)) {
                        copy[key] = moment(val).hours(0).minutes(0).seconds(0).toDate();
                    }
                });
                return copy;
            };

            function getBasicQandA(param) {

                if(param == 'editing'){
                    angular.forEach($scope.quote.answers.basic_fields['Client'], function(basic_field){
                        $scope.basic_questions[basic_field.field] = basic_field.model;
                    });
                } else if(param == 'saving') {

                    if($scope.quote)
                    {
                        angular.forEach($scope.quote.answers.basic_fields['Client'], function(basic_field){
                            angular.forEach($scope.basic_questions, function(value, key){
                                if(basic_field.field == key){
                                    basic_field['model'] = value;
                                }
                            });
                        });
                    } else {
                        angular.forEach($scope.selectedTemplate.questions.basic_fields['Client'], function(basic_field){
                            angular.forEach($scope.basic_questions, function(value, key){
                                if(basic_field.field == key){
                                    basic_field['model'] = value;
                                }
                            });
                        });
                    }
                }
            }

            $scope.saveQuote = function() {
                // make sure there is a status
                var message;
                if (!$scope.selectedStatus) {
                    message =
                        'You must choose a status for your quote before you can save';
                    $rootScope.showInfoAlert(message);
                    return;
                }
          
                if (!quoteIsValid()) {
                    showErrors();
                    message =
                        'The quote contains invalid inputs. Please fix them before saving';
                    $rootScope.showInfoAlert(message);
                    return;
                }

                getBasicQandA('saving');

                var user = $rootScope.user;
                var createdByName = user.contact_name_given + ' ' + user.contact_name_family;
                var data = {
                    quote_sheet_template_uuid: $scope.selectedTemplate.quote_sheet_template_uuid,
                    quote_sheet_status_uuid: $scope.selectedStatus.quote_sheet_status_uuid,
                    customer_name: $scope.basic_questions.first_name + ' ' + $scope.basic_questions.last_name,
                    created_by: createdByName
                };
                $scope.cell_phone = null;
                $scope.work_phone = null;

                if ($scope.quote) {
                    angular.forEach($scope.quote.answers.basic_fields['Client'], function(input) {
                        if(input.field == 'cell_phone' && input.model) {
                            $scope.cell_phone = input.model;
                        }

                        if(input.field == 'work_phone' && input.model) {  
                            $scope.work_phone = input.model;
                        }
                    });
                } else {
                    angular.forEach($scope.selectedTemplate.questions.basic_fields['Client'], function(input) {
                        if(input.field == 'cell_phone' && input.model) {
                            $scope.cell_phone = input.model;
                        }

                        if(input.field == 'work_phone' && input.model) {  
                            $scope.work_phone = input.model;
                        }
                    });
                }

                if(!$scope.cell_phone && !$scope.work_phone) {
                    showErrors();
                    message =
                        'Please enter either Cell phone number or Work phone number.';
                    $rootScope.showInfoAlert(message);
                    return;
                }

                if ($scope.quote) {
                    var answers = {
                        basic_fields: $scope.quote.answers.basic_fields,
                        header_fields: $scope.quote.answers.header_fields,
                        added_fields: $scope.quote.answers.added_fields
                    }
                    data.answers = answers;
                    data.quote_sheet_uuid = $scope.quote.quote_sheet_uuid;
                    data.quote = $scope.quote;
                    quoteSheetService.postUpdateQuote(data).then(function(response) {
                        if (response) {
                            $scope.reset();
                            $scope.transitionFns.transition('quoteHistory');
                        }
                    });
                } else {
                    var answers = {
                        basic_fields: $scope.selectedTemplate.questions.basic_fields,
                        header_fields: $scope.selectedTemplate.questions.header_fields,
                        added_fields: $scope.selectedTemplate.questions.added_fields
                    }
                    data.answers = answers;
                    quoteSheetService.createQuote(data).then(function(response) {
                        if (response) {
                            $scope.reset();
                            $scope.transitionFns.transition('quoteHistory');
                        }
                    });
                }
            };

            $scope.elementHasFocus = function(element) {
                return element === document.activeElement;
            };

            $scope.activeElement = function() {
                return document.activeElement;
            };

            $scope.getAutocomplete = function(type) {
                return angular.element('.' + type + '-autocomplete').find('input')[
                    0];
            };

            $scope.personalAutocompleteHasFocus = function() {
                return $scope.elementHasFocus($scope.getAutocomplete('personal'));
            };

            $scope.commercialAutocompleteHasFocus = function() {
                return $scope.elementHasFocus($scope.getAutocomplete('commercial'));
            };

            $scope.setFocusWatch = function(hasFocus, onFocus, onNotFocussed) {
                // function hasFocus() {
                //     return $scope.elementHasFocus(element);
                // };
                $scope.$watch(hasFocus, function(newVal) {
                    if (newVal) {
                        onFocus();
                    };
                    if (!newVal) {
                        onNotFocussed();
                    };
                });
            };

            $scope.closeQuote = function() {
                if ($scope.answerDataHasChanged() && !$scope.ignoreUnsavedAnswers) {
                    var message = 'Alert';
                    var submessage = 'You have not saved your progress. ' +
                        'Are you sure you want to close this quote?';
                    $rootScope.confirmDialog(message, submessage).then(function(
                        response) {
                        if (response) {
                            $scope.reset();
                        }
                    });
                } else {
                    $scope.reset();
                }
            };

            $scope.reset = function() {
                $scope.startAnswerData = {};
                $scope.answerData = {};
                $scope.selectedTemplate = null;
                $scope.selectedStatus = null;
                $scope.quote = null;
                $scope.formioStyle = {};
            };

            $scope.showCloseBtn = function() {
                return $scope.selectedTemplate && $scope.selectedTemplate.questions;
            };

            function quoteIsValid() {
                var invalidElements = element.find('.quote-container').find(
                    '.ng-invalid');
                return invalidElements.length === 0;
            };

            function createFilterFor(query, type) {
                var lowercaseQuery = angular.lowercase(query) || "";
                return function filterFn(template) {
                    var description = angular.lowercase(template.description);
                    return (description.indexOf(lowercaseQuery) > -1) &&
                        template.type === type && (template.global === false || template.domain_uuid === $rootScope.user.domain_uuid);
                };
            };

            function retrieveQuestionAnswer(answers, question) {
                var answer = answers[question.quote_sheet_question_uuid];
                return answer ? answer : '';
            };

            function getStatusByName(statuses, name) {
                function isMatchingStatus(status) {
                    return status.quote_sheet_status_name === name;
                };
                return _.find(statuses, isMatchingStatus);
            };

            function getIncompleteStatus() {
                function isIncompleteStatus(status) {
                    var name = angular.lowercase(status.quote_sheet_status_name);
                    return name.indexOf('incomplete') > -1;
                };
                return _.find(_.toArray($scope.statuses), isIncompleteStatus);
            };

            function getQuoteFormValueByClass(className, elementType) {
                var formio = angular.element(element.find('.formio')[0]);
                var searchElement = formio.find('.' + className).find(elementType)[0];
                return searchElement ? searchElement.value : null;
            };

            function onPersonalFocussed() {
                $scope.personalFloatingLabel = "Choose Personal Quote Template";
            };

            function onCommercialFocussed() {
                $scope.commercialFloatingLabel = "Choose Commercial Quote Template";
            };

            function onPersonalNotFocussed() {
                $scope.personalFloatingLabel = $sce.trustAsHtml(
                    "Choose Personal Quote Template \u25BC"
                );
            };

            function onCommercialNotFocussed() {
                $scope.commercialFloatingLabel = $sce.trustAsHtml(
                    "Choose Commercial Quote Template \u25BC"
                );
            };

            function onAwayFromState(state) {
                return function(scope, args) {
                    if ($scope.answerDataHasChanged() && !$scope.ignoreUnsavedAnswers) {
                        $scope.transitionFns.transition(state);
                        var message = 'Alert';
                        var submessage = 'You have not saved your progress. ' +
                            'Are you sure you want to leave?';
                        $rootScope.confirmDialog(message, submessage).then(function(
                            response) {
                            if (response) {
                                $scope.ignoreUnsavedAnswers = true;
                                var newStateName = args.newStateName ?
                                    args.newStateName : 'quoteHistory';
                                $scope.transitionFns.transition(
                                    newStateName);
                            }
                        });
                    }
                    $scope.ignoreUnsavedAnswers = undefined;
                };
            };

            $scope.init();

            $scope.element = element;
            $window.editScope = $scope;

            //---------------------------------------------------------------------------------------------------------------------            
            $scope.triggerUpload = function(user) {
                $scope.uploader.clearQueue();
                angular.element('#cloud-upload').trigger('click');
            };

            var uploader = $scope.uploader = new FileUploader({
                url: $rootScope.onescreenBaseUrl + '/quotesheet/uploadlogo',
                queueLimit: 1,
                headers: {
                    'Authorization': 'Bearer ' + $rootScope.userToken
                }
            });

            uploader.filters.push({
                name: 'imageFilter',
                fn: function(item /*{File|FileLikeObject}*/ , options) {
                    console.log(item.type.slice(item.type.lastIndexOf('/')+1));
                    var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) +
                        '|';
                    return '|jpg|png|jpeg|'.indexOf(type) !== -1;
                }
            });
            uploader.filters.push({
                name: 'avatarSizeFilter',
                fn: function(item /*{File|FileLikeObject}*/ , options) {
                    return item.size < 1000000;
                }
            });
        
        
            // CALLBACKS
            uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
                options) {
                if (__env.enableDebug) console.info('onWhenAddingFileFailed', item, filter,
                    options);
                    uploader.clearQueue();
                    $rootScope.showErrorAlert('Problem Adding File: Image must be under 1MB in size and a jpg, bmp or png file');
            };
            uploader.onAfterAddingFile = function(fileItem) {
                if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
                if (__env.enableDebug) console.log(uploader.queue);
                uploader.uploadItem(fileItem);
            };
            uploader.onAfterAddingAll = function(addedFileItems) {
                if (__env.enableDebug) console.info('onAfterAddingAll', addedFileItems);
            };
            uploader.onBeforeUploadItem = function(item) {
                if (__env.enableDebug) console.info('onBeforeUploadItem', item);
                
            };
            uploader.onProgressItem = function(fileItem, progress) {
                if (__env.enableDebug) console.info('onProgressItem', fileItem, progress);
            };
            uploader.onProgressAll = function(progress) {
                if (__env.enableDebug) console.info('onProgressAll', progress);
            };
            uploader.onSuccessItem = function(fileItem, response, status, headers) {
                if (__env.enableDebug) console.log("RESPONSE FROM UPLOADING AVATAR");
                if (__env.enableDebug) console.log(response);
                console.log($rootScope.uploaderOption);
                if (response.error) {
                    $rootScope.alerts.push({
                        error: true,
                        message: response.error.message
                    });
                } else {
                    $scope.logoPath = $rootScope.onescreenBaseUrl + response.success.data;

                    if ($scope.quote && $scope.quote.answers.header_fields) {
                        $scope.quote.answers.header_fields.Logo['model'] = response.success.data;
                    } else {
                        if($scope.selectedTemplate.questions.header_fields) 
                        $scope.selectedTemplate.questions.header_fields.Logo['model'] = response.success.data;
                    }                
                }
                uploader.clearQueue();
                if (__env.enableDebug) console.info('onSuccessItem', fileItem, response, status,
                    headers);
            };
        
        
            uploader.onErrorItem = function(fileItem, response, status, headers) {
                if (__env.enableDebug) console.log("RESPONSE FROM UPLOADING AVATAR");
                if (__env.enableDebug) console.log(response);
                fileItem.isUploaded = false;
                $rootScope.alerts.push({
                    error: true,
                    message: response.error.message
                });
                if (__env.enableDebug) console.info('onErrorItem', fileItem, response, status,
                    headers);
            };
            uploader.onCancelItem = function(fileItem, response, status, headers) {
                if (__env.enableDebug) console.info('onCancelItem', fileItem, response, status,
                    headers);
                uploader.clearQueue();
            };
            uploader.onCompleteItem = function(fileItem, response, status, headers) {
                if (__env.enableDebug) console.info('onCompleteItem', fileItem, response,
                    status, headers);
                    uploader.clearQueue();
                $scope.uploadedFile = response.success.data;
                $scope.logoPath = $rootScope.onescreenBaseUrl + response.success.data;
            };
            uploader.onCompleteAll = function() {
                if (__env.enableDebug) console.info('onCompleteAll');
            };

            // $scope.newQuoteSheet = {
            //     basic
            // }
        }
    };
});
