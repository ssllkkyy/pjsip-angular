'use strict';

proySymphony
    .directive('adminNoticesTab', function($rootScope, $myModal, $sce, $mdDialog,
        bridgeNoticeService, dataFactory, $filter, $window, $uibModalStack,
        customerGroupCodeService, metaService) {

        function makeString(input) {
            var string = JSON.stringify(input);
            return string;
        };

        return {
            restrict: 'E',
            templateUrl: 'views/tkgadmin/notices.html',
            scope: {},
            link: function($scope, element, attrs) {
                bridgeNoticeService.init();
                $scope.editNotice = false;

                $scope.showModalWithData = $rootScope.showModalWithData;

                $scope.availNotices = function() {
                    return bridgeNoticeService.notices;
                };

                $scope.showEditNotice = function(notice) {
                    if (!notice) notice = {};
                    $scope.editNotice = true;
                    notice.closeModal = closeNoticeModal;
                    $myModal.openTemplate('edit-bridge-notice-modal.html', notice, '',
                        '', 'static');
                };

                function closeNoticeModal() {
                    var confirmBack = $mdDialog.confirm()
                        .title('Please Confirm')
                        .textContent(
                            'Are you sure you want to cancel. You will lose any unsaved changes.'
                        )
                        .ariaLabel('Confirm')
                        .ok('Yes')
                        .cancel('Never Mind');
                    $mdDialog.show(confirmBack).then(function() {
                        // $scope.editNotice = false;
                        // $scope.theNotice = {};
                        $uibModalStack.dismissAll();
                    });
                }

                $scope.back = function() {

                };

                // $rootScope.$on('package.changed', function(){
                //     packageService.init();
                // });
            }
        };
    })
    .directive('editBridgeNotice', function($rootScope, $myModal, usefulTools, bridgeNoticeService,
        dataFactory, Slug, $filter, $window, $uibModalStack, customerGroupCodeService) {
        return {
            restrict: 'E',
            templateUrl: 'edit-bridge-notice.html',
            scope: {
                notice: '=?',
            },
            link: function($scope, element, attrs) {
                $scope.closeModal = function() {
                    $uibModalStack.dismissAll();
                };

                $scope.saveNotice = function(notice) {
                    var package_options = [];
                    angular.forEach(brpackage.selectedOptions, function(value, key) {
                        if (value === true) package_options.push(key);
                    });
                    brpackage.package_options = package_options;
                    brpackage.package_name = Slug.slugify(brpackage.package_title);
                    console.log(brpackage);
                    dataFactory.postSavePackage(brpackage)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $rootScope.$broadcast('package.changed');
                                $uibModalStack.dismissAll();
                            }

                        });
                };
            }
        };
    });
