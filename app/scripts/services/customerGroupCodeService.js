'use strict';

proySymphony.service('customerGroupCodeService', function($http, $auth, $rootScope, $window,
    dataFactory, $filter) {

    var service = {};
    service.codes = [];

    // console.log($rootScope.user.accessgroup);
    // if ($auth.isAuthenticated() && $rootScope.user.accessgroup == 'superadmin') {

    service.setCustomerGroupCodes = function() {
        service.getGroupCodes().then(function(codes) {
            if (codes) {
                angular.copy(codes, service.codes);
                $window.localStorage.setItem("customerGroupCodes", JSON.stringify(
                    service.codes));
            }
        });
    };

    service.getGroupCodes = function() {
        return dataFactory.getGroupCodes()
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    return response.data.success.data;
                }
                return [];
            });
    };

    service.getCodeByName = function(name) {
        var i, input = service.codes;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].customer_group_code === name) return input[i];
        }
        return null;
    };

    // }

    // if ($auth.isAuthenticated() && $rootScope.user.accessgroup == 'superadmin') service.setCustomerGroupCodes();

    return service;
});
