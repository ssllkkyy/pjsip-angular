'use strict';

proySymphony.service('bridgeNoticeService', function(dataFactory, $filter, usefulTools, $rootScope) {

    var service = {
        notices: [],
        availAddons: [],
        addonTypes: [],
        packageOptions: []
    };

    service.init = function() {
        service.getInfoForNotices();
    };

    service.getInfoForNotices = function() {
        dataFactory.getInfoForNotices()
            .then(function(response) {
                console.log("Notice INFO");
                console.log(response.data);
                if (response.data.success) {
                    service.notices = response.data.success.data;
                    // service.availPackages = response.data.success.data.packages;
                    // service.packageOptions = response.data.success.data.options;
                    // service.availAddons = response.data.success.data.addons;
                    // service.addonTypes = response.data.success.data.addontypes;
                }
            });
    };

    // service.getBridgePackageOptions = function() {
    //     dataFactory.getPackageOptions()
    //     .then(function(response){
    //         console.log(response);
    //         service.packageOptions = response.data.success.data;
    //     });
    // };

    // service.getBridgePackageAddons = function() {
    //     dataFactory.getPackageAddons()
    //     .then(function(response){
    //         console.log(response);
    //         service.availAddons = response.data.success.data;
    //     });
    // };

    service.savePackageOption = function(option) {
        return dataFactory.postSavePackageOption(option)
            .then(function(response) {
                if (response.data.success) {
                    var index = $filter('getByUUID')(service.packageOptions, option
                        .package_option_uuid, 'package_option');
                    if (index !== null) {
                        service.packageOptions[index] = response.data.success.data;
                    }
                }
                return response;
            });
    };

    service.savePackageAddon = function(addon) {
        return dataFactory.postSavePackageAddon(addon)
            .then(function(response) {
                if (response.data.success) {
                    var index = $filter('getByUUID')(service.availAddons, addon.package_addon_uuid,
                        'package_addon');
                    if (index !== null) {
                        service.availAddons[index] = response.data.success.data;
                    } else {
                        service.availAddons.push(response.data.success.data);
                    }
                }
                return response;
            });
    };

    service.togglePackageStatus = function(pack) {
        return dataFactory.getChangePackageStatus(pack.package_uuid)
            .then(function(response) {
                var index = $filter('getByUUID')(service.availPackages, pack.package_uuid,
                    'package');
                if (response.data.success) {
                    if (index !== null) service.availPackages[index].enabled = pack
                        .enabled;
                } else {
                    if (index !== null) service.availPackages[index].enabled = !
                        pack.enabled;
                }
                return response;
            });
    };

    service.togglePackageOptionStatus = function(option) {
        return dataFactory.getChangePackageOptionStatus(option.package_option_uuid)
            .then(function(response) {
                var index = $filter('getByUUID')(service.packageOptions, option.package_option_uuid,
                    'package_option');
                if (response.data.success) {
                    if (index !== null) service.packageOptions[index].enabled =
                        option.enabled;
                } else {
                    if (index !== null) service.packageOptions[index].enabled = !
                        option.enabled;
                }
                return response;
            });
    };

    service.toggleAddonStatus = function(addon) {
        return dataFactory.getChangeAddonStatus(addon.package_addon_uuid)
            .then(function(response) {
                var index = $filter('getByUUID')(service.availAddons, addon.package_addon_uuid,
                    'package_addon');
                if (response.data.success) {
                    if (index !== null) service.availAddons[index].enabled = addon.enabled;
                } else {
                    if (index !== null) service.availAddons[index].enabled = !addon
                        .enabled;
                }
                return response;
            });
    };

    service.addAddonToAgency = function(data) {
        return dataFactory.postAddAddonToAgency(data)
            .then(function(response) {
                if (response.data.success) {
                    service.changeAddonUseCount(data.addonUuid, true);
                }
                return response;
            });
    };

    service.removeAddonFromAgency = function(package_addon_domain_uuid, domain_uuid) {
        var data = {
            package_addon_domain_uuid: package_addon_domain_uuid,
            domain_uuid: domain_uuid
        };
        return dataFactory.postRemoveAddonFromAgency(data)
            .then(function(response) {
                if (response.data.success) {
                    var addonUuid = response.data.success.data.package_addon_uuid;
                    service.changeAddonUseCount(addonUuid, false);
                }
                return response;
            });
    };

    service.changeAddonUseCount = function(addonUuid, increase) {
        var index = $filter('getByUUID')(service.availAddons, addonUuid,
            'package_addon');
        if (index !== null) service.availAddons[index].usecount += (increase ? 1 : -1);
    };

    service.packageHasAccess = function(option) {
        return $rootScope.user && $rootScope.user.package && $rootScope.user.package.package_options
            .indexOf(option) !== -1;
    };

    service.packageHasAccessToAddon = function(option, packname) {
        var pack = service.getPackageByName(packname);
        if (pack) {
            return pack.package_options.indexOf(option) !== -1;
        }
        return false;
    };

    service.getPackageByName = function(name) {
        var i, input = service.availPackages;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].package_name === name) return input[i];
        }
        return null;
    };

    service.getRequiredPackage = function(option, current) {
        if (current.package_options.indexOf(option) !== -1) return current.package_name;
        var current = service.getNextPackageByLevel(current.level);
        if (!current) return null;
        return service.getRequiredPackage(option, current);
    };

    service.getNextPackageByLevel = function(level) {
        var i, input = service.availPackages;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].level === level && input[i + 1]) return input[i + 1];
        }
        return null;
    };

    service.getFeatureTitle = function(option) {
        var feature = service.getFeatureDetails(option);
        if (feature) return feature.option_title;
        return null;
    };

    service.getFeatureDetails = function(option) {
        var i, input = service.packageOptions;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].option_name === option) return input[i];
        }
        return null;
    };


    // service.init();
    return service;
});
