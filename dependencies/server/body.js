var Log = require('./log');

module.exports = function (app, parseBody) {

    parseBody = parseBody || function () {
            return true;
        };

    app.use(function (request, response, next) {

        if (!parseBody(request)) return next();

        var body = '';
        request.on('data', function (data) {
            body += data.toString();
        });
        request.on('end', function () {
            if (body && body != '') {
                try {
                    request.body = JSON.parse(body)
                } catch (error) {
                    Log.warn('found attached JSON-body. But it could not be parsed: ' + error);
                }
            } else {
                request.body = {};
            }
            next();
        });
    });

};