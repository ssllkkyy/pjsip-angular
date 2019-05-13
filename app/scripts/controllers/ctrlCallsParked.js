'use strict';

proySymphony.controller('CallsParkedCtrl', function($scope, $rootScope, $filter, $q, callService, contactService, usefulTools, dataFactory) {

    $scope.iconCallParking = '../images/icons/park-icon-transparent.png';
    $scope.iconPhonePickup = '../images/icons/phone-green-pickup-512.png';

    var initialLoad = true;

    const domain_name = $rootScope.user.domain.domain_name;    

    callService.showCallParkingIconLoading = false;
    $scope.showCallParkingIconLoading = callService.showCallParkingIconLoading;
    $scope.$watch(function () {
        return callService.showCallParkingIconLoading;
        }, function (newVal) {
            $scope.showCallParkingIconLoading = newVal;
        }
    );

    // watch showLoaderLine
    callService.showLoaderLine = false;
    $scope.showLoaderLine = callService.showLoaderLine;
    $scope.$watch(function () {
        return callService.showLoaderLine;
        }, function (newVal) {
            $scope.showLoaderLine = newVal;
        }
    );

    // watch callsParkedCount
    callService.callsParkedCount = 0;
    $scope.callsParkedCount = callService.callsParkedCount;
    $scope.$watch(function () {
        return callService.callsParkedCount;
        }, function (newVal) {
            $scope.callsParkedCount = newVal;
        }
    );

    // watch reLoadParkedCalls
    $scope.$watch(function () {
        return callService.reLoadParkedCalls;
        }, function (newVal) {
            if (newVal) {
                loadParkedCalls();
            }
        }
    );

    callService.callParkInitiated = false;
    
    $scope.showingCallsParked = false;
    $scope.tooltipParkedLoading = "Loading Parked Call Info...";
    $scope.tooltipUnParkCall = "Click to pick up this call.";
    $scope.callsParked = [];
    $scope.hasLocalStorage = true;
    if (typeof(Storage) !== "undefined") {
        $scope.hasLocalStorage = true;
    } else {
        // Sorry! No Web Storage support..
        $scope.hasLocalStorage = false;
        console.error("BROWSER DOES NOT SUPPORT LOCAL STORAGE (hasLocalStorage = false)");
    }
    function formatPhoneNumber(s) {
        var s2 = (""+s).replace(/\D/g, '');
        var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
        return (!m) ? null : "(" + m[1] + ") " + m[2] + "-" + m[3];
    }

    // *****************************************************************
    // *****************    COUNT OF PARKED CALLS **********************
    function getParkedCallsCount() {
        if ($scope.hasLocalStorage) { 
            return localStorage.getItem("callService.callsParkedCount");
        } else {
             return $scope.parkedExtsCount;
        }        
    }
    function setParkedCallsCount(val) {
        if ($scope.hasLocalStorage) { 
            localStorage.setItem("callService.callsParkedCount", val);
            callService.callsParkedCount = parseInt(localStorage.getItem("callService.callsParkedCount"));

        } else {
             $scope.parkedExtsCount = val;
             callService.callsParkedCount = $scope.parkedExtsCount;
        }        
        reactToCallCount();
        
    }

    function decrementParkedCallsCount() { setParkedCallsCount(getParkedCallsCount() - 1);}
    function incrementParkedCallsCount() { setParkedCallsCount(getParkedCallsCount() + 1);}
    if (!getParkedCallsCount()) {setParkedCallsCount(0);}
    callService.callsParkedCount = getParkedCallsCount();

    function reactToCallCount() {

        var count = callService.callsParkedCount;

        $scope.callsParkedTableHeader = "There are no parked calls.";
        $scope.showPhoto = false;            

        if (count > 0) {
            $scope.showingCallsParked = true;
            $scope.showPhoto = true;            

            if (count === 1) {
                // RACE CONDITION, leaving this way for now:
                // $scope.callsParkedTableHeader = "There are " + count + " parked calls.";
                $scope.callsParkedTableHeader = "There is " + count + " parked call.";                
            } else {
                $scope.callsParkedTableHeader = "There are " + count + " parked calls.";
            }
        } else {
            // $scope.hideCallsParked();
            $scope.showingCallsParked = false;
        }
        $scope.tooltipParked = $scope.callsParkedTableHeader;

        if (!callService.callParkInitiated) {
            if (callService.callParkInitiatedCallsParkedCount && 
                (callService.callParkInitiatedCallsParkedCount === callService.callsParkedCount)) {
                    callService.showCallParkingIconLoading = false;
                    callService.showLoaderLine = false;
                    callService.callParkInitiatedCallsParkedCount = callService.callsParkedCount;
                }
        }

        

    }
    // *****************   END COUNT OF PARKED CALLS **********************
    // ********************************************************************


    // MAKE A CALL
    $scope.callExtension = function (callNumber) {
        //callService.makeCall(callNumber);
        callService.unparkSpot(callNumber);
        decrementParkedCallsCount();
    };

    if (initialLoad) {
        reactToCallCount();
    }


    // GET CALLS
    function asyncGetCallsForDomainParked() {
        $scope.querySentAsyncGetCallsForDomainParked = true;

        console.debug("** START PROMISE: GetCallsForDomainParked::Domain = " + domain_name);
        return function () {
            var defer = $q.defer();
            setTimeout(function() {
                dataFactory.getCallsForDomainParked(domain_name).then(function(data){
                    defer.resolve(data);
                    $scope.querySentAsyncGetCallsForDomainParked = false;
                });
            }, 1000);
            return defer.promise;
        };        
    }

    // LOAD PARKED CALLS
    function loadParkedCalls() { 
        callService.reLoadParkedCalls = false;
        $scope.promiseGetCallsForDomainParked = asyncGetCallsForDomainParked();
        $scope.promiseGetCallsForDomainParked().then(function(response) {
            console.debug("%%%%% PROMISE RETURNED: GetCallsForDomainParked");
    
            if (response && response.data && response.data.success && response.data.success.data) {
                var serverCallsParked = response.data.success.data;

                if (!serverCallsParked || serverCallsParked.length === 0) {
                    console.debug("--- NO PARKED CALLS ---");
                    setParkedCallsCount(0);
                    callService.callsParkedCount = 0;
                    $scope.callsParked = [];
                } else {
                    var tmpCallsParkedCount = 0;
                    serverCallsParked.forEach(function (serverParkedCall) {
                        
console.log(serverParkedCall);
                        // valet_park:park@qa-kotter-test.qa.kotter.net
                        console.log(serverParkedCall.dest);
                        var loc = serverParkedCall.dest.split(",");
                        console.log(loc);
                        var valet_park = loc.pop().split(" ");
                        console.log(valet_park);
                        var parkedCallDomainName = valet_park[0].split("@")[1]; 
                        console.log(parkedCallDomainName);
                        if (parkedCallDomainName !== domain_name) {
                            // console.debug("park:skipping, since wrong domain of: " + parkedCallDomainName);
                            // console.debug("park: WRONG AGENCY: serverParkedCall: " + JSON.stringify(serverParkedCall));

                            return; // skips to the next iteration of forEach (does not exit function)
                        } else {
                            tmpCallsParkedCount += 1;
                            // console.debug("park:continue, since correct domain of: " + parkedCallDomainName);
                        }
                        // console.debug("park: MY AGENCY: serverParkedCall: " + JSON.stringify(serverParkedCall));

                        var parked_call_uuid = serverParkedCall.uuid;
                        var parked_at = valet_park[1];
                        var parked_by = serverParkedCall.callee_name;
                        var caller = serverParkedCall.cid_name;
                        var number = serverParkedCall.cid_num;
                        var avatar1 = './images/icons/avatar-default.png';

                        // If it's a phone number, format it
                        if ((caller.length === 10) && (/^\d+$/.test(caller))) {
                            // caller = "number";
                            caller = formatPhoneNumber(caller);
                        } 

                        var lookupNumber = usefulTools.cleanPhoneNumber(number);
                        var contact = contactService.getContactByPhoneNumber(lookupNumber);
                        if (contact && contact.cuuid) {
                            if (contact.im) {
                                avatar1 = $rootScope.pathImgProfile + contact.im;
                                $scope.showPhoto = true;
                            }

                            if (contact.name) {
                                caller = contact.name;
                            }
                        } else {
                            $scope.showPhoto = false;
                        }
                        if (!parked_by || parked_by.length < 3 || /^\d+$/.test(parked_by)) {
                            parked_by = 'Unknown';
                        }
                        
                        const newParkedCall = {'parked_call_uuid':parked_call_uuid,  'avatar1':avatar1,'caller':caller,'parked_at':parked_at,'parked_by':parked_by};
                        var addIt = true;
                        
                        $scope.callsParked.forEach(function (parkedCall) {
                            if (parkedCall.parked_call_uuid === parked_call_uuid) {
                                addIt = false;
                            }
                        });

                        if (addIt) {
                            $scope.callsParked.push(newParkedCall);
                            setParkedCallsCount($scope.callsParked.length);
                            callService.callParkInitiated = false;
                            reactToCallCount();
                            callService.showCallParkingIconLoading = false;
                            console.debug("park:PUSHED TO LIST: " + JSON.stringify(newParkedCall));                            
                            console.debug("callService.callsParkedCount: " + callService.callsParkedCount );

                            // repeatUntilFound = false;
                        }
        
                    });
                    if (tmpCallsParkedCount < getParkedCallsCount()) {
                        $scope.callsParked = [];
                    }
                    setParkedCallsCount(tmpCallsParkedCount); 
                }
            } else {
                $scope.callsParked = [];
                setParkedCallsCount(0);
                console.debug("park:response from asyncGetCallsForDomainParked():NO DATA FOUND ");
            }


        }, function(reason) {
            //failed
            $scope.promiseGetCallsForDomainParked = false;

            console.debug('ERROR::promiseGetCallsForDomainParked:asyncGetCallsForDomainParked:ERROR:reason:' + reason);
            $scope.showPhoto = false;
        });        
    }

    if (initialLoad) {
        callService.showLoaderLine = true;
        loadParkedCalls();
        initialLoad = false;
    }
    
    $scope.newParkingEventInProgress = false;
    // @@@@@@@@@@@@@@@@@@@@@@@@@@    EVENT HANDLERS    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    $scope.$on('NewParkingEvent', function () {
        if (!$scope.newParkingEventInProgress) {
            $scope.newParkingEventInProgress = true;
            loadParkedCalls();
            $scope.newParkingEventInProgress = false;
        }

    });

    $scope.$on('HangUpCallEvent', function () {
        console.log('*****  EVENT HANDLER: saw HangUpCallEvent');
        loadParkedCalls();
    });
});