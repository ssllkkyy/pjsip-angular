'use strict';

proySymphony
    .directive('billingSummaryTab', function($rootScope, _, packageService, cloudStorageService,
        billingService, customerGroupCodeService, metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/summary.html',
            scope: {
                domain: '<',
            },
            link: function($scope, element, attrs) {
                if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                $scope.tips = $rootScope.tips;
                $scope.summary = {};
                $scope.showModalWithData = $rootScope.showModalWithData;
                $scope.state = 'table';
                customerGroupCodeService.setCustomerGroupCodes();
                billingService.getAccountSummary($scope.domain.domain_uuid)
                    .then(function(response) {
                        $scope.summary = response;
                    });

                $scope.domainUsage = function() {
                    return cloudStorageService.getAppropriateFileSizeFromB(parseFloat(
                        $rootScope.user.domainCloudStorageUsage), 1);
                };
                $scope.showAsReadable = function(amount) {
                    return cloudStorageService.getAppropriateFileSizeFromB(amount, 1);
                };

                $scope.activeAgency = function() {
                    return billingService.activeAgency;
                };
                $scope.hideCancelled = function(item) {
                    return item.status !== 'cancelled' && item.status !== 'draft';
                };

                $scope.savedCards = function() {
                    return billingService.savedCards;
                };
                $scope.savedBanks = function() {
                    return billingService.savedBanks;
                };
                $scope.invoices = function() {
                    return billingService.invoices;
                };
                $scope.currentInvoice = function() {
                    return billingService.invoices[0];
                };
                $scope.previousInvoice = function() {
                    return billingService.invoices[1] ? billingService.invoices[1] :
                        null;
                };
                $scope.lastPayment = function() {
                    return billingService.lastPayment;
                };

                $scope.unpaidInvoices = function() {
                    if (billingService.invoices.length === 0) return [];
                    return _.filter(billingService.invoices, function(inv) {
                        return (inv.balance > 0.0 && inv.status !== 'cancelled' &&
                            inv.status !== 'draft');
                    });
                };

                $scope.displayInvoice = function(invoice) {
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

                $scope.renderCurrency = function(n) {
                    if (n) {
                        return parseFloat(n).toFixed(2).replace(/./g, function(c, i, a) {
                            return i && c !== "." && ((a.length - i) % 3 === 0) ?
                                ',' + c : c;
                        });
                    }
                    return n;
                };

                $scope.availPackages = function() {
                    return packageService.availPackages;
                };

                function isUser(contact) {
                    return contact.type === 'user';
                }

                $scope.back = function() {
                    $scope.editingDomain = false;
                    $scope.thedomain = null;
                };

                metaService.rootScopeOn($scope, 'groupcode.changed', function() {
                    //customerGroupCodeService.setCustomerGroupCodes();
                    //$scope.customerGroupCodes = customerGroupCodeService.codes;
                });

                $scope.toggleState = function(state) {
                    $scope.state = state;
                };

                $scope.stateIsShowing = function(state) {
                    return state === $scope.state;
                };

                $rootScope.$on('close.view.invoice', function() {
                    console.log("CLOSE");
                    $scope.activeInvoice = null;
                    $scope.showInvoice = false;
                });
            }
        };
    })
    .directive('billingPaymentTab', function($mdDialog, $rootScope, billingService, userService,
        dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/makeapayment.html',
            scope: {
                domain: '<',
                invoice: '<',
            },
            link: function($scope, element, attrs) {
                if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                $scope.tips = $rootScope.tips;
                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.savedCards = function() {
                    return billingService.savedCards;
                };
                $scope.savedBanks = function() {
                    return billingService.savedBanks;
                };
                $scope.invoices = function() {
                    return billingService.invoices;
                };
                $scope.activeAgency = function() {
                    return billingService.activeAgency;
                };

                var balance = $scope.activeAgency().billingSettings.account_balance;
                $scope.payment = {
                    amount: $scope.invoice ? parseFloat($scope.invoice.balance) : ((
                        balance && balance > 0.0) ? parseFloat(balance) : 0.00)
                };

                $rootScope.$on('credit.balance.selected', function() {
                    var crbal = parseFloat($scope.activeAgency().billingSettings.credit_balance);
                    var acbal = parseFloat($scope.activeAgency().billingSettings.account_balance);
                    $scope.payment.amount = $scope.invoice ? (crbal >= parseFloat(
                        $scope.invoice.balance) ? parseFloat($scope.invoice
                        .balance) : crbal) : (crbal >= acbal ? acbal : crbal);
                });

                $scope.message = {
                    success: null,
                    error: null
                };

                $scope.currentPaymentMethod = function() {
                    return billingService.currentPaymentMethod;
                }
                $scope.disableSubmit = function() {
                    if (!$scope.payment.amount || ($scope.payment.amount && parseFloat(
                            $scope.payment.amount) <= 0.0)) {
                        $scope.disableReason =
                            'Payment amount must be greater than $0.00.';
                        return true;
                    }
                    if (!$scope.currentPaymentMethod()) {
                        $scope.disableReason = 'A payment method must be selected.';
                        return true;
                    }
                    if (!userService.isKotterTechOrGreater() && $scope.currentPaymentMethod() &&
                        $scope.currentPaymentMethod().substring(0, 3) === 'eft') {
                        $scope.disableReason =
                            'The default payment is set as Electronic Funds Transfer. To make a manual payment please select or add a credit card.';
                        return true;
                    }
                    if ($scope.invoice && parseFloat($scope.invoice.balance) < $scope.payment
                        .amount) {
                        $scope.disableReason =
                            'The payment amount you have submitted is greater than the outstanding balance of the invoice you are paying (' +
                            $filter('currency')($scope.invoice.balance) + ').';
                        return true;
                    }
                    if ($scope.activeAgency() && parseFloat($scope.activeAgency().billingSettings.account_balance) <
                        $scope.payment.amount) {
                        $scope.disableReason =
                            'The payment amount you have specified is greater than the outstanding balance on the account (' +
                            $filter('currency')($scope.activeAgency().billingSettings.account_balance) + '). The difference will be ' + 
                            'added as an account credit once payment is completed.';
                        return false;
                    }
                    if ($scope.currentPaymentMethod() && $scope.currentPaymentMethod() ===
                        'credit-balance' && $scope.activeAgency() && parseFloat($scope.activeAgency().billingSettings
                            .credit_balance) < $scope.payment.amount) {
                        $scope.disableReason =
                            'The payment amount must be less than or equal the total credit balance on your account (' +
                            $filter('currency')($scope.activeAgency().billingSettings.credit_balance) +
                            ').';
                        return true;
                    }
                    $scope.disableReason = '';
                    return false;
                };

                $scope.submitPayment = function() {
                    var msg;
                    if ($scope.invoice && $scope.invoice.balance < $scope.payment.amount) {
                        $rootScope.showErrorAlert(
                            'The payment amount you have submitted is greater than the outstanding balance of the invoice you are paying.'
                        );
                        return;
                    // } else if ($scope.activeAgency().billingSettings.account_balance <
                    //     $scope.payment.amount) {
                    //     $rootScope.showErrorAlert(
                    //         'The payment amount must be less than or equal the outstanding balance on your account (' +
                    //         $filter('currency')($scope.activeAgency().billingSettings
                    //             .account_balance) + ').');
                    //     return;
                    } else if ($scope.currentPaymentMethod().substring(0, 4) === 'card') {
                        var card = billingService.getCardById($scope.currentPaymentMethod());
                        if (!card) {
                            $rootScope.showErrorAlert(
                                'Current payment method not found');
                            return;
                        }
                        msg = card.brand + ' ending in ' + card.last4;
                    } else if ($scope.currentPaymentMethod() === 'credit-balance') {
                        if ($scope.payment.amount > $scope.activeAgency().billingSettings
                            .credit_balance) {
                            $rootScope.showErrorAlert(
                                'If using your account credit balance, you can only make a maximum payment of ' +
                                $filter('currency')($scope.activeAgency().billingSettings
                                    .credit_balance) + '.');
                            return;
                        }
                        msg = 'account credit balance';
                    } else if ($scope.currentPaymentMethod().substring(0, 6) ===
                        'custom') {
                        msg = billingService.customDescription ? billingService.customDescription :
                            'custom payment';
                    }
                    var confirmPayment = $mdDialog.confirm()
                        .title('Please Confirm Your Payment')
                        .htmlContent(
                            'Please confirm you want to submit a payment in the amount of <strong>' +
                            $filter('currency')($scope.payment.amount) +
                            '</strong> using ' + msg + '.')
                        .ariaLabel('Confirm')
                        .ok('Submit')
                        .cancel('Cancel');

                    $mdDialog.show(confirmPayment).then(function() {
                        var spin = {
                            title: 'Processing Payment'
                        };
                        $rootScope.showModalFull('/modals/workingspinner.html',
                            spin, 'xs');
                        var data = {
                            source_id: $scope.currentPaymentMethod(),
                            amount: $scope.payment.amount,
                            invoice_uuid: $scope.invoice ? $scope.invoice.invoice_uuid : null,
                            domain_uuid: $scope.domain.domain_uuid,
                            description: (($scope.currentPaymentMethod().substr(
                                        0, 6) === 'custom' &&
                                    billingService.customDescription) ?
                                billingService.customDescription : null
                            )
                        };
                        billingService.submitPayment(data)
                            .then(function(response) {
                                $uibModalStack.dismissAll();
                                spin = null;
                                if (response.success) {
                                    $rootScope.showSuccessAlert(response.success
                                        .message);
                                    $rootScope.$broadcast(
                                        'payment.completed');
                                } else {
                                    $rootScope.showErrorAlert(response.error
                                        .message);
                                }
                            });
                    });
                };

            }
        };
    })
    .directive('billingHistoryTab', function($myModal, $rootScope, billingService, dataFactory,
        $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/billinghistory.html',
            scope: {
                domain: '<',
            },
            link: function($scope, element, attrs) {
                if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                $scope.tips = $rootScope.tips;
                $scope.paginate = {
                    perPage: 25,
                    currentPage: 1
                };
                $scope.maxSize = 50;
                $scope.ppOptions = [10, 20, 50, 100];
                $scope.predicate = 'created_at';
                $scope.reverse = true;
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.filters = {
                    domainUuid: null,
                    searchInvoices: null,
                    searchPayments: null
                };
                $scope.showInvoices = true;
                $scope.showPayments = false;

                $scope.historyItems = function() {
                    return billingService.activeAgency.billingHistory;
                };

                $scope.agencyInfo = function() {
                    return billingService.activeAgency;
                };

                $scope.invoices = function() {
                    return billingService.activeAgency.invoices;
                    // return billingService.invoices;
                };

                $scope.paymentHistory = function() {
                    return billingService.activeAgency.paymentHistory;
                };

                $scope.sumOfRefunds = function(payment) {
                    var total = 0.0;
                    _.forEach(payment.refunds, function(refund) {
                        total += parseFloat(refund.amount);
                    });
                    return total;
                };

                $scope.viewInvoice = function(invoice) {
                    $scope.activeInvoice = invoice;
                    $scope.display = 'invoice';
                };

                $scope.viewPayment = function(payment) {
                    $scope.activePayment = payment;
                    $scope.display = 'payment';
                };

                $scope.viewRefund = function(refund) {
                    $scope.activeRefund = refund;
                    $scope.display = 'refund';
                };

                $scope.submitPayment = function(invoice) {
                    $scope.activeInvoice = invoice;
                    $scope.display = 'payinvoice';
                };

                $scope.cancelPayment = function() {
                    $scope.activeInvoice = null;
                    $scope.display = null;
                };

                $rootScope.$on('payment.completed', function() {
                    $scope.cancelPayment();
                });

                $rootScope.$on('close.view.invoice', function() {
                    $scope.activeInvoice = null;
                    $scope.display = null;
                });

                $rootScope.$on('close.view.payment', function() {
                    $scope.activePayment = null;
                    $scope.display = null;
                });

                $rootScope.$on('close.view.refund', function() {
                    $scope.activeRefund = null;
                    $scope.display = null;
                });

                $scope.displayInvoices = function() {
                    $scope.showInvoices = true;
                    $scope.showPayments = false;
                };

                $scope.displayPayments = function() {
                    $scope.showInvoices = false;
                    $scope.showPayments = true;
                };

                $scope.invoiceKeywordFilter = function(item) {
                    if (!$scope.filters.searchInvoices ||
                        ($scope.filters.searchInvoices &&
                            (item.invoice_num && String(item.invoice_num).toLowerCase()
                                .indexOf($scope.filters.searchInvoices.toLowerCase()) !==
                                -1) ||
                            (item.total && String(item.total).toLowerCase().indexOf(
                                $scope.filters.searchInvoices.toLowerCase()) !== -1) ||
                            (item.amount_paid && String(item.amount_paid).toLowerCase()
                                .indexOf($scope.filters.searchInvoices.toLowerCase()) !==
                                -1) ||
                            (item.balance && String(item.balance).toLowerCase().indexOf(
                                $scope.filters.searchInvoices.toLowerCase()) !== -1)
                        )) return true;
                    return false;
                };

                $scope.paymentKeywordFilter = function(item) {
                    if (!$scope.filters.searchPayments ||
                        ($scope.filters.searchPayments &&
                            (item.payment_num && String(item.payment_num).toLowerCase()
                                .indexOf($scope.filters.searchPayments.toLowerCase()) !==
                                -1) ||
                            (item.amount && String(item.amount).toLowerCase().indexOf(
                                $scope.filters.searchPayments.toLowerCase()) !== -1)
                        )) return true;
                    return false;
                };

                $scope.hideCancelled = function(item) {
                    return item.status !== 'cancelled';
                };

                $scope.showRefundDetails = function(invoice) {
                    $rootScope.showModalFull('/billing/view-refunds-modal.html',
                        invoice.refunds, 'md');
                    // $myModal.openTemplate('/views/billing/view-refunds-modal.html', invoice.refunds, 'md');
                };
            }
        };
    })
    .directive('billingAddresses', function(dataFactory, $myModal, $uibModalStack, billingService, contactService, locationService, $mdDialog, $filter, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/billing-addresses.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                if (!$scope.domain) $scope.domain = billingService.activeAgency;
                $scope.paginate = {
                    perPage: 25,
                    currentPage: 1
                };
                $scope.filters = {
                    agency: null,
                    user: null
                };

                $scope.addresses = function() {
                    return billingService.activeAgency ? billingService.activeAgency.addresses : [];
                };

                $scope.showAddress = function(address) {
                    var output = address.address;
                    if (address.address2) output += '<br />' + address.address2;
                    output += '<br />' + address.city + ', ' + address.state;
                    output += '<br />' + address.zip;
                    return output;
                };

                $scope.getUser = function(address) {
                    if (address.primary_user) {
                        var contact = contactService.getContactByUserUuid(address.primary_user);
                        if (contact) return contact.name;
                    }
                    return null;
                }
                $scope.getLocation = function(address) {
                    if (address.location_group_uuid) {
                        var location = locationService.getLocationByUuid(address.location_group_uuid);
                        return location ? location.name : null;
                    }
                    return null;
                };

                $scope.isKotterTechUser = function(user) {
                    return contactService.isKotterTechUser(user);
                };

                $scope.showEditAddress = function(address) {
                    if (!address) {
                        address = {
                            state: 'GA',
                            country: 'US',
                            domain_uuid: $scope.domain.domain_uuid
                        };
                    }

                    $myModal.openTemplate('edit-address-modal.html', address, 'md');
                };

                $scope.keywordFilter = function(item) {
                    if (!$scope.filters.user ||
                        ($scope.filters.user &&
                            (item.contact && item.contact.contact_name_family && item.contact
                                .contact_name_family.toLowerCase().indexOf($scope.filters
                                    .user.toLowerCase()) !== -1) ||
                            (item.contact && item.contact.contact_name_given && item.contact
                                .contact_name_given.toLowerCase().indexOf($scope.filters
                                    .user.toLowerCase()) !== -1) ||
                            (item.ext && item.ext.extension && item.ext.extension.toLowerCase()
                                .indexOf($scope.filters.user.toLowerCase()) !== -1)
                        )) return true;
                    return false;
                };

                $rootScope.$on('billing.address.updated', function($event, address) {
                    if ($scope.domain && $scope.domain.domain_uuid === address.domain_uuid) {
                        $scope.domain.registeredUsers.push(user);

                    }
                    var index = $filter('getByUUID')(
                        $scope.domain.registeredUsers,
                        user.user_uuid, 'user');
                    if (index !== null) $scope.domain.registeredUsers[index] = user;
                });

                $scope.togglePrimaryAddress = function(address) {
                    if (address.primary === 'false') {
                        var note = $scope.domain.addresses.count>1 ? ' Please toggle another address to be primary.' : ' Please add another address and set it to primary.';
                        $rootScope.showErrorAlert('There must be at least one primary address. ' + note);
                        address.primary = 'true';
                        return;
                    }
                    billingService.togglePrimaryAddress(address)
                    .then(function(response) {
                        $rootScope.showalerts(response);
                    });
                };

                $scope.deleteAddress = function(address) {
                    if ($scope.domain.addresses.length === 1) {
                        $rootScope.showErrorAlert('You can not delete this address. There must always be one active billing address on file. Please edit this address or add another address before attempting to delete this one.');
                        return;
                    }
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent(
                            'Are you sure you want to delete this address?')
                        .ariaLabel('Delete')
                        .ok('Yes, Delete')
                        .cancel('Never Mind');
                    $mdDialog.show(deleteConfirm)
                    .then(function() {
                        billingService.deleteBillingAddress(address)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                            });
                    });

                };

            }
        };
    })
    .directive('editBillingAddress', function(dataFactory, billingService, contactService, $uibModalStack, $mdDialog, $filter, $rootScope) {
        return {
            restrict: 'E',
            templateUrl: 'edit-billing-address.html',
            scope: {
                domain: '<', 
                address: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.billingStates = $rootScope.usStates;
                $scope.billingCountries = [
                    { abbr: 'US', name: 'United States' },
                    { abbr: 'CA', name: 'Canada' }
                ];
                $scope.closeModal = $rootScope.closeModal;

                $scope.onLocationChange = function(location) {
                    $scope.address.location_group_uuid = location;
                };

                $scope.isKotterTechUser = function(user) {
                    return contactService.isKotterTechUser(user);
                };

                $scope.saveAddress = function(address) {
                    billingService.updateBillingAddress(address)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            $uibModalStack.dismissAll();
                        });
                };

                $scope.activeUserContacts = function() {
                    return contactService.getUserContactsOnly();
                };

            }
        };
    })
    .directive('billingUserSetup', function(dataFactory, contactService, $myModal, $uibModalStack, $mdDialog, $filter, $rootScope) {
        function currentlyEmulating($scope) {
            if ($scope.domain) {
                return $scope.domain.domain_uuid !== $rootScope.user.domain_uuid;
            }
            return false;
        };
        return {
            restrict: 'E',
            templateUrl: 'views/billing/billing-user-setup.html',
            scope: {
                domain: '<',
                bluewave: '<'
            },
            link: function($scope, element, attrs) {
                $scope.tips = $rootScope.tips;
                $scope.paginate = {
                    perPage: 25,
                    currentPage: 1
                };
                $scope.filters = {
                    agency: null,
                    user: null
                };

                $scope.isKotterTechUser = function(user) {
                    return contactService.isKotterTechUser(user);
                };

                $scope.showEditUser = function(user) {
                    $scope.editingUser = angular.copy(user);
                    $scope.editingUserUuid = user.user_uuid;
                };

                $scope.keywordFilter = function(item) {
                    if (!$scope.filters.user ||
                        ($scope.filters.user &&
                            (item.contact && item.contact.contact_name_family && item.contact
                                .contact_name_family.toLowerCase().indexOf($scope.filters
                                    .user.toLowerCase()) !== -1) ||
                            (item.contact && item.contact.contact_name_given && item.contact
                                .contact_name_given.toLowerCase().indexOf($scope.filters
                                    .user.toLowerCase()) !== -1) ||
                            (item.ext && item.ext.extension && item.ext.extension.toLowerCase()
                                .indexOf($scope.filters.user.toLowerCase()) !== -1)
                        )) return true;
                    return false;
                };

                $scope.toggleAdminStatus = function(user) {
                    var data = {
                        user_uuid: user.user_uuid,
                        userIsAdmin: user.userIsAdmin
                    };
                    dataFactory.postToggleAdminStatus(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                        });
                };

                $scope.toggleUserBillingStatus = function(user) {
                    var data = {
                        user_uuid: user.user_uuid,
                        freeUser: user.freeUser
                    };
                    dataFactory.postToggleUserBillingStatus(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                        });
                };

                $rootScope.$on('new.user.created', function($event, user) {
                    if ($scope.domain && $scope.domain.domain_uuid === user.domain_uuid) {
                        $scope.domain.registeredUsers.push(user);
                    }
                });

                $scope.toggleUserStatus = function(user) {
                    var data = {
                        user_uuid: user.user_uuid,
                        setting: user.user_enabled
                    };
                    dataFactory.postUserProfileDisable(data).then(function(response) {
                        $rootScope.showalerts(response);
                    });
                };

                $scope.deleteUser = function(user) {
                    var deleteConfirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent(
                            'Are you sure you want to permanantly delete this user?')
                        .ariaLabel('Delete')
                        .ok('Yes, Delete')
                        .cancel('Never Mind');
                    $mdDialog.show(deleteConfirm).then(function() {
                        var spin = {
                            title: 'Deleting User'
                        };
                        $rootScope.showModalFull('/modals/workingspinner.html',
                            spin, 'xs');
                        dataFactory.getHardDeleteUser(user.user_uuid)
                            .then(function(response) {
                                $uibModalStack.dismissAll();
                                spin = null;
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    var index = $filter('getByUUID')($scope.domain.registeredUsers, user.user_uuid, 'user');
                                    if (index !== null) $scope.domain.registeredUsers.splice(index, 1);
                                    $rootScope.$broadcast('billing-user-deleted', user);
                                }

                            });
                    });

                };

                $scope.addUser = function() {
                    $scope.domain.isBluewave = $scope.bluewave;
                    $rootScope.showModalWithData('/company/new-user-modal.html', $scope.domain);
                };

                $scope.saveEditUser = function(user) {
                    var dialog = 'Are you sure you want to update this user?';
                    $rootScope.confirmDialog(dialog)
                        .then(function(response) {
                            $scope.saving = true;
                            if (response) {
                                var data = {
                                    user_uuid: user.user_uuid,
                                    firstName: user.contact.contact_name_given,
                                    lastName: user.contact.contact_name_family,
                                    email: user.email_address
                                };
                                return dataFactory.postUpdateUser(data)
                                    .then(function(response) {
                                        $rootScope.showalerts(response);
                                        $scope.saving = false;
                                        if (response.data.success) {
                                            $scope.editingUser = null;
                                            $scope.editingUserUuid = null;
                                            var index = $filter('getByUUID')(
                                                $scope.domain.registeredUsers,
                                                user.user_uuid, 'user');
                                            if (index !== null) $scope.domain.registeredUsers[index] = user;
                                        }
                                    });
                            } else {
                                $scope.showingAlert = false;
                            }
                        });
                };

                $scope.cancelEditUser = function() {
                    $scope.editingUser = null;
                    $scope.editingUserUuid = null;
                };

            }
        };
    })
    .directive('paymentHistory', function($rootScope, billingService) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/payment-history.html',
            scope: {
                filters: '<'
            },
            link: function($scope, element, attrs) {
                if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                $scope.tips = $rootScope.tips;
                $scope.paginate = {
                    perPage: 25,
                    currentPage: 1
                };
                $scope.maxSize = 50;
                $scope.ppOptions = [10, 20, 50, 100];
                $scope.predicate = 'created_at';
                $scope.reverse = true;
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;
                $scope.isBillingAdminOrGreater = $rootScope.isBillingAdminOrGreater;

                $scope.historyItems = function() {
                    return billingService.activeAgency.billingHistory;
                };

                $scope.agencyInfo = function() {
                    return billingService.activeAgency;
                };

                $scope.invoices = function() {
                    return billingService.activeAgency.invoices;
                    // return billingService.invoices;
                };

                $scope.paymentHistory = function() {
                    return billingService.activeAgency.paymentHistory;
                };

                $scope.sumOfRefunds = function(payment) {
                    var total = 0.0;
                    _.forEach(payment.refunds, function(refund) {
                        total += parseFloat(refund.amount);
                    });
                    return total;
                };

                $scope.viewInvoice = function(invoice) {
                    $scope.activeInvoice = invoice;
                    $scope.display = 'invoice';
                };

                $scope.viewPayment = function(payment) {
                    $scope.activePayment = payment;
                    $scope.display = 'payment';
                };

                $scope.viewRefund = function(refund) {
                    $scope.activeRefund = refund;
                    $scope.display = 'refund';
                };

                $scope.submitPayment = function(invoice) {
                    $scope.activeInvoice = invoice;
                    $scope.display = 'payinvoice';
                };

                $scope.cancelPayment = function() {
                    $scope.activeInvoice = null;
                    $scope.display = null;
                };

                $rootScope.$on('payment.completed', function() {
                    $scope.cancelPayment();
                });

                $rootScope.$on('close.view.payment', function() {
                    $scope.activePayment = null;
                    $scope.display = null;
                });

                $rootScope.$on('close.view.refund', function() {
                    $scope.activeRefund = null;
                    $scope.display = null;
                });

                $scope.paymentKeywordFilter = function(item) {
                    if (!$scope.filters.searchPayments ||
                        ($scope.filters.searchPayments &&
                            (item.payment_num && String(item.payment_num).toLowerCase()
                                .indexOf($scope.filters.searchPayments.toLowerCase()) !==
                                -1) ||
                            (item.amount && String(item.amount).toLowerCase().indexOf(
                                $scope.filters.searchPayments.toLowerCase()) !== -1)
                        )) return true;
                    return false;
                };

                $scope.hideCancelled = function(item) {
                    return item.status !== 'cancelled';
                };

                $scope.showRefundDetails = function(invoice) {
                    $rootScope.showModalFull('/billing/view-refunds-modal.html',
                        invoice.refunds, 'md');
                    // $myModal.openTemplate('/views/billing/view-refunds-modal.html', invoice.refunds, 'md');
                };
            }
        };
    })
    .directive('billingConfigTab', function($rootScope, billingService) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/configuration.html',
            scope: {
                domain: '<',
            },
            link: function($scope, element, attrs) {
                if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                $scope.tips = $rootScope.tips;
                $scope.contactsChanged = false;
                console.log($scope.domain);

                $rootScope.$on('close.view.invoice', function() {
                    $scope.activeInvoice = null;
                });

                $rootScope.$on('close.view.payment', function() {
                    $scope.activePayment = null;
                });

                $scope.billingContacts = billingService.billingContacts;

                $scope.updateContacts = function() {
                    var data = {
                        contacts: $scope.billingContacts,
                        domain_uuid: $scope.domain.domain_uuid
                    };
                    billingService.updateBillingContacts(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.billingContacts = billingService.billingContacts;
                                $scope.contactsChanged = false;
                            }
                        });
                };

                $scope.cancelContactChanges = function() {
                    $scope.billingContacts = billingService.billingContacts;
                    $scope.contactsChanged = false;
                };
            }
        };
    })
    .directive('paymentMethods', function($mdDialog, $myModal, $rootScope, userService,
        billingService, dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/payment-methods.html',
            scope: {
                domain: '<',
                radios: '<'
            },
            link: function($scope, element, attrs) {
                $scope.editingCard = null;
                $scope.tips = $rootScope.tips;
                $scope.newexpiry = {};
                $scope.onescreenBaseUrl = $rootScope.onescreenBaseUrl;

                $scope.isBillingAdminOrGreater = $rootScope.isBillingAdminOrGreater;

                $scope.payment = {
                    selectedPayment: billingService.default,
                    description: null
                };

                billingService.currentPaymentMethod = billingService.default;
                $scope.activeAgency = function() {
                    return billingService.activeAgency;
                };

                $scope.isKotterTechOrGreater = function() {
                    return userService.isKotterTechOrGreater();
                };

                $scope.savedCards = function() {
                    return billingService.savedCards;
                };
                $scope.savedBanks = function() {
                    return billingService.savedBanks;
                };
                $scope.defaultPayment = function() {
                    return billingService.default;
                };

                $scope.changePaymentMethod = function(method) {
                    console.log(method);
                    billingService.currentPaymentMethod = method.selectedPayment;
                    if (method.selectedPayment === 'credit-balance') {
                        $rootScope.$broadcast('credit.balance.selected');
                    } else if (method.selectedPayment.substring(0, 6) === 'custom') {
                        billingService.customDescription = method.description;
                    }
                };

                $scope.changeCustomDescription = function(payment) {
                    billingService.customDescription = payment.description;
                };

                $scope.setAsDefaultPayment = function(id) {
                    var data = {
                        domain_uuid: $scope.domain.domain_uuid,
                        source_id: id
                    };
                    billingService.setDefaultPayment(data)
                        .then(function(response) {

                        });
                };

                $scope.editCard = function(card) {
                    $scope.editingCard = card.id;
                };
                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };
                $scope.showBrand = function(card) {
                    var img;
                    if (card.brand.toLowerCase() === 'visa') img = 'visa.png';
                    if (card.brand.toLowerCase() === 'american express') img =
                        'amex.png';
                    if (card.brand.toLowerCase() === 'mastercard') img =
                        'mastercard.png';
                    if (card.brand.toLowerCase() === 'discover') img = 'discover.png';
                    return img
                };

                $scope.showAddNewCard = function() {
                    $myModal.openTemplate('addcreditcardmodal.html', $scope.domain,
                        'md', '', 'static');
                };

                $scope.showAddBankAccount = function() {
                    $myModal.openTemplate('addbankaccountmodal.html', $scope.domain,
                        'md', '', 'static');
                };

                $scope.showVerifyBankAccount = function(bank) {
                    var data = {
                        domain: $scope.domain,
                        bank: bank
                    };
                    $myModal.openTemplate('verifybankaccountmodal.html', data, 'md', '',
                        'static');
                };

                $scope.cancelEdit = function() {
                    $scope.editingCard = null;
                };

                $scope.saveCard = function(card, newexpiry) {
                    console.log(newexpiry);
                    console.log(card);
                    var spin = {
                        title: 'Updating Card Info'
                    };
                    $rootScope.showModalFull('/modals/workingspinner.html', spin, 'xs');
                    billingService.updateCardExpiry(card, newexpiry, $scope.domain.domain_uuid)
                        .then(function(response) {
                            $uibModalStack.dismissAll();
                            spin = null;
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.cancelEdit();
                            }
                        });
                };

                $scope.removeSource = function(card) {
                    var entity;
                    if (card.object === 'card') entity = card.brand + ' ending in ' +
                        card.last4;
                    if (card.object === 'bank_account') entity = ' bank account';
                    if ((billingService.savedCards.length + billingService.savedBanks.length) ===
                        1) {
                        $rootScope.showErrorAlert(
                            'There must always be one active payment method (bank account or credit card) on the account. If you would like to remove the ' +
                            entity +
                            ' then please add a replacement payment method first.');
                        return;
                    }
                    if (billingService.default === card.id) {
                        $rootScope.showErrorAlert(
                            'You are attempting to remove the default payment method. Please set another payment method as default first.'
                        );
                        return;
                    }

                    var confirmDelete = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent('Are you sure you want to remove this ' + entity +
                            '?')
                        .ariaLabel('Confirm')
                        .ok('Delete')
                        .cancel('Cancel');

                    $mdDialog.show(confirmDelete).then(function() {
                        var spin = {
                            title: 'Deleting '.entity
                        };
                        $rootScope.showModalFull('/modals/workingspinner.html',
                            spin, 'xs');
                        billingService.removeSource(card, $scope.domain.domain_uuid)
                            .then(function(response) {
                                $uibModalStack.dismissAll();
                                spin = null;
                                $rootScope.showalerts(response);
                            });
                    });
                }

                $rootScope.$on('new.card.saved', function() {
                    $uibModalStack.dismissAll();
                });

                $scope.months = [{
                    name: 'January',
                    number: 1
                }, {
                    name: 'February',
                    number: 2
                }, {
                    name: 'March',
                    number: 3
                }, {
                    name: 'April',
                    number: 4
                }, {
                    name: 'May',
                    number: 5
                }, {
                    name: 'June',
                    number: 6
                }, {
                    name: 'July',
                    number: 7
                }, {
                    name: 'August',
                    number: 8
                }, {
                    name: 'September',
                    number: 9
                }, {
                    name: 'October',
                    number: 10
                }, {
                    name: 'November',
                    number: 11
                }, {
                    name: 'December',
                    number: 12
                }];
                var d = new Date();
                var n = d.getFullYear();
                var i;
                $scope.years = [];
                for (i = n; i < n + 15; i += 1) {
                    $scope.years.push(i);
                }
            }
        };
    })
    .directive('addCreditCard', function($mdDialog, $myModal, $rootScope, billingService,
        dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'addcreditcard.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {

                $scope.savedCards = function() {
                    return billingService.savedCards;
                };
                $scope.savedBanks = function() {
                    return billingService.savedBanks;
                };

                dataFactory.getStates()
                    .then(function(response) {
                        $scope.billingStates = response.data;
                        console.log(response.data);
                    });

                $scope.closeModal = function() {
                    $scope.cancel = true;
                    var createConfirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent(
                            'Are you sure you want to cancel? You will lose any changes you have made.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Confirm')
                        .cancel('Cancel');
                    $mdDialog.show(createConfirm).then(function() {
                        $uibModalStack.dismissAll();
                    });
                };

                $scope.handleStripe = function(status, response) {
                    if ($scope.cancel) {
                        $scope.cancel = false;
                        console.log("CANCEL");
                        return;
                    }
                    console.log("HANDLESTRIPE");
                    console.log(response);
                    if (response.error) {
                        // there was an error. Fix it.
                        $rootScope.showErrorAlert(
                            'We were unable to validate your payment information. Please review your information and try again.'
                        );
                        console.log(response.error);
                    } else {
                        $scope.stripe_token = response.id;
                        submitNewCard();
                    }
                };

                function submitNewCard() {
                    var spin = {
                        title: 'Storing New Card'
                    };
                    $rootScope.showModalFull('/modals/workingspinner.html', spin, 'xs');
                    var data = {
                        stripe_token: $scope.stripe_token,
                        domainUuid: $scope.domain.domain_uuid,
                        default: $scope.billing.default ? 'true' : 'false',
                        source_type: 'card'
                    };
                    billingService.sendNewStripeSource(data)
                        .then(function(response) {
                            console.log(response.data);
                            if (response.data.success) {
                                $rootScope.$broadcast('new.card.saved');
                            }
                            $uibModalStack.dismissAll();
                            spin = null;
                            $rootScope.showalerts(response);
                        });
                }

            }
        };
    })
    .directive('addBankAccount', function($mdDialog, $myModal, symphonyConfig, $rootScope,
        billingService, dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'addbankaccount.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                $scope.bank = {
                    account_holder_type: 'company'
                };
                $scope.savedCards = function() {
                    return billingService.savedCards;
                };
                $scope.savedBanks = function() {
                    return billingService.savedBanks;
                };

                $scope.billingStates = billingService.billingStates;

                $scope.closeModal = function() {
                    $scope.cancel = true;
                    var createConfirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent(
                            'Are you sure you want to cancel? You will lose any changes you have made.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Confirm')
                        .cancel('Cancel');
                    $mdDialog.show(createConfirm).then(function() {
                        $uibModalStack.dismissAll();
                    });
                };

                $scope.validateBankInfo = function() {
                    $scope.submittingAccount = 'Storing New Bank Account';
                    Stripe.bankAccount.createToken({
                        country: 'US',
                        currency: 'usd',
                        routing_number: $scope.bank.routing_number,
                        account_number: $scope.bank.account_number,
                        account_holder_name: $scope.bank.account_holder_name,
                        account_holder_type: $scope.bank.account_holder_type
                    }, stripeResponseHandler);
                };

                function stripeResponseHandler(status, response) {
                    if (response.error) { // Problem!
                        $scope.submittingAccount = null;
                        $rootScope.showErrorAlert(response.error.message);
                    } else {
                        var token = response.id;
                        submitNewBank(token);
                    }
                }

                function submitNewBank(token) {
                    var data = {
                        stripe_token: token,
                        domainUuid: $scope.domain.domain_uuid,
                        source_type: 'bank'
                    };
                    billingService.sendNewStripeSource(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $rootScope.$broadcast('new.bank.saved');
                            }
                            $uibModalStack.dismissAll();
                            $scope.submittingAccount = null;
                            $rootScope.showalerts(response);
                        });
                }

            }
        };
    })
    .directive('verifyBankAccount', function($mdDialog, $myModal, symphonyConfig, $rootScope,
        billingService, dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'verifybankaccount.html',
            scope: {
                input: '<'
            },
            link: function($scope, element, attrs) {

                $scope.closeModal = function() {
                    $scope.cancel = true;
                    var createConfirm = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent(
                            'Are you sure you want to cancel? You will lose any changes you have made.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Confirm')
                        .cancel('Cancel');
                    $mdDialog.show(createConfirm).then(function() {
                        $uibModalStack.dismissAll();
                    });
                };

                $scope.sendVerification = function(deposits) {
                    $scope.submittingAccount = 'Verifying your account.';
                    var data = {
                        deposits: [parseInt(parseFloat(deposits.one) * 100.0),
                            parseInt(parseFloat(deposits.two) * 100.0)
                        ],
                        domainUuid: $scope.input.domain.domain_uuid,
                        source_id: $scope.input.bank.id
                    };
                    billingService.verifyBankAccount(data)
                        .then(function(response) {
                            if (response.data.success) {
                                $uibModalStack.dismissAll();
                            }
                            $scope.submittingAccount = null;
                            $rootScope.showalerts(response);
                        });
                };

            }
        };
    })
    .directive('viewRefunds', function($mdDialog, $myModal, symphonyConfig, $rootScope,
        billingService, dataFactory, $filter, $uibModalStack) {
        return {
            restrict: 'E',
            templateUrl: 'view-refunds.html',
            scope: {
                refunds: '<'
            },
            link: function($scope, element, attrs) {
                console.log($scope);
                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };
                $scope.closeThisModal = function() {
                    var top = $uibModalStack.getTop();
                    console.log(top);
                    if (top) {
                        $uibModalStack.dismiss(top.key);
                    }
                };
            }
        };
    })
    .directive('agencyPackage', function($rootScope, $mdDialog, $filter, billingService, packageService, dataFactory) {
        return {
            restrict: 'E',
            templateUrl: 'views/billing/agency-package.html',
            scope: {
                domain: '<'
            },
            link: function($scope, element, attrs) {
                if (!$scope.domain) $scope.domain = $rootScope.user.domain;
                $scope.upgrading = false;
                $scope.showDescription = false;
                $scope.user = function() {
                    return $rootScope.user;
                };

                function init() {
                    $scope.loadingAddons = true;
                    dataFactory.getDomainAddons($scope.domain.domain_uuid)
                        .then(function(response) {
                            if (response.data.success) {
                                $scope.domainAddons = response.data.success.data;
                            } else {
                                $scope.domainAddons = [];
                            }
                            $scope.loadingAddons = false;
                        });
                    billingService.init($scope.domain.domain_uuid);
                }
                init();

                $scope.activeAgency = function() {
                    return billingService.activeAgency;
                };

                $scope.availPackages = function() {
                    return packageService.availPackages;
                };

                $scope.toggleUpgradeOptions = function() {
                    $scope.upgrading = !$scope.upgrading;
                };

                $scope.isTopPackage = function() {
                    var top = true;
                    var current = $rootScope.user.package;
                    angular.forEach(packageService.availPackages, function(pack) {
                        if (pack.level > current.level) top = false;
                    })
                    return top;
                };

                $scope.packageHasAccessToAddon = function(feature) {
                    var check;
                    if (feature === 'cloud_storage') check = 'cloudstorage';
                    if (check) return packageService.packageHasAccess(check);
                    return true;
                };


                $scope.choosePackage = function(pack) {
                    dataFactory.getUpgradeVars($rootScope.user.domain.domain_uuid)
                        .then(function(response) {
                            if (response.data.success) {
                                var info = response.data.success.data.info;
                                console.log(response.data.success.data);
                                var usercount = response.data.success.data.usercount;
                                var per_seatnew = parseFloat(pack.package_price);
                                var per_seatold = parseFloat($rootScope.user.package
                                    .package_price);
                                if ($rootScope.user.groupcode.discount > 0) {
                                    per_seatnew = per_seatnew * parseFloat(1 -
                                        $rootScope.user.groupcode.discount /
                                        100.0);
                                    per_seatold = per_seatold * parseFloat(1 -
                                        $rootScope.user.groupcode.discount /
                                        100.0);
                                } else if ($rootScope.user.groupcode.dollar_discount >
                                    0.0) {
                                    per_seatnew = per_seatnew - $rootScope.user.groupcode
                                        .dollar_discount;
                                    per_seatold = per_seatold - $rootScope.user.groupcode
                                        .dollar_discount;
                                }
                                // var discount = parseFloat(1-$rootScope.user.groupcode.discount/100.0);
                                var diff = per_seatnew - per_seatold;
                                var remain = parseFloat(info.remain) / parseFloat(
                                    info.days);
                                var charge = (parseFloat(usercount) * diff * remain)
                                    .toFixed(2);
                                // var newcost = (parseFloat(pack.package_price) * discount).toFixed(2);
                                // var oldcost = (parseFloat($rootScope.user.package.package_price) * discount).toFixed(2);
                                var createConfirm = $mdDialog.confirm()
                                    .title('Please Confirm')
                                    .htmlContent('A pro-rated charge of $' + charge +
                                        '* will be added to your next monthly bill for this upgrade. You will be charged $' +
                                        per_seatnew +
                                        '/month per user, which includes all taxes. You will also be charged a monthly Compliance and Administrative Cost Recovery Fee (CRF) of $5 per user. Each user in an organization must be on the same pricing plan.<br><span style="font-size: 12px;">*(' +
                                        usercount + ' users x ($' + per_seatnew +
                                        '/user - $' + per_seatold + '/user) x ' +
                                        info.remain +
                                        ' days remaining in this month / ' + info.days +
                                        ' days this month)</span>')
                                    .ariaLabel('Confirm')
                                    .ok('I Agree')
                                    .cancel('Cancel');
                                $mdDialog.show(createConfirm).then(function() {
                                    $scope.showSpinner = true;
                                    dataFactory.postChangeDomainPackage(
                                            pack)
                                        .then(function(response) {
                                            if (response.data.success) {
                                                $rootScope.user.package =
                                                    response.data.success
                                                    .data;
                                                $scope.toggleUpgradeOptions();
                                                $rootScope.showSuccessAlert(
                                                    response.data.success
                                                    .message);
                                            } else {
                                                $rootScope.showErrorAlert(
                                                    'There was an error processing the request. Please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a> for assistance.'
                                                )
                                            }
                                            $scope.showSpinner = false;
                                        });
                                });
                            } else {
                                $rootScope.showErrorAlert(
                                    'There was an error preparing the order. Please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a> for assistance.'
                                )
                            }
                        });

                };

                $scope.availAddons = function() {
                    return packageService.availAddons;
                };

                $scope.chooseAddon = function(addon) {
                    var cost = addon.cost;
                    var totalcost = addon.cost * addon.quantity;
                    var quantity = addon.quantity > 1 ? addon.quantity + ' x ' : '';
                    var confirmAdd = $mdDialog.confirm()
                        .title('Please Confirm')
                        .htmlContent('Please confirm you want to add <strong>' +
                            quantity + addon.title +
                            '</strong> to your package. This will add an additional ' +
                            $filter('currency')(totalcost) + ' to your monthly bill.')
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    var data = {
                        domainUuid: $rootScope.user.domain_uuid,
                        addonUuid: addon.package_addon_uuid,
                        cost: cost,
                        quantity: addon.count
                    };
                    $mdDialog.show(confirmAdd).then(function() {
                        packageService.addAddonToAgency(data)
                            .then(function(response) {
                                $rootScope.showalerts(response);
                                if (response.data.success) {
                                    $scope.domainAddons.push(response.data.success
                                        .data);
                                }
                            });
                    });
                };

                $scope.showPackageCost = function(pack) {
                    var discount = ($rootScope.user.groupcode && $rootScope.user.groupcode
                        .discount) ? parseFloat(1.0 - parseFloat($rootScope.user.groupcode
                        .discount) / 100.0) : 1.0;
                    var per_seat = (parseFloat(pack.package_price) * discount).toFixed(
                        2);
                    return per_seat;
                };

            }
        };
    });
