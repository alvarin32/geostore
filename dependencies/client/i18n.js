var Ajax = require('./ajax');

var labels = {};
var version = 0;
var listeners = [];
var ready = false;

var onReady = function (listener) {
    if (ready) listener();
    else listeners.push(listener);
};

var setReady = function () {
    ready = true;
    listeners.forEach(function (listener) {
        listener();
    });
};

var get = function () {
    var result = getOrNull(arguments);
    if (result == null) {
        result = Array.prototype.join.call(arguments, '.');
    }
    return result;
};

var getOrNull = function (path) {
    var current = labels;
    for (var i = 0; i < path.length; i++) {
        var subKey = path[i];
        if (isObject(current) && (subKey in current)) {
            current = current[subKey];
        } else {
            return null;
        }
    }
    if (isString(current)) return current;
    return null;
};

var initialize = function (onDone) {
    if (localStorageAvailable) {
        labels = JSON.parse(localStorage.getItem('labels')) || {};
        version = parseInt(localStorage.getItem('labelsVersion')) || 0;
    }
    var onSuccess = function (response) {
        response = response == "" ? {} : JSON.parse(response);
        if ('labels' in response) {
            labels = response['labels'];
            version = response['version'];
            if (localStorageAvailable) {
                var json = JSON.stringify(labels);
                localStorage.setItem('labels', json);
                localStorage.setItem('labelsVersion', version);
            }
        }
        setReady();
        onDone();
    };

    var onFailure = function (statusText) {
        console.log(statusText);
        console.log('could not load labels. moving on with keys only.');
        setReady();
        onDone();
    };

    Ajax.request('POST', 'api/i18n')
        .attach({version: version})
        .onSuccess(onSuccess)
        .onFailure(onFailure)
        .send();
};

var clear = function () {
    if (localStorageAvailable) {
        localStorage.removeItem('labels');
        localStorage.removeItem('labelsVersion');
    }
};


var localStorageAvailable = (function () {
    if (!localStorage) return false;
    try {
        var dummyKey = 'gis_dummy';
        var dummyValue = 'a value';
        localStorage.setItem(dummyKey, dummyValue);
        var result = localStorage.getItem(dummyKey);
        if (result != dummyValue) return false;
        localStorage.removeItem(dummyKey);
        return true;
    } catch (exception) {
        return false;
    }
})();


module.exports = {
    get: get,
    onReady: onReady,
    getOrNull: getOrNull,
    clear: clear,
    initialize: initialize
};