var Wire = require('./wire');
var Net = require('net');
var Elastic = require('elastic');
var Fs = require('fs');

var create = function (port) {

    var socket, send, receive, timeout;
    var rootPath = __dirname.replace(/node_modules(.*)/gi, '');
    var context = {};

    var onError = function (error) {
        console.error('soldier got error and will go down: ' + error);
        stop();
    };

    var doWork = function () {
        send({request: true}, function (error) {
            if (error) return onError(error);
            receive(function (error, answer) {
                if (error) return onError(error);
                var job = answer.job;
                if (!job) return setTimeout(doWork, 10000);
                var module = require(rootPath + job.module);
                var method = module[job.method];
                if (job.parameters) {
                    method.call(null, job.parameters, context, onJobDone);
                } else {
                    method.call(null, context, onJobDone);
                }
            });
        })
    };

    var onJobDone = function (error) {
        if (!error) return doWork();
        send({error: (error.message || error)}, function (error) {
            if (error) return onError(error);
            doWork();
        });
    };

    var start = function () {
        var bootstrapModule = rootPath + 'bootstrap';
        if (Fs.existsSync(bootstrapModule + '.js')) require(bootstrapModule);
        Elastic.createClient(function (error, client) {
            if (error) return onError(error);
            context.client = client;
            socket = Net.connect(port, function () {
                receive = Wire.receiver(socket);
                send = Wire.sender(socket);
                doWork();
            });
        });
    };

    var stop = function () {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        if (context.client) context.client.close();
        if (socket) socket.destroy();
    };

    return {
        start: start,
        stop: stop
    };

};

var port = parseInt(process.argv[2]);
var soldier = create(port);
soldier.start();


