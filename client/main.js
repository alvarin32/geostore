var Ether = require('./ether');
var F = require('client/fiat');
var Scenarios = require('./scenarios');
var Backup = require('./backup');
var Restore = require('./restore');
var Gui = require('client/gui');
var I18n = require('client/i18n');
var Observable = require('commons/observable');


exports.start = function () {

    var application = Observable.create();
    application.ether = Ether();

    var menu = createMenu();
    menu.add('/images/scenarios.svg', ['main', 'scenarios'], Scenarios.bind(this, application));
    menu.add('/images/backup.svg', ['main', 'backup'], Backup.bind(this, application));
    menu.add('/images/restore.svg', ['main', 'restore'], Restore.bind(this, application));

    menu.show();
};

var createMenu = function () {
    var container = createMenuContainer();
    var add = function (iconSource, labelText, handler) {
        container.add(iconSource, labelText).on('click', function () {
            container.hide(handler.bind(this, container.show));
            return false;
        });
    };
    return {
        add: add,
        show: container.show
    };
};

var size = 2;
var createMenuContainer = function () {
    var container = F.node('div')
        .style({
            width: '100%', height: cm(2.5 * size), opacity: 0,
            top: 0, bottom: 0, margin: 'auto', position: 'absolute'
        });

    var iconRow = F.node('div').style({marginBottom: cm(size * 0.3)}).appendTo(container);
    var label = F.node('span')
        .style({fontSize: cm(size * 0.25)})
        .appendTo(F.node('div').appendTo(container));

    container.add = function (iconSource, labelText) {
        labelText = I18n.get(labelText);
        var icon = Gui.createIcon(iconSource)
            .style({width: cm(size), height: cm(size), verticalAlign: 'middle'});
        icon.on('mouseover', function () {
            label.text(labelText);
            return false;
        });
        icon.on('mouseout', function () {
            label.text('');
            return false;
        });
        return icon.appendTo(iconRow);
    };

    var animation;
    container.show = function (onComplete) {
        if (animation) animation.cancel();
        animation = container
            .remove()
            .appendTo(F.body)
            .animate({opacity: 1}, {onComplete: onComplete});
    };
    container.hide = function (onComplete) {
        if (animation)  animation.cancel();
        animation = container.animate({opacity: 0}, {
            onComplete: function () {
                container.remove();
                onComplete && onComplete();
            }
        });
    };
    return container;
};



