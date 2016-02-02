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
        buffer.writeUInt32LE(message.length, 0);
        var onDone = function (error) {
            writing = false;
            socket.removeListener('error', onDone);
            if (bundle.onDone) bundle.onDone(error);
            if (!error) write();
        };
        socket.on('error', onDone);
        socket.write(buffer, function () {
            socket.write(message, onDone);
        });
    };

    return function (message, onDone) {
        queue.push({message: message, onDone: onDone});
        write();
    }
};


exports.receiver = function (socket) {

    var messages = [];
    var lengthOfCurrentMessage = -1;
    var buffer;
    var callback;

    var readLength = function () {
        try {
            lengthOfCurrentMessage = buffer.readUInt32LE(0);
            buffer = buffer.slice(BYTES_PER_INT);
            return true;
        } catch (error) {
            lengthOfCurrentMessage = -1;
            return false;
        }
    };

    var spreadMessages = function () {
        if (!messages.length || !callback) return;
        var message = messages.shift();
        process.nextTick(function () {
            callback(undefined, message);
            process.nextTick(spreadMessages);
        });
    };

    var read = function () {

        if (lengthOfCurrentMessage < 0 && !readLength()) return;
        if (buffer.length < lengthOfCurrentMessage) return;

        var message;
        if (buffer.length == lengthOfCurrentMessage) {
            message = JSON.parse(buffer.toString());
            buffer = null;
        } else {
            message = JSON.parse(buffer.slice(0, lengthOfCurrentMessage).toString());
            buffer = buffer.slice(lengthOfCurrentMessage);
            process.nextTick(read);
        }
        lengthOfCurrentMessage = -1;
        messages.push(message);
        spreadMessages();
    };

    socket.on('error', function (error) {
        if (callback) return callback(error);
        console.error(error);
    });
    socket.on('data', function (data) {
        buffer = buffer ? Buffer.concat([buffer, data]) : data;
        read();
    });

    return function ($callback) {
        callback = $callback;
        spreadMessages();
    };
};