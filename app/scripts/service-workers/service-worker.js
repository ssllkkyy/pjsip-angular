self.addEventListener("notificationclick", function(event) {
    event.notification.close();
    event.waitUntil(clients.matchAll({
        includeUncontrolled: true
    }).then(function(clientList) {
        var client;
        clientList.forEach(function(item){
            if (item.url.indexOf('/screenpop') === -1) client = item;
        });
        if (!client) client = clientList[0];
        client.focus();
        client.postMessage({
            action: event.action
        });
    }));
});
