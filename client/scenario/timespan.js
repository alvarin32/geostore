var F = require('client/fiat');
var Gui = require('client/gui');

module.exports = function (context) {

    var size = 1.5;

    var createContainer = function () {

        var container = F.node('div').style({
            position: 'fixed', height: cm(size),
            bottom: cm(-size * 1.2), left: 0, right: 0, margin: 'auto'
        });

        var animation;
        container.show = function (onComplete) {
            if (animation) animation.cancel();
            container.animate({bottom: cm(0.5)}, {onComplete: onComplete});
        };

        container.hide = function (onComplete) {
            if (animation) animation.cancel();
            container.animate({bottom: cm(-size * 1.2)}, {onComplete: onComplete});
        };

        return container;
    };


    var createIcon = function () {
        return Gui.createIcon('/images/time.svg', {color: colors.darker})
            .style({
                width: cm(size), height: cm(size),
                display: 'inline-block', verticalAlign: 'middle'
            });
    };

    var createTimespan = function () {
        var timespan = F.node('div').style({
            width: '98%', maxWidth: cm(20), height: cm(size),
            borderRadius: cm(0.12), opacity: 0.7,
            backgroundColor: colors.darker, display: 'inline-block', verticalAlign: 'middle'
        });

        return timespan;
    };


    var container = createContainer();
    var icon = createIcon();
    var timespan = createTimespan();
    container.append(icon, timespan);

    context.on('timeHorizonReady', container.show);

    return container;

};