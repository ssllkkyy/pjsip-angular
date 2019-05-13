'use strict';

proySymphony.service('domainService', function(dataFactory, $rootScope) {
    var service = {
        domains: [],
        emulatedCompany: null,
        rawDomains: []
    };

    service.getDomains = function() {
        if (service.domains.length < 1) {
            return service.loadDomains();
        } else {
            return new Promise(function(resolve) {
                resolve(service.domains);
            });
        }
    };

    service.loadDomains = function() {
        return dataFactory.getDomains()
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    angular.copy(response.data.success.data, service.domains);
                    return service.domains;
                } else {
                    return false;
                };
            });
    };

    service.getRawDomains = function(type) {
        if (!type) type = 'none';
        return dataFactory.getRawDomains(type)
            .then(function(response) {
                console.log(response.data.success.data);
                if (response.data.success) {
                    service.rawDomains = response.data.success.data;
                }
                return response;
            });
    }

    service.loadDomainDids = function(domain_uuid) {
        return dataFactory.getDomainDids(domain_uuid)
            .then(function(response) {
                if (response.data.success) {
                    return response.data.success;
                } else {
                    console.log(response.data.error.message);
                    $rootScope.showErrorAlert('Unable to retrieve DIDs')
                    return [];
                }
            });
    };

    service.getDomainByUuid = function(domainUuid) {
        if (service.domains[domainUuid]) return service.domains[domainUuid];
        return null;
    };

    service.rootDomainName = function(){
        return $rootScope.user.domain.domain_description;
    };

    service.postUpdateNumberPort = function(info) {
        return dataFactory.postUpdateNumberPort(info)
            .then(function(response) {
                return response.data;
            });
    };

    service.getUuidType = function(port) {
        var uuidType;
        if (port.number_type === 'did') uuidType = 'destination';
        if (port.number_type === 'sms') uuidType = 'phone_number';
        if (port.number_type === 'fax') uuidType = 'vfax';
        return uuidType;
    };

    service.loadDomainInfo = function(domainUuid) {
        return dataFactory.getDomainInfo(domainUuid)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    return response.data.success.data;
                } else {
                    return null;
                }
            });
    };

    service.loadDomainDetails = function(domainUuid) {
        return dataFactory.getDomainDetails(domainUuid)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    return response.data.success.data;
                } else {
                    return null;
                }
            });
    };

    return service;
});
