'use strict';

proySymphony.controller('ScreenpopCtrl', function($scope, $sce, __env, $interval, $rootScope, integrationService) {

        $scope.window = window;

        var int = $interval(function() {
            if ($scope.window.customerList) {
                if ($scope.window.customerList.length === 1) {
                    $scope.currentIndex = 0;
                }
                var partner = $scope.window.user.exportType.partner_code;
                angular.forEach($scope.window.customerList, function(contact, key){
                    console.log(key);
                    console.log(contact);
                    if (contact.contact_uuid) {
                        var contactUuid = contact.contact_uuid;
                        var fbUid = $scope.window.user.fbinfo.auth_id;
                        var rootPath = __env.environment + "/domains/" + fbUid;
                        firebase.database().ref().child(rootPath + '/domaincontacts/' + contactUuid + '/').on('value', function (snapshot) {
                            var value = snapshot.val();
                            console.log(value);
                            if (value) {
                                var contact = angular.copy(value);
                                contact.full = true;
                                $scope.window.customerList[key] = contact;
                                $scope.window.loadingPolicies = null;
                            }
                        });
                    } else {
                        if (integrationService.hasApi.indexOf(partner) > -1 && $scope.window.customerList[0].settings && $scope.window.customerList[0].settings.customer_id) {
                            // $scope.window.loadingPolicies = $scope.window.customerList[key].settings.customer_id;
                            $scope.window.loadingPolicies = true
                            console.log(customerList[key]);
                            integrationService.loadFullInfo(customerList[key])
                            .then(function(response){
                                console.log(response);
                                if (response) {
                                    if (response.policies) $scope.window.customerList[key].policies = response.policies;
                                    $scope.window.loadingPolicies = null;
                                }
                            });
                        }
                    }
                });
                $interval.cancel(int);
            }
        }, 200);
        
        $rootScope.showExport = false;
        $rootScope.isScreenpop = true;
        console.log($scope.window);

        $scope.contactShown = function() {
            return $scope.window.customerList ? $scope.window.customerList[$scope.currentIndex] : null;
        };

        $scope.getCustomerIdName = function() {
            if ($scope.window.user.exportType.partner_code == 'ams360') {
                return 'Customer ID: ';
            } else if ($scope.window.user.exportType.partner_code == 'qqcatalyst') {
                return 'Entity ID: ';
            }
            return '';
        };
        $scope.changeContact = function(index) {
            $scope.currentIndex = index;
            // var customer = $scope.window.customerList[$scope.currentIndex];
            // if (customer && customer.isBasic && customer.settings.customer_id && !customer.full) {
            //     if (customer.contact_uuid) {

            //     } else {
            //         console.log("DO getCustomerProfle");
            //         $scope.getCustomerProfle(customer, index);
            //     }
            // }
        };

        $scope.clearContact = function() {
            delete $scope.currentIndex;
        };

        $scope.populateFullFbContact = function(customer, index) {
            
        };

        $scope.getCustomerProfle = function(customer, index) {
            var customer_id = customer.settings.customer_id;
            $scope.window.loadingPolicies = customer_id;
            if (customer.contact_type === 'amscontact') {
                integrationService.getFullAmsCustomerInfo(customer_id)
                .then(function(response){
                    $scope.window.loadingPolicies = null;
                    response.full = true;
                    $scope.window.customerList[index] = response;
                });
            } else if (customer.contact_type === 'qqcontact') {
                integrationService.getFullQqCustomerInfo(customer_id)
                .then(function(response){
                    $scope.window.loadingPolicies = null;
                    if (response) {
                        $scope.window.customerList[index].full = true;
                        if (response.policies) $scope.window.customerList[index].policies = response.policies;
                    }
                });
            }
        };

        $scope.showField = function(entity, setting) {
            var useCustom = $scope.window.user.useCustomScreenpopFields;
            var fields = $scope.window.user.customScreenpopFields;
            if (entity) {
                if (!useCustom || useCustom === 'false') return true;
                if (useCustom === 'true' &&
                    fields && fields.indexOf(setting) > -1) return true;
            }
            return false
        };

        $scope.displayNumber = function(contact, setting) {
            var useCustom = $scope.window.user.useCustomScreenpopFields;
            var fields = $scope.window.user.customScreenpopFields;
            var theNumber;
            if (contact.phones) {
                angular.forEach(contact.phones, function(phone){
                    if (setting==='contact_mobile_phone' && phone.phone_label == 'Mobile') theNumber = phone.phone_number;
                    if (setting==='contact_home_phone' && phone.phone_label == 'Home') theNumber = phone.phone_number;
                    if (setting==='contact_work_phone' && phone.phone_label == 'Work') theNumber = phone.phone_number;
                    if (setting==='contact_fax_phone' && phone.phone_label == 'Fax') theNumber = phone.phone_number;
                });
            }
            if (contact[setting]) theNumber = contact[setting];
            if (theNumber && ((!useCustom || useCustom === 'false') || 
                (useCustom === 'true' && fields && fields.indexOf(setting) > -1))) return theNumber;
            return null;
        };

        $scope.showAddress = function(contact) {
            if (!contact.settings) return false;
            var useCustom = $scope.window.user.useCustomScreenpopFields;
            var fields = $scope.window.user.customScreenpopFields;
            if (contact.settings.contact_address || contact.settings.contact_city || contact.settings.contact_state) {
                if (!useCustom || useCustom === 'false') return true;
                if (useCustom === 'true' &&
                    (fields && fields.indexOf('contact_address') > -1) ||
                    (fields && fields.indexOf('contact_city') > -1) ||
                    (fields && fields.indexOf('contact_state') > -1) ||
                    (fields && fields.indexOf('contact_zip_code') > -1))
                     return true;
            }
            return false
        };

        $scope.showPolicies = function(contact) {
            var useCustom = $scope.window.user.useCustomScreenpopFields;
            var fields = $scope.window.user.customScreenpopFields;
            if (!useCustom || useCustom === 'false') return true;
            if (useCustom === 'true' &&
                (fields && fields.indexOf('policy_csr_info') > -1) ||
                (fields && fields.indexOf('policy_number') > -1) ||
                (fields && fields.indexOf('policy_type') > -1) ||
                (fields && fields.indexOf('policy_expiry_date') > -1) ||
                (fields && fields.indexOf('policy_effective_date') > -1))
                    return true;
            return false;
        };

        $scope.getAddress = function(contact) {
            var address = contact.settings.contact_address ? contact.settings.contact_address : null;
            var city = contact.settings.contact_city ? contact.settings.contact_city : null;
            var state = contact.settings.contact_state ? contact.settings.contact_state : null;
            var zip = contact.settings.contact_zip_code ? contact.settings.contact_zip_code : null;
            var html = '';
            if ($scope.showField(address, 'contact_address')) html += '<p>' + address + '</p>';
            if ($scope.showField(city, 'contact_city') || $scope.showField(state, 'contact_state') || $scope.showField(zip, 'contact_zip_code')) {
                var c = $scope.showField(city, 'contact_city') ? city : '';
                html += '<p>' + c + ((c.length>0 && $scope.showField(state, 'contact_state')) ? ', ' : '') +
                 ($scope.showField(state, 'contact_state') ? state : '' ) + 
                 ($scope.showField(zip, 'contact_zip_code') ? ' ' + zip : '' )
                 '</p>';
            }
            return $sce.trustAsHtml(html);
        };

        $scope.showAvatar = function(contact) {
            var useCustom = $scope.window.user.useCustomScreenpopFields;
            var fields = $scope.window.user.customScreenpopFields;
            if (!useCustom || useCustom === 'false') return false;
            if (useCustom === 'true' &&
                (fields && fields.indexOf('contact_profile_image') > -1)) {
                    return true;
                }
            return false;
        };

        $scope.next = function() {
            var next;
            var index = $scope.currentIndex;
            if (index == $scope.window.customerList.length - 1) {
                next = 0
            } else {
                next = index + 1;
            }
            $scope.changeContact(next);
        };

        $scope.prev = function(index) {
            var prev;
            var index = $scope.currentIndex;
            if (index == 0) {
                prev = $scope.window.customerList.length - 1;
            } else {
                prev = index - 1;
            }
            $scope.changeContact(prev);
        }
});
