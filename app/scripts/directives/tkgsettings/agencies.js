'use strict';

proySymphony
    .directive('adminAgenciesTab', function($rootScope, $myModal, clipboard, usefulTools, packageService, locationService, dataFactory, $mdDialog, $filter, $window, $uibModalStack, domainService, userService, customerGroupCodeService, metaService, autoAttendantService) {
        return {
            restrict: 'E',
            templateUrl: 'views/tkgadmin/agencies.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.perPage = 20;
                $scope.maxSize = 50;
                $scope.currentPage = 1;
                $scope.editingDomain = false;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.state = 'table';
                customerGroupCodeService.setCustomerGroupCodes();
                $scope.customerGroupCodes = customerGroupCodeService.codes;
                if (__env.enableDebug) console.log($scope.customerGroupCodes);
                $scope.predicate = 'domain_description';
                $scope.numpredicate = 'number';
                $scope.portpredicate = 'number';
                $scope.reverse = false;
                $scope.numreverse = false;
                $scope.portreverse = false;

                $scope.targetDomain = {};
                $scope.editFaxLocation = false;
                $scope.locations = [];
                $scope.loadingEditFax = false;
                $scope.checkUsers = [];
                $scope.locationSelected = {};
                $scope.allowableNumbers = [];
                $scope.replacementNumber = '';

                $scope.timeZones = $rootScope.timeZones;

                $scope.filter = {
                    searchTextChange: searchTextChange,
                    selectedItemChange: selectedItemChange
                };

                function init() {
                    //getDomains();
                    loadDomains();
                }
                init();
                $scope.availPackages = function() {
                    return packageService.availPackages;
                };

                function getDomains() {
                    $scope.loadingAgencies = true;
                    domainService.loadDomains().then(function(domains) {
                        if (domains) {
                            console.log(domains);
                            $scope.domains = domains;
                            angular.forEach($scope.domains, function(domain) {
                                if (domain.customer_info) {
                                    if (domain.customer_info.auto_attendant_visibility != 'false') {
                                        domain.customer_info.auto_attendant_visibility = 'true';
                                    }
                                }
                            });
                            $scope.loadingAgencies = false;
                        } else {
                            $scope.domains = [];
                        }
                    });
                }

                $scope.availAgencies = function() {
                    return domainService.rawDomains;
                };

                function loadDomains() {
                    $scope.loadingAgencies = true;
                    domainService.getRawDomains('tkg')
                        .then(function(response) {
                            $scope.loadingAgencies = false;
                            $scope.agencies = response.data.success.data;
                            function querySearch() {
                                if ($scope.filter.searchText) {
                                    return $scope.agencies.filter(function(agency) {
                                        return agency.domain_description.toLowerCase().indexOf(
                                            $scope.filter.searchText.toLowerCase()) > -1;
                                    });
                                } else {
                                    return $scope.agencies;
                                }
                            }
                            $scope.filter.querySearch = querySearch;
                        });
                };

                // function querySearch() {
                //     if ($scope.filter.searchText) {
                //         return $scope.availAgencies().filter(function(agency) {
                //             return agency.domain_description.toLowerCase().indexOf(
                //                 $scope.filter.searchText.toLowerCase()) > -1;
                //         });
                //     } else {
                //         return $scope.availAgencies();
                //     }
                // }

                function searchTextChange(text) {
                    //console.log('Text changed to ' + text);
                }

                function selectedItemChange(item) {
                    if (item.domain_enabled === 'false') {
                        $rootScope.showErrorAlert('You are unable to load a Disabled Agency. The agency will need to be Enabled by billing to be managed.');
                        return;
                    }
                    $scope.selectedDomain = null;
                    $scope.checkUsers = [];
                    if (item) {
                        $scope.loadingAgency = true;
                        domainService.loadDomainDetails(item.domain_uuid)
                            .then(function(response) {
                                if (response) {
                                    $scope.editDomain(response);
                                    $scope.selectedDomain = response;
                                    $scope.loadingAgency = false;
                                    if ($scope.selectedDomain.customer_info) {
                                        if ($scope.selectedDomain.customer_info.auto_attendant_visibility !=
                                            'false') {
                                            $scope.selectedDomain.customer_info.auto_attendant_visibility =
                                                'true';
                                        }
                                    }
                                } else {
                                    $scope.loadingAgency = false;
                                    $rootScope.showErrorAlert(
                                        'Unable to load selected agency.');
                                }
                            });
                    }
                }

                function loadAudioLibrary(domain) {
                    dataFactory.getAudioLibraryByDomainAndCategory('ivrgreeting', domain).then(
                        function(response) {
                            if (response.data.success) {
                                $scope.audioLibrary = response.data.success.data;
                            } else if (response.data.error) {
                                console.log(response.data.error.message);
                            }
                        });
                }

                $scope.playAudioFile = function(file, uuid) {
                    $scope.audioFilePlaying = uuid;
                    var url = __env.apiUrl ? __env.apiUrl : symphonyConfig.audioUrl;
                    $scope.audio = new Audio(url + file);
                    $scope.recordingPlaying = true;
                    $scope.audio.play();
                };
                $scope.stopPlaying = function() {
                    $scope.audio.pause();
                    $scope.audioFilePlaying = false;
                    $scope.recordingPlaying = false;
                };

                $scope.downloadAudioLibraryFile = function(file) {
                    var baseUrl = __env.apiUrl ? __env.apiUrl : symphonyConfig.audioUrl;
                    var downloadUrl = baseUrl + file.filepath;
                    return downloadUrl;
                };

                function isUser(contact) {
                    return contact.contact_type === 'user';
                }

                function initDomain(domain_uuid) {
                    return locationService.getLocationGroupsByDomain(domain_uuid)
                        .then(function(response) {
                            $scope.locationGroups = response;
                            console.log($scope.locationGroups);
                            getCustomExtensions(domain_uuid);
                            // getDomainAddons(domain_uuid);
                            return domainService.loadDomainDids(domain_uuid)
                                .then(function(response) {
                                    console.log(response);
                                    $scope.domainNumbers = response.dids;
                                    $scope.portingNumbers = response.ports;
                                    return dataFactory.getActiveUsersByDomain(
                                            domain_uuid)
                                        .then(function(response) {
                                            if (response.data.success) {
                                                $scope.users =
                                                    response.data.success
                                                    .data;
                                            } else {
                                                $scope.users = [];
                                            }
                                            return true;
                                        });

                                });
                        });
                }

                $scope.copyKotterTech = function(email) {
                    clipboard.copyText(email);
                    $rootScope.showInfoAlert(
                        'The email has been copied to your clipboard.');
                };

                $scope.createKotterTech = function(domain) {
                    var confirmCreate = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Please confirm you want to create a KotterTech user for ' +
                            domain.domain_description + '.')
                        .ariaLabel('Create')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmCreate).then(function() {
                        $scope.creatingKotter = domain.domain_uuid;
                        dataFactory.getCreateKotterTech(domain.domain_uuid)
                            .then(function(response) {
                                if (response.data.success) {
                                    domain.kotter_tech = response.data.success
                                        .data;
                                } else {
                                    $rootScope.showErrorAlert(
                                        'We were unable to create the KotterTech user'
                                    );
                                }
                                $scope.creatingKotter = null;
                            });
                    });
                };

                $scope.filterDomains = function(domain) {
                    if (!$scope.domainSearch ||
                        (domain.domain_description && domain.domain_description.toLowerCase()
                            .indexOf($scope.domainSearch.toLowerCase()) !== -1) ||
                        (domain.domain_name.toLowerCase().indexOf($scope.domainSearch.toLowerCase()) !==
                            -1) ||
                        (domain.billing_settings && domain.billing_settings.group_code &&
                            domain.billing_settings.group_code.toLowerCase().indexOf(
                                $scope.domainSearch.toLowerCase()) !== -1)) return true;
                    return false;
                };

                $scope.title = function() {
                    if ($scope.state === 'table') {
                        return 'TKG Admin';
                    } else if ($scope.state === 'spreadsheet') {
                        return 'Import Contacts From Spreadsheet';
                    }
                    return undefined;
                };
                $scope.isEnabled = function(enabled) {
                    if (enabled == 'true') return true;
                    return false;
                };

                $scope.sortBy = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };
                $scope.numSortBy = function(predicate) {
                    $scope.numpredicate = predicate;
                    $scope.numreverse = !$scope.numreverse;
                };
                $scope.portSortBy = function(predicate) {
                    $scope.portpredicate = predicate;
                    $scope.portreverse = !$scope.portreverse;
                };

                $scope.showChevron = function(predicate) {
                    return usefulTools.showChevron(predicate, $scope.predicate, $scope.reverse);
                };
                $scope.showNumChevron = function(predicate) {
                    return usefulTools.showChevron(predicate, $scope.numpredicate,
                        $scope.numreverse);
                };
                $scope.showPortChevron = function(predicate) {
                    return usefulTools.showChevron(predicate, $scope.portpredicate,
                        $scope.portreverse);
                };

                $scope.editDomain = function(domain) {
                    $scope.tempDomainName = domain.domain_description;
                    $scope.oldDomain = {};
                    $scope.loadingDomain = true;
                    $scope.editingDomain = true;
                    angular.copy(domain, $scope.oldDomain);
                    initDomain(domain.domain_uuid)
                        .then(function() {
                            $scope.thedomain = angular.copy(domain);
                            $scope.portinfo = {};
                            $scope.loadingDomain = false;
                        });

                    loadAudioLibrary(domain.domain_uuid);
                };

                $scope.deleteCustomExtension = function(ext) {
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Confirm')
                        .htmlContent(
                            'Please confirm you would like to delete the Custom Extension info for ' +
                            ext.extension + '.')
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(deleteConfirm).then(function() {
                        dataFactory.getDeleteCustomExtension(ext.custom_extension_uuid)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope
                                        .domainExtensions, ext.custom_extension_uuid,
                                        'custom_extension');
                                    if (index !== null) $scope.domainExtensions
                                        .splice(index, 1);
                                }
                            });
                    });
                };

                $scope.editCustomExtension = function(ext) {
                    $scope.editingExt = ext.custom_extension_uuid;
                    $scope.editExt = angular.copy(ext);
                };

                $scope.addCustomExtension = function() {
                    $scope.addExt = true;
                    $scope.editExt = {};
                };

                $scope.cancelEditCustomExtension = function() {
                    $scope.editingExt = null;
                    $scope.editExt = null;
                    $scope.addExt = false;
                };

                $scope.saveCustomExtension = function(ext) {
                    if (!ext.location_group_uuid) {
                        $rootScope.showErrorAlert(
                            'The Location Group selection is required.');
                        return;
                    }
                    if (!ext.extension) {
                        $rootScope.showErrorAlert('The Extension is required.');
                        return;
                    }
                    if (ext.custom_extension_uuid) {
                        dataFactory.postUpdateCustomExtension(ext)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope.domainExtensions,
                                        ext.custom_extension_uuid,
                                        'custom_extension');
                                    if (index !== null) $scope.domainExtensions[
                                        index] = ext;
                                    $scope.cancelEditCustomExtension();
                                }
                            });
                    } else {
                        ext.domain_uuid = $scope.thedomain.domain_uuid;
                        dataFactory.postCreateCustomExtension(ext)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    $scope.domainExtensions.push(response.data.success
                                        .data);
                                    $scope.cancelEditCustomExtension();
                                }
                            });
                    }
                };

                $scope.showLocation = function(location_group_uuid) {
                    if (location_group_uuid) {
                        return $scope.locationGroups[location_group_uuid].group_name;
                        var index = $filter('getByUUID')($scope.locationGroups,
                            location_group_uuid, 'locations_group');
                        if (index !== null) return $scope.locationGroups[index].group_name;
                        return null;
                    }
                };

                $scope.loadFaxLocations = function() {
                    var domainUuid = $scope.targetDomain.domain_uuid;
                    locationService.getLocationGroupsByDomain(domainUuid, 'faxing')
                        .then(function(response) {
                            // console.log(response);
                            var groups = locationService.filterGroupsByType(
                                response, 'faxing');
                            if (__env.enableDebug) console.log(
                                "FAX Location GROUPS");
                            if (__env.enableDebug) console.log(groups);
                            // var groups = $scope.showMyGroups();

                            for (var group in groups) {
                                for (var data in groups[group]) {
                                    if (!groups[group].vfax) {
                                        delete groups[group];
                                        break
                                    }
                                }
                            }
                            $scope.locations = groups;
                            console.log("GROUPS", $scope.locations);
                        });
                };

                $scope.showMyGroups = function() {
                    return $scope.locations ? usefulTools.convertObjectToArray($scope.locations) : [];
                };

                $scope.showOrderFaxNumber = function() {
                    var data = {
                        location_group_uuid: ($scope.showMyGroups().length > 0 ?
                            $scope.selected.location : null)
                    };
                    $rootScope.showModalWithData('/fax/faxordermodal.html', data);
                };

                $scope.toggleEditFaxLocation = function(selectedDomain) {
                    $scope.targetDomain = selectedDomain;
                    $scope.loadingEditFax = true;
                    $scope.loadFaxLocations();
                    if (!$scope.checkUsers.length) {
                        userService.findUsers($scope.targetDomain.domain_uuid).then(
                            function(users) {
                                if (users) {
                                    $scope.checkUsers = users;
                                    $scope.loadingEditFax = false;
                                    $scope.editFaxLocation = !$scope.editFaxLocation;
                                }
                            });
                    } else {
                        $scope.loadingEditFax = false;
                        $scope.editFaxLocation = !$scope.editFaxLocation;
                    }
                };

                $scope.getUsers = function(domainUuid) {
                    userService.findUsers(domainUuid).then(function(users) {
                        if (users) {
                            $scope.users = users;
                            $scope.loadingUsers = false;
                        }
                    });
                };

                $scope.faxAllowableNumbers = function(location) {
                    if (location && location.vfax) {
                        var current = location.vfax.fax_number;
                    }
                    var numberSet = $scope.domainNumbers;
                    var faxNums = [];
                    var results = [];
                    for (var each in numberSet) {
                        if (numberSet[each].hasOwnProperty('vfax_uuid')) {
                            faxNums.push(numberSet[each]);
                        }
                    }
                    for (var faxNum in faxNums) {
                        for (var user in $scope.checkUsers) {
                            var match = false;
                            if (faxNums[faxNum].number === $scope.checkUsers[user].did ||
                                faxNums[faxNum].number == current) {
                                match = true;
                                break;
                            }
                        }
                        if (match == false) {
                            results.push(faxNums[faxNum]);
                        }
                    }
                    $scope.allowableNumbers = results;
                    return $scope.allowableNumbers;
                };

                $scope.submitFaxNumberChange = function(location, newFaxDid) {
                    // console.log("LOCATION", location);
                    // console.log("NUMBER", newFaxDid);
                    if (location && newFaxDid) {
                        if (location.vfax.fax_number === newFaxDid) {
                            $rootScope.showErrorAlert(
                                "New Number matches the Current Number!<br /> No changes made."
                            );
                            $scope.editFaxLocation = false;
                            $scope.locationSelected = {};
                        } else if (location != newFaxDid && location.vfax.fax_number !=
                            newFaxDid) {
                            //fire method to reassign dids on the backend here.
                            if (location && location.vfax)
                                var data = {
                                    old: location.vfax,
                                    new: newFaxDid
                                };
                            dataFactory.swapFaxNumbers(data)
                                .then(function(response) {
                                    console.log("RESPONSE", response);
                                    $rootScope.showalerts(response);
                                    $scope.editFaxLocation = false;
                                    $scope.locationSelected = {};
                                })
                                .catch(function(err) {
                                    $rootScope.showErrorAlert(
                                        "Something went wrong with fax number assignment."
                                    );
                                });
                        }
                    } else {
                        $rootScope.showErrorAlert(
                            "Something went wrong with the fax number assignment.");
                    }
                };

                $scope.phoneFormat = function(phoneNumberString) {
                    var cleaned = ('' + phoneNumberString).replace(/\D/g, '')
                    var match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
                    if (match) {
                        return '(' + match[1] + ') ' + match[2] + '-' + match[3]
                    }
                    return null;
                }


                function getCustomExtensions(domainUuid) {
                    dataFactory.getCustomExtensions(domainUuid)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.domainExtensions = response.data.success.data;
                            } else {
                                $scope.domainExtensions = [];
                            }
                        });
                };

                function getDomainAddons(domainUuid) {
                    dataFactory.getDomainAddons(domainUuid)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.domainAddons = response.data.success.data;
                            } else {
                                $scope.domainAddons = [];
                            }
                        });
                }

                $scope.showLocationGroups = function() {
                    return usefulTools.convertObjectToArray($scope.locationGroups);
                };

                $scope.showNewPort = function() {
                    autoAttendantService.loadPortingActions($scope.thedomain.domain_uuid)
                        .then(function(response) {
                            data.actions = response;
                        });
                    var data = {
                        attendants: $scope.attendants,
                        users: $scope.users,
                        createPortNumber: createPortNumber,
                        domain: $scope.thedomain,
                        closeModal: closeNumberPort,
                        showLocationGroups: $scope.showLocationGroups,
                        portInfo: {}
                    };
                    $rootScope.showModalWithData('/tkgadmin/numberport.html', data);
                };

                $scope.showNumberStatus = function(number) {
                    if (number.port && number.port.port_status === 'porting') return 'Porting';
                    if (number.type === 'fax') return number.inUse === 'true' ?
                        'In Use' : 'Inactive';
                    if (number.type === 'did') {
                        if (number.info && number.info.isUser || number.info.isConference ||
                            number.info.isIvr) return 'In Use';
                        return 'Inactive'
                    }
                    if (number.type === 'sms') return 'In Use';
                };

                $scope.showNumberDescription = function(number) {
                    if (number.port && number.port.port_status === 'porting') return number
                        .port.description;
                    if (number.type === 'fax') return 'Domain Fax Number';
                    if (number.type === 'sms') return 'Bulk Sms Number';
                    if (number.type === 'did') {
                        if (number.info) {
                            if (number.info.isUser) return number.info.name + ' - ' +
                                number.info.ext;
                            if (number.info.isConference) return 'Company Conference Call Number'
                            if (number.info.isIvr) return 'Active IVR Number';
                        }
                        if (number.port && number.port.port_status === 'ported') return number
                            .port.description;
                        return 'Available'
                    }
                };

                $scope.activatePortingNumber = function(port) {
                    var purpose;
                    if (port.target_ext) {
                        if (port.target_ext.length === 3) {
                            purpose = '<strong>' + $filter('tel')(port.number) +
                                '</strong> is to be assigned to User Ext: ' + port.target_ext +
                                '. Activating <strong>' + $filter('tel')(port.number) +
                                '</strong> will make this the default DID for that user.';
                        } else if (port.target_ext.length === 6) {
                            purpose = '<strong>' + $filter('tel')(port.number) +
                                '</strong> is assigned to a Time Condition using Ext: ' +
                                port.target_ext +
                                ' which is used for an Auto Attendant.';
                        }
                    } else {
                        purpose = "Please confirm that you want to activate <strong>" +
                            $filter('tel')(port.number) +
                            "</strong>. This will allow the number to be used ";
                        if (port.number_type === 'fax') purpose +=
                            'for sending and receiving faxes.';
                        if (port.number_type === 'did') purpose +=
                            'as a user\'s DID or as an auto attendant DID number.';
                    }
                    var activateConfirm = $mdDialog.confirm()
                        .title('Confirm')
                        .htmlContent(purpose)
                        .ariaLabel('Activate')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(activateConfirm).then(function() {
                        dataFactory.getActivatePortingNumber(port.number_port_uuid)
                            .then(function(response) {
                                if (response.data.success) {
                                    var did = response.data.success.data;
                                    var index = $filter('getByUUID')($scope
                                        .portingNumbers, port.number_port_uuid,
                                        'number_port');
                                    if (index !== null) $scope.portingNumbers[
                                        index].port_status = 'ported';
                                    index = $filter('getByUUID')($scope.domainNumbers,
                                        port.uuid, domainService.getUuidType(
                                            port));
                                    if (index !== null) $scope.domainNumbers[
                                        index] = did;
                                    $rootScope.$broadcast(
                                        'portingnumber.activated', did);
                                } else {
                                    $rootScope.showErrorAlert(response.data
                                        .error.message);
                                }
                            });
                    });
                };

                $scope.deletePortingNumber = function(port) {
                    dataFactory.getPortNumberUse(port.number_port_uuid)
                    .then(function(response){
                        if (response.data.error) {
                            $rootScope.showErrorAlert(response.data.error.message);
                        } else {
                            if (response.data.success.data) {
                                $rootScope.showErrorAlert(response.data.success.message);
                            } else {
                                var deleteConfirm = $mdDialog.confirm()
                                    .title('Confirm DID Deletion')
                                    .htmlContent(
                                        "Are you sure you want to delete the port for <strong>" +
                                        $filter('tel')(port.number) + "</strong>? ")
                                    .ariaLabel('Delete')
                                    .ok('Yes')
                                    .cancel('Never Mind');
                                $mdDialog.show(deleteConfirm).then(function() {
                                    dataFactory.getDeletePortingNumber(port.number_port_uuid)
                                        .then(function(response) {
                                            if (response.data.success) {
                                                var index = $filter('getByUUID')($scope
                                                    .portingNumbers, port.number_port_uuid,
                                                    'number_port');
                                                if (index !== null) $scope.portingNumbers
                                                    .splice(index, 1);
                                                index = $filter('getByUUID')($scope.domainNumbers,
                                                    port.uuid, domainService.getUuidType(
                                                        port));
                                                if (index !== null) $scope.domainNumbers
                                                    .splice(index, 1);
                                            } else {
                                                $rootScope.showErrorAlert(response.data
                                                    .error.message);
                                            }
                                        });
                                });
                            }
                        }
                        
                    });
                };

                $scope.deleteDid = function(number) {
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Confirm DID Deletion')
                        .htmlContent('Are you sure you want to delete this <strong>' +
                            $filter('tel')(number.number) +
                            '</strong>? This action is permanant and irreversible.')
                        .ariaLabel('Delete')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(deleteConfirm).then(function() {
                        $rootScope.showInfoAlert(
                            'This feature is not yet completed');
                        return;
                        dataFactory.getDeleteDid(number)
                            .then(function(response) {
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope
                                        .portingNumbers, number.number_port_uuid,
                                        'number_port');
                                    if (index !== null) $scope.portingNumbers
                                        .splice(index, 1);
                                } else {
                                    $rootScope.showErrorAlert(response.data
                                        .error.message);
                                }
                            });
                    });
                };

                function closeNumberPort() {
                    $uibModalStack.dismissAll();
                }

                function portExists(number) {
                    var i = 0;
                    var len = $scope.portingNumbers.length;
                    console.log($scope.portingNumbers);
                    for (i; i < len; i++) {
                         
                        if ($scope.portingNumbers[i].number === number) return true;
                    };
                    return false;
                }

                function createPortNumber(portInfo) {
                    if (portExists(portInfo.number)) {
                        $rootScope.showErrorAlert(
                            'This number is already in the porting table. If it is pending you can delete that port and resubmit.'
                        );
                        return;
                    }
                    $uibModalStack.dismissAll();
                    portInfo.domain_uuid = $scope.thedomain.domain_uuid;
                    console.log(portInfo);
                    var targetAction = portInfo.number_type === "action" && portInfo.target_action;
                    if (targetAction) {
                        delete portInfo.target_action;
                        portInfo.number_type = "did";
                    }
                    domainService.postUpdateNumberPort(portInfo)
                        .then(function(response) {
                            console.log(response);
                            if (response.success) {
                                var responseData = response.success.data;
                                if (targetAction) {
                                    handleActionPort(responseData, targetAction);
                                }
                                $scope.domainNumbers.push(responseData);
                                $scope.portingNumbers.push(responseData.port);
                            } else {
                                $rootScope.showErrorAlert(
                                    'Unable to create the number port');
                            }
                        });
                };

                function handleActionPort(destination, targetAction) {
                    if (targetAction.actionName === "call-flow") {
                        var aas = autoAttendantService;
                        var attendant = _.find();
                        var elideHandling = true;
                        aas.assignDestinationToAttendant(destination, attendant, elideHandling);
                    } else {
                        var data = {
                            destination_uuid: destination.destination_uuid,
                            action_name: targetAction.actionName,
                            opts: {
                                resource_uuid: targetAction.resourceUuid
                            }
                        };
                        dataFactory.createPortingNumberAction(data);
                    }
                };

                $scope.updateAAVisibility = function(domain) {
                    if ($scope.selectedDomain.customer_info.auto_attendant_visibility ==
                        'false') {
                        $scope.selectedDomain.customer_info.auto_attendant_visibility =
                            'false';
                    } else {
                        $scope.selectedDomain.customer_info.auto_attendant_visibility =
                            'true';
                    }
                    dataFactory.updateAAVisibility($scope.selectedDomain)
                        .then(function(response) {
                            if (response.data.success) {}
                        });
                };

                $scope.updatePortNumber = function(port, action) {
                    port.action = action;
                    domainService.postUpdateNumberPort(port)
                        .then(function(response) {
                            if (response.success) {
                                var data = response.success.data;
                                var index = $filter('getByUUID')($scope.domainNumbers,
                                    data.uuid, domainService.getUuidType(port));
                                if (index !== null) $scope.domainNumbers[index].port =
                                    data;
                                $scope.portinfo = {};
                            }
                        });
                };

                $scope.updateDomain = function(domain) {
                    var data = {
                        domain_uuid: domain.domain_uuid,
                        domain_description: domain.domain_description,
                        timezone: domain.timeZone
                    };
                    dataFactory.postUpdateDomain(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.selectedDomain = response.data.success.data;
                                loadDomains();
                                var index = $filter('getByUUID')($scope.availAgencies(),
                                    domain.domain_uuid, 'domain');
                                if (index !== null) $scope.availAgencies()[index].domain_description =
                                    domain.domain_description;
                            } else {
                                if (__env.enableDebug) console.log(response.data.error
                                    .message);
                            }
                        });
                };

                $scope.back = function() {
                    $scope.editingDomain = false;
                    $scope.thedomain = null;
                };

                $scope.toggleState = function(state) {
                    $scope.state = state;
                };

                $scope.stateIsShowing = function(state) {
                    return state === $scope.state;
                };
            }
        };
    });
