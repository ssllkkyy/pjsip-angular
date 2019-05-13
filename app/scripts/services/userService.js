'use strict';

proySymphony.service('userService', function(dataFactory, $rootScope, recordingService, domainService,
    contactService, _, metaService, statusService) {

    var service = {
        audioChunks: [],
        usersByDomain: {},
        rawUsersByDomain: {},
        usedEmails: [],
        usedNumbers: [],
        retrievingUsers: false,
        retrievingRawUsers: false,
        userImports: {}
    };

    service.initialize = function() {
        service.getNumberHistory($rootScope.user.id);
        service.getEmailAddressHistory($rootScope.user.id);
    };

    service.findUsers = function(domainUuid, showLoad) {
        return service.loadUsers(domainUuid, showLoad);
    };
    service.findRawUsers = function(domainUuid, showLoad) {
        return service.loadRawUsers(domainUuid, showLoad);
    };

    service.getUsersByDomain = function(domainUuid) {
        if (!service.usersByDomain[domainUuid]) {
            service.usersByDomain[domainUuid] = [];
        }
        return service.usersByDomain[domainUuid];
    };

    service.loadUsers = function(domainUuid, showLoad) {
        service.retrievingUsers = showLoad;
        return service.getUsers(domainUuid).then(function(users) {
            service.retrievingUsers = false;
            if (users) {
                if (!service.usersByDomain[domainUuid]) {
                    service.usersByDomain[domainUuid] = [];
                }
                angular.copy(users, service.usersByDomain[domainUuid]);
                return service.usersByDomain[domainUuid];
            } else {
                return false;
            };
        });
    };

    service.loadRawUsers = function(domainUuid, showLoad) {
        service.retrievingRawUsers = showLoad;
        return service.getRawUsers(domainUuid).then(function(users) {
            service.retrievingRawUsers = false;
            if (users) {
                if (!service.rawUsersByDomain[domainUuid]) {
                    service.rawUsersByDomain[domainUuid] = [];
                }
                angular.copy(users, service.rawUsersByDomain[domainUuid]);
                return service.rawUsersByDomain[domainUuid];
            } else {
                return false;
            };
        });
    };

    service.domainNameForCurrentUser = function(){
        return $rootScope.user.domain.domain_description;
    };

    service.domainUuidForCurrentUser = function(){
        return $rootScope.user.domain_uuid;
    };

    var getUserByUuidFromColl = function(userUuid, coll) {
        return coll.filter(function(user) {
            return user.user_uuid === userUuid;
        })[0];
    };

    var getUserByContactUuidFromColl = function(contactUuid, coll) {
        return coll.filter(function(user) {
            return user.contact_uuid === contactUuid;
        })[0];
    };

    service.getUserByContactUuid = function(contactUuid, domainUuid) {
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain_uuid;
        };
        if (!contactUuid) {
            return null;
        }
        if (domainUuid) {
            var coll = service.usersByDomain[domainUuid];
            if (coll) {
                return getUserByContactUuidFromColl(contactUuid, coll);
            }
        }
        return null;
    };
    service.getUserByUuid = function(userUuid, domainUuid) {
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain_uuid;
            // debugger;
        }
        if (!userUuid) {
            // debugger;
            return null;
        }
        if (domainUuid) {
            var coll = service.usersByDomain[domainUuid];
            if (coll) {
                var user = getUserByUuidFromColl(userUuid, coll);
                // debugger;
                return user;
            }
        }
        return null;
    };

    service.getUsers = function(domainUuid) {
        return dataFactory.getUserInfos(domainUuid).then(function(response) {
            if (response.data.success) {
                var userInfos = response.data.success.data;
                return userInfos;
            } else {
                return false;
            };
        });
    };

    service.getRawUsers = function(domainUuid) {
        return dataFactory.getRawUserInfos(domainUuid).then(function(response) {
            if (response.data.success) {
                var userInfos = response.data.success.data;
                return userInfos;
            } else {
                return false;
            };
        });
    };

    service.userCanReceiveCalls = function() {
        var status;
        var currentStatus = statusService.getCurrentStatusName();
        angular.forEach($rootScope.domainsStatus, function(item) {
            if (item.status_active && item.status_name == currentStatus) status =
                item;
        });
        if (status) return status.receive_calls;
        return true;
    };

    service.clearInfo = function() {
        service.usersByDomain = {};
    };

    service.getUserInfoByUuid = function(userUuid) {
        return dataFactory.getActiveUser(userUuid).then(function(response) {
            if (response.data.data) {
                return response.data.data;
            } else {
                return false;
            }
        });
    };

    service.performMediaCheck = function() {
        return navigator.mediaDevices.getUserMedia({
                audio: true
            })
            .then(function(response) {
                recordingService.initializeRecorder(response);
                return response.active ? true : false;
            });
    };

    service.filterUsersOnPresentContacts = function(users) {
        var contact;
        return users.filter(function(user) {
            contact = contactService.getContactByUserUuid(user.id,
                user.domain_uuid);

            if (!contact) {
                return null;
            } else {
                return true;
            }
        });
    };

    service.performOnLoadMediaCheck = function() {
        function handleBadMediaRequest() {
            var title = 'We cannot access your camera and microphone';
            var message =
                'This is probably because you have not allowed access to your microphone or you do not have one plugged in. You can allow access by selecting the camera icon in the top right corner of your browser (in the address bar) and choosing "always allow."';
            $rootScope.showAlert(title, message);
        }
        service.performMediaCheck().then(function(response) {
            if (!response) {
                handleBadMediaRequest();
      
            }
        }, function(err) {
            handleBadMediaRequest();
        });
    };

    service.mergeUserColWithContacts = function(users) {
        var contact;
        return users.map(function(user) {
            contact = contactService.getContactByUserUuid(user.id, user.domain_uuid);
            return contact ? _.merge(contact, user) : user;
        });
    };

    service.isAdminGroupOrGreater = function() {
        var group = $rootScope.user.accessgroup;
        return group && (group === 'admin' || group === 'KotterTech' || group ===
            'salesadmin' || group === 'superadmin');
    };

    service.isBillingAdminOrGreater = function() {
        var users = ['aatestatkeithgallantcom', 'adamatkotternet', 'lisaatkotternet',
            'randyatkotternet', 'keithatkotternet', 'stagingatkeithgallantcom',
            'keithatkeithgallantcom'
        ];
        var group = $rootScope.user.accessgroup;
        return users.indexOf($rootScope.user.username) !== -1 ||
            (group && (group === 'salesadmin'));
    };

    service.isSalesOrGreater = function() {
        var users = ['aatestatkeithgallantcom', 'adamatkotternet', 'lisaatkotternet',
            'randyatkotternet', 'keithatkotternet', 'stagingatkeithgallantcom',
            'keithatkeithgallantcom'
        ];
        var group = $rootScope.user.accessgroup;
        return users.indexOf($rootScope.user.username) !== -1 ||
            (group && (group === 'salesadmin' || group === 'salesstaff'));
    };

    service.isKotterTechOrGreater = function() {
        var group = $rootScope.user.accessgroup;
        return (group &&
                (group === 'KotterTech' || group === 'salesadmin' || group ===
                    'superadmin')) ||
            ($rootScope.user.contact_email_address && $rootScope.user.contact_email_address
                .indexOf('kottertech.com') !== -1);
    };

    service.isSalesAdmin = function() {
        var group = $rootScope.user.accessgroup;
        return group && group === 'salesadmin';
    };

    service.isDemoAgency = function() {
        return $rootScope.user && $rootScope.user.isDemoAgency === 'true';
    };
    service.limitReached = function(type) {
        return service.isDemoAgency() && $rootScope.user.demoUsage[type] >= $rootScope.user
            .usageLimits[type];
    };
    service.updateDemoUsage = function() {
        dataFactory.getDemoUsage($rootScope.user.id)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.user.demoUsage = response.data.success.data;
                }
            });
    };

    service.isKotterTech = function() {
        var group = $rootScope.user.accessgroup;
        return group === 'KotterTech';
    };

    service.isKotterTechUser = function(contact) {
        return contactService.isKotterTechUser(contact);
    };

    service.getNumberHistory = function(userUuid) {
        if (!userUuid) userUuid = $rootScope.user.id;
        return dataFactory.getPhoneNumberHistory(userUuid)
            .then(function(response) {
                console.log(response);
                service.usedNumbers = response.data;
                return service.usedNumbers;
            });
    };
    service.getEmailAddressHistory = function(userUuid) {
        if (!userUuid) userUuid = $rootScope.user.id;
        return dataFactory.getEmailAddressHistory(userUuid)
            .then(function(response) {
                console.log(response);
                service.usedEmails = response.data;
                return service.usedEmails;
            });
    };
    service.addPhoneOrEmailToHistory = function(value, type, userUuid) {
        if (!userUuid) userUuid = $rootScope.user.id;
        var data = {
            user_uuid: userUuid
        };
        if (type === 'email') data.email_address = value;
        if (type === 'phone') data.phone_number = value;
        if (String(value).length !== 5) {
            dataFactory.addPhoneOrEmailToHistory(data)
                .then(function(response) {
                    if (response.data.success) {
                        var newval = response.data.success.data;
                        console.log(newval);
                        if (type === 'email') {
                            service.updateValue(newval, 'email_address');
                        }
                        if (type === 'phone') {
                            service.updateValue(newval, 'phone_number');
                        }
                    }
                });
        }
    };

    service.updateValue = function(newvalue, field) {
        var i, input, value;
        if (field === 'email_address') {
            input = service.usedEmails;
            value = newvalue.email_address;
        } else if (field === 'phone_number') {
            input = service.usedNumbers;
            value = newvalue.phone_number;
        }

        for (i = 0; i < input.length; i++) {
            if (input[i][field] === value) {
                input[i] = newvalue;
                return;
            }
        }
        input.push(newvalue);
        return;
    };

    service.userImportingStatus = function(event) {
        service.userImports[event.user_import_uuid] = {
            completed: event.completed,
            total: event.totalrequested
        };
        $rootScope.$broadcast('refresh-user-list');
    };

    service.userImportingComplete = function(event) {
        if (service.userImports[event.user_import_uuid])
            delete service.contactImports[event.user_import_uuid];
    };

    metaService.registerOnRootScopeUserLoadCallback(function() {
        if (service.isAdminGroupOrGreater()) {
            service.findRawUsers($rootScope.user.domain_uuid, true);
        }
    });

    service.clearInfo = function() {
        service.usedNumbers = [];
        service.usedEmails = [];
    };


    return service;
});
