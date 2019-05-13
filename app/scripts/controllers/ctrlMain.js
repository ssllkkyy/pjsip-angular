'use strict';

proySymphony.controller('MainCtrl', function($scope, packageService, greenboxService, userService,
    locationService, emulationService, FileUploader, $location, TawkAPI, $rootScope,
    $uibModalStack, $auth, $window, dataFactory, __env, symphonyConfig, $timeout,
    emailService, callService, $cookies, smsService, newChatService, tooltipsService,
    metaService, statusService, resourceFrameworkService, routeService) {

    $rootScope.refreshThePage = function() {
        window.location.reload(true);
    };
    $scope.paginate = {
        perPage: 50,
        currentPage: 1
    };

    // var color = randomColor({
    //     count: 30,
    //     luminosity: 'light'
    // });

    $rootScope.activePath = null;
    $rootScope.tips = tooltipsService.tips;
    var pathsThatDontShowHeaderAndLeftbar = [
        'views/login.html', 'views/public.html', 'views/bluewave.html',
        'views/demo.html', 'views/publiccloud.html', 'views/publicplay.html',
        'views/quotesheets/quote-view.html', 'views/screenpop.html'
    ];

    $scope.$on('$routeChangeSuccess', function(event, next, current) {
        $scope.activePath = $location.path();
        if (__env.enableDebug) console.log('location.path ==> ' + $scope.activePath);
        if (__env.enableDebug) console.log($location.path());
        if ($location.path() === '/sms' && smsService.smsData.currentThread) {
            smsService.markThreadRead(smsService.smsData.currentThread.thread_uuid,
                $rootScope.user.id);
        }
        if ($location.path() === '/main') {
            $rootScope.showHeaderPpal = false;
        } else {
            $rootScope.showHeaderPpal = true;
        }

        if ($location.path() === '/main') {
            $rootScope.showHeaderPpal = false;
        } else {
            $rootScope.showHeaderPpal = true;
        }
        if (current && current.templateUrl === 'views/sms.html') {
            console.log("INITIALIZE SMS- ctrlMain.js");
            smsService.init($rootScope.user.id);
        }
        emulationService.clearEmulation();
        console.log('remove emulation');
    });

    function onRouteChange(event, next) {
        var route = '';
        var chat = false;
        if (next.templateUrl) {
            handlePaddingRoutes(next.templateUrl);
            handleLeftbarAndHeaderDisplay(next.templateUrl);
            handleRightContainerRoutes(next.templateUrl);
        }
        if ($rootScope.user) {
            if ($location.path() === '/chatplus' && packageService.packageHasAccess(
                    'chatplus')) {
                chat = true;
            }
            if (__env.disableChat) {
                chat = false;
            }
        }
        $rootScope.showChatContacts = chat;
        $rootScope.showContacts = !chat;
    };

    routeService.registerRouteChangeCallback(
        "routeChangeStart",
        "after",
        onRouteChange
    );

    $rootScope.showFeatureTitle = function(feature) {
        return packageService.getFeatureTitle(feature);
    };

    $rootScope.packageHasAccess = function(feature) {
        return packageService.packageHasAccess(feature);
    };

    $scope.showHeader = true;
    $scope.showLeftbar = true;

    var handleLeftbarAndHeaderDisplay = function(route) {
        if (__env.enableDebug) console.log("ROUTE: " + route);
        if (pathsThatDontShowHeaderAndLeftbar.indexOf(route) !== -1 || $location.path()
            .indexOf('/cloud/') !== -1) {
            $scope.showHeader = false;
            $scope.showLeftbar = false;
            $scope.fullWidthPage = true;
        } else {
            $scope.showHeader = true;
            $scope.showLeftbar = true;
            $scope.fullWidthPage = false;
        }
    };

    var handlePaddingRoutes = function(route) {
        console.log(route);
        var pathsThatDontHaveContentPadding = [
            'views/chatplus.html',
            'views/visualvoicemail.html',
            'views/callhistorynew.html',
            'views/analytics/bridgeanalytics.html',
            'views/calls/newconference.html',
            'views/callrecording.html',
            'views/main2.html',
            'views/sms.html',
            'views/login.html',
            'views/settings/settings.html',
            'views/cloudstorage/cloudstorage.html',
            'views/new-chatplus.html'
        ];
        if (pathsThatDontHaveContentPadding.indexOf(route) !== -1) {
            $scope.showContentPadding = false;
        } else {
            $scope.showContentPadding = true;
        }
    };

    var handleRightContainerRoutes = function(route) {
        var path = $location.path();
        if (path === '/login' || path.substring(0, 6) === '/login' ||
            path.substring(0, 6) === '/cloud' ||
            pathsThatDontShowHeaderAndLeftbar.indexOf(route) > -1) {
            $scope.fullScreenRightContainer = true;
        }
    };

    $rootScope.showChatContacts = (__env.disableChat ? false : $location.path() ===
        '/chatplus');
    $rootScope.showContacts = (__env.disableChat ? true : $location.path() !== '/chatplus');

    $scope.totalMentionCount = function() {
        var total = newChatService.totalMentionCount();
        if (total) {
            return '(' + total + ')';
        }
        return null;
    };

    $rootScope.contactSelectionType = 'sms';

    $rootScope.sendSmsTop = function(delivery) {
        if (userService.limitReached('sms')) {
            $rootScope.showErrorAlert('You have reached the limit of ' + $rootScope.user
                .demoLimits.sms +
                ' sms text messages allowed while using a Bridge Demo account.');
            $uibModalStack.dismissAll();
            return;
        }
        if (!delivery.message) {
            $rootScope.showErrorAlert('You can not send an empty message.');
            return;
        }
        var smsnumber = delivery.smsnumber ? '1' + delivery.smsnumber : null;

        smsService.sendSmsMessage(delivery.message, null, smsnumber)
            .then(function(response) {
                if (response !== true) {
                    $rootScope.showErrorAlert(response);
                }
                $uibModalStack.dismissAll();
            });
    };

    $scope.unreadSms = function() {
        return smsService.unreadMessages();
    };

    $scope.doremove = function() {
        dataFactory.removeOldUsers();
    };

    $rootScope.openMessenger = function(check) {
        if (check) {
            $cookies.put('hideFacebookModal', 'true');
        }
        $uibModalStack.dismissAll();
        $window.open('https://www.messenger.com/t/', '_blank');
    };

    $rootScope.showMessengerModal = function() {
        if ($cookies.get('hideFacebookModal') && $cookies.get('hideFacebookModal') ===
            'true') {
            $window.open('https://www.messenger.com/t/', '_blank');
        } else {
            $rootScope.showModal('/modals/facebookmessenger.html', '');
        }
    };

    $scope.loadTrainingUrl = function() {
        $window.open('https://www.kotter.net/training', '_blank');
    };

    var uploader = $scope.uploader = new FileUploader({
        //url: $rootScope.onescreenBaseUrl + '/cloud/mobileupload',
        url: $rootScope.onescreenBaseUrl + '/hawksoft/uploadscreenshot',
        queueLimit: 1,
        headers: {
            'Authorization': 'Bearer ' + $rootScope.userToken
        }
    });
    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
        options) {
        console.info('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function(fileItem) {
        console.info('onAfterAddingFile', fileItem);
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function(item) {
        console.info('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function(fileItem, progress) {
        console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function(progress) {
        console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        console.info('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function(fileItem, response, status, headers) {
        console.info('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        console.info('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        console.info('onCompleteItem', fileItem, response, status, headers);
        if (__env.enableDebug) console.log(response);
    };
    uploader.onCompleteAll = function() {
        console.info('onCompleteAll');
    };


    $scope.doTestMobileUpload = function(file) {
        if (__env.enableDebug) console.log(file);
        if (__env.enableDebug) console.log($scope.uploadfile);
        var data = {
            file: file
        };
        if (__env.enableDebug) console.log(data);
        dataFactory.postCloudMobileUpload(data)
            .then(function(response) {
                $rootScope.showalerts(response);
            });
    };

    $scope.showAgencyVoicemails = function() {
        var display = false;
        if ($rootScope.user) {
            var locations = Object.values(locationService.locationGroups);
            if (locations) {
                angular.forEach(locations, function(location) {
                    if (location.communications.indexOf('dids') !== -1) display =
                        true;
                });
            }
        }
        return display;
    };

    $scope.gotoMissedCalls = function() {
        $rootScope.showMissedCalls = true;
        $location.path('/callhistory/').search({
            missed: 'true'
        });
    };

    $scope.gotoVoicemail = function(type) {
        $location.path('/visualvoicemail')
        if (type === 'user') {
            $timeout(function() {
                $rootScope.$broadcast('set.user.voicemail.tab');
            }, 500);
        } else {
            $timeout(function() {
                $rootScope.$broadcast('set.domain.voicemail.tab');
            }, 500);
        }
    };

    $scope.showStatusIcons = function() {
        return $rootScope.user && (($rootScope.user.forwarding && $rootScope.user.forwarding
            .ring_group_enabled === 'true') || $rootScope.showTimer);
    };

    $rootScope.showTimer = false;
    $rootScope.start_timer = true;
    $scope.checkStatus = function(status) {
        if (status == 'Available' ||
            status == 'Away' ||
            status == 'Do Not Disturb' ||
            status == 'Busy on Call' ||
            status == 'Offline') {
            $rootScope.start_timer = true;
            $window.localStorage.removeItem("start_timer");
            $window.localStorage.setItem("start_timer", JSON.stringify($rootScope.start_timer));
        } else {
            angular.forEach($rootScope.domainsStatus, function(obj) {
                if (status == obj.status_name) {

                    $rootScope.start_timer = obj.start_timer;
                    $window.localStorage.removeItem("start_timer");
                    $window.localStorage.setItem("start_timer", JSON.stringify(
                        $rootScope.start_timer));
                }
            });
        }
    };

    $scope.tkUserCheck = function() {
        angular.forEach($rootScope.tkUsers, function(user) {
            if (user.user_uuid == $rootScope.user.id) {
                var isTkUser = JSON.parse($window.localStorage.getItem(
                    "isTkUser"));
                if (!isTkUser) $window.localStorage.setItem("isTkUser", JSON.stringify(
                    user));
                $rootScope.showTimer = true;

            } else if ($rootScope.user.accessgroup != 'user') {
                var isTkUser = JSON.parse($window.localStorage.getItem(
                    "isTkUser"));
                if (!isTkUser) $window.localStorage.setItem("isTkUser", JSON.stringify(
                    $rootScope.user));
                $rootScope.showTimer = true;
            } else {
                $window.localStorage.removeItem("isTkUser");
            }
        });
    };


    statusService.registerOnBeforeStatusChangeCallback(function(s, statusName) {
        $scope.checkStatus(statusName);
        $scope.tkUserCheck();
    });

    var rfs = resourceFrameworkService;
    var refreshRegisterFn = rfs.getResourceRefreshRegister({
        service: statusService,
        scope: $scope
    });
    refreshRegisterFn({
        resourceName: 'domainsStatus',
        serviceResourceName: 'customStatuses'
    });

    $rootScope.$on('update.timer', function($event, showTimer) {
        $rootScope.showTimer = showTimer;
        if (!showTimer) {
            $rootScope.user.tkRole = null;
        }
    });

    $rootScope.$on('show.timer', function() {
        $rootScope.showTimer = true;
    });

    $rootScope.$on('package.change', function(event, package_uuid) {
        console.log(package_uuid);
        if ($rootScope.user) {
            dataFactory.getPackageByUuid(package_uuid)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.user.package = response.data.success.data;
                    }
                });
        }
    });

    metaService.registerOnRootScopeUserLoadCallback(function() {
        var currentStatus = statusService.getCurrentStatusName();
        $scope.checkStatus(currentStatus);
        if ($rootScope.user.tkRole) {
            $rootScope.showTimer = true;
        }

        var defaultRingtoneUrl =
            'https://staging.onescreen.kotter.net/imported/sounds/ActiveRingtone.wav';

        $rootScope.notification = new Audio(defaultRingtoneUrl);
        $rootScope.notification.volume = 0;

        $rootScope.notification.play();

        setTimeout(function() {
                $rootScope.notification.pause();
            },
            1000);
    });

    $scope.dialPadClick = function(val) {
        $rootScope.phone_number = ($rootScope.phone_number ? $rootScope.phone_number :
            '') + val;
        angular.element('#iconClose').focus();
    };
    $scope.backSpace = function() {
        $rootScope.phone_number = $rootScope.phone_number.substring(0, $rootScope.phone_number
            .length - 1);
    };

    $rootScope.phone_number999 = '';
    $scope.dialPadClickOnCall = function(val) {
        $rootScope.phone_number999 = $rootScope.phone_number999 + val;
        angular.element('#iconClose').focus();
    };
    $scope.backSpaceOnCall = function() {
        $rootScope.phone_number999 = $rootScope.phone_number999.substring(0, $rootScope
            .phone_number999.length - 1);
    };

    $scope.goToOption = function(url) {
        if (url === '/quote-sheet') {
            $rootScope.showModal('/quote-sheet-message.html');
        } else {
            $location.path(url);
        }
    };

    $scope.goToUrl = function(url) {
        $window.open(url, '_blank');
    };

    $scope.hoverIn = function(id) {
        if (id === 1) {
            $scope.thum1 = true;
        } else if (id === 2) {
            $scope.thum2 = true;
        } else if (id === 3) {
            $scope.thum3 = true;
        } else if (id === 4) {
            $scope.thum4 = true;
        } else if (id === 5) {
            $scope.thum5 = true;
        } else if (id === 6) {
            $scope.thum6 = true;
        } else if (id === 7) {
            $scope.thum7 = true;
        } else if (id === 8) {
            $scope.thum8 = true;
        } else if (id === 9) {
            $scope.thum9 = true;
        } else if (id === 10) {
            $scope.thum10 = true;
        }
    };

    $scope.hoverOut = function(id) {

        if (id === 1) {
            $scope.thum1 = false;
        } else if (id === 2) {
            $scope.thum2 = false;
        } else if (id === 3) {
            $scope.thum3 = false;
        } else if (id === 4) {
            $scope.thum4 = false;
        } else if (id === 5) {
            $scope.thum5 = false;
        } else if (id === 6) {
            $scope.thum6 = false;
        } else if (id === 7) {
            $scope.thum7 = false;
        } else if (id === 8) {
            $scope.thum8 = false;
        } else if (id === 9) {
            $scope.thum9 = false;
        } else if (id === 10) {
            $scope.thum10 = false;
        }
    };

    // TAWK SUPPORT CHAT FUNCTIONS
    $scope.TawkAPI = TawkAPI;

    $scope.TawkAPI.onLoad = function() {
        $scope.TawkAPI.hideWidget();
    };

    $scope.TawkAPI.onChatMinimized = function() {
        $scope.TawkAPI.hideWidget();
    };

    $scope.callSupport = function() {
        callService.makeCall(symphonyConfig.supportDID);
    };

    $scope.toggleChat = function() {
        if ($scope.TawkAPI.isChatHidden()) {
            $scope.startChat();
        } else {
            $scope.closeChat();
        }
    };

    $scope.triggerFeedbackEmail = function() {
        var address = 'bridge@kotter.net';
        var subject = 'Bridge Feedback';
        var body = 'Tell us what you think!';
        emailService.startEmailClient(address, subject, body);
    };

    $scope.closeChat = function() {
        $scope.TawkAPI.hideWidget();
        $scope.TawkAPI.minimize();
    };

    $scope.startChat = function() {
        $scope.TawkAPI.maximize();
        $scope.TawkAPI.showWidget();
    };

    $scope.togglegreenbox = function() {
        var status = 'false';
        if (!$rootScope.user.greenbox_active || $rootScope.user.greenbox_active ==
            'false') status = 'true';
        dataFactory.getToggleGreenboxStatus(status)
            .then(function(response) {
                if (__env.enableDebug) console.log(response.data);
            });
    };

    $scope.toggleTile = function($index, status) {
        $rootScope.user.symphony_user_settings.dashboard_order[$index].active = status;
        $window.localStorage.setItem("currentUser", JSON.stringify($rootScope.user));
        var data = {
            order: $rootScope.user.symphony_user_settings.dashboard_order
        };
        dataFactory.postUpdateDashboard(data);
    };
    $scope.showCommunications = function(contact) {
        $rootScope.contactCommSearch = contact;
        $location.path('/communications');
    };
    $scope.onDropComplete = function(index, obj, evt) {

        var draggable = $rootScope.user.symphony_user_settings.dashboard_order;

        var otherObj = draggable[index];
        var otherIndex = draggable.indexOf(obj);

        while (otherIndex < 0) {
            otherIndex += draggable.length;
        }
        while (index < 0) {
            index += draggable.length;
        }

        if (index >= draggable.length) {
            var k = index - draggable.length;

            while ((k--) + 1) {
                draggable.push(undefined);
            }
        }
        if (__env.enableDebug) console.log(index, otherIndex);
        draggable.splice(index, 0, draggable.splice(otherIndex, 1)[0]);

        $rootScope.user.symphony_user_settings.dashboard_order = draggable;
        $window.localStorage.setItem("currentUser", JSON.stringify($rootScope.user));
        if (__env.enableDebug) console.log(draggable);
        var data = {
            order: draggable
        };
        dataFactory.postUpdateDashboard(data);
    };
    $scope.goToMyProfile = function() {
        $rootScope.showMyProfile = true;
        if ($location.path() === '/settings') {
            $rootScope.$broadcast('show.my.profile');
        } else {
            $location.path('/settings');
        }
    };

    $scope.tiles = {};

    $rootScope.isAdminGroupOrGreater = function() {
        return userService.isAdminGroupOrGreater();
    };

    $rootScope.isKotterTechOrGreater = function() {
        return userService.isKotterTechOrGreater();
    };

    $rootScope.isBillingAdminOrGreater = function() {
        return userService.isBillingAdminOrGreater();
    };

    $rootScope.isSalesOrGreater = function() {
        return userService.isSalesOrGreater();
    };

    $scope.isDomainAdmin = function() {
        return ($rootScope.user.accessgroup === 'superadmin' ||
            $rootScope.user.accessgroup === 'admin' ||
            $rootScope.user.accessgroup === 'salesadmin' ||
            $rootScope.user.accessgroup === 'KotterTech');
    };

    metaService.registerOnRootScopeUserLoadCallback(function() {
        locationService.getLocationGroups("callcenter", $rootScope.user.domain_uuid);
        if ($rootScope.user.exportType.partner_code == 'ams360')
            greenboxService.getAms360ActivityList($rootScope.user.domain_uuid);
    });
    $scope.registerNewTile = function(tileInfo) {
        if (!tileInfo.name) {
            tileInfo.name = tileInfo.goToUrl;
        };
        if (!tileInfo.allowed) {
            tileInfo.allowed = function() {
                return true;
            };
        }
        $scope.tiles[tileInfo.name] = tileInfo;
    };
    $scope.registerNewTile({
        title: 'Automated Messaging',
        faClass: 'fa fa-angle-double-right',
        goToUrl: 'automatedmessaging'
    });
    $scope.registerNewTile({
        title: 'Bridge Analytics [BETA]',
        faClass: 'fa fa-bar-chart',
        goToUrl: 'bridgeanalytics',
        /*allowed: function() { return userService.isAdminGroupOrGreater(); }*/
    });
    $scope.registerNewTile({
        title: 'Call Centre',
        faClass: 'mdi mdi-headset',
        goToUrl: 'callcenter',
        allowed: function() {
            return locationService.isManagerOfLocationType("callcenter");
        }
    });
    $scope.registerNewTile({
        title: 'Call History',
        faClass: 'fa fa-history',
        goToUrl: 'callhistory'
    });
    $scope.registerNewTile({
        title: 'Call Recording',
        faClass: 'fa fa-microphone',
        goToUrl: 'callrecording'
    });
    $scope.registerNewTile({
        title: 'Chat Plus',
        faClass: 'fa fa-comments',
        goToUrl: 'chatplus'
    });
    $scope.registerNewTile({
        title: 'Advanced Conference Calls',
        faClass: 'fa fa-volume-control-phone',
        goToUrl: 'conferencecall'
    });
    $scope.registerNewTile({
        title: 'Facebook Messenger',
        faClass: '',
        goToUrl: 'facebookmessenger',
        name: 'facebookmessenger',
        shouldTransclude: true,
        customClickFn: $scope.showMessengerModal
    });
    $scope.registerNewTile({
        title: 'Faxing',
        faClass: 'fa fa-fax',
        goToUrl: 'fax'
    });
    $scope.registerNewTile({
        title: 'Quote Sheets [BETA]',
        faClass: 'fa fa-file-text-o',
        goToUrl: 'quotesheets'
    });
    $scope.registerNewTile({
        title: 'Screen Share',
        faClass: 'fa fa-clone',
        goToUrl: 'screenshare'
    });
    $scope.registerNewTile({
        title: 'Store & Share',
        faClass: 'fa fa-cloud-upload',
        goToUrl: 'cloudstorage'
    });
    $scope.registerNewTile({
        title: 'Text Messaging',
        faClass: 'fa fa-paper-plane',
        goToUrl: 'sms'
    });
    $scope.registerNewTile({
        title: 'Activity Monitor',
        faClass: 'fa fa-clock-o',
        goToUrl: 'timeclockpro'
    });
    $scope.registerNewTile({
        title: 'Video Call',
        faClass: 'fa fa-video-camera',
        goToUrl: 'videoconference'
    });
    $scope.registerNewTile({
        title: 'Training',
        faClass: 'fa fa-info-circle',
        goToUrl: 'training',
        name: 'training',
        customClickFn: $scope.loadTrainingUrl
    });
    $scope.registerNewTile({
        title: 'Video Proposal [BETA]',
        faClass: 'fa fa-file-video-o',
        goToUrl: 'videoproposal'
    });
    // $scope.registerNewTile('Visual Voicemail', '', 'visualvoicemail', '', true);

    $scope.shouldTranscludeTile = function(tile) {
        return tile.title === 'Facebook Messenger';
    };

    function getTileOrder() {
        function getOrderInfo(tile) {
            if (!tile) return null;
            return {
                name: tile.name
            };
        };
        var activeTiles = $scope.activeTiles.map(getOrderInfo);
        var inactiveTiles = $scope.inactiveTiles.map(getOrderInfo);
        return {
            activeTiles: activeTiles,
            inactiveTiles: inactiveTiles
        };
    };

    $scope.saveDashboardOrder = function() {
        var data = {
            order: getTileOrder()
        };
        dataFactory.saveDashboardOrder(data).then(function(response) {
            if (response.data.success) {
                var tileOrder = response.data.success.data;
                $rootScope.user.settings.tile_order = JSON.stringify(tileOrder);
                loadNewTileOrder(tileOrder);
            }
        });
    };
    $scope.activeTiles = [];
    $scope.inactiveTiles = [];

    function loadNewTileOrder(tileOrder) {
        function getTileInfo(tile) {
            if (!tile) return null;
            return $scope.tiles[tile.name];
        }
        var missingTiles = [];
        var activeTiles = tileOrder.activeTiles.map(getTileInfo);
        var inactiveTiles = tileOrder.inactiveTiles.map(getTileInfo);
        var tileLength = activeTiles.length + inactiveTiles.length;
        var totalTileLength = Object.keys($scope.tiles).length;
        if (tileLength !== totalTileLength) {
            missingTiles = getMissingTiles(activeTiles);
        }
        angular.copy(_.concat(activeTiles, missingTiles), $scope.activeTiles);
        angular.copy(inactiveTiles, $scope.inactiveTiles);
        if (missingTiles.length > 0) {
            onTileOrderChanged();
        }
    };


    function getMissingTiles(activeTiles, inactiveTiles) {
        var allTiles = Object.keys($scope.tiles).map(function(key) {
            return $scope.tiles[key];
        });
        var missingTiles = _.difference(allTiles, activeTiles, inactiveTiles, 'name');
        return missingTiles;
    };

    metaService.registerOnRootScopeUserLoadCallback(function() {
        if ($rootScope.user.settings && $rootScope.user.settings.tile_order) {
            var tileOrder = JSON.parse($rootScope.user.settings.tile_order);
            loadNewTileOrder(tileOrder);
        } else {
            $scope.activeTiles = [];
            $scope.inactiveTiles = [];
            var tiles = Object.keys($scope.tiles).map(function(key) {
                return $scope.tiles[key];
            });
            angular.copy(tiles, $scope.activeTiles);
        }
    });

    function onTileOrderChanged() {
        $scope.saveDashboardOrder();
    };

    $scope.resetTiles = function() {
        var tiles = Object.keys($scope.tiles).map(function(key) {
            return $scope.tiles[key];
        });
        angular.copy(_.sortBy(tiles, ['title']), $scope.activeTiles);
        angular.copy([], $scope.inactiveTiles);
        onTileOrderChanged();
    };

    $scope.sortTilesAlphabetically = function() {
        angular.copy(_.sortBy($scope.activeTiles, ['title']), $scope.activeTiles);
        angular.copy(_.sortBy($scope.inactiveTiles, ['title']), $scope.inactiveTiles);
        onTileOrderChanged();
    };

    $scope.dashboardListScopes = {};

    $scope.registerNewDashboardListScope = function(tiles) {
        var id = Object.keys($scope.dashboardListScopes).length + 1;
        $scope.dashboardListScopes[id] = {
            tiles: tiles
        };
        return {
            id: id,
            scope: $scope.dashboardListScopes[id]
        };
    };

    $scope.removeTileFromList = function(list, tile, otherList, targetIndex) {
        function matchingTile(item) {
            return item.name === tile.name;
        };

        function notMatchingTile(item) {
            return !matchingTile(item);
        };
        _.remove(list, matchingTile);
        otherList.splice(targetIndex, 0, tile);
        onTileOrderChanged();
    };

    $scope.isFbTile = function(tile) {
        return tile && tile.name === 'facebookmessenger';
    };

    /*$scope.isVVTile = function(tile) {
        return tile.name === 'visualvoicemail';
    };*/

    $scope.tileOptions = function(index, active) {
        var list, otherList, tile;
        if (active) {
            list = $scope.activeTiles;
            otherList = $scope.inactiveTiles;
            tile = list[index];
            return [
                ['Hide', function() {
                    $scope.removeTileFromList(list, tile, otherList);
                }]
            ];
        } else {
            list = $scope.inactiveTiles;
            otherList = $scope.activeTiles;
            tile = list[index];
            return [
                ['Show', function() {
                    $scope.removeTileFromList(list, tile, otherList);
                }]
            ];
        }
    };

    $scope.isDemoAgency = function() {
        return userService.isDemoAgency();
    };

    $scope.showDemoModal = function() {
        var data = {
            closeModal: $rootScope.closeModal,
            limits: $rootScope.user.usageLimits
        };
        $rootScope.showModalWithData('/modals/demoinfo.html', data);
    };

    $rootScope.getUserToken = function() {
        if ($window.localStorage.getItem("userToken")) return $window.localStorage.getItem(
            "userToken");
        return null;
    };

    $rootScope.apiUrl = (__env.audioUrl && __env.audioUrl !== '' ? __env.audioUrl :
        symphonyConfig.audioUrl);

    $window.mainScope = $scope;
});
