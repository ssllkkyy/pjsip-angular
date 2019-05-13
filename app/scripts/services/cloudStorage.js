'use strict';

proySymphony.service('cloudStorageService', function(dataFactory, $rootScope, fileService) {

    var service = {
        userRootFolder: null,
        numFoldersUpdatingPerms: 0,
        extraStorageLimit: 0.0
    };

    service.getUserRootFolder = function(userUuid) {
        return dataFactory.getUserRootFolder(userUuid).then(function(response) {
            if (response.data.success) {
                var data = angular.copy(response.data.success.root);
                var temp = angular.copy(response.data.success.root);
                service.addParentToFolderChildren(data);
                service.applyTraverseFromRoot(service.applyFileAttachmentFunctions,
                    undefined, data);
                if (!data.folders) data.folders = [];
                if (!data.files) data.files = [];
                service.userRootFolder = data;
                return service.userRootFolder;
            } else {
                if (__env.enableDebug) console.log("ERROR");
                if (__env.enableDebug) console.log(response.data.error.message);
                return undefined;
            }
        });
    };

    service.getTotalSpaceUsed = function(root) {
        var file;
        var folder;
        if (!root) {
            root = service.userRootFolder;
        }
        if (root) {
            var total = 0;
            if (root.files) {
                for (var i = 0; i < root.files.length; i++) {
                    file = root.files[i];
                    total += file.file_size_in_b;
                };
            }
            if (root.folders) {
                for (i = 0; i < root.folders.length; i++) {
                    folder = root.folders[i];
                    total += service.getTotalSpaceUsed(folder);
                }
            }
            return total;
        } else {
            return undefined;
        }
    };

    service.applyTraverseFromRoot = function(applyToFiles, applyToFolders, root) {
        var file;
        var folder;
        if (!root) {
            root = service.userRootFolder;
        }
        if (applyToFiles && root.files) {
            for (var i = 0; i < root.files.length; i++) {
                file = root.files[i];
                applyToFiles(file);
            }
        }
        if (root.folders) {
            for (var i = 0; i < root.folders.length; i++) {
                folder = root.folders[i];
                if (applyToFolders) {
                    applyToFolders(folder);
                }
                if ((applyToFiles && folder.files.length > 0) || folder.folders.length >
                    0) {
                    service.applyTraverseFromRoot(applyToFiles, applyToFolders, folder);
                }
            }
        }
        return true;
    };

    service.getAddonStorage = function() {
        dataFactory.getAddonStorage()
            .then(function(response) {
                console.log(response.data);
                service.extraStorageLimit = 0.0;
                if (response.data.success) {
                    service.extraStorageLimit = parseFloat(response.data.success.data *
                        1E9);
                }
            })
    };

    service.applyFileAttachmentFunctions = function(file) {
        service.attachFileSizeInBToFile(file);
        service.attachTrueFileSize(file);
    };

    service.attachFileSizeInBToFile = function(file) {
        file.file_size_in_b = service.getFileSizeInB(file.file_size);
    };

    service.attachTrueFileSize = function(file) {
        file.true_file_size = service.getFileSize(file.file_size);
    };

    service.addParentToFolderChildren = function(parent) {
        if (parent.folders && parent.folders.length > 0) {
            angular.forEach(parent.folders, function(child) {
                child.parent = parent;
                service.addParentToFolderChildren(child);
            });
        }
    };

    service.createFolder = function(parentUuid, folderName) {
        return dataFactory.getCreateFolder(parentUuid, folderName).then(function(
            response) {
            if (response.data.success) {
                var child = response.data.success.folder;
                child.folder_size = service.getFolderSize(child);
                var parent = service.getFolderByUuid(service.userRootFolder,
                    child.parent_folder_uuid);
                child.parent = parent;
                child.folders = [];
                child.files = [];
                $rootScope.$broadcast('updateCloudStorage', true);
                //parent.folders.push(child);
                if (parent.dummyFolders) parent.dummyFolders.pop();
                return child;
            } else {
                if (__env.enableDebug) console.log("ERROR");
                if (__env.enableDebug) console.log(response.data.error.message);
                return undefined;
            }
        });
    };

    service.deleteFolder = function(folderUuid) {
        return dataFactory.getDeleteFolder(folderUuid).then(function(response) {
            if (response.data.success) {
                var data = response.data.success.folder;
                return true;
            } else {
                if (__env.enableDebug) console.log("ERROR");
                if (__env.enableDebug) console.log(response.data.error.message);
                $rootScope.showErrorAlert(response.data.error.message);
                return false;
            }
        });
    };

    service.deleteFile = function(fileUuid) {
        return dataFactory.getDeleteFile(fileUuid).then(function(response) {
            if (response.data.success) {
                var data = response.data.success.file;
                return response;
            } else {
                if (__env.enableDebug) console.log("ERROR");
                if (__env.enableDebug) console.log(response.data.error.message);
                $rootScope.showErrorAlert(response.data.error.message);
                return response;
            }
        });
    };

    service.renameFolder = function(folderUuid, name) {
        return dataFactory.getRenameFolder(folderUuid, name).then(function(response) {
            if (response.data.success) {
                var data = response.data.success.file;
                return response;
            } else {
                if (__env.enableDebug) console.log("ERROR");
                if (__env.enableDebug) console.log(response.data.error.message);
                return response;
            }
        });
    };

    service.renameFile = function(fileUuid, name) {
        return dataFactory.getRenameFile(fileUuid, name).then(function(response) {
            if (response.data.success) {
                var data = response.data.success.file;
                return response;
            } else {
                if (__env.enableDebug) console.log("ERROR");
                if (__env.enableDebug) console.log(response.data.error.message);
                return response;
            }
        });
    };

    service.downloadFile = function(fileUuid, base64) {
        return dataFactory.getDownloadFile(fileUuid, base64).then(function(response) {
            if (response.data.success) {
                return response.data.success.file;
            } else if (response.data.error) {
                if (__env.enableDebug) console.log(
                    'DOWNLOAD FILE RETURNED ERROR: ');
                if (__env.enableDebug) console.log(response.data.error.message);
            }
            return undefined;
        });
    };

    service.moveFile = function(fileUuid, folderUuid) {
        return dataFactory.getMoveFile(fileUuid, folderUuid).then(function(response) {
            if (response.data.success) {
                var data = response.data.success.file;
                service.applyFileAttachmentFunctions(data);
                return data;
            } else if (response.data.error) {
                if (__env.enableDebug) console.log('MOVE FILE RETURNED ERROR: ');
                if (__env.enableDebug) console.log(response.data.error.message);
            }
            return undefined;
        });
    };

    service.copyFile = function(fileUuid, folderUuid) {
        return dataFactory.getCopyFile(fileUuid, folderUuid).then(function(response) {
            if (response.data.success) {
                var data = response.data.success.file;
                service.applyFileAttachmentFunctions(data);
                return data;
            } else if (response.data.error) {
                if (__env.enableDebug) console.log('COPY FILE RETURNED ERROR: ');
                if (__env.enableDebug) console.log(response.data.error.message);
            }
            return undefined;
        });
    };

    service.handleDuplicateFileRename = function(file, destinationFolder) {
        var fileName = fileService.removeFileExtensionFromFilename(file.original_filename);
        var extension = fileService.getFileExtensionFromFilename(file.original_filename);
        while (service.fileNameExistsInFolder(fileName + '.' + extension,
                destinationFolder)) {
            fileName = service.incrementFileName(fileName);
        }
        var fullFileName = fileName + '.' + extension;
        if (fullFileName !== file.original_filename) {
            service.renameFile(file.file_uuid, fileName + '.' + extension)
                .then(function(response) {
                    if (response.data.success) {
                        file.original_filename = fileName + '.' + extension;
                        destinationFolder.files.push(file);
                    }
                });
        } else {
            destinationFolder.files.push(file);
        }
    };

    service.moveFileFromFolderToFolder = function(file, currentFolder, destinationFolder) {
        if (service.removeFileFromParentByUuid(currentFolder, file.file_uuid)) {
            service.handleDuplicateFileRename(file, destinationFolder);
        };
    };

    service.getFolderByUuid = function(parent, uuid) {
        var child;
        if (parent.folder_uuid === uuid) {
            return parent;
        }
        for (var i = 0; i < parent.folders.length; i++) {
            child = parent.folders[i];
            if (child.folder_uuid === uuid) {
                return child;
            } else {
                var childResult = service.getFolderByUuid(child, uuid);
                if (childResult) {
                    return childResult;
                }
            }
        }
        return false;
    };

    service.getFileByUuid = function(parent, file_uuid) {
        var child;
        for (var i = 0; i < parent.files.length; i++) {
            child = parent.files[i];
            if (child.file_uuid === file_uuid) {
                return child;
            }
        }
        for (var i = 0; i < parent.folders.length; i++) {
            child = parent.folders[i];
            service.getFileByUuid(child);
        }
        return false;
    };

    service.getFolderSize = function(folder) {
        var total = 0;
        if (folder.files) {
            for (var i = 0; i < folder.files.length; i++) {
                total += service.getFileSizeInB(folder.files[i].file_size);
            }
        }
        if (folder.folders) {
            for (i = 0; i < folder.folders.length; i++) {
                total += service.getFileSizeInB(service.getFolderSize(folder.folders[i]));
            }
        }
        return service.getAppropriateFileSizeFromB(total, 1);
    };

    service.getFileSize = function(fileSize) {
        return service.getAppropriateFileSizeFromB(service.getFileSizeInB(fileSize), 1);
    };

    service.getFileSizeInB = function(fileSize) {
        var factor = fileSize.slice(getIndexOfFirstNonNumInStr(fileSize), fileSize.length)
            .toLowerCase();
        var size = parseInt(fileSize.slice(0, getIndexOfFirstNonNumInStr(fileSize)));
        switch (factor) {
            case 'kb':
                size *= 1024;
                break;
            case 'mb':
                size *= Math.pow(1024, 2);
                break;
            case 'gb':
                size *= Math.pow(1024, 3);
                break;
            case 'tb':
                size *= Math.pow(1024, 4);
                break;
            case 'pb':
                size *= Math.pow(1024, 5);
                break;
        }
        return size;
    };

    service.getAppropriateFileSizeFromB = function(bFileSize, precision) {
        var size;
        if (bFileSize / Math.pow(1024, 5) >= 1) { // pb
            return (bFileSize / Math.pow(1024, 5)).toFixed(precision) + " PB";
        } else if (bFileSize / Math.pow(1024, 4) >= 1) { // tb
            return (bFileSize / Math.pow(1024, 4)).toFixed(precision) + " TB";
        } else if (bFileSize / Math.pow(1024, 3) >= 1) { // gb
            return (bFileSize / Math.pow(1024, 3)).toFixed(precision) + " GB";
        } else if (bFileSize / Math.pow(1024, 2) >= 1) { // mb
            return (bFileSize / Math.pow(1024, 2)).toFixed(precision) + " MB";
        } else if (bFileSize / 1024 >= 1) {
            return (bFileSize / 1024).toFixed(precision) + " KB";
        } else {
            if (bFileSize) return bFileSize + "B";
            return '';
        }
    };

    service.removeFolderFromParentByUuid = function(parent, uuid) {
        var child_index;
        for (var i = 0; i < parent.folders.length; i++) {
            if (parent.folders[i].folder_uuid === uuid) {
                child_index = i;
            }
            if (child_index !== undefined) {
                parent.folders.splice(i, 1);
                return true;
            }
        }
        return false;
    };

    service.removeDummyFolderFromParentByUuid = function(parent, uuid) {
        var child_index;
        for (var i = 0; i < parent.folders.length; i++) {
            if (parent.dummyFolders[i].dummyId === uuid) {
                child_index = i;
            }
            if (child_index !== undefined) {
                parent.dummyFolders.splice(i, 1);
                return true;
            }
        }
        return false;
    };

    service.removeFileFromParentByUuid = function(parent, uuid) {
        var child_index;
        for (var i = 0; i < parent.files.length; i++) {
            if (parent.files[i].file_uuid === uuid) {
                child_index = i;
            }
            if (child_index !== undefined) {
                parent.files.splice(i, 1);
                return true;
            }
        }
        return false;
    };

    service.handleSuccessfulUserFileUpload = function(file) {
        var parent = service.getFolderByUuid(service.userRootFolder, file.parent_folder_uuid);
        service.applyFileAttachmentFunctions(file);
        parent.files.push(file);
    };

    service.handleCloudStorageBroadcastEvent = function() {
        service.getUserRootFolder($rootScope.user.id).then(function(data) {
            if (data) {
                service.userRootFolder = data;
            }
        });
    };

    service.fileNameExistsInFolder = function(fileName, folder) {
        var folderFileNames = folder.files.map(function(file) {
            return file.original_filename;
        });
        return folderFileNames.indexOf(fileName) > -1;
    };

    service.incrementFileName = function(fileName) {
        var lastTwoChars = fileName.slice(fileName.length - 2, fileName.length);
        var isIncremented = isIncrementedFileName(fileName);
        if (isIncremented) {
            var newInt = parseInt(lastTwoChars[1]) + 1;
            return fileName.slice(0, fileName.length - 1) + newInt;
        } else {
            return fileName + '-1';
        }
    };

    service.getNumFoldersUpdatingPerms = function() {
        return service.numFoldersUpdatingPerms;
    };

    service.clearInfo = function() {
        service.userRootFolder = null;
    };

    function isNumberChar(char) {
        return char.replace(/[^0-9]/, '').length > 0;
    };

    function isIncrementedFileName(fileName) {
        var char;
        var isIncremented = false;
        var numSeenNumberChars = 0;
        var reversedFileNameChars = fileName.split('').reverse();
        for (var i = 0; i < reversedFileNameChars.length; i++) {
            char = reversedFileNameChars[i];
            if (isNumberChar(char)) {
                numSeenNumberChars += 1;
            } else if (char === '-') {
                if (numSeenNumberChars > 0) {
                    isIncremented = true;
                }
                break;
            } else {
                break;
            }
        }
        return isIncremented;
    };

    var isNumeric = function(str) {
        return /^\d+$/.test(str);
    };

    var getIndexOfFirstNonNumInStr = function(str) {
        for (var i = 0; i < str.length; i++) {
            if (!isNumeric(str[i]) && str[i] !== '.') {
                return i;
            }
        }
        return undefined;
    };

    return service;
});
