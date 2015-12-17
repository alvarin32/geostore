module.exports = function (app) {

    app.use('/', function (request, response, next) {
        request.locale = 'de';
        var accepted = request.headers['accept-language'];
        if (accepted) {
            accepted = accepted.toLowerCase().split(',')[0];
            accepted = accepted.split('-')[0];
            request.locale = accepted;
        }
        next();
    });
};