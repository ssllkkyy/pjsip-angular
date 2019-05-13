proySymphony.factory("ivrMenuFactory", ["ivrMenuOptionFactory", "resourceFrameworkService",
    function ivrMenu(ivrMenuOptionFactory, resourceFrameworkService) {
        return function model(ivr, domain, aas) {
            ivr = _.cloneDeep(ivr) || getDefaultIvr();
            // ----------------------- //
            var main = this;
            var rfs = resourceFrameworkService;
            // ----------------------- //
            var domainName = domain.domain_name;
            // ----------------------- //
            var optionModels;
            var digitOpts;
            var newOptionModel;
            var getOptionInterceptSpecs;

            var wantedProps = [
                "domain_uuid", "ivr_menu_exit_data", "ivr_menu_name",
                "ivr_menu_timeout", "ivr_menu_exit_app", "ivr_menu_uuid",
                "ivr_menu_max_timeouts", "ivr_menu_max_failures", "ivr_menu_direct_dial"
            ];

            function init() {
                digitOpts = getDigitOpts();
                optionModels = ivr.options.map(function(option) {
                    if (isMenuTopOption(option)) {
                        makeMenuTopAppOption(option);
                    }
                    return new ivrMenuOptionFactory(option, domain, digitOpts, aas);
                });
                defineProps(digitOpts);
                main.initialized = true;
                Object.seal(main);
            };

            init();

            function defineProps(digitOpts) {
                var propsBase = _.pick(ivr, Object.keys(ivr).filter(isWantedProp));
                Object.keys(propsBase).forEach(function(prop) {
                    if (prop === "ivr_menu_timeout") {
                        ivr[prop] = parseInt(ivr[prop]) / 1000;
                    } else if (prop === "ivr_menu_max_timeouts" || prop === "ivr_menu_max_failures") {
                        ivr[prop] = parseInt(ivr[prop]);
                    } else if (prop === "ivr_menu_direct_dial") {
                        ivr[prop] = ivr[prop] === "true" ? true : false;
                    }
                    propsBase[prop] = {
                        get: function() { return ivr[prop]; },
                        set: function(newVal) { return ivr[prop] = newVal; }
                    };
                });
                var propOverrides = {
                    ivr_menu_exit_app: {
                        get: function() { return ivr.ivr_menu_exit_app; }
                    },
                    ivr_menu_exit_data: {
                        get: function() { return ivr.ivr_menu_exit_data; },
                        set: function(newVal) {
                            ivr.ivr_menu_exit_app = newVal === "hangup" ? "hangup" : "menu-exec-app";
                            ivr.ivr_menu_exit_data = newVal;
                        }
                    },
                    editingOpt: {
                        get: function() {
                            var models =
                                newOptionModel ?
                                optionModels.concat([newOptionModel]) :
                                optionModels;
                            return _.find(models, { editing: true });
                        }
                    },
                    newOptionModel: { get: function() { return newOptionModel; } }
                };
                Object.defineProperties(main, _.merge(propsBase, propOverrides));
                main.deleteOption = deleteOption;
                main.getPersistanceData = getPersistanceData;
                main.optionModels = optionModels;
                main.digitOpts = digitOpts;
                main.updateDigitOpts = updateDigitOpts;
                main.isEditingOption = isEditingOption;
                rfs.attachStateFns(main, [
                    ["addNewOption", addNewOption],
                    ["saveNewOption", saveNewOption],
                    ["editOption", editOption]
                ]);
                main.registerStateChangeIntercept = rfs.getStateChangeInterceptRegister(main);
                main.registerOptionStateChangeIntercept = function(getSpecs) {
                    getOptionInterceptSpecs = getSpecs;
                    optionModels.forEach(function(option) {
                        attachInterceptSpecsToOption(
                            getOptionInterceptSpecs, option);
                    });
                };
            };

            function attachUiFns(obj, fns) {
                fns = _.clone(fns);
                Object.keys(fns).forEach(function(fnName) {
                    obj["UI" + fnName] = fns[fnName];
                });
            };

            function getPersistanceData() {
                var data = _.pick(ivr, wantedProps);
                data.ivr_menu_timeout *= 1000;
                data.ivr_menu_timeout += "";
                data.ivr_menu_max_timeouts += "";
                data.ivr_menu_max_failures += "";
                data.ivr_menu_direct_dial += "";
                data.ivr_opts = main.optionModels.map(getOptionPersistanceData);
                if (data.ivr_menu_exit_app === "hangup") { data.ivr_menu_exit_data = null; }
                return data;
            };

            function getOptionPersistanceData(optionModel) {
                return optionModel.getPersistanceData();
            };

            function getDigitOpts() {
                return [{
                    value: "1",
                    available: true,
                    order: "0"
                }, {
                    value: "2",
                    available: true,
                    order: "1"
                }, {
                    value: "3",
                    available: true,
                    order: "2"
                }, {
                    value: "4",
                    available: true,
                    order: "3"
                }, {
                    value: "5",
                    available: true,
                    order: "4"
                }, {
                    value: "6",
                    available: true,
                    order: "5"
                }, {
                    value: "7",
                    available: true,
                    order: "6"
                }, {
                    value: "8",
                    available: true,
                    order: "7"
                }, {
                    value: "9",
                    available: true,
                    order: "8"
                }, {
                    value: "0",
                    available: true,
                    order: "9"
                }, {
                    value: "#",
                    available: true,
                    order: "10"
                }, {
                    value: "*",
                    available: true,
                    order: "11"
                }];
            };

            function isWantedProp(prop) { return wantedProps.indexOf(prop) > -1; }

            function addNewOption() {
                newOptionModel = new ivrMenuOptionFactory(null, domain,[], aas);
                attachInterceptSpecsToOption(getOptionInterceptSpecs, newOptionModel);
                main.newOptionModel = newOptionModel;
                newOptionModel.edit();
            };

            function attachInterceptSpecsToOption(specsFn, option) {
                var specs = getOptionInterceptSpecs(option);
                specs.forEach(_.spread(option.registerStateChangeIntercept));
            };

            function saveNewOption() {
                newOptionModel.saveChanges();
                optionModels.push(newOptionModel);
                newOptionModel = null;
                main.newOptionModel = newOptionModel;
                updateDigitOpts();
            };

            function updateDigitOpts() {
                function resetDigit(digitOpt) {
                    digitOpt.available = true;
                };
                _.filter(digitOpts, {
                    available: false
                }).forEach(resetDigit);
                optionModels.forEach(function(option) {
                    _.find(digitOpts, {
                        value: option.digitValue
                    }).available = false;
                });
            };

            function editOption(optionModel) {
                var editing = isEditingOption();
                optionModel.edit();
            };

            function deleteOption(optionModel) {
                _.pull(optionModels, optionModel);
                updateDigitOpts();
            };

            function isEditingOption() { return Boolean(main.editingOpt); };

            function getDefaultIvr() {
                return {
                    options: [],
                    ivr_menu_name: "My IVR",
                    ivr_menu_timeout: 5000,
                    ivr_menu_exit_app: "hangup",
                    ivr_menu_max_timeouts: 3,
                    ivr_menu_max_failures: 3,
                    ivr_menu_direct_dial: false
                };
            };

            function makeMenuTopAppOption(option) {
                option.ivr_menu_option_action = "menu-top-app";
                option.ivr_menu_option_param = "";
            };

            function isMenuTopOption(option) {
                var action = option.ivr_menu_option_action;
                var param = option.ivr_menu_option_param;
                var requiredParamStrs = [
                    "transfer", ivr.ivr_menu_extension,
                    "XML", domain.domain_name
                ];

                function isRequiredParamStr(str) {
                    return requiredParamStrs.indexOf(str) > -1;
                }
                return action === "menu-exec-app" && _.every(param.split(" "), isRequiredParamStr);
            };

        };
    }
]);
