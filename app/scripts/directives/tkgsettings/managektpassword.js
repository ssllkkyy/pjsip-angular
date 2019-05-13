'use strict';

proySymphony
    .directive('managektPassTab', function($rootScope, $myModal, $sce, $mdDialog,
        bridgeNoticeService, dataFactory, $filter, $window, $uibModalStack,
        customerGroupCodeService, metaService) {
        return {
            restrict: 'E',
            templateUrl: 'views/tkgadmin/managektpassword.html',
            scope: {},
            link: function($scope, element, attrs) {
                $scope.fields = {};
                $scope.triggerUpdate = function() {
                    $rootScope.confirmDialog(
                            "Are you sure you want to change the Kotter-Tech password?")
                        .then(function(response) {
                            response ? $scope.updatePassword() : $scope.fields = {};
                        });
                };
                $scope.loading = false;

                $scope.updatePassword = function() {
                    $scope.loading = true;
                    dataFactory.postResetKotterTechPassword($scope.fields)
                        .then(function(response) {
                            $scope.loading = false;
                            if (response.data.success) {
                                if (__env.enableDebug) console.log(
                                    response.data.success.message);
                                $rootScope.showSuccessAlert(
                                    'Kotter-Tech password has been updated.'
                                );
                                $scope.fields = {};
                            } else if (response.data.error) {
                                var message = response.data.error.message;
                                if (__env.enableDebug) console.log(
                                    message);
                                $rootScope.showErrorAlert(message[0]);
                                $scope.fields = {};
                            }
                        });
                };
            }
        };
    });
   
