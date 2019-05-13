'use strict';

proySymphony.controller('PublicPlayCtrl', function($scope, $sce, $routeParams, $location, $interval,
    $auth, __env, dataFactory, symphonyConfig, $window, $rootScope) {

    console.log("ROUTEPARAMS");
    console.log($routeParams);
    $scope.loaded = false;
    if ($routeParams.urlCode) {
        $scope.urlCode = $routeParams.urlCode;
        $scope.logoUrl = "/images/logo.png";
        dataFactory.getCodeDetails($routeParams.urlCode)
            .then(function(response) {
                console.log(response.data);
                if (response.data.success) {
                    var result = response.data.success.data;
                    if (result.url_type === 'redirect') {
                        $window.location.href = result.target_url;
                    } else {
                        $scope.loaded = true;
                        $scope.retrievedRecord = response.data.success.data;
                        if ($scope.retrievedRecord.session_id === "proposal") {
                            setAsProposalPage();
                        }
                    }
                } else {
                    $scope.displayError =
                        'We were unable to locate information about the requested code. Please check your link and try again.';
                }
            });
    }

    function setAsProposalPage() {
        $scope.fullscreenResource = true;
        var archiveUuid = $scope.retrievedRecord.tokbox_conference_archive_uuid;
        $scope.logoUrl = null;
        dataFactory.getArchiveLogoUrl(archiveUuid).then(function(response) {
            if (response.data.success) {
                var url = response.data.success.data;
                $scope.logoUrl = url;
            }
        });
    };

    $scope.enableUrl = function(item) {
        return $sce.trustAsResourceUrl(item.download_url);
    };
});
