'use strict';

proySymphony.factory('$myModal', function($uibModal, $uibModalStack) {
    var modals = {
        open: function(size, template, title, message) {
            return $uibModal.open({
                controller: 'ModalInstanceCtrl',
                controllerAs: 'vm',
                templateUrl: template || 'views/modals/basicModal.html',
                size: size,
                resolve: {
                    items: function() {
                        return {
                            title: title,
                            message: message
                        };
                    }
                }
            });
        },
        openTemplate: function(template, data, modalSize, css, bkDrp, key) {
            var backdrop = true;
            if (modalSize) {
                var size = modalSize;
            } else
                var size = 'md';
            var keyboard = (key && key === 'false' ? false : true);
            if (!data) {
                data = {};
            }
            data.close = function() {
                $uibModalStack.dismissAll();
            };
            if (bkDrp) backdrop = bkDrp;
            if (modalSize) size = modalSize;
            var instance = $uibModal.open({
                animation: true,
                templateUrl: template,
                controller: 'ModalInstanceCtrl',
                controllerAs: 'vm',
                size: size,
                keyboard: keyboard,
                backdrop: backdrop,
                windowClass: css,
                modalWindow: true,
                resolve: {
                    items: function() {
                        return {
                            data: data // access by vm.content.data in modal
                        };
                    }
                }
            });
            return instance.result.then(function() {
                //Get triggers when modal is closed
                if (data && data.onClose) {
                    data.onClose();
                }
            }, function() {
                //gets triggers when modal is dismissed.
                if (data && data.onClose) {
                    data.onClose();
                }
            });
        }
    };

    return modals;
});
