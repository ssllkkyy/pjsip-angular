'use strict';

proySymphony.service('emulationService', function(contactService, dataFactory, $rootScope,
    metaService) {

    var service = {
        emulatedCompany: null,
        emulatedUser: null,
        emulationStatus: {},
        emulatedUserContacts: {},
        callbackEvents: ['onNewEmulatedCompany']
    };

    var triggerEvent = metaService.getCallbackEventTriggerFn(service);
    metaService.initializeServiceCallbackColls(service);
    metaService.attachServiceEventRegistrationFns(service);

    service.setEmulatedCompany = function(domain) {
        var domainUuid = domain.domain_uuid;
        service.emulatedCompany = domain;
        // service.assignEmulatedDomainContacts(domainUuid).then(function(response) {
        triggerEvent('onNewEmulatedCompany');
        // });
    };

    service.assignEmulatedDomainContacts = function(domainUuid) {
        // return contactService.findDomainContacts(domainUuid).then(function(contacts) {
        //     if (contacts) {
        //         // if (domainUuid !== $rootScope.user.domain.domain_uuid) {
        //         //     contacts = contacts.filter(function(contact) {
        //         //         return contact.contact_uuid !== $rootScope.user.contact_uuid &&
        //         //             contact.domain_uuid === domainUuid;
        //         //     });
        //         // }

        //     }
        // });
    };

    service.getCurrentDomainUuid = function() {
        var domainUuid;
        if (service.emulatedCompany) {
            domainUuid = service.emulatedCompany.domain_uuid;
        } else {
            domainUuid = $rootScope.user.domain.domain_uuid;
        }
        return domainUuid;
    };

    service.init = function() {
        service.setEmulationStatus();
    };

    service.setEmulationStatus = function() {
        dataFactory.getManagerEmulationStatus()
            .then(function(response) {
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                    service.emulationStatus = {};
                } else {
                    service.emulationStatus = response.data.success.data;
                    $rootScope.emulationStatus = response.data.success.data; //leave here for now
                    if (__env.enableDebug) console.log("MANAGER EMULATION STATUS");
                    if (__env.enableDebug) console.log(service.emulationStatus);
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                service.emulationStatus = {};
            });
    };

    service.isEmulatedUser = function() {
        return service.emulatedUser;
    };

    service.clearEmulation = function() {
        service.emulatedUser = null;
        service.emulatedUserContacts = {};
    };

    service.clearInfo = function() {
        service.clearEmulation();
        service.emulationStatus = {};
    };

    return service;
});
