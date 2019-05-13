'use strict';

proySymphony.directive('qqActivityExport', function($rootScope, dataFactory, greenboxService, $timeout, $uibModalStack, contactService, integrationService) {
    return {
        restrict: 'E',
        templateUrl: 'qq-activity-export.html',
        scope: {
            data: '<'
        },
        link: function($scope, element, attrs) {
            $scope.tips = $rootScope.tips;
            $scope.closeThisModal = $rootScope.closeThisModal;
            $scope.showContactPhoto = $rootScope.showContactPhoto;
            $scope.filter = {
                contactSearch: null
            };
            $scope.contacts = [];
            $scope.activityList = greenboxService.ams360ActivityList;
            $scope.apiPartner = function() {
                var apiPartnerList = ['qqcatalyst', 'ams360'];
                var partner = $rootScope.user.exportType.partner_code;
                return apiPartnerList.indexOf(partner) > -1;
            };

            function filterContact(contactUuid) {
                var contact = contactService.getContactByUuid(contactUuid);
                var term = $scope.filter.contactSearch;
                if (!contact) return false;
                if ((contact.settings && contact.settings.customer_id)
                    && (!term || 
                    (contact.name && contact.name.toLowerCase()
                    .indexOf(term.toLowerCase()) !== -1) ||
                    (contact.org && contact.org.toLowerCase()
                    .indexOf(term.toLowerCase()) !== -1)
                    )) return true;
                if (!contact || !contact.name || contact.name ===
                    '' || !contact.en || contact.en !== 'true') return false;
                return true;
            };

            $scope.noContacts = function() {
                return !$scope.data.customerList || $scope.data.customerList.length === 0;
            };

            $scope.searchAgain = function() {
                $scope.data.customer_id = null;
                $scope.selected = false;
                $scope.data.customerList = [];
                $scope.showContacts = true;
            };

            $scope.applyFilters = function(term) {
                console.log(term);
                
                if (term.length < 3) {
                    $scope.minLengthMessage = 'Search needs to be 3 chars or longer.';
                } else {
                    $scope.minLengthMessage = null;
                    $scope.filter.searching = true;
                    console.log(contactService.qqContactsOnly());
                    var uuids = contactService.qqContactsOnly().filter(filterContact);
                    console.log(uuids);
                    var contacts = _.map(uuids, function(uuid){
                        var contact = contactService.getContactByUuid(uuid);
                        console.log(contact);
                        return contact;
                    });
                    console.log(contacts);
                    $scope.contacts = contacts;
                    $scope.showContacts = true;
                    integrationService.getSearchQqContacts(term)
                    .then(function(response){
                        var combined = _.concat(contacts, response);
                        console.log(combined);
                        var returned = _.uniqBy(combined, 'settings.customer_id');
                        $scope.contacts = returned;
                        console.log(returned);
                        $scope.filter.searching = false;
                    });
                }
                // var data = {
                //     prefix: term,
                //     domain_uuid: $rootScope.user.domain_uuid
                // };
                // dataFactory.postSearchContactsByPrefix(data)
                // .then(function(response){
                //     console.log(response);
                // });
            };
            
            $scope.showList = function() {
                $scope.showContacts = true;
            };

            $scope.hideList = function() {
                $timeout(function() {
                    $scope.showContacts = false;
                }, 500);
            };

            $scope.resetContactSelection = function() {
                $scope.message = angular.copy($scope.data.message);
                $scope.selected = false;
            };

            $scope.selectContact = function(contact) {
                $scope.data.customerList.push(contact);
                $scope.data.customer_id = contact.settings.customer_id;
                console.log(contact);
                $scope.selected = true;
                $scope.hideList();
            };

            $scope.theContact = function(contactUuid) {
                return contactService.getContactByUuid(contactUuid);
            };

            $scope.exportToQQCatalyst = function(taskdata) {
                $rootScope.closeThisModal();
                var data = taskdata.data ? taskdata.data : taskdata;
                data['taskDescription'] = taskdata.taskDescription;
                data['entity_id'] = taskdata.customer_id;
                if (data.type === "videoconference" || data.type === "screenshare") {
                    data['domain_uuid'] = $rootScope.user.domain.domain_uuid;
                }
                console.log(data);
                dataFactory.qqCatalystPostTask(data)
                    .then(function(response) {
                        console.log(response);
                        if (response.data.success) {
                            $rootScope.showalerts(response);
                            if (data.type !== "callRecords") {
                                // $rootScope.showSuccessAlert(response.data.success.message);
                            }
                            $rootScope.closeThisModal();
                        } else if (response.data.error) {
                            $rootScope.closeThisModal();
                            if (response.data.error.message) $rootScope.showErrorAlert(response.data.error.message);
                        }
                    }, function(error) {
                        $rootScope.showErrorAlert(
                            "There was a problem while copying your information.");
                    });
            };


            $scope.exportDataToAms360 = function(exportData) {
                $scope.closeThisModal();
                var data = exportData.data ? exportData.data : exportData;
                data['customer_contact_id'] = exportData.customer_id;
                if (exportData.selectedActivity)
                    data['activity'] = exportData.selectedActivity;
                else if (exportData.activity)
                    exportData.selectedActivity = exportData.activity;
    
                if (!exportData.selectedActivity) {
                    if (data.type !== "callRecords") return $rootScope.showErrorAlert(
                        'Please select activity action.')
                } else {
                    data['activity'] = exportData.selectedActivity;
                    data['activityDescription'] = exportData.activityDescription ? exportData.activityDescription :
                        null;
    
                    if ($rootScope.user.shortName) {
                        data['shortName'] = $rootScope.user.shortName;
                    } else {
                        if (data.type !== "callRecords") return $rootScope.showErrorAlert(
                            "Please check if you have set the Short name in Ams360 settings."
                        );
                    }
    
                    if (data.type === "videoconference" || data.type === "screenshare") {
                        delete data['close'];
                        data['domain_uuid'] = $rootScope.user.domain.domain_uuid;
                    } else if (data.type === "fax") {
                        data['domain_uuid'] = data.fax.domain_uuid;
                    }
    
                    dataFactory.ams360ActivityRecords(data)
                        .then(function(response) {
                            console.log(response);
                            if (response.data.success) {
                                if (data.type !== "callRecords") {
                                    if (response.data.data.includes('ActivityId'))
                                        $rootScope.showSuccessAlert(response.data.message);
                                    else
                                        $rootScope.showErrorAlert(
                                            "There was a problem. The Information was not copied."
                                        );
                                }
                                
                            }
                            $rootScope.closeThisModal();
                        }, function(error) {
                            $rootScope.showErrorAlert(
                                "There was a problem while copying your information.");
                        });
                }
            };

        }
    };
});