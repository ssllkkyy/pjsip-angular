"use strict";

proySymphony.component("rtcPage", {
    templateUrl: "views/vidconf/rtc-page.html",
    bindings: {
        pageType: "<"
    },
    controller: ["$rootScope", "videoConfService", "__env", "symphonyConfig", "dataFactory", "integrationService", "$filter", "clipboard", "Slug", "emailService", function($rootScope, videoConfService, __env, symphonyConfig, dataFactory, integrationService, $filter, clipboard, Slug, emailService) {
        var ctrl = this;

        ctrl.$onInit = function() {
            initTableModes();
            if (ctrl.pageType === "proposal") {
                ctrl.pageTitle = "Video Proposal";
                ctrl.packageName = "videoproposal";
                ctrl.roomType = "proposal";
                ctrl.externalUrl = __env.vpUrl || symphonyConfig.vpUrl;
                ctrl.modes.allArchives.editCols = function(defaultCols) {
                    defaultCols = defaultCols.slice();
                    [{name: "date_emailed", text: "Date Emailed", className: "date-emailed"},
                     {name: "email", text: "Email", className: "email"},
                     {name: "last-viewed", text: "Last Viewed", className: "last-viewed"},
                     {name: "copy-link", text: "Copy Link", className: "copy-link"}
                    ].forEach(function(column) { defaultCols.splice(3, 0, column); });
                    return defaultCols;
                };
                ctrl.modes.allArchives.editSortCols = function(sortableCols) {
                    return sortableCols.concat(["date_emailed"]);
                };
                ctrl.joinConfText = "Create Video Proposal";
            } else if (ctrl.pageType === "video") {
                return;
            } else if (ctrl.pageType === "share") {
                return;
            } else {
                return;
            }
            initRootVals();
            initData().then(_.partial(setTableMode, "allArchives"));
            ctrl.urlNotAvailable = false;
            $rootScope.showTable = function() {
                return videoConfService.roomBeingRetrieved(ctrl.roomType);
            };
        };

        function initRootVals() {
            ctrl.packageHasAccess = $rootScope.packageHasAccess;
            ctrl.tips = $rootScope.tips;
            ctrl.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
            ctrl.user = $rootScope.user;
        };

        function initData() {
            ctrl.archives = [];
            videoConfService.registerOnAfterInitCallback(function() {
                ctrl.conference = videoConfService[ctrl.roomType + "Conference"];
                var roomName;
                ctrl.roomData = Object.defineProperties({}, {
                    roomName: {
                        set: function(val) { return roomName = Slug.slugify(val);  },
                        get: function() { return roomName; }
                    }
                });
                ctrl.roomData.roomName = ctrl.conference.room;
                ctrl.clipboardCopy = ctrl.externalUrl + '/' + ctrl.conference.room;
            });
            return getVideoArchives($rootScope.user.id);
        };

        ctrl.showTable = function() {
            return videoConfService.roomBeingRetrieved(ctrl.roomType);
        };

        ctrl.viewArchive = function(archive) {
            dataFactory.getVideoArchiveUrl(archive.tokbox_conference_archive_uuid)
                .then(function(response) {
                    if (response.data.success) {
                        var playvideo = archive;
                        playvideo.publicurl = response.data.success.data;
                        playvideo.videoArchive = true;
                        $rootScope.showModalFull('/video/playrecording.html', playvideo, '');
                    } else {
                        $rootScope.showErrorAlert('Unable to locate the video recording file.');}
                });
        };

        ctrl.removeArchive = function(archive) {
            dataFactory.getRemoveArchive(archive.tokbox_conference_archive_uuid)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        _.pull(ctrl.archives, archive);
                    }
                });
        };

        ctrl.copyConferenceToHawksoft = function(archive) {
            var data = {
                uuid: archive.tokbox_conference_archive_uuid,
                type: 'videoconference',
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
                integrationService.copyEntityToPartner(data);
            }
        };

        $rootScope.$on('new.video.archive', function($event, archive) {
            if (archive.action === ctrl.roomType || archive.session_id === ctrl.roomType) {
                if (!ctrl.archives) ctrl.archives = [];
                var index = $filter('getByUUID')(
                    ctrl.archives,
                    archive.tokbox_conference_archive_uuid,
                    'tokbox_conference_archive'
                );
                if (index == null) { ctrl.archives.push(archive); }
            }
        });

        ctrl.clickHandler = function() {
            ctrl.clipboardCopy = ctrl.externalUrl + '/' + ctrl.conference.room;
            clipboard.copyText(ctrl.clipboardCopy);
            $rootScope.alerts.push({
                success: true,
                message: 'Your info has been copied to your clipboard '
            });
        };

        ctrl.joinConference = function() {
            videoConfService.openConference(ctrl.externalUrl + '/' + ctrl.conference.room);
        };

        (function debouncedRoomClaim() {
            var debounceTimeout;
            function clearDebounceTimeout() {
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                    debounceTimeout = null;
                }
            };
            ctrl.isRoomAvailable = function(roomName) {
                clearDebounceTimeout();
                roomName = Slug.slugify(roomName);
                if (roomName.length < 3 || roomName.indexOf(" ") > -1) {
                    ctrl.urlNotAvailable = true;
                    ctrl.availMessage = 'Min of 3 Chars';
                } else {
                    debounceTimeout = setTimeout(function() {
                        videoConfService.isRoomAvailable(roomName, ctrl.roomType)
                            .then(function(response) {
                                if (response.status) {
                                    ctrl.urlNotAvailable = false;
                                    ctrl.roomData.roomName = response.data.room;
                                } else {
                                    ctrl.urlNotAvailable = true;
                                    ctrl.availMessage = 'Not Available';
                                }
                            });
                    }, 1000);
                }
            };
        })();

        ctrl.tableControls = {
            currentPage: { page: 1 },
            sortingOpts: {
                selectedColumn: "created_at",
                sortDirection: true,
                orderByValue: null,
                handleNewSelectedCol: function() {}
            }
        };

        Object.defineProperties(ctrl.tableControls, {
            records: {
                enumerable: true,
                get: function() {
                    return ctrl.tableMode && ctrl.tableMode.records;
                }
            },
            columnNames: {
                enumerable: true,
                get: function() {
                    return ctrl.tableMode && ctrl.tableMode.columnNames;
                }
            }
        });

        Object.defineProperties(ctrl.tableControls.sortingOpts, {
            sortableColumns: {
                enumerable: true,
                get: function() {
                    return ctrl.tableMode && ctrl.tableMode.sortableColumns;
                }
            }
        });

        ctrl.sortBy = function(category) {
            if (ctrl.category === category) {
                ctrl.sortDirection = !ctrl.sortDirection;
            } else {
                ctrl.sortDirection = false;
                ctrl.category = category;
            };
        };

        ctrl.showChevronUp = function(category) {
            return ctrl.category === category && ctrl.sortDirection;
        };

        ctrl.showChevronDown = function(category) {
            return ctrl.category !== category || !ctrl.sortDirection;
        };

        ctrl.sendProposalEmail = function(archive) {
            dataFactory.getProposalEmailLink(archive.tokbox_conference_archive_uuid)
                .then(function(response) {
                    if (response.data.success) {
                        var data = response.data.success.data;
                        var link = data.link;
                        var body = "View the proposal here: " + link;
                        emailService.startEmailClient(
                            "someone@example.com",
                            archive.name + " Video Proposal",
                            body
                        );
                        archive.date_emailed = data.date_emailed;
                    }
                });
        };

        ctrl.copyLinkToClipboard = function(archive) {
            dataFactory.getProposalEmailLink(archive.tokbox_conference_archive_uuid)
                .then(function(response) {
                    if (response.data.success) {
                        var link = response.data.success.data.link;
                        clipboard.copyText(link);
                        $rootScope.alerts.push({
                            success: true,
                            message: "Your info has been copied to your clipboard "
                        });
                    }
                });
        };

        ctrl.inspectArchiveViewings = function(archive) {
            ctrl.inspectionArchive = archive;
            setTableMode("archiveInspect");
        };

        ctrl.backToAllArchives = function() {
            ctrl.inspectionArchive = null;
            setTableMode("allArchives");
        };

        function initTableModes() {
            ctrl.modes = {
                allArchives: {
                    getRecords: function() { return ctrl.archives; },
                    defaultCols: [{
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
                    }],
                    sortableColumns: ["created_at", "name"]
                },
                archiveInspect: {
                    getRecords: function() { return ctrl.inspectionArchive.viewings; },
                    defaultCols: [{
                        name: "created_at",
                        text: "Date",
                        className: "created-at"
                    }, {
                        name: "ip_addr",
                        text: "IP Address",
                        className: "ip-addr"
                    }, {
                        name: "city",
                        text: "City",
                        className: "city"
                    }, {
                        name: "region",
                        text: "Region",
                        className: "region"
                    }, {
                        name: "country_name",
                        text: "Country",
                        className: "country-name"
                    }],
                    sortableColumns: ["created_at", "ip_addr", "city", "region", "country_name"]
                }
            };
        };

        function setTableMode(modeName) {
            var mode = ctrl.modes[modeName];
            if (!mode) { return; }
            var columnNames = mode.editCols ? mode.editCols(mode.defaultCols) : mode.defaultCols;
            var sortableColumns = mode.editSortCols ?
                mode.editSortCols(mode.sortableColumns) : mode.sortableColumns;
            var records = mode.getRecords();
            ctrl.tableMode = {
                columnNames: columnNames,
                sortableColumns: sortableColumns,
                records: records
            };
            ctrl.tableMode["is" + capitalize(modeName)] = true;
        };

        function getVideoArchives(user_uuid) {
            return dataFactory.getVideoArchives(user_uuid, ctrl.roomType)
                .then(function(response) {
                    console.log("ARCHIVES");
                    console.log(response);
                    if (response.data.error) {
                        console.log(response.data.error.message);
                    } else {
                        ctrl.archives = response.data.success.data;
                        ctrl.archives.forEach(function(archive) {
                            if (archive.viewings.length) {
                                var viewings = _.sortBy(archive.viewings, ["created_at"]).reverse();
                                archive.viewings = viewings;
                            }
                        });
                    }
                }, function(error) {
                    console.log(error);
                });
        };

        function capitalize(str) {
            var capStr = str.split("");
            capStr.splice(0, 1, str.slice(0, 1).toUpperCase());
            return capStr.join("");
        };

    }]
});
