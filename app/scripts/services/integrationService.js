'use strict';

proySymphony.service('integrationService', function($rootScope, packageService, $window, $sce, $uibModal,
    metaService, $filter, $interval, $timeout, conferenceService, dataFactory, usefulTools, greenboxService,
    contactService, clipboard, $mdDialog) {

    var service = {
        reLoadParkedCalls: false,
        hasApi: ['ams360', 'qqcatalyst'],
        customerProfiles: {}
    };

    var triggerEvent = metaService.withCallbacks(service);

    service.initialize = function() {
        
    };

    service.openContactInManagementSystem = function(phone, contact) {
        if (contact && contact.settings && contact.settings.customer_id) {
            service.openManagementClient(phone, contact.settings.customer_id);
        } else {
            service.findCustomerAndOpenClient(phone);
        }
    };

    service.getCustomerListFromContacts = function(number) {
        var phone = usefulTools.cleanPhoneNumber(number);
        var customerList = [];
        var numbers = contactService.getMultipleContactsByPhoneNumber(phone);
        angular.forEach(numbers, function(contactUuid) {
            var customerDetails = contactService.domainContacts[contactUuid];
            if (customerDetails && customerDetails.settings && customerDetails.settings.customer_id) {
                var integrationUrl = service.getIntegrationUrl(phone, customerDetails.settings.customer_id);
                customerDetails.integrationUrl = integrationUrl;
                customerList.push(customerDetails);
            }
        });
        return customerList;
    };

    service.getCustomerListFromApi = function(number) {
        var phone = usefulTools.cleanPhoneNumber(number);
        var customerList = [];
        var partner = $rootScope.user.exportType.partner_code;
        if (partner == 'ams360') {
            return service.getAmsContactsFromApi(phone, 'basic')
                .then(function(response){
                    return response;
                });
        } else if (partner == 'qqcatalyst') {
            return service.getQqContactsFromApi(phone, 'basic')
                .then(function(response){
                    return response;
                });
        } else {
            return [];
        }
    };

    service.screenpop = function(phone_number, call) {
        var phone = usefulTools.cleanPhoneNumber(phone_number);
        if (phone.length < 10) return;
        var integrationUrl = '';
        var customerList = [];
        var partner = $rootScope.user.exportType.partner_code;
        var openClient = ($rootScope.user.openClient && $rootScope.user.openClient == 'true' || 
                        $rootScope.user.openClientOnAnswer && $rootScope.user.openClientOnAnswer == 'true') ? true : false;
        var openPop = ($rootScope.user.openScreenPop && $rootScope.user.openScreenPop == 'true') ? true : false;
        var afterAns = ($rootScope.user.popupAfterAnswer && $rootScope.user.popupAfterAnswer == 'true') ? true : false;
        var hasPop = (openPop || afterAns) && (partner !== 'hawksoft' || (partner == 'hawksoft' && $rootScope.user.screenPopBridge && $rootScope.user.screenPopBridge === 'true'));
        var popped = false;
        if (hasPop || openClient)  {
            var contacts = contactService.getMultipleContactsByPhoneNumber(phone);
            var hasIntegration = false;
            angular.forEach(contacts, function(customerDetails) {
                // var customerDetails = contactService.getContactByUuid(contactUuid);
                if (customerDetails && customerDetails.type !== 'user') {
                    // var customerId = (customerDetails.settings && customerDetails.settings.customer_id) ? customerDetails.settings.customer_id : null;
                    var customerId = customerDetails.pid ? customerDetails.pid : null;
                    var integrationUrl = service.getIntegrationUrl(phone, customerId);
                    
                    var customer = mapThinContactData(customerDetails);
                    if (integrationUrl) {
                        customer.integrationUrl = integrationUrl;
                        hasIntegration = true;
                    }
                    customerList.push(customer);
                }
            });
            if (hasPop && customerList.length>0) {
                popped = true;
                showScreenPop(phone, customerList);
            } else if (hasPop && service.hasApi.indexOf(partner) === -1) {
                console.log('show empty pop');
                showScreenPop(phone, null);
                popped = true;
            }
            if (openClient && hasIntegration && customerList.length>0) openClientWindow(phone, customerList);
        }
        if ((hasPop && customerList.length === 0) || (openClient && (customerList.length === 0 || (!hasIntegration && customerList.length>0)))) {
            if (partner === 'ams360') {
                if ((hasPop && !popped) || openClient) {
                    service.getAmsContactsFromApi(phone, 'basic')
                    .then(function(response){
                        customerList = response;
                        if (hasPop && !popped) showScreenPop(phone, response);
                        if (openClient) openClientWindow(phone, customerList);
                    });
                }
            } else if (partner === 'qqcatalyst') {
                if ((hasPop && !popped) || openClient) {
                    service.getQqContactsFromApi(phone, 'basic')
                    .then(function(response){
                        customerList = response;
                        if (hasPop && !popped) showScreenPop(phone, response);
                        if (openClient) openClientWindow(phone, customerList);
                    });
                }
            } else {
                if (hasPop && !popped) showScreenPop(phone, null);
                if (openClient) openClientWindow(phone, null);
            }
        }
    };

    function openClientWindow(phone, customerList) {
        if (customerList && customerList.length == 1) {
            var integrationUrl = customerList[0].integrationUrl;
            $window.open(integrationUrl, '_blank');
        } else {
            processCustomerSearch(customerList, phone);
        }
    }

    service.openManagementClient = function(phone, id) {
        var integrationUrl = service.getIntegrationUrl(phone, id);
        $window.open(integrationUrl, '_blank');
    };

    service.findCustomerAndOpenClient = function(phone) {
        var partner = $rootScope.user.exportType.partner_code;
        console.log(phone);
        if (partner == 'ams360') {
            service.getAmsContactsFromApi(phone, 'basic')
                .then(function(response){
                    console.log(response);
                    processCustomerSearch(response, phone);
                });
        } else if (partner == 'qqcatalyst') {
            service.getQqContactsFromApi(phone, 'basic')
                .then(function(response){
                    processCustomerSearch(response, phone);
                });
        } else {
            service.openManagementClient(phone, null);
        }
    };

    service.loadFullInfo = function(contact, phone) {
        var partner = $rootScope.user.exportType.partner_code;
        var customerId = contact.settings.customer_id;
        if (!customerId) return false;
        if (partner == 'ams360') {
            return service.getFullAmsCustomerInfo(customerId, phone)
                .then(function(response){
                    return response;
                });
        } else if (partner == 'qqcatalyst') {
            return service.getFullQqCustomerInfo(customerId, phone)
                .then(function(response){
                    return response;
                });
        }
    }

    service.getFullAmsCustomerInfo = function(customer_id, phone) {
        console.log(customer_id);
        return dataFactory.getFullAmsCustomerInfo(customer_id, $rootScope.user.domain_uuid)
        .then(function(response){
            console.log(response);
            if (response.data.success) {
                var data = [ response.data.success.data[0].data ];
                console.log(data);
                var customerList = mapAmsDataToContactData(data, phone);
                console.log(customerList);
                return customerList[0];
            } else {
                return null;
            }
        });
    };

    service.getFullQqCustomerInfo = function(entity_id, phone) {
        return dataFactory.getFullQqCustomerInfo(entity_id)
        .then(function(response){
            console.log(response);
            if (response.data) {
                var data = [ response.data ];
                console.log(data);
                var customerList = mapQqDataToContactData(data, phone);
                console.log(customerList);
                return customerList[0];
            } else {
                return null;
            }
        });
    };

    function processCustomerSearch(customerList, phone) {
        console.log(customerList);
        if (customerList && customerList.length > 0) {
            if (customerList.length === 1) {
                var customer_id = (customerList[0].settings && customerList[0].settings.customer_id) ? customerList[0].settings.customer_id : null;
                service.openManagementClient(phone, customer_id);
            } else if (customerList.length > 1) {
                getUserConfirmContact(customerList, phone);
            }
        } else {
            getUserConfirmContact(null, phone);
            // var message = 'We are unable to locate a customer id for this contact. ';
            // $rootScope.showAlert(message);
        }
    }

    function getUserConfirmContact(response, phone) {
        var data = {
            phone: phone, 
            customerList: response,
            onSelectCustomer: onSelectCustomer,
            closeThisModal: closeModal,
            
        };
        if (!response) {
            var integrationUrl = service.getIntegrationUrl(phone, null);
            data.integrationUrl = integrationUrl;
        }
        $rootScope.showModalWithData('/modals/getcustomer.html', data);
    }

    function closeModal() {
        $rootScope.closeThisModal();
    }

    function onSelectCustomer(data, contact) {
        var phone = data.phone;
        var customerId = contact.settings.customer_id;
        closeModal();

        service.openManagementClient(phone, customerId);
    }

    function showScreenPop(phone, customerList) {
        if ($rootScope.newwindow) $rootScope.newwindow.close();
        var url = __env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl + '/screenpop' : $rootScope.symphonyUrl + '/screenpop';
        $rootScope.newwindow = $window.open(url, '', 'height=460,width=465,screenX=600,screenY=200');
        openPopUp($rootScope.newwindow, onBlock);
        if (!customerList || customerList.length === 0) {
            var integrationUrl = service.getIntegrationUrl(phone, null);
            $rootScope.newwindow.integrationUrl = integrationUrl; 
        } else {
            $rootScope.newwindow.customerList = customerList;
        }

        console.log(customerList);
        $rootScope.newwindow.phone = phone;
        $rootScope.newwindow.user = $rootScope.user;
        $rootScope.newwindow.userToken = $rootScope.userToken;
        
        if (window.focus) {
            $rootScope.newwindow.focus()
        }
    }

    service.getAmsContactsFromApi = function(phone, type) {
        if (type && type == 'basic') {
            return dataFactory.getAms360BasicCustomerInfo(phone, $rootScope.user.domain_uuid)
            .then(function(response){
                console.log(response);
                if (response.data[0] && response.data[0].message === 'Success') {
                    var data = response.data[0].data;
                    var customerList = mapAmsDataToContactData(data, phone);
                    return customerList;
                } else {
                    return [];
                }
            });
        } else {
            return dataFactory.ams360ScreenPop(phone, $rootScope.user.domain_uuid)
            .then(function(response){
                console.log(response);
                if (response.data[0] && response.data[0].message === 'Success') {
                    var data = response.data[0].data;
                    var customerList = mapAmsDataToContactData(data, phone);
                    return customerList;
                } else {
                    return [];
                }
            });
        }
    };

    service.getQqContactsFromApi = function(phone, type) {
        if (type && type == 'basic') {
            return dataFactory.getQqBasicCustomerInfo(phone)
            .then(function(response){
                console.log(phone);
                console.log(response);
                if (response.data) {
                    var data = response.data;
                    var customerList = mapQqDataToContactData(data, phone, type);
                    return customerList;
                } else {
                    return [];
                }
            });
        } else {
            return dataFactory.qqCatalystCustomerInfo(phone)
            .then(function(response){
                if (response.data) {
                    var data = response.data;
                    var customerList = mapQqDataToContactData(data, phone);
                    return customerList;
                } else {
                    return [];
                }
            });
        }
    };

    service.getSearchAmsContacts = function(search) {
        var data = {
            domain_uuid: $rootScope.user.domain_uuid,
            prefix: search
        };
        return dataFactory.postSearchAmsContactsByPrefix(data)
            .then(function(response) {
                if (response.data.success) {
                    var contacts = mapAmsDataToContactData(response.data.success.data);
                    return contacts;
                }
            });
    };

    service.getSearchQqContacts = function(search) {
        var data = {
            domain_uuid: $rootScope.user.domain_uuid,
            prefix: search
        };
        return dataFactory.postSearchQqContactsByPrefix(data)
            .then(function(response) {
                console.log(response.data);
                if (response.data) {
                    var contacts = mapQqDataToContactData(response.data);
                    return contacts;
                }
                return [];
            });
    };

    service.handleAutomaticExport = function(call) {
        if ($rootScope.showExport === false) return;
        var activityList = greenboxService.ams360ActivityList;
        var contact = contactService.theContact(call);
        var partner = $rootScope.user.exportType.partner_code;
        if (call.caller_id_number.length < 10 && call.destination_number.length < 10) return;
        if (partner === 'ams360') {
            if (activityList.length != 0) {
                angular.forEach(activityList, function(activity) {
                    if (activity.Description.includes('phone')) {
                        call['activity'] = activity.Description;
                        return;
                    }
                });
            }
            call['type'] = "callRecords";
            call['number'] = usefulTools.cleanPhoneNumber(
                call.call_direction == 'inbound' ? call.caller_id_number : call.destination_number
            );
            console.log(call);
            $rootScope.copyToAms360(call);
        } else if (partner === 'qqcatalyst') {
            call['type'] = "callRecords";
            call['number'] = usefulTools.cleanPhoneNumber(
                call.call_direction == 'inbound' ? call.caller_id_number : call.destination_number
            );
            $rootScope.copyToQQCatalyst(call);
        } else {
            call.user_uuid = $rootScope.user.id;
            call.extension_uuid = $rootScope.user.extension.extension_uuid;
            call['type'] = "callHistory";
            call['number'] = usefulTools.cleanPhoneNumber(
                call.call_direction == 'inbound' ? call.caller_id_number : call.destination_number
            );
            service.copyEntityToPartner(call);
        }
        
    };



    service.getIntegrationUrl = function(phone, customer_id) {
        var integrationUrl;
        if ($rootScope.user.exportType.partner_code == 'ams360') {
            var version = $rootScope.user.domain.integration_settings.version ? $rootScope.user.domain.integration_settings.version : 'v1712522';
            if (customer_id) { 
                integrationUrl = "https://www.ams360.com/" + version + "/NextGen/Customer/Detail/" + customer_id;
            } else {
                // integrationUrl = "https://www.ams360.com/" + version + "/NextGen/Customer";
                integrationUrl = null;
            }
        } else if ($rootScope.user.exportType.partner_code == 'qqcatalyst') {
            if (customer_id) {
                integrationUrl = "https://app.qqcatalyst.com/Contacts/Customer/Details/" + customer_id;
            } else if (phone) {
                integrationUrl = "https://app.qqcatalyst.com/Contacts/Search#contact=" + phone + "&type=Contact"
            } else {
                integrationUrl = null;
            }
        } else if ($rootScope.user.exportType.partner_code == 'agencymatrix') {
            integrationUrl = "https://agents.agencymatrix.com/customer/search/phone/" + phone;
        } else if ($rootScope.user.exportType.partner_code == 'ezlynx') {
            integrationUrl = "https://app.ezlynx.com/applicantportal/search/index?searchPhrase=" + phone;
        } else if ($rootScope.user.exportType.partner_code == 'e-agent') {
            integrationUrl = "https://eagent1.allstate.com/main.aspx?phone=" + phone;
        }
        return integrationUrl;
    };

    service.copyEntityToPartner = function(entity) {
        var partner = $rootScope.user.exportType.partner_code;
        var toFile = $rootScope.user.copyExportToFile;
        var copyType = (toFile && toFile == 'true') ? 'file' : 'text';
        if (copyType === 'file') {
            var filePath = $rootScope.user.greenbox_inboxFP;
            var hsPath = $rootScope.user.greenbox_hsFP;
            if ((partner === 'hawksoft' && (hsPath || filePath)) || partner !== 'hawksoft' && filePath) {
                var data = entity;
                if (entity.type === "callRecordings") {
                    data = prepareFileCallExport(entity, 'recording');
                } else if (entity.type==='voicemail' || entity.type === 'voicemail-info') {
                    data = prepareVoicemailExport(entity);
                }
                service.copyToHawksoft(data);
            } else {
                $rootScope.showErrorAlert('Your integration settings are set to export data to a File but you have not specified the folder to store the file to.');
            }
        } else {
            return dataFactory.postCopyToPartnerByText(entity)
            .then(function(response){
                if (response.data.success) {
                    var data = {
                        message: response.data.success.data,
                        entity: entity
                    };
                    $rootScope.showModalWithData('/modals/copy-partner-export.html', data);
                }
                return response;
            });
        }
    };

    service.copyToHawksoft = function(data) {
        var info = {
            uuid: data.uuid,
            call_history_fs_uuid: data.call_history_fs_uuid ? data.call_history_fs_uuid : null,
            user_uuid: $rootScope.user.id,
            domain_uuid: $rootScope.user.domain_uuid,
            domain_name: $rootScope.user.domain.domain_name,
            partner: $rootScope.user.exportType.partner_code
        };
        if (data.type === 'voicemail' || data.type === 'history-voicemail') {
            // info.uuid = data.visual_voicemail_uuid;
            dataFactory.postHSCopyVoicemail(info)
                .then(function(response) {
                    console.log(response);
                    $rootScope.showalerts(response);
                }, function(error) {
                    console.log(error);
                    $rootScope.showErrorAlert(
                        "There was a problem while trying to connect to the system"
                    );
                });

        } else if (data.type === 'history-recording' || data.type === 'recording') {
            dataFactory.postHSCopyRecording(info)
                .then(function(response) {
                    console.log(response);
                    $rootScope.showSuccessAlert("Your Call Recording was copied.");
                }, function(error) {
                    console.log(error);
                });
        } else if (data.type === 'videoconference' || data.type === 'screenshare') {
            dataFactory.postHSCopyVideoConference(info)
                .then(function(response) {
                    $rootScope.showSuccessAlert("Your conference recording was copied.");
                }, function(error) {
                    console.log(error);
                });
        } else if (data.type === 'voicemail-info') {
            // info.uuid = data.visual_voicemail_uuid;
            dataFactory.postHSCopyVoicemailInfo(info)
                .then(function(response) {
                    $rootScope.showSuccessAlert("Your voicemail-info was copied.");
                }, function(error) {
                    console.log(error);
                });
        } else if (data.type === 'callHistory') {

            dataFactory.postHSCopyCall(info)
            .then(function(response) {
                $rootScope.showSuccessAlert("Call History record was copied.");
            }, function(error) {
                console.log(error);
            });
        } else if (data.type === 'chat') {
            dataFactory.postHSCopyChatMessages(data)
            .then(function(response) {
                $rootScope.showSuccessAlert(array.length +
                    " Chat Plus messages were copied.");
                if (__env.enableDebug) console.log(response);
                return true;
            }, function(error) {
                if (__env.enableDebug) console.log(error);
                return false;
            });
        } else if (data.type === 'fax') {
            dataFactory.postCopyFaxToManagementSystem(data)
            .then(function(response) {
                $rootScope.showSuccessAlert("Fax entry was copied.");
            }, function(error) {
                console.log(error);
            });
        } else if (data.type === 'fileshare') {
            dataFactory.postHSCopyFileshare(data)
            .then(function(response) {
                $rootScope.showSuccessAlert("File was copied.");
            }, function(error) {
                console.log(error);
            });
        }
    };

    function prepareVoicemailExport(call) {
        console.log(call);
        return {
            uuid: call.visual_voicemail_uuid,
            type: call.type
        };
    };

    function prepareFileCallExport(call) {
        var partner = $rootScope.user.exportType.partner_code;
        return {
            call_history_fs_uuid: call.call_history_fs_uuid,
            uuid: call.onescreen_uuid,
            type: 'recording',
            partner: partner
        };
    }

    function mapThinContactData(contact) {
        var c = { settings: {} };
        c.contact_uuid = contact.cuuid;
        c.contact_type = contact.type;
        c.contact_name_full = contact.name;
        if (contact.pid) c.settings.customer_id = contact.pid;
        c.isBasic = true;
        if (contact.Email) c.contact_email_address = contact.em;
        if (contact.BusinessName) c.contact_organization = contact.org;
        angular.forEach(contact.nums, function(num){
            if (num.lab == 'Mobile' && num.num) c.contact_mobile_phone = num.num;
            if (num.lab == 'Home' && num.num) c.contact_home_phone = num.num;
            if (num.lab == 'Work' && num.num) c.contact_work_phone = num.num;
            if (num.lab == 'Fax' && num.num) c.contact_fax_phone = num.num;
        });
        return c;
    };

    function mapQqDataToContactData(data, phone, type) {
        var contacts = [];
        angular.forEach(data, function(contact){
                var c = { settings: {}};
                c.contact_type = 'qqcontact';
                c.contact_name_full = contact.FirstName + ' ' + contact.LastName;
                c.settings.customer_id = contact.EntityID;
                if (type && type=='basic') c.isBasic = true;
                if (contact.Email) c.contact_email_address = contact.Email;
                if (contact.Line1) c.settings.contact_address = contact.Line1;
                if (contact.City) c.settings.contact_city = contact.City;
                if (contact.State) c.settings.contact_state = contact.State;
                if (contact.Zip) c.settings.contact_zip_code = contact.Zip;
                if (contact.BusinessName) c.contact_organization = contact.BusinessName;
                if (contact.PhoneType === 'Cell') c.contact_mobile_phone = contact.Phone;
                if (contact.PhoneType === 'Home') c.contact_home_phone = contact.Phone;
                if (contact.PhoneType === 'Work') c.contact_work_phone = contact.Phone;
                if (contact.PhoneType === 'Cell') c.contact_fax_phone = contact.Phone;
                if (contact.policies && 
                    contact.policies.length > 0) {
                    var policies = [];
                    angular.forEach(contact.policies, function(policy){
                        policies.push({
                            policy_csr_info: policy.AgentName,
                            policy_number: policy.PolicyNumber,
                            policy_type: policy.LOB,
                            policy_effective_date: policy.EffectiveDate,
                            policy_expiry_date: policy.ExpirationDate
                        });
                    });
                    c.policies = policies;
                }
                var integrationUrl = service.getIntegrationUrl(phone, contact.EntityID);
                c.integrationUrl = integrationUrl;
                contacts.push(c);
        });
        return contacts;
    }

    function mapAmsDataToContactData(data, phone) {
        var contacts = [];
        angular.forEach(data, function(contact){
            var det = contact.customer_details ? contact.customer_details : contact;
            if (det) {
                var c = { settings: {}};
                c.contact_type = 'amscontact';
                c.contact_name_full = det.FirstName + ' ' + det.LastName;
                c.settings.customer_id = det.CustomerId;
                if (contact.isBasic) c.isBasic = contact.isBasic;
                if (det.AddressLine1) c.settings.contact_address = det.AddressLine1;
                if (det.City) c.settings.contact_city = det.City;
                if (det.State) c.settings.contact_state = det.State;
                if (det.ZipCode) c.settings.contact_zip_code = det.ZipCode;
                if (det.DoingBusinessAs) c.contact_organization = det.DoingBusinessAs;
                if (det.FirmName) c.contact_organization = det.FirmName;
                if (det.DateOfBirth) c.contact_dob = det.DateOfBirth;
                if (det.BusinessPhone && det.BusinessAreaCode) c.contact_work_phone = det.BusinessAreaCode + det.BusinessPhone;
                if (det.FaxPhone && det.FaxAreaCode) c.contact_fax_phone = det.FaxAreaCode + det.FaxPhone;
                if (det.HomePhone && det.HomeAreaCode) c.contact_home_phone = det.HomeAreaCode + det.HomePhone;
                if (det.CellPhone && det.CellAreaCode) c.contact_mobile_phone = det.CellAreaCode + det.CellPhone;
                if (contact.policy_list && 
                    contact.policy_list.PolicyInfo && 
                    contact.policy_list.PolicyInfo.length > 0) {
                    var policies = [];
                    angular.forEach(contact.policy_list.PolicyInfo, function(policy){
                        policies.push({
                            policy_csr_info: policy.csr_list,
                            policy_number: policy.PolicyNumber,
                            policy_type: policy.PolicySubType == 'P' ? 'Personal' : 'Commercial',
                            policy_effective_date: policy.PolicyEffectiveDate,
                            policy_expiry_date: policy.PolicyExpirationDate
                        });
                    });
                    c.policies = policies;
                }
                var integrationUrl = service.getIntegrationUrl(phone, det.CustomerId);
                c.integrationUrl = integrationUrl;
                contacts.push(c);
            }
        });
        return contacts;
    }

    function onBlock(e) {
        var templateUrl = "views/timeclockpro/enablePopUp.html";
        $rootScope.popupImgSrc = $rootScope.onescreenBaseUrl + "/popup.png";
        var promise = $rootScope.customPrompt(templateUrl, $rootScope);
        $rootScope.hidePrompt = function() {
            $mdDialog.hide(promise);
        };
    }

    function openPopUp(newWindow, onBlock) {
        try {
            newWindow.focus();
        } catch (e) {
            if (onBlock) {
                onBlock();
            }
        }
    }

    $rootScope.tempObjectForApplied = [{
            'FirstName': 'Alicia',
            'LastName': 'Casias',
            'Email': 'lvaldes@affbcpa.com',
            'CompanyName': 'Fernandez Bergnes & Associates',
            'Phone': '6783867422',
            'PolicyInfo': [{
                'CSR': 'James Ray',
                'PolicyNumber': '234534',
                'PolicyType': 'Life & Health'
            }]
        },
        {
            'FirstName': 'Jed',
            'LastName': 'Angell',
            'Email': 'auffard@nationwide.com',
            'CompanyName': 'Auffarth & Assoc',
            'Phone': '4106670080',
            'PolicyInfo': [{
                'CSR': 'Callie',
                'PolicyNumber': '787846',
                'PolicyType': 'Personal'
            }]
        },
        {
            'FirstName': 'Ann',
            'LastName': 'Swift',
            'Email': 'Aschutt@thecampbellgrp.com',
            'CompanyName': 'Campbell Group',
            'Phone': '6165411500',
            'PolicyInfo': [{
                'CSR': 'Bill',
                'PolicyNumber': '997733',
                'PolicyType': 'Auto'
            }]
        },
        {
            'FirstName': 'Claudia',
            'LastName': 'Rathbun',
            'Email': 'doug@axfordsmi.com',
            'CompanyName': 'Axford Agency',
            'Phone': '3083842580',
            'PolicyInfo': [{
                'CSR': 'Jese',
                'PolicyNumber': '509933',
                'PolicyType': 'Life & Health'
            }]
        },
        {
            'FirstName': 'Bruce',
            'LastName': 'Bahnson',
            'Email': 'rschunk@capspecialty.com',
            'CompanyName': 'Capitol Indemnity Corporation',
            'Phone': '7707171777',
            'PolicyInfo': [{
                'CSR': 'Debbie',
                'PolicyNumber': '342222',
                'PolicyType': 'Business'
            }]
        },
        {
            'FirstName': 'David',
            'LastName': 'Brantley',
            'Email': 'carl@metroplex-realty.com',
            'CompanyName': 'Carl Azbell Metroplex Realty, LLC',
            'Phone': '4695489758',
            'PolicyInfo': [{
                'CSR': 'Diane',
                'PolicyNumber': '356643',
                'PolicyType': 'Personal'
            }]
        },
        {
            'FirstName': 'Arpy',
            'LastName': 'Seferian',
            'Email': 'ed@candsins.com',
            'CompanyName': 'Cavallo & Signoriello',
            'Phone': '5088241386',
            'PolicyInfo': [{
                'CSR': 'Brian',
                'PolicyNumber': '767644',
                'PolicyType': 'Business'
            }]
        },
        {
            'FirstName': 'Bruce',
            'LastName': 'Bulman',
            'Email': 'crobinson@carolinabank.net',
            'CompanyName': 'Cb & T Financial Services',
            'Phone': '8433988415',
            'PolicyInfo': [{
                'CSR': 'Meg',
                'PolicyNumber': '221144',
                'PolicyType': 'Dental'
            }]
        },
        {
            'FirstName': 'Neil',
            'LastName': 'Vaughn',
            'Email': 'ellen@whittchiro.com',
            'CompanyName': 'Whitt Chiropractic Clinic',
            'Phone': '2058711888',
            'PolicyInfo': [{
                'CSR': 'Janelle',
                'PolicyNumber': '788666',
                'PolicyType': 'Life & Health'
            }]
        },
        {
            'FirstName': 'Neha',
            'LastName': 'Vibhute',
            'Email': 'neha@kotter.net',
            'CompanyName': 'The Kotter Group',
            'Phone': '7624992403',
            'PolicyInfo': [{
                'CSR': 'Charlie',
                'PolicyNumber': '543455',
                'PolicyType': 'Dental'
            }, {
                'CSR': 'Janelle',
                'PolicyNumber': '788666',
                'PolicyType': 'Life & Health'
            }]
        }
    ];

    return service;
});
