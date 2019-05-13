'use strict';

proySymphony.factory('usefulTools', function($location, $cookies, $sce, Slug, $http, $window,
        dataFactory, $rootScope, $anchorScroll, $mdDialog) {
        var tools = {
            goToId: function(id) {
                //$anchorScroll.yOffset = -50;
                //if (id==='chat-bottom') $anchorScroll.yOffset = 50;
                $location.hash(id);
                $anchorScroll();
                $location.hash('');
            },
            isGCSPath: function(path) {
                var buckets = ['bridge-qa-storage', 'bridge-staging-storage',
                    'bridge-production-storage'
                ];
                var index = path.indexOf('/');
                if (index === -1) return false;
                var bucket = path.substr(0, index);
                return buckets.indexOf(bucket) !== -1;
            },
            getIpInfo: function() {
                var url = "https://api.ipify.org?format=jsonp"
                var trustedUrl = $sce.trustAsResourceUrl(url);
                $http.defaults.headers.common = {};
                return $http.jsonp(trustedUrl, {
                        jsonpCallbackParam: 'callback'
                    })
                    .then(function(data) {
                        var ipstack = 'https://api.ipstack.com/' + data.data.ip +
                            '?access_key=39c905b80b4639996ba70b2cb2b10ccf';
                        return $http.get(ipstack)
                            .then(function(response) {
                                console.log(response);
                                localStorage.setItem("userIPInfo", JSON.stringify(
                                    response.data));
                                return response.data;
                            });
                    });
            },
            isUuid: function(string) {
                var parts = string.split("-");
                return (parts.length === 5 &&
                    parts[0].length === 8 &&
                    parts[1].length === 4 &&
                    parts[2].length === 4 &&
                    parts[3].length === 4 &&
                    parts[4].length === 12)
            },
            datesDifferent: function(first, second) {
                if (second == '') return true;
                var a = moment(first).startOf('day');
                var b = moment(second).startOf('day');
                return (a.diff(b, 'days') > 0);
            },
            isNewDay: function(first, second) {
                var check = false;
                if (second == '') check = true;
                if (tools.datesDifferent(first, second)) check = true;
                return check;
            },
            timeDifference: function(first, second, period) {
                if (second == '') return 1;
                var a = moment(first);
                var b = moment(second);
                return (a.diff(b, period));
            },
            cleanPhoneNumber: function(phone) {
                var number = Slug.slugify(phone);
                number = number.toString().trim().replace(/-/g, '');
                if (number.length > 10) number = number.substr(1);
                return number;
            },
            showChevron: function(pred1, pred2, reverse) {
                var theclass = '';
                if (pred1 === pred2) {
                    theclass = 'chevron-circle-down activesort padd5left';
                    if (reverse) {
                        theclass = 'chevron-circle-up activesort padd5left';
                    }
                    return 'fa fa-' + theclass + ' padd5left';
                }
                return 'fa fa-chevron-down';
            },
            // gets reassigned by statusService
            funcPutIcon: function(status, size) {},
            isPageHidden: function() {
                return document.hidden || document.msHidden || document.webkitHidden ||
                    document.mozHidden;
            },
            convertObjectToArray: function(object) {
                return _.toArray(object);
            },
            convertObjectToKeyValueArray: function(object) {
                var array = [];
                // angular.forEach(object, function(element, key) {
                for (var keystr in object) {
                    var obj = {};
                    obj[keystr] = object[keystr];
                    array.push(obj);
                };
                return array;
            },
            formatTime: function(time) {
                var hours = Math.floor(time / 3600);
                var minutes = Math.floor((time % 3600) / 60);
                var seconds = Math.round(time % 60);

                minutes = minutes < 10 ? '0' + minutes : minutes;
                seconds = seconds < 10 ? '0' + seconds : seconds;

                return (hours + ":" + minutes + ":" + seconds);
            },
            isPhoneNumber: function(text) {
                if (text) {
                    var check = Slug.slugify(text);
                    var value = check.toString().trim().replace(/-/g, '');
                    return !isNaN(value) && (value.length === 10 || (value.length == 11 &&
                        value.substr(0, 1) === '1'));
                }
                return false;
            },
            isPhoneNumberOrExtension: function(text) {
                if (text) {
                    var check = Slug.slugify(text);
                    var value = check.toString().trim().replace(/-/g, '');
                    return !isNaN(value) && (value.length <= 10 || (value.length == 11 &&
                        value.substr(0, 1) === '1'));
                }
                return false;
            },
            isNumeric: function(text) {
                if (text) {
                    var check = Slug.slugify(text);
                    var value = check.toString().trim().replace(/-/g, '');
                    return !isNaN(value);
                }
                return false;
            },
            isValidExtension: function(ext) {
                return ext && (ext.toString().length === 3 || ext.toString().length ===
                    4) && ext > 99 && ext < 10000 && !isNaN(ext);
            },
            isValidEmail: function(email) {
                if (!email) return false;
                var validator =
                    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return validator.test(email);
            },
            roundNumber: function(number, precision) {
                var factor = Math.pow(10, precision);
                var tempNumber = number * factor;
                var roundedTempNumber = Math.round(tempNumber);
                return roundedTempNumber / factor;
            },
            doGetCaretPosition: function(oField) {
                var iCaretPos = 0;
                // IE Support
                if (document.selection) {
                    oField.focus();
                    var oSel = document.selection.createRange();
                    oSel.moveStart('character', -oField.value.length);
                    iCaretPos = oSel.text.length;
                }
                // Firefox support
                else if (oField.selectionStart || oField.selectionStart == '0') {
                    iCaretPos = oField.selectionStart;
                }
                return iCaretPos;
            },
            randomString: function(length, seed) {
                if (!seed) seed = 'ABCDEFGHIJKLMNOPQRSYUVWXYZ0123456789';
                var text = "";
                for (var i = 0; i < length; i++)
                    text += seed.charAt(Math.floor(Math.random() * seed.length));
                return text;
            },
            getManagerStatus: function() {
                return dataFactory.getManagerEmulationStatus()
                    .then(function(response) {
                        if (response.data.error) {
                            console.log(response.data.error.message);
                        } else {
                            $rootScope.emulationStatus = response.data.success.data;
                            $window.localStorage.setItem("emulationStatus", JSON.stringify(
                                $rootScope.emulationStatus));
                            console.log("MANAGER EMULATION STATUS - USEFUL");
                            console.log($rootScope.emulationStatus);
                            return $rootScope.emulationStatus;
                        }
                        return [];
                    }, function(error) {
                        console.log(error);
                        return [];
                    });
            },
            showContactName: function(contact, number) {
                if (!contact || !contact.nums) return null;
                var i;
                var input = contact.nums;
                number = number.length > 10 ? number.substr(1) : number;
                for (i = 0; i < input.length; i += 1) {
                    if (number === input[i].num) {
                        if (input[i].phone_count > 1 && contact.org)
                            return contact.org;
                    }
                };
                return contact.name;
            },
            isExternalPage: function() {
                var externalLocations = ['/login', '/cloud/'];
                var isExternal = false;
                angular.forEach(externalLocations, function(check) {
                    if ($location.path().indexOf(check) !== -1) isExternal =
                        true;
                });
                return isExternal;
            },
            isDST: function() {
                var today = new Date();
                return today.dst();
            }
        };
        Date.prototype.stdTimezoneOffset = function() {
            var jan = new Date(this.getFullYear(), 0, 1);
            var jul = new Date(this.getFullYear(), 6, 1);
            return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
        };

        Date.prototype.dst = function() {
            return this.getTimezoneOffset() < this.stdTimezoneOffset();
        };

        tools.isTollFree = function(number) {
            return number.substring(0, 3) === '800' ||
            number.substring(0, 3) === '833' ||
            number.substring(0, 3) === '844' ||
            number.substring(0, 3) === '855' ||
            number.substring(0, 3) === '866' ||
            number.substring(0, 3) === '877' ||
            number.substring(0, 3) === '888';
        };

        tools.promptForInfo = function(title, message) {
            return $mdDialog.show(
                $mdDialog.prompt()
                .clickOutsideToClose(true)
                .title(title)
                .textContent(message)
                .ok('Okay')
            );
        };

        tools.createObjectCollByItemProperty = function(vals, propertyName) {
            var objColl = {};
            angular.forEach(vals, function(val, key) {
                objColl[val[propertyName]] = val;
            });
            return objColl;
        };

        tools.showAlert = function(title, message) {
            return $mdDialog.show(
                $mdDialog.alert()
                .clickOutsideToClose(true)
                .title(title)
                .textContent(message)
                .ok('Got it!')
            );
        };

        tools.showSuccessAlert = function(message) {
            if (!message) {
                message = "That's a bingo!";
            };
            return tools.showAlert('Congratulations!', message);
        };

        tools.showErrorAlert = function(message) {
            if (!message) {
                message = 'Something went wrong.';
            };
            return tools.showAlert('Uh-Oh :(', message);
        };

        tools.removeRecordFromCollByUuid = function(uuid, collection, uuidFieldName) {
            return collection.filter(function(record) {
                return record[uuidFieldName] !== uuid;
            });
        };

        tools.spreadArrayAndArg = function(arr, arg) {
            var returnArr = [];
            for (var i = 0; i < arr.length; i++) {
                returnArr.push(arr[i]);
            }
            returnArr.push(arg);
            return returnArr;
        };

        tools.find = function(arr, field, value) {
            var record;
            if (!value) return null;
            if (arr) {
                if (_.isPlainObject(arr)) arr = tools.convertObjectToArray(arr);
                for (var i = 0; i < arr.length; i++) {
                    record = arr[i];
                    if (record[field] && record[field] === value) {
                        return record;
                    }
                }
            }
            return null;
        };

        tools.deepFilter = function(obj, field, value) {
            var i;
            var finding;
            var element;
            var findings = [];
            if (_.isPlainObject(obj)) {
                if (obj[field] === value) {
                    findings.push(obj);
                }
                var elements = Object.keys(obj).map(function(key) {
                    return obj[key];
                });
                for (i = 0; i < elements.length; i++) {
                    element = elements[i];
                    if (_.isPlainObject(element)) {
                        if (element[field] === value) {
                            findings.push(element);
                        } else {
                            finding = tools.deepFilter(element, field, value);
                            if (finding) {
                                findings = findings.concat(finding);
                            }
                        }
                    } else if (_.isArray(element)) {
                        finding = tools.deepFilter(element, field, value);
                        if (finding) {
                            findings = findings.concat(finding);
                        }
                    }
                }

            } else if (_.isArray(obj)) {
                for (i = 0; i < obj.length; i++) {
                    element = obj[i];
                    finding = tools.deepFilter(element, field, value);
                    if (finding) {
                        findings = findings.concat(finding);
                    }
                }
            }
            return findings.length > 0 ? findings : false;
        };

        tools.deepFind = function(obj, field, value) {
            var i;
            var finding;
            var element;
            if (_.isPlainObject(obj)) {
                if (obj[field] === value) {
                    return obj;
                }
                var elements = Object.keys(obj).map(function(key) {
                    return obj[key];
                });
                for (i = 0; i < elements.length; i++) {
                    element = elements[i];
                    if (_.isPlainObject(element)) {
                        if (element[field] === value) {
                            return element;
                        } else {
                            finding = tools.deepFind(element, field, value);
                            if (finding) {
                                return finding;
                            }
                        }
                    } else if (_.isArray(element)) {
                        finding = tools.deepFind(element, field, value);
                        if (finding) {
                            return finding;
                        }
                    }
                }

            } else if (_.isArray(obj)) {
                for (i = 0; i < obj.length; i++) {
                    element = obj[i];
                    finding = tools.deepFind(element, field, value);
                    if (finding) {
                        return finding;
                    }
                }
            }
            return null;
        };

        tools.flattenObj = function(obj) {
            var keys = Object.keys(obj);
            var returnObj = {};
            var item;
            var result;
            var intersection;
            _.forEach(keys, function(key) {
                item = obj[key];
                if (_.isPlainObject(item) || _.isArray(item)) {
                    result = tools.flattenObj(item);
                    intersection = _.intersection(Object.keys(returnObj), Object.keys(
                        result));
                    if (intersection.length > 0) {
                        _.forEach(Object.keys(result), function(subKey) {
                            if (intersection.indexOf(subKey)) {
                                if (_.isArray(returnObj[subKey])) {
                                    returnObj[subKey].push(result[subKey]);
                                } else {
                                    returnObj[subKey] = [returnObj[subKey],
                                        result[subKey]
                                    ];
                                }
                            } else {
                                returnObj[subKey] = result[subKey];
                            }
                        });
                    } else {
                        returnObj = _.merge(returnObj, result);
                    }
                } else {
                    returnObj[key] = item;
                }
            });
            return returnObj;
        };

        tools.remove = function(arr, field, value) { //removes first instance of arr where field === value
            var record;
            if (arr) {
                for (var i = 0; i < arr.length; i++) {
                    record = arr[i];
                    if (record[field] === value) {
                        return arr.splice(i, 1);
                    }
                }
            }
            return null;
        };

        tools.arrayToObjectByProp = function(array, properties, returnObj) {
            if (!Array.isArray(properties)) {
                properties = [properties];
            }
            if (!returnObj) {
                returnObj = {};
            };
            array.forEach(function(val) {
                if (val) {
                    properties.forEach(function(property) {
                        if (val[property] !== undefined) {
                            returnObj[val[property]] = val;
                        }
                    });
                }
            });
            return returnObj;
        };

        tools.arrayToObjectByProps = function(array, properties, returnObj) {
            if (!returnObj) {
                returnObj = {};
            };
            array.forEach(function(val) {
                for (var i = 0; i < properties.length; i++) {
                    var property = properties[i];
                    var unreplaceableVals = [null, "", undefined];
                    var validReplaceVal = function(value) {
                        return !_.some(unreplaceableVals, function(
                            unreplaceableVal) {
                            return unreplaceableVal === value;
                        });
                    };
                    var shouldReplace = validReplaceVal(val[property]);
                    if (shouldReplace) {
                        returnObj[val[property]] = val;
                        break;
                    }
                };
            });
            return returnObj;
        };

        // NOTE: For when comparing objects that should evaluate as equal even if
        // one object has a property that the other does not. However, objects are
        // still not considered equal if the additional property is truthy. Only
        // in the case that the additional properties are falsy will the objects
        // be considered equal.
        tools.isEqual = function(first, second, ignoredFields) {
            var results;
            if (!ignoredFields) {
                ignoredFields = [];
            };
            if (_.isPlainObject(first) && _.isPlainObject(second)) {
                function objHasExistingValAtProp(obj) {
                    return function(key) {
                        return Boolean(obj[key]);
                    };
                };

                function isIgnoredField(field) {
                    return !(ignoredFields.indexOf(field) > -1);
                };
                var firstKeys = _.filter(Object.keys(first), objHasExistingValAtProp(first))
                    .filter(isIgnoredField);
                var secondKeys = _.filter(Object.keys(second), objHasExistingValAtProp(
                        second))
                    .filter(isIgnoredField);
                var intersection = _.intersection(firstKeys, secondKeys);
                if (intersection.length === firstKeys.length &&
                    intersection.length === secondKeys.length) {
                    results = _.map(intersection, function(key) {
                        return tools.isEqual(first[key], second[key], ignoredFields);
                    });
                    return _.every(results, Boolean);
                }
                return false;
            } else if (_.isArray(first) && _.isArray(second)) {
                if (first.length !== second.length) {
                    return false;
                } else {
                    results = [];
                    for (var i = 0; i < first.length; i++) {
                        if (!tools.isEqual(first[i], second[i], ignoredFields)) {
                            return false;
                        }
                    }
                    return true;
                }
            }
            return _.isEqual(first, second);
        };

        tools.filterWhere = function(items, searchTerms) {
            var terms = Object.keys(searchTerms);

            function isMatch(item) {
                var match = true;

                function checkMatch(term) {
                    var itemVal = item[term];
                    var searchVal = searchTerms[term];
                    if (_.isFunction(searchVal)) {
                        if (match) {
                            match = searchVal(itemVal);
                        }
                    } else {
                        if (itemVal !== searchVal) {
                            match = false;
                        }
                    }
                };
                _.forEach(terms, checkMatch);
                return match;
            };
            return _.filter(items, isMatch);
        };

        tools.filterForVal = function(searchColl, searchVals) {
            return searchColl.filter(function(event) {
                return _.every(searchVals, function(val) {
                    var isMatch;
                    Object.values(event).forEach(function(eventVal) {
                        if (_.isString(eventVal) && eventVal.indexOf(
                                val) > -1) {
                            isMatch = true;
                        }
                    });
                    return isMatch;
                });
            });
        };

        tools.nestedGroupBy = function(items, getString, ungroupedName) {
            if (!ungroupedName) {
                ungroupedName = "ungrouped";
            };
            if (_.isString(getString)) {
                function _get(item, str) {
                    var val = _.get(item, str);
                    return val ? val : ungroupedName;
                }
                items = _.groupBy(items, _.partialRight(_get, getString));
            }
            return items;
        };

        tools.multiGroupBy = function(items, groupSpec, ungroupedName) {
            if (_.every(groupSpec, _.isString)) {
                var firstGetString = groupSpec[0];
                items = tools.nestedGroupBy(items, firstGetString, ungroupedName);

                function applyFnToArrays(obj, fn) {
                    var vals = Object.keys(obj).map(function(key) {
                        return obj[key];
                    });
                    if (_.every(vals, _.isArray)) {
                        Object.keys(obj).forEach(function(key) {
                            obj[key] = fn(obj[key]);
                        });
                        return obj;
                    } else {
                        Object.keys(obj).forEach(function(key) {
                            obj[key] = applyFnToArrays(obj, fn);
                        });
                        return obj;
                    }
                }
                groupSpec.slice(1, groupSpec.length).forEach(function(getString) {
                    var mapFn = _.partialRight(tools.nestedGroupBy, getString);
                    items = applyFnToArrays(items, mapFn);
                });
            }
            return items;
        };

        tools.leafMap = function(obj, mapFn, testFn) {
            if (!testFn) {
                testFn = function(val) {
                    return false;
                };
            };
            var copy;
            if (_.isPlainObject(obj)) {
                if (testFn(obj)) {
                    return mapFn(obj);
                } else {
                    copy = {};
                    angular.copy(obj, copy);
                    var keys = Object.keys(copy);
                    _.forEach(keys, function(key) {
                        copy[key] = tools.leafMap(copy[key], mapFn);
                    });
                    return copy;
                }
            } else if (_.isArray(obj)) {
                if (testFn(obj)) {
                    return mapFn(obj);
                } else {
                    copy = [];
                    _.forEach(obj, function(item) {
                        copy.push(tools.leafMap(item, mapFn));
                    });
                    return copy;
                }
            } else {
                return mapFn(obj);
            }
        };

        tools.capitalize = function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        tools.snakeToCamel = function(str) {
            return str.replace(/(\_\w)/g, function(m) {
                return m[1].toUpperCase();
            });
        };

        tools.createElements = function(data) {
            var returnVal;

            function validElement(el) {
                return Boolean(el.type);
            };
            if (_.isPlainObject(data) && validElement(data)) {
                var element = document.createElement(data.type);
                if (data.attrs) {
                    var attrs = Object.keys(data.attrs).map(function(key) {
                        return [key, data.attrs[key]];
                    });
                    tools.setElementAttributes(element, attrs);
                }
                if (data.children) {
                    data.children = data.children.map(tools.createElements);
                    tools.appendChildrenToParent(element, data.children);
                }
                if (data.text) {
                    element.append(document.createTextNode(data.text));
                }
                returnVal = element;
            } else if (_.isArray(data)) {
                returnVal = data.map(tools.createElements);
            }
            if (returnVal.scope) {
                var scopeObj = returnVal.scope;
                if (scopeObj.scopeId) {
                    scopeObj.scope[scopeObj.scopeId] = {
                        element: returnVal,
                        prop: scopeObj.prop
                    };
                };
                if (scopeObj.fns) {
                    var fns = Object.keys(scopeObj.fns)
                        .map(function(key) {
                            return {
                                fn: scopeObj.fns[key],
                                key: key
                            };
                        });
                    _.forEach(fns, function(fnObj) {
                        scopeObj.fns[fnObj.key] = fnObj.fn(returnVal);
                    });
                }
                // if (scopeObj.val === true) {
                //     scopeObj.scope.setVal = {
                //         scopeId: scopeObj.scopeId, propVal: scopeObj.val, scopeVal: scopeObj.val
                //     };
                // }
                returnVal.onchange = scopeObj.onChange;
            }
            return returnVal;
        };

        tools.appendChildrenToParent = function(parent, children) {
            function attachChild(child) {
                parent.append(child);
            }
            _.forEach(children, attachChild);
            return parent;
        };

        tools.setElementAttributes = function(element, attributes) {
            var directAttrs = {
                onchange: {},
                style: {
                    nested: true
                },
                scope: {}
            };

            function objAttrsToArray(attrs) {
                return Object.keys(attrs).map(function(key) {
                    return [key, attrs[key]];
                });
            }

            function handleDirectAttach(obj, key, val) {
                if (_.isString(val) || _.isFunction(val)) {
                    obj[key] = val;
                } else if (_.isPlainObject(val) && directAttrs[key].nested) {
                    val = objAttrsToArray(val);
                    _.forEach(val, function(attr) {
                        obj = obj[key];
                        key = attr[0];
                        val = attr[1];
                        handleDirectAttach(obj, key, val);
                    });
                } else {
                    obj[key] = val;
                }
            }
            if (_.isPlainObject(attributes)) {
                attributes = objAttrsToArray(attributes);
            }
            _.forEach(attributes, function(attr) {
                if (attr) {
                    var key = attr[0];
                    var value = attr[1];
                    if (directAttrs[key]) {
                        handleDirectAttach(element, key, value);
                    } else {
                        element.setAttribute(attr[0], attr[1]);
                    }
                }
            });
            return element;
        };

        tools.sortByBooleanFn = function(coll, booleanFn, reverse) {
            coll = coll.sort(function(itemA, itemB) {
                var itemAResult = booleanFn(itemA);
                var itemBResult = booleanFn(itemB);
                if ((itemAResult && itemBResult) || (!itemAResult && !itemBResult)) {
                    return 0;
                } else if (itemAResult) {
                    return 1;
                } else if (itemBResult) {
                    return -1;
                } else {
                    return 0;
                }
            });
            if (reverse) {
                coll.reverse();
            }
            return coll;
        };

        return tools;
    })
    .factory('focus', function($timeout, $window) {
        return function(id) {
            // timeout makes sure that it is invoked after any other event has been triggered.
            // e.g. click events that need to run before the focus or
            // inputs elements that are in a disabled state but are enabled when those events
            // are triggered.
            $timeout(function() {
                var element = $window.document.getElementById(id);
                if (element)
                    element.focus();
            }, 1000);
        };
    });
