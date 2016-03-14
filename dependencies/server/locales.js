exports.parse = function (headers, defaultLocale) {
    var locale = defaultLocale;
    var accepted = headers && headers['accept-language'];
    if (accepted) {
        accepted = accepted.toLowerCase().split(',')[0];
        accepted = accepted.split('-')[0];
        locale = accepted;
    }
    return locale;
}

exports.handler = function (defaultLocale) {

    return function (request, response, next) {
        request.locale = exports.parse(request.headers, defaultLocale);
        next();
    };

};