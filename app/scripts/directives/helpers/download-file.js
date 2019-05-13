"use strict";

proySymphony.directive("downloadFile", function($parse, fileService) {
    return {
        restrict: "A",
        link: function(scope, element, attr) {
            var getDownloadFileVal = $parse(attr.downloadFile);
            var getFilenameVal = $parse(attr.filename);
            var downloadFile = fileService.fetchAndDownloadFileByExternalUrl;
            element.on("click", function() {
                downloadFile(getDownloadFileVal(scope), getFilenameVal(scope));
            });
        }
    };
});
