'use strict';

proySymphony.service('tagService', function($mdDialog, $rootScope, _, dataFactory, $filter) {

    var service = {
        availableTags: []
    };

    service.getTags = function() {
        dataFactory.getAvailableTags()
        .then(function(response){
            console.log(response);
            if (response.data.success) {
                service.availableTags = response.data.success.data;
            }
        });
    };

    service.addNewTag = function(tagname) {
        var data = {
            tagname: tagname
        };
        return dataFactory.postCreateNewTag(data)
        .then(function(response){
            if (response.data.success) {
                var tag = response.data.success.data;
                service.availableTags.push(tag);
            }
            return response;
        });
    };

    service.getTagByName = function(tagname) {
        var tag = _.find(service.availableTags, ['tag', tagname]);
        return tag;
    };

    service.getTagNameByName = function(tagname) {
        var tag = _.find(service.availableTags, ['tag', tagname]);
        return tag ? tag.tag_name : null;
    };

    service.removeTagFromContact = function(contact, tagname) {
        console.log(contact);
        console.log(tagname);
        var data = {
            tags: [tagname],
            contacts: [contact.cuuid]
        };
        dataFactory.postRemoveTags(data)
        .then(function(response){
            if (response.data.error) $rootScope.showErrorAlert(response.data.error.message);
        });
    };

    service.assignTags = function(tags, targets, type) {
        var data = {
            tags: tags,
            targets: targets,
            type: type
        };
        return dataFactory.postAssignTags(data)
        .then(function(response){
            return response;
        });
    };

    return service;
});
