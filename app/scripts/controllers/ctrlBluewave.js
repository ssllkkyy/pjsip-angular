'use strict';

proySymphony.controller('BlueWaveCtrl', function($scope, $http, $sce, $mdDialog, fileService,
    $cookies, $routeParams, packageService, customerGroupCodeService, FileUploader,
    $interval, $auth, __env, dataFactory, usefulTools, symphonyConfig, $window, $rootScope) {

    if (__env.enableDebug) console.log("ROUTEPARAMS");
    if (__env.enableDebug) console.log($routeParams);

    if ($routeParams.custKey || $routeParams.urlCode) {
        $scope.showNoHash = false;
        $scope.messages = [];
        $scope.contactInfo = {
            firstName: null,
            lastName: null,
            emailAddress: null,
            company: null,
            rememberMe: false
        };
        $scope.e911Address = {};
        $scope.billing = {};
        $scope.display = {
            type: null,
            card: true,
            bank: false
        };
        $scope.bank = {

        };

        dataFactory.getStates()
            .then(function(response) {
                $scope.billingStates = response.data;
            });

        if ($routeParams.urlCode) {

            dataFactory.getCodeDetails($routeParams.urlCode)
                .then(function(response) {
                    console.log(response.data);
                    if (response.data.success) {
                        var result = response.data.success.data;
                        if (result.url_type === 'billing-bankverify') {
                            $scope.agencyInfo = result;
                            $scope.display.type = result.url_type;
                        }
                    } else {
                        $scope.displayError =
                            'We were unable to locate information about the requested code. Please check your link and try again.';
                    }
                });
        } else if ($routeParams.custKey) {
            getAgencySummary();
        }

        function getAgencySummary(key) {
            if (!key && $routeParams.custKey) key = $routeParams.custKey;
            dataFactory.getBluewaveAgencyInfo(key)
                .then(function(response) {
                    $scope.display.type = 'bluewave';
                    if (response.data.success) {
                        if (__env.enableDebug) console.log(response.data.success.data);
                        $scope.agencyInfo = response.data.success.data;
                        if ($scope.agencyInfo.e911) {
                            $scope.e911Address.address1 = $scope.agencyInfo.e911.address;
                            $scope.e911Address.community = $scope.agencyInfo.e911.city;
                            $scope.e911Address.state = $scope.agencyInfo.e911.state;
                            $scope.e911Address.postalcode = $scope.agencyInfo.e911.zipcode;
                            $scope.billing.address1 = $scope.agencyInfo.e911.address;
                            $scope.billing.community = $scope.agencyInfo.e911.city;
                            $scope.billing.state = $scope.agencyInfo.e911.state;
                            $scope.billing.postalcode = $scope.agencyInfo.e911.zipcode;
                        }
                        if ($scope.agencyInfo.customer &&
                            $scope.agencyInfo.customer.sources &&
                            $scope.agencyInfo.customer.sources.data &&
                            $scope.agencyInfo.customer.sources.data.length > 0) {
                            $scope.display.completed = true;
                            $scope.display.card = false;
                        }
                        console.log($scope.billing);
                        console.log($scope.e911Address);
                    } else {
                        $scope.displayError = response.data.error.message;
                    }
                });
        }

        usefulTools.getIpInfo()
            .then(function(ipInfo) {
                $scope.ipInfo = ipInfo;
            });

        $scope.showBrand = function(card) {
            var img;
            if (card.brand.toLowerCase() === 'visa') img = 'visa.png';
            if (card.brand.toLowerCase() === 'american express') img = 'amex.png';
            if (card.brand.toLowerCase() === 'mastercard') img = 'mastercard.png';
            if (card.brand.toLowerCase() === 'discover') img = 'discover.png';
            return img
        };

        $scope.showVerifyBank = function(source) {
            $scope.display.verify = true;
            $scope.agencyInfo.source = source;
            $scope.display.type = 'billing-bankverify';
            $scope.agencyInfo.stripe_cust = $scope.agencyInfo.customer.id;
        };

        $scope.loadAgencySummary = function() {
            var key = $routeParams.custKey ? $routeParams.custKey : ($scope.agencyInfo ?
                $scope.agencyInfo.billingSettings.blue_cust_key : null);
            if (key) {
                getAgencySummary(key);
            } else {
                $rootScope.showInfoAlert('There is not an active public key for ' +
                    $scope.agencyInfo.domain_description + '.');
            }
        };

        $scope.changeInformation = function() {
            //potentially include this method if requested...
        };

        $scope.agencySources = function() {
            if ($scope.agencyInfo.customer.sources && $scope.agencyInfo.customer.sources
                .data) {
                return $scope.agencyInfo.customer.sources.data;
            }
            return [];
        };

        $scope.verifyBankDeposits = function(deposits) {
            $scope.showError = null;
            $scope.submittingAccount = 'Verifying your account.';
            var data = {
                deposits: [parseInt(parseFloat(deposits.one) * 100.0), parseInt(
                    parseFloat(deposits.two) * 100.0)],
                domainUuid: $scope.agencyInfo.domain_uuid,
                source_id: $scope.agencyInfo.source.id,
                customer: $scope.agencyInfo.stripe_cust
            };
            console.log(data);
            dataFactory.postVerifyBankAccountBluewave(data)
                .then(function(response) {
                    if (response.data.success) {
                        $scope.showSuccess = true;
                    } else {
                        $scope.showError = response.data.error.message;
                    }
                    $scope.submittingAccount = null;
                });
        };

        $scope.monthyInvoice = function() {
            var total = 0.0;
            if ($scope.agencyInfo && $scope.agencyInfo.billing && $scope.agencyInfo.registeredUsers) {
                var pack = $scope.agencyInfo.package;
                var code = $scope.agencyInfo.groupcode;
                var recovery = parseFloat($scope.agencyInfo.billingProps.recovery_fee);
                if (pack && code) {
                    var numUsers = $scope.agencyInfo.registeredUsers.length;
                    var per_seat = parseFloat(pack.package_price);
                    if (code.discount > 0) {
                        per_seat = per_seat * (100 - parseFloat(code.discount)) / 100.0;
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
            if ($scope.agencyInfo && $scope.agencyInfo.billingProps && $scope.agencyInfo
                .registeredUsers) {
                var recovery = parseFloat($scope.agencyInfo.billingProps.recovery_fee);
                if (recovery) {
                    var numUsers = $scope.agencyInfo.registeredUsers.length - 1;
                    total = numUsers * recovery;
                }
            }
            return total;
        };

        $scope.packagePrice = function() {
            if ($scope.agencyInfo && $scope.agencyInfo.billing) {
                var pack = $scope.agencyInfo.package;
                var code = $scope.agencyInfo.groupcode;
                if (pack && code) {
                    var per_seat = parseFloat(pack.package_price);
                    if (code.discount > 0) {
                        per_seat = per_seat * (100 - parseFloat(code.discount)) / 100.0;
                    } else if (code.dollar_discount) {
                        per_seat = per_seat - code.dollar_discount
                    }
                    return per_seat;
                }
            }
            return null;
        };

        $scope.handleStripe = function(status, response) {
            $scope.submittingAccount = 'Processing Request';
            if (__env.enableDebug) console.log(response);
            if (response.error) {
                $rootScope.showErrorAlert(
                    'We were unable to validate your payment information. Please review your information and try again.'
                );
                if (__env.enableDebug) console.log(response.error);
            } else {
                $scope.stripe_token = response.id;
                submitCreditCardUpdate();
            }
        };

        $scope.getStep2FormInputValue = function(ngModelName) {
            var form = angular.element('[name="Step2"]');
            var number = form.find('input[ng-model="' + ngModelName + '"]')[0];
            return number ? number.value : null;
        };
        $scope.getAddressInfo = function() {
            var addressInfo;
            if ($scope.e911Address.billingSameAsCompanyAddress) {
                addressInfo = $scope.billing;
            } else {
                addressInfo = $scope.e911Address;
            }
            return addressInfo;
        };

        $scope.validateBankInfo = function() {
            $scope.submittingAccount = 'Processing Request';
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
                $scope.showError = response.error.message;
            } else {
                $scope.stripe_token = response.id;
                submitCreditCardUpdate();
            }
        }


        function submitCreditCardUpdate() {
            $scope.showError = null;
            var tos = angular.element(document.querySelector('#tos'));
            var confirmRead = $mdDialog.confirm()
                .title('Please Confirm')
                .htmlContent(tos[0].innerHTML)
                .ariaLabel('Confirm you agree')
                .ok('Yes, I Agree')
                .cancel('Cancel');
            $mdDialog.show(confirmRead).then(function() {
                $scope.processing = true;
                var d = new Date();
                var n = d.getTimezoneOffset();
                if (__env.enableDebug) console.log("TIMEZONE OFFSET = " + n);

                var tzoffset = n / 60;
                if (usefulTools.isDST()) {
                    tzoffset += 1;
                }
                var addressDetails = $scope.getAddressInfo();
                var data = {
                    address_details: addressDetails
                };
                dataFactory.postValidateE911Address(data)
                    .then(function(result) {

                        if (__env.enableDebug) console.log("VALIDATION RESULT");
                        if (__env.enableDebug) console.log(result);
                        if (result.data.success) {
                            var data = {
                                stripe_token: $scope.stripe_token,
                                domainUuid: $scope.agencyInfo.domain_uuid,
                                ipinfo: $scope.ipInfo,
                                tzoffset: tzoffset,
                                address_details: addressDetails,
                                source_type: $scope.display.bank ? 'bank' : 'card'
                            };

                            dataFactory.postSubmitBluewavePaymentDetails(data)
                                .then(function(response) {
                                    if (response.data.success) {

                                        var html =
                                            'Account verification is done via two small deposits into the bank account. These deposits will take 1-2 business days to appear on your online statement. The statement description for these deposits will be AMNTS: and then the values of the two microdeposits that were sent. Once you see those, you will need to come back here and verify the account.';
                                        // var html = '<p>'+ response.data.success.message +'</p><br/>' +
                                        // '<p> Let us help you add users, set up your voicemail, configure your auto attendant, and further customize Bridge for your agency.</p><br/>' +
                                        // '<p><a href="https://calendly.com/kotter/customize" target="_blank" class="btn btn-success btn-sm">Schedule a customization call</a></p>';
                                        // $rootScope.showAlert('Payment and Registration Successful', html);
                                        //$scope.signupStep1 = response.data.success.data;
                                        // $scope.transition('loginForm');
                                        $scope.processing = false;
                                        $scope.showSuccess = true;
                                    } else {
                                        if (__env.enableDebug) console.log(
                                            response.data.error.data);
                                        var error = response.data.error;
                                        var message =
                                            '<p>We were unable to validate your information. Please verify the information submitted or use a different card. </p><p>';
                                        if (error.data && error.data.response) {
                                            message +=
                                                '<strong>Error: </strong>' +
                                                error.data.response.error.message;
                                            $scope.customerId = error.data.stripe_customer;
                                        }
                                        if (error.message) message +=
                                            '<strong>Error: </strong>' +
                                            error.message;
                                        message +=
                                            '</p><p>If the problem persists please contact customer support at (770) 717-1777.</p>';
                                        // $rootScope.showAlert('Payment Failed', message);
                                        $scope.showError = $sce.trustAsHtml(
                                            message);
                                        $scope.processing = false;
                                    }
                                    $scope.submittingAccount = null;
                                });
                        } else {
                            $scope.submittingAccount = null;
                            $scope.processing = false;
                            var google =
                                ' The address needs to be "Geocoded" to be a valid address for E911. You can open <a href="https://maps.google.com" target="_blank">https://maps.google.com</a> and search for your address there to find a properly formatted address.';
                            $scope.showError = $sce.trustAsHtml(result.data.error
                                .message + google);
                        }
                    });
            });
        };

        $scope.setBank = function() {
            $scope.display.card = false;
            $scope.display.bank = true;
            console.log($scope.display);
        };

        $scope.setCard = function() {
            $scope.display.card = true;
            $scope.display.bank = false;
            console.log($scope.display);
        };

        $scope.showTOS = function() {
            var tos = angular.element(document.querySelector('#tos'));
            $mdDialog.show(
                $mdDialog.alert()
                .clickOutsideToClose(true)
                .title('Terms of Service')
                .htmlContent(tos[0].innerHTML)
                .ariaLabel('Terms of Service')
                .ok('Close')
            );
        };

        $scope.showTaxes = function() {
            dataFactory.getTaxesAndFees()
                .then(function(response) {
                    var taxes = response.data.success.data;
                    // var html = '<p><strong>Federal Universal Service Recovery Fee:</strong> '
                    //  + 'This fee is used to recover contributions The Kotter Group is required to make to the federal Universal Service Fund, which provides support to promote access to telecommunications services at reasonable rates for those living in rural and high-cost areas, income-eligible consumers, rural health care facilities, and schools and libraries. The Kotter Group is permitted, but not required, to recover these costs from its customers. The Federal Communications Commission (FCC) sets the applicable USF rate on a quarterly basis, and it is subject to change.</p>'

                    var html =
                        '<p>Kotter Group Compliance and Administrative Cost Recovery Fee (“CRF”) is a fee that The Kotter Group charges in order to recover the various costs and expenses that it incurs in connection with:</p>' +
                        '<ol type="i"><li>complying with legal, regulatory, and other requirements, including without limitation federal, state, and local reporting and filing requirements;</li>' +
                        '<li>responding to subpoenas, civil investigation demands, and other official requests, and otherwise assisting with official investigations;</li>' +
                        '<li>reporting and managing payments to third-party telecommunications services providers; and</li>' +
                        '<li>acquiring and protecting intellectual property, including without limitation through the filing and maintenance of patents, trademarks, and other proprietary rights.</li></ol>' +
                        '<p>CRF fee is not a tax, nor is it mandated by any level of government or government agency.</p>';
                    $mdDialog.show(
                        $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title(
                            'Compliance and Administrative Cost Recovery Fee')
                        .htmlContent(html)
                        .ariaLabel(
                            'Compliance and Administrative Cost Recovery Fee')
                        .ok('Close')
                    );
                });
        };

    } else {
        $scope.showNoHash = true;
    }
});
