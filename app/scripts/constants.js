"use strict";

(function(window) {
    window.configParams = window.configParams || {};
    var Params = {};
    if (window.__env.environment == 'production') {
        Params = {
            "symphonyUrl": "https://bridge.kotter.net",
            "audioUrl": "https://onescreen.kotter.net",
            "vcUrl": "https://video.kotter.net",
            "ssUrl": "https://myscreen.kotter.net/",
            "vpUrl": "https://proposal.kotter.net/",
            "onescreenUrl": "https://onescreen.kotter.net",
            "chatUrl": "https://chat.kotter.net/api/v4",
            "chatWebsocket": "wss://chat.kotter.net/api/v4/websocket",
            "defaultSender": "bridge@kotter.net",
            "supportDID": "411"
        };
        Params.stripe_key = "pk_live_re6zvM8FRxi2Aa9Ml95RG0Kp";
    } else {
        Params = {
            "symphonyUrl": "https://" + window.__env.environment + ".kotter.net",
            "audioUrl": "https://" + window.__env.environment + ".onescreen.kotter.net",
            "vcUrl": "https://" + window.__env.environment + ".video.kotter.net",
            "ssUrl": "https://" + window.__env.environment + ".myscreen.kotter.net/",
            "vpUrl": "https://" + window.__env.environment + ".proposal.kotter.net",
            "onescreenUrl": "https://" + window.__env.environment + ".onescreen.kotter.net",
            "chatUrl": "https://" + window.__env.environment + ".chat.kotter.net/api/v4",
            "chatWebsocket": "wss://" + window.__env.environment +
                ".chat.kotter.net/api/v4/websocket",
            "defaultSender": "bridge@kotter.net",
            "supportDID": "411"
        };
        Params.stripe_key = "pk_test_a8mSKGJ47JUXuuKA3upG6Kfp";
    }

    if (window.__env.audioUrl) {
        Params.audioUrl = window.__env.audioUrl;
    }
    if (window.__env.vcUrl) {
        Params.vcUrl = window.__env.vcUrl;
    }

    window.configParams = Params;
}(this));
