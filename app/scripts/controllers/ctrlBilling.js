'use strict';

proySymphony.controller('BillingCtrl', function($scope, $myModal, $filter, $location, $routeParams,
    $rootScope, $auth, $window, usefulTools, dataFactory, __env, symphonyConfig, $interval,
    $timeout) {

    $scope.paid = false;
    $scope.showNewCard = false;
    $scope.amount = 10;

    function getAvailableCards() {
        $scope.savedCards = [];
    }
    getAvailableCards();

    function retrieveInvoices() {


    }



    $scope.initializeBilling = function() {
        $scope.accountInvoices = [];
        dataFactory.getInvoices()
            .then(function(response) {
                if (response.data.success) {
                    $scope.accountInvoices = response.data.success.invoices;
                    $scope.balanceDue = response.data.success.balance;
                    $scope.lastPayment = response.data.success.lastPayment;


                } else {
                    console.log(response.data.error.message);
                }
            })
    };

    // $scope.addStripePayment = function() {
    //     var data = {
    //         card_id: $scope.card_id, 
    //         pay_amount: $scope.pay_amount
    //     }
    //     dataFactory.postAddStripePayment(data)
    //     .then(function(response){
    //         if (response.data.success) {
    //             $scope.savedCards.push(response.data.success.data);
    //             console.log($scope.savedCards);
    //             $scope.showNewCard = false;
    //         }
    //     });
    // }

    $scope.handleStripe = function(status, response) {
        if (response.error) {
            $scope.paid = false;
            $scope.message = "Error from Stripe.com"
            console.log($scope.message);
        } else {
            var $payInfo = {
                'token': response.id,
                'customer_id': 'cus_9FUMzLfY7b1g2W',
                'total': $scope.amount
            };

            console.log($payInfo);
            $scope.paid = true;

            /*$http.post('/api/payreservation', $payInfo).success(function(data){
                if(data.status=="OK"){
                    $scope.paid= true;
                    $scope.message = data.message;
                }else{
                    $scope.paid= false;
                    $scope.message = data.message;
                }
            });*/
        }
    };


});
