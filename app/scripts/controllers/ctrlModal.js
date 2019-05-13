'use strict';
proySymphony.controller('ModalInstanceCtrl', function($rootScope, $uibModalInstance, items) {
        //**********   Change it so you can control the values in 3 Way Calls **********//
        $rootScope.vm = this;
        $rootScope.vm.content = items;
        console.log($rootScope.vm.content);
        $rootScope.vm.confirm = $uibModalInstance.close;
        $rootScope.vm.cancel = $uibModalInstance.dismiss;
    })
    .controller('ModalCtrl', function(
        $scope, $rootScope, $window, $uibModalStack, emulationService, usefulTools, integrationService,
        contactService, dataFactory, $auth, $myModal, $location, __env, symphonyConfig, greenboxService, Idle, $uibModal,
        fileService) {

        $scope.activityList = greenboxService.ams360ActivityList;
        $rootScope.modalTableHeight = $window.innerHeight - 300;
        try {
            if (!$rootScope.nonContacts) $rootScope.nonContacts = JSON.parse($window.localStorage
                .getItem("nonContacts"));
        } catch (err) {
            console.log(err);
        }

        $scope.userContacts = function() {
            return contactService.getUserContactsOnly();
        };

        $rootScope.ringModal = function(template) {
            $myModal.openTemplate('views' + template, '', 'lg');
        };

        $rootScope.showModal = function(template, data) {
            $myModal.openTemplate('views' + template, data, '');
        };

        $rootScope.showModalWithData = function(template, data) {
            $myModal.openTemplate('views' + template, data, '');
        };

        $rootScope.showModalFull = function(template, data, size) {
            $myModal.openTemplate('views' + template, data, size);
        };

        $rootScope.showEditorModal = function(template, data, size, css, backdrop, keyboard) {
            $myModal.openTemplate('views' + template, data, size, css, backdrop, keyboard);
        };

        $rootScope.number = 6;

        $rootScope.closeThisModal = function() {
            var top = $uibModalStack.getTop();
            if (top) {
                $uibModalStack.dismiss(top.key);
            }
        };
        $rootScope.closeEditorModal = function() {
            $rootScope.showModal('/autodialing/confirmcloseeditor.html');
        };
        $rootScope.closeModal = function() {
            $uibModalStack.dismissAll();
        };
        $rootScope.closeMemberAdded = function() {
            $rootScope.memberAddedMessage = null;
        };

        $rootScope.copyToAms360 = function(data) {
            $scope.activityList = greenboxService.ams360ActivityList;
            $scope.selectedActivity = '';
            $scope.activityDescription = '';
            var activityData = {
                activityList: $scope.activityList,
                // exportDataToAms360: $rootScope.exportDataToAms360,
                selectedActivity: $scope.selectedActivity,
                activityDescription: $scope.activityDescription,
                title: 'Activity Action',
                data: data
            }
            var customerList = integrationService.getCustomerListFromContacts(data["number"]);
            if (customerList.length>0) {
                activityData.customerList = customerList;
                activityData.customer_id = customerList[0].settings.customer_id;
                activityData.customer = customerList[0];
                $rootScope.showModalFull('/modals/ams360ActivityModal.html', activityData, '');
            } else {
                integrationService.getCustomerListFromApi(data["number"])
                .then(function(response){
                    customerList = response;
                    activityData.customerList = customerList;
                    if (customerList.length>0) {
                        activityData.customer_id = customerList[0].settings.customer_id;
                        activityData.customer = customerList[0];
                    } else {
                        var integrationUrl = integrationService.getIntegrationUrl(data.number, null);
                        activityData.integrationUrl = integrationUrl;
                    }
                    $rootScope.showModalFull('/modals/ams360ActivityModal.html', activityData, '');
                });
            }
            
        };

        function loadams360ActivityList() {
            greenboxService.getAms360ActivityList($rootScope.user.domain_uuid)
                .then(function(response) {
                    $scope.activityList = response;
                });
        }
        if ($scope.activityList.length == undefined && $rootScope.user.exportType.partner_code ==
            'ams360') {
            loadams360ActivityList();
        }

        $scope.chooseCustomer = function(customer, taskData) {
            var data = taskData.data;
            data['entity_id'] = customer.EntityID;
            $rootScope.exportToQQCatalyst(data);
        };

        $rootScope.copyToQQCatalyst = function(data) {
            $scope.taskDescription = '';
            var taskData = {
                // exportToQQCatalyst: $rootScope.exportToQQCatalyst,
                taskDescription: $scope.taskDescription,
                title: 'Task Description',
                data: data
            }
            var customerList = integrationService.getCustomerListFromContacts(data["number"]);
            if (customerList.length>0) {
                taskData.customerList = customerList;
                taskData.customer_id = customerList[0].settings.customer_id;
                taskData.customer = customerList[0];
                $rootScope.showModalFull('/modals/qqTaskModal.html', taskData, '');
            } else {
                integrationService.getCustomerListFromApi(data["number"])
                .then(function(response){
                    customerList = response;
                    taskData.customerList = customerList;
                    if (customerList.length>0) {
                        taskData.customer_id = customerList[0].settings.customer_id;
                        taskData.customer = customerList[0];
                    } else {
                        var integrationUrl = integrationService.getIntegrationUrl(data.number, null);
                        taskData.integrationUrl = integrationUrl;
                    }
                    $rootScope.showModalFull('/modals/qqTaskModal.html', taskData, '');
                });
            }
        };

        // Multiple audio recordings 
        $rootScope.showMultipleAudioModal = function(record, type) {
            var url = '';
            if (__env.enableDebug) console.log(record);
            if (__env.enableDebug) console.log(type);
            var baseUrl = __env.apiUrl ? __env.apiUrl : symphonyConfig.audioUrl;
            var user_uuid = emulationService.emulatedUser ? emulationService.emulatedUser :
                $rootScope.user.id;
            var downloadUrl = baseUrl + '/call/recordings/downloadmultiple/' + record.extension_uuid +
                '/' + record.call_uuid + '?token=' + $rootScope.userToken;
            console.log(downloadUrl);
            var data = {
                type: type,
                baseUrl: baseUrl,
                downloadUrl: downloadUrl,
                description: "Temp",
                date: new Date(),
                title: "Playing Audio File",
                call_uuid: record.call_uuid
            };
            dataFactory.getRetrieveRecordingslListMultiple(record.extension_uuid, record.call_uuid)
                .then(function(response) {
                    console.log(response.data);
                    if (response.data.success.data) {
                        if (type === 'history-recording') {
                            data.uuid = record.uuid;
                            data.date = record.start_stamp;
                            data.description = 'Call Recording ' + (record.contact_name ?
                                'With ' + record.contact_name : '');
                            data.title = "Play Recording";
                        } else if (type === 'history-recording-manual') {
                            data.uuid = record.uuid;
                            data.date = record.start_stamp;
                            data.description = 'Call Recording ' + (record.contact_name ?
                                'With ' + record.contact_name : '');
                            data.title = "Play Recording";
                        } else if (type === 'call-recording') {
                            data.date = record.start_stamp;
                            data.title = "Play Auto Recording";
                            data.description = "Call Recording";
                        } else if (type === 'call-recording-manual') {
                            data.date = record.start_stamp;
                            data.title = "Play Recording";
                            data.description = "Call Recording";
                        }
                        var files = response.data.success.data;
                        var ur;
                        var urls = [];
                        for (var i = 0; i < files.length; i++) {
                            ur = baseUrl + files[i];
                            urls.push(ur);
                        }
                        data.urls = urls;
                        console.log(data);
                        $rootScope.showModalWithData('/modals/multipleplayaudio.html',
                            data);
                    }
                });
        };

        $rootScope.showAudioModal = function(record, type, contact) {
            var url = '';
            if (__env.enableDebug) console.log(record);
            if (__env.enableDebug) console.log(type);
            var user_uuid = emulationService.emulatedUser ? emulationService.emulatedUser :
                $rootScope.user.id;
            var data = {
                type: type,
                url: url,
                description: "Temp",
                date: new Date(),
                download: fileService.fetchAndDownloadFileByExternalUrl,
                title: "Playing Audio File"
            };
            var baseUrl = __env.apiUrl ? __env.apiUrl : symphonyConfig.audioUrl;
            var gcs = false;
            if (type === 'voicemail') {
                url = baseUrl + '/imported/freeswitch/storage/voicemail/default/' + record.vm_file;
                data.uuid = record.visual_voicemail_uuid;
                data.date = record.left_at;
                data.url = url;
                data.description = 'Voicemail From ' + (contact ? contact.name :
                    (record.noncontact ? record.noncontact.name : record.caller_id_number)
                );
                data.title = "Play Voicemail";
            } else if (type === 'history-voicemail') {
                url = baseUrl + record.voicemail_filepath;
                data.date = record.start_stamp;
                data.url = url;
                data.description = 'Voicemail From ' + (contact ? contact.name :
                    (record.noncontact ? record.noncontact.name : record.contact_number)
                );
                data.title = "Play Voicemail";
            } else if (type === 'ivr-greeting') {
                url = baseUrl + '/imported/freeswitch/recordings/' + $rootScope.user.domain
                    .domain_name + '/' + record;
                data.date = record.start_stamp;
                data.url = url;
                data.description = 'Auto Attendant Greeting';
                data.title = "Play Greeting";
            } else if (type === 'voicemail-greeting1') {
                url = baseUrl + '/imported/freeswitch/storage/voicemail/default/' +
                    $rootScope.user.domain.domain_name + '/' + record.voicemail_id + '/' +
                    record.greeting_filename;
                data.date = '';
                data.url = url;
                data.description = 'Voicemail Greeting' + (record.greeting_name ? ': ' +
                    record.greeting_name : '');
                data.title = "Play Greeting";
            } else if (type === 'robocall-recording') {
                url = baseUrl + record;
                data.date = record.start_stamp;
                data.url = url;
                data.description = 'Robocall Recording';
                data.title = "Play Recording";
            } else if (type === 'history-recording' || type === 'call-recording') {
                gcs = true;
                data.url = baseUrl + record.recording_filepath;
                data.date = record.start_stamp;
                data.description = 'Call Recording ' + (contact ? 'With ' + contact.name :
                    '');
                data.title = "Play Recording";
                var baseUrl = __env.apiUrl ? __env.apiUrl : symphonyConfig.onescreenUrl;
                data.downloadUrl = baseUrl + '/call/recordings/downloadauto/' + record.extension_uuid +
                    '/' + record.call_history_fs_uuid + '?token=' + $rootScope.userToken;

                dataFactory.getAutoCallRecordingLink(record.call_history_fs_uuid)
                    .then(function(response) {
                        console.log(response);
                        if (response.data.success) {
                            data.url = response.data.success.data;
                            $rootScope.showModalWithData('/modals/playaudio.html', data);
                        } else {
                            data.url = null;
                            console.log(response.data.error.message);
                            $rootScope.showErrorAlert(
                                'Sorry we were unable to locate this recording.');
                        }
                    });
            } else if (type === 'voicemail-greeting') {
                url = baseUrl + '/imported/freeswitch/storage/voicemail/default/' +
                    $rootScope.user.domain.domain_name + '/' + $rootScope.user.user_ext +
                    '/' + record.greeting_filename;
                data.url = url;
                data.title = "Play Voicemail Greeting";
                data.description = '';
            } else if (type === 'custom') {
                data.url = record;
            } else {
                url = baseUrl + record;
                data.url = url;
                data.title = "Play Recording";
                data.description = "Call Recording";
            };
            console.log(data);
            if (!gcs) $rootScope.showModalWithData('/modals/playaudio.html', data);
        };
        /************ FUNCTIONS NEEDED SITE WIDE **************** */

        $rootScope.makeVideoCall = function(contact) {
            if (contact.em !== null) {
                //auto send notice
                $rootScope.contactsUsr = [];
                $rootScope.contactsUsr.push(contact);
                var response = $rootScope.sendVideoCallInvites('icon');

            } else {
                // fire modal
            }
        };

        $rootScope.toTimestamp = function(strDate) {
            var datum = Date.parse(strDate);
            return datum;
        };

        $rootScope.sortby = function(predicate) {
            if (__env.enableDebug) console.log("SORTING");
            if (__env.enableDebug) console.log(predicate);
            $rootScope.predicateSort = predicate;
            $rootScope.reverseSort = !$rootScope.reverseSort;
        };

        $rootScope.thumbDimensions = function(fileUrl, location) {
            var img = new Image();
            img.src = fileUrl;
            if (img.width <= img.height) {
                if (location === 'thumb') {
                    var height = (120 * img.height / img.width).toFixed(0);
                    return 'width: 120px; height: ' + height + 'px;';
                } else if (location === 'preview') {
                    return 'max-height: 420px;';
                }
            } else {
                if (location === 'thumb') {
                    var width = (100 * img.width / img.height).toFixed(0);
                    return 'height: 100px; width: ' + width + 'px;';
                } else if (location === 'preview') {
                    return 'width: 100%; max-width: ' + img.width + 'px;';
                }
            }
        };

        function localStoragetoSessionStorage() {
            if (!$rootScope.refresh && !__env.disableAutoLogout) {
                angular.forEach($window.localStorage, function(item, key) {
                    $window.sessionStorage.setItem(key, item);
                });
                $window.localStorage.clear();
            }
        }

        var unloadEvent = function(e) {
            console.log("UNLOAD");
            var refreshkey = $window.sessionStorage.getItem("refresh.key");
            console.log(refreshkey);
            if (!refreshkey) {
                console.log("CREATE NEW");
                refreshkey = usefulTools.randomString(50);
                $window.sessionStorage.setItem("refresh.key", refreshkey);
                console.log(refreshkey);
            }
            $window.sessionStorage.setItem("refresh.status", 'true');
            console.log(sessionStorage);
            var data = {
                refreshkey: refreshkey,
                milliseconds: (new Date).getTime(),
                // mmToken: $cookies.get('mmToken'),
                vertoToken: $rootScope.vertoToken
            }
            dataFactory.postCheckForRefresh(data)
                .then(function(response) {
                    console.log(response);

                }, function(error) {
                    console.log(error);
                });
            $rootScope.$digest();
            localStoragetoSessionStorage();
            //$window.localStorage.setItem('satellizer_token', $rootScope.userToken);

        };

        /*  window.onunload = function(e) {
              console.log("UNLOADING");
              unloadEvent();
              var dialogText = 'Dialog text here';
              e.returnValue = dialogText;
              //return null;
          };
          */
        //window.addEventListener("unload", unloadEvent2);
        //window.addEventListener("onbeforeunload", unloadEvent2);

        $rootScope.refresh = false;
        if (!__env.disableAutoLogout) {
            $(window).keydown(function(e) {
                var char = '';
                if ((e.keyCode >= 65 && e.keyCode <= 90) || e.keyCode == 116) {
                    char = (e.metaKey ? '⌘-' : '') + (e.ctrlKey ? 'Ctrl-' : '') + (e.shiftKey ?
                        'Shift-' : '') + String.fromCharCode(e.keyCode).toLowerCase();
                    $rootScope.show = char;
                }
                if (e.keyCode == 116) { //F5
                    $rootScope.refresh = true;
                } else if (e.keyCode == 116 && e.ctrlKey) { // Ctrl + F5
                    $rootScope.refresh = true;
                } else if (e.keyCode == 82 && e.ctrlKey) { // Ctrl + r
                    $rootScope.refresh = true;
                } else if (e.keyCode == 82 && e.ctrlKey && e.shiftKey) { // Ctrl + Shift + r
                    $rootScope.refresh = true;
                } else if (e.keyCode == 82 && e.metaKey && e.shiftKey) { // Cmd + Shift + r
                    $rootScope.refresh = true;
                } else if (e.keyCode == 82 && e.metaKey) { // Cmd + r
                    $rootScope.refresh = true;
                }
                //if ($rootScope.refresh) alert("Refreshing");

            });
        }

        function closeModals() {
            if ($scope.warning) {
                $scope.warning.close();
                $scope.warning = null;
            }
            if ($scope.timedout) {
                $scope.timedout.close();
                $scope.timedout = null;
            }
        }
    
        $scope.$on('IdleStart', function() {
            closeModals();
            $scope.warning = $uibModal.open({
                templateUrl: 'warning-dialog.html',
                windowClass: 'modal-danger'
            });
        });
    
        $scope.$on('IdleEnd', function() {
            refreshApiToken();
            closeModals();
            $scope.start();
        });
    
        $scope.$on('IdleTimeout', function() {
            closeModals();
            $location.url('/login?action=logout');
            $scope.timedout = $uibModal.open({
                templateUrl: 'timedout-dialog.html',
                windowClass: 'modal-danger'
            });
        });
    
        /*$scope.$on('IdleTimeout', function() {
            closeModals();
            $rootScope.changeUserStatus('Away');
            $scope.timedout = $uibModal.open({
                templateUrl: 'timedout-dialog.html',
                windowClass: 'modal-danger'
            });
        });*/
    
        $scope.start = function() {
            closeModals();
            Idle.watch();
            $scope.started = true;
        };
    
        $scope.stop = function() {
            closeModals();
            Idle.unwatch();
            $scope.started = false;
        };
    
    
        //I believe this can be worked into the Idle config in app.js ... investigate and test.
        function refreshApiToken() {
            dataFactory.getRefreshToken()
                .then(function(response) {
                    if (__env.enableDebug) console.log(response);
                    var refreshToken = response.data.success.data;
                    $rootScope.userToken = refreshToken;
                    $window.localStorage.setItem("userToken", refreshToken);
                    if (__env.enableDebug) console.log(refreshToken);
                    $auth.setToken(refreshToken);
                    if (__env.enableDebug && $auth.isAuthenticated()) console.log("YEP");
                });
        }
    
        /* $rootScope.refreshInterval = $interval( function() {
            refreshApiToken();
        }, 20000); */

    });
