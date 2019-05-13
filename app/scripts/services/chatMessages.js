'use strict';

proySymphony.factory('chatMessages', function($websocket, $rootScope, __env, symphonyConfig,
    $cookies, $interval, _, notificationService, metaService, $timeout) {
    var service = {
        chatSeq: 1,
        eventHandlers: {},
        wsAddress: null,
        dataStream: null,
        responseCallbacks: {}
    };

    service.wsAddress = __env.chatWebsocket ? __env.chatWebsocket : symphonyConfig.chatWebsocket;
    service.dataStream = $websocket(service.wsAddress, null, {
        reconnectIfNotNormalClose: true
    });

    // events: hello, channel_deleted, user_added, direct_added, preference_changed, posted,
    // post_deleted, typing, user_updated, channel_viewed, new_user, post_edited

    service.init = function() {
        service.dataStream.onOpen(onOpen);
        service.dataStream.onClose(onClose);
        service.dataStream.onError(onError);
        service.dataStream.onMessage(service.onMessage);
        service.mmWebsocketAlive = $interval(function() {
            keepAlive();
        }, 30000);
    };

    service.sendMessage = function(action, data, responseCallback) {
        var msg = {
            action: action,
            seq: service.chatSeq++,
            data: data
        };
        if (responseCallback) {
            service.responseCallbacks[msg.seq] = responseCallback;
        }
        service.dataStream.send(JSON.stringify(msg));
    };

    function startHeartbeat() {
        console.log("STARTING HEARTBEAT");
        var responseTimeoutInSecs = 10;
        var heartbeatTimeoutInSecs = 10;
        var heartbeatTimeout = $timeout(function() {
            console.log("shii creg");
            // debugger;
        }, responseTimeoutInSecs * 1000);

        function callback(message) {
            $timeout.cancel(heartbeatTimeout);
            $timeout(function() {
                startHeartbeat();
            }, heartbeatTimeoutInSecs * 1000);
        };
        service.sendMessage("get_statuses", null, callback);
    }

    service.registerEventHandler = function(eventName, handler) {
        if (!service.eventHandlers[eventName]) {
            service.eventHandlers[eventName] = {
                handlers: []
            };
        }
        service.eventHandlers[eventName].handlers.push(handler);
    };

    service.onMessage = function(message) {
        var data = JSON.parse(message.data);
        var eventName = data.event;
        var eventHandlerInfo = service.eventHandlers[eventName];
        if (eventHandlerInfo) {
            var handlers = eventHandlerInfo.handlers;
            _.forEach(handlers, callHandlerConstructor(data.broadcast, data.data));
        }
        var callback = service.responseCallbacks[data.seq_reply];
        if (callback) {
            callback(message);
        }
        if (data.status == 'FAIL') {
            sendChallenge();
        }
    };

    // Event Registrations

    service.openSocket = function() {
        service.dataStream = $websocket(service.wsAddress, null, {
            reconnectIfNotNormalClose: true
        });
    };

    service.closeSocket = function(final) {
        if (__env.enableDebug) console.log("Closing socket");
        service.dataStream.close();
        if (final) {
            // service.dataStream.socket.close(1000, "Client closed socket"); 
        } else {
            //service.dataStream.socket.close();
        }

    };

    // Private Functions
    function callHandlerConstructor(broadcast, data) {
        return function(handler) {
            handler(broadcast, data);
        };
    };

    function sendChallenge() {
        var challenge = {
            "seq": service.chatSeq++,
            "action": "authentication_challenge",
            "data": {
                "token": $cookies.get('accessToken')
            }
        };
        service.dataStream.send(JSON.stringify(challenge));
    }

    function keepAlive() {
        var data = {
            "seq": service.chatSeq++,
            "action": "get_statuses",
            "data": null
        };
        service.dataStream.send(JSON.stringify(data));
    }

    function onOpen(result) {
        // if(__env.enableDebug) console.log("WEBSOCKET HAS BEEN OPENED TO MATTERMOST SERVER "+JSON.stringify(result));
        // if(__env.enableDebug) console.log("CHAT WEBSOCKET READYSTATE");
        // if(__env.enableDebug) console.log(service.dataStream.readyState);
        sendChallenge();
    };

    function onClose(result) {
        // if(__env.enableDebug) console.log("WEBSOCKET HAS BEEN CLOSED TO MATTERMOST SERVER "+JSON.stringify(result));
        // if(__env.enableDebug) console.log("WEBSOCKET READYSTATE");
        // if(__env.enableDebug) console.log(service.dataStream.readyState);
        if (!$rootScope.user) service.closeSocket(true);
    };

    function onError(result) {
        if (__env.enableDebug) console.log(
            "WEBSOCKET HASEXPERIENCE AN ERROR WITH MATTERMOST SERVER " + JSON.stringify(
                result));
        if (__env.enableDebug) console.log("CHAT WEBSOCKET READYSTATE");
        if (__env.enableDebug) console.log(service.dataStream.readyState);
        sendChallenge();
    };
    metaService.registerOnRootScopeUserLoadCallback(function() {
        service.init();
    });
    return service;
});
