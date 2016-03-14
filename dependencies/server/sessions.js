var Cookies = require('./cookies');

/*

 backend:
 =================
 get(id, onDone)
 create(onDone)

 */


module.exports = function (cookieName, backend) {

    var handler = function (request, response, next) {
        getSession(request, response, function (error, session) {
            request.session = session;
            next();
        });
    };

    var getSession = function (request, response, onDone) {
        var sessionId = parseIdFromCookie(request);
        if (!sessionId) return createSession(response, onDone);
        backend.get(sessionId, function (error, session) {
            if (error || !session) return createSession(response, onDone);
            onDone(undefined, session);
        });
    };

    var createSession = function (response, onDone) {
        backend.create(function (error, session) {
            if (error) return onDone(error);
            setIdAsCookie(session.id, response);
            onDone(undefined, session);
        });
    };

    var parseIdFromCookie = function (request) {
        var cookies = request.headers['cookie'];
        if (!cookies) return;
        cookies = cookies.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            cookie = cookie.split('=');
            var name = cookie[0].trim().toLowerCase();
            if (name == cookieName) {
                return cookie[1].trim();
            }
        }
    };

    var setIdAsCookie = function (id, response) {
        var cookie = {name: cookieName, value: id, secure: true, httpOnly: true, expires: getExpiry()};
        Cookies.setCookie(cookie, response);
    };

    var getExpiry = function () {
        var now = (new Date()).getTime();
        var inAboutAYear = now + 1000 * 60 * 60 * 24 * 365;
        return new Date(inAboutAYear);
    };

    return handler;

};