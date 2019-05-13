'use strict';

proySymphony.controller('PublicCtrl', function($scope, $routeParams, $location, $interval, $auth,
    __env, dataFactory, symphonyConfig, $window, $rootScope) {

    console.log("ROUTEPARAMS");
    console.log($routeParams);

    if ($window.localStorage.getItem("openEmail")) {

        var href = $window.localStorage.getItem("openEmail");
        console.log(href);
        $window.open(href);
        $window.localStorage.removeItem("openEmail");
        $window.close();

    } else {

        $scope.showWaitingForVideo = false;
        $scope.showInvalidRoom = false;
        $rootScope.$safeApply = function($scope, fn) {
            fn = fn || function() {};
            if ($scope.$$phase) {
                //don't worry, the value gets set and AngularJS picks up on it...
                fn();
            } else {
                //this will fire to tell angularjs to notice that a change has happened
                //if it is outside of it's own behaviour...
                $scope.$apply(fn);
            }
        };

        $scope.$safeApply($scope, function() {
            //this function is run once the apply process is running or has just finished
        });

        function checkVideoSession(hash) {
            dataFactory.checkVideoSession(hash)
                .then(function(response) {
                    console.log("CHECKING SESSION");
                    console.log(response.data);
                    if (response.data.success && response.data.success.active &&
                        response.data.success.active === 'true') {
                        $scope.showWaitingForVideo = false;
                        $window.location.href = (__env.vcUrl && __env.vcUrl !== '' ?
                            __env.vcUrl : symphonyConfig.vcUrl) + '/?room=' + room;
                    } else {
                        $scope.showWaitingForVideo = true;
                    }
                }, function(error) {
                    $scope.showWaitingForVideo = true;
                });
        }

        //console.log($routeParams.type);
        //Handle Redirects for Video Conferencing
        if ($routeParams.videoroom) {
            $scope.pageTitle = 'Video Conferencing';
            //CHECK IF THE CODE EXISTS ... 
            var room = ($routeParams.videoroom !== null ? $routeParams.videoroom : '000');
            console.log(room);
            if (room === '000') {
                $scope.showInvalidRoom = true;
            } else {
                $scope.showInvalidRoom = false;
                checkVideoSession(room);
                $interval(function() {
                    checkVideoSession(room);
                }, 10000);
            }

        } else if ($routeParams.screenroom) {
            //CHECK IF THE CODE EXISTS ... 
            $scope.pageTitle = 'Screen Sharing';
            var roomid = $routeParams.screenroom;
            $rootScope.roomId = roomid;
            document.getElementById('room-id').value = roomid;
            $scope.screenShareInfo = {};
            $scope.screenShareInfo.source = null;
            $rootScope.roomActive = false;

            $scope.showspinner = function() {
                if ($rootScope.roomActive) {
                    console.log("CHANGE TO FALSE");
                    $rootScope.roomActive = false;
                } else if (!$rootScope.roomActive) {
                    console.log("CHANGE TO TRUE");
                    $rootScope.roomActive = true;
                }
            }
            $scope.roomLocked = true;
            $scope.lockRoom = function(roomid) {
                if ($scope.roomLocked === 'true') {
                    $scope.roomLocked = 'false';
                } else {
                    $scope.roomLocked = 'true';
                }
                var data = {
                    roomid: roomid,
                    lock: $scope.roomLocked
                }
                dataFactory.postLockScreenShareRoom(data);
            }
            $scope.closeRoom = function(roomid) {
                dataFactory.getCloseScreenRoom(roomid);
            }

            $scope.openRoom = function(roomid) {
                disableInputButtons();
                connection.open(roomid, function() {
                    //showRoomURL(connection.sessionid);
                });
            };

            $scope.joinRoom = function(roomid) {
                disableInputButtons();
                console.log($rootScope);
                connection.join(roomid);
            };

            $scope.openOrJoinRoom = function(roomid) {
                disableInputButtons();
                connection.openOrJoin(roomid, function(isRoomExists, roomid) {
                    if (!isRoomExists) {
                        //showRoomURL(roomid);
                    }
                });
            };

            function disableInputButtons() {
                console.log("DISABLING BUTTONS");
                //document.getElementById('open-or-join-room').disabled = true;
                //document.getElementById('open-room').disabled = true;
                //document.getElementById('join-room').disabled = true;
                //document.getElementById('room-id').disabled = true;
                $rootScope.roomActive = true;

            }

            // ..................RTCMultiConnection Code.............

            var connection = new RTCMultiConnection();
            // by default, socket.io server is assumed to be deployed on your own URL
            //connection.socketURL = '/';
            // comment-out below line if you do not have your own socket.io server
            connection.socketURL = 'https://rtcmulticonnection.herokuapp.com:443/';

            connection.socketMessageEvent = 'screen-sharing-demo';
            localStorage.setItem(connection.socketMessageEvent, roomid);
            connection.session = {
                screen: true,
                oneway: true
            };
            connection.sdpConstraints.mandatory = {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: false
            };
            connection.videosContainer = document.getElementById('videos-container');
            connection.onstream = function(event) {
                connection.videosContainer.appendChild(event.mediaElement);
                event.mediaElement.play();
                setTimeout(function() {
                    event.mediaElement.play();
                }, 5000);
            };
            // Using getScreenId.js to capture screen from any domain
            // You do NOT need to deploy Chrome Extension YOUR-Self!!
            connection.getScreenConstraints = function(callback) {
                getScreenConstraints(function(error, screen_constraints) {
                    if (!error) {
                        screen_constraints = connection.modifyScreenConstraints(
                            screen_constraints);
                        callback(error, screen_constraints);
                        return;
                    }
                    throw error;
                });
            };



            // ......................Handling Room-ID................
            //$scope.screenSharingURL = symphonyConfig.symphonyUrl+'/screen-sharing.html';
            $scope.screenSharingURL = (__env.symphonyUrl && __env.symphonyUrl !== '' ?
                    __env.symphonyUrl : symphonyConfig.symphonyUrl) + '/screenshare/' +
                $scope.roomId;
            $scope.showRoomURL = function() {
                var html = '<h2>URL for your room:</h2><br>' + "\n";
                html += '<p><strong>Room ID: ' + $scope.roomId + '</strong></p>' + "\n";
                html += '<p><a href="' + $scope.screenSharingURL + '" target="_blank">' +
                    $scope.screenSharingURL + '</a></p>' + "\n";
                html += '<a class="btn btn-primary btn-lg" href="' + $scope.screenSharingURL +
                    '" target="_blank">Enter Room Now</a>' + "\n";
                console.log(html);
                return $sce.trustAsHtml(html);
            };

            (function() {
                var params = {},
                    r = /([^&=]+)=?([^&]*)/g;

                function d(s) {
                    return decodeURIComponent(s.replace(/\+/g, ' '));
                }
                var match, search = window.location.search;
                while (match = r.exec(search.substring(1)))
                    params[d(match[1])] = d(match[2]);
                window.params = params;
            })();
            //var roomid = '';
            if (localStorage.getItem(connection.socketMessageEvent)) {
                roomid = localStorage.getItem(connection.socketMessageEvent);
            } else {
                roomid = connection.token();
                localStorage.setItem(connection.socketMessageEvent, roomid);
            }
            document.getElementById('room-id').value = roomid;
            //$scope.roomId = roomid;
            document.getElementById('room-id').onkeyup = function() {
                localStorage.setItem(connection.socketMessageEvent, this.value);
            };

            /*  if($rootScope.roomActive && roomid && roomid.length) {
                    document.getElementById('room-id').value = roomid;
                    //$scope.roomId = roomid;
                    console.log("INSIDE FIRST BLOCK");
                    localStorage.setItem(connection.socketMessageEvent, roomid);
                    // auto-join-room
                    (function reCheckRoomPresence() {
                        connection.checkPresence(roomid, function(isRoomExists) {
                            if(isRoomExists) {
                                connection.join(roomid);
                                return;
                            }
                            setTimeout(reCheckRoomPresence, 5000);
                        });
                    })();
                    disableInputButtons();
                }*/
            //console.log(connection);
            dataFactory.getScreenRoom(roomid)
                .then(function(response) {
                    console.log("SCREENROOM");
                    console.log(response);
                    console.log(connection);
                    if (response.data.error) {
                        console.log(response.data.error.message);
                    } else {
                        $scope.screenShareInfo = response.data.success.info;
                        if ($scope.screenShareInfo.screen_source === 'user' || $scope.screenShareInfo
                            .screen_source === null) {
                            if ($auth.isAuthenticated()) {
                                console.log("OPENING ROOM");
                                $scope.openRoom(roomid);
                                $rootScope.roomActive = true;
                                disableInputButtons();
                            } else {
                                var i = 0;
                                (function reCheckRoomPresence() {
                                    connection.checkPresence(roomid, function(
                                        isRoomExists) {
                                        console.log(isRoomExists);
                                        if (isRoomExists) {
                                            console.log("JOINING ROOM");
                                            //disableInputButtons();
                                            $scope.joinRoom(roomid);
                                            if (!$scope.$$phase) $scope.$apply();
                                            return;
                                        } else {
                                            console.log("WAITING " + roomid);
                                            $rootScope.roomActive = false;
                                            if (!$scope.$$phase) $scope.$apply();
                                        }
                                        i++;
                                        setTimeout(reCheckRoomPresence,
                                            5000);
                                    });
                                })();
                            }
                        } else if ($scope.screenShareInfo.screen_source === 'contact') {
                            console.log("WAIT FOR CONTACT TO OPEN ROOM");
                        }






                    }
                }, function(error) {
                    console.log(error);
                });



            $scope.leaveRoom = function() {
                connection.leave();
                $rootScope.roomActive = false;
            }

            $scope.toggleFullscreen = function() {
                if ($scope.fullscreen) {
                    $scope.fullscreen = false;
                } else {
                    $scope.fullscreen = true;
                }
            }


        }
    }
});
