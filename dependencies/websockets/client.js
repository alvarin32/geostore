var Socket = require('./socket');
var Timer = require('commons/timer');

var TIMEOUT_RECONNECT = 1000 * 3;

module.exports = function (endpoint) {

    var connect = function () {

        var onMessage = function (socketId) {
            volatileSocket.removeListener('message', onMessage);
            volatileSocket.removeListener('error', onError);
            socketId = parseInt(socketId);
            socket.assertId(socketId);
            socket.update(volatileSocket);
        };

        var onError = function () {
            volatileSocket.close();
            timer.start();
        };

        var volatileSocket = new eio.Socket(endpoint);
        volatileSocket.on('message', onMessage);
        volatileSocket.on('error', onError);
        volatileSocket.send((socket.getId() || 0).toString());
    };

    var socket = Socket.create();
    var timer = Timer(connect, TIMEOUT_RECONNECT);
    socket.on('broken', timer.start);
    socket.on('close', timer.stop);

    connect();

    return socket;

};