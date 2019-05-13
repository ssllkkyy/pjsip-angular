'use strict';


proySymphony.controller('AdvFeaturesCtrl', function($scope, $auth, $location, $rootScope, $uibModal,
    $document, __env, $uibModalStack, $http, dataFactory) {

    $scope.var = null;
    $scope.roboactive = $scope.fileshareactive = $scope.videocallactive = true;
    $scope.showfeaturesOptions = true;
    $scope.showAutomaticDialer = $scope.showFileSharing = $scope.showVideoCalling = $scope.showScreenSharing =
        $scope.showConferenceCalling = false;
    $scope.viewSection = function(view) {
        $scope[view] = true;
        $scope.showfeaturesOptions = false;
    }
    $scope.onShowAllFeatures = function() {
        $scope.showfeaturesOptions = true;
        $scope.showAutomaticDialer = $scope.showVideoCalling = $scope.showConferenceCalling =
            $scope.showScreenSharing = $scope.showFileSharing = false;
    }

    $scope.status = {
        isFirstOpen: true,
        isFirstDisabled: false,
        isSecondDisabled: true,
        isThirdDisabled: true,
        isFourthDisabled: true,
        isFifthDisabled: true
    };


    $scope.getTemplate1 = function() {


        return 'editbroadcast';
    };
    $scope.getTemplate2 = function() {
        return 'editnum';
    };
    $scope.getTemplate3 = function() {
        return 'editschedule';
    };
    $scope.getTemplate4 = function() {
        return 'editrecording';
    };

    $scope.editbroadcast = function() {
        $scope.getTemplate1 = function() {
            return 'editbroadcast';
        };
    };
    $scope.editnumfrm = function() {
        $scope.getTemplate2 = function() {
            return 'editnum';
        };
    };
    $scope.editschedulefrm = function() {
        $scope.getTemplate3 = function() {

            return 'editschedule';

        };
    };
    $scope.editrecordingfrm = function() {
        $scope.getTemplate4 = function() {
            return 'editrecording';
        };
    };

    $scope.opentab2 = function(user) {

        //   $scope.status.isFirstOpen = false;
        if (user.broadcastname === "" || user.callerid === "")
            return;
        $scope.userData = angular.copy(user);
        console.log(user.broadcastname);
        $rootScope.user = user;
        $scope.status.isSecondDisabled = false;
        $scope.status.open2 = true;
        $scope.getTemplate1 = function() {
            return 'displaybroadcast';
        };
    };
    $scope.opentab3 = function() {
        //  $scope.status.open2 = false;

        $scope.status.isThirdDisabled = false;

        $scope.status.open3 = true;

        $scope.getTemplate2 = function() {
            return 'displaynum';
        };

    };
    $scope.opentab4 = function(sch) {
        console.log(sch);
        if (sch === undefined)
            return;
        $rootScope.sch = sch;
        //   $scope.status.open3 = false;
        $scope.status.isFourthDisabled = false;
        $scope.status.open4 = true;
        $scope.getTemplate3 = function() {
            return 'displayschedule';
        };
    };

    $scope.opentab5 = function() {

        $scope.status.isFifthDisabled = false;
        $scope.status.open5 = true;
        $scope.getTemplate4 = function() {
            return 'displayrecording';
        };
    };
    $scope.opentab6 = function() {



    };

    $scope.openContactExist = function(parentSelector) {
        //   $scope.AddContactExistModal = true;
        var parentElem = parentSelector ?
            angular.element($document[0].querySelector('.modal-demo ' + parentSelector)) :
            undefined;
        var modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'AddContactExist.html',
            controller: 'AdvFeaturesCtrl',
            controllerAs: '$ctrl',
            backdrop: true,
            appendTo: parentElem
        });

        modalInstance.result.then(function(selectedItem) {
            $scope.selected = selectedItem;
        }, function() {
            console.info('Modal dismissed at: ' + new Date());
        });

    };
    $scope.okContactExist = function() {
        //  $scope.AddContactExistModal = false;
    };
    $scope.cancelContactExist = function() {
        $uibModalStack.dismissAll();
        //  $scope.AddContactExistModal = false;
    };
    $scope.openAddNumBroadcast = function(parentSelector) {
        //   $scope.AddNumBroadcastModal = true; 
        var parentElem = parentSelector ?
            angular.element($document[0].querySelector('.modal-demo ' + parentSelector)) :
            undefined;
        var modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'AddNum.html',
            controller: 'AdvFeaturesCtrl',
            controllerAs: '$ctrl',
            backdrop: false,
            appendTo: parentElem
        });

        modalInstance.result.then(function(selectedItem) {
            $scope.selected = selectedItem;
        }, function() {
            console.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope.cancelAddNumBroadcast = function() {
        //     $scope.AddNumBroadcastModal = false;
        $uibModalStack.dismissAll();

    };



    $scope.okAddNumBroadcast = function(cont) {

        $rootScope.broadcastcontacts.push({
            'firstname': cont.firstname,
            'lastname': cont.lastname,
            'phone': cont.phoneno,
            'balance': cont.balance,
            'duedate': cont.duedate
        });
        $uibModalStack.dismissAll();
        //  $scope.AddNumBroadcastModal = false;	 
    };
    $scope.okAddAnotherNumBroadcast = function(cont) {
        console.log($scope.broadcastcontacts);
        $scope.broadcastcontacts.push({
            'firstname': cont.firstname,
            'lastname': cont.lastname,
            'phone': cont.phoneno,
            'balance': cont.balance,
            'duedate': cont.duedate
        });
    };
    $scope.openUploadBroadcastFile = function(parentSelector) {
        //    $scope.UploadBroadcastFileModal = true;
        var parentElem = parentSelector ?
            angular.element($document[0].querySelector('.modal-demo ' + parentSelector)) :
            undefined;
        var modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'UploadBroadcastFile.html',
            controller: 'AdvFeaturesCtrl',
            controllerAs: '$ctrl',
            backdrop: true,
            appendTo: parentElem
        });

        modalInstance.result.then(function(selectedItem) {
            $scope.selected = selectedItem;
        }, function() {
            console.info('Modal dismissed at: ' + new Date());
        });

    };

    $scope.okUploadBroadcastFile = function() {
        $uibModalStack.dismissAll();
        //  $scope.UploadBroadcastFileModal = false;
    };

    $scope.cancelUploadBroadcastFile = function() {
        $uibModalStack.dismissAll();
        //    $scope.UploadBroadcastFileModal = false;
    };
    $scope.openAddRecordMessage = function(parentSelector) {
        //   $scope.AddRecordMessageModal = true;
        var parentElem = parentSelector ?
            angular.element($document[0].querySelector('.modal-demo ' + parentSelector)) :
            undefined;
        var modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'AddRecordMessage.html',
            controller: 'AdvFeaturesCtrl',
            controllerAs: '$ctrl',
            backdrop: true,
            appendTo: parentElem
        });
        $scope.num = "66";
        modalInstance.result.then(function(selectedItem) {
            $scope.selected = selectedItem;
        }, function() {
            console.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope.okAddRecordMessage = function() {
        //    $scope.AddRecordMessageModal = false;
        $uibModalStack.dismissAll();
    };

    $scope.cancelAddRecordMessage = function() {
        //   $scope.AddRecordMessageModal = false;
        $uibModalStack.dismissAll();
    };

    $scope.openAddTextMessage = function(parentSelector) {
        //   $scope.AddRecordMessageModal = true;
        var parentElem = parentSelector ?
            angular.element($document[0].querySelector('.modal-demo ' + parentSelector)) :
            undefined;
        var modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'AddTextMessage.html',
            controller: 'AdvFeaturesCtrl',
            controllerAs: '$ctrl',
            backdrop: true,
            appendTo: parentElem
        });

        modalInstance.result.then(function(selectedItem) {
            $scope.selected = selectedItem;
        }, function() {
            console.info('Modal dismissed at: ' + new Date());
        });
    };
    $scope.okAddTextMessage = function(cont) {
        $rootScope.textmessage = cont.textmessage;
        console.log(cont.textmessage);
        //    $scope.AddRecordMessageModal = false;
        $uibModalStack.dismissAll();
    };

    $scope.cancelAddTextMessage = function() {
        //   $scope.AddRecordMessageModal = false;
        $uibModalStack.dismissAll();
    };

    $scope.openUploadAudioFile = function(parentSelector) {
        //   $scope.UploadAudioFileModal = true;
        var parentElem = parentSelector ?
            angular.element($document[0].querySelector('.modal-demo ' + parentSelector)) :
            undefined;
        var modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'UploadAudioFile.html',
            controller: 'AdvFeaturesCtrl',
            controllerAs: '$ctrl',
            backdrop: true,
            appendTo: parentElem
        });

        modalInstance.result.then(function(selectedItem) {
            $scope.selected = selectedItem;
        }, function() {
            console.info('Modal dismissed at: ' + new Date());
        });


    };

    $scope.okUploadAudioFile = function() {
        //    $scope.UploadAudioFileModal = false;
        $uibModalStack.dismissAll();
    };

    $scope.cancelUploadAudioFile = function() {
        //  $scope.UploadAudioFileModal = false;
        $uibModalStack.dismissAll();
    };

    $scope.nextStep = function(cur, next) {
        $scope[cur] = false;
        $scope[next] = true;
    };

    //********** ERIK 10/20/2016 **********//

    $scope.showConferenceCalls = function() {
        $location.path("/conferencecalls");
    };
    $scope.showFileSharing = function() {
        $location.path("/filesharing");
    };

});
