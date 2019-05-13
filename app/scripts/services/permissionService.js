'use strict';

proySymphony.service('permissionService', function(emulationService, $rootScope, __env, dataFactory,
    $window, $uibModalStack, fileService, contactService) {

    var service = {
        availContactGroupManagers: []
    };

    service.createNewPermissionsGroup = function(group) {
        var data = service.preparePermGroupData(group, null);
        data.file = group.file;
        var formData = fileService.convertObjectToFormData(data);
        if (data.errors.length === 0) {
            dataFactory.postCreatePermissionGroup(formData)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        if (!$rootScope.permissionsGroups) $rootScope.permissionsGroups = [];
                        var group = response.data.success.data;
                        group.communications = JSON.stringify(group.communications);
                        $rootScope.permissionsGroups.push(group);
                        $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                            $rootScope.permissionsGroups));
                        reloadEmulationStatus();
                        $uibModalStack.dismissAll();
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            var string = '';
            angular.forEach(data.errors, function(error) {
                string += (string.length !== 0 ? ', ' : '') + error;
            });
            $rootScope.alerts.push({
                error: true,
                message: 'Error: ' + string
            });
        }
    };

    function getCurrentDomainUuid() {
        var domainUuid;
        if (emulationService.emulatedCompany) {
            domainUuid = emulationService.emulatedCompany.domain_uuid;
        } else {
            domainUuid = $rootScope.user.domain.domain_uuid;
        }
        return domainUuid;
    };

    service.getUsersWithContactGroupPermissions = function() {
        dataFactory.getUsersWithGroupPermissions()
        .then(function(response){
            var users = [];
            console.log(response.data.success.data);
            angular.forEach(response.data.success.data, function(uuid){
                var contact = contactService.getContactByUserUuid(uuid);
                console.log(contact);
                if (contact && !contactService.isKotterTechUser(contact)) users.push(contact);
            });
            console.log(users);
            service.availContactGroupManagers = users;
        });
    };

    service.preparePermGroupData = function(group, index) {
        if (__env.enableDebug) console.log(group);
        var errors = [];
        var list = [];
        angular.forEach(group.communication_options, function(key, value) {
            if (key === true) list.push(value);
        });
        var list2 = [];
        angular.forEach(group.member, function(key, value) {
            if (key === true) list2.push(value);
        });
        var list3 = [];
        angular.forEach(group.manager, function(key, value) {
            if (key === true) list3.push(value);
        });
        if (list.length === 0) errors.push(
            'At least one Communication Channel must be selected.');
        if (list2.length === 0) errors.push('At least one Member must be specified.');
        if (list3.length === 0) errors.push('At lease one Manager must be specified.');

        var data = {
            permissions_group_uuid: (index !== null ? $rootScope.permissionsGroups[
                index].permissions_group_uuid : null),
            group_name: group.group_name,
            group_color: (group.group_color ? group.group_color : null),
            group_communications: list,
            group_members: list2,
            group_managers: list3,
            errors: errors
        };
        if (!data.domain_uuid) {
            data.domain_uuid = getCurrentDomainUuid();
        }
        return data;
    }

    function reloadEmulationStatus() {
        dataFactory.getManagerEmulationStatus()
            .then(function(response) {
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                } else {
                    $rootScope.emulationStatus = response.data.success.data;
                    $window.localStorage.setItem("emulationStatus", JSON.stringify(
                        $rootScope.emulationStatus));
                    if (__env.enableDebug) console.log("MANAGER EMULATION STATUS");
                    if (__env.enableDebug) console.log($rootScope.emulationStatus);
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    }

    return service;
});
