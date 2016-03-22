var F = require('client/fiat');
var Gui = require('client/gui');
var Keys = require('../keys');
var Observable = require('commons/observable');

module.exports = function (stage) {

    var _ = {};

    _.askForString = function (options) {
        var input = F.node('input')
            .attr({type: 'text'})
            .style({
                width: '70%', textAlign: 'center',
                height: cm(0.8), borderRadius: cm(0.06),
                fontSize: cm(0.4), margin: cm(0.5)
            });
        options.preset && input.value(options.preset);
        input.onAttached(input.focus);

        var question = askFor(input);
        question.on('confirmed', function () {
            options.onConfirmed(input.value());
        });
    };

    var buttonStyle = {width: '100%', height: '100%'};
    var askFor = function (widget) {

        var question = Observable.create();

        var stop = function (onDone) {
            stage.header.left.pop();
            stage.header.right.pop();
            stage.screen.pop();
            keyListener.stop();
            onDone && onDone();
        };

        var cancel = function () {
            stop();
            question.emit('canceled');
            return false;
        };

        var confirm = function () {
            stop();
            question.emit('confirmed');
            return false;
        };

        var confirmButton = Gui.createIcon('/images/confirm.svg', {color: colors.darker}).style(buttonStyle);
        var cancelButton = Gui.createIcon('/images/cancel.svg', {color: colors.darker}).style(buttonStyle);

        confirmButton.on('click', confirm);
        cancelButton.on('click', cancel);
        var keyListener = Keys.listen(function (event) {
            if (event.keyCode == 27) return cancel();
            if (event.keyCode == 13) return confirm();
        });
        question.on('cancel', cancel);
        question.on('confirm', confirm);

        stage.header.left.push(cancelButton);
        stage.header.right.push(confirmButton);
        stage.screen.push(widget);
        return question;
    };


    return _;
};