'use strict';

var env = {};
var configVars = {};

if (typeof Object.assign != 'function') {
    Object.assign = function(target) {
        'use strict';
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        target = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source != null) {
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return target;
    };
}

// Import variables if present (from env.js)
if (window) {
    Object.assign(env, window.__env);
    if (!window.__env.apiUrl) window.__env.apiUrl = window.configParams.onescreenUrl;
    if (window.__env.apiUrl) window.configParams.audioUrl = window.__env.apiUrl;

    Object.assign(configVars, window.configParams);
}

function sessionToLocal() {
    if (sessionStorage) {
        angular.forEach(sessionStorage, function(item, key) {
            if (key !== 'refresh.key' && key !== 'refresh.status') {
                localStorage.setItem(key, item);
                sessionStorage.removeItem(key);
            } else {
                if (__env.enableDebug) console.log(key + " " + item);
            }
        });
    }
}
sessionToLocal();

angular.lowercase = function(text) {
    if (text) {
        return text.toLowerCase();
    } else {
        return null;
    }
};

var proySymphony = angular.module('symphonyApp', [
    'ngAnimate',
    'ngAria',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngMaterial',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ui.bootstrap',
    'mgcrea.ngStrap',
    'satellizer',
    'frapontillo.bootstrap-switch',
    'rzModule',
    'angular-websocket',
    'hc.marked',
    'angularMoment',
    'slugifier',
    'ngTagsInput',
    'pusher-angular',
    'angularFileUpload',
    'monospaced.elastic',
    'mgo-angular-wizard',
    'ngAudio',
    'angular-web-notification',
    'timer',
    'angular-js-xlsx',
    'googlechart',
    'kotterAudioRecorder',
    'vkEmojiPicker', 'angular-clipboard',
    'hljs',
    'ui.bootstrap.contextMenu',
    'ui.bootstrap.dropdownToggle',
    'ngDraggable',
    'ngIdle',
    'dndLists',
    'ngMaterialDatePicker',
    'mdPickers',
    'ae-datetimepicker',
    'md.data.table',
    'jlareau.bowser',
    'textAngular',
    'angularSpectrumColorpicker',
    'angularPayments',
    'ngFormBuilder',
    'formio',
    'material.components.eventCalendar',
    'nvd3',
    'ngCsv',
    'ngWebSocket',
    'ngWig',
    'firebase',
    'debounce'
]);

proySymphony.factory('_', ['$window', function($window) {
    return $window._;
}]);

proySymphony.factory('TawkAPI', ['$window', function($window) {
    return $window.Tawk_API;
}]);

proySymphony.value('treeViewDefaults', {
    foldersProperty: 'folders',
    filesProperty: 'files',
    displayProperty: 'folder_name',
    collapsible: true,
    showFiles: true
});

proySymphony.constant('__env', env);
if (__env.audioUrl) {
    configVars.audioUrl = __env.audioUrl;
}
proySymphony.constant('symphonyConfig', configVars);

function setAuthProfiderUrls($authProvider, __env, symphonyConfig) {
    $authProvider.loginUrl = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl : symphonyConfig.onescreenUrl) +
        '/newlogin';
    $authProvider.signupUrl = (__env.symphonyUrl && __env.symphonyUrl != '' ? __env.symphonyUrl :
        symphonyConfig.symphonyUrl) + '/login';
}
// Inject dependencies
setAuthProfiderUrls.$inject = ['$authProvider', '__env', 'symphonyConfig'];
proySymphony.config(setAuthProfiderUrls);
proySymphony.config(function($provide) {
    $provide.decorator('$locale', function($delegate) {
        if ($delegate.id == 'en-us') {
            $delegate.NUMBER_FORMATS.PATTERNS[1].negPre = '(\u00A4';
            $delegate.NUMBER_FORMATS.PATTERNS[1].negSuf = ')';
        }
        return $delegate;
    });
});

//for processing markup in chats
proySymphony.config(['markedProvider', function(markedProvider) {
    markedProvider.setRenderer({
        link: function(href, title, text) {
            return "<a href='" + href + "'" + (title ? " title='" + title +
                "'" : '') + " target='_blank'>" + text + "</a>";
        }
    });
}]);
proySymphony.config(function($compileProvider) {
    var val = __env.enableAngularDebug ? true : false;
    $compileProvider.debugInfoEnabled(val);
});
proySymphony.config(function($httpProvider) {
    $httpProvider.useApplyAsync(true);
    $httpProvider.defaults.headers.get = {};
});

proySymphony.config(function(recorderServiceProvider) {
    recorderServiceProvider
        //.forceSwf(false)
        .forceSwf(window.location.search.indexOf('forceFlash') > -1)
        .setSwfUrl('lib/recorder.swf')
        .withMp3Conversion(true);
});

proySymphony.config(function($mdThemingProvider) {

    $mdThemingProvider.definePalette('primary', {
        '50': '0073a5',
        '100': '0073a5',
        '200': '0073a5',
        '300': '0073a5',
        '400': '0073a5',
        '500': '0073a5',
        '600': '0073a5',
        '700': '0073a5',
        '800': '0073a5',
        '900': '0073a5',
        'A100': '0073a5',
        'A200': '0073a5',
        'A400': '0073a5',
        'A700': '0073a5',
        'contrastDefaultColor': 'light',

        'contrastDarkColors': ['50', '100',
            '200', '300', '400', 'A100'
        ],
        'contrastLightColors': undefined
    });

    $mdThemingProvider.theme('default')
        .primaryPalette('primary')
        .accentPalette('primary');

});

proySymphony.config(['$httpProvider', function($httpProvider) {
    //Remove the Interceptor that Satellizer has created
    $httpProvider.interceptors.splice(0, 1);
}]);

proySymphony.config(function(IdleProvider, KeepaliveProvider, __env) {
    IdleProvider.idle(__env.idleTime ? __env.idleTime : 14400);
    IdleProvider.timeout(__env.idleTimeout ? __env.idleTimeout : 30);
    KeepaliveProvider.interval(__env.idleKeepalive ? __env.idleKeepalive : 14400);
});

proySymphony.config(['formioComponentsProvider', 'FormioProvider', function(
    formioComponentsProvider, FormioProvider) {
    function customButtonHandler(answerData) {
        function getService(serviceName) {
            return angular.element(document.body).injector().get(serviceName);
        };
        var quoteSheetService = getService('quoteSheetService');
        // quoteSheetService.quoteEditorScope.saveQuote(answerData);
        quoteSheetService.quoteEditorScope.handleNewAnswerData(answerData);
    }
    formioComponentsProvider.register('button', {
        settings: {
            input: true,
            label: 'Submit',
            tableView: false,
            key: 'submit',
            size: 'md',
            leftIcon: '',
            rightIcon: '',
            block: false,
            disableOnInvalid: false,
            theme: 'primary',
            action: 'custom',
            custom: '(' + String(customButtonHandler) + ')' + "(data)"
        }
    });
    var components = formioComponentsProvider.$get().components;
    window.formioComponents = components;
    var componentsToRemove = ['survey', 'editgrid', 'custom', 'datagrid', 'container', 'file', 'resource', 'hidden', 'form', 'content', 'well', 'number', 'address'];
    var comp;
    components.select.title = "Drop Down";
    componentsToRemove.forEach(function(compName) {
        comp = components[compName];
        if (comp) {
            delete components[compName];
        }
    });
}]);

proySymphony.config(['$routeProvider',
    '$locationProvider',
    '__env',
    function($routeProvider,
        $locationProvider,
        __env
    ) {
        $routeProvider
            .when('/main', {
                templateUrl: 'views/main.html',
                controller: 'MainCtrl',
                controllerAs: 'main'
            })
            .when('/chatplus', {
                templateUrl: 'views/new-chatplus.html',
                controller: 'ChatPlusCtrl'
            })
            .when('/oldcallhistory', {
                templateUrl: 'views/callhistory.html'
            })
            .when('/callhistory', {
                templateUrl: 'views/callhistorynew.html'
            })
            .when('/callcenter', {
                // templateUrl: 'views/callcenter/newcallcenter.html',
                templateUrl: 'views/callcenter/callcenter3.html',
                controller: 'CallCenterCtrl'
            })
            .when('/reports', {
                templateUrl: 'views/reports.html',
                controller: 'ReportsCtrl',
                controllerAs: 'reports'
            })
            .when('/mobileupload', {
                templateUrl: 'views/mobileupload.html'
            })
            .when('/fax', {
                templateUrl: 'views/fax/vfax.html'
            })
            .when('/advfeatures', {
                templateUrl: 'views/advfeatures.html'
            })
            .when('/settings', {
                templateUrl: 'views/settings/settings.html'
            })
            .when('/settings/billing/:domainUuid', {
                templateUrl: 'views/settings/settings.html'
            })
            .when('/filesharing', {
                templateUrl: 'views/filesharing.html',
                controller: 'FileSharingCtrl',
                controllerAs: 'filesharing'
            })
            .when('/timeclockpro', {
                templateUrl: 'views/timeclockpro/dashboard.html',
                controller: 'TimeKeeperCtrl',
                controllerAs: 'timeclockpro'
            })
            .when('/cloudstorage', {
                templateUrl: 'views/cloudstorage/cloudstorage.html',
                controller: 'CloudFileCtrl',
                controllerAs: 'cloudstorage'
            })
            .when('/callrecording', {
                templateUrl: 'views/callrecording/callrecording.html',
                controller: 'CallRecordingCtrl',
                controllerAs: 'callrecording'
            })
            .when('/visualvoicemail', {
                templateUrl: 'views/visualvoicemail.html'
            })
            .when('/communications', {
                templateUrl: 'views/communications.html'
            })
            .when('/contactdetails/:cntID', {
                templateUrl: 'views/contactdetails.html',
                controller: 'ContactDetailsCtrl',
                controllerAs: 'contactDetails'
            })
            .when('/sms', {
                templateUrl: 'views/sms.html'
            })
            .when('/bluewave/:custKey', {
                templateUrl: 'views/bluewave.html'
            })
            .when('/billing/:urlCode', {
                templateUrl: 'views/bluewave.html'
            })
            .when('/public', {
                templateUrl: 'views/public.html',
                controller: 'PublicCtrl'
            })
            .when('/public/:type/:room', {
                templateUrl: 'views/public.html',
                controller: 'PublicCtrl'
            })
            .when('/video/:videoroom', {
                templateUrl: 'views/public.html',
                controller: 'PublicCtrl'
            })
            .when('/play/:urlCode', {
                templateUrl: 'views/publicplay.html',
                controller: 'PublicPlayCtrl'
            })
            .when('/cloud/:linkhash', {
                templateUrl: 'views/publiccloud.html',
                controller: 'PublicCloudCtrl'
            })
            .when('/conferencecall/', {
                templateUrl: 'views/calls/newconference.html'
            })
            .when('/screenshare', {
                templateUrl: 'views/screensharing/screenshare.html'
            })
            .when('/screenshare/:screenroom', {
                templateUrl: 'views/screenshare-public.html'
            })
            .when('/videoconference', {
                templateUrl: 'views/videoconference.html'
            })
            .when('/videoproposal', {
                templateUrl: 'views/videoproposal.html'
            })
            .when('/automatedmessaging', {
                templateUrl: 'views/autodialing/landingpage.html'
            })
            .when('/automatedmessaging/new', {
                templateUrl: 'views/autodialing/automaticdialing.html'
            })
            .when('/automatedmessaging/:rc_uuid', {
                templateUrl: 'views/autodialing/automaticdialing.html'
            })
            .when('/conversations', {
                templateUrl: 'views/conversations.html'
            })
            .when('/quotesheets', {
                templateUrl: 'views/quotesheets/quotesheets.html',
                controller: 'QuotesheetsCtrl'
            })
            .when('/quote-view/:linkhash', {
                templateUrl: 'views/quotesheets/quote-view.html',
                controller: 'QuotesheetsCtrl'
            })
            .when('/screenpop', {
                templateUrl: 'views/screenpop.html',
                controller: 'ScreenpopCtrl'
            })
            .when('/bridgeanalytics', {
                templateUrl: 'views/analytics/bridgeanalytics.html',
                controller: 'BridgeAnalyticsCtrl'
            })
            /**********  USERS OPTIONS   **********/
            .when('/login', {
                templateUrl: 'views/login.html',
                controller: 'LoginCtrl',
                controllerAs: 'login'
            })
            .when('/demosignup', {
                templateUrl: 'views/demo.html',
                controller: 'LoginCtrl',
                controllerAs: 'login'
            })
            .when('/signup', {
                templateUrl: 'views/login.html',
                controller: 'LoginCtrl',
                controllerAs: 'login'
            })
            .when('/signup/:package', {
                templateUrl: 'views/login.html',
                controller: 'LoginCtrl',
                controllerAs: 'login'
            })
            .when('/logout', {
                templateUrl: 'views/login.html',
                controller: 'LoginCtrl',
                controllerAs: 'login'
            })
            .when('/login/:resettoken/:resetemail', {
                templateUrl: 'views/login.html',
                controller: 'LoginCtrl',
                controllerAs: 'login'
            })
            .when('/login/:resettoken/:resetemail/:confirm', {
                templateUrl: 'views/login.html',
                controller: 'LoginCtrl',
                controllerAs: 'login'
            })
            .otherwise({
                redirectTo: '/main'
            });

        $locationProvider.html5Mode(true, true, true);
        $locationProvider.hashPrefix('!');
    }
]);

proySymphony.run(function($rootScope, $cookies, $location, amMoment, $window, Idle, $interval,
    $http, $pusher, $filter, dataFactory, usefulTools, __env, symphonyConfig, mmApi,
    packageService, $anchorScroll, $mdDialog, $timeout, contactGroupsService, tagService,
    contactService, chatService, conferenceService, cloudStorageService, locationService,
    callService, bowser, userService, audioLibraryService, musicOnHoldService, smsService,
    metaService, newChatService, chatMessages, newPusherService, statusService,
    emulationService, $sce, greenboxService, videoConfService, routeService, $auth) {
    function checkRefreshStatus() {
        if ($window.sessionStorage.getItem("refresh.status") && $window.sessionStorage.getItem(
                "refresh.key")) {
            var refreshkey = $window.sessionStorage.getItem("refresh.key");
            if (!refreshkey) {
                refreshkey = usefulTools.randomString(50);
                $window.sessionStorage.setItem("refresh.key", refreshkey);
            }
            var data = {
                refreshkey: refreshkey,
                milliseconds: (new Date).getTime()
            };
            return dataFactory.postSendRefresh(data)
                .then(function(response) {
                    return response;
                }, function(error) {
                    return 'false';
                });
        } else {
            return 'false';
        }
    }

    function refreshGreenBox() {
        if ($rootScope.user) {
            var filepath = '';
            var hsfilepath = '';
            if ($rootScope.user.greenbox_inboxFP) {
                filepath = $rootScope.user.greenbox_inboxFP;
            }
            if ($rootScope.user.greenbox_hsFP) {
                hsfilepath = $rootScope.user.greenbox_hsFP;
            }
            var data = {
                token: $rootScope.userToken,
                user_ext: $rootScope.user.user_ext,
                domain_uuid: $rootScope.user.domain_uuid,
                domain_name: $rootScope.user.domain.domain_name,
                user_uuid: $rootScope.user.user_uuid,
                screenshot_frequency: $rootScope.user.tk_screenshot_freq,
                esl_password: '',
                popupAfterAnswer: ($rootScope.user.popupAfterAnswer && $rootScope.user.popupAfterAnswer == 'true') ? 'true' : null,
                openScreenPop: ($rootScope.user.openScreenPop && $rootScope.user.openScreenPop == 'true') ? 'true' : null,
                screenPopPartner: ($rootScope.user.screenPopPartner && $rootScope.user.screenPopPartner == 'true') ? 'true' : null,
                inbox_file_path: {
                    path: filepath,
                    status: ''
                },
                hs_file_path: {
                    path: hsfilepath,
                    status: ''
                },
                partner_code: $rootScope.user.exportType.partner_code
            };

            var json = angular.toJson(data);
            greenboxService.refreshGB(json);
        }
    }

    $rootScope.gbInterval = $interval(refreshGreenBox, 10000);

    navigator.serviceWorker.register('scripts/service-workers/service-worker.js')
        .then(function(registration) {
            window.serviceWorkerRegistration = registration;
            registration.update();
        });
    $timeout(function() {
        if (window.serviceWorkerRegistration) window.serviceWorkerRegistration.update();
    });

    navigator.serviceWorker.addEventListener("message", function(event) {
        var data = event.data;
        if (data.action === "answer") {
            var call = Object.values(callListBase)[0];
            callService.answerCall(call.callID);
        } else if (data.action === "voicemail") {
            callService.sendToVoicemail();
        } else if (data.action === 'go-to-chat') {
            if (newChatService.lastNotifiedChannel) {
                var channel = newChatService.findChannelById(newChatService.lastNotifiedChannel);
                newChatService.setCurrentChannel(channel);
            }
            $location.path('/chatplus');
        } else if (data.action === 'go-to-sms') {
            if (smsService.lastNotifiedThread) {
                smsService.setCurrentThread(smsService.lastNotifiedThread);
            }
            $location.path("/sms");
        } else if (data.action === "go-to-missed-calls") {
            $location.search("missed", "true");
            $location.path("/callhistory");
        } else if (data.action === "go-to-voicemail") {
            $location.path("/visualvoicemail");
        } else if (data.action === "answer-video" || data.action === "decline-video") {
            videoConfService.inviteActions[data.action]();
        }
    });

    window.addEventListener("message", function(event) {
        function isVidConfOrigin(origin) {
            var validVidConfOrigins = [
                "http://localhost:3000",
                "https://dwebvideo.qa.kotter.net",
                "https://qa.video.kotter.net",
                "https://qa.myscreen.kotter.net",
                "https://qa.proposal.kotter.net",
                "https://staging.video.kotter.net",
                "https://staging.myscreen.kotter.net",
                "https://staging.proposal.kotter.net",
                "https://video.kotter.net",
                "https://myscreen.kotter.net",
                "https://proposal.kotter.net"
            ];
            return validVidConfOrigins.indexOf(origin) > -1;
        };
        if (isVidConfOrigin(event.origin)) {
            if (event.data.type === "request" && event.data.message === "vidConfData") {
                var imgUrl, given, family, firstGiven, firstFamily, initials, profileColor, fbinfo, user_uuid, domain_name;
                if ($rootScope.user) {
                    given = $rootScope.user.contact_name_given;
                    family = $rootScope.user.contact_name_family;
                    firstGiven = given.substring(0, 1);
                    firstFamily = family.substring(0, 1);
                    initials = firstGiven + " " + firstFamily;
                    profileColor = $rootScope.user.contact_profile_color;
                    fbinfo = $rootScope.user.fbinfo;
                    user_uuid = $rootScope.user.id;
                    domain_name = $rootScope.user.domain.domain_name;

                    if ($rootScope.user.contact_profile_image) {
                        imgUrl = $rootScope.pathImgProfile + $rootScope.user.contact_profile_image;
                    }
                }
                var response = {
                    type: "response", requestMessage: event.data.message,
                    message: {
                        token: $rootScope.userToken,
                        userData: {
                            avatarUrl: imgUrl, given: given, family: family,
                            initials: initials, profileColor: profileColor,
                            fbinfo: fbinfo, user_uuid: user_uuid,
                            domainName: domain_name
                        }
                    }
                };

                event.source.postMessage(response, event.origin);
            }
        }
    });

    Stripe.setPublishableKey(symphonyConfig.stripe_key);
    packageService.init();

    if (!$window.localStorage.getItem("satellizer_token")) $auth.logout();
    contactGroupsService.handleGoogleAuthIfIsRedirect();

    $anchorScroll.yOffset = 50;
    $rootScope.alerts = [];
    $rootScope.chatDisabled = __env.disableChat;
    $rootScope.symphonyUrl = (__env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl :
        symphonyConfig.symphonyUrl);

    if (__env.disableMobileCutoff) {
        angular.element('#main-container').attr('style', 'display: flex !important');
        angular.element('#try-mobile').attr('style', 'display: none !important;');
    }

    // see routeService for this code
    // $rootScope.$on("$routeChangeStart", function(event, next, current) {});

    contactService.registerOnUserContactLoadCallback(function() {
        newChatService.init();
    });
    metaService.registerOnRootScopeUserLoadCallback(function() {
        $rootScope.$broadcast('user.loaded');
        $rootScope.userLoaded = true;
        emulationService.init();
        tagService.getTags();
        contactService.setFirebaseContacts($rootScope.user.id, $rootScope.user.domain_uuid);
        contactGroupsService.setGroups();
        // contactGroupsService.getAllContactGroups();
        console.log("INITIALIZE SMS- app.js");
        smsService.init($rootScope.user.id);
        audioLibraryService.updateRingtoneSettings();
        musicOnHoldService.init();
        $window.localStorage.setItem("currentUser", JSON.stringify($rootScope.user));
        var username = $rootScope.user.contact_name_given;
        var email = $rootScope.user.email_address;
        $window.Tawk_API.visitor = {
            name: username,
            email: email,
            hash: 'b90b12e89d8bff10c374d38c036c934d1b3713af06940ae7b789ae9d22d78ab7'
        };
        $window.startTawk();
        callService.initialize();
        userService.initialize();

        if ($rootScope.user.tkRole) {
            //$rootScope.showTimer = true;
            $rootScope.$broadcast('show.timer');
        }

        if (__env.enableDebug) console.log("ROOTSCOPE USER");
        if (__env.enableDebug) console.log($rootScope.user);
        $rootScope.teamId = ($rootScope.user.symphony_domain_settings ? $rootScope.user.symphony_domain_settings.mattermost_team_id : '');
        $rootScope.chatUserId = ($rootScope.user.symphony_user_settings ? $rootScope.user.symphony_user_settings.mattermost_user_id : '');

        if ($rootScope.user.settings.idleTimeout) {
            var idleTimeout = $rootScope.user.settings.idleTimeout * 3600;
            Idle.setIdle(idleTimeout);
        }
        Idle.watch();
    });

    if ($auth.isAuthenticated()) {
        userService.performOnLoadMediaCheck();
        $rootScope.$broadcast('add.master.permissions.group');
    }
    if ($auth.isAuthenticated() && $window.localStorage.getItem("satellizer_token")) {
        console.log("TOKEN");
        console.log($rootScope.userToken);
        $rootScope.active = true;
        if ($rootScope.chatDisabled) {
            $rootScope.DisableChatMessage =
                'ChatPlus has been disabled from the environment.';
        }
        userService.getUserInfoByUuid()
            .then(function(response) {
                if (response) {

                    $rootScope.user = response;
                    metaService.performCallbackCollection(metaService.onRootScopeUserLoadCallbacks);
                    $rootScope.user.needSmsNumber = false;
                    if (!$rootScope.user.symphony_user_settings.sms_phone_number) {
                        $rootScope.user.needSmsNumber = true;
                    }
                }
            });
        if (!$rootScope.timeZones && $window.localStorage.getItem("timeZones") !== null)
            $rootScope.timeZones = JSON.parse($window.localStorage.getItem("timeZones"));
    }

    $rootScope.clearServices = function() {
        console.log("CLEAR SERVICES");
        $rootScope.active = false;
        // 
        cloudStorageService.clearInfo();
        emulationService.clearInfo();
        chatMessages.closeSocket(true);
        newChatService.clearInfo();
        locationService.clearInfo();
        contactGroupsService.clearInfo();
        conferenceService.clearInfo();
        userService.clearInfo();
        contactService.clearInfo();
        newChatService.reset();
        clearRootscopeVariables();
        $window.localStorage.clear();
        $window.sessionStorage.clear();
        $cookies.remove('userToken');
    };

    function clearRootscopeVariables() {
        if ($rootScope.curChannel) delete $rootScope.curChannel;
        if ($rootScope.user) delete $rootScope.user;
        if ($rootScope.nonContacts) delete $rootScope.nonContacts;
        if ($rootScope.userToken) delete $rootScope.userToken;
        if ($rootScope.teamId) delete $rootScope.teamId;
        if ($rootScope.mmProfile) delete $rootScope.mmProfile;
        if ($rootScope.teamUserKeys) delete $rootScope.teamUserKeys;
        if ($rootScope.allPreferences) delete $rootScope.allPreferences;
        if ($rootScope.channelMembers) delete $rootScope.channelMembers;
        if ($rootScope.availableChannels) delete $rootScope.availableChannels;
    };

    $rootScope.showAlert = function(title, message, multiple) {
        return $mdDialog.show(
            $mdDialog.alert()
            .clickOutsideToClose(true)
            .title(title)
            .htmlContent(message)
            .ok('Got it!')
            .multiple(multiple)
        );
    };

    function showChromeAlert() {
        var content = 'You can download it ' +
            '<a href="https://www.google.com/chrome/browser/desktop/index.html" ' +
            'target="_blank">' +
            'here</a>';
        $mdDialog.show(
            $mdDialog.alert()
            .clickOutsideToClose(true)
            .title('Bridge is best experienced through the Google Chrome web browser')
            .htmlContent(content)
            .ok('Got it!'));
    };

    if (!bowser.chrome && $location.path().substring(1, 9) !== 'bluewave') {
        $timeout(function() {
            showChromeAlert();
        });
    }

    $rootScope.showSuccessAlert = function(message, multiple) {
        if (!message) {
            message = "That's a bingo!";
        };
        return $rootScope.showAlert('Congratulations!', message, multiple);
    };

    $rootScope.showInfoAlert = function(message, multiple) {
        if (!message) {
            message = "Info";
        };
        return $rootScope.showAlert('Info ', message, multiple);
    };

    $rootScope.showErrorAlert = function(message, multiple) {
        if (!message) {
            message = 'Something went wrong.';
        };
        return $rootScope.showAlert('Uh-Oh :(', message, multiple);
    };

    $rootScope.showalerts = function(response) {
        if (response.data.error) {
            $rootScope.showErrorAlert(response.data.error.message);
        } else {
            $rootScope.showSuccessAlert(response.data.success.message);
        }
    };

    $rootScope.displayAlerts = function() {
        if ($rootScope.alerts.length > 0) {
            alert = $rootScope.alerts.shift();
            if (alert.success) {
                $rootScope.showSuccessAlert(alert.message).then(function() {
                    $rootScope.displayAlerts();
                });
            } else if (alert.error) {
                $rootScope.showErrorAlert(alert.message).then(function() {
                    $rootScope.displayAlerts();
                });
            }
        }
    };

    $rootScope.$watch('alerts.length', function(newVal, oldVal) {
        if (newVal > oldVal) {
            $rootScope.displayAlerts();
        }
    });

    $rootScope.confirmDialog = function(message, submessage, multiple) {
        var confirm = $mdDialog.confirm()
            .title(message)
            .textContent(submessage)
            .ok('Yes')
            .cancel('Nevermind')
            .multiple(multiple);
        return $mdDialog.show(confirm).then(function() {
            return true;
        }, function() {
            return false;
        });
    };

    $rootScope.confirmPrompt = function(title, content) {
        var confirm = $mdDialog.prompt()
            .title(title)
            .htmlContent(content)
            .ok('Yes')
            .cancel('Nevermind');
        return $mdDialog.show(confirm);
    };

    $rootScope.customPrompt = function(templateUrl, scope, onRemoving, multiple) {
        var promptPromise = $mdDialog.show({
            templateUrl: templateUrl,
            scope: scope,
            preserveScope: true,
            clickOutsideToClose: true,
            onRemoving: onRemoving,
            multiple: multiple
        });
        return function() {
            $mdDialog.hide();
        };
    };

    $rootScope.openSupportChat = function() {
        TawkAPI.maximize();
        TawkAPI.showWidget();
    };


    $rootScope.customFields = [];
    $rootScope.pendingSmsCount = [];

    $rootScope.alertTimeout = (__env.enableDebug ? '20000' : '4000');
    $rootScope.closeAlert = function(index) {
        if (typeof $rootScope.alerts === "undefined") {
            if (__env.enableDebug) console.log("alerts object is undefined");
            $rootScope.alerts.push({
                type: 'success',
                msg: 'Success: Symphony is good.'
            });
        } else {
            $rootScope.alerts.splice(index); //RAB
        }
    };
    $rootScope.contactPhones = [];
    $rootScope.contactEmails = [];
    $rootScope.fileSharingList = [];
    $rootScope.fileList = [];
    /********** FILTER  **********/
    $rootScope.currentPage = 0; //current page
    $rootScope.entryLimit = 0; //max no of items to display in a page
    $rootScope.filteredItems = 0; //Initially for no filter
    $rootScope.totalItems = 0;
    $rootScope.activePath = $location.path();
    $rootScope.pathImgProfile = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
        symphonyConfig.onescreenUrl) + '/imported/freeswitch/storage/avatars/';

    if (__env.pathImgProfile) {
        $rootScope.pathImgProfile = __env.apiUrl + __env.pathImgProfile;
    }

    $rootScope.onescreenBaseUrl = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl :
        symphonyConfig.onescreenUrl);
    $rootScope.chatApiUrl = (__env.mmUrl && __env.mmUrl !== '' ? __env.mmUrl :
        symphonyConfig.chatUrl);
    $rootScope.userLogin = false;
    $rootScope.userRole = 0;
    $rootScope.userEmail = '';
    $rootScope.phoneNumberTypes = ['Mobile', 'Work', 'Home', 'Fax'];
    $rootScope.contactTypes = ['Friend', 'Customer', 'Co-Worker', 'Vendor', 'Other'];
    $rootScope.selectMonths = [{
            display: 'January',
            value: '01'
        },
        {
            display: 'February',
            value: '02'
        },
        {
            display: 'March',
            value: '03'
        },
        {
            display: 'April',
            value: '04'
        },
        {
            display: 'May',
            value: '05'
        },
        {
            display: 'June',
            value: '06'
        },
        {
            display: 'July',
            value: '07'
        },
        {
            display: 'August',
            value: '08'
        },
        {
            display: 'September',
            value: '09'
        },
        {
            display: 'October',
            value: '10'
        },
        {
            display: 'November',
            value: '11'
        },
        {
            display: 'December',
            value: '12'
        }
    ];

    dataFactory.getStates()
        .then(function(response) {
            $rootScope.usStates = response.data;
        });

    $rootScope.putIconPhone = function(type) {
        if (type === 'Mobile') {
            return 'fa fa-mobile-phone cls-color-green-tkg';
        } else if (type === 'Work') {
            return 'fa fa-industry cls-color-blue-tkg';
        } else if (type === 'Home') {
            return 'fa fa-home cls-color-grey-tkg';
        } else if (type === 'Fax') {
            return 'fa fa-fax cls-color-red-tkg';
        }
        return null;
    };

    var range = [];
    var inityear = moment().format('YYYY');
    for (var i = inityear; i > inityear - 8; i--) {
        range.push(i);
    }

    $rootScope.loadingChannel = false;
    $rootScope.selectYears = range;
    $rootScope.contactaddition = {};
    $rootScope.testing = "HELP";
    $rootScope.showMissedCalls = false;
    $rootScope.delivery = {};
    $rootScope.roboCallUUID = '0';
    $rootScope.phoneList = [];
    $rootScope.actionContact = '';

    $rootScope.onCallWith = false;
    $rootScope.confcalloptions = null;

    $rootScope.tabContactGroup = false;

    $rootScope.callAudio = {};

});
