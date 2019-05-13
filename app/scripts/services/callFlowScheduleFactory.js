proySymphony.factory("callFlowScheduleFactory", [
    "uneditableArrayFactory",
    function callFlowSchedule(uneditableArrayFactory) {
        return function model(actions, defaultAction) {
            // ----------------------- //
            var main = this;
            // ----------------------- //
            var actionsModel;
            // ----------------------- //
            var conditionTypesModel;
            var conditionTypes;
            var timeDetailTypes;
            // ----------------------- //

            function init() {
                actionsModel = new uneditableArrayFactory(actions);
                actions = actionsModel.resources;
                actionsModel.setDerivedProp("scheduled", function(otherActions) {
                    return otherActions.filter(function(otherAction) {
                        return isScheduledAction(otherAction);
                    });
                });
                conditionTypesModel = new uneditableArrayFactory(
                    getScheduleConditionTypes());
                conditionTypes = conditionTypesModel.resources;
                conditionTypesModel.setDerivedProp("timeDetailTypes", function(
                    condTypes) {
                    return _.map(conditionTypes, "value");
                });
                timeDetailTypes = conditionTypesModel.timeDetailTypes;
                defineProps();
            };
            init();

            function defineProps() {
                Object.defineProperties(main, {
                    allActions: {
                        enumerable: true,
                        get: function() {
                            return actions;
                        }
                    },
                    scheduleConditionTypes: {
                        enumerable: true,
                        get: function() {
                            return conditionTypes;
                        }
                    },
                    timeDetailTypes: {
                        enumerable: true,
                        get: function() {
                            return timeDetailTypes;
                        }
                    },
                    scheduledActions: {
                        enumerable: true,
                        get: function() {
                            return actionsModel.scheduled;
                        }
                    },
                    defaultAction: {
                        get: function() { return defaultAction; },
                        set: function(newDefault) {
                            return defaultAction = {
                                actionName: newDefault.type,
                                resourceUuid: newDefault.did || newDefault.data
                            };
                        }
                    }
                });
                main.addPrevalidatedAction = actionsModel.addResource;
                main.reset = actionsModel.reset;
                main.addAction = addAction;
                main.canAddAction = canAddAction;
                main.removeAction = actionsModel.removeResource;
                main.parseCondDetailToScheduleData = parseCondDetailToScheduleData;
                main.getPossibleTimezones = getPossibleTimezones;
            };

            function addAction(action, resource) {
                var result = canAddAction(action, resource);
                if (result !== true) {
                    return { error: result };
                }
                var length = actionsModel.addResource({
                    label: action.title,
                    resource: resource,
                    actionName: action.name,
                    action: action,
                    conditionTypes: conditionTypes
                });
                return { length: length };
            };

            function canAddAction(action, resource) {
                var error;
                if (action.isSimpleAction && _.find(actions, propMatchesVal(action,
                        "action"))) {
                    error = "You can only add one " + action.actionTitle +
                        " type action per call flow";
                } else if (resource && _.find(actions, propMatchesVal(resource,
                        "resource"))) {
                    error = "You have already added this " + action.resourceName +
                        " to the Call Flow.";
                }
                return error || true;
            };

            function propMatchesVal(value, prop) {
                return function(item) {
                    return item[prop] === value;
                };
            };

            function ordinalSuffixOf(i) {
                var j = i % 10,
                    k = i % 100;
                if (j == 1 && k != 11) {
                    return i + "st";
                }
                if (j == 2 && k != 12) {
                    return i + "nd";
                }
                if (j == 3 && k != 13) {
                    return i + "rd";
                }
                return i + "th";
            };

            function isScheduledAction(action) {
                return action.conditionGroups && action.conditionGroups.length;
            };

            function parseCondDetailToScheduleData(condDetail) {
                var condTypeSpec = {
                    value: condDetail.dialplan_detail_type
                };
                var condType = _.find(conditionTypes, condTypeSpec);
                var detailData = condDetail.dialplan_detail_data;
                var dataSplits = detailData.split("-");
                var start = parseInt(dataSplits[0]);
                var end = parseInt(dataSplits[1]);

                if (condType.value === "minute-of-day") {
                    var startHour = parseInt(start / 60);
                    var startMinute = start % 60;
                    var endHour = parseInt(end / 60);
                    var endMinute = end % 60;
                    var minuteOfDayStart = getTimeOfDayAtHourAndMinute(startHour,
                        startMinute);
                    var minuteOfDayEnd = getTimeOfDayAtHourAndMinute(endHour, endMinute);
                    return {
                        conditionType: condType,
                        startOpt: {
                            value: start
                        },
                        endOpt: {
                            value: end
                        },
                        minuteOfDayStart: minuteOfDayStart,
                        minuteOfDayEnd: minuteOfDayEnd,
                        priority: parseInt(condDetail.dialplan_detail_group)
                    };
                } else {
                    return {
                        conditionType: condType,
                        startOpt: _.find(condType.opts, {
                            value: start
                        }),
                        endOpt: _.find(condType.opts, {
                            value: end
                        }),
                        priority: parseInt(condDetail.dialplan_detail_group)
                    };
                }
            };

            function getTimeOfDayAtHourAndMinute(hour, minute) {
                return moment().hour(hour).minute(minute).toDate();
            };

            function getScheduleConditionTypes() {
                var currentYear = moment().year();
                var months = [
                    "January", "February", "March",
                    "April", "May", "June",
                    "July", "August", "September",
                    "October", "November", "December"
                ];
                var days = [
                    "Sunday", "Monday", "Tuesday",
                    "Wednesday", "Thursday", "Friday",
                    "Saturday", "Sunday"
                ];

                var ord = ordinalSuffixOf;

                function genSameDispAndVal(val) {
                    return {
                        display: val,
                        value: val
                    };
                };

                function genDispAndValAsIdx(idxInc) {
                    if (!idxInc) {
                        idxInc = 0;
                    }
                    return function(val, idx) {
                        return {
                            display: val,
                            value: idx + idxInc
                        };
                    };
                };

                var yearOpts = _.range(currentYear, currentYear + 11).map(
                    genSameDispAndVal);
                var monthOpts = months.map(genDispAndValAsIdx(1));
                var dayOfMonthOpts = _.range(1, 32).map(genDispAndValAsIdx(1));
                var dayOfWeekOpts = days.map(genDispAndValAsIdx(1));
                var weekOfYearOpts = _.range(1, 54).map(genDispAndValAsIdx(1));
                var weekOfMonthOpts = _.range(1, 6).map(genDispAndValAsIdx(1));
                var hourOfDayOpts = [12].concat(_.range(1, 12)).map(function(num) {
                    return num + " AM";
                }).concat([12].concat(_.range(1, 12)).map(function(num) {
                    return num + " PM";
                })).map(genDispAndValAsIdx());
                var minuteOfHourOpts = _.range(0, 60)
                    .map(_.flow([
                        _.toString,
                        _.partial(_.padStart, _, 2, "0"),
                        genDispAndValAsIdx(1)
                    ]));
                var timeOfDayOpts = _.flatten([12].concat(_.range(1, 12)).map(function(
                    hrNum) {
                    return _.range(0, 60).map(function(minNum) {
                        if (minNum < 10) {
                            minNum = "0" + minNum;
                        }
                        return hrNum + ":" + minNum + " AM";
                    });
                }).concat([12].concat(_.range(1, 12)).map(function(hrNum) {
                    return _.range(0, 60).map(function(minNum) {
                        if (minNum < 10) {
                            minNum = "0" + minNum;
                        }
                        return hrNum + ":" + minNum + " PM";
                    });
                }))).map(genDispAndValAsIdx());

                function yearSummaryDisplay(same, type, start, end) {
                    if (same) {
                        return "For the entire year of " + start;
                    } else {
                        return "From the year " + start + " to the year " + end;
                    }
                };

                function monthSummaryDisplay(same, type, start, end) {
                    if (same) {
                        return "For the entire month of " + start;
                    } else {
                        return "From " + start + " to " + end;
                    }
                };

                function dayOfMonthSummaryDisplay(same, type, start, end) {
                    if (same) {
                        return "On the " + ord(start) + " of each month";
                    } else {
                        return "From the " + ord(start) + " to the " + ord(end) +
                            " of each month";
                    }
                };

                function dayOfWeekSummaryDisplay(same, type, start, end) {
                    if (same) {
                        return "Each " + start;
                    } else {
                        return "Between " + start + " to " + end + " each week";
                    }
                };

                function weekOfYearSummaryDisplay(same, type, start, end) {
                    if (same) {
                        return "On the " + ord(start) + " day of each year";
                    } else {
                        return "From the " + ord(start) + " day to the " + ord(end) +
                            " day of each year";
                    }
                };

                function weekOfMonthSummaryDisplay(same, type, start, end) {
                    if (same) {
                        return "On the " + ord(start) + " week of each month";
                    } else {
                        return "From the " + ord(start) + " week to the " + ord(end) +
                            " week of each month";
                    }
                };

                function hourOfDaySummaryDisplay(same, type, start, end) {
                    if (same) {
                        return "During the hour of " + start;
                    } else {
                        return "During the hours of " + start + " to " + end;
                    }
                };

                function timeOfDaySummaryDisplay(action, condition) {
                    var start = moment(condition.minuteOfDayStart);
                    var end = moment(condition.minuteOfDayEnd);
                    var same = start.hour() === end.hour && start.minute() === end.minute();
                    var formatStr = "h:mm A";
                    if (same) {
                        return "At " + start.format(formatStr);
                    } else {
                        return "From " + start.format(formatStr) + " to " + end.format(
                            formatStr);
                    }
                };

                function dateAndTimeSummaryDisplay(same, type, start, end) {
                    return "";
                };

                function wrapSumDispFn(displayFn) {
                    return function(action, condition) {
                        if (!condition.startOpt || !condition.endOpt) {
                            return null;
                        }
                        var same = condition.startOpt.value === condition.endOpt.value;
                        return displayFn(
                            same,
                            action.display,
                            condition.startOpt.display,
                            condition.endOpt.display
                        );
                    };
                };

                function timeOfDayPreAddModificationFn(condition) {};

                return [{
                        display: "Year",
                        value: "year",
                        opts: yearOpts,
                        summaryDisplay: wrapSumDispFn(yearSummaryDisplay)
                    },
                    {
                        display: "Month",
                        value: "mon",
                        opts: monthOpts,
                        summaryDisplay: wrapSumDispFn(monthSummaryDisplay)
                    },
                    {
                        display: "Day of Month",
                        value: "mday",
                        opts: dayOfMonthOpts,
                        summaryDisplay: wrapSumDispFn(dayOfMonthSummaryDisplay)
                    },
                    {
                        display: "Day of Week",
                        value: "wday",
                        opts: dayOfWeekOpts,
                        summaryDisplay: wrapSumDispFn(dayOfWeekSummaryDisplay)
                    },
                    {
                        display: "Week of Year",
                        value: "week",
                        opts: weekOfYearOpts,
                        summaryDisplay: wrapSumDispFn(weekOfYearSummaryDisplay)
                    },
                    {
                        display: "Week of Month",
                        value: "mweek",
                        opts: weekOfMonthOpts,
                        summaryDisplay: wrapSumDispFn(weekOfMonthSummaryDisplay)
                    },
                    {
                        display: "Time of Day",
                        value: "minute-of-day",
                        summaryDisplay: timeOfDaySummaryDisplay,
                        hourOpts: hourOfDayOpts,
                        minuteOpts: minuteOfHourOpts,
                        minuteOfDayStart: getTimeOfDayAtHourAndMinute(9, 0),
                        minuteOfDayEnd: getTimeOfDayAtHourAndMinute(17, 0),
                        preferredSelector: {
                            type: "splitSelect",
                            startTitle: "Start hour",
                            subStartTitle: ""
                        },
                        preAddModificationFn: timeOfDayPreAddModificationFn
                    },
                ];
            }

            Object.seal(this);
        };
    }
]);


function getPossibleTimezones() {
    return [
        "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix",
        "America/Los_Angeles","America/Anchorage", "Pacific/Honolulu",
        // "Europe/Andorra", "Asia/Dubai", "Asia/Kabul", "America/Antigua",
        // "America/Anguilla", "Europe/Tirane", "Asia/Yerevan", "Africa/Luanda",
        // "Antarctica/McMurdo", "Antarctica/Casey", "Antarctica/Davis",
        // "Antarctica/DumontDUrville", "Antarctica/Mawson", "Antarctica/Palmer",
        // "Antarctica/Rothera", "Antarctica/Syowa", "Antarctica/Troll",
        // "Antarctica/Vostok", "America/Argentina/Buenos_Aires",
        // "America/Argentina/CordobaArgentina", "America/Argentina/Salta",
        // "America/Argentina/Jujuy", "America/Argentina/Tucuman",
        // "America/Argentina/Catamarca", "America/Argentina/La_Rioja",
        // "America/Argentina/San_Juan", "America/Argentina/Mendoza",
        // "America/Argentina/San_Luis", "America/Argentina/Rio_Gallegos",
        // "America/Argentina/Ushuaia", "Pacific/Pago_Pago", "Europe/Vienna",
        // "Australia/Lord_Howe", "Antarctica/Macquarie", "Australia/Hobart",
        // "Australia/Currie", "Australia/Melbourne", "Australia/Sydney",
        // "Australia/Broken_Hill", "Australia/Brisbane", "Australia/Lindeman",
        // "Australia/Adelaide", "Australia/Darwin", "Australia/Perth",
        // "Australia/Eucla", "America/Aruba", "Europe/Mariehamn", "Asia/Baku",
        // "Europe/Sarajevo", "America/Barbados", "Asia/Dhaka", "Europe/Brussels",
        // "Africa/Ouagadougou", "Europe/Sofia", "Asia/Bahrain",
        // "Africa/Bujumbura", "Africa/Porto-Novo", "America/St_Barthelemy",
        // "Atlantic/Bermuda", "Asia/Brunei", "America/La_Paz",
        // "America/Kralendijk", "America/Noronha", "America/Belem",
        // "America/Fortaleza", "America/Recife", "America/Araguaina",
        // "America/Maceio", "America/Bahia", "America/Sao_Paulo",
        // "America/Campo_Grande", "America/Cuiaba", "America/Santarem",
        // "America/Porto_Velho", "America/Boa_Vista", "America/Manaus",
        // "America/Eirunepe", "America/Rio_Branco", "America/Nassau",
        // "Asia/Thimphu", "Africa/Gaborone", "Europe/Minsk", "America/Belize",
        // "America/St_Johns", "America/Halifax", "America/Glace_Bay",
        // "America/Moncton", "America/Goose_Bay", "America/Blanc-Sablon",
        // "America/Toronto", "America/Nipigon", "America/Thunder_Bay",
        // "America/Iqaluit", "America/Pangnirtung", "America/Atikokan",
        // "America/Winnipeg", "America/Rainy_River", "America/Resolute",
        // "America/Rankin_Inlet", "America/Regina", "America/Swift",
        // "America/Edmonton", "America/Cambridge_Bay", "America/Yellowknife",
        // "America/Inuvik", "America/Creston", "America/Dawson_Creek",
        // "America/Fort_Nelson", "America/Vancouver", "America/Whitehorse",
        // "America/Dawson", "Indian/Cocos", "Africa/Kinshasa",
        // "Africa/Lubumbashi", "Africa/Bangui", "Africa/Brazzaville",
        // "Europe/Zurich", "Africa/Abidjan", "Pacific/Rarotonga",
        // "America/Santiago", "America/Punta_Arenas", "Pacific/Easter",
        // "Africa/Douala", "Asia/Shanghai", "Asia/Urumqi", "America/Bogota",
        // "America/Costa_Rica", "America/Havana", "Atlantic/Cape_Verde",
        // "America/Curacao", "Indian/Christmas", "Asia/Nicosia", "Asia/Famagusta",
        // "Europe/Prague", "Europe/Berlin", "Europe/Busingen", "Africa/Djibouti",
        // "Europe/Copenhagen", "America/Dominica", "America/Santo_Domingo",
        // "Africa/Algiers", "America/Guayaquil", "Pacific/Galapagos",
        // "Europe/Tallinn", "Africa/Cairo", "Africa/El_Aaiun", "Africa/Asmara",
        // "Europe/Madrid", "Africa/Ceuta", "Atlantic/Canary",
        // "Africa/Addis_Ababa", "Europe/Helsinki", "Pacific/Fiji",
        // "Atlantic/Stanley", "Pacific/Chuuk", "Pacific/Pohnpei",
        // "Pacific/Kosrae", "Atlantic/Faroe", "Europe/Paris", "Africa/Libreville",
        // "Europe/London", "America/Grenada", "Asia/Tbilisi", "America/Cayenne",
        // "Europe/Guernsey", "Africa/Accra", "Europe/Gibraltar",
        // "America/Godthab", "America/Danmarkshavn", "America/Scoresbysund",
        // "America/Thule", "Africa/Banjul", "Africa/Conakry",
        // "America/Guadeloupe", "Africa/Malabo", "Europe/Athens",
        // "Atlantic/South_Georgia", "America/Guatemala", "Pacific/Guam",
        // "Africa/Bissau", "America/Guyana", "Asia/Hong_Kong",
        // "America/Tegucigalpa", "Europe/Zagreb", "America/Port-au-Prince",
        // "Europe/Budapest", "Asia/Jakarta", "Asia/Pontianak", "Asia/Makassar",
        // "Asia/Jayapura", "Europe/Dublin", "Asia/Jerusalem",
        // "Europe/Isle_of_Man", "Asia/Kolkata", "Indian/Chagos", "Asia/Baghdad",
        // "Asia/Tehran", "Atlantic/Reykjavik", "Europe/Rome", "Europe/Jersey",
        // "America/Jamaica", "Asia/Amman", "Asia/Tokyo", "Africa/Nairobi",
        // "Asia/Bishkek", "Asia/Phnom_Penh", "Pacific/Tarawa",
        // "Pacific/Enderbury", "Pacific/Kiritimati", "Indian/Comoro",
        // "America/St_Kitts", "Asia/Pyongyang", "Asia/Seoul", "Asia/Kuwait",
        // "America/Cayman", "Asia/Almaty", "Asia/Qyzylorda", "Asia/Aqtobe",
        // "Asia/Aqtau", "Asia/Atyrau", "Asia/Oral", "Asia/Vientiane",
        // "Asia/Beirut", "America/St_Lucia", "Europe/Vaduz", "Asia/Colombo",
        // "Africa/Monrovia", "Africa/Maseru", "Europe/Vilnius",
        // "Europe/Luxembourg", "Europe/Riga", "Africa/Tripoli",
        // "Africa/Casablanca", "Europe/Monaco", "Europe/Chisinau",
        // "Europe/Podgorica", "America/Marigot", "Indian/Antananarivo",
        // "Pacific/Majuro", "Pacific/Kwajalein", "Europe/Skopje", "Africa/Bamako",
        // "Asia/Yangon", "Asia/Ulaanbaatar", "Asia/Hovd", "Asia/Choibalsan",
        // "Asia/Macau", "Pacific/Saipan", "America/Martinique",
        // "Africa/Nouakchott", "America/Montserrat", "Europe/Malta",
        // "Indian/Mauritius", "Indian/Maldives", "Africa/Blantyre",
        // "America/Mexico_City", "America/Cancun", "America/Merida",
        // "America/Monterrey", "America/Matamoros", "America/Mazatlan",
        // "America/Chihuahua", "America/Ojinaga", "America/Hermosillo",
        // "America/Tijuana", "America/Bahia_Banderas", "Asia/Kuala_Lumpur",
        // "Asia/Kuching", "Africa/Maputo", "Africa/Windhoek", "Pacific/Noumea",
        // "Africa/Niamey", "Pacific/Norfolk", "Africa/Lagos", "America/Managua",
        // "Europe/Amsterdam", "Europe/Oslo", "Asia/Kathmandu", "Pacific/Nauru",
        // "Pacific/Niue", "Pacific/Auckland", "Pacific/Chatham", "Asia/Muscat",
        // "America/Panama", "America/Lima", "Pacific/Tahiti", "Pacific/Marquesas",
        // "Pacific/Gambier", "Pacific/Port_Moresby", "Pacific/Bougainville",
        // "Asia/Manila", "Asia/Karachi", "Europe/Warsaw", "America/Miquelon",
        // "Pacific/Pitcairn", "Asia/Gaza", "Europe/Lisbon", "Atlantic/Madeira",
        // "Atlantic/Azores", "Pacific/Palau", "America/Asuncion", "Asia/Qatar",
        // "Indian/Reunion", "Europe/Bucharest", "Europe/Belgrade",
        // "Europe/Kaliningrad", "Europe/Moscow", "Europe/Simferopol",
        // "Europe/Volgograd", "Europe/Kirov", "Europe/Astrakhan",
        // "Europe/Saratov", "Europe/Ulyanovsk", "Europe/Samara",
        // "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Novosibirsk", "Asia/Barnaul",
        // "Asia/Tomsk", "Asia/Novokuznetsk", "Asia/Krasnoyarsk", "Asia/Irkutsk",
        // "Asia/Chita", "Asia/Yakutsk", "Asia/Vladivostok", "Asia/Ust-Nera",
        // "Asia/Magadan", "Asia/Sakhalin", "Asia/Srednekolymsk", "Asia/Kamchatka",
        // "Asia/Anadyr", "Africa/Kigali", "Asia/Riyadh", "Pacific/Guadalcanal",
        // "Indian/Mahe", "Africa/Khartoum", "Europe/Stockholm", "Asia/Singapore",
        // "Atlantic/St_Helena", "Europe/Ljubljana", "Arctic/Longyearbyen",
        // "Europe/Bratislava", "Africa/Freetown", "Europe/San_Marino",
        // "Africa/Dakar", "Africa/Mogadishu", "America/Paramaribo", "Africa/Juba",
        // "Africa/Sao_Tome", "America/El_Salvador", "America/Lower_Princes",
        // "Asia/Damascus", "Africa/Mbabane", "America/Grand_Turk",
        // "Africa/Ndjamena", "Indian/Kerguelen", "Africa/Lome", "Asia/Bangkok",
        // "Asia/Dushanbe", "Pacific/Fakaofo", "Asia/Dili", "Asia/Ashgabat",
        // "Africa/Tunis", "Pacific/Tongatapu", "Europe/Istanbul",
        // "America/Port_of_Spain", "Pacific/Funafuti", "Asia/Taipei",
        // "Africa/Dar_es_Salaam", "Europe/Kiev", "Europe/Uzhgorod",
        // "Europe/Zaporozhye", "Africa/Kampala", "Pacific/Midway", "Pacific/Wake",
        // "America/Detroit", "America/Kentucky/Louisville",
        // "America/Kentucky/Monticello", "America/Indiana/Indianapolis",
        // "America/Indiana/Vincennes", "America/Indiana/Winamac",
        // "America/Indiana/Marengo", "America/Indiana/Petersburg",
        // "America/Indiana/Vevay", "America/Indiana/Tell_City",
        // "America/Indiana/Knox", "America/Menominee",
        // "America/North_Dakota/Center", "America/North_Dakota/New_Salem",
        // "America/North_Dakota/Beulah", "America/Boise", "America/Juneau",
        // "America/Sitka", "America/Metlakatla", "America/Yakutat",
        // "America/Nome", "America/Adak", "America/Montevideo", "Asia/Samarkand",
        // "Asia/Tashkent", "Europe/Vatican", "America/St_Vincent",
        // "America/Caracas", "America/Tortola", "America/St_Thomas",
        // "Asia/Ho_Chi_Minh", "Pacific/Efate", "Pacific/Wallis", "Pacific/Apia",
        // "Asia/Aden", "Indian/Mayotte", "Africa/Johannesburg", "Africa/Lusaka",
        // "Africa/Harare"
    ];
}
