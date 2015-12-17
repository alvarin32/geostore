var Http = require('http');
var Express = require('express');
var Elastic = require('elastic');
var Mob = require('worker/mob');
var Os = require('os');
var Resources = require('resources');

require('./bootstrap');

var server, app;
var address = process.argv[2] || 'localhost';
var port = parseInt(process.argv[3] || 8080);
var numberOfWorkers = parseInt(process.argv[4] || Os.cpus().length);
var workerPort = parseInt(process.argv[5] || 65444);


var start = function () {
    createApp(function (error) {
        if (error) return console.error(error);
        startServer();
        Resources.start();
    });
};

var createApp = function (onDone) {
    var url = 'https://' + address + ':' + port + '/';
    Elastic.createClient(function (error, client) {
        if (error) return onDone(error);
        var mob = Mob('geostore_mob', workerPort, numberOfWorkers);
        mob.start();

        app = Express();
        app._client = client;
        app._mob = mob;
        app._url = url;

        setupServer(app);
        require('./server/browser')(app);
        app.use('/', Express.static('public'));
        app.disable('x-powered-by');

        onDone();
    });
};

var setupServer = function (app) {
    require('server/localizer')(app);
    require('server/target')(app);
    require('server/body')(app, function (request) {
        var target = request.target;
        return target.startsWith('api');
    });
    require('server/i18n').service(app);
};


var startServer = function () {
    var server = Http.createServer(app);
    server.listen(port);
};


var stop = function () {
    if (server) server.close();
    Resources.stop();
    app._client.close();
    app._mob.stop();
    kill(5000);
};


var kill = function (timeout) {
    setTimeout(function () {
        process.exit(0);
    }, timeout);
};


var commandLine = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});


start();

commandLine.on('line', function (line) {
    if (line == 'exit') {
        commandLine.close();
        stop();
    }
});
