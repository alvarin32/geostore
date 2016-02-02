var ChildProcess = require('child_process');
var Capo = require('./capo');
var Commons = require('commons');


module.exports = function (name, port, numberOfWorkers, bootScript) {

    var capo = Capo.create(name, port);

    var start = function (onDone) {
        capo.start(function (error) {
            if (error) return onDone(error);
            var arguments = [port.toString(), bootScript];
            var soldierPath = __dirname + '/soldier.js';
            for (var i = 0; i < numberOfWorkers; i++) {
                ChildProcess.fork(soldierPath, arguments);
            }
            onDone();
        });
    };

    var stop = function (onDone) {
        capo.stop(onDone);
    };

    return {
        start: start,
        stop: stop,
        runJob: capo.runJob
    }
};




