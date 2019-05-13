'use strict';

proySymphony
    .directive('billingAdminAgenciesTab', function($rootScope, $myModal, usefulTools,
        contactService, packageService, customerGroupCodeService, domainService, $mdDialog,
        billingService, dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/billingadmin.html',
            scope: {},
            link: function($scope, element, attrs) {

                $scope.paginate = {
                    perPage: 10,
                    currentPage: 1
                };
                $scope.tips = $rootScope.tips;

                $scope.agency = null;
                $scope.perPage = 20;
                $scope.maxSize = 50;
                $scope.ppOptions = [10, 20, 50, 100];
                $scope.predicate = 'created_at';
                $scope.reverse = true;
                $scope.currentPage = 1;
                $scope.filtered = {};
                $scope.availInvoices = [];
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.isBillingAdminOrGreater = $rootScope.isBillingAdminOrGreater;
                $scope.tips = $rootScope.tips;
                $scope.filters = {
                    agency: null,
                    searchInvoices: null
                };

                $scope.datePopup = {
                    opened: false
                };

                $scope.renewDatePopup = {
                    opened: false
                };

                $scope.lastRenewDatePopup = {
                    opened: false
                };
                $scope.dateFormat = 'yyyy-MM-dd';
                $scope.dateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: new Date(2019, 1, 1),
                    maxDate: new Date(2030, 1, 1)
                };

                $scope.OpenDatePicker = function() {
                    $scope.datePopup.opened = !$scope.datePopup.opened;
                };

                $scope.OpenRenewDatePicker = function() {
                    $scope.renewDatePopup.opened = !$scope.renewDatePopup.opened;
                };

                $scope.OpenLastRenewDatePicker = function() {
                    $scope.lastRenewDatePopup.opened = !$scope.lastRenewDatePopup.opened;
                };

                $scope.filter = {
                    querySearch: querySearch,
                    searchTextChange: searchTextChange,
                    selectedItemChange: selectedItemChange
                };

                $scope.$watch('agencyLoaded().billingSettings.activated_at', function(newVal, oldVal) {
                    if (newVal !== oldVal) $scope.activated_at = new Date(moment(newVal));
                });

                $scope.$watch('agencyLoaded().billingSettings.next_renewal', function(newVal, oldVal) {
                    if (newVal !== oldVal) $scope.renew_date = new Date(moment(newVal));
                });

                $scope.$watch('agencyLoaded().billingSettings.last_renewal', function(newVal, oldVal) {
                    if (newVal !== oldVal) $scope.last_renew_date = new Date(moment(newVal));
                });

                $scope.updateActivation = function(activated) {
                    $scope.agencyLoaded().billingSettings.activated_at = activated;
                };

                $scope.updateRenewDate = function(renew) {
                    $scope.agencyLoaded().billingSettings.next_renewal = renew;
                };

                $scope.updateLastRenewDate = function(renew) {
                    $scope.agencyLoaded().billingSettings.last_renewal = renew;
                };

                $scope.customerGroupCodes = function() {
                    return customerGroupCodeService.codes;
                };

                if (__env.enableDebug) console.log($scope.customerGroupCodes);

                $scope.availPackages = function() {
                    return packageService.availPackages;
                };

                function searchTextChange(text) {
                    // console.log('Text changed to ' + text);
                }

                $scope.agencyLoaded = function() {
                    return billingService.activeAgency;
                };

                $scope.hasAgencyLoaded = function() {

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

                $scope.showPackageStatus = function(item) {
                    if (item.enabled === 'true') return 'Enabled';
                    if (item.enabled === 'grandfathered') return 'Grandfathered';
                    return null;
                };

                $rootScope.$on('load.domain.billing', function(event, domainUuid) {
                    var item = {
                        domain_uuid: domainUuid
                    };
                    selectedItemChange(item);
                });

                $scope.showDomainName = function(item) {
                    return item.domain_description + (item.domain_enabled === 'false' ?
                        ' (Disabled)' : '');
                };

                function querySearch() {
                    if ($scope.filter.searchText) {
                        return $scope.availAgencies.filter(function(agency) {
                            return agency.domain_description.toLowerCase().indexOf(
                                $scope.filter.searchText.toLowerCase()) > -1;
                        });
                    } else {
                        return $scope.availAgencies;
                    }
                }

                $scope.emptyFilter = function(item) {
                    return item.domain_description;
                };


                function init() {
                    loadDomains();
                    customerGroupCodeService.setCustomerGroupCodes();
                }
                init();

                // $scope.availAgencies = function() {
                //     return domainService.rawDomains;
                // };

                function loadDomains() {
                    $scope.loadingAgencies = true;
                    domainService.getRawDomains('billing')
                        .then(function(response) {
                            console.log(response.data);
                            $scope.availAgencies = [];
                            if (response.data.success) {
                                $scope.availAgencies = response.data.success.data;
                            }
                            $scope.loadingAgencies = false;
                        });
                };

                $scope.toggleDomainStatus = function(status) {
                    var message = '';
                    if (status === 'false') {
                        message =
                            'Are you sure you want to <strong>disable</strong> this agency? Doing this will force users to logout and prevent users from logging into Bridge.';
                    } else if (status === 'true') {
                        message =
                            'Are you sure you want to <strong>enable</strong> this agency? ';
                    }
                    var confirmChange = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent(message)
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmChange)
                        .then(function() {
                            var data = {
                                domain_uuid: $scope.agencyLoaded().domain_uuid,
                                domain_status: status === 'true' ? 'enabled' : 'disabled'
                            };
                            dataFactory.postToggleAgencyStatus(data)
                                .then(function(response) {
                                    $rootScope.showalerts(response);
                                    if (response.data.success) {
                                        // var message = 'Domain has been successfuly re-enabled';
                                        // $rootScope.showSuccessAlert(message);
                                    } else if (response.data.error) {
                                        $scope.agencyLoaded().domain_enabled =
                                            status === 'true' ? 'false' :
                                            'true';
                                    }
                                });
                        }, function() {
                            $scope.agencyLoaded().domain_enabled = status ===
                                'true' ? 'false' : 'true';
                        });
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

                $scope.showRefundInvoice = function(invoice) {
                    $myModal.openTemplate('refundmodal.html', invoice, 'md');
                };

                $scope.sumOfRefunds = function(payment) {
                    var total = 0.0;
                    _.forEach(payment.refunds, function(refund) {
                        total += parseFloat(refund.amount);
                    });
                    return total;
                };

                $scope.showRefundDetails = function(invoice) {
                    $rootScope.showModalFull('/billing/view-refunds-modal.html',
                        invoice.refunds, 'md');
                    // $myModal.openTemplate('/views/billing/view-refunds-modal.html', invoice.refunds, 'md');
                };


                $scope.confirmCancelInvoice = function(invoice) {
                    console.log(invoice);
                    $myModal.openTemplate('cancelinvoicemodal.html', invoice, 'md');
                };

                function cancelInvoice(invoice, action) {
                    billingService.cancelInvoice(invoice, action)
                        .then(function(response) {
                            $rootScope.showalerts(response);

                        });
                }

                $scope.showNewAddon = function() {
                    $myModal.openTemplate('agencyaddonmodal.html', $scope.agencyLoaded(),
                        'lg');
                };

                $rootScope.$on('agency.addon.added', function(event, addon) {
                    $scope.agencyLoaded().addons.push(addon);
                });

                $scope.cancelAddon = function(addon) {
                    var confirmAdd = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent('Please confirm you want to remove <strong>' +
                            addon.addon.title + '</strong> from <strong>' + $scope.agencyLoaded()
                            .domain_description + '</strong>.')
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmAdd).then(function() {
                        packageService.removeAddonFromAgency(addon.package_addon_domain_uuid,
                                $scope.agencyLoaded().domain_uuid)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope
                                        .agencyLoaded().addons, addon.package_addon_domain_uuid,
                                        'package_addon_domain');
                                    if (index !== null) $scope.agencyLoaded()
                                        .addons.splice(index, 1);
                                    $uibModalStack.dismissAll();
                                }
                            });
                    });
                };

                $scope.showModalWithData = $rootScope.showModalWithData;

                $scope.availNotices = function() {
                    return bridgeNoticeService.notices;
                };

                $scope.showEditInvoice = function(invoice) {
                    if (!invoice) {
                        invoice = {
                            domain_uuid: $scope.agencyLoaded().domain_uuid,
                            status: 'draft',
                            invoice_type: 'custom',
                            items: []
                        };
                    }
                    var copy = {};
                    angular.copy(invoice, copy);
                    var data = {
                        invoice: copy,
                        domain: $scope.agencyLoaded()
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

                function sumOfNetPayments(invoice) {
                    var total = 0.0;
                    _.forEach(invoice.payments, function(payment) {
                        total += parseFloat(payment.net_amount);
                    });
                    return total;
                }

                $rootScope.$on('new.invoice.created', function($event, invoice) {
                    console.log(invoice);
                    if ((billingService.activeAgency && invoice.domain_uuid ===
                            billingService.activeAgency.domain_uuid) || !$scope.agency) {
                        var index = $filter('getByUUID')(billingService.activeAgency.invoices, invoice.invoice_uuid, 'invoice');
                        if (index === null) billingService.activeAgency.invoices.push(invoice);
                        if (billingService.activeAgency.billingSettings)
                            billingService.activeAgency.billingSettings.account_balance =
                            invoice.account_balance;
                    }
                    console.log(billingService.activeAgency);
                });

                $rootScope.$on('invoice.updated', function($event, invoice) {
                    console.log(invoice);
                    if ((billingService.activeAgency && invoice.domain_uuid ===
                            billingService.activeAgency.domain_uuid) || !$scope.agency) {
                        var index = $filter('getByUUID')(billingService.activeAgency
                            .invoices, invoice.invoice_uuid, 'invoice');
                        if (index !== null) billingService.activeAgency.invoices[
                            index] = invoice;
                        if (billingService.activeAgency.billingSettings)
                            billingService.activeAgency.billingSettings.account_balance =
                            invoice.account_balance;
                    }
                    console.log(billingService.activeAgency);
                });

                $scope.showAgency = function(domainUuid) {
                    var index = $filter('getByUUID')($scope.availAgencies, domainUuid,
                        'domain');
                    if (index !== null) return $scope.availAgencies[index].domain_description;
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

                $scope.addOpenPayment = function() {
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

                $scope.keywordFilter = function(item) {
                    if (!$scope.filters.searchInvoices ||
                        ($scope.filters.searchInvoices &&
                            (item.invoice_num && String(item.invoice_num).toLowerCase()
                                .indexOf($scope.filters.searchInvoices.toLowerCase()) !==
                                -1) ||
                            ($scope.showAgency(item.domain_uuid) && $scope.showAgency(
                                item.domain_uuid).toLowerCase().indexOf($scope.filters
                                .searchInvoices.toLowerCase()) !== -1) ||
                            (String(item.total).toLowerCase().indexOf($scope.filters.searchInvoices
                                .toLowerCase()) !== -1) ||
                            (String(item.balance).toLowerCase().indexOf($scope.filters.searchInvoices
                                .toLowerCase()) !== -1)
                        )) return true;
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
                $scope.canceNewAccountCredit = function() {
                    $scope.addCredit = false;
                    $scope.newCredit = {};
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
                    if (credit.credit_amount < $scope.agencyLoaded().billingSettings.credit_balance) {
                        $rootScope.showErrorAlert('Unable to delete this credit of ' +
                            $filter('currency')(credit.credit_amount) +
                            ' because the available credit balance is less than this amount.'
                        );
                        return;
                    }
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

                $scope.showAddedBy = function(credit) {
                    var contact = contactService.getContactByUserUuid(credit.added_by);
                    if (contact) return contact.name;
                    return null;
                };

                $scope.goToCredits = function() {
                    usefulTools.goToId('credits');
                };

                $scope.isKeithUser = function() {
                    var users = ['aatestatkeithgallantcom', 'keithatkotternet', 'stagingatkeithgallantcom',
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
    })
    .directive('addAgencyAddon', function($mdDialog, $rootScope, packageService, dataFactory,
        $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'add-agency-addon.html',
            scope: {
                agency: '=?',
            },
            link: function($scope, element, attrs) {
                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.availAddons = function() {
                    return packageService.availAddons;
                };

                $scope.checkCount = function(number) {
                    if (number < 1) $rootScope.showInfoAlert(
                        'Quantity can not be less than 1.');
                };

                $scope.packageHasAccessToAddon = function(feature) {
                    var check;
                    if (feature === 'cloud_storage') check = 'cloudstorage';
                    if (check) return packageService.packageHasAccessToAddon(check,
                        $scope.agency.billingSettings.package_name);
                    return true;
                };

                $scope.chooseAddon = function(addon) {
                    var cost = addon.cost;
                    if (addon.custom) cost = addon.custom;
                    var confirmAdd = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent('Please confirm you want to add ' + addon.title +
                            ' to ' + $scope.agency.domain_description +
                            '. This will add an additional ' + addon.count + ' x ' +
                            $filter('currency')(cost) + ' to their monthly bill.')
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    var data = {
                        domainUuid: $scope.agency.domain_uuid,
                        addonUuid: addon.package_addon_uuid,
                        cost: cost,
                        quantity: addon.count,
                        note: addon.note
                    };
                    $mdDialog.show(confirmAdd).then(function() {
                        packageService.addAddonToAgency(data)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    $uibModalStack.dismissAll();
                                    $rootScope.$broadcast(
                                        'agency.addon.added', response.data
                                        .success.data);
                                }
                            });
                    });
                };

            }
        };
    })
    .directive('billingAdminInvoicesTab', function($rootScope, $myModal, usefulTools, $mdDialog,
        domainService, billingService, dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/admininvoices.html',
            scope: {},
            link: function($scope, element, attrs) {

                $scope.paginate = {
                    perPage: 10,
                    currentPage: 1
                };

                $scope.agency = null;
                $scope.perPage = 20;
                $scope.maxSize = 50;
                $scope.ppOptions = [10, 20, 50, 100];
                $scope.predicate = 'created_at';
                $scope.reverse = true;
                $scope.currentPage = 1;
                $scope.filtered = {};
                $scope.availInvoices = [];
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.tips = $rootScope.tips;
                $scope.filters = {
                    agency: null,
                    searchInvoices: null
                };

                $scope.isKeithUser = function() {
                    var users = ['aatestatkeithgallantcom', 'stagingatkeithgallantcom',
                        'keithatkeithgallantcom'
                    ];
                    return users.indexOf($rootScope.user.username) !== -1;
                };

                $scope.showAgency = function(domainUuid) {
                    var index = $filter('getByUUID')($scope.availAgencies(), domainUuid,
                        'domain');
                    if (index !== null) return $scope.availAgencies()[index].domain_description;
                    return null;
                };

                function init() {
                    initializeDates();
                    loadDomains();
                    loadInvoices();
                }
                init();

                $scope.showRefundDetails = function(invoice) {
                    $rootScope.showModalFull('/billing/view-refunds-modal.html',
                        invoice.refunds, 'md');
                    // $myModal.openTemplate('/views/billing/view-refunds-modal.html', invoice.refunds, 'md');
                };

                $scope.availAgencies = function() {
                    return domainService.rawDomains;
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

                $scope.sumOfRefunds = function(payment) {
                    var total = 0.0;
                    _.forEach(payment.refunds, function(refund) {
                        total += parseFloat(refund.amount);
                    });
                    return total;
                };

                function loadDomains() {
                    $scope.loadingDomains = true;
                    domainService.getRawDomains()
                        .then(function(response) {
                            console.log(response.data);

                            $scope.loadingDomains = false;
                        });
                }

                function initializeDates() {
                    $scope.dateSelector = {
                        fromDate: new Date(moment().subtract(30, 'days')),
                        toDate: new Date()
                    };
                    console.log($scope.dateSelector);
                }

                $scope.dateFormat = 'yyyy-MM-dd';
                $scope.fromDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: new Date(2016, 1, 1),
                    maxDate: today
                };
                var today = new Date();
                $scope.toDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: $scope.dateSelector.fromDate,
                    maxDate: today
                };
                $scope.fromDatePopup = {
                    opened: false
                };
                $scope.toDatePopup = {
                    opened: false
                };
                $scope.processFromDate = function(fromDate) {
                    if (fromDate != null) {
                        var newFromDate = new Date(fromDate);
                        if (!$scope.dateSelector.toDate || $scope.dateSelector.toDate <
                            newFromDate) {
                            var ToMinDate = newFromDate;
                            $scope.toDateOptions.minDate = ToMinDate;
                            $scope.dateSelector.toDate = ToMinDate;
                        }
                        loadInvoices();
                    }
                };
                $scope.processToDate = function(toDate) {
                    if (toDate != null) {
                        if (!$scope.dateSelector.fromDate || $scope.dateSelector.fromDate >
                            toDate) $scope.dateSelector.fromDate = new Date(toDate);
                        $scope.dateSelector.toDate = new Date(toDate);
                    }
                    loadInvoices();
                };

                $scope.OpenfromDate = function() {
                    //$scope.dateSearched = false;
                    $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
                };
                $scope.OpentoDate = function() {
                    //$scope.dateSearched = false;
                    $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
                };

                $rootScope.callHistoryRST = [];
                $scope.clearDateSearch = function() {
                    initializeDates();
                    $scope.pagination.currentPage = 1;
                    loadInvoices();
                };

                function loadInvoices(agency) {
                    console.log($scope.dateSelector);
                    if (!agency) agency = null;
                    $scope.loadingInvoices = true;
                    var data = {
                        fromDate: $scope.dateSelector.fromDate,
                        toDate: $scope.dateSelector.toDate,
                        domainUuid: agency
                    };
                    console.log(data);
                    dataFactory.postGetAdminInvoices(data)
                        .then(function(response) {
                            console.log(response.data)
                            if (response.data.success) {
                                $scope.availInvoices = response.data.success.data;
                            } else {
                                $scope.availInvoices = [];
                            }
                            $scope.loadingInvoices = false;
                        });
                };

                $scope.confirmCancelInvoice = function(invoice) {
                    $myModal.openTemplate('cancelinvoicemodal.html', invoice, 'md');
                };

                function cancelInvoice(invoice, action) {
                    $uibModalStack.dismissAll();
                    billingService.cancelInvoice(invoice, action)
                        .then(function(response) {
                            console.log(response);
                            $rootScope.showalerts(response);
                        });
                }

                $scope.showRefundInvoice = function(invoice) {
                    $myModal.openTemplate('refundmodal.html', invoice, 'md');
                };

                $scope.showModalWithData = $rootScope.showModalWithData;

                $scope.availNotices = function() {
                    return bridgeNoticeService.notices;
                };

                // $rootScope.$on('new.invoice.created', function($event, invoice) {
                //     if (($scope.agency && invoice.domain_uuid === $scope.agency) ||
                //         !$scope.agency) {
                //         $scope.availInvoices.push(invoice);
                //     }
                // });
                // $rootScope.$on('invoice.updated', function($event, invoice) {
                //     if (($scope.agency && invoice.domain_uuid === $scope.agency) ||
                //         !$scope.agency) {
                //         var index = $filter('getByUUID')($scope.availInvoices,
                //             invoice.invoice_uuid, 'invoice');
                //         if (index !== null) $scope.availInvoices[index] = invoice;
                //     }
                // });

                $scope.viewInvoice = function(invoice) {
                    $scope.activeInvoice = invoice;

                };

                $rootScope.$on('close.view.invoice', function() {
                    $scope.activeInvoice = null;
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

                $scope.keywordFilter = function(item) {
                    if (!$scope.filters.searchInvoices ||
                        ($scope.filters.searchInvoices &&
                            (item.invoice_num && String(item.invoice_num).toLowerCase()
                                .indexOf($scope.filters.searchInvoices.toLowerCase()) !==
                                -1) ||
                            ($scope.showAgency(item.domain_uuid) && $scope.showAgency(
                                item.domain_uuid).toLowerCase().indexOf($scope.filters
                                .searchInvoices.toLowerCase()) !== -1) ||
                            (String(item.total).toLowerCase().indexOf($scope.filters.searchInvoices
                                .toLowerCase()) !== -1) ||
                            (String(item.balance).toLowerCase().indexOf($scope.filters.searchInvoices
                                .toLowerCase()) !== -1)
                        )) return true;
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
                            applyCredit: false,
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

                $scope.sort_by = function(predicate) {
                    $scope.predicate = predicate;
                    $scope.reverse = !$scope.reverse;
                };

                $scope.showChevron = function(predicate) {
                    return usefulTools.showChevron(predicate, $scope.predicate, $scope.reverse);
                };
            }
        };
    })
    .directive('cancelInvoice', function($rootScope, $mdDialog, billingService, dataFactory,
        $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'cancel-invoice.html',
            scope: {
                invoice: '<'
            },
            link: function($scope, element, attrs) {
                $scope.cancel = { action: 'refund' };
                $scope.cancelInvoice = function() {
                    $scope.working = true;
                    billingService.cancelInvoice($scope.invoice, $scope.cancel.action)
                        .then(function(response) {
                            console.log(response);
                            $rootScope.showalerts(response);
                            $uibModalStack.dismissAll();
                            $scope.working = false;
                        });
                };
                $scope.closeModal = $rootScope.closeModal;
            }
        };
    })
    .directive('editBridgeInvoice', function($rootScope, $mdDialog, billingService, dataFactory,
        $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'edit-bridge-invoice.html',
            scope: {
                invoice: '<',
                domains: '<',
                domain: '<',
                closeInvoiceModal: '&',
            },
            link: function($scope, element, attrs) {
                billingService.getBillingProps()
                    .then(function(response) {
                        $scope.fees = response;
                    });
                var today = new Date();
                if (!$scope.invoice.invoice_uuid) {
                    $scope.invoice.created_at = today;
                    $scope.invoice.due_at = today;
                } else {
                    $scope.invoice.created_at = new Date(moment($scope.invoice.created_at));
                    $scope.invoice.due_at = new Date(moment($scope.invoice.due_at));
                }
                $scope.invoiceDate = "";
                $scope.dueDate = "";
                $scope.newLine = {};
                $scope.displayInvoiceDate = new Date(moment().subtract(30, 'days'));
                $scope.displayDueDate = new Date();
                $scope.dateFormat = 'yyyy-MM-dd';
                $scope.dateSearched = true;
                $scope.invoiceDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: new Date(2016, 1, 1),
                    maxDate: today
                };
                $scope.dueDateOptions = {
                    formatYear: 'yy',
                    showWeeks: false,
                    startingDay: 0,
                    minDate: $scope.fromDate
                };
                $scope.invoiceDatePopup = {
                    opened: false
                };
                $scope.dueDatePopup = {
                    opened: false
                };
                $scope.openInvoiceDate = function() {
                    $scope.invoiceDatePopup.opened = !$scope.invoiceDatePopup.opened;
                };
                $scope.openDueDate = function() {
                    $scope.dueDatePopup.opened = !$scope.dueDatePopup.opened;
                };

                $scope.saveNewLine = function(line) {
                    var lineTotal = (parseFloat(line.item_quantity) * parseFloat(line.unit_cost))
                        .toFixed(2);
                    var item = {
                        item_type: 'custom',
                        item_info: line.item_info,
                        item_quantity: line.item_quantity,
                        unit_cost: line.unit_cost,
                        item_total: lineTotal,
                        item_tax: 0.0,
                        // item_usf: (line.includeUsf ? ((parseFloat($scope.fees.universal_service_fee)/100.0) * lineTotal) : 0.0),
                        item_recovery: (line.includeRec ? (parseFloat($scope.fees.recovery_fee) *
                            line.quantity) : 0.0),
                    };
                    $scope.invoice.items.push(item);
                    $scope.newLine = {};
                };

                $scope.saveEditLine = function(changes, index) {
                    var line = $scope.invoice.items[index];
                    line.unit_cost = changes.unit_cost;
                    line.item_info = changes.item_info;
                    line.item_quantity = changes.item_quantity;
                    line.item_total = parseInt(line.item_quantity) * parseFloat(line.unit_cost);
                    $scope.cancelEdit();
                };

                $scope.deleteLine = function(index) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent('Are you sure you want to remove this line.')
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        $scope.invoice.items.splice(index, 1);
                    });
                };

                $scope.editLine = function(line, index) {
                    var line = angular.copy($scope.invoice.items[index]);
                    $scope.editingIndex = index;
                    $scope.editingLine = line;
                };

                $scope.lineTotal = function(line) {
                    return parseInt(line.item_quantity) * parseFloat(line.unit_cost);
                };

                $scope.cancelEdit = function() {
                    $scope.editingIndex = null;
                    $scope.editingLine = null;
                };

                $scope.newLineSubtotal = function(line) {
                    if (line.item_quantity && line.unit_cost) return (parseFloat(line.item_quantity) *
                        parseFloat(line.unit_cost)).toFixed(2);
                    return null;
                };

                $scope.invoiceSums = function() {
                    var subtotal = parseFloat(0.0);
                    var taxes = parseFloat(0.0);
                    angular.forEach($scope.invoice.items, function(item) {
                        subtotal = subtotal + parseFloat(item.item_total);
                        // taxes += (parseFloat(item.item_usf) + parseFloat(item.item_recovery));
                        taxes += (item.item_recovery ? parseFloat(item.item_recovery) :
                            0.0);
                    });
                    var total = subtotal + taxes;
                    return {
                        subtotal: subtotal,
                        taxes: taxes,
                        total: total
                    };
                };

                $scope.showItemTaxes = function(item) {
                    // return (item.item_tax + item.item_usf + item.item_recovery);
                    return (item.item_tax + item.item_recovery);
                };

                $scope.closeInvoiceModal = function() {
                    var confirmBack = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Are you sure you want to cancel. You will lose any unsaved changes.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmBack).then(function() {
                        // $scope.editNotice = false;
                        // $scope.theNotice = {};
                        $uibModalStack.dismissAll();
                    });
                };

                $scope.saveInvoice = function(invoice, draft) {
                    if (!draft) {
                        var confirm = $mdDialog.confirm()
                            .title('Please Confirm')
                            .textContent(
                                'Please confirm you would like to activate this invoice. Once activated it can no longer edited.'
                            )
                            .ariaLabel('Confirm')
                            .ok('Yes')
                            .cancel('Cancel');
                        $mdDialog.show(confirm).then(function() {
                            invoice.status = 'unpaid';
                            submitInvoice(invoice);
                        });
                    } else {
                        submitInvoice(invoice);
                    }
                };

                function submitInvoice(invoice) {
                    invoice.created_at = moment(invoice.created_at).format('YYYY-MM-DD');
                    invoice.due_at = moment(invoice.due_at).format('YYYY-MM-DD');

                    dataFactory.postSaveInvoice(invoice)
                        .then(function(response) {
                            console.log(response.data);
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                if (!invoice.invoice_uuid) $rootScope.$broadcast(
                                    'new.invoice.created', response.data.success.data
                                );
                                if (invoice.invoice_uuid) $rootScope.$broadcast(
                                    'invoice.updated', response.data.success.data);
                                $uibModalStack.dismissAll();
                            }
                        });
                }
            }
        };
    })
    .directive('refundPayment', function($rootScope, $myModal, $mdDialog, usefulTools,
        billingService, dataFactory, Slug, $filter, $window, $uibModalStack,
        customerGroupCodeService) {
        return {
            restrict: 'E',
            templateUrl: 'refund-payment.html',
            scope: {
                invoice: '<',
            },
            link: function($scope, element, attrs) {
                console.log($scope.invoice);
                $scope.payment = null;
                $scope.refund = {};
                if ($scope.invoice.payments.length === 1) {
                    $scope.payment = $scope.invoice.payments[0];
                    $scope.refund.amount = $scope.payment.amount;
                    $scope.refund.reason = 'requested_by_customer';
                }
                $scope.refundPayment = function(payment) {
                    console.log(payment);
                    $scope.payment = payment;
                    $scope.refund.reason = 'requested_by_customer';
                };
                $scope.cancelRefund = function() {
                    $scope.payment = null;
                };

                $scope.refundingAllInvoice = function(refund) {
                    return (parseFloat(refund.amount) === $scope.invoice.paymentsTotal) ||
                        (sumOfNetPayments() === parseFloat(refund.amount));
                };

                function sumOfNetPayments() {
                    var total = 0.0;
                    _.forEach($scope.invoice.payments, function(payment) {
                        total += parseFloat(payment.net_amount);
                    });
                    return total;
                }

                $scope.sumOfRefunds = function(payment) {
                    var total = 0.0;
                    _.forEach(payment.refunds, function(refund) {
                        total += parseFloat(refund.amount);
                    });
                    return total;
                };

                $scope.showRefundDetails = function(invoice) {
                    $rootScope.showModalFull('/billing/view-refunds-modal.html',
                        invoice.refunds, 'md');
                    // $myModal.openTemplate('/views/billing/view-refunds-modal.html', invoice.refunds, 'md');
                };

                $scope.submitRefund = function(refund, action) {
                    if (parseFloat(refund) > parseFloat($scope.payment.amount)) {
                        $rootScope.showErrorAlert(
                            'The refund amount must be less than the payment amount of ' +
                            $filter('currency')($scope.payment.amount) + '.');
                        return;
                    }
                    var confirmRefund = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent('Are you sure you want to refund ' + $filter(
                                'currency')(refund) + ' to invoice # ' + $scope.invoice
                            .invoice_num + '?')
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmRefund).then(function() {
                        billingService.issueRefund($scope.payment, $scope.refund)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    $scope.closeModal();
                                }
                            });
                    });
                };

                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };
            }
        };
    })
    .directive('viewInvoice', function($rootScope, $myModal, $mdDialog, usefulTools, userService,
        domainService, billingService, dataFactory, Slug, $filter, $window, $uibModalStack,
        customerGroupCodeService) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/view-invoice.html',
            scope: {
                invoice: '<'
            },
            link: function($scope, element, attrs) {
                console.log($scope.invoice);
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.isBillingAdminOrGreater = $rootScope.isBillingAdminOrGreater;
                $scope.userToken = $rootScope.userToken;
                $scope.tips = $rootScope.tips;

                function init() {
                    billingService.init($scope.invoice.domain_uuid);
                    domainService.loadDomainInfo($scope.invoice.domain_uuid)
                        .then(function(response) {
                            $scope.domain = response;
                            console.log($scope.domain);
                        });
                }
                init();

                $scope.deleteLine = function(index) {
                    var confirmDelete = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent('Are you sure you want to remove this line.')
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmDelete).then(function() {
                        $scope.invoice.items.splice(index, 1);
                    });
                };

                $scope.isKotterTechOrGreater = function() {
                    return userService.isKotterTechOrGreater();
                };

                $scope.addAgencyPayment = function() {
                    $scope.showPaymentTab = true;
                };

                $scope.cancelAgencyPayment = function() {
                    $scope.showPaymentTab = false;
                };

                $scope.customItems = function() {
                    var items = $scope.invoice.items.filter(function(item) {
                        return item.item_type === 'custom';
                    });
                    return items;
                };

                $scope.showMinuteCount = function(child) {
                    return parseFloat(child.item_quantity / 60.0)
                };

                $scope.confirmCancelInvoice = function(invoice) {
                    $myModal.openTemplate('cancelinvoicemodal.html', invoice, 'md');
                };

                function cancelInvoice(invoice, action) {
                    billingService.cancelInvoice(invoice, action)
                        .then(function(response) {
                            $rootScope.showalerts(response);

                        });
                }

                $scope.currentMonthItems = function() {
                    var current = ['user', 'faxes', 'users', 'e911s', 'confs'];
                    var items = $scope.invoice.items.filter(function(item) {
                        return current.indexOf(item.item_type) !== -1;
                    });
                    return items;
                };

                $scope.prevMonthItems = function() {
                    var previous = [
                        'firstuser-credit',
                        'user-add',
                        'user-delete',
                        'e911-add',
                        'e911-delete',
                        'vfax-add',
                        'vfax-delete',
                        'conf-add',
                        'conf-delete',
                        'addon-add',
                        'addon-delete'
                    ];
                    var items = $scope.invoice.items.filter(function(item) {
                        return previous.indexOf(item.item_type) !== -1;
                    });
                    return items;
                };

                $scope.itemTaxes = function(item) {
                    // var usf = item.item_usf ? parseFloat(item.item_usf) : 0.00;
                    var rec = item.item_recovery ? parseFloat(item.item_recovery) :
                        0.00;
                    var tax = item.item_tax ? parseFloat(item.item_tax) : 0.00;
                    // return usf + rec + tax;
                    return rec + tax;
                };

                $scope.itemTotal = function(item) {
                    var tax = $scope.itemTaxes(item);
                    return tax ? (tax + parseFloat(item.item_total)) : parseFloat(item.item_total);
                };

                $scope.editLine = function(index) {
                    var line;
                    angular.copy($scope.invoice.items[index], line);
                    $scope.editingIndex = index;
                    $scope.editingLine = line;
                };

                $scope.cancelEditLine = function() {
                    $scope.editingIndex = null;
                    $scope.editingLine = null;
                };

                $scope.newLineSubtotal = function(line) {
                    if (line.item_quantity && line.unit_cost) return (parseFloat(line.item_quantity) *
                        parseFloat(line.unit_cost)).toFixed(2);
                    return null;
                };

                $scope.invoiceSums = function() {
                    var subtotal = parseFloat(0.0);
                    var taxes = parseFloat(0.0);
                    angular.forEach($scope.invoice.items, function(item) {
                        subtotal = subtotal + parseFloat(item.item_total);
                        // taxes += (parseFloat(item.item_usf) + parseFloat(item.item_recovery));
                        taxes += (parseFloat(item.item_recovery));
                    });
                    var total = subtotal + taxes;
                    return {
                        subtotal: subtotal,
                        taxes: taxes,
                        total: total
                    };
                };

                $scope.sumOfRefunds = function(payment) {
                    var total = 0.0;
                    _.forEach(payment.refunds, function(refund) {
                        total += parseFloat(refund.amount);
                    });
                    return total;
                };

                $scope.showRefundDetails = function(invoice) {
                    $rootScope.showModalFull('/billing/view-refunds-modal.html',
                        invoice.refunds, 'md');
                    // $myModal.openTemplate('/views/billing/view-refunds-modal.html', invoice.refunds, 'md');
                };

                $scope.showItemTaxes = function(item) {
                    // return (item.item_tax + item.item_usf + item.item_recovery);
                    return (item.item_tax + item.item_recovery);
                };

                $scope.closeInvoice = function() {
                    console.log("broadcast close");
                    $rootScope.$broadcast('close.view.invoice');
                };


            }
        };
    })
    .directive('viewPayment', function($rootScope, domainService, billingService) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/view-payment.html',
            scope: {
                payment: '<'
            },
            link: function($scope, element, attrs) {
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.userToken = $rootScope.userToken;

                function init() {
                    // billingService.init($scope.invoice.domain_uuid);
                    domainService.loadDomainInfo($scope.payment.domain_uuid)
                        .then(function(response) {
                            $scope.domain = response;
                        });
                }
                init();

                $scope.sumOfRefunds = function(payment) {
                    var total = 0.0;
                    _.forEach(payment.refunds, function(refund) {
                        total += parseFloat(refund.amount);
                    });
                    return total;
                };

                $scope.closePayment = function() {
                    $rootScope.$broadcast('close.view.payment');
                };
            }
        };
    })
    .directive('viewRefund', function($rootScope, domainService, billingService) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/view-refund.html',
            scope: {
                refund: '<'
            },
            link: function($scope, element, attrs) {
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.userToken = $rootScope.userToken;

                function init() {
                    // billingService.init($scope.invoice.domain_uuid);
                    domainService.loadDomainInfo($scope.refund.domain_uuid)
                        .then(function(response) {
                            $scope.domain = response;
                        });
                }
                init();

                $scope.closeRefund = function() {
                    $rootScope.$broadcast('close.view.refund');
                };
            }
        };
    });
