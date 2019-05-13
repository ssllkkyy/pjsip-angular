'use strict';

proySymphony.service('audioLibraryService', function(dataFactory, $filter, $rootScope, $window,
    userService, resourceFrameworkService, fileService) {

    var service = {
        audioLibraries: [],
        audioChunks: [],
        fnDocs: {},
        transcripts: []
    };

    var rfs = resourceFrameworkService;

    var getResourceFn = rfs.getResourceFnForService({
        service: service,
        serviceName: "audioLibraryService",
        docTarget: service.fnDocs
    });

    service.init = function() {
        rfs.addResourceDependencyRegister(service);
    };

    service.getAudioLibraries = function(domainUuid) {
        return service.loadAudioLibraries(domainUuid);
    };

    service.loadAudioLibraries = function(domainUuid, persistData) {
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain_uuid;
        }
        if (persistData === undefined) {
            persistData = true;
        }
        return service.retrieveAudioLibraries({
            domainUuid: domainUuid,
            persistData: persistData
        });
    };

    service.retrieveAudioLibraries = getResourceFn({
        apiFn: dataFactory.getAudioLibrariesByDomain,
        handlerData: {
            target: service.audioLibraries,
            dataMapping: massageAudioLibraries,
            resourceName: "audioLibraries",
            onBeforeHandle: function(handlerData) {
                handlerData.originalRequestData = handlerData.requestData;
                var persist = Boolean(handlerData.requestData.persistData);
                handlerData.handleType = persist ? "copy" : "noop";
                handlerData.requestData = handlerData.requestData.domainUuid;
            }
        },
        doc: {
            retrieveAudioLibraries: {
                domainUuid: ["required", "uuid"],
                persistData: ["optional", "boolean"]
            }
        }
    });

    service.deleteAudioLibraryByUuid = function(uuid, userUuid) {
        return dataFactory.getDeleteAudioLibraryByUuid(uuid, userUuid).then(function(
            response) {
            if (response.data.success) {
                _.remove(service.audioLibraries, {
                    audio_library_uuid: uuid
                });
                $rootScope.libraryDeleted = uuid;
                rfs.triggerResourceChangeCallback({
                    resourceName: "audioLibraries",
                    service: service
                });
                return service.audioLibraries;
            } else {
                console.log('FAILED DELETING AUDIO LIBRARY');
                console.log(response);
                return false;
            }
        });
    };

    service.renameAudioLibraryByUuid = function(uuid, filename) {
        return dataFactory.getRenameAudioLibraryByUuid(uuid, filename)
            .then(function(response) {
                if (response.data.success) {
                    var library = response.data.success.data;
                    return library.file_title;
                } else {
                    return null;
                }
            });
    };

    service.createLibrary = function(opts) {
        var collection = opts.collection;
        var data = fileService.convertObjectToFormData({
            recording: opts.file,
            user_uuid: $rootScope.user.id,
            category: opts.category,
            access_level: opts.accessLevel,
            domain_uuid: opts.domainUuid || $rootScope.user.domain_uuid,
            title: opts.title || opts.file.title,
            timeout_action: opts.timeout_action,
            timeout_resource_uuid: opts.timeout_resource_uuid
        });
        return dataFactory.postUploadAudioFile(data)
            .then(function(response) {
                if (response.data.success) {
                    if (collection) {
                        collection.push(response.data.success.data);
                    } else {
                        service.audioLibraries.push(response.data.success.data);
                    }
                    rfs.triggerResourceChangeCallback({
                        resourceName: "audioLibraries",
                        service: service
                    });
                }
                return response;
            }, function(error) { console.log(error); });
    };

    service.filterAudioLibrariesByField = function(collection, field, allowedValues) {
        if (collection && field && allowedValues) {
            return collection.filter(function(library) {
                return allowedValues.indexOf(library[field]) > -1;
            });
        }
        return null;
    };

    service.filterAudioLibrariesByCategories = function(collection, categories) {
        if (collection && categories) {
            return service.filterAudioLibrariesByField(collection, 'category',
                categories);
        }
        return null;
    };

    function removeAudioLibraryFromCollectionByUuid(uuid, collection) {
        console.log(collection);
        console.log(uuid);
        var index = $filter('getByUUID')(collection, uuid, 'audio_library');
        console.log(index);
        if (index !== null) collection.splice(index, 1);
        return collection;
        /*  return collection.filter(function(library) {
              return library.audio_library_uuid !== uuid;
          });*/
    };

    function massageAudioLibraries(libraries) {
        libraries.forEach(function(library) {
            if (!library.access_level) {
                library.access_level = 'personal';
            };
        });
        return libraries;
    };

    service.getAudioLibraryFromCollectionByUuid = function(uuid, collection) {
        var ringtone;
        console.log(collection);
        if (collection) {
            for (var i = 0; i < collection.length; i++) {
                ringtone = collection[i];
                if (ringtone.audio_library_uuid === uuid) {
                    return ringtone;
                }
            };
        }
        return undefined;
    };

    service.updateRingtoneSettings = function() {
        if ($rootScope.user.callRingtone) {
            dataFactory.getAudioLibraryByUuid('ringtones', $rootScope.user.callRingtone)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.user.callRingtonePath = response.data.success.data
                            .filepath;
                        $window.localStorage.setItem("currentUser", JSON.stringify(
                            $rootScope.user));
                    }
                });
        }
        if ($rootScope.user.textRingtone) {
            dataFactory.getAudioLibraryByUuid('ringtones', $rootScope.user.textRingtone)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.user.textRingtonePath = response.data.success.data
                            .filepath;
                        $window.localStorage.setItem("currentUser", JSON.stringify(
                            $rootScope.user));
                    }
                });
        }
        if ($rootScope.user.chatRingtone) {
            dataFactory.getAudioLibraryByUuid('ringtones', $rootScope.user.chatRingtone)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.user.chatRingtonePath = response.data.success.data
                            .filepath;
                        $window.localStorage.setItem("currentUser", JSON.stringify(
                            $rootScope.user));
                    }
                });
        }
        if ($rootScope.user.videoInviteRingtone) {
            dataFactory.getAudioLibraryByUuid('ringtones', $rootScope.user.videoInviteRingtone)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.user.videoInviteRingtonePath = response.data.success
                            .data.filepath;
                        $rootScope.$broadcast('sync.audio.libraries');
                        $window.localStorage.setItem("currentUser", JSON.stringify(
                            $rootScope.user));
                    }
                });
        }
    };

    service.synthesizeTextToSpeech = getResourceFn({
        apiFn: dataFactory.synthesizeTextToSpeech,
        handlerData: {
            handleType: "noop",
            onBeforeHandle: function(handlerData) {
                handlerData.requestData = {
                    text: handlerData.requestData
                };
            },
            dataMapping: function(fileData, handlerData) {
                return fileService.b64toFile(fileData, "audio/wav", Date.now() +
                    ".wav");
            }
        },
        doc: {
            synthesizeTextToSpeech: {
                text: ["string", "required"]
            }
        }
    });

    service.createSynthesizedAudio = getResourceFn({
        apiFn: dataFactory.createSynthesizedAudio,
        handlerData: {
            target: service.audioLibraries,
            handleType: "push",
            resourceName: "audioLibraries",
            onBeforeHandle: function(handlerData) {
                var reqData = handlerData.requestData;
                handlerData.requestData = fileService.convertObjectToFormData(reqData);
            },
            dataMapping: function(synthData, handlerData) {
                service.transcripts.push(synthData.transcript);
                return synthData.library;
            }
        },
        doc: {
            createSynthesizedAudio: {
                transcript: ["string", "required"],
                file: ["file", "required"]
            }
        }
    });

    service.updateSynthesizedAudio = getResourceFn({
        apiFn: dataFactory.updateSynthesizedAudio,
        handlerData: {
            target: service.audioLibraries,
            handleType: "replace",
            resourceName: "audioLibraries",
            propertyName: "audio_library_uuid",
            onBeforeHandle: function(handlerData) {
                var reqData = handlerData.requestData;
                handlerData.requestData = fileService.convertObjectToFormData(
                    reqData);
            },
            dataMapping: function(synthData, handlerData) {
                var transcript = synthData.transcript;
                var transcriptKey = "google_tts_transcript_uuid";
                var transcriptFindSpec = {};
                transcriptFindSpec[transcriptKey] = transcript[transcriptKey];
                var matchingTranscript = _.find(service.transcripts,
                    transcriptFindSpec);
                matchingTranscript.transcript = transcript.transcript;
                return synthData.library;
            }
        },
        doc: {
            updateSynthesizedAudio: {
                transcript: ["string", "required"],
                file: ["file", "required"]
            }
        }
    });

    service.loadTranscripts = getResourceFn({
        apiFn: dataFactory.getResource,
        handlerData: {
            target: service.transcripts,
            handleType: "copy",
            resourceName: "transcripts",
            onBeforeHandle: function(handlerData) {
                handlerData.spread = true;
                handlerData.requestData = ["transcripts", handlerData.requestData];
            }
        },
        doc: {
            loadTranscripts: {
                noParams: true
            }
        }
    });

    service.playAudio = playAudio;

    function playAudio(file) {
        var url = URL.createObjectURL(file);
        var a = new Audio();
        a.src = url;
        a.play();
    }

    service.init();

    return service;
});
