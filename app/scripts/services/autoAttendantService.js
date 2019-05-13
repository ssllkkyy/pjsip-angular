"use strict";

proySymphony.service("autoAttendantService", function(metaService, resourceFrameworkService, dataFactory, $rootScope, fileService, $q, contactService, usefulTools, $filter, $window, audioLibraryService, callFlowScheduleFactory, $mdDialog, uneditableArrayFactory, ivrMenuFactory) {
    var service = {
        fnDocs: {},
        hasInitialized: null,
        callbackEvents: ["onAfterInit", "actionsAttached"],
        templatesChangeCallbacks: [],
        attendants: [],
        destinations: [],
        timeConditions: [],
        ringGroups: [],
        voicemails: [],
        ivrs: [],
        extensions: [],
        audioLibraries: [],
        recordings: [],
        transcriptModels: new uneditableArrayFactory([])
    };

    //Pre-Initialization
    var rfs = resourceFrameworkService;
    var getResourceFn = rfs.getResourceFnForService({
        service: service,
        serviceName: "autoAttendantService",
        docTarget: service.fnDocs
    });
    var relations = {
        attendants: [{
            relationName: "destination",
            relationProperty: "destination_uuid",
            relationCollName: "destinations"
        }, {
            relationName: "additional_destinations",
            relationProperty: "additional_destinations",
            relationIdProperty: "destination_uuid",
            relationCollName: "destinations"
        }]
    };

    var derivations = [
        ["actionableActions", "actions", {
            filter: {
                name: boolCompose(notNone, notTimeCondition)
            }
        }],
        ["extensionsByExtension", "extensions", {
            toObj: {
                prop: "extension"
            }
        }],
        ["ringGroupsByExtension", "ringGroups", {
            toObj: {
                prop: "ring_group_extension"
            }
        }],
        ["ivrsByExtension", "ivrs", {
            toObj: {
                prop: "ivr_menu_extension"
            }
        }],
        ["transcriptsByLibraryUuid", "transcriptModels", {
            toObj: {
                prop: "audio_library_uuid"
            }
        }],
        ["transcripts", "transcriptModels", {}],
        ["destinationsByDestinationNumber", "destinations", {
            toObj: {
                prop: "destination_number"
            }
        }],
        ["unassignedDestinations", ["destinations", "attendants"], {
            filter: {
                destination_uuid: isUnassignedDestinationUuid
            }
        }],
        ["extensionsByDid", "extensions", {
            toObj: {
                props: ["number_alias", "outbound_caller_id_number", "effective_caller_id_number"]
            }
        }],
        ["nonVoicemailExtensions", "extensions", {
            filter: {
                description: isNonVoicemailExtensionDescription
            }
        }],
        ["transferOpts", "actions", {
            filter: {
                transferOptDisplayRoot: Boolean
            },
            map: ["resourceCollName", "transferOptResourceName", "transferOptDisplayRoot"]
        }],
        ["greetingVoicemails", "voicemails", {
            filter: {
                greeting: Boolean
            }
        }]
    ];

    var derivable = _.uniq(derivations.map(function(derivation) {
        return _.isArray(derivation[1]) ? derivation[1][0] : derivation[1];
    }));

    service.actions = [{
        name: "time-condition",
        title: "Create Schedule"
    }, {
        name: "ivr",
        title: "Use IVR Menu",
        actionDetailInfo: {
            checkFn: ivrActionDetailCheckFn,
            actionResourceFindSpecGenFn: ivrResourceFindSpecGenFn
        },
        resourceInfoFn: getIvrManageTableInfo,
        resourceName: "IVR",
        resourceCollName: "ivrs",
        prefix: "ivr-",
        manageableResource: true,
        isSelectable: true,
        transferOptDisplayRoot: "IVR: ",
        isIvrOpt: true,
        displayTitleFn: displayIvrTitle,
        loadFn: "loadIvrs"
    }, {
        name: "ring-group",
        title: "Send to Ring Group",
        actionDetailInfo: {
            checkFn: ringGroupActionDetailCheckFn,
            actionResourceFindSpecGenFn: ringGroupResourceFindSpecGenFn
        },
        resourceInfoFn: getRingGroupManageTableInfo,
        resourceName: "Ring Group",
        resourceCollName: "ringGroups",
        prefix: "rg-",
        manageableResource: true,
        transferOptDisplayRoot: "RingGroup - ",
        isIvrOpt: true,
        isSelectable: true,
        displayTitleFn: displayRingGroupTitle,
        loadFn: "loadRingGroups"
    }, {
        name: "voicemail",
        title: "Send to Voicemail",
        actionDetailInfo: {
            checkFn: voicemailActionDetailCheckFn,
            actionResourceFindSpecGenFn: voicemailResourceFindSpecGenFn
        },
        resourceInfoFn: getVoicemailManageTableInfo,
        resourceName: "Voicemail",
        resourceCollName: "voicemails",
        prefix: "vm-",
        manageableResource: true,
        transferOptDisplayRoot: "Voicemail - ",
        isIvrOpt: true,
        isSelectable: true,
        displayTitleFn: displayVoicemailTitle,
        loadFn: "loadVoicemails"
    }, {
        name: "announcement",
        title: "Send to Message Announcement",
        actionDetailInfo: {
            checkFn: announcementActionDetailCheckFn,
            actionResourceFindSpecGenFn: announcementResourceFindSpecGenFn,
            getFreeswitchRecordingPath: function(recordingFileName, domainName) {
                if (!domainName) {
                    domainName = $rootScope.user.domain.domain_name;
                }
                return "/imported/freeswitch/recordings/" + domainName + "/" +
                    recordingFileName;
            }
        },
        resourceInfoFn: getAnnouncementManageTableInfo,
        resourceName: "Message Announcement",
        resourceCollName: "audioLibraries",
        prefix: "ma-",
        manageableResource: true,
        transferOptDisplayRoot: "Message Announcement - ",
        isIvrOpt: true,
        isSelectable: true,
        displayTitleFn: displayAnnouncementTitle,
        loadFn: "loadAudioLibraries"
    }, {
        name: "extension",
        title: "Transfer to Extension",
        actionDetailInfo: {
            checkFn: extensionActionDetailCheckFn,
            actionResourceFindSpecGenFn: extensionResourceFindSpecGenFn
        },
        resourceInfoFn: getAnnouncementManageTableInfo,
        resourceName: "Extension",
        resourceCollName: "extensions",
        transferOptResourceName: "nonVoicemailExtensions",
        transferOptDisplayRoot: "Extension: ",
        isIvrOpt: true,
        loadFn: "loadExtensions",
        noResourceErrorMessage: "Please choose an extension to add this action to your Call Flow.",
        isSelectable: true
    }, {
        name: "external-did",
        title: "Transfer to External Number",
        actionDetailInfo: {
            checkFn: externalDidActionDetailCheckFn,
            derivedActionResource: externalDidDerivedActionResourceFn
        },
        resourceName: "External DID",
        isIvrOpt: true,
        loadFn: "loadDestinations",
        noResourceErrorMessage: "Please enter a phone number to add this action to your Call Flow.",
        isSelectable: true
    }, {
        name: "hang-up",
        title: "Hang Up Call",
        actionDetailInfo: {
            checkFn: hangUpActionDetailCheckFn
        },
        isSimpleAction: true,
        isSelectable: true,
        actionTitle: "Hang Up"
    }, {
        name: "dialbyname",
        title: "Dial By Name",
        actionDetailInfo: {
            checkFn: dialByNameActionDetailCheckFn
        },
        isSimpleAction: true,
        actionTitle: "Dial By Name",
        isSelectable: true,
        isIvrOpt: true
    }];

    // Initialization
    var triggerEvent = metaService.withCallbacks(service);
    service.init = function() {
        if (service.hasInitialized) { return; }
        rfs.registerResourceRelations(service, relations);
        rfs.addResourceDependencyRegister(service);
        rfs.registerDerivedValFns(service, derivations);
        rfs.registerResourceDerivableFns({
            service: service,
            derivable: derivable
        });
        service.registerOnAfterInitCallback(function() { service.hasInitialized = true; });
        loadResources().then(function() { triggerEvent("onAfterInit"); });
    };
    service.loadPortingActions = loadPortingActions;

    // Server Modification Functions
    service.updateAttendant = getResourceFn({
        apiFn: dataFactory.updateAttendant,
        handlerData: {
            handleType: "copy",
            resourceName: "attendants",
            onBeforeHandle: function(handlerData) {
                var autoAttendantUuid = handlerData.requestData.auto_attendant_uuid;
                var attendant = _.find(service.attendants, {
                    auto_attendant_uuid: autoAttendantUuid
                });
                handlerData.target = attendant;
                handlerData.sharedData = {
                    actionResource: attendant.actionResource
                };
            },
            onSuccess: function(attendant, handlerData) {
                var attendantSpec = {
                    auto_attendant_uuid: attendant.auto_attendant_uuid
                };
                var requestData = handlerData.requestData;
                if (requestData instanceof FormData) {
                    requestData = fileService.convertFormDataToObj(requestData);
                    if (requestData.compressed) {
                        requestData = JSON.parse(requestData.compressed);
                    }
                }
                reloadAttendantResources({
                    actionResource: handlerData.sharedData.actionResource
                });
            }
        },
        doc: {
            updateAttendant: {
                auto_attendant_uuid: ["required", "uuid"],
                action_name: ["optional", "string"],
                group_number: ["optional", "string"],
                destination_uuid: ["optional", "uuid"],
                timezone: ["optional", "string"]
            }
        }
    });

    service.createAttendant = getResourceFn({
        apiFn: dataFactory.createAttendant,
        handlerData: {
            target: service.attendants,
            handleType: "push",
            resourceName: "attendants",
            onSuccess: function(attendant, handlerData) {
                reloadAttendantResources({
                    attendantUuid: attendant.auto_attendant_uuid
                });
            }
        },
        doc: {
            createAttendant: {
                destination_uuid: ["required", "uuid"],
                description: ["optional", "string"],
                additional_destinations: ["optional", "array"],
                action: ["optional", "resource"]
            }
        }
    });

    service.cloneAttendant = getResourceFn({
        apiFn: dataFactory.cloneAttendant,
        handlerData: {
            target: service.attendants,
            handleType: "push",
            resourceName: "attendants",
            onSuccess: function(attendant, handlerData) {
                reloadAttendantResources({
                    attendantUuid: attendant.auto_attendant_uuid
                });
            }
        },
        doc: {
            cloneAttendant: {
                destinations: ["array"],
                original_attendant_uuid: ["required", "uuid"]
            }
        }
    });


    service.deleteAttendant = getResourceFn({
        apiFn: dataFactory.deleteAttendant,
        handlerData: {
            target: service.attendants,
            handleType: "remove",
            propertyName: "auto_attendant_uuid",
            resourceName: "attendants",
            onBeforeHandle: function(handlerData) {
                handlerData.sharedData = {
                    actionResource: handlerData.target[0].actionResource
                };
            },
            onSuccess: function(attendant, handlerData) {
                return reloadAttendantResources({
                    actionResource: handlerData.sharedData.actionResource
                });
            }
        },
        doc: {
            deleteAttendant: {
                auto_attendant_uuid: ["required", "uuid"]
            }
        }
    });


    service.createQueueManager = function() {
        return dataFactory.getCreateQueueManager($rootScope.user.domain_uuid) 
            .then(function(response) {
                if(response.data.success){
                    return response.data.success.data;
                } else {
                    return null;
                }

            });
    };

    service.loadResource = getResourceFn({
        apiFn: dataFactory.getResource,
        handlerData: {
            handleType: "noop",
            returnBareResponse: true,
            onBeforeHandle: function(handlerData) {
                var requestData = handlerData.requestData;
                var resourceName = requestData.resourceName;
                var resourceUuid = requestData.resourceUuid;
                handlerData.spread = true;
                handlerData.requestData = [resourceName, resourceUuid];
            }
        },
        doc: {
            loadResource: {
                noParams: true
            }
        }
    });

    service.createResource = getResourceFn({
        apiFn: dataFactory.createResource,
        handlerData: {
            handleType: "noop",
            returnBareResponse: true,
            onBeforeHandle: function(handlerData) {
                if (handlerData.requestData.asFormData) {
                    handlerData.requestData = packageAsFormData(handlerData.requestData);
                }
            }
        },
        doc: {
            createResource: {
                resource_name: ["required", "string"],
                opts: ["required", "object"],
                dialplan_uuid: ["optional", "uuid"]
            }
        }
    });

    service.updateResource = getResourceFn({
        apiFn: dataFactory.updateResource,
        handlerData: {
            handleType: "noop",
            returnBareResponse: true,
            onBeforeHandle: function(handlerData) {
                if (handlerData.requestData.asFormData) {
                    handlerData.requestData = packageAsFormData(handlerData.requestData);
                }
            }
        },
        doc: {
            updateResource: {
                resource_name: ["required", "string"],
                opts: ["required", "object"],
                dialplan_uuid: ["optional", "uuid"]
            }
        }
    });

    service.destroyResource = getResourceFn({
        apiFn: dataFactory.destroyResource,
        handlerData: {
            handleType: "noop",
            returnBareResponse: true
        },
        doc: {
            updateResource: {
                resource_name: ["required", "string"],
                opts: ["required", "object"]
            }
        }
    });

    service.createIvr = getResourceFn({
        apiFn: service.createResource,
        handlerData: {
            target: service.ivrs,
            handleType: "push",
            resourceName: "ivrs",
            onBeforeHandle: function(handlerData) {
                var opts = handlerData.requestData;
                if (!opts.domain_uuid) { opts.domain_uuid = $rootScope.user.domain_uuid; }
                var data = { resource_name: "ivr", opts: opts };
                if (opts.files && opts.files.length > 0) {
                    var files = opts.files;
                    var fileReattachPaths = opts.fileReattachPaths;
                    data = _.merge(data, {
                        files: files,
                        fileReattachPaths: fileReattachPaths,
                        asFormData: true
                    });
                }
                handlerData.requestData = data;
            },
            onSuccess: function(ivr, handlerData) {
                // return reloadIvrResources(ivr);
            }
        },
        doc: { createIvr: {} }
    });

    service.updateIvr = getResourceFn({
        apiFn: service.updateResource,
        handlerData: {
            handleType: "replace",
            resourceName: "ivrs",
            propertyName: "ivr_menu_uuid",
            onBeforeHandle: function(handlerData) {
                var opts = handlerData.requestData;
                if (!opts.domain_uuid) {
                    opts.domain_uuid = $rootScope.user.domain_uuid;
                }
                var data = {
                    resource_name: "ivr",
                    opts: opts
                };
                if (opts.files && opts.files.length > 0) {
                    var files = opts.files;
                    var fileReattachPaths = opts.fileReattachPaths;
                    data = _.merge(data, {
                        files: files,
                        fileReattachPaths: fileReattachPaths,
                        asFormData: true
                    });
                }
                handlerData.requestData = data;
            },
            onSuccess: function(ivr, handlerData) {
                // return reloadIvrResources(ivr);
            }
        },
        doc: {
            updateIvr: {
                ivr_menu_uuid: ["required", "uuid"],
                ivr_opts: ["required", "array"]
            }
        }
    });

    service.deleteIvr = getResourceFn({
        apiFn: service.destroyResource,
        handlerData: {
            target: service.ivrs,
            handleType: "remove",
            propertyName: "dialplan_uuid",
            resourceName: "ivrs",
            onBeforeHandle: function(handlerData) {
                var ivrDialplanUuid = handlerData.requestData;
                var opts = {
                    ivr_dialplan_uuid: ivrDialplanUuid
                };
                handlerData.requestData = {
                    resource_name: "ivr",
                    opts: opts
                };
            }
        },
        doc: {
            deleteIvr: {
                dialplan_uuid: ["required", "uuid"]
            }
        }
    });

    service.createRingGroup = getResourceFn({
        apiFn: service.createResource,
        handlerData: {
            target: service.ringGroups,
            handleType: "push",
            resourceName: "ringGroups",
            onBeforeHandle: function(handlerData) {
                var opts = handlerData.requestData;
                if (!opts.domain_uuid) {
                    opts.domain_uuid = $rootScope.user.domain_uuid;
                }
                handlerData.requestData = {
                    resource_name: "ring-group",
                    opts: opts
                };
            },
            onSuccess: function(attendant, handlerData) {}
        },
        doc: {
            createRingGroup: {}
        }
    });

    service.updateRingGroup = getResourceFn({
        apiFn: service.updateResource,
        handlerData: {
            handleType: "replace",
            resourceName: "ringGroups",
            propertyName: "ring_group_uuid",
            onBeforeHandle: function(handlerData) {
                var opts = handlerData.requestData;
                handlerData.requestData = {
                    resource_name: "ring-group",
                    opts: opts
                };
            }
        },
        doc: {
            updateRingGroup: {}
        }
    });

    service.deleteRingGroup = getResourceFn({
        apiFn: service.destroyResource,
        handlerData: {
            target: service.ringGroups,
            handleType: "remove",
            propertyName: "ring_group_uuid",
            resourceName: "ringGroups",
            onBeforeHandle: function(handlerData) {
                var ringGroupUuid = handlerData.requestData;
                var opts = {
                    domain_uuid: $rootScope.user.domain_uuid
                };
                opts[handlerData.propertyName] = ringGroupUuid;
                handlerData.requestData = {
                    resource_name: "ring-group",
                    opts: opts
                };
            }
        },
        doc: {
            deleteRingGroup: {
                ring_group_uuid: ["required", "uuid"]
            }
        }
    });

    service.createVoicemail = getResourceFn({
        apiFn: service.createResource,
        handlerData: {
            target: service.voicemails,
            handleType: "push",
            resourceName: "voicemails",
            onBeforeHandle: function(handlerData) {
                var opts = handlerData.requestData;
                if (!opts.domain_uuid) {
                    opts.domain_uuid = $rootScope.user.domain_uuid;
                }
                var files = [opts.recording];
                opts.recording = null;
                handlerData.requestData = {
                    resource_name: "voicemail",
                    opts: opts,
                    files: files,
                    fileReattachPaths: [
                        ["opts", "recording"]
                    ],
                    asFormData: true
                };
            },
            onSuccess: function(voicemail, handlerData) {
                return service.loadExtensions().then(function(extensions) {
                    var reqData = handlerData.requestData;
                    if (reqData.fileReattachPaths && reqData.fileReattachPaths
                        .length) {
                        service.loadAudioLibraries();
                    }
                    return extensions && voicemail;
                });
            }
        },
        doc: {
            createVoicemail: {
                domain_uuid: ["required", "uuid"],
                voicemail_password: ["required", "string"],
                voicemail_mail_to: ["required", "email-string"],
                voicemail_description: ["required", "string"],
                location_uuid: ["optional", "uuid"]
            }
        }
    });

    service.createVoicemailFromLibrary = getResourceFn({
        apiFn: service.createResource,
        handlerData: {
            target: service.voicemails,
            handleType: "push",
            resourceName: "voicemails",
            onBeforeHandle: function(handlerData) {
                var opts = handlerData.requestData;
                if (!opts.domain_uuid) {
                    opts.domain_uuid = $rootScope.user.domain_uuid;
                }
                handlerData.requestData = {
                    resource_name: "voicemail",
                    opts: opts
                };
            },
            onSuccess: function(voicemail, handlerData) {
                if (voicemail) {
                    return service.loadExtensions().then(function() {
                        return voicemail;
                    });
                }
                return null;
            }
        },
        doc: {
            createVoicemailFromLibrary: {
                audio_library_uuid: ["required", "uuid"],
                domain_uuid: ["required", "uuid"],
                voicemail_password: ["required", "string"],
                voicemail_mail_to: ["required", "email-string"],
                voicemail_description: ["required", "string"],
                location_uuid: ["optional", "uuid"]
            }
        }
    });

    service.createAudioLibraryFromGreeting = getResourceFn({
        apiFn: dataFactory.createAudioLibraryFromGreeting,
        handlerData: {
            handleType: "push",
            onBeforeHandle: function(handlerData) {
                handlerData.target = service.audioLibraries;
                var greeting = handlerData.requestData;
                handlerData.requestData = greeting.voicemail_greeting_uuid;
            },
            dataMapping: function(data, handlerData) {
                var library = data.library;
                var greeting = data.greeting;
                var voicemailId = greeting.voicemail_id;
                var voicemail = _.find(service.voicemails, {
                    voicemail_id: voicemailId
                });
                voicemail.greetingInfo = greeting;
                return library;
            }
        },
        doc: {
            createAudioLibraryFromGreeting: {
                greetingData: ["required", "resource"]
            }
        }
    });

    service.updateVoicemail = getResourceFn({
        apiFn: service.updateResource,
        handlerData: {
            handleType: "replace",
            // resourceName: "voicemails",
            propertyName: "voicemail_uuid",
            onBeforeHandle: function(handlerData) {
                var opts = handlerData.requestData;
                handlerData.requestData = {
                    resource_name: "voicemail",
                    opts: opts
                };
            },
            onSuccess: function(voicemail, handlerData) {
                service.loadVoicemailGreeting(voicemail.voicemail_uuid);
            }
        },
        doc: {
            updateVoicemail: {
                voicemail_uuid: ["required", "uuid"],
                voicemail_password: ["optional", "string"],
                voicemail_mail_to: ["optional", "string"],
                voicemail_description: ["optional", "string"]
            }
        }
    });

    service.deleteVoicemail = getResourceFn({
        apiFn: service.destroyResource,
        handlerData: {
            target: service.voicemails,
            handleType: "remove",
            propertyName: "voicemail_uuid",
            resourceName: "voicemails",
            onBeforeHandle: function(handlerData) {
                var voicemailUuid = handlerData.requestData;
                var opts = {
                    domain_uuid: $rootScope.user.domain_uuid
                };
                opts[handlerData.propertyName] = voicemailUuid;
                handlerData.requestData = {
                    resource_name: "voicemail",
                    opts: opts
                };
            },
            onSuccess: function(voicemail, handlerData) {
                return service.loadExtensions();
            }
        },
        doc: {
            deleteVoicemail: {
                voicemail_uuid: ["required", "uuid"]
            }
        }
    });

    service.reserveDid = getResourceFn({
        apiFn: dataFactory.getNewNumber,
        handlerData: {
            target: service.destinations,
            handleType: "push",
            resourceName: "destinations",
            onBeforeHandle: function(handlerData) {
                handlerData.spread = true;
                var requestData = handlerData.requestData;
                var templateDid = $rootScope.user.symphony_user_settings.sms_phone_number;
                var domainUuid = $rootScope.user.domain_uuid;
                if (!_.isArray(requestData) || !requestData.length) {
                    handlerData.requestData = [domainUuid, templateDid];
                } else if (handlerData.length === 1) {
                    requestData.push(templateDid);
                }
            }
        },
        doc: {
            httpType: "get",
            reserveDid: [
                ["domain_uuid", ["optional", "uuid"]],
                ["template_did", ["optional", "did"]]
            ]
        }
    });

    service.updateAudioLibrary = getResourceFn({
        apiFn: service.updateResource,
        handlerData: {
            handleType: "replace",
            resourceName: "audioLibraries",
            propertyName: "audio_library_uuid",
            onBeforeHandle: function(handlerData) {
                var opts = handlerData.requestData;
                handlerData.requestData = {
                    resource_name: "announcement",
                    opts: opts
                };
            }
        },
        doc: {
            updateAudioLibrary: {
                audio_library_uuid: ["required", "uuid"],
                file_title: ["optional", "string"],
                timeout_action: ["optional", "string"],
                timeout_resource_uuid: ["optional", "uuid"]
            }
        }
    });

    // Server Retrieval Functions
    service.loadAttendants = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.attendants,
            handleType: "copy",
            resourceName: "attendants",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "attendants",
                    resourceUuid: handlerData.requestData
                };
            },
            onSuccess: function(attendants, handlerData) {}
        },
        doc: {
            loadAttendants: {
                noParams: true
            }
        }
    });

    service.loadDestinations = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.destinations,
            handleType: "copy",
            resourceName: "destinations",
            missingDepFn: true,
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "destinations",
                    resourceUuid: handlerData.requestData
                };
            },
            dataMapping: function(destinations) {
                var defConfRoomDesc = "Conference - default-conference-room",
                    e911Desc = "E911 Number",
                    kotterTechDesc = "Kotter Tech DID/SMS",
                    aaExtDidDesc = "AutoAttendant DID Number";
                var getExtensionsByDid = rfs.createDerivedValueGetterFn(
                    _.find(derivations, {0: "extensionsByDid"}),
                    {extensions: service.extensions}
                );
                var validDids = Object.keys(getExtensionsByDid());
                return destinations.filter(function(destination) {
                    var filteredDescriptions = [
                        defConfRoomDesc, e911Desc, kotterTechDesc
                    ];
                    return _.every(filteredDescriptions, function(
                        description) {
                        return destination.destination_description &&
                            destination.destination_description
                            .indexOf(description) === -1;
                    }); // && validDids.indexOf(destination.destination_number) > -1;
                }).sort(function(dest) {
                    return dest.destination_description !== aaExtDidDesc;
                });
            }
        },
        doc: {
            loadDestinations: {
                domainUuid: ["uuid", "optional"]
            }
        }
    });

    // service.loadTimeConditions = getResourceFn({
    //     apiFn: dataFactory.getTimeConditions,
    //     handlerData: {
    //         target: service.timeConditions,
    //         handleType: "copy",
    //         resourceName: "timeConditions"
    //     },
    //     doc: {
    //         loadTimeConditions: {
    //             noParams: true
    //         }
    //     }
    // });

    service.loadTimeConditions = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.timeConditions,
            handleType: "copy",
            resourceName: "timeConditions",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "time-conditions",
                    resourceUuid: handlerData.requestData
                };
            }
        },
        doc: {
            loadTimeConditions: {
                noParams: true
            }
        }
    });

    service.loadRingGroups = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.ringGroups,
            handleType: "copy",
            resourceName: "ringGroups",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "ring-groups",
                    resourceUuid: handlerData.requestData
                };
            }
        }
    });

    service.loadVoicemails = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.voicemails,
            handleType: "copy",
            resourceName: "voicemails",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "voicemails",
                    resourceUuid: handlerData.requestData
                };
            },
            dataMapping: function(voicemails) {
                return voicemails.filter(function(voicemail) {
                    return voicemail.voicemail_description !==
                        "Kotter Tech";
                });
            }
        },
        doc: {
            loadVoicemails: {
                noParams: true
            }
        }
    });

    service.loadAudioLibraries = (function() {
        var resourceFn = getResourceFn({
            apiFn: audioLibraryService.retrieveAudioLibraries,
            handlerData: {
                handleType: "noop",
                resourceName: "announcements",
                returnBareResponse: true,
                onBeforeHandle: function(handlerData) {
                    handlerData.requestData = {
                        domainUuid: handlerData.requestData || $rootScope.user.domain_uuid,
                        persistData: true
                    };
                }
            },
            doc: {
                loadAudioLibraries: {
                    noParams: true
                }
            }
        });

        function resourceFnWrapper(domainUuid) {
            return resourceFn(domainUuid).then(function(libraries) {
                service.audioLibraries = libraries;
                return service.loadRecordings();
            });
        };
        resourceFnWrapper.alterHandlerData = resourceFn.alterHandlerData;
        return resourceFnWrapper;
    })();

    service.createAudioLibrary = getResourceFn({
        apiFn: audioLibraryService.createLibrary,
        handlerData: {
            handleType: "noop",
            resourceName: "audioLibraries",
            onBeforeHandle: function(handlerData) {
                var file;
                var reqData = handlerData.requestData;
                if (handlerData.requestData instanceof File) {
                    file = reqData;
                } else {
                    file = reqData.file;
                }
                if (!file) { handlerData.abort = true; }
                reqData = _.merge(reqData, {
                    file: file,
                    category: "category",
                    accessLevel: "company",
                    domainUuid: $rootScope.user.domain_uuid
                });
                handlerData.requestData = reqData;
            }
        },
        doc: {
            createAudioLibrary: {
                file: ["required", "file"],
                title: ["optional", "string"]
            }
        }
    });

    service.deleteAudioLibrary = getResourceFn({
        apiFn: dataFactory.getDeleteAudioLibraryByUuid,
        handlerData: {
            handleType: "remove",
            propertyName: "audio_library_uuid",
            resourceName: "audioLibraries",
            onBeforeHandle: function(handlerData) {
                handlerData.target = service.audioLibraries;
                var libraryUuid = handlerData.requestData;
                handlerData.requestData = [libraryUuid, $rootScope.user.id];
                handlerData.spread = true;
            }
        },
        doc: {
            deleteAudioLibrary: {
                audio_library_uuid: ["required", "uuid"]
            }
        }
    });

    service.loadRecordings = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.recordings,
            handleType: "copy",
            resourceName: "announcements",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "recordings",
                    resourceUuid: handlerData.requestData
                };
            }
        },
        doc: {
            loadRecordings: {
                noParams: true
            }
        }
    });

    service.loadRecordingsWithFiles = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.recordings,
            handleType: "inPlaceReplaceColl",
            resourceName: "announcements",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "recordings-with-files",
                    resourceUuid: handlerData.requestData
                };
            },
            dataMapping: function(recordings, handlerData) {
                return recordings.map(function(recording) {
                    if (recording.file) {
                        var fileName = recording.original_file_name;
                        recording.file = fileService.b64toFile(
                            recording.file, "audio/wav", fileName
                        );
                    }
                    return recording;
                });
            }
        },
        doc: {
            loadRecordingsWithFiles: {
                noParams: true
            }
        }
    });

    service.loadIvrs = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.ivrs,
            handleType: "copy",
            resourceName: "ivrs",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "ivrs",
                    resourceUuid: handlerData.requestData
                };
            },
            onSuccess: function() {
                attachAttendantsActionTypes();
            }
        },
        doc: {
            loadDestinations: {
                noParams: true
            }
        }
    });

    service.loadExtensions = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            target: service.extensions,
            handleType: "copy",
            resourceName: "extensions",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "extensions",
                    resourceUuid: handlerData.requestData
                };
            },
            dataMapping: function(extensions) {
                var getExtensionsByDid = rfs.createDerivedValueGetterFn(
                    _.find(derivations, {
                        0: "extensionsByDid"
                    }), {
                        extensions: extensions
                    }
                );
                var extensionsByDid = getExtensionsByDid();
                return extensions.filter(function(extension) {
                    return extension.outbound_caller_id_name !==
                        "Kotter Tech";
                });
            }
        },
        doc: {
            loadExtensions: {
                domainUuid: ["uuid", "optional"]
            }
        }
    });

    service.loadVoicemailGreeting = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            handleType: 'noop',
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    resourceName: "voicemail-greeting",
                    resourceUuid: handlerData.requestData
                };
            },
            dataMapping: function(greetingData) {
                var file = greetingData.file;
                var fileName = greetingData.filename;
                greetingData.file = fileService.b64toFile(file, "audio/wav",
                                                          fileName);
                return greetingData;
            },
            onSuccess: function(greetingData, handlerData) {
                var voicemailUuid = handlerData.requestData.resourceUuid;
                var voicemail = _.find(service.voicemails, {
                    voicemail_uuid: voicemailUuid
                });
                if (voicemail) {
                    voicemail.greeting = greetingData.file;
                    voicemail.greetingData = greetingData.greetingData;
                    return greetingData.file;
                }
                return null;
            }
        },
        doc: {
            loadVoicemailGreeting: {
                voicemail_uuid: ["required", "uuid"]
            }
        }
    });

    service.loadVoicemailGreetings = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            handleType: 'noop',
            onBeforeHandle: function(handlerData) {
                var domainUuid = handlerData.requestData || $rootScope.user.domain_uuid;
                handlerData.requestData = {
                    resourceName: "voicemail-greetings",
                    resourceUuid: domainUuid
                };
            },
            dataMapping: function(greetingDataColl) {
                return greetingDataColl.map(function(greetingData) {
                    var file = greetingData.file;
                    var fileName = greetingData.filename;
                    greetingData.file = fileService.b64toFile(file, "audio/wav", fileName);
                    return greetingData;
                });
            },
            onSuccess: function(greetingDataColl, handlerData) {
                greetingDataColl.forEach(function(greetingData) {
                    var voicemail = _.find(service.voicemails, {
                        voicemail_uuid: greetingData.voicemail_uuid
                    });
                    if (voicemail) {
                        voicemail.greeting = greetingData.file;
                        voicemail.greetingData = greetingData.greetingData;
                    }
                });
                return greetingDataColl;
            }
        },
        doc: {
            loadVoicemailGreetings: {
                domain_uuid: ["optional", "uuid"]
            }
        }
    });

    service.loadAnnouncementAudio = getResourceFn({
        apiFn: service.loadResource,
        handlerData: {
            handleType: "noop",
            onBeforeHandle: function(handlerData) {
                var announcement = handlerData.requestData;
                handlerData.originalReqData = announcement;
                handlerData.requestData = {
                    resourceName: "announcement-file",
                    resourceUuid: announcement.audio_library_uuid
                };
            },
            dataMapping: function(fileData, handlerData) {
                var file = fileData;
                var announcement = handlerData.originalReqData;
                var fileName = announcement.file_title;
                return fileService.b64toFile(file, "audio/wav", fileName);
            },
            onSuccess: function(announcementFile, handlerData) {
                var announcement = handlerData.originalReqData;
                if (announcement) { announcement.file = announcementFile; }
            }
        },
        doc: {
            loadAnnouncementAudio: {
                announcement: ["required", "resource"]
            }
        }
    });

    service.loadTranscripts = (function() {
        var resourceFn = getResourceFn({
            apiFn: audioLibraryService.loadTranscripts,
            handlerData: {
                handleType: "noop",
                resourceName: "transcripts",
                returnBareResponse: true
            },
            doc: {
                loadAudioLibraries: {
                    noParams: true
                }
            }
        });
        return function(domainUuid) {
            return resourceFn(domainUuid).then(function(transcripts) {
                service.transcriptModels.reset(transcripts);
                return transcripts;
            });
        };
    })();

    // Helper Functions
    service.getMinDate = getMinDate;
    service.convertIntBoundsToDateBounds = convertIntBoundsToDateBounds;
    service.attendantDestinations = attendantDestinations;
    service.attendantDestinationUuids = attendantDestinationUuids;
    service.getDestToUserColl = getDestToUserColl;
    service.displayTransferOption = displayTransferOption;
    service.convertScheduleActionsToFSConditions = convertScheduleActionsToFSConditions;
    service.getAudioLibraryByFileName = getAudioLibraryByFileName;
    service.allActions = allActions;
    service.conditionGroupToBoundGroup = conditionGroupToBoundGroup;
    service.getMapTransferOptToNoAnswerOpt = getMapTransferOptToNoAnswerOpt;
    service.getContactNamesByExtension = getContactNamesByExtension;
    service.sortExtensionsByHasContact = sortExtensionsByHasContact;
    service.getVoicemailGreetingMatchingAudioLibrary =
        getVoicemailGreetingMatchingAudioLibrary;
    service.orderNewNumber = orderNewNumber;
    service.getVoicemailAudioLibrary = getVoicemailAudioLibrary;
    service.createVoicemailFromLibraryAndVmSettings =
        createVoicemailFromLibraryAndVmSettings;
    service.assignDestinationToAttendant = assignDestinationToAttendant;
    service.getNoAnswerDeps = getNoAnswerDeps;
    service.getResourceByActionNameAndUuid = getResourceByActionNameAndUuid;
    service.getIvrGreeting = getIvrGreeting;
    service.getResourceUuid = getResourceUuid;
    service.getAudioLibraryFileName = getAudioLibraryFileName;

    // Foreign Callback registration
    // Internal Callback Registration


    // Private
    function loadResources(loadFns) {
        if (!loadFns) {
            loadFns = [
                "loadAttendants",
                "loadExtensions",
                "loadDestinations",
                "loadTimeConditions",
                "loadRingGroups",
                "loadVoicemails",
                "loadAudioLibraries",
                "loadIvrs",
                "loadTranscripts"
            ];
        }
        return service[loadFns[0]]().then(function() {
            loadFns.shift();
            return loadFns.length ? loadResources(loadFns) :
                attachAttendantsActionTypes();
        });
    };

    function loadPortingActions(domainUuid) {
        return getPortingActions.call({
            domainUuid: domainUuid
        }).then(function(portingActions) {
            return shapePortingActionsForDisplay(portingActions);
        });
    };

    function getPortingActions(loadFns, responses) {
        if (!loadFns) {
            loadFns = {
                loadExtensions: "extension",
                loadDestinations: "destinations",
                loadTimeConditions: "time-condition",
                loadRingGroups: "ring-group",
                loadVoicemails: "voicemail",
                loadAudioLibraries: "announcement",
                loadIvrs: "ivr"
            };
        }
        var loadFnNames = Object.keys(loadFns);
        if (!responses) {
            responses = {};
        }
        var bootFnName = loadFnNames[0];
        var bootFn = service[bootFnName];
        bootFn.alterHandlerData.elideHandling = true;
        var domainUuid = this.domainUuid;
        return bootFn(domainUuid).then(function(response) {
            var actionName = loadFns[bootFnName];
            var findSpec = {
                name: actionName
            };
            responses[bootFnName] = {
                response: response,
                action: _.find(service.actions, findSpec) || actionName
            };
            delete loadFns[loadFnNames[0]];
            loadFnNames.shift();
            return loadFnNames.length ?
                getPortingActions.call({
                    domainUuid: domainUuid
                }, loadFns, responses) :
            responses;
        });
    };

    function loadTimeConditionActionResources(timeCondition) {
        var actionDetails = getDialplanActionDetails(timeCondition);
        var loadFns = [];
        var actionDetailPromises = [];

        function addLoadFn(fnName) {
            if (loadFns.indexOf(fnName) === -1) {
                loadFns.push(fnName);
            }
        };
        actionDetails.forEach(function(actionDetail) {
            if (actionDetail.dialplan_detail_type === "transfer") {
                addLoadFn("loadExtensions");
                addLoadFn("loadVoicemails");
                addLoadFn("loadIvrs");
                addLoadFn("loadRingGroups");
            }
        });
        return loadActionResources(loadFns);
    };

    function loadActionResources(loadFnNames) {
        var actionDetailPromises = [];
        loadFnNames.forEach(function(loadFn) {
            actionDetailPromises.push(service[loadFn]());
        });
        return $q.all(actionDetailPromises).then(function() {
            attachAttendantsActionTypes();
        });
    };

    function isUnassignedDestinationUuid(destinationUuid) {
        return !_.some(service.attendants, function(attendant) {
            return attendant.destination_uuid === destinationUuid ||
                (attendant.additional_destinations &&
                 _.some(attendant.additional_destinations, {
                     destination_uuid: destinationUuid
                 }));
        });
    };

    function attachAttendantsActionTypes() {
        service.attendants.forEach(function(attendant) {
            attachAttendantActionTypes(attendant);
        });
        triggerEvent("actionsAttached");
    };

    function attachAttendantActionTypes(attendant) {
        var defaultTCDialplanSpec = {
            dialplan_uuid: attendant.tc_dialplan_uuid
        };
        var defaultTCDialplan = _.find(service.timeConditions, defaultTCDialplanSpec);
        if (defaultTCDialplan) {
            getDialplanActionDetails(defaultTCDialplan).forEach(
                attachActionDetailActionType);
            attachTimeConditionActionConditionsFn(defaultTCDialplan);
            attendant.actionResource = defaultTCDialplan;
        }
        if (attendant.override_tc_dialplan_uuid) {
            var overrideTCDialplanSpec = {
                dialplan_uuid: attendant.override_tc_dialplan_uuid
            };
            var overrideTCDialplan = _.find(service.timeConditions, overrideTCDialplanSpec);
            if (overrideTCDialplan) {
                getDialplanActionDetails(overrideTCDialplan).forEach(
                    attachActionDetailActionType);
                attachTimeConditionActionConditionsFn(overrideTCDialplan);
                attendant.overrideActionResource = overrideTCDialplan;
            }
        }
        attendant.action = _.find(service.actions, {
            name: "time-condition"
        });
    };

    function getDialplanActionType(dialplan) {
        var domainName = $rootScope.user.domain.domain_name;
        var dialplanDetails = dialplan.details;

        function createResourceSpec(detailSpecGenerator) {
            return function(resource) {
                var detailSpec = detailSpecGenerator(resource);
                return Boolean(_.find(dialplanDetails, {
                    dialplan_detail_data: detailSpec
                }));
            };
        };
        var timeConditionSpec = createResourceSpec(function(timeCondition) {
            return timeCondition.dialplan_number + " XML " + domainName;
        });
        var specToAction = [
            [timeConditionSpec, service.timeConditions, "time-condition"],
            ["none", [], "none"]
        ];
        for (var i = 0; i < specToAction.length; i++) {
            var spec = specToAction[i][0];
            var coll = specToAction[i][1];
            var resource = _.find(coll, spec);
            if (spec === "none" || resource) {
                var action = _.find(service.actions, {
                    name: specToAction[i][2]
                });
                if (action) {
                    if (action.name === "time-condition") {
                        getDialplanActionDetails(resource).forEach(
                            attachActionDetailActionType);
                        attachTimeConditionActionConditionsFn(resource);
                    }
                }
                return {
                    action: action,
                    resource: resource
                };
            }
        };
        return null;
    };

    function attachActionDetailActionType(actionDetail) {
        var domainName = $rootScope.user.domain.domain_name;
        var actionDetailActions = service.actions.filter(function(action) {
            return action.actionDetailInfo;
        }).map(function(action) {
            return _.merge(_.clone(action.actionDetailInfo), _.pick(action, [
                "name", "resourceCollName"
            ]));
        });
        var actionChecks = usefulTools.arrayToObjectByProp(actionDetailActions, "name");
        var actionCheckKeys = Object.keys(actionChecks);
        for (var i = 0; i < actionCheckKeys.length; i++) {
            var actionName = actionCheckKeys[i];
            var actionCheckInfo = actionChecks[actionName];
            var checkFn = actionCheckInfo.checkFn;
            if (checkFn(actionDetail)) {
                if (actionCheckInfo.derivedActionResource) {
                    actionDetail.actionResource =
                        actionCheckInfo.derivedActionResource(actionDetail);
                } else if (actionCheckInfo.actionResourceFindSpecGenFn) {
                    var resourceColl = service[actionCheckInfo.resourceCollName];
                    var actionResourceFindSpec = actionCheckInfo.actionResourceFindSpecGenFn(
                        actionDetail
                    );
                    if (resourceColl && actionResourceFindSpec) {
                        var resource = _.find(resourceColl, actionResourceFindSpec) || false;
                        actionDetail.actionResource = resource;
                    }
                }
                actionDetail.actionType = _.find(service.actions, {
                    name: actionName
                });
            }
        }
    };

    function attachTimeConditionActionConditionsFn(timeCondition) {
        var callFlowScheduleModel;
        if (timeCondition.callFlowScheduleModel) {
            callFlowScheduleModel = timeCondition.callFlowScheduleModel;
            timeCondition.callFlowScheduleModel.reset();
        };
        if (!callFlowScheduleModel) { callFlowScheduleModel = new callFlowScheduleFactory(); }
        var timeDetailTypes = callFlowScheduleModel.timeDetailTypes;
        function isActionDetail(detail) {
            return detail.dialplan_detail_tag === "action" && detail.actionResource !== false;
        }
        timeCondition.callFlowScheduleModel = callFlowScheduleModel;
        var announcementTimeoutDests = [];
        timeCondition.actions = function() {
            var actionDetails = timeCondition.details.filter(isActionDetail)
                .sort(function(actionDetailA, actionDetailB) {
                    function getOrderInt(actionDetail) {
                        var groupId = actionDetail.dialplan_detail_group;
                        var orderId = actionDetail.dialplan_detail_order;
                        return parseInt(groupId + orderId);
                    };
                    return getOrderInt(actionDetailA) - getOrderInt(actionDetailB);
                }).map(function(actionDetail) {
                    var condDetails = _.filter(timeCondition.details, {
                        dialplan_detail_tag: "condition",
                        dialplan_detail_group: actionDetail.dialplan_detail_group
                    }).filter(function(condDetail) {
                        return timeDetailTypes.indexOf(
                            condDetail.dialplan_detail_type
                        ) > -1;
                    });
                    var resource = actionDetail.actionResource;
                    if (resource && resource.timeout_action) {
                        announcementTimeoutDests.push({
                            actionName: resource.timeout_action,
                            resourceUuid: resource.timeout_resource_uuid
                        });
                    }
                    var timeoutSpec = {};
                    if (actionDetail.actionType) timeoutSpec = { actionName: actionDetail.actionType.name };
                    if (actionDetail.actionType && actionDetail.actionType.name === "external-did") {
                        timeoutSpec.resourceUuid = actionDetail.actionResource;
                    } else if (actionDetail.actionResource) {
                        timeoutSpec.resourceUuid = getResourceUuid(actionDetail.actionResource);
                    }
                    var isTimeoutDest = _.find(announcementTimeoutDests, timeoutSpec);
                    if (isTimeoutDest) {
                        return null;
                    } else {
                        return {
                            actionResource: actionDetail.actionResource,
                            actionType: actionDetail.actionType,
                            condDetails: condDetails
                        };
                    }
                }).filter(Boolean);
            return _.groupBy(actionDetails, function(detail) {
                return (detail.actionResource && getResourceUuid(detail.actionResource)) ||
                    (detail.actionType && detail.actionType.name);
            });
        };
        Object.values(timeCondition.actions()).forEach(
            addTimeConditionToScheduleModel(callFlowScheduleModel)
        );
    };

    function destinationToExtension(dest) {
        console.log(service.extensionsByDid);
        console.log(dest);
        return service.extensionsByDid[parseInt(dest.destination_number)];
    };

    function notNone(actionName) {
        return actionName !== "none";
    };

    function notTimeCondition(actionName) {
        return actionName !== "time-condition";
    }

    function boolCompose() {
        var compFns = _.toArray(arguments);
        return function() {
            var arg = arguments[0];
            return _.every(compFns.map(function(compFn) {
                return compFn(arg);
            }), Boolean);
        };
    };

    function getDialplanActionDetails(dialplan) {
        return dialplan.details.filter(function(detail) {
            return detail.dialplan_detail_tag === "action";
        });
    };

    function reloadAttendantResources(opts) {
        var attendantUuid = opts.attendantUuid;
        return service.loadDestinations().then(function() {
            attachAttendantsActionTypes();
            if (attendantUuid) {
                var attendant = _.find(service.attendants, {
                    auto_attendant_uuid: attendantUuid
                });
                attendant.loadingResources = true;
            }
            return service.loadTimeConditions().then(function() {
                attachAttendantsActionTypes();
                var actionResourceUuid;
                if (opts.actionResource) {
                    actionResourceUuid = opts.actionResource.dialplan_uuid;
                } else if (attendant) {
                    actionResourceUuid = attendant.actionResource.dialplan_uuid;
                }
                var actionResource = _.find(service.timeConditions, {
                    dialplan_uuid: actionResourceUuid
                });
                if (actionResource) {
                    return loadTimeConditionActionResources(actionResource)
                        .then(function() {
                            if (attendant) {
                                delete attendant.loadingResources;
                            }
                        });
                } else {
                    return attendant;
                }
            });
            return null;
        });
    };

    function convertScheduleActionsToFSConditions(scheduleActions) {
        var conditions = [];
        scheduleActions.filter(function(scheduleAction) {
            return scheduleAction.isDefault ||
                (scheduleAction.conditionGroups && Boolean(scheduleAction.conditionGroups.length));
        }).forEach(function(scheduleAction) {
            var conditionGroups = scheduleAction.conditionGroups;
            if (scheduleAction.conditionGroups || scheduleAction.isDefault) {
                var groups = scheduleAction.isDefault ? [{
                    priority: "999",
                    bounds: []
                }] : conditionGroups.map(function(conditionGroup) {
                    return conditionGroupToBoundGroup(conditionGroup);
                });
                var resourceUuid;
                if (scheduleAction.resource) {
                    resourceUuid = getResourceUuid(scheduleAction.resource);
                } else if (scheduleAction.resourceUuid) {
                    resourceUuid = scheduleAction.resourceUuid;
                }
                var actionName = scheduleAction.action ?
                    scheduleAction.action.name : scheduleAction.actionName;
                var condition = { action_name: actionName, groups: groups };
                if (resourceUuid) { condition.resource_uuid = resourceUuid; }
                if (scheduleAction.actionName === "external-did") {
                    condition.resource_uuid = scheduleAction.resource;
                }
                conditions.push(condition);
            }
        });
        return conditions;
    };

    function conditionGroupToBoundGroup(conditionGroup, bounds) {
        return {
            priority: conditionGroup.priority,
            bounds: bounds || conditionGroup.conditions.map(conditionToBounds)
        };
    };

    function conditionToBounds(condition) {
        return {
            type: condition.conditionType.value,
            data: condition.startOpt.value + "-" + condition.endOpt.value
        };
    };

    function getResourceUuidProp(resource) {
        var uuidKeys = [
            "extension_uuid",
            "ring_group_uuid",
            "voicemail_uuid",
            "ivr_menu_uuid",
            "audio_library_uuid",
            "auto_attendant_uuid"
        ];
        for (var i = 0; i < uuidKeys.length; i++) {
            var key = uuidKeys[i];
            if (resource[key]) {return key;}
        }
        return null;
    };

    function getResourceUuid(resource) {
        var uuidProp = getResourceUuidProp(resource);
        return uuidProp ? resource[uuidProp] : null;
    };

    function getResourceByActionNameAndUuid(actionName, resourceUuid) {
        var action = _.find(service.actions, {name: actionName});
        var resourceColl = service[action.resourceCollName];
        if (resourceColl) {
            var siblingResource = resourceColl[0];
            if (siblingResource) {
                var uuidProp = getResourceUuidProp(siblingResource);
                var resourceSpec = {};
                resourceSpec[uuidProp] = resourceUuid;
                return _.find(resourceColl, resourceSpec);
            }
        }
        return null;
    };

    function addTimeConditionToScheduleModel(callFlowScheduleModel) {
        return function(actionConditions) {
            var schedules = [];
            var resource = actionConditions[0].actionResource;
            var actionType = actionConditions[0].actionType;
            var scheduleConditionTypes = callFlowScheduleModel.scheduleConditionTypes;
            var parser = callFlowScheduleModel.parseCondDetailToScheduleData;
            if (actionConditions && actionType) {
                var condition = combineActionConditionsCondDetails(actionConditions);
                if (!condition.condDetails.length) {
                    callFlowScheduleModel.defaultAction = {
                        type: actionType.name,
                        data: _.isPlainObject(resource) ? getResourceUuid(resource) : resource,
                        action: actionType,
                        actionName: actionType.name,
                        resource: resource,
                        label: actionType.title || actionType.actionDetailInfo.actionTitle,
                        conditionTypes: scheduleConditionTypes,
                        isDefault: true
                    };
                } else {
                    var parsedConditions = condition.condDetails.map(parser);
                    var groupedConditions = _.groupBy(parsedConditions, "priority");
                    var conditionGroups = wrapGroupedConditionsWithGroupPriority(
                        groupedConditions);
                    var sortedConditionGroups = sortConditionGroupsByGroup(
                        conditionGroups);
                    callFlowScheduleModel.addPrevalidatedAction({
                        action: actionType,
                        actionName: actionType.name,
                        conditionGroups: sortedConditionGroups,
                        resource: resource,
                        label: actionType.title || actionType.actionDetailInfo.actionTitle,
                        conditionTypes: scheduleConditionTypes
                    });
                }
            }
        };
    };

    function combineActionConditionsCondDetails(actionConditions) {
        var condDetails = _.flatten(actionConditions.map(function(actionCondition) {
            return actionCondition.condDetails;
        }));
        return {
            condDetails: condDetails
        };
    };

    function wrapGroupedConditionsWithGroupPriority(groupedConditions) {
        return Object.keys(groupedConditions).map(function(priority) {
            var conditions = groupedConditions[priority];
            return {
                conditions: conditions,
                priority: priority
            };
        });
    };

    function sortConditionGroupsByGroup(groups) {
        return groups.sort(function(group) {
            return group.priority > group.priority;
        });
    };

    function getConditionDataToScheduleParser(scheduleConditionTypes) {
        return function(condDetail) {
            var condTypeSpec = {
                value: condDetail.dialplan_detail_type
            };
            var condType = _.find(scheduleConditionTypes, condTypeSpec);
            var detailData = condDetail.dialplan_detail_data;
            var dataSplits = detailData.split("-");
            var start = parseInt(dataSplits[0]);
            var end = parseInt(dataSplits[1]);
            return {
                conditionType: condType,
                startOpt: _.find(condType.opts, {
                    value: start
                }),
                endOpt: _.find(condType.opts, {
                    value: end
                }),
                priority: parseInt(condDetail.dialplan_detail_group)
            };
        };
    };

    function combineConditionIntBounds(conditionIntBounds) {
        var newBounds = [];
        var bounds = [];
        angular.copy(conditionIntBounds, bounds);
        var lastBounds = bounds.shift();
        newBounds.push(lastBounds);
        while (bounds.length > 0) {
            var currentBounds = bounds.shift();
            if (currentBounds.start === lastBounds.end) {
                lastBounds.end = currentBounds.end;
            } else {
                newBounds.push(currentBounds);
                lastBounds = currentBounds;
            }
        }
        return newBounds;
    };

    function convertIntBoundsToDateBounds(intBounds) {
        return {
            start: intBoundToDate(intBounds.start),
            end: intBoundToDate(intBounds.end)
        };
    };

    function intBoundToDate(intBound) {
        var minDate = getMinDate();
        return _.isInteger(intBound) ? minDate.add(intBound, "minute").toDate() : intBound;
    };

    function dateBoundToInt(dateBound) {
        return weekPreciseDiff(getMinDate(), moment(dateBound));
    };

    function getMinDate() {
        return moment().startOf("week");
    };

    function weekPreciseDiff(start, end) {
        return end.clone().diff(start.clone(), "minute", true) * 5;
    };

    function attendantDestinations(attendant) {
        return attendant.additional_destinations.slice();
    };

    function attendantDestinationUuids(attendant) {
        return _.map(attendantDestinations(attendant), "destination_uuid");
    };

    function getDestToUserColl() {
        var destToUser = {};
        var destinations = service.destinations;
        destinations.forEach(function(dest) {
            destToUser[dest.destination_uuid] = contactService.getUserByDid(dest.destination_number);
        });
        return destToUser;
    };

    function fileDataMapping(fileData, handlerData) {
        var fileName = handlerData.fileDataMappingFileName || handlerData.requestData;
        var name = fileName.split(".")[0];
        return fileService.b64toFile(fileData, "audio/wav", name);
    }

    function displayTransferOption(transferOpt, actionName) {
        if (!actionName || !_.isString(actionName)) {
            actionName = getTransferOptActionName(transferOpt);
        }
        var displayVal;
        if (actionName === "extension") {
            displayVal = displayExtension.call(this, transferOpt);
        } else if (actionName === "voicemail") {
            displayVal = displayVoicemail.call(this, transferOpt);
        } else if (actionName === "ring-group") {
            displayVal = displayRingGroup.call(this, transferOpt);
        } else if (actionName === "ivr") {
            displayVal = displayIvr.call(this, transferOpt);
        } else if (actionName === "external-did") {
            displayVal = displayExternalDid.call(this, transferOpt);
        } else if (actionName === "announcement") {
            displayVal = displayAnnouncement.call(this, transferOpt);
        } else if (actionName === "call-flow") {
            displayVal = displayCallFlow.call(this, transferOpt);
        }
        if (displayVal) { displayVal.actionName = actionName; }
        return displayVal;
    };

    function getTransferOptActionName(transferOpt) {
        if (transferOpt.extension) {
            return "extension";
        } else if (transferOpt.voicemail_id) {
            return "voicemail";
        } else if (transferOpt.ring_group_extension) {
            return "ring-group";
        } else if (transferOpt.ivr_menu_extension) {
            return "ivr";
        } else if (transferOpt.audio_library_uuid) {
            return "announcement";
        } else if (transferOpt.auto_attendant_uuid && transferOpt.actionResource) {
            return "call-flow";
        }
        return null;
    };

    function displayExtension(extension) {
        var displayRoot = "Extension: ";
        var displayVal = displayRoot + extension.extension;
        var matchingDest = getMatchingDestByExt.call(this, extension);
        if (matchingDest) {
            var destNum = matchingDest.destination_number;
            displayVal += " - " + $filter('tel')(destNum);
        }
        return {
            value: asTransferData(extension.extension),
            display: displayVal
        };
    };

    function asTransferData(ext, domainName) {
        if (!domainName) { domainName = $rootScope.user.domain.domain_name; }
        return ext + " XML " + domainName;
    };

    function displayVoicemail(voicemail) {
        var displayRoot = "Voicemail: ";
        var serv = this && this.service ? this.service : service;
        var matchingExt = serv.extensionsByExtension[voicemail.voicemail_id];
        if (matchingExt) {
            var matchingDest = getMatchingDestByExt.call(this, matchingExt);
            var displayVal = displayRoot + matchingExt.extension;
            if (matchingDest) {
                var destNum = matchingDest.destination_number;
                displayVal += " - " + $filter('tel')(destNum);
            } else {
                var voicemailDesc = voicemail.voicemail_description;
                if (voicemailDesc) {
                    displayVal += " - " + voicemailDesc;
                }
            }
            return {
                value: asTransferData("*99" + voicemail.voicemail_id),
                display: displayVal
            };
        }
        return null;
    };

    function displayRingGroup(ringGroup) {
        var displayRoot = "RingGroup: ";
        var rgName = ringGroup.ring_group_name;
        var rgExt = ringGroup.ring_group_extension;
        var displayVal = displayRoot + rgExt + " - " + rgName;
        return {
            value: asTransferData(rgExt),
            display: displayVal
        };
    };

    function displayIvr(ivr) {
        var displayRoot = "IVR: ";
        var ivrExt = ivr.ivr_menu_extension;
        var ivrName = ivr.ivr_menu_name;
        var displayVal = displayRoot + ivrExt + " | " + ivrName;
        return {
            value: asTransferData(ivrExt),
            display: displayVal
        };
    };

    function displayExternalDid(did) {
        var displayRoot = "External DID: ";
        var displayVal = displayRoot + did;
        return {
            value: did,
            display: displayVal
        };
    };

    function displayAnnouncement(announcement) {
        var displayRoot = "Message Announcement: ";
        var displayVal = displayRoot + announcement.file_title;
        var recSpec = {
            recording_description: announcement.audio_library_uuid
        };
        var serv = this && this.service ? this.service : service;
        var recording = _.find(serv.recordings, recSpec);
        var value;
        if (recording) {
            var luaPrefix = "streamfile.lua ";
            // if (!isRingGroup) { luaPrefix = "lua " + luaPrefix; }
            // remove isRinGroup var and just have ring-group-edit pass in a post-load map fn to fix this
            value = luaPrefix + recording.recording_filename;
        } else {
            value = announcement.audio_library_uuid;
        }
        return {
            value: value,
            display: displayVal
        };
    };

    function displayCallFlow(callFlow) {
        var dialplanNumber = callFlow.actionResource.dialplan_number;
        return {
            value: dialplanNumber,
            display: callFlow.description + " Call Flow: " + dialplanNumber
        };
    };

    service.getMatchingDestByExt = getMatchingDestByExt;

    function getMatchingDestByExt(extension) {
        var serv = this && this.service ? this.service : service;
        var did = _.find(Object.keys(serv.extensionsByDid), function(did) {
            var otherExt = serv.extensionsByDid[parseInt(did)];
            return otherExt && otherExt.extension === extension.extension;
        });
        return serv.destinationsByDestinationNumber[did];
    };

    function isNonVoicemailExtensionDescription(description) {
        return description !== "AA Voicemail Extension";
    };

    function getIvrManageTableInfo() {
        var action = _.find(service.actions, {
            name: "ivr"
        });

        function getColumnData(ivr, column) {
            if (column === "title") {
                return ivr.ivr_menu_name;
            } else if (column === "extension") {
                return ivr.ivr_menu_extension;
            } else if (column === "greeting") {
                var greetingFileName = ivr.ivr_menu_greet_long;
                var greeting = getAudioLibraryByFileName(greetingFileName);
                if (greeting) {
                    return greeting.file_title;
                }
            }
            return null;
        };
        var resourceInfo = {
            resourceName: action.resourceName,
            prefix: action.prefix,
            columns: [{
                name: "title",
                text: "Title",
                className: "title"
            }, {
                name: "extension",
                text: "Extension",
                className: "extension"
            }, {
                name: "greeting",
                text: "Greeting",
                className: "greeting"
            }],
            tableOpts: {
                tableClass: "ivr-resource-table"
            },
            sortingOpts: {
                sortableColumns: [],
                orderBy: "ivr_menu_extension"
            },
            getColumnData: getColumnData
        };
        function cloneIvr(ivr) {
            var model = new ivrMenuFactory(ivr, $rootScope.user.domain, service);
            var data = model.getPersistanceData();
            delete data.ivr_menu_uuid;
            var greeting = getIvrGreeting(ivr);
            data.greeting_announcement_uuid = greeting.audio_library_uuid;
            data.ivr_menu_name += "-clone";
            service.createIvr(data).then(function(ivrClone) {
                if (ivrClone) {
                    var displayIvr = _.clone(ivrClone);
                    displayIvr.ivr_menu_name = ivr.ivr_menu_name;
                    var action = _.find(service.actions, {name: "ivr"});
                    var ivrTitle = action.displayTitleFn(displayIvr);
                    var message = ivrTitle + " successfully cloned";
                    $rootScope.showSuccessAlert(message, true);
                }
            });
        }
        function deleteIvr(ivr) { return service.deleteIvr(ivr.dialplan_uuid); }
        var actionFns = [{
            fn: editResource,
            class: "fa fa-pencil-square-o primaryfont mainopt",
            tooltip: "Edit this IVR"
        }, {
            fn: cloneIvr,
            class: "fa fa-clone mainopt",
            tooltip: "Clone this IVR"
        }, {
            fn: wrapResourceDelete(deleteIvr),
            class: "fa fa-trash-o redfont mainopt",
            tooltip: "Delete this IVR"
        }];
        return {
            resourceInfo: resourceInfo,
            resourceTargetName: "ivrs",
            actionFns: actionFns
        };
    };

    function getRingGroupManageTableInfo() {
        var action = _.find(service.actions, {
            name: "ring-group"
        });

        function getColumnData(ringGroup, column) {
            if (column === "title") {
                return ringGroup.ring_group_name;
            } else if (column === "extension") {
                return ringGroup.ring_group_extension;
            } else if (column === "ringPattern") {
                var patterns = {enterprise: "Ring All", sequence: "Sequence", random: "Random", simultaneous: "Ring All"};
                return patterns[ringGroup.ring_group_strategy];
            }
            return null;
        };
        var resourceInfo = {
            resourceName: action.resourceName,
            prefix: action.prefix,
            columns: [{
                name: "title",
                text: "Title",
                className: "title"
            }, {
                name: "extension",
                text: "Extension",
                className: "extension"
            }, {
                name: "ringPattern",
                text: "Ring Pattern",
                className: "ring-pattern"
            }],
            tableOpts: { tableClass: "ring-group-resource-table" },
            sortingOpts: { sortableColumns: [] },
            getColumnData: getColumnData
        };

        function deleteRingGroup(ringGroup, scopeFns) {
            return service.deleteRingGroup(ringGroup.ring_group_uuid);
        };

        function cloneRingGroup(ringGroup) {
            function packageRGDest(dest) {
                return {
                    number: dest.destination_number,
                    delay: dest.destination_delay,
                    timeout: dest.destination_timeout
                };
            };

            var data = {
                domain_uuid: $rootScope.user.domain_uuid,
                name: ringGroup.ring_group_name + "-clone",
                destinations: ringGroup.destinations.map(packageRGDest),
                strategy: ringGroup.ring_group_strategy,
                ring_group_ringback: ringGroup.ring_group_ringback,
                ring_group_timeout_app: ringGroup.ring_group_timeout_app,
                ring_group_timeout_data: ringGroup.ring_group_timeout_data
            };

            service.createRingGroup(data).then(function(rgClone) {
                if (rgClone) {
                    var displayRg = _.clone(rgClone);
                    displayRg.ring_group_name = ringGroup.ring_group_name;
                    var action = _.find(service.actions, {name: "ring-group"});
                    var rgTitle = action.displayTitleFn(displayRg);
                    var message = rgTitle + " successfully cloned";
                    $rootScope.showSuccessAlert(message, true);
                }
            });
        };

        var actionFns = [{
            fn: editResource,
            class: "fa fa-pencil-square-o primaryfont mainopt",
            tooltip: "Edit this ring group"
        }, {
            fn: cloneRingGroup,
            class: "fa fa-clone mainopt",
            tooltip: "Clone this ring group"
        }, {
            fn: wrapResourceDelete(deleteRingGroup),
            class: "fa fa-trash-o redfont mainopt",
            tooltip: "Delete this ring group"
        }];
        return {
            resourceInfo: resourceInfo,
            resourceTargetName: "ringGroups",
            actionFns: actionFns
        };
    };

    function getVoicemailManageTableInfo() {
        var action = _.find(service.actions, {
            name: "voicemail"
        });

        function getColumnData(voicemail, column) {
            if (column === "title") {
                return voicemail.voicemail_description;
            } else if (column === "extension") {
                return voicemail.voicemail_id;
            } else if (column === "mailTo") {
                return voicemail.voicemail_mail_to;
            }
            return null;
        };
        var resourceInfo = {
            resourceName: action.resourceName,
            prefix: action.prefix,
            columns: [{
                name: "title",
                text: "Title",
                className: "title"
            }, {
                name: "extension",
                text: "Extension",
                className: "extension"
            }, {
                name: "mailTo",
                text: "Mail To",
                className: "mail-to"
            }],
            tableOpts: {
                tableClass: "voicemail-resource-table"
            },
            sortingOpts: {
                sortableColumns: [],
                orderBy: "voicemail_id"
            },
            getColumnData: getColumnData
        };

        function deleteVoicemail(voicemail, scopeFns) {
            var display = displayVoicemail(voicemail).display;
            return service.deleteVoicemail(voicemail.voicemail_uuid);
        };
        var actionFns = [{
            fn: editResource,
            class: "fa fa-pencil-square-o primaryfont mainopt",
            tooltip: "Edit this voicemail",
            show: showActionFn
        }, ];
        return {
            resourceInfo: resourceInfo,
            resourceTargetName: "greetingVoicemails",
            actionFns: actionFns
        };
    };

    rfs.registerResourceChangeCallbackFn({
        resourceName: "voicemails",
        service: service,
        callback: function() {
            var that = this;
            if (that.disabled) { return; }
            that.disabled = true;
            service.loadVoicemailGreetings().then(function(greetingDataColl) {
                rfs.triggerResourceChangeCallback({resourceName: "voicemails", service: service});
                that.disabled = false;
            });
        }
    });

    function getAnnouncementManageTableInfo() {
        var action = _.find(service.actions, { name: "announcement" });

        function getColumnData(audioLibrary, column) {
            if (column === "title") {
                return audioLibrary.file_title;
            }
            return null;
        };
        var resourceInfo = {
            resourceName: action.resourceName,
            prefix: action.prefix,
            columns: [{
                name: "title",
                text: "Title",
                className: "title"
            }],
            tableOpts: {
                tableClass: "announcement-resource-table"
            },
            sortingOpts: {
                sortableColumns: [],
                orderBy: "file_title"
            },
            getColumnData: getColumnData
        };

        function deleteAudioLibrary(audioLibrary) {
            return service.deleteAudioLibrary(audioLibrary.audio_library_uuid);
        };

        var actionFns = [{
            fn: editResource,
            class: "fa fa-pencil-square-o primaryfont mainopt",
            tooltip: "Edit this message announcement",
            show: showActionFn
        }, {
            fn: wrapResourceDelete(deleteAudioLibrary),
            class: "fa fa-trash-o redfont mainopt",
            tooltip: "Delete this Message Announcement"
        }];
        return {
            resourceInfo: resourceInfo,
            resourceTargetName: "audioLibraries",
            actionFns: actionFns
        };
    };

    function showActionFn(resource, scopeFns, actionFnInfo) {
        if (actionFnInfo.fn === editResource) { return scopeFns.editResource; }
        return true;
    };

    function editResource(resource, scopeFns) { scopeFns.editResource(resource); };

    function showSuccessResourceDeleteAlert(preReqResource) {
        var display = displayTransferOption(preReqResource).display;
        return function(resource) {
            if (resource) {
                var message = display + " successfully deleted";
                $rootScope.showSuccessAlert(message);
            }
        };
    };

    function actionEditorOpen() { return Boolean(service.actionEditor); };

    function voicemailActionDetailCheckFn(actionDetail) {
        if (actionDetail.dialplan_detail_type === "transfer") {
            var detailData = actionDetail.dialplan_detail_data;
            if (detailData.indexOf("*99") > -1) {
                var voicemailId = detailData.split("*99")[1].split(" ")[0];
                var matchingExt = _.find(service.extensions, {
                    extension: voicemailId
                });
                var matchingVoicemail = _.find(service.voicemails, {
                    voicemail_id: voicemailId
                });
                return matchingExt && matchingVoicemail;
            }
        }
        return null;
    };

    function voicemailResourceFindSpecGenFn(actionDetail) {
        var detailData = actionDetail.dialplan_detail_data;
        var voicemailId = detailData.split("*99")[1].split(" ")[0];
        return {
            voicemail_id: voicemailId
        };
    };

    function hangUpActionDetailCheckFn(actionDetail) { return actionDetail.dialplan_detail_type === "hangup"; };

    function extensionActionDetailCheckFn(actionDetail) {
        if (actionDetail.dialplan_detail_type === "transfer") {
            var ext = actionDetail.dialplan_detail_data.split(" ")[0];
            var matchingExt = _.find(service.extensions, {
                extension: ext
            });
            return matchingExt;
        }
        return null;
    };

    function extensionResourceFindSpecGenFn(actionDetail) {
        var ext = actionDetail.dialplan_detail_data.split(" ")[0];
        return {
            extension: ext
        };
    };

    function ivrActionDetailCheckFn(actionDetail) {
        if (actionDetail.dialplan_detail_type === "transfer") {
            var ext = actionDetail.dialplan_detail_data.split(" ")[0];
            var matchingIvr = _.find(service.ivrs, {
                ivr_menu_extension: ext
            });
            return matchingIvr;
        }
        return null;
    };

    function ivrResourceFindSpecGenFn(actionDetail) {
        var ext = actionDetail.dialplan_detail_data.split(" ")[0];
        return {
            ivr_menu_extension: ext
        };
    };

    function ringGroupActionDetailCheckFn(actionDetail) {
        if (actionDetail.dialplan_detail_type === "transfer") {
            var ext = actionDetail.dialplan_detail_data.split(" ")[0];
            var matchingRingGroup = _.find(service.ringGroups, {
                ring_group_extension: ext
            });
            return matchingRingGroup;
        }
        return null;
    };

    function ringGroupResourceFindSpecGenFn(actionDetail) {
        var ext = actionDetail.dialplan_detail_data.split(" ")[0];
        return {
            ring_group_extension: ext
        };
    };

    function externalDidActionDetailCheckFn(actionDetail) {
        if (actionDetail.dialplan_detail_data.indexOf("2343") > -1) {
            var did = actionDetail.dialplan_detail_data.split("2343")[1].split(" ")[0];
            return did;
        }
        return null;
    };

    function externalDidDerivedActionResourceFn(actionDetail) {
        return actionDetail.dialplan_detail_data.split("2343")[1].split(" ")[0];
    };

    function dialByNameActionDetailCheckFn(actionDetail) {
        return actionDetail.dialplan_detail_data.indexOf("*411 XML ") > -1;
    };

    function menuBackActionDetailCheckFn(actionDetail) {
        return actionDetail.dialplan_detail_type === "menu-top-app";
    };

    function announcementActionDetailCheckFn(actionDetail) {
        if (actionDetail.dialplan_detail_type === "lua") {
            var detailData = actionDetail.dialplan_detail_data;
            if (detailData.indexOf("streamfile.lua ") > -1) {
                var announcementFileName = detailData.split("streamfile.lua ")[1].split(" ")[0];
                var announcement = getAudioLibraryByFileName(announcementFileName);
                return announcement;
            }
        }
        return null;
    };

    function announcementResourceFindSpecGenFn(actionDetail) {
        var actionDetailInfo = _.find(service.actions, {
            name: "announcement"
        }).actionDetailInfo;
        var getRecordingPath = actionDetailInfo.getFreeswitchRecordingPath;
        var detailData = actionDetail.dialplan_detail_data;
        var announcementFilename = detailData.split("streamfile.lua ")[1].split(" ")[0];
        return function(announcement) {
            return announcement.filepath.indexOf(announcementFilename) > -1;
        };
    };

    function displayIvrTitle(ivr) {
        return displayIvr(ivr).display;
    };

    function displayRingGroupTitle(ringGroup) {
        return ringGroup.ring_group_name;
    };

    function displayAnnouncementTitle(announcement) {
        return announcement.file_title || announcement.recording_name;
    };

    function displayVoicemailTitle(voicemail) {
        return voicemail.voicemail_description;
    };

    function getAudioLibraryByFileName(audioLibraryFileName) {
        return _.find(service.audioLibraries, function(library) {
            return getAudioLibraryFileName(library) === audioLibraryFileName;
        });
    };

    function getAudioLibraryFileName(library) {
        var splits = library.filepath.split("/");
        return splits[splits.length - 1];
    };

    function getScheduleActionDisplay(action, resource) {
        var display;
        if (action.isSimpleAction) {
            display = action.title;
        } else if (action.resourceCollName) {
            display = displayTransferOption.call(this, resource);
            if (display) {
                display = display.display;
            }
        }
        return display;
    };

    function allActions() {
        var actions = [];
        [].concat(service.actions).reverse().forEach(function(action) {
            if (action.isSimpleAction) {
                var display = getScheduleActionDisplay(action);
                actions.push({
                    action: action,
                    display: display
                });
            } else if (action.resourceCollName) {
                service[action.resourceCollName].forEach(function(resource) {
                    var display = getScheduleActionDisplay(action, resource);
                    actions.push({
                        action: action,
                        resource: resource,
                        display: display
                    });
                });
            }
        });
        return actions;
    };


    // # getScheduleActionDisplay(action, resource)
    // # displayTransferOption(transferOpt, actionName, isRingGroup)
    // displayExtension: getMatchingDestByExt
    // displayRingGroup: none
    // displayVoicemail: service.extensionsByExtension, getMatchingDestByExt
    // displayAnnouncement: service.recordings
    // displayIvr: none
    // getMatchingDestByExt: service.extensionsByDid, service.destinationsByDestinationNumber


    function shapePortingActionsForDisplay(portingActions) {
        portingActions.loadAudioLibraries.response = service.audioLibraries;
        var extensions = portingActions.loadExtensions.response;
        var destinations = portingActions.loadDestinations.response;
        var extensionsByDidProps = [
            "number_alias", "outbound_caller_id_number", "effective_caller_id_number"
        ];
        var extensionsByDid = usefulTools.arrayToObjectByProp(extensions, extensionsByDidProps);
        var destsByDestNum = usefulTools.arrayToObjectByProp(destinations, "destination_number");
        var extensionsByExtension = usefulTools.arrayToObjectByProp(extensions, "extension");
        var recordings = service.recordings;
        var displayContext = {
            service: {
                extensionsByDid: extensionsByDid,
                destinationsByDestinationNumber: destsByDestNum,
                extensionsByExtension: extensionsByExtension,
                recordings: recordings
            }
        };
        var actions = Object.values(portingActions).map(function(resourceGroup) {
            var action = resourceGroup.action;
            return resourceGroup.response.map(function(resource) {
                var actionData = displayTransferOption.call(displayContext, resource);
                if (actionData) {
                    actionData.resourceUuid = getResourceUuid(resource);
                    actionData.resource = resource;
                    actionData.actionName = action.name;
                }
                return actionData;
            });
        });
        return _.flatten(actions).filter(Boolean);
    };

    function getNoAnswerDeps(noAnswerOpts, scope) {
        var transferOpts = service.transferOpts;
        var getMapTransfer = service.getMapTransferOptToNoAnswerOpt;
        var mapTransferOpt = getMapTransfer(scope, noAnswerOpts);
        return transferOpts.map(mapTransferOpt);
    };

    function getMapTransferOptToNoAnswerOpt(scope, noAnswerOpts) {
        return function(transferOpt) {
            var transferOptName = transferOpt.transferOptResourceName ||
                transferOpt.resourceCollName;
            return {
                scope: scope,
                targetName: transferOptName,
                attachName: transferOptName,
                onAfterRefresh: function() {
                    _.remove(noAnswerOpts, function(option) {
                        return option &&
                            option.display.indexOf(
                                transferOpt.transferOptDisplayRoot
                            ) > -1;
                    });
                    var displayOpts = scope[transferOptName].map(function(opt) {
                        var displayOpt = displayTransferOption(opt, null);
                        if (opt && displayOpt) { displayOpt.resource_uuid = getResourceUuid(opt); }
                        return displayOpt;
                    }).filter(Boolean).forEach(function(opt) {
                        if (opt && noAnswerOpts.indexOf(opt) === -1) {
                            noAnswerOpts.push(opt);
                        }
                    });
                }
            };
        };
    };

    function getContactNamesByExtension() {
        var contacts = contactService.getUserContactsOnly();
        var mappings = contacts.map(function(contact) {
            if (contact) {
                return {
                    extension: contact.ext,
                    contact_name_full: contact.name
                };
            }
        });
        return usefulTools.arrayToObjectByProp(mappings, "extension");
    };

    function sortExtensionsByHasContact(extensions, contactNamesByExtension) {
        return extensions.sort(function(extA, extB) {
            var extAHasContact = contactNamesByExtension[extA.extension];
            var extBHasContact = contactNamesByExtension[extB.extension];
            if (extAHasContact && extBHasContact) {
                return 0;
            } else if (extAHasContact) {
                return -1;
            } else if (extBHasContact) {
                return 1;
            } else {
                return 0;
            }
        });
    };

    function getVoicemailGreetingMatchingAudioLibrary(greeting) {
        return _.find(service.audioLibraries, {
            audio_library_uuid: greeting.greeting_name
        });
    };

    function orderNewNumber(isTest) {
        if (isTest) {
            service.reserveDid.alterHandlerData.substitueApiFn = dataFactory.getTestNumber;
        }
        return service.reserveDid().then(function(dest) {
            if (dest) {
                var did = dest.destination_number;
                $rootScope.showSuccessAlert("New number, " + did + " successfully ordered");
                return true;
            } else {
                var message = "We were unable to order a new number, " +
                    "please contact customer support to resolve this issue.";
                $rootScope.showErrorAlert(message);
                return false;
            }
        });
    };

    function traverseNestedProp(obj, props) {
        if (_.isArray(props)) {
            props.slice(0, props.length - 1).forEach(function(prop) {
                obj = obj[prop];
            });
            props = props[props.length - 1];
        }
        return {
            obj: obj,
            prop: props
        };
    };

    function wrapResourceDelete(deleteFn) {
        return function(resource) {
            var action = _.find(service.actions, {
                name: getTransferOptActionName(resource)
            });
            if (action) {
                var resourceName = action.resourceName;
                promptForResourceDelete(resourceName, function() {
                    deleteFn(resource).then(showSuccessResourceDeleteAlert(
                        resource));
                });
            }
        };
    };

    function promptForResourceDelete(resourceName, onConfirm) {
        var title = "Are you sure want to delete this " + resourceName + " ?";
        var confirmDelete = $mdDialog.confirm()
            .title(title)
            .ariaLabel("Cancel")
            .ok("Yes, delete")
            .cancel("No, never mind");
        return $mdDialog.show(confirmDelete).then(onConfirm);
    };

    function packageAsFormData(data) {
        var files = data.files;
        delete data.files;
        var compressed = JSON.stringify(data);
        return fileService.convertObjectToFormData({
            compressed: compressed,
            files: files
        });
    };

    function getVoicemailAudioLibrary(voicemail) {
        var greeting = voicemail.greetingData;
        return _.find(service.audioLibraries, {
            audio_library_uuid: greeting.greeting_name
        });
    };

    function createVoicemailFromLibraryAndVmSettings(library, voicemailSettings) {
        var data = _.merge(voicemailSettings, {
            audio_library_uuid: library.audio_library_uuid,
            domain_uuid: $rootScope.user.domain_uuid
        });
        return service.createVoicemailFromLibrary(data);
    };

    function assignDestinationToAttendant(destination, attendant, elideHandling) {
        var data = {
            auto_attendant_uuid: attendant.auto_attendant_uuid,
            destinations: service.attendantDestinationUuids(attendant),
            description: attendant.description,
            action_name: "time-condition"
        };
        service.updateAttendant.alterHandlerData.elideHandling = elideHandling;
        return service.updateAttendant(data);
    };

    function getIvrGreeting(ivr) {
        var greetingFileName = ivr.ivr_menu_greet_long;
        return service.getAudioLibraryByFileName(greetingFileName);
    };

    return service;
});
