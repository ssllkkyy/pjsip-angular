'use strict';

proySymphony.service('statusService', function(dataFactory, $rootScope, emulationService,
    resourceFrameworkService, metaService, usefulTools, contactService, Idle) {

    var service = {
        defaultStatuses: {
            available: {
                statusName: 'Available',
                receiveCalls: true,
                isDefault: true,
                icon: 'fa-check-circle cls-color-green-tkg'
            },
            away: {
                statusName: 'Away',
                receiveCalls: false,
                id: 'away',
                isDefault: true,
                icon: 'fa-clock-o cls-color-yellow-tkg'
            },
            doNotDisturb: {
                statusName: 'Do Not Disturb',
                receiveCalls: false,
                isDefault: true,
                icon: 'fa-minus-circle cls-color-red-tkg'
            },
            busyOnCall: {
                statusName: 'Busy on Call',
                receiveCalls: true,
                isDefault: true,
                icon: 'fa-volume-control-phone cls-color-red-tkg'
            },
            offline: {
                statusName: 'Offline',
                icon: 'fa fa-times-circle-o cls-color-lt-grey-tkg',
                receiveCalls: false,
                isDefault: true
            }
        },
        customStatuses: {},
        customStatusesOld: [],
        userContact: null,
        callbackEvents: ['onBeforeStatusChange', 'onStatusChangeSuccess'],
        fnDocs: {}
    };


    $rootScope.domainsStatus = service.customStatusesOld;

    // register functions have format: registerEventNameHereCallback
    var triggerEvent = metaService.withCallbacks(service);

    var rfs = resourceFrameworkService;
    var getResourceFn = rfs.getResourceFnForService({
        service: service,
        serviceName: 'statusService',
        docTarget: service.fnDocs
    });

    emulationService.registerOnNewEmulatedCompanyCallback(function() {
        service.loadCustomStatuses();
    });

    service.init = function() {
        metaService.registerOnRootScopeUserLoadCallback(function() {
            service.loadCustomStatuses().then(function(response) {
                var status = $rootScope.user.user_status;
                if (!status || status === "Offline") {
                    status = "Available";
                    service.setStatusAndPersist(status);
                } else {
                    service.setStatus(status);
                }
            });
        });
    };

    service.doHardStatusUpdate = function(statusName) {
        var originalStatusName;
        if ($rootScope.user && $rootScope.user.user_status) {
            originalStatusName = $rootScope.user.user_status.statusName ?
                $rootScope.user.user_status.statusName : $rootScope.user.user_status;
        } else {
            originalStatusName = "Available";
        }
        var status = findStatusByStatusName(statusName);
        if (status && (status.active || status.isDefault)) {
            triggerEvent('onBeforeStatusChange', statusName);
            var data = {
                status: status.statusName,
                status_uuid: status.statusUuid ? status.statusUuid : null
            };
            service.setStatus(status);
            return dataFactory.updateStatus(data).then(function(response) {
                if (response.data.error) {
                    if (originalStatusName) {
                        service.setStatus(originalStatusName);
                    }
                    return false;
                } else {
                    if (status.statusName === 'Available') {
                        Idle.watch();
                    };
                    console.warn("STATUS PERSISTED TO ONESCREEN AS " + status.statusName);
                    triggerEvent('onStatusChangeSuccess');
                    return true;
                }
            });
        }
    };

    service.setStatusAndPersist = function(statusName) {
        if (!_.isString(statusName)) {
            return metaService.getPromiseWithVal(null);
        }
        var originalStatusName;
        if ($rootScope.user && $rootScope.user.user_status) {
            originalStatusName = $rootScope.user.user_status.statusName ?
                $rootScope.user.user_status.statusName : $rootScope.user.user_status;
        } else {
            originalStatusName = "Available";
        }
        var status = findStatusByStatusName(statusName);
        if (status && (status.active || status.isDefault) &&
            status !== $rootScope.user.user_status) {
            triggerEvent('onBeforeStatusChange', statusName);
            var data = {
                status: status.statusName,
                status_uuid: status.statusUuid ? status.statusUuid : null
            };
            console.log(data);
            service.setStatus(status);
            return dataFactory.updateStatus(data).then(function(response) {
                if (response.data.error) {
                    if (originalStatusName) {
                        service.setStatus(originalStatusName);
                    }
                    return false;
                } else {
                    if (status.statusName === 'Available') {
                        Idle.watch();
                    };
                    console.warn("STATUS PERSISTED TO ONESCREEN AS " + status.statusName);
                    triggerEvent('onStatusChangeSuccess');
                    return true;
                }
            });
        } else {
            return new Promise(function(resolve) {
                resolve(null);
            });
        }
    };

    service.setStatus = function(status) {
        if (_.isString(status)) {
            status = findStatusByStatusName(status);
        }
        console.warn("SETTING STATUS IN UI AS " + status.statusName);
        $rootScope.user.user_status = status;
    };

    service.getCurrentStatus = function() {
        return $rootScope.user.user_status;
    };

    service.getCurrentStatusName = function() {
        if (!$rootScope.user) return null;
        var contact = contactService.getContactByUuid($rootScope.user.contact_uuid);
        return contact ? contact.status : null;

        var currentStatus = service.getCurrentStatus();
        return currentStatus ? currentStatus.statusName : null;
    };

    service.unavailable = function() {
        var currentStatus = $rootScope.user.user_status;
        var currentStatusName = currentStatus.statusName;
        var statusName = _.lowerCase(currentStatusName);
        return !currentStatus.receiveCalls;
    };

    $rootScope.changeUserStatus = service.setStatus;

    $rootScope.$on('update.user.status', function(event, status) {
        service.setStatusAndPersist(status);
    });

    service.loadCustomStatuses = getResourceFn({
        apiFn: dataFactory.getDomainsStatus,
        handlerData: {
            target: service.customStatuses,
            handleType: 'copy',
            propertyName: 'status_name',
            dataMapping: function(resource) {
                angular.copy(resource, service.customStatusesOld);
                return mapApiCustomStatuses(resource);
            },
            onBeforeHandle: function(handlerData) {
                if (!handlerData.requestData) {
                    handlerData.requestData = emulationService.getCurrentDomainUuid();
                }
            }
        },
        doc: {
            loadCustomStatuses: {
                server: {
                    type: ['get'],
                    requiredParams: ['domainUuid for desired statuses']
                }
            }
        }
    });

    service.updateCustomStatus = getResourceFn({
        apiFn: dataFactory.insDomainsStatus,
        handlerData: {
            handleType: 'copy',
            resourceName: 'customStatuses',
            onBeforeHandle: function(handlerData) {
                var status = handlerData.requestData;
                handlerData.target = status;
            },
            onSuccess: function(resource, handlerData) {

            }
        }
    });

    service.mapCustomStatusToDBForm = mapCustomStatusToDBForm;

    service.getStatusIcon = function(statusName, size) {
        if (statusName) {
            if (!size) {
                size = "";
            }
            var status = findStatusByStatusName(statusName);
        }
        if (status) {
            return "fa " + status.icon + " " + size;
        } else {
            return "fa fa-times-circle-o cls-color-lt-grey-tkg " + size;
        }
    };
    usefulTools.funcPutIcon = service.getStatusIcon;

    function findStatusByStatusName(statusName) {
        statusName = wordsToSnakeCase(statusName);
        if (service.defaultStatuses[statusName]) {
            return service.defaultStatuses[statusName];
        } else {
            return service.customStatuses[statusName];
        }
    };

    function mapApiCustomStatuses(statuses) {
        var newStatuses = {};
        _.forEach(statuses, function(status) {
            newStatuses[wordsToSnakeCase(status.status_name)] = mapCustomStatus(
                status);
        });
        return newStatuses;
    }

    function mapCustomStatus(status) {
        return {
            statusName: status.status_name,
            receiveCalls: status.receive_calls,
            statusUuid: status.status_uuid,
            description: status.status_description,
            startTimer: status.start_timer,
            active: status.status_active,
            icon: status.status_icon,
            isDefault: false
        };
    };

    function mapCustomStatusToDBForm(status) {
        return {
            status_name: status.statusName,
            receive_calls: status.receiveCalls,
            status_uuid: status.statusUuid,
            status_description: status.description,
            start_timer: status.startTimer,
            status_active: status.active,
            status_icon: status.statusIcon
        };
    };

    var wordsToSnakeCase = function(words) {
        if (!words) return null;
        words = words.replace(/[^0-z \s]/g, '');
        var reg = /(\s[A-z])/g;
        var result = words.replace(reg, function(m) {
            return m[1].toUpperCase();
        });
        return (result[0] ? result[0].toLowerCase() : '') + result.slice(1, result.length);
    };

    service.init();

    return service;
});
