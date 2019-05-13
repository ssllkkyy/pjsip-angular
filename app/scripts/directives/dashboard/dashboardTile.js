'use strict';

proySymphony
    .directive('dashboardTile', function($rootScope, $location, $timeout, $sce, $uibModalStack,
        $myModal, userService, packageService, smsService, newChatService) {
        return {
            restrict: 'E',
            templateUrl: 'views/dashboard/dashboard-tile.html',
            scope: {
                goTo: '<',
                faClass: '<',
                tileTitle: '<',
                showTransclude: '<',
                onClick: '&?'
            },
            transclude: {
                'tileImageContents': '?tileImageContents'
            },
            link: function($scope, element, attrs, __, $transclude) {
                $scope.goTo = '/' + $scope.goTo;
                $scope.openPage = function() {

                    if (($scope.goTo.length > 1 && $scope.tileTitle !== 'Training' &&
                        !$scope.packageHasAccess($scope.goTo)) ||
                        ($scope.tileTitle === 'Facebook Messenger' && !$scope.packageHasAccess(
                            'facebookmessenger'))) {
                        var feature = $scope.tileTitle === 'Facebook Messenger' ?
                            'facebookmessenger' : $scope.goTo.substring(1);
                        var content = packageService.getFeatureDetails(feature);
                        console.log(content);
                        var data = {
                            tileTitle: $scope.tileTitle,
                            videoUrl: $sce.trustAsResourceUrl(content.option_video),
                            description: content.option_description,
                            doUpgrade: doUpgrade,
                            isAdminGroupOrGreater: isAdminGroupOrGreater
                        };
                        console.log(data);
                        $myModal.openTemplate('feature-detail.html', data, '');
                    } else if ($scope.onClick()) {
                        $scope.onClick()();
                    } else {
                        $location.path($scope.goTo);
                    }
                };

                function isAdminGroupOrGreater() {
                    return userService.isAdminGroupOrGreater();
                };

                $scope.showRequiredPackage = function() {
                    var pack = packageService.getRequiredPackage($scope.goTo.substring(
                        1), $rootScope.user.package);
                    return pack;
                };

                function doUpgrade() {
                    $uibModalStack.dismissAll();
                    $location.path('/settings');
                    $timeout(function() {
                        $rootScope.$broadcast('set.upgrade.tab');
                    }, 500);

                }
                $scope.packageHasAccess = function() {
                    var feature = ($scope.tileTitle === 'Facebook Messenger') ?
                        'facebookmessenger' : $scope.goTo.substring(1);
                    return packageService.packageHasAccess(feature);
                };

                /*  This is for the notification badges. Hidden for now. Will be used DTR. 
                Because of the badges on the right side now, I've moved the ribbon on the left. 
                (Requirement from Adam.) - Neha.
            
                $scope.unreadMsg = function() {
                    if($scope.tileTitle === 'Text Messaging'){
                        if(smsService.unreadMessages() > 0)
                        return smsService.unreadMessages();
                    }
                    if($scope.tileTitle == 'Chat Plus'){
                        if (newChatService.totalMentionCount() > 0) {
                            return newChatService.totalMentionCount() ;
                        }
                    }
                    if($scope.tileTitle === 'Call History'){
                        if($rootScope.missedCalls > 0)
                        return $rootScope.missedCalls;
                    }
                };*/
            }
        };
    });
