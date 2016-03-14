var Observable = require('commons/observable');
var Timer = require('commons/timer');

var TYPE = {
    CALL: 0,
    NOTIFICATION: 1,
    ANSWER: 2,
    PING: 3,
    PONG: 4
};

var TIMEOUT_IDLE = Math.round(1000 * 60 * (7 + 3 * Math.random()));
var TIMEOUT_PING = 1000 * 10;

module.exports = function (socket, $onCall, $onNotification) {

    var pendingCalls = {};

    var createId = (function () {
        var nextId = 1;
        return function () {
            return nextId++;
        };
    })();

    var hasBeenClosed = false;
    var onClose = function () {
        if (hasBeenClosed) return;
        hasBeenClosed = true;
        cancelAllPendingCalls('peer closed before the answer has been received.');
        peer.emit('close');
    };

    var cancelAllPendingCalls = function (error) {
        keysOf(pendingCalls).forEach(function (key) {
            pendingCalls[key](error);
        });
    };

    var peer = Observable.create();

    peer.close = function (error) {
        if (error) console.error('peer is going down due to an error: ' + error);
        socket.close();
    };
    peer.call = function (endpointId, parameters, callback) {
        if (arguments.length == 2) {
            callback = parameters;
            parameters = {};
        }
        if (!assertAlive(callback)) return;
        var id = createId();
        pendingCalls[id] = function () {
            delete pendingCalls[id];
            callback.apply(this, arguments);
        };
        socket.send({
            type: TYPE.CALL,
            endpointId: endpointId,
            id: id,
            parameters: parameters
        });
        return peer;
    };
    peer.notify = function (endpointId, parameters) {
        if (!assertAlive()) return;
        socket.send({
            type: TYPE.NOTIFICATION,
            endpointId: endpointId,
            parameters: parameters
        });
        return peer;
    };

    var onCall = function (call) {
        var endpointId = call.endpointId;
        var parameters = call.parameters;
        var callId = call.id;

        var onDone = function (error, result) {
            socket.send({
                type: TYPE.ANSWER,
                id: callId,
                error: error,
                result: result
            });
        };

        $onCall(endpointId, parameters, onDone);
    };

    var onNotification = function (notification) {
        var endpointId = notification.endpointId;
        var parameters = notification.parameters;
        $onNotification(endpointId, parameters);
    };

    var onAnswer = function (answer) {
        var callId = answer.id;
        var error = answer.error;
        var result = answer.result;
        return pendingCalls[callId](error, result);
    };

    var assertAlive = function (callback) {
        if (!hasBeenClosed) return true;
        var error = 'peer has been closed already';
        callback ? nextStep(callback, error) : console.error(error);
        return false;
    };

    var sendPing = function () {
        socket.send({type: TYPE.PING});
        pingTimer.start();
    };

    var idleTimer = Timer(sendPing, TIMEOUT_IDLE);
    var pingTimer = Timer(peer.close, TIMEOUT_PING);

    socket.on('close', onClose);
    socket.on('reset', function () {
        cancelAllPendingCalls('peer\'s socket has been reset.');
    });
    socket.on('message', function (message) {
        idleTimer.restart();
        pingTimer.stop();
        switch (message.type) {
            case TYPE.ANSWER:
                return onAnswer(message);
            case TYPE.CALL:
                return onCall(message);
            case TYPE.NOTIFICATION:
                return onNotification(message);
            case TYPE.PING:
                return socket.send({type: TYPE.PONG});
        }
    });

    return peer;
};


var keysOf = function (object) {
    var array = [];
    for (var key in object) {
        array.push(key);
    }
    return array;
};

var nextStep = function (callback, parameter) {
    setTimeout(function () {
        callback(parameter);
    }, 0);
};