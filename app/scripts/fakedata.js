var fakedata = {
    getRandomInt: function(max) {
        max = Math.floor(max);
        return Math.floor(Math.random() * max);
    },
    randomString: function(length) {
        return Math.random().toString(36).substring(length);
    },
    getFakeEnteredBy: function() {
        return {
            first_name: this.randomString(7),
            last_name: this.randomString(7)
        };
    },
    getFakeQuoteFor: function() {
        return {
            first_name: this.randomString(7),
            last_name: this.randomString(7),
            insurance_target: this.randomString(15)
        };
    },
    getFakeUpdatedDateTime: function() {
        var numDays = this.getRandomInt(30);
        return moment().subtract(numDays, 'days').toDate();
    },
    getFakeType: function() {
        var types = ['Personal Auto', 'Commercial Auto', 'Personal Home',
            'Personal Motorcycle'
        ];
        return types[this.getRandomInt(types.length)];
    },
    getFakeStatus: function() {
        var statuses = ['Completed', 'In Process'];
        return statuses[this.getRandomInt(statuses.length)];
    },
    getFakeQuote: function() {
        return {
            'entered_by': this.getFakeEnteredBy(),
            'quote_for': this.getFakeQuoteFor(),
            'updated_at': this.getFakeUpdatedDateTime(),
            'type': this.getFakeType(),
            'status': this.getFakeStatus()
        };
    },
    getFakeName: function() {
        return this.randomString(2);
    },
    getFakeTemplate: function() {
        return {
            'description': this.getFakeName(),
            'updated_at': this.getFakeUpdatedDateTime(),
            'type': this.getFakeType()
        };
    }
};
