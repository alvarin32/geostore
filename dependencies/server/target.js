module.exports = function (app) {
    app.use(function (request, response, next) {
        var url = request.url;
        var parsed = parse(url);
        request.target = createTarget(parsed.parts, parsed.parameters);
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
        return target.startsWith.apply(this, arguments) &&
            parts.length == arguments.length;
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
    return target;
};

var parse = function (url) {
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
    return {parts: parts, parameters: parameters};
};

var parseParameters = function (string) {
    var parameters = {};
    var split = string.split('&');
    for (var i = 0; i < split.length; i++) {
        var keyAndValue = split[i].split('=');
        var key = decodeURIComponent(keyAndValue[0]);
        parameters[key] = keyAndValue[1]
            ? decodeURIComponent(keyAndValue[1])
            : true;
    }
    return parameters;
};