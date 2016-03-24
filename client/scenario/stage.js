var F = require('client/fiat');
var Map = require('map');
var Tiles = require('map/tiles');
var Constructor = require('map/constructor');
var Geometries = require('map/geometries');

module.exports = function () {

    var barSize = 1;

    var createHeader = function (zIndex) {
        var header = F.node('div').style({
            position: 'fixed', top: cm(-barSize), left: 0,
            width: '100%', height: cm(barSize),
            backgroundColor: colors.dark, color: colors.bright,
            zIndex: zIndex
        });
        var animation;
        header.show = function (onDone) {
            if (animation) animation.cancel();
            animation = header.animate({top: 0}, {onDone: onDone});
        };
        header.hide = function (onDone) {
            if (animation) animation.cancel();
            animation = header.animate({top: cm(-barSize)}, {onDone: onDone});
        };
        header.title = createBag().style({width: '100%'}).appendTo(header);
        header.left = createBag().style({left: 0, width: cm(barSize)}).appendTo(header);
        header.right = createBag().style({right: 0, width: cm(barSize)}).appendTo(header);
        return header;
    };


    var createBag = function () {
        var bag = F.node('div').style({
            position: 'absolute',
            height: cm(barSize), lineHeight: cm(barSize),
            textAlign: 'center', top: 0
        });

        var stack = [];
        var animation;
        var animate = function (top, onComplete) {
            if (animation) animation.cancel();
            animation = bag.animate({top: top}, {onComplete: onComplete});
        };
        var show = animate.bind(null, 0);
        var hide = animate.bind(null, cm(-barSize));
        var update = function () {
            hide(function () {
                bag.clear();
                var element = stack.length && stack[stack.length - 1];
                if (element)element.appendTo(bag);
                show();
            });
        };
        bag.push = function (element) {
            stack.push(element);
            update();
        };
        bag.pop = function () {
            stack.pop();
            update();
        };
        return bag;
    };

    var createBlend = function (zIndex) {
        var blend = F.node('div').style({
            backgroundColor: colors.dark,
            opacity: 0, position: 'fixed', zIndex: zIndex,
            visibility: 'hidden',
            left: 0, top: 0, width: '100%', height: '100%'
        });
        var animation;
        blend.show = function (onComplete) {
            if (animation) animation.cancel();
            animation = blend.style({visibility: 'visible'}).animate({opacity: 0.6}, {onComplete: onComplete});
        };
        blend.hide = function (onComplete) {
            if (animation) animation.cancel();
            animation = blend.animate({opacity: 0}, {
                onComplete: function () {
                    blend.style({visibility: 'hidden'});
                    onComplete && onComplete();
                }
            });
        };
        return blend;
    };

    var createScreen = function (blend, zIndex) {
        var radius = 0.12;
        var screen = F.node('div').style({
            position: 'fixed', top: cm(barSize - 3 * radius), left: 0, right: 0, margin: 'auto',
            width: '100%', maxWidth: cm(20), borderRadius: cm(radius), padding: cm(radius),
            backgroundColor: colors.darker, color: colors.bright, opacity: 0,
            zIndex: zIndex
        });

        var stack = [], hiddenTop = 0, animation;
        var hide = function (onComplete) {
            if (animation) animation.cancel();
            animation = screen.animate({top: hiddenTop}, {
                onComplete: function () {
                    screen.style({opacity: 0});
                    onComplete && onComplete();
                }
            });
        };
        var show = function (onComplete) {
            if (animation) animation.cancel();
            animation = screen.style({opacity: 1}).animate({top: cm(barSize - radius)}, {onComplete: onComplete});
        };

        var update = function (onComplete) {
            hide(function () {
                screen.clear();
                var element = stack.length && stack[stack.length - 1];
                if (!element) return blend.hide(onComplete);
                blend.show();
                element.appendTo(screen);
                hiddenTop = (cmToPx(barSize - 2 * radius) - screen.box().height) + 'px';
                screen.style({top: hiddenTop});
                show(onComplete);
            });
        };

        screen.push = function (element) {
            stack.push(element);
            update();
        };

        screen.pop = function () {
            stack.pop();
            update();
        };

        return screen;
    };

    var createMap = function () {
        var map = Map.create();
        map.tiles = Tiles.layer(map, Tiles.providers.MAPQUEST);
        map.geos = Geometries.layer(map);
        map.constructor = Constructor.layer(map);
        map.container.style({position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', opacity: 0});

        var animation;
        map.show = function (onComplete) {
            if (animation) animation.cancel();
            animation = map.container.animate({opacity: 1}, {onComplete: onComplete});
        };
        map.hide = function (onComplete) {
            if (animation) animation.cancel();
            animation = map.container.animate({opacity: 0}, {onComplete: onComplete});
        };
        return map;
    };

    var createMenu = function (zIndex) {
        var size = barSize;
        var menu = F.node('div').style({
            position: 'fixed', left: cm(-size * 1.2),
            top: 0, height: '100%', width: cm(size),
            zIndex: zIndex, backgroundColor: colors.darker, color: colors.bright,
            textAlign: 'center', paddingTop: cm(barSize * 1.5)
        });
        var animation, hidden = true;
        menu.show = function (onComplete) {
            hidden = false;
            if (animation) animation.cancel();
            animation = menu.animate({left: 0}, {onComplete: onComplete});
            return false;
        };
        menu.hide = function (onComplete) {
            hidden = true;
            if (animation) animation.cancel();
            animation = menu.animate({left: cm(-size * 1.2)}, {onComplete: onComplete});
            return false;
        };
        menu.toggle = function () {
            hidden = !hidden;
            hidden ? menu.hide() : menu.show();
            return false;
        };
        return menu;
    };

    var start = function (onComplete) {
        F.body.append(map.container, menu, header, blend, screen);
        map.show();
        header.show(onComplete);
    };

    var stop = function () {
        menu.hide();
        map.hide();
        header.hide(function () {
            F.body.clear();
            onStop();
        });
    };

    var header = createHeader(20);
    var map = createMap();
    var menu = createMenu(10);
    var blend = createBlend(15);
    var screen = createScreen(blend, 18);

    return {
        header: header,
        map: map,
        menu: menu,
        screen: screen,
        start: start,
        stop: stop
    };

};