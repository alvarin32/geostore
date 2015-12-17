
module.exports = function (app, options) {

    var authorizationRequired = options.authorizationRequired;
    var authorize = options.authorize;
    var onNotAuthorized = options.onNotAuthorized;

    app.use(function (request, response, next) {

        authorizationRequired(request, function(error, required){
            if(error) return next(error);
            if(!required) return next();
            var context = {request: request, response:response, next: next};
            authorize(context, function(error, authorized){
                if(error) return next(error);
                if(!authorized) return onNotAuthorized(context);
                next();
            });
        });

    });

};
