var Log = require('./log');

exports.handler = function (request, response, next) {
    request.parseBody = createParser(request);
    next();
};

var createParser = function (request) {
    return function (onDone) {
        var body = '';
        request.on('data', function (data) {
            body += data.toString();
        });
        request.on('end', function () {
            if (!body || body == '') return onDone({});

            try {
                body = JSON.parse(body);
            } catch (error) {
                Log.error(error);
                next(['body', 'couldNotParseJsonBody']);
            }

            onDone(body);
        });
    };
};