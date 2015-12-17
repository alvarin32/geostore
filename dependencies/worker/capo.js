var Commons = require('commons');
var Wire = require('./wire');
var NeDb = require('nedb');
var Net = require('net');


exports.create = function (name, port) {

    var stopMethods = [];
    var runningJobs = [];
    var rootPath = __dirname.replace(/node_modules(.*)/gi, '');
    var fileName = rootPath + name + '.jobs';
    var store = new NeDb({filename: fileName, autoload: true});
    store.ensureIndex({fieldname: 'state'});

    var server = Net.createServer(function (socket) {

        var stop = function (error) {
            if (error) console.warn('soldier-connection is shut down on capo-side due to an error: ' + error);
            Commons.removeElement(stopMethods, stop);
            if (currentJob) {
                unpopJob(currentJob);
                currentJob = null;
            }
            socket.close();
        };

        var currentJob;
        var receive = Wire.receiver(socket);
        var send = Wire.sender(socket);

        var onRequest = function () {
            if (currentJob) {
                onJobDone(currentJob);
                currentJob = null;
            }
            popJob(function (job) {
                currentJob = job;
                send({job: (currentJob || null)}, function (error) {
                    if (error) return stop(error);
                    waitForClient();
                });
            });
        };

        var onError = function (error) {
            onJobError(currentJob, error);
            currentJob = null;
            waitForClient();
        };

        var waitForClient = function () {
            receive(function (error, message) {
                if (error) return stop(error);
                if (message.request) {
                    return onRequest();
                } else if (message.error) {
                    return onError(message.error);
                }
            });
        };

        waitForClient();
    });

    var start = function (onDone) {
        //TODO: check the use of "local domain sockets"
        server.listen(port, 'localhost', onDone);
    };

    var stop = function () {
        stopMethods.forEach(function (stopMethod) {
            stopMethod();
        });
        server.close();
    };

    var onError = function (error) {
        console.error('the capo of the worker-mob received an error and is going down: ' + error);
        stop();
    };

    server.on('error', onError);

    var queueJob = function (module, method, parameters) {
        var job = {module: module, method: method, parameters: parameters};
        store.find(job, function (error, duplicates) {
            if (duplicates.filter(hasNoErrorSet).length) {
                console.warn('found duplicate job entry. won\'t queue the job: ' + JSON.stringify(job));
                return;
            }
            store.insert(job, function (error) {
                if (error) onError(error);
            });
        });
    };

    var popJob = function (onDone) {
        store.findOne({error: {$exists: false}, _id: {$nin: runningJobs}}, function (error, job) {
            if (error) return onError(error);
            if (!job) return onDone();
            runningJobs.push(job._id);
            onDone(job);
        });
    };

    var unpopJob = function (job) {
        Commons.removeElement(runningJobs, job._id);
    };

    var onJobDone = function (job) {
        store.remove({_id: job._id}, function (error) {
            if (error) return onError(error);
            unpopJob(job);
        });
    };

    var onJobError = function (job, error) {
        store.update({_id: job._id}, {error: error}, function (error) {
            if (error) return onError(error);
            unpopJob(job);
        });
    };

    return {
        start: start,
        stop: stop,
        runJob: queueJob
    }

};


var hasNoErrorSet = function (job) {
    return !('error' in job);
};