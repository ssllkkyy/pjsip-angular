'use strict';

proySymphony.service('greenboxService', function($rootScope, $interval, $websocket, dataFactory) {
    var service = {
        integrationSettings: {},
        ams360ActivityList: {}
    };

    service.loginLogoutGB = function(data) {
        var connection = new WebSocket('ws://127.0.0.1:64841/bridgeconduit');
        connection.onopen = function() {
            connection.send(data);
            return false;
        };

        connection.onerror = function(error) {
            console.log('WebSocket Error ' + error);
            $rootScope.user.greenBoxEnabled = false;
            var obj = angular.fromJson(data);

            if (obj && obj.token != '') {
                $rootScope.showErrorAlert(
                    "Please make sure your Bridge Desktop is running.");
                $rootScope.$broadcast('error.from.server');
            }
            return false;
        };

        // Log messages from the server
        connection.onmessage = function(e) {
            //$rootScope.$broadcast('message.from.server', e.data);
            console.log('Server returned: ' + e.data);
        };

        return false;
    }

    service.refreshOnDemand = function(data) {
        var connection = new WebSocket('ws://127.0.0.1:64841/bridgeconduit');
        connection.onopen = function() {
            connection.send(data);
            return false;
        };

        connection.onerror = function(error) {
            console.log('WebSocket Error ' + error);

            var obj = angular.fromJson(data);

            if (obj && obj.token != '') {
                $rootScope.showErrorAlert(
                    "Please make sure your Bridge Desktop is running.");
            }
            return false;
        };

        // Log messages from the server
        connection.onmessage = function(e) {
            console.log('Server returned: ' + e.data);
        };

        return false;
    }

    service.refreshGB = function(data) {
        console.log("REFRESH GB");
        console.log(data);
        var connection = new WebSocket('ws://127.0.0.1:64841/bridgeconduit');
        connection.onopen = function() {
            connection.send(data);
            return false;
        };

        connection.onerror = function(error) {
            //TODO WE should add in notice to user .. and disable future connections...
            console.log('WebSocket Error ' + error);
            if ($rootScope.gbInterval) $interval.cancel($rootScope.gbInterval);
        };

        // Log messages from the server
        connection.onmessage = function(e) {
            //$rootScope.$broadcast('message.from.server', e.data);
            console.log('Server returned: ' + e.data);
        };

        return false;
    }

    service.saveFP = function(token) {
        var connection = new WebSocket('ws://127.0.0.1:64841/bridgeconduit');

        connection.onopen = function() {
            connection.send(token);
            return false;
        };

        connection.onerror = function(error) {
            console.log('WebSocket Error ' + error);
        };

        // Log messages from the server
        connection.onmessage = function(e) {
            console.log('Server returned: ' + e.data);

            var obj = angular.fromJson(e.data);
            if (obj.token != '') {
                if (obj.inbox_file_path.status == "DoesNotExist") {
                    $rootScope.showErrorAlert("The Inbox file path does not exist.");
                    console.log("The Inbox file path does not exist.");
                }

                if (obj.token != '' && obj.hs_file_path.status == "DoesNotExist") {
                    $rootScope.showErrorAlert("The Hawksoft path does not exist.");
                    console.log("The Hawksoft path does not exist.");
                }

                if (obj.token != '' && obj.hs_file_path.status ==
                    "CmsscreenpopNotPresent") {
                    $rootScope.showErrorAlert(
                        "There was a problem with setting the Hawksoft Path.");
                    console.log("There was a problem. CMS screenpop not Present.");
                }
            }

        };

        return false;
    }

    service.agencyIntegrationSettings = function(domain_uuid) {
        return dataFactory.getAgencyIntegrationSettings(domain_uuid)
            .then(function(response) {
                if (response.data.success) {
                    angular.copy(response.data.success.data, service.integrationSettings);

                    return service.integrationSettings;
                }
                return null;
            });
    }

    service.getAms360ActivityList = function(domain_uuid) {
        return dataFactory.ams360GetActivityList(domain_uuid)
            .then(function(response) {
                if (response.data.success) {
                    service.ams360ActivityList = response.data.success.data;
                    return service.ams360ActivityList;
                }
            });
        return null;
    }

    return service;
});
