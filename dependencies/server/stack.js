module.exports = function () {

    var stack = [];

    var onError = function (error, request, response) {
        console.error(error);
        response.statusCode = '500';
        response.statusMessage = error;
        response.end();
    };

    var onNotFound = function (request, response) {
        console.error('could not serve: ' + request.url);
        response.statusCode = '404';
        response.statusMessage = 'Not Found';
        response.end();
    };

    var setOnError = function (handler) {
        onError = handler;
    };

    var setOnNotFound = function (handler) {
        onNotFound = handler;
    };

    var handler = function (request, response) {
        var pointer = 0;
        (function next(error) {
            if (error) return onError(error, request, response);
            var handler = stack[pointer++];
            if (handler) handler(request, response, next);
            else onNotFound(request, response);
        })();
    };

    var register = function () {
        for (i = 0; i < arguments.length; i++) {
            stack.push(arguments[i]);
        }
    };

    return {
        handler: handler,
        onError: setOnError,
        register: register
    };

};

