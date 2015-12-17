var Cookies = require('cookies');
var Commons = require('commons');

module.exports = function (app, options) {

    var create = options.create || DEFAULTS.create;
    var get = options.get || DEFAULTS.get;
    var update = options.update || DEFAULTS.update;
    var computeExpiry = options.computeExpiry || DEFAULTS.computeExpiry;
    var cookieName = options.cookieName || '3mm520100609';

    app.use(function (request, response, next) {

        var _session;

        request.getSession = function (onDone) {
            if (_session) return onDone(undefined, _session);
            getSessionId(request, response, function (error, id) {
                if (error) return onDone(error);
                getOrCreateSession(id, request, response, function (error, session) {
                    _session = wrap(session, response);
                    return onDone(undefined, _session);
                })
            });
        };

        next();
    });

    var wrap = function (session, response) {
        var dirty = false;
        var wrapped = {};
        wrapped.get = function (key) {
            return session[key];
        };
        wrapped.put = function (key, value) {
            dirty = true;
            session[key] = value;
        };
        wrapped.delete = function (key) {
            dirty = true;
            delete session[key];
        };
        wrapped.hasSet = function (key) {
            return key in session;
        };
        response.on('finish', function () {
            if (options.forceUpdate || dirty) update(session);
        });
        return wrapped;
    };

    var createSession = function (request, response, onDone) {
        var cookies = new Cookies(request, response);
        create(request, response, function (error, session) {
            if (error) return onDone(error);
            var expiry = computeExpiry(session, request);
            cookies.set(cookieName,
                session.id,
                {httpOnly: true, secure: true, expires: expiry});
            return onDone(undefined, session);
        });
    }

    var getSessionId = function (request, response, onDone) {
        var body = request.body;
        if (body && body.sessionId) return onDone(undefined, body.sessionId);
        var cookies = new Cookies(request, response);
        var id = cookies.get(cookieName);
        return onDone(undefined, id);
    };

    var getOrCreateSession = function (id, request, response, onDone) {
        if (!id) return createSession(request, response, onDone);
        get(id, function (error, session) {
            if (error) return createSession(request, response, onDone);
            return onDone(undefined, session);
        });
    };

};


var sessionCache = Commons.LruCache(1000);

var DEFAULTS = {

    create: function (request, response, onDone) {
        var id = Commons.randomId(8);
        var session = {id: id};
        sessionCache.put(id, session);
        onDone(undefined, session);
    },

    get: function (id, onDone) {
        var session = sessionCache.get(id);
        if (!session) return onDone('session not found');
        onDone(undefined, session);
    },

    update: function (session) {
        //NOOP
    },

    computeExpiry: function () {
        var halfAYear = 1000 * 60 * 60 * 24 * 30 * 6;
        var now = (new Date()).getTime();
        return new Date(now + halfAYear);
    }

};