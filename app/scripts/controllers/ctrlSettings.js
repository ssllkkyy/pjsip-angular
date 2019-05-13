'use strict';

proySymphony.controller('SettingsCtrl', function($scope, $location, $routeParams, $sce, clipboard,
    billingService, usefulTools, $timeout, $filter, $q, $rootScope, $uibModalStack, $window,
    FileUploader, dataFactory, contactService, contactGroupsService, _, $cookies, tagService,
    domainService, emulationService, $mdDialog, permissionService, userService, metaService,
    locationService, audioLibraryService, symphonyConfig, statusService) {

    $scope.pagination = {
        currentPage: 1,
        perPage: 25
    };

    if ($routeParams.domainUuid) {
        $scope.activeSettingTab = 5;
        metaService.registerOnRootScopeUserLoadCallback(function() {
            $rootScope.$broadcast('load.domain.billing', $routeParams.domainUuid);
        });
    }

    function loadRingtones($scope) {
        audioLibraryService.loadAudioLibraries($scope.user.domain_uuid, false)
            .then(function(response) {
                if (response) {
                    $scope.audioLibraries = response;
                    if (__env.enableDebug) console.log('LOADED AUDIO LIBRARIES');
                } else {
                    if (__env.enableDebug) console.log('FAILED LOADING AUDIO LIBRARIES');
                };
            });
    };

    loadRingtones($scope);

    $scope.isFavorite = function(contactUuid) {
        return contactService.favorites[contactUuid] ? true : false;
    };

    $scope.theContact = function(contactUuid) {
        return contactService.getContactByUuid(contactUuid);
    };

    $scope.orderByFunction = function(uuid) {
        var item = contactService.getContactByUuid(uuid);
        if (!item) return null;
        return (item.name && item.name.length > 3) ? item.name :
            ((item.org && item.org.length > 3) ? item.org : null);
    };

    $scope.orderByContactType = function(uuid) {
        var item = contactService.getContactByUuid(uuid);
        if (!item) return null;
        if (item.type === 'user') return 'a'
        return 'b';
    };

    $scope.groupMemberSearch = null;
    $scope.groupMemberFilter = function(item) {
        // var item = contactService.getContactByUuid(uuid);
        if (!item) return false;
        // if (userService.isKotterTechUser(item) || item.cuuid === $rootScope.user.contact_uuid) return false;
        if (contactService.isKotterTechUser(item)) return false;
        if (item.name.length < 2) return false;
        if (item.en && item.en == 'false') return false;
        if (!$scope.groupMemberSearch ||
            (item.name && item.name.toLowerCase().indexOf(
                $scope.groupMemberSearch.toLowerCase()) !== -1)) return true;
        return false;
    };

    metaService.rootScopeOn($scope, 'reset.audio.libraries', function() {
        loadRingtones($scope);
    });

    $scope.bmAndroidLink = "https://onescreen.kotter.net/BridgeMobileAndroid.apk";

    $scope.showBmLink = function(link) {
        return $sce.trustAsResourceUrl(link);
    };

    $scope.copyLink = function(link) {
        clipboard.copyText(link);
        $rootScope.showInfoAlert('The Link has been copied to your clipboard ');
    };

    if ($rootScope.userLoaded) {
        $scope.user = $rootScope.user;
    } else {
        metaService.rootScopeOn($scope, 'user.loaded', function() {
            $scope.user = $rootScope.user;
        });
    }

    $scope.isBillingAdmin = function() {
        return $rootScope.user.username === 'aatestatkeithgallantcom';
    };

    $scope.setCompanyStatus = function() {
        if ($scope.currentDomainStatus) {
            $scope.suspendDomain();
        } else {
            $scope.enableDomain();
        }
    };

    $scope.deleteUser = function() {
        var message;
        var data = {
            user_uuid: '994e5d37-f902-39c8-82a5-56bfffd2ebe3',
            type: 'hard',
            cloud_assign_to: null
        };
        var confirmation = 'Are you sure you want to delete this user?';
        $rootScope.confirmDialog(confirmation)
            .then(function(response) {
                if (response) {
                    dataFactory.deleteBridgeUser(data)
                        .then(function(response) {
                            if (response.data.success) {
                                message = 'User successfully deleted';
                                $rootScope.showSuccessAlert(message);
                            } else if (response.data.error) {
                                message =
                                    'Something went wrong and we could not delete the user';
                                $rootScope.showErrorAlert(message);
                            }
                        }, function(error) {
                            console.log(error);
                        });
                }
            });
    };

    $scope.deleteDomain = function() {
        var message;
        var domainUuid = getCurrentDomainUuid();
        var data = {
            domain_uuid: domainUuid,
            type: 'hard'
        };
        var domain = getDomainByUuid(domainUuid);
        var confirmation = 'Are you sure you want to delete ' + domain.domain_description +
            '? All users, extensions, numbers, storage will be removed. Please type YES in the space provided below if you are sure.';
        // var submessage = 'Please type out the name of the company if you are sure.';
        $rootScope.confirmPrompt(confirmation)
            .then(function(response) {
                var spin = {
                    title: 'Deleting Domain'
                };
                $rootScope.showModalFull('/modals/workingspinner.html', spin, 'xs');
                // $rootScope.showEditorModal('/modals/workingspinner.html',spin,'xs','', 'static', 'false');
                //if (response === domain.domain_name) {
                if (response === "YES") {
                    dataFactory.deleteBridgeDomain(data)
                        .then(function(response) {
                            if (response.data.success) {
                                //throw up a spinning icon ..
                                message = 'Domain successfully deleted';

                                $rootScope.showSuccessAlert(message);
                                console.log($scope);
                                $scope.emulate.emulatedCompany = null;
                                $scope.emulate.searchText = '';
                                var index = $filter('getByUUID')($scope.domains,
                                    domainUuid, 'domain');
                                console.log(index);
                                $scope.domains.splice(index, 1);
                                console.log($scope.domains);
                                $uibModalStack.dismissAll();
                                var currentDomainUuid = $rootScope.user.domain.domain_uuid;
                                var currentDomain = getDomainByUuid(
                                    currentDomainUuid);
                                $scope.setEmulatedCompany(currentDomain);

                            } else if (response.data.error) {
                                message =
                                    'Something went wrong and we could not delete the domain';
                                $rootScope.showErrorAlert(message);
                            }
                        }, function(error) {
                            console.log(error);
                        });
                }
            }, function(response) {
                console.log("Chose not to deleted");
            });
    };

    $scope.suspendDomain = function() {
        var domainUuid = getCurrentDomainUuid();
        var domain = getDomainByUuid(domainUuid);
        var data = {
            domain_uuid: domainUuid,
            domain_status: 'suspended'
        };
        var confirmation =
            'Are you sure you want to suspend this domain? Data will be retained but the account will not be usable.';
        $rootScope.confirmDialog(confirmation)
            .then(function(response) {
                if (response) {
                    dataFactory.postToggleAgencyStatus(data)
                        .then(function(response) {
                            if (response.data.success) {
                                var message =
                                    'Domain has been successfuly disabled';
                                $rootScope.showSuccessAlert(message);
                            } else if (response.data.error) {
                                $scope.currentDomainStatus = !$scope.currentDomainStatus;
                            }
                        }, function(error) {
                            console.log(error);
                        });
                } else {
                    $scope.currentDomainStatus = !$scope.currentDomainStatus;
                }
            });
    };

    $scope.enableDomain = function() {
        var domainUuid = getCurrentDomainUuid();
        var domain = getDomainByUuid(domainUuid);
        var data = {
            domain_uuid: domainUuid,
            domain_status: 'enabled'
        };
        var confirmation = 'Are you sure you want to enable this domain?';
        $rootScope.confirmDialog(confirmation)
            .then(function(response) {
                if (response) {
                    dataFactory.postToggleAgencyStatus(data)
                        .then(function(response) {
                            if (response.data.success) {
                                var message =
                                    'Domain has been successfuly re-enabled';
                                $rootScope.showSuccessAlert(message);
                            } else if (response.data.error) {
                                $scope.currentDomainStatus = !$scope.currentDomainStatus;
                            }
                        }, function(error) {
                            console.log(error);
                        });
                } else {
                    $scope.currentDomainStatus = !$scope.currentDomainStatus;
                }
            });
    };

    $scope.importContact = false;
    $scope.import = function() {
        $scope.importContact = !$scope.importContact;
        // if(!$scope.importContact)
        //     $scope.importContact=true;
        // else
        //     $scope.importContact=false;
    };

    $scope.toggleState = "spreadsheet";

    $scope.closeContacts = function() {
        $uibModalStack.dismissAll();
    };

    $scope.initializeGoogle = function() {
        console.log("Initializing");
        contactGroupsService.handleClientLoad();
    };

    $scope.userContactTotalMaxedOut = contactService.userContactTotalMaxedOut;

    function getContactsImportData() {
        return {
            userContactTotalMaxedOut: $scope.userContactTotalMaxedOut
        };
    };

    $scope.obtainTargetGroup = function() {
        $rootScope.showModalWithData('/company/googlecontacts.html',
            getContactsImportData());
    };

    $scope.authGoogle = function() {
        contactGroupsService.authGoogle();
    };

    $scope.authGoogleNew = function() {
        contactGroupsService.handleAuthClick();
    };

    $scope.modalTableHeight = $window.innerHeight - 400;

    $scope.showFormVoicemail = false;
    $scope.showFormFaxOption = false;
    $scope.showFormReports = false;
    $scope.showAvatarUpload = false;
    $scope.editingPhoneIndex = null;
    $scope.editingPolicyIndex = null;
    $scope.showAudioSelector = false;

    $scope.policyList = [];
    $scope.policy_info = {};
    
    $scope.contactsmaster = {
        showSelectGroup: false,
        selectedGroup: null
    };

    if (!$rootScope.timeZones && $window.localStorage.getItem("timeZones") !== null) $rootScope.timeZones = JSON.parse($window.localStorage.getItem("timeZones"));

    // if (!$rootScope.contactGroups) $rootScope.contactGroups = JSON.parse($window.localStorage.getItem("contactGroups"));
    $scope.contactGroups = contactGroupsService.groups;
    
    $scope.chooseGroup = function() {
        if (!$rootScope.contactUser.contactGroups) $rootScope.contactUser.contactGroups = [];
        $rootScope.contactUser.contactGroups.push($scope.contactsmaster.selectedGroup);
        $scope.contactsmaster.selectedGroup = null;
        $scope.contactsmaster.showSelectGroup = false;
    };

    $scope.removeContactFromGroup = function(index) {
        $rootScope.contactUser.contactGroups.splice(index, 1);
    };
    
    $scope.getTagByName = tagService.getTagByName;

    $scope.chooseTag = function(tag) {
        console.log(tag);
        if (tag === 'newtag') {
            $scope.createNewTag = true;
        } else {
            $scope.createNewTag = false;
            if (!$rootScope.contactUser.tags) $rootScope.contactUser.tags = [];
            if ($rootScope.contactUser.tags.indexOf(tag.tag)<0) {
                $rootScope.contactUser.tags.push(tag.tag);
            }
            console.log($rootScope.contactUser.tags);
        }
        $scope.contactsmaster.selectedTag = null;
    };

    $scope.availableTags = function() {
        return tagService.availableTags;
    };

    $scope.saveNewTag = function(tagname) {
        $scope.createNewTag = false;
        tagService.addNewTag(tagname)
        .then(function(response){
            console.log(response);
            if (response.data.success) {
                var tag = response.data.success.data;
                if (!$rootScope.contactUser.tags) $rootScope.contactUser.tags = [];
                $rootScope.contactUser.tags.push(tag.tag);
                $scope.contactsmaster.newtag = null;
            } else {
                $rootScope.showErrorAlert(response.data.error.message);
            }
        });
    };

    $scope.removeTagFromContact = function(index) {
        $rootScope.contactUser.tags.splice(index, 1);
    };

    $scope.confirmDelete = false;

    $scope.contacts = {};

    $scope.clearFieldFrmPhone = function() {
        $scope.contacts.contact_phone_uuid = "";
        $scope.contacts.phone_label = "";
        $scope.contacts.phone_number = "";
        $scope.contacts.phone_extension = "";
        $scope.contacts.phone_primary = ""; //***** receive tex
        $rootScope.contactPhone = {};
    };

    $scope.dataDelete = '';
    $scope.moduleDelete = '';
    $scope.deleteContactInfo = function(module, contactUuid, pindex) {
        var msg;
        if (module === 'contact') {
            msg = 'Are you sure you want to delete this contact?';
        } else if (module === 'phone') {
            msg = 'Are you sure you want to remove this phone number?';
        }
        var confirmDelete = $mdDialog.confirm()
            .title('Please Confirm')
            .textContent(msg)
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');
        $mdDialog.show(confirmDelete).then(function() {
            if (module === 'contact') {
                $scope.deletingContact = true;
                contactService.deleteContact(contactUuid)
                    .then(function(response) {
                        if (response) {
                            $rootScope.showalerts(response);
                            contactGroupsService.removeContactFromGroupsByUuid(
                                contactUuid);
                            $uibModalStack.dismissAll();
                            $scope.deletingContact = false;
                        }
                    });
            } else if (module === 'phone') {
                var phone = $rootScope.phoneList[pindex];
                if (phone.contact_phone_uuid) contactService.deleteContactPhone(
                    contactUuid, phone.contact_phone_uuid);
                $rootScope.phoneList.splice(pindex, 1);
            }
        });
    };

    $scope.deletePolicyInfo = function(contactUuid, pindex) {
        var policy = $scope.policyList[pindex];
        if (policy.contact_policy_information_uuid) contactService.deletePolicyInfo(contactUuid, policy.contact_policy_information_uuid);
        $scope.policyList.splice(pindex, 1);
    };

    if ($rootScope.actionContact === 'add') {
        $scope.action = 'Add contact';
    } else {
        $scope.action = 'Edit contact';
    }

    $scope.removeAvatar = function() {
        $rootScope.contactUser.contact_profile_image = null;
        if ($scope.uploader.queue.length > 0) $scope.uploader.clearQueue();
    };

    if ($rootScope.editingContact) {
        $rootScope.contactUser = {};
        angular.copy($rootScope.editingContact, $rootScope.contactUser);
        if ($rootScope.editingContact.phones && $rootScope.editingContact.phones.length > 0) {
            $rootScope.phoneList = $rootScope.editingContact.phones;
            $scope.policyList = $rootScope.editingContact.policies ? $rootScope.editingContact.policies : [];
            //angular.copy($rootScope.editingContact.phones, $rootScope.phoneList);
            if (__env.enableDebug) console.log("PHONE LIST");
            if (__env.enableDebug) console.log($rootScope.phoneList);
        }
    } else {
        $rootScope.phoneList = false;
        $rootScope.phoneList = [];
        $scope.policyList = false;
        $scope.policyList = [];
        $rootScope.contactUser = {};
    }

    $scope.listPhoneNumber = function(phone, index) {
        checkForDuplicatePhone(phone.phone_number, $rootScope.contactUser.contact_uuid)
            .then(function(response) {
                console.log(response);
                if (response) {
                    var message = 'Duplicate Phone Number'
                    var submessage, yes, cancel;
                    if ($rootScope.contactUser.contact_uuid) {
                        submessage = '<p>' + $filter('tel')(phone.phone_number) +
                            ' is already associated with ' + response.contact_name +
                            '. Do you want to edit that contact or also assign this number to this contact? If you want to add this number to this contact, please enter an Organization Name below and this number will be associated with both contacts when you save.</p>';
                        yes = 'Continue Editing This Contact';
                        cancel = 'Edit Original Contact';
                    } else {
                        submessage = '<p>' + $filter('tel')(phone.phone_number) +
                            ' is already associated with ' + response.contact_name +
                            '. Do you want to edit that contact or create a new one? If you want to create a new contact with this number, please enter an Organization Name below and this number will be associated with both contacts when you save.</p>';
                        yes = 'Create New Contact';
                        cancel = 'Edit Original Contact';
                    }

                    submessage += '<p>If you choose to Edit ' + response.contact_name +
                        ' your changes in this form will be lost.</p>';
                    submessage += '<p>Organization: </p>';
                    // return $rootScope.confirmPrompt(message, submessage)
                    var confirm = $mdDialog.prompt()
                        .title(message)
                        .htmlContent(submessage)
                        .ok(yes)
                        .cancel(cancel);
                    return $mdDialog.show(confirm)
                        .then(function(organization) {
                            if (organization) {
                                console.log(organization);
                                if (addNumberToList(phone)) {
                                    $rootScope.contactUser.contact_organization =
                                        organization;
                                    $rootScope.contactUser.duplicate_number =
                                        true;
                                }
                            } else {
                                console.log("go to existing contact to edit");
                                $rootScope.showErrorAlert(
                                    'You chose to continue but didnt populate the organization field.'
                                );
                            }
                        }, function(choose) {
                            console.log("Chose to Edit Original Contact");
                            $rootScope.editingContact = null;
                            $rootScope.contactUser = null;
                            $rootScope.phoneList = [];
                            $rootScope.contactRingtones = [];
                            var spin = {
                                title: 'Loading Contact'
                            };
                            $rootScope.showModalFull(
                                '/modals/workingspinner.html', spin, 'xs');
                            contactService.editContact(response.contact_uuid);
                        });
                } else {
                    addNumberToList(phone);
                }
            });
    };

    function addNumberToList(phone) {
        console.log($rootScope.contactPhone);
        console.log(phone);
        var duplicate = false;
        if ($scope.editingPhoneIndex !== null) {
            $rootScope.phoneList[$scope.editingPhoneIndex] = phone;
            $rootScope.contactPhone = {};
        } else {
            $rootScope.phoneList.forEach(function(entry) {
                if (entry.phone_number === phone.phone_number) {
                    $rootScope.showErrorAlert(
                        'The phone number is already listed below! ');
                    duplicate = true;
                }
            });
            console.log(duplicate);
            if (!duplicate) {
                var newphone = {
                    contact_phone_uuid: null,
                    contact_uuid: $rootScope.contactUser.contact_uuid ? $rootScope.contactUser
                        .contact_uuid : null,
                    phone_label: phone.phone_label,
                    phone_number: phone.phone_number,
                    phone_extension: phone.phone_extension,
                    phone_primary: phone.phone_primary,
                    phone_type_text: phone.phone_type_text
                };
                $rootScope.phoneList.push(newphone);
                $rootScope.contactPhone = {};
            }
        }
        if (!duplicate) {
            $scope.editingPhoneIndex = null;
            if (phone.phone_primary === 1) {
                angular.forEach($rootScope.phoneList, function(item) {
                    if (item.phone_number !== phone.phone_number) item.phone_primary =
                        0;
                });
            }
            return true;
        } else {
            return false;
        }
    }

    $scope.cancelEditPhone = function() {
        $rootScope.contactPhone = {};
        $scope.editingPhoneIndex = null;
    };

    $scope.editPhone = function(phone, index) {
        $rootScope.contactPhone = {};

        angular.copy(phone, $rootScope.contactPhone);
        $scope.editingPhoneIndex = index;
    };

    $scope.addPolicyToList = function(policy, index) {

        var duplicate = false;
        if ($scope.editingPolicyIndex !== null) {
            $scope.policyList[$scope.editingPolicyIndex] = policy;
            $scope.policy_info = {};
            duplicate = true;
            $scope.editingPolicyIndex = null;
        }

        if (!duplicate) {
            var newpolicy = {
                policy_number: policy.policy_number,
                policy_type: policy.policy_type,
                policy_csr_info: policy.policy_csr_info,
                policy_effective_date: policy.policy_effective_date,
                policy_expiry_date: policy.policy_expiry_date
            };
            $scope.policyList.push(newpolicy);
            $scope.policy_info = {};
        }
    }

    $scope.editPolicy = function(policy, index) {
        $scope.policy_info = {};

        angular.copy(policy, $scope.policy_info);
        $scope.editingPolicyIndex = index;
    };

    $scope.cancelEditPolicy = function() {
        $scope.policy_info = {};
        $scope.editingPolicyIndex = null;
    };

    $scope.saveContactUser = function(data) {
        data.phones = $rootScope.phoneList;
        if ($rootScope.contactUser.contactGroups.length>0) {
            data.contactGroups = _.map($rootScope.contactUser.contactGroups, function(group){
                return group.group_uuid;
            });
            console.log(data.contactGroups);
        }
        if ($rootScope.actionContact === 'add') {
            $scope.addContactSubmit(data);
        } else {
            data.policies = $scope.policyList;
            $scope.updateContactInfo(data);
        }

    };
    $scope.dateFormat = 'yyyy-MM-dd';
    $scope.birthDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 0,
        minDate: new Date(1900, 1, 1),
        maxDate: today
    };

    $scope.birthDatePopup = {
        opened: false
    };

    // $scope.processBirthDate = function(birthDate) {
    //     if (birthDate != null)
    //         $rootScope.contactUser.settings.contact_dob = birthDate;
    // };
    $scope.invalidDob = false;
    $scope.processBirthDate = function(birthDate) {
        var invalid = false;
        if (birthDate && birthDate.length !== 10) invalid = true;
        if (birthDate && birthDate.length === 10 ) {
            var year = birthDate.substring(0, 4);
            var month = birthDate.substring(5,7);
            var day = birthDate.substring(8,10);
            console.log(year + ' ' + month + ' ' + day);
            console.log(!isNaN(year) + ' ' + !isNaN(month) + ' ' + !isNaN(day));
            if (isNaN(year) || isNaN(month) || isNaN(day)) invalid = true;
        }
        console.log(invalid);
        $scope.invalidDob = invalid;
    };
    

    // $scope.processBirthDate();
    $scope.OpenDatePicker = function() {
        $scope.birthDatePopup.opened = !$scope.birthDatePopup.opened;
    };


    $scope.effectiveDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 0,
        minDate: new Date(2016, 1, 1),
        maxDate: today
    };
    $scope.expiryDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 0,
        minDate: $scope.policy_info.effectiveDate,
        maxDate: today
    };
    $scope.effectiveDatePopup = {
        opened: false
    };
    $scope.expiryDatePopup = {
        opened: false
    };
    $scope.processEffectiveDate = function(effectiveDate) {
        if (effectiveDate != null) {
            var newEffectiveDate = new Date(effectiveDate);
            if (!$scope.expiryDate || $scope.expiryDate < newEffectiveDate) {
                var ToMinDate = newEffectiveDate;
                $scope.expiryDateOptions.minDate = ToMinDate;
                $scope.expiryDate = ToMinDate;
            }
        }
    };
    $scope.processExpiryDate = function(expiryDate) {
        if (expiryDate != null) {
            if (!$scope.effectiveDate || $scope.effectiveDate > expiryDate) $scope.effectiveDate = new Date(expiryDate);
            $scope.expiryDate = new Date(expiryDate);
        }

    };
    $scope.processEffectiveDate();
    $scope.OpenEffectiveDate = function() {
        //$scope.dateSearched = false;
        $scope.effectiveDatePopup.opened = !$scope.effectiveDatePopup.opened;
    };
    $scope.OpenExpiryDate = function() {
        //$scope.dateSearched = false;
        $scope.expiryDatePopup.opened = !$scope.expiryDatePopup.opened;
    };

    $scope.clearDateSearch = function() {
        $scope.displayFromDate = new Date(moment().subtract(7, 'days'));
        $scope.displayToDate = new Date();
        $scope.effectiveDate = '';
        $scope.expiryDate = '';
    };



    $scope.setColorContacts = function(color) {

        $rootScope.profile.contact_profile_color = color;

    };
    //***********************************************************************************************//

    /********** MANAGEMENT MENU COMPANY SETUP  **********/
    $scope.btnMnuAct = '1';
    $rootScope.templateInclude = 'users';
    if ($rootScope.btnMnuAct) {
        $scope.btnMnuAct = '3';
    } else {
        $scope.btnMnuAct = '1';
    }
    $rootScope.templateInclude = 'users';

    $scope.showAudio = false;

    $rootScope.$watch('templateInclude', function(newVal, oldVal) {
        if (newVal === 'permissions') {
            getPermissionCommunications();
            getPermissionGroups();
            $scope.newgroup = {};
            $scope.newgroup.group_color = '';
        } else if (newVal === 'attendant') {
            $scope.emulate.searchText = '';
            var currentDomainUuid = $rootScope.user.domain.domain_uuid;
            var currentDomain = getDomainByUuid(currentDomainUuid);
            $scope.setEmulatedCompany(currentDomain);
            $scope.emulate.emulatedCompany = currentDomain;
        } else if (newVal === 'locations') {
            getLocationCommunications();
            getLocationGroups();
            $scope.newgroup = {};
        }
    });

    $scope.addStatus = function() {
        if ($rootScope.domainsStatus.length < 8) {
            $scope.showAddStatus = !$scope.showAddStatus;
        } else {
            $rootScope.alerts.push({
                error: true,
                message: 'You can add only 8 statuses!'
            });
        }
    };

    $scope.statusSuggestedIcons = [{
            code: 4,
            description: 'fa-pause-circle-o',
            color: '#99cc00',
            available: true
        },
        {
            code: 5,
            description: 'fa-minus',
            color: '#cc3300',
            available: true
        },
        {
            code: 6,
            description: 'fa-user-o',
            color: '#009900',
            available: true
        },
        {
            code: 7,
            description: 'fa-handshake-o',
            color: '#ff9933',
            available: true
        },
        {
            code: 8,
            description: 'fa-bank',
            color: '#6699ff',
            available: true
        },
        {
            code: 9,
            description: 'fa-calendar-o',
            color: '#00b3b3',
            available: true
        },
        {
            code: 10,
            description: 'fa-coffee',
            color: '#734d26',
            available: true
        },
        {
            code: 11,
            description: 'fa-group',
            color: '#0066cc',
            available: true
        },
        {
            code: 12,
            description: 'fa-car',
            color: '#4d9900',
            available: true
        },
        {
            code: 13,
            description: 'fa-cutlery',
            color: '#d1e0e0',
            available: true
        }
    ];

    $scope.getAvailStatusIcons = function() {
        console.log("GETTING AVAILABLE");
        for (var i = 0; i < $rootScope.domainsStatus.length; i++) {
            for (var y = 0; y < $scope.statusSuggestedIcons.length; y++) {
                if ($scope.statusSuggestedIcons[y].available) {
                    if ($rootScope.domainsStatus[i].status_icon == $scope.statusSuggestedIcons[
                            y].description) {
                        $scope.statusSuggestedIcons[y].available = false;
                    }
                }
            }
        }
    }

    $scope.statusAfterChange = function() {
        console.log("Checking Available Stauts");
        for (var y = 0; y < $scope.statusSuggestedIcons.length; y++) {
            $scope.statusSuggestedIcons[y].available = true;
        }
        $scope.getAvailStatusIcons();
    }

    $scope.returnColorIcon = function(icon) {
        $scope.statusSuggestedIcons.forEach(function(entry) {
            if (entry.description === icon) {
                return entry.color;
            }
        });
    };

    $scope.RSTstatus = {};
    $scope.getDomainsStatus = function() {
        var domainUuid = getCurrentDomainUuid();
        dataFactory.getDomainsStatus(domainUuid)
            .then(function(response) {
                console.log(response);
                $rootScope.domainsStatus = response.data.data;
                $scope.getAvailStatusIcons();
            }, function(error) {
                $rootScope.msgContacts += 'Error from contacts user: ' + JSON.stringify(
                    error, null, 4) + "\n";
            });

    };
    $scope.updDomainsStatus = function(param) {
        console.log("REST: ", $rootScope.domainsStatus);
        param.receive_calls == null || param.receive_calls == "undefined" ? param.receive_calls =
            false : "";
        param.start_timer == null || param.start_timer == "undefined" ? param.start_timer =
            false : "";
        dataFactory.updDomainsStatus(param)
            .then(function(response) {
                console.log(response);
                if (response.data.success) {
                    //$rootScope.alerts.push({type: 'success', msg:  'Success: ' + response.data.success.message});
                    //$rootScope.alerts.push({success: true, message: 'Success: ' + response.data.success.message});
                }
            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: error.data.error.message
                });
            });
        $scope.statusAfterChange();

    };

    $scope.NEWstatus = {};
    $scope.insDomainsStatus = function(param) {
        param.receive_calls == null || param.receive_calls == "undefined" ? param.receive_calls =
            false : "";
        param.start_timer == null || param.start_timer == "undefined" ? param.start_timer =
            false : "";
        param.status_active == null || param.status_active == "undefined" ? param.status_active =
            false : "";
        var domainUuid = getCurrentDomainUuid();
        var data = {
            domain_uuid: domainUuid,
            receive_calls: param.receive_calls,
            status_active: param.status_active,
            start_timer: param.start_timer,
            status_name: param.status_name,
            status_description: param.status_description,
            status_icon: param.status_icon
        };
        //console.log(data);
        dataFactory.insDomainsStatus(data)
            .then(function(response) {
                console.log(response);
                if (response.data.success) {
                    //$rootScope.alerts.push({type: 'success', msg:  'Success: ' + response.data.success.message});
                    $rootScope.alerts.push({
                        success: true,
                        message: 'Success: ' + response.data.success.message
                    });
                    $scope.domainsStatus.push(response.data.success.data);
                    $scope.NEWstatus = {};
                    $scope.showAddStatus = false;

                } else {
                    //$rootScope.alerts.push({type: 'danger', msg: 'Failure: '+ response.data.error.message});
                    $rootScope.alerts.push({
                        error: true,
                        message: "Please setup all the fields before saving."
                    });

                }
            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: error.data.error.message
                });
            });
    };

    $scope.cancelInsertStatus = function() {
        $scope.NEWstatus = {};
        $scope.showAddStatus = !$scope.showAddStatus;
    };



    $scope.cancelEdit = function() {

        $scope.getDomainsStatus();

    };

    /** Group Codes Options */
    $scope.customerGroupCodes = [];
    $scope.saveGroupCode = function(code) {
        console.log(code);
        dataFactory.postSaveGroupCode(code)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    if (code.customer_group_code_uuid) {

                    } else {
                        //customerGroupCodeService.add
                        $scope.customerGroupCodes.push(response.data.success.data);
                    }
                }
                $uibModalStack.dismissAll();
                $rootScope.groupcode = null;
            });
    };

    $rootScope.customerGroupCodes = [];

    $scope.isCodeAvailable = function(code) {
        dataFactory.getCheckGroupCode($scope.conference.room)
            .then(function(response) {
                if (response.data.error) {
                    console.log(response.data.error.message);
                    $scope.urlNotAvailable = true;
                    $scope.availMessage = 'Not Available';
                } else {
                    $rootScope.videoConference = response.data.success;
                    $scope.urlNotAvailable = false;
                    $scope.clipboardCopy = $scope.vcUrl + '/' + $scope.conference.room;
                }
            }, function(error) {
                console.log(error);
                $scope.urlNotAvailable = true;
                $scope.availMessage = 'Not Available';
            });
    };

    /********** ADMIN MANAGEMENT MENU  **********/
    $scope.btnMnuActAdmin = '1';
    $rootScope.templateIncludeAdmin = 'agencies';

    $scope.mnuSelectedAdmin = function(mnuID) {
        $scope.btnMnuActAdmin = mnuID;
        if (mnuID === '1') {
            $rootScope.templateIncludeAdmin = 'agencies';
        } else if (mnuID === '4') {
            $rootScope.templateIncludeAdmin = 'notices';
        } else if (mnuID === '7') {
            $rootScope.templateIncludeAdmin = 'managektpassword';
        } else {
            $rootScope.templateIncludeAdmin = 'admintoadmin';
        }
    };

    $scope.btnMnuActBillingAdmin = '1';
    $rootScope.templateIncludeBillingAdmin = 'billingadmin';
    $scope.mnuSelectedBillingAdmin = function(mnuID) {
        $scope.btnMnuActBillingAdmin = mnuID;
        if (mnuID === '1') {
            $rootScope.templateIncludeBillingAdmin = 'billingadmin';
        } else if (mnuID === '2') {
            $rootScope.templateIncludeBillingAdmin = 'admininvoices';
        } else if (mnuID === '3') {
            $rootScope.templateIncludeBillingAdmin = 'groupcodes';
        } else if (mnuID === '4') {
            $rootScope.templateIncludeBillingAdmin = 'packages';
        } else if (mnuID === '5') {
            $rootScope.templateIncludeBillingAdmin = 'blueadmin';
        } else if (mnuID === '6') {
            $rootScope.templateIncludeBillingAdmin = 'reports';
        }
    };


    /********** MANAGEMENT MENU BILLING  **********/

    $scope.mnuSelectedBill = function(mnuID) {
        $scope.btnMnuActBill = mnuID;
        if (mnuID === '1') {
            $rootScope.templateIncludeBill = 'summary';
        } else if (mnuID === '2') {
            $rootScope.templateIncludeBill = 'makeapayment';
        } else if (mnuID === '3') {
            $rootScope.templateIncludeBill = 'package';
        } else if (mnuID === '4') {
            $rootScope.templateIncludeBill = 'billinghistory';
        } else if (mnuID === '5') {
            $rootScope.templateIncludeBill = 'config';
        }
    };

    $scope.billingLoaded = function() {
        return billingService.customer;
    };

    $scope.search = {
        contact_name_full: null
    };

    $scope.searchMembers = function(member) {
        if (!$scope.search.contact_name_full ||
            (member.name && member.name.toLowerCase().indexOf(
                $scope.search.contact_name_full.toLowerCase()) != -1)) return true;
        return false;
    };

    $scope.showMemberCount = function(list) {
        var count = 0;
        if ($rootScope.contactsSelected2 && $rootScope.contactsSelected2.length > 0) {
            count = $rootScope.contactsSelected2.length;
        }
        angular.forEach(list, function(value, uuid) {
            if (value === true && uuid != 'undefined' && (!$rootScope.contactsSelected2 || ($rootScope.contactsSelected2.indexOf(uuid)==-1))) count += 1;
        });
        return count;
    };

    $scope.filter = function() {
        $timeout(function() {
            $rootScope.filteredItems = $rootScope.filtered.length;
        }, 10);
    };
    $scope.sort_by = function(predicate) {
        $rootScope.predicate = predicate;
        $rootScope.reverse = !$rootScope.reverse;
    };

    /************************************************************************************************************/
    /******************************** K E I T H - C O D E  - ****************************************************/
    /************************************************************************************************************/


    $scope.status = '';
    //var currentUser = JSON.parse($window.localStorage.getItem("currentUser"));

    $scope.displayUser = JSON.stringify($rootScope.user, null, 4);


    getLanguages();
    //getTimezones();
    $scope.hideFields = true;
    $scope.showFields = true;
    $scope.cancelprofile = false;
    $scope.editprofile = true;
    $scope.showProfileEdit = function() {
        $scope.hideFields = false;
        $scope.showFields = false;
        $scope.showproflie = false;
        $scope.cancelprofile = true;
        $scope.editprofile = false;
    };
    $scope.hideProfileEdit = function() {
        $scope.hideFields = true;
        $scope.showFields = true;
        $scope.showproflie = true;
        $scope.cancelprofile = false;
        $scope.editprofile = true;
    };
    $scope.showSave = false;
    $scope.showVoicemail = true;
    $scope.showEditPassword = false;
    $scope.showFormFindMeFollowMe = false;

    $scope.volumeSlider = {
        value: 10,
        options: {
            ceil: 100,
            showSelectionBar: true
        }
    };

    var currentStatus = statusService.getCurrentStatusName();
    $scope.dndOptions = (currentStatus === "Do Not Disturb" ? 'On' : 'Off');
    $scope.vmAutomaticDelete = ($rootScope.user.voicemail ? ($rootScope.user.voicemail.voicemail_local_after_email ===
        "false" ? 'On' : 'Off') : 'Off');
    $scope.vmAttachMessage = ($rootScope.user.voicemail ? ($rootScope.user.voicemail.voicemail_file ===
        "attach" ? 'On' : 'Off') : 'Off');
    $scope.vmRemoteAccess = ($rootScope.user.settings ? ($rootScope.user.settings.remote_access ===
        "on" ? 'On' : 'Off') : 'Off');
    $scope.vmAllowReview = ($rootScope.user.settings ? ($rootScope.user.settings.allow_review ===
        "on" ? 'On' : 'Off') : 'Off');
    $scope.vmEnvelopePlayback = ($rootScope.user.settings ? ($rootScope.user.settings.envelope_playback ===
        "on" ? 'On' : 'Off') : 'Off');

    $scope.onText = 'Yes';
    $scope.offText = 'No';
    $scope.isActive = true;
    $scope.size = 'normal';
    $scope.animate = true;
    $scope.radioOff = true;
    $scope.handleWidth = "auto";
    $scope.labelWidth = "auto";
    var statusMsg = '';
    $scope.showVmStatus = false;
    $scope.onDndChange = function() {
        var data = {
            setting: 'user_status',
            setting_descr: 'Do Not Disturb',
            value: ($scope.dndOptions === 'On' ? 'Do Not Disturb' : 'Available')
        };

        dataFactory.changeSetting(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    statusService.setStatusAndPersist(data.value);
                }
            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: 'Unable to update status ' + (__env.enableDebug ?
                        error : '')
                });
            });
    };
    $scope.onAutomaticDelete = function() {
        var data = {
            setting: 'voicemail_local_after_email',
            setting_descr: 'Automatic Delete',
            value: ($scope.vmAutomaticDelete === 'On' ? 'false' : 'true')
        };

        dataFactory.changeSetting(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.user.voicemail.voicemail_local_after_email = data.value;
                }

            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: 'Unable to update status ' + (__env.enableDebug ?
                        error : '')
                });
            });
        $scope.msg = statusMsg;
        $scope.showVmStatus = true;
        $timeout(function() {
            $scope.showVmStatus = false;
        }, 4000);
    };
    $scope.onAttachMessage = function() {
        var data = {
            setting: 'voicemail_file',
            setting_descr: 'Attach Message',
            value: ($scope.vmAttachMessage === 'On' ? 'attach' : 'link')
        };

        dataFactory.changeSetting(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.user.voicemail.voicemail_file = data.value;
                }

            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: 'Unable to update status ' + (__env.enableDebug ?
                        error : '')
                });
            });
        $timeout(function() {
            $scope.vmAutomaticDeleteStatus;
        }, 3000);
    };
    $scope.onEnvelopePlayback = function() {
        var data = {
            setting: 'usersetting',
            field: 'envelope_playback',
            setting_descr: 'Envelope Playback',
            value: ($scope.vmEnvelopePlayback === 'On' ? 'on' : 'off')
        };

        dataFactory.changeSetting(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.user.settings.envelope_playback = data.value;
                }

            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: 'Unable to update status ' + (__env.enableDebug ?
                        error : '')
                });
            });
        $timeout(function() {
            $scope.vmEnvelopePlaybackStatus;
        }, 3000);
    };
    $scope.onRemoteAccess = function() {
        var data = {
            setting: 'usersetting',
            field: 'remote_access',
            setting_descr: 'Remote Access',
            value: ($scope.vmRemoteAccess === 'On' ? 'on' : 'off')
        };

        dataFactory.changeSetting(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.user.settings.remote_access = data.value;
                }

            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: 'Unable to update status ' + (__env.enableDebug ?
                        error : '')
                });
            });
    };
    $scope.onAllowReview = function() {
        var data = {
            setting: 'usersetting',
            field: 'allow_review',
            setting_descr: 'Allow Review',
            value: ($scope.vmAllowReview == 'On' ? 'on' : 'off')
        };

        dataFactory.changeSetting(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.user.settings.allow_review = data.value;
                }

            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: 'Unable to update status ' + (__env.enableDebug ?
                        error : '')
                });

            });
    };

    var getPassToken = function() {
        var deferred = $q.defer();
        dataFactory.getResetToken()
            .then(function(response) {
                if (response.data.error) {
                    deferred.reject('');
                } else {
                    deferred.resolve(response.data.success.data);
                }
            }, function(error) {
                deferred.reject('');
            });
        return deferred.promise;
    };

    $scope.ChangePassword = function() {
        getPassToken().then(function(passtoken) {
            var data = {
                password: $scope.password,
                password_confirmation: $scope.password_confirmation,
                token: passtoken
            };
            dataFactory.resetPassword(data)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        $scope.showEditPassword = false;
                    }
                }, function(error) {
                    $rootScope.alerts.push({
                        error: true,
                        message: 'Unable to update the Password ' +
                            (__env.enableDebug ? error : '')
                    });
                });
        });
    };

    $scope.doAvatarUpload = function() {
        $scope.showAvatarUpload = true;
    };
    $scope.cancelEditAvatar = function() {
        $scope.showAvatarUpload = false;
    };
    $scope.files = [];

    $scope.$on("seletedFile", function(event, args) {
        $scope.$apply(function() {
            //add the file object to the scope's files collection
            $scope.files.push(args.file);
        });
    });

    $scope.AddFmFm = function() {
        var data = {
            fmfmDest: $scope.fmfmDest,
            fmfmDelay: $scope.fmfmDelay,
            fmfmTimeout: $scope.fmfmTimeout,
            fmfmPrompt: $scope.fmfmPrompt
        };
        dataFactory.changeSetting(data)
            .then(function(response) {
                $rootScope.showalerts(response);

            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: 'Unable to Add Number ' + (__env.enableDebug ?
                        error : '')
                });
            });
    };

    $rootScope.closeAddContact = function() {
        $rootScope.contactaddition = {};
        // contactService.editingContact = null;
        $uibModalStack.dismissAll();
    };

    function makeString(input) {
        var string = JSON.stringify(input);
        return string;
    }

    $rootScope.updateAvatar = {};
    $rootScope.updateAvatar.contact_uuid = '';

    $scope.checkGroupLimits = function() {
        var groupUuid = $rootScope.contactUser.initialGroup;
        var groupLimit = contactGroupsService.groupLimit;
        console.log(groupUuid);
        if (groupUuid) {
            var group = contactGroupsService.getGroupByUuid(groupUuid);
            if (group && group.members.length >= groupLimit) {
                $rootScope.contactUser.initialGroup = null;
                $rootScope.showErrorAlert('Contact groups are limited to ' + groupLimit + ' contacts. Adding this contact will exceed this limit for this group.');
            }
        }
    };

    function addGroupToContactGroups(group) {
        contactGroupsService.handleNewGroup(group);
        $window.localStorage.setItem("contactGroups", JSON.stringify($scope.contactGroups));
        $scope.closeCreateGroup();
    }

    function updateGroupInContactGroups(group) {
        var old = contactGroupsService.getGroupByUuid(group.group_uuid);
        if (old) {
            old = group;
            old.contacts = contactGroupsService.getContactRetrievalFuncForGroup(group)
        }
        // $scope.contactGroups[index].group_name = group.group_name;
        // $scope.contactGroups[index].group_color = group.group_color;
        // $scope.contactGroups[index].group_image = group.group_image;
        // $scope.contactGroups[index].group_type = group.group_type;
        // $scope.contactGroups[index].members = group.members;
        // $scope.contactGroups[index].contacts = contactGroupsService.getContactRetrievalFuncForGroup(
            // group);
        // $window.localStorage.setItem("contactGroups", JSON.stringify($scope.contactGroups));
        
        $scope.closeCreateGroup();
    }

    $scope.setUploaderOption = function() {
        $rootScope.uploaderOption = '/user/change-picture';
        $scope.uploader.url = $rootScope.onescreenBaseUrl + $rootScope.uploaderOption;
    };

    $scope.triggerUpload = function(user) {
        $scope.uploader.clearQueue();
        angular.element('#cloud-upload').trigger('click');
    };

    var uploader = $scope.uploader = new FileUploader({
        url: $rootScope.onescreenBaseUrl + $rootScope.uploaderOption,
        queueLimit: 1,
        headers: {
            'Authorization': 'Bearer ' + $rootScope.userToken
        }
    });

    uploader.filters.push({
        name: 'imageFilter',
        fn: function(item /*{File|FileLikeObject}*/ , options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) +
                '|';
            return '|jpg|png|jpeg|bmp|'.indexOf(type) !== -1;
        }
    });

    uploader.filters.push({
        name: 'avatarSizeFilter',
        fn: function(item /*{File|FileLikeObject}*/ , options) {
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) +
                '|';
            if ('|jpg|png|jpeg|bmp|'.indexOf(type) !== -1 && $rootScope.uploaderOption ===
                '/user/contact/new' && item.size > 2000000) {
                return false;
            } else {
                return true;
            }
        }
    });


    // CALLBACKS
    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
        options) {
        if (__env.enableDebug) console.info('onWhenAddingFileFailed', item, filter,
            options);
        $rootScope.alerts.push({
            error: true,
            message: 'Problem Adding File: Image must be under 2MB in size and a jpg, bmp or png file'
        });
    };
    uploader.onAfterAddingFile = function(fileItem) {
        if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
        console.log($rootScope.uploaderOption);
        uploader.url = 
        console.log(uploader);
        
        console.log($rootScope.contactUser);

        if (__env.enableDebug) console.log(uploader.queue);
        //if ($rootScope.uploaderOption === '/user/change-picture' || $rootScope.uploaderOption === '/user/contact/update-avatar') {
        if ($rootScope.uploaderOption === '/user/change-picture') {
            //$scope.uploader.uploadAll();
            uploader.uploadAll();
        }
    };
    uploader.onAfterAddingAll = function(addedFileItems) {
        if (__env.enableDebug) console.info('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function(item) {
        if (__env.enableDebug) console.info('onBeforeUploadItem', item);
        if (__env.enableDebug) console.log($rootScope.uploaderOption);
        uploader.url = $rootScope.onescreenBaseUrl + $rootScope.uploaderOption;
        if ($rootScope.uploaderOption === '/user/contact/new') {
            var data = {
                input: makeString($rootScope.contactUser),
                phones: makeString($rootScope.phoneList)
            };
        } else if ($rootScope.uploaderOption === '/contacts/groups/create' ||
            $rootScope.uploaderOption === '/contacts/groups/update') {
            var group = prepareContactGroupData($rootScope.updateGroup);
            var data = {
                input: makeString(group)
            };
            console.log(data);
        } else if ($rootScope.uploaderOption === '/permissions/group/create' ||
            $rootScope.uploaderOption === '/permissions/group/update') {
            console.log($rootScope.updateGroup);
            console.log($rootScope.editPermissionIndex);
            var group = preparePermGroupData($rootScope.updateGroup, $rootScope.editPermissionIndex);
            var data = {
                input: makeString(group)
            };
            console.log(data);
        } else if ($rootScope.uploaderOption === '/user/contact/update-avatar') {
            //console.log($rootScope.editingContact);
            //var user = $rootScope.uploadUser;
            var data = {
                input: makeString({
                    contact_uuid: $rootScope.contactUser.contact_uuid
                }),
                //domain_uuid: getCurrentDomainUuid()
            };
        } else if ($rootScope.uploaderOption === '/user/change-picture') {
            var user = emulationService.emulatedUser ? $rootScope.uploadUser :
                $rootScope.user;
            var data = {
                domain_uuid: getCurrentDomainUuid(),
                user_uuid: user.user_uuid ? user.user_uuid : user.id
            };
            $scope.lastUploadData = data;
        }
        if (data) item.formData.push(data);
        if (__env.enableDebug) console.log("onBeforeUploadItem");
        if (__env.enableDebug) console.log(item);
        if (__env.enableDebug) console.info('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function(fileItem, progress) {
        if (__env.enableDebug) console.info('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function(progress) {
        if (__env.enableDebug) console.info('onProgressAll', progress);
    };
    uploader.onSuccessItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.log("RESPONSE FROM UPLOADING AVATAR");
        if (__env.enableDebug) console.log(response);
        console.log($rootScope.uploaderOption);
        if (response.error) {
            $rootScope.alerts.push({
                error: true,
                message: response.error.message
            });
        } else {
            if ($rootScope.uploaderOption === '/user/contact/new') {
                $scope.newgroup = {};
                var contact = response.success.data;
                var newringtones = {
                    callRingtone: $scope.callRingtone,
                    textRingtone: $scope.textRingtone
                };
                contactService.updateContactRingtones(contact.contact_uuid,
                    newringtones);
                // $rootScope.$broadcast('new.contact.added', contact);
                if (userService.isDemoAgency()) userService.updateDemoUsage();
                $uibModalStack.dismissAll();
            } else if ($rootScope.uploaderOption === '/user/change-picture') {
                if ($scope.lastUploadData.user_uuid === $rootScope.user.id) {
                    $rootScope.user.profile_image = response.success.file;
                }
                var contact = contactService.getContactByUserUuid($scope.lastUploadData
                    .user_uuid);
                if (contact) {
                    contactService.setContactProfileImage(contact, response.success.file);
                } else {
                    contactService.performUserProfileImageChangeCallbacks($scope.lastUploadData
                        .user_uuid, response.success.file);
                }
            } else if ($rootScope.uploaderOption === '/user/contact/update-avatar') {
                // var contact = contactService.getContactByUuid(response.success.contact_uuid);
                // contact.contact_profile_image = response.success.image;
                $rootScope.$broadcast('contact.updated', contact);
            } else if ($rootScope.uploaderOption === '/contacts/groups/create') {
                addGroupToContactGroups(response.success.data);

            } else if ($rootScope.uploaderOption === '/contacts/groups/update') {
                // var index = $filter('getGroupIndexbyUUID')($scope.contactGroups,
                //     response.success.data.group_uuid, '');
                updateGroupInContactGroups(response.success.data);
            } else if ($rootScope.uploaderOption === '/permissions/group/create') {
                if (!$rootScope.permissionsGroups) $rootScope.permissionsGroups = [];
                $rootScope.permissionsGroups.push(response.success.data);
                $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                    $rootScope.permissionsGroups));
                $uibModalStack.dismissAll();
            } else if ($rootScope.uploaderOption === '/permissions/group/update') {
                $rootScope.permissionsGroups.splice($rootScope.editPermissionIndex, 1);
                $rootScope.permissionsGroups.push(response.success.data);
                $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                    $rootScope.permissionsGroups));
                $uibModalStack.dismissAll();
            }
        }
        uploader.clearQueue();
        if (__env.enableDebug) console.info('onSuccessItem', fileItem, response, status,
            headers);
    };


    uploader.onErrorItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.log("RESPONSE FROM UPLOADING AVATAR");
        if (__env.enableDebug) console.log(response);
        fileitem.isUploaded = false;
        $rootScope.alerts.push({
            error: true,
            message: response.error.message
        });
        if (__env.enableDebug) console.info('onErrorItem', fileItem, response, status,
            headers);
    };
    uploader.onCancelItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onCancelItem', fileItem, response, status,
            headers);
        if ($rootScope.uploaderOption === '/permissions/group/update') {
            $rootScope.contactUser.contact_profile_image = null;
        }
        uploader.clearQueue();
    };
    uploader.onCompleteItem = function(fileItem, response, status, headers) {
        if (__env.enableDebug) console.info('onCompleteItem', fileItem, response,
            status, headers);
    };
    uploader.onCompleteAll = function() {
        if (__env.enableDebug) console.info('onCompleteAll');
    };



    $rootScope.numPhones = 1;
    $rootScope.addAnotherPhone = function() {
        $rootScope.numPhones++;
        //var compiledeHTML = $compile('<add-Phone-Fields label="phonecontacts.contacts['+$rootScope.numphones+'].phone_label" extension="phonecontacts.contacts['+$rootScope.numphones+'].phone_extension"  number="phonecontacts.contacts['+$rootScope.numphones+'].phone_number" typevoice="phonecontacts.contacts['+$rootScope.numphones+'].phone_type_voice" typefax="phonecontacts.contacts['+$rootScope.numphones+'].phone_type_fax" typevideo="phonecontacts.contacts['+$rootScope.numphones+'].phone_type_video" typetext="phonecontacts.contacts['+$rootScope.numphones+'].phone_type_text"></add-Phone-Fields>')($rootScope);
        //var compiledeHTML = $compile('<add-Phone-Fields inc="'+$rootScope.numphones+'"></add-Phone-Fields>')($rootScope);
        //$("#add-contact-phone-numbers").append(compiledeHTML);
    };

    $scope.phoneLines = [];
    $scope.phoneCount = 1;
    $scope.phoneLines.push({
        line: 1
    });

    $scope.addNewPhoneLine = function() {
        $scope.phoneCount++;
        $scope.phoneLines.push({
            line: $scope.phoneCount
        });
    };

    function checkForDuplicatePhone(number, contactUuid) {
        var data = {
            number: number,
            contactUuid: contactUuid
        };
        $scope.preventSubmission = true;
        return dataFactory.postCheckForDuplicateNumber(data)
            .then(function(response) {
                if (response.data.contact_number) {
                    var count = response.data.count;
                    if (count > 0) {
                        return response.data;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            });
    };

    $scope.addContactSubmit = function(params) {
        console.log(params);
        $rootScope.contactUser = params;
        if (params.partner_contact) params.partner = $rootScope.user.exportType.partner_code;
        $scope.savingContact = true;
        if (params.favorite === undefined) {
            params.favorite = false;
        }

        if ($scope.uploader.queue.length > 0) {
            $rootScope.uploaderOption = '/user/contact/new';
            $scope.uploader.url = $rootScope.onescreenBaseUrl + $rootScope.uploaderOption;
            $scope.uploader.uploadAll();
        } else {
            var addContactParams = {
                input: params,
                phones: $rootScope.phoneList,
                policies: $scope.policyList
            };
            // $uibModalStack.dismissAll();
            contactService.addContact(addContactParams)
                .then(function(response) {
                    $scope.savingContact = false;
                    if (response.status) {
                        // $rootScope.$broadcast('new.contact.added', response.data);
                        $rootScope.showSuccessAlert(
                            "Your new contact has been added.");
                        if (params.initialGroup && params.initialGroup != 'None') {
                            contactGroupsService.addContactToGroup(response.data,
                                params.initialGroup);
                        }
                        $uibModalStack.dismissAll();
                    } else {
                        $rootScope.showErrorAlert("Something went wrong");
                    }
                    if (userService.isDemoAgency()) userService.updateDemoUsage();
                });
        }
        $rootScope.phoneList = [];


    };


    function getLanguages() {
        dataFactory.getLanguages()
            .then(function(response) {
                $scope.languages = response.data;
            }, function(error) {
                $scope.status += 'Unable to load Language data: ' + JSON.stringify(
                    error, null, 4) + "\n";
            });
    }

    function getTimezones() {
        dataFactory.getTimezones()
            .then(function(response) {
                $scope.timezones = response.data;
            }, function(error) {
                $scope.status += 'Unable to load Timezone data: ' + JSON.stringify(
                    error, null, 4) + "\n";
            });
    }

    // $window.localStorage.setItem("currentUser", JSON.stringify($rootScope.user));

    // function hasContactRingtone(contact, type) {
    //     var found = false;
    //     console.log(contact.ringtones);
    //     console.log(type);
    //     if (contact.ringtones) {
    //         angular.forEach(contact.ringtones, function(ringtone){
    //             console.log(ringtone);
    //             if (ringtone.type === type) found = true;
    //         });
    //     }
    //     return found;
    // }

    $scope.removeContactRingtone = function(contact, type) {
        if (type === 'callRingtone') $scope.callRingtone = null;
        if (type === 'textRingtone') $scope.textRingtone = null;
        // if (hasContactRingtone(contact, type) && contact.contact_uuid) {
        contactService.removeContactRingtone(contact.contact_uuid, type)
            .then(function(response) {
                $rootScope.showalerts(response);
            });
        // } else {
        //     $scope.showSuccessAlert('The ' + type + ' ringtone has been removed from this contact.');
        // }
    };

    $scope.$on('contact.ringtones.updated', function($event, contact) {
        $scope.callRingtone = null;
        $scope.textRingtone = null;
    });

    $scope.updateContactInfo = function(profile) {
        var newringtones = {
            callRingtone: $scope.callRingtone,
            textRingtone: $scope.textRingtone
        };
        $scope.savingContact = true;
        if (!profile.favorite) profile.favorite = false;
        if (profile.contact_type === 'user') {
            contactService.updateContactRingtones(profile.contact_uuid, newringtones);
            $rootScope.showSuccessAlert('Your changes for ' + profile.contact_name_full +
                ' have been saved.');
            $uibModalStack.dismissAll();
        } else {
            if (profile.partner_contact) profile.partner = $rootScope.user.exportType.partner_code;
            profile.newringtones = newringtones;
            contactService.updateContactByUuid(profile)
                .then(function(response) {
                    if (response) {
                        if ($scope.uploader.queue.length > 0) {
                            $rootScope.contactUser.contact_uuid = profile.contact_uuid;
                            if (__env.enableDebug) console.log("UPDATE AVATAR");
                            $rootScope.uploaderOption =
                                '/user/contact/update-avatar';
                            $scope.uploader.url = $rootScope.onescreenBaseUrl +
                                $rootScope.uploaderOption;
                            $scope.uploader.uploadAll();
                        }
                    }
                    contactGroupsService.setGroups();
                    // if (contactService.editingContact) delete contactService.editingContact;
                    $uibModalStack.dismissAll();
                    $scope.savingContact = false;
                    $rootScope.showalerts(response);
                });
        }
    };

    //$rootScope.profilecoloroptions = randomColor({luminosity: 'dark',count: 12});
    $rootScope.profilecoloroptions = ['#033860', '#721121', '#1B998B', '#E87461', '#A1CF6B',
        '#9F838C', '#1C448E', '#FFA552', '#3C1642', '#3C3744', '#065143', '#BB7E5D'
    ];


    /************************************************ */
    //Contact Group Functions
    /************************************************ */

    $scope.groupActive = [];

    function prepareContactGroupData(group) {
        var errors = [];
        var list = [];
        console.log(group);
        console.log(group.member_list);
        if ($rootScope.contactsSelected2 && $rootScope.contactsSelected2.length > 0) {
            list = angular.copy($rootScope.contactsSelected2);
            $rootScope.contactsSelected2 = [];
            $rootScope.contactsSelected = [];
        }
        angular.forEach(group.member_list, function(value, uuid) {
            if (value === true && uuid != 'undefined') list.push(uuid);
        });
        console.log(list);
        // return;
        angular.forEach(group.group_list, function(value, uuid) {
            var contactGroup;
            var uuids;
            if (value === true) {
                contactGroup = contactGroupsService.getGroupByUuid(uuid);
                // uuids = contactGroupsService.retrieveGroupMemberUuids(contactGroup);
                list = list.concat(contactGroup.members);
            }
        });
        if (!group.group_name) {
            errors.push('Must enter a name for this group.');
        }

        var data = {
            group_uuid: group.group_uuid ? group.group_uuid : null,
            group_name: group.group_name,
            group_type: group.group_type,
            group_color: (group.group_color ? group.group_color : null),
            group_members: list,
            private: group.private,
            errors: errors
        };

        data.group_members = _.uniq(data.group_members);
        return data;
    }

    $scope.checkGroupLimit = function(list, group) {
        $scope.count = 0;
        angular.forEach(list, function(value){
            console.log(value);
            if (value) $scope.count++;
        });
    };

    $scope.checkGroupLimit2 = function(list, group, list2) {
        $scope.count = 0;
        angular.forEach(list, function(value){
            if (value) $scope.count++;
        });

        angular.forEach(group.group_list, function(value, key){
            if(value) {
                var selectedgroup = contactGroupsService.getGroupByUuid(key);
                $scope.count = $scope.count + selectedgroup.members.length;
            }
        });
    };

    $scope.createNewGroup = function(group, closeModal) {
        var data = prepareContactGroupData(group);
        if (__env.enableDebug) console.log(data);
        var data2 = {
            input: makeString(data)
        };

        if (data.errors.length === 0) {
            if (closeModal) {
                closeModal();
            }
            contactGroupsService.createGroup(data2)
                .then(function(response) {
                    if (response.success) $rootScope.$broadcast(
                        'contact.group.updated', response.success.data);
                });

        } else {
            var string = '';
            angular.forEach(data.errors, function(error) {
                string += (string.length !== 0 ? ', ' : '') + error;
            });
            $rootScope.alerts.push({
                error: true,
                message: 'Error: ' + string
            });
        }
    };

    $scope.createGroupWithImage = function(group, closeModal) {
        $rootScope.updateGroup = group;
        $scope.uploader.uploadAll();
    };

    $scope.updateGroupWithImage = function(group, closeModal) {
        $rootScope.updateGroup = group;
        if (closeModal) {
            closeModal();
        };
        $scope.uploader.uploadAll();
    };

    $scope.groupLimit = function() {
        return contactGroupsService.groupLimit;
    };

    $scope.exceedsGroupLimit = function(group) {
        return $scope.count > (contactGroupsService.groupLimit + 1);
    };

    $scope.updateContactGroup = function(group, closeModal) {
        if (closeModal) {
            closeModal();
        }
        var data = prepareContactGroupData(group);
        var data2 = {
            input: makeString(data)
        };
        if (data.errors.length === 0) {
            dataFactory.postUpdateGroup(data2)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        updateGroupInContactGroups(response.data.success.data);
                    }
                    // $rootScope.$broadcast('contact.group.updated');
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            var string = '';
            angular.forEach(data.errors, function(error) {
                string += (string.length !== 0 ? ', ' : '') + error;
            });
            $rootScope.alerts.push({
                error: true,
                message: 'Error: ' + string
            });
        }
    };

    $scope.getUserName = function(user_uuid) {
        var contact = contactService.getContactByUserUuid(user_uuid);
        return contact && contact.name;
    };

    $scope.getGroupName = function(group_uuid) {
        var findgroup = $filter('getGroupbyUUID')($scope.contactGroups, group_uuid);
        if (findgroup !== null) return findgroup.group_name;
        return '';
    };

    $scope.showAllMembers = function(group, type) {
        if (type === 'contact') $scope.groupActive[group.group_uuid] = true;
        if (type === 'permissions') $scope.groupActive[group.permissions_group_uuid] =
            true;
    };

    $scope.hideMembers = function(group, type) {
        if (type === 'contact') $scope.groupActive[group.group_uuid] = false;
        if (type === 'permissions') $scope.groupActive[group.permissions_group_uuid] =
            false;
    };

    $scope.isGroupMember = function(index, uuid) {
        if (index !== null) {
            var members = $scope.contactGroups[index].contacts;
            var result = false;
            angular.forEach(members, function(member) {
                if (member.contact_uuid === uuid) result = true;
            });
            return result;
        }
        return false;
    };

    $rootScope.updateGroup = {};


    $scope.dissolveContactGroup = function(group) {
        var data = {
            group_uuid: group.group_uuid
        };
        dataFactory.deleteGroup(data)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    var index = $filter('getGroupIndexbyUUID')($scope.contactGroups,
                        group.group_uuid, '');
                    $scope.contactGroups.splice(index, 1);
                    $window.localStorage.setItem("contactGroups", JSON.stringify(
                        $scope.contactGroups));
                    $uibModalStack.dismissAll();
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);

            });
    };

    $scope.removeGroupContact = function(group, contact_uuid) {
        var data = {
            group_uuid: group.group_uuid,
            contact_uuid: contact_uuid
        };
        dataFactory.deleteGroupContact(data)
            .then(function(response) {
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                } else {
                    if (__env.enableDebug) console.log(response.data.success.message);
                    var pos = group.members.indexOf(contact_uuid);
                    if (pos !== -1) group.members.splice(pos, 1);
                    var index = $filter('getByUUID')(group.contacts, contact_uuid,
                        'contact');
                    if (index !== null) group.contacts.splice(index, 1);
                }
            });
    };

    $scope.showSpreadsheetImport = function(group) {
        group ? group : null;
        var data = {
            group : group,
            closeThisModal : $rootScope.closeThisModal,
        };
        $rootScope.showModalFull(
            '/company/contact-spreadsheet-importer-modal.html', data, 'lg'
        );
    };

    $scope.closeCreateGroup = function() {
        $scope.newgroup = {};
        $rootScope.closeThisModal();
    };

    /**END Contact Group **************************/

    $scope.dissolveGroup = function(group) {
        if ((group.ivrs && group.ivrs.length > 0) || group.vfax || (group.customexts &&
                group.customexts.length > 0) || (group.quotesheets && group.quotesheets
                .length > 0)) {
            var message =
                'This group has services tied to it so it can not be dissolved at this time. You will need to move the services to another group before you can dissolve this group.';
            if (group.customexts && group.customexts.length > 0) {
                message +=
                    ' Please contact a Bridge specialist to assist with removing the custom extensions.';
            }
            $rootScope.showErrorAlert(message);
            return;
        }
        var html = '<h4>Dissolving {{vm.content.data.group.group_name}}?</h4>' +
            '<div class="cls-title-cont-modal">Are you sure you want to dissolve this group? This is not reversible!</div>';
        var confirmDelete = $mdDialog.confirm()
            .title('Confirm Dissolution')
            .htmlContent('Are you sure you want to dissolve <strong>' + group.group_name +
                '</strong>? This is not reversible!')
            .ariaLabel('Dissolve')
            .ok('Yes')
            .cancel('Never Mind');
        $mdDialog.show(confirmDelete).then(function() {
            if (__env.enableDebug) console.log(group);
            if (group.permissions_group_uuid) {
                var index = $filter('getGroupIndexbyUUID')($rootScope.permissionsGroups,
                    group.permissions_group_uuid, 'permissions_');
                $scope.dissolvePermissionsGroup(index);
            } else if (group.locations_group_uuid) {
                var index = $filter('getGroupIndexbyUUID')($rootScope.locationsGroups,
                    group.locations_group_uuid, 'locations_');
                $scope.dissolveLocationsGroup(index);
            } else {
                $scope.dissolveContactGroup(group);
            }
        });
    };

    $scope.openDissolveGroupModal = function(group) {
        var data = {
            group: group,
            dissolveGroup: $scope.dissolveGroup
        };
        $rootScope.showModalWithData('/company/confirmdissolvegroup.html', data);
    };

    $scope.clearFilter = function() {
        $scope.search.contact_name_full = '';
    };

    /************************************************ */
    //Permissions Group Functions
    /************************************************ */

    function getPermissionGroups() {
        var domainUuid = getCurrentDomainUuid();
        dataFactory.getPermissionGroups(domainUuid)
            .then(function(response) {
                $rootScope.permissionsGroups = [];
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                } else if (response.data.success) {
                    $rootScope.permissionsGroups = response.data.success.data;
                    if (__env.enableDebug) console.log("PERM GROUPS");
                    if (__env.enableDebug) console.log($rootScope.permissionsGroups);
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);

            });
    }

    $scope.showCommunications = function(index) {
        var comm = JSON.parse($rootScope.permissionsGroups[index].communications);
        var display = '';
        angular.forEach(comm, function(item) {
            display += (display !== '' ? ', ' : '') + item;
        });
        return display;
    };

    function getPermissionCommunications() {
        dataFactory.getPermissionCommunications()
            .then(function(response) {
                $rootScope.permissionCommunications = response.data;
                if (__env.enableDebug) console.log("COMMUNICATIONS RESPONSE");
                if (__env.enableDebug) console.log($rootScope.permissionCommunications);
            });
    }

    $scope.createNewPermissionsGroup = function(group) {
        if (!group.group_name) {
            $rootScope.showErrorAlert('You are missing a group name. Please correct this.')
            return;
        }
        if ($scope.uploader.queue.length > 0) {
            var file = $scope.uploader.queue.pop();
            group.file = file._file;
        }
        permissionService.createNewPermissionsGroup(group);
    };

    function userContactsOnly() {
        var domainUuid = getCurrentDomainUuid();
        return contactService.getUserContactsOnly();
    };

    $scope.showEditPermissions = function(index) {
        console.log(index);
        var userContacts = contactService.getUserContactsOnly();
        console.log(userContacts);
        $rootScope.editPermissionIndex = index;
        
        $rootScope.showNewGroup = true;
        $scope.uploader.url = $rootScope.onescreenBaseUrl + $rootScope.uploaderOption;
        $scope.search = {};
        var updateGroup = {
            manager: {},
            member: {},
            communication_options: {},
            group_color: $rootScope.profilecoloroptions[0]
        };
        if (index !== null) {
            $rootScope.uploaderOption = '/permissions/group/update';
            console.log("doing update");
            $rootScope.showNewGroup = false;
            angular.forEach(userContacts, function(contact){
                if (contact && contact.user_uuid) {
                    var isMember = $scope.isPermGroupMember(index, contact.user_uuid, 'manager');
                    updateGroup.manager[contact.user_uuid] = isMember;
                    var isMember = $scope.isPermGroupMember(index, contact.user_uuid, 'member');
                    updateGroup.member[contact.user_uuid] = isMember;
                }
            });
            
            updateGroup.primary_sms = $rootScope.permissionsGroups[index].primary_sms;
            angular.forEach($rootScope.permissionCommunications, function(comm){
                updateGroup.communication_options[comm.var_value] = $scope.isPermCommunication(index, comm.var_value);
            });
            updateGroup.group_color = $rootScope.permissionsGroups[index].group_color;
            updateGroup.group_name = $rootScope.permissionsGroups[index].group_name;
        } else {
            console.log("doing create");
            $rootScope.uploaderOption = '/permissions/group/create';
        }
        console.log($rootScope.uploaderOption);
        initializeUploader();
        $rootScope.updateGroup = updateGroup;
        var data = {
            editPermissionIndex: $rootScope.editPermissionIndex,
            closeCreateGroup: $scope.closeCreateGroup,
            permissionsGroups: $rootScope.permissionsGroups,
            profilecoloroptions: $rootScope.profilecoloroptions,
            showNewGroup: $rootScope.showNewGroup,
            uploader: $scope.uploader,
            // contact: $rootScope.contact,
            permissionCommunications: $rootScope.permissionCommunications,
            // search: $scope.search,
            clearFilter: $scope.clearFilter,
            modalTableHeight: $scope.modalTableHeight,
            userContacts: userContacts,
            updatePermissionsGroup: $scope.updatePermissionsGroup,
            createNewPermissionsGroup: $scope.createNewPermissionsGroup,
            domain: emulationService.emulatedCompany,
            isPermCommunication: $scope.isPermCommunication,
            isPermGroupMember: $scope.isPermGroupMember,
            search: $scope.search
        };
        $rootScope.showModal("/company/dopermissionsgroup.html", data);
    };

    $scope.emulationStatus = function() {
        return emulationService.emulationStatus;
    };

    function preparePermGroupData(group, index) {
        if (__env.enableDebug) console.log(group);
        var errors = [];
        var list = [];
        angular.forEach(group.communication_options, function(key, value) {
            if (key === true) list.push(value);
        });
        var list2 = [];
        angular.forEach(group.member, function(key, value) {
            if (key === true) list2.push(value);
        });
        var list3 = [];
        angular.forEach(group.manager, function(key, value) {
            if (key === true) list3.push(value);
        });
        if (list.length === 0) errors.push(
            'At least one Communication Channel must be selected.');
        if (list2.length === 0) errors.push('At least one Member must be specified.');
        if (list3.length === 0) errors.push('At lease one Manager must be specified.');

        var data = {
            permissions_group_uuid: (index !== null ? $rootScope.permissionsGroups[
                index].permissions_group_uuid : null),
            domain_uuid: getCurrentDomainUuid(),
            group_name: group.group_name,
            group_color: (group.group_color ? group.group_color : null),
            group_communications: list,
            group_members: list2,
            group_managers: list3,
            errors: errors
        };
        console.log(data);
        return data;
    }

    function reloadEmulationStatus() {
        dataFactory.getManagerEmulationStatus()
            .then(function(response) {
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                } else {
                    $rootScope.emulationStatus = response.data.success.data;
                    $window.localStorage.setItem("emulationStatus", JSON.stringify(
                        $rootScope.emulationStatus));
                    if (__env.enableDebug) console.log("MANAGER EMULATION STATUS");
                    if (__env.enableDebug) console.log($rootScope.emulationStatus);
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    }

    function initializeUploader() {
        var uploader = $scope.uploader = new FileUploader({
            url: $rootScope.onescreenBaseUrl + $rootScope.uploaderOption,
            queueLimit: 1,
            headers: {
                'Authorization': 'Bearer ' + $rootScope.userToken
            }
        });
    
        uploader.filters.push({
            name: 'imageFilter',
            fn: function(item /*{File|FileLikeObject}*/ , options) {
                var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) +
                    '|';
                return '|jpg|png|jpeg|bmp|'.indexOf(type) !== -1;
            }
        });
    
        uploader.filters.push({
            name: 'avatarSizeFilter',
            fn: function(item /*{File|FileLikeObject}*/ , options) {
                var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) +
                    '|';
                if ('|jpg|png|jpeg|bmp|'.indexOf(type) !== -1 && $rootScope.uploaderOption ===
                    '/user/contact/new' && item.size > 2000000) {
                    return false;
                } else {
                    return true;
                }
            }
        });
    
    
        // CALLBACKS
        uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/ , filter,
            options) {
            if (__env.enableDebug) console.info('onWhenAddingFileFailed', item, filter,
                options);
            $rootScope.alerts.push({
                error: true,
                message: 'Problem Adding File: Image must be under 2MB in size and a jpg, bmp or png file'
            });
        };
        uploader.onAfterAddingFile = function(fileItem) {
            if (__env.enableDebug) console.info('onAfterAddingFile', fileItem);
            console.log($rootScope.uploaderOption);
            uploader.url = 
            console.log(uploader);
            
            console.log($rootScope.contactUser);
    
            if (__env.enableDebug) console.log(uploader.queue);
            //if ($rootScope.uploaderOption === '/user/change-picture' || $rootScope.uploaderOption === '/user/contact/update-avatar') {
            if ($rootScope.uploaderOption === '/user/change-picture') {
                //$scope.uploader.uploadAll();
                uploader.uploadAll();
            }
        };
        uploader.onAfterAddingAll = function(addedFileItems) {
            if (__env.enableDebug) console.info('onAfterAddingAll', addedFileItems);
        };
        uploader.onBeforeUploadItem = function(item) {
            if (__env.enableDebug) console.info('onBeforeUploadItem', item);
            if (__env.enableDebug) console.log($rootScope.uploaderOption);
            uploader.url = $rootScope.onescreenBaseUrl + $rootScope.uploaderOption;
            if ($rootScope.uploaderOption === '/user/contact/new') {
                var data = {
                    input: makeString($rootScope.contactUser),
                    phones: makeString($rootScope.phoneList)
                };
            } else if ($rootScope.uploaderOption === '/contacts/groups/create' ||
                $rootScope.uploaderOption === '/contacts/groups/update') {
                var group = prepareContactGroupData($rootScope.updateGroup);
                var data = {
                    input: makeString(group)
                };
                console.log(data);
            } else if ($rootScope.uploaderOption === '/permissions/group/create' ||
                $rootScope.uploaderOption === '/permissions/group/update') {
                console.log($rootScope.updateGroup);
                console.log($rootScope.editPermissionIndex);
                var group = preparePermGroupData($rootScope.updateGroup, $rootScope.editPermissionIndex);
                var data = {
                    input: makeString(group)
                };
                console.log(data);
            } else if ($rootScope.uploaderOption === '/user/contact/update-avatar') {
                //console.log($rootScope.editingContact);
                //var user = $rootScope.uploadUser;
                var data = {
                    input: makeString({
                        contact_uuid: $rootScope.contactUser.contact_uuid
                    }),
                    //domain_uuid: getCurrentDomainUuid()
                };
            } else if ($rootScope.uploaderOption === '/user/change-picture') {
                var user = emulationService.emulatedUser ? $rootScope.uploadUser :
                    $rootScope.user;
                var data = {
                    domain_uuid: getCurrentDomainUuid(),
                    user_uuid: user.user_uuid ? user.user_uuid : user.id
                };
                $scope.lastUploadData = data;
            }
            if (data) item.formData.push(data);
            if (__env.enableDebug) console.log("onBeforeUploadItem");
            if (__env.enableDebug) console.log(item);
            if (__env.enableDebug) console.info('onBeforeUploadItem', item);
        };
        uploader.onProgressItem = function(fileItem, progress) {
            if (__env.enableDebug) console.info('onProgressItem', fileItem, progress);
        };
        uploader.onProgressAll = function(progress) {
            if (__env.enableDebug) console.info('onProgressAll', progress);
        };
        uploader.onSuccessItem = function(fileItem, response, status, headers) {
            if (__env.enableDebug) console.log("RESPONSE FROM UPLOADING AVATAR");
            if (__env.enableDebug) console.log(response);
            console.log($rootScope.uploaderOption);
            if (response.error) {
                $rootScope.alerts.push({
                    error: true,
                    message: response.error.message
                });
            } else {
                if ($rootScope.uploaderOption === '/user/contact/new') {
                    $scope.newgroup = {};
                    var contact = response.success.data;
                    var newringtones = {
                        callRingtone: $scope.callRingtone,
                        textRingtone: $scope.textRingtone
                    };
                    contactService.updateContactRingtones(contact.contact_uuid,
                        newringtones);
                    // $rootScope.$broadcast('new.contact.added', contact);
                    if (userService.isDemoAgency()) userService.updateDemoUsage();
                    $uibModalStack.dismissAll();
                } else if ($rootScope.uploaderOption === '/user/change-picture') {
                    if ($scope.lastUploadData.user_uuid === $rootScope.user.id) {
                        $rootScope.user.profile_image = response.success.file;
                    }
                    var contact = contactService.getContactByUserUuid($scope.lastUploadData
                        .user_uuid);
                    if (contact) {
                        contactService.setContactProfileImage(contact, response.success.file);
                    } else {
                        contactService.performUserProfileImageChangeCallbacks($scope.lastUploadData
                            .user_uuid, response.success.file);
                    }
                } else if ($rootScope.uploaderOption === '/user/contact/update-avatar') {
                    // var contact = contactService.getContactByUuid(response.success.contact_uuid);
                    // contact.contact_profile_image = response.success.image;
                    $rootScope.$broadcast('contact.updated', contact);
                } else if ($rootScope.uploaderOption === '/contacts/groups/create') {
                    addGroupToContactGroups(response.success.data);
    
                } else if ($rootScope.uploaderOption === '/contacts/groups/update') {
                    // var index = $filter('getGroupIndexbyUUID')($scope.contactGroups,
                    //     response.success.data.group_uuid, '');
                    updateGroupInContactGroups(response.success.data);
                } else if ($rootScope.uploaderOption === '/permissions/group/create') {
                    if (!$rootScope.permissionsGroups) $rootScope.permissionsGroups = [];
                    $rootScope.permissionsGroups.push(response.success.data);
                    $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                        $rootScope.permissionsGroups));
                    $uibModalStack.dismissAll();
                } else if ($rootScope.uploaderOption === '/permissions/group/update') {
                    if (response.success) {
                        $rootScope.permissionsGroups.splice($rootScope.editPermissionIndex, 1);
                        $rootScope.permissionsGroups.push(response.success.data);
                        $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                            $rootScope.permissionsGroups));
                        $uibModalStack.dismissAll();
                    }
                }
            }
            uploader.clearQueue();
            if (__env.enableDebug) console.info('onSuccessItem', fileItem, response, status,
                headers);
        };
    
    
        uploader.onErrorItem = function(fileItem, response, status, headers) {
            if (__env.enableDebug) console.log("RESPONSE FROM UPLOADING AVATAR");
            if (__env.enableDebug) console.log(response);
            fileitem.isUploaded = false;
            $rootScope.alerts.push({
                error: true,
                message: response.error.message
            });
            if (__env.enableDebug) console.info('onErrorItem', fileItem, response, status,
                headers);
        };
        uploader.onCancelItem = function(fileItem, response, status, headers) {
            if (__env.enableDebug) console.info('onCancelItem', fileItem, response, status,
                headers);
            if ($rootScope.uploaderOption === '/permissions/group/update') {
                $rootScope.contactUser.contact_profile_image = null;
            }
            uploader.clearQueue();
        };
        uploader.onCompleteItem = function(fileItem, response, status, headers) {
            if (__env.enableDebug) console.info('onCompleteItem', fileItem, response,
                status, headers);
        };
        uploader.onCompleteAll = function() {
            if (__env.enableDebug) console.info('onCompleteAll');
        };
    }

    $scope.updatePermissionsGroup = function(group, index) {
        var data = preparePermGroupData(group, index);
        if (__env.enableDebug) console.log(data);
        var data2 = {
            input: makeString(data),
            domain_uuid: getCurrentDomainUuid()
        };
        if (data.errors.length === 0) {
            console.log(data2);
            dataFactory.postUpdatePermissionGroup(data2)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        //var index = $filter('getGroupIndexbyUUID')($rootScope.permissionsGroups, group.permissions_group_uuid, 'permissions_');
                        $rootScope.permissionsGroups.splice(index, 1);
                        $rootScope.permissionsGroups.push(response.data.success.data);
                        $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                            $rootScope.permissionsGroups));
                        emulationService.setEmulationStatus();
                        $uibModalStack.dismissAll();
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            var string = '';
            angular.forEach(data.errors, function(error) {
                string += (string.length !== 0 ? ', ' : '') + error;
            });
            $rootScope.alerts.push({
                error: true,
                message: 'Error: ' + string
            });
        }
    };


    $scope.postRemovePermissionGroupMember = function(group, index, member_type) {
        if ((member_type === 'member' && group.members.length > 1) || (member_type ===
                'manager' && group.managers.length > 1)) {
            var data = {
                permissions_group_uuid: group.permissions_group_uuid,
                permissions_group_member_uuid: (member_type === 'member' ? group.members[
                    index].permissions_group_member_uuid : group.managers[
                    index].permissions_group_member_uuid),
                member_type: member_type
            }
            if (__env.enableDebug) console.log(data);
            dataFactory.postRemovePermissionGroupMember(data)
                .then(function(response) {
                    if (response.data.error) {
                        if (__env.enableDebug) console.log(response.data.error.message);
                    } else {
                        if (__env.enableDebug) console.log(response.data.success.message);
                        var index2 = $filter('getGroupIndexbyUUID')($rootScope.permissionsGroups,
                            group.permissions_group_uuid, 'permissions_');
                        $rootScope.permissionsGroups[index2][member_type + 's'].splice(
                            index, 1);
                        $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                            $rootScope.permissionsGroups));
                        emulationService.setEmulationStatus();
                    }
                });
        } else {
            $rootScope.alerts.push({
                error: true,
                message: 'Error: You can not remove this ' + member_type +
                    ' as there must be at least one ' + member_type +
                    ' in each group.'
            });
        }
    };

    $scope.dissolvePermissionsGroup = function(index) {
        dataFactory.getRemovePermissionGroup($rootScope.permissionsGroups[index].permissions_group_uuid)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    $rootScope.permissionsGroups.splice(index, 1);
                    $window.localStorage.setItem("permissionsGroups", JSON.stringify(
                        $rootScope.permissionsGroups));
                    emulationService.setEmulationStatus();
                    $uibModalStack.dismissAll();
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };

    $scope.isPermCommunication = function(index, communication) {
        if (index !== null) {
            if (__env.enableDebug) console.log(index);
            var values = JSON.parse($rootScope.permissionsGroups[index].communications);
            var result = false;
            angular.forEach(values, function(key, value) {
                if (key === communication) result = true;
            });
            return result;
        }
        return false;
    };
    $scope.isPermGroupMember = function(index, uuid, type) {
        if (index !== null) {
            var members = $rootScope.permissionsGroups[index][type + 's'];
            var result = false;
            angular.forEach(members, function(member) {
                if (member.user_uuid === uuid) result = true;
            });
            return result;
        }
        return false;
    };


    /**END Permissions Group **************************/

    // Locations group

    $scope.loadDomainNumbers = function() {
        var domainUuid = getCurrentDomainUuid();
        return domainService.loadDomainDids(domainUuid)
            .then(function(response) {
                console.log(response);
                $scope.domainNumbers = response.dids;
                $scope.portingNumbers = response.ports;
                $scope.inactiveNumbers = [];

                angular.forEach($scope.domainNumbers, function(number) {
                    if (number.type === 'did') {
                        if ((number.info && number.info.isUser) || number.info.isConference || number.info.isIvr) {
                            return;
                        } else {
                            $scope.inactiveNumbers.push(number);
                        }
                    }
                });
                console.log($scope.inactiveNumbers);
                return;
            });
    };

    $scope.userContacts = function() {
        return contactService.getUserContactsOnly();
    };

    $scope.loadDomainNumbers();

    $scope.showEditLocations = function(index) {
        var userContacts = contactService.getUserContactsOnly();
        $rootScope.editLocationIndex = index;
        $rootScope.showNewGroup = true;
        if (index !== null) {
            $rootScope.showNewGroup = false;
        }
        var timeZone = "";
        $scope.search = {};
        var updateGroup = {
            manager: {},
            member: {},
            communication_options: {},
            timezone: timeZone
        };
        if (index !== null) {
            angular.forEach(userContacts, function(contact){
                if (contact && contact.user_uuid) {
                    var isMember = $scope.isLocationsGroupMember(index, contact.user_uuid, 'manager');
                    updateGroup.manager[contact.user_uuid] = isMember;
                    var isMember = $scope.isLocationsGroupMember(index, contact.user_uuid, 'member');
                    updateGroup.member[contact.user_uuid] = isMember;
                }
            });
            updateGroup.primary_sms = $rootScope.locationsGroups[index].primary_sms;
            angular.forEach($rootScope.locationCommunications, function(comm){
                updateGroup.communication_options[comm.var_value] = $scope.isLocationsCommunication(index, comm.var_value);
            });
            updateGroup.group_name = $rootScope.locationsGroups[index].group_name;
        }
        $rootScope.updateGroup = updateGroup;
        var data = {
            editLocationIndex: $rootScope.editLocationIndex,
            closeCreateGroup: $scope.closeCreateGroup,
            locationsGroups: $rootScope.locationsGroups,
            showNewGroup: $rootScope.showNewGroup,
            locationCommunications: $rootScope.locationCommunications,
            clearFilter: $scope.clearFilter,
            modalTableHeight: $scope.modalTableHeight,
            userContacts: userContacts,
            updateLocationsGroup: $scope.updateLocationsGroup,
            createNewLocationsGroup: $scope.createNewLocationsGroup,
            domain: emulationService.emulatedCompany,
            isLocationsCommunication: $scope.isLocationsCommunication,
            isLocationsGroupMember: $scope.isLocationsGroupMember,
            domainNumbers: $scope.inactiveNumbers,
            textingSelected: textingSelected,
            search: $scope.search,
            loading: function() {
                return $scope.loading;
            }
        };
        $rootScope.showModal("/company/dolocationsgroup.html", data);
    };

    function textingSelected(options) {
        var texting = false;
        angular.forEach(options, function(value, key) {
            if (value === true && key === 'texting') texting = true;
        });
        return texting;
    }

    $scope.$on('user-deleted', function($event, contact) {
        angular.forEach($rootScope.locationsGroups, function(group) {
            var index = $filter('getByUUID')(group.managers, contact.user_uuid,
                'user');
            if (index !== null) group.managers.splice(index, 1);
            var index = $filter('getByUUID')(group.members, contact.user_uuid,
                'user');
            if (index !== null) group.members.splice(index, 1);
        });

        angular.forEach($rootScope.permissionsGroups, function(group) {
            var index = $filter('getByUUID')(group.managers, contact.user_uuid,
                'user');
            if (index !== null) group.managers.splice(index, 1);
            var index = $filter('getByUUID')(group.members, contact.user_uuid,
                'user');
            if (index !== null) group.members.splice(index, 1);
        });
    });

    function getLocationGroups() {
        var domainUuid = getCurrentDomainUuid();
        $scope.loadDomainNumbers();
        dataFactory.getLocationGroups(domainUuid)
            .then(function(response) {
                $rootScope.locationsGroups = [];
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                } else if (response.data.success) {
                    $rootScope.locationsGroups = response.data.success.data;
                    if (__env.enableDebug) console.log("Location GROUPS");
                    if (__env.enableDebug) console.log($rootScope.locationsGroups);
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);

            });
    }

    $scope.showCommunications2 = function(index) {
        var comm = JSON.parse($rootScope.locationsGroups[index].communications);
        var display = '';
        angular.forEach(comm, function(item) {
            display += (display !== '' ? ', ' : '') + item;
        });
        return display;
    };


    function getLocationCommunications() {
        dataFactory.getLocationCommunications()
            .then(function(response) {
                $rootScope.locationCommunications = response.data;
                if (__env.enableDebug) console.log("COMMUNICATIONS RESPONSE");
                if (__env.enableDebug) console.log($rootScope.locationCommunications);
            });
    }

    function prepareLocationsGroupData(group, index) {
        if (__env.enableDebug) console.log(group);
        var errors = [];
        var list = [];
        angular.forEach(group.communication_options, function(key, value) {
            if (key === true) list.push(value);
        });
        var list2 = [];
        angular.forEach(group.member, function(key, value) {
            if (key === true) list2.push(value);
        });
        var list3 = [];
        angular.forEach(group.manager, function(key, value) {
            if (key === true) list3.push(value);
        });
        if (list.length === 0) errors.push(
            'At least one Communication Channel must be selected.');
        if (list2.length === 0) errors.push('At least one Member must be specified.');
        if (list3.length === 0) errors.push('At lease one Manager must be specified.');

        var data = {
            locations_group_uuid: (index !== null ? $rootScope.locationsGroups[index].locations_group_uuid :
                null),
            domain_uuid: getCurrentDomainUuid(),
            group_name: group.group_name,
            group_communications: list,
            group_members: list2,
            group_managers: list3,
            primary_sms: group.primary_sms,
            errors: errors
        };
        return data;
    }
    $scope.createNewLocationsGroup = function(group) {
        if ($scope.uploader.queue.length > 0) {
            var file = $scope.uploader.queue.pop();
            group.file = file._file;
        }
        var opts = {
            onResponse: function(response) {
                $scope.loading = false;
            },
            onError: function() {
                $scope.loading = false;
            }
        };
        $scope.loading = true;
        locationService.createNewLocationsGroup(group, opts);
    };

    $scope.updateLocationsGroup = function(group, index) {
        var data = prepareLocationsGroupData(group, index);
        if (__env.enableDebug) console.log(data);
        var data2 = {
            input: makeString(data),
            domain_uuid: getCurrentDomainUuid(),
            timezone: group.timeZone
        };
        if (data.errors.length === 0) {
            dataFactory.postUpdateLocationGroup(data2)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        var group = response.data.success.data;
                        locationService.handleSuccessUpdateGroup(group);
                        $rootScope.locationsGroups.splice(index, 1);
                        $rootScope.locationsGroups.push(group);
                        $uibModalStack.dismissAll();
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            var string = '';
            angular.forEach(data.errors, function(error) {
                string += (string.length !== 0 ? ', ' : '') + error;
            });
            $rootScope.alerts.push({
                error: true,
                message: 'Error: ' + string
            });
        }
    };

    $scope.postRemoveLocationGroupMember = function(group, index, member_type) {
        if ((member_type === 'member' && group.members.length > 1) || (member_type ===
                'manager' && group.managers.length > 1)) {
            var data = {
                locations_group_uuid: group.locations_group_uuid,
                locations_group_member_uuid: (member_type === 'member' ? group.members[
                    index].locations_group_member_uuid : group.managers[
                    index].locations_group_member_uuid),
                member_type: member_type
            }
            if (__env.enableDebug) console.log(data);
            dataFactory.postRemoveLocationGroupMember(data)
                .then(function(response) {
                    if (response.data.error) {
                        if (__env.enableDebug) console.log(response.data.error.message);
                    } else {
                        if (__env.enableDebug) console.log(response.data.success.message);
                        var index2 = $filter('getGroupIndexbyUUID')($rootScope.locationsGroups,
                            group.locations_group_uuid, 'locations_');
                        var removed = $rootScope.locationsGroups[index2][
                            member_type + 's'
                        ].splice(index, 1);
                        locationService.handleSuccessRemoveUser(
                            group, member_type + 's', removed[0]
                        );

                        emulationService.setEmulationStatus();
                    }
                });
        } else {
            $rootScope.alerts.push({
                error: true,
                message: 'Error: You can not remove this ' + member_type +
                    ' as there must be at least one ' + member_type +
                    ' in each group.'
            });
        }
    };


    $scope.dissolveLocationsGroup = function(index) {
        dataFactory.getRemoveLocationGroup($rootScope.locationsGroups[index].locations_group_uuid)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    var group = $rootScope.locationsGroups[index];
                    $rootScope.locationsGroups.splice(index, 1);
                    locationService.deleteGroup(group);
                    $window.localStorage.setItem("locationsGroups", JSON.stringify(
                        $rootScope.locationsGroups));
                    $uibModalStack.dismissAll();
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };

    $scope.isLocationsCommunication = function(index, communication) {
        if (index !== null) {
            if (__env.enableDebug) console.log(index);
            var values = JSON.parse($rootScope.locationsGroups[index].communications);
            var result = false;
            angular.forEach(values, function(key, value) {
                if (key === communication) result = true;
            });
            return result;
        }
        return false;
    };

    $scope.isLocationsGroupMember = function(index, uuid, type) {
        if (index !== null) {
            var members = $rootScope.locationsGroups[index][type + 's'];
            var result = false;
            angular.forEach(members, function(member) {
                if (member.user_uuid === uuid) result = true;
            });
            return result;
        }
        return false;
    };

    $scope.toggleShowGroupMembers = function(group) {
        group.showMembers = !group.showMembers;
    };

    $scope.toggleShowGroupManagers = function(group) {
        group.showManagers = !group.showManagers;
    };
    //     Location group end
    //


    /** USER PRODUCTIVITY ****************************/

    $scope.prodStatsUser = $rootScope.user.id;
    $scope.companyUserStats = [];
    $scope.prodTitle = '';
    $scope.showStats = false;

    $scope.loadUserProductivity = function(user_uuid) {
        $scope.showStats = false;
        $scope.productivityCompanyStats = null;
        if ($scope.fromDate == undefined || $scope.toDate == undefined) {
            $scope.fromDate = "";
            $scope.toDate = "";
        }
        var data = {
            user_uuid: user_uuid,
            from_date: $scope.fromDate,
            to_date: $scope.toDate
        };
        dataFactory.postGetUserProdStats(data)
            .then(function(response) {
                if (response.data.success) {
                    console.log("productivityStats");
                    $scope.productivityUser = contactService.getContactByUserUuid(
                        user_uuid);
                    console.log(response.data.success.data);
                    if ($scope.fromDate == '') {
                        $scope.prodTitle = 'For ' + moment().format(
                            "dddd, MMMM Do YYYY");
                    } else {
                        $scope.prodTitle = 'From ' + moment($scope.fromDate).format(
                                "dddd, MMMM Do YYYY") + ' to ' + moment($scope.toDate)
                            .format("dddd, MMMM Do YYYY");
                    }
                    $scope.productivityStats = response.data.success.data;
                    var results = calculateDurations($scope.productivityStats);
                    console.log(results);
                    initializeMyChart();
                    populateMyChart(results);
                    $scope.showStats = true;

                } else {
                    console.log("productivity");
                    console.log(response.data.error.message);
                }
            }, function(error) {
                $scope.productivityStats = [];
                console.log(error);
            });
    };

    // $scope.loadUserProductivity($scope.prodStatsUser);

    $scope.changeProductivityStatsUser = function() {
        $scope.loadUserProductivity($scope.prodStatsUser);
    };

    $scope.updateProductivityDateRange = function() {
        if ($scope.productivityStats) $scope.loadUserProductivity($scope.prodStatsUser);
        if ($scope.productivityCompanyStats) $scope.loadCompanyProductivity();
    };

    $scope.loadCompanyProductivity = function() {
        $scope.showStats = false;
        $scope.productivityStats = null;
        var data = {
            from_date: $scope.fromDate,
            to_date: $scope.toDate
        }

        dataFactory.postGetUserProdStatsDomain(data)
            .then(function(response) {
                if (response.data.success) {
                    $scope.companyUserStats = [];
                    console.log("productivityCompanyStats");
                    console.log(response.data.success.data);
                    if ($scope.fromDate == '') {
                        $scope.prodTitle = 'For ' + moment().format(
                            "dddd, MMMM Do YYYY");
                    } else {
                        $scope.prodTitle = 'From ' + moment($scope.fromDate).format(
                                "dddd, MMMM Do YYYY") + ' to ' + moment($scope.toDate)
                            .format("dddd, MMMM Do YYYY");
                    }
                    $scope.productivityCompanyStats = response.data.success.data;
                    var summary = [];
                    angular.forEach($scope.productivityCompanyStats, function(stat) {
                        var interim = calculateDurations(stat.updates);
                        var keith = [];
                        console.log(interim);
                        angular.forEach(interim, function(value, key) {
                            var obj = {
                                status: key,
                                duration: value
                            };
                            keith.push(obj);
                        });
                        console.log("KEITH");
                        console.log(keith);
                        //$scope.companyUserStats.push(keith);
                        $scope.companyUserStats[stat.user_uuid] = keith;
                        summary.push(keith);
                    });
                    console.log($scope.companyUserStats);
                    console.log("SUMMARY");
                    console.log(summary);
                    var results = getCompanyTotals(summary);
                    initializeMyChart();
                    populateMyChart(results);
                    $scope.showStats = true;

                } else {
                    console.log("productivity");
                    console.log(response.data.error.message);
                }
            }, function(error) {
                $scope.productivityCompanyStats = [];
                console.log(error);
            });
    };

    function getCompanyTotals(results) {
        var obj = {};
        angular.forEach(results, function(result) {
            angular.forEach(result, function(item) {
                if (!obj[item.status]) {
                    obj[item.status] = item.duration;
                } else {
                    obj[item.status] = obj[item.status] + item.duration;
                }
            });
        });
        console.log(obj);
        return obj;
    }

    function calculateDurations(results) {
        var array = {};
        var i = 0;
        var diff = 0;
        angular.forEach(results, function(result) {

            //if (i>0) {
            var then = moment(result.changed_at);
            var now = moment();
            if (i > 0) now = moment(results[i - 1].changed_at);

            //diff = moment.duration(now.diff(then)).humanize();
            diff = usefulTools.roundNumber(moment.duration(now.diff(then)) / (1000 *
                60), 2);
            result.duration = moment.duration(now.diff(then)).humanize();
            //console.log(result.changed_at+' to '+results[i-1].changed_at+' -> '+diff);
            if (!array[result.status_name]) {
                //array.push({status: diff} );
                array[result.status_name] = diff;
            } else {
                array[result.status_name] = array[result.status_name] + diff;
            }
            //}
            //
            i += 1;
        });
        if ($scope.productivityStats) $scope.productivityStats = results;
        if ($scope.productivityCompanyStats) $scope.productivityCompanyStats = results;
        console.log(array);
        return array;
    }

    function populateMyChart(results) {
        console.log(results);
        // results = usefulTools.convertObjectToKeyValueArray(results);
        console.log(results);
        var rows = [];
        var array = [];
        var sum = 0;
        angular.forEach(results, function(value, key) {
            console.log("ROW: " + key + ' ' + value);
            var line = {
                c: [{
                    v: key
                }, {
                    v: value
                }]
            };
            rows.push(line);
            var data = {
                key: key,
                value: value
            }
            array.push(data);
            sum += value;
        });
        var data = {
            "cols": [{
                    id: "t",
                    label: "Topping",
                    type: "string"
                },
                {
                    id: "s",
                    label: "Slices",
                    type: "number"
                }
            ],
            "rows": rows
        };
        console.log(data);
        $scope.myChartObject.data = data;
        console.log($scope.myChartObject.data);
    }

    function initializeMyChart() {
        $scope.myChartObject = {};
        $scope.myChartObject.type = "PieChart";
        $scope.myChartObject.options = {
            'title': 'Status Distribution (Minutes)',
            chartArea: {
                left: 10,
                top: 50,
                bottom: 10,
                width: '100%',
                height: "100%"
            },
            displayExactValues: true,
            width: '100%',
            height: '100%',
            is3D: true
        };
    }

    /**END USER PRODUCTIVITY **************************/

    /************************************************ */
    // Call Statistics Functions
    /************************************************ */

    var today = new Date();
    $scope.fromDate = '';
    $scope.toDate = '';
    $scope.dateFormat = 'yyyy-MM-dd';
    $scope.fromDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 1,
        minDate: new Date(2016, 1, 1),
        maxDate: today
    };
    $scope.toDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 1,
        //minDate: $scope.fromDate,
        maxDate: today
    };
    $scope.fromDatePopup = {
        opened: false
    };
    $scope.toDatePopup = {
        opened: false
    };
    $scope.ChangeToMinDate = function(fromDate) {
        if (fromDate != null) {
            var ToMinDate = new Date(fromDate);
            $scope.toDateOptions.minDate = ToMinDate;
            $scope.toDate = ToMinDate;
        }
    };
    $scope.ChangeToMinDate();
    $scope.OpenfromDate = function() {
        $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
    };
    $scope.OpentoDate = function() {
        $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
    };


    $scope.clearSelectionTab = function() {
        $rootScope.tabContactGroup = false;
    };

    $scope.cleanConsole = function() {
        console.API;
        if (typeof console._commandLineAPI !== 'undefined') {
            console.API = console._commandLineAPI; //chrome
        } else if (typeof console._inspectorCommandLineAPI !== 'undefined') {
            console.API = console._inspectorCommandLineAPI; //Safari
        } else if (typeof console.clear !== 'undefined') {
            console.API = console;
        }
        console.API.clear();
    };
    $scope.emulate = {
        emulatedCompany: null,
        searchText: ''
    };

    $scope.setEmulatedCompany = function(domain) {
        if (domain) {
            console.log(userService.retrievingUsers);
            console.log($scope.emulate.emulatedCompany);
            emulationService.setEmulatedCompany(domain);
            getPermissionGroups();
            getLocationCommunications();
            getLocationGroups();
            $rootScope.$broadcast('load.integration.settings');
            $scope.currentDomainStatus = currentDomainEnabled();
        }
    };

    $scope.getDomainsBySearchText = function() {
        if ($scope.emulate.searchText) {
            console.log($scope.domains);
            return $scope.domains.filter(function(domain) {
                return domain.domain_name.indexOf($scope.emulate.searchText) >
                    -1;
            });
        } else {
            // console.log($scope.domains);
            return $scope.domains;
        }
    };

    var templateChangeCallbacks = {};
    $scope.changeTemplate = function(template) {
        var awayCallbacks = getTemplateCallbacksAtType($rootScope.templateInclude,
            "away");
        if (awayCallbacks && awayCallbacks.length) {
            var results = awayCallbacks.map(function(cb) {
                return cb(template, change);
            });
            if (!_.some(results, function(val) {
                    return val && val.then;
                })) {
                change();
            }
        } else {
            change();
        }

        function change() {
            $rootScope.templateInclude = template;
        };
    };

    $scope.registerTempChangeCb = function(templateName, type, callback) {
        var cbs = templateChangeCallbacks;
        var coll = getTemplateCallbacksAtType(templateName, type);
        if (!coll) {
            coll = createTemplateCallbackCollOfType(templateName, type);
        }
        coll.push(callback);
        return function() {
            $scope.deregisterTempChangeCb(templateName, type, callback);
        };
    };

    $scope.deregisterTempChangeCb = function(templateName, type, callback) {
        var cbs = templateChangeCallbacks;
        var coll = getTemplateCallbacksAtType(templateName, type);
        if (coll) {
            _.pull(coll, callback);
        }
    };

    function getTemplateCallbacksAtType(templateName, type) {
        var path = templateName + "." + type;
        return _.get(templateChangeCallbacks, path);
    };

    function createTemplateCallbackCollOfType(templateName, type) {
        var path = templateName + "." + type;
        _.set(templateChangeCallbacks, path + "[0]");
        var coll = getTemplateCallbacksAtType(templateName, type);
        coll.pop();
        return coll;
    };

    function getDomainByUuidFromCollection(domainUuid) {
        var domain;
        var collection = $scope.domains;
        if (domainUuid && collection) {
            for (var i = 0; i < collection.length; i++) {
                domain = collection[i];
                if (domain.domain_uuid === domainUuid) {
                    return domain;
                };
            };
        }
        return null;
    };

    $scope.loadingContacts = function() {
        return !contactService.contactsLoaded;
    };

    $scope.loadingUsers = function() {
        return !contactService.userContactsLoaded;
    };

    $scope.isDemoAgency = function() {
        return userService.isDemoAgency();
    };

    $scope.isKotterTech = function() {
        return userService.isKotterTech();
    };

    $scope.isKotterTechUser = function(user) {
        var usercontact = contactService.getContactByUserUuid(user.user_uuid);
        return contactService.isKotterTechUser(usercontact);
    };

    function getCurrentDomainUuid() {
        return emulationService.getCurrentDomainUuid();
    };

    $scope.searchTextChange = function(text) {
        // console.log($scope.emulate);
        // console.log('Text changed to ' + text);
    };

    $scope.getCurrentDomain = function() {
        var domainUuid = getCurrentDomainUuid();
        return domainUuid ? getDomainByUuid(domainUuid) : null;
    };

    function getDomainByUuid(domainUuid) {
        if ($scope.domains) {
            var index = $filter('getByUUID')($scope.domains, domainUuid, 'domain');
            if (index !== null) return $scope.domains[index];
            return null;
        } else {
            return null;
        }
    };

    function currentDomainEnabled() {
        var domainUuid = getCurrentDomainUuid();
        var domain = getDomainByUuid(domainUuid);
        var status = domain.domain_enabled;
        if (status === 'true') {
            return true;
        } else if (status === 'false') {
            return false;
        };
        return null;
    };

    $scope.isKotterGroupCompany = function() {
        // var domain = getDomainByUuidFromCollection(getCurrentDomainUuid(), $scope.domains);
        var domain = getDomainByUuid(getCurrentDomainUuid());
        if (domain) {
            var name = domain.domain_name;
            return name.slice(0, 16) === 'the-kotter-group' ||
                name.slice(0, 13) === 'kotter-agency' ||
                name.slice(0, 14) === 'qa-kotter-test';
        } else {
            return false;
        }
    };

    function getContactGroupsIndex() {
        return $scope.isAdminGroupOrGreater() ? 2 : 1;
    };

    $rootScope.$on('set.contact.groups.tab', function() {
        $scope.activeSettingTab = getContactGroupsIndex();
    });

    $rootScope.$on('set.upgrade.tab', function() {
        $scope.activeSettingTab = 3;
    });

    if ($rootScope.showMyProfile) {
        showMyProfile();
    } else if ($cookies.get('activeSettingTab') && !$routeParams.domainUuid) {
        $scope.activeSettingTab = parseInt($cookies.get('activeSettingTab'));
        setActiveTabWatch();
    }

    function setActiveTabWatch() {
        $scope.$watch('activeSettingTab', function(newVal, oldVal) {
            if (newVal !== oldVal) {
                newVal += '';
                $cookies.put('activeSettingTab', newVal);
            }
        });
    }

    function showMyProfile() {
        setActiveTabWatch();
        $rootScope.showMyProfile = false;
        $scope.activeSettingTab = 0;
        $cookies.put('activeSettingTab', 0);
    };
    $rootScope.$on('show.my.profile', function() {
        showMyProfile();
    });

    $scope.btnMnuActBill = null;
    $rootScope.templateIncludeBill = null;

    $scope.$watch('activeSettingTab', function(newVal, oldVal) {
        console.log(newVal);
        if (newVal === 4) {
            $scope.btnMnuActBill = '3';
            $rootScope.templateIncludeBill = 'package';
        } else if (newVal === 6) {
            billingService.activeAgency = null;
            $scope.btnMnuActBillingAdmin = '1';
            $rootScope.templateIncludeBillingAdmin = 'billingadmin';
        } else if (newVal === 1) {
            domainService.getRawDomains().then(function(response) {
                if (response.data.success) {
                    //console.log(domains);
                    $scope.domains = response.data.success.data;
                    $scope.emulate.emulatedCompany = getDomainByUuid($rootScope.user.domain_uuid);
                    // $scope.emulate.emulatedCompany = getDomainByUuidFromCollection($rootScope.user.domain_uuid, $scope.domains);
                }
            });
        }
    });
    $scope.ringtones = function() {
        var libraries = audioLibraryService.filterAudioLibrariesByCategories($scope.audioLibraries,
            ['ringtones']);
        if (libraries) {
            libraries = libraries.filter(function(library) {
                return library.user_uuid === $scope.user.id || library.access_level ===
                    'company';
            });
        }
        return libraries;
    };

    $scope.playRingtone = function(ringtone, type, media) {
        if ($scope.audio) {
            $scope.audio.pause();
        };
        if (ringtone) {
            if (__env.enableDebug) console.log(symphonyConfig.audioUrl + ringtone.filepath);
            $scope.audio = new Audio(symphonyConfig.audioUrl + ringtone.filepath);
            if (media) {
                $scope.audio.setSinkId(media.deviceId);
            }
            console.log($rootScope.user);
            if (type === 'call') {
                $scope.audio.volume = $rootScope.user.callRingtoneVolume / 10;
            } else if (type === 'text') {
                $scope.audio.volume = $rootScope.user.textRingtoneVolume / 10;
            }
            if (!$scope.audio.error) {
                $scope.ringtonePlaying = type;
                $scope.progress = $scope.audio.progress;
                $scope.audio.play();
                $scope.clearWatch = $scope.$watch('audio.progress', function(newVal) {
                    if (newVal === 1) {
                        $scope.audio = undefined;
                        $scope.ringtonePlaying = false;
                        $scope.clearWatch();
                        $scope.clearVolumeWatch();
                    }
                });
            }
        }
    };

    $scope.stopRingtone = function() {
        if ($scope.audio) {
            $scope.audio.pause();
            $scope.audio = undefined;
            $scope.ringtonePlaying = false;
            $scope.clearWatch();
        }
    };


    // $scope.$watch('callRingtone',function(newVal, oldVal){
    //         if(newVal===undefined){
    //             $rootScope.contactCallRingtone ={};
    //             $rootScope.contactCallRingtone.isSet = false;
    //         }else{
    //             if(newVal !== oldVal){
    //                 $rootScope.contactCallRingtone.isSet = true;
    //                 $rootScope.contactCallRingtone.type = 'callRingtone';
    //                 $rootScope.contactCallRingtone.audio_library_uuid =newVal.audio_library_uuid ;
    //             }else{
    //                 $rootScope.contactCallRingtone ={};
    //                 $rootScope.contactCallRingtone.isSet = false;
    //             }
    //         }
    // });

    // $scope.$watch('textRingtone',function(newVal, oldVal){
    //     if(newVal===undefined){
    //         $rootScope.contactTextRingtone ={};
    //         $rootScope.contactTextRingtone.isSet = false;
    //     }else{
    //         if(newVal !== oldVal){
    //             $rootScope.contactTextRingtone.isSet=true;
    //             $rootScope.contactTextRingtone.type = 'textRingtone';
    //             $rootScope.contactTextRingtone.audio_library_uuid =newVal.audio_library_uuid ;
    //         }else{
    //             $rootScope.contactTextRingtone ={};
    //             $rootScope.contactTextRingtone.isSet=false;
    //         }
    //     }
    // });

    $rootScope.$watch('contactRingtones', function(newVal, oldVal) {
        if (newVal !== undefined) {
            if (newVal.length > 0) {
                audioLibraryService.loadAudioLibraries($scope.user.domain_uuid,
                        false)
                    .then(function(response) {
                        if (response) {
                            $scope.audioLibraries = response;
                            var libraries = audioLibraryService.filterAudioLibrariesByCategories(
                                $scope.audioLibraries, ['ringtones']);
                            if (libraries) {
                                libraries = libraries.filter(function(library) {
                                    return library.user_uuid === $scope
                                        .user.id ||
                                        library.access_level ===
                                        'company';
                                });
                            }

                            angular.forEach($rootScope.contactRingtones,
                                function(element) {
                                    if (element.type === 'callRingtone') {
                                        $scope.callRingtone = libraries.find(
                                            function(item) {
                                                return item.audio_library_uuid ===
                                                    element.audio_library_uuid;
                                            });
                                    }
                                    if (element.type === 'textRingtone') {
                                        $scope.textRingtone = libraries.find(
                                            function(item) {
                                                return item.audio_library_uuid ===
                                                    element.audio_library_uuid;
                                            });
                                    }
                                });

                        }
                    });
            }

        }
    });

    function closeModal() {
        $rootScope.closeModal();
        $rootScope.$broadcast('stop.audio');
    }

    $scope.showDomainCallersBlacklist = function() {
        var data = {
            number_to_filter: null,
            extension_uuid: null,
            user_uuid: null,
            access: $rootScope.user.accessgroup !== 'user' ? 'admin' : null,
            closeModal: closeModal,
            activeTab: 1,
            domain_uuid: getCurrentDomainUuid(),
            domain: $scope.getCurrentDomain()
        };
        dataFactory.getCallersBlacklist(data.domain_uuid)
            .then(function(response) {
                if (response.data.success) {
                    data.blacklist = response.data.success.data;
                    $rootScope.showModalFull('/modals/callers-blacklist-modal.html',
                        data, 'lg');
                }
            });
    };

    if (__env.developingAA) {
        $scope.activeSettingTab = 1;
        $rootScope.templateInclude = 'attendant';
    }


    $scope.openDownloadLink = function(link) {
        var myWindow = window.open(link);
    }


    // Watch for change in location and prevent for AA

    $scope.currentLocation = $location.url();
    $scope.$on(
        "$locationChangeSuccess",
        function handleLocationChangeSuccessEvent(event) {
            $scope.currentLocation = $location.url();
        }
    );
});
