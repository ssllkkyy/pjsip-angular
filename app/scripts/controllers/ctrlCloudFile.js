'use strict';

proySymphony.controller('CloudFileCtrl', function($scope, $rootScope, fileService,
    cloudStorageService, contactService, $filter, __env, symphonyConfig, dataFactory,
    $uibModalStack, FileUploader) {
    angular.element('.main-container').attr('style', 'overflow-y: hidden;');

    $scope.cloud = {
        searchText: null,
        foldersFound: [],
        filesFound: []
    };
    $scope.showSearchBox = false;
    $scope.ulList = [];

    function buildFolderSelect(parent, folder) {

        var parentstring = parent;
        angular.forEach(folder.folders, function(item) {
            $scope.ulList.push({
                string: parentstring + '->' + item.folder_name,
                folder_uuid: item.folder_uuid
            });
            if (item.folders.length > 0) buildFolderSelect(parentstring + '->' +
                item.folder_name, item);
        });
    }

    $scope.userContacts = function() {
        return contactService.getUserContactsOnly();
    };

    //buildFolderSelect('root', cloudStorageService.userRootFolder);

    $scope.doCloudSearch = function(search) {
        $scope.cloud.foldersFound = [];
        $scope.cloud.filesFound = [];

        $scope.showSearchBox = true;
        var root = cloudStorageService.userRootFolder;

        searchFolders(root);
        $rootScope.$broadcast('search.submitted');
    };

    $scope.onClose = function() {
        var top = $uibModalStack.getTop();
        console.log(top);
        if (top) {
            $uibModalStack.dismiss(top.key);
        }
    };

    $scope.clearFilter = function() {
        $scope.search.name = '';
    };

    $scope.closeSearch = function() {
        $scope.showSearchBox = false;
        $scope.cloud.foldersFound = [];
        $scope.cloud.filesFound = [];
        $rootScope.$broadcast('clear.hightlight.file');
    };

    $scope.getFolderType = function(folder) {
        if (folder.shared_folder == 'true' || folder.is_protected == 'true') {
            if (folder.is_protected === 'true' && folder.is_mobile_upload !== 'true')
                return 'protected';
            if (folder.user_uuid === $rootScope.user.id) return 'shared';
            if (folder.user_uuid !== $rootScope.user.id) return 'owned';
        } else {
            return 'folder';
        }
        return null;
    };

    $scope.getFileType = function(file) {
        return fileService.getFileTypeByMimeType(file.file_mime_type);
    };

    $scope.goToFolder = function(folder) {
        console.log(folder);
        $rootScope.$broadcast('open.search.folder', folder);
    };

    $scope.goToFile = function(file) {
        var root = cloudStorageService.userRootFolder;
        var parentfolder = cloudStorageService.getFolderByUuid(root, file.parent_folder_uuid);
        var info = {
            file: file,
            parent: parentfolder
        };
        $rootScope.$broadcast('show.search.file', info);
    };

    function searchFolders(folder) {
        if (folder.folder_name.toLowerCase().indexOf($scope.cloud.searchText.toLowerCase()) !==
            -1) $scope.cloud.foldersFound.push(folder);
        if (folder.files.length > 0) searchfiles(folder.files);
        for (var i = 0; i < folder.folders.length; i++) {
            searchFolders(folder.folders[i]);
        };
    }

    function searchfiles(files) {
        var search = $scope.cloud.searchText;
        angular.forEach(files, function(file) {
            //console.log(file.original_filename);
            var match = false;
            if (file.original_filename.toLowerCase().indexOf(search.toLowerCase()) !==
                -1) match = true;
            if (file.file_description && file.file_description.toLowerCase().indexOf(
                    search.toLowerCase()) !== -1) match = true;
            if (file.file_caption && file.file_caption.toLowerCase().indexOf(search
                    .toLowerCase()) !== -1) match = true;
            if (match) $scope.cloud.filesFound.push(file);
        });
    }

    cloudStorageService.getUserRootFolder($rootScope.user.id).then(function(data) {
        if (data) {
            $scope.userRootFolder = data;
        }
    });

    var uploader = new FileUploader({
        url: $rootScope.onescreenBaseUrl + '/cloud/upload',
        headers: {
            'Authorization': 'Bearer ' + $rootScope.userToken
        }
    });
    $scope.uploader = uploader;

    $scope.getTotalSpaceUsed = function() {
        var spaceUsed = cloudStorageService.getTotalSpaceUsed();
        return cloudStorageService.getAppropriateFileSizeFromB(spaceUsed, 1);
    };
    $scope.userLimit = function() {
        var limit = parseFloat($rootScope.user.symphony_domain_settings.limit_storage_user) *
            1E6;
        return cloudStorageService.getAppropriateFileSizeFromB(limit, 0);
    };
    $scope.domainUsage = function() {
        return cloudStorageService.getAppropriateFileSizeFromB(parseFloat($rootScope.user
            .domainCloudStorageUsage), 1);
    };
    $scope.domainLimit = function() {
        var limit = parseFloat($rootScope.user.symphony_domain_settings.limit_storage_user) *
            1E6 * contactService.countUsers();
        return cloudStorageService.getAppropriateFileSizeFromB(limit, 0);
    };

    $scope.contactSelectionType = 'cloudlink';
    $scope.doSendLink = function(info) {
        var data = {
            link: info.link,
            contacts: $rootScope.contactsSelected,
            message: $scope.contentEmail,
            bridgeUrl: (__env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl :
                symphonyConfig.symphonyUrl)
        };
        console.log(data);
        dataFactory.postSendCloudShareLink(data)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.showSuccessAlert(response.data.success.message);
                    $rootScope.closeThisModal();
                } else {
                    console.log(response.data.error.message);
                    $scope.alertError = response.data.error.message;
                }
            });
        console.log(data);
    };

    $scope.storeFolderPermissions = function(permissions, folder) {
        if (__env.enableDebug) console.log(folder);
        var data = {
            folder_uuid: folder.folder_uuid,
            permissions: permissions
        };
        if (__env.enableDebug) console.log(data);
        $uibModalStack.dismissAll();
        cloudStorageService.numFoldersUpdatingPerms += 1;
        dataFactory.postUpdateFolderPermissions(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                cloudStorageService.numFoldersUpdatingPerms -= 1;
                if (response.data.success) {
                    $scope.root = folder.parent;
                    var index = $filter('getByUUID')($scope.root.folders, folder.folder_uuid,
                        'folder');
                    if (index != null) {
                        $scope.root.folders[index].permissions = response.data.success
                            .permissions;
                        $scope.root.folders[index].shared_folder = response.data.success
                            .shared_folder;
                    }
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };

    $scope.hasPermission = function(permissions, user_uuid) {
        var value = 'none';
        angular.forEach(permissions, function(permission) {
            if (permission.user_uuid == user_uuid) value = permission.permission;
        });
        return value;
    };

    $scope.folderPerms = [];
    $scope.isPermGroupMember = function(index, uuid, type) {
        if (index !== null) {
            var members = $rootScope.permissionsGroups[index][type + 's'];
            var result = false;
            angular.forEach(members, function(member) {
                if (member.user_uuid === uuid) result = true;
            });
            return result;
        }
        return false;
    };

});
