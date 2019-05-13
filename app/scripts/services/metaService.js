'use strict';

proySymphony.service('metaService', function($rootScope, usefulTools) {
    var service = {
        scopes: {},
        onRootScopeUserLoadCallbacks: []
    };

    service.registerOnRootScopeUserLoadCallback = function(callback) {
        if ($rootScope.userLoaded) {
            // console.log("RUN CALLBACK");
            service.performCallbackCollection([callback]);
        } else {
            service.onRootScopeUserLoadCallbacks.push(callback);
        }
    };

    service.multiRootScopeOn = function($scope, eventHandlers) {
        var eventName;
        var callbackFn;
        var handler;
        for (var i = 0; i < eventHandlers.length; i++) {
            handler = eventHandlers[i];
            eventName = handler.name;
            callbackFn = handler.fn;
            service.rootScopeOn($scope, eventName, callbackFn);
        };
    };

    service.rootScopeOn = function($scope, eventName, callbackFn) {
        var destroyFn = $rootScope.$on(eventName, callbackFn);
        if (!service.scopes[$scope.id]) {
            handleNewScopeInfo($scope, destroyFn);
        } else {
            service.scopes[$scope.id].destroyFns.push(destroyFn);
        }
    };

    service.multiLocalRootScopeFn = function($scope, fnNames) {
        var fnName;
        for (var i = 0; i < fnNames.length; i++) {
            fnName = fnNames[i];
            service.localRootScopeFn($scope, fnName);
        };
    };

    service.localRootScopeFn = function($scope, fnName) {
        $scope[fnName] = function(val1, val2, val3, val4) {
            if ($rootScope[fnName]) {
                return $rootScope[fnName](val1, val2, val3, val4);
            } else {
                return null;
            }
        };
    };

    service.performCallbackCollection = function(collection, data) {
        function callIfFn(fn) {
            if (_.isFunction(fn)) {
                fn(data);
            }
        }
        collection.forEach(callIfFn);
    };

    service.performCallbackData = function(callbackData, fnData) {
        callbackData.called += 1;
        service.performCallbackCollection(callbackData.callbacks, fnData);
    };

    service.tabIsActive = function() {
        return document.hasFocus();
    };

    service.registerServiceCallbackData = function(data) {
        if (data.triggerIfAlreadyCalled && data.callbackData.called > 0) {
            data.callback(data.service);
        } else {
            data.callbackData.callbacks.push(function(fnData) {
                data.callback(data.service, fnData);
            });
        }
    };

    service.registerServiceCallbackFn = function(service, callbackCollection, callback) {
        callbackCollection.push(function() {
            callback(service);
        });
    };

    service.storageAvailable = function(type) {
        try {
            var storage = window[type],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch (e) {
            return e instanceof DOMException && (
                    // everything except Firefox
                    e.code === 22 ||
                    // Firefox
                    e.code === 1014 ||
                    // test name field too, because code might not be present
                    // everything except Firefox
                    e.name === 'QuotaExceededError' ||
                    // Firefox
                    e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                // acknowledge QuotaExceededError only if there's something already stored
                storage.length !== 0;
        }
    };

    service.withCallbacks = function(foreignService) {
        service.initializeServiceCallbackColls(foreignService);
        service.attachServiceEventRegistrationFns(foreignService);
        return service.getCallbackEventTriggerFn(foreignService);
    };

    service.initializeServiceCallbackColls = function(foreignService, callbackEvents) {
        var fs = foreignService;
        if (!fs.callbacks) {
            fs.callbacks = {};
        };
        if (!callbackEvents) {
            callbackEvents = fs.callbackEvents;
        };
        _.forEach(callbackEvents, function(event) {
            if (event && _.isString(event)) {
                fs.callbacks[event] = {
                    called: 0,
                    callbacks: []
                };
            }
        });
        return fs.callbacks;
    };

    service.attachServiceEventRegistrationFns = function(foreignService, callbackEvents,
        opts) {
        var fs = foreignService;
        if (!callbackEvents) {
            callbackEvents = fs.callbackEvents;
        };
        if (!foreignService.registerEventCallback) {
            foreignService.registerEventCallback =
                service.getServiceEventCallbackRegistrationFn(foreignService);
        }
        _.forEach(callbackEvents, function(event) {
            var fnName = 'register' + usefulTools.capitalize(event) +
                'Callback';
            if (!foreignService[fnName]) {
                foreignService[fnName] = function(callback) {
                    foreignService.registerEventCallback(event, callback,
                        opts);
                };
            }
        });
        return fs.callbacks;
    };

    service.getServiceEventCallbackRegistrationFn = function(foreignService) {
        return function(eventName, callback, opts) {
            var callbackData = foreignService.callbacks[eventName];
            var triggerIfAlreadyCalled = true;
            if (opts && opts[eventName]) {
                var eventOpts = opts[eventName];
                if (Object.keys(eventOpts).indexOf("triggerIfAlreadyCalled") > -1) {
                    triggerIfAlreadyCalled = eventOpts.triggerIfAlreadyCalled;
                }
            }
            service.registerServiceCallbackData({
                service: foreignService,
                triggerIfAlreadyCalled: triggerIfAlreadyCalled,
                callbackData: callbackData,
                callback: callback
            });
        };
    };

    service.triggerCallbackEvent = function(foreignService, eventName, data) {
        service.performCallbackData(foreignService.callbacks[eventName], data);
    };

    service.getCallbackEventTriggerFn = function(foreignService) {
        return function(eventName, data) {
            service.triggerCallbackEvent(foreignService, eventName, data);
        };
    };

    service.getPromiseWithVal = function(val) {
        return new Promise(function(resolve) {
            resolve(val);
        });
    };

    service.stateMachine = function() {
        var main = this;
        this.states = {};
        this.setActiveState = function(stateName) {
            Object.values(main.states).forEach(function(state) {
                state.active = false;
            });
            var state = main.states[stateName];
            if (state) {
                state.active = true;
            }
        };
        this.createState = function(stateName, possibleStates, transitions,
            transitionsTo) {
            main.states[stateName] = {
                possibleStates: possibleStates || [],
                transitions: transitions || {},
                transitionsTo: transitionsTo || [],
                name: stateName
            };
        };
        this.createStates = function(states) {
            states.forEach(function(state) {
                main.createState(
                    state.stateName, state.possibleStates,
                    state.transitions, state.transitionsTo
                );
            });
        };
        this.currentState = function() {
            function stateIsActive(state) {
                return Boolean(state.active);
            }
            return _.find(Object.values(main.states), stateIsActive);
        };
        this.currentStateName = function() {
            var state = main.currentState() || {
                name: null
            };
            return state.name;
        };
        this.currentStateIs = function(stateName) {
            return main.currentStateName() === stateName;
        };

        function isValidTransition(currentState, targetState) {
            return main.states[currentState.name] &&
                main.states[currentState.name].possibleStates.indexOf(targetState.name) >
                -1;
        };
        this.transitionState = function(stateName) {
            if (!main.currentStateIs(stateName)) {
                var currentState = main.currentState();
                var targetState = main.states[stateName];
                if (isValidTransition(currentState, targetState)) {
                    var transitions = currentState.transitions[targetState.name] || [];
                    var toTransitions = targetState.transitionsTo || [];
                    var allTransitions = transitions.concat(toTransitions);
                    allTransitions.forEach(function(transitionFn) {
                        transitionFn(currentState, targetState);
                    });
                    main.setActiveState(targetState.name);
                    // console.log("transitioned to " + targetState.name);
                    return true;
                }
            }
            return false;
        };
    };

    function handleNewScopeInfo($scope, destroyFn) {
        var scopeInfo = service.scopes[$scope.id] = {};
        scopeInfo.destroyFns = [destroyFn];
        $scope.$on('$destroy', function() {
            for (var i = 0; i < scopeInfo.destroyFns.length; i++) {
                scopeInfo.destroyFns[i]();
            }
        });
    }


    return service;
});
