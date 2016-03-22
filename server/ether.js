var SocketServer = require('websockets/server');
var Peer = require('websockets/peer');
var Log = require('./log');
var Observable = require('commons/observable');
var Commons = require('commons');
var Cookies = require('server/cookies');

module.exports = function (application, configuration) {

    var endpoints = {calls: {}, notifications: {}};

    var ether = Observable.create();

    ether.onCall = function (endpointId, callback) {
        endpoints.calls[endpointId] = callback;
        return ether;
    };

    ether.offCall = function (endpointId) {
        delete endpoints.calls[endpointId];
        return ether;
    };

    ether.onNotification = function (endpointId, callback) {
        endpoints.notifications[endpointId] = callback;
        return ether;
    };

    ether.offNotification = function (endpointId) {
        delete endpoints.notifications[endpointId];
        return ether;
    };


    var onConnection = function (socket) {

        var queue = [];

        var onCall = function (endpointId, parameter, onDone) {
            if (queue) return queue.push(function () {
                onCall(endpointId, parameter, onDone);
            });
            var endpoint = endpoints.calls[endpointId];
            if (!endpoint) return onDone(['ether', 'invalidEndpoint']);
            endpoint(parameter, client, onDone);
        };

        var onNotification = function (endpointId, parameter) {
            if (queue) return queue.push(function () {
                onNotification(endpointId, parameter);
            });
            var endpoint = endpoints.notifications[endpointId];
            if (!endpoint) return Log.error('invalid endpoint: ' + endpointId);
            endpoint(parameter, client);
        };

        var client = Peer(socket, onCall, onNotification);
        client.getSocket = function () {
            return socket;
        };

        prepareClient(client, function (error) {
            if (error) return client.close(error);
            var _queue = queue;
            queue = null;
            Commons.runAll(_queue);
        });

        ether.emit('client', client);
    };


    var metabase = application.metabase;
    var userMap = Commons.MultiMap();
    var sessionMap = Commons.MultiMap();
    var prepareClient = function (client, onDone) {
        var headers = client.getSocket().headers;
        var sessionId = Cookies.parse(headers)[configuration.sessionCookieName];
        if (!sessionId) return onDone(['ether', 'couldNotFindSessionId']);
        metabase.get(sessionId, function (error, session) {
            if (error) return onDone(['ether', 'couldNotLoadSession']);
            var user = session.authorized;
            if (!user) return onDone(['ether', 'noUserAttachedToSession']);
            client.user = user;
            userMap.put(user, client);
            sessionMap.put(session.id, client);
            client.on('close', function () {
                userMap.remove(user, client);
                sessionMap.remove(session.id, client);
            });
            onDone();
        });
    };

    ether.forEachWithUser = userMap.forEach;
    ether.forEachWithSession = sessionMap.forEach;
    ether.forEach = userMap.forEach;

    SocketServer().attach(application.secureServer).on('connection', onConnection);

    return ether;
};



