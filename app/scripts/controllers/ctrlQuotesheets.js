'use strict';

proySymphony.controller('QuotesheetsCtrl', function($scope, $window, $rootScope, quoteSheetService,
    userService, $location, $routeParams, fileService, $timeout, locationService, $cookies, routeService, $mdDialog) {


    if (__env.developingQuoteSheets || userService.isKotterTechOrGreater()) {}

    // PRIVATE
    var qss = quoteSheetService;
    $scope.statesUS = $rootScope.usStates;

    function init() {
        if (hasUrlParams()) {
            handleUrlParams();
        };

        if (qss.quotes.length === 0) {
            qss.registerEventCallback('onAfterInit', handleUrlParamActions);
        } else {
            handleUrlParamActions();
        }
    }

    $scope.isManager = function() {
        if ($scope.selectorLocUuid && locationService.locationGroups) {
            var currentLoc = locationService.locationGroups[$scope.selectorLocUuid];

            function isManagerOfLocation(loc) {
                function isMatch(manager) {
                    return manager.user_uuid === $rootScope.user.id;
                }
                return _.some(loc.managers, isMatch) || locationService.isAdminGroupOrGreater();
            };
            return isManagerOfLocation(currentLoc);
        }
        return false;
    };

    function hasUrlParams() {
        return Object.keys($location.search()).length > 0;
    };

    function handleUrlParams() {
        $scope.urlParams = angular.copy($location.search(), {});

        function clearUrlParams() {
            var params = Object.keys($scope.urlParams);
            _.forEach(params, function(param) {
                $location.search(param, null);
            });
        };
        // clearUrlParams();
    }

    function passingRule(rule) {
        return Boolean(rule($scope));
    };

    function handleFnColl(fnColl, args) {
        fnColl.forEach(function(fn) {
            fn($scope, args);
        });
    };

    function handleFnCollColl(fnCollColl, args) {
        fnCollColl.forEach(function(fnColl) {
            if (fnColl) {
                handleFnColl(fnColl, args);
            }
        });
    }

    function getArgsObj(args, baseObj) {
        if (!args) {
            args = baseObj;
        } else {
            args = _.merge(args, baseObj);
        };
        return args;
    };

    routeService.registerRouteChangeCallback(
        "routeChangeStart",
        "before",
        handleLocationChangeStartEvent
    );

    function transition(newStateName, args) {
        if ($scope.skipNextTransition) {
            $scope.skipNextTransition = false;
            return;
        };
        var transition;
        args = getArgsObj(args, {
            newStateName: newStateName
        });

        var prevState = $scope.states[$scope.currentState];
        var newState = $scope.states[newStateName];
        if ($scope.currentState !== newStateName) {
            var rules = prevState.rules[newStateName] || [];
            var transitionFns = prevState.transitions[newStateName];
            var awayFromFns = prevState.awayFrom;
            var toFns = newState.toState;
            if (_.every(rules, passingRule)) {
                $scope.currentState = newStateName;
                handleFnCollColl([toFns, transitionFns, awayFromFns], args);
            }
        }
    };

    function promptForCallFlowLeave(onConfirm) {
        var title = "Alert";
        var content = 'You have not saved your progress. ' +
        'Are you sure you want to leave?';
        var confirmDelete = $mdDialog.confirm()
            .title(title)
            .textContent(content)
            .ariaLabel("Cancel")
            .ok("Yes")
            .cancel("Never Mind");
        return $mdDialog.show(confirmDelete).then(onConfirm);
    };


    function handleLocationChangeStartEvent(event, onConfirm) {
        if($scope.currentState == 'newQuote' && event.preventDefault)
        {
            event.preventDefault();
            var targetPath = $location.path();
            var targetSearch = $location.search();
            var targetHash = $location.hash();
            $scope.currentState = 'quoteHistory';
            return promptForCallFlowLeave(onConfirm);
        }
        return null;
    }

    function registerTransition(startState, endState, transitionFn) {
        var transitions = $scope.states[startState].transitions;
        if (!transitions[endState]) {
            transitions[endState] = [];
        };
        transitions[endState].push(transitionFn);
    };

    function registerTransitionRule(startState, endState, ruleFn) {
        $scope.states[startState].rules[endState].push(ruleFn);
    };

    function registerAwayFromFn(state, awayFn) {
        $scope.states[state].awayFrom.push(awayFn);
    };

    function registerToStateFn(state, toFn) {
        $scope.states[state].toState.push(toFn); 
    }; 

    function registerNewState(stateName, opts) {
        var stateObj = {
            rules: {},
            transitions: {},
            awayFrom: [],
            toState: []
        };
        if (_.isNumber(opts.mdTabIndex)) {
            stateObj.mdTabIndex = opts.mdTabIndex;
        };
        if (!$scope.states) {
            $scope.states = {};
        };
        $scope.states[stateName] = stateObj;
    };

    $scope.currentState = 'quoteHistory'; 

    registerNewState('quoteHistory', { mdTabIndex: 0 });
    registerNewState('newQuote', { mdTabIndex: 1 });
    registerNewState('editingQuote', { mdTabIndex: 1 });
    registerNewState('newTemplate', { mdTabIndex: 2 });
    registerNewState('editingTemplate', { mdTabIndex: 2 });
    registerNewState('templatePreview', { mdTabIndex: 3 });

    registerToStateFn('quoteHistory', function() {
        $scope.activeTabIndex = 0;
    });
    registerToStateFn('newQuote', function() {
        $scope.activeTabIndex = 1;
    });
    registerToStateFn('editingQuote', function() {
        $scope.activeTabIndex = 1;
        $scope.skipNextTransition = true;
    });
    registerToStateFn('newTemplate', function() {
        $scope.activeTabIndex = 2;
    });
    registerToStateFn('editingTemplate', function() {
        $scope.activeTabIndex = 2;
        $scope.skipNextTransition = true;
    });

    $scope.getStateNameByMdTabIndex = function(mdTabIndex) {
        var state;
        var stateKey;
        var stateKeys = Object.keys($scope.states);
        for (var i = 0; i < stateKeys.length; i++) {
            stateKey = stateKeys[i];
            state = $scope.states[stateKey];
            if (state.mdTabIndex === mdTabIndex) {
                return Object.keys($scope.states)[i];
            }
        };
        return null;
    };

    $scope.isCurrentState = function(state) {
        return $scope.currentState === state;
    };

    $scope.$watch('activeTabIndex', function(newVal, oldVal) {
        var newState = $scope.getStateNameByMdTabIndex(newVal);
        if (newState) {
            transition(newState);
        }
    });

    // For Directives
    $scope.transitionFns = {
        transition: transition,
        registerTransition: registerTransition,
        registerTransitionRule: registerTransitionRule,
        registerAwayFromFn: registerAwayFromFn
    };

    $scope.editingQuote = null;

    $scope.setEditingQuote = function(quote) {
        function whenReady() {
            qss.loadQuoteAnswers(quote).then(function(response) {
                if (response) {
                    $scope.editingQuote = quote;
                    transition('editingQuote');
                }
            });
        }
        if (!quote.template) {
            qss.loadTemplate(quote)
                .then(function(response) {
                    if (response) {
                        whenReady();
                    } else {
                        var message = "There was a problem retrieving the Quote Sheet. The template associated with this Quote Sheet was not found.";
                        $rootScope.showErrorAlert(message);
                    }
                });
        } else {
            whenReady();
        }
    };

    $scope.setEditingTemplate = function(template) {
        $scope.templateObj.template = template;
        transition('editingTemplate');
    };

    $scope.editingTemplateObj = {
        editingTemplate: function() {
            return false;
        }
    };
    $scope.templateObj = {
        template: {}
    };

    $scope.onLocationChange = function(locationUuid) {
        qss.setCurrentLocationUuid(locationUuid);
    };

    qss.registerEventCallback('onAfterInit', function() {
        $scope.selectorLocUuid = qss.currentLocationUuid;
    });

    var path = $location.path();
    var isQuoteView = path.indexOf('quote-view') > -1;
    if (isQuoteView) {
        $scope.openQuotePdf = function() {
            $scope.fileViewLoading = true;
            var linkHash = $routeParams.linkhash;
            var data = {
                file_view_hash: linkHash
            };
            qss.getQuoteSheetPdf(data).then(function(response) {
                if (response.status === 200) {
                    var data = response.data;
                    fileService.openByteArray(data);
                    onAfterAttempt();
                } else {
                    onAfterAttempt();
                    showFileViewErrorAlert();
                }
            }, function(response) {
                onAfterAttempt();
                showFileViewErrorAlert();
            });
        };

        function onAfterAttempt() {
            $scope.fileViewLoading = false;
            $scope.fileViewPass = '';
        };

        function showFileViewErrorAlert() {
            var message = "The password provided was incorrect. " +
                "Either the password you entered was not the one given to you by the associated " +
                "Bridge user or the password given to you has expired. " +
                "Please contact the Bridge user that gave you this link and ask them for" +
                " the updated password";
            $rootScope.showErrorAlert(message);
        }
    }

    function handleUrlParamActions() {
        if ($scope.urlParams && $scope.urlParams.quoteUuid) {
            var quote = qss.findQuoteByUuid($scope.urlParams.quoteUuid);
            if (quote) {
                $scope.setEditingQuote(quote);
            }
        }

    }

    init();
});