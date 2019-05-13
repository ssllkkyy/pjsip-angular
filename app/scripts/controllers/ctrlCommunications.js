'use strict';

proySymphony.controller('CommunicationsCtrl', function($scope, $filter, $sce, smsApi, $rootScope,
    $routeParams, smsService, fileService, contactService, callHistoryService,
    symphonyConfig, ngAudio, $location, $window, dataFactory) {

    $scope.copyingToHs = {};
    $scope.perPage = 20;
    $scope.maxSize = 50;
    $scope.currentPage = 1;
    $scope.ppOptions = [10, 20, 50, 100];

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
    $scope.userContacts = function() {
        return usefulTools.convertObjectToArray(contactService.domainContacts);
    };
    $scope.changeToMinDate = function(fromDate) {
        if (fromDate != null) {
            if (!$scope.toDate || $scope.toDate < fromDate) {
                var ToMinDate = new Date(fromDate);
                $scope.toDateOptions.minDate = ToMinDate;
                $scope.toDate = ToMinDate;
            }
            $scope.doSearch();
        }
    };
    $scope.processToDate = function(toDate) {
        if (toDate != null) {
            if (!$scope.fromDate || $scope.fromDate > toDate) $scope.fromDate = new Date(
                toDate);
            $scope.toDate = new Date(toDate);
        }
        $scope.doSearch();
    };
    $scope.fromDate = new Date(moment().subtract(30, 'days'));
    $scope.toDate = new Date();

    $scope.OpenfromDate = function() {
        //$scope.dateSearched = false;
        $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
    };
    $scope.OpentoDate = function() {
        //$scope.dateSearched = false;
        $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
    };

    if (!$scope.search) {
        $scope.search = {};
        if (!$scope.search.channel) {
            $scope.search.channel = {};
            $scope.search.channel.texts = true;
            $scope.search.channel.calls = true;
        }
        if ($rootScope.contactCommSearch) $scope.search.contact_uuid = $rootScope.contactCommSearch
            .contact_uuid;
        console.log($scope.search);
        console.log($rootScope.contactCommSearch);
    }

    $rootScope.callHistory = {
        user_uuid: $rootScope.user.id,
        fromDate: '',
        toDate: ''
    };
    $scope.display = {
        calls: false,
        texts: false,
        chats: false,
        fileshares: false,
        videos: false,
        faxes: false
    };
    $scope.showList = false;
    $scope.predicate = {
        all: 'date',
        fax: 'sent_at',
        sms: 'sent_at',
        call: 'start_stamp',
        fileshare: 'created_at'
    };
    $scope.reverse = {
        all: true,
        fax: true,
        sms: true,
        call: true,
        fileshare: true
    };
    $scope.sortAllBy = function(predicate) {
        $scope.predicate.all = predicate;
        $scope.reverse.all = !$scope.reverse.all;
    };
    $scope.sortSmsBy = function(predicate) {
        $scope.predicate.sms = predicate;
        $scope.reverse.sms = !$scope.reverse.sms;
    };
    $scope.sortCallBy = function(predicate) {
        $scope.predicate.call = predicate;
        $scope.reverse.call = !$scope.reverse.call;
    };
    $scope.sortFileBy = function(predicate) {
        $scope.predicate.fileshare = predicate;
        $scope.reverse.fileshare = !$scope.reverse.fileshare;
    };
    $scope.sortFaxBy = function(predicate) {
        $scope.predicate.fax = predicate;
        $scope.reverse.fax = !$scope.reverse.fax;
    };

    $scope.doSearch = function() {
        $scope.display = {
            calls: false,
            texts: false,
            chats: false,
            fileshares: false,
            videos: false,
            faxes: false
        };
        var user_uuid = $rootScope.user.id;
        $scope.showList = false;
        $scope.searching = true;
        $scope.showTextTable = false;
        $scope.showFileTable = false;
        $scope.showCallTable = false;
        $scope.showChatTable = false;
        $scope.showFaxTable = false;
        var contact = contactService.getContactByUuid($scope.search.contact_uuid);
        var communications = [];
        if ($scope.search.channel.texts) {
            var smsdata = {
                user_uuid: user_uuid,
                contact_uuid: ($scope.search.contact_uuid ? $scope.search.contact_uuid :
                    null),
                searchtest: $scope.search.filterText,
                from_date: $scope.fromDate,
                to_date: $scope.toDate
            };
            console.log(smsdata);
            smsApi.postSearchMasterSmsMessages(smsdata)
                .then(function(response) {
                    console.log(response.data);
                    if (response.data.success) {
                        angular.forEach(response.data.success.data, function(
                            message) {
                            if (message.to_contact_uuid) {
                                contact = contactService.getContactByUuid(
                                    message.to_contact_uuid);
                            }
                            if (message.from_contact_uuid) {
                                contact = contactService.getContactByUuid(
                                    message.from_contact_uuid);
                            }
                            communications.push({
                                date: message.created_at,
                                type: 'sms',
                                data: message
                            });
                        });
                        $scope.masterDisplayMessages = response.data.success.data;

                    } else {
                        console.log(response.data.error.message);
                        $scope.masterDisplayMessages = [];
                    }

                    $scope.showTextTable = true;
                    $scope.showSms = true;
                    $scope.display.texts = true;
                });
        }
        if ($scope.search.channel.fileshares) {
            $scope.fileShareList = [];
            fileService.getShares(user_uuid, new Date($scope.fromDate), new Date($scope
                    .toDate))
                .then(function(response) {
                    console.log(response);
                    //if (response.fileList) $scope.fileList = response.fileList;
                    if (response.shareList) {
                        if ($scope.search.contact_uuid) {
                            angular.forEach(response.shareList, function(share) {
                                if (share.recipient_email === contact.contact_email_address)
                                    $scope.fileShareList.push(share);
                            });
                        } else {
                            $scope.fileShareList = response.shareList;
                        }
                        angular.forEach($scope.fileShareList, function(share) {
                            communications.push({
                                date: share.created_at,
                                type: 'fileshare',
                                data: share
                            });
                        });
                    }
                    $scope.showFileTable = true;
                    $scope.showFs = true;
                    $scope.display.fileshares = true;
                });
        }
        if ($scope.search.channel.faxes) {
            $scope.faxList = [];
            dataFactory.getFaxMessages(user_uuid)
                .then(function(response) {
                    console.log("FAXING");
                    console.log(response.data);
                    if (response.data && response.data.success) {
                        $scope.faxList = response.data.success.data.message;
                        angular.forEach($scope.faxList, function(fax) {
                            communications.push({
                                date: fax.created_at,
                                type: 'fax',
                                data: fax
                            });
                        });
                    }
                    $scope.showFaxTable = true;
                    $scope.showFaxes = true;
                    $scope.display.faxes = true;
                });
        }
        if ($scope.search.channel.calls) {
            $rootScope.callHistory.user_uuid = user_uuid;
            $rootScope.callHistory.fromDate = new Date($scope.fromDate);
            $rootScope.callHistory.toDate = new Date($scope.toDate);
            $rootScope.callHistory.contact_uuid = $scope.search.contact_uuid;
            callHistoryService.getCallHistory()
                .then(function(response) {
                    $scope.contactCallHistory = response;
                    angular.forEach(response, function(call) {
                        communications.push({
                            date: call.start_stamp,
                            type: 'call',
                            data: call
                        });
                    });
                    $scope.showCallTable = true;
                    $scope.showCalls = true;
                    $scope.display.calls = true;
                });
        }
        $scope.communicationsList = communications;
        console.log("COMMUNICATIONS");
        console.log(communications);

    };
    $scope.watchCollectionLog = [];
    $scope.$watchCollection(
        "display",
        function(newValue, oldValue) {
            if ((($scope.search.channel.calls && newValue.calls) || !$scope.search.channel
                    .calls) &&
                (($scope.search.channel.fileshares && newValue.fileshares) || !$scope.search
                    .channel.fileshares) &&
                (($scope.search.channel.texts && newValue.texts) || !$scope.search.channel
                    .texts) &&
                (($scope.search.channel.videos && newValue.videos) || !$scope.search.channel
                    .videos) &&
                (($scope.search.channel.faxes && newValue.faxes) || !$scope.search.channel
                    .faxes) &&
                (($scope.search.channel.chats && newValue.chats) || !$scope.search.channel
                    .chats)) {
                $scope.searching = true;
                $scope.showList = true;
            }
            console.log(newValue);
            console.log(oldValue);
            //addLogItem( $scope.watchCollectionLog );
        }
    );

    $scope.exportFilteredToHawksoft = function(allData) {
        var array = [];
        $scope.copyingToHs = {
            status: true,
            message: "Exporting communications."
        };
        angular.forEach(allData, function(row) {
            var data = {};
            if (row.type === 'sms') {
                data = {
                    uuid: row.data.message_uuid,
                    type: row.type,
                    date: row.date,
                    contact_uuid: (row.data.to_contact ? row.data.to_contact
                        .contact_uuid : (row.data.from_contact ? row.data
                            .from_contact.contact_uuid : null))
                };
            } else if (row.type === 'call') {
                data = {
                    uuid: row.data.call_history_fs_uuid,
                    type: row.type,
                    date: row.date,
                    contact_uuid: (row.data.contact ? row.data.contact.contact_uuid :
                        null),
                    call_status: row.data.call_status,
                    duration: row.data.duration,
                    direction: row.data.call_direction,
                    caller_id_number: row.data.caller_id_number,
                    destination_number: row.data.destination_number,
                    voicemail_filepath: row.data.voicemail_filepath,
                    recording_filepath: row.data.recording_filepath,
                    manual_recording_filepath: row.data.manual_recording_filepath
                };
            } else if (row.type === 'fax') {
                data = {
                    uuid: row.data.message_uuid,
                    type: row.type,
                    date: row.date,
                    contact_uuid: (row.data.contact ? row.data.contact.contact_uuid :
                        null),
                    direction: row.data.direction,
                    original_filename: row.data.original_filename,
                    status: row.data.status,
                    source_number: row.data.source_number,
                    destination_number: row.data.destination_number
                };
            } else if (row.type === 'fileshare') {
                data = {
                    uuid: row.data.message_uuid,
                    type: row.type,
                    date: row.date,
                    direction: "Out",
                    contact_uuid: (row.data.contact ? row.data.contact.contact_uuid :
                        null),
                    recipient_email: row.data.recipient_email,
                    original_filename: row.data.file.original_filename,
                    file_size: row.data.file.file_size,
                    downloaded_at: row.data.downloaded_at,
                };
            } else if (row.type === 'chat') {
                data = {};
            }
            array.push(data);
        });
        console.log(array);
        var data = {
            results: JSON.stringify(array),
            //results: array,
            fromDate: $scope.fromDate,
            toDate: $scope.toDate,
            search: $scope.search,
            user_uuid: $rootScope.user.id,
            domain_uuid: $rootScope.user.domain.domain_uuid
        }
        console.log(data);
        dataFactory.postCopyConversations(data)
            //$rootScope.showInfoAlert(allData.length+" Conversation Records were sent to the backend to be prepared for HawkSoft. Once ready, Green Box will notify you.")
            .then(function(response) {
                console.log(response);
                $rootScope.showSuccessAlert(array.length +
                    " Entries were exported.");
                $rootScope.copySelected = {};
                $scope.enableCopyMode = false;
                $scope.copyingToHs = {};
            }, function(error) {
                console.log(error);
            });
    };

    $scope.searchAll = function(item) {
        if (item.type === 'sms') return $scope.searchTexts(item);
        if (item.type === 'fileshare') return $scope.searchFileshares(item);
        if (item.type === 'call') return $scope.searchCalls(item);
        if (item.type === 'fax') return $scope.searchFax(item);
        if (item.type === 'video') return $scope.searchVideo(item);
        if (item.type === 'chat') return $scope.searchChat(item);
    };

    $scope.searchTexts = function(item) {
        if (item.data) item = item.data;
        if (!$scope.search.filterText ||
            (item.from_contact && item.message_direction === 'in' && item.from_contact.contact_name_full
                .toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !== -1) ||
            (item.to_contact && item.message_direction === 'out' && item.to_contact.contact_name_full
                .toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !== -1) ||
            item.from_number.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1 ||
            item.to_number.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1 ||
            item.message.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1) return true;
        return false;
    };
    $scope.searchFax = function(item) {
        if (item.data) item = item.data;
        if (!$scope.search.filterText ||
            (item.contact && item.contact.contact_name_full.toLowerCase().indexOf(
                $scope.search.filterText.toLowerCase()) !== -1) ||
            item.destination_number.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1 ||
            item.source_number.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1 ||
            item.original_filename.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1) return true;
        return false;
    };
    $scope.searchFileshares = function(item) {
        if (item.data) item = item.data;
        if (!$scope.search.filterText ||
            (item.contact && item.contact.contact_name_full.toLowerCase().indexOf(
                $scope.search.filterText.toLowerCase()) !== -1) ||
            (item.contact && item.contact.contact_email_address.toLowerCase().indexOf(
                $scope.search.filterText.toLowerCase()) !== -1) ||
            item.recipient_email.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1 ||
            item.original_filename.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1) return true;
        return false;
    };
    $scope.searchCalls = function(item) {
        if (item.data) item = item.data;
        if (!$scope.search.filterText ||
            (item.contact && item.contact.contact_name_full.toLowerCase().indexOf(
                $scope.search.filterText.toLowerCase()) !== -1) ||
            (item.contact && item.contact.contact_email_address.toLowerCase().indexOf(
                $scope.search.filterText.toLowerCase()) !== -1) ||
            item.contact_number.toLowerCase().indexOf($scope.search.filterText.toLowerCase()) !==
            -1) return true;
        return false;
    };

    $scope.showFileName = function(fileshare) {
        var display = '';
        var fileName = fileshare.uploadfile.original_filename;
        if (fileshare.uploadfile.original_filename.length > 25) fileName = fileshare.uploadfile
            .original_filename.substring(0, 10) + ' ... ' + fileshare.uploadfile.original_filename
            .substring(fileshare.uploadfile.original_filename.length - 10);
        display = '<a href="' + (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
                symphonyConfig.onescreenUrl) + '/media/me-download-file/' + fileshare.download_hash +
            '?token=' + $rootScope.userToken + '" target="_blank" title="' + fileshare.uploadfile
            .original_filename + '" tooltip-placement="bottom" uib-tooltip="' +
            $rootScope.tips.fileshare.downloadfile + '">' + fileName +
            '</a><br />Size: ' + fileshare.uploadfile.file_size;
        return $sce.trustAsHtml(display);
    };
    $scope.showFaxFile = function(fax) {
        var fileName = '';
        if (fax !== null) {
            fileName = fax.original_filename;
            if (fax.original_filename.length > 35) fileName = fax.original_filename.substring(
                0, 17) + ' ... ' + fax.original_filename.substring(fax.original_filename
                .length - 17);
        }
        return fileName;
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
    $scope.shareExpired = function(share) {
        var a = moment(share.expires_at);
        var b = moment();
        var c = a.diff(b, 'minutes');
        if (c < 0) return true;
        return false;
    };


});
