var Wire = require('./wire');
var Net = require('net');
var Elastic = require('elastic');
var Fs = require('fs');

var create = function (port) {

    var socket, send, receive;
    var rootPath = process.cwd();
    var context = {};

    var onError = function (error) {
        console.error('soldier got error and will go down: ' + error);
        stop();
    };

    var doWork = function () {
        receive(function (error, message) {
            if (error) return onError(error);
            if (message.stop) return stop();
            try {
                runJob(message.job);
            } catch (error) {
                onJobDone(error);
            }
        });
    };

    var runJob = function (job) {
        console.log('running job: ' + job.module + '/' + job.method);
        var module = require(rootPath + '/' + job.module);
        var method = module[job.method];
        if (job.parameters) {
            method.call(null, job.parameters, context, onJobDone);
        } else {
            method.call(null, context, onJobDone);
        }
    };

    var onJobDone = function (error) {
        send({error: error}, function (error) {
            if (error) return onError(error);
            doWork();
        });
    };

    var start = function () {
        Elastic.createClient(function (error, client) {
            if (error) return onError(error);
            context.client = client;
            socket = Net.connect(port, function (error) {
                if (error) return onError(error);
                receive = Wire.receiver(socket);
                send = Wire.sender(socket);
                doWork();
            });
        });
    };

    var stop = function () {
        if (context.client) context.client.close();
        if (socket) {
            try {
                socket.end();
            } catch (error) {
                socket.destroy();
            }
        }
    };

    return {
        start: start,
        stop: stop
    };

};

var port = parseInt(process.argv[2]);
var bootstrap = process.argv[3];
console.log('soldier\'s bootstrap: ' + process.cwd() + '/' + bootstrap);
if (bootstrap) require(process.cwd() + '/' + bootstrap);
var soldier = create(port);
soldier.start();


