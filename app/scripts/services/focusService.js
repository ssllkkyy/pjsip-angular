'use strict';

proySymphony.service('focusService', function($rootScope, $timeout, $window) {

    var service = {
        inFocus: true
    };

    var onFocus = function() {
        service.inFocus = true;
        $timeout(function() {
            $rootScope.$apply();
        });
    }
    var onBlur = function() {
        service.inFocus = false;
        $timeout(function() {
            $rootScope.$apply();
        });
    }
    $window.onfocus = onFocus;
    $window.onblur = onBlur;

    return service;
});
