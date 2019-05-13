'use strict';

proySymphony.controller('FaxCtrl', function($scope, $filter, $cookies, fileService, $mdDialog,
    userService, notificationService, domainService, usefulTools, $location, $rootScope,
    FileUploader, dataFactory, $uibModal, $window, $timeout, metaService, contactService,
    locationService, symphonyConfig) {

    $scope.useCoverPage = false;
    $scope.faxSubject = '';
    $scope.faxMessage = '';
    $scope.destinationNumber = null;
    $scope.myGroups = {};
    $scope.fax = {};
    $scope.faxTab = {};
    $scope.activeUserFax = null;
    $scope.uFax = {};
    $scope.resending = null;
    $scope.message = {};
    $scope.selected = {};
    $scope.userTab = false;

    $scope.$watch('faxTab.activeTab', function(newVal, oldVal) {
        if (newVal === 1) {
            $scope.userTab = true;
        } else if (newVal === 0) {
            $scope.userTab = false;
        }
    });

    /************************************************ */
    // Helper Methods
    /************************************************ */


    $scope.isDemoAgency = function() {
        return userService.isDemoAgency();
    };

    $scope.currentLocation = function() {
        return ($scope.showMyGroups() && $scope.showMyGroups().length > 0 && $scope.selected
            .location) ? $scope.myGroups[$scope.selected.location] : null;
    };

    $scope.isManagerOrUser = function() {
        // return false;
        return ($scope.currentLocation() && ($scope.currentLocation().ismanager(
            'faxing') || $scope.currentLocation().isuser('faxing'))) || $rootScope.isAdminGroupOrGreater();

    };

    $scope.validDestinationNumber = function() {
        if ($scope.destinationNumber) {
            return $scope.destinationNumber.replace(/[^0-9]/g, '').length == 10;
        } else {
            return false;
        }
    };

    $scope.closeSuccess = function() {
        $scope.showSuccessMsg = false;
    };

    $scope.fileInQueue = function() {
        if (uploader) {
            return uploader.queue.length > 0;
        } else {
            return false;
        }
    };

    $scope.queueFileName = function() {
        return uploader.queue.first.filename;
    };

    $scope.handleFileUploaderButton = function() {
        if (uploader && uploader.queue.length > 1) {} else {
            $scope.triggerUpload();
        }
    };

    $scope.loseFocusIfEnter = function(event) {
        if (event.key === 'Enter') {
            event.target.blur();
        }
    };

    $scope.toggleEditingAuthorizedEmail = function(event) {
        $scope.editingAuthorizedEmail = !$scope.editingAuthorizedEmail;
        if ($scope.editingAuthorizedEmail) {
            $rootScope.$broadcast('editing.authorized');
        }
    };

    $scope.toggleEditingCallerIdName = function(event) {
        $scope.editingCallerIdName = !$scope.editingCallerIdName;
        if ($scope.editingCallerIdName) {
            $rootScope.$broadcast('editing.authorized');
        }
    };

    $scope.toggleEditingForwardEmail = function() {
        $scope.editingForwardEmail = !$scope.editingForwardEmail;
        if ($scope.editingForwardEmail) {
            $rootScope.$broadcast('editing.forward');
        }
    };

    $scope.openMail = function(fax) {
        var myWindow = window.open('mailto:'+fax.fax_number+'@agencyfax.com?subject=[Fax]');
        myWindow.close();
    }
    $scope.updateFax = function(entity, value, ufax) {
        if (!ufax) ufax = false;
        if (ufax == true) {
            $scope.fax = $scope.ufax
        };
        if (entity === 'forward_email' || entity === 'auth_email') {
            value = value.split(' ').join('');
            var parts = value.split(',');
            var invalid = false;
            angular.forEach(parts, function(email) {
                if (!usefulTools.isValidEmail(email)) invalid = true;
            });
            if (invalid) {
                $rootScope.showErrorAlert('You must submit a valid email address');
                return;
            }
        }
        // if (entity === 'auth_email' && !usefulTools.isValidEmail(value)) {
        //     $rootScope.showErrorAlert('You must submit a valid email address');
        //     return;
        // }
        var data = {
            fax_number: $scope.fax.fax_number,
            entity: entity,
            value: value
        };
        dataFactory.postUpdateVfax(data).then(function(response) {
            $rootScope.showalerts(response);
            if (response.data.success) {
                angular.forEach($rootScope.user.vfax, function(vfax) {
                    if ($scope.fax.vfax_uuid == vfax.vfax_uuid) {
                        if (entity === 'caller_id_name') {
                            vfax.caller_id_name = value;
                            $scope.toggleEditingCallerIdName();
                        }
                        if (entity === 'auth_email') {
                            vfax.authorized_email = value;
                            $scope.toggleEditingAuthorizedEmail();
                        }
                        if (entity === 'forward_email') {
                            vfax.email_forward_to = value;
                            $scope.toggleEditingForwardEmail();
                        }
                        $window.localStorage.setItem("currentUser",
                            JSON.stringify($rootScope.user));
                    }
                });
            }
        });
        $scope.updatePage();
    };



    $scope.onLocChange = function() {
        $cookies.put('faxLocation', $scope.selected.location);
        // console.log($scope.selected.location);
        // $scope.selected.location = locationUuid;
        // $scope.selected.location = locationService.locationGroups[locationUuid];
        $scope.updatePage();
    };

    $scope.updatePage = function() {
        initializeVfaxProps();

    };

    metaService.rootScopeOn($scope, 'update.fax.messages', function(event, data) {
        var vfax_uuid = data.vfax_uuid;
        var isnew = data.new;
        if (vfax_uuid && $scope.fax && $scope.fax.vfax_uuid === vfax_uuid) {

        }
        var symphonyUrl = __env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl :
            symphonyConfig.symphonyUrl;
        var index = $filter('getByUUID')($rootScope.user.vfax, vfax_uuid, 'vfax');
        if (index !== null && isnew === 'true') {
            var volume;
            if ($rootScope.user.textRingtoneVolume) {
                volume = $rootScope.user.textRingtoneVolume / 10;
            } else if ($rootScope.user.domain.textRingtoneVolume) {
                volume = $rootScope.user.domain.textRingtoneVolume / 10;
            }
            var notice = {
                message: 'You have new fax(es) on ' + $rootScope.user.vfax[
                    index].fax_number,
                title: 'New Fax',
                url: symphonyUrl + '/fax',
                showOnPageHidden: false,
                icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/s--v4wSgoAl--/v1513359470/fax_adjdek.png',
                audioVolume: volume,
                duration: 5
            };
            notificationService.fullNotification(notice);
        }

    });

    $scope.activeFax = function() {

        return $scope.fax && $scope.fax.vfax_uuid;

    };


    $scope.checkUserFax = function() {
        return dataFactory.getCheckUserFax($rootScope.user.user_uuid)
            .then(function(response) {
                console.log("Fax Status", response.data.success);
                if (response.data.success) {
                    if (response.data.success.data == true) {
                        $scope.activeUserFax = response.data.success.data;

                        return true;
                    } else if (response.data.success.data == false) {
                        $scope.activeUserFax = false;
                        return false;
                    } else {
                        return $rootScope.showalerts(response);
                    }
                } else {
                    console.log("check user fax failed", response.data);
                }
            })
            .catch(function(err) {
                console.log("Error retrieving User Fax Status", err);
                $rootScope.showErrorAlert(err);
            });
    };

    $scope.getUserFaxData = function() {
        if ($scope.checkUserFax()) {

            dataFactory.getUserFaxData($rootScope.user.domain_uuid, $rootScope.user.did)
                .then(function(response) {
                    if (!response.data.success.data) {
                        console.log("User Fax not setup / found.");
                        //$rootScope.showErrorAlert("User Fax Data was not properly retrieved.");
                    } else {
                        $scope.ufax = response.data.success.data;
                    }

                })
                .catch(function(err) {
                    $rootScope.showErrorAlert(err.data.statusText);
                });

        }
    };

    $scope.getUserFaxData();

    $scope.setUserFax = function() {
        dataFactory.getToggleUserFax($rootScope.user.user_uuid, $rootScope.user.did)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $scope.activeUserFax = response.data.success.data;
                    if ($scope.activeUserFax) {
                        $scope.getUserFaxData();
                        $scope.updatePage();
                    }
                    console.log(response.data.success.data);
                };
            })
            .catch(function(err) {
                console.log("Error toggling User Fax", err);
                $rootScope.showErrorAlert(err.data.statusText);
            });
    };




    $scope.showOrderFaxNumber = function() {
        // dataFactory.getDaysRemain($rootScope.user.domain_uuid)
        // .then(function(response){
        //     var info = response.data.success.data;
        //     var per_line = parseFloat($rootScope.user.package.per_fax_line).toFixed(2);
        //     var charge = (per_line * parseFloat(info.remain)/parseFloat(info.days)).toFixed(2);
        var data = {
            location_group_uuid: ($scope.showMyGroups().length > 0 ? $scope.selected
                .location : null)
        };
        // var createConfirm = $mdDialog.confirm()
        //     .title('Please Confirm')
        //     .htmlContent('A pro-rated charge of $' + charge + '* will be added to your next monthly bill. You will be charged $'+per_line+'/month plus taxes/fees for this fax line moving forward. <br><span style="font-size: 12px;">* $'+per_line+'/line x ' + info.remain + ' days remaining in this month / ' + info.days + ' days this month</span>')
        //     .ariaLabel('Confirm')
        //     .ok('I Agree')
        //     .cancel('Cancel');
        // $mdDialog.show(createConfirm).then(function() {
        // console.log("TRIGGERED", data);
        $rootScope.showModalWithData('/fax/faxordermodal.html', data);
        // });
        // });
    };

    var getMimetypeByFiletype = function(filetype) {
        return {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'pdf': 'application/pdf'
        } [filetype];
    };

    // $scope.viewMessageImage = function(message_uuid) {
    //     dataFactory.getFaxImage(message_uuid).then(function(response) {
    //         if(__env.enableDebug) console.log('FAX IMAGE');
    //         if(__env.enableDebug) console.log(response.data.success.data.original_filename);
    //         var splits = response.data.success.data.original_filename.split('.');
    //         var filetype = splits[splits.length - 1];
    //         var src = 'data:' + getMimetypeByFiletype(filetype)  + ';base64, ' + response.data.success.data.file;
    //         if (filetype === 'jpg') {
    //             $rootScope.showModalWithData('/fax/viewfaximage.html', {obj: src});
    //         } else if (filetype === 'pdf') {
    //             $window.open(src);
    //         } else {
    //             angular.element('#download_link').attr('href', src);
    //             angular.element('#download_link').attr('download', response.data.success.data.original_filename);
    //             angular.element('#download_link')[0].click();
    //         }
    //     });
    // };

    $rootScope.$on('did.ordered', function(event, vfax) {
        console.log(vfax);
        if (vfax.location) {
            $scope.myGroups[vfax.location_group_uuid] = vfax.location;
            $scope.selected.location = vfax.location_group_uuid;
        }
        initializeVfaxProps();

        $window.localStorage.setItem("currentUser", JSON.stringify($rootScope.user));
    });



    $scope.getCoverPreviewUrl = function(fax_number) {
        var url = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl : symphonyConfig.onescreenUrl) +
            '/vfax/getcoverpreview/' + fax_number + '?token=' + $rootScope.userToken;
        return url;
    };



    /************************************************ */
    // API Methods
    /************************************************ */

    $scope.showMyGroups = function() {
        return $scope.myGroups ? usefulTools.convertObjectToArray($scope.myGroups) : [];
    };

    function getFirstActiveFaxGroup(groups) {
        var i, len = groups.length;
        console.log(groups);
        console.log($rootScope.user.vfax);
        if ($rootScope.user.vfax) {
            for (i = 0; i < len; i++) {
                console.log(groups[i].locations_group_uuid);
                var index = $filter('getByUUID')($rootScope.user.vfax, groups[i].locations_group_uuid,
                    'location_group');
                if (index !== null) return groups[i].locations_group_uuid;
            }
        }
        return groups[0].locations_group_uuid;
    }

    $scope.loadLocations = function() {
        var domainUuid = $rootScope.user.domain_uuid;
        locationService.getLocationGroups('faxing', domainUuid)
            .then(function(response) {
                console.log(response);
                $scope.myGroups = locationService.filterGroupsByType(response,
                    'faxing');
                if (__env.enableDebug) console.log("DID Location GROUPS");
                if (__env.enableDebug) console.log($scope.myGroups);
                var groups = $scope.showMyGroups();
                console.log(groups);
                if (groups.length > 0) {
                    dataFactory.getVfaxProfiles($rootScope.user.id)
                        .then(function(response) {
                            // debugger;
                            if (response.data.success) {
                                $rootScope.user.vfax = response.data.success.data;
                                $scope.selected.location = ($cookies.get(
                                        'faxLocation') && $scope.myGroups[
                                        $cookies.get('faxLocation')]) ?
                                    $cookies.get('faxLocation') :
                                    getFirstActiveFaxGroup(groups);
                                $cookies.put('faxLocation', $scope.selected.location);
                                console.log($scope.selected.location);
                                if ($scope.selected.location)
                                    initializeVfaxProps();

                            }
                        });
                }
            });
    }();

    function initializeVfaxProps() {
        $scope.fax = {};
        // console.log($rootScope.user.vfax);
        // console.log($scope.selected.location);
        var index = $filter('getByUUID')($rootScope.user.vfax, $scope.selected.location,
            'location_group');
        // console.log(index);
        if (index !== null) {
            $scope.fax = $rootScope.user.vfax[index];
            $scope.fax.color = randomColor({
                luminosity: 'dark'
            });
        }
    }

    /************************************************ */
    // Uploader Configuration
    /************************************************ */
    FileUploader.FileSelect.prototype.isEmptyAfterSelection = function() {
        return Boolean; // true|false
    };
    $scope.uploadedItems = [];
    var uploader = $scope.uploader = new FileUploader({
        url: $rootScope.onescreenBaseUrl + '/vfax/senditem',
        queueLimit: 10,
        headers: {
            'Authorization': 'Bearer ' + $rootScope.userToken
        }
    });
    uploader.filters.push({
        name: 'faxFilter',
        fn: function(item /*{File|FileLikeObject}*/ , options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) +
                '|';
            var result =
                '|jpg|jpeg|png|pdf|doc|docx|xls|csv|htm|html|txt|tif|tiff|vnd.openxmlformats-officedocument.wordprocessingml.document|msword|vnd.ms-excel|vnd.openxmlformats-officedocument.spreadsheetml.sheet|plain|'
                .indexOf(type) !== -1;
            return result;
        }
    });

    $scope.sendFax = function() {
        if (userService.limitReached('fax')) {
            $rootScope.showErrorAlert('You have reached the limit of ' + $rootScope.user
                .usageLimits.fax +
                ' fax messages allowed while using a Bridge Demo account.');
            return;
        }

        domainService.loadDomainDids($rootScope.user.domain_uuid)
            .then(function(response) {
                if (!response) {
                    $rootScope.showAlert(
                        "There was a problem retrieving domain dids.");
                    return false;
                }
                console.log("RESPONSE", response);
                for (var each in response.dids) {
                    if (response.dids[each].number == $scope.destinationNumber) {
                        $rootScope.showAlert(
                            "If you would like to send a file to another user, try 'Store & Share' or sending it as an attachment in 'Chat Plus'!"
                        );
                        $scope.destinationNumber = null;
                        return;
                    }
                }

                if ($scope.useCoverPage && (!$scope.faxRecipient || !$scope.faxSubject)) {
                    $rootScope.showErrorAlert(
                        'Please populate the Recipient and Subject fields if using a Cover Page.'
                    );
                    return;
                }
                if (uploader.queue.length === 0) {
                    completeFaxSending();
                } else {
                    $scope.uploading = true;
                    uploader.uploadAll();
                }
            });
    };

    $scope.triggerUpload = function() {
        uploader.clearQueue();
        angular.element('#fax-upload').trigger('click');
    };

    // CALLBACKS
    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
        options) {
        if (__env.enableDebug) console.info('onWhenAddingFileFailed', item, filter,
            options);
        $rootScope.showErrorAlert('We were unable to add ' + item.name +
            '. The following file types are supported: jpg, jpeg, pdf, doc, docx, xls, csv, txt, tif, tiff.'
        );
    };
    uploader.onAfterAddingFile = function(fileItem) {
        if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
        $scope.queueFileName = fileItem['_file'].name;
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        if (__env.enableDebug) console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function(item) {

        // console.log(data);
        // item.formData.push(data);
    };
    uploader.onProgressItem = function(fileItem, progress) {
        if (__env.enableDebug) console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function(progress) {
        if (__env.enableDebug) console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onSuccessItem', fileItem, response, status,
            headers);
        if (__env.enableDebug) console.log("RESPONSE FROM SENDING FILE");
        if (__env.enableDebug) console.log(response);
        $scope.uploadedItems.push(response.success.data);
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onErrorItem', fileItem, response, status,
            headers);
        $scope.sending = false;
        $rootScope.showErrorAlert("We could not upload " + fileItem['_file'].name +
            " at this time. Please contact customer support to report this error.");
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onCancelItem', fileItem, response, status,
            headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onCompleteItem', fileItem, response,
            status, headers);
    };
    uploader.onCompleteAll = function() {
        if (__env.enableDebug) console.info('onCompleteAll');

        completeFaxSending();
    };

    function completeFaxSending() {
        $scope.uploading = false;
        $scope.sending = true;
        if ($scope.faxTab.activeTab === 1) {
            var vfax = $scope.ufax.vfax_uuid;

        } else if ($scope.faxTab.activeTab === 0) {
            var vfax = $scope.fax.vfax_uuid;
        }
        var data = {
            vfax_uuid: vfax,
            destination_number: $scope.destinationNumber,
            useCoverPage: $scope.useCoverPage ? 'true' : 'false',
            faxSubject: $scope.faxSubject ? $scope.faxSubject : null,
            faxMessage: $scope.faxMessage ? $scope.faxMessage : null,
            faxRecipient: $scope.faxRecipient ? $scope.faxRecipient : null,
            fileinfo: $scope.uploadedItems
        };
        $scope.destinationNumber = null;
        dataFactory.postSendMultipleFiles(data)
            .then(function(response) {
                if (response.data.success) {
                    $scope.useCoverPage = false;
                    $scope.showSuccessMsg = true;
                    $scope.uploadedItems = [];
                    uploader.clearQueue();
                    $scope.message = response.data.success.data;
                    if (userService.isDemoAgency()) userService.updateDemoUsage();
                    // $rootScope.alerts.push({success: true, message: response.success.message});
                } else {
                    if (response.failed) {
                        $rootScope.showErrorAlert(
                            "We are unable to send the fax at this time. Please verify the number you are sending to: " +
                            response.failed.data.destination_number);
                    } else {
                        $rootScope.showErrorAlert(
                            "Unable to send the file. Please contact customer support to report this error."
                        );
                    }
                };
                $scope.sending = false;
            });
    }



    $scope.showEmailToFaxHelp = function() {
        console.log($scope.currentLocation());
        var data = {
            sendTo: ($scope.fax && $scope.fax.fax_number) ? $scope.fax.fax_number +
                '@agencyfax.com' : 'your_10_digits_fax_number@agencyfax.com',
            sendFrom: ($scope.currentLocation() && $scope.currentLocation().isuser(
                'faxing')) ? $rootScope.user.email_address : 'authorized@email_address.com'
        };
        $rootScope.showModalWithData('/fax/faxhowtomodal.html', data);
    };

});
