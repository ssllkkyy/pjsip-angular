'use strict';

proySymphony.service('e911Service', function(dataFactory, $rootScope, usefulTools) {
    var service = {
        e911CandidateDIDsByDomain: {}
    };

    service.registerE911Phone = function(destinationUuid, addressInfo) {
        var data = {
            destination_uuid: destinationUuid,
            address_details: addressInfo
        };
        return dataFactory.postOrderE911(data).then(function(response) {
            $rootScope.showalerts(response);
            if (response.data.success) {
                var registration = response.data.success.data;
                return registration;
            } else {
                return false;
            }
        });
    };

    service.orderE911Address = function(domainUuid, addressInfo) {
        if (addressInfo.default === true) addressInfo.default = 'true';
        var data = {
            domain_uuid: domainUuid,
            address_details: addressInfo
        };
        return dataFactory.postOrderNewE911Address(data).then(function(response) {
            console.log(response.data);
            $rootScope.showalerts(response);
            if (response.data.success) {
                var registration = response.data.success.data;
                return registration;
            } else {
                return false;
            }
        });
    };

    service.getValidDIDs = function(domainUuid) {
        return dataFactory.getValidDIDs(domainUuid).then(function(response) {
            if (response.data.success) {
                var DIDs = response.data.success.data;
                console.log(DIDs);
                DIDs = usefulTools.createObjectCollByItemProperty(DIDs,
                    'destination_number');
                return DIDs;
            } else {
                return false;
            }
        });
    };

    service.getE911CandidateDIDs = function(domainUuid) {
        return dataFactory.getValidE911CandidateDIDs(domainUuid).then(function(response) {
            if (response.data.success) {
                var DIDs = service.e911CandidateDIDsByDomain[domainUuid] =
                    response.data.success.data;
                // DIDs = usefulTools.convertObjectToArray(DIDs);
                DIDs = usefulTools.createObjectCollByItemProperty(DIDs,
                    'destination_uuid');
                return DIDs;
            } else {
                return false;
            }
        });
    };

    service.getE911Registrations = function(domainUuid) {
        return dataFactory.getE911Registrations(domainUuid).then(function(response) {
            if (response.data.success.data) {
                var registrations = response.data.success.data;
                registrations =
                    usefulTools.createObjectCollByItemProperty(registrations,
                        'destination_uuid');
                return registrations;
            } else {
                return false;
            };
        });
    };

    service.assignCallerIdNumber = function(userUuid, destinationUuid) {
        return dataFactory.getAssignE911(userUuid, destinationUuid).then(function(
            response) {
            console.log(response.data);
            if (response.data.success) {
                var data = response.data.success.data;
                var extension = data.extension;
                return extension;
            } else {
                return false;
            }
        });
    };

    service.setDefaultE911Address = function(reg) {
        return dataFactory.getSetDefaultE911Address(reg.e911_registration_uuid)
            .then(function(response) {
                return response.data;
            });
    };

    // service.postIsValidAddress = function(addressInfo) {
    //     return dataFactory.postIsValidAddress(addressInfo).then(function(response) {
    //         debugger;
    //     });
    // };

    // service.getRemoveURIFromE911System = function(destinationUuid) {
    //     return dataFactory.getRemoveURIFromE911System(destinationUuid).then(function(response) {
    //         // debugger;
    //     });
    // };

    var getDestinationNumber = function(did) {
        return did.destination_number;
    };

    return service;
});
