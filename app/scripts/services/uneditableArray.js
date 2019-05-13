proySymphony.factory("uneditableArrayFactory", function uneditableArray() {
    return function model(resources) {
        var main = this;
        var cache;
        var derivedProps = [];

        function init() {
            resources = resources ? resources.slice() : [];
            cache = [].concat(resources);
            defineProps();
        };
        init();

        function defineProps() {
            Object.defineProperties(main, {
                resources: { enumerable: true, get: function() { return cache; } }
            });
            main.reset = reset;
            main.addResource = addResource;
            main.removeResource = removeResource;
            main.removeResourceByProp = removeResourceByProp;
            main.setDerivedProp = setDerivedProp;
            main.findResource = findResource;
            main.findAndUpdateResource = findAndUpdateResource;
            main.isUneditableArray = true;
        };

        function reset(srcColl) {
            if (!srcColl) { srcColl = []; }
            performCacheReset(resources)(srcColl);
            performCacheReset(cache)(resources);
            derivedProps.forEach(triggerDerivedReset);
        };

        // SOURCE COLLECTION MUTATIONS
        // ---------------------------
        function onSourceCollMutation() {
            performCacheReset(cache)(resources);
        };

        function findAndUpdateResource(findProp, findValue, updateProp, updateValue) {
            var resource = findResource(findProp, findValue);
            resource[updateProp] = updateValue;
            onSourceCollMutation();
            return resource;
        };

        function addResource(resource) {
            resources.push(resource);
            cache.push(resource);
            derivedProps.forEach(triggerDerivedReset);
            onSourceCollMutation();
            return cache.length;
        };

        function removeResource(resource) {
            removeFromColl(resource, cache);
            var result = removeFromColl(resource, resources);
            derivedProps.forEach(triggerDerivedReset);
            onSourceCollMutation();
            return result;
        };

        function removeResourceByProp(resourceProp, resourcePropVal) {
            var spec = {};
            spec[resourceProp] = resourcePropVal;
            var internalResource = _.find(cache, spec);
            if (internalResource) {
                removeResource(internalResource);
            }
        };
        // ---------------------------

        function findResource(prop, value) {
            var findSpec = {};
            findSpec[prop] = value;
            return _.find(cache, findSpec);
        };

        function triggerDerivedReset(derivedProp) {
            var deriveResult = main[derivedProp];
            return deriveResult;
        };

        function setDerivedProp(propName, deriveFn, deriveFnIsPure) {
            if (!_.isFunction(deriveFn)) { return false; }
            var derivedCache = [];
            var spec = {
                enumerable: true,
                get: function() {
                    if (!deriveFnIsPure || derivedCache.length !== cache.length) {
                        resetCache(deriveFn(cache), derivedCache);
                    }
                    return derivedCache;
                }
            };
            defineProp(propName, spec);
            return true;
        };

        function defineProp(propName, spec) {
            if (derivedProps.indexOf(propName) === -1) {
                Object.defineProperty(main, propName, spec);
                derivedProps.push(propName);
            }
        };

        function resetCache(srcColl, cacheColl) {
            var reset = performCacheReset(cacheColl);
            if (!srcColl || srcColl === resources) {
                reset(resources);
            } else if (srcColl !== resources) {
                reset(resources);
                reset(srcColl);
            }
        };

        function performCacheReset(cacheColl) {
            return function(srcColl) {
                cacheColl.length = 0;
                srcColl.forEach(pushValToArray(cacheColl));
            };
        };

        function removeFromColl(resource, coll) {
            return coll.length - 1 === _.pull(coll, resource).length;
        };

        function pushValToArray(arr) {
            return function(val) { arr.push(val); };
        };
    };
});
