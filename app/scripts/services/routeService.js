"use strict";

proySymphony.service("routeService", function(metaService, $rootScope, __env, $routeParams,
    callService, smsService, $auth, $window, $location, $http, $q) {
    var service = {
        routeChangeStartCallbacks: {
            before: [],
            after: []
        }
    };

    service.init = function() {
        $rootScope.$on("$routeChangeStart", onRouteChangeStart);
    };

    service.registerRouteChangeCallback = function(eventName, eventStage, callback) {
        var callbackCollName = eventName + "Callbacks";
        var callbackObj = service[callbackCollName];
        if (callbackObj) {
            var callbackCollection = callbackObj[eventStage];
            if (callbackCollection) {
                callbackCollection.push(callback);
            }
        }
    };

    service.deregisterRouteChangeCallback = function(eventName, eventStage, callback) {
        var callbackCollName = eventName + "Callbacks";
        var callbackObj = service[callbackCollName];
        if (callbackObj) {
            var callbackCollection = callbackObj[eventStage];
            if (callbackCollection) {
                _.pull(callbackCollection, callback);
            }
        }
    };

    function performBeforeRouteChangeCallbacks(collection, routeChangeData) {
        var next = routeChangeData.next;
        var event = routeChangeData.event;

        function onConfirm() {
            service.allowRouteChange = true;
            $location.path(next.$$route.originalPath);
        };

        function performCallback(callback) {
            return callback(event, onConfirm);
        };

        function isPromise(value) {
            return value && Boolean(value.then);
        }
        var promises = collection.map(performCallback).filter(isPromise);
        $q.all(promises);
        return Boolean(promises.length);
    };

    function performCallbackColl(collection, routeChangeData) {
        var event = routeChangeData.event;
        var next = routeChangeData.next;
        var current = routeChangeData.current;
        collection.forEach(function(callback) {
            callback(event, next, current);
        });
    };

    function onRouteChangeStart(event, next, current) {
        console.log($routeParams);
        if (__env.enableDebug && current) {
            console.log('CUR TEMPLATE ' + current.templateUrl);
        }
        if (__env.enableDebug) {
            console.log('NEXT TEMPLATE ' + next.templateUrl);
        }

        if (!service.allowRouteChange) {
            var hasPromises = performBeforeRouteChangeCallbacks(
                service.routeChangeStartCallbacks.before, {
                    event: event,
                    next: next,
                    current: current
                }
            );
            if (hasPromises) {
                return;
            }
        } else {
            service.allowRouteChange = false;
        }

        if (next.templateUrl == "views/login.html") {
            $rootScope.onLoginPage = true;
        } else {
            $rootScope.onLoginPage = false;
            callService.processOnBridgeEntryCallbacks();
        }
        if (next.templateUrl !== 'views/sms.html') {
            smsService.smsInFocus = false;
        }
        if (next.templateUrl === 'views/sms.html') smsService.smsInFocus = true;
        if (next.originalPath === "/logout") {
            window.location.href = __env.symphonyUrl + "/login";
        }
        var shouldLogout = !$auth.isAuthenticated() ||
            !$window.localStorage.getItem("satellizer_token") ||
            !$window.localStorage.getItem("currentUser");

        if (shouldLogout) {
            var exceptions = [
                'views/login.html', 'views/demo.html', 'views/bluewave.html',
                'views/publiccloud.html', 'views/publicplay.html', 'views/public.html',
                'views/screenshare-public.html'
            ];
            if (exceptions.indexOf(next.templateUrl) < 0) {
                if (__env.enableDebug) console.log("NOT LOGGED IN");
                $rootScope.clearServices();
                $window.localStorage.clear();
                if (__env.enableDebug) console.log("LOGGING YOU OUT - INSIDE ON");
                $location.path("/login");
            }
        } else {
            if ($window.localStorage.getItem("userToken") !== null) {
                $rootScope.userToken = $window.localStorage.getItem("userToken");
                $http.defaults.headers.common['Authorization'] = 'Bearer ' + $rootScope.userToken;
            }
            if (!$rootScope.user) {
                $rootScope.user = JSON.parse($window.localStorage.getItem("currentUser"));
            }
            if (!$rootScope.teamId) {
                $rootScope.teamId = $rootScope.user.symphony_domain_settings.mattermost_team_id;
            }
        }
        performCallbackColl(
            service.routeChangeStartCallbacks.after, {
                event: event,
                next: next,
                current: current
            }
        );
    };

    service.init();
    return service;
});
