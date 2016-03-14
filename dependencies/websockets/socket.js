var Commons = require('commons');
var Observable = require('commons/observable');
var Timer = require('commons/timer');


exports.create = function (id) {

    var volatileSocket;
    var pendings = [];

    var socket = Observable.create();

    socket.getId = function () {
        return id;
    };

    socket.assertId = function ($id) {
        if (!id) return (id = $id);
        if (id != $id) {
            id = $id;
            socket.reset();
        }
    };

    socket.reset = function () {
        if (volatileSocket) stopListening();
        pendings = [];
        socket.emit('reset');
        return socket;
    };
    socket.close = function () {
        socket.emit('close');
        if (!volatileSocket) return pendings.push(function () {
            volatileSocket.close();
            stopListening();
        });
        volatileSocket.close();
        stopListening();
    };
    socket.send = function (message) {
        message = JSON.stringify(message);
        if (!volatileSocket) return pendings.push(function () {
            volatileSocket.send(message);
        });
        volatileSocket.send(message);
    };
    socket.update = function ($volatileSocket) {
        attachHeaders($volatileSocket);
        if (volatileSocket) stopListening();
        startListening($volatileSocket);
        var _pendings = pendings;
        pendings = [];
        Commons.runAll(_pendings);
    };

    var attachHeaders = function ($volatileSocket) {
        var request = $volatileSocket.request;
        if (request && !socket.headers) {
            socket.headers = request.headers;
        }
    };

    var startListening = function ($volatileSocket) {
        volatileSocket = $volatileSocket;
        volatileSocket.on('message', onMessage);
        volatileSocket.on('close', onClose);
        volatileSocket.on('error', onError);
    };

    var stopListening = function () {
        volatileSocket.removeListener('message', onMessage);
        volatileSocket.removeListener('close', onClose);
        volatileSocket.removeListener('error', onError);
        volatileSocket = null;
    };

    var onMessage = function (message) {
        message = JSON.parse(message);
        socket.emit('message', message);
    };

    var onClose = function () {
        if (volatileSocket) stopListening();
        socket.emit('broken');
    };

    var onError = function (error) {
        console.log('error on versatile socket: ' + error);
        if (volatileSocket) {
            volatileSocket.close();
            stopListening();
        }
        socket.emit('broken');
    };

    return socket;
};