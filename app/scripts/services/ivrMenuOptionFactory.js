proySymphony.factory("ivrMenuOptionFactory", [
    "resourceFrameworkService",
    function ivrMenuOption(resourceFrameworkService) {
        return function model(ivrOption, domain, digitOpts, aas) {
            ivrOption = _.cloneDeep(ivrOption);
            // ----------------------- //
            var main = this;
            var rfs = resourceFrameworkService;
            // ----------------------- //
            var domainName = domain.domain_name;
            // ----------------------- //
            var isNewOption;
            var optionActions;
            var optionAction;
            var optionParam;
            var optionResource;
            var editing;
            var digitOpt;
            var paramDisplayVal;

            function init() {
                isNewOption = !ivrOption;
                optionActions = getIvrOptionActions();
                !isNewOption && updateAction();
                !isNewOption && (optionParam = ivrOption.ivr_menu_option_param);
                defineProps(ivrOption);
                if (isNewOption) { ivrOption = {}; }
                initializeProps(ivrOption, optionParam, optionAction);
            };
            init();

            function defineProps(option) {
                main.digitValue = null;
                main.order = null;
                Object.defineProperties(main, {
                    editing: {
                        get: function() {
                            return editing;
                        }
                    },
                    ivr_menu_option_digits: {
                        get: function() {
                            return digitOpt;
                        },
                        set: function(newDigitOpt) {
                            if (newDigitOpt) {
                                updateDigit(newDigitOpt.value, newDigitOpt.order);
                                digitOpt = newDigitOpt;
                            }
                            return digitOpt;
                        }
                    },
                    paramDisplayVal: {
                        get: function() {
                            return paramDisplayVal;
                        },
                        set: function(newDisplayVal) {
                            updateResource(newDisplayVal);
                            return paramDisplayVal;
                        }
                    }
                });
                isNewOption && (main.updateAction = updateAction);
                main.edit = edit;
                main.updateParam = updateParam;
                main.updateResource = updateResource;
                main.getPersistanceData = getPersistanceData;
                main.canSaveChanges = canSaveChanges;
                main.$$hashKey = "";
                rfs.attachStateFns(main, [
                    ["saveChanges", saveChanges],
                    ["cancelEditing", cancelEditing]
                ]);
                var stateChangeInterceptRegister = rfs.getStateChangeInterceptRegister(
                    main);
                main.registerStateChangeIntercept = stateChangeInterceptRegister;
            };

            function initializeProps(option, param, action) {
                main.ivr_menu_option_digits = _.find(digitOpts, {
                    value: option.ivr_menu_option_digits
                });
                main.description = option.ivr_menu_option_description;
                main.actionName = action && action.name;
                main.hasResource = action && action.hasResource;
                main.actionTitle = action && action.title;
                main.resourceFileValue = null;
                action && handleOptionResource(param, action, updateResource);
            };

            function handleOptionResource(param, action, onResource) {
                function onReadyToSetParam(result) {
                    onResource(result.resource, result.file);
                };
                if (action.getResourceFn) {
                    var result = action.getResourceFn(param, action);
                    if (!result) {
                        return;
                    }
                    result.then ? result.then(onReadyToSetParam) : onReadyToSetParam(
                        result);
                }
            };

            function updateAction(newAction) {
                if (isNewOption) {
                    optionAction = _.find(optionActions, {
                        name: newAction
                    });
                    updateParam();
                } else {
                    optionAction = getIvrOptionAction(ivrOption, optionActions);
                }
                if (optionAction) {
                    main.actionName = optionAction.name;
                    main.hasResource = optionAction.hasResource;
                }
            };

            function getPersistanceData() { return ivrOption; };

            function updateDigit(digit, order) {
                main.digitValue = digit;
                main.order = order;
            };

            function edit() {
                editing = true;
            };

            function cancelEditing() {
                editing = false;
                initializeProps(ivrOption, optionParam, optionAction);
            };

            function saveChanges() {
                ivrOption.ivr_menu_option_digits = main.digitValue;
                ivrOption.ivr_menu_option_action = optionAction.optionAction || "menu-exec-app";
                ivrOption.ivr_menu_option_param = optionParam;
                ivrOption.ivr_menu_option_order = main.order;
                ivrOption.ivr_menu_option_description = main.description;
                cancelEditing();
                // if announcement option, add the audio_library_uuid so that
                // the back-end can easily check for the presence of a
                // VRecording
                if (optionAction.name === "announcement") {
                    ivrOption.audio_library_uuid = optionResource.audio_library_uuid;
                }
            };

            function canSaveChanges() {
                if (!main.digitValue) {
                    return "no-digit";
                } else if (!main.description) {
                    return "no-description";
                } else if (!optionParam && optionParam !== "") {
                    return "no-action";
                }
                return true;
            };

            function updateResource(resource, file) {
                optionResource = resource;
                updateFileValue(file);
                updateParam(resource);
            };

            function updateFileValue(file) { main.resourceFileValue = file; };

            function updateParam(value) {
                main.actionTitle = optionAction.title;
                var result;
                if (value && optionAction.getParam.length > 0) {
                    result = optionAction.getParam(value);
                } else if (!value && !optionAction.getParam.length) {
                    result = optionAction.getParam();
                }
                if (!result) {
                    return;
                }
                optionParam = result.param;
                paramDisplayVal = result.display;
                if (optionAction.getResourceFn) {
                    function onResourceUpdate(resource, file) {
                        updateFileValue(file);
                    }
                    handleOptionResource(optionParam, optionAction, onResourceUpdate);
                }
            };

            function getIvrOptionActions() {
                function optionFileCb(resource) {
                    return function(file) {
                        return {
                            resource: resource,
                            file: file
                        };
                    };
                }
                return [{
                    name: "dialbyname",
                    title: "Dial By Name",
                    checkFn: function(param) {
                        return param && param.indexOf("transfer *411 ") > -
                            1;
                    },
                    getParam: function() {
                        // dialbyname: "param" => "transfer *411 XML $domain_name"
                        return {
                            param: "transfer *411 XML " + domainName,
                            display: ""
                        };
                    }
                }, {
                    name: "external-did",
                    title: "Transfer to External Number",
                    hasResource: true,
                    checkFn: function(param) {
                        return param && param.indexOf("transfer 2343") > -1;
                    },
                    getParam: function(value) {
                        // external-did: $action["param"] = "transfer 2343$number XML $domain_name";
                        return {
                            param: "transfer 2343" + value + " XML " +
                                domainName,
                            display: value
                        };
                    },
                    getResourceFn: function(param) {
                        var did = param.split("transfer 2343")[1].split(" ")[
                            0];
                        return did && optionFileCb(did)(null);
                    }
                }, {
                    name: "announcement",
                    title: "Send to Message Announcement",
                    hasResource: true,
                    checkFn: function(param) {
                        return param && param.indexOf("lua streamfile.lua") > -1;
                    },
                    getResourceFn: function(param, action) {
                        var announcementFileName = param.split("lua streamfile.lua ")[1];
                        var announcement = aas.getAudioLibraryByFileName(announcementFileName);
                        if (announcement && !announcement.file) {
                            return aas.loadAnnouncementAudio(announcement)
                                .then(optionFileCb(announcement));
                        }
                        return announcement && optionFileCb(announcement)(announcement.file);
                    },
                    getParam: function(value) {
                        // announcement: $action["param"] = "lua streamfile.lua
                        // $recording_filename";
                        var audioLibrary = value;
                        var recordingFilename =
                            getRecordingFilenameFromAudioLibrary(audioLibrary);
                        return {
                            param: "lua streamfile.lua " + recordingFilename,
                            display: audioLibrary.file_title
                        };
                    }
                }, {
                    name: "voicemail",
                    title: "Send to Voicemail",
                    hasResource: true,
                    checkFn: function(param) {
                        return param && param.indexOf("transfer *99") > -1;
                    },
                    getResourceFn: function(param, action) {
                        var voicemailId = param.split("transfer *99")[1].split(
                            " ")[0];
                        var voicemail = _.find(aas.voicemails, {
                            voicemail_id: voicemailId
                        });
                        if (voicemail) {
                            var vmUuid = voicemail.voicemail_uuid;
                            if (!voicemail.greeting) {
                                return aas.loadVoicemailGreeting(vmUuid)
                                    .then(optionFileCb(voicemail));
                            }
                            return optionFileCb(voicemail)(voicemail.greeting);
                        }
                        return null;
                    },
                    getParam: function(value) {
                        // voicemail: $action["param"] = "transfer
                        // *99$voicemail_ext XML $domain_name";
                        var voicemail = value;
                        var voicemailId = voicemail.voicemail_id ||
                            voicemail;
                        return {
                            param: "transfer *99" + voicemailId + " XML " +
                                domainName,
                            display: voicemailId
                        };
                    }
                }, {
                    name: "extension",
                    title: "Transfer to Extension",
                    hasResource: true,
                    checkFn: function(param) {
                        if (param && param.indexOf("transfer") > -1) {
                            var ext = param.split(" ")[1];
                            return Boolean(aas.extensionsByExtension[ext]);
                        }
                        return false;
                    },
                    getResourceFn: function(param, action) {
                        var ext = param.split("transfer ")[1].split(" ")[0];
                        var extension = _.find(aas.extensions, {
                            extension: ext
                        });
                        return optionFileCb(extension)(null);
                    },
                    getParam: function(value) {
                        // extension: $action["param"] = "transfer $ext XML $domain_name";
                        var ext = value;
                        if (ext.extension) {
                            ext = ext.extension;
                        }
                        return {
                            param: "transfer " + ext + " XML " + domainName,
                            display: ext
                        };
                    }
                }, {
                    name: "ring-group",
                    title: "Send to Ring Group",
                    hasResource: true,
                    checkFn: function(param) {
                        if (param && param.indexOf("transfer") > -1) {
                            var ext = param.split(" ")[1];
                            return Boolean(aas.ringGroupsByExtension[ext]);
                        }
                        return false;
                    },
                    getResourceFn: function(param, action) {
                        var ext = param.split("transfer ")[1].split(" ")[0];
                        var ringGroup = aas.ringGroupsByExtension[ext];
                        return optionFileCb(ringGroup)(null);
                    },
                    getParam: function(value) {
                        var ringGroup = value;
                        var ext = ringGroup.ring_group_extension ||
                            ringGroup;
                        return {
                            param: "transfer " + ext + " XML " + domainName,
                            display: ext
                        };
                    }
                }, {
                    name: "menu-top-app",
                    title: "Replay Menu",
                    optionAction: "menu-top-app",
                    checkFn: function(param, action) {
                        return action && action.indexOf("menu-top-app") > -
                            1;
                    },
                    getParam: function() {
                        return {
                            param: "",
                            display: ""
                        };
                    }
                }, {
                    name: "ivr",
                    title: "Send to another IVR",
                    hasResource: true,
                    checkFn: function(param) {
                        if (param && param.indexOf("transfer") > -1) {
                            var ext = param.split(" ")[1];
                            return Boolean(aas.ivrsByExtension[ext]);
                        }
                        return false;
                    },
                    getResourceFn: function(param, action) {
                        var ext = param.split("transfer ")[1].split(" ")[0];
                        var ringGroup = aas.ivrsByExtension[ext];
                        return optionFileCb(ringGroup)(null);
                    },
                    getParam: function(value) {
                        var ivr = value;
                        var ext = ivr.ivr_menu_extension || ivr;
                        return {
                            param: "transfer " + ext + " XML " + domainName,
                            display: ext
                        };
                    }
                }];
            };

            function getIvrOptionAction(option, actions) {
                var optionParam = option.ivr_menu_option_param;
                var optionAction = option.ivr_menu_option_action;

                function isMatchingAction(action) {
                    return action.checkFn(optionParam, optionAction);
                }
                return _.find(actions, isMatchingAction);
            };

            function getRecordingFilenameFromAudioLibrary(library) {
                // $splits = explode("/", $library->filepath);
                // $file_name = $splits[count($splits) - 1];
                var splits = library.filepath.split("/");
                return splits[splits.length - 1];
            };

            Object.seal(main);
        };
    }
]);
