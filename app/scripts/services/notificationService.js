'use strict';

proySymphony.factory('notificationService', function(usefulTools, focusService, contactService,
    $rootScope, $filter, __env, symphonyConfig, webNotification, $location, _) {
    $rootScope.mediaDevices;
    navigator.mediaDevices.enumerateDevices()
        .then(function(response) {
            $rootScope.mediaDevices = response;
        });
    var notices = {
        basicNotification: function(data) {
            if ($rootScope.user.show_notifications) {
                if (usefulTools.isPageHidden()) {
                    var audio = new Audio(symphonyConfig.onescreenUrl +
                        '/assets/sounds/served.mp3');
                    audio.play();
                }
                webNotification.showNotification(data.title ? data.title :
                    'Symphony Notification', {

                        body: data.message ? data.message : 'Notification Text...',
                        icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/v1513120927/logo_cavwc5.png',
                        onClick: function onNotificationClicked() {
                            console.log('Notification clicked.');
                        },
                        autoClose: 9000 //auto close the notification after 9 seconds (you can manually close it via hide function)
                    },
                    function onShow(error, hide) {
                        if (error) {
                            window.alert('Unable to show notification: ' +
                                error.message);
                        } else {
                            console.log('Notification Shown.');

                            setTimeout(function hideNotification() {
                                console.log('Hiding notification....');
                                hide(); //manually close the notification (you can skip this if you use the autoClose option)
                            }, 5000);
                        }
                    });
            }
        },
        /**** Full Notification
         * Accepts data object with all customization settings
         * data.message is the only required field
         * set audioFile to null to suppress notification sound
         */


        fullNotification: function(data) {
            if ($rootScope.user.show_notifications) {
                var settings = {
                    title: data.title ? data.title : 'Bridge Notification',
                    message: data.message,
                    icon: data.icon ? data.icon : 'https://res.cloudinary.com/the-kotter-group/image/upload/v1513120927/logo_cavwc5.png',
                    audioFile: data.audioFile ? data.audioFile : (data.audioFile ==
                        null ? null :
                        'https://res.cloudinary.com/freebizads/video/upload/v1485314880/minion_text_message_gojyad.mp3'
                    ),
                    audioVolume: _.isNumber(data.audioVolume) ? data.audioVolume : 0.1,
                    audioMedia: data.audioMedia ? data.audioMedia : null,
                    clickUrl: data.url ? data.url : null,
                    duration: data.duration ? data.duration : 15,
                    callback: data.callback ? data.callback : null,
                    channelId: data.channelId ? data.channelId : null,
                    actions: data.actions
                    // showOnPageHidden: true
                    // showOnPageHidden: (data.showOnPageHidden && data.showOnPageHidden===true) ? true : false
                };
                console.log(settings);
                //console.log(settings.audioFile);
                //if (settings.audioFile !== null && usefulTools.isPageHidden()) {
                if (settings.audioFile !== null) {
                    var audio = new Audio(settings.audioFile);

                    if (settings.audioMedia) {
                        audio.setSinkId(settings.audioMedia.device_id);
                    }

                    if (!$rootScope.muteNotificationsVolume) {
                        if (_.isNumber(settings.audioVolume)) audio.volume =
                            settings.audioVolume;
                    } else {
                        audio.volume = 0.0;
                    }

                    audio.play();
                }
                var doOnClick = null;

                if (settings.clickUrl !== null) {
                    doOnClick = function(event) {
                        if (settings.callback !== null) {
                            settings.callback(settings.channelId);
                        } else {
                            window.open(settings.clickUrl, '_self');
                            window.focus();
                        }
                    };
                } else {
                    doOnClick = function(event) {
                        window.focus();
                    };
                }

                if ($location.$$url != '/screenpop') {
                    webNotification.showNotification(settings.title, {
                        serviceWorkerRegistration: window.serviceWorkerRegistration,
                        body: settings.message,
                        icon: settings.icon,
                        onClick: doOnClick,
                        actions: settings.actions,
                        // showOnPageHidden: true,
                        // showOnPageHidden: settings.showOnPageHidden,
                        autoClose: 9000
                    });
                }
            }
        }
    };

    notices.handleIncomingVideoCallNotification = function(onCall, data) {
        var callWaitingRingtoneUrl =
            'https://staging.onescreen.kotter.net/imported/sounds/echoed-ding.mp3';
        var defaultRingtoneUrl =
            'https://staging.onescreen.kotter.net/imported/sounds/ActiveRingtone.wav';

        if ($rootScope.user.show_notifications) {
            if ($rootScope.notification && $rootScope.notification.pause) {
                $rootScope.notification.pause();
            }
            var ring = findContactRingtone(data, 'videoInviteRingtone');
            if ($rootScope.user.videoInviteRingtonePath) {
                if (!$rootScope.muteNotificationsVolume) {
                    $rootScope.notification =
                        new Audio(symphonyConfig.audioUrl + $rootScope.user.videoInviteRingtonePath);
                } else {
                    $rootScope.notification =
                        new Audio(callWaitingRingtoneUrl);
                    $rootScope.notification.loop = true;
                }
            } else if ($rootScope.user.domain.videoInviteRingtone) {
                if (!$rootScope.muteNotificationsVolume) {
                    $rootScope.notification =
                        new Audio(symphonyConfig.audioUrl + $rootScope.user.domain.videoInviteRingtone
                            .filepath);
                } else {
                    $rootScope.notification =
                        new Audio(callWaitingRingtoneUrl);
                    $rootScope.notification.loop = true;
                }
            } else {
                $rootScope.notification = new Audio(defaultRingtoneUrl);
            }

            var volume;
            if (_.isNumber(parseInt($rootScope.user.videoInviteRingtoneVolume))) {
                $rootScope.notification.volume = $rootScope.user.videoInviteRingtoneVolume /
                    10;
                volume = $rootScope.user.videoInviteRingtoneVolume / 10;;
            } else if (_.isNumber(parseInt($rootScope.user.domain.videoInviteRingtoneVolume))) {
                $rootScope.notification.volume = $rootScope.user.domain.videoInviteRingtoneVolume /
                    10;
                volume = $rootScope.user.domain.videoInviteRingtoneVolume / 10;
            };

            if ($rootScope.user.videoInviteRingtoneMedia) {
                angular.forEach($rootScope.mediaDevices, function(media) {
                    if ($rootScope.user.videoInviteRingtoneMedia.device_id ==
                        media.deviceId) {
                        $rootScope.notification.setSinkId($rootScope.user.videoInviteRingtoneMedia
                            .device_id);
                    }
                });
            }

            $rootScope.notification.loop = 5;
            $rootScope.notification.play();
            var notice = {
                message: 'From: ' + data.name + ' (' + data.phone_number + ')',
                title: 'Incoming Call',
                audioVolume: volume,
                audioFile: null,
                url: null,
                icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/v1513203324/call_n5rwbe.jpg',
                actions: data.actions
            };
            notices.fullNotification(notice);
        }
    };

    notices.handleIncomingCallNotification = function(onCall, data) {
        if ($rootScope.suppressNotifications) return;
        var callWaitingRingtoneUrl = null;
        var contact = contactService.getContactByPhoneNumber(data.phone_number);
        if ($rootScope.user.show_waiting == "true") {
            var callWaitingRingtoneUrl =
                'https://staging.onescreen.kotter.net/imported/sounds/echoed-ding.mp3';
        }

        var defaultRingtoneUrl =
            'https://staging.onescreen.kotter.net/imported/sounds/ActiveRingtone.wav';

        if ($rootScope.user.show_notifications) {
            if ($rootScope.notification && $rootScope.notification.pause) {
                $rootScope.notification.pause();
            }
            var ring = findContactRingtone(data, 'callRingtone');
            if (!ring) {
                if ($rootScope.user.callRingtonePath) {
                    if (!$rootScope.muteNotificationsVolume) {
                        $rootScope.notification =
                            new Audio(symphonyConfig.audioUrl + $rootScope.user.callRingtonePath);
                    } else {
                        $rootScope.notification =
                            new Audio(callWaitingRingtoneUrl);
                        $rootScope.notification.loop = true;
                    }
                } else if ($rootScope.user.domain.callRingtone) {
                    if (!$rootScope.muteNotificationsVolume) {
                        $rootScope.notification =
                            new Audio(symphonyConfig.audioUrl + $rootScope.user.domain.callRingtone
                                .filepath);
                    } else {
                        $rootScope.notification =
                            new Audio(callWaitingRingtoneUrl);
                        $rootScope.notification.loop = true;
                    }
                } else {
                    $rootScope.notification = new Audio(defaultRingtoneUrl);
                }
            } else {
                if (!$rootScope.muteNotificationsVolume) {
                    $rootScope.notification = new Audio(symphonyConfig.audioUrl + ring.file
                        .filepath);
                } else {
                    $rootScope.notification = new Audio(callWaitingRingtoneUrl);
                    $rootScope.notification.loop = true;
                }
            }
            var volume;
            if (_.isNumber(parseInt($rootScope.user.callRingtoneVolume))) {
                $rootScope.notification.volume = $rootScope.user.callRingtoneVolume /
                    10;
                volume = $rootScope.user.callRingtoneVolume / 10;
            } else if ($rootScope.user.domain.callRingtoneVolume) {
                $rootScope.notification.volume = $rootScope.user.domain.callRingtoneVolume /
                    10;
                volume = $rootScope.user.domain.callRingtoneVolume / 10;
            };

            if ($rootScope.muteNotificationsVolume && onCall) {
                $rootScope.notification.volume = 1 / 20;
            }

            if ($rootScope.user.callRingtoneMedia) {
                angular.forEach($rootScope.mediaDevices, function(media) {
                    if ($rootScope.user.callRingtoneMedia.device_id == media.deviceId) {
                        $rootScope.notification.setSinkId($rootScope.user.callRingtoneMedia
                            .device_id);
                    }
                });
            }

            $rootScope.notification.loop = 5;
            $rootScope.notification.play();
            var message;
            if (contact) {
                message = 'From: ' + contact.name + ' (' + data.phone_number + ')';
            } else {
                message = 'From: ' + data.name + ' (' + data.phone_number + ')';
            }
            var notice = {
                message: message,
                title: 'Incoming Call',
                audioFile: null,
                audioVolume: volume,
                url: null,
                icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/v1513203324/call_n5rwbe.jpg',
                actions: data.actions
            };
            notices.fullNotification(notice);
        }
    };

    function findContactRingtone(data, ringtoneType) {
        var contact;
        if (ringtoneType === 'callRingtone') {
            var number = usefulTools.cleanPhoneNumber(data.phone_number);
            contact = contactService.getContactByPhoneNumber(number);
            if (contact) {
                return contactService.getContactRingtone(contact.cuuid, ringtoneType);
            }
        } else {
            if (data && data.from_contact_uuid) contact = contactService.getContactByUuid(data.from_contact_uuid);
            if (contact) {
                return contactService.getContactRingtone(contact.cuuid, ringtoneType);
            } else {
                var number = usefulTools.cleanPhoneNumber(data.from_number);
                contact = contactService.getContactByPhoneNumber(number);
                if (contact) {
                    return contactService.getContactRingtone(contact.cuuid, ringtoneType);
                }
            }
        }
        return null;
    }

    notices.showSmsNotification = function(sms, currentThread) {
        var show = true;
        if ($location.path() === "/sms" &&
            currentThread &&
            currentThread.thread_uuid === sms.thread_uuid && focusService.inFocus) show =
            false;
        if (show) {
            var symphonyURL = __env.symphonyUrl && __env.symphonyUrl !== '' ? __env.symphonyUrl :
                symphonyConfig.symphonyUrl;
            var audioFile;
            var ring = findContactRingtone(sms, 'textRingtone');
            if (!ring) {
                if ($rootScope.user.textRingtonePath) {
                    audioFile = symphonyConfig.audioUrl + $rootScope.user.textRingtonePath;
                } else if ($rootScope.user.domain.textRingtone) {
                    audioFile = symphonyConfig.audioUrl + $rootScope.user.domain.textRingtone
                        .filepath;
                } else {
                    audioFile =
                        "https://res.cloudinary.com/freebizads/video/upload/v1485314880/minion_text_message_gojyad.mp3";
                }
            } else {
                audioFile = symphonyConfig.audioUrl + ring.file.filepath;
            }
            var volume = 0.5;
            if (!$rootScope.muteNotificationsVolume) {
                if (_.isNumber(parseInt($rootScope.user.textRingtoneVolume))) {
                    volume = $rootScope.user.textRingtoneVolume / 10;
                } else if (_.isNumber(parseInt($rootScope.user.domain.textRingtoneVolume))) {
                    volume = $rootScope.user.domain.textRingtoneVolume / 10;
                }
            } else {
                volume = 0.0;
            }
            var media;
            if ($rootScope.user.textRingtoneMedia) {
                media = $rootScope.user.textRingtoneMedia
            }
            var notice = {
                message: (sms.message.length < 80 ? sms.message : sms.message.substring(
                    0, 80)),
                title: 'SMS From: ' + $filter('tel')(sms.from_number),
                url: symphonyURL + '/sms?thId=' + sms.thread_uuid,
                audioFile: audioFile,
                audioVolume: volume,
                duration: 5,
                audioMedia: media,
                icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/s--J6q8mV-u--/v1513264145/sms_bwd0uf.png',
                actions: [{
                    action: "go-to-sms",
                    title: "View Message"
                }]
            };
            notices.fullNotification(notice);
        }
    };

    notices.chatNotification = function(post, notificationCallback) {
        var audioFile;
        var volume;

        if ($rootScope.user.chatRingtonePath) {
            audioFile = symphonyConfig.audioUrl + $rootScope.user.chatRingtonePath;
        } else if ($rootScope.user.domain.chatRingtone) {
            audioFile = symphonyConfig.audioUrl + $rootScope.user.domain.chatRingtone.filepath;
        } else {
            audioFile =
                "https://res.cloudinary.com/freebizads/video/upload/v1485316626/msg_text_ogk1ty.mp3";
        }

        if (!$rootScope.muteNotificationsVolume) {
            if (_.isNumber(parseInt($rootScope.user.chatRingtoneVolume))) {
                volume = $rootScope.user.chatRingtoneVolume / 10;
            } else if (_.isNumber(parseInt($rootScope.user.domain.chatRingtoneVolume))) {
                volume = $rootScope.user.domain.chatRingtoneVolume / 10;
            }
        } else {
            volume = 0.0;
        }

        var media;
        if ($rootScope.user.chatRingtoneMedia) {
            media = $rootScope.user.chatRingtoneMedia
        }

        // var message = newChatService.isQuoteLink(post.message) ?
        //     newChatService.getMetaData(post.message).quoteLink.display : post.message;
        var message = post.message;
        var notice = {
            icon: 'https://res.cloudinary.com/the-kotter-group/image/upload/s--S_91Maex--/v1513263810/chat1_k3qncy.png',
            message: message,
            callback: notificationCallback,
            title: 'New ChatPlus Mention',
            audioFile: audioFile,
            audioVolume: volume,
            audioMedia: media,
            duration: 5,
            channelId: post.channel_id,
            url: notices.symphonyURL + '/chatplus?chId=' + post.channel_id +
                '&poId=' + post.id + '&userProId=' + post.userProfileId,
            actions: [{
                action: "go-to-chat",
                title: "View Message"
            }]
        };
        notices.fullNotification(notice);
    };

    notices.symphonyURL = __env.symphonyUrl ? __env.symphonyUrl : symphonyConfig.symphonyUrl;
    return notices;
});
