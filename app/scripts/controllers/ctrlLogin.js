'use strict';

proySymphony.controller('LoginCtrl', function($scope, Idle, $myModal, $cookies, $uibModalStack,
    $mdDialog, $rootScope, $auth, $location, $q, $routeParams, $filter, $window, $http,
    chatMessages, usefulTools, mmApi, dataFactory, __env, symphonyConfig, $timeout,
    smsService, contactGroupsService, packageService, contactService, callService,
    userService, audioLibraryService, musicOnHoldService, metaService, newChatService,
    statusService, greenboxService) {

    if (__env.enableDebug) console.log($window.localStorage);
    $scope.modalTableHeight = $window.innerHeight - 250;
    dataFactory.getStates()
        .then(function(response) {
            $scope.billingStates = response.data;
        });

    $scope.billing = {};
    $scope.billing.package = 'ultimate';

    $scope.currentState = 'loginForm';
    $scope.states = {
        loginForm: {
            possibleStates: ['forgotPassword', 'signUpStep1', 'confirmPass'],
            transitions: {}
        },
        forgotPassword: {
            possibleStates: ['loginForm'],
            transitions: {}
        },
        confirmPass: {
            possibleStates: ['loginForm'],
            transitions: {}
        },
        signUpStep1: {
            possibleStates: ['loginForm', 'signUpStep2'],
            transitions: {}
        },
        signUpStep2: {
            possibleStates: ['loginForm', 'signUpStep1'],
            transitions: {}
        }
    };

    if ($routeParams.action && $routeParams.action === 'logout') {
        if (__env.enableDebug) console.log("LOGGING YOU OUT");
        if (__env.enableDebug) console.log($location.path());

        if (__env.enableVerto && vertoHandleBase) {
            if (__env.enableDebug) console.log("Logging out of Verto");
            vertoHandleBase.logout();
            if (__env.enableDebug) console.log("Verto logout returned");
        }
        if ($auth.isAuthenticated()) {
            $auth.logout();
            statusService.setStatusAndPersist('Offline')
                .then(function(response) {
                    console.log(response);
                    if (response) {

                        var filepath = '';
                        var hsfilepath = '';
                        if ($rootScope.user.greenbox_inboxFP) {
                            filepath = $rootScope.user.greenbox_inboxFP;
                        }
                        if ($rootScope.user.greenbox_hsFP) {
                            hsfilepath = $rootScope.user.greenbox_hsFP;
                        }
                        var data = {
                            token: '',
                            user_ext: $rootScope.user.user_ext,
                            domain_uuid: $rootScope.user.domain_uuid,
                            domain_name: $rootScope.user.domain.domain_name,
                            user_uuid: $rootScope.user.user_uuid,
                            screenshot_frequency: $rootScope.user.tk_screenshot_freq,
                            popupAfterAnswer: ($rootScope.user.popupAfterAnswer && $rootScope.user.popupAfterAnswer == 'true') ? 'true' : null,
                            openScreenPop: ($rootScope.user.openScreenPop && $rootScope.user.openScreenPop == 'true') ? 'true' : null,
                            screenPopPartner: ($rootScope.user.screenPopPartner && $rootScope.user.screenPopPartner == 'true') ? 'true' : null,
                            esl_password: '',
                            inbox_file_path: {
                                path: filepath,
                                status: ''
                            },
                            hs_file_path: {
                                path: hsfilepath,
                                status: ''
                            }
                        }

                        var json = angular.toJson(data);

                        greenboxService.refreshGB(json);

                        $rootScope.logoutMessage =
                            'You have been successfully logged out.';

                        $timeout(function() {
                            var refreshkey = $window.sessionStorage.getItem(
                                "refresh.key");
                            if (refreshkey) {
                                var data = {
                                    refreshkey: refreshkey,
                                    // mmToken: $cookies.get('mmToken'),
                                    vertoToken: $rootScope.vertoToken
                                };
                                dataFactory.postCheckForRefresh(data);
                            }
                            chatMessages.closeSocket();
                            $auth.logout();
                            $rootScope.clearServices();
                        }, 1000, false);
                    }
                });
        }
        $location.search({});
    }

    $timeout(function() {
        // if ($scope.currentState === 'loginForm') angular.element('#loginEmail').focus();
    }, 1000);

    $scope.transition = function(newState) {
        var transition;
        var possibleStates = $scope.states[$scope.currentState].possibleStates;
        if (possibleStates.indexOf(newState) > -1) {
            transition = $scope.states[$scope.currentState].transitions[newState];
            $scope.currentState = newState;
            if (transition) {
                transition();
            }
        }
    };

    $scope.registerTransition = function(transitionFn, startState, endState) {
        $scope.states[startState].transitions[endState] = transitionFn;
    };

    var loginFormToSignUpStep1Transition = function() {
        console.log('login to signup1');
    };
    $scope.registerTransition(loginFormToSignUpStep1Transition, 'loginForm', 'signUpStep1');
    var step1ToStep2Transition = function() {
        // $scope.signUpStep2Style = {'width': '80rem'};
        // angular.element('.panel-primary')[0].style = 'width: 80rem;';
    };
    $scope.registerTransition(step1ToStep2Transition, 'signUpStep1', 'signUpStep2');

    // $window.localStorage.clear();
    var token = $auth.getToken();
    $scope.userToken = token;
    packageService.init();

    $scope.showConfirm = false;
    $scope.showResetPassword = true;
    $scope.showForgotButton = false;

    $scope.showInvalidCredMsg = false;
    $scope.processingSignup = false;
    $scope.hideConfirmPass = true;

    var signupPackage = ($routeParams.package ? $routeParams.package : null);
    var resetToken = ($routeParams.resettoken ? $routeParams.resettoken : '');
    var resetEmail = ($routeParams.resetemail ? $routeParams.resetemail : '');
    var confirmAccount = ($routeParams.confirm ? $routeParams.confirm : '');

    $scope.resetEmail = resetEmail;
    if (confirmAccount != '') {
        $scope.showConfirm = true;
        $scope.showResetPassword = false;
    }
    if (resetToken !== '') {
        $scope.transition('confirmPass');
    }
    if ($location.path().indexOf('/signup') !== -1) {
        if (signupPackage) {
            $scope.billing.package = signupPackage;
            $scope.preselected = true;
        }
        $scope.transition('signUpStep1');
    }

    $rootScope.showModalWithData = function(template, data) {
        $myModal.openTemplate('views' + template, data, '');
    };

    $rootScope.showModalFull = function(template, data, size) {
        $myModal.openTemplate('views' + template, data, size);
    };

    function closeModal() {
        $uibModalStack.dismissAll();
    }

    $scope.changePackage = function() {
        $scope.preselected = false;
    };

    $scope.showPackageInfo = function(name) {
        var pack = packageService.getPackageByName(name);
        $mdDialog.show(
            $mdDialog.alert()
            .clickOutsideToClose(true)
            .title(pack.package_title + ' - $' + parseFloat(pack.package_price).toFixed(
                2))
            .htmlContent(pack.package_description)
            .ariaLabel(pack.package_title)
            .ok('Close')
        );
    };

    $scope.showPackageName = function(name) {
        var pack = packageService.getPackageByName(name);
        if (!pack) return null;
        return pack.package_title;
    };

    $scope.availPackages = function() {
        return packageService.availPackages;
    };

    $scope.getMaxPackage = function() {
        var array = packageService.availPackages;
        var res = Math.max.apply(Math,array.map(function(o){return o.level;}))
        var obj = array.find(function(o){ return o.level == res; });
        return obj.package_name;
    };

    $scope.getPackageCost = function() {
        var discount = $scope.lead.code ? parseFloat($scope.lead.code.discount) : 0.0;
        var brpackage = packageService.getPackageByName($scope.billing.package);
        var price = brpackage.package_price * (1.0 - discount / 100.0);
        return usefulTools.roundNumber(price, 2);
    };

    $scope.getTotalFees = function() {
        // var fees = ($scope.getPackageCost() * (parseFloat($scope.lead.billingfees.universal_service_fee)/100)) + parseFloat($scope.lead.billingfees.recovery_fee);
        var fees = parseFloat($scope.lead.billingfees.recovery_fee);
        return usefulTools.roundNumber(fees, 2);
    };

    $scope.getTotalCharge = function() {
        return $scope.getPackageCost() + $scope.getTotalFees();
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
                    .title('Compliance and Administrative Cost Recovery Fee')
                    .htmlContent(html)
                    .ariaLabel(
                        'Compliance and Administrative Cost Recovery Fee')
                    .ok('Close')
                );
            });
    };

    $scope.forgotPassword = function(email) {
        var data = {
            email: email,
            url_client: (__env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl +
                '/login' : symphonyConfig.symphonyUrl + '/login')
        };
        $scope.show = true;
        dataFactory.forgotPassword(data)
            .then(function(response) {
                $rootScope.showalerts(response);
            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: error
                });
            });
    };
    $scope.resetPassword = function(info) {
        if (!info) {
            $rootScope.showErrorAlert("Password field cannot be empty!");
            return;
        } else if (info.password !== info.password_confirmation) {
            $rootScope.showErrorAlert("Password confirmation doesn't Match!");
            return;
        }

        info.token = resetToken;
        dataFactory.resetPassword(info)
            .then(function(response) {
                $rootScope.showalerts(response);
                $location.path("/login");
            }, function(error) {
                $rootScope.alerts.push({
                    error: true,
                    message: error
                });
            });
    };

    $scope.closeLogout = function() {
        dataFactory.closeTkRecord()
            .then(function(response) {});

        $rootScope.start_timer = false;
        $window.localStorage.setItem("start_timer", JSON.stringify($rootScope.start_timer));

        $rootScope.logoutMessage = ''
    };

    $scope.bridgeLogoHeight = function() {
        if ($scope.currentState === "loginForm" || $scope.currentState ===
            "forgotPassword" || $scope.currentState === "confirmPass") return '200px';
        if ($scope.currentState === "signUpStep1" || $scope.currentState ===
            "signUpStep2") return '125px';
    };

    $scope.handleStripe = function(status, response) {
        if (__env.enableDebug) console.log(response);
        if (response.error) {
            // there was an error. Fix it.
            $rootScope.showErrorAlert(
                'We were unable to validate your payment information. Please review your information and try again.'
            );
            if (__env.enableDebug) console.log(response.error);
        } else {
            // got stripe token, now charge it or smt
            token = response.id;
            $scope.stripe_token = response.id;
            if (__env.enableDebug) console.log(token);
            submitStep2();
        }
    };
    $scope.signup = {};
    $scope.submitStep1 = function(signup) {
        if (!signup.management_app_partner_uuid) {
            angular.forEach($scope.managementSystems, function(partner) {
                if (partner.partner_code == 'generic') {
                    signup['management_app_partner_uuid'] = partner.management_app_partner_uuid;
                }
            });
        }

        usefulTools.getIpInfo()
            .then(function(ipInfo) {
                $scope.ipInfo = ipInfo;
            });

        if (!usefulTools.isPhoneNumber($scope.signup.txtMobile)) {
            $rootScope.showErrorAlert(
                'You must use a valid phone number. Please review and resubmit your request.'
            );
            return;
        }
        $scope.processingSignup = true;
        if ($scope.lead && $scope.lead.firstName === $scope.signup.txtNameGiven &&
            $scope.lead.lastName === $scope.signup.txtNameFamily &&
            $scope.lead.email_address === $scope.signup.txtEmail &&
            $scope.lead.company === $scope.signup.txtCompany &&
            $scope.lead.phone === $scope.signup.txtMobile &&
            $scope.lead.zip === $scope.signup.zipcode &&
            $scope.lead.groupcode === $scope.signup.groupcode) {
            $scope.processingSignup = false;
            $scope.transition('signUpStep2');
        } else {
            if ($scope.lead) $scope.signup.bridge_lead_uuid = $scope.lead.bridge_lead_uuid;
            dataFactory.postSubmitSignup($scope.signup, 'step1')
                .then(function(response) {
                    if (response.data.success) {
                        $scope.lead = response.data.success.data;
                        $scope.processingSignup = false;
                        $scope.processingSignupStep2 = false;
                        $scope.transition('signUpStep2');
                    } else {
                        if (response.data.demo_active) {
                            $rootScope.showErrorAlert(
                                'You are currently running an active demo account. To get a full account setup, please contact a please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a> or by calling 770-717-1777, or clicking “Talk to Support” or “Chat with Support” from within your Bridge Demo account.'
                            );
                        } else {
                            $rootScope.showErrorAlert(response.data.error.message);
                        }
                        $scope.processingSignup = false;
                    }
                });
        }
    };

    $scope.e911Address = {};
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


    $scope.submitDemoSignup = function() {
        $scope.processingDemoSignup = true;
        var d = new Date();
        var n = d.getTimezoneOffset();
        if (__env.enableDebug) console.log("TIMEZONE OFFSET = " + n);

        var tzoffset = n / 60;
        if (usefulTools.isDST()) {
            tzoffset += 1;
        }

        usefulTools.getIpInfo()
            .then(function(ipInfo) {
                $scope.signup.txoffset = tzoffset;
                $scope.signup.ipinfo = ipInfo;
                dataFactory.postCreateNewDemoUser($scope.signup)
                    .then(function(response) {
                        if (__env.enableDebug) console.log(response);
                        $rootScope.showalerts(response);
                        $scope.processingDemoSignup = false;
                    });
            });
    };
    // var tos = angular.element(document.querySelector('#tos'));
    // console.log(tos[0].innerHTML);
    $scope.customerId = null;

    function submitStep2(billingAddress) {
        var tos = angular.element(document.querySelector('#tos'));
        var confirmRead = $mdDialog.confirm()
            .title('Please Confirm')
            .htmlContent(tos[0].innerHTML)
            .ariaLabel('Confirm you agree')
            .ok('Yes, I Agree')
            .cancel('Cancel');
        $mdDialog.show(confirmRead).then(function() {
            $scope.processingSignupStep2 = true;
            var d = new Date();
            var n = d.getTimezoneOffset();
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
                            bridge_lead_uuid: $scope.lead.bridge_lead_uuid,
                            ipinfo: $scope.ipInfo,
                            tzoffset: tzoffset,
                            address_details: addressDetails,
                            customerId: $scope.customerId ? $scope.customerId : null,
                            package: $scope.billing.package
                        };
                        dataFactory.postSubmitSignup(data, 'step2')
                            .then(function(response) {
                                if (response.data.success) {
                                    var html = '<p>' + response.data.success
                                        .message + '</p><br/>' +
                                        '<p> Let us help you add users, set up your voicemail, configure your auto attendant, and further customize Bridge for your agency.</p>';
                                    $rootScope.showAlert(
                                        'Registration and Setup Successful',
                                        html);
                                    //$scope.signupStep1 = response.data.success.data;
                                    $scope.transition('loginForm');
                                    $scope.processingSignupStep2 = false;
                                    $scope.signup = {};
                                    $scope.lead = null;

                                } else {
                                    var error = response.data.error;
                                    if (error.error_code && error.error_code ===
                                        'missing_lead') {
                                        $rootScope.showAlert(
                                            'Registration Failed',
                                            error.message);
                                        $scope.lead = null;
                                        $scope.signup = {};
                                        $scope.transition('SignupStep1');
                                    } else {
                                        var message =
                                            '<p>Your setup was not successful. Please correct the information submitted. </p><p>';
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
                                        $rootScope.showAlert(
                                            'Setup Failed', message);
                                    }
                                    $scope.processingSignupStep2 = false;
                                }
                            });
                    } else {
                        $scope.processingSignupStep2 = false;
                        var google =
                            ' The address needs to be "Geocoded" to be a valid address for E911. You can open <a href="https://maps.google.com" target="_blank">https://maps.google.com</a> and search for your address there to find a properly formatted address.';
                        $rootScope.showErrorAlert(result.data.error.message +
                            google);
                        return;
                    }
                });
        });
    };

    $scope.submitSignup = function() {
        $timeout(function() {
            $scope.hideprocessingSignup = false;
            $scope.hidesignupForm = true;
            $scope.signup.url_client = (__env.symphonyUrl && __env.symphonyUrl !==
                '' ? __env.symphonyUrl + '/login' : symphonyConfig.symphonyUrl +
                '/login');
            var d = new Date()
            var n = d.getTimezoneOffset();

            $scope.signup.tzoffset = n / 60;
            if (usefulTools.isDST()) {
                $scope.signup.tzoffset += 1;
            }


            dataFactory.sendSignup($scope.signup)
                .then(function(response) {

                    if (response.data.error) {
                        $scope.hideprocessingSignup = true;
                        $scope.hidesignupForm = false;
                        $rootScope.alerts.push({
                            error: true,
                            message: response.data.error.message
                        });
                    } else {
                        $scope.hideprocessingSignup = true;
                        $scope.hidesignupForm = true;
                        $scope.hideLoginForm = false;
                        $scope.hideSignUp = true;
                        $rootScope.alerts.push({
                            success: true,
                            message: response.data.success.message
                        });
                    }
                    //alert(JSON.stringify(response, null, 4));
                }, function(error) {
                    $scope.hideprocessingSignup = true;
                    $scope.hidesignupForm = false;
                    $rootScope.alerts.push({
                        error: true,
                        message: error
                    });
                });
        }, 250);
    };
    var loginFailed = function(why) {
        $auth.logout();
        $scope.loginSpinner = false;
        $rootScope.alerts.push({
            error: true,
            message: 'There was a problem with Login - ' + why
        });
        //$location.path('/login');
        return false;
    };
    $scope.loginSpinner = false;

    function getActiveUser() {
        return userService.getUserInfoByUuid()
            .then(function(user) {
                if (!user) {
                    return loginFailed("Retrieving User Profile");
                } else {
                    $rootScope.user = user;
                    metaService.performCallbackCollection(metaService.onRootScopeUserLoadCallbacks);
                    dataFactory.getTimezones()
                        .then(function(result) {
                            $rootScope.timeZones = result.data;
                            $window.localStorage.setItem("timeZones", JSON.stringify(
                                $rootScope.timeZones));
                        });

                    userService.getNumberHistory(user.id);
                    userService.getEmailAddressHistory(user.id);

                    return true;
                }
            }, function(error) {
                return loginFailed("Retrieving User Profile");
            });
    }

    function doChatLogin() {
        return newChatService.login()
            .then(function(result) {
                if (!result) {
                    loginFailed("Performing Chat Login");
                }
                return result;
            });
    }

    function getManagerInfo() {
        /******Check Manager status
         * check if authenticated user is a part of any managing groups and if so
         * build an object containing monitored users and communications to monitor
         */
        return dataFactory.getManagerEmulationStatus()
            .then(function(response) {
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                    return false;
                } else {
                    $rootScope.emulationStatus = response.data.success.data;
                    $window.localStorage.setItem("emulationStatus", JSON.stringify(
                        $rootScope.emulationStatus));
                    return true;
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                return false;
            });
    }

    function showView() {
        Idle.watch();
        $scope.loginSpinner = false;
        $location.path('/main');
    }
    $scope.doProcessLogin = function(credentials) {
        $window.localStorage.setItem('credentials', JSON.stringify(credentials));
        window.location.reload(true);
    };

    $scope.loginUser = function(credentials) {
        $rootScope.clearServices();
        $location.search({});
        $scope.loginSpinner = true;
        var cred = {
            username: $filter('lowercase')(credentials.email),
            password: credentials.password
        };

        $auth.login(cred)
            .then(function(response) {
                if (!response.data.error) {
                    if (!response.data.token || response.data.token == '')
                        loginFailed("Login Failed");
                    $rootScope.userToken = response.data.token;
                    if (__env.enableDebug) console.log("USER TOKEN");
                    if (__env.enableDebug) console.log($rootScope.userToken);
                    $window.localStorage.setItem("userToken", response.data.token);
                    $rootScope.user = {};
                    getActiveUser()
                        .then(function(response) {
                            if (response) {
                                $scope.filepath = '';
                                $scope.hsfilepath = '';
                                if ($scope.user.greenbox_inboxFP) {
                                    $scope.filepath = $scope.user.greenbox_inboxFP;
                                }
                                if ($scope.user.greenbox_hsFP) {
                                    $scope.hsfilepath = $scope.user.greenbox_hsFP;
                                }

                                var data = {
                                    token: $rootScope.userToken,
                                    user_ext: $rootScope.user.user_ext,
                                    domain_uuid: $rootScope.user.domain_uuid,
                                    domain_name: $rootScope.user.domain.domain_name,
                                    user_uuid: $rootScope.user.user_uuid,
                                    screenshot_frequency: $rootScope.user.tk_screenshot_freq,
                                    popupAfterAnswer: ($rootScope.user.popupAfterAnswer && $rootScope.user.popupAfterAnswer == 'true') ? 'true' : null,
                                    openScreenPop: ($rootScope.user.openScreenPop && $rootScope.user.openScreenPop == 'true') ? 'true' : null,
                                    screenPopPartner: ($rootScope.user.screenPopPartner && $rootScope.user.screenPopPartner == 'true') ? 'true' : null,
                                    esl_password: '',
                                    inbox_file_path: {
                                        path: $scope.filepath,
                                        status: ''
                                    },
                                    hs_file_path: {
                                        path: $scope.hsfilepath,
                                        status: ''
                                    },
                                    partner_code: $rootScope.user.exportType
                                        .partner_code
                                }
                                $scope.json = angular.toJson(data);
                                greenboxService.refreshGB($scope.json);

                                contactService.setFirebaseContacts();
                                if ($rootScope.user.status && $rootScope.user.status == 'Offline') {
                                    statusService.setStatusAndPersist("Available");
                                } else {
                                    statusService.doHardStatusUpdate($rootScope.user.status);
                                }
                                contactGroupsService.setGroups();
                                showView();
                            }
                        });
                } else {
                    if (response.status === 401) {
                        $rootScope.alerts.push({
                            error: true,
                            message: ' Invalid Credentials Passed'
                        });
                    } else if (response.data.demo_expired) {
                        $rootScope.alerts.push({
                            error: true,
                            message: 'Your Bridge Demo Account has expired. For questions about Bridge, please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a>. If you would like to try Bridge a little longer please register for a new Demo account at <a href="https://kotter.net/free-demo/" target="_blank">https://kotter.net/free-demo/</a>'
                        });
                    } else if (response.data.disabled) {
                        $rootScope.alerts.push({
                            error: true,
                            message: 'Your account has been disabled. Please contact the company admin to re-enable your account'
                        });
                    } else if (response.data.deleted) {
                        $rootScope.alerts.push({
                            error: true,
                            message: 'This account has been deleted'
                        });
                    }
                    $scope.loginSpinner = false;
                }
                userService.performOnLoadMediaCheck();
            })
            .catch(function(response) {
                $scope.loginSpinner = false;
                if (response.status === 401) {
                    $rootScope.alerts.push({
                        error: true,
                        message: ' Invalid Credentials Passed'
                    });
                }
            });

    };

    if ($window.localStorage.getItem('credentials') && (!$routeParams.action || (
            $routeParams.action && $routeParams.action === 'logout'))) {
        var credentials = JSON.parse($window.localStorage.getItem('credentials'));
        $window.localStorage.removeItem('credentials');
        console.log("DO LOGIN");
        $scope.loginUser(credentials);
    }

    $scope.loadManagementSystems = function() {
        dataFactory.loadManagementSystems()
            .then(function(response) {
                if (response.data.success) {
                    $scope.managementSystems = response.data.success.data;
                }
            });
    }

    $scope.loadManagementSystems();
    /******* Keep this for future reference ... used to create custom mddialog modal.. *****/
    // function DialogController($scope, $mdDialog, $sce, dataFactory) {
    //     $scope.hide = function() {
    //       $mdDialog.hide();
    //     };
    //     $scope.cancel = function() {
    //       $mdDialog.cancel();
    //     };
    //     $scope.dialogClass = 'small-dialog';
    //     dataFactory.getTaxesAndFees()
    //     .then(function(response){
    //         var taxes = response.data.success.data;
    //         $scope.title = 'Taxes and Fees';
    //         $scope.subTitle = null;
    //         var html = '<p><strong>Unversal Service Fee:</strong> '+taxes.universal_service_fee+'%</p>' +
    //         '<p><strong>Unversal Recovery Fee:</strong> '+taxes.recovery_fee+'%</p>';
    //         $scope.body = $sce.trustAsHtml(html);
    //     });
    //   }
    //   function TOSController($scope, $mdDialog) {
    //     $scope.hide = function() {
    //       $mdDialog.hide();
    //     };

    //     $scope.cancel = function() {
    //       $mdDialog.cancel();
    //     };
    //   }

    //   function showAdvanced(ev, controller, template) {
    //     $mdDialog.show({
    //       controller: controller,
    //       templateUrl: template,
    //       parent: angular.element(document.body),
    //       targetEvent: ev,
    //       clickOutsideToClose:true,
    //       fullscreen: $scope.customFullscreen // Only for -xs, -sm breakpoints.
    //     })
    //     .then(function(answer) {
    //       $scope.status = 'You said the information was "' + answer + '".';
    //     }, function() {
    //       $scope.status = 'You cancelled the dialog.';
    //     });
    //   };
});
