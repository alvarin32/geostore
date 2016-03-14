var Log = require('./log');
var Commons = require('commons');
var NodeMailer = require('nodemailer');
var Fs = require('fs');

var TIMEOUT_TOKEN = 1000 * 60 * 15;


exports.start = function (application, configuration) {

    var router = application.router;
    var metabase = application.metabase;
    var i18n = application.i18n;

    var mailConfig = JSON.parse(Fs.readFileSync('assets/email_config.json'));
    var mailTransport = NodeMailer.createTransport(mailConfig);
    var mailUrl = configuration.url + '/api/confirmToken?tokenId=%tokenId%&secret=%secret%';

    var tokens = {};

    router.route('/api/whoami', function (request, response, next) {
        var emailAddress = request.session.authorized;
        if (!emailAddress) return next(['token', 'notAuthenticatedYet']);
        response.sendJson({emailAddress: emailAddress});
    });

    router.route('/api/createToken', function (request, response, next) {
        request.parseBody(function (body) {
            var emailAddress = body.address.toLowerCase();
            checkAddress(emailAddress, function (error) {
                if (error) return next(['token', 'notAuthorized']);
                var token = createToken(emailAddress);
                var locale = request.locale;
                mailSecret(token, locale, emailAddress, function (error) {
                    if (error) return next(error);
                    response.sendJson({tokenId: token.id});
                });
            });
        });
    });

    router.route('/api/confirmToken', function (request, response, next) {
        request.parseBody(function (body) {
            var tokenId = body.tokenId || request.target.getParameter('tokenId');
            var secret = body.secret || request.target.getParameter('secret');
            confirmToken(tokenId, secret, function (error, emailAddress) {
                if (error) return next(error);
                request.session.authorized = emailAddress;
                metabase.put(request.session, function (error) {
                    if (error) return next(['authorization', 'couldNotAttachUserToSession']);
                    if (!body.tokenId) response.writeHead(302, {Location: configuration.url});
                    response.end();
                });
            });
        });
    });

    router.route('/api/logout', function (request, response, next) {
        var session = request.session;
        delete session.authorized;
        metabase.put(session, function (error) {
            if (error)return next(['authorization', 'couldNotDetachUserFromSession']);
            application.ether.forEachWithSession(session.id, function (client) {
                client.close();
            });
            response.end();
        });
    });


    var confirmToken = function (tokenId, secret, onDone) {
        var token = tokens[tokenId];
        if (!token) return onDone(['authorization', 'couldNotFindToken']);
        if (token.secret != secret) return onDone(['authorization', 'invalidSecret']);
        token.delete();
        onDone(undefined, token.emailAddress);
    };

    var createToken = function (emailAddress) {
        var id = Math.round(1 + Math.random() * 99999);
        if (tokens[id]) return createToken(emailAddress);
        var secret = Commons.randomId(8);
        var token = {id: id, secret: secret, emailAddress: emailAddress};
        tokens[id] = token;
        token.delete = function () {
            delete tokens[id];
        };
        setTimeout(token.delete, TIMEOUT_TOKEN);
        return token;
    };

    var mailSecret = function (token, locale, mailAddress, onDone) {
        var id = encodeURIComponent(token.id);
        var secret = encodeURIComponent(token.secret);

        var link = mailUrl.replace('%tokenId%', id)
            .replace('%secret%', secret);
        var prepareText = function (locale, path) {
            var text = i18n.get.apply(null, arguments);
            return text.replace('%secret%', secret)
                .replace('%link%', link);
        };

        var email = {
            from: mailConfig.sender,
            to: mailAddress,
            subject: prepareText(locale, ['token', 'email', 'subject']),
            text: prepareText(locale, ['token', 'email', 'bodyPlain']),
            html: prepareText(locale, ['token', 'email', 'bodyHtml'])
        };

        mailTransport.sendMail(email, function (error) {
            if (error) {
                Log.error(error);
                return onDone(['authorization', 'couldNotSendSecret']);
            }
            onDone();
        });
    };

    var checkAddress = function (emailAddress, onDone) {
        Fs.readFile(configuration.userFile, function (error, data) {
            if (error) return onDone(error);
            data = JSON.parse(data);
            if (data.indexOf(emailAddress) < 0) return onDone(['token', 'couldNotFindAddress']);
            onDone();
        });
    };

};


