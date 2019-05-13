'use strict';

proySymphony.service('resourceFrameworkService', function(_, metaService, usefulTools) {
    var service = {
        handlerFns: {},
        httpCallsInProgress: {},
        missingDepRequests: {}
    };

    service.getResourceFnForService = function(foreignData) {
        return function(data) {
            if (foreignData.serviceName && !service.httpCallsInProgress[foreignData
                    .serviceName]) {
                service.httpCallsInProgress[foreignData.serviceName] = [];
            }
            data.service = foreignData.service;
            data.serviceName = foreignData.serviceName;
            data.docTarget = foreignData.docTarget;
            return service.getResourceFn(data);
        };
    };

    service.getResourceFn = function(data) {
        if (data.doc) {
            data.docTarget[first(data.doc).key] = first(data.doc).obj;
        };

        function requestHandler(requestData) {
            if (requestData && requestData.alterHandlerData) {
                requestData = requestData.alterHandlerData(data.handlerData);
            }
            var handlerData = _.clone(data.handlerData);
            handlerData = _.merge(handlerData, data.alterHandlerData);

            angular.copy({}, data.alterHandlerData);
            handlerData.service = data.service;
            handlerData.serviceName = data.serviceName;
            if (handlerData.resourceName) {
                attachRefreshTrigger(handlerData);
                attachRelationsInfoToHandlerData(handlerData);
            }

            handlerData.requestData = requestData;
            if (handlerData.attachToParent) {
                handleAttachToParentBeforeRequest(handlerData);
            };
            if (handlerData.attachResourceAsTarget) {
                attachResourceAsTarget(handlerData, handlerData.attachResourceAsTarget);
            };
            if (handlerData.onBeforeHandle) {
                handlerData.onBeforeHandle(handlerData);
            };

            function runHttpCall() {
                var apiFn = handlerData.substitueApiFn ? handlerData.substitueApiFn : data.apiFn;
                var fn = apiFn;
                if (handlerData.spread) {
                    fn = function() {
                        return _.spread(apiFn)(handlerData.requestData);
                    };
                }
                return fn(handlerData.requestData)
                    .then(getResourceResponseHandler(handlerData), dataError);
            };
            if (handlerData.abort) {
                return new Promise(function(resolve) {
                    resolve(false);
                });
            } else if (handlerData.serviceName) {
                handlerData.apiFn = data.apiFn;
                var existingHttpCall = existingHttpCallInProgress(handlerData);
                if (!existingHttpCall) {
                    addHttpCallInProgressData(handlerData, data);
                    return runHttpCall();
                } else {
                    return new Promise(function(resolve) {
                        if (!existingHttpCall.requests) {
                            existingHttpCall.requests = [];
                        }
                        existingHttpCall.requests.push(resolve);
                    });
                }
            } else {
                return runHttpCall();
            }
        };
        data.alterHandlerData = {};
        Object.defineProperties(requestHandler, {
            alterHandlerData: {
                get: function() {
                    return data.alterHandlerData;
                }
            }
        });
        Object.seal(requestHandler);
        return requestHandler;
    };

    service.registerResourceHandleType = function(type, handlerFn) {
        service.handlerFns[type] = handlerFn;
    };

    service.registerResourceChangeCallbackFn = function(data) {
        var callbackCollName = data.resourceName + 'ChangeCallbacks';
        var callbackColl = data.service[callbackCollName];
        if (!callbackColl) {
            data.service[callbackCollName] = [];
            callbackColl = data.service[callbackCollName];
        }
        callbackColl.push(function() {
            if (data.scope && data.scope.$evalAsync) {
                data.scope.$evalAsync(function() {
                    data.callback(data.service);
                });
            } else {
                data.callback(data.service);
            }
        });
    };

    service.registerResourceRefreshCallback = function(data) {
        function register(data) {
            service.registerResourceChangeCallbackFn({
                service: data.service,
                resourceName: data.resourceName,
                callback: function() {
                    var scopeResourceName = data.scopeResourceName ?
                        data.scopeResourceName : data.resourceName;
                    data.scope[scopeResourceName] = data.service[data.serviceResourceName];
                    if (data.onAfterRefresh) { data.onAfterRefresh(); };
                },
                scope: data.scope
            });
        }
        if (_.isArray(data.resourceName)) {
            data.resourceName.forEach(function(resourceName) {
                register({
                    service: data.service,
                    resourceName: resourceName,
                    scopeResourceName: data.scopeResourceName,
                    serviceResourceName: data.serviceResourceName,
                    scope: data.scope,
                    onAfterRefresh: data.onAfterRefresh
                });
            });
        } else {
            register(data);
        }
    };

    service.registerResourceRefreshCallbackColl = function(data) {
        _.forEach(data.coll, function(resourceData) {
            service.registerResourceRefreshCallback({
                service: data.service,
                resourceName: resourceData.resourceName,
                scope: data.scope,
                serviceResourceName: resourceData.serviceResourceName
            });
        });
    };

    service.getResourceRefreshRegister = function(data) {
        return function(resourceData) {
            var scopeResourceName = resourceData.scopeResourceName || resourceData.resourceName;
            var serviceResourceName = resourceData.serviceResourceName || resourceData.resourceName;
            resourceData.serviceResourceName = serviceResourceName;
            if (!resourceData.attachType || resourceData.attachType === 'assign') {
                data.scope[scopeResourceName] = data.service[serviceResourceName];
            } else if (resourceData.attachType === 'copy') {
                angular.copy(data.service[serviceResourceName], data.scope[scopeResourceName]);
            }
            if (resourceData.onAfterRefresh) { resourceData.onAfterRefresh(); };
            resourceData.service = data.service;
            resourceData.scope = data.scope;
            service.registerResourceRefreshCallback(resourceData);
        };
    };

    service.addResourceDependencyRegister = function(foreignService) {
        foreignService.registerResourceDependency = function(registrationData) {
            var scope = registrationData.scope;
            var targetName = registrationData.targetName;
            var attachName = registrationData.attachName;
            var data = {
                service: foreignService,
                scope: scope
            };
            var refreshRegisterFn = service.getResourceRefreshRegister(data);
            var isDerivedResource = foreignService.derivedValsSpec &&
                foreignService.derivedValsSpec[targetName];
            var resourceName = isDerivedResource ?
                foreignService.derivedValsSpec[targetName][1] :
                targetName;
            data = {
                resourceName: resourceName,
                serviceResourceName: targetName,
                attachType: registrationData.attachType,
                scopeResourceName: attachName,
                onAfterRefresh: registrationData.onAfterRefresh
            };
            refreshRegisterFn(data);
        };
        foreignService.registerResourceDependencies = function(deps) {
            deps.forEach(function(dep) {
                foreignService.registerResourceDependency(dep);
            });
        };
    };

    service.triggerResourceChangeCallback = function(data) {
        var callbackCollName = data.resourceName + 'ChangeCallbacks';
        var callbackColl = data.service[callbackCollName];
        if (callbackColl) {
            metaService.performCallbackCollection(callbackColl, data.service);
        }
    };

    service.registerResourceDerivableFns = function(data) {
        _.forEach(data.derivable, function(property) {
            var resourceColl = data.service[property];
            if (resourceColl) {
                var derivableFnName = 'derived' + _.capitalize(property);
                data.service[derivableFnName] = function(derivationSpec) {
                    var coll = resourceColl;
                    if (coll.isUneditableArray) {
                        coll = coll.resources;
                    }
                    if (derivationSpec.filter) {
                        coll = usefulTools.filterWhere(coll, derivationSpec
                            .filter);
                    }
                    if (derivationSpec.group) {
                        coll = usefulTools.multiGroupBy(
                            coll, derivationSpec.group.fields,
                            "unassigned"
                        );
                    }
                    if (derivationSpec.map) {
                        if (_.isString(derivationSpec.map)) {
                            coll = coll.map(function(item) {
                                return item[derivationSpec.map];
                            });
                        } else if (_.isFunction(derivationSpec.map)) {
                            coll = coll.map(derivationSpec.map);
                        } else if (_.isArray(derivationSpec.map)) {
                            coll = coll.map(function(item) {
                                return _.pick(item, derivationSpec.map);
                            });
                        }
                    }
                    if (derivationSpec.toObj) {
                        if (derivationSpec.toObj.prop) {
                            coll = usefulTools.arrayToObjectByProp(coll,
                                derivationSpec.toObj.prop);
                        } else if (derivationSpec.toObj.props) {
                            coll = usefulTools.arrayToObjectByProps(coll,
                                derivationSpec.toObj.props);
                        }
                    }
                    return coll;
                };
            }
        });
    };

    service.registerFunctionCollOnScope = function(scope, fnColl) {
        if (_.isArray(fnColl)) {
            // fnColl.forEach(function(fn) {  // don't use this, it doesn't minify correctly
            //     scope[fn.name] = fn;
            // });
        } else if (_.isPlainObject(fnColl)) {
            Object.keys(fnColl).forEach(function(fnName) {
                scope[fnName] = fnColl[fnName];
            });
        } else if (_.isFunction(fnColl)) {
            service.registerFunctionCollOnScope(scope, fnColl(scope));
        }
    };

    service.wrapFullResponseRestFn = function(fn) {
        return function() {
            return _.spread(fn)(arguments).then(retrieveResourceResponseReturnVal);
        };
    };

    // Registrations
    service.registerResourceHandleType('noop', function(resource, handlerData) {
        return handlerData.noopReturnVal ? handlerData.noopReturnVal : resource;
    });

    service.registerResourceHandleType(
        'object',
        function(resource, handlerData) {
            handlerData.target[resource[handlerData.propertyName]] = resource;
            return resource;
        });

    service.registerResourceHandleType(
        'array>object',
        function(resource, handlerData) {
            arrayToObject(resource, handlerData.target, handlerData.propertyName);
            return resource;
        });

    service.registerResourceHandleType('push', function(resource, handlerData) {
        handlerData.target.push(resource);
        return resource;
    });

    service.registerResourceHandleType('assign', function(resource, handlerData) {
        handlerData.target = resource;
    });

    service.registerResourceHandleType('copy', function(resource, handlerData) {
        angular.copy(resource, handlerData.target);
        handlerData.targetIsResource = true;
        return handlerData.target;
    });

    service.registerResourceHandleType('inPlaceReplaceColl', function(resource, handlerData) {
        var coll = handlerData.target;
        if (_.isPlainObject(coll)) {
            // for later
        } else if (_.isArray(coll)) {
            _.remove(coll, Boolean);
            resource.forEach(function(item) {
                coll.push(item);
            });
        }
        handlerData.targetIsResource = true;
        return handlerData.target;
    });

    service.registerResourceHandleType('replace', function(resource, handlerData) {
        var coll = handlerData.service[handlerData.resourceName];
        if (_.isPlainObject(coll)) {
            handlerData.target = coll[resource[handlerData.propertyName]];
        } else if (_.isArray(coll)) {
            handlerData.target = _.find(coll, function(item) {
                return item[handlerData.propertyName] === resource[
                    handlerData.propertyName];
            });
        }
        angular.copy(resource, handlerData.target);
        handlerData.targetIsResource = true;
        return handlerData.target;
    });

    service.registerResourceHandleType('remove', function(resource, handlerData) {
        var coll = handlerData.target;
        if (_.isPlainObject(coll)) {
            delete handlerData.target[resource[handlerData.propertyName]];
        } else if (_.isArray(coll)) {
            _.remove(handlerData.target, function(item) {
                return item[handlerData.propertyName] === resource[
                    handlerData.propertyName];
            });
        }
        handlerData.target = resource;
        return handlerData.target;
    });

    service.registerResourceHandleType('attach', function(resource, handlerData) {
        var attachData = handlerData.attachToParent;
        var parent = handlerData.originalRequestData ?
            handlerData.originalRequestData :
            handlerData.requestData;
        var resourcePropName = attachData.resourcePropName;
        parent[resourcePropName] = resource;
        if (handlerData.target) {
            handlerData.target = parent[resourcePropName];
            return handlerData.target;
        }
        return parent;
    });

    service.registerResourceHandleType('delete', function(resource, handlerData) {
        var coll = handlerData.target;
        var resourceUuid = resource[handlerData.propertyName];
        if (_.isPlainObject(handlerData.target) && handlerData.propertyName) {
            if (coll[resourceUuid]) {
                delete coll[resourceUuid];
            }
            return handlerData.target;
        } else if (_.isArray(handlerData.target) && handlerData.propertyName) {
            if (resourceUuid) {
                function isMatchingRecord(record) {
                    return record[handlerData.propertyName] === resourceUuid;
                }
                _.remove(coll, isMatchingRecord);
            }
        }
        return null;
    });

    service.registerResourceRelations = function(service, relations) {
        service.relations = relations;
    };

    service.registerDerivedValFns = function(foreignService, derivedValsInfo) {
        foreignService.derivedValsSpec = {};
        arrayToObject(derivedValsInfo, foreignService.derivedValsSpec, 0);
        derivedValsInfo.map(function(info) {
            return createDerivedValInfo(info[0], info[1], info[2]);
        }).forEach(function(info) {
            attachDerivedVal(
                foreignService, info.propName, info.derivableResourceName,
                info.derivationObj
            );
        });
    };

    service.createDerivedValueGetterFn = function(spec, containerObj) {
        if (!containerObj) {
            containerObj = {};
        }
        var tempDerivations = [spec];
        var tempDerivable = _.uniq(tempDerivations.map(function(derivation) {
            return _.isArray(derivation[1]) ? derivation[1][0] : derivation[
                1];
        }));
        service.registerDerivedValFns(containerObj, tempDerivations);
        service.registerResourceDerivableFns({
            service: containerObj,
            derivable: tempDerivable
        });
        return function() {
            return containerObj[spec[0]];
        };
    };

    // Helper Functions
    service.attachStateFns = attachStateFns;
    service.getStateChangeInterceptRegister = getStateChangeInterceptRegister;

    function attachResourceAsTarget(handlerData, resourceUuidKey) {
        var reqData = handlerData.requestData;
        var resourceUuid = reqData[resourceUuidKey];
        var spec = {};
        spec[resourceUuidKey] = resourceUuid;
        var resource = _.find(handlerData.service[handlerData.resourceName], spec);
        handlerData.target = resource;
    };

    var attachDerivedVal = function(obj, propName, derivableResourceName, derivationObj) {
        var derivableFnName = 'derived' + _.capitalize(derivableResourceName);
        Object.defineProperty(obj, propName, {
            get: function() {
                return this[derivableFnName](derivationObj);
            },
            enumerable: true
        });
    };

    function createDerivedValInfo(propName, derivableResourceName, derivationObj) {
        return {
            propName: propName,
            derivableResourceName: _.isArray(derivableResourceName) ?
                derivableResourceName[0] : derivableResourceName,
            derivationObj: derivationObj
        };
    };

    function handleResourceResponse(data) {
        var additionalRequests;

        function resolveAdditionalRequests(val) {
            if (additionalRequests) {
                additionalRequests.forEach(function(resolve) {
                    resolve(val);
                });
            }
        };
        if (data.serviceName) {
            var existingHttpCall = existingHttpCallInProgress(data);
            if (existingHttpCall) {
                additionalRequests = existingHttpCall.requests;
                removeHttpCallInProgress(data);
            }
        }
        if (data.returnBareResponse) {
            return data.response;
        }
        var success = dataSuccess(data.response);
        var resource = dataResource(data.response, data.sourcePath);
        if (data.useReqDataAsResource) {
            resource = data.requestData;
        }
        if (!resource) {
            resource = true;
        }

        var error = dataError(data.response);
        var onSuccessVal;

        if (success) {
            if (data.dataMapping) {
                resource = data.dataMapping(resource, data);
            };
            var handlerFn = service.handlerFns[data.handleType];
            if (handlerFn && !data.elideHandling) {
                data.returnVal = handlerFn(resource, data);
                handleResourceRelations(data.returnVal, data);
                if (data.attachToParent && data.handleType !== "attach") {
                    handleAttachToParentAfterRequest(resource, data);
                }
                if (data.onSuccess) {
                    onSuccessVal = data.onSuccess(resource, data);
                    var explicitReturnVal = onSuccessVal;
                    if (explicitReturnVal !== undefined && explicitReturnVal !== null) {
                        data.returnVal = explicitReturnVal;
                    }
                };
                resolveAdditionalRequests(data.returnVal);
                if (data.missingDepFn) {
                    var foreignService = data.service;
                    if (service.missingDepRequests[foreignService] &&
                        service.missingDepRequests[foreignService][data.resourceName]) {
                        var foreignServMissingDepReqs = service.missingDepRequests[foreignService];
                        var depRequests = foreignServMissingDepReqs[data.resourceName];
                        depRequests.forEach(function(req) {
                            req(data.returnVal);
                        });
                    }
                }
                return data.returnVal;
            } else {
                return resource;
            }
            error = {
                message: "Could not find matching handleType"
            };
        }

        handleResourceError(data.response, error, data.skipResourceErrorDebug, data);
        resolveAdditionalRequests(false);
        return false;
    };

    function attachRefreshTrigger(handlerData) {
        function refreshTrigger() {
            service.triggerResourceChangeCallback({
                resourceName: handlerData.resourceName,
                service: handlerData.service
            });
        }
        var fns = [refreshTrigger];
        if (handlerData.onSuccess) {
            fns.push({
                toReturn: true,
                fn: handlerData.onSuccess
            });
        }
        handlerData.onSuccess = combineFns(fns);
    };

    function getResourceResponseHandler(data) {
        return function(response) {
            data.response = response;
            return handleResourceResponse(data);
        };
    };

    function attachRelationsInfoToHandlerData(handlerData) {
        var foreignService = handlerData.service;
        if (foreignService && handlerData.resourceName && foreignService.relations) {
            var relations = foreignService.relations[handlerData.resourceName];
            if (relations) {
                handlerData.relations = relations;
            }
        }
        return null;
    };

    function handleResourceRelations(resources, handlerData) {
        if (!_.isArray(resources)) {
            resources = [resources];
        }
        var foreignService = handlerData.service;
        if (foreignService && foreignService.relations && handlerData.resourceName) {
            var subRelations = foreignService.relations[handlerData.resourceName];

            Object.keys(handlerData.service.relations).forEach(function(relationKey) {
                var relationColl = handlerData.service.relations[relationKey];
                if (relationColl) {
                    relationColl.forEach(function(relation) {
                        relation.relationKey = relationKey;
                    });
                }
            });
            var relationVals = Object.values(handlerData.service.relations);
            var relations = _.flatten(relationVals).filter(function(relation) {
                return relation.relationCollName === handlerData.resourceName;
            });
            if (_.isPlainObject(resources)) {
                resources = Object.values(resources);
            }

            function getMatch(resource, relationColl, relationProperty, relationIdProperty) {
                var match;

                function getStringMatch(relationId) {
                    var stringMatch;
                    if (_.isPlainObject(relationColl)) {
                        stringMatch = relationColl[relationProperty];
                    } else if (_.isArray(relationColl)) {
                        stringMatch = _.find(relationColl, function(item) {
                            if (relationId) {
                                return item[relationIdProperty] === relationId;
                            } else {
                                var itemVal = relationIdProperty ?
                                    item[relationIdProperty] :
                                    item[relationProperty];
                                if (_.isArray(itemVal) && _.isString(resource[
                                        relationProperty])) {
                                    // return itemVal.map(function(subItem) {
                                    //     return subItem === resource[relationProperty];
                                    // });
                                    return itemVal.indexOf(resource[
                                        relationProperty]) > -1;
                                } else {
                                    return itemVal === resource[relationProperty];
                                }
                            }
                            return null;
                        });
                    }
                    return stringMatch || relationId;
                };
                if (_.isArray(resource[relationProperty])) {
                    match = resource[relationProperty].map(function(relationId) {
                        return getStringMatch(relationId);
                    });
                } else if (_.isString(resource[relationProperty])) {
                    match = getStringMatch();
                }
                return match;
            }
            resources.forEach(function(resource) {
                if (relations) {
                    relations.forEach(function(relation) {
                        var relationColl = foreignService[relation.relationKey];
                        var match;
                        if (relation.relationIdProperty) {
                            match = getMatch(
                                resource, relationColl,
                                relation.relationIdProperty,
                                relation.relationProperty
                            );
                        } else {
                            match = getMatch(
                                resource, relationColl,
                                relation.relationProperty
                            );
                        }
                        if (match) {
                            if (_.isArray(match[relation.relationName]) &&
                                _.isString(resource[relation.relationIdProperty])
                            ) {
                                match[relation.relationName] = match[
                                        relation.relationProperty]
                                    .map(function(item) {
                                        if (item === resource[relation.relationIdProperty]) {
                                            return resource;
                                        } else {
                                            return item;
                                        }
                                    });
                            } else {
                                match[relation.relationName] = resource;
                            }
                            if (relation.postDepAttachCallbacks) {
                                relation.postDepAttachCallbacks.forEach(
                                    function(cb) {
                                        cb(match);
                                    });
                            }
                        }
                    });
                }
                if (subRelations) {
                    subRelations.forEach(function(relation) {
                        var relationColl = foreignService[relation.relationCollName];
                        var match = getMatch(
                            resource, relationColl,
                            relation.relationProperty, relation.relationIdProperty
                        );
                        resource[relation.relationName] = match;
                        if (match && relation.postDepAttachCallbacks) {
                            relation.postDepAttachCallbacks.forEach(
                                function(cb) {
                                    cb(resource);
                                });
                        }
                    });
                }
            });
        }
    }

    function getResourceFindFn(resourceColl, resourceProp) {
        return function(resourceVal) {
            return findItemFromCollByPropAndVal(
                resourceColl, resourceProp, resourceVal
            );
        };
    };

    function findItemFromCollByPropAndVal(coll, prop, val) {
        function isMatch(item) {
            return item[prop] === val;
        };
        return _.find(coll, isMatch);
    };

    function handleAttachToParentBeforeRequest(handlerData) {
        var attachData = handlerData.attachToParent;
        var parent = handlerData.requestData;
        if (attachData.requestPropName) {
            var requestData = parent[attachData.requestPropName];
            handlerData.originalRequestData = parent;
            handlerData.requestData = requestData;
        }
    };

    function handleAttachToParentAfterRequest(resource, handlerData) {
        if (handlerData.targetIsResource) {
            resource = handlerData.target;
        };
        var parent = handlerData.originalRequestData;
        var resourcePropName = handlerData.attachToParent.resourcePropName;
        parent[resourcePropName] = resource;
    };

    function addHttpCallInProgressData(handlerData, data) {
        service.httpCallsInProgress[handlerData.serviceName].push({
            requestData: handlerData.requestData,
            apiFn: data.apiFn,
            resourceName: handlerData.resourceName
        });
    };

    function removeHttpCallInProgress(handlerData) {
        var serviceName = handlerData.serviceName;
        var requestData = handlerData.requestData;
        var apiFn = handlerData.apiFn;

        function matchingHttpCall(call) {
            return call.requestData === requestData && apiFn === apiFn;
        }
        var httpCalls = service.httpCallsInProgress[serviceName];
        var match = _.remove(httpCalls, matchingHttpCall);
    };

    function existingHttpCallInProgress(handlerData) {
        var serviceName = handlerData.serviceName;
        var requestData = handlerData.requestData;
        var apiFn = handlerData.apiFn;

        function matchingHttpCall(call) {
            return call.requestData === requestData && call.apiFn === apiFn;
        }
        var httpCalls = service.httpCallsInProgress[serviceName];
        var match = _.find(httpCalls, matchingHttpCall);
        return match;
    };

    function combineFns(fns) {
        return function() {
            var args = arguments;
            var returnVal;
            _.forEach(fns, function(fn) {
                if (_.isFunction(fn)) {
                    fn.apply(null, args);
                } else if (fn.toReturn) {
                    returnVal = fn.fn.apply(null, args);
                }
            });
            return returnVal;
        };
    };

    function first(obj) {
        if (_.isPlainObject(obj)) {
            var keys = Object.keys(obj);
            return keys.length > 0 ? {
                key: keys[0],
                obj: obj[keys[0]]
            } : undefined;
        } else if (_.isArray(obj)) {
            return obj[0];
        }
        return undefined;
    };

    function dataSuccess(response) {
        if (response && response.data && response.data.success) {
            return true;
        }
        return false;
    };

    function dataResource(response, sourcePath) {
        if (response && response.data && response.data.success) {
            var data = response.data.success.data !== null ?
                response.data.success.data : response.data.success;
            return sourcePath ? data[sourcePath] : data;
        }
        return null;
    };

    function dataError(response) {
        if (response && response.data && response.data.error) {
            return response.data.error;
        }
        return false;
    };

    function handleResourceError(response, error, skipDebug, handlerData) {
        console.log(response);
        if (error) {
            error.message ? console.warn(error.message) : console.warn(error);
        }
        if (!skipDebug) {
            // debugger;
        }
    };

    function arrayToObject(arr, target, propertyName, preserve) {
        angular.copy({}, target);
        arr.forEach(function(item) {
            if (preserve && target[item[propertyName]]) {
                var currentVal = target[item[propertyName]];
                if (_.isArray(currentVal) && currentVal.atoArr) {
                    currentVal.push(item);
                } else {
                    var atoArr = [target[item[propertyName]], item];
                    atoArr.atoArr = true;
                    target[item[propertyName]] = atoArr;
                }
            } else {
                target[item[propertyName]] = item;
            }
        });
    };

    function retrieveResourceResponseReturnVal(response) {
        return dataSuccess(response) ? dataResource(response) : dataError(response);
    };

    function attachStateFns(obj, fns) {
        fns.forEach(_.partial(asStateFn, obj));
    };

    function asStateFn(obj, stateChangeFnInfo) {
        var stateChangeFnName = stateChangeFnInfo[0];
        var fnBaseName = capitalize(stateChangeFnName);
        var stateChangeFn = stateChangeFnInfo[1];
        var shouldFnName = "shouldIntercept" + fnBaseName;
        var interceptFnName = "intercept" + fnBaseName;
        obj[shouldFnName] = null;
        obj[interceptFnName] = null;
        obj[stateChangeFnName] = function() {
            var args = arguments;
            var shouldIntercept = obj[shouldFnName];
            var interceptFn = obj[interceptFnName];
            if (shouldIntercept && interceptFn) {
                var shouldInterceptResult = shouldIntercept && _.spread(shouldIntercept)
                    (args);
                shouldIntercept = shouldInterceptResult;
                if (shouldIntercept) {
                    var result = interceptFn(shouldInterceptResult);
                    if (result && result.then) {
                        result.then(function(response) {
                            if (response) {
                                _.spread(stateChangeFn)(args);
                            }
                        });
                    }
                } else if (!shouldIntercept) {
                    _.spread(stateChangeFn)(args);
                }
            }
        };
        Object.defineProperty(obj[stateChangeFnName], "name", {
            value: stateChangeFnName
        });
    }

    function handleShouldSpec(spec) {
        if (_.isFunction(spec)) {
            return spec;
        } else if (spec.bool) {
            return function() {
                return Boolean(_.spread(spec.bool)(arguments));
            };
        }
        return null;
    };

    function handleInterceptSpec(spec) {
        return _.isFunction(spec) && spec;
    };

    function getStateChangeInterceptRegister(obj) {
        return function(stateChangeFn, shouldSpec, interceptSpec) {
            var fnName = capitalize(stateChangeFn.name);
            obj["shouldIntercept" + fnName] = handleShouldSpec(shouldSpec);
            obj["intercept" + fnName] = handleInterceptSpec(interceptSpec);
        };
    };

    function capitalize(str) {
        var chars = str.split("");
        chars[0] = chars[0].toUpperCase();
        return chars.join("");
    };

    return service;
});
