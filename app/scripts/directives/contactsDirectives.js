'use strict';

proySymphony
    .directive('contactManagement', function($rootScope, $mdDialog, dataFactory, $uibModalStack, tagService, 
        contactService, contactGroupsService, usefulTools, emailService, callService, $myModal, 
        emulationService) {
        return {
            restrict: 'E',
            templateUrl: 'views/contacts/contact-management.html',
            scope: {

            },
            link: function($scope, element, attrs) {
                $scope.domain = $rootScope.user.domain;
                $scope.user = $rootScope.user;
                $scope.tips = $rootScope.tips;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.setProfileColor = $rootScope.setProfileColor;
                $scope.showAddContactForm = $rootScope.showAddContactForm;
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.bulkContacts = [];
                $scope.showAdvanced = false;
                $scope.listed = [];
                $scope.customFilterResults = [];
                $scope.contactSearch = null;
                $scope.ppOptions = [20, 50, 100, 200, 500];
                $scope.startEmailClient = emailService.startEmailClient;
                $scope.getTagByName = tagService.getTagByName;
                $scope.getTagNameByName = tagService.getTagNameByName;
                $scope.removeTagFromContact = tagService.removeTagFromContact;
                $scope.tags = function() {
                    return tagService.availableTags;
                };
                $scope.emulationStatus = function() {
                    return emulationService.emulationStatus;
                };

                $scope.editContact = function(contactUuid) {
                    contactService.editContact(contactUuid);
                };

                $scope.paginate = {
                    perPage: 50,
                    currentPage: 1
                };

                $scope.search = {
                    group: null,
                    filter: null,
                    results: null
                };
                $scope.filter = {
                    types: [
                        {type: 'tags', name: 'Tags'},
                        {type: 'notes', name: 'Notes'},
                        // {type: 'policy_num', name: 'Policy Number'},
                        {type: 'address', name: 'Address'},
                        // {type: 'state', name: 'State'},
                        {type: 'zip', name: 'Zip Code'},
                        // {type: 'birthday', name: 'Birthday'},
                        // {type: 'expiry_date', name: 'Expiry Date'},
                    ]
                };
                $scope.resetCustom = function() {
                    $scope.custom = {
                        filter_type: null,
                        condition: null,
                        field1: null,
                        tags: []
                    };
                };
                $scope.resetCustom();

                $scope.clearNewFilter = function() {
                    $scope.resetCustom();
                };

                $scope.clearFilter = function(index) {
                    $scope.activeFilters.splice(index, 1);
                    $scope.customFilterResults.splice(index, 1);
                };

                $scope.applyFilterChange = function(index, data) {
                    data.domain_uuid = $rootScope.user.domain_uuid;
                    dataFactory.postSubmitCustomFilter(data)
                    .then(function(response){
                        console.log(response);
                        $scope.customFilterResults[index] = response.data.success.data;
                    });
                };

                $scope.isFavorite = function(contactUuid) {
                    return contactService.isFavorite(contactUuid);
                };

                $scope.addNewFilter = function() {
                    if (!$scope.activeFilters) $scope.activeFilters = [];
                    $scope.activeFilters.push($scope.custom);
                    $scope.custom.domain_uuid = $rootScope.user.domain_uuid;
                    dataFactory.postSubmitCustomFilter($scope.custom)
                    .then(function(response){
                        console.log(response);
                        $scope.customFilterResults.push(response.data.success.data);
                        $scope.resetCustom();
                    })
                };

                $scope.numberOfContacts = function() {
                    return contactService.numberOfContacts();
                };

                $scope.contactsLoading = function() {
                    return !contactService.contactsLoaded;
                };

                $scope.contactTags = function(contact) {
                    if (!contact.tags) return null;
                    return JSON.parse(contact.tags);
                };

                $scope.chooseTag = function(tag) {
                    $scope.createNewTag = false;
                    if ($scope.custom.tags.indexOf(tag.tag)<0) {
                        $scope.custom.tags.push(tag.tag);
                    }
                    $scope.selectedTag = null;
                };

                $scope.removeTag = function(index) {
                    $scope.custom.tags.splice(index, 1);
                };

                $scope.removeActiveTag = function(index, parentindex) {
                    $scope.activeFilters[parentindex].tags.splice(index, 1);
                };

                $scope.showAdvancedFilter = function() {
                    $scope.showAdvanced = !$scope.showAdvanced;
                    if (!$scope.showAdvanced) $scope.customFilterResults = [];
                };

                $scope.contacts = function() {
                    var contacts = contactService.contactUuids();
                    if ($scope.select.partnerOnly) {
                        contacts = _.intersection(contacts, contactService.partnerContactsOnly());
                    }
                    if ($scope.search.results || $scope.search.short) {
                        contacts = _.intersection(contacts, $scope.search.results);
                    }
                    if ($scope.search.group) {
                        contacts = _.intersection(contacts, $scope.search.group.members);
                    }
                    if ($scope.customFilterResults.length>0) {
                        angular.forEach($scope.customFilterResults, function(results){
                            contacts = _.intersection(contacts, results);
                        });
                    }
                    return contacts;
                };

                $scope.contacts2 = function() {
                    if ($scope.select.partnerOnly) {
                        return contactService.partnerContactsOnly();
                    } else if ($scope.search.results || $scope.search.short) {
                        return $scope.search.results;
                    } else if ($scope.search.group) {

                        return $scope.search.group.members;
                    } else {
                        return contactService.contactUuids();
                    }
                };

                $scope.clearContactSearch = function() {
                    $scope.search.short = false;
                    $scope.search.filter = null;
                    $scope.search.results = null;
                };

                $scope.doIndexSearch = function() {
                    $scope.search.searching = true;
                    $scope.search.short = false;
                    $scope.search.results = [];
                    if (!$scope.search.filter || ($scope.search.filter && $scope.search.filter.length < 3)) {
                        $scope.search.searching = false;
                        $scope.search.results = null;
                        if ($scope.search.filter && $scope.search.filter.length < 3) $scope.search.short = true;
                        return false;
                    }
                    var data = {
                        search: $scope.search.filter,
                        private: contactGroupsService.privateContacts()
                    };
                    dataFactory.postSearchContactIndex(data, true)
                    .then(function(response){
                        $scope.search.searching = false;
                        $scope.search.results = response.data.success.data;
                    });
                };

                $scope.currentContactSlice = function() {
                    var start = $scope.paginate.perPage * ($scope.paginate.currentPage-1);
                    var end = start + $scope.paginate.perPage;
                    var slice = $scope.contacts().slice(start, end);
                    var contacts = [];
                    angular.forEach(slice, function(uuid){
                        if (usefulTools.isUuid(uuid)) {
                            var contact = contactService.getContactByUuid(uuid);
                            if (contact && !contactService.isKotterTechUser(contact) && !contactService.isLoggedInUser(contact)) contacts.push(contact);
                        }
                    });
                    return contacts;
                };

                $scope.theContact = function(uuid) {
                    return contactService.getContactByUuid(uuid);
                };

                $scope.contactGroups = function() {
                    return contactGroupsService.groups;
                };

                $scope.selectedContacts = contactGroupsService.selectedContacts;
                $scope.select = {
                    selectAll: false,
                    selectedContacts: {},
                    partnerOnly: false,
                    amsonly: false
                };
                $scope.selectedGroups = {};

                $scope.toggleFavorite = function(contactUuid) {
                    contactService.toggleContactAsFavorite(contactUuid)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                        });
                };

                $scope.makeCall = function(number) {
                    callService.tryToMakeCall(number);
                };

                $scope.contactFilter = function(item) {
                    if (!item || item.type === 'user') return false;

                    if ($scope.listed && $scope.listed.length > 0) {
                        for (var each in $scope.listed) {
                            if (uuid == $scope.listed[each]) {
                                return false;
                            }
                        }
                    }

                    var found = false;
                    var search = $scope.search.filter;
                    if (!search ||
                        (item.name && item.name.toLowerCase()
                            .indexOf(search.toLowerCase()) != -1) ||
                        (item.org && item.org.toLowerCase()
                            .indexOf(search.toLowerCase()) != -1)) found = true;

                    if (search && item.nums && item.nums.length > 0) {
                        angular.forEach(item.nums, function(phone) {
                            if (phone.num && phone.num.indexOf(
                                    search) != -1) {
                                found = true;
                            }
                        });
                    }
                    if ($scope.select.qqonly && found && item.contact_type !==
                        'qqcontact') found = false;
                    if ($scope.select.amsonly && found && item.contact_type !==
                        'amscontact') found = false;
                    return found;
                };

                $scope.orderByFunction = function(item) {
                    if (!item) return null;
                    return (item.name && item.name.length > 3) ?
                        item.name : ((item.org && item.org
                            .length > 3) ? item.org : null);
                };

                $scope.deleteContact = function(contactUuid) {
                    var contact = contactService.getContactByUuid(contactUuid);
                    $scope.deletingContact = contactUuid;
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Confirm Delete')
                        .htmlContent('Are you sure you want to delete ' + contact.name +
                            '? This is permanent.')
                        .ariaLabel('Delete')
                        .ok('Delete')
                        .cancel('Cancel');
                    $mdDialog.show(deleteConfirm).then(function() {
                        $scope.listed.push(contactUuid);
                        contactService.deleteContact(contactUuid)
                            .then(function(response) {
                                if (response) {
                                    $rootScope.showalerts(response);
                                    $scope.listed = [];
                                    contactGroupsService.removeContactFromGroupsByUuid(
                                        contactUuid);
                                    $uibModalStack.dismissAll();
                                    $scope.deletingContact = null;
                                }
                            });
                    }, function() {
                        $scope.deletingContact = null;
                    });
                };

                $scope.selectAllContacts = function() {
                    angular.forEach($scope.contacts(), function(uuid){
                        var contact = contactService.getContactByUuid(uuid);
                        if (usefulTools.isUuid(uuid) && contact && contact.type !== 'user') $scope.select.selectedContacts[uuid] = $scope.select.selectAll;
                    });
                };

                function getSelectedContacts(obj) {
                    var array = [];
                    if (Object.keys(obj).length > 0 && obj.constructor === Object) {
                        angular.forEach(obj, function(value, key) {
                            if (value) array.push(key);
                        });
                    }
                    return array;
                };

                $scope.clearSelected = function() {
                    $scope.select.selectedContacts = {};
                    $scope.select.selectAll = false;
                };

                $scope.contactsSelectedCount = function() {
                    var contacts = getSelectedContacts($scope.select.selectedContacts);
                    // console.log("CONTACTS", contacts);
                    return contacts.length;
                };

                $scope.openGroupSelect = function() {
                    var data = {
                        selected: getSelectedContacts($scope.select.selectedContacts),
                        groups: contactGroupsService.groups,
                        addContactsToGroup: addContactsToGroup,
                        groupLimit: contactGroupsService.groupLimit,
                        exceedsTotalLimit: exceedsTotalLimit,
                        exceedsGroupLimit: exceedsGroupLimit,
                        selectedGroup: null
                    };
                    $myModal.openTemplate('addcontactstogroup.html', data, 'md', '', '');
                };

                $scope.openTagAssign = function() {
                    var data = {
                        selected: getSelectedContacts($scope.select.selectedContacts),
                        tags: tagService.tags,
                        addTagsToContacts: addTagsToContacts,
                    };
                    $myModal.openTemplate('addtagstocontacts.html', data, 'md', '', '');
                };
                
                function exceedsTotalLimit(selected) {
                    return selected.length > contactGroupsService.groupLimit;
                }

                function exceedsGroupLimit(selected, group) {
                    if (!group) return false;
                    return (selected.length + group.members.length) > contactGroupsService.groupLimit;
                }

                function addContactsToGroup(group, selected) {
                    var data = {
                        contacts: selected,
                        group: group.group_uuid
                    };
                    contactGroupsService.bulkAssignToGroup(data)
                        .then(function(response) {
                            $scope.clearSelected();
                            $rootScope.showalerts(response);
                            $rootScope.$broadcast('contact.group.updated');
                            $uibModalStack.dismissAll();
                        });
                }

                function addTagsToContacts(tags) {
                    var data = {
                        contacts: getSelectedContacts($scope.select.selectedContacts),
                        tags: tags,
                        selectedTags: []
                    };
                    tagService.bulkAddTags(data)
                    .then(function(response) {
                        $scope.clearSelected();
                        $rootScope.showalerts(response);
                        $uibModalStack.dismissAll();
                    });
                }

                $scope.removeContactsFromGroup = function() {
                    var count = $scope.contactsSelectedCount();
                    var removeConfirm = $mdDialog.confirm()
                        .title('Confirm Removal')
                        .htmlContent('Are you sure you want to remove the selected ' +
                            count + ' contacts from '+$scope.search.group.group_name+'?')
                        .ariaLabel('Remove')
                        .ok('Remove')
                        .cancel('Cancel');
                    $mdDialog.show(removeConfirm).then(function() {
                        var data = {
                            contacts: getSelectedContacts($scope.select.selectedContacts),
                            group: $scope.search.group.group_uuid
                        };
                        contactGroupsService.bulkRemoveFromGroup(data)
                            .then(function(response) {
                                $scope.clearSelected();
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    $scope.search.group = response.data.success.group;
                                }
                                $rootScope.$broadcast('contact.group.updated');
                                $uibModalStack.dismissAll();
                            });
                    });
                };

                $scope.deleteSelectedContacts = function() {
                    var count = $scope.contactsSelectedCount();
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Confirm Delete')
                        .htmlContent('Are you sure you want to delete the selected ' +
                            count + ' contact records?')
                        .ariaLabel('Delete')
                        .ok('Delete')
                        .cancel('Cancel');
                    $mdDialog.show(deleteConfirm).then(function() {
                        var data = {
                            contacts: getSelectedContacts($scope.select.selectedContacts)
                        };
                        $rootScope.showAlert(
                            "Contact deletion will continue in the background. \n  You may continue working."
                        );
                        $scope.listed = data.contacts;
                        dataFactory.postDeleteMultipleContacts(data)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    $scope.clearSelected();
                                    contactGroupsService.setGroups();
                                    $scope.listed = [];
                                }
                            }).catch(function(err) {
                                $scope.contacts();
                                $scope.listed = [];
                                $rootScope.showalerts(err);
                            });
                    });
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

                $scope.showSpreadsheetImport = function() {
                    var data = {
                        closeThisModal : $rootScope.closeThisModal,
                    };
                    $rootScope.showModalFull(
                        '/company/contact-spreadsheet-importer-modal.html', data, 'lg');
                };

                function getSelectedGroups(obj) {
                    var array = [];
                    if (Object.keys(obj).length > 0 && obj.constructor === Object) {
                        angular.forEach(obj, function(value, key) {
                            if (value) array.push(key);
                        });
                    }
                    return array;
                };
            }
        };
    })

    .directive('contactImportStatus', function($rootScope, usefulTools, dataFactory, $uibModalStack,
        contactService, contactGroupsService) {
        return {
            restrict: 'E',
            templateUrl: 'contact-import-status.html',
            scope: {

            },
            link: function($scope, element, attrs) {
                $scope.user = $rootScope.user;
                $scope.tips = $rootScope.tips;
                $scope.pathImgProfile = $rootScope.pathImgProfile;
                $scope.setProfileColor = $rootScope.setProfileColor;

                $scope.importingContacts = function() {
                    return usefulTools.convertObjectToArray(contactService.contactImports);
                };

                $scope.closeBox = function(uuid) {
                    console.log(uuid);
                    console.log(contactService.contactImports);
                    if (contactService.contactImports[uuid]) delete contactService.contactImports[uuid];
                }
            }
        };
    })
    .directive('contactTagsBulk', function($rootScope, $uibModalStack, tagService) {
        return {
            restrict: 'E',
            templateUrl: 'contact-tags-bulk.html',
            scope: {
                selected: '='
            },
            link: function($scope, element, attrs) {
                $scope.user = $rootScope.user;
                $scope.tips = $rootScope.tips;
                $scope.selectedTags = [];
                $scope.selectedTag = null;
                $scope.closeModal = $rootScope.closeModal;
                $scope.tags = function() {
                    return tagService.availableTags;
                };
                $scope.getTagByName = tagService.getTagByName;
                $scope.getTagNameByName = tagService.getTagNameByName;
                $scope.chooseTag = function(tag) {
                    if (tag === 'newtag') {
                        $scope.createNewTag = true;
                    } else {
                        $scope.createNewTag = false;
                        if ($scope.selectedTags.indexOf(tag.tag)<0) {
                            $scope.selectedTags.push(tag.tag);
                        }
                    }
                    $scope.selectedTag = null;
                };

                $scope.saveNewTag = function(tagname) {
                    $scope.showSpinner = true;
                    tagService.addNewTag(tagname)
                    .then(function(response){
                        console.log(response);
                        $scope.showSpinner = false;
                        if (response.data.success) {
                            var tag = response.data.success.data;
                            if (!$scope.selectedTags) $scope.selectedTags = [];
                            $scope.selectedTags.push(tag.tag);
                            $scope.newtag = null;
                        } else {
                            $rootScope.showErrorAlert(response.data.error.message);
                        }
                        $scope.createNewTag = false;
                    });
                };

                $scope.addTagsToContacts = function(tags) {
                    $scope.showSubmitSpinner = true;
                    tagService.assignTags(tags, $scope.selected, 'contact')
                    .then(function(response){
                        console.log(response);
                        $rootScope.showalerts(response);
                        $scope.showSubmitSpinner = true;
                        $uibModalStack.dismissAll();
                    });
                };

                $scope.removeTagFromContact = function(index) {
                    $scope.selectedTags.splice(index, 1);
                };
            }
        };
    });
