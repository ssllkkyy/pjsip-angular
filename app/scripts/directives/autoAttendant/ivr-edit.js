'/use strict';

proySymphony.directive("ivrEdit", function(autoAttendantService, usefulTools, $filter, $rootScope,
    contactService, symphonyConfig, resourceFrameworkService, $mdDialog, ivrMenuFactory) {
    return {
        restrict: "E",
        templateUrl: "views/auto-attendant/ivr-edit.html",
        scope: {
            ivr: "<",
            registerResourceRetrieve: "&"
        },
        link: function($scope, element, attributes) {
            var aas = autoAttendantService;
            var rfs = resourceFrameworkService;

            $scope.init = function() {
                $scope.registerResourceRetrieve({
                    retrievalFn: saveIvr
                });
                $scope.ivrAction = _.find(aas.actions, {
                    name: "ivr"
                });
                $scope.editing = Boolean($scope.ivr);
                $scope.timeoutOptions = [
                    {value: "hangup", display: "Hangup"},
                    {value: "menu-top-app", display: "Replay Menu"}
                ];
                $scope.audioInfo = {};
                $scope.ivrGreetingInfo = {};
                registerResourceDependencies();
                var domain = $rootScope.user.domain;
                if ($scope.editing) {
                    $scope.ivrModel = new ivrMenuFactory($scope.ivr, domain, aas);
                    var greeting = aas.getIvrGreeting($scope.ivr);
                    if (greeting) {
                        $scope.onNewIvrGreetingInfo(greeting);
                    }
                } else {
                    $scope.ivrModel = new ivrMenuFactory(null, domain, aas);
                }
                attachIvrMenuStateChangeFns($scope.ivrModel);
            };

            $scope.recordNewGreeting = function() {
                $scope.ivrGreetingInfo.ivrGreeting = null;
            };

            $scope.onNewIvrGreetingInfo = function(greeting) {
                $scope.ivrGreetingInfo.ivrGreeting = greeting;
                $scope.ivrGreetingInfo.audioFile = getAudioLibraryFilePath(greeting);
            };

            $scope.openAudioSelector = function(optionModel) {
                var type = _.isString(optionModel) ? optionModel : optionModel.actionName;
                $scope.audioSelectorType = type;
                if (optionModel.resourceFileValue &&
                    (type === "announcement" || type === "voicemail")) {
                    $scope.selectedAudio = optionModel.resourceFileValue;
                } else if (type === "ivr-greeting") {
                    $scope.ivrGreetingInfo.ivrGreeting = null;
                    usefulTools.goToId('audio-selector');
                }
                return $scope.closeAudioSelector;
            };

            $scope.alterAudioResources = function(resources) {
                if (resources.then) {
                    resources.then(function(resources) {
                        return $scope.alterAudioResources(resources);
                    });
                } else {
                    if (!resources.length) {
                        return resources;
                    }
                    var isVm = resources[0].voicemail_uuid;
                    if (isVm) {
                        return !$scope.ivrModel.editingOpt ? resources :
                            resources.filter(function(voicemail) {
                                return voicemail.greeting !==
                                    $scope.ivrModel.editingOpt.resourceFileValue;
                            });
                    } else {
                        return resources.filter(function(audioLibrary) {
                            var type = $scope.audioSelectorType;
                            if (type === "ivr-greeting") {
                                return audioLibrary !== $scope.ivrGreetingInfo
                                    .ivrGreeting;
                            } else if (type === "announcement") {
                                var opt = $scope.ivrModel.editingOpt;
                                return audioLibrary.file !== opt.resourceFileValue ||
                                    getAudioLibraryFilePath(audioLibrary) !==
                                    opt.resourceFileValue;
                            }
                            return audioLibrary;
                        });
                    }
                }
                return resources;
            };

            $scope.displayTransferOption = aas.displayTransferOption;

            $scope.closeAudioSelector = function() {
                $scope.selectedRecording = null;
                $scope.audioSelectorType = null;
            };

            $scope.chooseAudio = function(data) {
                var item = data.resource ? data.resource : data.file;
                var type = data.resource ? "resource" : "file";
                if ($scope.audioSelectorType === "ivr-greeting" &&
                    $scope.ivrGreetingInfo.ivrGreeting !== item) {
                    if (item) { $scope.onNewIvrGreetingInfo(item); }
                } else {
                    $scope.ivrModel.editingOpt.updateResource(data.resource, data.file);
                }
                $scope.closeAudioSelector();
            };

            $scope.disableGreetingSelector = function() {
                return !$scope.audioLibraries || !$scope.audioLibraries.length ||
                    $scope.audioSelectorType === 'ivr-greeting';
            };

            $scope.onOptionActionChange = function(newAction) {
                $scope.closeAudioSelector();
                $scope.audioInfo = {};
            };

            function saveIvr() {
                var message;
                if (!$scope.ivrGreetingInfo.ivrGreeting) {
                    message = "Please choose a greeting for your IVR before continuing";
                } else if (!$scope.ivrModel.optionModels.length) {
                    message =
                        "You must create at least one IVR option before saving your IVR";
                } else if (_.find($scope.ivrModel.optionModels, {
                        editing: true
                    })) {
                    message = "Please finish editing your IVR option to save your IVR";
                } else if (!$scope.ivrModel.ivr_menu_name) {
                    message = "Please provide a name for your IVR";
                } else if (!$scope.timeoutOption) {
                    message = "Please choose an Exit Action to save this IVR";
                } else if (!$scope.ivrModel.ivr_menu_timeout) {
                    message = "Please input a timeout to save this IVR";
                }
                if (message) {
                    $rootScope.showErrorAlert(message, true);
                    return false;
                }
                var data = $scope.ivrModel.getPersistanceData();
                var greetingInfo = $scope.ivrGreetingInfo;
                data.greeting_announcement_uuid = greetingInfo.ivrGreeting.audio_library_uuid;
                data.ivr_menu_exit_app = $scope.timeoutOption.type;
                data.ivr_menu_exit_data = $scope.timeoutOption.data;
                if ($scope.timeoutOption.did) {
                    var did = $scope.timeoutOption.did;
                    var domainName = $rootScope.user.domain.domain_name;
                    data.ivr_menu_exit_data = "2343" + did + " XML " + domainName;
                }
                if ($scope.editing) {
                    return aas.updateIvr(data).then(handleIvrApiResponse("update"));
                } else {
                    return aas.createIvr(data).then(handleIvrApiResponse("create"));
                }
                return null;
            };

            function registerResourceDependencies() {
                var resourceDependencies = [{
                    scope: $scope,
                    targetName: "audioLibraries",
                    attachName: "audioLibraries"
                }];
                // .concat(getIvrNoAnswerDeps());
                aas.registerResourceDependencies(resourceDependencies);
            };

            function handleIvrApiResponse(type) {
                return function(ivr) {
                    if (ivr) {
                        var ivrTitle = $scope.ivrAction.displayTitleFn(ivr);
                        var message = ivrTitle + " successfully " + type + "d.";
                        $rootScope.showSuccessAlert(message, true);
                    }
                    return null;
                };
            };

            function getAudioLibraryFilePath(audioLibrary) {
                return symphonyConfig.audioUrl + audioLibrary.filepath;
            };

            function getIvrNoAnswerDeps() {
                return aas.getNoAnswerDeps($scope.noAnswerOptions, $scope);
            };

            function attachIvrMenuStateChangeFns(ivrModel) {
                var fnSpecs = [
                    [ivrModel.addNewOption,
                        {
                            bool: ivrModel.isEditingOption
                        },
                        wrappedInfoIntercept(
                            "Please finish editing your current option before adding another."
                        )
                    ],
                    [ivrModel.editOption,
                        function(optToEdit) {
                            return ivrModel.editingOpt && ivrModel.editingOpt !==
                                optToEdit;
                        },
                        wrappedInfoIntercept(
                            "Please finish editing your current option before editing another."
                        )
                    ],
                    [ivrModel.saveNewOption,
                        function() {
                            var canSave = ivrModel.editingOpt.canSaveChanges();
                            return canSave === true ? false : canSave;
                        },
                        function(message) {
                            if (message === "no-digit") {
                                message =
                                    "Please select a phone digit option before saving.";
                            } else if (message === "no-description") {
                                message =
                                    "Please provide a description before saving";
                            } else if (message === "no-action") {
                                message =
                                    "Please select an action to send callers to.";
                            }
                            return infoIntercept(message);
                        }
                    ]
                ].forEach(_.spread(ivrModel.registerStateChangeIntercept));

                function wrappedInfoIntercept(message) {
                    return _.partial(infoIntercept, message);
                };

                function infoIntercept(message) {
                    return $rootScope.showInfoAlert(message, true).then(function(response) {
                        return false;
                    });
                };
            }

            $scope.init();
        }
    };
});
