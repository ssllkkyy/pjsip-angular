'use strict';

proySymphony.service('permissionGroupService', function($rootScope, $window, _, dataFactory,
    $filter, contactService, $uibModalStack, $auth) {

    var service = {};
    service.groups = [];

    service.setGroups = function() {
        if ($auth.isAuthenticated()) {
            //alert("DOING GROUPS");
            service.getPermissionGroups(domainUuid).then(function(response) {
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                    $rootScope.permissionsGroups = [];
                    return [];
                } else if (response.data.success) {
                    $rootScope.permissionsGroups = response.data.success.data;
                    if (__env.enableDebug) console.log("PERM GROUPS");
                    if (__env.enableDebug) console.log($rootScope.permissionsGroups);
                    $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                        $rootScope.permissionsGroups));
                }
            });
        }
    };


    return service;
});
