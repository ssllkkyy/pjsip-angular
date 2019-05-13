'use strict';

proySymphony.directive('templateEditor', function($window, quoteSheetService,
    resourceFrameworkService, $rootScope, $timeout, usefulTools, $compile, userService, $uibModalStack, $mdDialog, FileUploader) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/template-editor.html',
        scope: {
            templateObj: '<'
        },
        link: function($scope, element, attributes) {
            var qss = quoteSheetService;
            qss.registerOnAfterInitCallback(function() {
                $scope.isKotterTech = userService.isKotterTechOrGreater();
                $scope.template = getDefaultTemplate();
                $scope.baseTemplate = {};
                angular.copy($scope.template, $scope.baseTemplate);
                $scope.baseTemplate.description = 'New Template';
                init();
            });

            var questionTooltip =
                "Check this if the matching answer to this component's question" +
                " can be found in a different component";
            var answerTooltip =
                "Check this if the matching question to this component's answer" +
                " can be found in a different component";
            var questionAnswerTooltip =
                'Check this if the question and answer field can both be' +
                ' found in this component';
            var checkboxData = {
                props: [{
                        id: 'question',
                        tooltip: questionTooltip
                    },
                    {
                        id: 'answer',
                        tooltip: answerTooltip
                    },
                    {
                        id: 'question/answer',
                        tooltip: questionAnswerTooltip
                    }
                ]
            };

            $rootScope.$on('formBuilder:edit', function(event, component) {
                if (component.type === "datetime") {
                    var propNames = ["defaultDate", "datePicker.minDate",
                        "datePicker.maxDate"
                    ];

                    function setCompVal(propName) {
                        var scopePropName = "__" + propName;
                        var val = _.get($scope, scopePropName);
                        if (val) {
                            _.set(component, propName, val.toString());
                        }
                    };
                    propNames.forEach(setCompVal);
                    component.format = "yyyy-MM-dd";
                }
                if (componentRequiresCheckboxes(component)) {
                    attachCheckboxValsToComponent(component);
                }
            });

            function componentRequiresCheckboxes(component) {
                return component.input || component.type === "htmlelement";
            };

            $rootScope.$on('formBuilder:configOpen', function(event, component) {
                if (!$scope.configTimeout) {
                    $scope.configTimeout = $timeout(function() {
                        $scope.configTimeout = null;
                    }, 1500);
                    var form = $('.ngdialog-content').find('ng-form')[0];
                    var modal = angular.element('#component-settings')[0];
                    if (component.type === "datetime") {

                        function replaceWithDatepicker(propertyName) {
                            var scopePropertyName = "__" + propertyName;
                            var template = "<datepicker model=\"" +
                                scopePropertyName + "\"" +
                                "without-icon=\"true\"></datepicker>";
                            var datepicker = $compile(template)($scope);
                            var query = ".form-group[property=\"" +
                                propertyName + "\"]";
                            var element = $(modal.querySelector(query)).find(
                                'input');
                            var curVal = _.get(component, propertyName);
                            if (curVal) {
                                if (_.isDate(curVal)) {
                                    curVal = curVal.toString();
                                }
                                _.set($scope, scopePropertyName, new Date(
                                    curVal));
                            } else {
                                if (propertyName === "defaultDate") {
                                    _.set($scope, scopePropertyName, moment().toDate());
                                } else if (propertyName ===
                                    "datePicker.minDate") {
                                    _.set($scope, scopePropertyName, moment().subtract(
                                        200, "years").toDate());
                                } else if (propertyName ===
                                    "datePicker.maxDate") {
                                    _.set($scope, scopePropertyName, moment().add(
                                        100, "years").toDate());
                                }
                            }
                            element.replaceWith(datepicker);
                        };
                        var propNames = ["defaultDate", "datePicker.minDate",
                            "datePicker.maxDate"
                        ];
                        propNames.forEach(replaceWithDatepicker);
                        component.enableTime = false;
                    }
                    if (componentRequiresCheckboxes(component)) {
                        var submitBtn = modal.querySelector('.btn-success');
                        replaceSubmitBtn(submitBtn, component, checkboxData);
                        if (!component.checkboxId) {
                            component.checkboxId = getCheckboxId();
                        };
                        attachCheckboxesToForm(component, form, checkboxData);
                        attachAnswerSelectToForm(component, form, checkboxData);
                        if (component.defaultComp) {
                            var checkboxes = checkboxData[component.checkboxId]
                                .checkboxes;
                            if (component.type === 'button') {
                                function disableCheckbox(checkbox) {
                                    checkbox.input.disabled = true;
                                };
                                checkboxes.forEach(disableCheckbox);
                            } else {
                                function isQACheckbox(checkbox) {
                                    return checkbox.input.id ===
                                        'question/answer';
                                };
                                var qaCheckbox = _.find(checkboxes,
                                    isQACheckbox);
                                qaCheckbox.setChecked(true);

                                function disableCheckbox(checkbox) {
                                    checkbox.input.disabled = true;
                                };
                                checkboxes.forEach(disableCheckbox);
                            }
                        }
                    }
                }
            });

            $scope.quoteSheetTemplateUuid = false;

            $scope.editing = function() {
                return $scope.selectedTemplate &&
                    !!$scope.selectedTemplate.quote_sheet_template_uuid;
            };

            // $scope.editingTemplateObj.editingTemplate = $scope.editing;

            function raiseTemplateInfoMessage(field) {
                var message;
                if (field) {
                    message = "You must assign a " + field +
                        " to the template before creating it.";
                } else {
                    message =
                        "You must make a change to the template before saving it.";
                }
                $rootScope.showInfoAlert(message);
            };

            $scope.saveTemplate = function() {
                if (!$scope.type) {
                    raiseTemplateInfoMessage("type");
                    return;
                }
                if (!$scope.description) {
                    raiseTemplateInfoMessage("name");
                    return;
                }
                
                $scope.basic_fields = {};
                $scope.basic_fields['Client'] = [
                    {field: 'first_name', label: 'First Name'},
                    {field: 'middle_name', label: 'Middle Name'},
                    {field: 'last_name', label: 'Last Name'},
                    {field: 'address', label: 'Address'},
                    {field: 'city', label: 'City'},
                    {field: 'state', label: 'State'},
                    {field: 'zip', label: 'Zip'},
                    {field: 'email', label: 'Email Address'},
                    {field: 'cell_phone', label: 'Cell Phone'},
                    {field: 'work_phone', label: 'Work Phone'},
                ];

                if($scope.headerInput && $scope.headerInput.Logo)
                    $scope.headerInput.Logo.position = $scope.selectedPosition ? $scope.selectedPosition : 'Left';

                var questions = {
                    basic_fields : $scope.basic_fields,
                    added_fields : $scope.addedInputs,
                    header_fields :  $scope.headerInput
                }

                var data = {
                    locations_group_uuid: qss.currentLocationUuid,
                    description: $scope.description,
                    location_uuids: [qss.currentLocationUuid],
                    type: $scope.type.value,
                    rater_type : $scope.raterType.name,
                    questions: questions
                };

                data.global = Boolean($scope.template.global);
                if (!$scope.isKotterTech) {
                    data.global = false;
                };

                if ($scope.editing()) {
                    //update template
                    var templateUuid = $scope.selectedTemplate.quote_sheet_template_uuid;
                    var template = qss.findTemplateByUuid(templateUuid);
                    data.quote_sheet_template_uuid = template.quote_sheet_template_uuid;
                    data.template = template;

                    qss.postUpdateTemplate(data)
                        .then(function(response) {
                            $scope.updateGlobalOnTemplateInTemplates( response.quote_sheet_template_uuid, response.global);
                            $scope.reset();
                            $rootScope.showSuccessAlert('Template updated');
                        });
                } else {
                    qss.createTemplate(data).then(function(response) {
                        if (response) {
                            $scope.reset();
                            $rootScope.showSuccessAlert('Template created');
                        } else {
                            var message =
                                "Template creation failed. Please " +
                                "contact the support team via the buttons in the " +
                                "top-right of your screen to resolve this issue.";
                            $rootScope.showErrorAlert(message);
                        }
                    });
                }
            };
            $scope.checkHeaderFields = function(newHeader) {
                angular.forEach($scope.elements.header.inputs, function(input){
                    angular.forEach(newHeader, function(value, key) {
                        if(input.label == key) {
                            Object.assign(input, value); 
                        }
                    });
                });
            };

            $scope.updateGlobalOnTemplateInTemplates = function(templateUuid, globalVal){
                var templates = $scope.templates;
                var domainUuid = userService.domainUuidForCurrentUser();
                angular.forEach(templates, function(template, key){
                    if ( (template.domain_uuid && template.domain_uuid === domainUuid ) && 
                        (template.quote_sheet_template_uuid && template.quote_sheet_template_uuid === templateUuid) ){
                        template.global = globalVal;
                    }
                });
            };

            $scope.checkInputFields = function(newElements) {
                angular.forEach($scope.elements, function(element){
                    angular.forEach(newElements, function(value, key) {
                        if(element.name == key) {
                            Object.assign(element.inputs, value); 
                        }
                    });
                });
            };

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

            $scope.$watch('selectedTemplate', function(newVal, oldVal) {
                if (newVal) {
                    $scope.newTemp = newVal;
                    $scope.oldTemp = oldVal;
                    $scope.description = '';
                    $scope.type = null;
                    if (newVal.quote_sheet_template_uuid) {
                        qss.loadQuestions(newVal).then(function() {
                            $scope.quoteSheetTemplateUuid = newVal.quote_sheet_template_uuid;
                            angular.copy(newVal, $scope.template);
                            $scope.description = newVal.description;

                            function matchingType(type) {
                                return type.value === newVal.type;
                            };
                            var type = _.find($scope.types,
                                matchingType);
                            if (type) {
                                $scope.type = type;
                            }
                            $scope.raterType = $scope.rater_types[newVal.rater_type];
                            $scope.checkInputFields(newVal.questions.added_fields);
                            $scope.filterInputFields(newVal.questions.added_fields);
                            $scope.addedInputs = newVal.questions.added_fields.length == 0 ? {} : newVal.questions.added_fields;
                            $scope.checkHeaderFields(newVal.questions.header_fields);
                            $scope.headerInput = newVal.questions.header_fields;
                            if($scope.headerInput.Logo && $scope.headerInput.Logo.model) $scope.logoPath = $rootScope.onescreenBaseUrl + $scope.headerInput.Logo.model;
                            if($scope.headerInput && $scope.headerInput.Logo)
                                $scope.selectedPosition = $scope.headerInput.Logo.position ? $scope.headerInput.Logo.position : 'Left';
                            $scope.templateOriginalForm = {};
                            angular.copy($scope.template, $scope.templateOriginalForm);
                        });
                    } else {
                        $scope.quoteSheetTemplateUuid = false;
                        if (newVal !== $scope.template) {
                            angular.copy(newVal, $scope.template);
                            $scope.templateOriginalForm = {};
                            angular.copy($scope.template, $scope.templateOriginalForm);
                            $scope.addedInputs = {};
                            $scope.headerInput = {};
                            $scope.logoPath = null;
                            $scope.selectedPosition = '';
                            $scope.selectRaterType($scope.raterType);
                        }
                    }
                }
            });

            $scope.$watch('templateObj.template', function(newVal, oldVal) {
                if (newVal && Object.keys(newVal).length > 0) {
                    var key = 'quote_sheet_template_uuid';

                    function matchingTemplate(template) {
                        return template[key] === newVal[key];
                    };
                    var match = _.find($scope.templates, matchingTemplate);
                    if (match) {
                        $scope.selectedTemplate = match;
                        $scope.templateObj.template = null;
                    }
                }
            });

            $scope.reset = function() {
                $scope.selectedTemplate = $scope.template;
                $scope.selectedTemplate.isBaseTemplate = true;
                $scope.description = '';
                $scope.type = null;
                $scope.addedInputs = {};
                $scope.headerInput = {};
                $scope.selectedPosition = '';
                init();
            };

            $scope.openDirectionsModal = function() {
                var templateUrl =
                    'views/quotesheets/template-creation-directions.html';
                var promptPromise = $rootScope.customPrompt(templateUrl, $scope);
                $scope.resolvePrompt = function() {
                    if (promptPromise) {
                        promptPromise();
                    }
                };
            };

            $scope.templateDataHasChanged = function() {
                var ignored = ['$$hashKey', 'global'];
                return !usefulTools.isEqual($scope.template, $scope.templateOriginalForm,
                    ignored);
            };

            $scope.saveAllowed = function() {
                if (!$scope.selectedTemplate) {
                    return false;
                }
                return templateTypeChanged() || templateGlobalChanged() ||
                    templateDescriptionChanged() || $scope.templateDataHasChanged();
            };

            $scope.togglePreview = function() {
                $scope.previewing = !(Boolean($scope.previewing));
                if ($scope.previewing) {
                    $('.input-selector')[0].style.marginLeft = "0";
                    $('.element-selector')[0].style.display = "none";
                    $('.input-selector')[0].style.width = "100%";
                } else {
                    $('.input-selector')[0].style.marginLeft = "2%";
                    $('.element-selector')[0].style.display = "block";
                    $('.input-selector')[0].style.width = "83%";
                }
            };

            function init() {
                var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                    service: qss,
                    scope: $scope
                });
                var baseTemplateCopy = angular.copy($scope.baseTemplate, {});
                $scope.templates = [];
                var templateServiceResourceName = $scope.isKotterTech ?
                    'activeTemplatesAtCurrentLocation' : 'activeNonGlobalTemplates';
                refreshRegisterFn({
                    resourceName: 'templates',
                    serviceResourceName: templateServiceResourceName,
                    attachType: 'copy',
                    onAfterRefresh: function() {
                        var baseTemplateCopy = angular.copy($scope.baseTemplate, {});

                        $scope.templates.unshift(baseTemplateCopy);
                        if ($scope.selectedTemplate) {
                            if ($scope.selectedTemplate.isBaseTemplate) {
                                $scope.selectedTemplate = $scope.templates[
                                    0];
                            } else {
                                var tempUuid = $scope.selectedTemplate.quote_sheet_template_uuid;

                                function match(temp) {
                                    return temp.quote_sheet_template_uuid ===
                                        tempUuid;
                                };
                                var template = _.find($scope.templates,
                                    match);
                                if (template) {
                                    $scope.selectedTemplate = template;
                                } else {
                                    $scope.selectedTemplate = $scope.templates[
                                        0];
                                }
                            }
                        } else {
                            $scope.selectedTemplate = $scope.templates[0];
                        }
                    }
                });
                var typeServiceResourceName = $scope.isKotterTech ?
                    'activeTypes' : 'activeNonGlobalTypes';
                refreshRegisterFn({
                    resourceName: 'types',
                    serviceResourceName: typeServiceResourceName
                });
                $scope.types = [{
                        name: "Personal Line",
                        value: "personal"
                    },
                    {
                        name: "Commercial Line",
                        value: "commercial"
                    }
                ];
            };
            $window.tempScope = $scope;

            var getCheckboxId = function() {
                var id = 0;
                return function() {
                    id++;
                    return id;
                };
            }();

            function attachCheckboxValsToComponent(component) {
                var checkboxes = checkboxData[component.checkboxId].checkboxes;

                function checkboxToInput(checkbox) {
                    return checkbox.querySelector('input');
                }

                function checkboxToPropData(checkbox) {
                    var input = checkboxToInput(checkbox);
                    return {
                        property: input.id,
                        val: input.checked
                    };
                }
                checkboxes.map(checkboxToPropData).forEach(function(datum) {
                    component[datum.property] = datum.val;
                });
                component.answer_select = checkboxData[component.checkboxId].answerSelect
                    .value;
            };

            // compiling an element creates an entirely new element. same goes for child elements
            function compile(element) {
                element = $compile(element.outerHTML)($scope);
                return element[0];
            };

            function createCheckbox(data) {
                // data.label, data.property
                function create(type) {
                    return document.createElement(type);
                }

                function createText(text) {
                    return document.createTextNode(text);
                }

                function attr(el, prop, val) {
                    el.setAttribute(prop, val);
                }
                var div = create('div'),
                    label = create('label'),
                    input = create('input'),
                    labelText = createText(data.label);
                div.classList.add('checkbox');
                attr(div, 'property', data.property);
                attr(input, 'id', data.property);
                attr(input, 'name', data.property);
                if (data.tooltip) {
                    attr(label, 'form-builder-tooltip', data.tooltip);
                }
                div.appendChild(label);
                label.appendChild(input);
                label.appendChild(labelText);
                label.style['user-select'] = 'none';
                input.type = 'checkbox';
                div = compile(div);
                label = div.querySelector('label');
                input = div.querySelector('input');
                input.onclick = getCheckboxOnClick(div, data);
                div.setChecked = function(val) {
                    input.checked = val;
                };
                div.setDisabled = function(val) {
                    input.disabled = val;
                };
                div.label = label;
                div.input = input;
                return div;
            };

            function getCheckboxOnClick(div, data) {
                return function() {
                    var component = div.component;
                    if (component) {
                        var id = component.checkboxId;
                        highlightCheckboxes(checkboxData[id].checkboxes, '');
                        if (div.input.checked) {
                            checkboxData[id].checkboxes.forEach(function(box) {
                                if (box !== div) {
                                    if (box.input.checked) {
                                        box.setChecked(false);
                                        if (box.input.id === 'answer') {
                                            checkboxData[id].answerSelect.style
                                                .display = 'none';
                                        }
                                    }
                                }
                            });
                        }
                        if (data.label === 'answer') {
                            if (div.input.checked) {
                                checkboxData[id].answerSelect.style.display =
                                    'block';
                            } else {
                                checkboxData[id].answerSelect.style.display =
                                    'none';
                            }
                        }
                    }
                };
            };

            function createAnswerSelect(component) {
                function create(type) {
                    return document.createElement(type);
                }

                function createText(text) {
                    return document.createTextNode(text);
                }

                function attr(el, prop, val) {
                    el.setAttribute(prop, val);
                }
                var select = create('select');
                var questions = getFormQuestions(component);
                var defaultOption = create('option');
                select.append(defaultOption);
                questions.map(function(question) {
                    var option = create('option');
                    var optionText = createText(getTextFromQuestionComponent(
                        question));
                    option.value = question.key;
                    option.append(optionText);
                    select.append(option);
                });
                select.style.display = 'none';
                return select;
            };

            function attachCheckboxesToForm(component, form, checkboxData) {
                var props = checkboxData.props;
                checkboxData[component.checkboxId] = {
                    checkboxes: []
                };
                var checked;
                props.forEach(function(prop) {
                    var exists = angular.element(form).find("div[property='" +
                        prop.id + "']");
                    if (!exists[0]) {
                        var checkbox = createCheckbox({
                            label: prop.id,
                            property: prop.id,
                            checkboxData: checkboxData,
                            tooltip: prop.tooltip
                        });
                        checkbox.component = component;
                        checkbox.setChecked(Boolean(component[prop.id]));
                        if (component[prop]) {
                            checked = true;
                        }
                        form.prepend(checkbox);
                        checkboxData[component.checkboxId].checkboxes.push(
                            checkbox);
                    }
                });
            };

            function attachAnswerSelectToForm(component, form, checkboxData) {
                var answerSelect = createAnswerSelect(component);
                var aBox = _.find(checkboxData[component.checkboxId].checkboxes,
                    function(box) {
                        if (box.input.id === 'answer') {
                            return box;
                        }
                        return null;
                    });
                if (aBox.input.checked) {
                    answerSelect.style.display = 'block';
                };
                if (component.answer_select) {
                    answerSelect.value = component.answer_select;
                };
                checkboxData[component.checkboxId].answerSelect = answerSelect;
                form.prepend(answerSelect);
            };

            function replaceSubmitBtn(submitBtn, component, checkboxData) {
                // pretty sure that checkboxes are not being appended to
                // checkboxData properly... worked around here, but if it arises
                // in the future, you should look there
                submitBtn.style.display = 'none';
                var replacementBtn = document.createElement('button');
                var textNode = document.createTextNode('Submit');
                replacementBtn.appendChild(textNode);
                replacementBtn.classList.value = 'btn btn-success';
                replacementBtn.type = 'submit';
                replacementBtn.originalBtn = submitBtn;
                replacementBtn.onclick = function() {
                    var btn = angular.element(replacementBtn);
                    var form = angular.element(btn.closest("#component-settings")[0]);
                    var checked = checkboxData.props.filter(function(prop) {
                        var input = form.find("input[name='" + prop.id +
                            "']")[0];
                        return input && input.checked;
                    })[0];
                    if (!component.content && !component.label && !component.placeholder &&
                        !component.description) {
                        componentNoLabelMessage();
                        return;
                    }
                    if (checked) {
                        var answerSelect = checkboxData[component.checkboxId].answerSelect;
                        if (checked.id === 'answer' && !answerSelect.value) {
                            if (answerSelect.childElementCount === 1) {
                                noQuestionComponentMessage();
                            }
                            highlightAnswerSelect(answerSelect, 'red');
                            answerSelectMessage();
                        } else {
                            submitBtn.click();
                        }
                    } else {
                        highlightCheckboxes(checkboxData[component.checkboxId].checkboxes,
                            'red');
                        selectComponentMessage();
                    }
                };
                submitBtn.parentNode.insertBefore(replacementBtn, submitBtn);
            };

            function selectComponentMessage() {
                var message =
                    'Please select the component type via one of the checkboxes' +
                    ' to the left';
                $rootScope.showInfoAlert(message);
            };

            function answerSelectMessage() {
                var message = 'Please select the matching question using the' +
                    ' dropdown to the left';
                $rootScope.showInfoAlert(message);
            };

            function noQuestionComponentMessage() {
                var message = 'You have not labeled any other components as ' +
                    'questions. Please specify a question component before ' +
                    'specifying this component as an answer component.';
                $rootScope.showInfoAlert(message);
            };

            function componentNoLabelMessage() {
                var message =
                    'This component does not have the required naming information. ' +
                    'Please ensure that at least one of the following fields has a value: ' +
                    'Label, Placeholder, Description, or Content.';
                $rootScope.showInfoAlert(message);
            };

            function highlightCheckboxes(checkboxes, color) {
                checkboxes.forEach(function(checkbox) {
                    checkbox.label.style.color = color;
                });
            };

            function highlightAnswerSelect(answerSelect, color) {
                answerSelect.style.border = '1px solid ' + color;
            };

            function getFormQuestions(exclude) {
                var components = $scope.template.questions.components;
                var questions = usefulTools
                    .deepFilter(components, 'question', true);
                if (questions) {
                    questions = questions.filter(function(q) {
                        return q !== exclude;
                    });
                    return questions;
                };
                return [];
            };

            function getTextFromQuestionComponent(component) {
                if (component.content) {
                    return component.content;
                };
                if (component.label) {
                    return component.label;
                };
                return null;
            };

            function getDefaultTemplate() {
                var form = {
                    questions: {
                        display: "form",
                        page: 0,
                        components: []
                    },
                    description: "New Template"
                };
                var comps = [{
                        type: 'textfield',
                        attrs: {
                            customClass: 'quote-customer-name',
                            label: 'Name:',
                            validate: {
                                required: true
                            },
                            disableRemove: true,
                            disableClone: true,
                            defaultComp: true,
                            "question/answer": true
                        }
                    },
                    {
                        type: 'phoneNumber',
                        attrs: {
                            customClass: 'quote-phone-number',
                            label: 'Phone:',
                            validate: {
                                required: true
                            },
                            disableRemove: true,
                            disableClone: true,
                            defaultComp: true,
                            "question/answer": true
                        }
                    },
                    {
                        type: 'textarea',
                        attrs: {
                            customClass: 'quote-insured-description',
                            label: 'Description of items being insured:',
                            validate: {
                                required: true
                            },
                            disableRemove: true,
                            disableClone: true,
                            defaultComp: true,
                            "question/answer": true
                        }
                    },
                    {
                        type: 'button',
                        attrs: {
                            customClass: 'quote-submit-btn no-show',
                            disableRemove: true,
                            disableClone: true,
                            defaultComp: true
                        }
                    }
                ];

                function compTempToComp(compTemp) {
                    var comp = quoteSheetService.formioComponents[compTemp.type];
                    if (comp) {
                        comp = comp.settings;
                        if (compTemp.attrs) {
                            comp = _.merge(comp, compTemp.attrs);
                        };
                        return comp;
                    } else {
                        return null;
                    }
                };
                comps = comps.map(compTempToComp).filter(Boolean);
                var currentComps = form.questions.components;
                form.questions.components = currentComps.concat(comps);
                form.isBaseTemplate = true;
                return form;
            };

            function templateDescriptionChanged() {
                if ($scope.selectedTemplate.isBaseTemplate) {
                    return Boolean($scope.description);
                } else {
                    return $scope.description !== $scope.selectedTemplate.description;
                }
            };

            function templateTypeChanged() {
                if ($scope.selectedTemplate.isBaseTemplate) {
                    return Boolean($scope.type);
                } else {
                    return $scope.type.value !== $scope.selectedTemplate.type;
                }
            };

            function templateGlobalChanged() {
                if ($scope.selectedTemplate.isBaseTemplate) {
                    return Boolean($scope.global);
                } else {
                    return $scope.template.global !== $scope.selectedTemplate.global;
                }
            };
            $window.tempEditScope = $scope;

            //-----------------------------------------------------------------------------------------------------------------

            $scope.rater_types = {"hs_auto" : {"name" : "hs_auto", "label": "Hawksoft Auto"},
                                "hs_home": {"name" : "hs_home", "label" : "Hawksoft Home"}, 
                                "hs_commercial": {"name" : "hs_commercial" , "label" : "Hawksoft Commercial"}};
            $scope.usStates = $rootScope.usStates;
            $scope.addedInputs = {};
            $scope.headerInput = {};

            $scope.raterType = $scope.rater_types["hs_auto"];

            $scope.$watch('raterType', function(newVal, oldVal) {
                if (newVal && newVal != oldVal && !$scope.editing()) {
                    $scope.raterType = newVal;
                    $scope.changeRaterChallenge();
                    // $scope.headerInput = {};
                } else if(newVal && $scope.editing()){
                    //this should never be hit because the rater-type select should be 
                    //disabled during template-edit
                    if($scope.newTemp == $scope.oldTemp) {
                        $scope.raterType = newVal;
                        $scope.changeRaterChallenge();
                    } else {
                        $scope.raterType = newVal;
                        $scope.oldTemp = $scope.newTemp;
                        $scope.changeRaterChallenge();
                    }
                } else {
                    $scope.selectRaterType($scope.raterType);
                }
            });

            $scope.selectRaterType = function(raterType) {
                qss.getElementsDataByRater(raterType.name)
                    .then(function(response) {
                        if(response.data.success) {
                            $scope.elements = response.data.success.data.elements;
                        }
                    });
            };
            
            $scope.changeRaterChallenge = function() {
                if ($scope.addedInputs && Object.keys($scope.addedInputs).length > 0 ){
                    var message = 'Alert';
                    var submessage = 'Changing the rater type now will reset your added fields. ' +
                        'Are you sure you wish to proceed?';
                    $rootScope.confirmDialog(message, submessage).then(function(
                        response) {
                        if (response) {
                            $scope.addedInputs= {};
                            $scope.selectRaterType($scope.raterType);
                        }
                    });
                } else {
                    console.log("Challenge unnecessary.");
                    $scope.selectRaterType($scope.raterType);
                }
            };


            $scope.addInputFields = function(elements) {
                if(elements.name == 'Header') {
                    $scope.headerInput = {};
                    angular.forEach(elements.inputs, function(input) {
                        if(input.checked){
                            $scope.headerInput[input.label] = input;
                        }
                    });
                }
                else {
                    $scope.subject = {};
                    angular.forEach(elements.inputs, function(value, key) {
                        if(value.checked){
                            value['model'] = '';
                            if(value.field.includes('[x]')) value.field = value.field.replace('[x]', '[0]');
                            $scope.subject[key] = value;
                        }
                    });
                    $scope.addedInputs[elements.name] = $scope.subject;
                }

                $uibModalStack.dismissAll();
            };

            $scope.addExtraElement = function(element) {
                if($scope.addedInputs[element.name]) {
                    var newElement = element.name + ' ' + (++element.repeat);
                    $scope.newSubject = {};
                    angular.forEach(element.inputs, function(value, key) {
                        if(value.checked){
                            var newInput = angular.copy(value);
                            newInput.field = newInput.field.replace('[0]', '[' + element.repeat + ']');
                            $scope.newSubject[key] = newInput;
                        }
                    });

                    
                    var newModel = 'model'+element.repeat;
                    angular.forEach($scope.newSubject, function(sub) {
                        delete sub['model'];
                        sub[newModel] = "";
                    });
                    $scope.addedInputs[newElement] = $scope.newSubject;
                } else {
                    var message = 'You must select at least 1 input field for ' + element.name;
                    $rootScope.showInfoAlert(message);
                }
            }

            $scope.openInputSelector = function(element) {

                var size = Object.keys(element.inputs).length;
                var result1 = {};
                var result2 = {};
                
                var data = {
                    name: element.name,
                    elements: element,
                    addInputs: $scope.addInputFields,
                }
                $rootScope.showModalFull('/modals/input-selector-modal.html', data, 'lg');
            };

            $scope.removeElement = function(element, values) {
                var deleteConfirm = $mdDialog.confirm()
                    .title('Are you sure you want to Remove this element?')
                    .ariaLabel('Remove')
                    .ok('Yes')
                    .cancel('Never Mind');

                $mdDialog.show(deleteConfirm).then(function() {
                    delete $scope.addedInputs[element];
                    if($scope.elements[element.toLowerCase()]) {
                        angular.forEach($scope.elements[element.toLowerCase()].inputs, function(input){
                            if(input.checked) {
                                input.checked = false;
                            }
                        });
                    }
                });
            };


            $scope.removeInput = function(element, values, newinput) {

                if($scope.elements[element.toLowerCase()]) {
                    angular.forEach($scope.elements[element.toLowerCase()].inputs, function(input){
                        if(input.label == newinput.label) {
                            input.checked = false;
                        }
                    });
                }
                angular.forEach($scope.addedInputs[element], function(value, key){
                    if(value.label == newinput.label) {
                        delete $scope.addedInputs[element][key];
                    }
                });
                    
                if(Object.keys($scope.addedInputs[element]).length == 0) {
                    delete $scope.addedInputs[element];
                }
            }

            $scope.saveEdit = function(input) {
                $uibModalStack.dismissAll();
            };

            $scope.editInput = function(element, values, newinput) {
                $scope.editingInput = {};

                angular.forEach($scope.addedInputs[element], function(value, key){
                    if(value.label == newinput.label) {
                        $scope.editingInput = newinput;
                    }
                });

                var data = {
                    editingInput: $scope.editingInput,
                    saveEdit: $scope.saveEdit,
                    element: element
                }
                $rootScope.showModalWithData('/modals/input-editor-modal.html', data);
            }

            $scope.selectLogoPosition = function(position) {
                $scope.selectedPosition = position;
                $scope.headerInput.Logo['position'] = position;
            }

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

                    if($scope.headerInput.Logo)
                        $scope.headerInput.Logo['model'] = response.success.data;
                    if($scope.selectedTemplate.questions.header_fields) 
                    $scope.selectedTemplate.questions.header_fields.Logo['model'] = response.success.data;               
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

        }

    };
});
