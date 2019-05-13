"use strict";

proySymphony.directive("fileBrowseBtn", function($parse) {
    return {
        restrict: "E",
        templateUrl: "views/files/file-browse-btn.html",
        transclude: {
            btnText: "?btnText"
        },
        link: function($scope, element, attributes) {
            var ctrl;
            if ($scope.$ctrl) {
                ctrl = $scope.$ctrl
            } else {
                ctrl = $scope.$ctrl = this
            }
            var inputEl = element.find("input")[0];
            if (attributes.accept) { inputEl.setAttribute("accept", attributes.accept); }
            ctrl.triggerUpload = function() { inputEl.click(); };
            var fileModel = $parse(attributes.fileModelObj);
            ctrl.fileModelObj = fileModel($scope);
            ctrl.updateFileModel = function(newModel) {
                if (newModel) {
                    var title = fileModel($scope) && fileModel($scope).title;
                    fileModel.assign($scope, newModel);
                    newModel.title = title || newModel.name;
                }
            };
            element.on("click", function() {
                ctrl.triggerUpload();
            });

        }
    };
});
