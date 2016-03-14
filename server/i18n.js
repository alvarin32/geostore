exports.start = function (application) {

    var i18n = application.i18n;

    application.router.route('/api/i18n', function (request, response) {
        request.parseBody(function (body) {
            var locale = request.locale;
            var modified = body.modified;
            var labels = i18n.getLabels(locale);
            if (labels.modified != modified) {
                response.sendJson(labels);
            } else {
                response.end();
            }
        });
    });

    application.httpStack.onError(function (error, request, response) {
        if (Array.isArray(error)) error = i18n.get(request.locale, error);
        response.statusCode = 500;
        response.statusMessage = error;
        response.end();
    });
};