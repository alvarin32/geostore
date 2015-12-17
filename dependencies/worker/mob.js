var ChildProcess = require('child_process');
var Capo = require('./capo');
var Commons = require('commons');


module.exports = function (name, port, numberOfWorkers, bootScript) {

    console.log('capo starting at ' + port);
    var capo = Capo.create(name, port);

    var start = function () {
        capo.start(function () {
            var arguments = [port.toString()];
            var soldierPath = __dirname + '/soldier.js';
            for (var i = 0; i < numberOfWorkers; i++) {
                ChildProcess.fork(soldierPath, arguments);
            }
        });
    };

    var stop = function () {
        capo.stop();
    };

    return {
        start: start,
        stop: stop,
        runJob: capo.runJob
    }
};




