'use strict';

proySymphony.service('billingService', function(dataFactory, $filter, usefulTools, $rootScope) {

    var service = {
        savedCards: [],
        savedBanks: [],
        invoices: [],
        payments: [],
        billingHistory: [],
        customer: null,
        billingStates: [],
        default: null,
        activeAgency: {},
        reportsLoaded: []
    };

    service.init = function(domainUuid) {
        if (!domainUuid) domainUuid = $rootScope.user.domain_uuid;
        service.getBillingInfo(domainUuid);
        dataFactory.getStates()
            .then(function(response) {
                service.billingStates = response.data;
            });
    };

    service.getBillingInfo = function(domainUuid) {
        if (!domainUuid) domainUuid = $rootScope.user.domain_uuid;
        return dataFactory.getBillingInfo(domainUuid)
            .then(function(response) {
                console.log("Billing INFO");
                console.log(response.data);
                if (response.data.success) {
                    var data = response.data.success.data;
                    service.savedCards = data.cards;
                    service.savedBanks = data.banks;
                    service.custompayment = data.custompayment;
                    service.invoices = data.invoices;
                    service.payments = data.payments;
                    service.billingHistory = data.history;
                    service.lastPayment = data.lastPayment;
                    service.accountBalance = data.accountBalance;
                    service.customer = data.customer;
                    service.default = data.default;
                    service.billingSettings = data.billingSettings;
                    service.billingContacts = data.billingContacts;
                    service.activeAgency = data;
                    return data;
                }
                return false;
            });
    };

    service.updateAgencyBillingSettings = function(data) {
        if (!data) data = service.activeAgency.billingSettings;
        return dataFactory.postUpdateAgencyBillingSettings(data)
            .then(function(response) {
                console.log(response);
                if (response.data.error) {
                    service.activeAgency = response.data.error.data;
                } else {
                    service.activeAgency = response.data.success.data;
                }
                return response;
            });
    };

    service.updateAgencyBluewave = function(data) {
        return dataFactory.postUpdateAgencyBluewave(data)
            .then(function(response) {
                if (response.data.error) {
                    service.activeAgency = response.data.error.data;
                } else if (response.data.success) {
                    service.activeAgency = response.data.success.data;
                }
                return response;
            });
    };


    service.getAccountSummary = function(domainUuid) {
        if (!domainUuid) domainUuid = $rootScope.user.domain_uuid;
        return dataFactory.getAccountSummary(domainUuid)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    return response.data.success.data;
                }
                return null;
            });
    };

    service.getBillingProps = function() {
        return dataFactory.getTaxesAndFees()
            .then(function(response) {
                service.fees = response.data.success.data;
                return service.fees;
            });
    };

    service.setDefaultPayment = function(data) {
        console.log(data);
        return dataFactory.postSetDefaultPaymentMethod(data)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    service.default = data.source_id;
                    return true;
                } else {
                    return false;
                }
            });
    };

    service.submitPayment = function(data) {
        return dataFactory.postSubmitManualPayment(data)
            .then(function(response) {
                if (response.data.success) {
                    return service.getBillingInfo(service.activeAgency.domain_uuid)
                        .then(function() {
                            return response.data;
                        });
                } else {
                    return response.data;
                }
            });
    };

    service.issueRefund = function(payment, refund, action) {
        var data = {
            invoice_payment_inv_uuid: payment.invoice_payment_inv_uuid,
            refund: refund
        };
        return dataFactory.postIssueRefund(data)
            .then(function(response) {
                if (response.data.success) {
                    return service.getBillingInfo(service.activeAgency.domain_uuid)
                        .then(function() {
                            return response;
                        });
                } else {
                    return response;
                }
            });
    };

    service.cancelInvoice = function(invoice, action) {
        var data = {
            invoiceUuid: invoice.invoice_uuid,
            action: action
        };
        return dataFactory.postCancelInvoice(data)
            .then(function(response) {
                if (response.data.success) {
                    return service.getBillingInfo(service.activeAgency.domain_uuid)
                        .then(function() {
                            return response;
                        });
                } else {
                    return response;
                }
            });
    };

    service.updateBillingContacts = function(data) {
        return dataFactory.postUpdateBillingContacts(data)
            .then(function(response) {
                if (response.data.success) {
                    service.billingContacts = response.data.success.data;
                }
                return response;
            });
    };

    service.updateCardExpiry = function(card, newexpiry, domainUuid) {
        var data = {
            customer: service.customer.id,
            card: card.id,
            exp_month: newexpiry.month,
            exp_year: newexpiry.year,
            domainUuid: domainUuid
        };
        return dataFactory.postUpdateCardExpiry(data)
            .then(function(response) {
                if (response.data.success) {
                    card.exp_month = newexpiry.month;
                    card.exp_year = newexpiry.year;
                }
                return response;
            });
    };

    service.getCardById = function(id) {
        var index = service.getCardIndexById(id);
        if (index !== null) return service.savedCards[index];
        return null;
    };

    service.getCardIndexById = function(id) {
        var input = service.savedCards;
        if (input.length === 0) return null;
        var i = 0,
            len = input.length;
        for (i; i < len; i++) {
            if (input[i].id === id) return i;
        };
        return null;
    };

    service.removeSource = function(card, domainUuid) {
        var data = {
            customer: service.customer.id,
            card: card.id,
            domainUuid: domainUuid
        };
        return dataFactory.postRemoveStripeSource(data)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    if (card.object === 'card') {
                        var index = _.findIndex(service.savedCards, function(item) {
                            return item.id === card.id;
                        });
                        if (index !== null) service.savedCards.splice(index, 1);
                    } else if (card.object === 'bank_account') {
                        var index = _.findIndex(service.savedBanks, function(item) {
                            return item.id === card.id;
                        });
                        if (index !== null) service.savedBanks.splice(index, 1);
                    }
                }
                return response;
            });
    }

    service.sendNewStripeSource = function(data) {
        data.customer = service.customer.id;
        return dataFactory.postAddStripeSource(data)
            .then(function(response) {
                if (response.data.success) {
                    if (data.source_type === 'card') {
                        service.savedCards.push(response.data.success.data);
                    } else if (data.source_type === 'bank') {
                        service.savedBanks.push(response.data.success.data);
                    }
                    if (data.default === 'true') service.default = response.data.success
                        .data.id;
                }
                return response;
            });
    };

    service.verifyBankAccount = function(data) {
        console.log(data);
        data.customer = service.customer.id;
        return dataFactory.postVerifyBankAccount(data)
            .then(function(response) {
                if (response.data.success) {
                    console.log(service.savedBanks);
                    var index = _.findIndex(service.savedBanks, function(bank) {
                        return bank.id === data.source_id;
                    });
                    console.log(index);
                    if (index !== null) service.savedBanks[index].status =
                        'verified';
                }
                return response;
            });
    };

    // service.getBridgePackageOptions = function() {
    //     dataFactory.getPackageOptions()
    //     .then(function(response){
    //         console.log(response);
    //         service.packageOptions = response.data.success.data;
    //     });
    // };

    // service.getBridgePackageAddons = function() {
    //     dataFactory.getPackageAddons()
    //     .then(function(response){
    //         console.log(response);
    //         service.availAddons = response.data.success.data;
    //     });
    // };

    service.savePackageOption = function(option) {
        return dataFactory.postSavePackageOption(option)
            .then(function(response) {
                if (response.data.success) {
                    var index = $filter('getByUUID')(service.packageOptions, option
                        .package_option_uuid, 'package_option');
                    if (index !== null) {
                        service.packageOptions[index] = response.data.success.data;
                    }
                }
                return response;
            });
    };

    service.savePackageAddon = function(addon) {
        return dataFactory.postSavePackageAddon(addon)
            .then(function(response) {
                if (response.data.success) {
                    var index = $filter('getByUUID')(service.availAddons, addon.package_addon_uuid,
                        'package_addon');
                    if (index !== null) {
                        service.availAddons[index] = response.data.success.data;
                    } else {
                        service.availAddons.push(response.data.success.data);
                    }
                }
                return response;
            });
    };

    service.togglePackageStatus = function(pack) {
        return dataFactory.getChangePackageStatus(pack.package_uuid)
            .then(function(response) {
                var index = $filter('getByUUID')(service.availPackages, pack.package_uuid,
                    'package');
                if (response.data.success) {
                    if (index !== null) service.availPackages[index].enabled = pack
                        .enabled;
                } else {
                    if (index !== null) service.availPackages[index].enabled = !
                        pack.enabled;
                }
                return response;
            });
    };

    service.togglePackageOptionStatus = function(option) {
        return dataFactory.getChangePackageOptionStatus(option.package_option_uuid)
            .then(function(response) {
                var index = $filter('getByUUID')(service.packageOptions, option.package_option_uuid,
                    'package_option');
                if (response.data.success) {
                    if (index !== null) service.packageOptions[index].enabled =
                        option.enabled;
                } else {
                    if (index !== null) service.packageOptions[index].enabled = !
                        option.enabled;
                }
                return response;
            });
    };

    service.toggleAddonStatus = function(addon) {
        return dataFactory.getChangeAddonStatus(addon.package_addon_uuid)
            .then(function(response) {
                var index = $filter('getByUUID')(service.availAddons, addon.package_addon_uuid,
                    'package_addon');
                if (response.data.success) {
                    if (index !== null) service.availAddons[index].enabled = addon.enabled;
                } else {
                    if (index !== null) service.availAddons[index].enabled = !addon
                        .enabled;
                }
                return response;
            });
    };

    service.addAddonToAgency = function(data) {
        return dataFactory.postAddAddonToAgency(data)
            .then(function(response) {
                if (response.data.success) {
                    service.changeAddonUseCount(data.addonUuid, true);
                }
                return response;
            });
    };

    service.removeAddonFromAgency = function(package_addon_domain_uuid, domain_uuid) {
        var data = {
            package_addon_domain_uuid: package_addon_domain_uuid,
            domain_uuid: domain_uuid
        };
        return dataFactory.postRemoveAddonFromAgency(data)
            .then(function(response) {
                if (response.data.success) {
                    var addonUuid = response.data.success.data.package_addon_uuid;
                    service.changeAddonUseCount(addonUuid, false);
                }
                return response;
            });
    };

    service.changeAddonUseCount = function(addonUuid, increase) {
        var index = $filter('getByUUID')(service.availAddons, addonUuid,
            'package_addon');
        if (index !== null) service.availAddons[index].usecount += (increase ? 1 : -1);
    };

    service.packageHasAccess = function(option) {
        return $rootScope.user && $rootScope.user.package && $rootScope.user.package.package_options
            .indexOf(option) !== -1;
    };

    service.packageHasAccessToAddon = function(option, packname) {
        var pack = service.getPackageByName(packname);
        if (pack) {
            return pack.package_options.indexOf(option) !== -1;
        }
        return false;
    };

    service.getPackageByName = function(name) {
        var i, input = service.availPackages;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].package_name === name) return input[i];
        }
        return null;
    };

    service.getRequiredPackage = function(option, current) {
        if (current.package_options.indexOf(option) !== -1) return current.package_name;
        var current = service.getNextPackageByLevel(current.level);
        if (!current) return null;
        return service.getRequiredPackage(option, current);
    };

    service.getNextPackageByLevel = function(level) {
        var i, input = service.availPackages;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].level === level && input[i + 1]) return input[i + 1];
        }
        return null;
    };

    service.getFeatureTitle = function(option) {
        var feature = service.getFeatureDetails(option);
        if (feature) return feature.option_title;
        return null;
    };

    service.getFeatureDetails = function(option) {
        var i, input = service.packageOptions;
        for (i = 0; i < input.length; i += 1) {
            if (input[i].option_name === option) return input[i];
        }
        return null;
    };

    service.loadBillingReports = function() {
        return dataFactory.getRecentBillingReports()
            .then(function(response) {
                if (response.data.success) {
                    service.reportsLoaded = response.data.success.data;
                }
                return response;
            });
    };

    service.handleReportUpdate = function(event) {
        var index = $filter('getByUUID')(service.reportsLoaded, event.billing_report_uuid,
            'billing_report');
        if (index !== null) {
            if (service.reportsLoaded[index].report_status === 'pending' && event.report_status ===
                'pending') {
                service.reportsLoaded[index].progress = event.progress;
            } else {
                dataFactory.getBillingReport(event.billing_report_uuid)
                    .then(function(response) {
                        if (response.data.success) {
                            service.reportsLoaded[index] = response.data.success.data;
                        }
                    });
            }
        }
    };

    service.handlePaymentStatusUpdate = function(event) {
        if (service.activeAgency && event.domain_uuid === service.activeAgency.domain_uuid) {
            service.getBillingInfo(event.domain_uuid);
        }
    };



    service.createBillingReport = function(data) {
        console.log(data);
        return dataFactory.postPrepareBillingReport(data)
            .then(function(response) {
                if (response.data.success) {
                    service.reportsLoaded.push(response.data.success.data);
                }
                return response;
            });
    };

    service.cancelBillingReport = function(report) {
        return dataFactory.getCancelBillingReport(report.billing_report_uuid)
            .then(function(response) {
                if (response.data.success) {
                    var index = $filter('getByUUID')(service.reportsLoaded, report.billing_report_uuid,
                        'billing_report');
                    if (index !== null) service.reportsLoaded.splice(index, 1);
                }
                return response;
            })
    };

    service.updateBillingAddress = function(address) {
        return dataFactory.postUpdateBillingAddress(address)
        .then(function(response) {
            if (response.data.success) {
                var result = response.data.success.data;
                var index = $filter('getByUUID')(
                    service.activeAgency.addresses,
                    result.billing_address_uuid, 'billing_address');
                if (index !== null) {
                    service.activeAgency.addresses[index] = result;
                } else {
                    service.activeAgency.addresses.push(result);
                }
            }
            return response;
        });
    };

    service.togglePrimaryAddress = function(address) {
        return dataFactory.getTogglePrimaryBillingAddress(address.billing_address_uuid)
        .then(function(response) {
            if (response.data.success) {
                var domainUuid = address.domain_uuid;
                service.getBillingInfo(domainUuid);
            }
            return response;
        });
    };

    service.deleteBillingAddress = function(address) {
        return dataFactory.getDeleteBillingAddress(address.billing_address_uuid)
        .then(function(response){
            if (response.data.success) {
                var index = $filter('getByUUID')(service.activeAgency.addresses, address.billing_address_uuid, 'billing_address');
                if (index !== null) service.activeAgency.addresses.splice(index, 1);
                var result = response.data.success.data;
                if (result) {
                    index = $filter('getByUUID')(service.activeAgency.addresses, result, 'billing_address');
                    if (index !== null) service.activeAgency.addresses[index].primary = 'true';
                }
            }
            return response;
        });
    };

    service.toggleVoicemail = function(domainUuid) {
        if (!domainUuid) domainUuid = service.activeAgency.domain_uuid;
        return dataFactory.getToggleDomainVoicemails(domainUuid)
        .then(function(response){
            if (response.data.success) {
                if (domainUuid === service.activeAgency.domain_uuid) service.activeAgency.voicemails = response.data.success.data;
                if (domainUuid === $rootScope.user.domain.domain_uuid) $rootScope.user.domain.voicemails = response.data.success.data;
            } else {
                if (domainUuid === service.activeAgency.domain_uuid) service.activeAgency.voicemails = !service.activeAgency.voicemails;
                // if (domainUuid === service.activeAgency.domain_uuid) $rootScope.user.domain.voicemails = !service.activeAgency.voicemails;
            }
            return response;
        });
    }


    // service.init();
    return service;
});
