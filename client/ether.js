var Peer = require('websockets/peer');
var ClientSocket = require('websockets/client');


module.exports = function () {

    var endpoints = {};

    var ether = {};

    ether.register = function (endpointId, callback, once) {
        endpoints[endpointId] = {callback: callback, once: once};
        return ether;
    };

    ether.deregister = function (endpointId) {
        delete endpoints[endpointId];
        return ether;
    };

    var onCall = function (endpointId, parameter, onDone) {
        var endpoint = endpoints[endpointId];
        if (!endpoint) return onDone(['ether', 'couldNotFindEndpoint']);
        var callback = endpoint.callback;
        if (endpoint.once) ether.deregister(endpointId);
        callback(parameter, onDone);
    };

    var onNotification = function (endpointId, parameter) {
        var endpoint = endpoints[endpointId];
        if (!endpoint) return console.error(['ether', 'couldNotFindEndpoint']);
        var callback = endpoint.callback;
        if (endpoint.once) ether.deregister(endpointId);
        callback(parameter);
    };

    var socket = ClientSocket(window.location.origin);
    var peer = Peer(socket, onCall, onNotification);

    ether.call = peer.call;
    ether.notify = peer.notify;

    return ether;
};
