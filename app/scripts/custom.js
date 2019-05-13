"use strict";
var myApp = angular.module('UserApp', []);


// General Section Start
myApp.controller('CompanySetupCtrl', function($scope) {

    $scope.AddUserTab = true;
    $scope.AttentionSetupTab = false;
    $scope.CallQueueTab = false;
    $scope.AudioUploadTab = false;
    $scope.showNext = function(toshow) {
        $scope.AddUserTab = false;
        $scope.AttentionSetupTab = false;
        $scope.CallQueueTab = false;
        $scope.AudioUploadTab = false;
        if (toshow == "AddUserTab") {
            $scope.AddUserTab = true;
        } else if (toshow == "AttentionSetupTab") {
            $scope.AttentionSetupTab = true;
        } else if (toshow == "CallQueueTab") {
            $scope.CallQueueTab = true;
        } else {
            $scope.AudioUploadTab = true;
        }
    }
});

myApp.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    }
});

// General Section End

//.controller('usersCtrl', function($scope) {
//  $scope.sortType     = 'name'; // set the default sort type
//  $scope.sortReverse  = false;  // set the default sort order 
//  
//  // create the list of sushi rolls 
//  $scope.user = [
//    {extension: 'Cali Roll', name: 'Cali Roll', username: 'Crab', password: 2 },
//    {extension: 'Cali Roll', name: 'Philly', username: 'Tuna', password: 4 },
//    {extension: 'Cali Roll', name: 'Tiger', username: 'Eel', password: 7 },
//    {extension: 'Cali Roll', name: 'Rainbow', username: 'Variety', password: 6 }
//  ];
//  
//});


//.controller('usersCtrl', function($scope, $http) {
//    //retrieve employees listing from API
//    $http.get('user').success(function(response) {
//                $scope.user = response; 
//            }); 
//            
//            }); 
//            
//function MyController($scope, $http) {

//   $http.get('user').success(function (response) {
//      $scope.user = response;

// User Extension Section Start

function UserExtensionController($scope) {
    $scope.model = {
        user: [{
                id: 1,
                extension: 'Cali Roll',
                name: 'Cali Roll',
                username: 'Crab',
                password: 2,
                recordopt: 'Test'
            },
            {
                id: 2,
                extension: 'Cali Roll',
                name: 'Philly',
                username: 'Tuna',
                password: 4,
                recordopt: 'Crab'
            },
            {
                id: 3,
                extension: 'Cali Roll',
                name: 'Tiger',
                username: 'Eel',
                password: 7,
                recordopt: 'Crab'
            },
            {
                id: 4,
                extension: 'Cali Roll',
                name: 'Tiger',
                username: 'Eel',
                password: 7,
                recordopt: 'Crab'
            },
            {
                id: 5,
                extension: 'Cali Roll',
                name: 'Tiger',
                username: 'Eel',
                password: 7,
                recordopt: 'Crab'
            },
            {
                id: 6,
                extension: 'Cali Roll',
                name: 'Tiger',
                username: 'Eel',
                password: 7,
                recordopt: 'Crab'
            },
            {
                id: 7,
                extension: 'Cali Roll',
                name: 'Tiger',
                username: 'Eel',
                password: 7,
                recordopt: 'Crab'
            },
            {
                id: 8,
                extension: 'Cali Roll',
                name: 'Tiger',
                username: 'Eel',
                password: 7,
                recordopt: 'Crab'
            },
            {
                id: 9,
                extension: 'Cali Roll',
                name: 'Tiger',
                username: 'Eel',
                password: 7,
                recordopt: 'Crab'
            },
            {
                id: 10,
                extension: 'Cali Roll',
                name: 'Tiger',
                username: 'Eel',
                password: 7,
                recordopt: 'Crab'
            },
            {
                id: 11,
                extension: 'Cali Roll',
                name: 'Rainbow',
                username: 'Variety',
                password: 6,
                recordopt: 'Crab'
            }
        ],
        selected: {}
    };

    $scope.currentPage = 0;
    $scope.pageSize = "10";
    $scope.numberOfPages = function() {
        return Math.ceil($scope.model.user.length / $scope.pageSize);
    }
    $scope.getTemplate = function(roll) {
        if (roll.id === $scope.model.selected.id)
            return 'edit';
        else
            return 'display';
    };

    $scope.reset = function() {
        $scope.model.selected = {};
    };

    $scope.editContact = function(roll) {
        $scope.model.selected = angular.copy(roll);
    };
    $scope.selectEntity = function() {
        // If any entity is not checked, then uncheck the "allItemsSelected" checkbox
        for (var i = 0; i < $scope.model.user.length; i++) {
            if (!$scope.model.user[i].isChecked) {
                $scope.model.user.allItemsSelected = false;
                return;
            }
        }

        //If not the check the "allItemsSelected" checkbox
        $scope.model.user.allItemsSelected = true;
    };


    $scope.selectAll = function() {
        // Loop through all the entities and set their isChecked property
        for (var i = 0; i < $scope.model.user.length; i++) {
            $scope.model.user[i].isChecked = $scope.model.user.allItemsSelected;
        }
    };
    // });
    //    $scope.foo = function() { 
    //    }; 
};

myApp.controller('usersCtrl', UserExtensionController);
myApp.directive('ngConfirmClick', [
    function() {
        return {
            priority: 100,
            restrict: 'A',
            link: function(scope, element, attrs) {
                element.bind('click', function(e) {
                    var message = attrs.ngConfirmClick;
                    if (message && !confirm(message)) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                    }
                });
            }
        }
    }
]);
// User Extension Section End

// Auto Attention Section Start
function AutoAttentionController($scope) {


    $scope.model = {
        attention: [{
                id: 1,
                name: 'Cali Roll',
                message: 'Message1'
            },
            {
                id: 2,
                name: 'Philly',
                message: 'Message2'
            },
            {
                id: 3,
                name: 'Tiger',
                message: 'Eel'
            },
            {
                id: 4,
                name: 'Tiger',
                message: 'Eel'
            },
            {
                id: 5,
                name: 'Tiger',
                message: 'Eel'
            },
            {
                id: 6,
                name: 'test ',
                message: 'Eel'
            },
            {
                id: 7,
                name: 'Tiger',
                message: 'Eel'
            },
            {
                id: 8,
                name: 'Tiger',
                message: 'Eel'
            },
            {
                id: 9,
                name: 'Tiger',
                message: 'Eel'
            },
            {
                id: 10,
                name: 'Tiger',
                message: 'Eel'
            },
            {
                id: 11,
                name: 'Rainbow',
                message: 'Variety'
            }
        ],
        selected: {}
    };

    $scope.currentPage = 0;
    $scope.pageSize = "10";
    $scope.numberOfPages = function() {
        return Math.ceil($scope.model.attention.length / $scope.pageSize);
    }
    $scope.getAttentionTemplate = function(roll) {
        if (roll.id === $scope.model.selected.id)
            return 'editAttention';
        else
            return 'displayAttention';
    };

    $scope.reset = function() {
        $scope.model.selected = {};
    };

    $scope.editContact = function(roll) {
        $scope.model.selected = angular.copy(roll);
    };
    $scope.selectEntity = function() {
        // If any entity is not checked, then uncheck the "allItemsSelected" checkbox
        for (var i = 0; i < $scope.model.attention.length; i++) {
            if (!$scope.model.attention[i].isChecked) {
                $scope.model.attention.allItemsSelected = false;
                return;
            }
        }

        //If not the check the "allItemsSelected" checkbox
        $scope.model.attention.allItemsSelected = true;
    };


    $scope.selectAll = function() {
        // Loop through all the entities and set their isChecked property
        for (var i = 0; i < $scope.model.attention.length; i++) {
            $scope.model.attention[i].isChecked = $scope.model.attention.allItemsSelected;
        }
    };
    // });
    //    $scope.foo = function() { 
    //    }; 
};
myApp.controller('attentionCtrl', AutoAttentionController);
// Auto Attention Section End

//Queue Section Start
function QueueController($scope) {
    $scope.model = {
        queue: [{
                id: 1,
                queue_name: 'Cali Roll',
                queue_extension: 'Cali Roll',
                ring_strategy: 'Crab',
                call_recorded: 2
            },
            {
                id: 2,
                queue_name: 'Cali Roll',
                queue_extension: 'Philly',
                ring_strategy: 'Tuna',
                call_recorded: 4
            },
            {
                id: 3,
                queue_name: 'Cali Roll',
                queue_extension: 'Cali Roll',
                ring_strategy: 'Crab',
                call_recorded: 2
            },
            {
                id: 4,
                queue_name: 'Cali Roll',
                queue_extension: 'Philly',
                ring_strategy: 'Tuna',
                call_recorded: 4
            },
            {
                id: 5,
                queue_name: 'Cali Roll',
                queue_extension: 'Tiger',
                ring_strategy: 'Eel',
                call_recorded: 7
            },
            {
                id: 6,
                queue_name: 'Cali Roll',
                queue_extension: 'Cali Roll',
                ring_strategy: 'Crab',
                call_recorded: 2
            },
            {
                id: 7,
                queue_name: 'Cali Roll',
                queue_extension: 'Philly',
                ring_strategy: 'Tuna',
                call_recorded: 4
            },
            {
                id: 8,
                queue_name: 'Cali Roll',
                queue_extension: 'Tiger',
                ring_strategy: 'Eel',
                call_recorded: 7
            }
        ],
        selected: {}
    };
    $scope.currentPage = 0;
    $scope.pageSize = "10";
    $scope.numberOfPages = function() {
        return Math.ceil($scope.model.queue.length / $scope.pageSize);
    }

    $scope.getQueueTemplate = function(roll) {
        if (roll.id === $scope.model.selected.id)
            return 'editQueue';
        else
            return 'displayQueue';
    };

    $scope.reset = function() {
        $scope.model.selected = {};
    };

    $scope.editContact = function(roll) {
        $scope.model.selected = angular.copy(roll);
    };


    $scope.selectEntity = function() {
        // If any entity is not checked, then uncheck the "allItemsSelected" checkbox
        for (var i = 0; i < $scope.model.queue.length; i++) {
            if (!$scope.model.queue[i].isChecked) {
                $scope.model.queue.allItemsSelected = false;
                return;
            }
        }
        //If not the check the "allItemsSelected" checkbox
        $scope.model.queue.allItemsSelected = true;
    };


    $scope.selectAll = function() {
        // Loop through all the entities and set their isChecked property
        for (var i = 0; i < $scope.model.queue.length; i++) {
            $scope.model.queue[i].isChecked = $scope.model.queue.allItemsSelected;
        }
    };
    // });
    //    $scope.foo = function() { 
    //    }; 
};
myApp.controller('queueCtrl', QueueController);
//Queue Section End


//Audio Upload Section Start
function AudioUploadController($scope) {
    $scope.model = {
        audioupload: [{
                id: 1,
                file_name: 'Cali Roll'
            },
            {
                id: 2,
                file_name: 'Cali Roll'
            },
            {
                id: 3,
                file_name: 'Cali Roll'
            },
            {
                id: 4,
                file_name: 'Cali Roll'
            },
            {
                id: 5,
                file_name: 'Cali Roll'
            },
            {
                id: 6,
                file_name: 'Cali Roll'
            },
            {
                id: 7,
                file_name: 'Cali Roll'
            },
            {
                id: 8,
                file_name: 'Cali Roll'
            },
            {
                id: 9,
                file_name: 'Cali Roll'
            },
            {
                id: 10,
                file_name: 'Cali Roll'
            },
            {
                id: 11,
                file_name: 'Cali Roll'
            }
        ],
        selected: {}
    };
    $scope.currentPage = 0;
    $scope.pageSize = "10";
    $scope.numberOfPages = function() {
        return Math.ceil($scope.model.audioupload.length / $scope.pageSize);
    }
    $scope.getAudioTemplate = function(roll) {
        if (roll.id === $scope.model.selected.id)
            return 'editAudio';
        else
            return 'displayAudio';
    };

    $scope.reset = function() {
        $scope.model.selected = {};
    };

    $scope.editContact = function(roll) {
        $scope.model.selected = angular.copy(roll);
    };
    $scope.selectEntity = function() {
        // If any entity is not checked, then uncheck the "allItemsSelected" checkbox
        for (var i = 0; i < $scope.model.audioupload.length; i++) {
            if (!$scope.model.audioupload[i].isChecked) {
                $scope.model.audioupload.allItemsSelected = false;
                return;
            }
        }
        //If not the check the "allItemsSelected" checkbox
        $scope.model.audioupload.allItemsSelected = true;
    };


    $scope.selectAll = function() {
        // Loop through all the entities and set their isChecked property
        for (var i = 0; i < $scope.model.audioupload.length; i++) {
            $scope.model.audioupload[i].isChecked = $scope.model.audioupload.allItemsSelected;
        }
    };
    // });
    //    $scope.foo = function() { 
    //    }; 
};
myApp.controller('audioUploadCtrl', AudioUploadController);

//Audio Upload Section End
