var Commons = require('commons');
var Wire = require('./wire');
var NeDb = require('nedb');
var Net = require('net');


exports.create = function (name, port) {

    var connections = [];
    var rootPath = process.cwd();
    var fileName = rootPath + '/' + name + '.jobs';
    var store = new NeDb({filename: fileName, autoload: true});

    var setupConnection = function (socket) {

        var currentTask = null;
        var receive = Wire.receiver(socket);
        var send = Wire.sender(socket);

        var connection = {};

        connection.isBusy = function () {
            return currentTask != null;
        };

        var onStop = function (error) {
            if (error) console.error(error);
            if (currentTask) {
                process.nextTick(function () {
                    var result = {error: 'connection closed before done.'};
                    currentTask.onDone(undefined, result);
                });
            }
        };

        connection.stop = function (error) {
            onStop(error);
            send({stop: true}, function (error) {
                if (error) console.error(error);
                socket.end();
            });
        };

        socket.on('error', onStop);
        socket.on('close', onStop);

        connection.delegate = function (job, onDone) {

            var _onDone = function () {
                currentTask = null;
                onDone.apply(this, arguments);
            };

            currentTask = {job: job, onDone: _onDone};

            send({job: job}, function (error) {
                if (error) return _onDone(error);
                receive(function (error, message) {
                    if (error) return _onDone(error);
                    _onDone(undefined, message);
                });
            });
        };

        return connection;

    };

    var runJob = function (module, method, parameters) {
        var job = {module: module, method: method, parameters: parameters, running: false};
        findDuplicate(job, function (error, duplicate) {
            if (error) return onError(error);
            if (duplicate) {
                console.warn('found active job-duplicate, won\'t execute it twice: ' + JSON.stringify(job));
                return;
            }
            store.insert(job, function (error) {
                if (error) return onError(error);
                delegateJobs();
            });
        })
    };

    var findDuplicate = function (job, onDone) {
        var clauses = [
            {module: job.module},
            {method: job.method},
            {parameters: job.parameters},
            {error: {$exists: false}}
        ];
        store.findOne({$and: clauses}, onDone);
    };

    var delegateJobs = function () {
        if (isShuttingDown) return;
        store.findOne({$and: [{error: {$exists: false}}, {running: false}]}, function (error, job) {
            if (error) return onError(error);
            if (!job) return;
            job.running = true;
            job.started = (new Date()).getTime();
            store.update({_id: job._id}, job, function (error) {
                if (error) return onError(error);
                process.nextTick(delegateJobs);
                var connection = chooseConnection();
                connection.delegate(job, function (error, result) {
                    if (error) return onError(error);
                    finishJob(job, result);
                });
            });
        });
    };

    var finishJob = function (job, result) {
        job.running = false;
        job.stopped = (new Date()).getTime();
        if (result.error) {
            job.error = result.error;
            store.update({_id: job._id}, job, function (error) {
                if (error) onError(error);
            });
        } else {
            store.remove({_id: job._id}, {}, function (error) {
                if (error) onError(error);
            });
        }
    };

    var pointer = 0;
    var chooseConnection = function () {
        var numberOfConnections = connections.length;
        for (var i = 0; i < numberOfConnections; i++) {
            var index = (pointer + i) % numberOfConnections;
            var connection = connections[index];
            if (!connection.isBusy()) {
                pointer = index;
                return connection;
            }
        }
        pointer = (pointer + 1) % numberOfConnections;
        return connections[pointer];
    };

    var getRunningJobs = function (onDone) {
        return store.find({running: true}, function (error, jobs) {
            if (error) return onDone(error);
            onDone(undefined, jobs);
        });
    };

    var resetJobs = function (jobs, onDone) {
        if (!jobs.length) return onDone();
        var job = jobs.pop();
        store.update({_id: job._id}, {$set: {running: false}}, function (error) {
            if (error) return onDone(error);
            resetJobs(jobs, onDone);
        });
    };

    var start = function (onDone) {
        getRunningJobs(function (error, runningJobs) {
            if (error) return onDone(error);
            resetJobs(runningJobs, function (error) {
                if (error) return onDone(error);
                server.listen(port, 'localhost', onDone);
            });
        });
    };

    var isShuttingDown = false;
    var stop = function (onDone) {
        isShuttingDown = true;
        if (onDone) server.on('close', onDone);
        server.close();
        connections.forEach(function (connection) {
            connection.stop();
        });
    };

    var onError = function (error) {
        console.error('the capo of the worker-mob received an error and is going down: ' + error);
        stop();
    };

    var server = Net.createServer(function (socket) {
        console.log('capo found soldier.');
        var connection = setupConnection(socket);
        connections.push(connection);
        socket.on('close', function () {
            console.log('capo lost soldier.');
            Commons.removeElement(connections, connection);
        })
        delegateJobs();
    });
    server.on('error', onError);

    return {
        start: start,
        stop: stop,
        runJob: runJob
    };

};