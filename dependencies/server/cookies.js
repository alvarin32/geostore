exports.parse = function (headers) {
    var cookies = {};
    var header = headers && headers['cookie'];
    if (!header) return;
    header = header.split(';');
    for (var i = 0; i < header.length; i++) {
        var cookie = header[i];
        cookie = cookie.split('=');
        var name = cookie[0].trim().toLowerCase();
        var value = cookie[1].trim();
        cookies[name] = value;
    }
    return cookies;
};

exports.setCookie = function (cookie, response) {
    var header = response.getHeader('set-cookie') || [];
    if (!Array.isArray(header)) header = [header];
    var cookieLine = cookie.name + '=' + cookie.value;
    if (cookie.expires) cookieLine += ';EXPIRES=' + cookie.expires.toUTCString();
    if (cookie.secure) cookieLine += ';SECURE';
    if (cookie.httpOnly) cookieLine += ';HTTPONLY';
    cookieLine += ';PATH=' + (cookie.path || '/');
    header.push(cookieLine);
    response.setHeader('set-cookie', header);
};

exports.handler = function (request, response, next) {

    var cookies;
    request.getCookie = function (id) {
        if (!cookies) {
            cookies = exports.parse(request.headers);
        }
        return cookies[id];
    };

    response.setCookie = function (cookie) {
        exports.setCookie(response, cookie);
    };

    next();
};