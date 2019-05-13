'use strict';

proySymphony.controller('PublicCloudCtrl', function($scope, $http, fileService, $cookies,
    $routeParams, $location, FileUploader, $interval, $auth, __env, dataFactory,
    usefulTools, symphonyConfig, $window, $rootScope) {

    if (__env.enableDebug) console.log("ROUTEPARAMS");
    if (__env.enableDebug) console.log($routeParams);

    if ($routeParams.linkhash) {
        $scope.showNoHash = false;
        $scope.messages = [];
        $scope.contactInfo = {
            firstName: null,
            lastName: null,
            emailAddress: null,
            company: null,
            rememberMe: false
        };

        usefulTools.getIpInfo()
            .then(function(ipInfo) {
                $scope.ipInfo = ipInfo;
            });

        dataFactory.getPublicLinkDetails($routeParams.linkhash)
            .then(function(response) {
                if (__env.enableDebug) console.log(response.data);
                if (response.data.success) {
                    $scope.linkInfo = response.data.success.data;
                    if ($scope.linkInfo.requireName === 'true') {
                        $scope.showContactInfo = true;
                        $scope.showDropZone = false;
                        if ($cookies.get('publicCloudFirstName')) {
                            if (__env.enableDebug) console.log('USING COOKIE');
                            $scope.contactInfo.firstName = $cookies.get(
                                'publicCloudFirstName');
                            $scope.contactInfo.lastName = $cookies.get(
                                'publicCloudLasstName');
                            $scope.contactInfo.emailAddress = $cookies.get(
                                'publicCloudEmailAddress');
                            $scope.contactInfo.company = $cookies.get(
                                'publicCloudCompany');
                            $scope.contactInfo.rememberMe = $cookies.get(
                                'publicCloudRememberMe');
                            $scope.showContactInfo = false;
                            $scope.showDropZone = true;
                        }
                    } else {
                        $scope.showContactInfo = false;
                        $scope.showDropZone = true;
                    }
                } else {
                    $scope.showNotice = response.data.error.message;
                }
            });

        $scope.editContactInfo = function() {
            $scope.showContactInfo = true;
            $scope.showDropZone = false;
        };

        $scope.showDropZoneArea = function(info) {
            if (info.rememberMe) {
                if (__env.enableDebug) console.log('SETTING COOKIE');
                $cookies.put('publicCloudFirstName', info.firstName);
                $cookies.put('publicCloudLasstName', info.lastName);
                $cookies.put('publicCloudEmailAddress', info.emailAddress);
                $cookies.put('publicCloudCompany', info.company);
                $cookies.put('publicCloudRememberMe', info.rememberMe);
            }
            if (__env.enableDebug) console.log($scope.contactInfo);
            $scope.showContactInfo = false;
            $scope.showDropZone = true;
        };

        $scope.showIcon = function(filename) {
            var parts = filename.split('.');
            var ext = parts[parts.length - 1].toLowerCase();
            return fileService.getFileTypeByMimeType(file.file_mime_type);
        }

        $scope.getFileType = function(file) {
            return fileService.getFileTypeByMimeType(file.type);
        };



        var uploader = $scope.uploader = new FileUploader({
            url: $rootScope.onescreenBaseUrl + '/cloud/public/upload',
            alias: 'file'
        });

        $scope.handlePaste = function(e) {
            doHandlePaste(e, uploader);
        };

        $scope.uploadedFiles = [];

        $scope.$watch('uploader.queue.length', function(newValue, oldValue) {
            if (newValue > 0) $scope.showUploadingFiles = true;
            if (newValue === 0) $scope.showUploadingFiles = false;
        });

        // CALLBACKS
        uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
            options) {
            if (__env.enableDebug) console.info('onWhenAddingFileFailed', item, filter,
                options);
        };
        uploader.onAfterAddingFile = function(fileItem) {
            if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
        };
        uploader.onAfterAddingAll = function(addedFileItems) {
            if (__env.enableDebug) console.info('onAfterAddingAll', addedFileItems);
        };
        uploader.onBeforeUploadItem = function(item) {
            var data = {
                linkhash: $routeParams.linkhash,
                public_cloud_link_uuid: $scope.linkInfo.public_cloud_link_uuid,
                ipInfo: JSON.stringify($scope.ipInfo),
                contactInfo: $scope.linkInfo.requireName === 'true' ? JSON.stringify(
                    $scope.contactInfo) : null
            };
            item.formData.push(data);
            if (__env.enableDebug) console.info('onBeforeUploadItem', item);
        };
        uploader.onProgressItem = function(fileItem, progress) {
            if (__env.enableDebug) console.info('onProgressItem', fileItem, progress);
        };
        uploader.onProgressAll = function(progress) {
            if (__env.enableDebug) console.info('onProgressAll', progress);
        };
        uploader.onErrorItem = function(fileItem, response, status, headers) {
            if (__env.enableDebug)
                if (__env.enableDebug) console.log(
                    "ERROR RESPONSE FROM UPLOADING AVATAR");
            if (__env.enableDebug)
                if (__env.enableDebug) console.log(response);
            if (__env.enableDebug) console.info('onErrorItem', fileItem, response,
                status, headers);
        };
        uploader.onCancelItem = function(fileItem, response, status, headers) {
            if (__env.enableDebug) console.info('onCancelItem', fileItem, response,
                status, headers);
            uploader.clearQueue();
        };
        uploader.onCompleteItem = function(fileItem, response, status, headers) {
            if (__env.enableDebug) console.info('onCompleteItem', fileItem, response,
                status, headers);
            if (__env.enableDebug) console.log(response);

        };
        uploader.onSuccessItem = function(fileItem, response, status, headers) {
            if (__env.enableDebug)
                if (__env.enableDebug) console.log("RESPONSE FROM UPLOADING FILES");
            if (__env.enableDebug)
                if (__env.enableDebug) console.log(response);
            if (response.error) {
                $rootScope.alerts.push({
                    error: true,
                    message: response.error.message
                });
            } else {
                // $rootScope.alerts.push({success: true, message: response.success.message});
                $scope.uploadedFiles.push(response.success.data);
            }
            if (__env.enableDebug) console.info('onSuccessItem', fileItem, response,
                status, headers);
        };
        uploader.onCompleteAll = function() {
            if (__env.enableDebug) console.info('onCompleteAll');
            //$scope.sendMessageReady();
            uploader.clearQueue();
            if (__env.enableDebug) console.log($scope.uploadedFiles);
            $scope.messages.push({
                class: 'info',
                message: $scope.uploadedFiles.length + ' file' + ($scope.uploadedFiles
                    .length > 1 ? 's were' : ' was') + ' uploaded'
            });
            if ($scope.linkInfo.sendEmail === 'true') sendNotification();
            $scope.uploadedFiles = [];
        };

        function sendNotification() {
            var data = {
                linkhash: $routeParams.linkhash,
                thefiles: JSON.stringify($scope.uploadedFiles)
            };
            dataFactory.postSendPublicUploadNotification(data)
                .then(function(response) {
                    if (__env.enableDebug) console.log(response.data);
                });
        }

        function doHandlePaste(e, uploader) {
            var item;
            var blob;
            var date;
            var ext;
            var file;
            if (e.clipboardData && e.clipboardData.items) {
                for (var i = 0; i < e.clipboardData.items.length; i++) {
                    item = e.clipboardData.items[i];
                    if (item.getAsFile()) {
                        blob = item.getAsFile();
                        date = moment().format('YYYY-M-D H-m');
                        ext = fileService.getFileTypeByMimeType(blob.type);
                        file = new File([blob], "Image Pasted at " + date + "." + ext, {
                            type: blob.type
                        });
                        uploader.addToQueue(file);
                    }
                }
            }
        }
    } else {
        $scope.showNoHash = true;
    }
});
