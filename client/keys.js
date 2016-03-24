var F = require('client/fiat');
var Commons = require('commons');

var keyListeners = [];

exports.listen = function (listener) {
    keyListeners.unshift(listener);
    var listening = true;
    var handle = {
        stop: function () {
            if (listening) {
                Commons.removeElement(keyListeners, listener);
                listening = false;
            }
            return handle;
        },
        start: function () {
            if (!listening) {
                keyListeners.unshift(listener);
                listening = true;
            }
            return handle;
        }
    };
    return handle;
};

exports.on = function (keyCode, handler) {
    return exports.listen(function (event) {
        if (event.keyCode == keyCode) {
            handler();
            return false;
        }
    });
};

exports.once = function (keyCode, handler) {
    var listener = exports.listen(function (event) {
        if (event.keyCode == keyCode) {
            listener.stop();
            handler();
            return false;
        }
    });
    return listener;
};


var shouldBePropagated = function (keyEvent) {
    var target = keyEvent.srcElement || keyEvent.target;
    return !F.wrap(target).noKeys;
};

F.onReady(function () {
    F.document.on('keydown', function (event) {
        if (shouldBePropagated(event)) {
            for (var i = 0; i < keyListeners.length; i++) {
                var listener = keyListeners[i];
                var result = listener(event);
                if (result === false) {
                    return false;
                }
            }
        }
    });
});