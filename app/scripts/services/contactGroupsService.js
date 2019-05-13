'use strict';

proySymphony.service('contactGroupsService', function($mdDialog, $rootScope, $window, _,
    dataFactory, $filter, contactService, $uibModalStack, $auth, $location, $routeParams,
    $timeout, userService) {

    var service = {
        groups: [],
        selectedGroups: {},
        allGroups: [],
        groupLimit: 100,
        settingGroups: false
    };

    service.setGroups = function() {
        if ($auth.isAuthenticated() && !service.settingGroups) {
            service.settingGroups = true;
            // return service.getContactGroups().then(function(groups) {
            return service.getAllContactGroups().then(function(groups) {
                if (groups) {
                    service.groups = groups;
                    contactService.contactGroups = service.groups;
                    return service.groups;
                }
                service.settingGroups = false;
                return groups;
            });
        }
    };

    service.getAllContactGroups = function() {
        var domainUuid = $rootScope.user.domain_uuid;
        return dataFactory.getAllContactGroups(domainUuid)
        .then(function(response){
            if (response.data.success) {
                var groups = response.data.success.data;
                console.log(groups);
                service.groups = groups;
                service.groupLimit = response.data.success.limit;
                return groups;
            }
        });
    };

    service.userIsManagerOfGroup = function(userUuid, group) {
        var isManager = group.managers.indexOf(userUuid) !== -1;
        return isManager;
    };

    service.userIsViewerOfGroup = function(userUuid, group) {
        var isMemberOfViewerGroup = false;
        var contact = contactService.getContactByUserUuid(userUuid);
        if (contact) {
            var isViewer = group.viewer_users.indexOf(contact.cuuid) !== -1;
            if (isViewer) return true;
            
            var i, input = group.viewer_groups, len = group.viewer_groups.length;
            for (i = 0; i < len; i++) {
                var g = service.getGroupByUuid(input[i]);
            // angular.forEach(group.viewer_groups, function(vg){
                if (g && g.members.indexOf(contact.cuuid) !== -1) {
                    isMemberOfViewerGroup = true;
                    break;
                }
            }
        }
        return isMemberOfViewerGroup;
    };

    service.addContactToGroup = function(contactUuid, groupUuid) {
        var data = {
            contact_uuid: contactUuid,
            group_uuid: groupUuid
        };

        return dataFactory.postAddContactToGroup(data).then(function(response) {
            if (response.data.success) {
                var contact = response.data.success.data;
                var group = service.getGroupByUuid(groupUuid);
                group.contacts = service.getContactRetrievalFuncForGroup(group);
                //group.contacts.push(contact);
                group.members.push(contact.contact_uuid);
            }
        });
    };

    service.getContactGroups = function() {
        return dataFactory.getViewableContactGroups($rootScope.user.domain_uuid)
            .then(function(response) {
                if (response.data.error) {
                    console.log(response.data.error.message);
                    return undefined;
                } else {
                    console.log("CONTACT GROUPS RETRIEVED");
                    console.log(response.data.success.data);
                    var groups = response.data.success.data;
                    filterNonDomainGroups(groups);
                    // service.attachContactRetrievalFuncs(groups);
                    service.attachManagersToGroups(groups);
                    service.groupLimit = response.data.success.limit;
                    return groups;
                }
            }, function(error) {
                console.log('ERROR RETRIEVING CONTACT GROUPS');
                console.log(error);
            });
    };

    service.attachContactRetrievalFuncs = function(groups) {
        var group;
        for (var i = 0; i < groups.length; i++) {
            group = groups[i];
            group.contacts = service.getContactRetrievalFuncForGroup(group);
        }
    };

    service.getContactRetrievalFuncForGroup = function(group) {
        return function() {
            return group.members.map(function(member) {
                return contactService.getContactByUuid(member);
            }).filter(function(contact) {
                return !!contact;
            });
        };
    };

    service.createGroup = function(data) {
        return dataFactory.postNewContactGroup(data)
            .then(function(response) {
                console.log(response);
                $rootScope.showalerts(response);
                if (response.data.success) {
                    var group = response.data.success.data;
                    service.handleNewGroup(group);
                }
                return response.data;
            });
    };

    service.privateContacts = function() {
        var priv = [];
        var pub = [];
        angular.forEach(service.groups, function(group){
            if (group.priv) {
                priv = _.union(priv, group.members);
            } else {
                pub = _.union(pub, group.members);
            }
        });
        priv =  _.remove(priv, function(n) {
          return pub.indexOf(n) === -1;
        });
        return priv;
    };

    service.handleNewGroup = function(group) {
        service.groups.push(group);
        $rootScope.$broadcast('contact.group.updated', group);
    };

    service.groupExists = function(groupUuid) {
        var i;
        for (var i = 0; i < service.groups.length; i++) {
            if (service.groups[i].group_uuid === groupUuid) return true;
        }
        return false;
    };

    service.contactIsGroupManager = function(contact, group) {
        var result = false;
        angular.forEach(group.managers, function(manager) {
            if (manager.contact_uuid === contact.contact_uuid) {
                result = true;
            }
        });
        return result;
    };

    service.setGroupManagers = function(managers, group) {
        return group.managers = managers;
    };

    service.setManagersList = function(group, managerUuids, viewerUpdateFn) {
        var data = {
            'group_uuid': group.group_uuid,
            'manager_uuids': managerUuids
        };
        dataFactory.postSetUsersAsGroupManagers(data)
            .then(function(response) {
                if (response.data.success) {
                    // var contacts = managerUuids.map(function(uuid) {
                    //     return contactService.getContactByUuid(uuid);
                    // });
                    group.managers = managerUuids;
                    group.viewer_users = response.data.success.viewer_users;
                    // service.addGroupManagersToViewerList(group);
                    // service.setGroupManagers(contacts, group);
                    // service.addGroupManagersToViewerList(group, viewerUpdateFn);
                    return group;
                }
                return undefined;
            });
    };

    service.getMemberListForGroup = function(group) {
        var member_list = {};

        angular.forEach(group.members, function(contact) {
            member_list[contact] = true;
        });
        return member_list;
    };

    service.addGroupManagersToViewerList = function(group, viewerUpdateFn) {
        var viewerMembers = {};
        var viewerGroups = {};
        angular.forEach(group.viewer_users, function(viewer) {
            viewerMembers[viewer] = true;
        });
        angular.forEach(group.managers, function(manager) {
            viewerMembers[manager] = true;
        });
        angular.forEach(group.viewer_groups, function(viewerGroup) {
            viewerGroups[viewerGroup.view_group_uuid] = true;
        });
        viewerUpdateFn()(group.group_uuid, viewerGroups, viewerMembers);
    };

    service.revokeManagerStatus = function(manager, group, viewerUpdateFn) {
        var index = group.managers.indexOf(manager);
        if (index !== -1) {
            group.managers.splice(index, 1);
        }
        service.setManagersList(group, group.managers, viewerUpdateFn);
    };

    service.deleteGroup = function(group) {
        var data = {
            group_uuid: group.group_uuid
        };
        dataFactory.deleteGroup(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    var index = $filter('getGroupIndexbyUUID')(service.groups,
                        group.group_uuid, '');
                    service.groups.splice(index, 1);
                    $uibModalStack.dismissAll();
                }
            }, function(error) {
                console.log(error);
            });
    };

    // ********************import settings functions*********************

    service.saveImportSettings = function(data){
        return dataFactory.postSaveContactImportSettings(data)
        .then(function(response){
            if (response.data.success){
                console.log('SETTINGS SAVED', response );
                return response;
            }
        })
    };

    service.updateImportSettings = function(data){
        return dataFactory.postUpdateContactImportSettings(data)
        .then(function(response){
            if (response.data.success){
                console.log("SETTINGS UPDATED", response);
                return response;
            } else {
                console.log("There was a problem updating the settings.");
                return false;
            }
        })
    }

    service.getImportSettingsByType = function(settingType){
        return dataFactory.getImportSettingsByType(settingType)
        .then(function(response){
            console.log(['Settings from Service', settingType, response]);
            if (response.data.success){
                return response.data.success.data;
            } else {
                console.log("Settings by Type not returned");
                return false;
            }
        });
    };

    service.getImportSettingsBySettingUuid = function(settingUuid){
        return dataFactory.getImportSettingsBySettingUuid(settingUuid)
        .then(function(response){
            console.log(["Setting By settingUuid", settingUuid, response])
            if (response.data.success){
                return response.data.success.data;
            } else {
                console.log("Settings by Setting Uuid not returned");
                return false;
            }
        })
    }

    service.deleteSingleImportSetting = function(settingUuid){
        return dataFactory.deleteSingleImportSetting(settingUuid)
        .then(function(response){
            console.log(['Delete Response', response.data.success]);
            return response.data.success;
        })
    };

    // ********************END import settings functions*****************

    service.retrieveGroupMemberUuids = function(group) {
        var uuids = [];
        angular.forEach(group.members, function(member) {
            uuids.push(member.contact_uuid);
        });
        return uuids;
    };

    service.getGroupByUuid = function(groupUuid) {
        var matchingGroup = null;
        angular.forEach(service.groups, function(group) {
            if (group.group_uuid === groupUuid) {
                matchingGroup = group;
            }
        });
        return matchingGroup;
    };

    service.removeGroupFromView = function(groupinfo) {
        var group = service.getGroupByUuid(groupinfo.group_uuid);
        if (group) {
            if (group.owner_uuid !== $rootScope.user.id) {
                // angular.forEach(group.members, function(member){
                //     var count = service.contactInGroupCount(member);
                //     if (count === 1) contactService.deleteContactFromList(member);
                // });
                // var index = $filter('getByUUID')(service.groups, groupinfo.group_uuid, 'group');
                if (index !== null) service.groups.splice(index, 1);
            }
        }
    };

    service.addUpdateGroupToView = function(groupinfo) {
        dataFactory.getLoadGroupByUuid(groupinfo.group_uuid)
            .then(function(response) {
                if (response.data.success) {
                    console.log(response.data.success.data);
                    // var group = response.data.success.data;
                    // group.contacts = service.getContactRetrievalFuncForGroup(group);
                    var exists = service.getGroupByUuid(groupinfo.group_uuid);
                    if (exists) {
                        var index = $filter('getByUUID')(service.groups, groupinfo.group_uuid,
                            'group');
                        angular.copy(response.data.success.data, service.groups[
                            index]);

                    } else {
                        service.groups.push(response.data.success.data);
                    }
                    $rootScope.$broadcast('group.contacts.added');
                }
            });
    };

    service.contactInGroupCount = function(contactUuid) {
        var count = 0;
        angular.forEach(service.groups, function(group) {
            if (group.members.indexOf(contactUuid) !== -1) count += 1;
        });
        return count;
    };

    service.hideGroup = function(group) {
        var data = {
            'user_uuid': $rootScope.user.id,
            'group_uuid': group.group_uuid
        };
        dataFactory.postToggleGroupHide(data)
        .then(function(response) {
            var message;
            if (response.data.success) {
                message = response.data.success.message;
                var update = service.getGroupByUuid(data.group_uuid);
                if (response.data.success.data === false) {
                    update.hidden.push($rootScope.user.id);
                } else {
                    var index = update.hidden.indexOf($rootScope.user.id);
                    if (index !== -1) update.hidden.splice(index, 1);
                }
            } else {
                message = response.data.error.message;
            };
            console.log(message);
        });
    };

    service.removeContactFromGroupsByUuid = function(contactUuid) {
        angular.forEach(service.groups, function(group) {
            /*if (group.contacts) {
                group.contacts = group.contacts
                    .filter(propertyFilterConstructor('contact_uuid', contactUuid));
            }*/
            if (group.managers) {
                group.managers = group.managers
                    .filter(propertyFilterConstructor('contact_uuid',
                        contactUuid));
            }
            if (group.members) {
                group.members = group.members
                    .filter(propertyFilterConstructor('contact_uuid',
                        contactUuid));
            }
        });
    };

    // Google People (Contacts) API

    service.authGoogle = function() {
        $window.localStorage.setItem('preAuthNavigationRoute', $location.path());
        dataFactory.getGmailAuthUrl().then(function(response) {
            $window.location.href = response.data;
        });
    };

    service.handleGoogleAuthIfIsRedirect = function() {
        if (service.isLoadedAfterRedirect()) {
            service.handleGoogleAuthRedirect();
        }
    };

    service.isLoadedAfterRedirect = function() {
        return !!$window.localStorage.getItem('preAuthNavigationRoute');
    };

    service.bulkAssignToGroup = function(data) {
        return dataFactory.postBulkAssignToGroup(data)
        .then(function(response){
            return service.setGroups()
            .then(function(groups){
                if (response.data.success) {
                    var group = service.getGroupByUuid(data.group);
                    response.data.success.group = group;
                }
                return response;
            });
        });
    };
    service.bulkRemoveFromGroup = function(data) {
        return dataFactory.postBulkRemoveFromGroup(data)
        .then(function(response){
            return service.setGroups()
            .then(function(groups){
                if (response.data.success) {
                    var group = service.getGroupByUuid(data.group);
                    response.data.success.group = group;
                }
                return response;
            });
        });
    };

    service.updateGroupViewers = function(groupUuid, groups, viewers) {
        var group = service.getGroupByUuid(groupUuid);
        var list = [];
        angular.forEach(viewers, function(key, viewer) {
            if (key === true) list.push(viewer);
        });
        var list2 = [];
        angular.forEach(groups, function(key, member) {
            if (key === true) list2.push(member);
        });
        var data = {
            group_uuid: groupUuid,
            user_viewers: list,
            group_viewers: list2
        };
        if (__env.enableDebug) console.log(data);
        return dataFactory.postUpdateGroupContactViewerList(data)
            .then(function(response) {
                if (response.data.success) {
                    if (__env.enableDebug) console.log(response.data);
                    group.viewer_groups = response.data.success.viewer_groups;
                    group.viewer_users = response.data.success.viewer_users;
                    return response;
                }
            });
    };

    service.removeUserFromViewGroup = function(groupUuid, view_contact_uuid) {
        var group = service.getGroupByUuid(groupUuid);
        var data = {
            group_uuid: groupUuid,
            view_contact_uuid: view_contact_uuid
        };
        console.log(data);
        return dataFactory.deleteGroupViewerUser(data)
            .then(function(response) {
                if (response.data.success) {
                    group.viewer_users = response.data.success.data;
                }
                return response;
            });
    };

    service.removeGroupFromViewGroup = function(groupUuid, view_group_uuid) {
        var group = service.getGroupByUuid(groupUuid);
        var data = {
            group_uuid: groupUuid,
            view_group_uuid: view_group_uuid
        };
        return dataFactory.deleteGroupViewerGroup(data)
            .then(function(response) {
                if (response.data.success) {
                    group.viewer_groups = response.data.success.data;
                }
                return response;
            });
    };

    service.handleGoogleAuthRedirect = function() {
        $location.path($window.localStorage.getItem('preAuthNavigationRoute'));
        $window.localStorage.removeItem('preAuthNavigationRoute');
        $timeout(function() {
            var gmailAccessToken = {
                access_token: $routeParams.access_token,
                token_type: $routeParams.token_type,
                expires_in: parseInt($routeParams.expires_in),
                created: parseInt($routeParams.created)
            };
            $rootScope.user.gmailAccessToken = gmailAccessToken;
            service.resetRouteParams();
            service.importGmailContacts2();
        }, 2000);
    };

    service.resetRouteParams = function() {
        $location.url($location.path());
    };

    service.testmethod = function() {
        service.specifyContactGroup()
            .then(function(response) {
                service.data = response;
                console.log(service.data);
            }, function(response) {
                //$scope.data = "cancelled";
            });
    };

    service.importGmailContacts2 = function() {
        var contactParams;
        var phoneParams;
        var packagedContacts;
        var targetGroup = $window.localStorage.getItem("importGmailContactsTo") ?
            $window.localStorage.getItem("importGmailContactsTo") : null;
        var token = $rootScope.user.gmailAccessToken;
        var data = {
            token: token,
            userUuid: $rootScope.user.id,
            targetGroup: targetGroup
        };
        if (token) {
            dataFactory.postImportGmailContacts(data);
            var message =
                'We have initiated your Gmail contact import. It will be run in the background and notify you upon completion. You can continue working in Bridge in the meantime.';
            $rootScope.showInfoAlert(message);
        }
    };

    service.importGmailContacts = function() {
        var contactParams;
        var phoneParams;
        var packagedContacts;
        var token = $rootScope.user.gmailAccessToken;
        if (token) {
            dataFactory.postGetGmailContacts(token).then(function(response) {
                console.log("IMPORTED DATA");
                console.log(response.data.success.data);
                if (response.data.success.data) {
                    var gmailContacts = response.data.success.data;
                    packagedContacts = packageGmailContactsForContactCreation(
                        gmailContacts);
                    var targetGroup = $window.localStorage.getItem(
                        "importGmailContactsTo") ? $window.localStorage.getItem(
                        "importGmailContactsTo") : null;
                    console.log("TARGET GROUP");
                    console.log(targetGroup);
                    contactService.batchCreateContacts(packagedContacts)
                        .then(function(groupContacts) {
                            if (targetGroup) {
                                service.addContactsToGroup(groupContacts,
                                    targetGroup);
                            }
                        });
                }
            });
        }
    };

    service.addContactsToGroup = function(groupContacts, importTo) {
        angular.forEach(groupContacts, function(contact) {
            service.addContactToGroup(contact.contact_uuid, importTo);
        });
    };

    service.specifyContactGroup = function(element) {
        var parentEl = angular.element(document.body);
        service.failednames = '';
        angular.forEach(service.failedImport, function(name) {
            service.failednames += (service.failednames.length !== 0 ? ', ' :
                '') + name;
        });
        console.log(service.groups);
        return $mdDialog.show({
            templateUrl: '/views/company/googlecontacts.html',
            locals: {
                data: "Pass Any Variable"
            },
            parent: parentEl,
            clickOutsideToClose: true,
            controller: function($scope, contactGroupsService) {
                $scope.contactTarget = undefined;
                $scope.groups = contactGroupsService.groups;
                $scope.validMessage = 'There are ' + contactGroupsService.contactsImport
                    .length + 'contacts ready to be imported.';

                $scope.invalidMessage =
                    'The following contacts can not be imported: ' +
                    contactGroupsService.failednames +
                    '. Bridge can not import contacts missing one or more of the three required contact fields: first name, last name, phone number. ';
                console.log($scope.groups);
                $scope.cancel = function() {
                    $mdDialog.cancel();
                };
                $scope.submit = function() {
                    $mdDialog.hide($scope.contactTarget);
                };
            }
        });
    };

    // PRIVATE FUNCTIONS

    function packageContactForHashCheck(contact) {
        return {
            contact_name_family: contact.input.contact_name_family,
            contact_name_given: contact.input.contact_name_given,
            phone_number: removeNonNumbersFromString(contact.phones[0].phone_number)
        };
    };

    function packageGmailContactsForContactCreation(gmailContacts) {
        var contactParams;
        var phoneParams;
        var packagedContact;
        var packagedContacts = [];
        angular.forEach(gmailContacts, function(gmailContact) {
            if (gmailContact.phone && gmailContact.familyName && gmailContact.givenName) {
                contactParams = {};
                contactParams.contact_profile_color = randomColor({
                    luminosity: 'dark'
                });
                contactParams.contact_name_family = gmailContact.familyName;
                contactParams.contact_name_given = gmailContact.givenName;
                contactParams.contact_email_address = gmailContact.email;
                phoneParams = contactService.buildDefaultPhoneObject(gmailContact.phone,
                    'Mobile');
                packagedContact = {};
                packagedContact.input = contactParams;
                packagedContact.phones = [phoneParams];
                packagedContacts.push(packagedContact);
            } else {
                var givenName = gmailContact.givenName ? gmailContact.givenName :
                    '';
                var familyName = gmailContact.familyName ? gmailContact.familyName :
                    '';
                var name = (givenName + ' ' + familyName).trim();
                if (name) {
                    contactService.addToInvalidContactData(name);
                }
            }
        });
        return packagedContacts;
    };

    function removeNonNumbersFromString(string) {
        return string.replace(/[^0-9]/g, '');
    };

    function propertyFilterConstructor(filterProperty, filterValue) {
        return function(obj) {
            return !(obj[filterProperty] == filterValue);
        };
    };

    function isNotHiddengroup(group) {
        return !group.hidden;
    };

    service.attachManagersToGroups = function(groups) {
        var group;
        var manager;
        var contact;
        for (var i = 0; i < groups.length; i++) {
            group = groups[i];
            if (group.managers) {
                for (var j = 0; j < group.managers.length; j++) {
                    manager = group.managers[j];
                    if (manager) {
                        contact = contactService.getContactByUserUuid(manager.user_uuid);
                        if (contact) {
                            group.managers[j] = contact;
                        }
                    }
                }
            } else {
                group.managers = [];
            }
        };
    };

    service.clearInfo = function() {
        service.groups = [];
    };

    function filterNonDomainGroups(groups) {
        return groups.filter(function(group) {
            return group.domain_uuid === $rootScope.user.domain_uuid;
        });
    };


    //service.setGroups();

    return service;
});
