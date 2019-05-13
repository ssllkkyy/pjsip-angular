'use strict';

proySymphony.directive('partnerCopyText', function($rootScope, clipboard, $timeout, $uibModalStack, contactService, integrationService) {
    return {
        restrict: 'E',
        templateUrl: 'partner-copy-text.html',
        scope: {
            data: '<'
        },
        link: function($scope, element, attrs) {
            $scope.tips = $rootScope.tips;
            $scope.closeModal = $rootScope.closeModal;
            $scope.showContactPhoto = $rootScope.showContactPhoto;
            $scope.showContacts = false;

            $scope.message = angular.copy($scope.data.message);
            $scope.copyInfo = function() {
                clipboard.copyText($scope.message);
                $uibModalStack.dismissAll();
                $rootScope.showInfoAlert('Info copied to your clipboard');
            };

            $scope.filter = {
                contactSearch: null
            };

            $scope.contacts = function() {
                return contactService.contactsArray();
            };

            $scope.theContact = function(contactUuid) {
                return contactService.getContactByUuid(contactUuid);
            };

            $scope.isKotterTechUser = function(contact) {
                return contactService.isKotterTechUser(contact);
            };

            $scope.filterContacts = function(contactUuid) {
                var item = contactService.getContactByUuid(contactUuid);
                if (!item) return false;
                if ($scope.isKotterTechUser(item)) return false;

                if (!$scope.filter.contactSearch ||
                    (item.name && item.name.toLowerCase()
                        .indexOf($scope.filter.contactSearch.toLowerCase()) !== -1) ||
                    (item.ext && String(item.ext).indexOf($scope.filter.contactSearch) !==
                        -1)) {
                    return true;
                }
                if (item.nums && item.nums.length > 0) {
                    var found = false;
                    angular.forEach(item.nums, function(phone) {
                        if (phone.num && phone.num.indexOf(
                                $scope.filter.contactSearch) !== -1) {
                            found = true;
                        }
                    });
                    return found;
                }
                return false;
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
                var contactInfo = 'Contact: ' + contact.name + "\n";
                $scope.message = contactInfo + $scope.message;
                $scope.selected = true;
                $scope.hideList();
            };
        }
    };
});