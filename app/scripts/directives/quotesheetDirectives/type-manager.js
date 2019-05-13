'use strict';

proySymphony.directive('typeManager', function(quoteSheetService, resourceFrameworkService, $window,
    $timeout, userService, $rootScope) {
    return {
        restrict: 'E',
        templateUrl: 'views/quotesheets/type-manager.html',
        scope: {},
        link: function($scope, element, attributes) {
            var qss = quoteSheetService;
            $scope.init = function() {
                qss.registerEventCallback('onAfterInit', function() {
                    $scope.isKotterTech = userService.isKotterTechOrGreater();
                    var refreshRegisterFn = resourceFrameworkService.getResourceRefreshRegister({
                        service: qss,
                        scope: $scope
                    });
                    var serviceResourceName = $scope.isKotterTech ?
                        'activeTypes' : 'activeNonGlobalTypes';
                    refreshRegisterFn({
                        resourceName: 'types',
                        serviceResourceName: serviceResourceName,
                        onAfterRefresh: function() {
                            assignInitialValsToTypes($scope.types);
                        }
                    });
                    $scope.newTypeData = {};
                    if ($scope.isKotterTech) {
                        $scope.tableControls.columnNames.global.hidden =
                            false;
                    };
                });
            };

            $scope.tableControls = {
                columnNames: {
                    quote_sheet_type_name: {
                        name: 'quote_sheet_type_name',
                        text: 'Type Name',
                        className: 'type-name',
                        editable: true
                    },
                    description: {
                        name: 'description',
                        text: 'Type Description',
                        className: 'type-description',
                        editable: true
                    },
                    type: {
                        name: 'type',
                        text: 'Personal or Commercial',
                        className: 'type-type'
                    },
                    global: {
                        name: 'global',
                        text: 'Global',
                        className: 'global',
                        hidden: true
                    },
                    action: {
                        name: 'action',
                        text: 'Action',
                        className: 'action',
                        nonResourceCol: true
                    }
                },
                types: [],
                filteredTypes: []
            };

            function assignInitialValsToTypes(types) {
                var columnNames = $scope.tableControls.columnNames;
                var columns = [columnNames.type, columnNames.global].filter(Boolean);
                var keys;
                types.forEach(function(type) {
                    Object.keys(type).forEach(function(key) {
                        $scope.assignInitialTypeFieldValue(type, key);
                    });
                });
            };

            $scope.filteredTypesLength = function() {
                return $scope.tableControls.filteredTypes.length;
            };

            $scope.deleteType = function(type) {
                var message = 'Are you sure you want to delete the ' +
                    type.quote_sheet_type_name + ' type?';
                var subMessage = 'Any quotes created using it will be preserved';
                $rootScope.confirmDialog(message, subMessage).then(function(
                    response) {
                    if (response) {
                        qss.deleteType(type)
                            .then(function(response) {
                                if (response) {
                                    message =
                                        "Type successfully deleted";
                                    $rootScope.showInfoAlert(message);
                                } else {
                                    message =
                                        "We were unable to delete this type. Please " +
                                        "report this bug via our support line in the top-right" +
                                        " corner of your screen";
                                    $rootScope.showErrorAlert(message);
                                }
                            });
                    }
                });
            };

            $scope.updateType = function(type) {
                type.updatedType = getEditFieldDecoratedType(type);
                qss.postUpdateType(type)
                    .then(function(response) {
                        if (response) {
                            $rootScope.showSuccessAlert('Type updated');
                        } else {
                            var message =
                                "We were unable to update this type. Please " +
                                "report this bug via our support line in the top-right" +
                                " corner of your screen";
                            $rootScope.showErrorAlert(message);
                        }
                    });
            };

            $scope.createType = function(typeData) {
                qss.createType(typeData)
                    .then(function(response) {
                        if (response) {
                            angular.copy({}, $scope.newTypeData);
                            $rootScope.showSuccessAlert('Type created');
                        } else {
                            var message =
                                "We were unable to create this type. Please " +
                                "report this bug via our support line in the top-right" +
                                " corner of your screen";
                            $rootScope.showErrorAlert(message);
                        };
                    });
            };

            $scope.toggleEditField = function(type, fieldName) {
                if (!$scope.isKotterTech && type.global) {
                    return;
                }
                var className = $scope.tableControls.columnNames[fieldName].className;
                var editingFieldName = 'editing_' + fieldName;
                if ($scope.editingTypeField(type, fieldName)) {
                    type[editingFieldName] = false;
                } else {
                    var editedFieldName = $scope.editedFieldName(fieldName);
                    var typeUuid = type.quote_sheet_type_uuid;
                    var queryString = 'td.' + className + '-col[data-type-id="' +
                        typeUuid + '"]';
                    var inputElement = angular.element(queryString).find('input');
                    type[editingFieldName] = true;
                    if (!type[editedFieldName]) {
                        type[editedFieldName] = type[fieldName];
                    }
                    focusElement(inputElement);
                }
            };

            $scope.typeHasBeenEdited = function(type) {
                var keys = ['description', 'type', 'global', 'active',
                    'quote_sheet_type_name'
                ];

                function editedFieldValue(key) {
                    if (isEditedField(key)) {
                        return false;
                    }
                    var result = $scope.editedFieldValue(type, key);
                    return result ? result.changed : false;
                };
                return _.some(keys, editedFieldValue);
            };

            function isEditedField(field) {
                return Boolean(field.match(/edited_/));
            };

            $scope.editingTypeField = function(type, fieldName) {
                var editingFieldName = 'editing_' + fieldName;
                return Boolean(type[editingFieldName]);
            };

            $scope.editedFieldName = function(fieldName) {
                return 'edited_' + fieldName;
            };

            $scope.editedFieldValue = function(type, fieldName) {
                var editedFieldValue = type[$scope.editedFieldName(fieldName)];
                if (editedFieldValue !== type[fieldName]) {
                    return {
                        changed: true,
                        value: editedFieldValue
                    };
                    // return editedFieldValue;
                    // return editedFieldValue ? editedFieldValue : true;
                }
                return null;
            };

            $scope.getFieldDisplayValue = function(type, fieldName) {
                if ($scope.editedFieldValue(type, fieldName)) {
                    return $scope.editedFieldValue(type, fieldName).value;
                } else {
                    return type[fieldName];
                }
            };

            $scope.assignInitialTypeFieldValue = function(type, key) {
                type[$scope.editedFieldName(key)] = type[key];
            };

            $scope.newTypeDataIsValid = function() {
                var type = $scope.newTypeData;
                var props = getNonResourceProps();
                if (type) {
                    function hasValidValueForProp(prop) {
                        var value = type[prop];
                        if (prop === 'type') {
                            return value === 'commercial' || value === 'personal';
                        } else if (prop === 'global') {
                            return true;
                        } else {
                            return Boolean(value);
                        }
                    }
                    var results = props.map(hasValidValueForProp);
                    return _.every(results, Boolean);
                }
                return null;
            };

            function focusElement(jqElement) {
                $timeout(function() {
                    jqElement.focus();
                });
            };

            function getNonResourceProps() {
                function isResourceColumn(col) {
                    return !col.nonResourceCol;
                };

                function getColName(col) {
                    return col.name;
                };

                function getColFromKey(key) {
                    return $scope.tableControls.columnNames[key];
                };
                var keys = Object.keys($scope.tableControls.columnNames);
                var cols = keys.map(getColFromKey);
                return cols.filter(isResourceColumn).map(getColName);
            };

            $scope.getNonResourceProps = getNonResourceProps;

            function getEditFieldDecoratedType(type) {
                var props = getNonResourceProps();
                var decoratedType = {};

                function attachUpdatedValue(prop) {
                    decoratedType[prop] = $scope.getFieldDisplayValue(type, prop);
                    return true;
                };
                props.forEach(attachUpdatedValue);
                decoratedType.quote_sheet_type_uuid = type.quote_sheet_type_uuid;
                return decoratedType;
            }

            $window.typeMScope = $scope;

            $scope.init();
        }
    };
});
