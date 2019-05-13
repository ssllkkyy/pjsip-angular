'use strict';

proySymphony.controller('ContactDetailsCtrl', function($scope, $auth, Idle, $uibModal, Keepalive,
    $rootScope, $routeParams, usefulTools, dataFactory, $timeout, $location, $uibModalStack,
    __env, symphonyConfig, $window, $sce, $filter, contactGroupsService, contactService, emulationService,
    callService, emailService, videoConfService, userService, metaService, greenboxService) {


    $scope.contactGroups = contactGroupsService.groups;
    $scope.started = false;
    $rootScope.selectedContacts = {};
    $rootScope.contactsSelected = [];
    $scope.limit = 100;

    $scope.contactLoadInfo = contactService.contactLoadInfo;

    $scope.onNearEndScroll = function() {
        if (!$scope.addingMoreScrollContacts) {
            $scope.addingMoreScrollContacts = true;
            contactService.addMoreScrollContacts();
            $timeout(function() {
                $scope.addingMoreScrollContacts = false;
            }, 1000);
        }
    };

    $scope.showContactsList = true;

    $scope.contacts = function() {
        return contactService.contacts;
    };

    $scope.userContacts = function() {
        return contactService.userContacts;
    };

    $scope.makeCall = callService.makeCall;

    $scope.noEmail = function() {
        $rootScope.showErrorAlert('This User does not have an email set up');
    };

    $scope.conference = videoConfService.videoConference;
    $scope.contactListInfo = {};

    // $rootScope.getNonContacts = function(userUuid) {
    //     dataFactory.getNonContacts(userUuid)
    //         .then(function(response) {
    //             if (__env.enableDebug) console.log("NON CONTACTS");
    //             if (__env.enableDebug) console.log(response.data);
    //             $rootScope.nonContacts = response.data;
    //             if (userUuid !== $rootScope.user.id) $window.localStorage.setItem("nonContacts", JSON.stringify($rootScope.nonContacts));
    //         });
    // };

    // $rootScope.getNonContacts($rootScope.user.id);

    $scope.isCollapsed = false;

    $scope.startEmailClient = function(email) {
        emailService.startEmailClient(email);
    };


    $rootScope.showManageGroups = function() {
        $location.path('/settings');
        $timeout(function() {
            $rootScope.$broadcast('set.contact.groups.tab');
        });
    };

    $rootScope.doEditContactForm = function(contact) {
        var cgroups = [];
        angular.forEach(contactGroupsService.groups, function(group){
            if (group.members.indexOf(contact.contact_uuid) > -1) cgroups.push(group);
        });
        
        if (__env.enableDebug) console.log(contact);
        $uibModalStack.dismissAll();
        var editContact = angular.copy(contact);
        editContact.contactGroups = cgroups;
        editContact.partner_contact = (editContact.contact_type != 'contact' && editContact.contact_type !== '');
        editContact.contact_customer_id = (editContact.settings && editContact.settings.customer_id) ? editContact.settings.customer_id : null;
        $rootScope.actionContact = 'edit';
        $rootScope.profile = {};
        $rootScope.profile.favorite = editContact.favorite;
        $rootScope.profile.contact_profile_color = editContact.contact_profile_color;
        $rootScope.contactPhoneCount = editContact.phones.length;

        $rootScope.uploaderOption = '/user/contact/update-avatar';
        $rootScope.phoneList = editContact.phones;
        var ringtones = contactService.getContactRingtones(contact.contact_uuid);
        // var ringtones;
        if (ringtones && ringtones.length > 0) {
            $rootScope.contactRingtones = ringtones;
        }
        $rootScope.editingContact = editContact;
        var modalData = {
            onClose: function() {
                $rootScope.editingContact = null;
                $rootScope.phoneList = [];
                $rootScope.contactRingtones = [];
            }
        };
        $rootScope.showEditorModal('/company/contactsmaster.html', modalData, 'lg', '', 'static', 'false');
    };

    $rootScope.isPhoneNumber = function(text) {
        var value = text.toString().trim().replace(/^\+/, '');
        return angular.isNumber(+value) && value.length > 9 && value.length < 12;
    };

    $rootScope.showContactPhoto = function(item, size) {
        var temp = {};
        var html = '',
            circle = '38px',
            font = '20px',
            stack = '2x',
            fa = 'lg';
        if (size === 'large') {
            circle = '90px';
            font = '40px';
            stack = '3x';
            fa = '3x';
        }
        if (!item) {
            html += '<span class="fa-stack fa-' + fa + '">' +
                '<i class="fa fa-circle fa-stack-' + stack +
                ' icon-border" style="font-size: ' + circle + '" ></i>' +
                '<i class="fa fa-user fa-stack-1x contact-icon-' + size + '"></i>' +
                '</span>';
        } else {
            temp.contact = item;
            var target = item.contact ? item : (item.cuuid ? temp : item);
            if (!target.contact && (target.contact_uuid || target.cuuid)) target.contact = target;

            if (target.contact) {
                var image = target.contact.contact_profile_image ? target.contact.contact_profile_image : 
                    (target.contact.im ? target.contact.im : null);
                if (!image) {
                    var color = '';
                    if (target.contact.contact_profile_color || target.contact.color) {
                        color = 'style="' + $rootScope.setIconColor(target.contact) + '"';
                    }
                    var icon = '<i class="fa fa-user fa-stack-1x contact-icon-' + size + '"></i>';
                    html += '<span class="fa-stack fa-' + fa + '">' + '<i class="fa fa-circle fa-stack-' + stack +
                        ' icon-border circle-icon-' + size + '" '+color+'></i>' +
                        icon + '</span>';
                } else {
                    html += '<span class="fa-stack fa-' + fa + '">' +
                        '<span class="fa-stack-1x contact-image"><img src="' +
                        $rootScope.pathImgProfile + image +
                        '" class="contact-image-icon" alt=""/></span>' +
                        '</span>';
                }
            } else if (target.noncontact) {
                html += '<span class="fa-stack fa-' + fa + '">' +
                    '<i class="fa fa-circle fa-stack-' + stack +
                    ' icon-border circle-icon-' + size + '" style="' + $rootScope.setIconColor(
                        target.noncontact) + '"></i>' +
                    '<span class="fa-stack-1x contact-text-' + size +
                    '"><i class"fa fa-user contact-icon-' + size + '"></i></span>' +
                    '</span>';
            } else {
                html += '<span class="fa-stack fa-' + fa + '">' +
                    '<i class="fa fa-circle fa-stack-' + stack +
                    ' icon-border" style="font-size: ' + circle + '" ></i>' +
                    '<i class="fa fa-user fa-stack-1x contact-icon-' + size + '"></i>' +
                    '</span>';
            }
        }
        return $sce.trustAsHtml(html);
    };

    $rootScope.filterContactData = [];

    $rootScope.isKotterTechUserByUuid = function(uuid) {
        if ($rootScope.user.accessgroup === 'superadmin' || $rootScope.user.accessgroup ===
            'KotterTech') return false;
        var contact = contactService.getContactByUserUuid(uuid);
        if (contact) {
            return contactService.isKotterTechUser(contact);
        }
        return false;
    };

    $scope.emulationStatus = function() {
        return emulationService.emulationStatus;
    };

    $rootScope.isKotterTechUser = function(contact) {
        if (!contact) return false;
        return contactService.isKotterTechUser(contact);
    };

    $rootScope.selectContact = function(contact) {
        contactService.selectContact(contact);
    };

    $rootScope.selectContact2 = function(contact, phone) {
        contactService.selectContact2(contact, phone);
    };

    $rootScope.setIconColor = function(contact) {
        if (contact === null) {
            return '';
        }
        var color = contact.color ? contact.color : (contact.contact_profile_color ? contact.contact_profile_color : '#cfdef0');
        return ' color: ' + color + ' !important;';
    };

    $rootScope.showAddContactForm = function(source, data) {
        if (userService.limitReached('contact')) {
            $rootScope.showErrorAlert('You have reached the limit of ' + $rootScope.user
                .usageLimits.contact +
                ' personal contacts allowed while using a Bridge Demo account. For questions about Bridge, please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a>.'
            );
            return;
        }
        if (__env.enableDebug) console.log(data);
        if (__env.enableDebug) console.log(source);
        $rootScope.actionContact = 'add';
        $rootScope.editingContact = false;
        $rootScope.contactUser = {};
        $rootScope.contactPhone = {};

        $rootScope.uploaderOption = '/user/contact/new';
        switch (source) {
            case 'fileshare':
                $rootScope.contactUser.contact_email_address = data.recipient_email;
                break;
            case 'filesharecontact':
                $rootScope.contactUser.contact_email_address = data;
                break;
            case 'callhistory':
                var first_name = $filter('split')(data.contact_name, ' ', 0);
                var last_name = $filter('split')(data.contact_name, ' ', 1);
                $rootScope.contactUser.contact_name_given = first_name;
                $rootScope.contactUser.contact_name_family = last_name;
                $rootScope.contactPhone.phone_number = usefulTools.cleanPhoneNumber(
                    data.contact_number);
                //$rootScope.phoneList.push({contact_phone_uuid: null, phone_label: 'Work', phone_number: data.contact_number, phone_extension: null, phone_primary: null, from: 'callhistory'});
                break;
            case 'callrecording':
                var first_name = $filter('split')(data.contact_name, ' ', 0);
                var last_name = $filter('split')(data.contact_name, ' ', 1);
                $rootScope.contactUser.contact_name_given = first_name;
                $rootScope.contactUser.contact_name_family = last_name;
                $rootScope.contactPhone.phone_number = usefulTools.cleanPhoneNumber(
                    data.contact_number);
                //$rootScope.phoneList.push({contact_phone_uuid: null, phone_label: 'Work', phone_number: data.contact_number, phone_extension: null, phone_primary: null, from: 'callhistory'});
                break;
            case 'sms':
                $rootScope.contactPhone.phone_number = usefulTools.cleanPhoneNumber(
                    data);
                break;
            case 'smscontact':
                if (isNaN(data)) {
                    $rootScope.contactUser.contact_name_given = data;
                } else {
                    $rootScope.contactPhone.phone_number = usefulTools.cleanPhoneNumber(
                        data);
                }
                break;
            case 'videoconference':
                var first_name = $filter('split')(data.recipient_name, ' ', 0);
                var last_name = $filter('split')(data.recipient_name, ' ', 1);
                $rootScope.contactUser.contact_name_given = first_name;
                $rootScope.contactUser.contact_name_family = last_name;
                $rootScope.contactUser.contact_email_address = data.recipient_email;
                break;
            case 'visualvoicemail':
                //$rootScope.contactUser.contact_name_given = data.caller_id_name;
                $rootScope.contactPhone.phone_number = usefulTools.cleanPhoneNumber(
                    data.caller_id_number);
                break;
            case 'vfax':
                $rootScope.contactPhone.phone_number = usefulTools.cleanPhoneNumber(
                    data);
                break;
            case 'ams':
                $rootScope.contactPhone.phone_number = data.mobile_phone || data.business_phone ||
                    data.residence_phone;
                $rootScope.contactUser.contact_name_given = data.contact_name;
                $rootScope.contactUser.contact_email_address = data.email;
                break;
            case 'qqcatalyst':
                $rootScope.contactPhone.phone_number = data.mobile_phone || data.business_phone ||
                    data.home_phone || data.work_phone;
                $rootScope.contactUser.contact_name_given = data.contact_name;
                $rootScope.contactUser.contact_email_address = data.email;
                break;
            default:
                var info = {};
                break;
        }
        $rootScope.editingContact = $rootScope.contactUser;
        $rootScope.showEditorModal('/company/contactsmaster.html', null, 'lg', '', 'static', 'false');
    };



    $rootScope.repeatContactDisplay = [];
    $rootScope.repeatContactDisplay.push({
        'check': 1
    });
    $rootScope.repeatContactDisplay.push({
        'check': 2
    });

    $rootScope.showicon = function(status) {
        return usefulTools.funcPutIcon(status, '');
    };

    $rootScope.setProfileColor = function(color) {
        if (color === null) return '';
        if (color === '') color = '#cfdef0';
        return 'background-color: ' + color + ' !important;';
    };

    // $scope.addUser = function() {
    //     var data = {
    //         txtNameGiven: $scope.txtNameGiven,
    //         txtNameFamily: $scope.txtNameFamily,
    //         txtEmail: $scope.txtEmail,
    //         txtExtension: $scope.txtExtension,
    //         txtMobile: $scope.txtMobile,
    //         url_client: (__env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl +
    //             '/login' : symphonyConfig.symphonyUrl + '/login')
    //     };
    //     dataFactory.doUserCreation(data)
    //         .then(function(response) {
    //             if (response.data.error) {
    //                 $rootScope.alerts.push({
    //                     type: 'danger',
    //                     msg: 'Failure: ' + response.data.error.message
    //                 });
    //             } else {
    //                 $rootScope.alerts.push({
    //                     type: 'success',
    //                     msg: 'Success: ' + response.data.success.message
    //                 });
    //                 //Need to add the user to the $scope object
    //                 $scope.showFrmUser = false;
    //             }
    //         }, function(error) {
    //             $rootScope.alerts.push({
    //                 type: 'danger',
    //                 msg: 'Failure Creating User Account ' + (__env.enableDebug ?
    //                     error : '')
    //             });
    //         });
    // };

    $scope.funcPutIcon = function(status) {
        if (status === 'A') {
            return 'fa fa-check-circle cls-color-green-tkg';
        } else if (status === 'S') {
            return 'fa fa-clock-o  cls-color-yellow-tkg';
        } else if (status === 'I') {
            return 'fa fa-times-circle cls-color-red-tkg disabled';
        }
        return undefined;
    };

    $scope.funcPutIconPhones = function(type) {
        if (type === 'O') {
            return 'fa fa-institution cls-color-green-tkg';
        } else if (type === 'H') {
            return 'fa fa-home  cls-color-green-tkg';
        } else if (type === 'M') {
            return 'fa fa-mobile cls-color-green-tkg disabled';
        }
        return undefined;
    };

    $scope.cnt_ID = $routeParams.cntID;
    $scope.contactSelected = [];
    $scope.contSel = {};

    if ($scope.cnt_ID) {

        $scope.contacts().forEach(function(entry) {
            if (parseInt(entry.cntID) === parseInt($scope.cnt_ID)) {
                if (__env.enableDebug) console.log(entry);
                $scope.contactSelected.push(entry);
            }
        });
    }

    $scope.contactSelectedPhones = [];
    $scope.contSelPhones = {};


    $scope.contactSelectedEmails = [];
    $scope.contSelEmails = {};



    $rootScope.currentPage = 1; //current page
    $rootScope.entryLimit = 9; //max no of items to display in a page

    /********** COMPANY SETUP USER  **********/

    $scope.showFrmUser = false;
    $scope.showFrmAtt = false;
    $scope.showFrmQueues = false;
    $scope.showFrmAudio = false;

    /********** LEFT BAR - CONTACT LIST FILTER OPTION BUTTONS  **********/

    $scope.btnFiltAct = '';
    $scope.allRecords = true;

    $scope.clearContactSearch = function() {
        $scope.searchText = null;
        contactService.sideContactSearch = null;
    };

    $scope.performContactSearch = function() {
        contactService.sideContactSearch = $scope.searchText;
    };

    $scope.toggleFavoriteFilter = function() {
        $scope.favoritesFilter = !$scope.favoritesFilter;
        contactService.favoritesFilter = $scope.favoritesFilter;
    };

    $rootScope.removeContact = function(contactUuid) {
        contactService.deleteContact(contactUuid).then(function(response) {
            if (response) {
                $rootScope.showalerts(response);
                contactGroupsService.removeContactFromGroupsByUuid(contactUuid);
            }
            $uibModalStack.dismissAll();
        });
    };

    $scope.setPage = function(pageNo) {
        $rootScope.currentPage = pageNo;
    };
    $scope.sort_by = function(predicate) {
        $rootScope.predicate = predicate;
        $rootScope.reverse = !$rootScope.reverse;
    };

    $rootScope.formatTime = function(time) {
        return usefulTools.formatTime(time);
    };


    dataFactory.getUnreadVoicemailsCount()
        .then(function(response) {
            $rootScope.unreadVoicemails = 0;
            if (response.data !== null) {
                $rootScope.unreadVoicemails = response.data;
            }
        });

    dataFactory.getDomainUnreadVoicemailsCount().then(function(response) {
        if (response.status == 200) {
            $rootScope.domainUnreadVoicemails = response.data;
        }
    });

    dataFactory.getMissedCallCount($rootScope.user.extension.extension_uuid)
        .then(function(response) {
            $rootScope.missedCalls = 0;
            if (response.data !== null) {
                $rootScope.missedCalls = response.data;
            }
        });

    $rootScope.showPendingSmsCount = function() {
        var sum = 0;
        angular.forEach($rootScope.pendingSmsCount, function(uuid, value) {
            sum += value;
        });
        $rootScope.totalPendingSmsCount = sum;
    };

    function scrollToElementD(uuid) {
        var topPos = document.getElementById('group-' + uuid).offsetTop;
        document.getElementById('gc-' + uuid).scrollTop = topPos - 10;
    };


    $rootScope.contactHeadingClicked = function(index, length, group) {
        if (group && index === length - 1) {
            $timeout(function() {
                scrollToElementD(group.group_uuid)
            }, 1000, false);
        } else if (index === length - 1) {
            $timeout(function() {
                usefulTools.goToId('contacts-bottom');
            }, 1000, false);
        }
    };

    $scope.emulatedUser = function() {
        return emulationService.emulatedUser;
    };

    $rootScope.showContact = function(contact_uuid, type) {
        var display = '';

        var contact = contactService.getContactByUuid(contact_uuid);
        if ($scope.emulatedUser()) {
            var contacts = $rootScope.emulatedUserContacts;
            contact = $filter('getContactbyUUID')(contacts, contact_uuid);
        }

        display +=
            '<ul style="margin: 0; padding: 0; list-style: none;" ><li style="width: 45px; float: left;">';
        if (contact.contact_profile_image !== null && contact.contact_profile_image !==
            '') {
            display += '<img src="' + $rootScope.pathImgProfile + contact.contact_profile_image +
                '" class="cls-img-lst-contact" alt=""/></li>';
        } else {
            display += '<label class="cls-img-lst-contact-null" style="' + $rootScope.setProfileColor(
                    contact.contact_profile_color) + '">' + contact.contact_name_given.substring(
                    0, 1).toUpperCase() + contact.contact_name_family.substring(0, 1).toUpperCase() +
                '</label></li>';
        }
        var info = '';
        //if(__env.enableDebug) console.log(type);
        if (type === 'number') {
            info = '<span ng-click="makeCall(' + contact.contact_primary_number +
                ')"><strong>' + $filter('tel')(contact.contact_primary_number) +
                '</strong></span>';
            if (contact.extension) info = 'Ext: <span ng-click="makeCall(' + contact.extension +
                ')"><strong>' + contact.extension + '</strong></span>';
        } else if (type === 'email') {
            info = '<a href="mailto:' + contact.contact_email_address + '">' + contact.contact_email_address +
                '</a>';
            //if(__env.enableDebug) console.log(info);
        }

        display += '<li style="float: left;">' + contact.contact_name_given + ' ' +
            contact.contact_name_family + '<br />' + info + '</li></ul>';

        return $sce.trustAsHtml(display);
    };

    $rootScope.storeNonContact = function(info) {
        var data = {
            email: info.email,
            phone: info.phone,
            name: info.name,
            color: info.color,
            user_uuid: info.user_uuid
        };
        return dataFactory.postNonContact(data)
            .then(function(response) {
                if (__env.enableDebug) console.log("STORING NON CONTACT RESULT");
                if (__env.enableDebug) console.log(response);
                if (response.data.success) {
                    if (!$rootScope.nonContacts) {
                        $rootScope.nonContacts = [];
                    }
                    $rootScope.nonContacts.push(response.data.success.noncontact);
                    return response.data.success.noncontact;
                } else {
                    return null;
                }

            });
    };

    $rootScope.invitee = {};

    $rootScope.addNonContactInvitee = function(invitee) {
        var newinvitee = {
            name: invitee.name,
            email: invitee.email,
            contact_uuid: null,
            is_user: 'false'
        };
        $rootScope.invitee = {};
        $rootScope.addedInvitees.push(newinvitee);
    };

    $rootScope.removeInvitee = function(index) {
        $rootScope.addedInvitees.splice(index, 1);
    };

    $rootScope.showNonContact = function(email, phone, name) {
        var display = '';
        var info = {
            email: email,
            phone: phone,
            name: name,
            color: randomColor({
                luminosity: 'light'
            })
        };
        //display += info.phone;
        if (!$rootScope.nonContacts) $rootScope.nonContacts = JSON.parse($window.localStorage
            .getItem("nonContacts"));
        var noncontacts = $rootScope.nonContacts;

        if ($scope.emulatedUser()) noncontacts = $rootScope.emulatedNonContacts;
        var noncontact = (noncontacts !== null ? $filter('getNonContact')(noncontacts,
            info) : null);
        //if(__env.enableDebug) console.log(noncontact);
        if (!noncontact) {
            $rootScope.storeNonContact(info);
            noncontact = info;
        }
        //if(__env.enableDebug) console.log(noncontact);
        display +=
            '<ul style="margin: 0; padding: 0; list-style: none;" ><li style="width: 45px; display: inline-block;">';
        display += '<label class="chat-profile-image-null" ' + (noncontact.color ?
                'style="background-color: ' + noncontact.color + ' !important;"' : '') +
            '><i class="fa fa-user"></i></label></li>';
        if (noncontact.name !== null) {
            display += '<li style="display: inline-block;">' + (noncontact.name !==
                noncontact.phone ? '<span class="capitalize">' + noncontact.name +
                '</span>' : $filter('tel')(noncontact.phone)) + (noncontact.email !==
                null || noncontact.phone !== null ? '<br />' : '') + (noncontact.email !==
                null ? '<a href="mailto:' + noncontact.email + '">' + noncontact.email +
                '</a>' : (noncontact.phone !== null && noncontact.name !==
                    noncontact.phone ? '<strong>' + $filter('tel')(noncontact.phone) +
                    '</strong>' : '')) + '</li></ul>';
        } else {
            display += '<li style="display: inline-block;">' + (noncontact.phone !==
                null ? $filter('tel')(noncontact.phone) : '') + (noncontact.email !==
                null ? (noncontact.phone !== null ? '<br />' : '') +
                '<a href="mailto:' + noncontact.email + '">' + noncontact.email +
                '</a>' : '') + '</li></ul>';
        }

        return $sce.trustAsHtml(display);
    };

    $rootScope.sendVideoCallInvites = function(origin) {
        if (__env.enableDebug) console.log("START OF SEND");
        var recipients = [];
        if ($rootScope.invitee && $rootScope.invitee.email && $rootScope.invitee.email !==
            '' && $rootScope.invitee.email !== null) {
            var newinvitee = {
                name: $rootScope.invitee.name ? $rootScope.invitee.name : null,
                email: $rootScope.invitee.email,
                contact_uuid: null,
                is_user: 'false'
            };
            $rootScope.invitee = {};
            $rootScope.addedInvitees.push(newinvitee);
        }
        if ($rootScope.addedInvitees && $rootScope.addedInvitees.length > 0) {
            angular.forEach($rootScope.addedInvitees, function(invitee) {
                recipients.push(invitee);
            });
        }
        $rootScope.addedInvitees = [];

        if ($rootScope.contactsUsr && $rootScope.contactsUsr.length > 0) {
            angular.forEach($rootScope.contactsUsr, function(contact) {
                if (contact.contact_email_address && contact.contact_email_address !==
                    '') {
                    var invitee = {
                        name: contact.contact_name_given + ' ' + contact.contact_name_family,
                        email: contact.contact_email_address,
                        contact_uuid: contact.contact_uuid,
                        is_user: (contact.user_uuid && (contact.user_uuid !==
                            '' || contact.user_uuid !== null)) ? 'true' : 'false'
                    };
                    recipients.push(invitee);
                }
            });
        }
        if (__env.enableDebug) console.log("RECIPIENT");
        if (__env.enableDebug) console.log(recipients);
        if (recipients.length > 0) {
            var data = {
                video_conference_uuid: $rootScope.user.videoConference.video_conference_uuid,
                recipients: recipients,
                sender_name: $rootScope.user.contact_name_given + ' ' + $rootScope.user
                    .contact_name_family,
                sender_email: $rootScope.user.email_address,
                sender_company: $rootScope.user.contact_organization,
                body: $rootScope.videoInviteBody,
                redirect_path: (__env.symphonyUrl && __env.symphonyUrl !== "" ?
                    __env.symphonyUrl : symphonyConfig.symphonyUrl) + '/video',
                origin: origin,
            };
            if (__env.enableDebug) console.log("SENDING VIDEO INVITE");
            if (__env.enableDebug) console.log(data);
            dataFactory.postSendVideoConferenceInvites(data)
                .then(function(response) {
                    if (__env.enableDebug) console.log(response);
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        if (origin === 'modal') {
                            $rootScope.videoConference.participants = $rootScope.videoConference
                                .participants.concat(response.data.success.data);
                            var top = $uibModalStack.getTop();
                            if (top) {
                                $uibModalStack.dismiss(top.key);
                            }
                        } else if (origin === 'icon') {
                            $rootScope.showModalWithData(
                                '/video/outgoingvideocallmodal.html', response.data
                                .success.data);
                        }
                        $rootScope.addedInvitees = [];
                    }
                    return response;
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            $rootScope.alerts.push({
                type: 'danger',
                msg: 'Error: Please specify at least one contact before clicking Send Invites.'
            });
        }

    };


    /**********Functions for facilitation of Permissions *******
     *
     */

    // if (!$rootScope.emulationStatus) $rootScope.emulationStatus = usefulTools.getManagerStatus();

    $rootScope.getNameByUUID = function(uuid) {
        var contact = contactService.getContactByUserUuid(uuid);
        if (contact) return contact.name;
        return null;
    };

    $rootScope.isManagerOf = function(uuid, communication) {
        return $filter('checkIfManager')($rootScope.emulationStatus[communication].watched,
            uuid) || userService.isAdminGroupOrGreater();
    };

    

    $scope.vcUrl = __env.vcUrl && __env.vcUrl !== '' ? __env.vcUrl : symphonyConfig.vcUrl;

    $scope.sendVideoInvite = function(contact) {
        videoConfService.sendVideoInvite(contact);
    };

    $scope.syncAmsContacts = function() {
        var message;
        if ($scope.validAmsCreds) {
            var data = {
                domain_uuid: $rootScope.user.domain_uuid,
                user_uuid: $rootScope.user.user_uuid
            };
            dataFactory.ams360SyncContacts(data)
                .then(function(response) {
                    if (response.data.success) {
                        var message = "Your AMS Contacts are syncing.";
                        $rootScope.showInfoAlert(message);
                    } else {
                        message = "Could not sync contacts. Please" +
                            " contact our support team if this issue" +
                            " persists.";
                        $rootScope.showErrorAlert(message);
                    }
                });
        } else {
            if ($scope.amsIsSetup) {
                message = "The AMS credentials you have provided are not valid." +
                    " Please revise them under Settings / Company Setup / Integration" +
                    " Setup";
            } else {
                message = "You have not yet set up AMS360 integration. Please do" +
                    " so under Settings / Company Setup / Integration Setup.";
            }
            $rootScope.showInfoAlert(message);
        }
    };

    $scope.syncQQContacts = function() {
        var message;
        var data = {
            domain_uuid: $rootScope.user.domain_uuid,
            user_uuid: $rootScope.user.user_uuid
        };
        dataFactory.qqCatalystSyncContacts(data)
            .then(function(response) {
                if (response.data.success) {
                    var message = "Your QQ Contacts are syncing.";
                    $rootScope.showInfoAlert(message);
                } else {
                    message =
                        "Could not sync contacts. Please check your Integration Settings or" +
                        " contact our support team if this issue" +
                        " persists.";
                    $rootScope.showErrorAlert(message);
                }
            });
    };

    metaService.registerOnRootScopeUserLoadCallback(updateAmsViability);

    function updateAmsViability() {
        var domainUuid = $rootScope.user.domain_uuid;
        greenboxService.agencyIntegrationSettings(domainUuid).then(function(response) {
            $scope.amsIsSetup = response && response.user_name && response.password &&
                response.agency_id && response.partner_code === "ams360";
            dataFactory.ams360TestCreds(domainUuid).then(function(response) {
                if (response.data.success &&
                    response.data.success.data &&
                    response.data.success.data[0] &&
                    response.data.success.data[0].data) {
                    $scope.validAmsCreds = true;
                }
            });
        });
    };

    $rootScope.$on('update.integration.settings', function() {
        updateAmsViability();
    });

    $scope.showAmsSync = function() {
        return $rootScope.user.exportType.partner_code === 'ams360' &&
            ($rootScope.user.domain.amsSync === "0" || !$rootScope.user.domain.amsSync);
    };

    $scope.showAmsSyncing = function() {
        return $rootScope.user.exportType.partner_code === 'ams360' &&
            $rootScope.user.domain.amsSync === "1";
    };

    $scope.showQQSync = function() {
        return $rootScope.user.exportType.partner_code === 'qqcatalyst' &&
            ($rootScope.user.domain.qqSync === "0" || !$rootScope.user.domain.qqSync);
    };

    $scope.showQQSyncing = function() {
        return $rootScope.user.exportType.partner_code === 'qqcatalyst' &&
            $rootScope.user.domain.qqSync === "1";
    };

    $scope.showAmsContacts = function() {
        return $rootScope.user.exportType.partner_code === "ams360";
    };
    $scope.showQQContacts = function() {
        return $rootScope.user.exportType.partner_code === "qqcatalyst";
    };

    function testing() {
        return (__env.vcUrl && __env.vcUrl === 'http://localhost:9000') || __env.testingVideoInvite;
    };
});
