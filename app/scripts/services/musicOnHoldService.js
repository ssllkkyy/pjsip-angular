'use strict';

proySymphony.service('musicOnHoldService', function(dataFactory, $rootScope) {

    var service = {
        musicOnHoldRecords: [],
        data: {}
    };

    service.init = function() {
        service.loadMusicOnHoldRecords();
    };

    service.getMusicOnHoldRecords = function() {
        if (service.musicOnHoldRecords.length < 1) {
            return service.loadMusicOnHoldRecords();
        } else {
            return new Promise(function(resolve) {
                resolve(service.musicOnHoldRecords);
            });
        }
    };

    service.loadMusicOnHoldRecords = function() {
        return dataFactory.getMusicOnHoldByDomain($rootScope.user.domain_uuid)
            .then(function(response) {
                var data;
                var records;
                console.log(response.data);
                if (response.data.success) {
                    data = response.data.success.data;
                    records = data.libraries;
                    service.data.defaultMOHName = data.defaultName;
                }
                if (records && records.length > 0) {
                    angular.copy(records, service.musicOnHoldRecords);
                    return service.musicOnHoldRecords;
                } else {
                    return false;
                };
            });
    };

    service.allowedMusicOnHoldTypes = ["audio/mpeg3", "audio/mp3", "audio/wav",
        "audio/x-wav", "audio/x-ms-wma"
    ];

    service.createMusicOnHold = function(file, name, domainUuid) {
        var data = new FormData();
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain_uuid;
        }
        data.append('music', file);
        data.append('groupName', name);
        data.append('fileName', file.name);
        data.append('domain_uuid', domainUuid);
        return dataFactory.postCreateMusicOnHold(data)
            .then(function(response) {
                console.log(response);
                if (response.data.success) {
                    service.musicOnHoldRecords.push(response.data.success.data);
                }
                return response;
            });
    };

    service.deleteMusicFile = function(musicUuid, fileName, message) {
        console.log(musicUuid, fileName);
        if (!message) {
            var message = 'Are you sure you want to delete this music? ';
        }
        if (fileName !== service.data.defaultMOHName) {
            return $rootScope.confirmDialog(message)
                .then(function(response) {
                    if (response) {
                        return dataFactory.getDeleteMusicFileFromMusicOnHold(
                                musicUuid, fileName)
                            .then(function(response) {
                                console.log(response);
                                if (response.data.success) {
                                    var record = getMusicRecordByUuidFromColl(
                                        musicUuid, service.musicOnHoldRecords
                                    );
                                    console.log(record);
                                    removeFileFromMusicRecord(record, fileName);
                                    return response.data.success;
                                }
                                return false;
                            });
                    }
                    return false;
                });
        }
    };

    service.addMusicToMusicOnHold = function(domainUuid, record, file) {
        var data = new FormData();
        data.append('file', file);
        data.append('domain_uuid', domainUuid);
        data.append('fileName', file.name);
        return dataFactory.postAddMusicToMusicOnHold(data).then(function(response) {
            // if (response.data.success) {
            //     var filename = response.data.success.data; // mp3s are converted, possible file rename
            //     record.files.push(filename);
            // };
            return response;
        });
    };

    function removeFileFromMusicRecord(record, fileName) {
        record.files = record.files.filter(function(file) {
            return file !== fileName;
        });
    };


    function getMusicRecordByUuidFromColl(uuid, collection) {
        for (var i = 0; i < collection.length; i++) {
            if (collection[i].music_on_hold_uuid === uuid) {
                return collection[i];
            }
        }
        return undefined;
    };

    service.renameMusicFile = function(fileName, newFilename, record) {
        var data = {
            fileName: fileName,
            newFileName: newFilename,
            musicUuid: record.music_on_hold_uuid
        };
        if (fileName !== service.data.defaultMOHName &&
            newFilename !== service.data.defaultMOHName) {
            return dataFactory.postRenameMusicFile(data).then(function(response) {
                if (response.data.success) {
                    var index = record.files.indexOf(fileName);
                    if (index > -1) {
                        record.files[index] = newFilename;
                    }
                    return response;
                }
                return false;
            });
        }
        return false;
    };

    return service;
});
