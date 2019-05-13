'use strict';

proySymphony
    .directive('blueAdminAgenciesTab', function($rootScope, $myModal, $timeout, clipboard,
        usefulTools, contactService, packageService, customerGroupCodeService, domainService,
        $mdDialog, billingService, dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/blueadmin.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.paginate = {
                    perPage: 25,
                    currentPage: 1
                };
                $scope.tips = $rootScope.tips;
                $scope.isKotterTechUser = function(user) {
                    return contactService.isKotterTechUser(user);
                };

                $scope.agency = null;
                $scope.predicate = 'ext.extension';
                $scope.reverse = false;
                $scope.filtered = {};
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.tips = $rootScope.tips;
                $scope.filters = {
                    agency: null,
                    user: null
                };

                $scope.filter = {
                    querySearch: querySearch,
                    searchTextChange: searchTextChange,
                    selectedItemChange: selectedItemChange
                };

                function init() {
                    loadDomains();
                    customerGroupCodeService.setCustomerGroupCodes();
                }
                init();

                function loadDomains() {
                    $scope.loadingAgencies = true;
                    domainService.getRawDomains('blue')
                        .then(function(response) {
                            $scope.loadingAgencies = false;
                        });
                };

                $scope.availAgencies = function() {
                    if ($scope.filter.hideActive) {
                        return _.filter(domainService.rawDomains, function(agency) {
                            return (agency.billing_settings && agency.billing_settings
                                .billing_active !== 'true');
                        });
                    } else {
                        return domainService.rawDomains;
                        // return $scope.availAgencies();
                    }
                };

                $scope.updateAgency = function(agency) {
                    var confirmUpdate = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Are you sure you want to update this agency\'s name and billing settings? '
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmUpdate).then(function() {
                        $scope.savingSettings = true;
                        var data = {
                            domain_uuid: $scope.agencyLoaded().domain_uuid,
                            domain_description: $scope.agencyLoaded().domain_description,
                            package_name: $scope.agencyLoaded().billingSettings.package_name,
                            group_code: $scope.agencyLoaded().billingSettings.group_code,
                            renewal_day: $scope.agencyLoaded().billingSettings.renewal_day
                        };
                        if ($scope.isKeithUser) data.blue_sept_invoice = $scope.agencyLoaded().billingSettings.blue_sept_invoice;
                        billingService.updateAgencyBluewave(data)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                $scope.savingSettings = false;
                            });
                    });
                };

                $rootScope.$on('new.user.created', function($event, user) {
                    if ($scope.agencyLoaded() && $scope.agencyLoaded().domain_uuid === user.domain_uuid) {
                        $scope.agencyLoaded().registeredUsers.push(user);
                    }
                });

                $rootScope.$on('billing-user-deleted', function($event, user) {
                    if ($scope.agencyLoaded() && $scope.agencyLoaded().domain_uuid === user.domain_uuid) {
                        var index = $filter('getByUUID')($scope.agencyLoaded().registeredUsers, user.user_uuid, 'user');
                        if (index !== null) $scope.agencyLoaded().registeredUsers.splice(index, 1);
                    }
                });

                $scope.customerGroupCodes = function() {
                    return customerGroupCodeService.codes;
                };

                $scope.availPackages = function() {
                    return packageService.availPackages;
                };

                function searchTextChange(text) {
                    // console.log('Text changed to ' + text);
                }

                $scope.agencyLoaded = function() {
                    return billingService.activeAgency;
                };

                billingService.activeAgency = null;

                function selectedItemChange(item) {
                    // $scope.agencyLoaded = null;
                    billingService.activeAgency = null;
                    if (item) {
                        $scope.loadingAgency = true;
                        billingService.getBillingInfo(item.domain_uuid)
                            .then(function(response) {
                                if (response) {
                                    $scope.loadingAgency = false;
                                } else {
                                    $rootScope.showErrorAlert(
                                        'Unable to load selected agency.');
                                }
                            });
                    }
                }

                $scope.activeFilter = function(item) {
                    console.log($scope.filter.hideActive);
                    if (!$scope.filter.hideActive) return true;
                    return item.billing_settings.billing_active !== true;
                };

                $scope.searchFilter = function(agency) {
                    if (!$scope.filter.searchText ||
                        agency.domain_description.toLowerCase().indexOf($scope.filter.searchText
                            .toLowerCase()) > -1) return true;
                    return false;
                };

                function querySearch(search) {
                    var results = search ? $scope.availAgencies().filter(createFilterFor(
                        search)) : $scope.availAgencies();
                    return results;
                }

                function createFilterFor(query) {
                    var lowercaseQuery = query.toLowerCase();

                    return function filterFn(agency) {
                        return (agency.domain_description.toLowerCase().indexOf(
                            lowercaseQuery) > -1);
                    };

                }

                $scope.emptyFilter = function(item) {
                    return item.domain_description;
                };

                $scope.copy = function(text) {
                    clipboard.copyText(text);
                    $rootScope.showInfoAlert('Text copied to clipboard.');
                };

                $scope.copyBillingLink = function() {
                    clipboard.copyText($rootScope.symphonyUrl + '/bluewave/' + $scope.agencyLoaded()
                        .billingSettings.blue_cust_key);
                    $rootScope.showInfoAlert(
                        'The link has been copied to your clipboard.');
                };

                $scope.monthyInvoice = function() {
                    var total = 0.0;
                    if ($scope.agencyLoaded() && $scope.agencyLoaded().registeredUsers) {
                        var pack = $scope.agencyLoaded().package;
                        var code = $scope.agencyLoaded().groupcode;
                        // console.log(pack);
                        // console.log(code);
                        var recovery = parseFloat($scope.agencyLoaded().billingProps.recovery_fee);
                        if (pack && code) {
                            var numUsers = $scope.agencyLoaded().registeredUsers.length;
                            var per_seat = parseFloat(pack.package_price);
                            if (code.discount > 0) {
                                per_seat = per_seat * (100 - parseFloat(code.discount)) /
                                    100.0;
                            } else if (code.dollar_discount) {
                                per_seat = per_seat - code.dollar_discount
                            }

                            total = per_seat * numUsers + numUsers * recovery;
                        }
                    }
                    return total;
                };

                $scope.monthyCrf = function() {
                    var total = 0.0;
                    if ($scope.agencyLoaded() && $scope.agencyLoaded().billingProps &&
                        $scope.agencyLoaded().registeredUsers) {
                        var recovery = parseFloat($scope.agencyLoaded().billingProps.recovery_fee);
                        if (recovery) {
                            var numUsers = $scope.agencyLoaded().registeredUsers.length -
                                1;
                            total = numUsers * recovery;
                        }
                    }
                    return total;
                };

                $scope.packagePrice = function() {
                    if ($scope.agencyLoaded()) {
                        var pack = $scope.agencyLoaded().package;
                        var code = $scope.agencyLoaded().groupcode;
                        if (pack && code) {
                            var per_seat = parseFloat(pack.package_price);
                            if (code.discount > 0) {
                                per_seat = per_seat * (100 - parseFloat(code.discount)) /
                                    100.0;
                            } else if (code.dollar_discount) {
                                per_seat = per_seat - code.dollar_discount
                            }
                            return per_seat;
                        }
                    }
                    return null;
                };

                $scope.groupDiscount = function() {
                    if ($scope.agencyLoaded() && $scope.agencyLoaded().billingSettings) {
                        var code = customerGroupCodeService.getCodeByName($scope.agencyLoaded()
                            .billingSettings.group_code);
                        if (code) return code.discount;
                    }
                    return null;
                };

                $scope.toggleBillingStatus = function(status) {
                    var data = {
                        domain_uuid: $scope.agencyLoaded().domain_uuid,
                        billing_active: $scope.agencyLoaded().billingSettings.billing_active
                    };
                    billingService.updateAgencyBillingSettings(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                        });
                };

                $scope.updateAgencyBillingSettings = function() {
                    var confirmUpdate = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Are you sure you want to update this agency\'s billing settings? Any changes to the group code or package could result in changes to the monthly cost for this agency.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmUpdate).then(function() {
                        billingService.updateAgencyBillingSettings()
                            // dataFactory.postUpdateAgencyBillingSettings($scope.agencyLoaded.billingSettings)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                // if (response.data.error) {
                                //     $scope.agencyLoaded = response.data.error.data;
                                // }
                            });
                    });
                };

                $scope.updateContacts = function() {
                    var data = {
                        contacts: $scope.agencyLoaded().billingSettings.billing_contacts,
                        domain_uuid: $scope.agencyLoaded().domain_uuid
                    };
                    billingService.updateBillingContacts(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {

                            }
                        });
                };

                $scope.availNotices = function() {
                    return bridgeNoticeService.notices;
                };

                $scope.showEditInvoice = function(invoice) {
                    if (!invoice) {
                        invoice = {
                            domain_uuid: $scope.agencyLoaded().domain_uuid,
                            items: []
                        };
                    }
                    var copy = {};
                    angular.copy(invoice, copy);
                    var data = {
                        invoice: copy,
                        domains: $scope.availAgencies()
                    };
                    $scope.editNotice = true;

                    $myModal.openTemplate('edit-bridge-invoice-modal.html', data, 'lg',
                        '', 'static');
                };

                $scope.invoiceRefundable = function(invoice) {
                    return (invoice.payments.length > 0 && invoice.status !==
                        'cancelled' &&
                        (sumOfNetPayments(invoice) > 0));
                };

                function sumOfNetPayments(invoice) {
                    var total = 0.0;
                    _.forEach(invoice.payments, function(payment) {
                        total += parseFloat(payment.net_amount);
                    });
                    return total;
                }

                $rootScope.$on('new.invoice.created', function($event, invoice) {
                    if (($scope.agency && invoice.domain_uuid === $scope.agency) ||
                        !$scope.agency) {
                        $scope.agencyLoaded().invoices.push(invoice);
                    }
                });

                $scope.showAgency = function(domainUuid) {
                    var index = $filter('getByUUID')($scope.availAgencies(), domainUuid, 'domain');
                    if (index !== null) return $scope.availAgencies()[index].domain_description;
                    return null;
                };

                $scope.viewInvoice = function(invoice) {
                    $scope.activeInvoice = invoice;
                    $scope.showInvoice = true;
                };

                $scope.submitPayment = function(invoice) {
                    $scope.activeInvoice = invoice;
                    $scope.showPayment = true;
                };

                $scope.cancelPayment = function() {
                    $scope.activeInvoice = null;
                    $scope.showPayment = false;
                };

                $rootScope.$on('payment.completed', function() {
                    $scope.cancelPayment();
                });

                $rootScope.$on('close.view.invoice', function() {
                    $scope.activeInvoice = null;
                    $scope.showInvoice = false;
                });

                $rootScope.$on('close.view.payment', function() {
                    $scope.activePayment = null;
                });

                $rootScope.$on('close.view.refund', function() {
                    $scope.activeRefund = null;
                    $scope.display = null;
                });

                $scope.agencyFilter = function(item) {
                    if (!$scope.filters.agency) return true;
                    if ($scope.filters.agency && $scope.filters.agency.domain_uuid ===
                        item.domain_uuid) return true;
                    return false;
                };

                $scope.deleteInvoice = function(invoice) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Are you sure you want to delete this invoice? Any payments or credits applied to this invoice will be added as a credit to be used on the next billing cycle.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        var data = {
                            applyCredit: true,
                            invoiceUuid: invoice.invoice_uuid
                        };
                        dataFactory.postDeleteInvoice(data)
                            .then(function(response) {
                                console.log(response.data);
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope
                                        .availInvoices, invoice.invoice_uuid,
                                        'invoice');
                                    if (index !== null) $scope.availInvoices
                                        .splice(index, 1);
                                }
                            });

                    });
                };

                $scope.showNewCredit = function() {
                    $scope.addCredit = true;
                    $scope.newCredit = {
                        domainUuid: $scope.agencyLoaded().domain_uuid
                    };
                };

                $scope.createNewAccountCredit = function(credit) {
                    dataFactory.postCreateAccountCredit(credit)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.addCredit = false;
                                $scope.newCredit = {};
                                $scope.agencyLoaded().credits.push(response.data.success
                                    .data);
                                $scope.agencyLoaded().billingSettings.credit_balance =
                                    response.data.success.data.credit_balance;
                            };
                        });
                };

                $scope.removeAccountCredit = function(credit) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Are you sure you want to remove this account credit history record? '
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        dataFactory.getDeleteAccountCredit(credit.account_credit_uuid)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    var index = _.findIndex($scope.agencyLoaded()
                                        .credits,
                                        function(item) {
                                            return item.account_credit_uuid ===
                                                credit.account_credit_uuid;
                                        });
                                    if (index) $scope.agencyLoaded().credits
                                        .splice(index, 1);
                                    $scope.agencyLoaded().billingSettings.credit_balance =
                                        response.data.success.data;
                                };
                            });
                    });
                };

                $scope.toggleVoicemail = function() {
                    billingService.toggleVoicemail()
                    .then(function(response){
                        $rootScope.showalerts(response);
                    });
                };

                $scope.showAddedBy = function(credit) {
                    var contact = contactService.getContactByUserUuid(credit.added_by);
                    if (contact) return contact.name;
                    return null;
                };

                $scope.goToCredits = function() {
                    usefulTools.goToId('credits');
                };

                $scope.isKeithUser = function() {
                    var users = ['aatestatkeithgallantcom', 'stagingatkeithgallantcom',
                        'keithatkeithgallantcom'
                    ];
                    return users.indexOf($rootScope.user.username) !== -1;
                };

                $scope.sort_by = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.showChevron = function(predicate) {
                    return usefulTools.showChevron(predicate, $scope.predicate, $scope.reverse);
                };
            }
        };
    });
