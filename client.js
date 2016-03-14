var I18n = require('client/i18n');
var F = require('client/fiat');
var Gui = require('client/gui');
var Keys = require('client/keys');
var Ajax = require('client/ajax');
var Main = require('./client/main');

I18n.initialize(function () {
    F.onReady(function () {
        Ajax.get('/api/whoami')
            .onSuccess(Main.start)
            .onFailure(startSession)
            .send();
    });
});

var startSession = function () {
    askFor(I18n.get('token', 'create'), function (mailAddress, box) {
        Ajax.post('/api/createToken')
            .attach({address: mailAddress})
            .onSuccess(function (response) {
                var tokenId = JSON.parse(response).tokenId;
                box.commit(function () {
                    askFor(I18n.get('token', 'secret'), function (secret, box) {
                        Ajax.post('/api/confirmToken')
                            .attach({tokenId: tokenId, secret: secret})
                            .onSuccess(box.commit.bind(box, Main.start))
                            .onFailure(box.rollback)
                            .send();
                    });
                });
            })
            .onFailure(box.rollback)
            .send();
    });
};

var askFor = function (question, onDone) {

    var container = F.node('div').style({
        width: '100%', maxWidth: cm(12),
        display: 'inline-block'
    });

    var label = F.node('span')
        .style({
            fontSize: cm(0.6),
            fontFamily: fonts.fine,
            display: 'block',
            marginTop: cm(3),
            marginBottom: cm(0.5)
        })
        .text(question);

    var input = F.node('input')
        .attr('type', 'text')
        .style({
            border: 0,
            borderBottom: cm(0.02) + ' solid ' + colors.dark,
            borderRadius: 0, margin: cm(0.12),
            width: '100%', maxWidth: cm(8),
            fontSize: cm(0.4),
            fontFamily: fonts.mono,
            textAlign: 'center',
            display: 'inline-block',
            verticalAlign: 'bottom'
        });

    var button = Gui.createIcon('/images/goon.svg', {color: colors.bright})
        .style({
            verticalAlign: 'middle',
            width: cm(1), height: cm(1)
        });
    var group = F.node('div').style('whiteSpace', 'nowrap');
    container.append(label, group.append(input, button));


    var keyListener, animation;
    var fade = function (opacity, onDone) {
        if (opacity == 1) {
            keyListener.start();
            input.attr('disabled', false);
        } else {
            keyListener.stop();
            input.attr('disabled', true);
        }
        if (animation) animation.cancel();
        animation = container.animate({opacity: opacity}, {onDone: onDone});
    };

    container.commit = function (onDone) {
        fade(0, function () {
            container.remove();
            onDone();
        });
    };

    container.rollback = function (error) {
        console.log(error);
        var element = input.value() ? input : label;
        element.animate({color: '#ff3333'}, {
            onDone: function () {
                setTimeout(function () {
                    element.animate({color: colors.dark})
                }, 2000);
            }
        });
        fade(1);
    };

    var go = function () {
        input.blur();
        fade(0.6, function () {
            var value = input.value();
            onDone(value, container);
        });
        return false;
    };

    keyListener = Keys.listen(function (event) {
        if (event.keyCode == 13) return go();
    });
    button.on('click', go);
    container.onAttached(input.focus);
    container.appendTo(F.body);
};