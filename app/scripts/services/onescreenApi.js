'use strict';

proySymphony.factory('dataFactory', ['$http', '__env', 'symphonyConfig', '$window', '$rootScope',
    '$location', '$q',
    function($http, __env, symphonyConfig, $window, $rootScope, $location, $q) {

        var urlBase = (__env.apiUrl && __env.apiUrl !== '' ? __env.apiUrl : symphonyConfig.onescreenUrl);
        var dataFactory = {};

        function getConfig() {
            var config = '';
            if ($rootScope.userToken && $rootScope.userToken != '') {
                config = {
                    headers: {
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    }
                };
            } else if ($window.localStorage.getItem("userToken") && $window.localStorage.getItem(
                    "userToken") != '') {
                $rootScope.userToken = $window.localStorage.getItem("userToken");
                config = {
                    headers: {
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    }
                };
            }
            return config;
        }

        function getUploadConfig() {
            var config = '';
            if ($rootScope.userToken && $rootScope.userToken != '') {
                config = {
                    headers: {
                        'Content-Type': undefined,
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    },
                    transformRequest: angular.identity
                };
            } else if ($window.localStorage.getItem("userToken") && $window.localStorage.getItem(
                    "userToken") != '') {
                $rootScope.userToken = $window.localStorage.getItem("userToken");
                config = {
                    headers: {
                        'Content-Type': undefined,
                        'Authorization': 'Bearer ' + $rootScope.userToken
                    },
                    transformRequest: angular.identity
                };
            }
            return config;
        }

        dataFactory.getLanguages = function() {
            return $http.get(urlBase + '/info/languages');
        };
        dataFactory.getStates = function() {
            return $http.get(urlBase + '/info/states');
        };
        dataFactory.getTimezones = function() {
            return $http.get(urlBase + '/info/timezones');
        };
        dataFactory.getTaxesAndFees = function() {
            return $http.get(urlBase + '/info/taxesandfees');
        };
        dataFactory.postCheckForRefresh = function(data) {
            return $http.post(urlBase + '/user/checkrefresh', data, getConfig());
        };
        dataFactory.postSendRefresh = function(data) {
            return $http.post(urlBase + '/user/sendrefresh', data);
        };
        dataFactory.loadManagementSystems = function() {
            return $http.get(urlBase + '/info/managementsystems');
        };


        //User Signup
        dataFactory.postSubmitSignup = function(data, step) {
            return $http.post(urlBase + '/user/signup/' + step, data);
        };

        dataFactory.postCreateNewDemoUser = function(data) {
            return $http.post(urlBase + '/user/demo/signupuser', data);
        };

        dataFactory.getLead = function(uuid) {
            return $http.get(urlBase + '/user/get/lead/' + uuid);
        };

        dataFactory.getAutoCallRecordingLink = function(uuid) {
            return $http.get(urlBase + '/call/recordings/getautolink/' + uuid,
                getConfig());
        };
        dataFactory.getVideoArchiveUrl = function(uuid) {
            return $http.get(urlBase + '/videoconference/recording/getlink/' + uuid,
                getConfig());
        };


        //User Routes
        dataFactory.getActiveUser = function(userUuid) {
            if (userUuid) {
                return $http.get(urlBase + '/user/info/' + userUuid, getConfig());
            } else {
                return $http.get(urlBase + '/user/info', getConfig());
            }
        };

        dataFactory.getUpgradeVars = function(domainUuid) {
            return $http.get(urlBase + '/user/getupgradevars/' + domainUuid, getConfig());
        };
        dataFactory.postChangeDomainPackage = function(data) {
            return $http.post(urlBase + '/user/changedomainpackage', data, getConfig());
        };
        dataFactory.getPackageByUuid = function(packageUuid) {
            return $http.get(urlBase + '/user/getpackage/' + packageUuid, getConfig());
        };


        dataFactory.getPhoneNumberHistory = function(userUuid) {
            return $http.get(urlBase + '/user/getnumberhistory/' + userUuid, getConfig());
        };
        dataFactory.getEmailAddressHistory = function(userUuid) {
            return $http.get(urlBase + '/user/getemailaddresshistory/' + userUuid,
                getConfig());
        };
        dataFactory.addPhoneOrEmailToHistory = function(data) {
            return $http.post(urlBase + '/user/addtophoneemailhistory', data, getConfig());
        };

        dataFactory.getUserInfos = function(domainUuid) {
            return $http.get(urlBase + '/user/userinfos/' + domainUuid, getConfig());
        };
        dataFactory.getRawUserInfos = function(domainUuid) {
            return $http.get(urlBase + '/user/userinfos/raw/' + domainUuid, getConfig());
        };

        dataFactory.deleteBridgeUser = function(data) {
            return $http.post(urlBase + '/admin/deleteuser', data, getConfig());
        };
        dataFactory.getDeleteDemoUser = function(uuid) {
            return $http.get(urlBase + '/user/deletedemouser/' + uuid, getConfig());
        };
        dataFactory.getHardDeleteUser = function(uuid) {
            return $http.get(urlBase + '/user/harddeleteuser/' + uuid, getConfig());
        };
        dataFactory.deleteBridgeDomain = function(data) {
            return $http.post(urlBase + '/admin/deleteagency', data, getConfig());
        };
        dataFactory.postToggleAgencyStatus = function(data) {
            return $http.post(urlBase + '/admin/toggleagencystatus', data, getConfig());
        };

        dataFactory.postSendChatNotice = function(data) {
            return $http.post(urlBase + '/user/sendchatnotice', data, getConfig());
        };

        dataFactory.getRefreshToken = function() {
            return $http.get(urlBase + '/api/token', getConfig());
        };
        dataFactory.changeUserAvatar = function(file) {
            return $http.post(urlBase + '/user/change-picture', file, getUploadConfig());
        };
        dataFactory.getDeleteUserAvatar = function(uuid) {
            return $http.get(urlBase + '/user/remove-picture/' + uuid, getUploadConfig());
        };
        dataFactory.deleteAvatar = function(user_uuid) {
            return $http.get(urlBase + '/user/delete-avatar/' + user_uuid,
                getUploadConfig());
        };
        dataFactory.getSymphonyProfilebyMattermostId = function(mmId) {
            return $http.get(urlBase + '/user/chat/getprofilebymmid/' + mmId, getConfig());
        };
        dataFactory.getMattermostUserIdByUserUUID = function(uuid) {
            return $http.get(urlBase + '/user/chat/getmmidbyuuid/' + uuid, getConfig());
        };
        dataFactory.updateStatus = function(data) {
            return $http.post(urlBase + '/user/updatestatus', data, getConfig());
        };
        dataFactory.putUpdateSetting = function(data) {
            return $http.put(urlBase + '/user/updatesetting', data, getConfig());
        };
        dataFactory.forgotPassword = function(data) {
            return $http.post(urlBase + '/password/useemail', data);
        };
        dataFactory.getResetToken = function(userUuid) {
            if (!userUuid) {
                userUuid = $rootScope.user.id;
            }
            return $http.get(urlBase + '/user/getpasstoken/' + userUuid);
        };
        dataFactory.getChatPass = function() {
            return $http.get(urlBase + '/user/chat/getpass', getConfig());
        };
        dataFactory.createChatFavorite = function(userUuid, channelId) {
            return $http.get(urlBase + '/user/chat/createchatfavorite/' + userUuid +
                '/' +
                channelId, getConfig());
        };
        dataFactory.deleteChatFavorite = function(chatFavoriteUuid) {
            return $http.get(urlBase + '/user/chat/deletechatfavorite/' +
                chatFavoriteUuid,
                getConfig());
        };
        dataFactory.getUserChatFavorites = function(userUuid) {
            return $http.get(urlBase + '/user/chat/getuserfavorites/' + userUuid,
                getConfig());
        };

        dataFactory.resetPassword = function(data) {
            return $http.post(urlBase + '/password/reset', data);
        };
        dataFactory.doUserCreation = function(data) {
            return $http.post(urlBase + '/user/create', data, getConfig());
        };
        dataFactory.postInitiateUserImport = function(data) {
            return $http.post(urlBase + '/users/import', data, getConfig());
        };
        dataFactory.addFmFm = function(data) {
            return $http.post(urlBase + '/user/addfmfm', data, getConfig());
        };
        dataFactory.getToggleGreenboxStatus = function(status) {
            return $http.get(urlBase + '/user/greenboxstatus/' + status, getConfig());
        };
        dataFactory.getToggleGreenboxStatus = function(status) {
            return $http.get(urlBase + '/user/greenboxstatus/' + status, getConfig());
        };
        dataFactory.getSetNotificationsStatus = function(value, userUuid) {
            if (!userUuid) {
                userUuid = $rootScope.user.id;
            }
            return $http.get(urlBase + '/user/setnotifications/' + value + '/' +
                userUuid,
                getConfig());
        };
        dataFactory.getSetCallWaitingStatus = function(value, userUuid) {
            if (!userUuid) {
                userUuid = $rootScope.user.id;
            }
            return $http.get(urlBase + '/user/setcallwaiting/' + value + '/' + userUuid,
                getConfig());
        };
        dataFactory.postSetOutOfOfficeStatus = function(data) {
            return $http.post(urlBase + '/user/setoutofoffice', data, getConfig());
        };
        dataFactory.postSetOutOfOfficeResponse = function(data) {
            return $http.post(urlBase + '/user/setoooresponse', data, getConfig());
        };
        dataFactory.postSetTextSignatureStatus = function(data) {
            return $http.post(urlBase + '/user/settextsignature', data, getConfig());
        };
        dataFactory.postSetTextSignatureResponse = function(data) {
            return $http.post(urlBase + '/user/settextsignresponse', data, getConfig());
        };
        dataFactory.getNotificationsStatus = function(userUuid) {
            if (!userUuid) {
                userUuid = $rootScope.user.id;
            }
            return $http.get(urlBase + '/user/getnotificationstatus/' + userUuid,
                getConfig());
        };
        // RAB
        dataFactory.transferCall = function(fsDomainBase, callID, targetNumber) {
            console.log(fsDomainBase, callID, targetNumber);
            return $http.get(urlBase + '/rab/attxfer/' + fsDomainBase + '/' + callID +
                "/" + targetNumber);
        };

        //Billing Routes
        // dataFactory.postAddStripePayment = function(data) {
        //     return $http.post(urlBase + '/payment/addpayment', data, getConfig());
        // };
        dataFactory.getBillingInfo = function(domain_uuid) {
            return $http.get(urlBase + '/billing/getinfo/' + domain_uuid, getConfig());
        };
        dataFactory.getAccountSummary = function(domain_uuid) {
            return $http.get(urlBase + '/billing/getsummary/' + domain_uuid, getConfig());
        };
        dataFactory.getDeleteBillingAddress = function(uuid) {
            return $http.get(urlBase + '/billing/deleteaddress/' + uuid, getConfig());
        };
        dataFactory.getTogglePrimaryBillingAddress = function(uuid) {
            return $http.get(urlBase + '/billing/toggleprimaryaddress/' + uuid, getConfig());
        };
        dataFactory.postUpdateBillingAddress = function(data) {
            return $http.post(urlBase + '/billing/updateaddress', data, getConfig());
        };
        dataFactory.postUpdateCardExpiry = function(data) {
            return $http.post(urlBase + '/billing/cardexpiry', data, getConfig());
        };
        dataFactory.postAddStripeSource = function(data) {
            return $http.post(urlBase + '/billing/addsource', data, getConfig());
        };
        dataFactory.postVerifyBankAccount = function(data) {
            return $http.post(urlBase + '/billing/verifybank', data, getConfig());
        };
        dataFactory.getDeleteAccountCredit = function(uuid) {
            return $http.get(urlBase + '/billing/removeaccountcredit/' + uuid,
                getConfig());
        };
        dataFactory.postCreateAccountCredit = function(data) {
            return $http.post(urlBase + '/billing/addaccountcredit', data, getConfig());
        };
        dataFactory.postSetDefaultPaymentMethod = function(data) {
            return $http.post(urlBase + '/billing/setdefault', data, getConfig());
        };
        dataFactory.getDomainInfo = function(domainUuid) {
            return $http.get(urlBase + '/billing/getdomaininfo/' + domainUuid,
                getConfig());
        };
        dataFactory.postUpdateBillingContacts = function(data) {
            return $http.post(urlBase + '/billing/savecontacts', data, getConfig());
        };
        dataFactory.postSubmitManualPayment = function(data) {
            return $http.post(urlBase + '/billing/submitmanualpayment', data, getConfig());
        };
        dataFactory.postRemoveStripeSource = function(data) {
            return $http.post(urlBase + '/billing/removesource', data, getConfig());
        };
        dataFactory.postIssueRefund = function(data) {
            return $http.post(urlBase + '/billing/issuerefund', data, getConfig());
        };
        dataFactory.postCancelInvoice = function(data) {
            return $http.post(urlBase + '/billing/cancelinvoice', data, getConfig());
        };

        //NumberSetup
        dataFactory.getNumberSetupInfo = function(domain_uuid) {
            return $http.get(urlBase + '/company/numbersetupinfo/' + domain_uuid,
                getConfig());
        };
        dataFactory.getTollfreeNumberSetup = function(domain_uuid) {
            return $http.get(urlBase + '/company/tfnumbersetup/' + domain_uuid,
                getConfig());
        };
        dataFactory.postGetAvailableTollfreeDids = function(data) {
            return $http.post(urlBase + '/company/getavailabletfdids', data, getConfig());
        };
        dataFactory.postOrderTollFreeNumbers = function(data) {
            return $http.post(urlBase + '/company/ordertollfree', data, getConfig());
        };
        dataFactory.getDeleteTollFreeNumber = function(bandwidth_number_uuid) {
            return $http.get(urlBase + '/company/tfnumber/delete/' +
                bandwidth_number_uuid, getConfig());
        };
        dataFactory.postRetrieveTollfreeCallHistory = function(data) {
            return $http.post(urlBase + '/company/tollfree/getminutes', data, getConfig());
        };

        //Contacts Routes
        dataFactory.getUserContactsOnly = function(domainUuid, userUuid) {
            if (!domainUuid) domainUuid = $rootScope.user.domain_uuid;
            if (!userUuid) userUuid = $rootScope.user.id;
            return $http.get(urlBase + '/user/usercontacts/' + domainUuid + '/' +
                userUuid, getConfig());
        };
        dataFactory.postUpdateContactRingtone = function(data) {
            return $http.post(urlBase + '/user/usercontacts/ringtones', data, getConfig());
        };
        dataFactory.postDeleteContactRingtone = function(data) {
            return $http.post(urlBase + '/user/contact/delete/ringtone', data,
                getConfig());
        };
        dataFactory.postSearchContactIndex = function(data, full) {
            if (full) return $http.post(urlBase + '/contacts/searchindex/full', data, getConfig());
            return $http.post(urlBase + '/contacts/searchindex', data, getConfig());
        };
        dataFactory.getFullContactIndex = function() {
            return $http.get(urlBase + '/contacts/fullindex', getConfig());
        };
        dataFactory.postGetContacts = function(data) {
            return $http.post(urlBase + '/user/contacts', data, getConfig());
        };

        dataFactory.usingJoins = function() {
            return $http.get(urlBase + '/user/contacts/keithtest', getConfig());
        };

        dataFactory.postSearchContacts = function(data) {
            return $http.post(urlBase + '/user/contacts/search', data, getConfig());
        };
        dataFactory.getSearchBasicContactPhones = function(data) {
            return $http.post(urlBase + '/user/contacts/basicsearch/phone', data,
                getConfig());
        };
        dataFactory.postSearchBasicContactEmails = function(data) {
            return $http.post(urlBase + '/user/contacts/basicsearch/email', data,
                getConfig());
        };
        dataFactory.getAllBasicContacts = function(userUuid) {
            return $http.get(urlBase + '/user/contacts/basic/' + userUuid, getConfig());
        };
        dataFactory.updateCallHistoryContact = function(data) {
            return $http.post(urlBase + '/user/contacts/basicsearch/email', data,
                getConfig());
        };
        dataFactory.getContactUuidByNumber = function(phone, userUuid) {
            return $http.get(urlBase + '/user/contact/byphone/' + phone + '/' +
                userUuid, getConfig());
        };
        dataFactory.getContactUuidByEmail = function(email, userUuid) {
            return $http.get(urlBase + '/user/contact/byemail/' + email + '/' +
                userUuid, getConfig());
        };
        dataFactory.getUpdateFavorite = function(contact_uuid) {
            return $http.get(urlBase + '/user/contact/favorite/' + contact_uuid,
                getConfig());
        };
        dataFactory.getContact = function(contact_uuid) {
            return $http.get(urlBase + '/user/contact/' + contact_uuid, getConfig());
        };
        dataFactory.postNewUserContact = function(data) {
            return $http.post(urlBase + '/user/contact/new', data, getConfig());
        };
        dataFactory.postCheckForDuplicateNumber = function(data) {
            return $http.post(urlBase + '/user/contact/checkforduplicate', data,
                getConfig());
        };
        dataFactory.postImportUserContacts = function(data) {
            return $http.post(urlBase + '/user/contacts/import', data, getConfig());
        };
        dataFactory.postReceiveContactImport = function(data) {
            return $http.post(urlBase + '/user/contacts/createimport', data, getConfig());
        };
        dataFactory.postProcessContactImport = function(data) {
            return $http.post(urlBase + '/user/contacts/processimport', data, getConfig());
        };
        dataFactory.getDeleteUserContact = function(contact_uuid) {
            return $http.get(urlBase + '/user/contact/delete/' + contact_uuid,
                getConfig());
        };
        dataFactory.postDeleteMultipleContacts = function(data) {
            return $http.post(urlBase + '/user/contact/deletemultiple', data, getConfig());
        };
        dataFactory.postUpdateContactInfo = function(data) {
            return $http.post(urlBase + '/user/contact/update', data, getConfig());
        };
        dataFactory.postUpdateContactPhone = function(phone) {
            return $http.post(urlBase + '/user/contact/update-phone', phone, getConfig());
        };
        dataFactory.getPolicies = function(contactUuid) {
            return $http.get(urlBase + '/user/contact/getpolicies/' + contactUuid, getConfig());
        };
        dataFactory.postUpdatePolicies = function(phone) {
            return $http.post(urlBase + '/user/contact/updatepolicies', phone, getConfig());
        };
        dataFactory.deleteContactPhone = function(phone_uuid) {
            return $http.get(urlBase + '/user/contact/delete-phone/' + phone_uuid,
                getConfig());
        };
        dataFactory.deletePolicyInfo = function(policy_uuid) {
            return $http.get(urlBase + '/user/contact/delete-policy/' + policy_uuid, getConfig());
        };
        dataFactory.postUpdateContactColor = function(data) {
            return $http.post(urlBase + '/user/contact/update-color', data, getConfig());
        };
        dataFactory.postSubmitCustomFilter = function(data) {
            return $http.post(urlBase + '/contacts/customfiltersearch', data, getConfig());
        };

        dataFactory.getSymphonyProfilebyMMID = function(mmId) {
            return $http.get(urlBase + '/user/chat/getprofilebymmid/' + mmId, getConfig());
        };
        dataFactory.postCheckIfContactHashExists = function(data) {
            return $http.post(urlBase + '/user/contact/hashexists', data, getConfig());
        };

        //Contact Group Routes
        dataFactory.postNewContactGroup = function(data) {
            return $http.post(urlBase + '/contacts/groups/create', data, getConfig());
        };
        dataFactory.postBulkAssignToGroup = function(data) {
            return $http.post(urlBase + '/contacts/groups/bulkadd', data, getConfig());
        };
        dataFactory.postBulkRemoveFromGroup = function(data) {
            return $http.post(urlBase + '/contacts/groups/bulkremove', data, getConfig());
        };
        
        dataFactory.postUpdateGroup = function(data) {
            return $http.post(urlBase + '/contacts/groups/update', data, getConfig());
        };
        dataFactory.postAddContactToGroup = function(data) {
            return $http.post(urlBase + '/contacts/groups/addcontacttogroup', data,
                getConfig());
        };
        // dataFactory.getGroups = function () {
        //     return $http.get(urlBase+'/contacts/groups', getConfig());
        // };
        dataFactory.getAllContactGroups = function(domainUuid) {
            return $http.get(urlBase + '/contacts/allgroups/' + domainUuid, getConfig());
        };
        dataFactory.getViewableContactGroups = function(domainUuid) {
            return $http.get(urlBase + '/contacts/viewablegroups/' + domainUuid, getConfig());
        };
        dataFactory.getLoadGroupByUuid = function(groupUuid) {
            return $http.get(urlBase + '/contacts/groups/' + groupUuid, getConfig());
        };
        dataFactory.postUpdateGroupContactList = function(data) {
            return $http.post(urlBase + '/contacts/groups/updatecontactlist', data,
                getConfig());
        };
        dataFactory.postUpdateGroupContactViewerList = function(data) {
            return $http.post(urlBase + '/contacts/groups/updategroupviewerlist', data,
                getConfig());
        };
        dataFactory.deleteGroup = function(data) {
            return $http.post(urlBase + '/contacts/groups/delete', data, getConfig());
        };
        dataFactory.deleteGroupContact = function(data) {
            return $http.post(urlBase + '/contacts/groups/removecontact', data,
                getConfig());
        };
        dataFactory.deleteGroupViewerGroup = function(data) {
            return $http.post(urlBase + '/contacts/groups/remove/groupviewgroup', data,
                getConfig());
        };
        dataFactory.deleteGroupViewerUser = function(data) {
            return $http.post(urlBase + '/contacts/groups/remove/groupviewuser', data,
                getConfig());
        };
        dataFactory.postSetUsersAsGroupManagers = function(data) {
            return $http.post(urlBase + '/contacts/groups/setmanagerslist', data,
                getConfig());
        };
        dataFactory.postToggleGroupHide = function(data) {
            return $http.post(urlBase + '/contacts/groups/togglehide', data, getConfig());
        };

        // Import Settings Routes
        dataFactory.postSaveContactImportSettings = function(data){
            return $http.post(urlBase + '/contacts/groups/importsettings/save', data, getConfig());
        };
        dataFactory.postUpdateContactImportSettings = function(data){
            return $http.post(urlBase + '/contacts/groups/importsettings/update', data, getConfig());
        }
        dataFactory.getImportSettingsByType = function(data){
            return $http.get(urlBase + '/contacts/groups/importsettings_bytype/' + data, getConfig());
        };
        dataFactory.getImportSettingsBySettingUuid = function(settingUuid){
            return $http.get(urlBase + '/contacts/groups/importsettings_byuuid/' + settingUuid, getConfig());
        };
        dataFactory.deleteSingleImportSetting = function(data){
            return $http.get(urlBase + '/contacts/groups/importsettings/delete_one/' + data, getConfig());
        };
        

        // Gmail API Contact Routes
        dataFactory.getGmailAuthUrl = function() {
            return $http.get(urlBase + '/gmailauthurl', getConfig());
        };
        dataFactory.postGetGmailContacts = function(data) {
            return $http.post(urlBase + '/gmailcontacts', data, getConfig());
        };
        dataFactory.postImportGmailContacts = function(data) {
            return $http.post(urlBase + '/gmailcontacts/import', data, getConfig());
        };

        // Giphy
        dataFactory.getGiphyGifByText = function(text) {
            return $http.get(urlBase + '/giphy/' + text, getConfig());
        };

        // Chat Macros
        dataFactory.postCreateChatMacro = function(data) {
            return $http.post(urlBase + '/chatmacro/create', data, getConfig());
        };
        dataFactory.getChatMacrosByDomain = function(domainUuid) {
            return $http.get(urlBase + '/chatmacro/all/' + domainUuid, getConfig());
        };
        dataFactory.getDeleteMacroByUuid = function(macroUuid) {
            return $http.get(urlBase + '/chatmacro/delete/' + macroUuid, getConfig());
        };
        dataFactory.postUpdateMacro = function(data) {
            return $http.post(urlBase + '/chatmacro/update/', data, getConfig());
        };
        dataFactory.postUpdateHotKeyText = function(data) {
            return $http.post(urlBase + "/chatmacro/updatehotkey", data, getConfig());
        };

        //File Sharing Routes
        dataFactory.fileUpload = function(data) {
            return $http.post(urlBase + '/media/upload', data, getConfig());
        };
        dataFactory.postResendFileNotice = function(data) {
            return $http.post(urlBase + '/media/resendnotice', data, getConfig());
        };

        dataFactory.getMyFiles = function(uuid) {
            return $http.get(urlBase + '/media/my-files/' + uuid, getConfig());
        };
        dataFactory.getMyFileShares = function(uuid) {
            return $http.get(urlBase + '/media/my-fileshares/' + uuid, getConfig());
        };
        dataFactory.postGetMyFileShares = function(data) {
            return $http.post(urlBase + '/media/my-fileshares', data, getConfig());
        };

        //Call History Routes
        dataFactory.postGetCallHistory = function(data) {
            return $http.post(urlBase + '/call/gethistory', data, getConfig());
        };
        dataFactory.postGetAgencyCallHistory = function(data) {
            return $http.post(urlBase + '/call/getagencyhistory', data, getConfig());
        };
        dataFactory.postUpdateCallContact = function(data) {
            return $http.post(urlBase + '/call/history/updatecontact', data, getConfig());
        };
        dataFactory.postRetrieveCallsByContact = function(data) {
            return $http.post(urlBase + '/call/history/contact', data, getConfig());
        };
        dataFactory.postSoftDeleteCallHistory = function(data) {
            return $http.post(urlBase + '/call/history/softdelete', data, getConfig());
        };
        dataFactory.getVoicemailFilenames = function(uuid) {
            return $http.get(urlBase + '/call/getvoicemailfilenames/' + uuid, getConfig());
        };
        dataFactory.getRecordingFilenames = function(uuid) {
            return $http.get(urlBase + '/call/getrecordingfilenames/' + uuid, getConfig());
        };
        dataFactory.postRetrieveVisualVoicemailList = function(data) {
            return $http.post(urlBase + '/voicemail/visual', data, getConfig());
        };
        dataFactory.postUpdateVoicemailContact = function(data) {
            return $http.post(urlBase + '/voicemail/visual/updatecontact', data,
                getConfig());
        };
        dataFactory.postRemoveVisualVoicemail = function(data) {
            return $http.post(urlBase + '/voicemail/visual/remove', data, getConfig());
        };
        dataFactory.postRemoveMultipleVoicemails = function(data) {
            return $http.post(urlBase + '/voicemail/visual/removemultiple', data,
                getConfig());
        };
        dataFactory.getRetrieveRecordingslList = function(data) {
            return $http.post(urlBase + '/call/recordings/retrieve/', data, getConfig());
        };
        dataFactory.removeRecording = function(uuid) {
            return $http.get(urlBase + '/call/recordings/remove/' + uuid, getConfig());
        };
        dataFactory.getRetrieveRecordingslListMultiple = function(user_uuid, call_uuid) {
            return $http.get(urlBase + '/call/recordings/retrievemultiple/' + user_uuid +
                '/' + call_uuid, getConfig());
        };
        dataFactory.getDownloadRecordingslListMultiple = function(user_uuid, call_uuid) {
            return $http.get(urlBase + '/call/recordings/downloadmultiple/' + user_uuid +
                '/' + call_uuid, getConfig());
        };
        dataFactory.getUnreadCount = function() {
            return $http.get(urlBase + '/voicemail/unread', getConfig());
        };
        dataFactory.getUnreadVoicemailsCount = function() {
            return $http.get(urlBase + '/voicemail/totalunread', getConfig());
        };
        dataFactory.getDomainUnreadVoicemailsCount = function() {
            return $http.get(urlBase + '/voicemail/domainunread', getConfig());
        };
        dataFactory.getSaveVisualVoicemail = function(uuid, location) {
            if (location) {
                return $http.get(urlBase + '/voicemail/visual/save/' + uuid + '/' +
                    location, getConfig());
            } else {
                return $http.get(urlBase + '/voicemail/visual/save/' + uuid, getConfig());
            }
        };
        dataFactory.getResetMissedCalls = function(uuid) {
            return $http.get(urlBase + '/call/resetmissed/' + uuid, getConfig());
        };
        dataFactory.getMissedCallCount = function(uuid) {
            return $http.get(urlBase + '/call/missedcount/' + uuid, getConfig());
        };
        dataFactory.getHandleVoicemail = function(uuid) {
            return $http.get(urlBase + '/voicemail/visual/handlevoicemail/' + uuid,
                getConfig());
        };
        dataFactory.postAssignVoicemail = function(data) {
                return $http.post(urlBase + '/voicemail/visual/assign', data,
                    getUploadConfig());
            },

            // BRIDGE ANALYTICS
            dataFactory.getCallHistoryInfo = function(data) {
                return $http.post(urlBase + '/call/callhistory/info', data, getConfig());
            };
        dataFactory.getTextMessagesHistoryInfo = function(data) {
            return $http.post(urlBase + '/sms/info/analytics', data, getConfig());
        };
        dataFactory.getDailyDetailedCallsInfo = function(data) {
            return $http.post(urlBase + '/call/callhistory/detail', data, getConfig());
        };


        //Call Center Routes
        dataFactory.getCurrentCalls = function() {
            //var domain = $rootScope.user.domain.domain_name;
            //return $http.get(urlBase + '/rab/getcalls/'+domain, getConfig());
            return $http.get(urlBase + '/callcenter/getcalls', getConfig());
        };
        dataFactory.removeCall = function(uuid) {
            return $http.get(urlBase + '/callcenter/removecall/' + uuid, getConfig());
        };
        dataFactory.setCallCenterPresence = function(userUuid, present) {
            var url = urlBase + '/callcenter/presence/' + userUuid + '/' + present;
            return $http.get(url, getConfig());
        };
        dataFactory.getListenCall = function(uuid) {
            var url = urlBase + '/rab/listen/' + $rootScope.user.user_ext + '@' +
                $rootScope.user.domain.domain_name + '/' + uuid;
            return $http.get(url, getConfig());
        };
        dataFactory.getWhisperCall = function(uuid) {
            var url = urlBase + '/rab/whisper/' + $rootScope.user.user_ext + '@' +
                $rootScope.user.domain.domain_name + '/' + uuid;
            return $http.get(url, getConfig());
        };
        dataFactory.getBargeCall = function(uuid) {
            var url = urlBase + '/rab/barge/' + $rootScope.user.user_ext + '@' +
                $rootScope.user.domain.domain_name + '/' + uuid;
            return $http.get(url, getConfig());
        };
        dataFactory.getStartRecordCall = function(uuid) {
            return $http.get(urlBase + '/rab/recordcall/' + $rootScope.user.domain.domain_name +
                '/' + uuid + '/start', getConfig());
        };
        dataFactory.getStopRecordCall = function(uuid) {
            var url = urlBase + '/rab/recordcall/' + $rootScope.user.domain.domain_name +
                '/' + uuid + '/stop';
            return $http.get(url, getConfig());
        };
        dataFactory.setCustomVariable = function(data) {
            return $http.post(urlBase + '/rab/setcustomvariable', data, getConfig());
        };
        dataFactory.getParkingInfo = function(domainName) {
            return $http.get(urlBase + "/call/getparkinginfo/" + domainName, getConfig());
        };
        dataFactory.getCallsForDomainParked = function(domainName) {
            return $http.get(urlBase + "/call/getcallsparked/" + domainName, getConfig());
        };
        dataFactory.broadcastParking = function(domainName) {
            return $http.get(urlBase + "/call/broadcastparking/" + domainName,
                getConfig());
        };

        dataFactory.getCallState = function(callID) {
            return $http.get(urlBase + '/call/getstate/' + callID + '/' + $rootScope.user
                .domain.domain_name, getConfig());
        };

        // CALLERS BLACKLIST

        dataFactory.postUpdateCallerBlacklist = function(data) {
            return $http.post(urlBase + '/call/blacklist', data, getConfig());
        };
        dataFactory.deleteCallerBlacklist = function(uuid) {
            return $http.get(urlBase + '/call/blacklist/delete/' + uuid, getConfig());
        };
        dataFactory.getCallersBlacklist = function(domain_uuid) {
            return $http.get(urlBase + '/call/blacklist/' + domain_uuid, getConfig());
        };

        //VideoConference Routes
        dataFactory.getVideoSessionIds = function(user_uuid, roomType) {
            return $http.get(urlBase + '/conference/sessions/check/' + user_uuid + '/' +
                $rootScope.user.domain_uuid + '/' + $rootScope.user.id + '/' +
                roomType, getConfig());
        };
        dataFactory.getCheckRoom = function(roomName, roomType) {
            return $http.get(urlBase + '/conference/roomcheck/' + $rootScope.user.id +
                '/' + $rootScope.user.domain_uuid + '/' + roomName + '/' + roomType,
                getConfig());
        };
        dataFactory.claimVidConfRoom = function(roomName, roomType) {
            var url = urlBase + "/vidconf/claimroom/" + roomName + "/" + roomType;
            return $http.get(url, getConfig());
        };
        dataFactory.getVidConfRoom = function(roomType) {
            var url = urlBase + "/vidconf/getuserroom/" + roomType;
            return $http.get(url, getConfig());
        };
        dataFactory.getProposalEmailLink = function(archiveUuid) {
            var url = urlBase + "/vidconf/createproposalemaillink/" + archiveUuid;
            return $http.get(url, getConfig());
        };
        dataFactory.getVideoArchives = function(user_uuid, roomType) {
            return $http.get(urlBase + '/conference/archives/' + user_uuid + '/' +
                roomType, getConfig());
        };
        dataFactory.getRemoveArchive = function(uuid) {
            return $http.get(urlBase + '/conference/archive/remove/' + uuid + '/' +
                $rootScope.user.id, getConfig());
        };
        dataFactory.sendTokboxInvite = function(data) {
            return $http.post(urlBase + '/conference/sendinvite', data, getConfig());
        };


        dataFactory.getVideoConference = function(uuid) {
            return $http.get(urlBase + '/videoconference/get/' + uuid, getConfig());
        };
        dataFactory.getResetVideoConferenceAdminLink = function() {
            return $http.get(urlBase + '/videoconference/resetadminlink', getConfig());
        };
        dataFactory.getVideoConferenceInvite = function(uuid) {
            return $http.get(urlBase + '/videoconference/getinvite/' + uuid, getConfig());
        };
        dataFactory.getVideoConferenceByUuid = function(video_conference_invite_uuid) {
            return $http.get(urlBase + '/videoconference/getbyuuid/' +
                video_conference_invite_uuid, getConfig());
        };
        dataFactory.postSendVideoConferenceInvites = function(data) {
            return $http.post(urlBase + '/videoconference/sendinvites', data, getConfig());
        };
        dataFactory.postResendVideoConferenceInvite = function(data) {
            return $http.post(urlBase + '/videoconference/resendinvite', data,
                getConfig());
        };
        dataFactory.postDisableVideoConferenceInvite = function(data) {
            return $http.post(urlBase + '/videoconference/disableinvite', data,
                getConfig());
        };
        dataFactory.checkVideoSession = function(hash) {
            return $http.get(urlBase + '/videoconference/checksession/' + hash);
        };
        dataFactory.getVideoConferenceSessions = function(uuid) {
            return $http.get(urlBase + '/videoconference/sessions/' + uuid, getConfig());
        };
        //noncontact Routes
        dataFactory.getNonContacts = function(uuid) {
            return $http.get(urlBase + '/noncontact/' + uuid, getConfig());
        };
        dataFactory.postNonContact = function(data) {
            return $http.post(urlBase + '/noncontact/store', data, getConfig());
        };
        dataFactory.updateNonContact = function(data) {
            return $http.post(urlBase + '/noncontact/update', data, getConfig());
        };

        //ScreenSharing Routes
        dataFactory.getScreenRoom = function(roomid) {
            return $http.get(urlBase + '/screenshare/get/hash/' + roomid);
        };
        dataFactory.getScreenshareInvite = function(screenshare_uuid) {
            return $http.get(urlBase + '/screenshare/get/uuid/' + screenshare_uuid);
        };
        dataFactory.getCloseScreenRoom = function(roomid) {
            return $http.get(urlBase + '/screenshare/close/' + roomid);
        };
        dataFactory.postLockScreenShareRoom = function(data) {
            return $http.post(urlBase + '/screenshare/lock', data, getConfig());
        };

        //Conference Call Routes
        dataFactory.getConferenceConfiguration = function() {
            return $http.get(urlBase + '/conference/getconfig/');
        };

        dataFactory.getListConferences = function(confName) {
            return $http.get(urlBase + '/conference/list/' + confName);
        };
        dataFactory.listConferenceUsers = function(confName) {
            return $http.get(urlBase + '/conference/listbyname/' + confName);
        };


        dataFactory.recodStartConference = function(data) {
            return $http.get(urlBase + '/conference/record/start/' + data, getConfig());
        };
        dataFactory.recordStopConference = function(data) {
            return $http.get(urlBase + '/conference/record/stop/' + data, getConfig());
        };


        dataFactory.conferenceHoldAll = function(confName) {
            return $http.get(urlBase + '/conference/holdall/' + confName, getConfig());
        };
        dataFactory.conferenceUnholdAll = function(confName) {
            return $http.get(urlBase + '/conference/unholdall/' + confName, getConfig());
        };

        //New Conference Call Routes
        dataFactory.getConferenceInfoForUser = function() {
            return $http.get(urlBase + '/conference/info', getConfig());
        };
        dataFactory.getConferenceRoomMemberList = function(conferenceUuid) {
            return $http.get(urlBase + '/conference/userlist/' + conferenceUuid,
                getConfig());
        };
        dataFactory.postCreateNewConferenceRoom = function(data) {
            return $http.post(urlBase + '/conference/createnew', data, getConfig());
        };
        dataFactory.postAddParticipantsToConference = function(data) {
            return $http.post(urlBase + '/conference/addparticipants', data, getConfig());
        };
        dataFactory.getDeleteConferenceRoom = function(conferenceUuid) {
            return $http.get(urlBase + '/conference/deleteconference/' + conferenceUuid,
                getConfig());
        };
        dataFactory.postHangupParticipant = function(data) {
            return $http.post(urlBase + '/conference/hangupuser', data, getConfig());
        };
        dataFactory.postToggleParticipantMute = function(data) {
            return $http.post(urlBase + '/conference/toggleusermute', data, getConfig());
        };
        dataFactory.getLockConference = function(confName) {
            return $http.get(urlBase + '/conference/lock/' + confName, getConfig());
        };
        dataFactory.getUnlockConference = function(confName) {
            return $http.get(urlBase + '/conference/unlock/' + confName, getConfig());
        };
        dataFactory.getMuteAllConference = function(confName) {
            return $http.get(urlBase + '/conference/muteall/' + confName, getConfig());
        };
        dataFactory.getUnmuteAllConference = function(confName) {
            return $http.get(urlBase + '/conference/unmuteall/' + confName, getConfig());
        };
        dataFactory.getFlagConferenceStarted = function(conferenceUuid) {
            return $http.get(urlBase + '/conference/start/' + conferenceUuid, getConfig());
        };
        dataFactory.getEndConference = function(conferenceUuid) {
            return $http.get(urlBase + '/conference/end/' + conferenceUuid, getConfig());
        };
        dataFactory.getEndConferenceByName = function(confName) {
            return $http.get(urlBase + '/conference/endbyname/' + confName, getConfig());
        };

        //Permission Group Routes
        dataFactory.postCreatePermissionGroup = function(data) {
            return $http.post(urlBase + '/permissions/group/create', data,
                getUploadConfig());
        };
        dataFactory.postUpdatePermissionGroup = function(data) {
            return $http.post(urlBase + '/permissions/group/update', data, getConfig());
        };
        dataFactory.postRemovePermissionGroupMember = function(data) {
            return $http.post(urlBase + '/permissions/group/removemember', data,
                getConfig());
        };
        dataFactory.getPermissionCommunications = function() {
            return $http.get(urlBase + '/permissions/communications', getConfig());
        };
        dataFactory.getPermissionGroups = function(domainUuid) {
            return $http.get(urlBase + '/permissions/groups/' + domainUuid, getConfig());
        };
        dataFactory.getUsersWithGroupPermissions = function() {
            return $http.get(urlBase + '/permissions/userswithcontactgroupperms', getConfig());
        };
        dataFactory.getRemovePermissionGroup = function(uuid) {
            return $http.get(urlBase + '/permissions/group/remove/' + uuid, getConfig());
        };
        dataFactory.getManagerEmulationStatus = function() {
            return $http.get(urlBase + '/permissions/emulationstatus', getConfig());
        };

        //Location Group Routs

        dataFactory.postCreateLocationGroup = function(data) {
            return $http.post(urlBase + '/locations/group/create', data, getConfig());
        };
        dataFactory.postUpdateLocationGroup = function(data) {
            return $http.post(urlBase + '/locations/group/update', data, getConfig());
        };
        dataFactory.postRemoveLocationGroupMember = function(data) {
            return $http.post(urlBase + '/locations/group/removemember', data,
                getConfig());
        };
        dataFactory.getLocationCommunications = function() {
            return $http.get(urlBase + '/locations/communications', getConfig());
        };
        dataFactory.getLocationGroups = function(domainUuid) {
            return $http.get(urlBase + '/locations/groups/' + domainUuid, getConfig());
        };
        dataFactory.getLocationGroupsForUser = function() {
            return $http.get(urlBase + '/locations/groups/user/get', getConfig());
        };
        dataFactory.getRemoveLocationGroup = function(uuid) {
            return $http.get(urlBase + '/locations/group/remove/' + uuid, getConfig());
        };
        /*dataFactory.getManagerEmulationStatus = function() {
            return $http.get(urlBase + '/permissions/emulationstatus', getConfig());
        };*/

        //User Productivity Stats Routes
        dataFactory.postGetUserProdStats = function(data) {
            return $http.post(urlBase + '/status/userproductivity/user', data,
                getConfig());
        };
        dataFactory.postGetUserProdStatsDomain = function(data) {
            return $http.post(urlBase + '/status/userproductivity/company', data,
                getConfig());
        };

        //Call Statistics Routes
        dataFactory.getCallStats = function(data) {
            return $http.post(urlBase + '/rab/stats', data, getConfig());
        };

        //Dashboard Routes
        dataFactory.postUpdateDashboard = function(data) {
            console.log(data);
            return $http.post(urlBase + '/user/dashboard/update', data, getConfig());
        };
        dataFactory.getSortedTiles = function() {
            return $http.get(urlBase + '/user/dashboard/alpha', getConfig());
        };
        dataFactory.getResetTiles = function() {
            return $http.get(urlBase + '/user/dashboard/reset', getConfig());
        };
        dataFactory.saveDashboardOrder = function(data) {
            return $http.post(urlBase + '/user/dashboard/save', data, getConfig());
        };

        //Fax Routes
        dataFactory.getAvailableFaxDids = function() {
            return $http.get(urlBase + '/vfax/getavailfaxdids', getConfig());
        };
        dataFactory.postOrderFaxDid = function(data) {
            return $http.post(urlBase + '/vfax/orderdid', data, getConfig());
        };
        dataFactory.postRemoveMultipleFaxes = function(data) {
            return $http.post(urlBase + '/vfax/deletemultiple', data, getConfig());
        };
        dataFactory.postGetFaxesByUuid = function(data) {
            return $http.post(urlBase + '/vfax/messages/uuids', data, getConfig());
        };
        dataFactory.postAssignFaxesToUser = function(data) {
            return $http.post(urlBase + "/vfax/messages/assign", data, getConfig());
        };
        dataFactory.postMessageAssignmentBroadcast = function(data) {
            return $http.post(urlBase + "/vfax/messages/assign/chatmessage/broadcast",
                data, getConfig());
        };
        dataFactory.postHandleFax = function(data) {
            return $http.post(urlBase + "/vfax/messages/handle", data, getConfig());
        };
        dataFactory.postSendMultipleFiles = function(data) {
            return $http.post(urlBase + '/vfax/sendmultiple', data, getConfig());
        };
        dataFactory.getVfaxProfiles = function(user_uuid) {
            return $http.get(urlBase + '/vfax/getfaxprofiles/' + user_uuid, getConfig());
        };
        dataFactory.getFaxMessages = function(user_uuid, location_group_uuid, faxDid) {
            return $http.get(urlBase + '/vfax/messages/' + user_uuid + '/' +
                location_group_uuid + '/' + faxDid, getConfig());
        };
        dataFactory.getFaxMessagesByContact = function(user_uuid, contact_uuid) {
            return $http.get(urlBase + '/vfax/messages/contact/' + user_uuid + '/' +
                contact_uuid, getConfig());
        };
        dataFactory.getResendFaxMessage = function(message_uuid) {
            return $http.get(urlBase + '/vfax/resend/' + message_uuid, getConfig());
        };
        dataFactory.getFaxListStates = function() {
            return $http.get(urlBase + '/vfax/liststates', getConfig());
        };
        dataFactory.getFaxListRatecenters = function(state_code) {
            return $http.get(urlBase + '/vfax/listratecenters/' + state_code, getConfig());
        };
        dataFactory.postGetAvailableDids = function(data) {
            return $http.post(urlBase + '/company/getavailabledids', data, getConfig());
        };
        dataFactory.postUpdateVfax = function(data) {
            return $http.post(urlBase + '/vfax/update', data, getConfig());
        };
        dataFactory.getDeleteFaxMessage = function(message_uuid) {
            return $http.get(urlBase + '/vfax/removemessage/' + message_uuid, getConfig());
        };
        dataFactory.swapFaxNumbers = function(data) {
            return $http.post(urlBase + '/vfax/swapnumbers', data, getConfig());
        };
        // dataFactory.getFaxImage = function(message_uuid) {
        //     return $http.get(urlBase + '/vfax/faximage/' + message_uuid, getConfig());
        // };
        dataFactory.getFaxPdf = function(message_uuid) {
            return $http.get(urlBase + '/vfax/getpdf/' + message_uuid, getConfig());
        };

        //Cloud Storage Routes

        dataFactory.postCloudMobileUpload = function(data) {
            return $http.post(urlBase + '/cloud/mobileupload', data, getConfig());
        };
        dataFactory.getAddonStorage = function() {
            return $http.get(urlBase + '/cloud/getaddonstorage', getConfig());
        };
        dataFactory.getUserRootFolder = function(userUuid) {
            return $http.get(urlBase + '/cloud/user/root/' + userUuid, getConfig());
        };
        dataFactory.getCreateFolder = function(parentUuid, folderName) {
            return $http.get(urlBase + '/cloud/createfolder/' + parentUuid + '/' +
                folderName, getConfig());
        };
        dataFactory.getDeleteFolder = function(folderUuid) {
            return $http.get(urlBase + '/cloud/user/delete/folder/' + folderUuid,
                getConfig());
        };
        dataFactory.getDeleteFile = function(fileUuid) {
            return $http.get(urlBase + '/cloud/user/delete/' + fileUuid, getConfig());
        };
        dataFactory.getRenameFile = function(fileUuid, name) {
            return $http.get(urlBase + '/cloud/rename/' + fileUuid + '/' + name,
                getConfig());
        };
        dataFactory.getRenameFolder = function(folderUuid, name) {
            return $http.get(urlBase + '/cloud/rename/folder/' + folderUuid + '/' +
                name, getConfig());
        };
        dataFactory.getDownloadFile = function(fileUuid, base64) {
            return $http.get(urlBase + '/cloud/downloadfile/' + fileUuid + '/' + base64,
                getConfig());
        };
        dataFactory.getMoveFile = function(fileUuid, folderUuid) {
            return $http.get(urlBase + '/cloud/user/move/' + fileUuid + '/' +
                folderUuid, getConfig());
        };
        dataFactory.getCopyFile = function(fileUuid, folderUuid) {
            return $http.get(urlBase + '/cloud/user/copy/' + fileUuid + '/' +
                folderUuid, getConfig());
        };
        dataFactory.getViewableFolders = function(fileUuid, folderUuid) {
            return $http.get(urlBase + '/cloud/user/viewablefolders', getConfig());
        };
        dataFactory.postUpdateFolderPermissions = function(data) {
            return $http.post(urlBase + '/cloud/updatefolderpermissions', data,
                getConfig());
        };

        //Public Play Links
        dataFactory.getCodeDetails = function(urlCode) {
            return $http.get(urlBase + '/play/codedetails/' + urlCode, getConfig());
        };
        dataFactory.getArchiveLogoUrl = function(archiveUuid) {
            return $http.get(urlBase + "/play/vidconf/archive/logo/" + archiveUuid, getConfig());
        };

        //Public Cloud Links Routes
        dataFactory.getPublicLinks = function() {
            return $http.get(urlBase + '/cloud/user/publiclinks', getConfig());
        };
        dataFactory.postSavePublicLink = function(data) {
            return $http.post(urlBase + '/cloud/user/savepubliclink', data, getConfig());
        };
        dataFactory.getDeletePublicLink = function(uuid) {
            return $http.get(urlBase + '/cloud/user/deletelink/' + uuid, getConfig());
        };
        dataFactory.postSendCloudShareLink = function(data) {
            return $http.post(urlBase + '/cloud/user/sendsharelink', data, getConfig());
        };
        dataFactory.getPublicLinkDetails = function(hash) {
            return $http.get(urlBase + '/cloud/public/getlink/' + hash);
        };
        dataFactory.transferCallToExternal = function(userext, domainUuid, number) {
            return $http.get(urlBase + '/call/transfercalltoexternal/' + userext +'/' + domainUuid + '/' +number);
        };
        dataFactory.getBlueImportPreview = function(domainUuid) {
            return $http.get(urlBase + '/bluewave/previewimport/' + domainUuid, getConfig());
        };
        dataFactory.postProcessBlueImportPreview = function(data) {
            return $http.post(urlBase + '/bluewave/import', data, getConfig());
        };
        dataFactory.getBluewaveAgencyInfo = function(key) {
            return $http.get(urlBase + '/bluewave/getinfo/' + key);
        };
        dataFactory.postSubmitBluewavePaymentDetails = function(data) {
            return $http.post(urlBase + '/bluewave/updatepayment', data);
        };
        dataFactory.postVerifyBankAccountBluewave = function(data) {
            return $http.post(urlBase + '/bluewave/verifybank', data);
        };
        dataFactory.getToggleDomainVoicemails = function(domain_uuid) {
            return $http.get(urlBase + '/bluewave/togglevoicemails/' + domain_uuid, getConfig());
        };
        dataFactory.postSendPublicUploadNotification = function(data) {
            return $http.post(urlBase + '/cloud/public/sendnotice', data);
        };
        dataFactory.tempGetDomainInfo = function() {
            return $http.get(urlBase + '/bluewave/getdomains', getConfig());
        };
        dataFactory.postAddCardToCustomer = function(data) {
            return $http.post(urlBase + '/bluewave/addcardtocustomer', data, getConfig());
        };


        // E911
        dataFactory.getValidDIDs = function(domainUuid) {
            return $http.get(urlBase + '/bandwidth/dids/' + domainUuid, getConfig());
        };
        dataFactory.postUpdateUserCallerId = function(data) {
            return $http.post(urlBase + '/user/updatecallerid', data);
        }
        dataFactory.postUpdateEDTSetting = function(data) {
            return $http.post(urlBase + '/user/updateedtsetting', data);
        };
        dataFactory.getValidE911CandidateDIDs = function(domainUuid) {
            return $http.get(urlBase + '/bandwidth/e911dids/' + domainUuid, getConfig());
        };
        dataFactory.getSetDefaultE911Address = function(regUuid) {
            return $http.get(urlBase + '/bandwidth/setdefault/' + regUuid, getConfig());
        };
        dataFactory.getE911Registrations = function(domainUuid) {
            return $http.get(urlBase + '/bandwidth/gete911registrations/' + domainUuid,
                getConfig());
        };
        dataFactory.postOrderE911 = function(data) {
            return $http.post(urlBase + '/bandwidth/registere911', data);
        };
        dataFactory.postOrderNewE911Address = function(data) {
            return $http.post(urlBase + '/bandwidth/order911', data);
        };
        dataFactory.getAssignE911 = function(userUuid, destinationUuid) {
            return $http.get(urlBase + '/bandwidth/assigne911/' + userUuid + '/' +
                destinationUuid);
        };
        dataFactory.postValidateE911Address = function(address) {
            return $http.post(urlBase + '/bandwidth/e911/validate', address);
        };
        // dataFactory.getRemoveURIFromE911System = function(destinationUuid) {
        //     return $http.get(urlBase + '/bandwidth/deregisteruri/' + destinationUuid);
        // };


        //TKG Admin Routes
        // dataFactory.getBridgePackages = function() {
        //     return $http.get(urlBase + '/info/getpackages');
        // };
        dataFactory.postSavePackage = function(data) {
            return $http.post(urlBase + '/admin/savepackage', data, getConfig());
        };
        dataFactory.postSavePackageOption = function(data) {
            return $http.post(urlBase + '/admin/savepackageoption', data, getConfig());
        };
        dataFactory.getInfoForPackages = function() {
            return $http.get(urlBase + '/info/getinfoforpackages', getConfig());
        };

        dataFactory.getInfoForNotices = function() {
            return $http.get(urlBase + '/info/getinfofornotices', getConfig());
        };
        dataFactory.postUpdateBridgeNotice = function() {
            return $http.post(urlBase + '/info/updatenotice', getConfig());
        };
        dataFactory.getDeleteBridgeNotice = function(noticeUuid) {
            return $http.get(urlBase + '/info/deletenotice' + noticeUuid, getConfig());
        };

        // dataFactory.getPackageOptions = function() {
        //     return $http.get(urlBase + '/info/getpackageoptions');
        // };
        // dataFactory.getPackageAddons = function() {
        //     return $http.get(urlBase + '/info/getpackageaddons');
        // };

        dataFactory.getDomainDetails = function(domainUuid) {
            return $http.get(urlBase + '/admin/getdomaindetails/' + domainUuid,
                getConfig());
        };
        dataFactory.postSavePackageAddon = function(data) {
            return $http.post(urlBase + '/admin/savepackageaddon', data, getConfig());
        };
        dataFactory.getChangePackageStatus = function(packageUuid) {
            return $http.get(urlBase + '/admin/togglepackage/' + packageUuid, getConfig());
        };
        dataFactory.getChangePackageOptionStatus = function(optionUuid) {
            return $http.get(urlBase + '/admin/togglepackageoption/' + optionUuid,
                getConfig());
        };
        dataFactory.getChangeAddonStatus = function(addonUuid) {
            return $http.get(urlBase + '/admin/toggleaddon/' + addonUuid, getConfig());
        };
        dataFactory.getDomainAddons = function(domain_uuid) {
            return $http.get(urlBase + '/admin/getdomainaddons/' + domain_uuid,
                getConfig());
        };
        dataFactory.postAddAddonToAgency = function(data) {
            return $http.post(urlBase + '/admin/addontoagency', data, getConfig());
        };
        dataFactory.postRemoveAddonFromAgency = function(data) {
            return $http.post(urlBase + '/admin/addonfromagency', data, getConfig());
        };

        dataFactory.postSaveGroupCode = function(data) {
            return $http.post(urlBase + '/admin/savegroupcode', data, getConfig());
        };
        dataFactory.getManagementPartners = function() {
            return $http.get(urlBase + '/admin/getmanagementpartners', getConfig());
        };
        dataFactory.getGroupCodes = function() {
            return $http.get(urlBase + '/admin/getgroupcodes', getConfig());
        };
        dataFactory.getCheckGroupCode = function(code) {
            return $http.get(urlBase + '/admin/checkgroupcode/' + code, getConfig());
        };
        dataFactory.getToggleGroupCodeStatus = function(code_uuid) {
            return $http.get(urlBase + '/admin/togglegroupcode/' + code_uuid, getConfig());
        };
        dataFactory.postResetKotterTechPassword = function(data) {
            return $http.post(urlBase + '/admin/kottertechpassword', data);
        };

        //Admin Billing / Invoicing
        dataFactory.postGetAdminInvoices = function(data) {
            return $http.post(urlBase + '/admin/billing/getinvoices', data, getConfig());
        };
        dataFactory.postSaveInvoice = function(data) {
            return $http.post(urlBase + '/admin/billing/saveinvoice', data, getConfig());
        };
        dataFactory.postDeleteInvoice = function(data) {
            return $http.post(urlBase + '/admin/billing/deleteinvoice', data, getConfig());
        };
        dataFactory.postUpdateAgencyBillingSettings = function(data) {
            return $http.post(urlBase + '/admin/billing/updateagency', data, getConfig());
        };
        dataFactory.postUpdateAgencyBluewave = function(data) {
            return $http.post(urlBase + '/admin/billing/updateagencybluewave', data,
                getConfig());
        };
        dataFactory.postPrepareBillingReport = function(data) {
            return $http.post(urlBase + '/admin/billing/preparebillingreport', data,
                getConfig());
        };
        dataFactory.getRecentBillingReports = function(data) {
            return $http.get(urlBase + '/admin/billing/loadreports', getConfig());
        };
        dataFactory.getCancelBillingReport = function(reportUuid) {
            return $http.get(urlBase + '/admin/billing/cancelreport/' + reportUuid,
                getConfig());
        };
        dataFactory.getBillingReport = function(reportUuid) {
            return $http.get(urlBase + '/admin/billing/getreport/' + reportUuid,
                getConfig());
        };
        dataFactory.getRecentBillingDates = function() {
            return $http.get(urlBase + '/admin/billing/getbillingdates', getConfig());
        };

        //Gereral methods
        dataFactory.getDomains = function() {
            return $http.get(urlBase + '/admin/getdomains', getConfig());
        };
        dataFactory.getRawDomains = function(type) {
            return $http.get(urlBase + '/admin/getrawdomains/' + type, getConfig());
        };
        dataFactory.getDomainDids = function(domain_uuid) {
            return $http.get(urlBase + '/admin/getdomaindids/' + domain_uuid, getConfig());
        };
        dataFactory.getCreateKotterTech = function(domain_uuid) {
            return $http.get(urlBase + '/admin/createkottertech/' + domain_uuid,
                getConfig());
        };
        dataFactory.getCreateQueueManager = function(domain_uuid) {
            return $http.get(urlBase + '/admin/createqueuemanager/' + domain_uuid,
                getConfig());
        };
        dataFactory.getActiveUsersByDomain = function(domain_uuid) {
            return $http.get(urlBase + '/admin/usersbydomain/' + domain_uuid, getConfig());
        };
        dataFactory.postUpdateDomain = function(data) {
            return $http.post(urlBase + '/admin/updatedomain', data, getConfig());
        };
        dataFactory.getDeletePortingNumber = function(number_uuid) {
            return $http.get(urlBase + '/admin/deleteport/' + number_uuid, getConfig());
        };
        dataFactory.getPortNumberUse = function(number_uuid) {
            return $http.get(urlBase + '/admin/portuse/' + number_uuid, getConfig());
        };
        
        dataFactory.getActivatePortingNumber = function(number_uuid) {
            return $http.get(urlBase + '/admin/activateport/' + number_uuid, getConfig());
        };
        dataFactory.postUpdateNumberPort = function(data) {
            return $http.post(urlBase + '/admin/portnumber', data, getConfig());
        };
        dataFactory.updateAAVisibility = function(data) {
            return $http.post(urlBase + '/admin/updateaavisibility', data, getConfig());
        };
        dataFactory.testloop = function(data) {
            return $http.post(urlBase + '/call/callresponse', data, getConfig());
        };

        dataFactory.getCustomExtensions = function(domain_uuid) {
            return $http.get(urlBase + '/admin/getcustomexts/' + domain_uuid, getConfig());
        };
        dataFactory.getDeleteCustomExtension = function(uuid) {
            return $http.get(urlBase + '/admin/deletecustomext/' + uuid, getConfig());
        };
        dataFactory.postCreateCustomExtension = function(data) {
            return $http.post(urlBase + '/admin/createcustomext', data, getConfig());
        };
        dataFactory.postUpdateCustomExtension = function(data) {
            return $http.post(urlBase + '/admin/updatecustomext', data, getConfig());
        };

        dataFactory.getOtherExtensions = function(domain_uuid) {
            return $http.get(urlBase + '/admin/getotherexts/' + domain_uuid, getConfig());
        };
        dataFactory.getDeleteOtherExtension = function(uuid) {
            return $http.get(urlBase + '/admin/deleteotherext/' + uuid, getConfig());
        };
        dataFactory.postCreateOtherExtension = function(data) {
            return $http.post(urlBase + '/admin/createotherext', data, getConfig());
        };
        dataFactory.postUpdateOtherExtension = function(data) {
            return $http.post(urlBase + '/admin/updateotherext', data, getConfig());
        };

        //Demo Usage Update
        dataFactory.getUpdateDemoUsage = function(userUuid, type) {
            return $http.get(urlBase + '/user/updatedemousage/' + userUuid + '/' + type,
                getConfig());
        };
        dataFactory.getDemoUsage = function(userUuid) {
            return $http.get(urlBase + '/user/getdemousage/' + userUuid, getConfig());
        };

        //Settings Routes
        dataFactory.postUpdateUser = function(data) {
            return $http.post(urlBase + '/user/update', data, getConfig());
        };
        dataFactory.getUserGroups = function() {
            return $http.get(urlBase + '/admin/getaccessgroups', getConfig());
        };
        dataFactory.getSetVoicemailStatus = function(userUuid, status) {
            return $http.get(urlBase + '/voicemail/setvoicemailstatus/' + userUuid +
                '/' + status, getConfig());
        };
        dataFactory.getVoicemailStatus = function(userUuid, status) {
            return $http.get(urlBase + '/voicemail/getvoicemailstatus', getConfig());
        };
        dataFactory.postFindMeFollow = function(data) {
            return $http.post(urlBase + '/user/setfollowmestatus/', data, getConfig());
        };
        dataFactory.postUpdateVoicemail = function(data) {
            return $http.post(urlBase + '/voicemail/update', data, getConfig());
        };
        dataFactory.postUploadGreeting = function(data) {
            return $http.post(urlBase + '/voicemail/greeting', data, getUploadConfig());
        };
        dataFactory.getVoicemailGreetings = function(userUuid) {
            return $http.get(urlBase + '/voicemail/greetings/' + userUuid, getConfig());
        };
        dataFactory.getRemoveGreeting = function(uuid) {
            return $http.get(urlBase + '/voicemail/greeting/remove/' + uuid, getConfig());
        };
        dataFactory.postSetGreetingId = function(data) {
            return $http.post(urlBase + '/voicemail/greeting/setid', data, getConfig());
        };

        dataFactory.updateVoicemailGreetingName = function(greetingUuid, greetingName) {
            var url = urlBase + "/voicemail/greeting/updatename/" + greetingUuid + "/" +
                greetingName;
            return $http.get(url, getConfig());
        };
        dataFactory.postUpdateRingtones = function(data) {
            return $http.post(urlBase + '/user/ringtones', data, getConfig());
        };
        dataFactory.postUpdateRingtonesSource = function(data) {
            return $http.post(urlBase + '/user/ringtones/source', data, getConfig());
        };
        dataFactory.postUpdateRingtonesVolume = function(data) {
            return $http.post(urlBase + '/user/ringtones/volume', data, getConfig());
        };
        dataFactory.getUserRingtoneSettings = function(user_uuid) {
            return $http.get(urlBase + '/user/ringtones/' + user_uuid, getConfig());
        };
        dataFactory.postUpdateDefaultRingtones = function(data) {
            return $http.post(urlBase + '/user/defaultringtones', data, getConfig());
        };
        dataFactory.postAdminResetPassword = function(data) {
            return $http.post(urlBase + '/user/admin/resetpassword', data, getConfig());
        };
        dataFactory.postToggleRecordAll = function(data) {
            return $http.post(urlBase + '/user/admin/recordallcalls', data, getConfig());
        };
        dataFactory.postUserProfileDisable = function(data) {
            return $http.post(urlBase + '/user/admin/userprofile', data, getConfig());
        };
        dataFactory.postToggleAdminStatus = function(data) {
            return $http.post(urlBase + '/user/admin/userisadmin', data, getConfig());
        };
        dataFactory.postToggleUserBillingStatus = function(data) {
            return $http.post(urlBase + '/user/admin/userisbilled', data, getConfig());
        };
        
        dataFactory.postUserProfileDelete = function(data) {
            return $http.post(urlBase + '/user/admin/delete/userprofile', data,
                getConfig());
        };
        dataFactory.postChangeUserExtension = function(data) {
            return $http.post(urlBase + '/user/admin/changeextension', data, getConfig());
        };
        dataFactory.postChangeUserDid = function(data) {
            return $http.post(urlBase + '/user/admin/changedid', data, getConfig());
        };

        /*** Forwarding Ringgroup Routes ********/
        dataFactory.getInitializeForwardingRingGroup = function(user_uuid) {
            return $http.get(urlBase + '/user/forwarding/createringroup/' + user_uuid,
                getConfig());
        };
        dataFactory.getDeleteRinggroupDestination = function(dest_uuid, user_uuid) {
            return $http.get(urlBase + '/user/forwarding/deletedest/' + dest_uuid + '/' +
                user_uuid, getConfig());
        };
        dataFactory.postToggleForwarding = function(data) {
            return $http.post(urlBase + '/user/forwarding/toggle', data, getConfig());
        };
        dataFactory.postUpdateForwarding = function(data) {
            return $http.post(urlBase + '/user/forwarding/update', data, getConfig());
        };
        dataFactory.postAddRinggroupDestination = function(data) {
            return $http.post(urlBase + '/user/forwarding/adddest', data, getConfig());
        };
        dataFactory.postUpdateRinggroupDestination = function(data) {
            return $http.post(urlBase + '/user/forwarding/updatedest', data, getConfig());
        };

        // Audio Routes
        dataFactory.postUploadAudioFile = function(data) {
            return $http.post(urlBase + '/audio/upload', data, getUploadConfig());
        };
        dataFactory.getAudioLibrary = function(category) {
            return $http.get(urlBase + '/audiolibrary/get/' + category, getConfig());
        };
        dataFactory.getAudioLibraryByUuid = function(category, Uuid) {
            return $http.get(urlBase + '/audio/getbyuuid/' + category + '/' + Uuid,
                getConfig());
        };
        dataFactory.getAudioLibraryByDomainAndCategory = function(category, Uuid) {
            return $http.get(urlBase + '/audio/getbydomainandcategory/' + category +
                '/' + Uuid, getConfig());
        };
        dataFactory.getAudioLibrariesByDomain = function(domainUuid) {
            return $http.get(urlBase + '/audio/getbydomain/' + domainUuid, getConfig());
        };
        dataFactory.getDeleteAudioLibraryByUuid = function(uuid, userUuid) {
            return $http.get(urlBase + '/audio/getdelete/' + uuid + '/' + userUuid,
                getConfig());
        };
        dataFactory.getDownloadAudioFile = function(uuid) {
            return $http.get(urlBase + '/audio/getfile/' + uuid, getConfig());
        };
        dataFactory.getRenameAudioLibraryByUuid = function(uuid, filename) {
            return $http.get(urlBase + '/audio/getrename/' + uuid + '/' + filename,
                getConfig());
        };
        dataFactory.getRenameAudioLibraryByUuid = function(uuid, filename) {
            return $http.get(urlBase + '/audio/getrename/' + uuid + '/' + filename,
                getConfig());
        };
        // Music On Hold
        dataFactory.getMusicOnHoldByDomain = function(domainUuid) {
            return $http.get(urlBase + '/audio/musiconhold/getbydomain/' + domainUuid,
                getConfig());
        };

        dataFactory.postCreateMusicOnHold = function(data) {
            return $http.post(urlBase + '/audio/musiconhold/create', data,
                getUploadConfig());
        };
        dataFactory.postAddMusicToMusicOnHold = function(data) {
            return $http.post(urlBase + '/audio/musiconhold/addmusic', data,
                getUploadConfig());
        };
        dataFactory.getDeleteMusicFileFromMusicOnHold = function(musicUuid, fileName) {
            return $http.get(urlBase + '/audio/musiconhold/getdeletefile/' + musicUuid +
                '/' + fileName, getConfig());
        };
        dataFactory.reloadModLocalStream = function(domainUuid) {
            return $http.get(urlBase + '/audio/musiconhold/reload/' + domainUuid,
                getConfig());
        };
        dataFactory.postRenameMusicFile = function(data) {
            return $http.post(urlBase + '/audio/musiconhold/renamefile', data,
                getConfig());
        };
        dataFactory.createDefaultMoh = function(domainUuid) {
            return $http.get(urlBase + '/audio/musiconhold/default/' + domainUuid,
                getConfig());
        };
        dataFactory.updateParkingMoh = function(mohUuid, fileName) {
            return $http.get(
                urlBase + '/audio/musiconhold/updateparkingmoh/' + mohUuid + '/' +
                fileName,
                getConfig()
            );
        };
        dataFactory.getCurrentParkingMoh = function() {
            return $http.get(urlBase + "/audio/musiconhold/getparkingmohfilename",
                getConfig());
        };

        /********* Auto Attendant ******/
        dataFactory.getAutoAttendants = function(domain_uuid) {
            return $http.get(urlBase + '/autoAttendant/getall/' + domain_uuid,
                getConfig());
        };

        dataFactory.getBasicAutoAttendantInfo = function(domain_uuid) {
            return $http.get(urlBase + '/autoAttendant/getallbasic/' + domain_uuid,
                getConfig());
        };
        dataFactory.getDeleteBasicAttendant = function(domain_uuid) {
            return $http.get(urlBase + '/autoAttendant/deletebasicaa/' + domain_uuid,
                getConfig());
        };
        dataFactory.postUpdateAttendantDid = function(data) {
            return $http.post(urlBase + '/autoAttendant/updatebasicdid', data,
                getConfig());
        };
        dataFactory.postUpdateAttendantLocation = function(data) {
            return $http.post(urlBase + '/autoAttendant/updatebasiclocation', data,
                getConfig());
        };


        dataFactory.getBareAttendants = function(domain_uuid) {
            return $http.get(urlBase + '/autoAttendant/getbare/' + domain_uuid,
                getConfig());
        };
        dataFactory.sendAutoAttendant = function(data) {
            return $http.post(urlBase + '/autoAttendant/save', data, getConfig());
        };
        dataFactory.postSaveNewSecondaryNumber = function(data) {
            return $http.post(urlBase + '/autoAttendant/addsecondarynumber', data,
                getConfig());
        };
        dataFactory.getDeleteSecondaryNumber = function(number_uuid) {
            return $http.get(urlBase + '/autoAttendant/deletesecondary/' + number_uuid,
                getConfig());
        };
        dataFactory.postChangeAaNumber = function(data) {
            return $http.post(urlBase + '/autoAttendant/changedid', data, getConfig());
        };
        dataFactory.postToggleAttendant = function(data) {
            return $http.post(urlBase + '/autoAttendant/toggleattendant', data,
                getConfig());
        };
        dataFactory.postCreateEmptyIvr = function(data) {
            return $http.post(urlBase + '/autoAttendant/createnew', data, getConfig());
        };
        dataFactory.postSaveHoliday = function(data) {
            return $http.post(urlBase + '/autoAttendant/saveholiday', data, getConfig());
        };
        dataFactory.getDeleteHoliday = function(dialplan_uuid, ivr_menu_uuid) {
            return $http.get(urlBase + '/autoAttendant/deleteholiday/' + dialplan_uuid +
                '/' + ivr_menu_uuid, getConfig());
        };
        dataFactory.getPresetHolidays = function(ivr_menu_uuid) {
            return $http.get(urlBase + '/autoAttendant/getpresetholidays/' +
                ivr_menu_uuid, getConfig());
        };
        dataFactory.postTogglePresetHoliday = function(data) {
            return $http.post(urlBase + '/autoAttendant/togglepresetholiday', data,
                getConfig());
        };
        dataFactory.updateAutoAttendant = function(data) {
            return $http.post(urlBase + '/autoAttendant/update/', data, getConfig());
        };
        dataFactory.postCloneAutoAttendant = function(data) {
            return $http.post(urlBase + '/autoAttendant/clone/', data, getConfig());
        };
        dataFactory.postDeleteAttendant = function(data) {
            return $http.post(urlBase + '/autoAttendant/delete', data, getConfig());
        };
        dataFactory.postUploadAttendantGreeting = function(data) {
            return $http.post(urlBase + '/autoAttendant/recording/upload', data,
                getUploadConfig());
        };
        dataFactory.postUploadAttendantVoicemailGreeting = function(data) {
            return $http.post(urlBase + '/autoAttendant/voicemailgreeting/upload', data,
                getUploadConfig());
        };
        dataFactory.postUpdateAttendantVoicemail = function(data) {
            return $http.post(urlBase + '/autoAttendant/voicemail/update', data,
                getConfig());
        };
        dataFactory.updateGreetingTitle = function(data) {
            return $http.post(urlBase + '/autoAttendant/updategreetingtitle', data,
                getConfig());
        };
        dataFactory.postUpdateAaVoicemailGreetingRecord = function(data) {
            return $http.post(urlBase + '/autoAttendant/updatevoicemailgreetingtitle',
                data, getConfig());
        };
        dataFactory.deleteAaGreeting = function(audio_library_uuid, ivr_menu_uuid) {
            return $http.get(urlBase + '/autoAttendant/deleteaagreeting/' +
                audio_library_uuid + '/' + ivr_menu_uuid, getConfig());
        };
        dataFactory.deleteGreeting = function(audio_library_uuid) {
            return $http.get(urlBase + '/autoAttendant/deletegreeting/' +
                audio_library_uuid, getConfig());
        };
        dataFactory.deleteAaVoicemailGreeting = function(voicemail_greeting_uuid) {
            return $http.get(urlBase + '/autoAttendant/deletevoicemailgreeting/' +
                voicemail_greeting_uuid, getConfig());
        };
        dataFactory.getAvailableDidsForAa = function(domain_uuid) {
            return $http.get(urlBase + '/autoAttendant/availabledids/' + domain_uuid,
                getConfig());
        };
        dataFactory.postSetGreeting = function(data) {
            return $http.post(urlBase + '/autoAttendant/recording/set', data,
                getUploadConfig());
        };
        dataFactory.postSaveMenuOption = function(data) {
            return $http.post(urlBase + '/autoAttendant/savemenuoption', data,
                getConfig());
        };
        dataFactory.getOptionsList = function(ivr_uuid) {
            return $http.get(urlBase + '/autoAttendant/getOptions/' + ivr_uuid,
                getConfig());
        };
        dataFactory.postDeleteMenuOption = function(data) {
            return $http.post(urlBase + '/autoAttendant/deletemenuoption', data,
                getConfig());
        };
        dataFactory.postChangeAaGreeting = function(data) {
            return $http.post(urlBase + '/autoAttendant/changegreeting', data,
                getConfig());
        };
        dataFactory.getSchedule = function(ivr_uuid) {
            return $http.get(urlBase + '/autoAttendant/getSchedule/' + ivr_uuid,
                getConfig());
        };
        dataFactory.getUnavailableDid = function() {
            return $http.get(urlBase + '/autoAttendant/getUnavailableDid', getConfig());
        };
        dataFactory.getNewNumber = function(domain_uuid, number) {
            return $http.get(urlBase + '/autoAttendant/getnewnumber/' + domain_uuid +
                '/' + number, getConfig());
        };
        dataFactory.getTestNumber = function(domain_uuid, number) {
            return $http.get(urlBase + "/autoAttendant/gettestnumber/" + domain_uuid +
                             '/' + number, getConfig());
        };
        dataFactory.getNewSecondaryNumber = function(domain_uuid, number) {
            return $http.get(urlBase + '/autoAttendant/getnewsecondarynumber/' +
                domain_uuid + '/' + number + '/secondary', getConfig());
        };
        dataFactory.getVoicemailGreetingsById = function(domain_uuid, voicemail_id) {
            return $http.get(urlBase + '/autoAttendant/greetings/' + domain_uuid + '/' +
                voicemail_id, getConfig());
        };
        dataFactory.postSetVoicemailGreetingId = function(data) {
            return $http.post(urlBase + '/autoAttendant/voicemail/greeting/setid', data,
                getConfig());
        };
        dataFactory.getRingGroups = function(domain_uuid) {
            return $http.get(urlBase + '/autoAttendant/ringgroups/' + domain_uuid,
                getConfig());
        };
        dataFactory.postSaveRingGroup = function(data) {
            return $http.post(urlBase + '/autoAttendant/saveringgroup', data, getConfig());
        };
        dataFactory.getRestartRinggroup = function(uuid) {
            return $http.get(urlBase + '/autoAttendant/restartringgroup/' + uuid,
                getConfig());
        };
        dataFactory.getDeleteRingGroup = function(uuid) {
            return $http.get(urlBase + '/autoAttendant/deleteringgroup/' + uuid,
                getConfig());
        };

        /********* Tag Methods **************/
        dataFactory.postCreateNewTag = function(data) {
            return $http.post(urlBase + '/tags/create', data, getConfig());
        };
        dataFactory.getAvailableTags = function(data) {
            return $http.get(urlBase + '/tags/get', getConfig());
        };
        dataFactory.postRemoveTags = function(data) {
            return $http.post(urlBase + '/tags/remove', data, getConfig());
        };
        dataFactory.postAssignTags = function(data) {
            return $http.post(urlBase + '/tags/assign', data, getConfig());
        };


        // **************USER FAX******************
        dataFactory.getToggleUserFax = function(uuid, did) {
            return $http.get(urlBase + '/fax/userfax/toggle/' + uuid + '/' + did,
                getConfig());
        };
        dataFactory.getCheckUserFax = function(uuid) {
            return $http.get(urlBase + '/fax/userfax/check/' + uuid, getConfig());
        };
        dataFactory.getUserFaxData = function(domain_uuid, did) {
            return $http.get(urlBase + '/fax/userfax/data/' + domain_uuid + '/' + did,
                getConfig());
        };

        /********** ROBO CALL **********/
        dataFactory.postRoboCall = function(data) {
            return $http.post(urlBase + '/autocall/create', data, getConfig());
        };
        dataFactory.getUserSmsNumbers = function() {
            return $http.get(urlBase + '/autocall/getsmsnumbers', getConfig());
        };
        dataFactory.getAvailableDidsforAm = function() {
            return $http.get(urlBase + '/autocall/getdids', getConfig());
        };
        dataFactory.postAddCustomField = function(data) {
            return $http.post(urlBase + '/autocall/custom/add', data, getConfig());
        };
        dataFactory.postUpdateAmContact = function(data) {
            return $http.post(urlBase + '/autocall/contact/update', data, getConfig());
        };
        dataFactory.deleteAmRecording = function(audio_library_uuid) {
            return $http.get(urlBase + '/autocall/deleterecording/' +
                audio_library_uuid, getConfig());
        };
        dataFactory.postUpdateAmRecordingTitle = function(data) {
            return $http.post(urlBase + '/autocall/editrecording', data, getConfig());
        };
        dataFactory.updateRoboCall = function(data) {
            return $http.post(urlBase + '/autocall/update/' + data.robocall_uuid, data,
                getConfig());
        };
        dataFactory.getUpdateCampaignStatus = function(status, robocall_uuid) {
            return $http.get(urlBase + '/autocall/status/' + status + '/' +
                robocall_uuid, getConfig());
        };
        dataFactory.deleteRobocallCampaign = function(robocall_uuid) {
            return $http.get(urlBase + '/autocall/delete/' + robocall_uuid, getConfig());
        };
        dataFactory.postAddContact = function(data) {
            return $http.post(urlBase + '/autocall/contacts/store', data, getConfig());
        };
        dataFactory.postRoboCallContactArray = function(data) {
            return $http.post(urlBase + '/autocall/contacts/upload', data, getConfig());
        };
        dataFactory.postRoboCallContactJob = function(data) {
            return $http.post(urlBase + '/autocall/contacts/uploadjob', data, getConfig());
        };
        dataFactory.deleteRoboCallContacts = function(rc_cntc_uuid) {
            return $http.get(urlBase + '/autocall/contacts/delete/' + rc_cntc_uuid,
                getConfig());
        };
        dataFactory.getDuplicateCampaign = function(robocall_uuid) {
            return $http.get(urlBase + '/autocall/duplicate/' + robocall_uuid,
                getConfig());
        };
        dataFactory.getRoboCallContacts = function(rc_uuid) {
            return $http.get(urlBase + '/autocall/contacts/retrieve/' + rc_uuid,
                getConfig());
        };
        dataFactory.getRoboCallContactsOnEvent = function(rc_uuid) {
            return $http.get(urlBase + '/autocall/contacts/get/' + rc_uuid, getConfig());
        };
        dataFactory.postGetAllCampaigns = function(data) {
            return $http.post(urlBase + '/autocall/getall', data, getConfig());
        };
        dataFactory.getArchivedCampaigns = function() {
            return $http.get(urlBase + '/autocall/getarchives', getConfig());
        };
        dataFactory.getArchiveCampaign = function(robocall_uuid) {
            return $http.get(urlBase + '/autocall/archive/' + robocall_uuid, getConfig());
        };

        dataFactory.getRoboCallUUID = function(rc_uuid) {
            return $http.get(urlBase + '/autocall/show/' + rc_uuid, getConfig());
        };
        dataFactory.postUploadRecording = function(data) {
            return $http.post(urlBase + '/autocall/recording/upload', data,
                getUploadConfig());
        };
        dataFactory.postCreateRoboCallSchedule = function(data) {
            return $http.post(urlBase + '/autocall/schedule/create', data, getConfig());
        };
        dataFactory.postUpdateRoboCallSchedule = function(data) {
            return $http.post(urlBase + '/autocall/schedule/update', data, getConfig());
        };
        dataFactory.postStartRoboCallCampaign = function(data) {
            return $http.post(urlBase + '/autocall/queue', data, getConfig());
        };
        dataFactory.getScheduleDeliveries = function(robocall_schedule_uuid) {
            return $http.get(urlBase + '/autocall/schedule/deliveries/' +
                robocall_schedule_uuid, getConfig());
        };
        dataFactory.getRemoveScheduleEntry = function(uuid) {
            return $http.get(urlBase + '/autocall/schedule/remove/' + uuid, getConfig());
        };
        dataFactory.postSendTestEmail = function(data) {
            return $http.post(urlBase + '/autocall/sendtestemail', data, getConfig());
        };
        dataFactory.postUpdateEmailTemplate = function(data) {
            return $http.post(urlBase + '/company/emailtemplate/save', data, getConfig());
        };
        dataFactory.getEmailTemplates = function(data) {
            return $http.get(urlBase + '/company/getemailtemplates', getConfig());
        };


        /********** 3 -  WAY CALL **********/
        dataFactory.merge3WayCall = function(data) {
            return $http.post(urlBase + '/conference/merge', data, getConfig());
        };

        dataFactory.hangUp3Way = function(data) {
            console.log(data);
            return $http.get(urlBase + '/conference/hangup/' + data.confName + '/' +
                data.callID, getConfig());
        };

        dataFactory.mergeAfter3Way = function(confName) {
            return $http.get(urlBase + '/conference/endandmerge/' + confName, getConfig());
        };

        dataFactory.hold3Way = function(data) {
            return $http.get(urlBase + '/conference/hold/' + data.confName + '/' + data
                .callID, getConfig());
        };

        dataFactory.unhold3Way = function(data) {
            return $http.get(urlBase + '/conference/unhold/' + data.confName + '/' +
                data.callID, getConfig());
        };

        dataFactory.mute3Way = function(data) {
            return $http.get(urlBase + '/conference/mute/' + data.confName + '/' + data
                .callID, getConfig());
        };

        dataFactory.unmute3Way = function(data) {
            return $http.get(urlBase + '/conference/unmute/' + data.confName + '/' +
                data.callID, getConfig());
        };

        dataFactory.recodStart3Way = function(data) {
            return $http.get(urlBase + '/conference/record/start/' + data, getConfig());
        };

        dataFactory.recordStop3Way = function(data) {
            return $http.get(urlBase + '/conference/record/stop/' + data, getConfig());
        };

        dataFactory.sendDTMF3Way = function(digits) {
            return $http.get(urlBase + '/conference/senddtmf/' + digits, getConfig());
        };

        //***** Partner Copy */
        dataFactory.postCopyToPartnerByFile = function(data) {
            return $http.post(urlBase + '/integration/copytopartner/file', data, getConfig());
        };
        dataFactory.postCopyToPartnerByText = function(data) {
            return $http.post(urlBase + '/integration/copytopartner/text', data, getConfig());
        };

        //***** Hawksoft Copy  */
        dataFactory.postCopyConversations = function(data) {
            return $http.post(urlBase + '/hawksoft/conversation', data, getConfig());
        };
        dataFactory.postHSCopySmsTexts = function(data) {
            return $http.post(urlBase + '/hawksoft/sms', data, getConfig());
        };
        dataFactory.postHSCopyVoicemail = function(data) {
            return $http.post(urlBase + '/hawksoft/voicemail', data, getConfig());
        };
        dataFactory.postHSCopyVoicemailInfo = function(data) {
            return $http.post(urlBase + '/hawksoft/voicemailinfo', data, getConfig());
        };
        dataFactory.postHSCopyRecording = function(data) {
            return $http.post(urlBase + '/hawksoft/recording', data, getConfig());
        };
        dataFactory.postHSCopyFileshare = function(data) {
            return $http.post(urlBase + '/hawksoft/fileshare', data, getConfig());
        };
        dataFactory.postHSCopyCall = function(data) {
            return $http.post(urlBase + '/hawksoft/call', data, getConfig());
        };
        dataFactory.postHSCopyVoicemail = function(data) {
            return $http.post(urlBase + '/hawksoft/voicemail', data, getConfig());
        };
        dataFactory.postHSCopyVideoConference = function(data) {
            return $http.post(urlBase + '/hawksoft/videoconference', data, getConfig());
        };
        dataFactory.postHSCopyChatMessages = function(data) {
            return $http.post(urlBase + '/hawksoft/chatmessages', data, getConfig());
        };
        dataFactory.postCopyFaxToManagementSystem = function(data) {
            return $http.post(urlBase + '/hawksoft/fax', data, getConfig());
        };
        dataFactory.postExportQuotesheet = function(data) {
            return $http.post(urlBase + '/hawksoft/quotesheet', data, getConfig());
        };



        /********** DOMAINS STATUS **********/
        dataFactory.getDomainsStatus = function(domain_uuid) {
            return $http.get(urlBase + '/domain/status/' + domain_uuid, getConfig());
        };
        dataFactory.updDomainsStatus = function(data) {
            return $http.post(urlBase + '/domain/status/' + data.status_uuid, data,
                getConfig());
        };
        dataFactory.insDomainsStatus = function(data) {
            return $http.post(urlBase + '/domain/status', data, getConfig());
        };

        /******** MISC HELPFUL ROUTES ************/
        dataFactory.getDaysRemain = function(domainUuid) {
            return $http.get(urlBase + '/daysremain/' + domainUuid); //days remaining in month
        };
        dataFactory.nehatest = function() {
            return $http.get(urlBase + '/nehatest'); //test
        };


        //**********Event Scheduler*************

        dataFactory.postAddConferenceEvent = function(data) {
            return $http.post(urlBase + '/eventscheduler/createevent', data, getConfig());
        };
        dataFactory.postupdateConferenceEvent = function(data) {
            return $http.post(urlBase + '/eventscheduler/updateevent', data, getConfig());
        };
        dataFactory.deleteConferenceEvent = function(uuid) {
            return $http.get(urlBase + '/eventscheduler/deleteevent/' + uuid, getConfig());
        };
        dataFactory.getConferenceEvents = function() {
            return $http.get(urlBase + '/eventscheduler/getevents', getConfig());
        };
        dataFactory.getTodaysSchedule = function() {
            return $http.get(urlBase + '/eventscheduler/gettodaysschedule', getConfig());
        };
        dataFactory.getWeeksSchedule = function() {
            return $http.get(urlBase + '/eventscheduler/getweeksschedule', getConfig());
        };
        dataFactory.getMonthsSchedule = function() {
            return $http.get(urlBase + '/eventscheduler/getmonthsschedule', getConfig());
        };
        dataFactory.getMarkEventStarted = function(uuid) {
            return $http.get(urlBase + '/eventscheduler/flagasstarted/' + uuid,
                getConfig());
        };


        //************* Time Keeper ****************//

        dataFactory.getTimeKeeperUsers = function() {
            return $http.get(urlBase + '/timeclockpro/getusers', getConfig());
        };
        dataFactory.getRemainingData = function(data) {
            return $http.post(urlBase + '/timeclockpro/getremainingdata', data,
                getConfig());
        };
        dataFactory.setPayRate = function(data) {
            return $http.post(urlBase + '/timeclockpro/setpay', data, getConfig());
        };
        dataFactory.postCreateTkGroup = function(data) {
            return $http.post(urlBase + '/timeclockpro/creategroup', data, getConfig());
        };
        dataFactory.postUpdateTkGroup = function(data) {
            return $http.post(urlBase + '/timeclockpro/updategroup', data, getConfig());
        };
        dataFactory.postRemoveTkGroupMember = function(data) {
            return $http.post(urlBase + '/timeclockpro/removemember', data, getConfig());
        };
        dataFactory.getRemoveTkGroup = function(uuid) {
            return $http.get(urlBase + '/timeclockpro/removegroup/' + uuid, getConfig());
        };
        dataFactory.getTkGroups = function() {
            return $http.get(urlBase + '/timeclockpro/getgroups', getConfig());
        };
        dataFactory.openTkRecord = function(uuid, status) {
            return $http.get(urlBase + '/timeclockpro/openrecord/' + uuid + "/" +
                status, getConfig());
        };
        dataFactory.closeTkRecord = function() {
            return $http.get(urlBase + '/timeclockpro/closerecord', getConfig());
        };
        dataFactory.setFrequency = function(data) {
            return $http.post(urlBase + '/timeclockpro/setfrequency', data, getConfig());
        };
        dataFactory.addEditRecord = function(data) {
            return $http.post(urlBase + '/timeclockpro/addeditrecord', data, getConfig());
        };
        dataFactory.postDeleteRecord = function(data) {
            return $http.post(urlBase + '/timeclockpro/deleterecord', data, getConfig());
        };
        dataFactory.getRecords = function(userUuid, fulldate) {
            return $http.get(urlBase + '/timeclockpro/getrecords/' + userUuid + "/" +
                fulldate, getConfig());
        };
        dataFactory.getMonthlyRecords = function(data) {
            return $http.post(urlBase + '/timeclockpro/getmonthlyrecords', data,
                getConfig());
        };
        dataFactory.getPostTeamDetails = function(data) {
            if (data.print) {
                var headers = getConfig();
                headers.responseType = 'arraybuffer';
                return $http.post(urlBase + '/timeclockpro/getteamdetails', data,
                    headers);
            } else {
                return $http.post(urlBase + '/timeclockpro/getteamdetails', data,
                    getConfig());
            }
        };
        dataFactory.getUserDetails = function(data) {
            if (data.print) {
                var headers = getConfig();
                headers.responseType = 'arraybuffer';
                return $http.post(urlBase + '/timeclockpro/getuserdetails', data,
                    headers);
            } else {
                return $http.post(urlBase + '/timeclockpro/getuserdetails', data,
                    getConfig());
            }
        };

        dataFactory.postDeleteScreenshot = function(data) {
            return $http.post(urlBase + '/timeclockpro/screenshot/delete', data,
                getConfig());
        };

        dataFactory.postUpdatePushNotification = function(data) {
            return $http.post(urlBase + '/user/pushtype', data, getConfig());
        };
        dataFactory.postUpdatePushFrequency = function(data) {
            return $http.post(urlBase + '/user/pushfrequency', data, getConfig());
        };

        //  Greenbox Integration
        dataFactory.updateFilePath = function(data) {
            return $http.post(urlBase + '/greenbox/updatefilepath', data, getConfig());
        };
        dataFactory.updateGreenboxStatus = function(data) {
            return $http.post(urlBase + '/greenbox/updategreenboxstatus', data,
                getConfig());
        };
        dataFactory.getManagementSystems = function() {
            return $http.get(urlBase + '/greenbox/getmanagementsystems', getConfig());
        };
        dataFactory.updateManagementSystem = function(data) {
            return $http.post(urlBase + '/greenbox/updatemanagementsystem', data,
                getConfig());
        };
        dataFactory.getAgencyIntegrationSettings = function(domain_uuid) {
            return $http.get(urlBase + '/greenbox/getagencyintegration/' + domain_uuid,
                getConfig());
        };
        dataFactory.updateAgencyIntegration = function(data) {
            return $http.post(urlBase + '/greenbox/updateagencyintegration', data,
                getConfig());
        };
        dataFactory.postUpdateScreenpopFields = function(data) {
            return $http.post(urlBase + '/user/screenpop/updatefields', data, getConfig());
        };

        // Ams360
        dataFactory.ams360ScreenPop = function(phone, domain_uuid) {
            return $http.get(urlBase + '/ams360/screenpop/' + phone + '/' + domain_uuid, getConfig());
        };
        dataFactory.ams360ActivityRecords = function(data) {
            return $http.post(urlBase + '/ams360/saveactivityrecords', data, getConfig());
        };
        dataFactory.ams360GetContacts = function(data) {
            return $http.post(urlBase + '/ams360/contacts/', data, getConfig());
        };
        dataFactory.ams360SyncContacts = function(data) {
            return $http.post(urlBase + '/ams360/synccontacts/', data, getConfig());
        };
        dataFactory.getAms360BasicCustomerInfo = function(phone, domainUuid) {
            return $http.get(urlBase + '/ams360/getbasicinfo/' + phone + '/' + domainUuid, getConfig());
        };
        dataFactory.getFullAmsCustomerInfo = function(customerId, domainUuid) {
            return $http.get(urlBase + '/ams360/getcustomerbyid/' + customerId + '/' + domainUuid, getConfig());
        };
        dataFactory.ams360GetContactByUuid = function(contactUuid) {
            return $http.get(urlBase + '/ams360/getcontactbyuuid/' + contactUuid, getConfig());
        };
        dataFactory.ams360TestCreds = function(domainUuid) {
            var url = urlBase + "/ams360/testamscreds/" + domainUuid;
            return $http.get(url, getConfig());
        };
        dataFactory.ams360GetActivityList = function(domainUuid) {
            var url = urlBase + "/ams360/getactivitylist/" + domainUuid;
            return $http.get(url, getConfig());
        };
        dataFactory.getFullAmsCustomerInfo = function(customerId, domainUuid) {
            return $http.get(urlBase + '/ams360/getcustomerbyid/' + customerId + '/' + domainUuid, getConfig());
        }
        dataFactory.postSearchAmsContactsByPrefix = function(data) {
            return $http.post(urlBase + '/ams360/searchcontactsbyprefix', data, getConfig());
        };

        //QQCatalyst
        dataFactory.qqCatalystCustomerInfo = function(phone) {
            return $http.get(urlBase + '/qqcatalyst/getcustomerinfo/' + phone, getConfig());
        };
        dataFactory.getQqBasicCustomerInfo = function(phone) {
            return $http.get(urlBase + '/qqcatalyst/getbasiccustomerinfo/' + phone, getConfig());
        };
        dataFactory.getFullQqCustomerInfo = function(customerId) {
            return $http.get(urlBase + '/qqcatalyst/getcustomerbyid/' + customerId, getConfig());
        };
        
        dataFactory.qqCatalystSyncContacts = function(data) {
            return $http.post(urlBase + '/qqcatalyst/syncqqcontacts', data, getConfig());
        };
        dataFactory.qqCatalystGetContacts = function(data) {
            return $http.post(urlBase + '/qqcatalyst/contacts/', data, getConfig());
        };
        dataFactory.qqCatalystPostTask = function(data) {
            return $http.post(urlBase + '/qqcatalyst/postinserttask', data, getConfig());
        };
        dataFactory.getFullQqCustomerInfo = function(customerId) {
            return $http.get(urlBase + '/qqcatalyst/getcustomerbyid/' + customerId, getConfig());
        };

        //Provisioning

        dataFactory.updateProvSettings = function(data) {
            return $http.post(urlBase + '/provisioning/updateprovsettings', data,
                getConfig());
        }
        dataFactory.getProvSettings = function(domainUuid) {
            return $http.get(urlBase + '/provisioning/getprovsettings/' + domainUuid,
                getConfig());
        };
        dataFactory.updateAdvProvSettings = function(data) {
            return $http.post(urlBase + '/provisioning/updateadvprovsettings', data,
                getConfig());
        };
        dataFactory.getAdvProvSettings = function(prov_uuid) {
            return $http.get(urlBase + '/provisioning/getadvprovsettings/' + prov_uuid,
                getConfig());
        };
        dataFactory.getExportCfgFile = function(uuid) {
            return $http.get(urlBase + '/provisioning/exportfile/' + uuid, getConfig());
        };
        dataFactory.rebootProvisioning = function(user_ext, domain) {
            return $http.get(urlBase + '/provisioning/rebootprovision/' + user_ext +
                '/' + domain, getConfig());
        }

        // QUOTESHEETS
        dataFactory.getQuoteSheets = function(locationsGroupUuid) {
            return $http.get(urlBase + '/quotesheets/get/quotesheets/' +
                locationsGroupUuid,
                getConfig());
        };
        dataFactory.getQuoteSheet = function(quoteSheetUuid) {
            return $http.get(urlBase + '/quotesheets/get/quotesheet/' + quoteSheetUuid,
                getConfig());
        };
        dataFactory.getQuoteSheetAnswers = function(quoteSheetUuid) {
            return $http.get(urlBase + '/quotesheets/get/answers/' + quoteSheetUuid,
                getConfig());
        };
        dataFactory.getQuoteSheetStatuses = function(domainUuid) {
            return $http.get(urlBase + '/quotesheets/get/status/' + domainUuid,
                getConfig());
        };
        dataFactory.getQuoteSheetTypes = function(domainUuid) {
            return $http.get(urlBase + '/quotesheets/get/types/' + domainUuid,
                getConfig());
        };
        dataFactory.getQuoteSheetType = function(typeUuid) {
            return $http.get(urlBase + '/quotesheets/get/type/' + typeUuid, getConfig());
        };
        dataFactory.getQuoteSheetTemplate = function(templateUuid) {
            return $http.get(urlBase + '/quotesheets/get/template/' + templateUuid,
                getConfig());
        };
        dataFactory.getQuoteSheetQuestions = function(templateUuid) {
            return $http.get(urlBase + '/quotesheets/get/questions/' + templateUuid,
                getConfig());
        };
        dataFactory.postCreateTemplate = function(data) {
            return $http.post(urlBase + '/quotesheets/new/template', data, getConfig());
        };
        dataFactory.postCreateQuoteSheet = function(data) {
            return $http.post(urlBase + '/quotesheets/new/quotesheet', data, getConfig());
        };
        dataFactory.postCreateQuoteSheetStatus = function(data) {
            return $http.post(urlBase + '/quotesheets/new/status', data, getConfig());
        };
        dataFactory.postCreateQuoteSheetType = function(data) {
            return $http.post(urlBase + '/quotesheets/new/type', data, getConfig());
        };
        dataFactory.postUpdateQuoteSheet = function(data) {
            return $http.post(urlBase + '/quotesheets/update/quotesheet', data,
                getConfig());
        };
        dataFactory.postUpdateQuoteSheetTemplate = function(data) {
            return $http.post(urlBase + '/quotesheets/update/template', data, getConfig());
        };
        dataFactory.postUpdateQuoteSheetStatus = function(data) {
            return $http.post(urlBase + '/quotesheets/update/status', data, getConfig());
        };
        dataFactory.postUpdateQuoteSheetType = function(data) {
            return $http.post(urlBase + '/quotesheets/update/type', data, getConfig());
        };
        dataFactory.postDeleteQuoteSheet = function(data) {
            return $http.post(urlBase + '/quotesheets/delete/quotesheet', data,
                getConfig());
        };
        dataFactory.postDeleteQuoteSheetTemplate = function(data) {
            return $http.post(urlBase + '/quotesheets/delete/template', data, getConfig());
        };
        dataFactory.postCreateDefaultChannel = function(data) {
            return $http.post(urlBase + '/quotesheets/new/defaultchannel', data,
                getConfig());
        };
        dataFactory.postUpdateDefaultChannel = function(data) {
            return $http.post(urlBase + '/quotesheets/update/defaultchannel', data,
                getConfig());
        };
        dataFactory.postQuoteSheetApis = function(data) {
            return $http.post(urlBase + '/quotesheets/new/apis', data, getConfig());
        };
        dataFactory.postDeleteQuoteSheetStatus = function(data) {
            return $http.post(urlBase + '/quotesheets/delete/status', data, getConfig());
        };
        dataFactory.deleteQuoteSheetType = function(typeUuid) {
            return $http.get(urlBase + '/quotesheets/delete/type/' + typeUuid,
                getConfig());
        };
        dataFactory.loadRaterFieldsForExport = function(data) {
            return $http.get(urlBase + '/quotesheets/get/exportfields/' + data,
                getConfig());
        };
        dataFactory.getRaterByName = function(data) {
            return $http.get(urlBase + '/quotesheets/get/rater/' + data, getConfig());
        };
        dataFactory.postQuoteSheetRater = function(data) {
            return $http.post(urlBase + '/quotesheets/new/quotesheetrater', data,
                getConfig());
        };
        dataFactory.getQuoteSheetRater = function(template_id, rater_id) {
            return $http.get(urlBase + '/quotesheets/get/quotesheetrater/' +
                template_id + '/' + rater_id, getConfig());
        };
        dataFactory.getQuoteSheetRaterFields = function(template_id, rater_id) {
            var url = urlBase + '/quotesheets/get/raterfields/' + template_id + "/" +
                rater_id;
            return $http.get(url, getConfig());
        };
        dataFactory.getQuoteSheetRaterEmptyFields = function(rater_id) {
            return $http.get(urlBase + '/quotesheets/get/rateremptyfields/' + rater_id,
                getConfig());
        };
        dataFactory.getQuoteSheetRaters = function() {
            return $http.get(urlBase + '/quotesheets/get/raters', getConfig());
        };
        dataFactory.getTemplateFields = function(template_id) {
            return $http.get(urlBase + '/quotesheets/get/templatefields/' + template_id,
                getConfig());
        };
        dataFactory.postGetQuoteSheetFileInfo = function(data) {
            return $http.post(urlBase + '/quotesheets/quotepass', data, getConfig());
        };
        dataFactory.postGetQuoteSheetPdf = function(data) {
            var headers = getConfig();
            headers.responseType = 'arraybuffer';
            return $http.post(urlBase + '/quotesheets/quotesheetpdf', data, headers);
        };
        dataFactory.updateTemplateLocations = function(data) {
            return $http.post(urlBase + '/quotesheets/update/template/locations', data,
                getConfig());
        };
        dataFactory.retrieveQuotesAtSnapshot = function(data) {
            return $http.post(urlBase + '/quotesheets/quotes/retrievesnapshot/', data,
                getConfig());
        };
        dataFactory.domainHideGlobalTemplate = function(templateUuid) {
            return $http.get(urlBase + '/quotesheets/domain/hide/' + templateUuid,
                getConfig());
        };

        // NEW Quote Sheet Routes
        dataFactory.getElementDataByRaterName = function(xraterId) {
            return $http.get(urlBase + '/quotesheets/elements/inputs/data/' + xraterId, getConfig());
        };
        dataFactory.postStoreTemplate = function(data){
            return $http.post(urlBase + '/quotesheets/template/store', data, getConfig());
        };
        dataFactory.getQuoteSheetTemplates = function(locationUuid) {
            return $http.get(urlBase + '/quotesheets/get/templates/' + locationUuid, getConfig());
        };

        //Route::get("quotesheets/get/templates/{location_uuid}", "QuoteSheetController@getQuoteSheetTemplates");


        dataFactory.broadcastChatMessage = function(data) {
            return $http.post(urlBase + "/chatmessage/broadcast", data, getConfig());
        };
        
        dataFactory.getDestinations = function() {
            return $http.get(urlBase + "/autoattendant/destinations", getConfig());
        };
        dataFactory.getDestination = function(destinationUuid) {
            var url = urlBase + "/autoattendant/destination/" + destinationUuid;
            return $http.get(url, getConfig());
        };
        dataFactory.getAttendants = function(domainUuid) {
            var url = urlBase + "/autoattendant/attendants";
            if (domainUuid) {
                url += "/" + domainUuid;
            }
            return $http.get(url, getConfig());
        };
        dataFactory.getAttendantsByDomain = function(domainUuid) {
            return $http.get(urlBase + "/autoattendant/attendants/" + domainUuid,
                getConfig());
        };
        dataFactory.createAttendant = function(data) {
            var url = urlBase + "/autoattendant/create/attendant";
            if (data instanceof FormData) {
                return $http.post(url, data, getUploadConfig());
            } else {
                return $http.post(url, data, getConfig());
            }
        };
        dataFactory.cloneAttendant = function(data) {
            var url = urlBase + "/autoattendant/clone/attendant";
            return $http.post(url, data, getConfig());
        };
        dataFactory.createResource = function(data) {
            var url = urlBase + "/autoattendant/create/resource";
            if (data instanceof FormData) {
                return $http.post(url, data, getUploadConfig());
            } else {
                return $http.post(url, data, getConfig());
            }
        };
        dataFactory.updateResource = function(data) {
            var url = urlBase + "/autoattendant/update/resource";
            if (data instanceof FormData) {
                return $http.post(url, data, getUploadConfig());
            } else {
                return $http.post(url, data, getConfig());
            }
        };
        dataFactory.destroyResource = function(data) {
            var url = urlBase + "/autoattendant/destroy/resource";
            if (data instanceof FormData) {
                return $http.post(url, data, getUploadConfig());
            } else {
                return $http.post(url, data, getConfig());
            }
        };
        dataFactory.updateAttendant = function(data) {
            var url = urlBase + "/autoattendant/update/attendant";
            if (data instanceof FormData) {
                return $http.post(url, data, getUploadConfig());
            } else {
                return $http.post(url, data, getConfig());
            }
        };
        dataFactory.updateRecording = function(data) {
            var url = urlBase + "/autoattendant/update/recording";
            return $http.post(url, data, getConfig());
        };
        dataFactory.deleteAttendant = function(attendantUuid) {
            var url = urlBase + "/autoattendant/delete/attendant/" + attendantUuid;
            return $http.get(url, getConfig());
        };
        dataFactory.getTimeConditions = function() {
            return $http.get(urlBase + "/autoattendant/timeconditions", getConfig());
        };
        dataFactory.getRingGroups = function() {
            return $http.get(urlBase + "/autoattendant/ringgroups", getConfig());
        };
        dataFactory.getVoicemails = function() {
            return $http.get(urlBase + "/autoattendant/voicemails", getConfig());
        };
        dataFactory.getRecordings = function() {
            return $http.get(urlBase + "/autoattendant/recordings", getConfig());
        };
        dataFactory.getRecordingsWithFiles = function() {
            return $http.get(urlBase + "/autoattendant/recordings/withfiles", getConfig());
        };
        dataFactory.getIvrs = function() {
            return $http.get(urlBase + "/autoattendant/ivrs", getConfig());
        };
        dataFactory.getExtensions = function() {
            return $http.get(urlBase + "/autoattendant/extensions", getConfig());
        };
        dataFactory.getVoicemailGreeting = function(voicemailUuid) {
            var url = urlBase + "/autoattendant/voicemails/greeting/" + voicemailUuid;
            return $http.get(url, getConfig());
        };
        dataFactory.getAnnouncementFileByUuid = function(audioLibraryUuid) {
            var url = urlBase + "/autoattendant/announcements/get/" + audioLibraryUuid;
            return $http.get(url, getConfig());
        };
        dataFactory.createAudioLibraryFromGreeting = function(greetingUuid) {
            var url = urlBase + "/autoattendant/create/audioFile/greeting/" +
                greetingUuid;
            return $http.get(url, getConfig());
        };
        dataFactory.synthesizeTextToSpeech = function(data) {
            var url = urlBase + "/autoattendant/texttospeech/synthesize";
            return $http.post(url, data, getConfig());
        };
        dataFactory.createSynthesizedAudio = function(data) {
            var url = urlBase + "/autoattendant/texttospeech/synthesize/create";
            if (data instanceof FormData) {
                return $http.post(url, data, getUploadConfig());
            }
            return null;
        };
        dataFactory.updateSynthesizedAudio = function(data) {
            var url = urlBase + "/autoattendant/texttospeech/synthesize/update";
            if (data instanceof FormData) {
                return $http.post(url, data, getUploadConfig());
            }
            return null;
        };
        dataFactory.getTranscripts = function() {
            return $http.get(urlBase + "/autoattendant/transcripts", getConfig());
        };
        dataFactory.createPortingNumberAction = function(data) {
            var url = urlBase + "/autoattendant/porting/action/create";
            return $http.post(url, data, getConfig());
        };
        dataFactory.getResource = function(resourceName, resourceUuid) {
            if (!resourceUuid) {
                resourceUuid = null;
            }
            var url = urlBase + "/autoattendant/resources/get/" + resourceName + "/" + resourceUuid;
            return $http.get(url, getConfig());
        };

        return dataFactory;
    }
]);
