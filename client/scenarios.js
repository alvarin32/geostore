var Gui = require('client/gui');
var F = require('client/fiat');

module.exports = function (application, onDone) {

    var waitingIcon = Gui.createWaitingIcon().style({
        width: cm(2), height: cm(2),
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        margin: 'auto'
    });
    F.body.append(waitingIcon);

    var stop = function () {
        waitingIcon.stop(function () {
            waitingIcon.remove();
            onDone();
        });
    };

    setTimeout(stop, 3000);

};