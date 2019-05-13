'use strict';

proySymphony.service('userContactService', function($http, $auth, smsApi, $rootScope, $window, _,
    dataFactory, $filter, $q, $timeout, usefulTools) {

    var service = {
        contacts: {},
        contactThreshold: 600,
        totalContacts: 0,
        userContactsOnly: [],
        searchContacts: {},
        onContactLoadCallbacks: [],
        onProfileImageChangeCallbacks: [],
        onAllContactsLoadedCallbacks: [],
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
        favoritesFilter: false,
        amsSearchContacts: [],
        qqSearchContacts: [],
        amsContacts: {},
        qqContacts: {}
    };


    service.setContacts = function(inBackground) {
        // console.debug("START SET CONTACTS");
        if (!inBackground) service.loadingContacts = true;
        service.loadBasicContactInfo($rootScope.user.id);
        // service.contacts = service.getContactDomainCollection($rootScope.user.domain_uuid);
        return service.setUserContactsOnly().then(function(response) {
            // console.debug("USER CONTACTS SET");
            // console.debug(response);
            $rootScope.$broadcast('user.contacts.set');
            if (response) {
                return service.getContacts().then(function(contacts) {
                    if (contacts) {
                        service.loadingContacts = false;
                        // console.debug("ALL CONTACTS SET");
                        service.contactLoadInfo.loading = false;
                        // service.addColorsToContacts(contacts);
                        // addContactPhoneNumberToContacts(contacts);
                        // performCallbackCollection(service.onContactLoadCallbacks);
                        // service.data.initialContactsLoaded = true;
                        // $rootScope.$broadcast('initial.contacts.loaded');
                        $rootScope.$broadcast('contacts.updated');
                        service.contacts = _.extend(service.contacts,
                            contacts);
                        performCallbackCollection(service.onAllContactsLoadedCallbacks);
                        service.data.allContactsLoaded = true;

                        return service.contacts;
                    } else {
                        return false;
                    }
                });
            } else {
                return false;
            }
        });
    };

    service.setUserContactsOnly = function() {
        return service.loadUserContactsOnly().then(function(contacts) {
            if (contacts) {
                service.addColorsToContacts(contacts);
                service.userContactsOnly = _.keys(contacts);
                // console.debug(service.contacts);
                service.contacts = _.extend(service.contacts, contacts);
                // console.debug(service.contacts);
                performCallbackCollection(service.onContactLoadCallbacks);
                service.data.initialContactsLoaded = true;
                // $rootScope.$broadcast('initial.contacts.loaded');
                return service.contacts;
            } else {
                return false;
            }
        });
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
        var array = [];
        angular.forEach(service.userContactsOnly, function(contactUuid) {
            if (service.contacts[contactUuid]) array.push(service.contacts[
                contactUuid]);
        });
        return array;
    };

    service.getUserContactsOnlyByDomain = function(domainUuid) {
        if (!domainUuid) {
            domainUuid = $rootScope.user.domain_uuid;
        }
        return service.loadUserContactsOnly(domainUuid);
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
                if (response.data.success) {
                    service.setContacts();
                }
                return response;
            });
    };

    service.largeContacts = function() {
        // console.log(service.totalContacts + ' > '+ service.contactThreshold);
        return service.totalContacts > service.contactThreshold;
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
                    if (Object.keys(service.amsContacts).length === 0) {
                        var contactObj = usefulTools.arrayToObjectByProp(
                            response.data.success.data, 'ams_360_contact_uuid'
                        );
                        angular.copy(contactObj, service.amsContacts);
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
                    if (Object.keys(service.qqContacts).length === 0) {
                        var contactObj = usefulTools.arrayToObjectByProp(
                            response.data.success.data,
                            'qq_catalyst_contacts_uuid'
                        );
                        angular.copy(contactObj, service.qqContacts);
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
                        $rootScope.$broadcast('new.contact.added', contact);
                        return contact;
                    }
                } else {
                    return null;
                }
            });
    };

    service.getContactByUuid = function(contactUuid, domainUuid, lookUp) {
        if (contactUuid) {
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
        }
        return null;
    };

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

    service.getContactByUserUuid = function(userUuid, domainUuid) {
        var contacts = domainUuid ? service.contactsByDomain[domainUuid] : service.getUserContactsOnly();
        if (domainUuid && domainUuid === $rootScope.user.domain_uuid) contacts =
            service.getUserContactsOnly();
        return usefulTools.find(contacts, 'user_uuid', userUuid);
    };

    service.getContactByExtUuid = function(extUuid, domainUuid) {
        var contacts = domainUuid ? service.contactsByDomain[domainUuid] : service.getUserContactsOnly();
        if (domainUuid && domainUuid === $rootScope.user.domain_uuid) contacts =
            service.getUserContactsOnly();
        var contact = usefulTools.find(contacts, 'extension_uuid', extUuid);
        return contact;
    };

    service.removeContactByUuid = function(contactUuid, domainUuid) {
        delete service.contacts[contactUuid];
        delete service.contactsByDomain[domainUuid][contactUuid];
    };

    service.deleteContactPhone = function(contactUuid, contact_phone_uuid) {
        dataFactory.deleteContactPhone(contact_phone_uuid)
            .then(function(response) {
                if (response.data.success) {
                    var pindex = $filter('getByUUID')(service.contacts[contactUuid]
                        .phones, contact_phone_uuid, 'contact_phone');
                    if (pindex !== null) service.contacts[contactUuid].phones.splice(
                        pindex, 1);
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
            phones: makeString(params.phones)
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
        var number, email;
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
        if (entity.contact_uuid) {
            if (service.contacts[entity.contact_uuid]) {
                return service.contacts[entity.contact_uuid];
            } else {
                if (!service.loadingContact[entity.contact_uuid]) {
                    service.loadingContact[entity.contact_uuid] = true;
                    return service.loadContactByUuid(entity.contact_uuid, $rootScope.user
                            .domain_uuid)
                        .then(function(response) {
                            if (response) {
                                delete service.loadingContact[entity.contact_uuid];
                                return response;
                            } else {
                                entity.contact_uuid = null;
                                if (type === 'sms') smsApi.postUpdateThreadContact(
                                    entity);
                                if (type === 'call') dataFactory.postUpdateCallContact(
                                    entity);
                                if (type === 'voicemail') dataFactory.postUpdateVoicemailContact(
                                    entity);
                                return null;
                            }
                        });
                }
            }
        } else {
            var contact = $filter('getContactbyPhone')(usefulTools.convertObjectToArray(
                service.contacts), number);
            if (contact) {
                entity.contact_uuid = contact.contact_uuid;
                if (type === 'sms') smsApi.postUpdateThreadContact(entity);
                if (type === 'call') dataFactory.postUpdateCallContact(entity);
                if (type === 'voicemail') dataFactory.postUpdateVoicemailContact(entity);
                return contact;
            } else {
                if (service.searchingDatabase[number]) {
                    return null;
                } else {
                    service.searchingDatabase[number] = true;
                    if (!service.nonContactNumbers[number]) {
                        service.searchContactDatabaseByNumber(number)
                            .then(function(response) {
                                if (response) {
                                    entity.contact_uuid = response.contact_uuid;
                                    if (type === 'sms') smsApi.postUpdateThreadContact(
                                        entity);
                                    if (type === 'call') dataFactory.postUpdateCallContact(
                                        entity);
                                    if (type === 'voicemail') dataFactory.postUpdateVoicemailContact(
                                        entity);
                                    delete service.searchingDatabase[number]
                                    return response;
                                } else {
                                    delete service.searchingDatabase[number];
                                    service.nonContactNumbers[number] = true;
                                    return null;
                                }
                            });
                        return null;
                    } else {
                        return null;
                    }
                }
            }
        }
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

    service.addColorsToContacts = function(contacts) {
        angular.forEach(contacts, function(contact) {
            service.addColorToContact(contact);
        });
    };

    service.addColorToContact = function(contact) {
        if (!contact.contact_profile_color || contact.contact_profile_color === '') {
            var color = randomColor({
                luminosity: 'light'
            });

            var data = {
                category: 'profile',
                name: 'color',
                value: color,
                contact_uuid: contact.contact_uuid
            };
            dataFactory.updateContactSetting(data)
                .then(function(response) {
                    if (response.error) {
                        if (__env.enableDebug) console.log(response.error.message);
                    } else {
                        contact.contact_profile_color = color;
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log("ERROR DOING COLOR" + JSON.stringify(
                        error));
                });
        }
    };

    service.updateContactByUuid = function(settings) {
        var contactUuid = settings.contact_uuid;
        return dataFactory.postUpdateContactInfo(settings)
            .then(function(response) {
                if (response.data.success) {
                    var contact = service.getContactByUuid(contactUuid);
                    angular.forEach(settings, function(value, key) {
                        if (key !== 'phones') contact[key] = value;
                    });
                    contact.contact_name_full = contact.contact_name_given + ' ' +
                        contact.contact_name_family;
                    if (!settings.contact_profile_image) contact.contact_profile_image =
                        null;
                    var organization = null;
                    if (settings.duplicate_number) {
                        organization = settings.contact_organization;
                    }
                    settings.phones.forEach(function(phone) {
                        phone.organization = organization;
                        phone.contact_uuid = contactUuid;
                        service.updateContactPhone(contactUuid, phone);
                    });
                    service.updateContactColor(contactUuid, settings.contact_profile_color);
                    service.updateContactRingtones(contactUuid, settings.newringtones);
                    $rootScope.$broadcast('contacts.updated');
                    $timeout(function() {
                        service.setContacts(true);
                    }, 5000);
                    return response;
                } else {
                    return response;
                }
            });
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

            dataFactory.postUpdateContactRingtone(data)
                .then(function(response) {
                    if (response.data.success) {
                        service.contacts[contactUuid].ringtones = response.data.success
                            .data;
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
                    var contact = service.getContactByUuid(contactUuid);
                    if (contact) {
                        contact.ringtones = response.data.success.data;
                    }
                }
                return response;
            });
    };

    service.updateContactPhone = function(contactUuid, phone) {
        if (!phone.contact_phone_uuid) phone.contact_uuid = contactUuid;
        dataFactory.postUpdateContactPhone(phone)
            .then(function(response) {
                if (response.data.success) {
                    var contact = service.getContactByUuid(contactUuid);
                    var newphone = response.data.success.phone;
                    if (phone.contact_phone_uuid) {
                        var phoneindex = $filter('getByUUID')(contact.phones, phone
                            .contact_phone_uuid, 'contact_phone');
                        if (phoneindex !== null) contact.phones[phoneindex] =
                            newphone;
                    } else {
                        angular.forEach(contact.phones, function(item, pindex) {
                            if (item.phone_number === phone.phone_number)
                                contact.phones.splice(pindex, 1);
                        });
                        contact.phones.push(newphone);
                    }
                    //TO DO should update contact_mobile_phone if Mobile and primary
                    if (phone.phone_type_text == 1 || phone.phone_label ===
                        'Mobile') contact.contact_mobile_number = phone.phone_number;
                }
            });
    };

    service.toggleContactAsFavorite = function(contactUuid) {
        return dataFactory.getToggleFavorite(contactUuid)
            .then(function(response) {
                if (response.data.success) {
                    var contact = service.getContactByUuid(contactUuid);
                    contact.favorite = response.data.success.category;
                }
                return response;
            });
    };

    service.updateContactColor = function(contactUuid, color) {
        var data = {
            contact_uuid: contactUuid,
            color: color
        };
        dataFactory.postUpdateContactColor(data)
            .then(function(response) {
                if (response.data.success) {
                    var contact = service.getContactByUuid(contactUuid);
                    contact.contact_profile_color = color;
                }
            });
    };

    service.getContactByPhoneNumber = function(phoneNumber) {
        if (!phoneNumber) {
            return null;
        }
        var contact = $filter('getContactbyPhone')(usefulTools.convertObjectToArray(
            service.contacts), phoneNumber);
        if (contact) {
            return contact;
        } else {
            return service.searchContactDatabaseByNumber(phoneNumber);
        }
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

    service.getContactByEmail = function(email) {
        var contact = usefulTools.find(service.contacts, 'contact_email_address', email);
        if (contact) {
            return contact;
        } else {
            return service.searchContactDatabaseByEmail(email);
        }
    };

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
        var count = 0;
        if (service.userContactsOnly) count = service.userContactsOnly.length;
        return count;
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

    service.updateContactStatus = function(contactUuid, status) {
        var contact = service.contacts[contactUuid];
        if (contact) contact.status = status;
    };

    service.registerOnContactLoadCallback = function(callback) {
        if (service.data.initialContactsLoaded) {
            performCallbackCollection([callback]);
        } else {
            service.onContactLoadCallbacks.push(callback);
        }
    };

    service.registerOnAllContactsLoadedCallbacks = function(callback) {
        if (service.data.allContactsLoaded) {
            performCallbackCollection([callback]);
        } else {
            service.onAllContactsLoadedCallbacks.push(callback);
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
                    service.removeContactFromCollectionByUuid(service.contacts,
                        contactUuid);
                    var index = service.userContactsOnly.indexOf(contactUuid);
                    if (index !== -1) service.userContactsOnly.splice(index, 1);
                    if ($rootScope.contactsAvailable) {
                        var index = $filter('getIndexbyUUID')($rootScope.contactsAvailable,
                            contactUuid);
                        if (index !== null) $rootScope.contactsAvailable.splice(
                            index, 1);
                    }
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
            return contact.chat_id === mmId;
        };
        return _.find(service.getUserContactsOnly(), contactMatchesMMId);
    };

    service.deleteContactFromList = function(contactUuid) {
        delete service.contacts[contactUuid];
        delete service.contactsByDomain[$rootScope.user.domain_uuid][contactUuid];
    };

    service.getAmsContactByNumber = function(number) {
        var contacts = Object.values(service.amsContacts);
        var contact;
        for (var i = 0; i < contacts.length; i++) {
            contact = contacts[i];
            if (contact.mobile_phone === number || contact.residence_phone === number ||
                contact.business_phone === number) {
                return contact;
            }
        }
    };

    service.getQQContactByNumber = function(number) {
        var contacts = Object.values(service.qqContacts);
        var contact;
        for (var i = 0; i < contacts.length; i++) {
            contact = contacts[i];
            if (contact.mobile_phone === number || contact.home_phone === number ||
                contact.business_phone === number ||
                contact.work_phone === number) {
                return contact;
            }
        }
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
        service.contactLoadInfo = {};
        service.allContactBasicInfo = [];
        service.loadingContact = {};
        service.searchingDatabase = {};
        service.nonContactNumbers = {};
        service.contactsByDomain = {};
        service.userContactsOnly = [];
        service.data.initialContactsLoaded = false;
    };

    return service;
});
