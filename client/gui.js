var Gui = require('client/gui');
var Commons = require('commons');
var I18n = require('client/i18n');
var F = require('client/fiat');

var createButton = function (text) {
    text = I18n.get(text);
    return F.node('div').style({
        backgroundColor: colors.bright,
        whiteSpace: 'nowrap',
        color: colors.dark,
        fontSize: cm(0.4),
        fontWeight: 'bold',
        borderRadius: cm(0.12),
        height: cm(1), lineHeight: cm(0.8),
        minWidth: cm(3), display: 'inline-block',
        verticalAlign: 'middle', cursor: 'pointer',
        margin: cm(0.25), padding: cm(0.12)
    }).text(text);
};

var createContainer = function () {

    var container = F.node('div').style({
        left: 0, top: 0, bottom: 0, right: 0,
        position: 'absolute', margin: 'auto',
        width: '100%', height: cm(3),
        textAlign: 'center',
        opacity: 0
    });

    var animation;
    container.show = function (onComplete) {
        if (animation) animation.cancel();
        animation = container.appendTo(F.body).animate({opacity: 1}, {onComplete: onComplete})
    };

    container.hide = function (onComplete) {
        if (animation) animation.cancel();
        animation = container.animate({opacity: 1}, {
            onComplete: function () {
                container.remove();
                onComplete && onComplete();
            }
        })
    };

    return container;
};

module.exports = Commons.extend(Gui, {
    createButton: createButton,
    createContainer: createContainer
});