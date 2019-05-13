'use strict';

proySymphony.service('contactService', function(__env, $firebaseObject, $interval, $firebaseAuth,
    $firebaseArray, $rootScope, $window, _, dataFactory, $filter, $q, usefulTools) {

    var service = {
        contacts: {},
        userContacts: {},
        env: __env.environment,
        totalContacts: 0,
        contactImports: {},
        updatingContactColor: {},
        onContactLoadCallbacks: [],
        onUserContactLoadCallbacks: [],
        onProfileImageChangeCallbacks: [],
        onAllContactsLoadedCallbacks: [],
        contactsLoaded: false,
        userContactsLoaded: false,
        data: {
            initialContactsLoaded: null,
            allContactsLoaded: null
        },
        scrollContacts: [],
        contactsByDomain: {},
        seenContacts: {},
        contactLoadInfo: {},
        allContactBasicInfo: [],
        loadingContact: {},
        searchingDatabase: {},
        nonContactNumbers: {},
        contactNumbers: {},
        favoritesFilter: false,
        amsSearchContacts: [],
        qqSearchContacts: [],
        firebaseContacts: [],
        partnerContacts: {},
        partnerMatrix: {
            'qqcatalyst': 'qqcontacts',
            'ams360': 'amscontacts',
            'epic': 'epiccontacts',
            'hawksoft': 'hawksoftcontacts',
            'e-agent': 'eagentcontacts',
            'agencymatrix': 'agencymatrixcontacts',
            'ezlynx': 'ezlynxcontacts'
        }
    };

    service.setFirebaseContacts = function() {
        var auth = $firebaseAuth();
        var email = $rootScope.user.fbinfo.email;
        var pass = $rootScope.user.fbinfo.pass;
        auth.$signInWithEmailAndPassword(email, pass).then(function(firebaseUser) {
            service.firebaseUser = firebaseUser;
            console.log("Signed in as:", firebaseUser.uid);
            var fbUid = firebaseUser.uid;
            var userUuid = $rootScope.user.id;
            var partner = $rootScope.user.exportType.partner_code;
            service.rootPath = service.env + "/domains/" + fbUid;

            service.contactsRef = firebase.database().ref().child(service.rootPath + '/users/' + userUuid + '/contacts');
            service.thinContactsRef = firebase.database().ref().child(service.rootPath + '/thincontacts');
            service.userContactsRef = firebase.database().ref().child(service.rootPath + '/usercontacts').orderByChild('name');
            service.numbersRef = firebase.database().ref().child(service.rootPath + '/numbers');
            service.userNumbersRef = firebase.database().ref().child(service.rootPath + '/usernumbers');
            service.favoritesRef = firebase.database().ref().child(service.rootPath + '/users/' + userUuid + '/favorites');
            service.ringtonesRef = firebase.database().ref().child(service.rootPath + '/users/' + userUuid + '/contactringtones');
            if (partner !== 'generic' && service.partnerMatrix[partner]) {
                service.partnerContactsRef = firebase.database().ref().child(service.rootPath + '/' + service.partnerMatrix[partner]);
                service.partnerContacts = $firebaseObject(service.partnerContactsRef);
            }

            service.userContacts = $firebaseObject(service.userContactsRef);
            service.contactNumbers = $firebaseObject(service.numbersRef);
            service.contacts = $firebaseObject(service.contactsRef);
            var thinContacts = $firebaseObject(service.thinContactsRef);
            service.favorites = $firebaseObject(service.favoritesRef);
            service.contactRingtones = $firebaseObject(service.ringtonesRef);
            service.userNumbers = $firebaseObject(service.userNumbersRef);
            service.userContactNumbers = $firebaseObject(service.userNumbersRef);
            
            service.userContacts.$loaded()
            .then(function(data) {
                service.userContactsLoaded = true;
                performCallbackCollection(service.onUserContactLoadCallbacks);
                var usercontact = service.getContactByUuid($rootScope.user.contact_uuid);
                if (usercontact.status !== $rootScope.user.user_status.status_name) {
                    $rootScope.$broadcast('update.user.status', usercontact.status);
                }
            });
            thinContacts.$loaded()
            .then(function(data) {
                service.contactsLoaded = true;
                service.thinContacts = data;
                performCallbackCollection(service.onContactLoadCallbacks);
                $rootScope.$broadcast('user.contacts.set');
                
            });
        }).catch(function(error) {
            console.log("Authentication failed:", error);
        });
    };

    service.changeParterType = function() {
        service.partnerContactsRef.off();
        service.partnerContacts = {};
        var partner = $rootScope.user.exportType.partner_code;
        if (partner !== 'generic' && service.partnerMatrix[partner]) {
            service.partnerContactsRef = firebase.database().ref().child(service.rootPath + '/' + service.partnerMatrix[partner]);
            service.partnerContacts = $firebaseObject(service.partnerContactsRef);
        }
    };

    service.getThinArray = function() {
        var thinContactsRef = firebase.database().ref().child(service.rootPath + '/thincontacts').orderByChild('name');
        service.loadingThinArray = true;
        service.thinContactArray = $firebaseArray(thinContactsRef);
        service.thinContactArray.$loaded()
        .then(function(data) {
            console.log(service.thinContactArray);
            service.loadingThinArray = false;
        });
    };

    service.cleanThinContactArray = function() {
        if (!service.thinContactArray) return [];
        return service.thinContactArray;
    };

    service.destroyArray = function(arr) {
        arr.destroy();
    };

    service.logoutOfFirebase = function() {
        var auth = $firebaseAuth();
        auth.$signOut();
    };

    service.fullContactsArray = function() {
        return usefulTools.convertObjectToArray(service.thinContacts);
    };

    service.contactUuids = function() {
        var thins = _.filter(service.thinContacts, function(o) { return o && o.cuuid; });
        var a = _.map(thins, 'cuuid');
        var users = _.filter(service.userContacts, function(o) { return o && o.cuuid && !service.isKotterTechUser(o); });
        var b = _.map(users, 'cuuid');
        var uuids = _.union(a, b);
        return uuids;
    };

    service.numberOfContacts = function() {
        return _.size(service.thinContacts);
    };

    service.isFavorite = function(contactUuid) {
        return service.favorites[contactUuid];
    };

    service.favoriteContacts = function() {
        var favorites = _.keys(service.favorites).filter(function(key) {
            return usefulTools.isUuid(key);
        });
        return favorites;
    };

    service.contactsArray = function() {
        var contacts = _.keys(service.contacts).filter(function(key) {
            return usefulTools.isUuid(key);
        });
        var p = _.keys(service.partnerContacts).filter(function(key) {
            return usefulTools.isUuid(key);
        });
        return _.union(contacts, p);
    };

    service.sortedThinContactsArray = function() {
        var contacts = _.keys(service.thinContacts).filter(function(key) {
            return usefulTools.isUuid(key);
        });
        return contacts;
        // _.sortBy(service.thinContacts, ['name']);
    };

    service.allContactsArray = function() {
        var contacts = _.keys(service.thinContacts).filter(function(key) {
            return usefulTools.isUuid(key) && !inAGroup(key);
        });
        var users = _.keys(service.userContacts).filter(function(key) {
            return usefulTools.isUuid(key) && !inAGroup(key);
        });
        return _.union(contacts, users);
    };

    service.partnerContactsOnly = function() {
        var partner = _.keys(service.partnerContacts).filter(function(key) {
            return usefulTools.isUuid(key);
        });
        return partner;
    };

    service.qqContactsOnly = function() {
        var qq = _.keys(service.partnerContacts).filter(function(key) {
            return usefulTools.isUuid(key) && !inAGroup(key);
        });
        return qq;
    };

    service.amsContactsOnly = function() {
        var ams = _.keys(service.partnerContacts).filter(function(key) {
            return usefulTools.isUuid(key) && !inAGroup(key);
        });
        return ams;
    };

    service.nonUserContactsArray = function() {
        var contacts = _.keys(service.contacts).filter(function(key) {
            return usefulTools.isUuid(key) && !inAGroup(key);
        });
        var p = _.keys(service.partnerContacts).filter(function(key) {
            return usefulTools.isUuid(key) && !inAGroup(key);
        });
        return _.union(contacts, p);
    };

    function inAGroup(contact) {
        var groups = service.contactGroups;
        if (!groups) return false;
        for (var i = 0, len = groups.length; i < len; i++) {
            if (groups[i].members && groups[i].members.indexOf(contact) > -1) return true
        }
        return false;
    }

    service.isKotterTechUser = function(contact) {
        return contact && ((contact.type && contact.type === 'user') ||
         (contact.contact_type && contact.contact_type === 'user')) &&
         ((contact.contact_email_address && contact.contact_email_address.indexOf('kottertech.com') !== -1) || 
         (contact.em && contact.em.indexOf('kottertech.com') !== -1) || 
         contact.name == 'Kotter Tech');
    };
 
    service.userContactsArray = function() {
        return _.filter(service.userContacts).filter(function(contact) {
            return contact.cuuid;
        });
    };

    service.thinContactsArray = function() {
        return _.filter(service.thinContacts).filter(function(contact) {
            return contact.cuuid;
        });
    };

    service.getContactByUuid = function(contactUuid) {
        if (contactUuid) {
            var usercontact = service.userContacts ? service.userContacts[contactUuid] : null;
            var thincontact = service.thinContacts ? service.thinContacts[contactUuid] : null;
            var contact = usercontact ? usercontact : (thincontact ? thincontact : null);
            return contact;
        }
        return null;
    };

    service.getUserByDid = function(did) {
        var user;
        var i, input = service.getUserContactsOnly();
        for (i=0; i<input.length; i++) {
            if (!input[i]) continue;
            var phone = _.find(input[i].nums, { lab: 'DID', num: did });
            if (phone) return input[i];
        }
        return null;
    };

    service.isLoggedInUser = function(contact) {
        return contact.user_uuid === $rootScope.user.id;
    };

    service.getSmsNumber = function(contact) {
        if (!contact) return null;
        var did;
        contact.nums.forEach(function(num){
            if (contact.type === 'user') {
                if (num.lab === 'DID') did = (num.num.length == 10 ? '1' : '') + num.num;
                if (num.lab === 'Mobile' && !did) did = (num.num.length == 10 ? '1' : '') + num.num;
            } else {
                if (num.lab === 'Mobile' && !did) did = (num.num.length == 10 ? '1' : '') + num.num;
            }
        });
        return did;
    };

    service.contactsImportingStatus = function(event) {
        service.contactImports[event.import_contact_list_uuid] = {
            import_contact_list_uuid: event.import_contact_list_uuid,
            completed: event.completed,
            total: event.totalrequested
        };
    };

    service.contactsImportingComplete = function(event) {
        console.log(event);
        if (service.contactImports[event.import_contact_list_uuid])
            delete service.contactImports[event.import_contact_list_uuid];
    };

    service.getContactByPhoneNumber = function(number) {
        if (!number) return null;
        number = usefulTools.cleanPhoneNumber(number);
        if (service.contactNumbers[number]) {
            var arr = usefulTools.convertObjectToArray(angular.copy(service.contactNumbers[number]));
            var contactUuid = arr.shift();
            return service.getContactByUuid(contactUuid);
        } else if (service.userContactNumbers[number]) {
            var arr = usefulTools.convertObjectToArray(angular.copy(service.userContactNumbers[number]));
            var contactUuid = arr.shift();
            return service.getContactByUuid(contactUuid);
        }
        return null;
    };

    service.getMultipleContactsByPhoneNumber = function(number) {
        if (!number) return null;
        number = usefulTools.cleanPhoneNumber(number);
        if (service.contactNumbers[number]) {
            var arr = usefulTools.convertObjectToArray(angular.copy(service.contactNumbers[number]));
            var uuids = [];
            var contacts = [];
            angular.forEach(arr, function(uuid){
                var contact = service.getContactByUuid(uuid);
                if (uuids.indexOf(uuid) === -1 && 
                    contact && ((contact.type !== 'contact' 
                    && contact.type !== '') 
                    || service.contacts[uuid])) 
                uuids.push(uuid); 
                contacts.push(contact); 
            });
            return contacts;
        }
        return null;
    };

    service.getFullContactDetails = function(contactUuid) {
        // var contactUuid = customer.contact_uuid;
        // console.log(contactUuid);
        // console.log(service.rootPath + '/domaincontacts/' + contactUuid + '/');
        return firebase.database().ref().child(service.rootPath + '/domaincontacts/' + contactUuid + '/').on('value', function (snapshot) {
            var value = snapshot.val();
            // console.log(value);
            if (value) {
                var contact = angular.copy(value);
                
                return contact;
            }
            return null;
        });
    };

    service.getContactRingtone = function(contactUuid, ringtoneType) {
        if ((service.userContacts[contactUuid] || service.thinContacts[contactUuid]) && service.contactRingtones[contactUuid]) {
            var ring = _.find(service.contactRingtones[contactUuid], function(item) {
                return item.type === ringtoneType;
            });
            return ring;
        }
        return null;
    };

    service.getContactByEmail = function(email) {
        var contact = usefulTools.find(service.userContacts, 'em', email);
        if (!contact) contact = usefulTools.find(service.thinContacts, 'em', email);
        return contact;
    };

    service.getContactByUserUuid = function(userUuid) {
        return usefulTools.find(service.userContactsArray(), 'user_uuid', userUuid);
    };

    service.getContactByExtUuid = function(extUuid) {
        var contact = usefulTools.find(service.userContactsArray(), 'euuid', extUuid);
        return contact;
    };

    service.loadUserContactsOnly = function(domainUuid, userUuid) {
        console.debug("--loadUserContactsOnly--");
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain_uuid;
        }
        if (!userUuid) {
            userUuid = $rootScope.user.id;
        }
        return dataFactory.getUserContactsOnly(domainUuid, userUuid)
            .then(function(response) {
                // console.debug("FINISHED LOADING USER CONTACTS");
                // console.debug(response);
                if (response.data.success) {
                    var contacts = response.data.success.data;
                    // console.debug(contacts);
                    var collection = service.getContactDomainCollection(domainUuid);
                    // console.debug(collection);
                    appendContactsToCollection(contacts, collection);
                    // console.debug(collection);
                    return contacts;
                } else {
                    console.error(
                        "loadUserContactsOnly:getUserContactsOnly ERROR: " +
                        response.data.error.message);
                    return undefined;
                }
            }, function(error) {
                console.error(
                    'loadUserContactsOnly ERROR: RETRIEVING CONTACTS (return undefined): ' +
                    error);
                return undefined;
            });
    };

    service.getTotalContacts = function() {
        return service.contactsArray().length + service.contactsArray().length +
            amsSearchContacts.length + qqSearchContacts.length;
    };

    service.getContacts = function(domainUuid, userUuid) {
        // console.debug("--getContacts--");
        var totalContacts;
        var contacts = {};
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain.domain_uuid;
        }
        if (!userUuid) {
            userUuid = $rootScope.user.id;
        }
        var data = {
            domain_uuid: domainUuid,
            user_uuid: userUuid,
            returnType: 'object'
        };
        // console.debug("getContacts:LOADING ALL CONTACTS");
        return dataFactory.postGetContacts(data)
            .then(function(response) {
                // console.debug("getContacts:FINISHED LOADING ALL CONTACTS");
                // console.debug(response.data);
                if (response.data.success) {
                    return handleSuccessfulGetContactsResponse(contacts, response,
                        domainUuid);
                } else {
                    console.error("getContacts: ERROR: " + response.data.error.message);
                    return undefined;
                }
            }, function(error) {
                console.error('getContacts:ERROR RETRIEVING CONTACTS: ' + error);
                return undefined;
            });
    };

    service.getUserContactsOnly = function() {
        // var array = [];
        return _.sortBy(service.userContacts, ['name']).filter(function(contact) {
            return contact && contact.user_uuid;
        });
        return service.userContactsArray();
        console.log(service.userContactsArray());
        angular.forEach(service.userContactsArray(), function(contactUuid) {
            if (service.userContacts[contactUuid]) array.push(service.userContacts[contactUuid]);
        });
        return array;
    };

    service.editContact = function(contactUuid, type, data) {
        if (contactUuid.cuuid) contactUuid = contactUuid.cuuid;
        var ref = firebase.database().ref().child(service.rootPath + '/domaincontacts/' + contactUuid + '/')
        ref.on('value', function (snapshot) {
            var contact = snapshot.val();
            // console.log(service.editingContact);
            // if (service.editingContact && service.editingContact !== contactUuid) service.editingContact = null;
            if (contact) {
                // service.editingContact = contactUuid;
                if (contact.tags) contact.tags = JSON.parse(contact.tags);
                $rootScope.doEditContactForm(contact);
            }
            ref.off();
        });
    };

    service.getUserContactsOnlyByDomain = function(domainUuid) {
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain_uuid;
        }
        return service.loadUserContactsOnly(domainUuid);
    };

    service.sendContactImport = function(data) {
        return dataFactory.postProcessContactImport(data)
        .then(function(response){
            return response;
        });
    };

    service.createContactImport = function(packagedContacts, groupUuid) {
        var data = {
            contacts: packagedContacts,
            destination: groupUuid,
        };
        return dataFactory.postReceiveContactImport(data)
            .then(function(response) {
                // console.debug(response.data);
                return response.data;
            });
    };

    service.importUserContacts = function(packagedContacts, groupUuid) {
        var data = {
            contacts: packagedContacts,
            groupUuid: groupUuid !== undefined ? groupUuid : null
        };
        return dataFactory.postImportUserContacts(data)
            .then(function(response) {
                return response;
            });
    };

    service.findContacts = function(domainUuid, userUuid) {
        return service.getContacts(domainUuid, userUuid);
    };

    service.findDomainContacts = function(domainUuid) {
        return service.getUserContactsOnlyByDomain(domainUuid);
    };

    service.getSearchUserContacts = function(search, userUuid) {
        service.loadingContacts = true;
        var data = {
            searchString: search,
            favorites: service.favoritesFilter,
            userUuid: userUuid
        };
        console.log(data);
        return dataFactory.postSearchContacts(data)
            .then(function(response) {
                if (response.data.success) {
                    console.log(response.data.success.data);
                    service.searchContacts = response.data.success.data;
                } else {
                    console.log(response.data.error.message);
                    service.searchContacts = {};
                }
                service.loadingContacts = false;
                return service.searchContacts;
            });
    };

    service.getSearchAmsContacts = function(search) {
        service.amsSearchString = search;
        service.loadingAmsContacts = true;
        var data = {
            domain_uuid: $rootScope.user.domain_uuid,
            search_string: search
        };
        return dataFactory.ams360GetContacts(data)
            .then(function(response) {
                if (response.data.success) {
                    if (Object.keys(service.partnerContacts).length === 0) {
                        var contactObj = usefulTools.arrayToObjectByProp(
                            response.data.success.data, 'ams_360_contact_uuid'
                        );
                        angular.copy(contactObj, service.partnerContacts);
                    }
                    if (search === service.amsSearchString) {
                        angular.copy(response.data.success.data, service.amsSearchContacts);
                    }
                } else {
                    service.amsSearchContacts = {};
                }
                service.loadingAmsContacts = false;
                return service.amsSearchContacts;
            });
    };

    service.getSearchQQContacts = function(search) {
        service.qqSearchString = search;
        service.loadingQQContacts = true;
        var data = {
            domain_uuid: $rootScope.user.domain_uuid,
            search_string: search
        };
        return dataFactory.qqCatalystGetContacts(data)
            .then(function(response) {
                if (response.data.success) {
                    if (Object.keys(service.partnerContacts).length === 0) {
                        var contactObj = usefulTools.arrayToObjectByProp(
                            response.data.success.data,
                            'qq_catalyst_contacts_uuid'
                        );
                        angular.copy(contactObj, service.partnerContacts);
                    }
                    if (search === service.qqSearchString) {
                        angular.copy(response.data.success.data, service.qqSearchContacts);
                    }
                } else {
                    service.qqSearchContacts = {};
                }
                service.loadingQQContacts = false;
                return service.qqSearchContacts;
            });
    };

    service.getSearchBasicContactPhones = function(search, userUuid) {
        var data = {
            searchString: search,
            userUuid: userUuid
        };
        console.log(data);
        return dataFactory.getSearchBasicContactPhones(data)
            .then(function(response) {
                if (response.data.success) {
                    console.log(response.data.success);
                    var contacts = usefulTools.convertObjectToArray(response.data.success
                        .data);
                    console.log(contacts);
                    // angular.forEach(contacts, function(contact){
                    //     service.addColorToContact(contact);
                    // });
                    return {
                        data: contacts,
                        totalFound: response.data.success.totalRequested
                    };
                } else {
                    console.log(response.data.error.message);
                    return {
                        data: []
                    };
                }
            });
    };

    service.getSearchBasicContactEmails = function(search, userUuid) {
        var data = {
            searchString: search,
            userUuid: userUuid
        };
        return dataFactory.getSearchBasicContactEmails(data)
            .then(function(response) {
                if (response.data.success) {
                    return response.data.success.data;
                } else {
                    console.log(response.data.error.message);
                    return [];
                }
            });
    };

    service.loadBasicContactInfo = function(userUuid) {
        service.loadingBasicInfo = true;
        return dataFactory.getAllBasicContacts(userUuid)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    service.loadingBasicInfo = false;
                    service.allContactBasicInfo = response.data.success.data;
                    return response.data.success.data;
                } else {
                    return [];
                }
            });
    };

    function handleSuccessfulGetContactsResponse(contacts, response, domainUuid) {
        var totalContacts;
        var data = response.data.success;
        console.log(data);
        var newContacts = data.data;
        console.log("CONTACTS RETRIEVED");
        console.log(newContacts);
        $rootScope.nonContacts = data.noncontacts;
        totalContacts = data.totalContacts;
        service.totalContacts = data.totalContacts;
        var collection = service.getContactDomainCollection(domainUuid);
        appendContactsToCollection(newContacts, collection);
        contacts = _.extend(contacts, newContacts);
        return contacts;
        // if (contacts.length < totalContacts) {
        //     page += 1;
        //     service.contactLoadInfo.loading = true;
        //     service.contactLoadInfo.totalContacts = totalContacts;
        //     return getSubBatchOfContacts(contacts, totalContacts, page, perPage);
        // } else {
        //     return contacts;
        // }
    };

    service.getContactDomainCollection = function(domainUuid) {
        console.log(domainUuid);
        if (service.contactsByDomain[domainUuid]) {
            return service.contactsByDomain[domainUuid];
        }
        if (domainUuid === $rootScope.user.domain_uuid) {
            service.contactsByDomain[domainUuid] = service.contacts;
        } else {
            service.contactsByDomain[domainUuid] = {};
        }
        return service.contactsByDomain[domainUuid];
    };

    function appendContactsToCollection(contacts, collection, overWrite) {
        var contact;
        if (overWrite) {
            _.extend(collection, contacts);
        } else {
            if (_.isArray(collection) && collection.length === 0) collection = {};
            angular.forEach(usefulTools.convertObjectToArray(contacts), function(contact) {
                // if (!collection[contact.contact_uuid]) collection[contact.contact_uuid] = contact;
                collection[contact.contact_uuid] = contact;
            });
        }
    };

    function getSubBatchOfContacts(contacts, totalContacts, page, perPage) {
        return service.getContacts(null, null, page, perPage, true)
            .then(function(data) {
                var otherContacts = data.data2;
                appendContactsToCollection(otherContacts, service.contacts);
                totalContacts = data.totalContacts;
                if (otherContacts) {
                    contacts = contacts.concat(otherContacts);
                    if (contacts.length < totalContacts) {
                        return getSubBatchOfContacts(contacts, totalContacts, page + 1,
                            perPage);
                    }
                }
                return contacts;
            });
    };

    service.loadContactByUuid = function(contactUuid, domainUuid) {
        var contact;
        if (!domainUuid) domainUuid = $rootScope.user.domainUuid;
        return dataFactory.getContact(contactUuid)
            .then(function(result) {
                if (result.data) {
                    if (result.data === 'deleted') {
                        contactGroupService.removeContactFromGroupsByUuid(
                            contactUuid);
                        return null;
                    } else {
                        contact = result.data;
                        service.addColorToContact(contact);
                        service.contacts[contactUuid] = contact;
                        if (!service.contactsByDomain[domainUuid]) service.contactsByDomain[
                            domainUuid] = {};
                        service.contactsByDomain[domainUuid][contactUuid] = contact;
                        // $rootScope.$broadcast('new.contact.added', contact);
                        return contact;
                    }
                } else {
                    return null;
                }
            });
    };

    service.getContactDetails = function(contact_uuid) {
        var contact;
        return dataFactory.getContact(contact_uuid)
            .then(function(result) {
                if (result.data !== 'deleted') {
                    var contact_settings = result.data.settings;
                    return contact_settings;
                } else {
                    return null;
                }
            });
    }

    service.getContactByUuidDigest = function(contactUuid, domainUuid) {
        var contacts = domainUuid ? service.contactsByDomain[domainUuid] : service.contacts;
        if (contacts[contactUuid]) {
            return contacts[contactUuid];
        } else {
            if (!service.loadingContact[contactUuid]) {
                service.loadingContact[contactUuid] = true;
                return service.loadContactByUuid(contactUuid, domainUuid)
                    .then(function(response) {
                        delete service.loadingContact[contactUuid];
                        return response;
                    });
            } else {
                return null;
            }
        }
        return null;
    };



    service.removeContactByUuid = function(contactUuid, domainUuid) {
        delete service.contacts[contactUuid];
        delete service.contactsByDomain[domainUuid][contactUuid];
    };

    service.deleteContactPhone = function(contactUuid, contact_phone_uuid) {
        dataFactory.deleteContactPhone(contact_phone_uuid)
            .then(function(response) {
                if (response.data.success) {
                    // var pindex = $filter('getByUUID')(service.domainContacts[contactUuid].phones, contact_phone_uuid, 'contact_phone');
                    // if (pindex !== null) service.domainContacts[contactUuid].phones.splice(pindex, 1);
                } else {
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
            });
    };

    service.deletePolicyInfo = function(contactUuid, contact_policy_information_uuid) {
        dataFactory.deletePolicyInfo(contact_policy_information_uuid)
            .then(function(response) {
                if (response.data.success) {
                    // var pindex = $filter('getByUUID')(service.domainContacts[cononescrtactUuid].phones, contact_phone_uuid, 'contact_phone');
                    // if (pindex !== null) service.domainContacts[contactUuid].phones.splice(pindex, 1);
                } else {
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
            });
    };

    service.phoneNumberBelongsToContact = function(contact, phoneNumber) {
        var phone;
        for (var i = 0; i < contact.phones.length; i++) {
            phone = contact.phones[i];
            if (phone.phone_number === phoneNumber) {
                return phone;
            }
        }
        return false;
    };

    service.addContact = function(params) {
        var data = {
            input: makeString(params.input),
            phones: makeString(params.phones),
            policies: makeString(params.policies)
        };
        return dataFactory.postNewUserContact(data).then(function(response) {
            if (response.data.success) {
                var contact = response.data.success.data;

                if ($rootScope.contactsAvailable) $rootScope.contactsAvailable.push(
                    contact);
                service.contacts[contact.contact_uuid] = contact;

                service.clearTrackingObject(contact);
                $rootScope.contactaddition = {};
                $rootScope.$broadcast('contacts.updated');
                service.totalContacts += 1;
                service.checkIfDuplicateNumber(contact);
                return {
                    status: true,
                    data: contact.contact_uuid
                };
            }
            return {
                status: false,
                reason: response.data.error.reason
            };
        });
    };

    service.getPrimaryPhone = function(contact) {
        if (!contact.phones) return null;
        var primary = null;
        angular.forEach(contact.phones, function(phone){
            if (phone.phone_primary === 1) primary = phone.phone_number;
        });
        return primary;
    };

    service.checkIfDuplicateNumber = function(contact) {
        var i, input = contact.phones;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].phone_count && input[i].phone_count > 0) {
                service.getContacts();
                return;
            }
        };
    };

    service.clearTrackingObject = function(contact) {
        angular.forEach(contact.phones, function(phone) {
            delete service.searchingDatabase[phone.phone_number];
            delete service.nonContactNumbers[phone.phone_number];
        });
        delete service.loadingContact[contact.contact_uuid];
    };

    service.buildDefaultPhoneObject = function(phoneNumber, label) {
        phoneNumber = removeNonNumbersFromString(phoneNumber);
        if (phoneNumber.length === 11) phoneNumber = phoneNumber.substring(1);
        return {
            contact_phone_uuid: null,
            contact_uuid: null,
            phone_label: label,
            phone_number: phoneNumber,
            phone_extension: null,
            phone_primary: true
        };
    };

    service.theContact = function(entity, type) {
        if (!service.contactsLoaded) return null;
        var number, email;
        if (entity.contact_uuid) {
            var contact = service.getContactByUuid(entity.contact_uuid);
            if (contact) return contact;
        }

        if (!type) {
            if (entity.thread_uuid) type = 'sms';
            if (entity.call_history_fs_uuid) type = 'call';
            if (entity.visual_voicemail_uuid) type = 'voicemail';
            if (entity.call_type) type = 'conference';
            if (entity.callcenter_type) type = 'callcenter';
            if (entity.sms_blacklist_uuid) type = 'smsblacklist'
        }

        if (type === 'sms') number = entity.contact_phone_number.substr(1);
        if (type === 'smsanalytics') number = entity.contact_phone.substr(1);
        if (type === 'call') number = entity.contact_number;
        if (type === 'voicemail') number = entity.caller_number;
        if (type === 'conference' || type === 'callcenter') number = entity.number;
        if (type === 'smsblacklist') number = entity.did;
        number = usefulTools.cleanPhoneNumber(number);
        return service.getContactByPhoneNumber(number);

    };

    service.batchCreateContacts = function(packagedContacts, subBatch) {
        console.log("PACKAGED CONTACTS IN BATCH CREATE");
        console.log(packagedContacts);
        var importResponses = [];
        var bigBatchSize = 250;
        var smallBatchSize = 250;
        var currentBatchContacts = packagedContacts.slice(0, bigBatchSize);
        packagedContacts = packagedContacts.slice(bigBatchSize, packagedContacts.length);
        for (var i = 0; i < currentBatchContacts.length; i += smallBatchSize) {
            importResponses.push(service.importUserContacts(currentBatchContacts.slice(
                i, (i + smallBatchSize))));
        }
        return $q.all(importResponses).then(function(responses) {
            if (packagedContacts.length > 0) {
                return service.batchCreateContacts(packagedContacts, true)
                    .then(function(otherResponses) {
                        responses = responses.concat(otherResponses);
                        if (subBatch) {
                            return responses;
                        } else {
                            return handleBatchCreateResponses(responses);
                        }
                        return undefined;
                    });
            } else if (subBatch) {
                return responses;
            } else {
                return handleBatchCreateResponses(responses);
            }
            return undefined;
        });
    };

    function handleBatchCreateResponses(responses) {
        var response;
        var contacts = [];
        for (var i = 0; i < responses.length; i++) {
            response = responses[i];
            if (response) {
                contacts = contacts.concat(response);
            }
        }
        if (contacts.length > 0) {
            var message = 'You imported ' + contacts.length +
                ' of your contacts! Please be aware that some contacts might not have been imported. Bridge will not import contacts who were previously imported into Bridge or who are missing one or more of the three required contact fields: first name, last name, phone number.';
            $rootScope.showSuccessAlert(message);
        } else {
            $rootScope.showErrorAlert(
                "No contacts were imported. Either your contacts were previously imported into Bridge, they are missing one or more of the three required contact fields: first name, last name, phone number, or you have reached your maximum number of allowed contacts. "
            );
        }
        return contacts;
    }

    service.addToInvalidContactData = function(contactName) {
        if (contactName) {
            var missingContactsString = $window.localStorage.getItem(
                'importedInvalidContacts');
            if (!missingContactsString) {
                missingContactsString = '';
            }
            missingContactsString += (missingContactsString.length !== 0 ? ', ' : '') +
                contactName;
            $window.localStorage.setItem('importedInvalidContacts',
                missingContactsString);
        }
    };

    service.addColorsToContacts = function() {
        angular.forEach(service.contactsArray(), function(uuid) {
            var contact = service.getContactByUuid(uuid);
            if (contact) service.addColorToContact(contact);
        });
    };

    service.addColorToContact = function(contact) {
        if (contact && (!contact.contact_profile_color || contact.contact_profile_color ===
                '') && !service.updatingContactColor[contact.contact_uuid]) {
            var color = randomColor({
                luminosity: 'light'
            });
            service.updatingContactColor[contact.contact_uuid] = true;
            service.updateContactColor(contact.contact_uuid, color)
                .then(function() {
                    delete service.updatingContactColor[contact.contact_uuid];
                });
        }
    };

    service.updateContactByUuid = function(settings) {
        var contactUuid = settings.contact_uuid;
        return dataFactory.postUpdateContactInfo(settings)
            .then(function(response) {
                if (response.data.success) {
                    var organization = null;
                    if (settings.duplicate_number) {
                        organization = settings.contact_organization;
                    }
                    settings.phones.forEach(function(phone) {
                        phone.organization = organization;
                        phone.contact_uuid = contactUuid;
                        service.updateContactPhone(contactUuid, phone);
                    });
                    service.updatePolicies(contactUuid, settings.policies);
                    service.updateContactColor(contactUuid, settings.contact_profile_color);
                    service.updateContactRingtones(contactUuid, settings.newringtones);

                    $rootScope.$broadcast('contacts.updated');
                    return response;
                } else {
                    return response;
                }
            });
    };

    service.getContactRingtones = function(contactUuid) {
        if (service.contactRingtones[contactUuid]) return service.contactRingtones[
            contactUuid];
        return null;
    };

    service.updateContactRingtones = function(contactUuid, newringtones) {
        var contact = service.getContactByUuid(contactUuid);
        if (contact) {
            var callTone = null;
            var textTone = null;
            if (newringtones.callRingtone) {
                callTone = newringtones.callRingtone
                callTone.type = 'callRingtone';
            }
            if (newringtones.textRingtone) {
                textTone = newringtones.textRingtone
                textTone.type = 'textRingtone';
            }

            var data = {
                tones: [],
                userUuid: $rootScope.user.id,
                contactUuid: contactUuid
            };
            angular.forEach(contact.ringtones, function(e) {
                if (callTone && e.type === "callRingtone" && e.contact_ringtone_uuid) {
                    callTone.contact_ringtone_uuid = e.contact_ringtone_uuid;
                }
                if (textTone && e.type === "textRingtone" && e.contact_ringtone_uuid) {
                    textTone.contact_ringtone_uuid = e.contact_ringtone_uuid;
                }
            });
            data.tones.push(callTone);
            data.tones.push(textTone);
            console.log(data);
            dataFactory.postUpdateContactRingtone(data)
                .then(function(response) {
                    if (response.data.success) {
                        //    service.contacts[contactUuid].ringtones = response.data.success.data;
                        $rootScope.$broadcast('contact.ringtones.updated');
                    }
                });
        }
    };

    service.removeContactRingtone = function(contactUuid, type) {
        var data = {
            userUuid: $rootScope.user.id,
            contactUuid: contactUuid,
            type: type
        };
        return dataFactory.postDeleteContactRingtone(data)
            .then(function(response) {
                if (response.data.success) {
                    // var contact = service.getContactByUuid(contactUuid);
                    // if (contact) {
                    //     contact.ringtones = response.data.success.data;
                    // }
                }
                return response;
            });
    };

    service.updateContactPhone = function(contactUuid, phone) {
        if (!phone.contact_phone_uuid) phone.contact_uuid = contactUuid;
        dataFactory.postUpdateContactPhone(phone)
            .then(function(response) {
                if (response.data.success) {
                    // var contact = service.getContactByUuid(contactUuid);
                    // var newphone = response.data.success.data;
                    // if (phone.contact_phone_uuid) {
                    //     var phoneindex = $filter('getByUUID')(contact.phones, phone.contact_phone_uuid, 'contact_phone');
                    //     if (phoneindex !== null) contact.phones[phoneindex] = newphone;
                    // } else {
                    //     angular.forEach(contact.phones, function(item, pindex) {
                    //         if (item.phone_number === phone.phone_number) contact.phones.splice(pindex, 1);
                    //     });
                    //     contact.phones.push(newphone);
                    // }
                    //TO DO should update contact_mobile_phone if Mobile and primary
                    // if (phone.phone_type_text == 1 || phone.phone_label === 'Mobile') contact.contact_mobile_number = phone.phone_number;
                }
            });
    };

    service.updatePolicies = function(contactUuid, policies) {
        var data = {
            contact_uuid: contactUuid,
            policies: policies
        };
        dataFactory.postUpdatePolicies(data)
            .then(function(response) {
                if (response.data.success) {}
            })
    };

    service.toggleContactAsFavorite = function(contactUuid) {
        var contact = service.getContactByUuid(contactUuid);
        return dataFactory.getUpdateFavorite(contactUuid)
            .then(function(response) {
                if (response.data.success) {

                    // contact.favorite = response.data.success.category;
                }
                return response;
            });
    };

    service.updateContactColor = function(contactUuid, color) {
        var data = {
            contact_uuid: contactUuid,
            color: color
        };
        return dataFactory.postUpdateContactColor(data)
            .then(function(response) {
                if (response.data.success) {
                    // var contact = service.getContactByUuid(contactUuid);
                    // contact.contact_profile_color = color;
                }
                return;
            });
    };

    service.searchContactDatabaseByNumber = function(phoneNumber) {
        // if (!phoneNumber) return null;
        return dataFactory.getContactUuidByNumber(phoneNumber, $rootScope.user.id)
            .then(function(response) {
                var contactUuid;
                // console.debug("tmp-getCallsForDomainParked:searchContactDatabaseByNumber:getContactUuidByNumber returned response:" + JSON.stringify(response));
                if (response.data.success) {
                    // console.debug("tmp-getCallsForDomainParked:searchContactDatabaseByNumber:response: " + JSON.stringify(response));

                    contactUuid = response.data.success.data[0];
                    // console.debug("tmp-getCallsForDomainParked:searchContactDatabaseByNumber:contactUuid" + contactUuid);

                    if (service.contacts[contactUuid]) {
                        service.contacts[contactUuid].contacts_count = response.data
                            .success.data[0].length;
                        return service.contacts[contactUuid];
                    } else {
                        return service.loadContactByUuid(contactUuid)
                            .then(function(contact) {
                                if (contact) {
                                    contact.contacts_count = response.data.success
                                        .data[0].length;
                                    service.contacts[contactUuid] = contact;
                                }
                                return contact;
                            });
                    }
                } else {
                    return null;
                }
            });
    };

    // service.searchContactDatabaseByNumberDigest = function(phoneNumber) {
    //     if (service.searchingDatabase[call.contact_number]) {
    //         return null;
    //     } else {
    //         return dataFactory.getContactUuidByNumber(phoneNumber, $rootScope.user.id)
    //         .then(function(response){
    //             var contactUuid;
    //             if (response.data.success) {
    //                 contactUuid = response.data.success.data[0];
    //                 if (service.contacts[contactUuid]) {
    //                     service.contacts[contactUuid].contacts_count = response.data.success.data[0].length;
    //                     return service.contacts[contactUuid];
    //                 } else {
    //                     return service.loadContactByUuid(contactUuid)
    //                     .then(function(response){
    //                         response.contacts_count = response.data.success.data[0].length;
    //                         return response;
    //                     });
    //                 }
    //             } else {
    //                 return null;
    //             }
    //         });
    //     }
    // };

    // service.getContactByEmail = function(email) {
    //     var contact = usefulTools.find(service.contacts, 'contact_email_address', email);
    //     if (contact) {
    //         return contact;
    //     } else {
    //         return service.searchContactDatabaseByEmail(email);
    //     }
    // };

    service.searchContactDatabaseByEmail = function(email) {
        return dataFactory.getContactUuidByEmail(email, $rootScope.user.id)
            .then(function(response) {
                var contactUuid;
                if (response.data.success) {
                    contactUuid = response.data.success.data;
                    if (service.contacts[contactUuid]) {
                        return service.contacts[contactUuid];
                    } else {
                        return service.loadContactByUuid(contactUuid)
                            .then(function(response) {
                                return response;
                            });
                    }
                }
                return null;
            });
    };

    service.countUsers = function() {
        return service.userContactsArray() ? service.userContactsArray().length : 0;
    };

    service.selectContact = function(contact) {
        if ($rootScope.selectedContacts[contact.contact_uuid] === undefined) {
            $rootScope.selectedContacts[contact.contact_uuid] = true;
        } else {
            $rootScope.selectedContacts[contact.contact_uuid] = !$rootScope.selectedContacts[
                contact.contact_uuid];
        }
        var index = $filter('getByUUID')($rootScope.contactsSelected, contact.contact_uuid,
            'contact');
        if (index !== null) {
            if (!$rootScope.selectedContacts[contact.contact_uuid]) $rootScope.contactsSelected
                .splice(index, 1);
        } else {
            if ($rootScope.selectedContacts[contact.contact_uuid]) $rootScope.contactsSelected
                .push(contact);
        }
    };

    service.selectContact2 = function(contact, phone) {
        if ($rootScope.selectedContacts[contact.contact_uuid] === undefined) {
            $rootScope.selectedContacts[contact.contact_uuid] = true;
        } else {
            $rootScope.selectedContacts[contact.contact_uuid] = !$rootScope.selectedContacts[
                contact.contact_uuid];
        }

        var index = $filter('getByNumber')($rootScope.contactsSelected2, phone.phone_number);
        if (index == null) {
            var data = {
                contact_name_full: contact.contact_name_full,
                contact_mobile_number: phone.phone_number
            };
            $rootScope.contactsSelected2.push(phone.phone_number);
            $rootScope.contactsSelected.push(data);
        }
    };

    service.registerOnContactLoadCallback = function(callback) {
        if (service.contactsLoaded) {
            performCallbackCollection([callback]);
        } else {
            service.onContactLoadCallbacks.push(callback);
        }
    };

    service.registerOnUserContactLoadCallback = function(callback) {
        if (service.userContactsLoaded) {
            performCallbackCollection([callback]);
        } else {
            service.onUserContactLoadCallbacks.push(callback);
        }
    };

    service.registerOnProfileImageChange = function(callback) {
        service.onProfileImageChangeCallbacks.push(callback);
    };

    service.setContactProfileImage = function(contact, image) {
        contact.contact_profile_image = image;
        performCallbackCollection(service.onProfileImageChangeCallbacks, contact);
    };

    service.performUserProfileImageChangeCallbacks = function(userUuid, image) {
        performCallbackCollection(service.onProfileImageChangeCallbacks, {
            user_uuid: userUuid,
            contact_profile_image: image
        });
    };

    service.userContactTotalMaxedOut = function() {
        return false; //BKG
        var nonUserContacts = getNonUserContactsOnlyFromCollection(service.contacts);
        return nonUserContacts.length >= 1000;
    };

    service.removeContactFromCollectionByUuid = function(collection, contactUuid) {
        delete collection[contactUuid];
        return collection;
    };

    service.deleteContact = function(contactUuid) {
        return dataFactory.getDeleteUserContact(contactUuid)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.$broadcast('contact.deleted', contactUuid);
                    $rootScope.$broadcast('contacts.updated');
                    service.totalContacts -= 1;
                    return response;
                } else {
                    return false;
                }
            });
    };

    service.getContactbyMMId = function(mmId) {
        var contactMatchesMMId = function(contact) {
            return contact && contact.chat_id === mmId;
        };
        return _.find(service.getUserContactsOnly(), contactMatchesMMId);
    };

    service.deleteContactFromList = function(contactUuid) {
        delete service.contacts[contactUuid];
        delete service.contactsByDomain[$rootScope.user.domain_uuid][contactUuid];
    };

    service.getAmsContactByNumber = function(number) {
        var uuids = service.contactNumbers[number];
        if (uuids) {
            var contacts = [];
            var contact;
            angular.forEach(uuids, function(uuid) {
                contact = service.getContactByUuid(uuid);
                if (contact && contact.contact_type === 'amscontact') contacts.push(
                    contact);
            });
            if (contacts.length > 0) return contacts[0];
        }
        return null;
        // var contacts = Object.values(service.amsContacts);
        // var contact;
        // for (var i = 0; i < contacts.length; i++) {
        //     contact = contacts[i];
        //     if (contact.mobile_phone === number || contact.residence_phone === number ||
        //         contact.business_phone === number) {
        //         return contact;
        //     }
        // }
    };

    service.getQQContactByNumber = function(number) {
        var uuids = service.contactNumbers[number];
        if (uuids) {
            var contacts = [];
            var contact;
            angular.forEach(uuids, function(uuid) {
                contact = service.getContactByUuid(uuid);
                if (contact && contact.contact_type === 'qqcontact') contacts.push(
                    contact);
            });
            if (contacts.length > 0) return contacts[0];
        }
        return null;
        // for (var i = 0; i < uuids.length; i++) {
        //     contact = service.getContactByUuid(uuids[i]);
        //     if (contact.contact_mobile_phone === number || contact.home_phone === number ||
        //         contact.business_phone === number ||
        //         contact.work_phone === number) {
        //         return contact;
        //     }
        // }
    };

    function performCallbackCollection(collection, data) {
        angular.forEach(collection, function(fn) {
            fn(service, data);
        });
    };

    function makeString(input) {
        var string = JSON.stringify(input);
        return string;
    }

    function removeNonNumbersFromString(string) {
        if (string) return string.replace(/[^0-9]/g, '');
        return string;
    };

    function packageContactForHashCheck(contact) {
        var phoneNumber = contact.phones[0].phone_number;
        if (phoneNumber.length > 10) {
            contact.phones[0].phone_number = phoneNumber.slice(1, phoneNumber.length);
        }
        return {
            contact_name_family: contact.input.contact_name_family,
            contact_name_given: contact.input.contact_name_given,
            phone_number: removeNonNumbersFromString(contact.phones[0].phone_number)
        };
    };

    function getUserContactsOnlyFromCollection(contacts) {
        return contacts.filter(function(contact) {
            return contact.contact_type === 'user';
        });
    };

    function getNonUserContactsOnlyFromCollection(contacts) {
        return contacts.filter(function(contact) {
            return contact.contact_type !== 'user';
        });
    };

    service.clearInfo = function() {
        service.contacts = {};
        service.domainContacts = {};
        service.favorites = {};
        service.contactRingtones = {};
        service.userContacts = {};
        service.contactNumbers = {};
        service.contactNumbers = {};
        service.userContactNumbers = {};
        service.partnerContacts = {};
        // service.qqContacts = {};
        service.contactsLoaded = false;
        service.domainContacts = {};
        service.userContacts = {};
        service.contactNumbers = {};
        service.userContactNumbers = {};
        service.nonContactNumbers = {};
        service.data.initialContactsLoaded = false;
        if ($rootScope.user) {
            if (service.contactsRef) service.contactsRef.off();
            if (service.thinContactsRef) service.thinContactsRef.off();
            if (service.userContactsRef) service.userContactsRef.off();
            if (service.partnerContactsRef) service.partnerContactsRef.off();
            if (service.numbersRef) service.numbersRef.off();
            if (service.userNumbersRef) service.userNumbersRef.off();
            if (service.favoritesRef) service.favoritesRef.off();
            if (service.ringtonesRef) service.ringtonesRef.off();
        }
        service.logoutOfFirebase();
    };

    return service;
});
