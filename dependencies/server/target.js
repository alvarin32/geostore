exports.handler = function (request, response, next) {
    var url = request.url;
    parse(url, function (parts, parameters) {
        request.target = createTarget(parts, parameters);
        next();
    });
};

var createTarget = function (parts, parameters) {
    var target = {};
    target.isRoot = !parts.length;
    target.startsWith = function () {
        var length = arguments.length;
        if (parts.length < length) return false;
        for (var i = 0; i < length; i++) {
            if (parts[i] != arguments[i]) return false;
        }
        return true;
    };
    target.is = function () {
        return parts.length == arguments.length && target.startsWith.apply(this, arguments);
    };
    target.getParameter = function (key) {
        return parameters[key];
    };
    target.getPart = function (index) {
        return parts[index];
    };
    target.hasDots = function () {
        var length = parts.length;
        for (var i = 0; i < length; i++) {
            var value = parts[i];
            if (value === '.' || value === '..') return true;
        }
        return false;
    };
    target.size = function () {
        return parts.length;
    };
    target.url = '/' + parts.join('/');
    return target;
};

var parse = function (url, onDone) {
    var indexOfQuestionMark = url.indexOf('?');
    var parts, parameters;
    if (indexOfQuestionMark >= 0) {
        parts = url.substr(0, indexOfQuestionMark).split('/');
        parameters = parseParameters(url.substr(indexOfQuestionMark + 1));
    } else {
        parts = url.split('/');
        parameters = {};
    }
    while (parts.length && parts[0] === '') parts.shift();
    onDone(parts, parameters);
};

var parseParameters = function (string) {
    var parameters = {};
    var split = string.split('&');
    for (var i = 0; i < split.length; i++) {
        var keyAndValue = split[i].split('=');
        var key = decodeURIComponent(keyAndValue[0]);
        var value = keyAndValue[1];
        parameters[key] = value ? decodeURIComponent(value) : true;
    }
    return parameters;
};