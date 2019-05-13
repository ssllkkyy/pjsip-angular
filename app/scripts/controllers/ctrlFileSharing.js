'use strict';

proySymphony.controller('FileSharingCtrl', function($scope, $rootScope, $sce, fileService,
    contactService, $uibModalStack, FileUploader, $filter, dataFactory, $window, __env,
    symphonyConfig, emailService) {


    $scope.fsTableHeight = $window.innerHeight - 300;
    $scope.perPage = 20;
    $scope.maxSize = 50;
    $scope.predicate = 'created_at';
    $scope.reverse = true;
    $scope.currentPage = 1;
    $scope.ppOptions = [10, 20, 50, 100];
    $scope.isDisabled = false;
    $rootScope.contactsSelected = [];

    function validateEmail(email) {
        var re =
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    $scope.isEmailAddress = function(text) {
        return validateEmail(text);
    };

    $scope.useEmailAddress = function(email) {
        var contact = {
            contact_name_full: '',
            contact_email_address: email,
            contact_uuid: null
        }
        $rootScope.contactsSelected.push(contact);
        $scope.selectedItem = null;
    }

    $scope.copyShareToHawksoft = function(share) {

        share["file_size"] = share.file.file_size;
        share.domain_uuid = $rootScope.user.domain_uuid;
        share.user_uuid = $rootScope.user.id;
        console.log(share);
        dataFactory.postHSCopyFileshare(share)
            .then(function(response) {
                $rootScope.showSuccessAlert("File was copied.");
            }, function(error) {
                console.log(error);
            });
    };

    $rootScope.showTable = false;

    var today = new Date();
    $scope.dateFormat = 'yyyy-MM-dd';
    $scope.fromDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 0,
        minDate: new Date(2016, 1, 1),
        maxDate: today
    };
    $scope.toDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 0,
        minDate: $scope.fromDate,
        maxDate: today
    };
    $scope.fromDatePopup = {
        opened: false
    };
    $scope.toDatePopup = {
        opened: false
    };
    $scope.ChangeToMinDate = function(fromDate) {
        if (fromDate != null) {
            if (!$scope.toDate) {
                var ToMinDate = new Date(fromDate);
                $scope.toDateOptions.minDate = ToMinDate;
                $scope.toDate = ToMinDate;
            }
            var user_uuid = ($rootScope.selectEmulateUser && $rootScope.selectEmulateUser !==
                null ? $rootScope.selectEmulateUser : $rootScope.user.id);
            fileService.getShares(user_uuid, $scope.fromDate, $scope.toDate);
        }
    };
    $scope.processToDate = function(toDate) {
        if (toDate != null) {
            if (!$scope.fromDate) $scope.fromDate = new Date(toDate);
            $scope.toDate = new Date(toDate);
        }
        var user_uuid = ($rootScope.selectEmulateUser && $rootScope.selectEmulateUser !==
            null ? $rootScope.selectEmulateUser : $rootScope.user.id);
        fileService.getShares(user_uuid, $scope.fromDate, $scope.toDate);
    };
    $scope.ChangeToMinDate();
    $scope.OpenfromDate = function() {
        //$scope.dateSearched = false;
        $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
    };
    $scope.OpentoDate = function() {
        //$scope.dateSearched = false;
        $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
    };

    fileService.getShares($rootScope.user.id);

    $scope.searchRecipients = function(item) {
        if (!$scope.shareSearch ||
            (item.original_filename.toLowerCase().indexOf($scope.shareSearch.toLowerCase()) !=
                -1) ||
            (item.noncontact && item.noncontact.name && item.noncontact.name.toLowerCase()
                .indexOf($scope.shareSearch.toLowerCase()) != -1) ||
            (item.noncontact && item.noncontact.phone && item.noncontact.phone.toLowerCase()
                .indexOf($scope.shareSearch.toLowerCase()) != -1) ||
            (item.noncontact && item.noncontact.email && item.noncontact.email.toLowerCase()
                .indexOf($scope.shareSearch.toLowerCase()) != -1) ||
            (item.recipient_email.toLowerCase().indexOf($scope.shareSearch.toLowerCase()) !=
                -1) ||
            (item.contact && item.contact.name.toLowerCase().indexOf(
                $scope.shareSearch.toLowerCase()) != -1)) {
            return true;
        }
        if (item.contact && item.contact.nums.length > 0) {
            var found = false;
            angular.forEach(item.contact.nums, function(phone) {
                if (phone.num.indexOf($scope.shareSearch) != -1) {
                    found = true;
                }
            });
            return found;
        }
        return false;
    };

    $scope.showFileShareModal = function() {
        $scope.msgEmailSent = false;
        $rootScope.contactsSelected = [];
        // populateAvailContacts();
        $rootScope.showModalWithData('/modals/filesharingmodal.html', {
            onClose: $scope.closeFileShareModal
        });
    };

    $scope.sortBy = function(predicate) {
        $scope.predicate = predicate;
        $scope.reverse = !$scope.reverse;
    };

    $scope.showFileName = function(fileshare) {
        var display = '';
        var fileName = fileshare.uploadfile.original_filename;
        if (fileshare.uploadfile.original_filename.length > 40) fileName = fileshare.uploadfile
            .original_filename.substring(0, 19) + ' ... ' + fileshare.uploadfile.original_filename
            .substring(fileshare.uploadfile.original_filename.length - 19);
        display = '<a href="' + (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                symphonyConfig.onescreenUrl) + '/media/me-download-file/' + fileshare.download_hash +
            '?token=' + $rootScope.userToken + '" target="_blank" title="' + fileshare.uploadfile
            .original_filename + '" >' + fileName + '</a><br />Size: ' + fileshare.uploadfile
            .file_size;
        return $sce.trustAsHtml(display);
    };

    $scope.filterByMonth = function(item) {
        if ($scope.monthStart !== null && $scope.monthEnd !== null) {
            if (item.created_at < $scope.monthStart || item.created_at > $scope.monthEnd)
                return false;
        }
        return true;
    };
    $scope.monthStart = null;
    $scope.monthEnd = null;
    $scope.limitDisplay = function() {
        $scope.monthStart = moment([0, 0, 1]).month($scope.selectMonth.display).year(
            $scope.selectYear).format("YYYY-MM-DD");
        $scope.monthEnd = moment([0, 0, 31]).month($scope.selectMonth.display).year(
            $scope.selectYear).format("YYYY-MM-DD");
    };

    $scope.clearLimitDisplay = function() {
        $scope.monthStart = null;
        $scope.monthEnd = null;
        $scope.selectMonth = null;
        $scope.selectYear = null;
    };

    $scope.shareExpired = function(share) {
        var a = moment(share.expires_at);
        var b = moment();
        var c = a.diff(b, 'minutes');
        if (c < 0) return true;
        return false;
    };

    $scope.resendFileShareNotice = function(shared_file_uuid, file_uuid) {
        var data = {
            shared_file_uuid: shared_file_uuid,
            file_uuid: file_uuid,
            sender_name: $rootScope.user.contact_name_given + ' ' + $rootScope.user
                .contact_name_family,
            sender_email: $rootScope.user.email_address,
            sender_company: $rootScope.user.contact_organization,
            body: $scope.bodyMail
        };
        dataFactory.postResendFileNotice(data)
            .then(function(response) {
                $rootScope.showalerts(response);
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    }

    /**********  FILE UPLOAD **********/

    $scope.emailUsrs = [];
    $scope.bodyMail = '';
    $scope.mailTo = [];
    $scope.chargerVal = function(usrSel, contEml) {
        if (__env.enableDebug) console.log("INPUT");
        if (__env.enableDebug) console.log(usrSel);
        if (__env.enableDebug) console.log(contEml);
        $scope.emailUsrs = false;
        $scope.emailUsrs = [];
        $scope.usrSel = usrSel;
        $scope.bodyMail = contEml;

        usrSel.forEach(function(entry) {
            if (entry.contact_name_full) {
                $scope.emailUsrs.push({
                    mail: entry
                });
            } else if (entry.emails.email_address) {
                $scope.emailUsrs.push({
                    mail: entry.emails.email_address
                });
            }
        });
        $scope.emailUsrs.forEach(function(entry) {
            if (entry.mail.emails) {
                $scope.mailTo.push(entry.mail.emails[0].email_address);
            } else if (entry.mail.contact_name_full) {
                $scope.mailTo.push(entry.mail.contact_name_full);
            }
        });
    };

    $scope.contactSelectionType = 'file';

    $rootScope.closeFilterAlert = function() {
        $rootScope.alertError = '';
    };

    $scope.sendCloudShareFile = function(file) {
        var data = {
            file_uuid: file.file_uuid,
            upload_type: 'cloud',
            sender_name: $rootScope.user.contact_name_given + ' ' + $rootScope.user
                .contact_name_family,
            sender_email: $rootScope.user.email_address,
            sender_company: $rootScope.user.contact_organization,
            recipients: JSON.stringify($rootScope.contactsSelected),
            body: $scope.contentEmail
        };
        dataFactory.fileUpload(data)
            .then(function(response) {
                if (__env.enableDebug) console.log("RESPONSE FROM SENDING FILE");
                if (__env.enableDebug) console.log(response);
                if (response.data.success) {
                    $rootScope.contactsSelected = [];
                    $scope.msgEmailSent = true;
                } else {
                    $rootScope.alertError = response.error.message;
                }
            });
    };

    $rootScope.focusonme = true;

    $rootScope.sendingFile = false;

    var uploader = $scope.uploader = new FileUploader({
        url: (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl : symphonyConfig.onescreenUrl) +
            '/media/upload',
        queueLimit: 1,
        headers: {
            'Authorization': 'Bearer ' + $rootScope.userToken
        }
    });

    uploader.filters.push({
        'name': 'enforceMaxFileSize',
        'fn': function(item) {
            return item.size <= 262144000; // 250 MiB to bytes
        }
    });
    uploader.filters.push({
        name: 'enforceFileType',
        fn: function(item /*{File|FileLikeObject}*/ , options) {
            var parts = item.name.split('.');
            var ext = parts[parts.length - 1].toLowerCase();
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) +
                '|';
            console.log(type + ' ' + ext);
            if (type === '||' && ext === 'rar') return true;
            if (type === '||') return false;
            return '|exe|javascript|x-msdownload|php|'.indexOf(type) === -1;
        }
    });

    // CALLBACKS
    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
        options) {
        if (__env.enableDebug) console.info('onWhenAddingFileFailed', item, filter,
            options);
        $rootScope.alertError = '';
        if (filter.name === 'enforceMaxFileSize') $rootScope.alertError +=
            'Problem Adding File: Max file size is 250MB.';
        if (filter.name === 'enforceFileType') $rootScope.alertError += ($rootScope.alertError !==
                '' ? ', ' : '') +
            'Problem Adding File: File Type Not allowed. (The following are allowable file types: pdf, odt, doc, docx, ppt, pptx, xls, xlsx, csv, txt, rtf, html, zip, mp3, mpg, jpg, jpeg, png, gif, mp4, pub, m4a, mov, vts, vob, m4v, m2ts, dvr, 264, mp4, flv, bup, mts, psd, png, MOV, mpeg-4, tar.gz, gz, rar, targz, 7z, aak, bd)';
    };
    uploader.onAfterAddingFile = function(fileItem) {
        fileItem.file.name = fileItem.file.name.toLowerCase();
        if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        if (__env.enableDebug) console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function(item) {
        if (__env.enableDebug) console.info('onBeforeUploadItem', item);
        if (__env.enableDebug) console.log($rootScope.contactsSelected);
        var data = {
            sender_name: $rootScope.user.contact_name_given + ' ' + $rootScope.user
                .contact_name_family,
            sender_email: $rootScope.user.email_address,
            sender_company: $rootScope.user.contact_organization,
            recipients: JSON.stringify($rootScope.contactsSelected),
            body: $scope.contentEmail
        };
        if (__env.enableDebug) console.log(data);
        item.formData.push(data);
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
        if (response.success) {
            $rootScope.contactsSelected = [];
            //$rootScope.fileList.push(response.success.file);
            response.success.shares.forEach(function(share) {
                share.created_at = moment.tz(share.created_at,
                    "America/New_York");
                if ($rootScope.user.settings.timezone) share.created_at = share
                    .created_at.clone().tz($rootScope.user.settings.timezone);
                var noncontacts = $rootScope.nonContacts;
                var contact = contactService.getContactByUuid(share.contact_uuid);
                if (contact) {
                    share.contact = contact;
                } else {
                    var info = {
                        email: share.recipient_email,
                        phone: null,
                        name: share.recipient_name,
                        color: randomColor({
                            luminosity: 'light'
                        })
                    }
                    var noncontact = $filter('getNonContact')(noncontacts, info);
                    if (!noncontact) {
                        $rootScope.storeNonContact(info);
                        noncontact = info;
                    }
                    share.noncontact = noncontact;
                }
                share.original_filename = share.uploadfile.original_filename;
                $rootScope.fileSharingList.push(share);
            });
            $scope.msgEmailSent = true;
        } else {
            $rootScope.alertError = response.error.message;
        }

        //$scope.sendEmail();
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onErrorItem', fileItem, response, status,
            headers);
        //alert('Error...'+JSON.stringify(response));
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
        uploader.queue.length = 0;
    };

    $scope.confCallsPartic = [];
    $scope.participant = {};

    $scope.closeFileShareModal = function() {
        $rootScope.contactsSelected = [];
        $rootScope.selectedContacts = {};
        $uibModalStack.dismissAll();
    };

    $scope.startEmailClient = function(address) {
        emailService.startEmailClient(address);
    };


});
