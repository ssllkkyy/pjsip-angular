(function(window) {
    'use strict';

    window.angular
        .module('ngDesktopNotification', [])
        .provider('desktopNotification', desktopNotification)
        .constant('PERMISSIONS', {
            DEFAULT: 'default',
            GRANTED: 'granted',
            DENIED: 'denied'
        });

    /* @ngInject */
    function desktopNotification() {
        var settings = {
            autoClose: true,
            duration: 15,
            showOnPageHidden: false
        };

        return {
            config: config,
            $get: ['$q', '$timeout', 'PERMISSIONS', factory]
        };

        function config(options) {
            for (var key in options) {
                if (settings.hasOwnProperty(key) && options[key] != undefined) {
                    settings[key] = options[key];
                }
            }
        }

        function factory($q, $timeout, PERMISSIONS) {
            var Notification = window.Notification || window.mozNotification || window.webkitNotification,
                service = {
                    isSupported: isSupported,
                    currentPermission: currentPermission,
                    requestPermission: requestPermission,
                    show: showNotification,
                    permissions: {
                        'default': PERMISSIONS.DEFAULT,
                        'granted': PERMISSIONS.GRANTED,
                        'denied': PERMISSIONS.DENIED
                    }
                };

            return service;

            // Public API

            function isSupported() {
                return !(typeof Notification === 'undefined');
            }

            function currentPermission() {
                // Wrap with a function, so that we can extend this easily to
                // support getting permissions using older API versions
                return (Notification || {}).permission;
            }

            function requestPermission() {
                if (!isSupported()) return $q.reject('Notification API not supported');

                var deferred = $q.defer();

                Notification.requestPermission().then(requestPermission);
                return deferred.promise;

                // Convert the ES6 promise to angular's $q promise
                function requestPermission(permission) {
                    if (PERMISSIONS.GRANTED === permission) {
                        deferred.resolve(permission);
                    } else {
                        deferred.reject(permission);
                    }
                }
            }

            function showNotification(title, options) {
                // Ensures that options is always an object
                options = options || {};

                // Check first if supported, validate arguments, then check if
                // showOnPageHidden property is set to true, if yes then proceed
                // on checking if page is visible, lastly check if
                // notification is disabled by the client
                if (!isSupported() || !_isArgsValid(title, options) ||
                    _isPageVisible(options.showOnPageHidden) ||
                    currentPermission() !== PERMISSIONS.GRANTED) return;

                var notification = new Notification(title, options),
                    autoClose = (options.autoClose === undefined) ? settings.autoClose :
                    options.autoClose,
                    duration = options.duration || settings.duration;

                notification.onclick = options.onClick;

                // If autoClose is set to true, close the notification using the duration
                if (autoClose) _autoCloseAfter(notification, duration);

                return notification;
            }

            // Private functions

            function _isArgsValid(title, options) {
                var isTitleString = angular.isString(title),
                    isOnClickFunction = (!options.onClick || angular.isFunction(options.onClick));

                return (isTitleString && isOnClickFunction);
            }

            function _isPageVisible(showOnPageHidden) {
                // Check both showOnPageHidden parameter and default
                if (!showOnPageHidden && !settings.showOnPageHidden) return;

                return !(
                    window.document.hidden ||
                    // Uncomment when MS support is added
                    // window.document.msHidden ||
                    window.document.mozHidden ||
                    window.document.webkitHidden
                );
            }

            function _autoCloseAfter(notification, duration) {
                var durationInMs = duration * 1000;
                $timeout(notification.close.bind(notification), durationInMs, false);
            }
        }
    }
})(window);
