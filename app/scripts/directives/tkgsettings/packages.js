'use strict';

proySymphony
    .directive('adminPackagesTab', function($rootScope, $myModal, $sce, $mdDialog, userService,
        packageService, dataFactory, $filter, $window, $uibModalStack, customerGroupCodeService,
        metaService) {

        function makeString(input) {
            var string = JSON.stringify(input);
            return string;
        };

        return {
            restrict: 'E',
            templateUrl: 'views/tkgadmin/packages.html',
            scope: {},
            link: function($scope, element, attrs) {
                packageService.init();

                $scope.showModalWithData = $rootScope.showModalWithData;

                $scope.isSalesOrGreater = $rootScope.isSalesOrGreater;
                $scope.isBillingAdminOrGreater = $rootScope.isBillingAdminOrGreater;
                $scope.isSalesAdmin = function() {
                    return userService.isBillingAdminOrGreater();
                };

                $scope.availPackages = function() {
                    return packageService.availPackages;
                };

                $scope.packageOptions = function() {
                    return packageService.packageOptions;
                };

                $scope.packageAddons = function() {
                    return packageService.availAddons;
                };

                $scope.showEditPackage = function(brpackage) {
                    var pack = angular.copy(brpackage, pack);
                    if (pack) {
                        var option_list = {};
                        angular.forEach(pack.package_options, function(option) {
                            option_list[option] = true;
                        });
                        pack.selectedOptions = option_list;
                    } else {
                        pack = {
                            selectedOptions: {}
                        };
                    }
                    $myModal.openTemplate('managepackage.html', pack, '');
                };

                $scope.showEditAddon = function(addon) {
                    $myModal.openTemplate('manageaddon.html', addon, '');
                };

                $scope.showEditOption = function(option) {
                    $myModal.openTemplate('managepackageoption.html', option, '');
                };

                $scope.showEditAddon = function(addon) {
                    $myModal.openTemplate('managepackageaddon.html', addon, '');
                };

                $scope.showPackageInfo = function(pack) {
                    $mdDialog.show(
                        $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title(pack.package_title + ' - $' + parseFloat(pack.package_price)
                            .toFixed(2))
                        .htmlContent(pack.package_description)
                        .ariaLabel(pack.package_title)
                        .ok('Close')
                    );
                };

                $scope.showOptionInfo = function(option) {
                    var data = {
                        tileTitle: option.option_title,
                        videoUrl: $sce.trustAsResourceUrl(option.option_video),
                        description: option.option_description
                    };
                    $myModal.openTemplate('feature-detail-preview.html', data, '');
                };

                $scope.changeOptionStatus = function(option) {
                    packageService.togglePackageOptionStatus(option)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.error) {
                                // var index = $filter('getByUUID')($scope.domains, data.domain_uuid, 'domain');
                                // if (index !== null) $scope.domains[index] = $scope.oldDomain;
                            }
                        });
                };

                $scope.togglePackageStatus = function(pack) {
                    console.log(pack);
                    packageService.togglePackageStatus(pack)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.error) {
                                // var index = $filter('getByUUID')($scope.domains, data.domain_uuid, 'domain');
                                // if (index !== null) $scope.domains[index] = $scope.oldDomain;
                            }
                        });
                };

                $scope.changeAddonStatus = function(addon) {
                    packageService.toggleAddonStatus(addon)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                        });
                };

                $rootScope.$on('package.changed', function() {
                    packageService.init();
                });
            }
        };
    })
    .directive('editPackage', function($rootScope, $myModal, usefulTools, packageService,
        dataFactory, Slug, $filter, $window, $uibModalStack, customerGroupCodeService) {
        return {
            restrict: 'E',
            templateUrl: 'editpackage.html',
            scope: {
                brpackage: '=?',
            },
            link: function($scope, element, attrs) {
                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.packageOptions = function() {
                    return packageService.packageOptions;
                };

                $scope.options = {};

                $scope.options.tinymceOptions = {
                    menubar: false
                };

                $scope.savePackage = function(brpackage) {
                    var package_options = [];
                    angular.forEach(brpackage.selectedOptions, function(value, key) {
                        if (value === true) package_options.push(key);
                    });
                    brpackage.package_options = package_options;
                    // brpackage.package_name = Slug.slugify(brpackage.package_title);
                    console.log(brpackage);
                    dataFactory.postSavePackage(brpackage)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $rootScope.$broadcast('package.changed');
                                $uibModalStack.dismissAll();
                            }

                        });
                };
            }
        };
    })
    .directive('editPackageOption', function($rootScope, $myModal, usefulTools, packageService,
        dataFactory, Slug, $filter, $window, $uibModalStack, customerGroupCodeService) {
        return {
            restrict: 'E',
            templateUrl: 'editpackageoption.html',
            scope: {
                option: '=?',
            },
            link: function($scope, element, attrs) {
                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.options = {};

                $scope.options.tinymceOptions = {
                    menubar: false
                };

                $scope.saveOption = function(option) {
                    if (option.enabled) {
                        option.enabled = 'true';
                    } else {
                        option.enabled = 'false';
                    }
                    packageService.savePackageOption(option)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $uibModalStack.dismissAll();
                            }
                        });
                };
            }
        };
    })
    .directive('editPackageAddon', function($rootScope, $myModal, usefulTools, packageService,
        dataFactory, Slug, $filter, $window, $uibModalStack, customerGroupCodeService) {
        return {
            restrict: 'E',
            templateUrl: 'editpackageaddon.html',
            scope: {
                addon: '=?',
            },
            link: function($scope, element, attrs) {
                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.addonTypes = function() {
                    return packageService.addonTypes;
                };

                $scope.saveAddon = function(addon) {
                    addon.units = getUnitsFromAddonType(addon.type);
                    console.log(addon);
                    packageService.savePackageAddon(addon)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $uibModalStack.dismissAll();
                            }
                        });
                };

                function getUnitsFromAddonType(code) {
                    var i, input = packageService.addonTypes;
                    for (i = 0; i < input.length; i += 1) {
                        if (input[i].code === code) return input[i].units;
                    }
                }
            }
        };
    });
