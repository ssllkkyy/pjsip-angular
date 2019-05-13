"use strict";

proySymphony.service("quoteSheetService", function(dataFactory, $rootScope, metaService, _,
    resourceFrameworkService, contactService, locationService, $window, $cookies) {
    var service = {
        fnDocs: {},
        domainUuid: null,
        defaultChatChannel: null,
        templates: [],
        quotes: [],
        types: {},
        statuses: {},
        setAPIs: [],
        quoteEditorScope: null,
        formioComponents: {},
        raters: {},
        derivable: ["statuses", "types", "quotes", "templates"],
        callbackEvents: ["onAfterInit", "onLocationGroupChange"],
        templatesChangeCallbacks: []
    };

    //Pre-Initialization
    var triggerEvent = metaService.getCallbackEventTriggerFn(service);
    var rfs = resourceFrameworkService;
    var getResourceFn = rfs.getResourceFnForService({
        service: service,
        serviceName: "quoteSheetService",
        docTarget: service.fnDocs
    });
    metaService.initializeServiceCallbackColls(service);
    metaService.attachServiceEventRegistrationFns(service);
    //------------------

    service.init = function() {
        angular.copy($window.formioComponents, service.formioComponents);
        metaService.registerOnRootScopeUserLoadCallback(function() {
            service.domainUuid = $rootScope.user.domain_uuid;
            service.defaultChatChannel = $rootScope.user.domain.default_chat_channel;
            loadLocation(getLocationFromLS()).then(function(successful) {
                // if (successful) {
                service.intializeResources();
                // }
            });
        });
    };

    service.intializeResources = function() {
        service.loadStatuses(service.domainUuid).then(function(response) {
            // service.loadTypes(service.domainUuid).then(function(response) {
            service.loadTemplates(getCurrentLocationUuid())
                .then(function(response) {
                    service.loadQuotes(getCurrentLocationUuid())
                        .then(function(response) {
                            service.loadRaters().then(function(response) {
                                triggerEvent("onAfterInit");
                            });
                        });
                });
            // });
        });
    };

    rfs.registerResourceDerivableFns({
        service: service,
        derivable: service.derivable
    });

    rfs.registerResourceRelations(service, {
        quotes: [{
                relationName: "template",
                relationCollName: "templates",
                relationProperty: "quote_sheet_template_uuid"
            },
            {
                relationName: "status",
                relationCollName: "statuses",
                relationProperty: "quote_sheet_status_uuid"
            },
            // { relationName: "type", relationColl: service.types,
            //   relationProperty: "quote_sheet_type_uuid" }
        ],
        templates: [
            // { relationName: "type", relationColl: service.types,
            //   relationProperty: "quote_sheet_type_uuid", missingDepLoadFn: "loadType" }
        ]
    });

    function validLocations(locations) {
        if (!_.isArray(locations)) {
            return false;
        }

        function matchingLocation(location) {
            return location.locations_group_uuid === getCurrentLocationUuid();
        }
        return Boolean(_.find(locations, matchingLocation));
    }

    rfs.registerDerivedValFns(service, [
        ["activeTemplates", "templates", {
            filter: {
                active: true
            }
        }],
        ["activeTemplatesAtCurrentLocation", "templates",
            {
                filter: {
                    active: true,
                    locations: validLocations
                }
            }
        ],
        ["globalTemplates", "templates", {
            filter: {
                global: true
            }
        }],
        ["activeGlobalTemplates", "templates", {
            filter: {
                active: true,
                global: true
            }
        }],
        ["activeNonGlobalTemplates", "templates", {
            filter: {
                active: true,
                global: false
            }
        }],
        ["activeStatuses", "statuses", {
            filter: {
                active: true
            }
        }],
        ["activeNonGlobalStatuses", "statuses", {
            filter: {
                active: true,
                global: false
            }
        }],
        ["activeTypes", "types", {
            filter: {
                active: true
            }
        }],
        ["activeGlobalTypes", "types", {
            filter: {
                active: true,
                global: true
            }
        }],
        ["activeNonGlobalTypes", "types", {
            filter: {
                active: true,
                global: false
            }
        }],
        ["activeGlobalStatuses", "statuses", {
            filter: {
                active: true,
                global: true
            }
        }],
        ["quotesGroupedByAssignedToAndTemplateName", "quotes",
            {
                group: {
                    fields: ["assigned_to.user_name_given", "template.description"]
                }
            }
        ],
        ["quotesGroupedByStatus", "quotes", {
            group: {
                fields: ["statuses.quote_sheet_status_name"]
            }
        }],
        ["quotesGroupedByAssignedToAndStatusName", "quotes",
            {
                group: {
                    fields: ["statuses.quote_sheet_status_name",
                        "assigned_to.user_name_given"
                    ]
                }
            }
        ]
    ]);

    // SERVER RETRIEVAL FUNCTIONS
    service.loadTypes = getResourceFn({
        apiFn: dataFactory.getQuoteSheetTypes,
        handlerData: {
            target: service.types,
            handleType: "array>object",
            propertyName: "quote_sheet_type_uuid",
            resourceName: "types"
        }
    });

    service.loadType = getResourceFn({
        apiFn: dataFactory.getQuoteSheetType,
        handlerData: {
            target: service.types,
            handleType: "object",
            propertyName: "quote_sheet_type_uuid",
            resourceName: "types",
            attachToParent: {
                resourcePropName: "type",
                requestPropName: "quote_sheet_type_uuid"
            }
        },
        doc: {
            loadType: {
                quote_sheet_type_uuid: ["single param", "required"]
            }
        }
    });

    service.loadQuotes = getResourceFn({
        apiFn: dataFactory.getQuoteSheets,
        handlerData: {
            target: service.quotes,
            handleType: "copy",
            resourceName: "quotes"
        }
    });

    service.loadQuotesSnapshot = getResourceFn({
        apiFn: dataFactory.retrieveQuotesAtSnapshot,
        handlerData: {
            handleType: "noop",
            onSuccess: function(resource, handlerData) {
                function getServiceQuote(quote) {
                    var serviceQuote = service.findQuoteByUuid(quote.quote_sheet_uuid);
                    serviceQuote.history = quote.history;
                    return serviceQuote;
                }
                return handlerData.returnVal.map(getServiceQuote).filter(
                    Boolean);
            }
        },
        doc: {
            loadQuotesSnapshot: {
                locations_group_uuid: ["required"],
                snapshot_timestamp_in_secs: ["required"]
            }
        }
    });

    service.loadQuestions = getResourceFn({
        apiFn: dataFactory.getQuoteSheetQuestions,
        handlerData: {
            handleType: "attach",
            sourcePath: "questions",
            attachToParent: {
                resourcePropName: "questions",
                requestPropName: "quote_sheet_template_uuid"
            }
        }
    });

    service.loadQuoteAnswers = getResourceFn({
    apiFn: dataFactory.getQuoteSheetAnswers,
    handlerData: {
        handleType: "attach",
        sourcePath: "answers",
        attachToParent: {
            resourcePropName: "answers",
            requestPropName: "quote_sheet_uuid"
        }
    }
    });

    service.loadTemplates = getResourceFn({
        apiFn: dataFactory.getQuoteSheetTemplates,
        handlerData: {
            target: service.templates,
            handleType: "copy",
            resourceName: "templates",
            onSuccess: function(resource, handlerData) {
                var templates = handlerData.target;

                function noType(template) {
                    return !Boolean(template.type);
                };
                var typelessTemplates = templates.filter(noType);

                function isGlobal(template) {
                    return template.global;
                };
                var globalTemplates = templates.filter(isGlobal);
                
                function attachHiddenStatus(template) {
                    template.hidden = service.globalTemplateIsHidden(template);
                };
                globalTemplates.forEach(attachHiddenStatus);
            }
        }
    });

    service.loadTemplate = getResourceFn({
        apiFn: dataFactory.getQuoteSheetTemplate,
        handlerData: {
            target: service.templates,
            handleType: "push",
            resourceName: "templates",
            attachToParent: {
                resourcePropName: "template",
                requestPropName: "quote_sheet_template_uuid"
            }
        }
    });

    service.loadStatuses = getResourceFn({
        apiFn: dataFactory.getQuoteSheetStatuses,
        handlerData: {
            target: service.statuses,
            handleType: "array>object",
            propertyName: "quote_sheet_status_uuid",
            resourceName: "statuses"
        }
    });

    service.loadRaters = getResourceFn({
        apiFn: dataFactory.getQuoteSheetRaters,
        handlerData: {
            target: service.raters,
            handleType: "array>object",
            propertyName: "rater_id",
            resourceName: "raters"
        }
    });


    // SERVER MODIFICATION FUNCTIONS
    service.createType = getResourceFn({
        apiFn: dataFactory.postCreateQuoteSheetType,
        handlerData: {
            target: service.types,
            handleType: "object",
            resourceName: "types",
            propertyName: "quote_sheet_type_uuid",
            onBeforeHandle: function(handlerData) {
                var typeData = handlerData.requestData;
                typeData.global = false;
                typeData.active = true;
            }
        },
        doc: {
            createType: {
                quote_sheet_type_name: ["required"],
                description: ["required"],
                type: ["required"],
                global: ["recommended"]
            }
        }
    });

    service.deleteType = getResourceFn({
        apiFn: dataFactory.deleteQuoteSheetType,
        handlerData: {
            handleType: "noop",
            resourceName: "types",
            onBeforeHandle: function(handlerData) {
                handlerData.noopReturnVal = handlerData.requestData;
                handlerData.requestData = handlerData.requestData.quote_sheet_type_uuid;
            },
            onSuccess: function(resource, handlerData) {
                var typeUuid = resource.quote_sheet_type_uuid;
                var type = service.types[typeUuid];
                if (type) {
                    type.active = false;
                }
            }
        },
        doc: {
            deleteType: {
                client: {
                    description: "Requires the actual type object (copies disallowed)"
                }
            }
        }
    });

    service.deleteTemplate = getResourceFn({
        apiFn: dataFactory.postDeleteQuoteSheetTemplate,
        handlerData: {
            handleType: "noop",
            resourceName: "templates",
            onBeforeHandle: function(handlerData) {
                handlerData.noopReturnVal = handlerData.requestData;
            },
            onSuccess: function(resource, handlerData) {
                var template = handlerData.requestData;
                if (template) {
                    template.active = false;
                }
            }
        },
        doc: {
            deleteTemplate: {
                client: {
                    description: "Requires the actual template object (copies disallowed)"
                },
                server: {
                    quote_sheet_template_uuid: ["required"]
                }
            }
        }
    });

    service.createTemplate = getResourceFn({
        apiFn: dataFactory.postStoreTemplate,
        handlerData: {
            target: service.templates,
            handleType: "push",
            resourceName: "templates",
            onSuccess: function(template, handlerData) {
            }
        },
        doc: {
            createTemplate: {
                questions: ["required"],
                quote_sheet_type_uuid: ["required"],
                description: ["required"],
                locations_group_uuid: ["required"],
                location_uuids: ["required", "array"],
                global: ["required"]
            }
        }
    });

    service.createQuote = getResourceFn({
        apiFn: dataFactory.postCreateQuoteSheet,
        handlerData: {
            target: service.quotes,
            handleType: "push",
            resourceName: "quotes",
            onBeforeHandle: function(handlerData) {
                var locationUuid = handlerData.requestData.locations_group_uuid;
                if (!locationUuid) {
                    handlerData.requestData.locations_group_uuid =
                        getCurrentLocationUuid();
                }
            }
        },
        doc: {
            createQuote: {
                quote_sheet_template_uuid: ["required"],
                quote_sheet_status_uuid: ["required"],
                customer_name: ["required"],
                created_by: ["required"],
                locations_group_uuid: ["required"],
            }
        }
    });

    // SERVICE MODIFICATION FUNCTIONS
    service.registerQuoteEditorScope = function(scope) {
        service.quoteEditorScope = scope;
    };

    service.createStatus = getResourceFn({
        apiFn: dataFactory.postCreateQuoteSheetStatus,
        handlerData: {
            target: service.statuses,
            handleType: "object",
            resourceName: "statuses",
            propertyName: "quote_sheet_status_uuid"
        },
        doc: {
            createStatus: {
                quote_sheet_status: ["required"],
                quote_sheet_status_name: ["required"],
                description: ["required"],
                global: ["required"]
            }
        }
    });

    service.updateStatus = function(status) {
        return dataFactory.postUpdateQuoteSheetStatus(status)
            .then(function(response) {
                if (response.data.success) {
                    var uuid = response.data.success.data.quote_sheet_status_uuid;
                    var data = response.data.success;
                    angular.forEach(service.statuses, function(value, key) {
                        if (value.quote_sheet_status_uuid === uuid) {
                            var quote_sheet_status_name = data.data.quote_sheet_status_name;
                            value.quote_sheet_status_name =
                                quote_sheet_status_name;
                            value.description = response.data.success.data.description;
                        }
                    });
                    return response.data;
                } else {
                    return response.data;
                }
            });
    };

    service.postUpdateTemplate = getResourceFn({
        apiFn: dataFactory.postStoreTemplate,
        handlerData: {
            target: service.templates,
            handleType: "push",
            resourceName: "templates",
            onSuccess: function(resource, handlerData) {
                var template = handlerData.requestData.template;
                //template.active = false;
            }
        },
        doc: {
            postUpdateTemplate: {
                questions: ["required"],
                quote_sheet_type_uuid: ["required"],
                description: ["required"],
                locations_group_uuid: ["required"]
            }
        }
    });

    service.postUpdateTemplateLocations = getResourceFn({
        apiFn: dataFactory.updateTemplateLocations,
        handlerData: {
            handleType: "copy",
            resourceName: "templates",
            onBeforeHandle: function(handlerData) {
                var template = handlerData.requestData.template;
                var templateUuid = template.quote_sheet_template_uuid;
                handlerData.requestData.quote_sheet_template_uuid =
                    templateUuid;
                delete handlerData.requestData.template;
                if (!template.locations) {
                    template.locations = [];
                }
                handlerData.target = template.locations;
            }
        },
        doc: {
            postUpdateTemplateLocations: {
                quote_sheet_template_uuid: ["required"],
                location_uuids: ["required"]
            }
        }
    });


    service.postUpdateQuote = getResourceFn({
        apiFn: dataFactory.postUpdateQuoteSheet,
        handlerData: {
            handleType: "copy",
            resourceName: "quotes",
            onBeforeHandle: function(handlerData) {
                var quote = handlerData.requestData.quote;
                handlerData.target = quote;
            },
            onSuccess: function(resource, handlerData) {
                if (resource.assigned_to) {
                    var contact = contactService.getContactByUserUuid(resource.assigned_to);
                    if (contact) {
                        handlerData.target.assigned_to = {
                            user_name_given: contact.name,
                            user_name_family: "",
                            user_uuid: contact.user_uuid
                        };
                    }
                }
            }
        }
    });

    service.postUpdateType = getResourceFn({
        apiFn: dataFactory.postUpdateQuoteSheetType,
        handlerData: {
            handleType: "copy",
            resourceName: "types",
            onBeforeHandle: function(handlerData) {
                var type = handlerData.requestData;
                handlerData.requestData = type.updatedType;
                handlerData.requestData.active = true;
                handlerData.requestData.global = true;
                handlerData.target = type;
                handlerData.requestData = {
                    quote_sheet_type: handlerData.requestData
                };
            }
        },
        doc: {
            postUpdateType: {
                client: {
                    description: [
                        "Required the actual type object with an \"updatedType\"" +
                        "field containing the updated type information"
                    ]
                },
                server: {
                    quote_sheet_type: ["required"]
                }
            }
        }
    });

    service.postQuoteSheetApis = function(api) {
        return dataFactory.postQuoteSheetApis(api).then(function(response) {
            return response.data;
        });
    };

    service.deleteQuoteSheet = function(quotesheet) {
        return dataFactory.postDeleteQuoteSheet(quotesheet).then(function(response) {
            if (response.data.success) {
                var index = service.quotes.indexOf(quotesheet);
                service.quotes.splice(index, 1);
                rfs.triggerResourceChangeCallback({
                    resourceName: "quotes",
                    service: service
                });
                return response.data;
            } else {
                return response.data;
            }
        });
    };

    service.deleteQuoteSheetStatus = function(status) {
        var request = {
            "quote_sheet_status": {
                "quote_sheet_status_uuid": status.quote_sheet_status_uuid
            }
        };
        return dataFactory.postDeleteQuoteSheetStatus(request).then(function(response) {
            if (response.data.success) {
                var qs_status = response.data.success.data;

                function matches(item) {
                    return item.quote_sheet_status_uuid == qs_status.quote_sheet_status_uuid;
                }
                _.find(service.statuses, matches).active = false;
                return response.data;
            } else {
                return response.data;
            }
        });
    };

    service.postUpdateDefaultChannel = function(channel) {
        return dataFactory.postUpdateDefaultChannel(channel).then(function(response) {
            if (response.data.success) {
                service.defaultChatChannel = response.data.success.data.domain_setting_value;
                return service.defaultChatChannel;
            } else {
                return response.data;
            }
        });
    };

    service.loadRaterFieldsForExport = getResourceFn({
        apiFn: dataFactory.loadRaterFieldsForExport,
        handlerData: {
            handleType: "noop"
        }
    });

    service.getRaterByName = function(rater_name) {
        return dataFactory.getRaterByName(rater_name).then(function(response) {
            return response.data;
        });
    };

    service.postQuoteSheetRater = function(data) {
        return dataFactory.postQuoteSheetRater(data).then(function(response) {
            return response.data;
        });
    };

    service.getQuoteSheetRater = function(template_id, rater_id) {
        return dataFactory.getQuoteSheetRater(template_id, rater_id).then(function(
            response) {
            return response.data;
        });
    };

    service.getQuoteSheetRaterFields = function(template_id, rater_id) {
        return dataFactory.getQuoteSheetRaterFields(template_id, rater_id)
            .then(function(response) {
                return response.data;
            });
    };

    service.getQuoteSheetRaterEmptyFields = function(rater_id) {
        return dataFactory.getQuoteSheetRaterEmptyFields(rater_id).then(function(
            response) {
            return response.data;
        });
    };

    service.getTemplateFields = function(template_id) {
        return dataFactory.getTemplateFields(template_id).then(function(response) {
            return response.data;
        });
    };

    service.exportQuoteSheet = function(data) {
        return dataFactory.postExportQuotesheet(data).then(function(response) {
            return response.data;
        });
    };

    // Callback registration
    service.registerEventCallback = function(eventName, callback) {
        var callbackData = service.callbacks[eventName];
        metaService.registerServiceCallbackData({
            service: service,
            triggerIfAlreadyCalled: true,
            callbackData: callbackData,
            callback: callback
        });
    };

    service.registerOnAfterInitCallback = function(callback) {
        service.registerEventCallback("onAfterInit", callback);
    };

    // Internal Callback Registration
    service.registerOnLocationGroupChangeCallback(function() {
        service.loadTemplates(getCurrentLocationUuid())
            .then(function(response) {
                service.loadQuotes(getCurrentLocationUuid());
            });
    });

    service.registerOnAfterInitCallback(function() {
        angular.forEach(service.raters, function(value, key) {
            _.find($rootScope.user.domain.quoteSheetApiList,
                function(element) {
                    if (value.rater_name == element) {
                        service.setAPIs.push(value);
                    }
                });
        });
    });

    // Helper Functions
    service.findTemplateByUuid = function(templateUuid) {
        return findTemplateByUuid(templateUuid);
    };

    service.findQuoteByUuid = function(quoteUuid) {
        return findQuoteByUuid(quoteUuid);
    };

    service.setCurrentLocationUuid = function(locationUuid) {
        var prevLocationUuid = service.currentLocationUuid;
        service.currentLocationUuid = locationUuid;
        persistLocationToLS(locationUuid);
        if (locationUuid && locationUuid !== prevLocationUuid) {
            triggerEvent("onLocationGroupChange");
        }
    };

    service.attachTemplate = function(quote) {
        if (!quote.template) {
            var template = findTemplateByUuid(quote.quote_sheet_template_uuid);
            if (!template) {
                return service.loadTemplate(quote);
            } else {
                quote.template = template;
                return new Promise(function(resolve) {
                    resolve(quote);
                });
            }
        }
        return quote;
    };

    service.attachTemplateAndQuestions = function(quote) {
        if (!quote.template) {
            return service.attachTemplate(quote).then(function(response) {
                if (response) {
                    return service.loadQuestions(quote.template);
                }
                return response;
            });
        } else {
            return service.loadQuestions(quote.template);
        }
    };

    service.getQuoteSheetFileInfo = getResourceFn({
        apiFn: dataFactory.postGetQuoteSheetFileInfo,
        handlerData: {
            handleType: "noop",
            onSuccess: function(resource, handlerData) {
                return resource ? resource.hash : null;
            }
        },
        doc: {
            getQuoteSheetFileInfo: {
                client: {
                    description: [
                        "Requires the actual quote object ",
                        "Copies allowed but are intended to be deprecated"
                    ]
                },
                server: {
                    quote_sheet_uuid: ["required"]
                }
            }
        }
    });

    service.getQuoteSheetPdf = getResourceFn({
        apiFn: dataFactory.postGetQuoteSheetPdf,
        handlerData: {
            returnBareResponse: true
        },
        doc: {
            getQuoteSheetPdf: {
                server: {
                    file_view_hash: ["required"],
                    password: ["required"]
                }
            }
        }
    });

    service.domainHideTemplateToggle = getResourceFn({
        apiFn: dataFactory.domainHideGlobalTemplate,
        handlerData: {
            handleType: "noop",
            resourceName: "templates",
            onBeforeHandle: function(handlerData) {
                var template = handlerData.requestData;
                if (template) {
                    handlerData.template = template;
                    handlerData.requestData = template.quote_sheet_template_uuid;
                }
            },
            onSuccess: function(hidden, handlerData) {
                if (hidden) {
                    hidden = JSON.parse(hidden);
                }
                if (hidden) {
                    $rootScope.user.domain.hidden_quote_templates.push(
                        handlerData.template);
                    handlerData.template.hidden = true;
                } else {
                    var templateUuid = handlerData.template.quote_sheet_template_uuid;

                    function matchesTemplate(template) {
                        return template.quote_sheet_template_uuid ===
                            templateUuid;
                    };
                    _.remove($rootScope.user.domain.hidden_quote_templates,
                        matchesTemplate);
                    handlerData.template.hidden = false;
                }
            }
        }
    });

    service.globalTemplateIsHidden = function(template) {
    // returns true if template is hidden
        var templateUuid = template.quote_sheet_template_uuid;

        function matchesTemplate(template) {
            return template.quote_sheet_template_uuid === templateUuid;
        };
        return $rootScope.user.domain.hidden_quote_templates.some(matchesTemplate);
    };

    // PRIVATE
    function findTemplateByUuid(templateUuid) {
        return findItemFromCollByPropAndVal(
            service.templates, "quote_sheet_template_uuid", templateUuid
        );
    };

    function findQuoteByUuid(quoteUuid) {
        return findItemFromCollByPropAndVal(
            service.quotes, "quote_sheet_uuid", quoteUuid
        );
    };

    function findItemFromCollByPropAndVal(coll, prop, val) {
        function isMatch(item) {
            return item[prop] === val;
        };
        return _.find(coll, isMatch);
    };

    function getCurrentLocationUuid() {
        return service.currentLocationUuid;
    };

    function loadLocation(locationUuid) {
        var locationType = "quotesheet";
        return locationService.getLocationGroups(locationType, service.domainUuid)
            .then(function(response) {
                if (goodLocationGroupsResponse(response)) {
                    if (locationUuid && locationService.locationGroups[locationUuid]) {
                        service.currentLocationUuid = locationUuid;
                    } else {
                        service.currentLocationUuid = locationService.currentLocation;
                    }
                    return true;
                }
                return false;
            });
    };

    function goodLocationGroupsResponse(response) {
        return _.isPlainObject(response) && Object.keys(response).length > 0;
    };

    function getLocationFromLS() {
        return $cookies.get("quoteSheetLocation");
    };

    function persistLocationToLS(locationUuid) {
        $cookies.put("quoteSheetLocation", locationUuid);
    };


    //------------------------------------------------------------------------------------------------------

    service.getElementsDataByRater = function(raterType) {
        return dataFactory.getElementDataByRaterName(raterType)
            .then(function(response) {
                return response;
            });
    };  

    service.init();
    return service;
});
