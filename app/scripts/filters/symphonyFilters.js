'use strict';

proySymphony
    .filter('capitalize', function() {
        return function(input, all) {
            const REGEX_ALL = /([^\W_]+[^\s-]*) */g;
            const REGEX_FIRST = /([^\W_]+[^\s-]*)/;
            if (!input) return '';
            const regex = (all) ? REGEX_ALL : REGEX_FIRST;
            return input.replace(regex, function(txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        };
    })
    .filter('reverse', function() {
        return function(items) {
            if (items && items.length > 0) return items.reverse();
            return items;
        };
    })
    .filter('startFrom', function() {
        return function(input, start) {
            if (input) {
                start = +start; //parse to int
                return input.slice(start);
            }
            return [];
        };
    })
    .filter('getByName', function() {
        return function(input, name) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].name == name) {
                    return input[i];
                }
            }
            return null;
        }
    })
    .filter('getByNumber', function() {
        return function(input, number) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i] == number) {
                    return i;
                }
            }
            return null;
        }
    })
    .filter('objLength', function() {
        return function(object) {
            var count = 0;

            for (var i in object) {
                count++;
            }
            return count;
        }
    })
    .filter('getPrefIndexByCategoryandName', function() {
        return function(input, category, name) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].name == name && input[i].category == category) {
                        return i;
                    }
                }
            }
            return null;
        }
    })
    .filter('getPrefByCategoryandName', function() {
        return function(input, category, name) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].name == name && input[i].category == category) {
                        return input[i];
                    }
                }
            }
            return null;
        };
    })
    .filter('getPrefValueByCategoryandName', function() {
        return function(input, category, name) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].name == name && input[i].category == category) {
                        return input[i].value;
                    }
                }
            }
            return null;
        };
    })
    .filter('getChannelByDmProfileId', function($rootScope) {
        return function(input, id) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].name.indexOf(id) !== -1 && input[i].name.indexOf(
                            $rootScope.mmProfile.id) != -1) {
                        return input[i];
                    }
                }
            }
            return null;
        };
    })
    .filter('split', function() {
        return function(input, splitChar, splitIndex) {
            // do some bounds checking here to ensure it has that index
            if (input) {
                return input.split(splitChar)[splitIndex];
            } else {
                return input;
            }
        }
    })
    .filter('splittoarray', function() {
        return function(input, splitChar) {
            // do some bounds checking here to ensure it has that index

            return input.split(splitChar);
        }
    })
    .filter('emojis', function($rootScope) {
        return function(content) {
            if (!content) content = '';
            return $rootScope.emojisInitialized ? wdtEmojiBundle.render(content) : content;
        };
    })
    // .filter('currency', function() {
    // 	return function(n) {
    //         if (!n) n = 0.00;
    //         return parseFloat(n).toFixed(2).replace(/./g, function(c, i, a) {
    //             return i && c !== "." && ((a.length - i) % 3 === 0) ? ',' + c : c;
    //         });
    // 	};
    // })
    .filter('nl2br', ['$sanitize', function($sanitize) {
        var tag = (/xhtml/i).test(document.doctype) ? '<br />' : '<br>';
        return function(msg) {
            msg = (msg + '').replace(
                /(\r\n|\n\r|\r|\n|&#10;&#13;|&#13;&#10;|&#10;|&#13;)/g, tag + '$1');
            return $sanitize(msg);
        };
    }])
    .filter('callouts', function($rootScope, chatService, newChatService) {
        return function(content) {
            if (content) {
                String.prototype.replaceAll = function(target, replacement) {
                    return this.split(target).join(replacement);
                };
                var countat = (content.match(/@/g) || []).length;
                var counthash = (content.match(/#/g) || []).length;

                angular.forEach(newChatService.teamMembers, function(user) {
                    var toreplace = '@' + user.username + (countat === 1 ? '' : ' ');
                    content = content.replaceAll(toreplace,
                        '<a href="" ng-click="showMember($event, \'' + user.id +
                        '\')">' + toreplace + '</a> ');
                });
                var publicChannels, privateChannels;
                angular.copy(newChatService.publicChannels, publicChannels);
                angular.copy(newChatService.privateChannels, privateChannels);
                var channels = _.merge(publicChannels, privateChannels);
                angular.forEach(channels, function(channel) {
                    var toreplace = '#' + channel.name + (counthash === 1 ? '' :
                        ' ');
                    content = content.replaceAll(toreplace,
                        '<a href="" ng-click="setChannel(\'' + channel.id +
                        '\')">' + toreplace + '</a> ');
                });
                var toreplace = '@channel ';
                content = content.replaceAll(toreplace, '<strong>' + toreplace +
                    '</strong> ');
                var toreplace = '@here ';
                content = content.replaceAll(toreplace, '<strong>' + toreplace +
                    '</strong> ');
                var toreplace = '@everyone ';
                content = content.replaceAll(toreplace, '<strong>' + toreplace +
                    '</strong> ');

                return content;
            } else {
                return undefined;
            }
        }
    })
    .filter('extension', function() {
        return function(input) {
            var parts = input.split(".");
            return parts[parts.length - 1];
        };
    })
    .filter('numKeys', function() {
        return function(json) {
            if (json) {
                var keys = Object.keys(json)
                return keys.length;
            } else {
                return null;
            }
        }
    })
    .filter('getById', function() {
        return function(input, id) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].id == id) {
                        return input[i];
                    }
                }
            }
            return null;
        }
    })
    .filter('getIndexByUserId', function() {
        return function(input, id) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].user_id == id) {
                        return i;
                    }
                }
            }
            return null;
        }
    })
    .filter('getByChannelId', function() {
        return function(input, id) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].channel_id == id) {
                    return input[i];
                }
            }
            return null;
        }
    })
    .filter('getIndexByChannelId', function() {
        return function(input, id) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].channel_id == id) {
                    return i;
                }
            }
            return null;
        }
    })
    .filter('getOutCallbyExt', function($filter) {
        return function(input, ext) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                var x = $filter('split')(input[i].ext[0], '@', 0);
                if (x === ext) {
                    return input[i];
                }
            }
            return null;
        }
    })
    .filter('getInCallbyExt', function() {
        return function(input, ext) {
            if (!input) return null;
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                var x = input[i].onCallWithNum[0];
                if (x === ext && (input[i].inOut === 'Local' || input[i].inOut ===
                        'Inbound')) {
                    return input[i];
                }
            }
            return null;
        }
    })
    .filter('secondsToDateTime', [function() {
        return function(seconds) {
            return new Date(1970, 0, 1).setSeconds(seconds);
        };
    }])
    .filter('getNonContact', function() {
        return function(input, data) {
            if (!input) return null;
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].phone !== null && data.phone !== null && input[i].phone == (
                        data.phone.length > 10 ? data.phone.substr(-10) : data.phone))
                    return input[i];
                if (input[i].email && data.email !== null && input[i].email !== null &&
                    input[i].email.toLowerCase() == data.email.toLowerCase()) return input[
                    i];
            }
            return null;
        }
    })
    .filter('getByUUID', function() {
        return function(input, uuid, type) {
            if (!input) return null;
            var field = type + '_uuid';
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i][field] === uuid) return i;
            };
            return null;
        }
    })
    .filter('getItemByUUID', function() {
        return function(input, uuid, type) {
            if (!input) return null;
            var field = type + '_uuid';
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i][field] === uuid) return input[i];
            };
            return null;
        }
    })
    .filter('getVoicemailByUUID', function() {
        return function(input, uuid) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].indexOf(uuid) !== -1) {
                    return input[i];
                }
            }
            return null;
        }
    })
    .filter('getGroupIndexbyUUID', function() {
        return function(input, uuid, prefix) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i][prefix + 'group_uuid'] == uuid) {
                    return i;
                }
            }
            return null;
        }
    })
    .filter('getHistoryIndexbyUUID', function() {
        return function(input, uuid) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].uuid == uuid) {
                    return i;
                }
            }
            return null;
        }
    })
    .filter('getVCInviteIndexbyUUID', function() {
        return function(input, uuid) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {

                if (input[i].video_conference_invite_uuid == uuid) {
                    return i;
                }
            }
            return null;
        }
    })
    .filter('getGroupbyUUID', function() {
        return function(input, uuid) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {

                if (input[i].group_uuid == uuid) {
                    return input[i];
                }
            }
            return null;
        }
    })
    .filter('getIndexbyUUID', function() {
        return function(input, uuid) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].contact_uuid == uuid) {
                        return i;
                    }
                }
            }
            return null;
        }
    })
    .filter('getAttendantbyUUID', function() {
        return function(input, uuid) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {

                if (input[i].ivr_menu_uuid == uuid) {
                    return i;
                }
            }
            return null;
        }
    })
    .filter('getContactbyUUID', function() {
        return function(input, uuid) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].contact_uuid == uuid) {
                        return input[i];
                    }
                }
            }
            return null;
        }
    })
    .filter('checkIfManager', function() {
        return function(input, uuid) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].user_uuid === uuid) {
                    return true;
                }
            }
            return false;
        }
    })
    .filter('getContactbyUserUUID', function() {
        return function(input, uuid) {
            if (input) {
                var i = 0,
                    len = input.length;
                for (i; i < len; i++) {
                    if (input[i].contact_type === 'user' && input[i].user_uuid == uuid) {
                        return input[i];
                    }
                }
            }
            return null;
        };
    })
    .filter('getContactbyExtension', function() {
        return function(input, ext) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].user_ext && input[i].user_ext == ext) {
                    return input[i];
                }
            }
            return null;
        };
    })
    .filter('getContactbyEmail', function() {
        return function(input, email) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].contact_email_address && input[i].contact_email_address ==
                    email) {
                    return input[i];
                }
            }
            return null;
        };
    })
    .filter('getThreadByPhone', function() {
        return function(input, phone) {
            var found = null;
            if (input && phone) {
                var p = (phone && phone.length > 4 && phone.length < 11 ? '1' + phone :
                    phone);
                angular.forEach(input, function(item) {
                    if (!found && item.contact_phone_number == p) found = item;
                });
            }
            return found;
        };
    })
    .filter('getContactbyPhone', function(usefulTools) {
        return function(input, phone) {
            if (input) {
                var i = 0,
                    len = input.length;
                var array = [];
                var p = (phone && phone.length > 10 ? phone.replace(/-/g, '').substr(-10) :
                    (phone ? phone.replace(/-/g, '') : null));
                for (i; i < len; i++) {
                    if (input[i].user_ext && input[i].user_ext === p) {
                        array.push(input[i]);
                    }
                    var phones = input[i].phones;
                    if (phones) {
                        var j = 0,
                            plen = phones.length;
                        for (j; j < plen; j++) {
                            if (phones[j].phone_number === p) {
                                array.push(input[i]);
                            }
                        }
                    }
                }
                if (array.length === 1) return array[0];
                if (array.length > 1) {
                    array[0].contact_count = array.length;
                    return array[0];
                }
            }
            return null;
        };
    })
    .filter('range', function() {
        return function(input, total) {
            total = parseInt(total);

            for (var i = 0; i < total; i++) {
                input.push(i);
            }

            return input;
        };
    })
    .filter('getContactsbyPhone', function() {
        return function(input, phone) {
            if (input) {
                var i = 0,
                    len = input.length;
                var p = (phone && phone.length > 10 ? phone.substr(-10) : phone);
                var array = [];
                for (i; i < len; i++) {
                    if (input[i].user_ext == p) {
                        array.push(input[i]);
                    }
                    var phones = input[i].phones;
                    var j = 0,
                        plen = phones ? phones.length : null;
                    for (j; j < plen; j++) {
                        if (phones[j].phone_number == p) {
                            array.push(input[i]);
                        }
                    }
                }
                if (array.length > 0) return array;
            }
            return null;
        };
    })
    .filter('getSettingValueByName', function() {
        return function(input, name) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].contact_setting_name == name) {
                    return input[i].contact_setting_value;
                }
            }
            return null;
        }
    })
    .filter('getFilebyUUID', function() {
        return function(input, uuid) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {

                if (input[i].file_uuid == uuid) {
                    return input[i];
                }
            }
            return null;
        }
    })
    .filter('getArrayFromObject', function() {
        return function(input) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {

                if (input[i].contact_setting_name == name) {
                    return input[i].contact_setting_value;
                }
            }
            return null;
        }
    })
    .filter('getIndexById', function() {
        return function(input, id) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].id == id) {
                    return i;
                }
            }
            return null;
        }
    })
    .filter('getPrefByName', function() {
        return function(input, name) {
            var i = 0,
                len = input.length;
            for (i; i < len; i++) {
                if (input[i].name == name) {
                    return i;
                }
            }
            return null;
        }
    })
    .filter('tel', function() {
        return function(tel) {
            if (!tel) {
                return '';
            }

            var value = tel.toString().trim().replace(/^\+/, '');

            if (value.match(/[^0-9]/)) {
                return tel;
            }

            var country, city, number;

            switch (value.length) {
                case 7: // +1PPP####### -> C (PPP) ###-####
                    country = 1;
                    city = null;
                    number = value;
                    break;

                case 10: // +1PPP####### -> C (PPP) ###-####
                    country = 1;
                    city = value.slice(0, 3);
                    number = value.slice(3);
                    break;

                case 11: // +CPPP####### -> CCC (PP) ###-####
                    country = value[0];
                    city = value.slice(1, 4);
                    number = value.slice(4);
                    break;

                case 12: // +CCCPP####### -> CCC (PP) ###-####
                    country = value.slice(0, 3);
                    city = value.slice(3, 5);
                    number = value.slice(5);
                    break;

                default:
                    return tel;
            }

            if (country == 1) {
                country = "";
            }

            number = number.slice(0, 3) + '-' + number.slice(3);

            return (country + (city ? (" (" + city + ") ") : "") + number).trim();
        };
    })
    .filter('callerId', function($filter) {
        return function(input) {
            if (input) {
                var numDigits = input.replace(/[^0-9]/g, '').length;
                if (numDigits >= 10) {
                    return $filter('tel')(input);
                } else {
                    return input;
                }
            }
            return null;
        };
    })
    // .filter('capitalize', function() {
    //     return function(input) {
    //       return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    //     };
    // })
    // .filter('capitalizeall', function() {
    //     return function(input) {
    //         const REGEX_ALL = /([^\W_]+[^\s-]*) */g;
    //         const REGEX_FIRST = /([^\W_]+[^\s-]*)/;
    //       return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    //     };
    // })
    .filter('tel2', function() {
        return function(tel) {
            if (!tel) {
                return '';
            }

            var value = tel.toString().trim().replace(/^\+/, '');

            if (value.match(/[^0-9]/)) {
                return tel;
            }

            var country, city, number;

            if (tel.length > 5) {
                switch (value.length) {
                    case 1:
                    case 2:
                    case 3:
                        city = value;
                        break;

                    case 7:
                        city = null;
                        number = value;
                        break;

                    default:
                        city = value.slice(0, 3);
                        number = value.slice(3);
                }

                if (number) {
                    number = number.slice(0, 3) + '-' + number.slice(3, 7);
                    return ((city ? ("(" + city + ") ") : "") + number).trim();
                } else {
                    return city;
                }

            } else {
                return tel;
            }
        };
    }).filter('stringDateToDate', function($filter) {
        return function(text) {
            var tempdate = new Date(text.replace(/-/g, "/"));
            return $filter('date')(tempdate, 'MMM dd, yyyy h:mm a');
        };
    }).filter('tzFormatted', function($filter) {
        return function(date) {
            var tzDate = $filter('amTimezone')(date, 'NewYork');
            return $filter('amDateFormat')(tzDate, 'MMM DD, YYYY H:MM A');
        };
    }).filter('groupIsHidden', function($rootScope) {
        return function(groups) {
            return groups.filter(function(group) {
                return group.hidden && group.hidden.indexOf($rootScope.user.id) == -1;
            });
        };
    }).filter('timestamp', function($filter) {
        return function(time) {
            return new Date(time).getTime();
        };
    })
    .filter('toLocalTime', function($filter, $rootScope) {
        return function(date) {
            if (date) {
                // console.log(date);
                //date = date.toString().substr(0,24);
                //console.log(date);
                var todate = moment.tz(date, "America/New_York");
                // console.log(todate);
                if ($rootScope.user && $rootScope.user.settings.timezone) todate = todate.clone().tz(
                    $rootScope.user.settings.timezone);
                // console.log(todate);
            }
            return todate;
        };
    })
    .filter('toEasternTime', function($filter, $rootScope) {
        return function(date) {

            var returndate = moment.tz(date.toString(), $rootScope.user.settings.timezone);
            returndate = returndate.clone().tz("America/New_York");
            return returndate;
        };
    })
    .filter('getTimezone', function($filter, $rootScope) {
        return function(timezone) {
            var tz = null;
            angular.forEach($rootScope.timeZones, function(zone) {
                if (zone.display === timezone) tz = zone.timezone;
            });
            return tz;
        };
    })
    .filter('arrayDiff', function() {
        return function(array, diff) {
            //console.log(array);
            //console.log(diff);
            var i, item,
                newArray = [],
                exception = Array.prototype.slice.call(arguments, 2);

            for (i = 0; i < array.length; i++) {
                item = array[i];
                if (diff.indexOf(item) < 0 || exception.indexOf(item) >= 0) {
                    newArray.push(item);
                }
            }

            return newArray;

        };
    })
    .filter('fromToDates', function() {
        return function(input, datePropertyName, fromDate, toDate) {
            if (!(fromDate && toDate)) {
                return input;
            }
            return input.filter(function(item) {
                return moment(item[datePropertyName]).isBetween(fromDate, toDate,
                    null, '[]');
            });
        };
    });
