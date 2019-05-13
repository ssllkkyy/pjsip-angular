'use strict';

proySymphony.service('callStatisticsApi', function($http, $rootScope, $window, _, dataFactory) {

    var callStatisticsApi = {};
    var stats = {
        callStats: [],
        queueStats: {}
    };

    var averageCallStats = function(callStats) {
        var averageStatObject = {};
        _.forEach(callStats, function(userStatObject) {
            _.forEach(userStatObject, function(value, key) {
                if (averageStatObject[key]) {
                    averageStatObject[key] = (averageStatObject[key] +
                        value) / 2;
                } else {
                    averageStatObject[key] = value;
                }
            });
        });
        _.forEach(averageStatObject, function(value, key) {
            averageStatObject[key] = Math.round(value);
        });
        averageStatObject.name = 'Average';
        return averageStatObject;
    };

    callStatisticsApi.getCallStats = function(data) {
        return dataFactory.getCallStats(data).then(function(response) {
            response.data.unshift(averageCallStats(response.data));
            angular.copy(response.data, stats.callStats);
            return stats.callStats;
        });
    };

    console.log($rootScope.user.extension.extension_uuid);
    return callStatisticsApi;
});
