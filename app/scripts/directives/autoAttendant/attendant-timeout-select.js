"use strict";

proySymphony.component("attendantTimeoutSelect", {
    templateUrl: "views/auto-attendant/attendant-timeout-select.html",
    bindings: {
        chosenOpt: "=?",
        onChooseOpt: "&?",
        type: "<?",
        data: "<?",
        asSubAction: "<?",
        labelText: "<?"
    },
    controller: ["autoAttendantService", "$rootScope", function(autoAttendantService, $rootScope) {
        var ctrl = this;
        var aas = autoAttendantService;

        ctrl.$onInit = function() {
            ctrl.options = getSimpleTimeoutOpts();
            if (!ctrl.labelText) { ctrl.labelText = "Please choose a timeout option"; }
            registerTimeoutOpts();
            if (ctrl.asSubAction) {
                ctrl.options = setOptionsTypeData(ctrl.options, asSubActionOption);
            }
            if (ctrl.type) {
                ctrl.chosenOpt = findOptByTypeAndData(ctrl.type, ctrl.data);
                ctrl.selectedOpt = ctrl.chosenOpt;
                if (ctrl.chosenOpt && ctrl.chosenOpt.isExternal === true) {
                    var did = ctrl.data.indexOf("2343") > -1 ?
                        ctrl.data.split("2343")[1].split(" ")[0] : ctrl.data;
                    ctrl.chosenOpt.did = did;
                    ctrl.externalDid = did;
                }
            }
        };

        ctrl.chooseOpt = function(option) {
            ctrl.chosenOpt = option;
            if (ctrl.onChooseOpt) { ctrl.onChooseOpt({option: option}); }
        };

        ctrl.updateExternalOpt = function(option, did) {
            option.did = did;
            if (ctrl.onChooseOpt) { ctrl.onChooseOpt({option: option}); }
        };

        function findOptByTypeAndData(type, data) {
            // if (data && data.indexOf("2343") > -1) {
            if (type && data) {
                if (!ctrl.asSubAction && type === "external-did") {
                    return _.find(ctrl.options, {isExternal: true});
                } else if (ctrl.asSubAction && data.indexOf("2343") > -1) {
                    var subActionOption = asSubActionOption({type: "external-did"});
                    if (subActionOption.type === type) {
                        return _.find(ctrl.options, {isExternal: true});
                    }
                } else {
                    return _.find(ctrl.options, {data: data});
                }
            } else {
                var optionSpec = {type: type};
                if (data) { optionSpec.data = data; }
                return _.find(ctrl.options, optionSpec);
            }
        };

        function isExternalDidOption(type, data) {
            return type && data &&
                !ctrl.asSubAction &&
                type === "external-did" &&
                _.find(ctrl.options, {isExternal: true});
        };

        function isExternalDidSubActionOption(type, data) {
           return type && data &&
                ctrl.asSubAction && data.indexOf("2343") > -1 &&
                isExternalDidSubActionOptionType(type) &&
                _.find(ctrl.options, {isExternal: true});
        };

        function isExternalDidSubActionOptionType(type) {
            var subActionOption = asSubActionOption({type: "external-did"});
            return type === subActionOption.type;
        };

        function setOptionsTypeData(options, optionTypeDataFn) {
            return options.map(getTypeDataMapFn(optionTypeDataFn));
        };

        function getTypeDataMapFn(optionTypeDataFn) {
            return function(option) {
                return _.merge(option, _.pick(optionTypeDataFn(option), ["type", "data"]));
            };
        };

        function registerTimeoutOpts() {
            aas.registerResourceDependencies(aas.transferOpts.map(mapTransferOptToTimeoutOpt));
        };

        function mapTransferOptToTimeoutOpt(transferOpt) {
            var transferOptName = transferOpt.transferOptResourceName ||
                transferOpt.resourceCollName;
            return {
                scope: ctrl,
                targetName: transferOptName,
                attachName: transferOptName,
                onAfterRefresh: function() {
                    _.remove(ctrl.options, function(option) {
                        return option.display.indexOf(transferOpt.transferOptDisplayRoot) > -1;
                    });
                    var displayOpts = ctrl[transferOptName].map(function(opt) {
                        var displayOpt = aas.displayTransferOption(opt, null);
                        if (opt && displayOpt) {
                            displayOpt.data = aas.getResourceUuid(opt);
                            displayOpt.resource_uuid = aas.getResourceUuid(opt);
                            displayOpt.type = displayOpt.actionName;
                            displayOpt.resource = opt;
                        }
                        return displayOpt;
                    }).filter(Boolean).forEach(function(opt) {
                        if (opt && ctrl.options.indexOf(opt) === -1) { ctrl.options.push(opt); }
                    });
                }
            };
        };

        function getSimpleTimeoutOpts() {
            var externalOpt = asSimpleTimeoutOpt("External Number", "external-did");
            externalOpt.isExternal = true;
            return [
                asSimpleTimeoutOpt("Hangup", "hang-up"),
                externalOpt,
                asSimpleTimeoutOpt("Dial By Name", "dialbyname")
            ];
        };

        function asSimpleTimeoutOpt(display, type, data) {
            return {display: display, type: type, data: data};
        };

        function asSubActionOption(option) {
            var domainName = $rootScope.user.domain.domain_name;
            function asExtensionTypeData(ext) {
                return {type: "transfer", data: ext + " XML " + domainName};
            };
            var typeDataMap = {
                "hang-up": {type: "hangup"},
                "external-did": {type: "transfer"},
                dialbyname: {type: "transfer", data: "*411 XML " + domainName},
                announcement: {
                    type: "lua",
                    data: function() {
                        return "streamfile.lua " + aas.getAudioLibraryFileName(option.resource);
                    }
                },
                voicemail: {
                    type: "transfer",
                    data: function() {
                        return "*99" + option.resource.voicemail_id + " XML " + domainName;
                    }
                },
                ivr: function() {
                    return asExtensionTypeData(option.resource.ivr_menu_extension);
                },
                "ring-group": function() {
                    return asExtensionTypeData(option.resource.ring_group_extension);
                },
                extension: function() {
                    return asExtensionTypeData(option.resource.extension);
                }
            };
            var mapping = typeDataMap[option.type];
            if (_.isFunction(mapping)) { mapping = mapping(); }
            var type = mapping.type;
            var data = mapping.data;
            if (_.isFunction(type)) { type = type(); }
            if (_.isFunction(data)) { data = data(); }
            return {type: type, data: data};
        };

    }]
});
