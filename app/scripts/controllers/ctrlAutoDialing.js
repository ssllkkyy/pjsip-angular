'use strict';
proySymphony.controller('AutoDialingCtrl', function($scope, $mdDialog, userService, $rootScope,
    $log, $routeParams, $location, $timeout, $filter, $window, usefulTools, $sce, $interval,
    Slug, ngAudio, $parse, FileUploader, dataFactory, __env, symphonyConfig, $uibModalStack,
    WizardHandler, uibDateParser, emailService, _, e911Service) {
        $scope.ctrl = {
            loadingFile: false,
            loadingCsvFile: false
        };
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
        },
        {
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
        }
    ];
    $scope.years = [2015, 2016, 2017, 2018, 2019, 2020, 2021];

    $scope.showAllCampaigns = true;
    $scope.activeCampaign = null;
    $scope.automarketingTableHeight = $window.innerHeight - 380;
    $scope.perPage = 20;
    $scope.perPage2 = 20;
    $scope.maxSize = 50;
    $scope.predicate = 'sort_date';
    $scope.predicate2 = 'created_at';
    $scope.reverse = true;
    $scope.canEnter = true;
    $scope.showNewField = [];
    $scope.colSelect = [];
    $scope.newField = [];
    $scope.useSms = {};
    $scope.step2Clear = false;

    $scope.contacts = {
        reverse: true
    };
    $scope.contacts = {
        predicate: 'lastname'
    };
    $scope.insert = {
        shortcode: null
    };
    $scope.reverse2 = true;
    $scope.currentPage = 1;
    $scope.currentPage2 = 1;
    $scope.ppOptions = [10, 20, 50, 100];
    $scope.includeHeaders = true;
    $scope.showPlayer = false;
    $scope.gridOptions = {};
    $scope.colOptions = [{
            key: 'firstname',
            value: 'First Name'
        },
        {
            key: 'lastname',
            value: 'Last Name'
        },
        {
            key: 'email_address',
            value: 'Email Address'
        },
        {
            key: 'contact_phone1',
            value: 'Phone Number 1'
        },
        {
            key: 'contact_phone2',
            value: 'Phone Number 2'
        },
        {
            key: 'notes',
            value: 'Notes'
        }
    ];

    $scope.contact = {
        activeTab: 0
    };

    function initializeCustomFields() {
        $rootScope.customFields = [];
        $rootScope.customFields.push({
            key: 'firstname',
            value: 'First Name'
        }, {
            key: 'lastname',
            value: 'Last Name'
        }, {
            key: 'email_address',
            value: 'Email Address'
        }, {
            key: 'contact_phone1',
            value: 'Phone Number 1'
        }, {
            key: 'contact_phone2',
            value: 'Phone Number 2'
        }, {
            key: 'notes',
            value: 'Notes'
        });
    }
    $scope.checkforcode = function($event, schedule) {
        //if(__env.enableDebug) console.log($event);
        $scope.cursorPos = usefulTools.doGetCaretPosition($event.target);
        //if(__env.enableDebug) console.log($scope.cursorPos);
        //if(__env.enableDebug) console.log($event.which);
        if ($event.which === 219) {
            $scope.showShortcodeList = true;
            $scope.selectedIndex = 0;
        } else if ($event.which === 9 || $event.which === 13) {
            //if(__env.enableDebug) console.log("TAB OR ENTER PRESSED");
            $event.preventDefault();
            $scope.insertShortcode($rootScope.customFields[$scope.selectedIndex].key,
                schedule);
        } else if ($event.which === 38) {
            $event.preventDefault();
            if ($scope.selectedIndex > 0) $scope.selectedIndex += -1;
        } else if ($event.which === 40) {
            $event.preventDefault();
            $scope.selectedIndex += 1;
        } else if ($event.which === 32 || $event.which === 27) {
            //if(__env.enableDebug) console.log("ESC or SPACE PRESSED");
            //scope.$apply(function(){
            $scope.showShortcodeList = false;

            //scope.$eval(attrs.ngEnter, {'e': e});
            //});
        }

    };
    $scope.insertShortcode = function(code, schedule) {
        var message = schedule.sms_message ? schedule.sms_message : '';
        var position = $scope.cursorPos ? $scope.cursorPos : message.length;
        var start = angular.copy(position);
        if (message.substring(position - 1, position) == '{') start += -1;
        if (message.substring(position - 2, position) == '{{') start += -1;
        var txt2 = message.slice(0, start) + ((start === 0 || message.substring(start -
            1, start) === ' ') ? '' : ' ') + '{{' + code + '}} ' + message.slice(
            position + 1);
        var index = $filter('getByUUID')($rootScope.broadcast.schedules, schedule.robocall_schedule_uuid,
            'robocall_schedule');
        if (index !== null) $rootScope.broadcast.schedules[index].sms_message = txt2;
        $scope.showShortcodeList = false;
        $scope.insert.shortcode = null;
    };

    $scope.showShortcodeList = false;
    $scope.filterData = [];
    $scope.cursorPos = 0;
    $scope.editContact = function(uuid) {
        var contacts = angular.copy($rootScope.broadcast.contacts);
        $scope.showEdit = uuid;
        var index = $filter('getByUUID')(contacts, uuid, 'robocall_contact');
        if (__env.enableDebug) console.log(index);
        $scope.tempContact = contacts[index];
        $window.localStorage.setItem("editContact", JSON.stringify($scope.tempContact));
        if (__env.enableDebug) console.log($scope.tempContact);
    };

    $scope.cancelEdit = function() {
        var index = $filter('getByUUID')($rootScope.broadcast.contacts, $scope.tempContact
            .robocall_contact_uuid, 'robocall_contact');
        $rootScope.broadcast.contacts[index] = JSON.parse($window.localStorage.getItem(
            "editContact"));
        if (__env.enableDebug) console.log($rootScope.broadcast.contacts[index]);
        $scope.showEdit = null;
        $scope.tempContact = null;
        return $rootScope.broadcast.contacts[index];
    };

    $scope.saveContact = function(contact) {
        var index = $filter('getByUUID')($rootScope.broadcast.contacts, contact.robocall_contact_uuid,
            'robocall_contact');
        if (__env.enableDebug) console.log(index);
        if (__env.enableDebug) console.log(contact);
        dataFactory.postUpdateAmContact(contact)
            .then(function(result) {
                if (__env.enableDebug) console.log(result.data);
                if (result.data.success) {
                    $rootScope.broadcast.contacts[index] = result.data.success.data;
                    $scope.showEdit = null;
                    $scope.tempContact = null;
                } else {
                    if (__env.enableDebug) console.log(result.data.error.message);

                }
            });
    };

    $scope.isDemoAgency = function() {
        return userService.isDemoAgency();
    };
    $scope.limitReached = function() {
        return userService.isDemoAgency() && userService.limitReached(
            'campaign_contact');
    };
    $scope.exceedsLimits = function(rows) {
        if (rows) {
            if (!userService.isDemoAgency()) return false;
            return rows.length >= $rootScope.user.usageLimits.campaign_contact;
        }
        return false;
    };

    $scope.removeCampaignContact = function(robocall_contact_uuid) {
        var index = $filter('getByUUID')($rootScope.broadcast.contacts,
            robocall_contact_uuid, 'robocall_contact');

        dataFactory.deleteRoboCallContacts(robocall_contact_uuid)
            .then(function(response) {
                if (response.data.success && index !== null) $rootScope.broadcast.contacts
                    .splice(index, 1);
                //$rootScope.showalerts(response);
                if (response.data.error) $rootScope.alerts.push({
                    type: 'danger',
                    msg: response.data.error.message
                });
            });
    };
    $scope.audioFilePlaying = null;
    $scope.recordingPlaying = false;
    $scope.playRecording = function(file) {
        if (__env.enableDebug) console.log(file);
        $rootScope.showAudioModal(file, 'robocall-recording');
    };
    $scope.playAudioFile = function(file, uuid) {
        $scope.audioFilePlaying = uuid;
        var url = __env.apiUrl ? __env.apiUrl : symphonyConfig.audioUrl;
        $scope.audio = new Audio(url + file);
        $scope.recordingPlaying = true;
        $scope.audio.play();
    };
    $rootScope.stopPlaying = function() {
        $scope.audio.pause();
        $scope.audioFilePlaying = false;
        $scope.recordingPlaying = false;
    };
    $scope.btnMnuFile = '1';
    $scope.templateIncludeFileProcess = 'fileprocessxlsx';

    $scope.mnuSelectedFile = function(mnuID) {
        $scope.btnMnuFile = mnuID;
        if (mnuID === '1') {
            $scope.templateIncludeFileProcess = 'fileprocessxlsx';
        } else if (mnuID === '2') {
            $scope.templateIncludeFileProcess = 'fileprocesscsv';
        } else if (mnuID === '3') {
            $scope.templateIncludeFileProcess = 'fileprocesstxt';
        }
    };
    $scope.step1Disabled = function(broadcast) {
        if (!broadcast.robocall_name || broadcast.robocall_name === '' ||
            !broadcast.message_type || broadcast.message_type === '' ||
            !broadcast.robocall_type || broadcast.robocall_type === '' ||
            !broadcast.schedule_type || broadcast.schedule_type === '') return true;
        return false;
    };
    $scope.fromDate = new Date(moment().subtract(30, 'days'));
    $scope.toDate = new Date();
    $scope.getCampaigns = function() {
        $scope.$evalAsync(function() {
            $scope.showAllCampaigns = true;
            $scope.showArchivedCampaigns = false;
        });
        var options = {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        };
        var data = {
            from_date: $scope.fromDate.toLocaleTimeString("en-us", options),
            to_date: $scope.toDate.toLocaleTimeString("en-us", options)
        };
        console.log(data);
        $scope.showTable = false;
        dataFactory.postGetAllCampaigns(data)
            .then(function(response) {
                $scope.amCampaigns = [];
                if (response.data.success) {
                    angular.forEach(response.data.success.data, function(item) {
                        if (item.schedules && item.schedules.length > 0) {
                            item.sort_date = item.schedules[0].start_at;
                        } else {
                            item.sort_date = item.updated_at;
                        }
                    });
                    $scope.amCampaigns = response.data.success.data;
                    $scope.currentPageCampaign = 1; //current page
                    $scope.entryLimitCampaign = 10; //max no of items to display in a page
                    $scope.filteredItemsCampaign = $scope.amCampaigns.length; //Initially for no filter
                    $scope.totalItemsCampaign = $scope.amCampaigns.length;
                    if (__env.enableDebug) console.log("GET CAMPAIGNS");
                    if (__env.enableDebug) console.log($scope.amCampaigns);
                }
                $scope.showTable = true;
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };
    $scope.getCampaigns();

    $scope.loadArchivedCampaigns = function() {
        $scope.showTable = false;
        dataFactory.getArchivedCampaigns()
            .then(function(response) {
                if (__env.enableDebug) console.log(response.data);
                if (response.data.success) {
                    $scope.amCampaigns = response.data.success.data;
                    $scope.showTable = true;
                    $scope.showArchivedCampaigns = true;
                } else {
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
            });
    };
    /****************************** LOAD CSV FILES *****************************************************************************************************************/
    $scope.csv = {};
    $scope.csv.result = null;
    $scope.csv = {
        content: null,
        separator: ',',
        accept: '.csv',
        result: null,
        encoding: 'ISO-8859-1',
        uploadButtonLabel: ''
    };
    $scope.csv.callback = function(response) {
        if (__env.enableDebug) console.log(response);
        if (__env.enableDebug) console.log($scope.csv.result);
    };
    $scope.colSelect = [];
    $scope.cancelCsvUpload = function() {
        $rootScope.$broadcast('clear.csv.filename');
        $scope.csv = {
            content: null,
            separator: ',',
            accept: '.csv',
            result: null,
            encoding: 'ISO-8859-1',
            uploadButtonLabel: "Upload a csv file"
        };
        $scope.contactRows = null;
        $scope.displayLineErrors = null;
    };
    $scope.prepareContacts = function(rows) {
        // if(__env.enableDebug) console.log(rows);
        angular.forEach(rows, function(row) {
            row = usefulTools.convertObjectToArray(row);
        });
        $scope.contactRows = rows;
        $scope.colHeaders = usefulTools.convertObjectToArray(rows[0]);
    };
    $scope.importCsvContacts = function(selected, rows, firstrow) {

        if (selected.length === 0) {
            var type = "";
            var classifier = "";
            if ($rootScope.broadcast.message_type === 'Email') {
                classifier = "an ";
                type = "Email Address";
            } else {
                classifier = "a ";
                type = "Phone Number";
            }
            $scope.displayImportErrors =
                "No Recipients Were Imported - All recipients must have at least " +
                classifier + type + " to deliver " + classifier + $rootScope.broadcast.message_type +
                " Campaign.";
        } else {
            var contacts = [];
            var j = 0;
            $scope.lineError = [];
            if (!firstrow) rows.splice(0, 1);
            $scope.importing = true;
            angular.forEach(rows, function(row) {
                var contact_param = usefulTools.convertObjectToArray(row);
                var contact = {};
                var i = 0;
                var skipRow = false;
                var error = '';
                angular.forEach(selected, function(item, index) {
                    var key = item.key;
                    if (__env.enableDebug) console.log(index + ': ' +
                        key + ' - i = ' + i);
                    if (key !== 'ignore') {
                        if (key === 'email_address') {
                            //if (contact_param[index] && !isValidEmail(contact_param[index])) error += "Invalid Email Address";
                            if (contact_param[index] && !isValidEmail(
                                    contact_param[index])) error +=
                                contact_param[index] +
                                " is an Invalid Email Address";
                            //if (!contact_param[index] && $rootScope.broadcast.message_type === 'Email') error += (error.length !== 0 ? ", " : "" ) + "Missing Email Address";
                            if (!contact_param[index] && $rootScope.broadcast
                                .message_type === 'Email') error += (
                                    error.length !== 0 ? ", " : "") +
                                "Row " + j +
                                " of imported file is missing an email address (required for an email campaign)";
                            //} else if (key==='contact_phone1' || key==='contact_phone2') {
                        } else if (key === 'contact_phone1') {
                            contact_param[index] = Slug.slugify(
                                contact_param[index]);
                            contact_param[index] = contact_param[index]
                                .replace(/-/g, "");
                            //if (contact_param[index] && !isValidPhone(contact_param[index])) error += (error.length !== 0 ? ", " : "" ) + "Invalid Phone Number";

                            if (contact_param[index].length === 11) {
                                contact_param[index] = contact_param[
                                    index].slice(1, contact_param[
                                    index].length);
                            }
                            if (contact_param[index] && !isValidPhone(
                                    contact_param[index])) error += (
                                    error.length !== 0 ? ", " : "") +
                                contact_param[index] +
                                " is an invalid phone number";
                            if (!contact_param[index] && $rootScope.broadcast
                                .message_type !== 'Email') error += (
                                    error.length !== 0 ? ", " : "") +
                                "Missing Phone Number";
                        }
                        if (__env.enableDebug) console.log(
                            contact_param[index]);
                        contact[key] = contact_param[index];
                    }
                    i++;
                });
                if ((!contact.contact_phone1 || !isValidPhone(contact.contact_phone1)) &&
                    (!contact.contact_phone2 || !isValidPhone(contact.contact_phone2)) &&
                    $rootScope.broadcast.message_type !== 'Email') {
                    error += (error.length !== 0 ? ", " : "") + "Row " + j +
                        " of imported file is missing a valid phone number which is required for an " +
                        $rootScope.broadcast.message_type + " campaign";
                }
                //if(__env.enableDebug) console.log(error);
                if (error !== '') {
                    $scope.lineError[j] = error;
                    //skipRow = true;
                }
                //if(__env.enableDebug) console.log(contact);
                if (!skipRow) contacts.push(contact);
                j++;
            });

            var data = {
                contacts: contacts,
                robocall_uuid: $rootScope.broadcast.robocall_uuid
            }
            if (__env.enableDebug) console.log($scope.lineError);
            if (__env.enableDebug) console.log(data);
            //return;
            $scope.displayLineErrors = '';

            function executeImport() {
                if (contacts.length > 30) {
                    dataFactory.postRoboCallContactJob(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.csv.result = null;
                                $scope.csv.content = null;
                                $scope.contactRows = null;
                                $scope.colSelect = [];
                                $rootScope.$broadcast('clear.csv.filename');
                            }
                            $scope.importing = false;
                        });
                } else {
                    dataFactory.postRoboCallContactArray(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                if (__env.enableDebug) console.log(response.data.success);
                                $rootScope.broadcast.contacts = response.data.success
                                    .data;
                                if (__env.enableDebug) console.log($rootScope.broadcast
                                    .contacts);
                                if (response.data.success.duplicate_phone.length >
                                    0) {
                                    angular.forEach(response.data.success.duplicate_phone,
                                        function(duplicate) {
                                            $scope.displayLineErrors +=
                                                duplicate + '<br />';
                                        });
                                }
                                if (response.data.success.duplicate_email.length >
                                    0) {
                                    angular.forEach(response.data.success.duplicate_email,
                                        function(duplicate) {
                                            $scope.displayLineErrors +=
                                                duplicate + '<br />';
                                        });
                                }

                                angular.forEach($scope.lineError, function(error) {
                                    if (error.length > 0) $scope.displayLineErrors +=
                                        error + '<br />';
                                });
                                if ($scope.displayLineErrors) $scope.displayLineErrors =
                                    "<strong>Errors were noted with some of the contacts that you've imported. Please review the comments below and make any necessary corrections.</strong><br />" +
                                    $scope.displayLineErrors;
                                $scope.contact.activeTab = 0;
                                $scope.csv.result = null;
                                $scope.csv.content = null;
                                $scope.contactRows = null;
                                $scope.colSelect = [];
                                $rootScope.$broadcast('clear.csv.filename');
                            }
                            $scope.importing = false;
                        });
                }
            }
            var recipientListDupErrors = newContactsUniqueOfRecipientList(data.contacts,
                $scope.broadcast.contacts);
            if (recipientListDupErrors.length > 0) {
                $scope.dupErrors = recipientListDupErrors;
                $scope.recipientDupMessage =
                    "The spreadsheet you uploaded contains " + recipientListDupErrors.length +
                    " contact" + (recipientListDupErrors.length > 1 ? "s" : "") +
                    " that match" + (recipientListDupErrors.length > 1 ? "" : "es") +
                    " contacts already imported for this campaign.";
                var templateUrl = "views/autodialing/errors-prompt.html";
                var shouldContinue;

                function onDismiss() {
                    if (shouldContinue) {
                        executeImport();
                    } else {
                        $scope.importing = false;
                        $scope.cancelCsvUpload();
                    }
                };
                var promptPromise = $rootScope.customPrompt(templateUrl, $scope,
                    onDismiss);
                $scope.resolvePrompt = function(shouldContinueResult) {
                    shouldContinue = shouldContinueResult;
                    if (promptPromise) {
                        promptPromise();
                    }
                };
            } else {
                executeImport();
            }
        }
    };

    $rootScope.$on('imported.robocall.contacts', function($event, data) {

        dataFactory.getRoboCallContactsOnEvent(data.robocall_uuid)
            .then(function(response) {
                if (response.status === 200) {
                    $rootScope.broadcast.contacts = response.data;
                    var duplicates = response.data.filter(function(item) {
                        return item.import_error !== null;
                    });
                    if (duplicates.length > 0) {
                        angular.forEach(duplicates, function(duplicate) {
                            if (duplicate.import_error !==
                                'Duplicate Email Address') {
                                $scope.displayLineErrors += duplicate.import_error +
                                    ' for ' + duplicate.firstname + ' ' +
                                    duplicate.lastname + '<br />';
                            } else {
                                $scope.displayLineErrors += duplicate.import_error +
                                    ' for ' + duplicate.email_address +
                                    '<br />';
                            }
                        });
                    }

                    angular.forEach($scope.lineError, function(error) {
                        if (error.length > 0) $scope.displayLineErrors +=
                            error + '<br />';
                    });
                    if ($scope.displayLineErrors) $scope.displayLineErrors =
                        "<strong>Errors were noted with some of the contacts that you've imported. Please review the comments below and make any necessary corrections.</strong><br />" +
                        $scope.displayLineErrors;
                    $scope.contact.activeTab = 0;
                    $scope.goToStep("step 2: Recipients");
                } else {
                    if (__env.enableDebug) console.log(response);
                }
            }).catch(function(error) {
                if (__env.enableDebug) console.log(error);
                $scope.importing = false;
            });
    });

    $rootScope.addContactsToCampaign = function(rc_uuid) {
        if (__env.enableDebug) console.log("UUID = " + rc_uuid);
        $scope.gridOptions = {};
        $scope.contactRows = null;
        $window.localStorage.setItem("goToStepNumber", "step 2: Recipients");
        $location.path('/automatedmessaging/' + rc_uuid);
    };
    $scope.goToNewCampaign = function() {
        console.log(userService.limitReached('campaign'));
        console.log($rootScope.user.demoUsage);
        if (userService.limitReached('campaign')) {
            $rootScope.showErrorAlert('You have reached the limit of ' + $rootScope.user
                .usageLimits.campaign +
                ' automated messaging campaigns allowed while using a Bridge Demo account. For questions about Bridge, please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a>.'
            );
            return;
        }
        $scope.contactRows = null;
        $scope.gridOptions = {};
        $rootScope.showDelivering = false;
        $location.path('/automatedmessaging/new');
    };
    $scope.goToEditCampaign = function(rc_uuid) {
        $scope.gridOptions = {};
        $scope.contactRows = null;
        $location.path('/automatedmessaging/' + rc_uuid);
    };
    /****************************** LOAD - XLSX - FILES *****************************************************************************************************************/
    $scope.contcFromXlsx = 0;
    $rootScope.procXlsxSuccess = false;
    $rootScope.procXlsxError = false;
    $scope.listXlsxTmp = [];
    $scope.cancelXlsxUpload = function() {
        $scope.displayLineErrors = null;
        $scope.gridOptions = {};
    };

    function isValidEmail(email) {
        return emailService.validEmailAddress(email);
    }

    function isValidPhone2(phone) {
        return phone.match(/\d/g).length === 10;
    }

    function isValidPhone(p) {
        if (!p) return false;
        var PHONE_REGEXP = /^[(]{0,1}[0-9]{3}[)\.\- ]{0,1}[0-9]{3}[\.\- ]{0,1}[0-9]{4}$/;
        return PHONE_REGEXP.test(p);
    }

    $scope.importing = false;
    $scope.importXlsContacts = function(selected, gridOptions) {
        $scope.lineError = [];

        if (selected.length === 0) {
            var type = "";
            var classifier = "";
            if ($rootScope.broadcast.message_type === 'Email') {
                classifier = "an ";
                type = "Email Address";
            } else {
                classifier = "a ";
                type = "Phone Number";
            }
            $scope.displayImportErrors =
                "No Recipients Were Imported - All recipients must have at least " +
                classifier + type + " to deliver " + classifier + $rootScope.broadcast.message_type +
                " Campaign.";
        } else {
            var contacts = [];
            var j = 0;
            $scope.importing = true;
            angular.forEach(gridOptions.data, function(row) {
                var contact = {};
                var i = 0;
                var skipRow = false;
                var error = '';
                angular.forEach(selected, function(item, index) {
                    var key = item.key;
                    var field = row[gridOptions.columnDefs[index].field];

                    if (key !== 'ignore') {
                        if (key === 'email_address') {
                            //if (field && !isValidEmail(field)) error += field + " from row "+j+" of xlsx file is an Invalid Email Address";
                            if (field && !isValidEmail(field)) error +=
                                field + " is an Invalid Email Address";
                            if (!field && $rootScope.broadcast.message_type ===
                                'Email') error += (error.length !== 0 ?
                                    ", " : "") + "Row " + j +
                                " of imported file is missing an email address (required for an email campaign)";
                        } else if (key === 'contact_phone1' || key ===
                            'contact_phone2') {
                            field = Slug.slugify(field);
                            field = field.replace(/-/g, "");
                            //if (field && !isValidPhone(field)) error += (error.length !== 0 ? ", " : "" ) + field + " from Row "+j+" of xlsx file has an invalid phone number";
                            if (field.length === 11) {
                                field = field.slice(1, field.length);
                            }
                            if (field && !isValidPhone(field)) error +=
                                (error.length !== 0 ? ", " : "") +
                                field + " is an invalid phone number";
                        }

                        contact[key] = field;
                    }
                    i++;
                });
                if ((!contact.contact_phone1 || !isValidPhone(contact.contact_phone1)) &&
                    (!contact.contact_phone2 || !isValidPhone(contact.contact_phone2)) &&
                    $rootScope.broadcast.message_type !== 'Email') {
                    error += (error.length !== 0 ? ", " : "") + "Row " + j +
                        " of imported file is missing a valid phone number which is required for " +
                        ($rootScope.broadcast.message_type === 'Email' ? 'an' +
                            $rootScope.broadcast.message_type : 'a ' +
                            $rootScope.broadcast.message_type) + " campaign.";
                }
                if (error !== '') {
                    $scope.lineError[j] = error;
                    //skipRow = true;
                }
                if (!skipRow) contacts.push(contact);
                j++;
            });
            var data = {
                contacts: contacts,
                robocall_uuid: $rootScope.broadcast.robocall_uuid
            };
            if (__env.enableDebug) console.log(data);
            //return;
            $scope.displayLineErrors = '';
            var errorResults = {
                recipient: null,
                newContacts: null
            };

            function continueImporting() {
                if (!errorResults.recipient) {
                    checkRecipient();
                } else if (!errorResults.newContacts) {
                    checkNewContacts();
                } else {
                    executeImport(contacts, data);
                }
            };

            function checkRecipient() {
                var recipientListDupErrors = newContactsUniqueOfRecipientList(data.contacts,
                    $scope.broadcast.contacts);
                if (recipientListDupErrors.length > 0) {
                    $scope.dupErrors = recipientListDupErrors;
                    $scope.recipientDupMessage =
                        "The spreadsheet you uploaded contains " +
                        recipientListDupErrors.length +
                        " contact" + (recipientListDupErrors.length > 1 ? "s" : "") +
                        " that match" + (recipientListDupErrors.length > 1 ? "" : "es") +
                        " contacts already imported for this campaign.";
                    var templateUrl = "views/autodialing/errors-prompt.html";
                    var shouldContinue;

                    function onDismiss() {
                        if (shouldContinue) {
                            errorResults.recipient = true;
                            continueImporting();
                        } else {
                            $scope.importing = false;
                            $scope.cancelXlsxUpload();
                        }
                    };
                    var promptPromise = $rootScope.customPrompt(templateUrl, $scope,
                        onDismiss);
                    $scope.resolvePrompt = function(shouldContinueResult) {
                        shouldContinue = shouldContinueResult;
                        if (promptPromise) {
                            promptPromise();
                        }
                    };
                } else {
                    errorResults.recipient = true;
                    continueImporting();
                }
            }

            function checkNewContacts() {
                var newContactsDupErrors = newContactsUnique(data.contacts);
                if (newContactsDupErrors.length > 0) {
                    $scope.dupErrors = newContactsDupErrors;
                    $scope.recipientDupMessage =
                        "The spreadsheet you uploaded contains " + newContactsDupErrors
                        .length +
                        " contact" + (newContactsDupErrors.length > 1 ? "s" : "") +
                        " that match" + (newContactsDupErrors.length > 1 ? "" : "es") +
                        " other contacts in this spreadsheet.";
                    var templateUrl = "views/autodialing/errors-prompt.html";
                    var shouldContinue;

                    function onDismiss() {
                        if (shouldContinue) {
                            errorResults.newContacts = true;
                            continueImporting();
                        } else {
                            $scope.importing = false;
                            $scope.cancelXlsxUpload();
                        }
                    };
                    var promptPromise = $rootScope.customPrompt(templateUrl, $scope,
                        onDismiss);
                    $scope.resolvePrompt = function(shouldContinueResult) {
                        shouldContinue = shouldContinueResult;
                        if (promptPromise) {
                            promptPromise();
                        }
                    };
                } else {
                    errorResults.newContacts = true;
                    continueImporting();
                }
            };
            continueImporting();
        }
    };

    function executeImport(contacts, data) {
        if (contacts.length > 30) {
            dataFactory.postRoboCallContactJob(data)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        $rootScope.broadcast.contacts = [];
                        $scope.contactRows = null;
                        $scope.gridOptions = {};
                        $scope.colSelect = [];
                    } else if (response.data.error) {
                        $rootScope.alerts.push({
                            type: 'danger',
                            msg: response.data.error.message
                        });
                    }
                    $scope.importing = false;
                }).catch(function(error) {
                    if (__env.enableDebug) console.log(error);
                    $scope.importing = false;
                });
        } else {
            dataFactory.postRoboCallContactArray(data)
                .then(function(response) {
                    //$rootScope.showalerts(response);
                    if (response.data.success) {
                        $rootScope.broadcast.contacts = [];
                        if (__env.enableDebug) console.log(response.data.success);
                        $rootScope.broadcast.contacts = response.data.success.data;
                        $scope.contact.activeTab = 0;
                        $scope.gridOptions = {};
                        if (response.data.success.duplicate_phone.length > 0) {
                            angular.forEach(response.data.success.duplicate_phone,
                                function(duplicate) {
                                    $scope.displayLineErrors += duplicate +
                                        '<br />';
                                });
                        }
                        if (response.data.success.duplicate_email.length > 0) {
                            angular.forEach(response.data.success.duplicate_email,
                                function(duplicate) {
                                    $scope.displayLineErrors += duplicate +
                                        '<br />';
                                });
                        }
                        angular.forEach($scope.lineError, function(error) {
                            if (error.length > 0) $scope.displayLineErrors +=
                                error + '<br />';
                        });
                        if ($scope.displayLineErrors) $scope.displayLineErrors =
                            "<strong>Errors were noted with some of the contacts that you've imported. Please review the comments below and make any necessary corrections.</strong><br />" +
                            $scope.displayLineErrors;
                        $scope.colSelect = [];
                        // $scope.gridOptions.data = null;
                        //$scope.gridOptions.columnDefs = null;
                    } else if (response.data.error) {
                        $rootScope.alerts.push({
                            type: 'danger',
                            msg: response.data.error.message
                        });
                    }
                    $scope.importing = false;
                });
        }
    }

    $scope.closeMessage = function() {
        $rootScope.successMessage = '';
        $rootScope.failureMessage = '';
        $scope.displayLineErrors = '';
    };

    $scope.changeCampaignStatus = function(campaign, status) {
        dataFactory.getUpdateCampaignStatus(status, campaign.robocall_uuid)
            .then(function(result) {
                if (result.data.success) {
                    var index = $filter('getByUUID')($scope.amCampaigns, campaign.robocall_uuid,
                        'robocall');
                    if (index !== null) $scope.amCampaigns[index] = result.data.success
                        .data;
                    $scope.currentCampaign = result.data.success.data;
                    $rootScope.showSuccessAlert(result.data.success.message);
                } else {
                    if (__env.enableDebug) console.log(result.data.error.message);
                    $rootScope.showErrorAlert(result.data.error.message);
                }
            });
    };

    $scope.$on('am-campaign-update', function(event, campaign) {
        var index = $filter('getByUUID')($scope.amCampaigns, campaign.robocall_uuid,
            'robocall');
        if (index !== null) {
            $scope.amCampaigns[index] = campaign;
            if ($scope.currentCampaign && $scope.currentCampaign.robocall_uuid ===
                campaign.robocall_uuid) {
                $scope.getCampaignDetail(campaign.robocall_uuid);
            }
            //if (campaign.status !== 'sending') campaign.status ==='sending';
        }
    });

    $scope.repet = 0;
    $scope.checkPhoneNumber = function(phoNumb) {
        var newRecord = true;
        var listAUX = $scope.listXlsxTmp;
        //***** check on the file actual *****//
        listAUX.forEach(function(entry) {
            if (entry.contact_phone1 === phoNumb) {
                $scope.repet++;
                newRecord = false;
                return true;
            }
        });
        //***** check on the contact list procesed *****//
        if (newRecord && $rootScope.listCntcRecMess.length > 0) {
            $rootScope.listCntcRecMess.forEach(function(entry) {
                if (entry.contact_phone1 === phoNumb) {
                    $scope.repet++;
                    newRecord = false;
                    return true;
                }
            });
        }
        if (newRecord) {
            return true;
        } else {
            return false;
        }
    };
    $scope.dropAlert = function() {
        $rootScope.procXlsxError = false;
        $scope.procAddIndError = false;
        $scope.procContacError = false;
    };
    $scope.processAnotherFile = function() {
        $rootScope.procXlsxSuccess = false;
        $rootScope.procXlsxError = false;
    };
    $scope.error = function(e) {
        /* DO SOMETHING WHEN ERROR IS THROWN */
        if (__env.enableDebug) console.log(e);
        $rootScope.procXlsxSuccess = false;
    };
    /****************************** LIST CONTACT *****************************************************************************************************************/
    $rootScope.simulateQuery = false;
    $rootScope.isDisabled = false;
    $rootScope.contactsSelected = [];

    //   function querySearch (query) {
    //         var results = query ? $rootScope.contactsAvailable.filter( filterContacts(query) ) : $rootScope.contactsAvailable,
    //             deferred;
    //         if ($rootScope.simulateQuery) {
    //           deferred = $q.defer();
    //           $timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
    //           return deferred.promise;
    //         } else {
    //           return results;
    //         }
    //   }
    //   function selectedItemChange(item) {
    //       if(__env.enableDebug) console.log(item);
    //       $log.info('Item changed to ' + JSON.stringify(item));
    //       if(__env.enableDebug) console.log($rootScope.selectContact);
    //       if (item && item !=='undefined') {
    //             if (item.contact_primary_number) {
    //               if ($scope.checkPhoneNumber(item.contact_primary_number)) {
    //                     $rootScope.listCntcRecMess.push({robocall_contact_uuid: null, contact_from_list: item.contact_uuid, domain_uuid: $scope.broadcast.domain_uuid, robocall_uuid: $rootScope.broadcast.robocall_uuid, firstname: item.contact_name_full , contact_phone1: item.contact_primary_number , notes: 'In contact list', status: 'NotDelivered'});
    //                     $rootScope.contactsSelected.push(item);
    //                     var index = $filter('getIndexbyUUID')($rootScope.contactsAvailable, item.contact_uuid);
    //                     $rootScope.contactsAvailable.splice(index,1);
    //                     // *****   erase txt ***** //
    //                     $scope.filteredItemsCampCnts = $rootScope.listCntcRecMess.length; //Initially for no filter
    //                     $scope.totalItemsCampCnts = $rootScope.listCntcRecMess.length;
    //               } else {
    //                     $scope.procContacError = true;
    //               }
    //           } else {
    //                     alert('This user do not have phone number');
    //           }
    //       }
    //       if(__env.enableDebug) console.log($rootScope.contactsSelected);
    //       $rootScope.selectedItem = null;
    //   }

    //   function filterContacts(query) {
    //     var lowercaseQuery = angular.lowercase(query);
    //     //console.log(lowercaseQuery);
    //     return function filterFn(contact) {
    //         //if (contact.contact_name_full) console.log(contact.contact_name_full+": "+angular.lowercase(contact.contact_name_full).indexOf(lowercaseQuery));
    //         if (contact.contact_name_full && angular.lowercase(contact.contact_name_full).indexOf(lowercaseQuery)>=0) return true;
    //         if (contact.contact_email_address && contact.contact_email_address.indexOf(lowercaseQuery)>=0) return true;
    //         return false;
    //     };
    //   }
    //   $rootScope.removeSelectedContact = function(index) {
    //       $rootScope.contactsAvailable.push($rootScope.contactsSelected[index]);
    //       $rootScope.contactsSelected.splice(index,1);
    //   };
    function getAvailableDids() {
        dataFactory.getAvailableDidsforAm()
            .then(function(response) {
                if (__env.enableDebug) console.log(response.data);
                if (response.data.success) {
                    $scope.availableDids = response.data.success.data;
                } else {
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
            });
    };

    getAvailableDids();

    $scope.getSelectedNumber = function(number) {
        var select = null;
        if (number) {
            angular.forEach($scope.availableDids, function(did) {
                if (did.number === number) select = angular.copy(did);
            });
        }
        return select;
    };

    $scope.getNumberBySearchText = function(searchNumber) {
        if (__env.enableDebug) console.log($scope.availableDids);
        if (searchNumber) {
            return $scope.availableDids.filter(function(number) {
                return number.number.indexOf(searchNumber) > -1;
            });
        } else {
            return $scope.availableDids;
        }
    };

    $scope.itemChange = function(schedule, number) {
        if (schedule && number) {
            if (__env.enableDebug) console.log(schedule);
            var index = $filter('getByUUID')($rootScope.broadcast.schedules, schedule.robocall_schedule_uuid,
                'robocall_schedule');
            if (index !== null) $rootScope.broadcast.schedules[index].call_from_did =
                number.number;
        }
    };

    $scope.callerIdNumberInit = function(schedule) {
        var number = schedule.call_from_did ? $scope.getSelectedNumber(schedule.call_from_did) :
            $scope.getSelectedNumber($scope.user.did);
        $scope.itemChange(schedule, number);
    };

    $scope.showItemText = function(number) {
        return $filter('tel')(number.number) + (number.title ? ' - ' + number.title :
            '');
    };
    /***********************************************************************************************************************************************/
    $rootScope.updateRoboCall = false;
    if ($routeParams.rc_uuid && $routeParams.rc_uuid !== '0') {
        $rootScope.updateRoboCall = true;
        $rootScope.roboCallUUID = $routeParams.rc_uuid;
        dataFactory.getRoboCallUUID($routeParams.rc_uuid)
            .then(function(response) {
                if (__env.enableDebug) console.log("GET RCUUID");
                if (__env.enableDebug) console.log(response);
                $rootScope.broadcast = response.data.success.data;
                getAvailableDids();
                initializeCustomFields();
                angular.forEach($rootScope.broadcast.customFields, function(field) {
                    $rootScope.customFields.push({
                        value: field.field_name,
                        key: field.field_key
                    });
                });

                /*  angular.forEach($rootScope.broadcast.schedules, function(item){
                      //item.start_at = new Date(item.start_at).toLocaleString("en-US", {timeZone: "America/New_York"});
                      item.start_at = new Date(item.start_at).toLocaleString("en-US", {timeZone: ($rootScope.user.settings.timezone ? $rootScope.user.settings.timezone : "America/New_York")})
                  });*/
                $rootScope.broadcast = updateStartDates($rootScope.broadcast);
                var index = $filter('getByUUID')($scope.amCampaigns, response.data.success
                    .data.robocall_uuid, 'robocall');
                if (index !== null) $scope.amCampaigns[index] = $rootScope.broadcast;
                $rootScope.roboCallUUID = response.data.success.data.robocall_uuid;
                if ($window.localStorage.getItem("goToStepNumber")) {
                    $timeout(function() {
                        var step = $window.localStorage.getItem(
                            "goToStepNumber");
                        $window.localStorage.removeItem("goToStepNumber");
                        $scope.goToStep(step);
                    });
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };
    $scope.goToStep = function(step) {
        if (__env.enableDebug) console.log(step);
        if (__env.enableDebug) console.log(WizardHandler.wizard());
        if (__env.enableDebug) console.log(WizardHandler.wizard().currentStepNumber());
        WizardHandler.wizard().goTo(step);
    }
    $scope.opcCallResult = true;
    $scope.opcSurveyResult = false;
    $scope.callResult = function() {
        $scope.opcCallResult = true;
        $scope.opcSurveyResult = false;
    };
    $scope.surveyResult = function() {
        $scope.opcCallResult = false;
        $scope.opcSurveyResult = true;
    };

    function initializeMyChart() {
        $scope.myChartObject = {};
        $scope.myChartObject.type = "PieChart";
        $scope.myChartObject.options = {
            title: '...',
            chartArea: {
                left: 10,
                top: 10,
                bottom: 10,
                width: '100%',
                height: "100%"
            },
            displayExactValues: true,
            width: '100%',
            height: '100%',
            is3D: true
        };
    }

    function getDeliveryResults(campaign, schedule) {
        var index = $filter('getByUUID')($scope.currentCampaign.schedules, schedule.robocall_schedule_uuid,
            'robocall_schedule');
        var data = {};
        if (__env.enableDebug) console.log(schedule);
        if (__env.enableDebug) console.log(campaign);
        dataFactory.getScheduleDeliveries(schedule.robocall_schedule_uuid)
            .then(function(response) {
                if (__env.enableDebug) console.log("DELIVERY RESPONSE");
                if (__env.enableDebug) console.log(response);
                if (response.data.success) {
                    var results = response.data.success.data;
                    $scope.currentCampaign.schedules[index].deliveries = results.deliveries;
                    angular.forEach($scope.currentCampaign.schedules[index].deliveries,
                        function(delivery) {
                            var index = $filter('getByUUID')($scope.currentCampaign
                                .contacts, delivery.robocall_contact_uuid,
                                'robocall_contact');
                            delivery.contact = null;
                            if (index !== null) delivery.contact = $scope.currentCampaign
                                .contacts[index];
                        });
                    var rows = [];
                    var array = [];
                    var sum = 0;
                    angular.forEach(results, function(value, key) {
                        if (key !== 'deliveries') {
                            var line = {
                                c: [{
                                    v: key
                                }, {
                                    v: value
                                }]
                            };
                            rows.push(line);
                            var data = {
                                key: key,
                                value: value
                            }
                            array.push(data);
                            sum += value;
                        }
                    });
                    var remain = $scope.currentCampaign.contacts.length - sum;
                    var line = {
                        c: [{
                            v: "Completed"
                        }, {
                            v: remain
                        }]
                    };
                    rows.push(line);
                    $scope.currentCampaign.schedules[index].results = array;
                    data = {
                        "cols": [{
                                id: "t",
                                label: "Topping",
                                type: "string"
                            },
                            {
                                id: "s",
                                label: "Slices",
                                type: "number"
                            }
                        ],
                        "rows": rows
                    };
                    if (__env.enableDebug) console.log(data);
                    $scope.myChartObject.data = data;
                    if (__env.enableDebug) console.log($scope.currentCampaign);
                }
            });
        return data;
    }
    $scope.returnToLanding = function() {
        var archived = $scope.currentCampaign && $scope.currentCampaign.archived_at;
        if (!archived) {
            $scope.getCampaigns();
        }
        $scope.$evalAsync(function() {
            if (archived) {
                $scope.currentCampaign = null;
                $scope.showArchivedCampaigns = true;
            } else {
                $rootScope.showDelivering = false;
                $scope.activeCampaign = null;
                $scope.showAllCampaigns = true;
            }
        });
        if (!archived) {
            $location.path('/automatedmessaging');;
        }
    };
    $scope.getCampaignDetail = function(robocall_uuid) {
        $scope.showArchivedCampaigns = false;
        $rootScope.showDelivering = false;
        var index = $filter('getByUUID')($scope.amCampaigns, robocall_uuid, 'robocall');
        //var campaign = $scope.amCampaigns[index];
        var campaign = null;
        dataFactory.getRoboCallUUID(robocall_uuid)
            .then(function(response) {
                if (__env.enableDebug) console.log(
                    "RESPONSE FROM RETRIEVING CAMPAIGN");
                if (__env.enableDebug) console.log(response);
                if (response.data.success) {
                    campaign = response.data.success.data;

                    angular.forEach(campaign.schedules, function(item) {
                        //item.start_at = new Date(item.start_at);
                        if (__env.enableDebug) console.log("ITEM START AT");
                        if (__env.enableDebug) console.log(item.start_at);
                    });

                    campaign = updateStartDates(campaign);
                    $scope.currentCampaign = campaign;
                    $scope.amCampaigns[index] = campaign;
                    if (campaign.status === 'sent') {
                        initializeMyChart();
                        getDeliveryResults(campaign, campaign.schedules[0]);
                    }
                    $scope.showAllCampaigns = false;
                    $scope.activeCampaign = robocall_uuid;
                    $scope.contact.activeTab = 1;
                }
                if (campaign === null) $rootScope.alerts.push({
                    type: 'danger',
                    msg: 'We were unable to load this campaign.'
                });
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };
    $scope.campContactsRst = [];
    $scope.rstCampContacts = {};
    $scope.currentPageCampCnts = 1; //current page
    $scope.entryLimitCampCnts = 15; //max no of items to display in a page
    $scope.filteredItemsCampCnts = 0; //Initially for no filter
    $scope.totalItemsCampCnts = 0;
    $scope.getRoboCallContacts = function(data) {
        dataFactory.getRoboCallContacts(data)
            .then(function(response) {
                $scope.campContactsRst = response.data;
                $rootScope.listCntcRecMess = response.data;
                $rootScope.broadcast.contacts = response.data;
                $scope.filteredItemsCampCnts = $rootScope.listCntcRecMess.length; //Initially for no filter
                $scope.totalItemsCampCnts = $rootScope.listCntcRecMess.length;
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };
    $rootScope.broadcast = {};
    //$rootScope.mytime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    $rootScope.mytime = new Date().toLocaleString("en-US", {
        timeZone: ($rootScope.user.settings.timezone ? $rootScope.user.settings.timezone :
            "America/New_York")
    });

    //$rootScope.broadcast.start_time = $rootScope.mytime.toLocaleTimeString() ;
    $rootScope.hstep = 1;
    $rootScope.mstep = 1;
    $rootScope.ismeridian = true;
    $rootScope.changed = function() {
        $log.log('Time changed to: ' + $rootScope.mytime);
        //$rootScope.broadcast.start_time = $rootScope.mytime.toLocaleTimeString() ;
    };

    $rootScope.broadcast.user_uuid = $rootScope.user.id;
    $rootScope.broadcast.domain_uuid = $rootScope.user.domain_uuid;
    $scope.saveStep1 = function(campaign) {
        if (__env.enableDebug) console.log(campaign);
        $rootScope.showDelivering = false;
        //if ($robocall.$rootScope.roboCallUUID && $rootScope.roboCallUUID !== '0') {
        if (__env.enableDebug) console.log($rootScope.broadcast.robocall_uuid);
        if ($rootScope.broadcast.robocall_uuid) {
            dataFactory.updateRoboCall($rootScope.broadcast)
                .then(function(response) {
                    if (__env.enableDebug) console.log(response);
                    if (response.data.success) {
                        $rootScope.broadcast = response.data.success.data;
                        $rootScope.broadcast = updateStartDates($rootScope.broadcast);
                        var index = $filter('getByUUID')($scope.amCampaigns,
                            response.data.success.data.robocall_uuid,
                            'robocall');
                        if (index !== null) $scope.amCampaigns[index] = $rootScope.broadcast;
                    } else {
                        if (__env.enableDebug) console.log(response.data.error.message);
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            var data = {
                domain_uuid: campaign.domain_uuid,
                message_type: campaign.message_type,
                robocall_type: campaign.robocall_type,
                robocall_name: campaign.robocall_name,
                schedule_type: campaign.schedule_type,
                schedule_status: (campaign.schedule_type === 'One' ? 'Yes' : 'No'),
                user_uuid: campaign.user_uuid
            };
            dataFactory.postRoboCall(data)
                .then(function(response) {
                    if (response.data.success) {
                        $rootScope.broadcast = response.data.success.data;
                        $rootScope.broadcast = updateStartDates($rootScope.broadcast);
                        var index = $filter('getByUUID')($scope.amCampaigns,
                            response.data.success.data.robocall_uuid,
                            'robocall');
                        if (index !== null) $scope.amCampaigns[index] = $rootScope.broadcast;
                        if (__env.enableDebug) console.log($rootScope.broadcast);
                        $rootScope.roboCallUUID = $rootScope.broadcast.robocall_uuid;
                        if (__env.enableDebug) console.log("ROBOCALL UUID: " +
                            $rootScope.broadcast.robocall_uuid);
                        $window.localStorage.setItem("goToStepNumber",
                            "step 2: Recipients");
                        $location.path('/automatedmessaging/' + $rootScope.broadcast
                            .robocall_uuid);
                        if ($window.localStorage.getItem("goToStepNumber")) {
                            $timeout(function() {
                                var step = $window.localStorage.getItem(
                                    "goToStepNumber");
                                $window.localStorage.removeItem(
                                    "goToStepNumber");
                                $scope.goToStep("step 2: Recipients");
                            });
                        }
                    } else {
                        if (__env.enableDebug) console.log(response.data.error);
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        }
    };

    $scope.selectedItemChanged = function(n) {
        if ($scope.colSelect[n] === 'add_new') {
            $scope.showNewField[n] = true;
        } else {
            $scope.showNewField[n] = false;
        }
    };

    $scope.saveNewField = function(n, newfield) {
        var key = null;
        if (newfield) {
            key = Slug.slugify(newfield);
            key = key.replaceAll("-", "_");

            var data = {
                robocall_uuid: $rootScope.broadcast.robocall_uuid,
                field_name: newfield,
                field_key: key,
                form_type: 'text'
            }
            dataFactory.postAddCustomField(data)
                .then(function(result) {
                    if (result.data.success) {
                        $rootScope.broadcast.customFields = result.data.success.data;
                        $rootScope.customFields.push({
                            value: newfield,
                            key: key
                        });
                        //$scope.colOptions.push({key: key, value: newfield});
                        $scope.newField[n] = null;
                        $scope.showNewField[n] = false;
                        $timeout(function() {
                            $scope.colSelect[n] = key;
                        });
                    } else {
                        if (__env.enableDebug) console.log(result.data.error.message);
                        $rootScope.showErrorAlert(result.data.error.message);
                    }
                });
        }
    };

    $scope.createEmptySchedule = function(index) {
        var start = new Date().toLocaleString("en-US", {
            timeZone: ($rootScope.user.settings.timezone ? $rootScope.user.settings
                .timezone : "America/New_York")
        })
        var nextint = parseInt(index) + 1;
        var data = {
            title: 'Message ' + nextint,
            start_at: start
        }
        if (__env.enableDebug) console.log(data);
        $scope.addScheduleEntry(data);
    };

    function checkContacts(contacts, type) {
        var count = 0;
        var field;
        var cause = 'The following contacts are missing a';
        if (type === 'Voice' || type === 'Text') {
            field = 'contact_phone1';
            cause += ' phone number.';
        } else if (type === 'Email') {
            cause += 'n email address.';
            field = 'email_address';
        }
        angular.forEach(contacts, function(contact) {
            if (!contact[field]) count += 1;
        });
        return count;
        cause += 'Because you are sending a ' + type +
            ' campaign, if you choose to continue, these contacts will not be reached.';
    }

    function completeStep2() {
        if ($scope.list && !angular.equals({}, $scope.list)) {
            $scope.displayLineErrors =
                "You have an unsaved recipient on the Add Individually tab. Please click Put On List or Clear before moving on.";
            $timeout(function() {
                usefulTools.goToId('top');
            });
            return false;
        }
        if (($scope.contactRows && $scope.contactRows.length > 0) || ($scope.gridOptions.columnDefs)) {
            $scope.displayLineErrors =
                "You have a pending recipient import. Please complete the import or Cancel Import to continue.";
            $timeout(function() {
                usefulTools.goToId('top');
            });
            return false;
        }
        if (!$rootScope.broadcast.schedules || $rootScope.broadcast.schedules.length === 0) {
            $rootScope.broadcast.schedule_status = 'Yes';
            var data = {
                title: 'Message 1 ',
                //start_at: new Date().toLocaleString("en-US", {timeZone: ($rootScope.user.settings.timezone ? $rootScope.user.settings.timezone : "America/New_York")})
                start_at: new Date()
            }

            var timeZone = $rootScope.user.settings.timezone ? $rootScope.user.settings.timezone :
                "America/NewYork";
            var temp = moment(new Date());
            $scope.newdate = temp.tz(timeZone);
            var data = {
                title: 'Message 1',
                start_at: $scope.newdate
            }
            if (__env.enableDebug) console.log(data);
            $scope.showOneSchedule = false;
            $scope.addScheduleEntry(data);
        } else {
            $scope.showOneSchedule = true;
        }
        $scope.displayLineErrors = null;
        if (__env.enableDebug) console.log($rootScope.broadcast.schedules[0]);
        if (__env.enableDebug) console.log($rootScope.user);
        return true;
    }
    $scope.step2Validation = function() {
        if (__env.enableDebug) console.log(WizardHandler.wizard().currentStepNumber());
        if (__env.enableDebug) console.log(WizardHandler.wizard().getEnabledSteps());
        var type = $rootScope.broadcast.message_type;
        var numBadContacts = checkContacts($rootScope.broadcast.contacts, type);
        if (numBadContacts !== 0) {
            var field;
            if (type === 'Voice' || type === 'Text') {
                field = ' phone number';
            } else if (type === 'Email') {
                field = 'email address';
            }
            var check = $mdDialog.confirm()
                .title('Please Confirm')
                .textContent('You have ' + numBadContacts + ' contact' + (
                        numBadContacts > 1 ? 's' : '') + ' missing a' + (type ===
                        'Email' ? 'n ' : ' ') + field + '. Because you are sending a ' +
                    type +
                    ' campaign, if you choose to continue, these contacts will not be reached.'
                )
                .ariaLabel('Confirm')
                .ok('Continue')
                .cancel('Cancel');
            $mdDialog.show(check)
                .then(function(response) {
                    console.log(response);
                    if (response) {
                        $scope.step2Clear = completeStep2();
                        if ($scope.step2Clear) WizardHandler.wizard().goTo(2);
                    } else {
                        $scope.step2Clear = false;
                    }
                });
        } else {
            $scope.step2Clear = completeStep2();
            if ($scope.step2Clear) WizardHandler.wizard().goTo(2);
        }
    };
    $scope.isStep2Clear = function() {
        return $scope.step2Clear;
    };
    $scope.saveStep2 = function() {
        //$scope.getRoboCallContacts($rootScope.broadcast.robocall_uuid);

    };
    $scope.step3Validation = function(broadcast) {
        var status = false;
        angular.forEach(broadcast.schedules, function(schedule) {
            if (broadcast.message_type === 'Email') {
                if (!schedule.start_at || !schedule.email_subject || !schedule.email_from_email ||
                    !schedule.email_message_html) {
                    status = true;
                }
            } else if (broadcast.message_type === 'Text') {
                if (!schedule.start_at || !schedule.sms_message || !schedule.sms_reply_number) {
                    status = true;
                }
            } else if (broadcast.message_type === 'Voice') {
                if (!schedule.start_at || !schedule.recording_file || !schedule
                    .call_from_did) {
                    status = true;
                }
            }
        });
        return status;
    };
    $scope.saveStep3 = function() {
        if ($rootScope.broadcast.schedule_type === 'One') {
            $scope.updateSchedule($rootScope.broadcast.schedules[0], 0, false);
        } else {
            var i = 0;
            angular.forEach($rootScope.broadcast.schedules, function(schedule) {
                $scope.updateSchedule(schedule, i, false);
                i += 1;
            });
        }
    };
    $scope.deleteContactList = function(contac) {
        if (__env.enableDebug) console.log(contac);
        $rootScope.listCntcRecMess.forEach(function(entry, index) {
            if (entry.robocall_contact_uuid === contac) {
                alert('Review API delete...');
                //                dataFactory.deleteRoboCallContacts(contac)
                //                    .then(function(response){
                //                        if(__env.enableDebug) console.log(response);
                //                        //$rootScope.roboCallUUID = response.data;
                //
                //                    }, function(error){
                //                        if(__env.enableDebug) console.log(error);
                //                    });
                $rootScope.listCntcRecMess.splice(index, 1);
                return;
            }
        });
        $scope.filteredItemsCampCnts = $rootScope.listCntcRecMess.length; //Initially for no filter
        $scope.totalItemsCampCnts = $rootScope.listCntcRecMess.length;
    };
    $scope.procContacError = false;
    $rootScope.listCntcRecMess = [];
    $rootScope.rstListCntcRecMess = {};
    $scope.loadListContact = function(contac) {
        if (__env.enableDebug) console.log(contac);
        if (contac.contact_primary_number) {
            if ($scope.checkPhoneNumber(contac.contact_primary_number)) {
                $rootScope.listCntcRecMess.push({
                    robocall_contact_uuid: null,
                    contact_from_list: contac.contact_uuid,
                    domain_uuid: $scope.broadcast.domain_uuid,
                    robocall_uuid: $rootScope.broadcast.robocall_uuid,
                    firstname: contac.contact_name_full,
                    contact_phone1: contac.contact_primary_number,
                    notes: 'In contact list',
                    status: 'NotDelivered'
                });
                $scope.filteredItemsCampCnts = $rootScope.listCntcRecMess.length; //Initially for no filter
                $scope.totalItemsCampCnts = $rootScope.listCntcRecMess.length;
            } else {
                $scope.procContacError = true;
            }
        } else {
            alert('This user do not have phone number');
            //$scope.contactsUsr.splice($scope.contactsUsr.indexOf(contac),1);
            //$rootScope.contactsUsr.splice($rootScope.contactsUsr.indexOf(contac),1);
            //if(__env.enableDebug) console.log(contac[$index]);
            var index = $scope.contactsUsrRC.indexOf(contac);
            if (__env.enableDebug) console.log(index);
        }
    };
    $scope.removeContactList = function(contac) {
        if (__env.enableDebug) console.log(contac);
        $rootScope.listCntcRecMess.forEach(function(entry, index) {
            if (contac.contact_uuid) {
                if (entry.contact_from_list === contac.contact_uuid) {
                    $rootScope.listCntcRecMess.splice(index, 1);
                    return;
                }
            } else {
                if (entry.contact_from_list === contac) {
                    $rootScope.listCntcRecMess.splice(index, 1);
                    return;
                }
            }
        });
        $scope.filteredItemsCampCnts = $rootScope.listCntcRecMess.length; //Initially for no filter
        $scope.totalItemsCampCnts = $rootScope.listCntcRecMess.length;
    };
    $scope.procAddIndError = false;
    $scope.list = {};
    $scope.clearIndividually = function() {
        $scope.list = {};
    };
    $scope.addListIndividually = function(values) {
        if (userService.limitReached('campaign_contact')) {
            $rootScope.showErrorAlert('You have reached the limit of ' + $rootScope.user
                .usageLimits.campaign_contact +
                ' contacts per campaign allowed while using a Bridge Demo account. For questions about Bridge, please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a>.'
            );
            return;
        }
        if (__env.enableDebug) console.log(values);
        $scope.displayLineErrors = '';
        if ($rootScope.broadcast.message_type === 'Email') {
            if (!values.email || !isValidEmail(values.email)) $scope.displayLineErrors =
                "For an Email Campaign, all recipients must have a valid email address.";
        } else {
            if (!values.phone) $scope.displayLineErrors =
                "For a Voice or Text Campaign, all recipients must have a phone number.";
            if (values.phone && values.phone.length !== 10) $scope.displayLineErrors =
                "For a Voice or Text Campaign, all recipients must have a valid phone number.";
        }
        if (!$scope.displayLineErrors) {
            var data = {
                robocall_uuid: $rootScope.broadcast.robocall_uuid,
                firstname: values.name,
                lastname: values.lastname,
                email_address: values.email ? values.email : '',
                contact_phone1: values.phone ? values.phone : '',
                notes: values.notes ? values.notes : '',
                status: 'NotDelivered'
            }
            if (__env.enableDebug) console.log(data);
            dataFactory.postAddContact(data)
                .then(function(response) {
                    //$rootScope.showalerts(response);
                    if (response.data.success) {
                        if (!$rootScope.broadcast.contacts) $rootScope.broadcast.contacts = [];
                        $rootScope.broadcast.contacts.push(response.data.success.data);
                        $scope.contact.activeTab = 0;
                        $scope.list = {};
                    } else if (response.data.error) {
                        $rootScope.alerts.push({
                            type: 'danger',
                            msg: response.data.error.message
                        });
                        if (__env.enableDebug) console.log(response.data.error.message);
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        }
    };

    function getUserSmsNumbers() {
        dataFactory.getUserSmsNumbers()
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    console.log(response.data.success);
                    $scope.smsNumbers = response.data.success.data;
                    var index = $filter('getByUUID')($scope.smsNumbers, $rootScope.user
                        .id, 'user');
                    if (index !== null) $scope.useSms = $scope.smsNumbers[index];
                    console.log($scope.useSms);
                }
            });
    }
    getUserSmsNumbers();

    $rootScope.loadTemplates = function() {
        dataFactory.getAvailTemplates()
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.availEmailTemplates = data.response.success.data;
                } else {
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
            });
    };
    $scope.oneAtATime = true;
    $scope.showAddSchedule = false;
    $scope.saveEmailMessage = function(index, schedule, showalert) {
        if ($rootScope.broadcast.message_type === 'Email') {
            if (!schedule.start_at || !schedule.email_subject || !schedule.email_from_email ||
                !schedule.email_message_html) {
                $rootScope.showErrorAlert(
                    'The start time, subject, from email and message fields are all required.'
                );
                return;
            }
        }
        var data = {
            robocall_schedule_uuid: $rootScope.broadcast.schedules[index].robocall_schedule_uuid,
            email_message_html: schedule.email_message_html,
            email_message_text: htmlToPlaintext(schedule.email_message_html),
            email_subject: schedule.email_subject,
            email_from_email: schedule.email_from_email,
            email_from_name: schedule.email_from_name,
            title: schedule.title ? schedule.title : $rootScope.broadcast.schedules[
                index].title,
            start_at: schedule.start_at
        }
        if (__env.enableDebug) console.log(data);
        saveScheduleEntry(data, index, showalert);
    };
    $scope.duplicateCampaign = function(robocall_uuid) {
        if (userService.limitReached('campaign')) {
            $rootScope.showErrorAlert('You have reached the limit of ' + $rootScope.user
                .usageLimits.campaign +
                ' automated messaging campaigns allowed while using a Bridge Demo account. For questions about Bridge, please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a>.'
            );
            return;
        }
        dataFactory.getDuplicateCampaign(robocall_uuid)
            .then(function(result) {
                $rootScope.showalerts(result);
                if (result.data.success) {
                    $scope.amCampaigns.push(result.data.success.data);
                    $scope.showAllCampaigns = true;
                    $scope.activeCampaign = null;
                } else {
                    if (__env.enableDebug) console.log(result.data.error.message);
                }
            });
    };
    $rootScope.saveHtmlEmail = function(json, html, index) {
        var data = {
            robocall_schedule_uuid: $rootScope.broadcast.schedules[index].robocall_schedule_uuid,
            email_message_template: json,
            email_message_html: html
        }
        $rootScope.broadcast.schedules[index].email_message_template = json;
        $rootScope.broadcast.schedules[index].email_message_html = html;
        saveScheduleEntry(data, index, true);
    };
    $scope.saveSmsMessage = function(index, schedule, showalert) {
        if ($rootScope.broadcast.message_type === 'Text') {
            if (!schedule.start_at || !schedule.sms_message || !schedule.sms_reply_number) {
                $rootScope.showErrorAlert(
                    'The start time, from number and message fields are all required.'
                );
                return;
            }
        }
        var data = {
            sms_message: schedule.sms_message,
            sms_reply_number: schedule.sms_reply_number,
            sms_from: null,
            robocall_schedule_uuid: schedule.robocall_schedule_uuid,
            title: schedule.title ? schedule.title : $rootScope.broadcast.schedules[
                index].title,
            start_at: schedule.start_at
        };
        if (__env.enableDebug) console.log(data);
        return saveScheduleEntry(data, index, showalert);
    };

    $scope.saveVoiceMessage = function(index, schedule, showalert) {
        if ($rootScope.broadcast.message_type === 'Voice') {
            if (!schedule.start_at || !schedule.call_from_did) {
                $rootScope.showErrorAlert(
                    'The start time and caller id number fields are all required.');
                return;
            }
        }
        var data = {
            call_from_did: schedule.call_from_did,
            robocall_schedule_uuid: schedule.robocall_schedule_uuid,
            title: schedule.title ? schedule.title : $rootScope.broadcast.schedules[
                index].title,
            start_at: schedule.start_at
        };
        if (__env.enableDebug) console.log(data);
        return saveScheduleEntry(data, index, showalert);
    };

    $scope.updateSchedule = function(schedule, index, showalert) {
        var method;
        if ($rootScope.broadcast.message_type === 'Text') {
            method = $scope.saveSmsMessage(index, schedule, showalert);
        } else if ($rootScope.broadcast.message_type === 'Email') {
            method = $scope.saveEmailMessage(index, schedule, showalert);
        } else if ($rootScope.broadcast.message_type === 'Voice') {
            var data = {
                robocall_schedule_uuid: schedule.robocall_schedule_uuid,
                title: schedule.title,
                start_at: schedule.start_at,
                call_from_did: schedule.call_from_did
            };
            method = saveScheduleEntry(data, index, showalert);
        }
        method.then(function(response) {
            if (response.data.success) {
                dataFactory.updateRoboCall($rootScope.broadcast)
                    .then(function(result) {
                        if (result.data.success) {
                            if (__env.enableDebug) console.log(result.data.success);
                            result.data.success.data.robocall_uuid
                            var index = $filter('getByUUID')($scope.amCampaigns,
                                result.data.success.data.robocall_uuid,
                                'robocall');
                            var campaign = updateStartDates(result.data.success
                                .data);
                            if (index !== null) $scope.amCampaigns[index] =
                                campaign;

                            if (showalert) $rootScope.showSuccessAlert(
                                result.data.success.message);

                            //$rootScope.broadcast = result.data.success.data;
                        } else {
                            if (__env.enableDebug) console.log(result.data.error
                                .message);
                        }
                    });
            } else {
                if (__env.enableDebug) console.log(response.data.error.message);
            }
        });
    };

    $scope.sortByDate = function(schedule) {
        var date = new Date(schedule.start_at);
        return date;
    }

    function updateStartDates(campaign) {
        angular.forEach(campaign.schedules, function(schedule) {
            if (__env.enableDebug) console.log(schedule.start_at);
            schedule.start_at = $filter('toLocalTime')(schedule.start_at);
            if (__env.enableDebug) console.log(schedule.start_at);
            //schedule.start_at = new Date(schedule.start_at).toLocaleString("en-US", {timeZone: ($rootScope.user.settings.timezone ? $rootScope.user.settings.timezone : "America/New_York")});
            schedule.start_at = schedule.start_at.toDate();
            if (__env.enableDebug) console.log(schedule.start_at);
            //schedule.start_at = new Date(schedule.start_at).toLocaleString("en-US", {timeZone: ($rootScope.user.settings.timezone ? $rootScope.user.settings.timezone : "America/New_York")});
        });
        return campaign;
    }
    $scope.goToLanding = function() {
        $location.path('/automatedmessaging');
    };
    $scope.campaignErrors = [];
    $scope.checkCampaignStatus = function(campaign) {

        if (!campaign.contacts || campaign.contacts.length == 0) {
            $scope.campaignErrors.push(
                'You have not added any recipients to your campaign.');
        }
        angular.forEach(campaign.schedules, function(schedule) {
            if (campaign.message_type === 'Text' && !schedule.sms_message && !
                schedule.sms_reply_number) {
                $scope.campaignErrors.push(
                    'You have not added any recipients to your campaign.');
            }
        });
        if ($scope.campaignErrors.length > 0) return false;
        return true;
    };

    $scope.startCampaign = function(campaign) {
        var data = {
            robocall_uuid: campaign.robocall_uuid,
            status: 'queue'
        }
        dataFactory.postStartRoboCallCampaign(data)
            .then(function(response) {
                if (response.data.success) {
                    var index = $filter('getByUUID')($scope.amCampaigns, campaign.robocall_uuid,
                        'robocall');
                    if (index === null) {
                        $scope.amCampaigns.push(campaign);
                        index = $filter('getByUUID')($scope.amCampaigns, campaign.robocall_uuid,
                            'robocall');
                    }
                    if (index !== null) {
                        if (__env.enableDebug) console.log($scope.amCampaigns[index]);
                        $scope.amCampaigns[index].status = 'queue';
                        $rootScope.showDelivering = true;
                        angular.forEach($scope.amCampaigns[index].schedules,
                            function(schedule) {
                                schedule.status = 'queue';
                            });

                    }
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            }, function(error) {
                $rootScope.alerts.push({
                    type: 'danger',
                    msg: 'Failure: ' + JSON.stringify(error)
                });
            });
    };
    $scope.showEditMessage = function(index) {
        if (!$scope.editMessage) {
            $scope.editMessage = [];
            $scope.editMessage[index] = true;
        } else {
            $scope.editMessage[index] = !$scope.editMessage[index];
        }
        $rootScope.scheduleIndex = index;
        if ($scope.editSchedule && $scope.editSchedule[index]) $scope.editSchedule[
            index] = false;
    };
    $scope.showEditSchedule = function(index) {
        if (!$scope.editSchedule) $scope.editSchedule = [];
        $scope.editSchedule[index] = !$scope.editSchedule[index];
        if ($scope.editMessage && $scope.editMessage[index]) $scope.editMessage[index] =
            false;
    };

    $scope.scheduleReady = function(schedule) {
        if (schedule.message_type === 'Text') {
            if (!schedule.start_at || !schedule.sms_message || !schedule.sms_reply_number)
                return false;
        } else if (schedule.message_type === 'Voice') {
            if (!schedule.start_at || !schedule.recording_file) return false;
        } else if (schedule.message_type === 'Email') {
            if (!schedule.start_at || !schedule.email_subject || !schedule.email_from_email ||
                !schedule.email_message_html) return false;
        }

        return true;
    };

    function htmlToPlaintext(text) {
        return text ? String(text).replace(/<[^>]+>/gm, '') : '';
    }

    function saveScheduleEntry(data, index, showalert) {
        data.user_uuid = $rootScope.user.id;
        if ($rootScope.broadcast.schedule_status === 'Yes' &&
            $rootScope.broadcast.schedule_type === 'One') data.start_at = new Date();

        if (data.start_at) {
            data.start_at = data.start_at.toLocaleString("en-US");
            data.timezone = $rootScope.user.settings.timezone ? $rootScope.user.settings.timezone :
                "America/New_York";
        }
        return dataFactory.postUpdateRoboCallSchedule(data)
            .then(function(response) {
                if (__env.enableDebug) console.log("RESPONSE TO SAVE SCHEDULE");
                if (__env.enableDebug) console.log(response);
                if (showalert) $rootScope.showalerts(response);
                if (response.data.success) {
                    if (__env.enableDebug) console.log($rootScope.broadcast.schedules[
                        index]);
                    if (__env.enableDebug) console.log(response.data.success.data);
                }
                return response;
            }, function(error) {
                $rootScope.alerts.push({
                    type: 'danger',
                    msg: 'Failure: ' + JSON.stringify(error)
                });
            });
    }
    $scope.dateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 1,
        minDate: new Date(),
        maxDate: today
    };
    $scope.datePopup = [];
    $scope.editSchedule = null;
    $rootScope.newschedule = {};
    //$rootScope.newschedule.start_date = new Date('2017-01-19 22:44:20');
    //$rootScope.broadcast.seriesSchedules = [];
    $scope.addScheduleEntry = function(schedule) {
        if (userService.limitReached('campaign')) {
            $rootScope.showErrorAlert('You have reached the limit of ' + $rootScope.user
                .usageLimits.campaign +
                ' scheduled messages allowed while using a Bridge Demo account. For questions about Bridge, please contact a Bridge specialist at <a href="mailto:bridge@kotter.net" target="_blank">bridge@kotter.net</a>.'
            );
            return;
        }
        if (!schedule || !schedule.title || !schedule.start_at) {
            $rootScope.alerts.push({
                type: 'danger',
                msg: 'Error: Title, Start Date and Time are required to create a new campaign leg.'
            });
        } else {
            var data = {
                robocall_uuid: $rootScope.broadcast.robocall_uuid,
                title: schedule.title,
                start_at: schedule.start_at,
                message_type: $rootScope.broadcast.message_type,
                status: 'draft',
                timezone: $rootScope.user.settings.timezone ? $rootScope.user.settings
                    .timezone : "America/New_York"
            }
            dataFactory.postCreateRoboCallSchedule(data)
                .then(function(response) {
                    if (response.data.success) {
                        if (!$rootScope.broadcast.schedules) $rootScope.broadcast.schedules = [];
                        $rootScope.broadcast.schedules.push(response.data.success.data);
                        $rootScope.broadcast = updateStartDates($rootScope.broadcast);
                        $scope.newschedule = {};
                        $scope.addSchedule = false;
                        $scope.showOneSchedule = true;
                    } else if (response.data.error) {
                        $rootScope.alerts.push({
                            type: 'danger',
                            msg: response.data.error.message
                        });
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        }
    };

    $scope.setIndex = function(index) {
        $rootScope.scheduleIndex = index;
    };

    $scope.openEmailEditor = function(robocall_schedule_uuid) {
        if (__env.enableDebug) console.log(robocall_schedule_uuid);
        $rootScope.editingScheduleUUID = robocall_schedule_uuid;
        $rootScope.showEditorModal('/autodialing/emaileditor.html',
            robocall_schedule_uuid, 'lg', 'editor-modal-window', 'static', 'false')
    };

    $scope.deleteRobocallCampaign = function() {
        var deleteConfirm = $mdDialog.confirm()
            .title('Are you sure you want to Delete this Campaign: ' + $scope.currentCampaign
                .robocall_name + '?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');
        $mdDialog.show(deleteConfirm).then(function() {
            dataFactory.deleteRobocallCampaign($scope.currentCampaign.robocall_uuid)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        var index = $filter('getByUUID')($scope.amCampaigns,
                            $scope.currentCampaign.robocall_uuid,
                            'robocall');
                        if (index !== null) $scope.amCampaigns.splice(index,
                            1);
                        $scope.currentCampaign = null;
                        $scope.showAllCampaigns = true;
                        $scope.activeCampaign = null;
                        $location.path('/automatedmessaging');
                        $scope.contact.activeTab = 0;
                    } else if (response.data.error) {
                        if (__env.enableDebug) console.log(response.data.error
                            .message);
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        });
    };

    $scope.archiveCampaign = function() {
        var archiveConfirm = $mdDialog.confirm()
            .title('Are you sure you want to Archive this Campaign: ' + $scope.currentCampaign
                .robocall_name +
                '? You can display all archives campaigns by choosing the Archive button at the bottom of the page.'
            )
            .ariaLabel('Archive')
            .ok('Yes')
            .cancel('Never Mind');
        $mdDialog.show(archiveConfirm).then(function() {
            dataFactory.getArchiveCampaign($scope.currentCampaign.robocall_uuid)
                .then(function(response) {
                    if (__env.enableDebug) console.log(response.data);
                    if (response.data.success) {
                        var index = $filter('getByUUID')($scope.amCampaigns,
                            $scope.currentCampaign.robocall_uuid,
                            'robocall');
                        if (index !== null) $scope.amCampaigns.splice(index,
                            1);
                        //$scope.amArchives.push($scope.currentCampaign);
                        $scope.currentCampaign = null;
                        $scope.showAllCampaigns = true;
                        $scope.activeCampaign = null;
                        $location.path('/automatedmessaging');
                        $scope.contact.activeTab = 0;
                    } else if (response.data.error) {
                        if (__env.enableDebug) console.log(response.data.error
                            .message);
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        });
    };

    $scope.removeAutomatedScheduleEntry = function(robocall_schedule_uuid) {
        var deleteConfirm = $mdDialog.confirm()
            .title(
                'Are you sure you want to delete this Automated Messaging Schedule Entry? This is not reversible!'
            )
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');
        $mdDialog.show(deleteConfirm).then(function() {
            dataFactory.getRemoveScheduleEntry(robocall_schedule_uuid)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        var index = $filter('getByUUID')($rootScope.broadcast
                            .schedules, robocall_schedule_uuid,
                            'robocall_schedule');
                        if (index !== null) $rootScope.broadcast.schedules.splice(
                            index, 1);
                    }
                    $rootScope.closeThisModal();
                });
        });
    };
    $scope.setOpcMessageBroadcast = function(opc) {
        if (opc === 1) {
            $scope.opcBroadcast = 'newrecord';
            $scope.opcBroadcastTitle = 'Record a New Message...';
        } else if (opc === 2) {
            $scope.opcBroadcast = 'uploadfile';
            $scope.opcBroadcastTitle = 'Upload an Audio File...';
        } else if (opc === 3) {
            loadAudioLibrary()
                .then(function() {
                    $scope.opcBroadcast = 'audiolibrary';
                    $scope.opcBroadcastTitle = 'Select from Audio Library...';
                });
        }
    };
    $scope.finishedWizard = function() {
        //alert('End');
    };
    var today = new Date();
    $scope.dateFormat = 'MM-dd-yyyy';
    $scope.broadcastDateOptions = {
        formatYear: 'yyyy',
        showWeeks: false,
        startingDay: 1,
        //minDate: today
        //maxDate: today.getDate() + 7
    };
    //$scope.broadcastDatePopup = {
    //    opened: false
    //};
    $scope.clear = function() {
        $scope.dt = null;
    };
    // Disable weekend selection
    function disabled(data) {
        var date = data.date,
            mode = data.mode;
        return mode === 'day' && (date.getDay() === 0 || date.getDay() === 6);
    }
    $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];
    $scope.format = $scope.formats[0];
    $scope.altInputFormats = ['M!/d!/yyyy'];
    $scope.inlineOptions = {
        customClass: getDayClass,
        minDate: new Date(),
        showWeeks: true
    };
    $scope.dateOptions = {
        dateDisabled: disabled,
        formatYear: 'yy',
        maxDate: new Date(2020, 5, 22),
        minDate: new Date(),
        startingDay: 1
    };
    $scope.popup1 = {
        opened: false
    };
    $scope.open1 = function() {
        $scope.popup1.opened = true;
    };
    $scope.popup2 = {
        opened: false
    };
    $scope.open2 = function() {
        $scope.popup2.opened = true;
    };
    $scope.popup3 = {
        opened: false
    };
    $scope.open3 = function() {
        $scope.popup3.opened = true;
    };
    $scope.setDate = function(year, month, day) {
        $scope.dt = new Date(year, month, day);
    };

    function getDayClass(data) {
        var date = data.date,
            mode = data.mode;
        if (mode === 'day') {
            var dayToCheck = new Date(date).setHours(0, 0, 0, 0);
            for (var i = 0; i < $scope.events.length; i++) {
                var currentDay = new Date($scope.events[i].date).setHours(0, 0, 0, 0);
                if (dayToCheck === currentDay) {
                    return $scope.events[i].status;
                }
            }
        }
        return '';
    }
    $scope.seriesDatePopup = [];
    $scope.seriesOpenDateBox = function(index) {
        if (!$scope.seriesDatePopup[index]) $scope.seriesDatePopup[index] = true;
        $scope.seriesDatePopup[index] = true;
    };
    $scope.newDatePopup = false;
    $scope.openNewDatePopup = function() {
        $scope.newDatePopup = true;
    };
    $scope.formatDate = function(date) {
        var dateOut = new Date(date);
        return dateOut;
    };
    $scope.formatTime = function(time) {
        var hours = Math.floor(time / 3600);
        var minutes = Math.floor((time % 3600) / 60);
        var seconds = time % 60;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        return (hours + ":" + minutes + ":" + seconds);
    };
    $scope.showCampaignStatus = function(status) {
        if (status === 'sent') return 'Completed';
        if (status === 'draft') return 'Draft';
        if (status === 'sending') return 'Sending';
        if (status === 'paused') return 'Paused';
        if (status === 'queue') return 'Queued For Sending';
        if (status === 'stopped') return 'Stopped';
    };
    $scope.amContactSearch = '';
    $scope.contacts = {
        amContactSearch: null
    };

    $scope.searchAmContacts = function(item) {
        if (!$scope.contacts.amContactSearch ||
            (item.firstname && item.firstname.toLowerCase().indexOf($scope.contacts.amContactSearch
                .toLowerCase()) != -1) ||
            (item.lastname && item.lastname.toLowerCase().indexOf($scope.contacts.amContactSearch
                .toLowerCase()) != -1) ||
            (item.email_address && item.email_address.toLowerCase().indexOf($scope.contacts
                .amContactSearch.toLowerCase()) != -1) ||
            (item.contact_phone1 && item.contact_phone1.toLowerCase().indexOf($scope.contacts
                .amContactSearch.toLowerCase()) != -1)) return true;
        return false;
    };



    $scope.landing = {
        amCampaignSearch: null
    };

    $scope.searchCampaigns = function(item) {
        if (!$scope.landing.amCampaignSearch ||
            (item.robocall_name && item.robocall_name.toLowerCase().indexOf($scope.landing
                .amCampaignSearch.toLowerCase()) != -1) ||
            (item.status && item.status.toLowerCase().indexOf($scope.landing.amCampaignSearch
                .toLowerCase()) != -1)) return true;
        if (item.schedules && item.schedules.length > 0) {
            var found = false;
            angular.forEach(item.schedules, function(schedule) {
                if (schedule.title && schedule.title.toLowerCase().indexOf(
                        $scope.landing.amCampaignSearch.toLowerCase()) != -1)
                    found = true;
            });
            if (found) return true;
        }
        return false;
    };
    $scope.filterDeliveries = function(item) {
        if ($scope.filterBy && $scope.filterByValue) {
            if (item[$scope.filterBy] === $scope.filterByValue) return true
        } else {
            return true;
        }
        return false;
    };
    $scope.sortBy = function(predicate) {
        $scope.predicate = predicate;
        $scope.reverse = !$scope.reverse;
    };

    $scope.contactSortBy = function(predicate) {
        $scope.contacts.predicate = predicate;
        $scope.contacts.reverse = !$scope.contacts.reverse;
    };
    $scope.btnMnuAct = 'Total Contacts';
    $scope.buttonSelected = function(mnuID) {
        $scope.btnMnuAct = mnuID;
        switch (mnuID) {
            case 'Total Contacts':
                $scope.filterBy = null;
                $scope.filterByValue = null;
                break;
            case 'Bounced':
                $scope.filterBy = 'status';
                $scope.filterByValue = 'bounce';
                break;
            case 'Dropped':
                $scope.filterBy = 'status';
                $scope.filterByValue = 'dropped';
                break;
            case 'Deferred':
                $scope.filterBy = 'status';
                $scope.filterByValue = 'deferred';
                break;
            case 'Opened':
                $scope.filterBy = 'reply';
                $scope.filterByValue = 'open';
                break;
            case 'Clicked':
                $scope.filterBy = 'reply';
                $scope.filterByValue = 'click';
                break;
            case 'Unsubscribed':
                $scope.filterBy = 'reply';
                $scope.filterByValue = 'unsubscribe';
                break;
            case 'Spam Report':
                $scope.filterBy = 'reply';
                $scope.filterByValue = 'spamreport';
                break;
            case 'Reply':
                $scope.filterBy = 'reply';
                $scope.filterByValue = 'reply';
                break;
            case 'Invalid Number':
                $scope.filterBy = 'status';
                $scope.filterByValue = 'invalid';
                break;
            case 'Failed':
                $scope.filterBy = 'status';
                $scope.filterByValue = 'failed';
                break;
            default:
        }
    };

    function loadAudioLibrary() {
        return dataFactory.getAudioLibrary('automated')
            .then(function(response) {
                if (response.data.success) {
                    if (__env.enableDebug) console.log("AUDIO LIBRARY");
                    if (__env.enableDebug) console.log(response.data.success.data);
                    $scope.audioLibrary = response.data.success.data;
                } else {
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
                return;
            });
    }
    // loadAudioLibrary();
    $scope.uploadAudioFile = function(file, uuid, title) {
        $scope.uploadingLibrary = true;
        var fd = new FormData();
        fd.append("robocall_schedule_uuid", uuid);
        fd.append("recording", file);
        if (title) fd.append("title", title);
        dataFactory.postUploadRecording(fd)
            .then(function(response) {
                if (__env.enableDebug) console.log(response.data);
                $scope.uploadingLibrary = false;
                if (response.data.success) {
                    $rootScope.showSuccessAlert(response.data.success.message);
                    var index = $filter('getByUUID')($rootScope.broadcast.schedules,
                        uuid, 'robocall_schedule');
                    if (index !== null) {
                        $rootScope.broadcast.schedules[index].recording_file =
                            response.data.success.data.filepath;
                        $rootScope.broadcast.schedules[index].library = response.data
                            .success.data;
                    }
                    if ($scope.audioLibrary) $scope.audioLibrary.push(response.data
                        .success.data);
                    $scope.opcBroadcast = null;
                    $scope.showPlayer = true;
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                    if (__env.enableDebug) console.log(response.data.error.message);
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };

    $scope.cancelAddAudio = function() {
        $scope.opcBroadcast = null;
    };

    $rootScope.saveToServer = function(index, title) {
        $scope.uploadingLibrary = true;
        if (__env.enableDebug) console.log($rootScope.myIndex);
        if (__env.enableDebug) console.log(index);
        if (__env.enableDebug) console.log($rootScope.broadcast.schedules[index]);
        if (__env.enableDebug) console.log(title);
        var file_title = (title ? title : null);
        var fd = new FormData();
        fd.append('robocall_schedule_uuid', $rootScope.broadcast.schedules[index].robocall_schedule_uuid);
        fd.append("recording", $rootScope.getaudioModel);
        fd.append('title', file_title);
        if (__env.enableDebug) console.log(fd);
        dataFactory.postUploadRecording(fd)
            .then(function(response) {
                $scope.uploadingLibrary = false;
                if (response.data.success) {
                    $rootScope.showSuccessAlert(response.data.success.message);
                    $rootScope.broadcast.schedules[index].recording_file = response
                        .data.success.data.filepath;
                    $rootScope.broadcast.schedules[index].library = response.data.success
                        .data;
                    $rootScope.broadcast.schedules[index].audio_library_uuid =
                        response.data.success.data.audio_library_uuid;
                    if (!$scope.audioLibrary) $scope.audioLibrary = [];
                    $scope.audioLibrary.push(response.data.success.data);
                    $scope.opcBroadcast = null;
                    $scope.showPlayer = true;
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            }, function(error) {
                $rootScope.alerts.push({
                    type: 'danger',
                    msg: 'Failure: ' + JSON.stringify(error)
                });
            });
    };

    $scope.saveRecording = function(recording, index) {
        $scope.uploadingLibrary = true;
        var title = recording.name;
        if (__env.enableDebug) console.log(title);
        var file_title = (title ? title : null);
        var fd = new FormData();
        fd.append('robocall_schedule_uuid', $rootScope.broadcast.schedules[index].robocall_schedule_uuid);
        fd.append("recording", $rootScope.getaudioModel);
        fd.append('title', file_title);
        if (__env.enableDebug) console.log(fd);
        dataFactory.postUploadRecording(fd)
            .then(function(response) {
                $scope.uploadingLibrary = false;
                if (response.data.success) {
                    $rootScope.showSuccessAlert(response.data.success.message);
                    $rootScope.broadcast.schedules[index].recording_file = response
                        .data.success.data.filepath;
                    $rootScope.broadcast.schedules[index].library = response.data.success
                        .data;
                    $rootScope.broadcast.schedules[index].audio_library_uuid =
                        response.data.success.data.audio_library_uuid;
                    if (!$scope.audioLibrary) $scope.audioLibrary = [];
                    $scope.audioLibrary.push(response.data.success.data);
                    $scope.opcBroadcast = null;
                    $scope.showPlayer = true;
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            }, function(error) {
                $rootScope.alerts.push({
                    type: 'danger',
                    msg: 'Failure: ' + JSON.stringify(error)
                });
            });
    };

    $scope.selectAudioLibraryFile = function(file, robocall_schedule_uuid) {
        var index = $filter('getByUUID')($rootScope.broadcast.schedules,
            robocall_schedule_uuid, 'robocall_schedule');
        if (index !== null) {
            $rootScope.broadcast.schedules[index].recording_file = file.filepath;
            $rootScope.broadcast.schedules[index].library = file;
        }
        $scope.showPlayer = true;
        var data = {
            robocall_schedule_uuid: robocall_schedule_uuid,
            recording_file: file.filepath,
            audio_library_uuid: file.audio_library_uuid
        };
        saveScheduleEntry(data, index, true);
        var index = $filter('getByUUID')($scope.audioLibrary, file.audio_library_uuid,
            'audio_library');
        if (index !== null) $scope.audioLibrary[index].used = 'true';
        //$rootScope.showSuccessAlert('Schedule recording has been successfully updated.');
        $scope.opcBroadcast = null;
        $scope.showPlayer = true;
    };

    $scope.recordingBeingEdited = function(recording) {
        return $scope.editingRecording && ($scope.editingRecording.audio_library_uuid ===
            recording.audio_library_uuid);
    };

    $scope.setEditRecording = function(recording) {
        if (__env.enableDebug) console.log(recording);
        $scope.editingRecording = angular.copy(recording);
    };

    $scope.cancelEditRecording = function() {
        var index = $filter('getByUUID')($scope.audioLibrary, $scope.editingRecording.audio_library_uuid,
            'audio_library');
        if (index !== null) $scope.audioLibrary[index] = angular.copy($scope.editingRecording);
        $scope.editingRecording = null;
    };

    // $scope.isDomainAdmin = function() {
    //     return userService.isAdminGroupOrGreater();
    // };

    $scope.saveEditRecording = function(recording) {
        dataFactory.postUpdateAmRecordingTitle(recording)
            .then(function(response) {
                if (__env.enableDebug) console.log(response.data);
                if (response.data.success) {
                    var index = $filter('getByUUID')($scope.audioLibrary, recording
                        .audio_library_uuid, 'audio_library');
                    if (index !== null) $scope.audioLibrary[index] = recording;
                    $scope.editingRecording = null;
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }
            });
    };

    $scope.deleteRecording = function(recording) {
        var deleteConfirm = $mdDialog.confirm()
            .title('Are you sure you want to Delete the Recording?')
            .ariaLabel('Delete')
            .ok('Yes')
            .cancel('Never Mind');

        $mdDialog.show(deleteConfirm).then(function() {
            dataFactory.deleteAmRecording(recording.audio_library_uuid)
                .then(function(response) {
                    if (__env.enableDebug) console.log(response);
                    if (response.data.success) {
                        var index = $filter('getByUUID')($scope.audioLibrary,
                            recording.audio_library_uuid,
                            'audio_library');
                        if (index !== null) $scope.audioLibrary.splice(
                            index, 1);
                        //$rootScope.newIvr.ivr_menu_greet_long = response.data.success.data;
                    } else {
                        $rootScope.showErrorAlert(response.data.error.message);
                    }
                });
        });
    };

    $scope.checkForChars = function(date) {
        if (__env.enableDebug) console.log(date);
        if (!date) $rootScope.showErrorAlert(
            'It seems you have entered an invalid character. Time fields but be numbes only'
        );
    };

    $scope.showHtml = function(html) {
        return $sce.trustAsHtml(html);
    };
    //Toggle Switch Default Settings
    $scope.onText = 'Yes';
    $scope.offText = 'No';
    $scope.isActive = true;
    $scope.size = 'normal';
    $scope.animate = true;
    $scope.radioOff = true;
    $scope.handleWidth = "auto";
    $scope.labelWidth = "auto";

    $scope.dateFormat = 'yyyy-MM-dd';
    $scope.fromDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 0,
        minDate: new Date(2016, 1, 1),
        maxDate: today
    };
    $scope.toDateOptions = {
        formatYear: 'yy',
        showWeeks: false,
        startingDay: 0,
        minDate: $scope.fromDate,
        maxDate: today
    };
    $scope.fromDatePopup = {
        opened: false
    };
    $scope.toDatePopup = {
        opened: false
    };
    $scope.ChangeToMinDate = function(fromDate) {
        if (fromDate != null) {
            if (!$scope.toDate) {
                var ToMinDate = new Date(fromDate);
                $scope.toDateOptions.minDate = ToMinDate;
                $scope.toDate = ToMinDate;
            }

            $scope.getCampaigns();

        }
    };
    $scope.processToDate = function(toDate) {
        if (toDate != null) {
            if (!$scope.fromDate) $scope.fromDate = new Date(toDate);
            $scope.toDate = new Date(toDate);
        }
        $scope.getCampaigns();
    };
    $scope.ChangeToMinDate();
    $scope.OpenfromDate = function() {
        //$scope.dateSearched = false;
        $scope.fromDatePopup.opened = !$scope.fromDatePopup.opened;
    };
    $scope.OpentoDate = function() {
        //$scope.dateSearched = false;
        $scope.toDatePopup.opened = !$scope.toDatePopup.opened;
    };

    function newContactsUnique(newContacts) {
        var errors = [];
        var emailSeen = {};
        var phoneSeen = {};

        function makeError(field, duplicate) {
            if (field === "email_address") {
                return "Duplicate Email Address for " + duplicate.firstname + " " +
                    duplicate.lastname + "<br />";
            } else {
                return "Duplicate Phone Number for " + duplicate.firstname + " " +
                    duplicate.lastname + "<br />";
            };
        }

        function markField(seen, value) {
            if (!value) {
                return true;
            }
            return !seen[value] ? seen[value] = true : false;
        };
        newContacts.forEach(function(contact) {
            var emailResult = markField(emailSeen, contact["email_address"]);
            var phone1Result = markField(phoneSeen, contact["contact_phone1"]);
            var phone2Result = markField(phoneSeen, contact["contact_phone2"]);
            if (!emailResult) {
                errors.push(makeError("email_address", contact));
            }
            if (!phone1Result) {
                errors.push(makeError("contact_phone1", contact));
            }
            if (!phone2Result) {
                errors.push(makeError("contact_phone2", contact));
            }
        });
        console.log(emailSeen);
        console.log(phoneSeen);
        return errors;
    };

    function newContactsUniqueOfRecipientList(newContacts, recipientList) {
        var errors = [];
        var fields = ["contact_phone1", "contact_phone2", "email_address"];

        function hashContactByField(field) {
            return function(contact) {
                if (contact.firstname && contact.lastname && contact[field]) {
                    return {
                        hash: _.lowerCase(contact.firstname) + _.lowerCase(contact.lastname) +
                            _.lowerCase(contact[field]),
                        contact: contact
                    };
                }
                return null;
            };
        }

        function makeError(field) {
            return function(contactHash) {
                var duplicate = contactHash.contact;
                if (field === "email_address") {
                    return "Duplicate Email Address for " + duplicate.firstname + " " +
                        duplicate.lastname + "<br />";
                } else {
                    return "Duplicate Phone Number for " + duplicate.firstname + " " +
                        duplicate.lastname + "<br />";
                };
            };
        };
        fields.forEach(function(field) {
            var newContactHashes = newContacts.map(hashContactByField(field)).filter(
                Boolean);
            var recipientListHashes = recipientList.map(hashContactByField(field)).filter(
                Boolean);
            var intersection = _.intersectionBy(newContactHashes,
                recipientListHashes, 'hash');
            errors = errors.concat(intersection.map(makeError(field)));
        });
        return errors;
    };


    String.prototype.replaceAll = function(target, replacement) {
        return this.split(target).join(replacement);
    };
});


proySymphony.config(function($provide) {
    $provide.decorator('taOptions', ['taRegisterTool', '$delegate', '$rootScope', function(
        taRegisterTool, taOptions, $rootScope) {
        // $delegate is the taOptions we are decorating
        // register the tool with textAngular

        taRegisterTool('backgroundColor', {
            display: "<div spectrum-colorpicker ng-model='color' on-change='!!color && action(color)' format='\"hex\"' options='options'></div>",
            action: function(color) {
                var me = this;
                if (!this.$editor().wrapSelection) {
                    setTimeout(function() {
                        me.action(color);
                    }, 100)
                } else {
                    return this.$editor().wrapSelection('backColor',
                        color);
                }
            },
            options: {
                replacerClassName: 'fa fa-paint-brush',
                showButtons: false
            },
            color: "#fff"
        });
        taRegisterTool('fontColor', {
            display: "<spectrum-colorpicker trigger-id='{{trigger}}' ng-model='color' on-change='!!color && action(color)' format='\"hex\"' options='options'></spectrum-colorpicker>",
            action: function(color) {
                var me = this;
                if (!this.$editor().wrapSelection) {
                    setTimeout(function() {
                        me.action(color);
                    }, 100)
                } else {
                    return this.$editor().wrapSelection('foreColor',
                        color);
                }
            },
            options: {
                replacerClassName: 'fa fa-font',
                showButtons: false
            },
            color: "#000"
        });


        taRegisterTool('fontName', {
            display: "<span class='bar-btn-dropdown dropdown'>" +
                "<button class='btn btn-blue dropdown-toggle' type='button' ng-disabled='showHtml()' style='padding-top: 4px'><i class='fa fa-font'></i><i class='fa fa-caret-down'></i></button>" +
                "<ul class='dropdown-menu'><li ng-repeat='o in options' ng-click='action($event, o.css)' class='editor-option' style='font-family: {{o.css}};'><i ng-if='o.active' class='fa fa-check'></i>{{o.name}}</li></ul></span>",
            action: function(event, font) {
                if (__env.enableDebug) console.log(font);
                //Ask if event is really an event.
                if (!!event.stopPropagation) {
                    //With this, you stop the event of textAngular.
                    event.stopPropagation();
                    //Then click in the body to close the dropdown.
                    $("body").trigger("click");
                }
                return this.$editor().wrapSelection('fontName',
                    font);
            },
            options: [{
                    name: 'Sans-Serif',
                    css: 'Arial, Helvetica, sans-serif'
                },
                {
                    name: 'Serif',
                    css: "'times new roman', serif"
                },
                {
                    name: 'Wide',
                    css: "'arial black', sans-serif"
                },
                {
                    name: 'Narrow',
                    css: "'arial narrow', sans-serif"
                },
                {
                    name: 'Comic Sans MS',
                    css: "'comic sans ms', sans-serif"
                },
                {
                    name: 'Courier New',
                    css: "'courier new', monospace"
                },
                {
                    name: 'Garamond',
                    css: 'garamond, serif'
                },
                {
                    name: 'Georgia',
                    css: 'georgia, serif'
                },
                {
                    name: 'Tahoma',
                    css: 'tahoma, sans-serif'
                },
                {
                    name: 'Trebuchet MS',
                    css: "'trebuchet ms', sans-serif"
                },
                {
                    name: "Helvetica",
                    css: "'Helvetica Neue', Helvetica, Arial, sans-serif"
                },
                {
                    name: 'Verdana',
                    css: 'verdana, sans-serif'
                },
                {
                    name: 'Proxima Nova',
                    css: 'proxima_nova_rgregular'
                }
            ]
        });


        taRegisterTool('fontSize', {
            display: "<span class='bar-btn-dropdown dropdown'>" +
                "<button class='btn btn-blue dropdown-toggle' type='button' ng-disabled='showHtml()' style='padding-top: 4px'><i class='fa fa-text-height'></i><i class='fa fa-caret-down'></i></button>" +
                "<ul class='dropdown-menu'>" +
                "<li ng-repeat='o in options' ng-click='action($event, o.value)' class='editor-option' style='font-size: {{o.css}};'><i ng-if='o.active' class='fa fa-check'></i> {{o.name}}</li></ul>" +
                "</span>",
            action: function(event, size) {
                //Ask if event is really an event.
                if (!!event.stopPropagation) {
                    //With this, you stop the event of textAngular.
                    event.stopPropagation();
                    //Then click in the body to close the dropdown.
                    $("body").trigger("click");
                }
                return this.$editor().wrapSelection('fontSize',
                    parseInt(size));
            },
            options: [{
                    name: 'xx-small',
                    css: 'xx-small',
                    value: 1
                },
                {
                    name: 'x-small',
                    css: 'x-small',
                    value: 2
                },
                {
                    name: 'small',
                    css: 'small',
                    value: 3
                },
                {
                    name: 'medium',
                    css: 'medium',
                    value: 4
                },
                {
                    name: 'large',
                    css: 'large',
                    value: 5
                },
                {
                    name: 'x-large',
                    css: 'x-large',
                    value: 6
                },
                {
                    name: 'xx-large',
                    css: 'xx-large',
                    value: 7
                }
            ]
        });




        // add the button to the default toolbar definition
        taOptions.toolbar[4] = [];
        //taOptions.toolbar[4].push('backgroundColor','fontColor','fontName','fontSize');
        taOptions.toolbar[4].push('fontColor', 'fontName', 'fontSize');
        return taOptions;
    }]);
});

proySymphony.config(function($provide) {

    $provide.decorator('taOptions', ['taRegisterTool', '$delegate', '$rootScope', function(
        taRegisterTool, taOptions, $rootScope) {

        $rootScope.$watchCollection('customFields', function(newVal, oldVal) {
            if (newVal !== oldVal) {
                taRegisterTool('quickFields', {
                    display: "<span class='bar-btn-dropdown dropdown'>" +
                        "<button class='btn btn-blue dropdown-toggle' type='button' ng-disabled='showHtml()' style='padding-top: 4px'>shortcodes<i class='fa fa-caret-down'></i></button>" +
                        "<ul class='dropdown-menu'><li ng-repeat='o in options' ng-click='action($event, o.key)' class='editor-option'><i ng-if='o.active' class='fa fa-check'></i> {{o.value}}</li></ul>" +
                        "</span>",
                    tooltiptext: $rootScope.tips.automated.insertshortcodeemail,
                    action: function(event, field) {
                        //Ask if event is really an event.
                        if (!!event.stopPropagation) {
                            //With this, you stop the event of textAngular.
                            event.stopPropagation();
                            //Then click in the body to close the dropdown.
                            $("body").trigger("click");
                        }

                        var embed = '{{' + field + '}}';
                        if (__env.enableDebug) console.log(
                            embed);
                        return this.$editor().wrapSelection(
                            'insertHTML', embed, true);
                    },
                    options: $rootScope.customFields

                });
                taOptions.toolbar[4].push('quickFields');
            }
        });

        return taOptions;
    }]);
});
