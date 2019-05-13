'use strict';

proySymphony.controller('ctrlRingGroup', function($scope, $q, $filter, $mdToast, $auth, $mdDialog,
    Idle, $interval, $uibModal, Keepalive, $rootScope, $routeParams, usefulTools, $myModal,
    dataFactory, $timeout, $uibModalStack) {

    $scope.logEvent = function(message) {
        console.log(message);
    };

    $scope.logListEvent = function(action, index, external, type) {
        var message = external ? 'External ' : '';
        message += type + ' element was ' + action + ' position ' + index;
        console.log(message);
    };

    $scope.dragoverCallback = function(index, external, type) {
        $scope.logListEvent('dragged over', index, external, type);
        // Invoke callback to origin for container types.
        if (type == 'container' && !external) {
            console.log('Container being dragged contains ' + ' items');
        }
        return true;
        // return index < 10; // Disallow dropping in the third row.
    };


    //  $scope.dropCallback = function(index, item, external, type) {
    //     $scope.logListEvent('dropped at', index, external, type);
    //     // Return false here to cancel drop. Return true if you insert the item yourself.
    //         return item;
    // };



    // --------Individual


    $scope.dropIndCallback = function(selected, index, item, external, type) {
        $scope.logListEvent('dropped at', index, external, type);
        console.log("DROPPED");
        // Return false here to cancel drop. Return true if you insert the item yourself.
        // if ($rootScope.optionsList[selected].items)
        $rootScope.ringGroupOption.items.splice(0);
        $rootScope.ringGroupOption.items.push(item);

        return item;
    };


    // --------Ring Grouop

    var replaceConfirm = $mdDialog.confirm()
        .title('Would you like to change the Ring Pattern?')
        .textContent(
            'Are you sure you want to change the current ring pattern? We will move any contacts already added into the new pattern.'
        )
        .ariaLabel('replace')
        .ok('Yes')
        .cancel('Nevermind');

    $scope.dropContainCallback = function(index, item, external, type) {
        $scope.logListEvent('dropped at', index, external, type);
        // Return false here to cancel drop. Return true if you insert the item yourself.
        // $rootScope.newIvr.containers.splice(index, 0, item);
        // return true;
        console.log(item);
        console.log($rootScope.ringGroupOption.containers[0]);
        // $scope.deferred = $q.defer();
        $scope.dropped = true;
        console.log("DROPPED");
        var temp = $rootScope.ringGroupOption.containers.length > 0 ? angular.copy(
            $rootScope.ringGroupOption.containers[0]) : {};
        if ($rootScope.ringGroupOption.containers.length === 0) {
            console.log("ADD AS NEW");

            return item;
            // $scope.deferred.reject('false');
        } else {
            console.log("CHECK IF REPLACE");

            if (item.items.length === 0) {
                $mdDialog.show(replaceConfirm).then(function() {

                    console.log("DO REPLACR");

                    temp.label = item.label;
                    $rootScope.ringGroupOption.containers.splice(0);
                    $rootScope.ringGroupOption.containers.push(temp);
                    //if (!$rootScope.ringGroupOption.containers[1].items) $rootScope.ringGroupOption.containers[1].items = [];
                    //$rootScope.ringGroupOption.containers[0].items = angular.copy(temp.items);
                    console.log($rootScope.ringGroupOption.containers);
                    //$scope.deferred.resolve('true');
                    return true;
                }, function() {
                    return false;
                    // $scope.deferred.reject('false');
                });
            } else {

            }
        }
        // return $scope.deferred.promise;
    };

    //| orderBy: ext: false

    $scope.removeContainer = function(event, index, item) {

        var deleteConfirm = $mdDialog.confirm()
            .title('Would you like to remove the Ring Pattern?')
            .textContent(
                'Are you sure you want to remove the current ring pattern? This will remove any contacts that have already been added into the pattern.'
            )
            .ariaLabel('remove')
            .ok('Yes')
            .cancel('Nevermind');
        console.log('remove container');
        console.log(event);
        console.log(index);
        console.log(item);
        //console.log($rootScope.ringGroupOption.containers);
        //console.log($rootScope.ringGroupOption.containers.length);
        var temp = angular.copy($rootScope.ringGroupOption.containers[0]);
        console.log(temp);
        console.log(item.items.length + ' ? ' + temp.items.length);
        console.log(item.label + ' ? ' + temp.label);
        $timeout(function() {
            if (item.items.length === temp.items.length && item.label === temp.label &&
                !$scope.dropped) {
                console.log("WANT TO REMOVE");
                $mdDialog.show(deleteConfirm).then(function() {
                    angular.forEach(item.items, function(user) {
                        $rootScope.options.users.items.push(
                            user);
                    });
                    $rootScope.ringGroupOption.containers.splice(0, 1);
                });
            }
            $scope.dropped = false;
        });
    };

    $scope.removeFromContainer = function(event, index) {
        console.log('remove user from container');
        console.log(event);
        console.log($rootScope.ringGroupOption.containers[0].items);
        console.log($rootScope.ringGroupOption.containers[0].items.length);
        var temp = $rootScope.ringGroupOption.containers[0].items[index];
        $rootScope.ringGroupOption.containers[0].items.splice(index, 1);
        console.log(temp);
        $timeout(function() {
            var count = 0;
            angular.forEach($rootScope.ringGroupOption.containers[0].items,
                function(item) {
                    if (item.user_uuid === temp.user_uuid) count += 1;
                });
            if (count === 0) $rootScope.options.users.items.push(temp);
        });

    };
    $scope.removeFromUsers = function(index) {
        console.log("remove from users");
        /*   $scope.movingUserIndex = index;
           $scope.movingUser = $rootScope.options.users.items[index];
           console.log($scope.movingUser);
           var temp = $rootScope.options.users.items[index];
           
           //$timeout(function() {
               var count = 0;
               angular.forEach($rootScope.options.users.items, function(item){
                   if (item.user_uuid === temp.user_uuid) count+=1;
               });
               console.log(count);
               if (count === 0) $rootScope.options.users.items.splice(index, 1);
           //});*/
    };

    $scope.dropRingCallback = function(index, item, external, type) {
        $scope.logListEvent('dropped at', index, external, type);

        console.log("DROPPING A USER IN");
        console.log(item);

        var userindex = $filter('getByUUID')($rootScope.options.users.items, item.user_uuid,
            'user');
        var count = 0;
        angular.forEach($rootScope.ringGroupOption.containers[0].items, function(user) {
            if (user.user_uuid === item.user_uuid) count += 1;
        });
        console.log(count);

        if (userindex !== null) $rootScope.options.users.items.splice(userindex, 1);



        // Return false here to cancel drop. Return true if you insert the item yourself.
        // return true;
        return item;
    };



    // $scope.moveContainer = function(index) {
    //     console.log("Erasing old place");
    //     $rootScope.optionsList[index].containers.splice(index, 1);
    // }

    // ---------

});
