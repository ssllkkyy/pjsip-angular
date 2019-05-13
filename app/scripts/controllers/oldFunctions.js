$rootScope.formatPhone = function(phone) {
    //console.log(phone);
    if (phone && typeof phone !== 'undefined') {
        if (phone.length < 10) {
            return 'Ext. (' + phone + ')';
        } else if (phone.length === 10) {
            return '(' + phone.substr(0, 3) + ') ' + phone.substr(3, 3) + '-' + phone.substr(6,
                4);
        } else if (phone.length === 11) {
            //return '+'+ phone.substr(0,1) + ' ('+ phone.substr(1,3) + ') ' + phone.substr(4,3) + '-' + phone.substr(7,4); 
            return '(' + phone.substr(1, 3) + ') ' + phone.substr(4, 3) + '-' + phone.substr(7,
                4);
        }
    }
};
