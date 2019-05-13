'use strict';

proySymphony.controller('TimeKeeperCtrl', function($scope, usefulTools, $filter, $rootScope,
    $uibModalStack, dataFactory, contactService, userService, metaService) {

    $scope.member_list = {};
    $scope.tkusers = [];
    $rootScope.contacts = [];
    $scope.activeTimekeeperTab = 0;

    function loadTkUsers() {
        dataFactory.getTimeKeeperUsers()
            .then(function(response) {
                if (response.data.success) {
                    $scope.tkusers = response.data.success.data;
                    $rootScope.$broadcast('load.tkusers', $scope.tkusers);
                    var showTimer = false;

                    var index = $filter('getByUUID')($scope.tkusers, $rootScope.user.id,
                        'user');

                    if (index !== null) {
                        $rootScope.user.tkRole = $scope.tkusers[index].role;
                        showTimer = true;
                    }
                    $rootScope.$broadcast('update.timer', showTimer);
                }
            });
    }

    function init() {
        loadTkUsers();
        $scope.initializeDate();
    }

    $scope.closeCreateGroup = function() {
        $scope.newgroup = {};
        $uibModalStack.dismissAll();
    };

    $scope.today = new Date();

    $scope.time = {
        start_stamp: $scope.today,
        end_stamp: $scope.today
    };

    $scope.ismeridian = true;

    $scope.hstep = 1;
    $scope.mstep = 15;

    $scope.addEditRecord = function(time, data, closeModal) {
        if (data.action == 'Add') {
            if (data.selectedDay.tday) {
                var date = data.selectedDay.tday + " " + data.selectedDay.tmonthname +
                    " " + data.selectedDay.tdate + " " + data.selectedDay.tyear;
                var stime = date + " " + time.start_stamp.getHours() + ":" + time.start_stamp
                    .getMinutes() + ":" + time.start_stamp.getSeconds();
                var etime = date + " " + time.end_stamp.getHours() + ":" + time.end_stamp
                    .getMinutes() + ":" + time.end_stamp.getSeconds();


                var datedata = {
                    start_stamp: new Date(stime).toString().replace(/GMT.+/, ""),
                    end_stamp: new Date(etime).toString().replace(/GMT.+/, ""),
                    user_uuid: data.user.user_uuid,
                    action: data.action
                };

            } else if (data.selectedDay.fullday) {
                var date = data.selectedDay.fullday + " " + data.selectedDay.month +
                    " " + data.selectedDay.date + " " + data.selectedDay.year;
                var stime = date + " " + time.start_stamp.getHours() + ":" + time.start_stamp
                    .getMinutes() + ":" + time.start_stamp.getSeconds();
                var etime = date + " " + time.end_stamp.getHours() + ":" + time.end_stamp
                    .getMinutes() + ":" + time.end_stamp.getSeconds();


                var datedata = {
                    start_stamp: new Date(stime).toString().replace(/GMT.+/, ""),
                    end_stamp: new Date(etime).toString().replace(/GMT.+/, ""),
                    user_uuid: data.user.user_uuid,
                    action: data.action
                };

            }
        } else {
            var start_time = new Date(data.record.start_stamp);
            var end_time = new Date(data.record.end_stamp);

            if (data.selectedDay.tday) {
                var date = data.selectedDay.tday + " " + data.selectedDay.tmonthname +
                    " " + data.selectedDay.tdate + " " + data.selectedDay.tyear;
                var stime = date + " " + start_time.getHours() + ":" + start_time.getMinutes() +
                    ":" + start_time.getSeconds();
                var etime = date + " " + end_time.getHours() + ":" + end_time.getMinutes() +
                    ":" + end_time.getSeconds();


                var datedata = {
                    start_stamp: new Date(stime).toString().replace(/GMT.+/, ""),
                    end_stamp: new Date(etime).toString().replace(/GMT.+/, ""),
                    user_uuid: data.user.user_uuid,
                    action: data.action,
                    record_uuid: data.record.time_keeper_record_uuid
                };


            } else if (data.selectedDay.fullday) {
                var date = data.selectedDay.fullday + " " + data.selectedDay.month +
                    " " + data.selectedDay.date + " " + data.selectedDay.year;
                var stime = date + " " + start_time.getHours() + ":" + start_time.getMinutes() +
                    ":" + start_time.getSeconds();
                var etime = date + " " + end_time.getHours() + ":" + end_time.getMinutes() +
                    ":" + end_time.getSeconds();


                var datedata = {
                    start_stamp: new Date(stime).toString().replace(/GMT.+/, ""),
                    end_stamp: new Date(etime).toString().replace(/GMT.+/, ""),
                    user_uuid: data.user.user_uuid,
                    action: data.action,
                    record_uuid: data.record.time_keeper_record_uuid
                };

            };
        };

        var selectedDate = new Date(datedata.start_stamp);

        $scope.strdate = selectedDate.getFullYear() + '-' + (selectedDate.getMonth() +
            1) + '-' + selectedDate.getDate();

        if (datedata.start_stamp >= datedata.end_stamp) {
            return $rootScope.showAlert(
                'Start Time cannot be greater than or equal to End Time.');
        }

        dataFactory.addEditRecord(datedata)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.showSuccessAlert(response.data.success.message);
                } else {
                    $rootScope.showErrorAlert(response.data.error.message);
                }

                $scope.putRecords($scope.strdate, data.user.user_uuid);
                loadTkUsers();
            });

        if (closeModal) {
            closeModal();
        }
    };


    $scope.closeAddEditRecord = function() {
        $uibModalStack.dismissAll();
    };

    function showTimeLine() {
        $scope.activeTimekeeperTab = 1;
    };

    // $rootScope.$on('set.timeline.tab', function(event, args) {
    //     $scope.user = args.user;
    //     showTimeLine();
    // });

    $scope.downloadUrl = function(screenshot) {
        return $rootScope.onescreenBaseUrl +
            '/timeclockpro/screenshot/download/' +
            screenshot.time_keeper_screenshot_uuid +
            '?token=' + $rootScope.userToken;
    };


    //***************Permissions************************//

    $scope.groupActive = [];

    function getTkGroups() {
        dataFactory.getTkGroups()
            .then(function(response) {
                $rootScope.tkGroups = [];
                if (response.data.error) {
                    if (__env.enableDebug) console.log(response.data.error.message);
                } else if (response.data.success) {
                    $rootScope.tkGroups = response.data.success.data;
                    $rootScope.$broadcast('load.tkgroups', $rootScope.tkGroups);
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);

            });
    }

    getTkGroups();

    $scope.toggleShowGroupMembers = function(group) {
        group.showMembers = !group.showMembers;
    };

    $scope.toggleShowGroupManagers = function(group) {
        group.showManagers = !group.showManagers;
    };

    $rootScope.$on('new.tkgroup', function($event, group) {
        var index = $filter('getGroupIndexbyUUID')($rootScope.tkGroups, group.time_keeper_group_uuid,
            'time_keeper_');
        if (index == null) {
            $rootScope.tkGroups.push(group);
            loadTkUsers();
        }

        getTkGroups();
    });

    $scope.createNewTkGroup = function(group) {
        var data = preparePermGroupData(group, null);
        if (data.errors.length === 0) {
            dataFactory.postCreateTkGroup(data)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        if (!$rootScope.tkGroups) $rootScope.tkGroups = [];
                        var group = response.data.success.data;
                        var index = $filter('getGroupIndexbyUUID')($rootScope.tkGroups,
                            group.time_keeper_group_uuid, 'time_keeper_');
                        if (index == null) {
                            $rootScope.tkGroups.push(group);
                            loadTkUsers();
                        }
                        $uibModalStack.dismissAll();
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            var string = '';
            angular.forEach(data.errors, function(error) {
                string += (string.length !== 0 ? ', ' : '') + error;
            });
            $rootScope.alerts.push({
                error: true,
                message: 'Error: ' + string
            });
        }
    };

    $scope.getUserName = function(uuid) {
        var findcontact = contactService.getContactByUserUuid(uuid);
        if (findcontact !== null) return findcontact.name;
        return '';
    };

    $scope.showEditPermissions = function(index) {
        $rootScope.editPermissionIndex = index;
        $rootScope.uploaderOption = '/permissions/group/create';
        $rootScope.showNewGroup = true;
        if (index !== null) {
            console.log($scope.uploader);
            $rootScope.uploaderOption = '/permissions/group/update';
            $rootScope.showNewGroup = false;
        }
        $scope.userContacts = contactService.getUserContactsOnly();
        $scope.uploader.url = $rootScope.onescreenBaseUrl + $rootScope.uploaderOption;
        $scope.search = {};
        var data = {
            editPermissionIndex: $rootScope.editPermissionIndex,
            closeCreateGroup: $scope.closeCreateGroup,
            tkGroups: $rootScope.tkGroups,
            showNewGroup: $rootScope.showNewGroup,
            uploader: $scope.uploader,
            clearFilter: $scope.clearFilter,
            modalTableHeight: $scope.modalTableHeight,
            userContacts: $scope.userContacts,
            updateTkGroup: $scope.updateTkGroup,
            createNewTkGroup: $scope.createNewTkGroup,
            isTkGroupMember: $scope.isTkGroupMember,
            search: $scope.search
        };
        $rootScope.showModal("/timeclockpro/createupdategroup.html", data);
    };

    function preparePermGroupData(group, index) {

        if (__env.enableDebug) console.log(group);
        var errors = [];
        var list2 = [];
        angular.forEach(group.member, function(key, value) {
            if (key === true) list2.push(value);
        });
        var list3 = [];
        angular.forEach(group.manager, function(key, value) {
            if (key === true) list3.push(value);
        });
        if (list2.length === 0) errors.push('At least one Member must be specified.');
        if (list3.length === 0) errors.push('At lease one Manager must be specified.');

        var data = {
            group_uuid: (index !== null ? $rootScope.tkGroups[index].time_keeper_group_uuid :
                null),
            group_name: group.group_name,
            group_members: list2,
            group_managers: list3,
            errors: errors
        };
        console.log(data);
        return data;
    }

    function makeString(input) {
        var string = JSON.stringify(input);
        if (__env.enableDebug) console.log(string);
        return string;
    }

    $scope.clearFilter = function() {
        $scope.search.contact_name_full = '';
    };

    $scope.isAdmin = function() {
        return userService.isAdminGroupOrGreater();
    };

    $scope.isAdminOrManager = function() {
        var group;
        if ($rootScope.user.tkRole) {
            group = $rootScope.user.tkRole;
            return ($scope.isAdmin() || group === 'manager');
        } else if ($scope.isAdmin()) {
            return true;
        }
        return null;
    };

    $scope.message = false;

    $scope.isTkUserOrGreater = function() {
        if ($rootScope.user.tkRole || $scope.isAdmin()) {
            $scope.message = false;
            return true;
        } else {
            $scope.message = true;
        }
    };

    $scope.updateTkGroup = function(group, index) {
        var data = preparePermGroupData(group, index);
        if (__env.enableDebug) console.log(data);
        var data2 = {
            input: makeString(data)
        };

        if (data.errors.length === 0) {
            console.log(data2);
            dataFactory.postUpdateTkGroup(data2)
                .then(function(response) {
                    $rootScope.showalerts(response);
                    if (response.data.success) {
                        $uibModalStack.dismissAll();
                    }
                }, function(error) {
                    if (__env.enableDebug) console.log(error);
                });
        } else {
            var string = '';
            angular.forEach(data.errors, function(error) {
                string += (string.length !== 0 ? ', ' : '') + error;
            });
            $rootScope.alerts.push({
                error: true,
                message: 'Error: ' + string
            });
        }
    };

    $rootScope.$on('update.tkgroup', function($event, group) {
        var index = $filter('getGroupIndexbyUUID')($rootScope.tkGroups, group.time_keeper_group_uuid,
            'time_keeper_');
        if (index != null) {
            $rootScope.tkGroups.splice(index, 1);
            $rootScope.tkGroups.push(group);
            loadTkUsers();
        }
        getTkGroups();
    });

    $scope.postRemoveTkGroupMember = function(group, index, member_type) {
        if ((member_type === 'member' && group.members.length > 1) || (member_type ===
                'manager' && group.managers.length > 1)) {
            var data = {
                group_uuid: group.time_keeper_group_uuid,
                group_member_uuid: (member_type === 'member' ? group.members[index]
                    .user_uuid : group.managers[index].user_uuid),
                member_type: member_type
            };
            if (__env.enableDebug) console.log(data);
            dataFactory.postRemoveTkGroupMember(data)
                .then(function(response) {
                    if (response.data.error) {
                        if (__env.enableDebug) console.log(response.data.error.message);
                    } else {
                        if (__env.enableDebug) console.log(response.data.success.message);
                        var index2 = $filter('getGroupIndexbyUUID')($rootScope.tkGroups,
                            group.time_keeper_group_uuid, 'time_keeper_');
                        $rootScope.tkGroups[index2][member_type + 's'].splice(index,
                            1);
                        loadTkUsers();
                    }
                });
        } else {
            $rootScope.alerts.push({
                error: true,
                message: 'Error: You can not remove this ' + member_type +
                    ' as there must be at least one ' + member_type +
                    ' in each group.'
            });
        }
    };

    $scope.dissolveTkGroup = function(index) {
        dataFactory.getRemoveTkGroup($rootScope.tkGroups[index].time_keeper_group_uuid)
            .then(function(response) {
                $rootScope.showalerts(response);
                if (response.data.success) {
                    getTkGroups();
                    loadTkUsers();
                    $uibModalStack.dismissAll();
                }
            }, function(error) {
                if (__env.enableDebug) console.log(error);
            });
    };

    $scope.dissolveGroup = function(group) {
        if (__env.enableDebug) console.log(group);
        if (group.time_keeper_group_uuid) {
            var index = $filter('getGroupIndexbyUUID')($rootScope.tkGroups, group.time_keeper_group_uuid,
                'time_keeper_');
            $scope.dissolveTkGroup(index, group);
        }
    };

    $rootScope.$on('delete.tkgroup', function($event, group) {
        var index = $filter('getGroupIndexbyUUID')($rootScope.tkGroups, group.time_keeper_group_uuid,
            'time_keeper_');
        if (index != null) {
            $rootScope.tkGroups.splice(index, 1);
            loadTkUsers();
        }
        getTkGroups();
    });

    $scope.openDissolveGroupModal = function(group) {
        var data = {
            group: group,
            dissolveGroup: $scope.dissolveGroup
        };
        $rootScope.showModalWithData('/company/confirmdissolvegroup.html', data);
    };

    $scope.isTkGroupMember = function(index, uuid, type) {
        if (index !== null) {
            var members = $rootScope.tkGroups[index][type + 's'];
            var result = false;
            angular.forEach(members, function(member) {
                if (member.user_uuid === uuid) result = true;
            });
            return result;
        }
        return false;
    };


    //****************End Permissions***********************//

    $scope.showModalFull = $rootScope.showModalFull;

    $rootScope.$on('set.timeline.tab', function(event, args) {
        $scope.user = args.user;
        showTimeLine();
    });

    $scope.$watch('user.user_uuid', function(newVal, oldVal) {
        if(newVal != oldVal) {
            $scope.todaysDate($scope.today);
            //getMonthlyRecords($scope.user, $scope.days);
        }
    });

    $scope.downloadUrl = function(screenshot) {
        return $rootScope.onescreenBaseUrl +
            '/timeclockpro/screenshot/download/' +
            screenshot.time_keeper_screenshot_uuid +
            '?token=' + $rootScope.userToken;
    };

    var d = new Date();
    var month = new Array();
    month[0] = "January";
    month[1] = "February";
    month[2] = "March";
    month[3] = "April";
    month[4] = "May";
    month[5] = "June";
    month[6] = "July";
    month[7] = "August";
    month[8] = "September";
    month[9] = "October";
    month[10] = "November";
    month[11] = "December";

    var weekday = new Array(7);
    weekday[0] = "Sunday";
    weekday[1] = "Monday";
    weekday[2] = "Tuesday";
    weekday[3] = "Wednesday";
    weekday[4] = "Thursday";
    weekday[5] = "Friday";
    weekday[6] = "Saturday";

    $scope.today = {
        tday: weekday[d.getDay()],
        tmonth: d.getMonth(),
        tmonthname: month[d.getMonth()],
        tyear: d.getFullYear(),
        tdate: d.getDate()
    };

    $scope.hours = ['12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am',
        '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm',
        '9pm', '10pm', '11pm'
    ];

    $scope.initializeDate = function() {

        $scope.today = {
            tday: weekday[d.getDay()],
            tmonth: d.getMonth(),
            tmonthname: month[d.getMonth()],
            tyear: d.getFullYear(),
            tdate: d.getDate()
        };

        angular.forEach($scope.days, function(day) {
            if (day.date == $scope.today.tdate) {
                day.border = '2px solid green';
            }
        });

        $scope.todaysDate($scope.today);
    };

    $scope.selectedDay = null;

    $scope.thumbnailUrl = function(screenshot) {
        return $rootScope.onescreenBaseUrl +
            '/timeclockpro/screenshot/thumb/' +
            screenshot.time_keeper_screenshot_uuid +
            '/' + screenshot.domain_uuid + '?token=' + $rootScope.userToken;
    };
    $scope.snapshotUrl = function(screenshot) {
        return $rootScope.onescreenBaseUrl +
            '/timeclockpro/screenshot/image/' +
            screenshot.time_keeper_screenshot_uuid +
            '/' + screenshot.domain_uuid + '?token=' + $rootScope.userToken;
    };

    $scope.putRecords = function(dateSel, user_uuid) {
        var fulldate = new Date(dateSel + ' 00:00');
        if (user_uuid) {
            $scope.user.user_uuid = user_uuid;
        }

        dataFactory.getRecords($scope.user.user_uuid, dateSel)
            .then(function(resposnse) {
                $rootScope.records = [];
                $rootScope.userRecords = resposnse.data;

                angular.forEach($rootScope.userRecords.records, function(record) {
                    var start_time = new Date(record.start_stamp);
                    var end_time = new Date(record.end_stamp);

                    var diff = 0;
                    diff = (end_time.getTime() - start_time.getTime());

                    var stime = new Date(record.start_stamp);
                    var etime = new Date(record.end_stamp);
                    record['stime'] = stime;
                    record['etime'] = etime;

                    $rootScope.records.push(record);
                });

                angular.forEach($rootScope.userRecords.activity.activityData,
                    function(activity) {
                        var totalTime = (parseInt(activity.timeh) + 1) * 2.9;
                        activity['width'] = totalTime > 80 ? 80 : totalTime;
                    });
            });
    };

    $scope.selectedDate = function(day) {
        angular.forEach($scope.days, function(day) {
            if (day.date == $scope.today.tdate) {
                day.border = '';
            }
        });

        $scope.selectedDay = day;
        $rootScope.selectedDay1 = day;
        $scope.fulldate1 = day.fullday + ", " + day.month + " " + day.date;
        $rootScope.dateSel = day.year + "-" + (day.monthnum + 1) + "-" + day.date;

        $scope.putRecords($rootScope.dateSel);

    };


    $scope.todaysDate = function(today) {
        $scope.selectedDay = null;
        $rootScope.selectedDay1 = today;
        $scope.fulldate1 = today.tday + ", " + today.tmonthname + " " + today.tdate;
        $rootScope.dateSel = today.tyear + "-" + (today.tmonth + 1) + "-" + today.tdate;

        build_month(today.tmonth, today.tyear);
        getMonthlyRecords($scope.user, $scope.days);
        angular.forEach($scope.days, function(day) {
            if (day.date == $scope.today.tdate) {
                day.border = '2px solid green';
            }
        });

        $scope.putRecords($rootScope.dateSel);
    };

    $scope.editRecord = function(record, user) {
        $rootScope.strdate = $rootScope.selectedDay1;

        var data = {
            user: user,
            selectedDay: $rootScope.selectedDay1,
            action: 'Edit',
            record: record,
            dateSel: $scope.fulldate1,
            closeAddEditRecord: $scope.closeAddEditRecord,
            addEditRecord: $scope.addEditRecord,
            ismeridian : $scope.ismeridian,
            mstep : $scope.mstep,
            hstep: $scope.hstep,
            time: $scope.time
        }
        $rootScope.showModalFull('/timeclockpro/addEditRecord.html', data, 'lg');
    };

    $scope.addOfflineTime = function(user) {
        $rootScope.strdate = $rootScope.selectedDay1;
        var data = {
            user: user,
            selectedDay: $rootScope.selectedDay1,
            action: 'Add',
            dateSel: $scope.fulldate1,
            closeAddEditRecord: $scope.closeAddEditRecord,
            addEditRecord: $scope.addEditRecord,
            ismeridian : $scope.ismeridian,
            mstep : $scope.mstep,
            hstep: $scope.hstep,
            time: $scope.time
        }
        $rootScope.showModalFull('/timeclockpro/addEditRecord.html', data, 'lg');
    };

    $scope.deleteRecord = function(record, user) {
        var confirmation = 'Are you sure you want to delete this record?';
        $rootScope.confirmDialog(confirmation)
            .then(function(response) {
                if (response) {
                    var data = {
                        record: record,
                        user_uuid: user.user_uuid
                    };
                    dataFactory.postDeleteRecord(data)
                        .then(function(response) {
                            $rootScope.showalerts(response);
                            if (response.data.success) {
                                $scope.putRecords($rootScope.dateSel);
                            }
                        });
                }
            });
    };

    // if (!$rootScope.strdate) {
    //     $scope.todaysDate($scope.today);
    // }

    function build_month(month1, year) {

        var date = new Date(year, month1, 1);
        $scope.days = [];
        $scope.fulldate = {};

        while (date.getMonth() === month1) {
            $scope.fulldate['date'] = date.getDate();
            $scope.fulldate['day'] = weekday[date.getDay()].substring(0, 3);
            $scope.fulldate['fullday'] = weekday[date.getDay()];
            $scope.fulldate['month'] = month[date.getMonth()];
            $scope.fulldate['monthnum'] = date.getMonth();
            $scope.fulldate['year'] = year;
            $scope.fulldate['totalTime'] = 0;
            $scope.fulldate['fulldate'] = date.toString().replace(/GMT.+/, "");
            $scope.days.push($scope.fulldate);

            $scope.fulldate = {};
            date.setDate(date.getDate() + 1);
        }
        return $scope.days;

    }

    build_month(d.getMonth(), $scope.today.tyear);
    //getMonthlyRecords($scope.user, $scope.days);

    $scope.next = function(today) {

        if ($scope.today.tmonth == 11) {
            $scope.today.tmonth = 0;
            $scope.today.tyear = today.tyear + 1;
        } else {
            $scope.today.tmonth = today.tmonth + 1;
            $scope.today.tyear = today.tyear;
        }

        var date = new Date($scope.today.tyear, $scope.today.tmonth, 1);

        $scope.today = {
            tday: weekday[date.getDay()],
            tmonth: date.getMonth(),
            tmonthname: month[date.getMonth()],
            tyear: date.getFullYear(),
            tdate: date.getDate()
        };

        $scope.selectedDay = null;
        $scope.fulldate1 = $scope.today.tday + ", " + $scope.today.tmonthname + " " +
            $scope.today.tdate;
        $scope.dateSel = $scope.today.tyear + "-" + ($scope.today.tmonth + 1) + "-" +
            $scope.today.tdate;

        build_month($scope.today.tmonth, $scope.today.tyear);
        getMonthlyRecords($scope.user, $scope.days);
        $scope.putRecords($scope.dateSel);

    };

    $scope.previous = function(today) {
        if ($scope.today.tmonth == 0) {
            $scope.today.tmonth = 11;
            $scope.today.tyear = today.tyear - 1;
        } else {
            $scope.today.tmonth = today.tmonth - 1;
            $scope.today.tyear = today.tyear;
        }

        var date = new Date($scope.today.tyear, $scope.today.tmonth, 1);

        $scope.today = {
            tday: weekday[date.getDay()],
            tmonth: date.getMonth(),
            tmonthname: month[date.getMonth()],
            tyear: date.getFullYear(),
            tdate: date.getDate()
        };

        $scope.selectedDay = null;
        $scope.fulldate1 = $scope.today.tday + ", " + $scope.today.tmonthname + " " +
            $scope.today.tdate;
        $scope.dateSel = $scope.today.tyear + "-" + ($scope.today.tmonth + 1) + "-" +
            $scope.today.tdate;

        build_month($scope.today.tmonth, $scope.today.tyear);
        getMonthlyRecords($scope.user, $scope.days);
        $scope.putRecords($scope.dateSel);

    };

    function getMonthlyRecords(user, days) {
        var data = {
            user_uuid: user.user_uuid,
            month_days: days
        };
        dataFactory.getMonthlyRecords(data)
            .then(function(response) {
                if (response.data.success) {
                    angular.forEach(response.data.success.data, function(record) {
                        angular.forEach($scope.days, function(day) {
                            if (day.fulldate == record.date) {
                                var totalTime = (parseInt(record.time) +
                                    1) * 11.4;
                                if (totalTime > 93) {
                                    day['totalTime'] = 93;
                                } else {
                                    day['totalTime'] = totalTime;
                                }
                            }
                        });
                    });

                }
            });
    }

    $scope.deleteScreenshot = function(screenshot, record) {
        var data = {
            screenshot: screenshot,
            record: record
        };

        dataFactory.postDeleteScreenshot(data)
            .then(function(response) {
                if (response.data.success) {
                    $rootScope.showSuccessAlert('Screenshot Deleted successfully!');
                    $scope.putRecords($rootScope.dateSel);
                }
            });
    };

    metaService.registerOnRootScopeUserLoadCallback(init);

});
