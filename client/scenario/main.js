var F = require('client/fiat');

exports.start = function (scenario, onDone) {
    F.body.append(F.text(scenario.id));
    console.log(scenario);
    //TODO
};