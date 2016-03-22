var Http = require('http');
var Https = require('https');
var Fs = require('fs');
var Resources = require('resources');
var HttpStack = require('server/stack');
var Target = require('server/target');
var I18n = require('server/i18n');
var Locales = require('server/locales');
var Cookies = require('server/cookies');
var Bodies = require('server/body');
var Responses = require('server/response');
var Sessions = require('server/sessions');
var ServeStatic = require('serve-static');
var Path = require('path');
var Database = require('./database');
var Ether = require('./server/ether');
var Session = require('./schema/session');


var rootFolder = process.cwd();

var configuration = {
    address: 'localhost',
    securePort: 4430,
    insecurePort: 8080,
    url: 'https://localhost:4430',
    sessionCookieName: 'geostore_session',
    client: Path.join(rootFolder, 'client.js'),
    script: Path.join(rootFolder, 'public', 'script', 'script.js'),
    defaultLocale: 'en',
    pathToLocales: Path.join(rootFolder, 'public', 'locales'),
    userFile: Path.join(rootFolder, 'users.json'),
    backups: {
        folder: Path.join(rootFolder, 'backups'),
        extension: '.zip',
        mimeType: 'application/gzip'
    },
    restore: {
        folder: Path.join(rootFolder, 'uploads')
    }
};

var application = {};

var start = function (onDone) {
    Database.start('meta', function (error, metabase) {
        if (error) return onDone(error);
        application.metabase = metabase;
        Database.start('content', function (error, database) {
            if (error) return onDone(error);
            application.database = database;
            application.i18n = I18n(configuration.pathToLocales, configuration.defaultLocale);
            application.router = createRouter();
            application.httpStack = setupHttpStack(application);
            application.secureServer = startSecureServer(application.httpStack.handler);
            application.insecureServer = startRedirectionServer();
            application.resources = watchAndBundleScript();
            application.ether = Ether(application, configuration);
            startApps(application, onDone);
        });
    });
};

var startApps = function (application, onDone) {
    var global = {};
    require('./server/i18n').start(application);
    require('./server/token').start(application, configuration);
    require('./server/osm').start(application);
    require('./server/backup').start(application, configuration, global);
    require('./server/restore').start(application, configuration, global);
    require('./server/scenario').start(application, configuration, global);
    onDone();
};


var watchAndBundleScript = function () {
    var resources = Resources(
        configuration.client,
        configuration.script
    );
    resources.start();
    return resources;
};

var createRouter = function () {
    var handlers = {};
    var unroute = function (route) {
        delete handlers[route];
    };
    var route = function (route, handler) {
        handlers[route] = handler
    };
    var handler = function (request, response, next) {
        var route = request.target.url;
        var handler = handlers[route];
        if (handler) return handler(request, response, next);
        next();
    };
    return {
        route: route,
        unroute: unroute,
        handler: handler
    };
};

var setupHttpStack = function (application) {

    var metabase = application.metabase;
    var router = application.router;

    var cookies = Cookies.handler;
    var target = Target.handler;
    var locales = Locales.handler(configuration.defaultLocale);
    var bodies = Bodies.handler;
    var responses = Responses.handler;
    var sessions = Sessions(configuration.sessionCookieName, {
        get: metabase.get,
        create: function (onDone) {
            var session = Session.type.create();
            metabase.put(session, onDone);
        }
    });
    var files = ServeStatic('public');

    var stack = HttpStack();
    stack.register(
        cookies,
        target,
        locales,
        bodies,
        responses,
        sessions,
        router.handler,
        files);

    return stack;
};


var startSecureServer = function (handler) {
    var options = {
        key: Fs.readFileSync('assets/certificates/my-server.key.pem'),
        cert: Fs.readFileSync('assets/certificates/my-server.crt.pem')
    };
    var server = Https.createServer(options, handler);
    server.listen(configuration.securePort);
    return server;
};

var startRedirectionServer = function (targetUrl) {
    var server = Http.createServer(function (request, response) {
        response.writeHead(302, {Location: targetUrl});
        response.end();
    });
    server.listen(configuration.insecurePort);
    return server;
};

var stop = function () {
    application.database && application.database.close();
    application.secureServer && application.secureServer.close();
    application.insecureServer && application.insecureServer.close();
    application.resources && application.resources.stop();

    setTimeout(process.exit.bind(process, 0), 5000);
};


var commandLine = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

start(function (error) {
    if (error) {
        console.error(error);
        return stop();
    }
    commandLine.on('line', function (line) {
        if (line == 'exit') {
            commandLine.close();
            stop();
        }
    });
});

