'use strict';

proySymphony.controller('EmailEditorCtrl', function($scope, $rootScope, $http, $location, $sce,
    $uibModal, focus, $log, $timeout,
    $document, $uibModalStack, FileUploader, $filter, dataFactory, usefulTools, $window,
    __env, symphonyConfig) {

    $rootScope.editorContainerHeight = $window.innerHeight - 140;




    var request = function(method, url, data, type, callback) {
        var req = new XMLHttpRequest();
        if (__env.enableDebug) console.log(type);
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status === 200) {
                var response = JSON.parse(req.responseText);
                callback(response);
            }
        };

        req.open(method, url, true);
        if (data && type) {
            if (type === 'multipart/form-data') {
                var formData = new FormData();
                for (var key in data) {
                    formData.append(key, data[key]);
                }
                data = formData;
            } else {
                req.setRequestHeader('Content-type', type);
            }
        }

        req.send(data);
    };

    var save = function(filename, content) {
        saveAs(
            new Blob([content], {
                type: 'text/plain;charset=utf-8'
            }),
            filename
        );
    };

    var specialLinks = [{
        type: 'unsubscribe',
        label: 'SpecialLink.Unsubscribe',
        link: 'http://[unsubscribe]/'
    }, {
        type: 'subscribe',
        label: 'SpecialLink.Subscribe',
        link: 'http://[subscribe]/'
    }];

    var mergeTags = [{
        name: 'tag 1',
        value: '[tag1]'
    }, {
        name: 'tag 2',
        value: '[tag2]'
    }];

    var mergeContents = [{
        name: 'content 1',
        value: '[content1]'
    }, {
        name: 'content 2',
        value: '[content1]'
    }];

    /*beeConfig: {
    uid: 'CmsUserName', // [mandatory] identifies the set of resources to load
    container: 'bee-plugin-container', // [mandatory] the id of div element that contains BEE Plugin
    autosave: 30, // [optional, default:false] in seconds, allowed min-value: 15
    language: 'en-US', // [optional, default:'en-US'] if language is not supported the default language is loaded (value must follow ISO 639-1  format)
    specialLinks: specialLinks, // [optional, default:[]] Array of Object to specify special links
    mergeTags: mergeTags, // [optional, default:[]] Array of Object to specify special merge Tags
    mergeContents: mergeContents, // [optional, default:[]] Array of Object to specify merge content
    preventClose: true, // [optional, default:false] if true an alert is shown before browser closure*/
    //onSave: function(jsonFile, htmlFile) { /* Implements function for save */ }, // [optional]
    //onSaveAsTemplate: function(jsonFile) { /* Implements function for save as template (only JSON file) */
    //}, // [optional]
    //onAutoSave: function(jsonFile) { /* Implements function for auto save */ }, // [optional]
    //onSend: function(htmlFile) { /* Implements function to send message */ }, // [optional]
    //onLoad: function(jsonFile) { /* Implements function to perform an action once the template is loaded */}, // [optional]
    //onError: function(errorMessage) { /* Implements function to handle error messages */ } // [optional]
    //}


    var beeConfig = {
        uid: 'test1-clientside',
        container: 'bee-plugin-container',
        autosave: 15,
        language: 'en-US',
        preventClose: true, // [optional, default:false] if true an alert is shown before browser closure
        specialLinks: specialLinks,
        mergeTags: mergeTags,
        mergeContents: mergeContents,
        onSave: function(jsonFile, htmlFile) {
            saveEmail(jsonFile, htmlFile);
            //save('newsletter.html', htmlFile);
        },
        onSaveAsTemplate: function(jsonFile) { // + thumbnail? 
            showSaveAsTemplate(jsonFile);
            //save('newsletter-template.json', jsonFile);
        },
        onAutoSave: function(jsonFile) { // + thumbnail? 
            if (__env.enableDebug) console.log(new Date().toISOString() +
                ' autosaving...');
            window.localStorage.setItem('newsletter.autosave', jsonFile);
        },
        onSend: function(htmlFile) {
            //write your send test function here
            sendTest(htmlFile);
        },
        onError: function(errorMessage) {
            if (__env.enableDebug) console.log('onError ', errorMessage);
        }
    };

    var showSaveAsTemplate = function(json) {
        var data = {
            json: json,
            keywords: [],
            title: 'Saved Template',
            public: 'false'
        }
        $rootScope.showModalWithData('/autodialing/savetemplate.html', data);
    }

    $rootScope.saveAsTemplate = function(data) {
        if (__env.enableDebug) console.log("SAVING AS TEMPLATE");
        var data = {
            template_json: data.json,
            keywords: data.keywords,
            title: data.title,
            public: data.public
        }
        $rootScope.saveEmailTemplate(data);
    }

    $rootScope.saveEmailTemplate = function(data) {
        dataFactory.postUpdateEmailTemplate(data)
            .then(function(response) {
                if (__env.enableDebug) console.log("RESPONSE TO SAVE TEMPLATE");
                if (__env.enableDebug) console.log(response);
                $rootScope.showalerts(response);
                if (response.data.success) {
                    if (!$rootScope.availEmailTemplates) $rootScope.availEmailTemplates = [];
                    $rootScope.availEmailTemplates.push(response.data.success.data);
                    $rootScope.closeThisModal();
                }
            }, function(error) {
                $rootScope.alerts.push({
                    type: 'danger',
                    msg: 'Failure: ' + JSON.stringify(error)
                });
            });
    };

    var saveEmail = function(json, html) {
        if (__env.enableDebug) console.log("SAVING EMAIL");
        if (__env.enableDebug) console.log($rootScope.editingScheduleUUID);
        if (__env.enableDebug) console.log($rootScope.broadcast.schedules);
        var index = $filter('getByUUID')($rootScope.broadcast.schedules, $rootScope.editingScheduleUUID,
            'robocall_schedule');
        if (__env.enableDebug) console.log(index);
        if (index !== null) {
            $rootScope.saveHtmlEmail(json, html, index);
        } else {
            $rootScope.alerts.push({
                type: 'danger',
                msg: 'Error: There was a problem saving your message.'
            });
        }
    }



    var sendTest = function(html) {
        var data = {
            html: html,
            recipients: []
        }
        $rootScope.showModalWithData('/autodialing/sendtestemail.html', data);
    }

    $rootScope.sendTestEmail = function(html, to) {
        if (__env.enableDebug) console.log(to);
        var data = {
            html: html,
            email_addresses: to,
            from: $rootScope.user.email_address,
            broadcast_uuid: null
        }
        dataFactory.postSendTestEmail(data)
            .then(function(response) {
                $rootScope.showalerts(response);

            });
    };

    var bee = null;

    var loadTemplate = function(e) {
        var templateFile = e.target.files[0];
        var reader = new FileReader();

        reader.onload = function() {
            var templateString = reader.result;
            var template = JSON.parse(templateString);
            bee.load(template);
        };

        reader.readAsText(templateFile);
    };

    document.getElementById('choose-template').addEventListener('change', loadTemplate,
        false);



    request(
        'POST',
        'https://auth.getbee.io/apiauth',
        'grant_type=password&client_id=5fed7922-309b-4a16-a8c7-2dca741debce&client_secret=odCWtfCyLn9KTN8oiM14Got9LsTx4SqEOL5ELCe9SSiF1DtXZbh',
        'application/x-www-form-urlencoded',
        function(token) {
            BeePlugin.create(token, beeConfig, function(beePluginInstance) {
                bee = beePluginInstance;
                request(
                    'GET',
                    'https://rsrc.getbee.io/api/templates/m-bee',
                    null,
                    null,
                    function(template) {
                        bee.start(template);
                    });
            });
        });

});
