'use strict';

proySymphony.controller('ScreenShareCtrl', function($scope, $uibModal, $uibModalStack, $rootScope,
    __env, symphonyConfig, dataFactory, $filter, $window, Slug, clipboard, integrationService,
    videoConfService, usefulTools) {

    $scope.category = 'created_at';
    $scope.sortDirection = true;

    $scope.videoArchives = [];
    $scope.symphonyConfig = symphonyConfig;
    //$rootScope.exportType = $window.localStorage.getItem("exportType");
    $scope.symphonyURL = __env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl :
        symphonyConfig.symphonyUrl;
    $scope.ssUrl = __env.ssUrl && __env.ssUrl !== '' ? __env.ssUrl : symphonyConfig.ssUrl;
    if (!$rootScope.nonContacts) $rootScope.nonContacts = JSON.parse($window.localStorage.getItem(
        "nonContacts"));
    if (!clipboard.supported) {
        if (__env.enableDebug) console.log('Sorry, copy to clipboard is not supported');
    }

    function initData() {
        videoConfService.registerOnAfterInitCallback(function() {
            $scope.conference = videoConfService.shareConference;
            var roomName;
            $scope.roomData = Object.defineProperties({}, {
                roomName: {
                    set: function(val) { return roomName = Slug.slugify(val);  },
                    get: function() { return roomName; }
                }
            });
            $scope.roomData.roomName = $scope.conference.room;
            $scope.clipboardCopy = $scope.ssUrl + '/' + $scope.conference.room;
            $rootScope.videoConference = $scope.conference;
        });
    };

    $scope.init = function() {
        initData();
        $rootScope.videoConference = {};
        $scope.urlNotAvailable = false;
        $rootScope.showTable = function() {
            return videoConfService.roomBeingRetrieved('share');
        };
    };
    $scope.init();

    $scope.viewArchive = function(archive) {
        dataFactory.getVideoArchiveUrl(archive.tokbox_conference_archive_uuid)
            .then(function(response) {
                if (response.data.success) {
                    var playvideo = archive;
                    playvideo.publicurl = response.data.success.data;
                    playvideo.screenshareArchive = true;
                    $rootScope.showModalFull('/video/playrecording.html', playvideo, '');
                } else {
                    $rootScope.showErrorAlert('Unable to locate the video recording file.');}
            });
    };

    $scope.removeArchive = function(archive) {
        dataFactory.getRemoveArchive(archive.tokbox_conference_archive_uuid)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    _.pull($scope.videoArchives, archive);
                }
            });
    };

    $scope.copyConferenceToHawksoft = function(archive) {
        var data = {
            uuid: archive.tokbox_conference_archive_uuid,
            type: 'screenshare',
            customerList: [],
            title: 'Activity Action',
            archive: archive
        };
        var partner = $rootScope.user.exportType.partner_code;

        if (partner == 'ams360') {
            $rootScope.showModalFull('/modals/ams360ActivityModal.html', data, '');
        } else if (partner == 'qqcatalyst') {
            $rootScope.showModalFull('/modals/qqTaskModal.html', data, '');
        } else {
            integrationService.copyEntityToPartner(data)
        }
    };

    $rootScope.$on('new.video.archive', function($event, archive) {
        if (archive.action === 'share' || archive.session_id === "share") {
            if (!$scope.videoArchives) $scope.videoArchives = [];
            var index = $filter('getByUUID')($scope.videoArchives, archive.tokbox_conference_archive_uuid,
                'tokbox_conference_archive');
            if (index == null) {
                $scope.videoArchives.push(archive);
            }
        }
    });

    function getVideoArchives(user_uuid) {
        dataFactory.getVideoArchives(user_uuid, 'share')
            .then(function(response) {
                console.log(response);
                if (response.data.error) {
                    console.log(response.data.error.message);
                } else {
                    $scope.videoArchives = response.data.success.data;
                }
            }, function(error) {
                console.log(error);
            });
    }
    getVideoArchives($rootScope.user.id);

    $scope.clickHandler = function() {
        $scope.clipboardCopy = $scope.ssUrl + '/' + $scope.conference.room;
        clipboard.copyText($scope.clipboardCopy);
        $rootScope.alerts.push({
            success: true,
            message: 'Your info has been copied to your clipboard '
        });
    };

    (function debouncedRoomClaim() {
        var debounceTimeout;
        function clearDebounceTimeout() {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
                debounceTimeout = null;
            }
        };
        $scope.isRoomAvailable = function(roomName) {
            clearDebounceTimeout();
            roomName = Slug.slugify(roomName);
            if (roomName.length < 3 || roomName.indexOf(" ") > -1) {
                $scope.urlNotAvailable = true;
                $scope.availMessage = 'Min of 3 Chars';
            } else {
                debounceTimeout = setTimeout(function() {
                    videoConfService.isRoomAvailable(roomName, 'share')
                        .then(function(response) {
                            if (response.status) {
                                $scope.urlNotAvailable = false;
                                $scope.roomData.roomName = response.data.room;
                            } else {
                                $scope.urlNotAvailable = true;
                                $scope.availMessage = 'Not Available';
                            }
                        });
                }, 1000);
            }
        };
    })();

    $scope.joinConference = function() {
        if ($scope.conference && $scope.conference.room) {
            videoConfService.openConference($scope.ssUrl + '/' + $scope.conference.room);
        }
    };

    $scope.closeVideoCallModal = function() {
        $rootScope.addedInvitees = [];
        $scope.invitee = {};
        var top = $uibModalStack.getTop();
        if (top) {
            $uibModalStack.dismiss(top.key);
        }
    };

    $scope.removeInvitation = function(index) {
        var data = {
            video_conference_invite_uuid: $rootScope.videoConference.participants[
                index].video_conference_invite_uuid
        };
        if (__env.enableDebug) console.log(data);
        if (__env.enableDebug) console.log($rootScope.videoConference);
        if (__env.enableDebug) console.log("index " + index);
        dataFactory.postDisableVideoConferenceInvite(data)
            .then(function(response) {
                if (__env.enableDebug) console.log(response);
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.videoConference.participants.splice(index, 1);
                }
            });
    };

    $scope.resetAdminLink = function() {
        dataFactory.getResetVideoConferenceAdminLink()
            .then(function(response) {
                if (__env.enableDebug) console.log(response);
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.videoConference.moderator_hash = response.data.success
                        .data;
                    var index = $filter('getVCInviteIndexbyUUID')($rootScope.videoConference
                        .participants, $rootScope.videoConference.mod_invite_uuid
                    );
                    $rootScope.videoConference.participants[index].invite_hash =
                        response.data.success.data;
                }
            });
    };

    $scope.resendInvitation = function(index) {
        var data = {
            video_conference_invite_uuid: $rootScope.videoConference.participants[
                index].video_conference_invite_uuid,
            sender_name: $rootScope.user.contact_name_given + ' ' + $rootScope.user
                .contact_name_family,
            sender_email: $rootScope.user.email_address,
            sender_company: $rootScope.user.contact_organization,
            redirect_path: (__env.symphonyUrl && __env.symphonyUrl !== "" ? __env.symphonyUrl :
                symphonyConfig.symphonyUrl) + '/video'
        };
        if (__env.enableDebug) console.log(data);
        dataFactory.postResendVideoConferenceInvite(data)
            .then(function(response) {
                if (__env.enableDebug) console.log(response);
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.videoConference.participants[index].invite_hash =
                        response.data.success.data;
                }
            });
    };

    $scope.sendVideoInvites = function(delivery) {
        $rootScope.contactsUsr = delivery && delivery.messageContacts ? delivery.messageContacts :
            null;
        $rootScope.videoInviteBody = delivery && delivery.videoInviteBody ? delivery.videoInviteBody :
            '';

        $rootScope.sendVideoCallInvites('modal');
    };

    $scope.sortBy = function(category) {
        if ($scope.category === category) {
            $scope.sortDirection = !$scope.sortDirection;
        } else {
            $scope.sortDirection = false;
            $scope.category = category;
        };
    };

    $scope.showChevronUp = function(category) {
        return $scope.category === category && $scope.sortDirection;
    };

    $scope.showChevronDown = function(category) {
        return $scope.category !== category || !$scope.sortDirection;
    };

    var columnNames = [{
        name: "created_at",
        text: "Date",
        className: "created-at"
    }, {
        name: "name",
        text: "Name",
        className: "name"
    }, {
        name: "view",
        text: "View Recording",
        className: "view"
    }, {
        name: "copy",
        text: "Copy",
        className: "copy"
    }, {
        name: "remove",
        text: "Remove",
        className: "remove"
    }];

    var sortingOpts = {
        selectedColumn: "created_at",
        sortDirection: true,
        sortableColumns: ["created_at", "name"],
        orderByValue: null,
        handleNewSelectedCol: function() {}
    };

    $scope.tableControls = {
        columnNames: columnNames,
        currentPage: { page: 1 },
        sortingOpts: sortingOpts
    };


});
