var Commons = require('./commons');

exports.create = function () {
    return exports.wrap({});
};

exports.wrap = function (core) {

    var listeners = {};

    core.on = function (eventType, listener) {
        var list = listeners[eventType];
        if (!list) {
            list = ShootableList();
            listeners[eventType] = list;
        }
        list.push(listener);
        return core;
    };

    core.off = function (eventType, listener) {
        if (arguments.length == 1) {
            listener = eventType;
            for (eventType in listeners) {
                core.off(eventType, listener);
            }
        } else {
            var list = listeners[eventType];
            if (list) {
                list.remove(listener);
                if (list.isEmpty()) delete listeners[eventType];
            }
        }
        return core;
    };

    var doEmit = function (reverse, eventType, p1, p2, p3) {
        var list = listeners[eventType];
        if (!list) return;
        list.snapshot()(reverse, p1, p2, p3);
        return false;
    };

    core.removeListener = core.off;
    core.emitReverse = doEmit.bind(this, true);
    core.emit = doEmit.bind(this, false);

    return core;
};


var ShootableList = function () {

    var list = [];
    var snapshots = [];

    var createSnapshot = function () {

        var copy = [];

        var prepare = function () {
            for (var i = 0; i < list.length; i++) {
                copy.push(list[i]);
            }
        };

        var emit = function (reverse, p1, p2, p3) {
            while (copy.length) {
                var element = reverse ? copy.pop() : copy.shift();
                var result = element(p1, p2, p3);
                if (result == false) return false;
            }
        };

        var free = function () {
            while (copy.length) copy.pop();
            if (snapshots.length < 10) snapshots.push(snapshot);
        };

        var snapshot = function (reverse, p1, p2, p3) {
            prepare();
            var result = emit(reverse, p1, p2, p3);
            free();
            return result;
        };

        return snapshot;
    };

    return {
        push: list.push.bind(list),
        remove: Commons.removeElement.bind(this, list),
        isEmpty: function () {
            return !list.length;
        },
        snapshot: function () {
            return snapshots.pop() || createSnapshot();
        }
    }
};