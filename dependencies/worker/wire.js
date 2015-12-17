var BYTES_PER_INT = 4;

exports.sender = function (socket) {
    var queue = [];
    var writing = false;

    var write = function () {
        if (writing || !queue.length) return;
        writing = true;
        var bundle = queue.shift();
        var message = JSON.stringify(bundle.message);
        var buffer = new Buffer(BYTES_PER_INT);
        buffer.writeUIntBE(message.length, 0, BYTES_PER_INT);
        var onDone = function (error) {
            writing = false;
            socket.removeListener('error', onDone);
            if (bundle.onDone) {
                if (error) return bundle.onDone(error);
                bundle.onDone();
            }
        };
        socket.on('error', onDone);
        socket.write(buffer, function () {
            socket.write(message, function () {
                onDone();
                write();
            });
        });
    };

    return function (message, onDone) {
        queue.push({message: message, onDone: onDone});
        write();
    }
};


exports.receiver = function (socket) {
    var message;
    var length = -1;
    var buffer;
    var callback;

    var read = function () {
        if (length < 0) {
            length = buffer.readUIntBE(0, BYTES_PER_INT);
            buffer = buffer.slice(BYTES_PER_INT);
            return read();
        }

        if (buffer.length < length) return;

        if (buffer.length == length) {
            message = JSON.parse(buffer.toString());
            buffer = null;
        } else {
            message = JSON.parse(buffer.slice(0, length).toString());
            buffer = buffer.slice(length);
        }

        length = -1;
        socket.pause();
        var _callback = callback;
        var _message = message;
        callback = null;
        message = null;
        _callback(undefined, _message);
    };

    socket.on('error', function (error) {
        if (callback) return callback(error);
        console.error(error);
    });
    socket.on('data', function (data) {
        buffer = buffer ? Buffer.concat([buffer, data]) : data;
        read();
    });

    socket.pause();

    return function ($callback) {
        callback = $callback;
        socket.resume();
    };
};