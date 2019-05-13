'use strict';

proySymphony.service('fileService', function($rootScope, $window, dataFactory, contactService,
    $filter, $http) {
    var service = {};

    service.getShares = function(user_uuid, from, to) {
        var data = {
            user_uuid: user_uuid,
            from_date: from ? from : new Date(moment().subtract(30, 'days')),
            to_date: to ? to : new Date()
        };
        console.log(data);
        return dataFactory.postGetMyFileShares(data)
            .then(function(response) {
                console.log(response);
                if (response.error) {
                    if (__env.enableDebug) console.log(response.error.message);
                    return [];
                } else {
                    $rootScope.fileSharingList = response.data.success.shares;

                    angular.forEach(response.data.success.shares, function(share) {
                        if (!$rootScope.nonContacts && $window.localStorage
                            .getItem("nonContacts")) $rootScope.nonContacts =
                            JSON.parse($window.localStorage.getItem(
                                "nonContacts"));

                        service.populateContact(user_uuid, share);

                        share.original_filename = share.uploadfile.original_filename;
                        share.upload_type = share.uploadfile.upload_type;
                    });
                    $rootScope.showTable = true;
                    var returnresponse = {
                        shareList: $rootScope.fileSharingList
                    };
                    console.log(returnresponse);
                    return returnresponse;
                }

            }, function(error) {
                $rootScope.msgContacts += 'Error from File Sharing... : ' + JSON.stringify(
                    error, null, 4) + "\n";
                return [];
            });
    };

    service.populateContact = function(user_uuid, share) {
        var noncontacts = $rootScope.nonContacts;
        var contact = share.contact_uuid ? contactService.getContactByUuid(share.contact_uuid) :
            null;
        if (contact) {
            share.contact = contact;
        } else {
            var contact = contactService.getContactByEmail(share.recipient_email);
            if (contact) {
                share.contact = contact;
            } else {
                var info = {
                    email: share.recipient_email,
                    phone: null,
                    name: share.recipient_name,
                    color: randomColor({
                        luminosity: 'dark'
                    })
                };
                if (share.recipient_email) {
                    var noncontact = $filter('getNonContact')(noncontacts, info);
                    if (!noncontact) {
                        $rootScope.storeNonContact(info);
                        noncontact = info;
                    }
                    share.noncontact = noncontact;
                } else {
                    share.noncontact = info;
                }
            }
        }
    };


    service.getFileTypeByMimeType = function(mimeType) {
        mimeType = mimeType.slice(mimeType.lastIndexOf("/") + 1);
        var types = {
            "jpeg": "jpg",
            "pdf": "pdf",
            "vnd.openxmlformats-officedocument.wordprocessingml.document": "doc",
            "vnd.openxmlformats-officedocument.presentationml.presentation": "ppt",
            "vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xls",
            "msword": "doc",
            "vnd.ms-excel": "xls",
            "csv": "csv",
            "plain": "txt",
            "html": "html_filetype",
            "x-rar": "rar",
            "zip": "zip",
            "mp3": "mp3",
            "m4a": "m4a",
            "odt": "odt",
            "mpeg": "mp3",
            "mpg": "mpg",
            "gif": "gif",
            "png": "png",
            "x-wav": "wav",
            "x-flv": "flv"
        };
        if (types[mimeType]) {
            return types[mimeType];
        } else {
            return "file";
        }
    };

    service.uploadIsImage = function(file) {
        var type = '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';
        return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
    };

    service.downloadFileByUrl = function(url) {
        var token = $rootScope.userToken;
        var anchorTag = angular.element('<a></a>');
        anchorTag.attr('href', url + '?token=' + token);
        anchorTag.attr('target', '_blank');
        anchorTag.attr('title', 'file');
        anchorTag[0].click();
    };

    service.fetchAndDownloadFileByExternalUrl = function(url, filename) {
        if (!filename) {
            filename = "download";
        }
        if (url) {
            var ext = url.substr(-4);
            $http.get(url, {
                responseType: "blob"
            }).then(function(response) {
                if (response.data) {
                    var blob = response.data;
                    if (ext.substr(0,1) !== '.') ext = "." + (service.getFileTypeByMimeType(blob.type) ||
                        "wav");
                    filename += ext;
                    var file = service.blobToFile(blob);
                    var url = URL.createObjectURL(file);
                    var a = angular.element("<a></a>")[0];
                    a.href = url;
                    a.download = filename;
                    a.click();
                }
            });
        }
    };

    function openPopUp(url, onBlock) {
        var newWindow = window.open(url);
        try {
            newWindow.focus();
        } catch (e) {
            if (onBlock) {
                onBlock();
            }
        }
    };

    service.openByteArray = function(byteArray, onBlock) {
        var file = new Blob([byteArray], {
            type: 'application/pdf'
        });
        var fileURL = URL.createObjectURL(file);
        openPopUp(fileURL, onBlock);
    };

    service.blobToFile = function(blobData, fileName, options) {
        return new File([blobData], fileName, options);
    };

    service.b64toFile = function(base64FileString, contentType, fileName) {
        return service.blobToFile(b64toBlob(base64FileString, contentType), fileName);
    };

    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, {
            type: contentType
        });
        return blob;
    }

    service.removeFileExtensionFromFilename = function(filename) {
        var splits = filename.split('.');
        splits.pop();
        return splits.join('.');
    };

    service.getFileExtensionFromFilename = function(filename) {
        var splits = filename.split('.');
        return splits.pop();
    };

    service.allowedCloudStorageMimeTypes = [
        "image/jpg", "image/jpeg", "pdf", "application/pdf", "doc",
        "application/msword",
        "text/csv", "text/html", "txt", "image/tiff", "image/x-tiff", "image/tiff",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword", "application/vnd.ms-excel",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/x-rar", "application/rtf", "audio/mpeg3", "audio/x-mpeg-3",
        "video/mpeg",
        "video/x-mpeg", "audio/wav", "audio/x-wav", "audio/x-ms-wma", "audio/mpeg",
        "video/avi", "video/msvideo", "video/x-msvideo", "application/x-troff-msvideo",
        "gif",
        "image/gif", "mp4", "application/pptvnd.ms-powerpoint",
        "application/vnd.ms-powerpoint", "application/octet-stream",
        "image/png", "audio/mpeg3", "audio/mp3", "video/mp4", "audio/x-m4a",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "video/x-flv",
        // "pub","m4a","mov","vts","vob",'m4v',"m2ts",
        // "dvr","flv","bup","mts","psd","png","MOV","mpeg-4",
        "application/gzip", "application/tar", 'image/vnd.adobe.photoshop',
        "application/tar+gz", "application/x-7z-compressed", "tar.gz", "text/plain",
        "application/zip",
        "application/x-zip-compressed"
    ];

    var isUndefined = function(value) {
        return value === undefined;
    };

    var isNull = function(value) {
        return value === null;
    };

    var isObject = function(value) {
        return value === Object(value);
    };

    var isArray = function(value) {
        return Array.isArray(value);
    };

    var isDate = function(value) {
        return value instanceof Date;
    };

    var isBlob = function(value) {
        return value &&
            typeof value.size === 'number' &&
            typeof value.type === 'string' &&
            typeof value.slice === 'function';
    };

    service.isFile = isFile;
    var isFile = function(value) {
        return isBlob(value) &&
            (typeof value.lastModifiedDate === 'object' || typeof value.lastModified ===
                'number') &&
            typeof value.name === 'string';
    };

    var isFormData = function(value) {
        return value instanceof FormData;
    };

    var objectToFormData = function(obj, cfg, fd, pre) {
        if (isFormData(cfg)) {
            pre = fd;
            fd = cfg;
            cfg = null;
        }

        cfg = cfg || {};
        cfg.indices = cfg.indices || false;
        fd = fd || new FormData();

        if (isUndefined(obj)) {
            return fd;
        } else if (isNull(obj)) {
            fd.append(pre, '');
        } else if (isArray(obj)) {
            if (!obj.length) {
                var key = pre + '[]';

                fd.append(key, '');
            } else {
                obj.forEach(function(value, index) {
                    var key = pre + '[' + (cfg.indices ? index : '') + ']';

                    objectToFormData(value, cfg, fd, key);
                });
            }
        } else if (isDate(obj)) {
            fd.append(pre, obj.toISOString());
        } else if (isObject(obj) && !isFile(obj) && !isBlob(obj)) {
            Object.keys(obj).forEach(function(prop) {
                var value = obj[prop];

                if (isArray(value)) {
                    while (prop.length > 2 && prop.lastIndexOf('[]') === prop.length -
                        2) {
                        prop = prop.substring(0, prop.length - 2);
                    }
                }

                var key = pre ? (pre + '[' + prop + ']') : prop;

                objectToFormData(value, cfg, fd, key);
            });
        } else {
            fd.append(pre, obj);
        }

        return fd;
    };

    service.convertFormDataToObj = function(formData) {
        var obj = {};
        formData.forEach(function(value, key) {
            obj[key] = value;
        });
        return obj;
    };


    service.convertObjectToFormData = objectToFormData;

    return service;
});
