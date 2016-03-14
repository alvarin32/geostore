var Ajax = require('client/ajax');

var labels = {};
var version = 0;

var get = function (path) {
    if (!isArray(path)) path = toArray(arguments);
    var current = labels;
    for (var i = 0; i < path.length; i++) {
        var subKey = path[i];
        if (isObject(current) && (subKey in current)) {
            current = current[subKey];
        } else {
            return path.join('.');
        }
    }
    if (isString(current)) return current;
    return path.join('.');
};

var toArray = function (args) {
    var array = [];
    for (var i = 0; i < args.length; i++) {
        array.push(args[i]);
    }
    return array;
};

var initialize = function (onDone) {

    var stored = {modified: 0};
    if (false && localStorageAvailable) {
        stored = JSON.parse(localStorage.getItem('labels')) || stored;
    }

    Ajax.post('/api/i18n')
        .attach(stored)
        .onSuccess(function (response) {
            response = JSON.parse(response);
            if (response.labels) {
                labels = response.labels;
                localStorage.setItem('labels', JSON.stringify(response));
            } else {
                labels = stored.labels;
            }
            onDone();
        })
        .onFailure(onDone)
        .send();
};

var clear = function () {
    if (localStorageAvailable) {
        localStorage.removeItem('labels');
    }
};


var localStorageAvailable = (function () {
    if (!localStorage) return false;
    try {
        var dummyKey = '32874_dummy';
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
    clear: clear,
    initialize: initialize
};