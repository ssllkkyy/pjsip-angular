'use strict';

proySymphony.service('emailService', function(callService, $window, $rootScope, $timeout) {

    var service = {};

    service.startEmailClient = function(address, subject, body) {
        //var href = 'mailto:' + address;
        var href = '?to=' + address;
        if (subject || body) {
            href += '&';
            if (subject) {
                href += 'subject=';
                angular.forEach(subject.split(), function(word) {
                    href += word + '%20';
                });
            }
            if (body) {
                if (subject) {
                    href += '&';
                }
                href += 'body=';
                angular.forEach(body.split(), function(word) {
                    href += word + '%20';
                });
            }
        }
        $window.localStorage.setItem("openEmail", href);
        $window.open($rootScope.onescreenBaseUrl + '/sendemail.html' + href, '_blank');
    };

    service.validEmailAddress = function(email) {
        if (!email) return false;
        var validator =
            /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return validator.test(email);
    };

    return service;
});