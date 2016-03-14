var EngineIo = require('engine.io');
var Observable = require('commons/observable');
var Socket = require('./socket');


module.exports = function () {

    var sockets = {};

    var createId = (function () {
        var nextId = 1;
        return function () {
            return nextId++;
        };
    })();

    var onConnection = function (volatileSocket) {

        var onMessage = function (socketId) {
            volatileSocket.removeListener('message', onMessage);
            socketId = parseInt(socketId || 0);
            var socket = getOrCreateSocket(socketId);
            volatileSocket.send(socket.getId().toString());
            socket.update(volatileSocket);
            if (socket.isFresh) {
                socket.isFresh = false;
                manager.emit('connection', socket);
            }
        };

        volatileSocket.on('message', onMessage);
    };

    var getOrCreateSocket = function (socketId) {
        var socket;
        if (socketId) socket = sockets[socketId];
        if (!socket) {
            var id = createId();
            socket = Socket.create(id);
            sockets[id] = socket;
            socket.on('close', function () {
                delete sockets[id];
            });
            socket.isFresh = true;
        }
        return socket;
    };
    

    //=======================
    //=======================


    var manager = Observable.create();

    manager.attach = function (server) {
        EngineIo.attach(server).on('connection', onConnection);
        return manager;
    };

    return manager;

};